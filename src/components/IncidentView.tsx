import React, { useState } from 'react';
import {
  Incident,
  RootCauseAnalysis,
  ServiceNode,
} from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Search,
} from 'lucide-react';
import { HealthPulseDot } from './HealthPulseDot';

interface IncidentViewProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident) => void;
  rca: RootCauseAnalysis | null;
  onRunRCA: (incidentId: string) => void;
  onProceedToRemediation: () => void;
  services: ServiceNode[];
  onTriggerAIRcaAnalysis?: () => void;
  isAiAnalyzing?: boolean;
}

export const IncidentView: React.FC<IncidentViewProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  rca,
  onRunRCA,
  onProceedToRemediation,
  services,
  onTriggerAIRcaAnalysis,
  isAiAnalyzing,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'evidence' | 'timeline' | 'suspects' | 'ai'>('evidence');
  const servicesMap = new Map(services.map((s) => [s.id, s]));

  const getSeverityBadge = (severity: Incident['severity']) => {
    switch (severity) {
      case 'P1_CRITICAL':
        return 'text-red-400 bg-red-950/60 border-red-800';
      case 'P2_HIGH':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'P3_MEDIUM':
        return 'text-yellow-400 bg-yellow-950/60 border-yellow-800';
      case 'P4_LOW':
        return 'text-[#8e909d] bg-[#1a1b22] border-[#2b2e3a]';
    }
  };

  const getStatusBadge = (status: Incident['status']) => {
    switch (status) {
      case 'DETECTED':
        return 'text-red-400 border-red-800 bg-red-950/40';
      case 'ANALYZING':
        return 'text-amber-400 border-amber-800 bg-amber-950/40 animate-pulse';
      case 'ROOT_CAUSE_IDENTIFIED':
        return 'text-purple-400 border-purple-850 bg-purple-950/30';
      case 'REMEDIATION_PROPOSED':
        return 'text-indigo-400 border-indigo-850 bg-indigo-950/30';
      case 'VALIDATED':
        return 'text-violet-400 border-violet-850 bg-violet-950/30';
      case 'RESOLVED':
        return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column: Incidents Queue */}
      <div className="lg:col-span-4 bg-[#121318] border border-[#1f2128] rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2128] pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Incident Queue</h3>
          </div>
          <span className="text-[11px] font-mono-code text-[#717380]">
            {incidents.length} Records
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="p-8 text-center text-[#555763] font-mono-code text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
            No active incidents. System operates within normal baseline bounds.
          </div>
        ) : (
          <div className="space-y-2 max-h-[580px] overflow-y-auto">
            {incidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              const svc = servicesMap.get(inc.affectedServiceId);

              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className={`p-3 rounded-md border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#454958] bg-[#1a1c24] shadow-md'
                      : 'border-[#1f2128] bg-[#0e0f13] hover:border-[#2f323f]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono-code font-bold text-xs text-white">
                      {inc.id}
                    </span>
                    <span
                      className={`text-[9px] font-mono-code px-1.5 py-0.2 rounded border uppercase font-bold ${getSeverityBadge(
                        inc.severity
                      )}`}
                    >
                      {inc.severity}
                    </span>
                  </div>

                  <p className="text-xs text-[#ededef] font-medium truncate mb-1">
                    {inc.title}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono-code text-[#717380]">
                    <div className="flex items-center gap-1.5 truncate">
                      <HealthPulseDot
                        score={svc?.healthScore ?? 35}
                        status={svc?.health ?? 'CRITICAL'}
                        hasActiveIncident={inc.status !== 'RESOLVED'}
                        size="xs"
                      />
                      <span className="truncate">Target: {svc?.name ?? inc.affectedServiceId}</span>
                    </div>
                    <span className={`px-1 py-0.2 rounded border text-[9px] uppercase shrink-0 ${getStatusBadge(inc.status)}`}>
                      {inc.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Deep RCA View */}
      <div className="lg:col-span-8 bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-4">
        {!selectedIncident ? (
          <div className="h-[450px] flex items-center justify-center text-[#555763] font-mono-code text-xs">
            Select an incident from the queue to view Root Cause Analysis & graph evidence.
          </div>
        ) : (
          <>
            {/* Incident Header & Lifecycle Status */}
            <div className="border-b border-[#1f2128] pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono-code font-bold text-base text-white">
                    {selectedIncident.id}
                  </span>
                  <span
                    className={`text-[10px] font-mono-code px-2 py-0.5 rounded border uppercase font-bold ${getSeverityBadge(
                      selectedIncident.severity
                    )}`}
                  >
                    {selectedIncident.severity}
                  </span>
                  <span
                    className={`text-[10px] font-mono-code px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                      selectedIncident.status
                    )}`}
                  >
                    {selectedIncident.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!rca ? (
                    <button
                      onClick={() => onRunRCA(selectedIncident.id)}
                      className="flex items-center gap-1.5 bg-white hover:bg-[#e4e4e7] text-black font-bold px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Run RCA Analysis</span>
                    </button>
                  ) : (
                    <button
                      onClick={onProceedToRemediation}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-md text-xs transition-colors shadow-sm"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Generate Auto-Remediation</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h2 className="text-sm font-bold text-white mb-1">
                {selectedIncident.title}
              </h2>
              <p className="text-xs text-red-300 font-mono-code bg-red-950/20 border border-red-900/40 p-2 rounded">
                Trigger Breach: {selectedIncident.triggerMetric}
              </p>
            </div>

            {/* RCA Result Panel */}
            {!rca ? (
              <div className="p-8 text-center bg-[#0b0c10] border border-[#1f2128] rounded">
                <GitBranch className="w-8 h-8 text-[#8e909d] mx-auto mb-2 animate-pulse" />
                <p className="text-xs font-mono-code text-[#8e909d] mb-3">
                  RCA engine ready. Analyzes graph dependency topology, temporal telemetry precedence, and caller cascade trees.
                </p>
                <button
                  onClick={() => onRunRCA(selectedIncident.id)}
                  className="bg-white hover:bg-[#e4e4e7] text-black font-bold px-4 py-2 rounded text-xs font-mono-code transition-colors"
                >
                  Execute Deterministic Root Cause Analysis
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Root Cause Conclusion Banner */}
                <div className="bg-[#181920] border border-[#2b2e3a] p-4 rounded-lg flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-purple-400 font-mono-code uppercase tracking-wider block mb-0.5">
                      Probable Root Cause Identified
                    </span>
                    <div className="flex items-center gap-2">
                      <HealthPulseDot
                        score={servicesMap.get(rca.probableRootCauseId)?.healthScore ?? 25}
                        status="CRITICAL"
                        hasActiveIncident={true}
                        size="md"
                      />
                      <h4 className="text-lg font-bold text-white">
                        {servicesMap.get(rca.probableRootCauseId)?.name ?? rca.probableRootCauseId}
                      </h4>
                      <span className="text-xs text-[#717380] font-mono-code">
                        ({rca.probableRootCauseId})
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#717380] font-mono-code uppercase block">
                      RCA Confidence Score
                    </span>
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-2xl font-bold font-mono-code text-white">
                        {Math.round(rca.confidence * 100)}%
                      </span>
                      <span className="text-xs text-[#555763]">Certainty</span>
                    </div>
                  </div>
                </div>

                {/* Longest Failure Propagation Chain */}
                <div className="bg-[#0b0c10] border border-[#1f2128] p-3 rounded">
                  <span className="text-[10px] font-mono-code text-[#717380] uppercase tracking-wider block mb-1.5">
                    Causal Propagation Path (Origin → Affected Callers)
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 font-mono-code text-xs">
                    {rca.dependencyChain.map((nodeId, idx) => {
                      const chainSvc = servicesMap.get(nodeId);
                      return (
                        <React.Fragment key={nodeId}>
                          {idx > 0 && <ArrowRight className="w-3.5 h-3.5 text-[#454756]" />}
                          <span
                            className={`px-2 py-1 rounded border flex items-center gap-1.5 ${
                              idx === 0
                                ? 'border-red-700 bg-red-950/60 text-red-300 font-bold'
                                : 'border-[#262833] bg-[#14151b] text-[#ededef]'
                            }`}
                          >
                            <HealthPulseDot
                              score={chainSvc?.healthScore ?? (idx === 0 ? 25 : 60)}
                              status={idx === 0 ? 'CRITICAL' : 'DEGRADED'}
                              hasActiveIncident={true}
                              size="xs"
                            />
                            <span>{chainSvc?.name ?? nodeId}</span>
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-tabs: Evidence, Timeline, Suspects, AI Reasoning */}
                <div className="flex items-center border-b border-[#1f2128] text-xs font-mono-code">
                  {[
                    { id: 'evidence', label: 'Deterministic Evidence' },
                    { id: 'suspects', label: 'Ranked Suspects' },
                    { id: 'timeline', label: 'Incident Timeline' },
                    { id: 'ai', label: 'AI Deep Reasoning' },
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveSubTab(subTab.id as any)}
                      className={`px-3 py-2 border-b-2 font-medium transition-colors ${
                        activeSubTab === subTab.id
                          ? 'border-white text-white'
                          : 'border-transparent text-[#717380] hover:text-white'
                      }`}
                    >
                      {subTab.label}
                    </button>
                  ))}
                </div>

                {/* Evidence Tab */}
                {activeSubTab === 'evidence' && (
                  <div className="space-y-2">
                    {rca.evidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0e0f13] border border-[#1f2128] p-2.5 rounded flex items-start gap-2 text-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-[#ededef] font-sans leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ranked Suspects Tab */}
                {activeSubTab === 'suspects' && (
                  <div className="space-y-2 font-mono-code text-xs">
                    {rca.rankedSuspects.map((suspect, idx) => (
                      <div
                        key={suspect.serviceId}
                        className="bg-[#0e0f13] border border-[#1f2128] p-2.5 rounded flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#1e2029] flex items-center justify-center text-[10px] text-[#717380]">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <HealthPulseDot
                                score={servicesMap.get(suspect.serviceId)?.healthScore ?? 40}
                                status={servicesMap.get(suspect.serviceId)?.health ?? 'DEGRADED'}
                                size="xs"
                              />
                              <span className="font-bold text-white">
                                {servicesMap.get(suspect.serviceId)?.name ?? suspect.serviceId}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#8e909d] font-sans mt-0.5">{suspect.reason}</p>
                          </div>
                        </div>
                        <span className="font-bold text-white text-sm">
                          {Math.round(suspect.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timeline Tab */}
                {activeSubTab === 'timeline' && (
                  <div className="space-y-2 font-mono-code text-xs">
                    {rca.timeline.map((event, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0e0f13] border border-[#1f2128] p-2 rounded flex items-center gap-3"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#717380] shrink-0" />
                        <span className="text-[#717380] shrink-0">{event.time}</span>
                        <span className="text-[#ededef]">{event.event}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Deep Reasoning Tab */}
                {activeSubTab === 'ai' && (
                  <div className="bg-[#0e0f13] border border-[#2b2e3a] p-3 rounded space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="font-bold text-xs text-white">
                          Architectural SRE Post-Mortem Analysis
                        </span>
                      </div>
                      {onTriggerAIRcaAnalysis && (
                        <button
                          onClick={onTriggerAIRcaAnalysis}
                          disabled={isAiAnalyzing}
                          className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-mono-code"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{isAiAnalyzing ? 'Synthesizing...' : 'Refresh AI Analysis'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#d1d5db] font-sans leading-relaxed whitespace-pre-line">
                      {rca.aiInsights ??
                        'Deterministic graph back-tracing determined that failure cascade was triggered by an upstream timeout breach. Upstream callers lacked resilient circuit breakers, resulting in cascading thread exhaustion. Applying the auto-generated Envoy patch will decouple callers.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
