export interface AvatarSprite {
  id: string;
  displayName: string;
  lore: string;
  theme: 'poker' | 'board' | 'strategy' | 'wildcard';
  uri: string;
  dominantColors: string[];
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const auroraStrategist = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1b1f4b"/>
        <stop offset="40%" stop-color="#233c74"/>
        <stop offset="100%" stop-color="#468fcb"/>
      </linearGradient>
      <radialGradient id="halo" cx="0.48" cy="0.42" r="0.62">
        <stop offset="0%" stop-color="#fff2c2" stop-opacity="0.95"/>
        <stop offset="38%" stop-color="#ffd66b" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#ff9a3d" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="cloak" x1="0" y1="0.2" x2="1" y2="0.8">
        <stop offset="0%" stop-color="#3ad0ff"/>
        <stop offset="52%" stop-color="#1c8ef9"/>
        <stop offset="100%" stop-color="#3066ff"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" fill="url(#bg)" rx="48"/>
    <circle cx="132" cy="118" r="96" fill="url(#halo)"/>
    <path d="M90 192c18-32 28-48 62-48s44 16 62 48c-18 22-44 36-62 36s-44-14-62-36z" fill="url(#cloak)"/>
    <path d="M128 72c22 0 40 18 40 48s-18 58-40 58-40-28-40-58 18-48 40-48z" fill="#ffe8c6"/>
    <g fill="none" stroke="#0b2147" stroke-width="6" stroke-linecap="round">
      <path d="M114 120c4 6 10 10 14 10s10-4 14-10"/>
      <path d="M110 104c6-6 16-6 22 0"/>
      <path d="M146 104c6-6 16-6 22 0"/>
    </g>
    <circle cx="98" cy="90" r="14" fill="#0b2147" opacity="0.35"/>
    <circle cx="158" cy="90" r="14" fill="#0b2147" opacity="0.35"/>
    <path d="M66 220c28-14 52-10 62 0" stroke="#81e9ff" stroke-width="6" stroke-linecap="round"/>
    <path d="M190 220c-28-14-52-10-62 0" stroke="#81e9ff" stroke-width="6" stroke-linecap="round"/>
    <path d="M70 52l38-22 22 10 24-16 32 28-16 8-34-12-28 16z" fill="#81f3ff" opacity="0.55"/>
    <path d="M198 70l8 8-18 32-22-14z" fill="#ffe15f" opacity="0.65"/>
  </svg>
`);

const neonCardMaster = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="nbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#05020f"/>
        <stop offset="50%" stop-color="#1a0938"/>
        <stop offset="100%" stop-color="#3d165c"/>
      </linearGradient>
      <radialGradient id="nring" cx="0.5" cy="0.52" r="0.55">
        <stop offset="0%" stop-color="#ff5cf1" stop-opacity="0.95"/>
        <stop offset="38%" stop-color="#c61cff" stop-opacity="0.62"/>
        <stop offset="100%" stop-color="#4400ff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="nsuit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffb86c"/>
        <stop offset="100%" stop-color="#ff5c8a"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="48" fill="url(#nbg)"/>
    <circle cx="128" cy="128" r="92" fill="url(#nring)"/>
    <g transform="translate(56 64)">
      <rect x="12" y="12" width="120" height="168" rx="18" fill="#130b27" stroke="#7b3dff" stroke-width="5"/>
      <rect x="26" y="32" width="92" height="132" rx="14" fill="#1e123f" stroke="#ff69b4" stroke-width="4"/>
      <path d="M72 128c-16-20-32-36-32-48 0-16 12-28 28-28 10 0 18 6 22 12 4-6 12-12 22-12 16 0 28 12 28 28 0 12-16 28-32 48-6 8-12 16-18 26-6-10-12-18-18-26z" fill="url(#nsuit)"/>
      <circle cx="32" cy="24" r="8" fill="#ff69b4"/>
      <circle cx="124" cy="156" r="8" fill="#8be9fd"/>
      <path d="M32 24l8 20h-16z" fill="#ffe347" opacity="0.8"/>
      <path d="M124 156l-8-20h16z" fill="#ffe347" opacity="0.8"/>
    </g>
    <path d="M78 210c14-28 40-42 50-44" stroke="#ff9bff" stroke-width="6" stroke-linecap="round"/>
    <path d="M178 210c-14-28-40-42-50-44" stroke="#6bdcff" stroke-width="6" stroke-linecap="round"/>
    <circle cx="96" cy="72" r="10" fill="#ff8dd6"/>
    <circle cx="160" cy="72" r="10" fill="#6bdcff"/>
  </svg>
`);

const jadeGeneral = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="jbg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#05220c"/>
        <stop offset="100%" stop-color="#0d4f21"/>
      </linearGradient>
      <linearGradient id="jarmor" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#65d07f"/>
        <stop offset="100%" stop-color="#1e7a44"/>
      </linearGradient>
      <radialGradient id="jhalo" cx="0.45" cy="0.35" r="0.68">
        <stop offset="0%" stop-color="#f6ffd9" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="#c8f8ac" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#87cc79" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="256" height="256" rx="48" fill="url(#jbg)"/>
    <circle cx="120" cy="112" r="96" fill="url(#jhalo)"/>
    <path d="M60 200c24-40 52-60 68-60s44 20 68 60c-18 18-40 28-68 28s-50-10-68-28z" fill="url(#jarmor)"/>
    <path d="M128 70c28 0 46 18 46 48s-18 62-46 62-46-32-46-62 18-48 46-48z" fill="#ffe8c2"/>
    <path d="M96 78l32-22 32 22" fill="none" stroke="#c2ffae" stroke-width="10" stroke-linecap="round"/>
    <path d="M90 134c20-12 76-12 96 0" stroke="#0b3924" stroke-width="8" stroke-linecap="round"/>
    <path d="M112 110c6-6 12-6 18 0" stroke="#0b3924" stroke-width="6" stroke-linecap="round"/>
    <path d="M146 110c6-6 12-6 18 0" stroke="#0b3924" stroke-width="6" stroke-linecap="round"/>
    <circle cx="84" cy="162" r="14" fill="#1d7f43"/>
    <circle cx="172" cy="162" r="14" fill="#1d7f43"/>
    <path d="M56 76l28-12 12 20-16 20z" fill="#8ef7a9" opacity="0.7"/>
    <path d="M200 76l-28-12-12 20 16 20z" fill="#8ef7a9" opacity="0.7"/>
  </svg>
`);

const emberTactician = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="ebg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#290504"/>
        <stop offset="100%" stop-color="#630b04"/>
      </linearGradient>
      <linearGradient id="eflame" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffcf70"/>
        <stop offset="50%" stop-color="#ff8a3c"/>
        <stop offset="100%" stop-color="#e22d2d"/>
      </linearGradient>
      <radialGradient id="ering" cx="0.52" cy="0.42" r="0.58">
        <stop offset="0%" stop-color="#ffe6a8" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="#ff9346" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#ff4d4d" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="256" height="256" rx="48" fill="url(#ebg)"/>
    <circle cx="136" cy="116" r="96" fill="url(#ering)"/>
    <path d="M64 212c24-46 56-70 72-70s48 24 72 70c-22 20-46 32-72 32s-50-12-72-32z" fill="#3f0c05"/>
    <path d="M136 68c24 0 40 16 40 46s-16 70-40 70-40-40-40-70 16-46 40-46z" fill="#ffd9ba"/>
    <path d="M112 70c12-12 24-18 24-18s12 6 24 18" fill="none" stroke="#ffb347" stroke-width="10" stroke-linecap="round"/>
    <path d="M108 128c18-10 54-10 72 0" stroke="#421615" stroke-width="8" stroke-linecap="round"/>
    <path d="M122 110c6-6 10-6 16 0" stroke="#421615" stroke-width="6" stroke-linecap="round"/>
    <path d="M154 110c6-6 10-6 16 0" stroke="#421615" stroke-width="6" stroke-linecap="round"/>
    <g transform="translate(32 20) rotate(-10 96 120)">
      <path d="M56 144c32-18 48-48 48-68 0-18-8-32-20-42 44 10 70 44 70 70s-20 52-48 68z" fill="url(#eflame)" opacity="0.8"/>
    </g>
    <circle cx="88" cy="184" r="14" fill="#ff9045"/>
    <circle cx="184" cy="184" r="14" fill="#ff9045"/>
  </svg>
`);

const quantumDealer = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="qbg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#020d24"/>
        <stop offset="100%" stop-color="#083258"/>
      </linearGradient>
      <radialGradient id="qgrid" cx="0.48" cy="0.5" r="0.75">
        <stop offset="0%" stop-color="#4dffdf" stop-opacity="0.8"/>
        <stop offset="50%" stop-color="#00bcd4" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#005b96" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="256" height="256" rx="48" fill="url(#qbg)"/>
    <path d="M40 192l48-112 40 64 40-112 48 160z" fill="none" stroke="#4dffdf" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="128" cy="128" r="84" fill="url(#qgrid)"/>
    <g stroke="#4dffdf" stroke-width="4" fill="none">
      <path d="M76 128h104"/>
      <path d="M128 76v104"/>
      <path d="M92 92l72 72"/>
      <path d="M92 164l72-72"/>
    </g>
    <circle cx="128" cy="128" r="20" fill="#03233a" stroke="#4dffdf" stroke-width="6"/>
    <circle cx="128" cy="128" r="8" fill="#4dffdf"/>
    <path d="M96 208c18-28 64-28 80 0" stroke="#4dffdf" stroke-width="6" stroke-linecap="round"/>
    <path d="M70 70l18-18 18 18-18 18z" fill="#4dffdf" opacity="0.75"/>
    <path d="M168 70l18-18 18 18-18 18z" fill="#4dffdf" opacity="0.75"/>
  </svg>
`);

const astralScholar = toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="abg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#120f2d"/>
        <stop offset="100%" stop-color="#281f63"/>
      </linearGradient>
      <radialGradient id="astar" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0%" stop-color="#ffe9fe" stop-opacity="0.9"/>
        <stop offset="70%" stop-color="#b398ff" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#321c5c" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="256" height="256" rx="48" fill="url(#abg)"/>
    <circle cx="120" cy="116" r="96" fill="url(#astar)"/>
    <path d="M64 200c22-40 52-60 68-60s46 20 68 60c-22 20-44 28-68 28s-46-8-68-28z" fill="#26114f"/>
    <path d="M124 72c26 0 44 20 44 52s-18 60-44 60-44-28-44-60 18-52 44-52z" fill="#fce8ff"/>
    <path d="M88 92c20-14 44-14 72 0" fill="none" stroke="#9f84ff" stroke-width="6" stroke-linecap="round"/>
    <path d="M104 118c8-6 14-6 20 0" stroke="#2a1746" stroke-width="6" stroke-linecap="round"/>
    <path d="M148 118c8-6 14-6 20 0" stroke="#2a1746" stroke-width="6" stroke-linecap="round"/>
    <path d="M96 146c18 12 38 12 56 0" fill="none" stroke="#f7c8ff" stroke-width="6" stroke-linecap="round"/>
    <g fill="#f6f0ff" opacity="0.8">
      <circle cx="64" cy="64" r="6"/>
      <circle cx="92" cy="48" r="4"/>
      <circle cx="120" cy="40" r="6"/>
      <circle cx="170" cy="54" r="5"/>
      <circle cx="196" cy="90" r="7"/>
    </g>
    <path d="M62 226c16-8 34-10 50-4" stroke="#9f84ff" stroke-width="6" stroke-linecap="round"/>
    <path d="M186 226c-16-8-34-10-50-4" stroke="#9f84ff" stroke-width="6" stroke-linecap="round"/>
  </svg>
`);

export const avatarSprites: AvatarSprite[] = [
  {
    id: 'aurora-strategist',
    displayName: '极光策士',
    lore: '来自北境的博弈大师，擅长通过光谱分析对手的心跳节奏。',
    theme: 'strategy',
    uri: auroraStrategist,
    dominantColors: ['#1b1f4b', '#468fcb', '#ffe8c6']
  },
  {
    id: 'neon-card-master',
    displayName: '霓虹牌皇',
    lore: '她掌控霓虹灯下的每一次发牌，动作如节奏舞者般精准。',
    theme: 'poker',
    uri: neonCardMaster,
    dominantColors: ['#05020f', '#ff69b4', '#7b3dff']
  },
  {
    id: 'jade-general',
    displayName: '玉麟将军',
    lore: '镇守棋局的东方守护者，曾用一局暗棋挽救千军。',
    theme: 'board',
    uri: jadeGeneral,
    dominantColors: ['#05220c', '#65d07f', '#ffe8c2']
  },
  {
    id: 'ember-tactician',
    displayName: '焰心策士',
    lore: '火焰与筹码共舞，他擅长在高压对局中逆转。',
    theme: 'strategy',
    uri: emberTactician,
    dominantColors: ['#290504', '#ff8a3c', '#ffd9ba']
  },
  {
    id: 'quantum-dealer',
    displayName: '量子荷官',
    lore: '在量子叠加态中发牌，每一局都是可计算的命运。',
    theme: 'poker',
    uri: quantumDealer,
    dominantColors: ['#020d24', '#4dffdf', '#00bcd4']
  },
  {
    id: 'astral-scholar',
    displayName: '星象学者',
    lore: '她从星图中解析胜率，是队伍的宇宙策划师。',
    theme: 'board',
    uri: astralScholar,
    dominantColors: ['#120f2d', '#9f84ff', '#fce8ff']
  }
];
