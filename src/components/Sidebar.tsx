import React from 'react';
import {
  LayoutDashboard,
  Network,
  Activity,
  Flame,
  AlertTriangle,
  FileDiff,
  FileText,
  Sparkles,
  Radio,
  Terminal,
  BookOpen,
  History,
  LogIn,
  LogOut,
  Database,
  Zap,
  ChevronLeft,
  ChevronRight,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { User, Project, Incident, ServiceNode } from '../types';
import { HealthPulseDot } from './HealthPulseDot';
import { generateProfessorGuidePDF } from '../utils/professorGuidePdf';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User;
  onRoleChange: (role: User['role']) => void;
  onLoginGoogle?: () => void;
  onLogout?: () => void;
  isAuthenticatedWithFirebase: boolean;
  project: Project;
  activeIncidentCount: number;
  hasActiveExperiment: boolean;
  onOpenTestModal: () => void;
  onOpenDocsModal: () => void;
  onOpenAuditLogs: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  services?: ServiceNode[];
  selectedServiceId?: string | null;
  onSelectService?: (id: string) => void;
  activeIncidents?: Incident[];
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  tag?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onRoleChange,
  onLoginGoogle,
  onLogout,
  isAuthenticatedWithFirebase,
  project,
  activeIncidentCount,
  hasActiveExperiment,
  onOpenTestModal,
  onOpenDocsModal,
  onOpenAuditLogs,
  isCollapsed,
  setIsCollapsed,
  services = [],
  selectedServiceId,
  onSelectService,
  activeIncidents = [],
}) => {
  const activeIncidentIds = new Set<string>();
  activeIncidents.forEach((inc) => {
    if (inc.status !== 'RESOLVED') {
      activeIncidentIds.add(inc.affectedServiceId);
      inc.cascadingServices?.forEach((id) => activeIncidentIds.add(id));
    }
  });

  const strugglingCount = services.filter(
    (s) => s.health !== 'HEALTHY' || s.healthScore < 80 || activeIncidentIds.has(s.id)
  ).length;
  const navSections: NavSection[] = [
    {
      title: 'OBSERVABILITY',
      items: [
        { id: 'dashboard', label: 'Operations Console', icon: LayoutDashboard },
        { id: 'graph', label: 'Service Topology', icon: Network },
        { id: 'telemetry', label: 'Live Telemetry', icon: Activity },
      ],
    },
    {
      title: 'RESILIENCE & CHAOS',
      items: [
        {
          id: 'remediation',
          label: 'Patch Studio',
          icon: FileDiff,
        },
        {
          id: 'incidents',
          label: 'Incidents & RCA',
          icon: AlertTriangle,
          badge: activeIncidentCount > 0 ? `${activeIncidentCount}` : undefined,
          badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/40',
        },
        { id: 'reports', label: 'Resilience Reports', icon: FileText },
      ],
    },
    {
      title: 'AI COPILOT',
      items: [
        {
          id: 'ai-chat',
          label: 'Gemini SRE Chat',
          icon: Sparkles,
          tag: 'Search Grounded',
        },
        {
          id: 'voice',
          label: 'Gemini 3.8 Live Voice',
          icon: Radio,
          tag: 'Realtime',
        },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#0d0e12] border-r border-[#1f2128] flex flex-col h-screen sticky top-0 transition-all duration-300 z-40 select-none ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-[#222a42] px-3.5 flex items-center justify-between bg-gradient-to-r from-[#0d101d] to-[#121626]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
              <Zap className="w-4 h-4 fill-current text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-tight text-white text-sm bg-gradient-to-r from-white via-cyan-100 to-emerald-200 bg-clip-text text-transparent">
                  CHAOSBRAIN
                </span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-mono-code bg-emerald-950/60 border border-emerald-500/40 px-1 py-0.2 rounded font-bold shadow-xs">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-[#8e98bd] font-mono-code block leading-none mt-0.5">
                Resilience & Remediation
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
            <Zap className="w-4 h-4 fill-current" />
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[#848ea8] hover:text-white p-1 hover:bg-[#1a2034] rounded-lg transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <span className="px-2.5 text-[10px] uppercase font-mono-code tracking-wider text-[#636e92] font-bold block mb-1">
                {section.title}
              </span>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 via-violet-500/15 to-emerald-500/10 text-cyan-200 border border-cyan-500/40 shadow-md shadow-cyan-950/40 font-bold'
                      : 'text-[#9aa4c7] hover:text-white hover:bg-[#151928]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                        : 'text-[#7c86a6]'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between truncate text-left">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{item.label}</span>
                        {item.id === 'incidents' && activeIncidentCount > 0 && (
                          <HealthPulseDot
                            score={30}
                            status="CRITICAL"
                            hasActiveIncident={true}
                            size="xs"
                          />
                        )}
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {item.tag && (
                        <span className="text-[9px] font-mono-code text-cyan-300 bg-cyan-950/50 px-1 py-0.2 rounded border border-cyan-800/50 font-bold">
                          {item.tag}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Cluster Microservices Health Pulse Section */}
        {services.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-[#1f2128]">
            {!isCollapsed ? (
              <div className="flex items-center justify-between px-2.5 mb-1.5">
                <span className="text-[10px] uppercase font-mono-code tracking-wider text-[#636e92] font-bold">
                  SERVICES HEALTH PULSE
                </span>
                <span
                  className={`text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded-full ${
                    strugglingCount > 0
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {strugglingCount > 0 ? `${strugglingCount} Struggling` : 'All 8 Healthy'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 py-1" title="Services Health Pulse">
                <span className="text-[9px] uppercase font-mono-code text-[#636e92] font-bold">SVC</span>
              </div>
            )}

            <div className="space-y-0.5">
              {services.map((svc) => {
                const isSelected = selectedServiceId === svc.id;
                const hasIncident = activeIncidentIds.has(svc.id);
                const isStruggling = svc.health !== 'HEALTHY' || svc.healthScore < 80 || hasIncident;

                return (
                  <button
                    key={svc.id}
                    onClick={() => onSelectService?.(svc.id)}
                    title={`${svc.name}: ${svc.healthScore}% Health · ${isStruggling ? 'Struggling / Alert' : 'Healthy'}`}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#1b2238] text-white border border-cyan-500/50 shadow-sm'
                        : isStruggling
                        ? 'bg-red-950/20 hover:bg-red-950/40 text-[#f1f5f9] border border-red-900/30'
                        : 'hover:bg-[#151928] text-[#9aa4c7] hover:text-white'
                    }`}
                  >
                    {/* Subtle Color-Coded Health Pulse Indicator Dot */}
                    <HealthPulseDot
                      score={svc.healthScore}
                      status={svc.health}
                      hasActiveIncident={hasIncident}
                      size="sm"
                    />

                    {!isCollapsed ? (
                      <div className="flex-1 flex items-center justify-between truncate min-w-0">
                        <span className="truncate font-medium text-[11px]">{svc.name}</span>
                        <div className="flex items-center gap-1 shrink-0 ml-1.5 font-mono-code">
                          <span
                            className={`text-[10px] font-bold ${
                              isStruggling ? 'text-red-400' : 'text-emerald-400/80'
                            }`}
                          >
                            {svc.healthScore}%
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* System & Tools Section */}
        <div className="space-y-1 pt-2 border-t border-[#1f2128]">
          {!isCollapsed && (
            <span className="px-2.5 text-[10px] uppercase font-mono-code tracking-wider text-[#5a5c68] font-semibold block mb-1">
              SYSTEM & DOCS
            </span>
          )}

          <button
            onClick={onOpenTestModal}
            title={isCollapsed ? 'Run Automated Test Suite' : undefined}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-[#8e909d] hover:text-emerald-400 hover:bg-[#14151b] transition-colors"
          >
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 flex items-center justify-between">
                <span>Run System Tests</span>
                <span className="text-[9px] font-mono-code text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-1 py-0.2 rounded">
                  8/8 Passed
                </span>
              </div>
            )}
          </button>

          <button
            onClick={() => generateProfessorGuidePDF()}
            title={isCollapsed ? "Professor's Guide (PDF)" : undefined}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-cyan-300 hover:text-white hover:bg-cyan-950/40 border border-cyan-800/40 transition-colors group cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="font-semibold">Professor Guide (PDF)</span>}
          </button>

          <button
            onClick={onOpenDocsModal}
            title={isCollapsed ? 'Architecture & API Docs' : undefined}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-[#8e909d] hover:text-white hover:bg-[#14151b] transition-colors"
          >
            <BookOpen className="w-4 h-4 text-[#717380] shrink-0" />
            {!isCollapsed && <span>Architecture & API</span>}
          </button>

          <button
            onClick={onOpenAuditLogs}
            title={isCollapsed ? 'SRE Audit Trail' : undefined}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-[#8e909d] hover:text-white hover:bg-[#14151b] transition-colors"
          >
            <History className="w-4 h-4 text-[#717380] shrink-0" />
            {!isCollapsed && <span>Audit Trail</span>}
          </button>
        </div>
      </div>

      {/* Footer: User Account & Role Switcher */}
      <div className="p-3 border-t border-[#1f2128] bg-[#0b0c10] space-y-2">
        {!isCollapsed ? (
          <>
            {/* Live Firestore Connection Indicator */}
            <div className="flex items-center justify-between text-[10px] font-mono-code text-[#717380]">
              <span className="flex items-center gap-1.5">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Firestore Synced</span>
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* User Account / Google Sign-in */}
            <div className="bg-[#14151b] border border-[#22242e] p-2 rounded-md flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#242732] border border-[#353846] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="truncate">
                  <span className="text-white text-xs font-semibold block truncate leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-[#717380] font-mono-code truncate block">
                    {user.email}
                  </span>
                </div>
              </div>

              {isAuthenticatedWithFirebase ? (
                <button
                  onClick={onLogout}
                  title="Sign out of Firebase"
                  className="text-[#717380] hover:text-red-400 p-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onLoginGoogle}
                  title="Sign in with Google"
                  className="text-emerald-400 hover:text-emerald-300 p-1 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Switcher */}
            <div className="flex items-center justify-between bg-[#14151b] border border-[#22242e] px-2 py-1 rounded text-[11px] font-mono-code">
              <span className="text-[#717380] uppercase text-[9px]">Role</span>
              <select
                value={user.role}
                onChange={(e) => onRoleChange(e.target.value as User['role'])}
                className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
              >
                <option value="ADMIN" className="bg-[#14151b] text-white">ADMIN</option>
                <option value="ENGINEER" className="bg-[#14151b] text-white">ENGINEER</option>
                <option value="VIEWER" className="bg-[#14151b] text-white">VIEWER</option>
              </select>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#242732] border border-[#353846] flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
