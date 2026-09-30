/**
 * Authentic Minecraft Death Screen with Score Breakdown and Respawn.
 */
import React from 'react';
import { Trophy, RotateCcw, Settings, Sparkles } from 'lucide-react';
import { PlayerState } from '../game/physics';

interface GameOverModalProps {
  playerState: PlayerState;
  highScore: number;
  isNewRecord: boolean;
  onRespawn: () => void;
  onOpenSettings: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  playerState,
  highScore,
  isNewRecord,
  onRespawn,
  onOpenSettings,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/70 backdrop-blur-md animate-fade-in select-none">
      <div className="mc-panel w-full max-w-md p-6 text-center rounded-lg border-2 border-red-500/40 shadow-2xl relative overflow-hidden">
        {/* Glowing lava gradient highlight at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

        {/* Title */}
        <h2 className="font-pixel text-2xl sm:text-3xl text-red-500 text-shadow mb-2 tracking-wider">
          ВЫ ПОГИБЛИ!
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm mb-6">
          {playerState.deathReason || 'Вы сорвались в лавовую бездну'}
        </p>

        {/* New record banner */}
        {isNewRecord && (
          <div className="mb-4 py-1.5 px-3 bg-amber-500/20 border border-amber-400/50 rounded flex items-center justify-center gap-2 text-amber-300 font-pixel text-xs animate-bounce">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>★ НОВЫЙ РЕКОРД! ★</span>
          </div>
        )}

        {/* Score Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Final Score */}
          <div className="bg-black/50 border border-white/10 rounded p-3 text-left">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">Счёт</span>
            <span className="font-pixel text-lg text-yellow-300 tabular-nums">
              {playerState.score.toLocaleString()}
            </span>
          </div>

          {/* Distance */}
          <div className="bg-black/50 border border-white/10 rounded p-3 text-left">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">Дистанция</span>
            <span className="font-pixel text-lg text-emerald-400 tabular-nums">
              {playerState.maxDistance} м
            </span>
          </div>

          {/* Diamonds Collected */}
          <div className="bg-black/50 border border-white/10 rounded p-3 text-left">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">Алмазы</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-cyan-400 rotate-45 inline-block" />
              <span className="font-pixel text-base text-cyan-300 tabular-nums">
                +{playerState.diamondsCollected}
              </span>
            </div>
          </div>

          {/* Personal Record */}
          <div className="bg-black/50 border border-white/10 rounded p-3 text-left">
            <span className="text-[11px] text-slate-400 uppercase font-medium block">Рекорд</span>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-pixel text-base text-amber-200 tabular-nums">
                {highScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRespawn}
            className="mc-button w-full py-3.5 px-4 text-sm font-semibold rounded flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer hover:brightness-110 active:scale-98 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            Возродиться (Играть)
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 text-xs rounded flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Настройки графики / 32-бит
          </button>
        </div>
      </div>
    </div>
  );
};
