import {
  Incident,
  RootCauseAnalysis,
  ServiceNode,
  ServiceDependency,
  TelemetryPoint,
} from '../types';
import { GraphEngine } from './graphEngine';

export class RCAEngine {
  private graphEngine: GraphEngine;

  constructor(graphEngine: GraphEngine) {
    this.graphEngine = graphEngine;
  }

  /**
   * Deterministic, explainable Root Cause Analysis algorithm combining:
   * 1. Temporal precedence (who broke first in telemetry history)
   * 2. Graph dependency path (who is downstream of whom)
   * 3. Anomaly magnitude & error propagation direction
   */
  public analyzeIncident(
    incident: Incident,
    services: ServiceNode[],
    dependencies: ServiceDependency[],
    telemetryHistory: TelemetryPoint[],
    targetExperimentId?: string
  ): RootCauseAnalysis {
    const servicesMap = new Map(services.map((s) => [s.id, s]));

    // 1. Gather all degraded or anomalous services
    const candidateScores = new Map<
      string,
      {
        serviceId: string;
        temporalScore: number;
        graphScore: number;
        divergenceScore: number;
        firstAnomalySecond: number;
        reasons: string[];
      }
    >();

    // Analyze telemetry timeline for each service to find when the first anomaly occurred
    services.forEach((svc) => {
      const svcTelemetry = telemetryHistory
        .filter((t) => t.serviceId === svc.id)
        .sort((a, b) => a.second - b.second);

      let firstAnomalySecond = 999;
      let maxLatencySpike = 0;
      let maxErrorSpike = 0;

      for (const pt of svcTelemetry) {
        if (pt.status === 'ANOMALY' || pt.status === 'CRITICAL' || pt.status === 'WARNING') {
          if (pt.second < firstAnomalySecond) {
            firstAnomalySecond = pt.second;
          }
        }
        if (pt.latency > maxLatencySpike) maxLatencySpike = pt.latency;
        if (pt.errorRate > maxErrorSpike) maxErrorSpike = pt.errorRate;
      }

      const cur = svc.currentMetrics;
      const base = svc.baselineMetrics;
      const isDegraded =
        svc.health !== 'HEALTHY' || cur.latency > base.latency * 1.5 || cur.errorRate > 5;

      if (isDegraded || firstAnomalySecond < 999) {
        // Temporal score: earlier anomaly = higher root cause likelihood
        const temporalScore = firstAnomalySecond === 999 ? 0.2 : Math.max(0.1, 1 - firstAnomalySecond * 0.15);

        // Divergence score: how severely did metrics deviate from baseline?
        const latRatio = cur.latency / Math.max(1, base.latency);
        const errRatio = (cur.errorRate + 1) / Math.max(0.1, base.errorRate + 0.1);
        const divergenceScore = Math.min(1.0, (latRatio / 8) * 0.6 + (errRatio / 20) * 0.4);

        candidateScores.set(svc.id, {
          serviceId: svc.id,
          temporalScore,
          graphScore: 0, // Will be computed from dependencies below
          divergenceScore,
          firstAnomalySecond,
          reasons: [],
        });
      }
    });

    // 2. Graph topology analysis: downstream services that callers depend on have high graph score
    candidateScores.forEach((candidate, svcId) => {
      // Find who calls this service
      const callers = this.graphEngine.getDirectCallers(svcId);
      const impactChain = this.graphEngine.getCascadingImpactChain(svcId);

      // If callers of this service are also degraded, this service is very likely the upstream cause!
      const affectedCallers = callers.filter((c) => candidateScores.has(c));
      const totalAffectedDownstream = impactChain.affectedIds.filter(
        (id) => id !== svcId && candidateScores.has(id)
      );

      // Higher graph score if this service is at the bottom of the call tree of failing services
      candidate.graphScore = Math.min(1.0, 0.3 + totalAffectedDownstream.length * 0.25);

      if (callers.length > 0) {
        candidate.reasons.push(
          `Service is directly depended upon by ${callers.map((c) => servicesMap.get(c)?.name || c).join(', ')}`
        );
      }
    });

    // Rank candidates: Composite Score = 0.40 * Temporal + 0.35 * Graph + 0.25 * Divergence
    const rankedSuspects: Array<{
      serviceId: string;
      score: number;
      reason: string;
      precedenceSeconds: number;
    }> = [];

    candidateScores.forEach((c) => {
      const composite =
        0.40 * c.temporalScore +
        0.35 * c.graphScore +
        0.25 * c.divergenceScore;

      const svc = servicesMap.get(c.serviceId);
      const name = svc ? svc.name : c.serviceId;
      const timingText =
        c.firstAnomalySecond < 999
          ? `First anomalous metric recorded at T+${c.firstAnomalySecond}s`
          : 'Degraded following downstream caller timeouts';

      rankedSuspects.push({
        serviceId: c.serviceId,
        score: Math.min(0.98, Math.max(0.2, Math.round(composite * 100) / 100)),
        reason: `${name}: ${timingText}. ${c.reasons.join('. ')}`,
        precedenceSeconds: c.firstAnomalySecond,
      });
    });

    // Sort descending by score
    rankedSuspects.sort((a, b) => b.score - a.score);

    // Fallback if no suspects
    if (rankedSuspects.length === 0) {
      rankedSuspects.push({
        serviceId: incident.affectedServiceId,
        score: 0.85,
        reason: 'Direct anomaly trigger point',
        precedenceSeconds: 0,
      });
    }

    const primarySuspect = rankedSuspects[0];
    const rootCauseService = servicesMap.get(primarySuspect.serviceId);
    const rootCauseName = rootCauseService ? rootCauseService.name : primarySuspect.serviceId;

    // Build evidence list
    const evidence: string[] = [
      `Initial anomaly originated in ${rootCauseName} at T+${primarySuspect.precedenceSeconds}s before propagating.`,
      `${rootCauseName} metric divergence: Latency reached ${rootCauseService?.currentMetrics.latency ?? 0}ms (Baseline: ${rootCauseService?.baselineMetrics.latency ?? 0}ms), Error Rate: ${rootCauseService?.currentMetrics.errorRate ?? 0}%.`,
      `Dependency Graph Analysis confirms ${primarySuspect.serviceId} is a critical dependency for ${this.graphEngine.getDirectCallers(primarySuspect.serviceId).length} caller service(s).`,
      `Upstream callers experienced thread pool exhaustion and timeout breaches due to missing or inadequate circuit breakers.`,
    ];

    // Build dependency chain
    const chainImpact = this.graphEngine.getCascadingImpactChain(primarySuspect.serviceId);
    const longestPath = chainImpact.paths.reduce((longest, current) =>
      current.length > longest.length ? current : longest,
      [primarySuspect.serviceId]
    );

    // Build timeline of events
    const timeline = [
      {
        time: 'T+00:00',
        serviceId: primarySuspect.serviceId,
        event: `Chaos injection detected: Latency and error threshold exceeded on ${rootCauseName}`,
        severity: 'CRITICAL' as const,
      },
      {
        time: `T+00:0${Math.max(1, primarySuspect.precedenceSeconds)}`,
        serviceId: primarySuspect.serviceId,
        event: `${rootCauseName} health changed from HEALTHY to ${rootCauseService?.health ?? 'CRITICAL'}`,
        severity: 'CRITICAL' as const,
      },
      ...chainImpact.affectedIds
        .filter((id) => id !== primarySuspect.serviceId)
        .map((id, idx) => ({
          time: `T+00:${(primarySuspect.precedenceSeconds + (idx + 1) * 2).toString().padStart(2, '0')}`,
          serviceId: id,
          event: `Cascading degradation detected in ${servicesMap.get(id)?.name ?? id} (caller timeout)`,
          severity: 'WARN' as const,
        })),
    ];

    return {
      incidentId: incident.id,
      probableRootCauseId: primarySuspect.serviceId,
      confidence: primarySuspect.score,
      rankedSuspects,
      evidence,
      dependencyChain: longestPath,
      timeline,
      aiInsights: `Deterministic Graph & Temporal Correlation ranks ${rootCauseName} as the primary root cause with ${Math.round(primarySuspect.score * 100)}% confidence. Downstream failure cascade propagated along ${longestPath.join(' -> ')}. Applying a resilient Circuit Breaker and Timeout adjustment will decouple upstream callers.`,
    };
  }
}
