/**
 * Infinite procedural parkour generator with difficulty scaling and memory recycling.
 */
import { BlockData, BlockType, BLOCK_SIZE } from './constants';

export class WorldGenerator {
  public blocks: BlockData[] = [];
  public diamonds: BlockData[] = [];
  private lastZ = 0;
  private lastX = 0;
  private lastY = 0;
  private blockIdCounter = 0;
  private generatedDistance = 0;

  constructor() {
    this.reset();
  }

  public reset() {
    this.blocks = [];
    this.diamonds = [];
    this.blockIdCounter = 0;
    this.lastZ = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.generatedDistance = 0;

    // Build spawn island (wide safe starting zone)
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 4; z++) {
        this.addBlock({
          type: BlockType.GRASS,
          x: x * BLOCK_SIZE,
          y: 0,
          z: z * BLOCK_SIZE,
          width: 1,
          height: 1,
          depth: 1,
        });
      }
    }
    this.lastZ = 4;
    this.lastX = 0;
    this.lastY = 0;
    this.generatedDistance = 4;

    // Generate initial stretch of parkour
    this.generateAhead(60);
  }

  private addBlock(block: Omit<BlockData, 'id'>): BlockData {
    const fullBlock: BlockData = {
      ...block,
      id: ++this.blockIdCounter,
      initialX: block.x,
      initialY: block.y,
    };
    this.blocks.push(fullBlock);
    return fullBlock;
  }

  private addDiamond(x: number, y: number, z: number) {
    this.diamonds.push({
      id: ++this.blockIdCounter,
      type: BlockType.DIAMOND,
      x,
      y,
      z,
      width: 0.5,
      height: 0.5,
      depth: 0.5,
      collected: false,
    });
  }

  /**
   * Generates parkour segments up to targetZ ahead of player
   */
  public generateAhead(targetZ: number) {
    while (this.lastZ < targetZ) {
      this.generateNextSegment();
    }
  }

  private generateNextSegment() {
    const dist = this.lastZ;

    // Difficulty tiers based on distance
    const isEarly = dist < 30;
    const isMid = dist >= 30 && dist < 80;
    const isHard = dist >= 80;

    const segmentTypeRoll = Math.random();

    // 1. Slime super-bounce jump pad
    if (!isEarly && segmentTypeRoll < 0.16) {
      // Slime pad
      const gap = 2.5 + Math.random() * 1.0;
      const nextZ = this.lastZ + gap;
      const nextX = this.lastX + (Math.random() - 0.5) * 1.5;
      const slimeY = this.lastY;

      this.addBlock({
        type: BlockType.SLIME,
        x: nextX,
        y: slimeY,
        z: nextZ,
        width: 1,
        height: 1,
        depth: 1,
      });

      // Target high landing platform 6-7 blocks away and 3-4 blocks higher!
      const landingZ = nextZ + 6.0;
      const landingY = slimeY + 3.0;
      const landingX = nextX + (Math.random() - 0.5) * 2;

      this.addBlock({
        type: BlockType.GOLD,
        x: landingX,
        y: landingY,
        z: landingZ,
        width: 2,
        height: 1,
        depth: 2,
      });

      // Spawn bonus diamond high in air between slime and platform
      this.addDiamond(nextX, slimeY + 2.5, nextZ + 3.0);

      this.lastZ = landingZ + 1;
      this.lastX = landingX;
      this.lastY = landingY;
      return;
    }

    // 2. Crumbling sand block sequence
    if (isMid && segmentTypeRoll < 0.32) {
      const count = 2 + Math.floor(Math.random() * 2);
      let currX = this.lastX;
      let currY = this.lastY;
      let currZ = this.lastZ;

      for (let i = 0; i < count; i++) {
        const gap = 2.2 + Math.random() * 0.7;
        currZ += gap;
        currX += (Math.random() - 0.5) * 1.2;

        this.addBlock({
          type: BlockType.CRUMBLING,
          x: currX,
          y: currY,
          z: currZ,
          width: 1,
          height: 1,
          depth: 1,
          crumbleTimer: 0,
        });

        if (Math.random() < 0.5) {
          this.addDiamond(currX, currY + 1.2, currZ);
        }
      }

      // Safe landing platform after crumbling blocks
      currZ += 2.4;
      this.addBlock({
        type: BlockType.WOOD,
        x: currX,
        y: currY,
        z: currZ,
        width: 2,
        height: 1,
        depth: 2,
      });

      this.lastZ = currZ + 1;
      this.lastX = currX;
      this.lastY = currY;
      return;
    }

    // 3. Moving platform (horizontal sway)
    if (!isEarly && segmentTypeRoll < 0.48) {
      const gap = 2.8;
      const nextZ = this.lastZ + gap;
      const nextX = this.lastX;
      const nextY = this.lastY;

      this.addBlock({
        type: BlockType.OBSIDIAN,
        x: nextX,
        y: nextY,
        z: nextZ,
        width: 1.5,
        height: 0.8,
        depth: 1.5,
        isMoving: true,
        moveAxis: 'x',
        moveRange: 2.2,
        moveSpeed: 1.8 + Math.random() * 0.8,
      });

      // Target platform after moving one
      const endZ = nextZ + 3.0;
      const endX = nextX + (Math.random() - 0.5) * 2;
      this.addBlock({
        type: BlockType.STONE,
        x: endX,
        y: nextY,
        z: endZ,
        width: 2,
        height: 1,
        depth: 2,
      });

      this.lastZ = endZ + 1;
      this.lastX = endX;
      this.lastY = nextY;
      return;
    }

    // 4. Standard jump pattern (1-block, 2-block, 3-block, 4-block sprint jump)
    const gap = isEarly
      ? 2.0 + Math.random() * 0.8
      : isMid
      ? 2.5 + Math.random() * 1.1
      : 2.8 + Math.random() * 1.3;

    // Height change
    let deltaY = 0;
    if (!isEarly && Math.random() < 0.45) {
      // Step up (+1) or step down (-1 or -2)
      deltaY = Math.random() < 0.5 ? 1.0 : -1.0;
    }

    // Lateral deviation (zigzag parkour)
    const lateralShift = (Math.random() - 0.5) * (isEarly ? 1.8 : 3.2);

    const nextZ = this.lastZ + gap;
    const nextX = Math.max(-5, Math.min(5, this.lastX + lateralShift));
    const nextY = Math.max(-2, Math.min(8, this.lastY + deltaY));

    // Platform width: 1x1 for hard, 2x2 for easy/mid
    const platWidth = isHard && Math.random() < 0.6 ? 1 : (isEarly ? 2 : 1.5);
    const platDepth = isHard && Math.random() < 0.6 ? 1 : (isEarly ? 2 : 1.5);

    // Pick block theme
    let blockType = BlockType.GRASS;
    const typePicker = Math.random();
    if (typePicker < 0.4) blockType = BlockType.GRASS;
    else if (typePicker < 0.7) blockType = BlockType.STONE;
    else if (typePicker < 0.9) blockType = BlockType.WOOD;
    else blockType = BlockType.OBSIDIAN;

    this.addBlock({
      type: blockType,
      x: nextX,
      y: nextY,
      z: nextZ,
      width: platWidth,
      height: 1,
      depth: platDepth,
    });

    // Chance to place floating diamond
    if (Math.random() < 0.35) {
      this.addDiamond(nextX, nextY + 1.2, nextZ);
    }

    this.lastZ = nextZ + (platDepth > 1 ? 1 : 0);
    this.lastX = nextX;
    this.lastY = nextY;
  }

  /**
   * Recycles blocks behind the player to maintain high FPS and low RAM for 32-bit devices
   */
  public cleanupBehind(minZ: number) {
    // Remove blocks behind player
    let writeIdx = 0;
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      if (b.z >= minZ && !b.hasFallen) {
        this.blocks[writeIdx++] = b;
      }
    }
    this.blocks.length = writeIdx;

    // Remove collected or past diamonds
    let dWriteIdx = 0;
    for (let i = 0; i < this.diamonds.length; i++) {
      const d = this.diamonds[i];
      if (d.z >= minZ && !d.collected) {
        this.diamonds[dWriteIdx++] = d;
      }
    }
    this.diamonds.length = dWriteIdx;
  }

  /**
   * Updates moving and crumbling blocks
   */
  public updateDynamicBlocks(delta: number, time: number) {
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];

      // Moving platform logic
      if (b.isMoving && b.moveRange && b.moveSpeed && b.initialX !== undefined) {
        b.x = b.initialX + Math.sin(time * b.moveSpeed) * b.moveRange;
      }

      // Crumbling block logic
      if (b.crumbleTimer !== undefined && b.crumbleTimer > 0) {
        b.crumbleTimer += delta;
        // Shake before falling
        if (b.crumbleTimer < 0.6) {
          b.y = (b.initialY || 0) + (Math.sin(b.crumbleTimer * 50) * 0.05);
        } else {
          // Drop block
          b.y -= delta * 12.0;
          if (b.y < -15) {
            b.hasFallen = true;
          }
        }
      }
    }
  }
}
