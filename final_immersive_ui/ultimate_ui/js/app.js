/*
 * Executive Game client side logic
 * ---------------------------------
 * This script wires up basic navigation and generates demo content
 * throughout the application. It simulates matchmaking, populates
 * leaderboards, tasks, profiles, social lists and shop items. In a
 * production environment these functions would call your backend
 * API endpoints and update the UI based on real data.
 */

const assetCdn = {
  coverTexas: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
  coverChess: 'https://images.unsplash.com/photo-1529692236671-f1dc00662485?auto=format&fit=crop&w=1200&q=80',
  coverDoudizhu: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80',
  coverXiangqi: 'https://images.unsplash.com/photo-1507835661120-30e665aeb79b?auto=format&fit=crop&w=1200&q=80',
  coverAi: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=1200&q=80',
  coverPuzzle: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1200&q=80'
};

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  loginBtn.addEventListener('click', handleLogin);

  // Navigation
  document.querySelectorAll('#main-nav .nav-list li').forEach(item => {
    item.addEventListener('click', () => {
      showSection(item.getAttribute('data-target'));
      setActiveNav(item);
    });
  });

  // Ranking tab switching
  document.querySelectorAll('.ranking-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchRankingTab(btn.getAttribute('data-rank-target'), btn);
    });
  });

  // Social tab switching
  document.querySelectorAll('.social-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSocialTab(btn.getAttribute('data-social-target'), btn);
    });
  });

  // Match cancel
  document.getElementById('cancel-match-btn').addEventListener('click', cancelMatch);
  document.getElementById('play-again-btn').addEventListener('click', () => {
    // Start another match from results page
    showSection('hall-section');
    setActiveNav(document.querySelector('[data-target="hall-section"]'));
  });
  document.getElementById('back-to-hall-btn').addEventListener('click', () => {
    showSection('hall-section');
    setActiveNav(document.querySelector('[data-target="hall-section"]'));
  });

  document.getElementById('exit-room-btn').addEventListener('click', () => {
    // Exit board and show results page with random outcome
    finishMatch();
  });

  // AI suggestion button
  document.getElementById('ai-suggest-btn').addEventListener('click', () => {
    populateSuggestions();
  });

  // Initialise dynamic sections
  initHall();
  initRanking();
  initProfile();
  initTasks();
  initSocial();
  initAI();
  initTraining();
  initShop();
});

// Track the current game being played
let currentGameId = null;

function handleLogin() {
  // In a real app you would trigger Telegram login here and await a response.
  // For the mock we just transition directly to the app shell.
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  // Show hall by default
  showSection('hall-section');
  setActiveNav(document.querySelector('[data-target="hall-section"]'));
}

function showSection(id) {
  document.querySelectorAll('.content-section').forEach(sec => {
    sec.classList.add('hidden');
  });
  const section = document.getElementById(id);
  if (section) {
    section.classList.remove('hidden');
  }
  // Hide board controls unless we are in the board section
  const boardControls = document.getElementById('board-controls-wrapper');
  if (boardControls) {
    if (id === 'board-section') {
      // board controls visibility is handled when preparing the board
    } else {
      boardControls.classList.add('hidden');
    }
  }
}

function setActiveNav(item) {
  document.querySelectorAll('#main-nav .nav-list li').forEach(li => li.classList.remove('active'));
  item.classList.add('active');
}

// Hall generation
const games = [
  { id: 'texas', name: 'Texas Hold\'em', cover: assetCdn.coverTexas },
  { id: 'chess', name: 'Chess', cover: assetCdn.coverChess },
  { id: 'doudizhu', name: 'Dou Dizhu', cover: assetCdn.coverDoudizhu },
  { id: 'xiangqi', name: 'Chinese Chess', cover: assetCdn.coverXiangqi },
  { id: 'ai', name: 'AI Practice', cover: assetCdn.coverAi },
  { id: 'puzzle', name: 'Puzzles', cover: assetCdn.coverPuzzle }
];

function initHall() {
  const grid = document.getElementById('games-grid');
  grid.innerHTML = '';
  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.style.backgroundImage = `url('${game.cover}')`;
    // Overlay with title and online players
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = game.name;
    const online = document.createElement('div');
    online.className = 'online-count';
    online.textContent = `${getRandomInt(200, 5000).toLocaleString()} online`;
    const btn = document.createElement('button');
    btn.className = 'card-btn';
    btn.textContent = 'Match';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      startMatch(game.id);
    });
    overlay.appendChild(title);
    overlay.appendChild(online);
    overlay.appendChild(btn);
    card.appendChild(overlay);
    grid.appendChild(card);
  });
}

// Match making simulation
let matchTimeout;
function startMatch(gameId) {
  // Set the currently selected game
  currentGameId = gameId;
  showSection('match-section');
  setActiveNav(document.querySelector('[data-target="match-section"]'));
  const statusEl = document.getElementById('match-status');
  statusEl.textContent = `Matching for ${games.find(g => g.id === gameId).name}...`;
  // Simulate online players count and ETA
  const onlineEl = document.getElementById('online-count');
  const etaEl = document.getElementById('eta');
  let eta = getRandomInt(5, 12);
  etaEl.textContent = `ETA: ${eta}s`;
  onlineEl.textContent = `Online: ${getRandomInt(200, 5000).toLocaleString()}`;
  // Countdown
  matchTimeout && clearInterval(matchTimeout);
  matchTimeout = setInterval(() => {
    eta--;
    etaEl.textContent = `ETA: ${eta}s`;
    if (eta <= 0) {
      clearInterval(matchTimeout);
      statusEl.textContent = 'Match found!';
      // small delay before entering board
      setTimeout(() => {
        // Prepare and show the board for the current game
        prepareBoardForGame(currentGameId);
        showSection('board-section');
        setActiveNav(document.querySelector('[data-target="board-section"]'));
      }, 1000);
    }
  }, 1000);
}

function cancelMatch() {
  if (matchTimeout) {
    clearInterval(matchTimeout);
  }
  showSection('hall-section');
  setActiveNav(document.querySelector('[data-target="hall-section"]'));
}

// Finish match and show result with random outcome
function finishMatch() {
  const win = Math.random() > 0.5;
  const titleEl = document.getElementById('result-title');
  const summaryEl = document.getElementById('result-summary');
  const ratingChangeEl = document.getElementById('rating-change');
  const coinsEarnedEl = document.getElementById('coins-earned');
  if (win) {
    titleEl.textContent = 'Victory!';
    summaryEl.textContent = 'You defeated your opponent.';
    ratingChangeEl.textContent = `+${getRandomInt(10, 25)}`;
    coinsEarnedEl.textContent = `+${getRandomInt(50, 150)}`;
  } else {
    titleEl.textContent = 'Defeat';
    summaryEl.textContent = 'Better luck next time.';
    ratingChangeEl.textContent = `-${getRandomInt(5, 20)}`;
    coinsEarnedEl.textContent = '+0';
  }
  // Hide board controls when leaving the board
  document.getElementById('board-controls-wrapper').classList.add('hidden');
  showSection('result-section');
  setActiveNav(document.querySelector('[data-target="result-section"]'));
}

/**
 * Build the appropriate board layout for the selected game.
 * Clears any previous board content and inserts new DOM elements
 * specific to the game. Also reveals the exit button.
 * @param {string} gameId
 */
function prepareBoardForGame(gameId) {
  const wrapper = document.getElementById('board-wrapper');
  wrapper.innerHTML = '';
  // Ensure the board controls are visible
  document.getElementById('board-controls-wrapper').classList.remove('hidden');
  // Remove old classes on wrapper
  wrapper.className = 'board-wrapper';
  // Determine which game layout to create
  switch (gameId) {
    case 'doudizhu':
      createDouDizhuBoard(wrapper);
      break;
    case 'texas':
      createTexasBoard(wrapper);
      break;
    case 'xiangqi':
      createXiangqiBoard(wrapper);
      break;
    case 'chess':
      createChessBoard(wrapper);
      break;
    default:
      createDefaultBoard(wrapper);
      break;
  }
}

// Dou Dizhu board creation
function createDouDizhuBoard(wrapper) {
  // Apply board class to wrapper for layout-specific styling
  const board = document.createElement('div');
  board.className = 'doudizhu-board';
  // Opponents
  const oppLeft = document.createElement('div');
  oppLeft.className = 'opponent left';
  oppLeft.innerHTML = `<div class="name">Opponent A</div><div class="cards-count">17 cards</div>`;
  const oppRight = document.createElement('div');
  oppRight.className = 'opponent right';
  oppRight.innerHTML = `<div class="name">Opponent B</div><div class="cards-count">17 cards</div>`;
  // Player area
  const player = document.createElement('div');
  player.className = 'player';
  const playerName = document.createElement('div');
  playerName.className = 'name';
  playerName.textContent = 'You';
  const hand = document.createElement('div');
  hand.className = 'hand';
  // Generate a random number of cards between 13 and 20 for demonstration
  const cardCount = getRandomInt(13, 20);
  for (let i = 0; i < cardCount; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    hand.appendChild(card);
  }
  player.appendChild(playerName);
  player.appendChild(hand);
  // Append elements
  board.appendChild(oppLeft);
  board.appendChild(oppRight);
  board.appendChild(player);
  wrapper.appendChild(board);
}

// Texas Hold'em board creation
function createTexasBoard(wrapper) {
  const board = document.createElement('div');
  board.className = 'texas-board';
  // Seats (6 seats arranged around the table)
  const seatNames = ['P1', 'P2', 'P3', 'P4', 'P5', 'You'];
  for (let i = 0; i < 6; i++) {
    const seat = document.createElement('div');
    seat.className = `seat seat${i + 1}`;
    seat.innerHTML = `<span class="name">${seatNames[i]}</span>`;
    board.appendChild(seat);
  }
  // Community cards (5 cards)
  const community = document.createElement('div');
  community.className = 'community-cards';
  const commCount = 5;
  for (let i = 0; i < commCount; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    community.appendChild(card);
  }
  board.appendChild(community);
  // Player hand (2 cards)
  const playerHand = document.createElement('div');
  playerHand.className = 'player-hand';
  for (let i = 0; i < 2; i++) {
    const card = document.createElement('div');
    card.className = 'card';
    playerHand.appendChild(card);
  }
  board.appendChild(playerHand);
  wrapper.appendChild(board);
}

// Xiangqi board creation
function createXiangqiBoard(wrapper) {
  const board = document.createElement('div');
  board.className = 'xiangqi-board';
  // Player names at top and bottom
  const top = document.createElement('div');
  top.className = 'player-top';
  top.textContent = 'Opponent';
  const bottom = document.createElement('div');
  bottom.className = 'player-bottom';
  bottom.textContent = 'You';
  board.appendChild(top);
  board.appendChild(bottom);
  wrapper.appendChild(board);
}

// Chess board creation
function createChessBoard(wrapper) {
  const board = document.createElement('div');
  board.className = 'chess-board';
  // Player names at top and bottom
  const top = document.createElement('div');
  top.className = 'player-top';
  top.textContent = 'Opponent';
  const bottom = document.createElement('div');
  bottom.className = 'player-bottom';
  bottom.textContent = 'You';
  board.appendChild(top);
  board.appendChild(bottom);
  wrapper.appendChild(board);
}

// Default board fallback
function createDefaultBoard(wrapper) {
  const board = document.createElement('div');
  board.style.width = '480px';
  board.style.height = '480px';
  board.style.backgroundColor = 'var(--surface-color)';
  board.style.display = 'flex';
  board.style.alignItems = 'center';
  board.style.justifyContent = 'center';
  board.textContent = 'Game not yet implemented.';
  wrapper.appendChild(board);
}

// Ranking tables
function initRanking() {
  const rankDataAll = generateRankingData(15);
  const rankDataWeek = generateRankingData(10);
  const rankDataMonth = generateRankingData(12);
  populateRankTable('rank-all', rankDataAll);
  populateRankTable('rank-week', rankDataWeek);
  populateRankTable('rank-month', rankDataMonth);
}

function populateRankTable(containerId, data) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Rank', 'Player', 'Rating', 'Win Rate', 'Matches'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  data.forEach((row, idx) => {
    const tr = document.createElement('tr');
    const rankTd = document.createElement('td');
    rankTd.textContent = idx + 1;
    const nameTd = document.createElement('td');
    nameTd.textContent = row.name;
    const ratingTd = document.createElement('td');
    ratingTd.textContent = row.rating;
    const winRateTd = document.createElement('td');
    winRateTd.textContent = `${row.winRate}%`;
    const matchesTd = document.createElement('td');
    matchesTd.textContent = row.matches;
    tr.appendChild(rankTd);
    tr.appendChild(nameTd);
    tr.appendChild(ratingTd);
    tr.appendChild(winRateTd);
    tr.appendChild(matchesTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function generateRankingData(count) {
  const names = ['Alice', 'Bob', 'Charlie', 'Dana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy', 'Ken', 'Laura', 'Mallory', 'Niaj', 'Olivia', 'Peggy', 'Quentin', 'Ruth', 'Steve', 'Trudy'];
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      name: names[getRandomInt(0, names.length - 1)],
      rating: getRandomInt(800, 2200),
      winRate: getRandomInt(40, 95),
      matches: getRandomInt(20, 200)
    });
  }
  // Sort by rating desc
  data.sort((a, b) => b.rating - a.rating);
  return data;
}

function switchRankingTab(targetId, btn) {
  document.querySelectorAll('.ranking-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.ranking-table').forEach(div => div.classList.add('hidden'));
  document.getElementById(targetId).classList.remove('hidden');
}

// Profile page
function initProfile() {
  const history = [];
  for (let i = 0; i < 5; i++) {
    const win = Math.random() > 0.5;
    history.push({ opponent: generateName(), result: win ? 'Win' : 'Loss', rating: win ? '+12' : '-8' });
  }
  const list = document.getElementById('history-list');
  history.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.opponent} – ${item.result} (${item.rating})`;
    list.appendChild(li);
  });
}

// Tasks page
function initTasks() {
  const tasks = [
    { id: 1, desc: 'Play 3 matches', progress: 0.4, reward: '+20 coins', claimed: false },
    { id: 2, desc: 'Win 2 games', progress: 0.2, reward: '+30 coins', claimed: false },
    { id: 3, desc: 'Complete a training puzzle', progress: 0, reward: '+50 coins', claimed: false }
  ];
  const container = document.getElementById('tasks-list');
  container.innerHTML = '';
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'task-item';
    const desc = document.createElement('div');
    desc.className = 'task-desc';
    desc.textContent = task.desc;
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    const progress = document.createElement('div');
    progress.className = 'progress';
    progress.style.width = `${task.progress * 100}%`;
    progressBar.appendChild(progress);
    const reward = document.createElement('div');
    reward.className = 'task-reward';
    reward.textContent = task.reward;
    const btn = document.createElement('button');
    btn.className = 'claim-btn';
    btn.textContent = task.claimed ? 'Claimed' : 'Claim';
    btn.disabled = task.claimed;
    btn.addEventListener('click', () => {
      if (!task.claimed) {
        task.claimed = true;
        btn.textContent = 'Claimed';
        btn.disabled = true;
      }
    });
    item.appendChild(desc);
    item.appendChild(progressBar);
    item.appendChild(reward);
    item.appendChild(btn);
    container.appendChild(item);
  });
}

// Social page
function initSocial() {
  const friends = generatePeople(6);
  const recent = generatePeople(5);
  const blocked = generatePeople(2);
  populateSocialTable('friends-list', friends);
  populateSocialTable('recent-list', recent);
  populateSocialTable('blocked-list', blocked);
}

function populateSocialTable(id, list) {
  const container = document.getElementById(id);
  container.innerHTML = '';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Name', 'Status'].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  list.forEach(person => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = person.name;
    const statusTd = document.createElement('td');
    statusTd.textContent = person.status;
    tr.appendChild(nameTd);
    tr.appendChild(statusTd);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

function switchSocialTab(targetId, btn) {
  document.querySelectorAll('.social-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.social-table').forEach(div => div.classList.add('hidden'));
  document.getElementById(targetId).classList.remove('hidden');
}

// AI page
function initAI() {
  // Prepopulate with empty suggestions
  populateSuggestions();
}

function populateSuggestions() {
  const suggestionsContainer = document.querySelector('#ai-suggestions ul');
  suggestionsContainer.innerHTML = '';
  const suggestions = [];
  const letters = 'ABCDEFGHIJKLMNO';
  for (let i = 0; i < 5; i++) {
    const x = letters[getRandomInt(0, 14)];
    const y = getRandomInt(1, 15);
    const threat = ['Low', 'Medium', 'High'][getRandomInt(0, 2)];
    suggestions.push(`${x}${y} – Threat: ${threat}`);
  }
  suggestions.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    suggestionsContainer.appendChild(li);
  });
}

// Training page
function initTraining() {
  const trainingList = document.getElementById('training-list');
  trainingList.innerHTML = '';
  const modules = [
    { title: 'Basic Openings', desc: 'Learn the fundamentals of starting positions.' },
    { title: 'Midgame Tactics', desc: 'Recognise patterns and plan ahead.' },
    { title: 'Endgame Strategies', desc: 'Master the final stage of a match.' }
  ];
  modules.forEach(mod => {
    const item = document.createElement('div');
    item.className = 'training-item';
    const h4 = document.createElement('h4');
    h4.textContent = mod.title;
    const p = document.createElement('p');
    p.textContent = mod.desc;
    const btn = document.createElement('button');
    btn.className = 'primary-btn';
    btn.textContent = 'Start';
    btn.addEventListener('click', () => {
      alert('Training module not yet implemented.');
    });
    item.appendChild(h4);
    item.appendChild(p);
    item.appendChild(btn);
    trainingList.appendChild(item);
  });
}

// Shop page
function initShop() {
  const items = [
    { name: 'Golden Theme', price: '500', image: assetCdn.coverTexas },
    { name: 'Futuristic Board', price: '800', image: assetCdn.coverChess },
    { name: 'Avatar Pack', price: '300', image: assetCdn.coverAi }
  ];
  const container = document.getElementById('shop-items');
  container.innerHTML = '';
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'shop-item';
    const img = document.createElement('img');
    img.src = item.image;
    const nameDiv = document.createElement('div');
    nameDiv.className = 'item-name';
    nameDiv.textContent = item.name;
    const priceDiv = document.createElement('div');
    priceDiv.className = 'item-price';
    priceDiv.textContent = `${item.price} coins`;
    const btn = document.createElement('button');
    btn.className = 'buy-btn';
    btn.textContent = 'Buy';
    btn.addEventListener('click', () => {
      alert('Purchase completed!');
    });
    card.appendChild(img);
    card.appendChild(nameDiv);
    card.appendChild(priceDiv);
    card.appendChild(btn);
    container.appendChild(card);
  });
}

// Utility functions
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName() {
  const names = ['Alan', 'Betty', 'Cindy', 'David', 'Ellen', 'Fred', 'Gina', 'Harry', 'Irene', 'Jack', 'Kevin', 'Luna', 'Mike', 'Nina'];
  return names[getRandomInt(0, names.length - 1)];
}

function generatePeople(count) {
  const statuses = ['Online', 'Offline', 'In Game'];
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({ name: generateName(), status: statuses[getRandomInt(0, statuses.length - 1)] });
  }
  return list;
}
