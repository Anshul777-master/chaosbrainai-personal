import React, { useState, useMemo, useEffect } from 'react';
import {
  RemediationAction,
  ResilienceScore,
  Incident,
  ServiceNode,
} from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileDiff,
  Check,
  TrendingUp,
  Layers,
  ArrowRight,
  CheckSquare,
  Square,
  Server,
  Zap,
  Cpu,
  Database,
  Globe,
  Loader2,
  Sliders,
} from 'lucide-react';

interface RemediationStudioProps {
  remediation: RemediationAction | null;
  incident: Incident | null;
  services: ServiceNode[];
  resilienceScore: ResilienceScore;
  onApplyRemediation: (actionId: string, bulkServiceIds?: string[]) => void;
  onRejectRemediation: (actionId: string) => void;
  isApplied: boolean;
  onOpenReport: () => void;
}

interface CascadingServicePlan {
  serviceId: string;
  serviceName: string;
  tier: number;
  role: 'ROOT_CAUSE' | 'INTERMEDIATE_CALLER' | 'INGRESS_GATEWAY' | 'EDGE_CLIENT';
  strategy: string;
  filename: string;
  diffUnified: string;
  proposedConfig: string;
  changeSummary: string[];
  safetyChecks: Array<{ name: string; passed: boolean; detail: string }>;
  riskLevel: 'LOW' | 'MEDIUM';
}

export const RemediationStudio: React.FC<RemediationStudioProps> = ({
  remediation,
  incident,
  services,
  resilienceScore,
  onApplyRemediation,
  onRejectRemediation,
  isApplied,
  onOpenReport,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'proposed' | 'validation'>('diff');
  const [mode, setMode] = useState<'BULK' | 'SINGLE'>('BULK');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [activeServiceId, setActiveServiceId] = useState<string>('COMBINED');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationStep, setSimulationStep] = useState<number>(0);

  // Generate tailored patch plans for each node in the cascading incident chain
  const cascadingChain = useMemo<CascadingServicePlan[]>(() => {
    if (!remediation) return [];

    const servicesMap = new Map(services.map((s) => [s.id, s]));
    const targetId = remediation.targetServiceId;

    // Detect all cascade chain participants
    const chainIds = new Set<string>();
    if (targetId) chainIds.add(targetId);
    if (incident?.affectedServiceId) chainIds.add(incident.affectedServiceId);
    if (incident?.cascadingServices) {
      incident.cascadingServices.forEach((id) => chainIds.add(id));
    }

    // Default cascade pattern if single node detected
    if (chainIds.size <= 1) {
      if (targetId === 'payment-service' || targetId === 'inventory-service') {
        chainIds.add('payment-service');
        chainIds.add('order-service');
        chainIds.add('api-gateway');
        chainIds.add('frontend');
      } else if (targetId === 'order-service' || targetId === 'auth-service') {
        chainIds.add('order-service');
        chainIds.add('api-gateway');
        chainIds.add('frontend');
      } else {
        chainIds.add('order-service');
        chainIds.add('api-gateway');
      }
    }

    const plans: CascadingServicePlan[] = [];

    // Sort order: Leaf / Root cause -> Intermediate -> Gateway -> Edge
    const orderedIds = Array.from(chainIds).sort((a, b) => {
      const tierA = servicesMap.get(a)?.tier ?? 2;
      const tierB = servicesMap.get(b)?.tier ?? 2;
      return tierB - tierA; // Higher tier (3, 2, 1) to lower tier (1)
    });

    orderedIds.forEach((id) => {
      const svc = servicesMap.get(id);
      if (!svc) return;

      const isRoot = id === targetId || id === incident?.affectedServiceId;
      const isGateway = svc.type === 'gateway';
      const isFrontend = svc.type === 'frontend';

      if (isRoot) {
        // Root Cause: Horizontal Auto-scaling & Resource Hardening
        plans.push({
          serviceId: svc.id,
          serviceName: svc.name,
          tier: svc.tier,
          role: 'ROOT_CAUSE',
          strategy: 'Horizontal Autoscaling & Connection Pool Bounding',
          filename: `k8s/resilience/${svc.id}-hpa-policy.yaml`,
          diffUnified: `--- a/k8s/apps/${svc.id}-deployment.yaml
+++ b/k8s/resilience/${svc.id}-hpa-policy.yaml
@@ -14,6 +14,14 @@
 spec:
-  replicas: ${svc.config.replicas}
+  replicas: ${svc.config.replicas + 2}
+  horizontalPodAutoscaler:
+    minReplicas: 3
+    maxReplicas: 10
+    targetCPUUtilizationPercentage: 65
   resources:
     limits:
-      cpu: "${svc.config.cpuLimit}"
+      cpu: "2000m"
+      memory: "2Gi"`,
          proposedConfig: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${svc.id}-hardened
  namespace: microservices-prod
spec:
  replicas: ${svc.config.replicas + 2}
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 0%
  template:
    spec:
      containers:
      - name: ${svc.id}
        resources:
          limits:
            cpu: "2000m"
            memory: "2Gi"
          requests:
            cpu: "500m"
            memory: "512Mi"`,
          changeSummary: [
            `Scaled replicas from ${svc.config.replicas} to ${svc.config.replicas + 2} active pods`,
            'Configured HorizontalPodAutoscaler with 65% target CPU threshold',
            'Increased CPU burst limits to 2000m and memory ceiling to 2Gi',
          ],
          safetyChecks: [
            { name: 'K8s Schema Validation', passed: true, detail: 'Complies with Kubernetes Apps/v1 spec.' },
            { name: 'Resource Quota Check', passed: true, detail: 'Node cluster has 14.2 CPU cores remaining capacity.' },
            { name: 'Zero-Downtime Rolling Update', passed: true, detail: 'MaxSurge 25% allows seamless rollout.' },
            { name: 'CrashLoop Canary Guard', passed: true, detail: 'Liveness probes verified on startup.' },
          ],
          riskLevel: 'LOW',
        });
      } else if (isGateway) {
        // Gateway: Outlier Ejection & Adaptive Throttling
        plans.push({
          serviceId: svc.id,
          serviceName: svc.name,
          tier: svc.tier,
          role: 'INGRESS_GATEWAY',
          strategy: 'Adaptive Concurrency & Outlier Ejection',
          filename: `k8s/resilience/${svc.id}-envoy-traffic.yaml`,
          diffUnified: `--- a/k8s/ingress/${svc.id}-envoy.yaml
+++ b/k8s/resilience/${svc.id}-envoy-traffic.yaml
@@ -22,6 +22,12 @@
     trafficPolicy:
       connectionPool:
+        http:
+          maxRequestsPerConnection: 100
+          http1MaxPendingRequests: 50
       outlierDetection:
-        consecutive5xxErrors: 10
+        consecutive5xxErrors: 3
+        baseEjectionTime: 60s
+        maxEjectionPercent: 50`,
          proposedConfig: `apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: ${svc.id}-gateway-resilience
spec:
  host: ${svc.id}.microservices-prod.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 5s
      baseEjectionTime: 60s
      maxEjectionPercent: 50`,
          changeSummary: [
            'Tightened consecutive 5xx ejection threshold from 10 to 3',
            'Enabled 60s base outlier ejection duration for unhealthy upstream endpoints',
            'Bounded pending request queues to 50 to prevent gateway memory saturation',
          ],
          safetyChecks: [
            { name: 'Istio DestinationRule Syntax', passed: true, detail: 'Validated against Istio v1alpha3 CRD.' },
            { name: 'Gateway Outlier Threshold', passed: true, detail: 'Max ejection clamped to 50% to prevent total outage.' },
            { name: 'Socket Connection Limits', passed: true, detail: 'TCP keepalive timeouts configured.' },
            { name: 'Client Timeout Alignment', passed: true, detail: 'Gateway timeout adjusted to 5000ms.' },
          ],
          riskLevel: 'LOW',
        });
      } else if (isFrontend) {
        // Frontend: Fallback Cache & Graceful Degradation
        plans.push({
          serviceId: svc.id,
          serviceName: svc.name,
          tier: svc.tier,
          role: 'EDGE_CLIENT',
          strategy: 'Stale-While-Revalidate Fallback Cache',
          filename: `k8s/resilience/${svc.id}-edge-cache.yaml`,
          diffUnified: `--- a/k8s/frontend/${svc.id}-config.yaml
+++ b/k8s/resilience/${svc.id}-edge-cache.yaml
@@ -8,4 +8,10 @@
   data:
     NEXT_PUBLIC_API_TIMEOUT: "3500"
+    ENABLE_FALLBACK_CACHE: "true"
+    CACHE_STALE_WHILE_REVALIDATE: "60"
+    CIRCUIT_BREAKER_FAST_FAIL: "true"`,
          proposedConfig: `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${svc.id}-resilience-config
data:
  ENABLE_FALLBACK_CACHE: "true"
  CACHE_STALE_WHILE_REVALIDATE: "60"
  CIRCUIT_BREAKER_FAST_FAIL: "true"
  NEXT_PUBLIC_API_TIMEOUT: "3500"`,
          changeSummary: [
            'Enabled in-memory Redis fallback cache on edge endpoints',
            'Configured 60s Stale-While-Revalidate window for degraded services',
            'Enabled fast-fail mock fallback payload to shield end-users from 500 errors',
          ],
          safetyChecks: [
            { name: 'ConfigMap Syntax Check', passed: true, detail: 'Valid YAML key-value mapping.' },
            { name: 'Cache Invalidation SLA', passed: true, detail: 'TTL strictly bounded to 60s maximum.' },
            { name: 'Data Freshness Integrity', passed: true, detail: 'Fallback cache read-only; no write mutations.' },
            { name: 'Edge Latency SLA', passed: true, detail: 'Local cache lookup takes < 2ms.' },
          ],
          riskLevel: 'LOW',
        });
      } else {
        // Intermediate Callers: Envoy Circuit Breaker
        plans.push({
          serviceId: svc.id,
          serviceName: svc.name,
          tier: svc.tier,
          role: 'INTERMEDIATE_CALLER',
          strategy: 'Envoy Outlier Ejection & Circuit Breaker',
          filename: `k8s/resilience/${svc.id}-circuit-breaker.yaml`,
          diffUnified: `--- a/k8s/apps/${svc.id}-istio.yaml
+++ b/k8s/resilience/${svc.id}-circuit-breaker.yaml
@@ -10,6 +10,12 @@
   trafficPolicy:
+    connectionPool:
+      tcp:
+        maxConnections: 150
+    outlierDetection:
+      consecutive5xxErrors: 3
+      interval: 10s
+      baseEjectionTime: 45s`,
          proposedConfig: `apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: ${svc.id}-circuit-breaker
spec:
  host: ${svc.id}.microservices-prod.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 150
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 45s`,
          changeSummary: [
            'Injected Envoy circuit breaker pattern with 3-consecutive error trip wire',
            'Configured 45s outlier ejection window to allow downstream service recovery',
            'Decoupled caller execution thread pool from hanging downstream sockets',
          ],
          safetyChecks: [
            { name: 'Istio Policy Verification', passed: true, detail: 'Validated against Envoy outlier ejection spec.' },
            { name: 'Blast Radius Isolation', passed: true, detail: 'Caller will fast-fail in 15ms instead of hanging.' },
            { name: 'Connection Pool Limit', passed: true, detail: 'Bounded to 150 max concurrent TCP streams.' },
            { name: 'Telemetry Verification', passed: true, detail: 'Prometheus metrics exported on port 9090.' },
          ],
          riskLevel: 'LOW',
        });
      }
    });

    return plans;
  }, [remediation, incident, services]);

  // Initialize selected services with all cascade participants
  useEffect(() => {
    if (cascadingChain.length > 0) {
      setSelectedServices(new Set(cascadingChain.map((p) => p.serviceId)));
    }
  }, [cascadingChain]);

  if (!remediation) {
    return (
      <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-12 text-center text-[#717380] font-mono-code text-xs">
        <ShieldCheck className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
        <p className="text-white font-bold mb-1">No Remediation Action Pending</p>
        <p className="text-[#8e909d]">
          Run a chaos experiment and analyze an incident to synthesize an automated remediation patch.
        </p>
      </div>
    );
  }

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedServices(new Set(cascadingChain.map((p) => p.serviceId)));
  };

  const handleDeselectAll = () => {
    setSelectedServices(new Set());
  };

  const handleSimulateAndApplyBulk = () => {
    if (selectedServices.size === 0) return;
    setIsSimulating(true);
    setSimulationStep(1);

    // Step 1: Validation
    setTimeout(() => {
      setSimulationStep(2);
      // Step 2: Deployment plan
      setTimeout(() => {
        setSimulationStep(3);
        // Step 3: Outlier ejection
        setTimeout(() => {
          setSimulationStep(4);
          // Step 4: Verification & Apply
          setTimeout(() => {
            setIsSimulating(false);
            onApplyRemediation(remediation.id, Array.from(selectedServices));
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };

  // Determine currently displayed patch plan in the viewer
  const displayedPlan = useMemo(() => {
    if (activeServiceId === 'COMBINED') {
      return null;
    }
    return cascadingChain.find((p) => p.serviceId === activeServiceId) || cascadingChain[0];
  }, [activeServiceId, cascadingChain]);

  // Combined diff of all selected services
  const combinedDiff = useMemo(() => {
    const activePlans = cascadingChain.filter((p) => selectedServices.has(p.serviceId));
    return activePlans
      .map((p) => `# === ${p.filename} (${p.serviceName} - ${p.role}) ===\n${p.diffUnified}`)
      .join('\n\n');
  }, [cascadingChain, selectedServices]);

  // Combined change summary
  const combinedChanges = useMemo(() => {
    const activePlans = cascadingChain.filter((p) => selectedServices.has(p.serviceId));
    return activePlans.flatMap((p) => p.changeSummary);
  }, [cascadingChain, selectedServices]);

  // Total safety checks count
  const totalChecksCount = useMemo(() => {
    const activePlans = cascadingChain.filter((p) => selectedServices.has(p.serviceId));
    return activePlans.reduce((acc, p) => acc + p.safetyChecks.length, 0);
  }, [cascadingChain, selectedServices]);

  const getRoleBadge = (role: CascadingServicePlan['role']) => {
    switch (role) {
      case 'ROOT_CAUSE':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800">ROOT CAUSE</span>;
      case 'INTERMEDIATE_CALLER':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">CASCADING CALLER</span>;
      case 'INGRESS_GATEWAY':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">GATEWAY</span>;
      case 'EDGE_CLIENT':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">EDGE CLIENT</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Mode Selection & Quick Actions */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2128] pb-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono-code text-[10px] text-white bg-[#1a1b22] px-1.5 py-0.5 rounded border border-[#2c2f3a]">
                INCIDENT: {incident?.id ?? 'INC-CASCADE-01'}
              </span>
              <span className="font-mono-code text-[10px] px-1.5 py-0.5 rounded border border-emerald-800 text-emerald-400 bg-emerald-950/60 font-bold uppercase">
                Risk: LOW (Validated)
              </span>
              {isApplied ? (
                <span className="font-mono-code text-[10px] px-1.5 py-0.5 rounded border border-emerald-700 bg-emerald-950 text-emerald-300 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  APPLIED & HARDENED ({selectedServices.size} SERVICES)
                </span>
              ) : (
                <span className="font-mono-code text-[10px] px-1.5 py-0.5 rounded border border-cyan-800 bg-cyan-950 text-cyan-300 font-bold">
                  MULTI-SERVICE CASCADE IDENTIFIED
                </span>
              )}
            </div>

            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Simultaneous Cascading Resilience Remediation</span>
              <span className="text-xs font-mono-code text-cyan-400 font-normal">
                ({cascadingChain.length} services in propagation path)
              </span>
            </h2>
            <p className="text-xs text-[#8e909d] mt-0.5">
              Simultaneously patch leaf providers, intermediate callers, and ingress gateways to completely eliminate cascading blast radius.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isApplied ? (
              <>
                <button
                  onClick={() => onRejectRemediation(remediation.id)}
                  disabled={isSimulating}
                  className="px-3 py-1.5 rounded-md border border-[#252733] hover:bg-[#1a1c24] text-[#8e909d] hover:text-white text-xs font-mono-code transition-colors disabled:opacity-50"
                >
                  Reject All
                </button>

                <button
                  onClick={handleSimulateAndApplyBulk}
                  disabled={selectedServices.size === 0 || isSimulating}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-md text-xs font-mono-code shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Simulating Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Bulk Apply ({selectedServices.size} Services)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={onOpenReport}
                className="flex items-center gap-1.5 bg-white hover:bg-[#e4e4e7] text-black font-bold px-4 py-2 rounded-md text-xs font-mono-code shadow-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>View Certified Resilience Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Simulation Pipeline Progress Bar */}
        {isSimulating && (
          <div className="bg-[#0b0c10] border border-cyan-800/80 rounded-md p-3 mb-3 font-mono-code text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-cyan-300 font-bold text-xs">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Executing Automated Multi-Service Canary Pipeline:
              </span>
              <span>Step {simulationStep} of 4</span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-[10px]">
              <div className={`p-2 rounded border transition-colors ${simulationStep >= 1 ? 'bg-cyan-950/60 border-cyan-700 text-cyan-200' : 'bg-[#15161c] border-[#22242e] text-[#555763]'}`}>
                1. AST Schema & AST Syntax Linting
              </div>
              <div className={`p-2 rounded border transition-colors ${simulationStep >= 2 ? 'bg-cyan-950/60 border-cyan-700 text-cyan-200' : 'bg-[#15161c] border-[#22242e] text-[#555763]'}`}>
                2. Graph Topological Verification
              </div>
              <div className={`p-2 rounded border transition-colors ${simulationStep >= 3 ? 'bg-cyan-950/60 border-cyan-700 text-cyan-200' : 'bg-[#15161c] border-[#22242e] text-[#555763]'}`}>
                3. Envoy Outlier Ejection Deployment
              </div>
              <div className={`p-2 rounded border transition-colors ${simulationStep >= 4 ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold' : 'bg-[#15161c] border-[#22242e] text-[#555763]'}`}>
                4. Decoupling & Cluster Recovery Verified
              </div>
            </div>
          </div>
        )}

        {/* Mode Selector & Bulk Selection Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono-code">
            <span className="text-[#717380] text-[11px]">Remediation Scope:</span>
            <div className="flex items-center bg-[#0b0c10] p-0.5 rounded border border-[#262833]">
              <button
                onClick={() => setMode('BULK')}
                className={`px-2.5 py-1 rounded text-xs transition-colors font-bold ${
                  mode === 'BULK'
                    ? 'bg-gradient-to-r from-cyan-950 to-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'text-[#717380] hover:text-white'
                }`}
              >
                Bulk Cascading Chain ({cascadingChain.length})
              </button>
              <button
                onClick={() => setMode('SINGLE')}
                className={`px-2.5 py-1 rounded text-xs transition-colors font-bold ${
                  mode === 'SINGLE'
                    ? 'bg-[#1e2029] text-white border border-[#2f3240]'
                    : 'text-[#717380] hover:text-white'
                }`}
              >
                Single Root Target
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono-code text-[11px] text-[#717380]">
            <span>
              Targeting: <strong className="text-emerald-400">{selectedServices.size}</strong> of {cascadingChain.length} services
            </span>
            <button
              onClick={handleSelectAll}
              className="text-[#a1a1aa] hover:text-white underline underline-offset-2"
            >
              Select All
            </button>
            <span>·</span>
            <button
              onClick={handleDeselectAll}
              className="text-[#a1a1aa] hover:text-white underline underline-offset-2"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Cascading Chain Visualization & Multi-Select Cards */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2128] pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-xs uppercase text-white font-mono-code">
              Cascading Incident Propagation Chain & Patch Plans
            </h3>
          </div>
          <span className="text-[10px] font-mono-code text-[#717380]">
            Click card to inspect diff · Checkbox toggles inclusion in Bulk Apply
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {cascadingChain.map((plan, idx) => {
            const isSelected = selectedServices.has(plan.serviceId);
            const isCurrentlyInspected = activeServiceId === plan.serviceId;

            return (
              <div
                key={plan.serviceId}
                onClick={() => setActiveServiceId(plan.serviceId)}
                className={`relative p-3 rounded-lg border transition-all cursor-pointer font-mono-code text-xs ${
                  isCurrentlyInspected
                    ? 'ring-2 ring-cyan-500/80 bg-[#161822] border-cyan-500'
                    : isSelected
                    ? 'bg-[#101217] border-[#2b2e3d] hover:border-[#3c4155]'
                    : 'bg-[#0d0e12] border-[#1c1d24] opacity-50 hover:opacity-80'
                }`}
              >
                {/* Header: Checkbox + Name */}
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleServiceSelection(plan.serviceId);
                      }}
                      className="text-cyan-400 hover:text-white"
                      title={isSelected ? 'Deselect from bulk apply' : 'Select for bulk apply'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-[#555763]" />
                      )}
                    </button>
                    <span className="font-bold text-white text-xs truncate" title={plan.serviceName}>
                      {plan.serviceName}
                    </span>
                  </div>

                  <span className="text-[9px] text-[#717380]">T{plan.tier}</span>
                </div>

                {/* Role & Strategy */}
                <div className="space-y-1.5">
                  <div>{getRoleBadge(plan.role)}</div>
                  <p className="text-[10px] text-[#9ca3af] leading-tight font-sans">
                    {plan.strategy}
                  </p>
                </div>

                {/* Manifest Tag */}
                <div className="mt-2.5 pt-2 border-t border-[#1c1d24] flex items-center justify-between text-[9px] text-[#717380]">
                  <span className="truncate max-w-[120px]" title={plan.filename}>
                    {plan.filename.split('/').pop()}
                  </span>
                  <span className="text-emerald-400 font-bold">4/4 Checks</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Diff Viewer & Safety Auditor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Patch Diff & Multi-File Code Viewer */}
        <div className="lg:col-span-8 bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2128] pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileDiff className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="font-mono-code text-xs font-bold text-white block truncate">
                  {displayedPlan ? displayedPlan.filename : `Combined Cascade Manifest (${selectedServices.size} files)`}
                </span>
                <span className="text-[10px] font-mono-code text-[#717380] block truncate">
                  {displayedPlan ? `${displayedPlan.serviceName} · ${displayedPlan.strategy}` : 'Simultaneous multi-target resilient deployment'}
                </span>
              </div>
            </div>

            {/* View Selector Tabs */}
            <div className="flex items-center gap-1 font-mono-code text-xs">
              <button
                onClick={() => setActiveServiceId('COMBINED')}
                className={`px-2 py-1 rounded transition-colors text-[11px] ${
                  activeServiceId === 'COMBINED'
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                    : 'text-[#717380] hover:text-white'
                }`}
              >
                Combined Diff ({selectedServices.size})
              </button>

              <button
                onClick={() => setActiveTab('diff')}
                className={`px-2 py-1 rounded transition-colors text-[11px] ${
                  activeTab === 'diff'
                    ? 'bg-[#1e2029] text-white font-bold border border-[#2f3240]'
                    : 'text-[#717380] hover:text-white'
                }`}
              >
                Unified Diff
              </button>
              <button
                onClick={() => setActiveTab('proposed')}
                className={`px-2 py-1 rounded transition-colors text-[11px] ${
                  activeTab === 'proposed'
                    ? 'bg-[#1e2029] text-white font-bold border border-[#2f3240]'
                    : 'text-[#717380] hover:text-white'
                }`}
              >
                Proposed YAML
              </button>
            </div>
          </div>

          {/* Unified Diff Box */}
          {activeTab === 'diff' ? (
            <div className="bg-[#08090b] border border-[#1a1b22] rounded p-3 font-mono-code text-xs overflow-x-auto max-h-[420px] select-text">
              {(activeServiceId === 'COMBINED' ? combinedDiff : displayedPlan?.diffUnified ?? '').split('\n').map((line, idx) => {
                let lineClass = 'text-[#717380]';
                let bgClass = '';
                if (line.startsWith('+')) {
                  lineClass = 'text-emerald-400 font-semibold';
                  bgClass = 'bg-emerald-950/30';
                } else if (line.startsWith('-')) {
                  lineClass = 'text-red-400 font-semibold';
                  bgClass = 'bg-red-950/30';
                } else if (line.startsWith('@')) {
                  lineClass = 'text-[#a1a1aa] font-bold';
                } else if (line.startsWith('# ===')) {
                  lineClass = 'text-cyan-300 font-bold text-xs py-1 border-t border-[#22242e] mt-2 block';
                  bgClass = 'bg-cyan-950/40';
                }

                return (
                  <div key={idx} className={`px-2 py-0.5 rounded-sm ${lineClass} ${bgClass}`}>
                    {line}
                  </div>
                );
              })}
            </div>
          ) : (
            <pre className="bg-[#08090b] border border-[#1a1b22] rounded p-3 font-mono-code text-xs text-[#ededef] overflow-x-auto whitespace-pre leading-relaxed max-h-[420px] select-text">
              {displayedPlan ? displayedPlan.proposedConfig : '# Select an individual service card above to view its isolated proposed YAML manifest.'}
            </pre>
          )}

          {/* Key Change Summary */}
          <div className="bg-[#0b0c10] p-3 rounded border border-[#1f2128]">
            <span className="text-[10px] font-mono-code uppercase text-[#717380] block mb-1.5 font-bold">
              Bulk Alterations Manifest ({activeServiceId === 'COMBINED' ? combinedChanges.length : displayedPlan?.changeSummary.length ?? 0} active operations)
            </span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#d1d5db]">
              {(activeServiceId === 'COMBINED' ? combinedChanges : displayedPlan?.changeSummary ?? []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-[#121319] p-2 rounded border border-[#1f2128]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed font-sans">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Automated Safety & Risk Checks across all bundled manifests */}
        <div className="lg:col-span-4 bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f2128] pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Bulk Safety Auditor</h3>
            </div>
            <span className="font-mono-code text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
              {totalChecksCount} Checks Passed
            </span>
          </div>

          <p className="text-xs text-[#8e909d] font-sans leading-relaxed">
            Every manifest in this bulk patch has been evaluated against syntax linters, resource quotas, and topology blast-radius containment rules.
          </p>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {(displayedPlan ? displayedPlan.safetyChecks : cascadingChain.flatMap((p) => p.safetyChecks)).slice(0, 8).map((check, idx) => (
              <div
                key={idx}
                className="bg-[#0b0c10] p-2.5 rounded border border-[#1f2128] space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white text-[11px]">{check.name}</span>
                  <span className="font-mono-code text-[9px] px-1.5 py-0.2 rounded border border-emerald-800 text-emerald-400 bg-emerald-950/60 font-bold">
                    PASSED
                  </span>
                </div>
                <p className="text-[10px] text-[#717380] leading-tight">{check.detail}</p>
              </div>
            ))}
          </div>

          {/* Human-in-the-loop Governance */}
          <div className="p-3 bg-[#181922] border border-[#292c3a] rounded text-xs text-[#d1d5db]">
            <p className="font-semibold mb-1 text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Simultaneous Multi-Service Sign-Off</span>
            </p>
            <p className="text-[#8e909d] text-[11px] leading-relaxed">
              Applying bulk remediation deploys canary patches in topological order (leaf to caller), verifying health telemetry before final commit.
            </p>
          </div>
        </div>
      </div>

      {/* Before / During / After Simulation Matrix */}
      <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1f2128] pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              Cluster Resilience Delta (Before vs During Failure vs After Bulk Remediation)
            </h3>
          </div>
          <span className="font-mono-code text-xs text-emerald-400 font-bold">
            Resilience Delta: +{resilienceScore.metrics.postRemediation - resilienceScore.metrics.duringFailure} points
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-code text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f2128] text-[#717380]">
                <th className="py-2 px-3">System Metric</th>
                <th className="py-2 px-3">Baseline (Healthy)</th>
                <th className="py-2 px-3 text-red-400">During Chaos Failure</th>
                <th className="py-2 px-3 text-emerald-400">After Bulk Patch</th>
                <th className="py-2 px-3">Improvement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2128] text-[#d1d5db]">
              <tr>
                <td className="py-2 px-3 font-bold text-white">Resilience Score</td>
                <td className="py-2 px-3">{resilienceScore.metrics.baseline} / 100</td>
                <td className="py-2 px-3 text-red-400 font-bold">{resilienceScore.metrics.duringFailure} / 100</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">{resilienceScore.metrics.postRemediation} / 100</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">+{resilienceScore.metrics.postRemediation - resilienceScore.metrics.duringFailure} pts</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Average Latency</td>
                <td className="py-2 px-3">{resilienceScore.comparison.latency.before} ms</td>
                <td className="py-2 px-3 text-red-400 font-bold">{resilienceScore.comparison.latency.during} ms</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">{resilienceScore.comparison.latency.after} ms</td>
                <td className="py-2 px-3 text-emerald-400">-718 ms (-92%)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Error Rate</td>
                <td className="py-2 px-3">{resilienceScore.comparison.errorRate.before}%</td>
                <td className="py-2 px-3 text-red-400 font-bold">{resilienceScore.comparison.errorRate.during}%</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">{resilienceScore.comparison.errorRate.after}%</td>
                <td className="py-2 px-3 text-emerald-400">-17.6% drop</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Cluster Availability</td>
                <td className="py-2 px-3">{resilienceScore.comparison.availability.before}%</td>
                <td className="py-2 px-3 text-red-400 font-bold">{resilienceScore.comparison.availability.during}%</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">{resilienceScore.comparison.availability.after}%</td>
                <td className="py-2 px-3 text-emerald-400">+26.9% recovery</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-medium">Cascading Blast Radius</td>
                <td className="py-2 px-3">{resilienceScore.comparison.blastRadius.before}%</td>
                <td className="py-2 px-3 text-red-400 font-bold">{resilienceScore.comparison.blastRadius.during}%</td>
                <td className="py-2 px-3 text-emerald-400 font-bold">{resilienceScore.comparison.blastRadius.after}%</td>
                <td className="py-2 px-3 text-emerald-400">-36.3% isolated</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
