/**
 * First-person player physics engine with AABB collision, Minecraft mechanics,
 * and zero-allocation scratch math for 32-bit mobile stability.
 */
import * as THREE from 'three';
import { PHYSICS, BlockData, BlockType } from './constants';
import { sounds } from './audio';
import { WorldGenerator } from './worldGen';

export interface PlayerInput {
  forward: number; // -1 to 1
  right: number;   // -1 to 1
  jump: boolean;
  sprint: boolean;
  yaw: number;     // horizontal look in radians
  pitch: number;   // vertical look in radians (-PI/2 to PI/2)
}

export interface PlayerState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isGrounded: boolean;
  isSprinting: boolean;
  currentBlock: BlockData | null;
  score: number;
  maxDistance: number;
  diamondsCollected: number;
  combo: number;
  comboTimer: number;
  isDead: boolean;
  deathReason: string;
}

export class PhysicsEngine {
  public state: PlayerState;
  private input: PlayerInput = {
    forward: 0,
    right: 0,
    jump: false,
    sprint: false,
    yaw: 0,
    pitch: 0,
  };

  private wasGrounded = true;
  private lastLandedBlockId = -1;
  private jumpCooldown = 0;
  private stepDistanceAccumulator = 0;

  // Pre-allocated scratch variables to eliminate GC stutter on 32-bit CPUs
  private scratchWishDir = new THREE.Vector3();
  private scratchMoveVec = new THREE.Vector3();

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): PlayerState {
    return {
      position: new THREE.Vector3(0, 2.0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      isGrounded: false,
      isSprinting: false,
      currentBlock: null,
      score: 0,
      maxDistance: 0,
      diamondsCollected: 0,
      combo: 1,
      comboTimer: 0,
      isDead: false,
      deathReason: '',
    };
  }

  public reset(spawnZ = 0) {
    this.state = this.getInitialState();
    this.state.position.set(0, 2.0, spawnZ);
    this.wasGrounded = false;
    this.lastLandedBlockId = -1;
  }

  public setInput(input: Partial<PlayerInput>) {
    Object.assign(this.input, input);
  }

  public update(delta: number, world: WorldGenerator): PlayerState {
    if (this.state.isDead) return this.state;

    // Clamp delta to prevent tunneling through blocks on frame drops
    const dt = Math.min(delta, 0.05);

    // 1. Calculate horizontal movement direction relative to camera yaw
    const forward = this.input.forward;
    const right = this.input.right;
    const isMoving = Math.abs(forward) > 0.05 || Math.abs(right) > 0.05;

    this.state.isSprinting = this.input.sprint && forward > 0.2;
    const targetSpeed = this.state.isSprinting ? PHYSICS.SPRINT_SPEED : PHYSICS.WALK_SPEED;

    const sinYaw = Math.sin(this.input.yaw);
    const cosYaw = Math.cos(this.input.yaw);

    // Direction vector in world space:
    // Forward vector is (-sin(yaw), cos(yaw))
    // Right vector is (-cos(yaw), -sin(yaw))
    const dirX = forward * (-sinYaw) + right * (-cosYaw);
    const dirZ = forward * cosYaw + right * (-sinYaw);

    this.scratchWishDir.set(dirX, 0, dirZ);
    if (this.scratchWishDir.lengthSq() > 0.001) {
      this.scratchWishDir.normalize();
    }

    // 2. Acceleration / Deceleration
    const accel = this.state.isGrounded ? PHYSICS.ACCELERATION : PHYSICS.ACCELERATION * PHYSICS.AIR_CONTROL;
    const friction = this.state.isGrounded ? PHYSICS.DECELERATION : 0.8;

    if (isMoving) {
      this.state.velocity.x += this.scratchWishDir.x * accel * dt;
      this.state.velocity.z += this.scratchWishDir.z * accel * dt;

      // Clamp horizontal velocity to target speed
      const horizSpeedSq = this.state.velocity.x * this.state.velocity.x + this.state.velocity.z * this.state.velocity.z;
      const maxSpeedSq = targetSpeed * targetSpeed;
      if (horizSpeedSq > maxSpeedSq) {
        const factor = targetSpeed / Math.sqrt(horizSpeedSq);
        this.state.velocity.x *= factor;
        this.state.velocity.z *= factor;
      }
    } else if (this.state.isGrounded) {
      // Apply friction
      const drop = friction * dt;
      const speed = Math.sqrt(this.state.velocity.x * this.state.velocity.x + this.state.velocity.z * this.state.velocity.z);
      if (speed > 0.001) {
        const newSpeed = Math.max(0, speed - drop * speed);
        const ratio = newSpeed / speed;
        this.state.velocity.x *= ratio;
        this.state.velocity.z *= ratio;
      } else {
        this.state.velocity.x = 0;
        this.state.velocity.z = 0;
      }
    }

    // 3. Gravity
    this.state.velocity.y += PHYSICS.GRAVITY * dt;

    // 4. Jump Handling
    if (this.jumpCooldown > 0) {
      this.jumpCooldown -= dt;
    }

    if (this.input.jump && this.state.isGrounded && this.jumpCooldown <= 0) {
      this.state.velocity.y = PHYSICS.JUMP_VELOCITY;
      this.state.isGrounded = false;
      this.jumpCooldown = 0.22;
      sounds.playJump();
    }

    // 5. Physics integration with AABB resolution
    this.moveAndCollide(dt, world);

    // 6. Sound effects for footsteps
    if (this.state.isGrounded && isMoving) {
      const movedDist = Math.sqrt(this.state.velocity.x * this.state.velocity.x + this.state.velocity.z * this.state.velocity.z) * dt;
      this.stepDistanceAccumulator += movedDist;
      const stepThreshold = this.state.isSprinting ? 2.2 : 1.7;
      if (this.stepDistanceAccumulator > stepThreshold) {
        this.stepDistanceAccumulator = 0;
        sounds.playStep();
      }
    }

    // 7. Check for landing sound and block specific effects
    if (!this.wasGrounded && this.state.isGrounded) {
      sounds.playLand();
      if (this.state.currentBlock) {
        const blk = this.state.currentBlock;

        // Slime block bounce
        if (blk.type === BlockType.SLIME) {
          this.state.velocity.y = PHYSICS.SLIME_JUMP_VELOCITY;
          this.state.isGrounded = false;
          sounds.playSlimeBounce();
        }

        // Crumbling sand block trigger
        if (blk.type === BlockType.CRUMBLING && blk.crumbleTimer === 0) {
          blk.crumbleTimer = 0.01;
          sounds.playCrumble();
        }

        // Combo chain calculation
        if (blk.id !== this.lastLandedBlockId && blk.z > 3) {
          this.lastLandedBlockId = blk.id;
          this.state.combo = Math.min(5, this.state.combo + 1);
          this.state.comboTimer = 3.5; // Combo resets if you hesitate too long
        }
      }
    }
    this.wasGrounded = this.state.isGrounded;

    // 8. Combo timer decay
    if (this.state.comboTimer > 0) {
      this.state.comboTimer -= dt;
      if (this.state.comboTimer <= 0) {
        this.state.combo = 1;
      }
    }

    // 9. Update distance & score
    const currentZ = Math.max(0, Math.floor(this.state.position.z));
    if (currentZ > this.state.maxDistance) {
      const addedDist = currentZ - this.state.maxDistance;
      this.state.maxDistance = currentZ;
      this.state.score += addedDist * 10 * this.state.combo;
    }

    // 10. Diamond collectible detection
    this.checkDiamondCollisions(world);

    // 11. Death condition: Falling into lava / void
    if (this.state.position.y < PHYSICS.FALL_LIMIT_Y) {
      this.state.isDead = true;
      this.state.deathReason = 'Упал в бездну с лавой!';
      sounds.playLavaSplash();
      sounds.playGameOver();
    }

    return this.state;
  }

  private moveAndCollide(dt: number, world: WorldGenerator) {
    const halfW = PHYSICS.PLAYER_WIDTH * 0.5;
    const halfD = PHYSICS.PLAYER_DEPTH * 0.5;
    const height = PHYSICS.PLAYER_HEIGHT;

    // Move in X
    this.state.position.x += this.state.velocity.x * dt;
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.hasFallen) continue;
      if (this.checkAABB(this.state.position.x, this.state.position.y, this.state.position.z, halfW, height, halfD, b)) {
        if (this.state.velocity.x > 0) {
          this.state.position.x = (b.x - b.width * 0.5) - halfW;
        } else if (this.state.velocity.x < 0) {
          this.state.position.x = (b.x + b.width * 0.5) + halfW;
        }
        this.state.velocity.x = 0;
      }
    }

    // Move in Z
    this.state.position.z += this.state.velocity.z * dt;
    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.hasFallen) continue;
      if (this.checkAABB(this.state.position.x, this.state.position.y, this.state.position.z, halfW, height, halfD, b)) {
        if (this.state.velocity.z > 0) {
          this.state.position.z = (b.z - b.depth * 0.5) - halfD;
        } else if (this.state.velocity.z < 0) {
          this.state.position.z = (b.z + b.depth * 0.5) + halfD;
        }
        this.state.velocity.z = 0;
      }
    }

    // Move in Y (vertical)
    this.state.position.y += this.state.velocity.y * dt;
    this.state.isGrounded = false;
    this.state.currentBlock = null;

    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.hasFallen) continue;
      if (this.checkAABB(this.state.position.x, this.state.position.y, this.state.position.z, halfW, height, halfD, b)) {
        if (this.state.velocity.y <= 0) {
          // Landed on top of block
          const blockTop = b.y + b.height * 0.5;
          this.state.position.y = blockTop;
          this.state.velocity.y = 0;
          this.state.isGrounded = true;
          this.state.currentBlock = b;

          // If standing on a moving block, match its movement!
          if (b.isMoving && b.moveSpeed && b.moveRange && b.initialX !== undefined) {
            // Apply slight horizontal velocity to carry player
            const velX = Math.cos(performance.now() * 0.001 * b.moveSpeed) * b.moveRange * b.moveSpeed;
            this.state.position.x += velX * dt;
          }
        } else if (this.state.velocity.y > 0) {
          // Hit head on bottom of block
          const blockBottom = b.y - b.height * 0.5;
          this.state.position.y = blockBottom - height;
          this.state.velocity.y = 0;
        }
      }
    }
  }

  private checkAABB(
    px: number, py: number, pz: number,
    halfW: number, pHeight: number, halfD: number,
    b: BlockData
  ): boolean {
    const bMinX = b.x - b.width * 0.5;
    const bMaxX = b.x + b.width * 0.5;
    const bMinY = b.y - b.height * 0.5;
    const bMaxY = b.y + b.height * 0.5;
    const bMinZ = b.z - b.depth * 0.5;
    const bMaxZ = b.z + b.depth * 0.5;

    const pMinX = px - halfW;
    const pMaxX = px + halfW;
    const pMinY = py;
    const pMaxY = py + pHeight;
    const pMinZ = pz - halfD;
    const pMaxZ = pz + halfD;

    return (
      pMinX < bMaxX &&
      pMaxX > bMinX &&
      pMinY < bMaxY &&
      pMaxY > bMinY &&
      pMinZ < bMaxZ &&
      pMaxZ > bMinZ
    );
  }

  private checkDiamondCollisions(world: WorldGenerator) {
    const pX = this.state.position.x;
    const pY = this.state.position.y + PHYSICS.EYE_HEIGHT * 0.5;
    const pZ = this.state.position.z;

    for (let i = 0; i < world.diamonds.length; i++) {
      const d = world.diamonds[i];
      if (d.collected) continue;

      const dx = pX - d.x;
      const dy = pY - d.y;
      const dz = pZ - d.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // Pickup radius ~ 1.1 blocks
      if (distSq < 1.2) {
        d.collected = true;
        this.state.diamondsCollected++;
        this.state.score += 150 * this.state.combo;
        sounds.playDiamond();
      }
    }
  }
}
