/**
 * Minecraft-style HUD with Hearts, Tabular Score, Combo Multiplier,
 * Diamond Counter, and 32-bit Architecture Status.
 */
import React from 'react';
import { PlayerState } from '../game/physics';
import { Pause, Volume2, VolumeX, Sparkles, Trophy, Settings } from 'lucide-react';
import { sounds } from '../game/audio';

interface HUDProps {
  playerState: PlayerState;
  highScore: number;
  fps: number;
  isSoundMuted: boolean;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onPause: () => void;
  isPaused: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  playerState,
  highScore,
  fps,
  isSoundMuted,
  onToggleSound,
  onOpenSettings,
  onPause,
  isPaused,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none flex flex-col justify-between p-3 md:p-6 z-10">
      {/* Top Bar: Brand, Stats & Action Controls */}
      <header className="flex items-center justify-between pointer-events-auto">
        {/* Brand & Distance */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded border border-white/10 flex items-center gap-2">
            <span className="font-pixel text-xs text-emerald-400">VOXEL</span>
            <span className="text-white/40 text-xs">/</span>
            <span className="font-pixel text-xs text-amber-300 tabular-nums">
              {playerState.maxDistance}м
            </span>
          </div>

          {/* Combo Multiplier */}
          {playerState.combo > 1 && (
            <div className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/40 rounded flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="font-pixel text-xs text-amber-300 font-bold">
                x{playerState.combo} COMBO
              </span>
            </div>
          )}
        </div>

        {/* Action Controls & Top Bar Zone */}
        <div className="flex items-center gap-2">
          {/* FPS & 32-bit mobile badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded text-xs text-slate-300 font-mono">
            <span>32-BIT ARM</span>
            <span className="text-white/20">·</span>
            <span className="text-emerald-400 font-bold tabular-nums">{fps} FPS</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Переключить звук"
            className="w-9 h-9 flex items-center justify-center rounded bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-colors"
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-200" />
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            aria-label="Настройки"
            className="w-9 h-9 flex items-center justify-center rounded bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-200" />
          </button>

          {/* Pause Button */}
          <button
            onClick={onPause}
            aria-label="Пауза"
            className="w-9 h-9 flex items-center justify-center rounded bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-colors"
          >
            <Pause className="w-4 h-4 text-slate-200" />
          </button>
        </div>
      </header>

      {/* Center Screen: Minecraft Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="relative w-5 h-5 flex items-center justify-center">
          <div className="w-3.5 h-[2px] bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.9)]"></div>
          <div className="absolute w-[2px] h-3.5 bg-white/80 shadow-[0_0_2px_rgba(0,0,0,0.9)]"></div>
        </div>
      </div>

      {/* Bottom Area: Minecraft Hearts, Score & Sprint Indicator */}
      <div className="flex flex-col items-center gap-2 pointer-events-none pb-2 sm:pb-4">
        {/* Score & Diamonds Panel */}
        <div className="flex items-center gap-4 px-4 py-2 bg-black/65 backdrop-blur-md rounded border border-white/15 shadow-lg">
          {/* Current Score */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Счёт</span>
            <span className="font-pixel text-sm sm:text-base text-yellow-300 tabular-nums">
              {playerState.score.toLocaleString()}
            </span>
          </div>

          <div className="w-px h-7 bg-white/15" />

          {/* Diamonds Collected */}
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 bg-cyan-400 rotate-45 border border-cyan-200 shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Алмазы</span>
              <span className="font-pixel text-xs sm:text-sm text-cyan-300 tabular-nums">
                {playerState.diamondsCollected}
              </span>
            </div>
          </div>

          <div className="w-px h-7 bg-white/15" />

          {/* Record */}
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Рекорд</span>
              <span className="font-pixel text-xs sm:text-sm text-amber-200 tabular-nums">
                {highScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Minecraft Health Hearts (Visual Polish) */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative flex items-center justify-center transition-transform hover:scale-110"
              title="Здоровье игрока"
            >
              <svg viewBox="0 0 16 16" className="w-full h-full fill-rose-600 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                <path d="M8 14s-5.5-3.5-7-7a4.5 4.5 0 0 1 7-3.5A4.5 4.5 0 0 1 15 7c-1.5 3.5-7 7-7 7z" />
              </svg>
            </div>
          ))}
        </div>

        {/* Sprint active indicator */}
        <div className="text-[10px] font-pixel text-slate-400 tracking-wider">
          {playerState.isSprinting ? (
            <span className="text-emerald-400">&gt;&gt; РЕЖИМ СПРИНТА &lt;&lt;</span>
          ) : (
            <span className="text-white/40">ШАГ (SHIFT ДЛЯ СПРИНТА)</span>
          )}
        </div>
      </div>
    </div>
  );
};
