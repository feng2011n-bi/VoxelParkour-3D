/**
 * Procedural 16x16 pixel textures for Minecraft aesthetic.
 * Memory footprint < 60KB total — ideal for 32-bit Android architecture.
 */
import * as THREE from 'three';

export interface BlockMaterials {
  grassTop: THREE.MeshLambertMaterial;
  grassSide: THREE.MeshLambertMaterial;
  dirt: THREE.MeshLambertMaterial;
  stone: THREE.MeshLambertMaterial;
  wood: THREE.MeshLambertMaterial;
  slime: THREE.MeshLambertMaterial;
  gold: THREE.MeshLambertMaterial;
  diamond: THREE.MeshLambertMaterial;
  crumbling: THREE.MeshLambertMaterial;
  obsidian: THREE.MeshLambertMaterial;
  lava: THREE.MeshBasicMaterial;
  multiGrassMaterials: THREE.MeshLambertMaterial[];
}

function createPixelTexture(
  drawFn: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 16
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false; // Save GPU memory on 32-bit Android
  return texture;
}

// Pseudo-random deterministic noise
function pseudoRandom(x: number, y: number, seed = 42): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

export function generateTextures() {
  // 1. Grass Top
  const grassTopTex = createPixelTexture((ctx, size) => {
    const baseGreen = [86, 172, 56]; // #56ac38
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rand = (pseudoRandom(x, y, 1) - 0.5) * 35;
        const r = Math.min(255, Math.max(0, Math.floor(baseGreen[0] + rand * 0.8)));
        const g = Math.min(255, Math.max(0, Math.floor(baseGreen[1] + rand)));
        const b = Math.min(255, Math.max(0, Math.floor(baseGreen[2] + rand * 0.5)));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 2. Dirt
  const dirtTex = createPixelTexture((ctx, size) => {
    const baseDirt = [134, 96, 67]; // #866043
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rand = (pseudoRandom(x, y, 2) - 0.5) * 40;
        const r = Math.min(255, Math.max(0, Math.floor(baseDirt[0] + rand)));
        const g = Math.min(255, Math.max(0, Math.floor(baseDirt[1] + rand * 0.8)));
        const b = Math.min(255, Math.max(0, Math.floor(baseDirt[2] + rand * 0.6)));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 3. Grass Side (Dirt with green dripping fringe)
  const grassSideTex = createPixelTexture((ctx, size) => {
    const baseDirt = [134, 96, 67];
    const baseGreen = [86, 172, 56];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fringeHeight = 3 + Math.floor(pseudoRandom(x, 0, 3) * 3);
        const isGrass = y < fringeHeight;
        if (isGrass) {
          const rand = (pseudoRandom(x, y, 4) - 0.5) * 35;
          ctx.fillStyle = `rgb(${baseGreen[0] + rand * 0.8},${baseGreen[1] + rand},${baseGreen[2] + rand * 0.5})`;
        } else {
          const rand = (pseudoRandom(x, y, 5) - 0.5) * 40;
          ctx.fillStyle = `rgb(${baseDirt[0] + rand},${baseDirt[1] + rand * 0.8},${baseDirt[2] + rand * 0.6})`;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 4. Stone
  const stoneTex = createPixelTexture((ctx, size) => {
    const baseGray = 125;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rand = (pseudoRandom(x, y, 6) - 0.5) * 45;
        const val = Math.min(220, Math.max(50, Math.floor(baseGray + rand)));
        ctx.fillStyle = `rgb(${val},${val},${val})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 5. Wood Planks
  const woodTex = createPixelTexture((ctx, size) => {
    for (let y = 0; y < size; y++) {
      const plankIndex = Math.floor(y / 4);
      const isPlankBorder = y % 4 === 3;
      for (let x = 0; x < size; x++) {
        if (isPlankBorder) {
          ctx.fillStyle = '#6b4c2b';
        } else {
          const shift = plankIndex * 2;
          const isSeam = (x + shift) % 8 === 0 && y % 4 === 1;
          if (isSeam) {
            ctx.fillStyle = '#5c3e21';
          } else {
            const rand = (pseudoRandom(x, y, 7) - 0.5) * 20;
            const r = Math.floor(168 + rand);
            const g = Math.floor(129 + rand * 0.8);
            const b = Math.floor(77 + rand * 0.5);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
          }
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 6. Slime Block (Bright green bounce pad)
  const slimeTex = createPixelTexture((ctx, size) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
        const isCore = x >= 4 && x <= 11 && y >= 4 && y <= 11;
        if (isBorder) {
          ctx.fillStyle = '#4ade80';
        } else if (isCore) {
          ctx.fillStyle = '#22c55e';
        } else {
          ctx.fillStyle = '#86efac';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 7. Gold Block
  const goldTex = createPixelTexture((ctx, size) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
        const rand = (pseudoRandom(x, y, 8) - 0.5) * 30;
        if (isBorder) {
          ctx.fillStyle = '#b45309';
        } else {
          const r = Math.floor(250 + rand * 0.2);
          const g = Math.floor(204 + rand);
          const b = Math.floor(21 + rand * 0.5);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 8. Diamond Block
  const diamondTex = createPixelTexture((ctx, size) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
        const rand = (pseudoRandom(x, y, 9) - 0.5) * 25;
        if (isBorder) {
          ctx.fillStyle = '#0891b2';
        } else {
          const r = Math.floor(45 + rand * 0.5);
          const g = Math.floor(212 + rand);
          const b = Math.floor(235 + rand);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 9. Crumbling Block (Sand / Gravel)
  const crumblingTex = createPixelTexture((ctx, size) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rand = (pseudoRandom(x, y, 10) - 0.5) * 50;
        const r = Math.floor(217 + rand);
        const g = Math.floor(190 + rand * 0.8);
        const b = Math.floor(138 + rand * 0.5);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 10. Obsidian
  const obsidianTex = createPixelTexture((ctx, size) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rand = pseudoRandom(x, y, 11);
        if (rand > 0.88) {
          ctx.fillStyle = '#581c87'; // Purple crystal fleck
        } else {
          const val = Math.floor(18 + rand * 25);
          ctx.fillStyle = `rgb(${val + 5},${val},${val + 15})`;
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // 11. Lava Texture
  const lavaTex = createPixelTexture((ctx, size) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rand = pseudoRandom(x, y, 12);
        if (rand > 0.7) {
          ctx.fillStyle = '#fde047'; // Bright yellow bubble
        } else if (rand > 0.4) {
          ctx.fillStyle = '#ea580c'; // Bright orange
        } else {
          ctx.fillStyle = '#dc2626'; // Deep red
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  });

  // Mesh Materials using MeshLambertMaterial (fast for 32-bit mobile GPU)
  const grassTop = new THREE.MeshLambertMaterial({ map: grassTopTex });
  const grassSide = new THREE.MeshLambertMaterial({ map: grassSideTex });
  const dirt = new THREE.MeshLambertMaterial({ map: dirtTex });
  const stone = new THREE.MeshLambertMaterial({ map: stoneTex });
  const wood = new THREE.MeshLambertMaterial({ map: woodTex });
  const slime = new THREE.MeshLambertMaterial({ map: slimeTex, transparent: true, opacity: 0.9 });
  const gold = new THREE.MeshLambertMaterial({ map: goldTex });
  const diamond = new THREE.MeshLambertMaterial({ map: diamondTex });
  const crumbling = new THREE.MeshLambertMaterial({ map: crumblingTex });
  const obsidian = new THREE.MeshLambertMaterial({ map: obsidianTex });
  const lava = new THREE.MeshBasicMaterial({ map: lavaTex });

  // Cube order in Three.js: +X, -X, +Y, -Y, +Z, -Z
  const multiGrassMaterials = [
    grassSide, // +X
    grassSide, // -X
    grassTop,  // +Y (top)
    dirt,      // -Y (bottom)
    grassSide, // +Z
    grassSide, // -Z
  ];

  return {
    grassTop,
    grassSide,
    dirt,
    stone,
    wood,
    slime,
    gold,
    diamond,
    crumbling,
    obsidian,
    lava,
    multiGrassMaterials,
  };
}

/**
 * Procedural Steve skin arm canvas texture
 */
export function generateArmTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Sleeve (Cyan / Teal shirt)
  ctx.fillStyle = '#00a8a8';
  ctx.fillRect(0, 0, 16, 12);
  // Shirt shadows
  ctx.fillStyle = '#008484';
  ctx.fillRect(0, 10, 16, 2);

  // Arm skin (tan/peach)
  ctx.fillStyle = '#b78256';
  ctx.fillRect(0, 12, 16, 20);
  // Hand knuckles
  ctx.fillStyle = '#9e6d45';
  ctx.fillRect(2, 26, 12, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}
