/**
 * Mobile touch controls tailored for Android devices:
 * - Fluid Virtual Joystick with Pointer Events (supports touch & mouse)
 * - Ergonomic Action Buttons (Jump, Sprint, Swing)
 * - Does NOT block mouse look or screen clicks
 */
import React, { useRef, useState } from 'react';
import { ArrowUp, Zap, Swords } from 'lucide-react';

interface TouchControlsProps {
  onMove: (forward: number, right: number) => void;
  onJump: (isJumping: boolean) => void;
  onToggleSprint: () => void;
  onSwing: () => void;
  isSprinting: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onJump,
  onToggleSprint,
  onSwing,
  isSprinting,
}) => {
  // Joystick state
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const joystickCenter = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (activePointerId.current !== null) return;

    activePointerId.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const rect = joystickContainerRef.current?.getBoundingClientRect();
    if (rect) {
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    } else {
      joystickCenter.current = { x: e.clientX, y: e.clientY };
    }

    setJoystickActive(true);
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== activePointerId.current) return;
    e.stopPropagation();
    activePointerId.current = null;
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const maxRadius = 45;
    const dx = clientX - joystickCenter.current.x;
    const dy = clientY - joystickCenter.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });

    // Normalize forward (-1 to 1) and right (-1 to 1)
    // Note: Up on screen (dy < 0) corresponds to forward movement (+1)
    const normForward = -ky / maxRadius;
    const normRight = kx / maxRadius;

    // Apply small deadzone
    const deadzone = 0.12;
    const finalForward = Math.abs(normForward) < deadzone ? 0 : normForward;
    const finalRight = Math.abs(normRight) < deadzone ? 0 : normRight;

    onMove(finalForward, finalRight);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* Bottom Left: Virtual Joystick Widget */}
      <div className="absolute left-4 bottom-5 pointer-events-auto flex items-center justify-center p-2">
        <div
          ref={joystickContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-32 h-32 rounded-full border-2 transition-colors relative flex items-center justify-center touch-none cursor-pointer ${
            joystickActive
              ? 'border-emerald-400/60 bg-emerald-950/40 shadow-[0_0_16px_rgba(52,211,153,0.3)]'
              : 'border-white/25 bg-black/40 backdrop-blur-sm'
          }`}
        >
          {/* Direction indicator markings */}
          <div className="absolute top-2 text-white/40 text-[9px] font-pixel pointer-events-none">W</div>
          <div className="absolute bottom-2 text-white/40 text-[9px] font-pixel pointer-events-none">S</div>
          <div className="absolute left-2 text-white/40 text-[9px] font-pixel pointer-events-none">A</div>
          <div className="absolute right-2 text-white/40 text-[9px] font-pixel pointer-events-none">D</div>

          {/* Center target circle */}
          <div className="w-6 h-6 rounded-full border border-white/20 pointer-events-none" />

          {/* Draggable Knob */}
          <div
            className={`w-14 h-14 rounded-full border-2 shadow-lg flex items-center justify-center pointer-events-none absolute transition-all ${
              joystickActive
                ? 'bg-emerald-500/90 border-emerald-200 scale-110 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : 'bg-white/40 border-white/60'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: joystickActive ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <div className="w-3 h-3 rounded-full bg-white/80" />
          </div>
        </div>
      </div>

      {/* Bottom Right: Action Buttons Hub */}
      <div className="absolute right-4 bottom-5 pointer-events-auto flex flex-col items-end gap-3 select-none">
        {/* Secondary Buttons Row: Punch and Sprint */}
        <div className="flex items-center gap-2.5">
          {/* Punch / Attack Button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              onSwing();
            }}
            aria-label="Взмах / Удар"
            className="w-12 h-12 rounded-full bg-slate-800/80 active:bg-slate-700 active:scale-95 border border-white/20 flex items-center justify-center text-white shadow-lg backdrop-blur-sm cursor-pointer transition-transform"
          >
            <Swords className="w-5 h-5 text-amber-300" />
          </button>

          {/* Sprint Toggle Button */}
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleSprint();
            }}
            aria-label="Переключить бег"
            className={`w-12 h-12 rounded-full border active:scale-95 flex items-center justify-center shadow-lg backdrop-blur-sm cursor-pointer transition-all ${
              isSprinting
                ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 scale-105 shadow-[0_0_14px_rgba(245,158,11,0.6)]'
                : 'bg-slate-800/80 border-white/20 text-white'
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Jump Button */}
        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            onJump(true);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onJump(false);
          }}
          onPointerCancel={(e) => {
            e.stopPropagation();
            onJump(false);
          }}
          aria-label="Прыжок"
          className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 active:scale-90 border-2 border-emerald-300/80 text-white shadow-xl flex items-center justify-center cursor-pointer transition-transform"
        >
          <ArrowUp className="w-7 h-7 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
