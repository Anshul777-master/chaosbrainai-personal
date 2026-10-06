import React, { useState } from 'react';
import {
  Play,
  Flame,
  RotateCcw,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Palette,
  Minus,
  Plus,
  HelpCircle,
  Type,
  GraduationCap,
  Loader2,
  Check,
} from 'lucide-react';
import { Project, ResilienceScore, Incident, User } from '../types';
import { HealthPulseDot } from './HealthPulseDot';
import { generateProfessorGuidePDF } from '../utils/professorGuidePdf';

export type VibrantTheme = 'cyber' | 'aurora' | 'sunset' | 'synthwave';

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
  fontScale: number;
  onChangeFontScale: (delta: number) => void;
  onSetFontScale: (scale: number) => void;
  isFriendlyMode: boolean;
  onToggleFriendlyMode: () => void;
  onOpenGuideModal: () => void;
  vibrantTheme: VibrantTheme;
  onChangeVibrantTheme: (theme: VibrantTheme) => void;
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
  fontScale,
  onChangeFontScale,
  onSetFontScale,
  isFriendlyMode,
  onToggleFriendlyMode,
  onOpenGuideModal,
  vibrantTheme,
  onChangeVibrantTheme,
}) => {
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isProfPdfLoading, setIsProfPdfLoading] = useState(false);
  const [isProfPdfSuccess, setIsProfPdfSuccess] = useState(false);

  const handleDownloadProfessorPdf = async () => {
    try {
      setIsProfPdfLoading(true);
      await generateProfessorGuidePDF();
      setIsProfPdfLoading(false);
      setIsProfPdfSuccess(true);
      setTimeout(() => setIsProfPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating professor PDF:', err);
      setIsProfPdfLoading(false);
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return isFriendlyMode ? 'Operations Console (Main Playground)' : 'Operations Console';
      case 'graph':
        return isFriendlyMode ? 'Visual App Network (Interactive Map)' : 'Service Dependency Graph';
      case 'telemetry':
        return isFriendlyMode ? 'Live Performance Speeds (Health Monitors)' : 'Live Telemetry & Observability';
      case 'incidents':
        return isFriendlyMode ? 'System Troubles & Culprit Detective (RCA)' : 'Incident Response & Root Cause Analysis';
      case 'remediation':
        return isFriendlyMode ? '1-Click Auto-Repair Studio' : 'Auto-Remediation & Patch Studio';
      case 'ai-chat':
        return 'Gemini SRE Assistant (Search Grounded)';
      case 'voice':
        return 'Gemini 3.8 Live Voice Copilot';
      case 'reports':
        return isFriendlyMode ? 'Executive Health Report Card' : 'Resilience Benchmark Reports';
      default:
        return 'Operations Console';
    }
  };

  return (
    <header className="h-16 border-b border-[#222a42] bg-gradient-to-r from-[#0d101c]/95 via-[#111629]/95 to-[#0e1220]/95 backdrop-blur-md sticky top-0 z-30 px-5 flex items-center justify-between gap-3 shadow-md shadow-black/40">
      {/* Left: Breadcrumbs & Friendly Status */}
      <div className="flex items-center gap-2.5 text-xs min-w-0">
        <span className="text-[#848ea8] font-mono-code hidden md:inline truncate max-w-[160px]">
          {project.name}
        </span>
        <span className="text-[#3c4460] hidden md:inline">/</span>
        <span className="text-white font-bold tracking-wide truncate">
          {getTabLabel(activeTab)}
        </span>

        {isFriendlyMode && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Plain-English Active
          </span>
        )}
      </div>

      {/* Center & Right Status and Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Active Incident Alert Button */}
        {activeIncident ? (
          <button
            onClick={onSelectIncidentTab}
            className="flex items-center gap-2 bg-gradient-to-r from-red-950/80 to-rose-950/80 hover:from-red-900/80 hover:to-rose-900/80 border-2 border-red-500/70 px-3 py-1.5 rounded-xl text-red-200 text-xs transition-all shadow-lg shadow-red-950/50 animate-pulse cursor-pointer"
          >
            <HealthPulseDot
              score={30}
              status="CRITICAL"
              hasActiveIncident={true}
              size="sm"
            />
            <span className="font-mono-code font-bold">{activeIncident.id}</span>
            <span className="text-[#a1a7c4]">·</span>
            <span className="text-red-200 font-semibold truncate max-w-[120px] hidden lg:inline">
              {activeIncident.affectedServiceId}
            </span>
          </button>
        ) : (
          <div className="hidden lg:flex items-center gap-2 bg-[#121626] border border-emerald-500/30 px-2.5 py-1.5 rounded-xl text-[11px] font-mono-code text-emerald-300">
            <HealthPulseDot
              score={100}
              status="HEALTHY"
              size="xs"
            />
            <span>All Systems Green</span>
          </div>
        )}

        {/* Resilience Index Pill with vibrant gradient glow */}
        <div className="flex items-center gap-2 bg-gradient-to-r from-[#141829] to-[#121b2d] border border-cyan-500/30 px-3 py-1.5 rounded-xl shadow-inner">
          <Shield className="w-4 h-4 text-cyan-400" />
          <div className="flex items-center gap-1.5 text-xs font-mono-code">
            <span className="text-[10px] text-[#8e98bd] uppercase">
              {isFriendlyMode ? 'Health' : 'Score'}
            </span>
            <span
              className={`font-bold ${
                resilienceScore.overall >= 80
                  ? 'text-emerald-400'
                  : resilienceScore.overall >= 60
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {resilienceScore.overall}
            </span>
            <span className="text-[10px] text-[#555d7a]">/100</span>
          </div>
        </div>

        {/* --- CONTROLLER 1: Adjustable Font Size Controller --- */}
        <div className="relative flex items-center bg-[#14182a] border border-cyan-500/40 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => onChangeFontScale(-10)}
            disabled={fontScale <= 80}
            title="Decrease text size (A-)"
            className="p-1 text-[#8b95bc] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1e243e] rounded-lg transition-colors cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>

          <button
            onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
            title="Click to choose preset font sizes"
            className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono-code font-bold text-cyan-300 hover:text-white transition-colors cursor-pointer"
          >
            <Type className="w-3 h-3 text-cyan-400" />
            <span>{fontScale}%</span>
          </button>

          <button
            onClick={() => onChangeFontScale(10)}
            disabled={fontScale >= 140}
            title="Increase text size (A+)"
            className="p-1 text-[#8b95bc] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1e243e] rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>

          {/* Quick Font Presets Popover */}
          {isFontDropdownOpen && (
            <div
              onClick={() => setIsFontDropdownOpen(false)}
              className="absolute top-12 left-0 w-36 bg-[#121626] border border-cyan-500/40 rounded-xl shadow-2xl p-1.5 z-40 text-xs font-mono-code space-y-1 animate-in fade-in zoom-in-95"
            >
              <div className="text-[9px] uppercase text-[#717b9b] px-2 py-0.5 font-bold">
                Text Presets
              </div>
              <button
                onClick={() => onSetFontScale(85)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-[#1e243e] transition-colors ${fontScale === 85 ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-[#b1b9d6]'}`}
              >
                Compact (85%)
              </button>
              <button
                onClick={() => onSetFontScale(100)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-[#1e243e] transition-colors ${fontScale === 100 ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-[#b1b9d6]'}`}
              >
                Normal (100%)
              </button>
              <button
                onClick={() => onSetFontScale(115)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-[#1e243e] transition-colors ${fontScale === 115 ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-[#b1b9d6]'}`}
              >
                Comfort (115%)
              </button>
              <button
                onClick={() => onSetFontScale(130)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-[#1e243e] transition-colors ${fontScale === 130 ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-[#b1b9d6]'}`}
              >
                Large (130%)
              </button>
              <button
                onClick={() => onSetFontScale(140)}
                className={`w-full text-left px-2 py-1 rounded hover:bg-[#1e243e] transition-colors ${fontScale === 140 ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-[#b1b9d6]'}`}
              >
                Extra Large (140%)
              </button>
            </div>
          )}
        </div>

        {/* --- CONTROLLER 2: Vibrant Palette Switcher --- */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#14182a] border border-violet-500/40 px-2 py-1 rounded-xl text-xs">
          <Palette className="w-3.5 h-3.5 text-violet-400" />
          <select
            value={vibrantTheme}
            onChange={(e) => onChangeVibrantTheme(e.target.value as any)}
            className="bg-transparent text-violet-200 text-xs font-bold outline-none cursor-pointer pr-1"
            title="Switch panel vibrant theme"
          >
            <option value="cyber" className="bg-[#121626] text-cyan-300">🌈 Cyber Neon</option>
            <option value="aurora" className="bg-[#121626] text-emerald-300">🌿 Aurora Glow</option>
            <option value="sunset" className="bg-[#121626] text-amber-300">🔥 Sunset Flare</option>
            <option value="synthwave" className="bg-[#121626] text-fuchsia-300">⚡ Synthwave Violet</option>
          </select>
        </div>

        {/* --- CONTROLLER 3: Non-Tech Plain-English Mode Toggle --- */}
        <button
          onClick={onToggleFriendlyMode}
          title={isFriendlyMode ? 'Switch to Pro Engineering Mode' : 'Switch to Beginner Plain-English Mode'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
            isFriendlyMode
              ? 'bg-gradient-to-r from-emerald-600/30 to-cyan-600/30 border-emerald-400/60 text-emerald-200 shadow-md shadow-emerald-950/40'
              : 'bg-[#14182a] border-[#29324d] text-[#8e98bd] hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Plain English:</span>
          <span>{isFriendlyMode ? 'ON' : 'PRO'}</span>
        </button>

        {/* --- CONTROLLER 4: Non-Tech Help & Interactive Guide Button --- */}
        <button
          onClick={onOpenGuideModal}
          className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all shadow-md shadow-violet-950/40 cursor-pointer"
          title="Open visual beginner walkthrough"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">How It Works</span>
        </button>

        {/* --- CONTROLLER 5: Complete Professor's Terminology & Architecture PDF Handbook --- */}
        <button
          onClick={handleDownloadProfessorPdf}
          disabled={isProfPdfLoading}
          className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer border ${
            isProfPdfSuccess
              ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-950/40'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-cyan-400/40 text-white shadow-cyan-950/40'
          }`}
          title="Download complete publication-grade SRE Terminology & Architecture PDF with photos and diagrams for professor review"
        >
          {isProfPdfLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Generating PDF...</span>
            </>
          ) : isProfPdfSuccess ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF Downloaded!</span>
            </>
          ) : (
            <>
              <GraduationCap className="w-3.5 h-3.5 text-cyan-200" />
              <span>Professor Guide (PDF)</span>
            </>
          )}
        </button>

        {/* Reset Baseline */}
        <button
          onClick={onResetSystem}
          title="Reset all apps to clean, green baseline"
          className="p-2 text-[#8e98bd] hover:text-white hover:bg-[#1a2035] border border-[#2b3552] rounded-xl transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
