import React from 'react';
import {
  Play,
  Flame,
  RotateCcw,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
} from 'lucide-react';
import { Project, ResilienceScore, Incident, User } from '../types';

interface TopbarProps {
  project: Project;
  activeTab: string;
  resilienceScore: ResilienceScore;
  activeIncident: Incident | null;
  hasActiveExperiment: boolean;
  userRole: User['role'];
  onOpenExperimentModal: () => void;
  onRunDemoScenario: () => void;
  onResetSystem: () => void;
  onSelectIncidentTab: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  project,
  activeTab,
  resilienceScore,
  activeIncident,
  hasActiveExperiment,
  userRole,
  onOpenExperimentModal,
  onRunDemoScenario,
  onResetSystem,
  onSelectIncidentTab,
}) => {
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Operations Console';
      case 'graph':
        return 'Service Dependency Graph';
      case 'telemetry':
        return 'Live Telemetry & Observability';
      case 'incidents':
        return 'Incident Response & Root Cause Analysis';
      case 'remediation':
        return 'Auto-Remediation & Patch Studio';
      case 'ai-chat':
        return 'Gemini SRE Assistant (Search Grounded)';
      case 'voice':
        return 'Gemini 3.8 Live Voice Copilot';
      case 'reports':
        return 'Resilience Benchmark Reports';
      default:
        return 'Operations Console';
    }
  };

  return (
    <header className="h-14 border-b border-[#1f2128] bg-[#0c0d11]/90 backdrop-blur sticky top-0 z-30 px-5 flex items-center justify-between gap-4">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#717380] font-mono-code">{project.name}</span>
        <span className="text-[#3b3d48]">/</span>
        <span className="text-white font-semibold">{getTabLabel(activeTab)}</span>
      </div>

      {/* Center & Right Status and Actions */}
      <div className="flex items-center gap-3">
        {/* Active Incident Alert Button */}
        {activeIncident ? (
          <button
            onClick={onSelectIncidentTab}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-950/60 border border-red-800/60 px-3 py-1.5 rounded-md text-red-300 text-xs transition-colors animate-pulse"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="font-mono-code font-bold">{activeIncident.id}</span>
            <span className="text-[#717380]">·</span>
            <span className="text-red-300 truncate max-w-[140px] hidden sm:inline">
              {activeIncident.affectedServiceId}
            </span>
          </button>
        ) : (
          <div className="hidden md:flex items-center gap-1.5 bg-[#14151b] border border-[#22242e] px-2.5 py-1 rounded text-[11px] font-mono-code text-[#8e909d]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>0 Active Incidents</span>
          </div>
        )}

        {/* Resilience Index Pill */}
        <div className="flex items-center gap-2 bg-[#14151b] border border-[#22242e] px-3 py-1 rounded-md">
          <Shield className="w-3.5 h-3.5 text-[#8e909d]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#717380] uppercase font-mono-code">Resilience</span>
            <span
              className={`font-mono-code font-bold text-xs ${
                resilienceScore.overall >= 80
                  ? 'text-emerald-400'
                  : resilienceScore.overall >= 60
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {resilienceScore.overall}
            </span>
            <span className="text-[10px] text-[#555762]">/100</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Demo Scenario */}
          <button
            onClick={onRunDemoScenario}
            title="Execute complete 12-step demo scenario: injects Payment failure, shows propagation, detects incident, runs RCA, and generates patch"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Demo Scenario</span>
          </button>

          {/* Inject Chaos */}
          <button
            onClick={onOpenExperimentModal}
            disabled={hasActiveExperiment || userRole === 'VIEWER'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${
              hasActiveExperiment || userRole === 'VIEWER'
                ? 'border-[#22242e] bg-[#14151b] text-[#555762] cursor-not-allowed'
                : 'border-red-900/60 bg-red-950/20 hover:bg-red-950/50 text-red-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>Inject Chaos</span>
          </button>

          {/* Reset Baseline */}
          <button
            onClick={onResetSystem}
            title="Reset topology to healthy baseline"
            className="p-1.5 text-[#717380] hover:text-white hover:bg-[#191b22] border border-[#22242e] rounded-md transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
