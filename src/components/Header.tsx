import React from 'react';
import {
  Activity,
  Shield,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  Terminal,
  Zap,
  BookOpen,
  Sparkles,
  Mic,
  LogIn,
  LogOut,
  Database,
} from 'lucide-react';
import { User, Project, ResilienceScore, Incident } from '../types';

interface HeaderProps {
  user: User;
  onRoleChange: (role: User['role']) => void;
  onLoginGoogle?: () => void;
  onLogout?: () => void;
  isAuthenticatedWithFirebase?: boolean;
  project: Project;
  resilienceScore: ResilienceScore;
  activeIncident: Incident | null;
  hasActiveExperiment: boolean;
  onOpenExperimentModal: () => void;
  onRunDemoScenario: () => void;
  onResetSystem: () => void;
  onOpenReportModal: () => void;
  onOpenTestModal: () => void;
  onOpenDocsModal: () => void;
  onOpenAuditLogs: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onRoleChange,
  onLoginGoogle,
  onLogout,
  isAuthenticatedWithFirebase = false,
  project,
  resilienceScore,
  activeIncident,
  hasActiveExperiment,
  onOpenExperimentModal,
  onRunDemoScenario,
  onResetSystem,
  onOpenReportModal,
  onOpenTestModal,
  onOpenDocsModal,
  onOpenAuditLogs,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
      {/* Top Bar: Brand, Environment, Resilience, Incident, Role, Actions */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold tracking-wider">
              <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">CHAOSBRAIN</span>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono-code bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                  AI CORE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-code leading-none">
                Continuous Resilience Simulator & Auto-Remediation
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs text-slate-400">
            <span>Project: <strong className="text-slate-200">{project.name}</strong></span>
            <span className="text-slate-600">/</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono-code">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {project.environment}
            </span>
          </div>
        </div>

        {/* Global Vital Indicators */}
        <div className="flex items-center gap-4 text-xs">
          {/* Firestore Connection Badge */}
          <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono-code text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Firestore: Connected</span>
          </div>

          {/* Resilience Score Gauge Pill */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            <Shield className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-mono-code leading-none">Resilience Score</span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-mono-code font-bold text-sm leading-none ${
                    resilienceScore.overall >= 80
                      ? 'text-emerald-400'
                      : resilienceScore.overall >= 60
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {resilienceScore.overall}
                </span>
                <span className="text-[10px] text-slate-500">/ 100</span>
              </div>
            </div>
          </div>

          {/* Active Incident Alert */}
          {activeIncident ? (
            <button
              onClick={() => setActiveTab('incidents')}
              className="flex items-center gap-2 bg-rose-950/60 border border-rose-600/50 hover:border-rose-500 px-3 py-1.5 rounded text-rose-300 transition-colors animate-pulse"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <div className="text-left">
                <span className="text-[10px] text-rose-400 uppercase font-mono-code font-semibold block leading-none">
                  {activeIncident.severity}
                </span>
                <span className="font-mono-code text-xs text-rose-200">
                  {activeIncident.id} ({activeIncident.cascadingServices.length} cascading)
                </span>
              </div>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-mono-code text-xs text-slate-300">0 Active Incidents</span>
            </div>
          )}

          {/* Firebase Google Auth / User Badge */}
          {isAuthenticatedWithFirebase ? (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
              <div className="w-5 h-5 rounded-full bg-cyan-600 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                {user.name.charAt(0)}
              </div>
              <span className="text-slate-200 text-xs font-mono-code truncate max-w-[100px]">
                {user.name}
              </span>
              <button
                onClick={onLogout}
                title="Sign out of Firebase"
                className="text-slate-500 hover:text-rose-400 p-0.5 ml-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginGoogle}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded text-xs font-mono-code transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400" />
              <span>Google Sign-In</span>
            </button>
          )}

          {/* Role Switcher (RBAC) */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
            <span className="text-[10px] text-slate-400 font-mono-code uppercase">Role:</span>
            <select
              value={user.role}
              onChange={(e) => onRoleChange(e.target.value as User['role'])}
              className="bg-transparent text-slate-200 font-mono-code text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ADMIN" className="bg-slate-900 text-slate-200">ADMIN</option>
              <option value="ENGINEER" className="bg-slate-900 text-slate-200">ENGINEER</option>
              <option value="VIEWER" className="bg-slate-900 text-slate-200">VIEWER</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onRunDemoScenario}
              title="Runs complete 12-step demo scenario: injects Payment failure, shows propagation, detects incident, runs RCA, and generates patch"
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold px-3 py-1.5 rounded text-xs transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Demo Scenario</span>
            </button>

            <button
              onClick={onOpenExperimentModal}
              disabled={hasActiveExperiment || user.role === 'VIEWER'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                hasActiveExperiment || user.role === 'VIEWER'
                  ? 'border-slate-800 bg-slate-900 text-slate-600 cursor-not-allowed'
                  : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inject Chaos</span>
            </button>

            <button
              onClick={onResetSystem}
              title="Reset topology and metrics back to healthy baseline"
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 flex items-center justify-between overflow-x-auto text-xs">
        <nav className="flex items-center gap-1">
          {[
            { id: 'dashboard', label: 'Operations Console' },
            { id: 'graph', label: 'Service Dependency Graph' },
            { id: 'telemetry', label: 'Live Telemetry' },
            { id: 'incidents', label: 'Incidents & RCA' },
            { id: 'remediation', label: 'Patch Studio' },
            { id: 'ai-chat', label: 'Gemini SRE Chatbot', icon: Sparkles },
            { id: 'voice', label: 'Gemini 3.8 Live Voice', icon: Mic },
            { id: 'reports', label: 'Resilience Reports' },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Supplementary Tool links */}
        <div className="flex items-center gap-2 py-1 pl-2">
          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded hover:bg-slate-900 font-mono-code text-[11px]"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Run Tests</span>
          </button>

          <button
            onClick={onOpenDocsModal}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors px-2 py-1 rounded hover:bg-slate-900 font-mono-code text-[11px]"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Architecture & API</span>
          </button>

          <button
            onClick={onOpenAuditLogs}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-900 font-mono-code text-[11px]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Log</span>
          </button>
        </div>
      </div>
    </header>
  );
};
