import { ServiceNode, Incident, IncidentSeverity } from '../types';

export class AnomalyEngine {
  /**
   * Scans all services for anomalies and creates or updates incidents.
   */
  public detectAnomalies(
    services: ServiceNode[],
    experimentId?: string
  ): {
    anomalousServices: Array<{ service: ServiceNode; score: number; trigger: string }>;
    incident: Incident | null;
  } {
    const anomalousServices: Array<{ service: ServiceNode; score: number; trigger: string }> = [];

    for (const svc of services) {
      const cur = svc.currentMetrics;
      const base = svc.baselineMetrics;

      // 1. Rule-based threshold check
      let trigger = '';
      if (svc.health === 'FAILED') {
        trigger = `Complete service failure: availability dropped to ${cur.availability}%`;
      } else if (cur.errorRate > 15) {
        trigger = `High error rate spike: ${cur.errorRate}% (baseline: ${base.errorRate}%)`;
      } else if (cur.latency > Math.max(300, base.latency * 2.5)) {
        trigger = `Excessive latency degradation: ${cur.latency}ms (baseline: ${base.latency}ms)`;
      } else if (cur.cpu > 90) {
        trigger = `Severe CPU starvation: ${cur.cpu}% utilization`;
      }

      // 2. Statistical anomaly score
      const zLatency = Math.max(0, (cur.latency - base.latency) / Math.max(10, base.latency * 0.2));
      const zError = Math.max(0, (cur.errorRate - base.errorRate) / Math.max(0.2, 0.5));
      const zCpu = Math.max(0, (cur.cpu - base.cpu) / 12);

      const rawScore = 0.45 * Math.min(10, zLatency) + 0.35 * Math.min(10, zError) + 0.20 * Math.min(10, zCpu);
      const normalizedScore = Math.min(1.0, Math.round((rawScore / 8) * 100) / 100);

      if (trigger || normalizedScore > 0.6) {
        anomalousServices.push({
          service: svc,
          score: normalizedScore,
          trigger: trigger || `Multi-metric anomaly detected (score: ${normalizedScore})`,
        });
      }
    }

    if (anomalousServices.length === 0) {
      return { anomalousServices: [], incident: null };
    }

    // Sort by highest anomaly score / criticality
    anomalousServices.sort((a, b) => b.score * b.service.criticality - a.score * a.service.criticality);
    const primaryAnomalous = anomalousServices[0];

    // Determine severity
    let severity: IncidentSeverity = 'P3_MEDIUM';
    if (primaryAnomalous.service.tier === 1 && (primaryAnomalous.score > 0.8 || primaryAnomalous.service.health === 'FAILED')) {
      severity = 'P1_CRITICAL';
    } else if (primaryAnomalous.score > 0.65 || primaryAnomalous.service.tier === 1) {
      severity = 'P2_HIGH';
    }

    const incidentId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const incident: Incident = {
      id: incidentId,
      title: `Cascading Service Anomaly: ${primaryAnomalous.service.name}`,
      severity,
      affectedServiceId: primaryAnomalous.service.id,
      detectedAt: new Date().toISOString(),
      status: 'DETECTED',
      triggerMetric: primaryAnomalous.trigger,
      blastRadius: 0,
      cascadingServices: anomalousServices.map((a) => a.service.id),
      experimentId,
    };

    return { anomalousServices, incident };
  }
}
