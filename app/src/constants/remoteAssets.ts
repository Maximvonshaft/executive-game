export const remoteAssets = {
  covers: {
    texasholdem: 'https://images.unsplash.com/photo-1549049950-4648d48f3f1a?auto=format&fit=crop&w=1600&q=80',
    doudizhu: 'https://images.unsplash.com/photo-1606149059549-29421bb9384d?auto=format&fit=crop&w=1600&q=80',
    xiangqi: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
    go: 'https://images.unsplash.com/photo-1518544889280-0fce63e049d4?auto=format&fit=crop&w=1600&q=80',
    ai: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
    chess: 'https://images.unsplash.com/photo-1529692236671-f1dc006204b4?auto=format&fit=crop&w=1200&q=80'
  },
  boards: {
    texasholdem: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80',
    doudizhu: 'https://images.unsplash.com/photo-1523292562811-8fa7962a78c8?auto=format&fit=crop&w=1600&q=80',
    xiangqi: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80',
    go: 'https://images.unsplash.com/photo-1516887121580-8dfb3d1cbf61?auto=format&fit=crop&w=1600&q=80'
  },
  ornaments: {
    loginRing: 'https://images.unsplash.com/photo-1527694224010-b365d05b1c87?auto=format&fit=crop&w=800&q=80',
    swirl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
  }
} as const;

export type RemoteAssets = typeof remoteAssets;
