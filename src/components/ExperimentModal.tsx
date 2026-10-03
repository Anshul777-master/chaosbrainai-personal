import React, { useState } from 'react';
import {
  ServiceNode,
  ChaosFailureType,
} from '../types';
import { GraphEngine } from '../core/graphEngine';
import { X, Flame, ShieldAlert, ArrowRight } from 'lucide-react';

interface ExperimentModalProps {
  services: ServiceNode[];
  graphEngine: GraphEngine;
  initialServiceId?: string;
  onClose: () => void;
  onLaunch: (params: {
    targetServiceId: string;
    failureType: ChaosFailureType;
    intensity: number;
    duration: number;
  }) => void;
}

export const ExperimentModal: React.FC<ExperimentModalProps> = ({
  services,
  graphEngine,
  initialServiceId,
  onClose,
  onLaunch,
}) => {
  const [targetId, setTargetId] = useState<string>(
    initialServiceId || (services.find((s) => s.id === 'payment-service')?.id ?? services[0].id)
  );
  const [failureType, setFailureType] = useState<ChaosFailureType>('HIGH_LATENCY');
  const [intensity, setIntensity] = useState<number>(80);
  const [duration, setDuration] = useState<number>(30);
  const [confirmedSafety, setConfirmedSafety] = useState<boolean>(true);

  const blastRadiusPreview = graphEngine.calculateBlastRadius(targetId);
  const cascadeChain = graphEngine.getCascadingImpactChain(targetId);

  const failureTypes: Array<{
    id: ChaosFailureType;
    name: string;
    description: string;
  }> = [
    {
      id: 'HIGH_LATENCY',
      name: 'High Latency Injection',
      description: 'Simulates network lag or database thread lock (spikes response latency to 700ms+).',
    },
    {
      id: 'SERVICE_FAILURE',
      name: 'Total Service Crash',
      description: 'Simulates pod crash, OOM kill, or network partition (0% availability).',
    },
    {
      id: 'ERROR_SPIKE',
      name: 'Internal Error Spike',
      description: 'Simulates unhandled 500 exceptions, bad payload, or upstream API rate limit.',
    },
    {
      id: 'CPU_STRESS',
      name: 'CPU Resource Saturation',
      description: 'Simulates runaway infinite loop or high concurrency spike hitting 99% CPU.',
    },
    {
      id: 'DATABASE_FAILURE',
      name: 'Database Connection Pool Exhaustion',
      description: 'Simulates PostgreSQL deadlocks and max connection limit breaches.',
    },
  ];

  const handleLaunch = () => {
    onLaunch({
      targetServiceId: targetId,
      failureType,
      intensity,
      duration,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0f13] border border-[#22242e] rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#22242e] flex items-center justify-between bg-[#13141a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-red-950/40 border border-red-800/50 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Configure Controlled Chaos Experiment</h2>
              <p className="text-[11px] text-[#717380] font-mono-code">
                Safe sandbox simulation with graph-driven cascading failure physics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#717380] hover:text-white p-1 hover:bg-[#1f2129] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Target Service Selection */}
          <div>
            <label className="block text-[#a1a1aa] font-semibold mb-1.5 font-mono-code text-[11px] uppercase tracking-wider">
              1. Target Microservice
            </label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setTargetId(svc.id)}
                  className={`p-2.5 rounded-md border text-left transition-all ${
                    targetId === svc.id
                      ? 'border-red-500 bg-red-950/30 text-white shadow-sm'
                      : 'border-[#1f2128] bg-[#121318] text-[#8e909d] hover:border-[#2f3240]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs truncate text-white">{svc.name}</span>
                    <span className="text-[9px] font-mono-code text-white bg-[#1a1b22] px-1 py-0.2 rounded border border-[#2b2e3a]">
                      Tier {svc.tier}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#717380] font-mono-code block">
                    Base: {svc.baselineMetrics.latency}ms · Crit: {Math.round(svc.criticality * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Failure Type */}
          <div>
            <label className="block text-[#a1a1aa] font-semibold mb-1.5 font-mono-code text-[11px] uppercase tracking-wider">
              2. Failure Mechanism
            </label>
            <div className="space-y-1.5">
              {failureTypes.map((type) => (
                <label
                  key={type.id}
                  onClick={() => setFailureType(type.id)}
                  className={`p-2.5 rounded-md border flex items-start gap-3 cursor-pointer transition-colors ${
                    failureType === type.id
                      ? 'border-red-600 bg-red-950/20'
                      : 'border-[#1f2128] bg-[#121318] hover:bg-[#181920]'
                  }`}
                >
                  <input
                    type="radio"
                    name="failureType"
                    checked={failureType === type.id}
                    onChange={() => setFailureType(type.id)}
                    className="mt-0.5 text-red-500 focus:ring-red-500 accent-red-500"
                  />
                  <div>
                    <span className="font-bold text-[#ededef] block">{type.name}</span>
                    <span className="text-[11px] text-[#717380]">{type.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Intensity & Duration Sliders */}
          <div className="grid grid-cols-2 gap-4 bg-[#121318] border border-[#1f2128] p-3 rounded-md">
            <div>
              <div className="flex items-center justify-between mb-1 font-mono-code">
                <span className="text-[#8e909d]">Intensity</span>
                <span className="text-red-400 font-bold">{intensity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 font-mono-code">
                <span className="text-[#8e909d]">Duration</span>
                <span className="text-white font-bold">{duration} seconds</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>
          </div>

          {/* Pre-flight Blast Radius Impact Preview */}
          <div className="bg-[#121318] border border-red-900/40 p-3 rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-code font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Predicted Blast Radius Impact
              </span>
              <span className="font-mono-code font-bold text-red-400 text-sm">
                {blastRadiusPreview.percentage}% System Impact
              </span>
            </div>

            <p className="text-[11px] text-[#8e909d]">
              Traverses downstream callers to predict degradation will cascade to{' '}
              <strong className="text-white">{blastRadiusPreview.affectedServices.length} microservices</strong>{' '}
              ({blastRadiusPreview.criticalCount} Mission Critical).
            </p>

            <div className="flex flex-wrap items-center gap-1 font-mono-code text-[10px] pt-1">
              <span className="text-[#717380]">Impact Chain:</span>
              {cascadeChain.affectedIds.map((id, index) => (
                <React.Fragment key={id}>
                  {index > 0 && <ArrowRight className="w-3 h-3 text-[#454756]" />}
                  <span
                    className={`px-1.5 py-0.5 rounded border ${
                      id === targetId
                        ? 'border-red-700 bg-red-950 text-red-300 font-bold'
                        : 'border-[#262833] bg-[#181920] text-[#ededef]'
                    }`}
                  >
                    {id}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#22242e] bg-[#13141a] flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-[#8e909d] text-[11px]">
            <input
              type="checkbox"
              checked={confirmedSafety}
              onChange={(e) => setConfirmedSafety(e.target.checked)}
              className="rounded border-[#2c2f3a] text-red-500 focus:ring-red-500 accent-red-500"
            />
            <span>Confirm controlled sandbox execution</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-[#262833] hover:bg-[#1a1b22] text-[#8e909d] font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleLaunch}
              disabled={!confirmedSafety}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-1.5 rounded-md shadow-sm font-mono-code"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Launch Experiment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
