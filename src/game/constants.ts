/**
 * Game constants, physics parameters, and 32-bit mobile architecture profiles.
 */

export const BLOCK_SIZE = 1.0;

export enum BlockType {
  GRASS = 0,
  STONE = 1,
  WOOD = 2,
  SLIME = 3,       // High jump pad
  GOLD = 4,        // Speed boost
  DIAMOND = 5,     // Collectible / high score
  CRUMBLING = 6,   // Falls 0.6s after landing
  OBSIDIAN = 7,    // Solid checkpoint / landmark
}

export interface BlockData {
  id: number;
  type: BlockType;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  isMoving?: boolean;
  moveAxis?: 'x' | 'y';
  moveRange?: number;
  moveSpeed?: number;
  initialX?: number;
  initialY?: number;
  crumbleTimer?: number; // < 0 means falling
  hasFallen?: boolean;
  collected?: boolean; // For diamond collectibles
}

export const PHYSICS = {
  GRAVITY: -26.0,
  WALK_SPEED: 5.8,
  SPRINT_SPEED: 8.5,
  JUMP_VELOCITY: 9.2,
  SLIME_JUMP_VELOCITY: 15.0,
  ACCELERATION: 45.0,
  DECELERATION: 16.0,
  AIR_CONTROL: 0.65,
  PLAYER_WIDTH: 0.6,
  PLAYER_DEPTH: 0.6,
  PLAYER_HEIGHT: 1.75,
  EYE_HEIGHT: 1.62,
  FALL_LIMIT_Y: -10.0,
  STEP_HEIGHT: 0.5,
};

export type QualityPreset = 'low32' | 'medium' | 'high';

export interface QualityConfig {
  name: string;
  description: string;
  pixelRatio: number;
  renderDistance: number;
  chunkCleanupDistance: number;
  particlesEnabled: boolean;
  dynamicLighting: boolean;
  fov: number;
}

export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  low32: {
    name: '32-бит Android (Эконом)',
    description: 'Минимум нагрузки на ОЗУ и GPU, стабильные 60 FPS на старых телефонах',
    pixelRatio: 0.85,
    renderDistance: 32,
    chunkCleanupDistance: 12,
    particlesEnabled: false,
    dynamicLighting: false,
    fov: 72,
  },
  medium: {
    name: 'Стандарт',
    description: 'Сбалансированное качество для большинства смартфонов',
    pixelRatio: 1.0,
    renderDistance: 45,
    chunkCleanupDistance: 16,
    particlesEnabled: true,
    dynamicLighting: true,
    fov: 75,
  },
  high: {
    name: 'Ультра (ПК / Флагман)',
    description: 'Максимальная дальность и эффекты',
    pixelRatio: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1.5, 1.5),
    renderDistance: 65,
    chunkCleanupDistance: 24,
    particlesEnabled: true,
    dynamicLighting: true,
    fov: 80,
  },
};
