/**
 * Three.js 3D WebGL Renderer with InstancedMesh batching,
 * first-person arm bobbing, and 32-bit mobile architecture optimizations.
 */
import * as THREE from 'three';
import { BlockData, BlockType, QualityConfig, QUALITY_PRESETS, PHYSICS } from './constants';
import { generateTextures, generateArmTexture, BlockMaterials } from './textures';
import { WorldGenerator } from './worldGen';
import { PlayerState } from './physics';

export class GameRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private materials: BlockMaterials;
  private armMesh: THREE.Group;

  // Instanced Meshes by block type for ultra-low draw calls (crucial for 32-bit Android GPUs)
  private instancedMeshes: Map<BlockType, THREE.InstancedMesh> = new Map();
  private maxInstancesPerType = 300;
  private boxGeometry: THREE.BoxGeometry;
  private diamondGeometry: THREE.OctahedronGeometry;
  private diamondMesh!: THREE.InstancedMesh;
  private maxDiamonds = 60;

  // Lava ocean plane
  private lavaMesh: THREE.Mesh;

  // Voxel clouds group
  private cloudsGroup: THREE.Group;

  // Arm bobbing state
  private armBobTimer = 0;
  private swingTimer = 0;

  // Current quality
  public quality: QualityConfig = QUALITY_PRESETS.medium;

  // Reusable dummy object for instance transforms to prevent GC allocations
  private dummy = new THREE.Object3D();

  constructor(container: HTMLElement, qualityPreset: keyof typeof QUALITY_PRESETS = 'medium') {
    this.quality = QUALITY_PRESETS[qualityPreset];

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x78a7ff); // Classic Minecraft blue sky
    this.scene.fog = new THREE.FogExp2(0x78a7ff, 0.022);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(this.quality.fov, aspect, 0.1, 120);

    // 3. WebGLRenderer with 32-bit mobile optimizations
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false, // Disabled for fast mobile rendering
      precision: 'mediump', // mediump shader precision reduces GPU register pressure on 32-bit ARM
      stencil: false,
      depth: true,
    });

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    container.appendChild(this.renderer.domElement);

    // 4. Lighting setup (Efficient, no shadow map overhead)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.75);
    dirLight.position.set(20, 40, 20);
    this.scene.add(dirLight);

    // 5. Textures & Materials
    this.materials = generateTextures();

    // 6. Instanced Geometry setup
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.diamondGeometry = new THREE.OctahedronGeometry(0.35);

    this.initInstancedMeshes();

    // 7. Lava hazard ocean at bottom
    const lavaGeo = new THREE.PlaneGeometry(160, 240, 1, 1);
    lavaGeo.rotateX(-Math.PI / 2);
    this.lavaMesh = new THREE.Mesh(lavaGeo, this.materials.lava);
    this.lavaMesh.position.set(0, -12, 60);
    this.scene.add(this.lavaMesh);

    // 8. Voxel Clouds overhead
    this.cloudsGroup = this.createVoxelClouds();
    this.scene.add(this.cloudsGroup);

    // 9. First-person Steve player arm
    this.armMesh = this.createPlayerArm();
    this.camera.add(this.armMesh);
    this.scene.add(this.camera);

    // Handle resize
    window.addEventListener('resize', this.onResize);
  }

  private initInstancedMeshes() {
    // Map block types to materials
    const typeMaterialMap: Array<{ type: BlockType; mat: THREE.Material | THREE.Material[] }> = [
      { type: BlockType.GRASS, mat: this.materials.multiGrassMaterials },
      { type: BlockType.STONE, mat: this.materials.stone },
      { type: BlockType.WOOD, mat: this.materials.wood },
      { type: BlockType.SLIME, mat: this.materials.slime },
      { type: BlockType.GOLD, mat: this.materials.gold },
      { type: BlockType.CRUMBLING, mat: this.materials.crumbling },
      { type: BlockType.OBSIDIAN, mat: this.materials.obsidian },
    ];

    typeMaterialMap.forEach(({ type, mat }) => {
      const mesh = new THREE.InstancedMesh(this.boxGeometry, mat, this.maxInstancesPerType);
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.instancedMeshes.set(type, mesh);
    });

    // Diamond collectible instanced mesh
    this.diamondMesh = new THREE.InstancedMesh(this.diamondGeometry, this.materials.diamond, this.maxDiamonds);
    this.diamondMesh.count = 0;
    this.diamondMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.diamondMesh.frustumCulled = false;
    this.scene.add(this.diamondMesh);
  }

  private createVoxelClouds(): THREE.Group {
    const group = new THREE.Group();
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    const cloudGeo = new THREE.BoxGeometry(1, 1, 1);

    // Generate random voxel cloud clusters
    for (let c = 0; c < 14; c++) {
      const cloudX = (Math.random() - 0.5) * 80;
      const cloudZ = Math.random() * 140;
      const cloudY = 22 + Math.random() * 4;
      const w = 4 + Math.floor(Math.random() * 8);
      const d = 5 + Math.floor(Math.random() * 10);

      const clusterMesh = new THREE.Mesh(cloudGeo, cloudMat);
      clusterMesh.scale.set(w * 2, 1.2, d * 2);
      clusterMesh.position.set(cloudX, cloudY, cloudZ);
      group.add(clusterMesh);
    }

    return group;
  }

  private createPlayerArm(): THREE.Group {
    const group = new THREE.Group();
    const armTex = generateArmTexture();
    const armMat = new THREE.MeshLambertMaterial({ map: armTex });

    // Steve arm box: width 0.28, height 0.75, depth 0.28
    const armGeo = new THREE.BoxGeometry(0.24, 0.72, 0.24);
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0, -0.28, 0);
    arm.castShadow = false;

    group.add(arm);
    // Position arm in bottom right corner of camera view
    group.position.set(0.38, -0.38, -0.62);
    group.rotation.set(-0.35, -0.15, 0.2);

    return group;
  }

  public triggerSwing() {
    this.swingTimer = 0.25;
  }

  public setQuality(presetKey: keyof typeof QUALITY_PRESETS) {
    this.quality = QUALITY_PRESETS[presetKey];
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.camera.fov = this.quality.fov;
    this.camera.updateProjectionMatrix();
  }

  private onResize = () => {
    const parent = this.renderer.domElement.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * Main render call: Updates instance matrices and renders the frame
   */
  public render(
    delta: number,
    time: number,
    playerState: PlayerState,
    pitch: number,
    yaw: number,
    world: WorldGenerator
  ) {
    // 1. Update camera position and orientation
    const eyeX = playerState.position.x;
    const eyeY = playerState.position.y + PHYSICS.EYE_HEIGHT;
    const eyeZ = playerState.position.z;

    this.camera.position.set(eyeX, eyeY, eyeZ);

    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    // Target point in world coordinates
    const targetX = eyeX - sinYaw * cosPitch;
    const targetY = eyeY + sinPitch;
    const targetZ = eyeZ + cosYaw * cosPitch;

    this.camera.lookAt(targetX, targetY, targetZ);

    // 2. Dynamic FOV expansion when sprinting (classic Minecraft sprint effect)
    const targetFov = playerState.isSprinting ? this.quality.fov + 7 : this.quality.fov;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, delta * 8);
      this.camera.updateProjectionMatrix();
    }

    // 3. Player arm animation & walking bobbing
    const horizSpeed = Math.sqrt(
      playerState.velocity.x * playerState.velocity.x + playerState.velocity.z * playerState.velocity.z
    );

    if (playerState.isGrounded && horizSpeed > 0.5) {
      this.armBobTimer += delta * (playerState.isSprinting ? 14 : 9);
      const bobX = Math.cos(this.armBobTimer * 0.5) * 0.04;
      const bobY = Math.abs(Math.sin(this.armBobTimer)) * 0.035;

      this.armMesh.position.set(0.38 + bobX, -0.38 - bobY, -0.62);
      this.armMesh.rotation.set(-0.35 + Math.sin(this.armBobTimer) * 0.12, -0.15, 0.2);
    } else {
      // Idle breathing
      const idleBob = Math.sin(time * 2.5) * 0.01;
      this.armMesh.position.set(0.38, -0.38 + idleBob, -0.62);
      this.armMesh.rotation.set(-0.35, -0.15, 0.2);
    }

    // Swing punch animation
    if (this.swingTimer > 0) {
      this.swingTimer -= delta;
      const punchFactor = Math.sin((0.25 - this.swingTimer) / 0.25 * Math.PI);
      this.armMesh.position.z -= punchFactor * 0.15;
      this.armMesh.rotation.x -= punchFactor * 0.6;
    }

    // 4. Reposition clouds and lava relative to player for infinite world illusion
    this.cloudsGroup.position.z = playerState.position.z * 0.7;
    this.lavaMesh.position.z = playerState.position.z + 40;
    this.lavaMesh.position.x = playerState.position.x;

    // 5. Update instanced voxel blocks
    const instanceCounts: Map<BlockType, number> = new Map();
    this.instancedMeshes.forEach((_, key) => instanceCounts.set(key, 0));

    const renderDist = this.quality.renderDistance;
    const playerZ = playerState.position.z;

    for (let i = 0; i < world.blocks.length; i++) {
      const b = world.blocks[i];
      if (b.hasFallen) continue;

      // Distance culling
      if (b.z < playerZ - 10 || b.z > playerZ + renderDist) continue;

      const mesh = this.instancedMeshes.get(b.type);
      if (!mesh) continue;

      const count = instanceCounts.get(b.type) || 0;
      if (count < this.maxInstancesPerType) {
        this.dummy.position.set(b.x, b.y, b.z);
        this.dummy.scale.set(b.width, b.height, b.depth);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.updateMatrix();

        mesh.setMatrixAt(count, this.dummy.matrix);
        instanceCounts.set(b.type, count + 1);
      }
    }

    // Apply updated counts
    this.instancedMeshes.forEach((mesh, type) => {
      mesh.count = instanceCounts.get(type) || 0;
      mesh.instanceMatrix.needsUpdate = true;
    });

    // 6. Update diamond collectibles
    let dCount = 0;
    for (let i = 0; i < world.diamonds.length; i++) {
      const d = world.diamonds[i];
      if (d.collected) continue;
      if (d.z < playerZ - 6 || d.z > playerZ + renderDist) continue;

      if (dCount < this.maxDiamonds) {
        // Shimmering rotation and floating bob
        const floatY = d.y + Math.sin(time * 3 + d.id) * 0.12;
        this.dummy.position.set(d.x, floatY, d.z);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.rotation.set(0, time * 2.5 + d.id, 0);
        this.dummy.updateMatrix();

        this.diamondMesh.setMatrixAt(dCount, this.dummy.matrix);
        dCount++;
      }
    }
    this.diamondMesh.count = dCount;
    this.diamondMesh.instanceMatrix.needsUpdate = true;

    // 7. Render frame
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.boxGeometry.dispose();
    this.diamondGeometry.dispose();
  }
}
