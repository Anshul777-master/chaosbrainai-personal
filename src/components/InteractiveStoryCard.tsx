import React from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  ShoppingBag,
  Database,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';
import { ChaosExperiment, Incident } from '../types';

interface InteractiveStoryCardProps {
  onRunStory: (storyType: 'payment' | 'database' | 'gateway') => void;
  onAutoFix: () => void;
  onReset: () => void;
  onOpenGuide: () => void;
  activeExperiment: ChaosExperiment | null;
  activeIncident: Incident | null;
  isRemediated: boolean;
  resilienceScore: number;
}

export const InteractiveStoryCard: React.FC<InteractiveStoryCardProps> = ({
  onRunStory,
  onAutoFix,
  onReset,
  onOpenGuide,
  activeExperiment,
  activeIncident,
  isRemediated,
  resilienceScore,
}) => {
  const isTroubleActive = Boolean(activeIncident || (activeExperiment && activeExperiment.status === 'RUNNING'));

  return (
    <div className="rounded-2xl bg-gradient-to-r from-violet-950/40 via-[#101424] to-cyan-950/40 border-2 border-cyan-500/30 p-5 shadow-xl shadow-cyan-950/20 space-y-4">
      {/* Top Banner with Friendly Title & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#20273d] pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-violet-600 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white">
                Interactive Simulation Playground
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                1-Click Friendly Controls
              </span>
            </div>
            <p className="text-xs text-[#a0a8cb] mt-0.5">
              Pick a real-world scenario below to stress-test our apps and watch smart self-healing in action!
            </p>
          </div>
        </div>

        {/* Guide button & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171c2e] hover:bg-[#222a44] border border-[#2c3554] text-cyan-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>How It Works</span>
          </button>

          <button
            onClick={onReset}
            title="Reset system to clean, green baseline"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171c2e] hover:bg-[#222a44] border border-[#2c3554] text-[#8e97bd] hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Normal</span>
          </button>
        </div>
      </div>

      {/* 3 Interactive Story Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Story 1: Black Friday Checkout */}
        <div className="relative rounded-xl p-4 bg-gradient-to-b from-rose-950/30 via-[#131627] to-[#0f121f] border border-rose-500/40 hover:border-rose-400 transition-all flex flex-col justify-between group shadow-md shadow-rose-950/20">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700/60">
                TRAFFIC RUSH
              </span>
            </div>

            <h4 className="font-bold text-white text-sm group-hover:text-rose-200 transition-colors">
              Black Friday Surge
            </h4>
            <p className="text-xs text-[#a3abbf] mt-1 leading-relaxed">
              10,000 shoppers checkout simultaneously. Simulates high delay on Payment Service.
            </p>
          </div>

          <button
            onClick={() => onRunStory('payment')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-900/40 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Scenario</span>
          </button>
        </div>

        {/* Story 2: Cloud Database Outage */}
        <div className="relative rounded-xl p-4 bg-gradient-to-b from-amber-950/30 via-[#131627] to-[#0f121f] border border-amber-500/40 hover:border-amber-400 transition-all flex flex-col justify-between group shadow-md shadow-amber-950/20">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60">
                SYSTEM OUTAGE
              </span>
            </div>

            <h4 className="font-bold text-white text-sm group-hover:text-amber-200 transition-colors">
              Database Disconnect
            </h4>
            <p className="text-xs text-[#a3abbf] mt-1 leading-relaxed">
              Order Database crashes. Tests if backup cache prevents customers from seeing 500 errors.
            </p>
          </div>

          <button
            onClick={() => onRunStory('database')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-amber-900/40 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Scenario</span>
          </button>
        </div>

        {/* Story 3: Gateway CPU Overheat */}
        <div className="relative rounded-xl p-4 bg-gradient-to-b from-violet-950/30 via-[#131627] to-[#0f121f] border border-violet-500/40 hover:border-violet-400 transition-all flex flex-col justify-between group shadow-md shadow-violet-950/20">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-900/60 text-violet-300 border border-violet-700/60">
                RESOURCE OVERHEAT
              </span>
            </div>

            <h4 className="font-bold text-white text-sm group-hover:text-violet-200 transition-colors">
              Gateway CPU Spike
            </h4>
            <p className="text-xs text-[#a3abbf] mt-1 leading-relaxed">
              Bot flood spikes API Gateway CPU to 95%. Tests auto-scaling and traffic shedding.
            </p>
          </div>

          <button
            onClick={() => onRunStory('gateway')}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-md shadow-violet-900/40 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Scenario</span>
          </button>
        </div>
      </div>

      {/* Live Active Incident / Auto-Repair Callout */}
      {isTroubleActive ? (
        <div className="rounded-xl p-4 bg-gradient-to-r from-red-950/60 via-[#1c1424] to-emerald-950/40 border-2 border-red-500/60 flex flex-wrap items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/50">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-red-300">
                  ⚠️ Live Trouble Detected on System Map!
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold border border-red-800">
                  {activeIncident?.title || 'Chaos Simulation Active'}
                </span>
              </div>
              <p className="text-xs text-[#d1d5db] mt-0.5">
                Notice the red glowing nodes on the graph? The issue is spreading upstream. Click the button to self-repair!
              </p>
            </div>
          </div>

          <button
            onClick={onAutoFix}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/30 transition-all cursor-pointer scale-105"
          >
            <Sparkles className="w-4 h-4 fill-current" />
            <span>✨ 1-Click Smart Auto-Repair</span>
          </button>
        </div>
      ) : isRemediated ? (
        <div className="rounded-xl p-3.5 bg-gradient-to-r from-emerald-950/60 via-[#101f24] to-cyan-950/40 border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-xs text-emerald-300 block">
                🎉 Smart Self-Repair Applied & Verified!
              </span>
              <span className="text-[11px] text-[#a1a7c4] block">
                Circuit breaker safety switches are active. Health rating restored to {resilienceScore}/100.
              </span>
            </div>
          </div>

          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg bg-[#14222b] hover:bg-[#1a2f3d] border border-emerald-600/60 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Reset System to Try Another Story
          </button>
        </div>
      ) : null}
    </div>
  );
};
