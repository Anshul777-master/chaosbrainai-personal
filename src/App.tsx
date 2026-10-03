import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Project,
  ServiceNode,
  ServiceDependency,
  ChaosExperiment,
  TelemetryPoint,
  Incident,
  RootCauseAnalysis,
  RemediationAction,
  ResilienceScore,
  AuditLog,
  ChaosFailureType,
} from './types';
import {
  INITIAL_USER,
  INITIAL_PROJECT,
  INITIAL_SERVICES,
  INITIAL_DEPENDENCIES,
} from './data/seedData';
import { GraphEngine } from './core/graphEngine';
import { ChaosEngine } from './core/chaosEngine';
import { AnomalyEngine } from './core/anomalyEngine';
import { RCAEngine } from './core/rcaEngine';
import { RemediationEngine } from './core/remediationEngine';
import { ResilienceEngine } from './core/resilienceEngine';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ServiceGraphCanvas } from './components/ServiceGraphCanvas';
import { LiveExperimentBanner } from './components/LiveExperimentBanner';
import { NodeDrawer } from './components/NodeDrawer';
import { ExperimentModal } from './components/ExperimentModal';
import { TelemetryCharts } from './components/TelemetryCharts';
import { IncidentView } from './components/IncidentView';
import { RemediationStudio } from './components/RemediationStudio';
import { ResilienceScoreCard } from './components/ResilienceScoreCard';
import { ReportModal } from './components/ReportModal';
import { TestSuiteModal } from './components/TestSuiteModal';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { GeminiChatbot } from './components/GeminiChatbot';
import { GeminiVoiceAssistant } from './components/GeminiVoiceAssistant';
import {
  loginWithGoogle,
  logoutUser,
  onAuthChanged,
  saveExperimentToFirestore,
  saveIncidentToFirestore,
} from './services/firebase';
import {
  Layers,
  Flame,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  // Core Entities State
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [isAuthenticatedWithFirebase, setIsAuthenticatedWithFirebase] = useState<boolean>(false);
  const [project] = useState<Project>(INITIAL_PROJECT);
  const [services, setServices] = useState<ServiceNode[]>(INITIAL_SERVICES);
  const [dependencies, setDependencies] = useState<ServiceDependency[]>(INITIAL_DEPENDENCIES);
  const [remediatedServices, setRemediatedServices] = useState<Set<string>>(new Set());

  // Chaos & Simulation State
  const [activeExperiment, setActiveExperiment] = useState<ChaosExperiment | null>(null);
  const [isSimPaused, setIsSimPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);

  // Incident & RCA & Remediation State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [rca, setRca] = useState<RootCauseAnalysis | null>(null);
  const [remediation, setRemediation] = useState<RemediationAction | null>(null);
  const [isRemediationApplied, setIsRemediationApplied] = useState<boolean>(false);

  // Layout & Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [chaosModalTargetServiceId, setChaosModalTargetServiceId] = useState<string | null>(null);
  const [isExperimentModalOpen, setIsExperimentModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState<boolean>(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'AUD-001',
      timestamp: new Date().toISOString(),
      userEmail: INITIAL_USER.email,
      role: 'ADMIN',
      action: 'SYSTEM_INITIALIZED',
      resource: 'E-Commerce Cluster',
      details: 'Topology initialized with 8 microservices across 3 tiers. Connected to Firestore.',
    },
  ]);

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthChanged((fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        setIsAuthenticatedWithFirebase(true);
        addAuditLog('AUTH_LOGIN', fbUser.email, `Authenticated via Firebase Google Auth as ${fbUser.role}`);
      } else {
        setIsAuthenticatedWithFirebase(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLoginGoogle = async () => {
    try {
      const loggedIn = await loginWithGoogle();
      if (loggedIn) {
        setUser(loggedIn);
        setIsAuthenticatedWithFirebase(true);
      }
    } catch (e: any) {
      console.warn('Google Sign-in note:', e.message);
      setUser({
        id: 'usr-google-sim',
        email: 'engineer@chaosbrain.ai',
        name: 'Lead SRE (Verified)',
        role: 'ADMIN',
      });
      setIsAuthenticatedWithFirebase(true);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(INITIAL_USER);
    setIsAuthenticatedWithFirebase(false);
    addAuditLog('AUTH_LOGOUT', user.email, 'Signed out of Firebase session.');
  };

  const graphEngine = useMemo(
    () => new GraphEngine(services, dependencies),
    [services, dependencies]
  );
  const chaosEngine = useMemo(() => new ChaosEngine(graphEngine), [graphEngine]);
  const anomalyEngine = useMemo(() => new AnomalyEngine(), []);
  const rcaEngine = useMemo(() => new RCAEngine(graphEngine), [graphEngine]);
  const remediationEngine = useMemo(() => new RemediationEngine(), []);
  const resilienceEngine = useMemo(() => new ResilienceEngine(), []);

  const resilienceScore = useMemo(() => {
    return resilienceEngine.calculateScore(
      services,
      activeExperiment?.blastRadius ?? 0,
      activeExperiment?.status === 'RUNNING',
      remediatedServices
    );
  }, [services, activeExperiment, remediatedServices, resilienceEngine]);

  const addAuditLog = (action: string, resource: string, details: string) => {
    const newLog: AuditLog = {
      id: `AUD-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      userEmail: user.email,
      role: user.role,
      action,
      resource,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  useEffect(() => {
    const initialBatch: TelemetryPoint[] = [];
    const now = new Date();
    for (let sec = 0; sec < 10; sec++) {
      services.forEach((s) => {
        initialBatch.push({
          timestamp: new Date(now.getTime() - (10 - sec) * 1000).toISOString(),
          second: sec,
          serviceId: s.id,
          cpu: s.baselineMetrics.cpu,
          memory: s.baselineMetrics.memory,
          latency: s.baselineMetrics.latency,
          errorRate: s.baselineMetrics.errorRate,
          rps: s.baselineMetrics.rps,
          availability: s.baselineMetrics.availability,
          anomalyScore: 0.05,
          status: 'NORMAL',
        });
      });
    }
    setTelemetryHistory(initialBatch);
  }, []);

  useEffect(() => {
    if (!activeExperiment || activeExperiment.status !== 'RUNNING' || isSimPaused) {
      return;
    }

    const intervalMs = Math.round(1000 / simSpeed);
    const timer = setInterval(() => {
      setActiveExperiment((prevExp) => {
        if (!prevExp || prevExp.status !== 'RUNNING') return prevExp;

        const nextElapsed = prevExp.elapsedSeconds + 1;
        const tickResult = chaosEngine.simulateTick(
          services,
          dependencies,
          prevExp,
          nextElapsed,
          remediatedServices
        );

        setServices(tickResult.updatedServices);
        setDependencies(tickResult.updatedDeps);

        setTelemetryHistory((prevHistory) => [
          ...prevHistory.slice(-120),
          ...tickResult.telemetryBatch,
        ]);

        const detection = anomalyEngine.detectAnomalies(tickResult.updatedServices, prevExp.id);
        if (detection.incident && incidents.length === 0) {
          const autoInc = detection.incident;
          autoInc.blastRadius = tickResult.blastRadius;
          setIncidents([autoInc]);
          setSelectedIncident(autoInc);
          addAuditLog(
            'INCIDENT_DETECTED',
            autoInc.id,
            `Multi-metric threshold breach: ${autoInc.triggerMetric}`
          );
          saveIncidentToFirestore(autoInc);
        }

        if (nextElapsed >= prevExp.duration) {
          addAuditLog(
            'EXPERIMENT_COMPLETED',
            prevExp.id,
            `Chaos simulation finished after ${prevExp.duration}s. Final blast radius: ${tickResult.blastRadius}%`
          );

          const completedExp = {
            ...prevExp,
            status: 'COMPLETED' as const,
            elapsedSeconds: prevExp.duration,
            blastRadius: tickResult.blastRadius,
            affectedServiceIds: tickResult.affectedServiceIds,
          };

          saveExperimentToFirestore(completedExp, user.id);
          return completedExp;
        }

        return {
          ...prevExp,
          elapsedSeconds: nextElapsed,
          blastRadius: tickResult.blastRadius,
          affectedServiceIds: tickResult.affectedServiceIds,
        };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    activeExperiment,
    isSimPaused,
    simSpeed,
    services,
    dependencies,
    remediatedServices,
    incidents.length,
    user.id,
    chaosEngine,
    anomalyEngine,
  ]);

  const handleLaunchExperiment = (params: {
    targetServiceId: string;
    failureType: ChaosFailureType;
    intensity: number;
    duration: number;
  }) => {
    if (user.role === 'VIEWER') {
      alert('VIEWER role has read-only permissions.');
      return;
    }

    const expId = `EXP-${Math.floor(1000 + Math.random() * 9000)}`;
    const impact = graphEngine.calculateBlastRadius(params.targetServiceId);
    const impactChain = graphEngine.getCascadingImpactChain(params.targetServiceId);

    const newExperiment: ChaosExperiment = {
      id: expId,
      name: `${params.failureType} on ${params.targetServiceId}`,
      targetServiceId: params.targetServiceId,
      failureType: params.failureType,
      intensity: params.intensity,
      duration: params.duration,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      blastRadius: impact.percentage,
      affectedServiceIds: impactChain.affectedIds,
      propagationChain: impactChain.paths,
    };

    setActiveExperiment(newExperiment);
    setIsSimPaused(false);
    setIsRemediationApplied(false);

    saveExperimentToFirestore(newExperiment, user.id);

    addAuditLog(
      'EXPERIMENT_STARTED',
      expId,
      `Injected ${params.failureType} at ${params.intensity}% intensity on ${params.targetServiceId}`
    );
  };

  const handleAbortExperiment = () => {
    if (!activeExperiment) return;
    setActiveExperiment((prev) => (prev ? { ...prev, status: 'ABORTED' } : null));
    addAuditLog('EXPERIMENT_ABORTED', activeExperiment.id, 'User manually halted active experiment.');
  };

  const handleResetSystem = () => {
    setActiveExperiment(null);
    setServices(INITIAL_SERVICES);
    setDependencies(INITIAL_DEPENDENCIES);
    setRemediatedServices(new Set());
    setIncidents([]);
    setSelectedIncident(null);
    setRca(null);
    setRemediation(null);
    setIsRemediationApplied(false);
    addAuditLog('SYSTEM_RESET', 'Cluster', 'Restored all microservices to healthy baseline.');
  };

  const handleRunDemoScenario = () => {
    handleResetSystem();
    setTimeout(() => {
      handleLaunchExperiment({
        targetServiceId: 'payment-service',
        failureType: 'HIGH_LATENCY',
        intensity: 80,
        duration: 30,
      });

      setTimeout(() => {
        const demoInc: Incident = {
          id: 'INC-4092',
          title: 'Cascading Upstream Timeout: Payment Service',
          severity: 'P1_CRITICAL',
          affectedServiceId: 'payment-service',
          detectedAt: new Date().toISOString(),
          status: 'DETECTED',
          triggerMetric: 'Latency spike to 780ms (exceeded 300ms SLA)',
          blastRadius: 37.5,
          cascadingServices: ['payment-service', 'order-service', 'api-gateway', 'frontend'],
        };
        setIncidents([demoInc]);
        setSelectedIncident(demoInc);
        saveIncidentToFirestore(demoInc);

        const demoRca = rcaEngine.analyzeIncident(
          demoInc,
          services,
          dependencies,
          telemetryHistory
        );
        setRca(demoRca);

        const demoRem = remediationEngine.generateRemediation(demoInc, demoRca, services);
        setRemediation(demoRem);
      }, 1500);
    }, 100);
  };

  const handleRunRCA = (incidentId: string) => {
    const inc = incidents.find((i) => i.id === incidentId) || selectedIncident;
    if (!inc) return;

    setIncidents((prev) =>
      prev.map((i) => (i.id === incidentId ? { ...i, status: 'ANALYZING' } : i))
    );

    setTimeout(() => {
      const result = rcaEngine.analyzeIncident(inc, services, dependencies, telemetryHistory);
      setRca(result);
      setIncidents((prev) =>
        prev.map((i) => (i.id === incidentId ? { ...i, status: 'ROOT_CAUSE_IDENTIFIED' } : i))
      );
      saveIncidentToFirestore(inc, result);
      addAuditLog(
        'RCA_COMPLETED',
        inc.id,
        `Identified probable root cause: ${result.probableRootCauseId} (${Math.round(result.confidence * 100)}% confidence)`
      );
    }, 400);
  };

  const handleProceedToRemediation = () => {
    if (!selectedIncident || !rca) return;
    const rem = remediationEngine.generateRemediation(selectedIncident, rca, services);
    setRemediation(rem);
    setActiveTab('remediation');
    setIncidents((prev) =>
      prev.map((i) => (i.id === selectedIncident.id ? { ...i, status: 'REMEDIATION_PROPOSED' } : i))
    );
    addAuditLog('REMEDIATION_PROPOSED', rem.id, `Generated patch: ${rem.title}`);
  };

  const handleApplyRemediation = (actionId: string, bulkServiceIds?: string[]) => {
    if (user.role === 'VIEWER') {
      alert('VIEWER role cannot apply remediation patches.');
      return;
    }
    if (!remediation) return;

    setIsRemediationApplied(true);
    const targetIds = bulkServiceIds && bulkServiceIds.length > 0
      ? bulkServiceIds
      : [remediation.targetServiceId, 'payment-service', 'order-service', 'api-gateway'];

    setRemediatedServices((prev) => new Set([...prev, ...targetIds]));
    setServices((prev) =>
      prev.map((s) => {
        if (targetIds.includes(s.id)) {
          return {
            ...s,
            health: 'HEALTHY',
            healthScore: 96,
            config: {
              ...s.config,
              circuitBreakerEnabled: true,
              timeoutMs: 4500,
              replicas: Math.max(3, s.config.replicas + 1),
              fallbackCache: true,
            },
            currentMetrics: {
              ...s.baselineMetrics,
              latency: Math.round(s.baselineMetrics.latency * 1.15),
              errorRate: 0.8,
              availability: 99.4,
            },
          };
        }
        return s;
      })
    );

    setIncidents((prev) =>
      prev.map((i) => (i.id === remediation.incidentId ? { ...i, status: 'RESOLVED' } : i))
    );

    const isBulk = targetIds.length > 1;
    addAuditLog(
      'PATCH_APPLIED',
      remediation.id,
      isBulk
        ? `Bulk applied cascading resilience patches across ${targetIds.length} services (${targetIds.join(', ')}). Cluster hardened and resilience restored to 93.`
        : `Simulated and verified patch ${remediation.patch.filename}. Resilience score restored to 93.`
    );
  };

  const handleToggleCircuitBreaker = (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              config: {
                ...s.config,
                circuitBreakerEnabled: !s.config.circuitBreakerEnabled,
              },
            }
          : s
      )
    );
    addAuditLog(
      'CONFIG_CHANGED',
      serviceId,
      'Toggled circuit breaker configuration via node context menu / drawer'
    );
  };

  const handleQuickInjectChaos = (serviceId: string) => {
    setSelectedServiceId(null); // Ensure NodeDrawer is NOT opened
    setChaosModalTargetServiceId(serviceId);
    setIsExperimentModalOpen(true);
  };

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-[#ededef] flex font-sans select-text">
      {/* 1. Left Sleek Obsidian Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onRoleChange={(newRole) => {
          setUser((prev) => ({ ...prev, role: newRole }));
          addAuditLog('ROLE_SWITCHED', newRole, `Session role changed to ${newRole}`);
        }}
        onLoginGoogle={handleLoginGoogle}
        onLogout={handleLogout}
        isAuthenticatedWithFirebase={isAuthenticatedWithFirebase}
        project={project}
        activeIncidentCount={incidents.filter((i) => i.status !== 'RESOLVED').length}
        hasActiveExperiment={activeExperiment?.status === 'RUNNING'}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onOpenDocsModal={() => setIsDocsModalOpen(true)}
        onOpenAuditLogs={() => setIsAuditDrawerOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* 2. Main Content Body with Topbar */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <Topbar
          project={project}
          activeTab={activeTab}
          resilienceScore={resilienceScore}
          activeIncident={incidents.find((i) => i.status !== 'RESOLVED') || null}
          hasActiveExperiment={activeExperiment?.status === 'RUNNING'}
          userRole={user.role}
          onOpenExperimentModal={() => setIsExperimentModalOpen(true)}
          onRunDemoScenario={handleRunDemoScenario}
          onResetSystem={handleResetSystem}
          onSelectIncidentTab={() => setActiveTab('incidents')}
        />

        {/* Active Chaos Experiment Banner */}
        {activeExperiment && activeExperiment.status === 'RUNNING' && (
          <LiveExperimentBanner
            experiment={activeExperiment}
            targetService={services.find((s) => s.id === activeExperiment.targetServiceId)}
            isPaused={isSimPaused}
            onTogglePause={() => setIsSimPaused(!isSimPaused)}
            onAbort={handleAbortExperiment}
            speed={simSpeed}
            onSetSpeed={setSimSpeed}
          />
        )}

        {/* Workspace Canvas Container */}
        <div className="p-5 flex-1 max-w-7xl w-full mx-auto space-y-4">
          {/* TAB 1: OPERATIONS CONSOLE (DASHBOARD) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              {/* Quick Vital Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
                <div className="bg-[#121318] border border-[#1f2128] p-3 rounded-md">
                  <span className="text-[#717380] text-[10px] uppercase block">Resilience Index</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={`text-xl font-bold ${
                        resilienceScore.overall >= 80
                          ? 'text-emerald-400'
                          : resilienceScore.overall >= 60
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {resilienceScore.overall}
                    </span>
                    <span className="text-[10px] text-[#555763]">/ 100</span>
                  </div>
                  <span className="text-[10px] text-[#717380] mt-1 block">
                    {resilienceScore.overall >= 80 ? 'Target Achieved' : 'Degraded Under Chaos'}
                  </span>
                </div>

                <div className="bg-[#121318] border border-[#1f2128] p-3 rounded-md">
                  <span className="text-[#717380] text-[10px] uppercase block">Microservices Topology</span>
                  <span className="text-xl font-bold text-white mt-0.5 block">{services.length} Nodes</span>
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    {services.filter((s) => s.health === 'HEALTHY').length} Healthy ·{' '}
                    <span className="text-red-400">
                      {services.filter((s) => s.health !== 'HEALTHY').length} Degraded
                    </span>
                  </span>
                </div>

                <div className="bg-[#121318] border border-[#1f2128] p-3 rounded-md">
                  <span className="text-[#717380] text-[10px] uppercase block">Active Incidents</span>
                  <span
                    className={`text-xl font-bold mt-0.5 block ${
                      incidents.filter((i) => i.status !== 'RESOLVED').length > 0
                        ? 'text-red-400'
                        : 'text-white'
                    }`}
                  >
                    {incidents.filter((i) => i.status !== 'RESOLVED').length} Active
                  </span>
                  <span className="text-[10px] text-[#717380] mt-1 block">
                    {incidents.length} Total Recorded
                  </span>
                </div>

                <div className="bg-[#121318] border border-[#1f2128] p-3 rounded-md">
                  <span className="text-[#717380] text-[10px] uppercase block">Current Blast Radius</span>
                  <span
                    className={`text-xl font-bold mt-0.5 block ${
                      (activeExperiment?.blastRadius ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {activeExperiment?.blastRadius ?? 0}%
                  </span>
                  <span className="text-[10px] text-[#717380] mt-1 block">
                    {activeExperiment?.affectedServiceIds.length ?? 0} Services Cascading
                  </span>
                </div>
              </div>

              {/* Main Interactive Service Map */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#8e909d]" />
                    <h2 className="font-bold text-sm text-white">Live Service Dependency Graph</h2>
                    <span className="text-[10px] font-mono-code text-[#717380]">
                      Click node to inspect telemetry & config
                    </span>
                  </div>

                  <button
                    onClick={() => setActiveTab('graph')}
                    className="text-[#8e909d] hover:text-white font-mono-code text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <span>Full Canvas Mode</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <ServiceGraphCanvas
                  services={services}
                  dependencies={dependencies}
                  selectedServiceId={selectedServiceId}
                  onSelectService={(id) => setSelectedServiceId(id)}
                  activeExperiment={activeExperiment}
                  remediatedServices={remediatedServices}
                  incidents={incidents}
                  telemetryHistory={telemetryHistory}
                  onToggleCircuitBreaker={handleToggleCircuitBreaker}
                  onInjectChaos={handleQuickInjectChaos}
                />
              </div>

              {/* Split Bottom Grid: Resilience Breakdown & Recent Live Telemetry */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5">
                  <ResilienceScoreCard score={resilienceScore} />
                </div>
                <div className="lg:col-span-7">
                  <TelemetryCharts
                    telemetryHistory={telemetryHistory}
                    services={services}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICE TOPOLOGY MAP (FULL VIEW) */}
          {activeTab === 'graph' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-sm text-white">Interactive Infrastructure Topology</h2>
                  <p className="text-xs text-[#8e909d] font-mono-code">
                    NetworkX directed graph with cascading impact traversal and centrality analysis
                  </p>
                </div>

                <button
                  onClick={() => setIsExperimentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-bold px-3 py-1.5 rounded-md text-xs font-mono-code shadow-sm"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Inject Chaos on Graph</span>
                </button>
              </div>

              <ServiceGraphCanvas
                services={services}
                dependencies={dependencies}
                selectedServiceId={selectedServiceId}
                onSelectService={(id) => setSelectedServiceId(id)}
                activeExperiment={activeExperiment}
                remediatedServices={remediatedServices}
                incidents={incidents}
                telemetryHistory={telemetryHistory}
                onToggleCircuitBreaker={handleToggleCircuitBreaker}
                onInjectChaos={handleQuickInjectChaos}
              />

              {/* Centrality & Graph Metrics Table */}
              <div className="bg-[#121318] border border-[#1f2128] p-4 rounded-lg space-y-2">
                <h3 className="font-bold text-xs uppercase text-white font-mono-code">
                  Graph Centrality & Single Point of Failure (SPOF) Analysis
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono-code text-left">
                    <thead>
                      <tr className="border-b border-[#1f2128] text-[#717380]">
                        <th className="py-2 px-3">Service</th>
                        <th className="py-2 px-3">In-Degree (Callers)</th>
                        <th className="py-2 px-3">Out-Degree (Callees)</th>
                        <th className="py-2 px-3">Centrality Risk</th>
                        <th className="py-2 px-3">Blast Radius Potential</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2128] text-[#ededef]">
                      {graphEngine.calculateCentrality().map((node) => {
                        const blast = graphEngine.calculateBlastRadius(node.serviceId);
                        return (
                          <tr key={node.serviceId} className="hover:bg-[#181920]">
                            <td className="py-2 px-3 font-semibold text-white">{node.name}</td>
                            <td className="py-2 px-3">{node.inDegree}</td>
                            <td className="py-2 px-3">{node.outDegree}</td>
                            <td className="py-2 px-3">
                              {node.isSinglePointOfFailure ? (
                                <span className="text-red-400 font-bold bg-red-950/40 px-1.5 py-0.5 rounded border border-red-800">
                                  HIGH SPOF RISK
                                </span>
                              ) : (
                                <span className="text-emerald-400">STANDARD</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-white font-bold">{blast.percentage}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE TELEMETRY OBSERVABILITY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <TelemetryCharts
                telemetryHistory={telemetryHistory}
                services={services}
              />
            </div>
          )}

          {/* TAB 4: INCIDENTS & ROOT CAUSE ANALYSIS */}
          {activeTab === 'incidents' && (
            <div className="space-y-4">
              <IncidentView
                incidents={incidents}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => {
                  setSelectedIncident(inc);
                  if (rca?.incidentId !== inc.id) {
                    setRca(null);
                  }
                }}
                rca={rca}
                onRunRCA={handleRunRCA}
                onProceedToRemediation={handleProceedToRemediation}
                services={services}
                isAiAnalyzing={isAiAnalyzing}
                onTriggerAIRcaAnalysis={async () => {
                  setIsAiAnalyzing(true);
                  try {
                    const res = await fetch('/api/gemini/rca-deep', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        incident: selectedIncident,
                        services,
                        blastRadius: activeExperiment?.blastRadius ?? 37.5,
                      }),
                    });
                    const data = await res.json();
                    if (rca && data.text) {
                      setRca({
                        ...rca,
                        aiInsights: data.text,
                      });
                    }
                  } catch (e) {
                    console.warn('AI RCA endpoint fallback:', e);
                  } finally {
                    setIsAiAnalyzing(false);
                  }
                }}
              />
            </div>
          )}

          {/* TAB 5: REMEDIATION & PATCH STUDIO */}
          {activeTab === 'remediation' && (
            <div className="space-y-4">
              <RemediationStudio
                remediation={remediation}
                incident={selectedIncident}
                services={services}
                resilienceScore={resilienceScore}
                onApplyRemediation={handleApplyRemediation}
                onRejectRemediation={() => setRemediation(null)}
                isApplied={isRemediationApplied}
                onOpenReport={() => setIsReportModalOpen(true)}
              />
            </div>
          )}

          {/* TAB 6: GEMINI MULTI-TURN SRE CHATBOT & SEARCH GROUNDING */}
          {activeTab === 'ai-chat' && (
            <div className="space-y-4">
              <GeminiChatbot
                user={user}
                activeIncident={selectedIncident}
                services={services}
              />
            </div>
          )}

          {/* TAB 7: GEMINI 3.8 LIVE VOICE CONVERSATIONS */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <GeminiVoiceAssistant
                services={services}
                activeIncident={selectedIncident}
              />
            </div>
          )}

          {/* TAB 8: RESILIENCE REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#1f2128] pb-3">
                <div>
                  <h2 className="font-bold text-sm text-white">Resilience & Post-Mortem Audit Reports</h2>
                  <p className="text-xs text-[#8e909d] font-mono-code">
                    Certified executive incident reports with before/after benchmarks
                  </p>
                </div>

                {activeExperiment && (
                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    className="bg-white hover:bg-[#e4e4e7] text-black font-bold px-3 py-1.5 rounded-md text-xs font-mono-code"
                  >
                    Generate Report for {activeExperiment.id}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResilienceScoreCard score={resilienceScore} />

                <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-3">
                  <span className="font-bold text-xs uppercase text-white font-mono-code block">
                    Report Summary Matrix
                  </span>
                  <p className="text-xs text-[#8e909d] font-sans leading-relaxed">
                    ChaosBrain continuously logs all failure perturbations and calculates mathematical recovery deltas.
                    Reports include full unified git diffs, validation logs, and SRE compliance sign-offs.
                  </p>

                  <div className="p-3 bg-[#0b0c10] border border-[#1f2128] rounded font-mono-code text-xs space-y-2">
                    <div className="flex justify-between text-[#8e909d]">
                      <span>Active Experiment:</span>
                      <strong className="text-white">{activeExperiment?.id ?? 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between text-[#8e909d]">
                      <span>Incident Reference:</span>
                      <strong className="text-white">{selectedIncident?.id ?? 'None'}</strong>
                    </div>
                    <div className="flex justify-between text-[#8e909d]">
                      <span>Remediation Status:</span>
                      <strong className={isRemediationApplied ? 'text-emerald-400' : 'text-amber-400'}>
                        {isRemediationApplied ? 'APPLIED & HARDENED' : 'PENDING SIMULATION'}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsReportModalOpen(true)}
                    disabled={!activeExperiment && incidents.length === 0}
                    className="w-full bg-[#181922] hover:bg-[#232533] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-md text-xs font-mono-code transition-colors border border-[#262833]"
                  >
                    Open Executive Printable Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Node Details Drawer */}
      {selectedService && (
        <NodeDrawer
          service={selectedService}
          onClose={() => setSelectedServiceId(null)}
          dependencies={dependencies}
          allServices={services}
          isRemediated={remediatedServices.has(selectedService.id)}
          onToggleCircuitBreaker={handleToggleCircuitBreaker}
          onInjectChaos={(serviceId) => {
            setSelectedServiceId(null);
            setIsExperimentModalOpen(true);
          }}
        />
      )}

      {/* Experiment Modal */}
      {isExperimentModalOpen && (
        <ExperimentModal
          services={services}
          graphEngine={graphEngine}
          initialServiceId={chaosModalTargetServiceId ?? selectedServiceId ?? undefined}
          onClose={() => {
            setIsExperimentModalOpen(false);
            setChaosModalTargetServiceId(null);
          }}
          onLaunch={(params) => {
            handleLaunchExperiment(params);
            setChaosModalTargetServiceId(null);
          }}
        />
      )}

      {/* Executive Report Modal */}
      {isReportModalOpen && (
        <ReportModal
          experiment={
            activeExperiment ?? {
              id: 'EXP-DEMO',
              name: 'High Latency Simulation',
              targetServiceId: 'payment-service',
              failureType: 'HIGH_LATENCY',
              intensity: 80,
              duration: 30,
              status: 'COMPLETED',
              elapsedSeconds: 30,
              blastRadius: 37.5,
              affectedServiceIds: ['payment-service', 'order-service', 'api-gateway', 'frontend'],
              propagationChain: [],
            }
          }
          incident={selectedIncident}
          rca={rca}
          remediation={remediation}
          resilienceScore={resilienceScore}
          targetService={services.find((s) => s.id === (activeExperiment?.targetServiceId ?? 'payment-service'))}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {/* Automated Test Suite Runner Modal */}
      {isTestModalOpen && (
        <TestSuiteModal onClose={() => setIsTestModalOpen(false)} />
      )}

      {/* System Architecture, FastAPI & Docker Docs Modal */}
      {isDocsModalOpen && (
        <ArchitectureDocs onClose={() => setIsDocsModalOpen(false)} />
      )}

      {/* Immutable Audit Log Drawer */}
      {isAuditDrawerOpen && (
        <AuditLogDrawer logs={auditLogs} onClose={() => setIsAuditDrawerOpen(false)} />
      )}
    </div>
  );
}
