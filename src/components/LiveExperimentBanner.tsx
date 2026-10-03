import React from 'react';
import { ChaosExperiment, ServiceNode } from '../types';
import { Flame, Square, Play, Pause } from 'lucide-react';

interface LiveExperimentBannerProps {
  experiment: ChaosExperiment;
  targetService?: ServiceNode;
  isPaused: boolean;
  onTogglePause: () => void;
  onAbort: () => void;
  speed: number;
  onSetSpeed: (speed: number) => void;
}

export const LiveExperimentBanner: React.FC<LiveExperimentBannerProps> = ({
  experiment,
  targetService,
  isPaused,
  onTogglePause,
  onAbort,
  speed,
  onSetSpeed,
}) => {
  const percentComplete = Math.min(100, Math.round((experiment.elapsedSeconds / experiment.duration) * 100));

  return (
    <div className="bg-[#141215] border-b border-red-900/50 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur">
      {/* Left: Experiment Details */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400">
          <Flame className="w-4 h-4 animate-bounce" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono-code font-bold text-red-400 text-sm tracking-wide">
              CHAOS EXPERIMENT ACTIVE
            </span>
            <span className="font-mono-code text-[10px] text-red-300 bg-red-950/60 border border-red-800 px-1.5 py-0.5 rounded">
              {experiment.id}
            </span>
          </div>
          <p className="text-[11px] text-[#8e909d]">
            Target: <strong className="text-white font-mono-code">{targetService?.name ?? experiment.targetServiceId}</strong>
            <span className="text-[#3b3d48] mx-1.5">|</span>
            Fault: <span className="text-red-300 font-mono-code">{experiment.failureType}</span> ({experiment.intensity}% intensity)
          </p>
        </div>
      </div>

      {/* Center: Live Timer & Progress Bar */}
      <div className="flex-1 max-w-md mx-2">
        <div className="flex items-center justify-between text-[11px] font-mono-code text-[#8e909d] mb-1">
          <span>
            T+{experiment.elapsedSeconds.toString().padStart(2, '0')}s / {experiment.duration}s
          </span>
          <span className="text-red-400 font-bold">
            Blast Radius: {experiment.blastRadius}% ({experiment.affectedServiceIds.length} affected)
          </span>
        </div>
        <div className="w-full bg-[#0b0c10] border border-[#22242e] h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-red-600 h-full transition-all duration-300 ease-linear"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Right: Simulation Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#0b0c10] border border-[#22242e] rounded p-0.5 font-mono-code text-[11px]">
          {[1, 2, 5].map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-1.5 py-0.5 rounded transition-colors ${
                speed === s ? 'bg-red-600 text-white font-bold' : 'text-[#717380] hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <button
          onClick={onTogglePause}
          className="flex items-center gap-1 bg-[#1a1c24] hover:bg-[#252834] text-white border border-[#2c2f3a] px-2.5 py-1 rounded font-mono-code"
        >
          {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          onClick={onAbort}
          className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white font-semibold px-2.5 py-1 rounded font-mono-code shadow-sm"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>Abort Experiment</span>
        </button>
      </div>
    </div>
  );
};
