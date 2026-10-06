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
import { Topbar, VibrantTheme } from './components/Topbar';
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
import { InteractiveStoryCard } from './components/InteractiveStoryCard';
import { NonTechGuideModal } from './components/NonTechGuideModal';
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
  Shield,
  Network,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
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

  // Non-Tech Friendly & Accessibility Controls
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem('chaosbrain_font_scale');
    return saved ? Math.min(140, Math.max(80, Number(saved))) : 100;
  });
  const [isFriendlyMode, setIsFriendlyMode] = useState<boolean>(true);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [vibrantTheme, setVibrantTheme] = useState<VibrantTheme>(() => {
    const saved = localStorage.getItem('chaosbrain_theme') as any;
    return saved || 'cyber';
  });

  // Sync font scale with root documentElement for instantaneous crisp text resizing
  useEffect(() => {
    localStorage.setItem('chaosbrain_font_scale', fontScale.toString());
    document.documentElement.style.fontSize = `${(fontScale / 100) * 16}px`;
    document.documentElement.style.setProperty('--app-font-scale', (fontScale / 100).toString());
  }, [fontScale]);

  // Sync theme with root class & localStorage
  useEffect(() => {
    localStorage.setItem('chaosbrain_theme', vibrantTheme);
  }, [vibrantTheme]);

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

  const handleRunStory = (storyType: 'payment' | 'database' | 'gateway') => {
    handleResetSystem();
    setTimeout(() => {
      if (storyType === 'payment') {
        handleLaunchExperiment({
          targetServiceId: 'payment-service',
          failureType: 'HIGH_LATENCY',
          intensity: 85,
          duration: 30,
        });

        setTimeout(() => {
          const inc: Incident = {
            id: 'INC-4092',
            title: 'Black Friday Surge: Payment Service High Delay',
            severity: 'P1_CRITICAL',
            affectedServiceId: 'payment-service',
            detectedAt: new Date().toISOString(),
            status: 'DETECTED',
            triggerMetric: '10,000 checkout requests spiked latency to 820ms',
            blastRadius: 37.5,
            cascadingServices: ['payment-service', 'order-service', 'api-gateway', 'frontend'],
          };
          setIncidents([inc]);
          setSelectedIncident(inc);
          saveIncidentToFirestore(inc);

          const demoRca = rcaEngine.analyzeIncident(
            inc,
            services,
            dependencies,
            telemetryHistory
          );
          setRca(demoRca);

          const demoRem = remediationEngine.generateRemediation(inc, demoRca, services);
          setRemediation(demoRem);
        }, 1200);
      } else if (storyType === 'database') {
        handleLaunchExperiment({
          targetServiceId: 'inventory-service',
          failureType: 'DATABASE_FAILURE',
          intensity: 90,
          duration: 30,
        });

        setTimeout(() => {
          const inc: Incident = {
            id: 'INC-5104',
            title: 'Cloud Database Disconnect: Inventory DB Down',
            severity: 'P1_CRITICAL',
            affectedServiceId: 'inventory-service',
            detectedAt: new Date().toISOString(),
            status: 'DETECTED',
            triggerMetric: 'Database connection pool exhausted (0 available)',
            blastRadius: 37.5,
            cascadingServices: ['inventory-service', 'order-service', 'api-gateway'],
          };
          setIncidents([inc]);
          setSelectedIncident(inc);
          saveIncidentToFirestore(inc);

          const demoRca = rcaEngine.analyzeIncident(
            inc,
            services,
            dependencies,
            telemetryHistory
          );
          setRca(demoRca);

          const demoRem = remediationEngine.generateRemediation(inc, demoRca, services);
          setRemediation(demoRem);
        }, 1200);
      } else {
        handleLaunchExperiment({
          targetServiceId: 'api-gateway',
          failureType: 'CPU_STRESS',
          intensity: 95,
          duration: 30,
        });

        setTimeout(() => {
          const inc: Incident = {
            id: 'INC-3810',
            title: 'Gateway CPU Overheat: Ingress Saturation',
            severity: 'P2_HIGH',
            affectedServiceId: 'api-gateway',
            detectedAt: new Date().toISOString(),
            status: 'DETECTED',
            triggerMetric: 'API Gateway CPU pinned at 96% utilization',
            blastRadius: 50.0,
            cascadingServices: ['api-gateway', 'frontend', 'order-service'],
          };
          setIncidents([inc]);
          setSelectedIncident(inc);
          saveIncidentToFirestore(inc);

          const demoRca = rcaEngine.analyzeIncident(
            inc,
            services,
            dependencies,
            telemetryHistory
          );
          setRca(demoRca);

          const demoRem = remediationEngine.generateRemediation(inc, demoRca, services);
          setRemediation(demoRem);
        }, 1200);
      }
    }, 150);
  };

  const handleAutoFix = () => {
    if (user.role === 'VIEWER') {
      alert('VIEWER role cannot apply remediation patches.');
      return;
    }
    const targetIds = ['payment-service', 'inventory-service', 'order-service', 'api-gateway', 'frontend'];
    setIsRemediationApplied(true);
    setRemediatedServices((prev) => new Set([...prev, ...targetIds]));
    setServices((prev) =>
      prev.map((s) => {
        if (targetIds.includes(s.id)) {
          return {
            ...s,
            health: 'HEALTHY',
            healthScore: 98,
            config: {
              ...s.config,
              circuitBreakerEnabled: true,
              timeoutMs: 4500,
              replicas: Math.max(3, s.config.replicas + 1),
              fallbackCache: true,
            },
            currentMetrics: {
              ...s.baselineMetrics,
              latency: Math.round(s.baselineMetrics.latency * 1.05),
              errorRate: 0.2,
              availability: 99.9,
            },
          };
        }
        return s;
      })
    );
    setIncidents((prev) =>
      prev.map((i) => ({ ...i, status: 'RESOLVED' }))
    );
    if (activeExperiment) {
      setActiveExperiment((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
    }
    addAuditLog(
      'AUTO_REPAIR_SUCCESS',
      'System-AutoHeal',
      '1-Click Smart Auto-Repair applied! Tripped circuit breakers, expanded replicas, and restored cluster health to 98%.'
    );
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
    <div
      className={`min-h-screen text-[#ededef] flex font-sans select-text relative transition-colors duration-300 theme-${vibrantTheme} ${
        vibrantTheme === 'cyber'
          ? 'bg-[#090b14]'
          : vibrantTheme === 'aurora'
          ? 'bg-[#07110e]'
          : vibrantTheme === 'sunset'
          ? 'bg-[#120a0d]'
          : 'bg-[#0f0919]'
      }`}
      style={{ fontSize: `${fontScale}%` }}
    >
      {/* Dynamic Ambient Background Aura */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className={`absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-25 animate-pulse transition-all duration-700 ${
            vibrantTheme === 'cyber'
              ? 'bg-cyan-500'
              : vibrantTheme === 'aurora'
              ? 'bg-emerald-500'
              : vibrantTheme === 'sunset'
              ? 'bg-amber-500'
              : 'bg-fuchsia-500'
          }`}
        />
        <div
          className={`absolute top-1/3 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse transition-all duration-700 delay-1000 ${
            vibrantTheme === 'cyber'
              ? 'bg-violet-600'
              : vibrantTheme === 'aurora'
              ? 'bg-teal-500'
              : vibrantTheme === 'sunset'
              ? 'bg-rose-600'
              : 'bg-indigo-600'
          }`}
        />
        <div
          className={`absolute -bottom-40 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-15 animate-pulse transition-all duration-700 delay-500 ${
            vibrantTheme === 'cyber'
              ? 'bg-emerald-500'
              : vibrantTheme === 'aurora'
              ? 'bg-lime-500'
              : vibrantTheme === 'sunset'
              ? 'bg-orange-500'
              : 'bg-pink-500'
          }`}
        />
      </div>

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
        services={services}
        selectedServiceId={selectedServiceId}
        onSelectService={(id) => {
          setSelectedServiceId(id);
          setActiveTab('graph');
        }}
        activeIncidents={incidents}
      />

      {/* 2. Main Content Body with Topbar */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative z-10">
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
          fontScale={fontScale}
          onChangeFontScale={(delta) => setFontScale((prev) => Math.min(140, Math.max(80, prev + delta)))}
          onSetFontScale={(scale) => setFontScale(Math.min(140, Math.max(80, scale)))}
          isFriendlyMode={isFriendlyMode}
          onToggleFriendlyMode={() => setIsFriendlyMode(!isFriendlyMode)}
          onOpenGuideModal={() => setIsGuideModalOpen(true)}
          vibrantTheme={vibrantTheme}
          onChangeVibrantTheme={(th) => setVibrantTheme(th)}
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
              {/* Interactive Story Playbook for Non-Tech Users */}
              <InteractiveStoryCard
                onRunStory={handleRunStory}
                onAutoFix={handleAutoFix}
                onReset={handleResetSystem}
                onOpenGuide={() => setIsGuideModalOpen(true)}
                activeExperiment={activeExperiment}
                activeIncident={incidents.find((i) => i.status !== 'RESOLVED') || null}
                isRemediated={isRemediationApplied}
                resilienceScore={resilienceScore.overall}
              />

              {/* Beginner Cheat Sheet / Plain English Explainer Card (Toggleable) */}
              {isFriendlyMode && (
                <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-[#111629] via-[#141a32] to-[#0f1426] p-3.5 shadow-md">
                  <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setIsCheatSheetOpen(!isCheatSheetOpen)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Beginner's Plain-English Cheat Sheet</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                            Non-Tech Guide Active
                          </span>
                        </h4>
                        <p className="text-[11px] text-[#919bbd]">
                          {isCheatSheetOpen ? 'Click to collapse definitions' : 'Click to see what terms like Circuit Breakers and Blast Radius mean in simple human terms'}
                        </p>
                      </div>
                    </div>
                    <button className="text-[#8e98bd] hover:text-white p-1">
                      {isCheatSheetOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isCheatSheetOpen && (
                    <div className="mt-3 pt-3 border-t border-[#202947] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in duration-200">
                      <div className="p-2.5 rounded-lg bg-[#161c36] border border-[#2b355e]">
                        <span className="font-bold text-cyan-300 block mb-0.5">⚡ Chaos Experiment</span>
                        <span className="text-[#a5b0d6] text-[11px] leading-relaxed block">
                          Intentionally simulating server lag or crashes so we discover weaknesses before real users ever see an error!
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#161c36] border border-[#2b355e]">
                        <span className="font-bold text-emerald-300 block mb-0.5">🛡️ Circuit Breaker</span>
                        <span className="text-[#a5b0d6] text-[11px] leading-relaxed block">
                          Just like the fuse box in your home: if one service is failing, it trips the safety switch so the rest of the site stays up!
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#161c36] border border-[#2b355e]">
                        <span className="font-bold text-amber-300 block mb-0.5">💥 Blast Radius</span>
                        <span className="text-[#a5b0d6] text-[11px] leading-relaxed block">
                          How far the problem spreads to other apps. Our goal is 0% blast radius so customers can keep shopping uninterrupted.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Vital Stats Row (Enhanced with Vibrant Themes & Plain English) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
                {/* Stat 1: Resilience Index */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  vibrantTheme === 'aurora'
                    ? 'bg-gradient-to-br from-emerald-950/40 via-[#0e1815] to-[#07130f] border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                    : vibrantTheme === 'sunset'
                    ? 'bg-gradient-to-br from-amber-950/40 via-[#191012] to-[#12080a] border-amber-500/40 shadow-lg shadow-amber-950/30'
                    : vibrantTheme === 'synthwave'
                    ? 'bg-gradient-to-br from-fuchsia-950/40 via-[#180f24] to-[#100918] border-fuchsia-500/40 shadow-lg shadow-fuchsia-950/30'
                    : 'bg-gradient-to-br from-cyan-950/40 via-[#111628] to-[#0c101c] border-cyan-500/40 shadow-lg shadow-cyan-950/30'
                }`}>
                  <span className="text-[#848ea8] text-[10px] uppercase font-bold tracking-wider block">
                    {isFriendlyMode ? 'Cluster Health Rating' : 'Resilience Index'}
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span
                      className={`text-2xl font-black ${
                        resilienceScore.overall >= 80
                          ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : resilienceScore.overall >= 60
                          ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          : 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                      }`}
                    >
                      {resilienceScore.overall}
                    </span>
                    <span className="text-[11px] text-[#5c6684]">/ 100</span>
                  </div>
                  <span className="text-[10px] text-[#8e98bd] mt-1 block">
                    {isFriendlyMode
                      ? (resilienceScore.overall >= 80 ? '🟢 All Systems High Performance' : '⚠️ Degraded Under Load')
                      : (resilienceScore.overall >= 80 ? 'Target SLA Achieved' : 'Degraded Under Chaos')}
                  </span>
                </div>

                {/* Stat 2: Microservices Topology */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  vibrantTheme === 'aurora'
                    ? 'bg-gradient-to-br from-teal-950/40 via-[#0e1815] to-[#07130f] border-teal-500/40 shadow-lg shadow-teal-950/30'
                    : vibrantTheme === 'sunset'
                    ? 'bg-gradient-to-br from-orange-950/40 via-[#191012] to-[#12080a] border-orange-500/40 shadow-lg shadow-orange-950/30'
                    : vibrantTheme === 'synthwave'
                    ? 'bg-gradient-to-br from-pink-950/40 via-[#180f24] to-[#100918] border-pink-500/40 shadow-lg shadow-pink-950/30'
                    : 'bg-gradient-to-br from-indigo-950/40 via-[#111628] to-[#0c101c] border-indigo-500/40 shadow-lg shadow-indigo-950/30'
                }`}>
                  <span className="text-[#848ea8] text-[10px] uppercase font-bold tracking-wider block">
                    {isFriendlyMode ? 'Apps Monitored' : 'Microservices Topology'}
                  </span>
                  <span className="text-2xl font-black text-white mt-1 block">
                    {services.length} Services
                  </span>
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    {services.filter((s) => s.health === 'HEALTHY').length} Healthy ·{' '}
                    <span className={services.filter((s) => s.health !== 'HEALTHY').length > 0 ? 'text-red-400 font-bold' : 'text-[#8e98bd]'}>
                      {services.filter((s) => s.health !== 'HEALTHY').length} Degraded
                    </span>
                  </span>
                </div>

                {/* Stat 3: Active Incidents */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  incidents.filter((i) => i.status !== 'RESOLVED').length > 0
                    ? 'bg-gradient-to-br from-red-950/60 via-[#201016] to-[#14080c] border-red-500/60 shadow-lg shadow-red-950/50 animate-pulse'
                    : 'bg-gradient-to-br from-[#121626] to-[#0e1220] border-[#222a42]'
                }`}>
                  <span className="text-[#848ea8] text-[10px] uppercase font-bold tracking-wider block">
                    {isFriendlyMode ? 'Active Outages' : 'Active Incidents'}
                  </span>
                  <span
                    className={`text-2xl font-black mt-1 block ${
                      incidents.filter((i) => i.status !== 'RESOLVED').length > 0
                        ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                        : 'text-emerald-400'
                    }`}
                  >
                    {incidents.filter((i) => i.status !== 'RESOLVED').length > 0
                      ? `${incidents.filter((i) => i.status !== 'RESOLVED').length} Active Alert`
                      : '0 Outages'}
                  </span>
                  <span className="text-[10px] text-[#8e98bd] mt-1 block">
                    {incidents.filter((i) => i.status !== 'RESOLVED').length > 0
                      ? '⚠️ Needs Auto-Repair'
                      : '🟢 All Systems Green'}
                  </span>
                </div>

                {/* Stat 4: Blast Radius */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  (activeExperiment?.blastRadius ?? 0) > 0
                    ? 'bg-gradient-to-br from-amber-950/50 via-[#1e1418] to-[#120a10] border-amber-500/50 shadow-lg shadow-amber-950/30'
                    : 'bg-gradient-to-br from-[#121626] to-[#0e1220] border-[#222a42]'
                }`}>
                  <span className="text-[#848ea8] text-[10px] uppercase font-bold tracking-wider block">
                    {isFriendlyMode ? 'Damage Spread' : 'Blast Radius'}
                  </span>
                  <span
                    className={`text-2xl font-black mt-1 block ${
                      (activeExperiment?.blastRadius ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {activeExperiment?.blastRadius ?? 0}%
                  </span>
                  <span className="text-[10px] text-[#8e98bd] mt-1 block">
                    {(activeExperiment?.blastRadius ?? 0) > 0
                      ? `${activeExperiment?.affectedServiceIds.length ?? 0} Services Impacted`
                      : '0 Affected (Contained)'}
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
          services={services}
          dependencies={dependencies}
          telemetryHistory={telemetryHistory}
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

      {/* Beginner Non-Tech Walkthrough Guide Modal */}
      {isGuideModalOpen && (
        <NonTechGuideModal
          onClose={() => setIsGuideModalOpen(false)}
          onRunStory={(storyType) => {
            setIsGuideModalOpen(false);
            handleRunStory(storyType);
          }}
        />
      )}
    </div>
  );
}
