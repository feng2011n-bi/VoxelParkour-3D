/**
 * Settings Modal with 32-bit Android optimization presets and sensitivity controls.
 */
import React from 'react';
import { X, Cpu, Gauge, Volume2, Gamepad2, Check } from 'lucide-react';
import { QUALITY_PRESETS, QualityPreset } from '../game/constants';

interface SettingsModalProps {
  currentPreset: QualityPreset;
  onSelectPreset: (preset: QualityPreset) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  lookSensitivity: number;
  onChangeSensitivity: (val: number) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentPreset,
  onSelectPreset,
  soundEnabled,
  onToggleSound,
  lookSensitivity,
  onChangeSensitivity,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="mc-panel w-full max-w-lg p-5 sm:p-6 rounded-lg text-left relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="font-pixel text-sm sm:text-base text-white">
              НАСТРОЙКИ & АРХИТЕКТУРА
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 32-bit Mobile Architecture Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-emerald-400" />
              Профиль производительности
            </span>
          </div>

          <div className="space-y-2">
            {(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map((key) => {
              const preset = QUALITY_PRESETS[key];
              const isSelected = currentPreset === key;
              return (
                <button
                  key={key}
                  onClick={() => onSelectPreset(key)}
                  className={`w-full p-3 rounded-lg border text-left transition-all flex items-start justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.2)]'
                      : 'bg-black/30 border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                        {preset.name}
                      </span>
                      {key === 'low32' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Рекомендуется для 32-bit ARM
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500 font-mono">
                      <span>Рендер: {preset.renderDistance} блоков</span>
                      <span>·</span>
                      <span>DPR: {preset.pixelRatio}x</span>
                      <span>·</span>
                      <span>FOV: {preset.fov}°</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sensitivity & Sound */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Camera Sensitivity Slider */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="text-slate-300 font-medium">Чувствительность обзора</span>
              <span className="text-emerald-400 font-mono tabular-nums">
                {Math.round(lookSensitivity * 10000)}
              </span>
            </div>
            <input
              type="range"
              min="0.0015"
              max="0.007"
              step="0.0005"
              value={lookSensitivity}
              onChange={(e) => onChangeSensitivity(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
            />
          </div>

          {/* Sound Toggle */}
          <div className="bg-black/30 border border-white/10 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-300 font-medium">Звуковые эффекты</span>
            </div>
            <button
              onClick={onToggleSound}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                soundEnabled
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}
            </button>
          </div>
        </div>

        {/* Controls Guide */}
        <div className="bg-black/40 border border-white/10 rounded-lg p-3.5 mb-5">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300">
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span>Управление</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
            <div>
              <span className="text-white font-medium">📱 На телефоне (Android):</span>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                <li>Левый джойстик: Движение</li>
                <li>Правая половина: Обзор (свайп)</li>
                <li>Кнопка ↑: Прыжок</li>
                <li>Молния: Бег / Спринт</li>
              </ul>
            </div>
            <div>
              <span className="text-white font-medium">💻 На компьютере:</span>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                <li>WASD: Движение</li>
                <li>Мышь: Обзор (клик для фиксации)</li>
                <li>Пробел: Прыжок</li>
                <li>Shift: Спринт</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mc-button w-full py-3 text-xs uppercase tracking-wider rounded font-pixel"
        >
          Готово
        </button>
      </div>
    </div>
  );
};
