/**
 * VoxelParkour 3D - First Person Minecraft Parkour
 * Optimized for 32-bit Android phones and desktop browsers.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameRenderer } from './game/renderer';
import { WorldGenerator } from './game/worldGen';
import { PhysicsEngine, PlayerState } from './game/physics';
import { QualityPreset } from './game/constants';
import { sounds } from './game/audio';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { Play, Smartphone } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const worldRef = useRef<WorldGenerator | null>(null);
  const physicsRef = useRef<PhysicsEngine | null>(null);

  // Synchronous game running state refs (prevents stale closure issues in 60fps loop)
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);

  // UI state for React rendering
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [fps, setFps] = useState(60);
  const [isSprinting, setIsSprinting] = useState(false);

  // Quality and sensitivity
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('low32');
  const [sensitivity, setSensitivity] = useState(0.0035);

  // Live player state snapshot for React HUD
  const [hudState, setHudState] = useState<PlayerState>({
    position: { x: 0, y: 2, z: 0 } as any,
    velocity: { x: 0, y: 0, z: 0 } as any,
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
  });

  // Camera orientation angles in radians
  const cameraYaw = useRef(0);
  const cameraPitch = useRef(0);

  // Movement input buffers
  const inputMove = useRef({ forward: 0, right: 0 });
  const keyState = useRef({ w: false, s: false, a: false, d: false, space: false, shift: false });

  // Drag-to-look tracking for mouse and touch
  const isDraggingLook = useRef(false);
  const lastLookPointerPos = useRef({ x: 0, y: 0 });
  const lookPointerId = useRef<number | null>(null);

  // Detect mobile / touch device
  useEffect(() => {
    // Load saved high score from localStorage
    const saved = localStorage.getItem('voxel_parkour_highscore');
    if (saved) {
      setHighScore(parseInt(saved, 10) || 0);
    }

    // Auto-detect 32-bit device or mobile to set 'low32' profile
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isLikelyLowEnd =
      isTouch &&
      ((navigator as any).deviceMemory !== undefined && (navigator as any).deviceMemory <= 3);
    if (isLikelyLowEnd) {
      setQualityPreset('low32');
    }
  }, []);

  // Initialize Game Engines
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new GameRenderer(containerRef.current, qualityPreset);
    const world = new WorldGenerator();
    const physics = new PhysicsEngine();

    rendererRef.current = renderer;
    worldRef.current = world;
    physicsRef.current = physics;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsTime = performance.now();

    // Main 60 FPS Game Loop
    const gameLoop = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(gameLoop);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.08);
      lastTime = currentTime;

      // Calculate FPS
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsTime = currentTime;
      }

      if (!physicsRef.current || !worldRef.current || !rendererRef.current) return;

      const currentPhysics = physicsRef.current;
      const currentWorld = worldRef.current;
      const currentRenderer = rendererRef.current;

      // Update dynamic moving platforms and falling blocks
      currentWorld.updateDynamicBlocks(delta, currentTime * 0.001);

      // Aggregate input (Keyboard + Touch Joystick)
      let fwd = inputMove.current.forward;
      let rgt = inputMove.current.right;

      if (keyState.current.w) fwd = 1;
      if (keyState.current.s) fwd = -1;
      if (keyState.current.d) rgt = 1;
      if (keyState.current.a) rgt = -1;

      const jumping = keyState.current.space;
      const sprinting = keyState.current.shift || isSprinting;

      currentPhysics.setInput({
        forward: fwd,
        right: rgt,
        jump: jumping,
        sprint: sprinting,
        yaw: cameraYaw.current,
        pitch: cameraPitch.current,
      });

      // Update physics if active (reads from refs to avoid stale closure freeze)
      if (isPlayingRef.current && !isPausedRef.current && !isGameOverRef.current) {
        const state = currentPhysics.update(delta, currentWorld);

        // Infinite World Generation & Cleanup Ahead
        currentWorld.generateAhead(state.position.z + currentRenderer.quality.renderDistance + 10);
        currentWorld.cleanupBehind(state.position.z - currentRenderer.quality.chunkCleanupDistance);

        // Sync React HUD state
        setHudState({ ...state });

        // Check Death Condition
        if (state.isDead && !isGameOverRef.current) {
          isGameOverRef.current = true;
          setIsGameOver(true);

          // Check High Score
          const savedHighScore = parseInt(localStorage.getItem('voxel_parkour_highscore') || '0', 10);
          if (state.score > savedHighScore) {
            setHighScore(state.score);
            setIsNewRecord(true);
            localStorage.setItem('voxel_parkour_highscore', state.score.toString());
          }
        }
      }

      // Render 3D Scene
      currentRenderer.render(
        delta,
        currentTime * 0.001,
        currentPhysics.state,
        cameraPitch.current,
        cameraYaw.current,
        currentWorld
      );
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [qualityPreset, isSprinting]);

  // Universal Keyboard Listeners (English + Russian + Arrow Keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      // W / Up / Russian Ц
      if (code === 'KeyW' || key === 'w' || key === 'ц' || code === 'ArrowUp') {
        keyState.current.w = true;
      }
      // S / Down / Russian Ы
      if (code === 'KeyS' || key === 's' || key === 'ы' || code === 'ArrowDown') {
        keyState.current.s = true;
      }
      // A / Left / Russian Ф
      if (code === 'KeyA' || key === 'a' || key === 'ф' || code === 'ArrowLeft') {
        keyState.current.a = true;
      }
      // D / Right / Russian В
      if (code === 'KeyD' || key === 'd' || key === 'в' || code === 'ArrowRight') {
        keyState.current.d = true;
      }
      // Space (Jump)
      if (code === 'Space' || key === ' ') {
        keyState.current.space = true;
        e.preventDefault();
      }
      // Shift (Sprint)
      if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
        keyState.current.shift = true;
        setIsSprinting(true);
      }
      // Escape (Pause)
      if (code === 'Escape') {
        togglePause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      if (code === 'KeyW' || key === 'w' || key === 'ц' || code === 'ArrowUp') {
        keyState.current.w = false;
      }
      if (code === 'KeyS' || key === 's' || key === 'ы' || code === 'ArrowDown') {
        keyState.current.s = false;
      }
      if (code === 'KeyA' || key === 'a' || key === 'ф' || code === 'ArrowLeft') {
        keyState.current.a = false;
      }
      if (code === 'KeyD' || key === 'd' || key === 'в' || code === 'ArrowRight') {
        keyState.current.d = false;
      }
      if (code === 'Space' || key === ' ') {
        keyState.current.space = false;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
        keyState.current.shift = false;
        setIsSprinting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Screen Drag / Pointer Lock Look Handling
  const handlePointerDownScreen = (e: React.PointerEvent) => {
    // Only drag look if not already dragging
    if (lookPointerId.current !== null) return;

    // Check if target is not a button/joystick
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.touch-none')) return;

    lookPointerId.current = e.pointerId;
    isDraggingLook.current = true;
    lastLookPointerPos.current = { x: e.clientX, y: e.clientY };

    // Request pointer lock on desktop mouse click if playing
    if (e.pointerType === 'mouse' && isPlayingRef.current && !isPausedRef.current) {
      if (document.pointerLockElement !== containerRef.current) {
        containerRef.current?.requestPointerLock?.();
      }
    }
  };

  const handlePointerMoveScreen = (e: React.PointerEvent) => {
    // 1. If Pointer Locked on desktop
    if (document.pointerLockElement === containerRef.current) {
      cameraYaw.current += e.movementX * sensitivity * 0.7;
      cameraPitch.current -= e.movementY * sensitivity * 0.7;
      cameraPitch.current = Math.max(-1.4, Math.min(1.4, cameraPitch.current));
      return;
    }

    // 2. Drag to look fallback (touch swipe or mouse drag without pointer lock)
    if (isDraggingLook.current && e.pointerId === lookPointerId.current) {
      const dx = e.clientX - lastLookPointerPos.current.x;
      const dy = e.clientY - lastLookPointerPos.current.y;
      lastLookPointerPos.current = { x: e.clientX, y: e.clientY };

      cameraYaw.current += dx * sensitivity * 1.1;
      cameraPitch.current -= dy * sensitivity * 1.1;
      cameraPitch.current = Math.max(-1.4, Math.min(1.4, cameraPitch.current));
    }
  };

  const handlePointerUpScreen = (e: React.PointerEvent) => {
    if (e.pointerId === lookPointerId.current) {
      isDraggingLook.current = false;
      lookPointerId.current = null;
    }
  };

  // Start / Resume Game
  const handleStartGame = () => {
    isPlayingRef.current = true;
    isPausedRef.current = false;
    isGameOverRef.current = false;

    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);
    setIsNewRecord(false);

    cameraYaw.current = 0;
    cameraPitch.current = 0;

    if (physicsRef.current && worldRef.current) {
      worldRef.current.reset();
      physicsRef.current.reset();
    }

    // Attempt pointer lock on desktop
    containerRef.current?.requestPointerLock?.();
  };

  // Respawn after game over
  const handleRespawn = () => {
    isPlayingRef.current = true;
    isPausedRef.current = false;
    isGameOverRef.current = false;

    setIsGameOver(false);
    setIsNewRecord(false);
    setIsPaused(false);

    cameraYaw.current = 0;
    cameraPitch.current = 0;

    if (physicsRef.current && worldRef.current) {
      worldRef.current.reset();
      physicsRef.current.reset();
    }
  };

  const togglePause = () => {
    const nextPaused = !isPausedRef.current;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);
  };

  // Mobile Touch Callbacks
  const handleTouchMove = useCallback((fwd: number, rgt: number) => {
    inputMove.current.forward = fwd;
    inputMove.current.right = rgt;
  }, []);

  const handleTouchJump = useCallback((jumping: boolean) => {
    keyState.current.space = jumping;
  }, []);

  const handleToggleSprint = useCallback(() => {
    setIsSprinting((prev) => !prev);
  }, []);

  const handleArmSwing = useCallback(() => {
    if (rendererRef.current) {
      rendererRef.current.triggerSwing();
    }
  }, []);

  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sounds.enabled = !next;
  };

  const handleSelectPreset = (preset: QualityPreset) => {
    setQualityPreset(preset);
    if (rendererRef.current) {
      rendererRef.current.setQuality(preset);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDownScreen}
      onPointerMove={handlePointerMoveScreen}
      onPointerUp={handlePointerUpScreen}
      onPointerCancel={handlePointerUpScreen}
      className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none"
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
      />

      {/* Main HUD overlay during gameplay */}
      {isPlaying && !isGameOver && (
        <>
          <HUD
            playerState={hudState}
            highScore={highScore}
            fps={fps}
            isSoundMuted={isMuted}
            onToggleSound={handleToggleSound}
            onOpenSettings={() => {
              isPausedRef.current = true;
              setIsPaused(true);
              setShowSettings(true);
            }}
            onPause={togglePause}
            isPaused={isPaused}
          />

          {/* Touch controls for mobile Android devices & on-screen play */}
          <TouchControls
            onMove={handleTouchMove}
            onJump={handleTouchJump}
            onToggleSprint={handleToggleSprint}
            onSwing={handleArmSwing}
            isSprinting={isSprinting}
          />
        </>
      )}

      {/* Start / Welcome Screen */}
      {!isPlaying && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none">
          <div className="mc-panel w-full max-w-md p-6 text-center rounded-lg shadow-2xl relative">
            {/* Minecraft Title Banner */}
            <div className="mb-4">
              <span className="text-[11px] font-pixel text-emerald-400 tracking-widest block mb-1">
                MINECRAFT STYLE
              </span>
              <h1 className="font-pixel text-2xl sm:text-3xl text-yellow-300 drop-shadow-[2px_2px_0px_#000]">
                VOXEL PARKOUR
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-2">
                Бесконечный 3D паркур от первого лица
              </p>
            </div>

            {/* 32-bit Architecture Highlights */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded p-3 mb-5 text-left text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Архитектура 32-bit Android</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Оптимизированный пул InstancedMesh, процедурные 16×16 текстуры и Web Audio синтез без задержек сборщика мусора (Zero GC lag).
              </p>
            </div>

            {/* High Score Preview */}
            {highScore > 0 && (
              <div className="mb-5 py-2 px-3 bg-black/40 rounded border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Лучший рекорд:</span>
                <span className="font-pixel text-amber-300 tabular-nums">{highScore.toLocaleString()}</span>
              </div>
            )}

            {/* Start Button */}
            <button
              onClick={handleStartGame}
              className="mc-button w-full py-4 text-sm font-bold uppercase rounded flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-98 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              Начать паркур
            </button>

            {/* Controls hints */}
            <div className="mt-4 text-[10px] text-slate-400 flex items-center justify-center gap-3">
              <span>Стик / WASD для движения</span>
              <span>·</span>
              <span>Прыжок (Кнопка ↑ / Пробел)</span>
            </div>
          </div>
        </div>
      )}

      {/* Pause Screen */}
      {isPaused && !isGameOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
          <div className="mc-panel w-full max-w-sm p-6 text-center rounded-lg shadow-2xl">
            <h2 className="font-pixel text-xl text-yellow-300 mb-4">ПАУЗА</h2>
            <div className="space-y-3">
              <button
                onClick={() => {
                  isPausedRef.current = false;
                  setIsPaused(false);
                }}
                className="mc-button w-full py-3 text-xs uppercase rounded cursor-pointer"
              >
                Продолжить
              </button>
              <button
                onClick={() => {
                  setShowSettings(true);
                }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-white/10 cursor-pointer"
              >
                Настройки графики / 32-бит
              </button>
              <button
                onClick={handleRespawn}
                className="w-full py-2.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 text-xs rounded border border-red-500/30 cursor-pointer"
              >
                Начать заново
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <GameOverModal
          playerState={hudState}
          highScore={highScore}
          isNewRecord={isNewRecord}
          onRespawn={handleRespawn}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          currentPreset={qualityPreset}
          onSelectPreset={handleSelectPreset}
          soundEnabled={!isMuted}
          onToggleSound={handleToggleSound}
          lookSensitivity={sensitivity}
          onChangeSensitivity={setSensitivity}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
