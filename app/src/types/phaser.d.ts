interface PhaserGameConfig {
  type?: number;
  parent?: HTMLElement | string;
  width?: number;
  height?: number;
  backgroundColor?: string | number;
  scene?: unknown;
  physics?: unknown;
  scale?: unknown;
}

interface PhaserGameInstance {
  destroy(removeCanvas?: boolean): void;
}

interface PhaserStatic {
  AUTO: number;
  Game: new (config: PhaserGameConfig) => PhaserGameInstance;
  Scene: new (config: { key: string; active?: boolean }) => unknown;
}

declare global {
  interface Window {
    Phaser?: PhaserStatic;
  }
}

export type PhaserModule = PhaserStatic;
