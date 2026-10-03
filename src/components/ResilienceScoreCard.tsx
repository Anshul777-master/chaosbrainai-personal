import React from 'react';
import { ResilienceScore } from '../types';
import { Shield, Info } from 'lucide-react';

interface ResilienceScoreCardProps {
  score: ResilienceScore;
}

export const ResilienceScoreCard: React.FC<ResilienceScoreCardProps> = ({ score }) => {
  const factors = [
    {
      name: 'Cluster Availability',
      weight: '30%',
      val: score.breakdown.availability,
      desc: 'Aggregated SLA uptime across all critical microservice endpoints',
    },
    {
      name: 'Failure Isolation',
      weight: '25%',
      val: score.breakdown.failureIsolation,
      desc: 'Inversely proportional to cascading blast radius propagation',
    },
    {
      name: 'Recovery Capability',
      weight: '20%',
      val: score.breakdown.recoveryCapability,
      desc: 'Circuit breaker, retry policy, and replica failover coverage',
    },
    {
      name: 'Error Tolerance',
      weight: '15%',
      val: score.breakdown.errorTolerance,
      desc: 'Bounded error rates under upstream dependency degradation',
    },
    {
      name: 'Latency Stability',
      weight: '10%',
      val: score.breakdown.latencyStability,
      desc: 'Deviation of p99 latency from calibrated baseline profiles',
    },
  ];

  return (
    <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-4">
      {/* Header and Composite Score */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1f2128] pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-[#1a1b22] border border-[#2b2e3a] flex items-center justify-center text-white">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Continuous Resilience Index</h3>
            <p className="text-xs text-[#8e909d] font-mono-code">
              5-Factor Explainable Resilience Scoring Model
            </p>
          </div>
        </div>

        {/* Big Score Display */}
        <div className="flex items-baseline gap-2">
          <span
            className={`font-mono-code text-3xl font-extrabold ${
              score.overall >= 80
                ? 'text-emerald-400'
                : score.overall >= 60
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            {score.overall}
          </span>
          <span className="text-[#555763] font-mono-code text-sm">/ 100</span>
        </div>
      </div>

      {/* Historical Comparison Pills */}
      <div className="grid grid-cols-3 gap-2 text-center font-mono-code text-xs">
        <div className="bg-[#0b0c10] p-2 rounded border border-[#1f2128]">
          <span className="text-[#717380] text-[10px] uppercase block">Baseline Target</span>
          <span className="text-sm font-bold text-white">{score.metrics.baseline}</span>
        </div>
        <div className="bg-[#0b0c10] p-2 rounded border border-[#1f2128]">
          <span className="text-red-400 text-[10px] uppercase block">During Failure</span>
          <span className="text-sm font-bold text-red-400">{score.metrics.duringFailure}</span>
        </div>
        <div className="bg-[#0b0c10] p-2 rounded border border-[#1f2128]">
          <span className="text-emerald-400 text-[10px] uppercase block">Post-Remediation</span>
          <span className="text-sm font-bold text-emerald-400">{score.metrics.postRemediation}</span>
        </div>
      </div>

      {/* Factor Breakdown Bars */}
      <div className="space-y-3 font-mono-code text-xs">
        {factors.map((f) => (
          <div key={f.name} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white">{f.name}</span>
                <span className="text-[10px] text-[#555763]">({f.weight})</span>
              </div>
              <span
                className={`font-bold ${
                  f.val >= 80 ? 'text-emerald-400' : f.val >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {f.val} / 100
              </span>
            </div>
            <div className="w-full bg-[#0b0c10] border border-[#1f2128] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  f.val >= 80 ? 'bg-emerald-400' : f.val >= 60 ? 'bg-amber-400' : 'bg-red-500'
                }`}
                style={{ width: `${f.val}%` }}
              />
            </div>
            <span className="text-[10px] text-[#717380] font-sans block">{f.desc}</span>
          </div>
        ))}
      </div>

      {/* Formula Transparency Note */}
      <div className="bg-[#0b0c10] border border-[#1f2128] p-2.5 rounded text-[11px] font-mono-code text-[#8e909d] flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0 mt-0.5" />
        <span>
          Resilience Formula: R = 0.30(Avail) + 0.25(Isolation) + 0.20(Recovery) + 0.15(Error) + 0.10(Latency)
        </span>
      </div>
    </div>
  );
};
