let phaserPromise: Promise<any> | null = null;

const PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.80.0/dist/phaser.min.js';

export async function loadPhaser() {
  if (typeof window === 'undefined') {
    throw new Error('Phaser 仅能在浏览器环境加载');
  }
  if ((window as any).Phaser) {
    return (window as any).Phaser;
  }
  if (phaserPromise) {
    return phaserPromise;
  }
  phaserPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PHASER_CDN;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      if ((window as any).Phaser) {
        resolve((window as any).Phaser);
      } else {
        reject(new Error('Phaser 脚本加载完成但未找到全局 Phaser 对象'));
      }
    };
    script.onerror = () => {
      reject(new Error('Phaser 脚本加载失败'));
    };
    document.head.appendChild(script);
  });
  return phaserPromise;
}
