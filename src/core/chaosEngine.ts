import {
  ServiceNode,
  ServiceDependency,
  ChaosExperiment,
  TelemetryPoint,
  HealthStatus,
} from '../types';
import { GraphEngine } from './graphEngine';

export class ChaosEngine {
  private graphEngine: GraphEngine;

  constructor(graphEngine: GraphEngine) {
    this.graphEngine = graphEngine;
  }

  /**
   * Applies one simulation tick (e.g. 1 second interval) to the microservice cluster.
   * Calculates realistic physical telemetry changes and downstream-to-upstream failure propagation.
   */
  public simulateTick(
    currentServices: ServiceNode[],
    currentDeps: ServiceDependency[],
    experiment: ChaosExperiment | null,
    tickSecond: number,
    remediatedServices: Set<string> = new Set()
  ): {
    updatedServices: ServiceNode[];
    updatedDeps: ServiceDependency[];
    telemetryBatch: TelemetryPoint[];
    blastRadius: number;
    affectedServiceIds: string[];
  } {
    // If no active experiment or experiment is completed, return recovering / healthy state
    if (!experiment || experiment.status !== 'RUNNING') {
      const recoveredServices = currentServices.map((s) => {
        const base = s.baselineMetrics;
        // Smoothly decay back to baseline
        const cur = s.currentMetrics;
        const latency = Math.round(cur.latency + (base.latency - cur.latency) * 0.4);
        const errorRate = +(cur.errorRate + (base.errorRate - cur.errorRate) * 0.4).toFixed(2);
        const cpu = Math.round(cur.cpu + (base.cpu - cur.cpu) * 0.4);
        const memory = Math.round(cur.memory + (base.memory - cur.memory) * 0.4);
        const availability = +(cur.availability + (base.availability - cur.availability) * 0.4).toFixed(2);

        const health: HealthStatus =
          Math.abs(latency - base.latency) < 15 && errorRate < 0.5 ? 'HEALTHY' : 'RECOVERING';

        return {
          ...s,
          health,
          healthScore: health === 'HEALTHY' ? 98 : 88,
          currentMetrics: {
            latency,
            errorRate,
            cpu,
            memory,
            rps: base.rps,
            availability,
          },
        };
      });

      const recoveredDeps = currentDeps.map((d) => ({
        ...d,
        status: 'NORMAL' as const,
        currentLatency: d.timeoutMs > 200 ? 45 : 15,
      }));

      const telemetryBatch = recoveredServices.map((s) =>
        this.generateTelemetryPoint(s, tickSecond, 'NORMAL', 0.05)
      );

      return {
        updatedServices: recoveredServices,
        updatedDeps: recoveredDeps,
        telemetryBatch,
        blastRadius: 0,
        affectedServiceIds: [],
      };
    }

    // Active Experiment Running
    const { targetServiceId, failureType, intensity } = experiment;
    const impactChain = this.graphEngine.getCascadingImpactChain(targetServiceId);
    const affectedIds = impactChain.affectedIds;
    const blastRadiusInfo = this.graphEngine.calculateBlastRadius(targetServiceId);

    // Compute updated services
    const updatedServices = currentServices.map((service) => {
      const isTarget = service.id === targetServiceId;
      const isRemediated = remediatedServices.has(service.id);
      const isAffectedCaller = affectedIds.includes(service.id) && !isTarget;
      const base = service.baselineMetrics;

      // Find depth in cascade
      let depth = 0;
      for (const [d, nodes] of Object.entries(impactChain.levels)) {
        if (nodes.includes(service.id)) {
          depth = Number(d);
          break;
        }
      }

      // CASE 1: Primary Target of Chaos
      if (isTarget) {
        if (isRemediated) {
          // If remediated (e.g. replicas scaled, circuit breaker, timeout adjusted),
          // impact is significantly dampened!
          const dampFactor = 0.25;
          const latency = Math.round(base.latency + (intensity * 2.2 * dampFactor));
          const errorRate = +(base.errorRate + (intensity * 0.08 * dampFactor)).toFixed(2);
          const cpu = Math.min(88, Math.round(base.cpu + (intensity * 0.3 * dampFactor)));
          const memory = Math.min(85, Math.round(base.memory + (intensity * 0.2 * dampFactor)));
          const availability = +(99.5 - errorRate * 0.5).toFixed(2);

          return {
            ...service,
            health: 'DEGRADED' as HealthStatus,
            healthScore: 78,
            currentMetrics: {
              latency,
              errorRate,
              cpu,
              memory,
              rps: base.rps,
              availability,
            },
          };
        }

        // Unremediated Target Service
        let latency = base.latency;
        let errorRate = base.errorRate;
        let cpu = base.cpu;
        let memory = base.memory;
        let availability = base.availability;
        let health: HealthStatus = 'DEGRADED';
        let healthScore = 50;

        switch (failureType) {
          case 'HIGH_LATENCY':
            latency = Math.round(base.latency + intensity * 8.2); // e.g. 110 + 80*8.2 = 766ms
            errorRate = +(base.errorRate + intensity * 0.18).toFixed(2); // e.g. 14.5%
            cpu = Math.min(94, Math.round(base.cpu + intensity * 0.55));
            memory = Math.min(88, Math.round(base.memory + intensity * 0.35));
            availability = +(100 - errorRate * 1.5).toFixed(2);
            health = intensity > 70 ? 'CRITICAL' : 'DEGRADED';
            healthScore = Math.max(15, 100 - Math.round(intensity * 0.85));
            break;

          case 'SERVICE_FAILURE':
            latency = service.config.timeoutMs;
            errorRate = Math.min(100, +(intensity * 1.1).toFixed(2));
            cpu = 99;
            memory = 95;
            availability = +(Math.max(0, 100 - intensity)).toFixed(2);
            health = 'FAILED';
            healthScore = 5;
            break;

          case 'ERROR_SPIKE':
            errorRate = Math.min(100, +(base.errorRate + intensity * 0.85).toFixed(2));
            latency = Math.round(base.latency * (1 + intensity * 0.02));
            cpu = Math.min(95, Math.round(base.cpu + intensity * 0.6));
            availability = +(Math.max(5, 100 - errorRate)).toFixed(2);
            health = 'CRITICAL';
            healthScore = Math.max(20, 100 - Math.round(intensity * 0.8));
            break;

          case 'CPU_STRESS':
            cpu = Math.min(99, Math.round(base.cpu + intensity * 0.8));
            memory = Math.min(92, Math.round(base.memory + intensity * 0.4));
            latency = Math.round(base.latency * (1 + intensity * 0.035));
            errorRate = +(base.errorRate + intensity * 0.12).toFixed(2);
            availability = +(100 - errorRate * 1.2).toFixed(2);
            health = cpu > 90 ? 'CRITICAL' : 'DEGRADED';
            healthScore = 100 - Math.round(cpu * 0.8);
            break;

          case 'DATABASE_FAILURE':
          case 'MEMORY_PRESSURE':
          case 'NETWORK_DELAY':
          default:
            latency = Math.round(base.latency + intensity * 7.5);
            errorRate = +(base.errorRate + intensity * 0.25).toFixed(2);
            cpu = Math.min(98, Math.round(base.cpu + intensity * 0.7));
            memory = Math.min(98, Math.round(base.memory + intensity * 0.75));
            availability = +(100 - errorRate * 1.4).toFixed(2);
            health = 'CRITICAL';
            healthScore = 25;
            break;
        }

        return {
          ...service,
          health,
          healthScore,
          currentMetrics: {
            latency,
            errorRate,
            cpu,
            memory,
            rps: Math.round(base.rps * (1 - intensity * 0.005)),
            availability: Math.max(0, availability),
          },
        };
      }

      // CASE 2: Upstream Caller Affected by Cascading Failure
      if (isAffectedCaller) {
        // If the caller has a circuit breaker enabled or was remediated
        const hasCircuitBreaker = service.config.circuitBreakerEnabled || isRemediated;

        if (hasCircuitBreaker) {
          // Circuit breaker trips, caller fails fast without thread starvation!
          const latency = Math.round(base.latency * 1.15); // Fast fallback
          const errorRate = +(base.errorRate + 2.5).toFixed(2);
          const cpu = Math.min(75, Math.round(base.cpu * 1.1));
          const memory = base.memory;
          const availability = 97.5;

          return {
            ...service,
            health: 'DEGRADED' as HealthStatus,
            healthScore: 82,
            currentMetrics: {
              latency,
              errorRate,
              cpu,
              memory,
              rps: base.rps,
              availability,
            },
          };
        }

        // Without circuit breaker: cascading thread exhaustion & timeout waiting
        // Degradation attenuates slightly with depth: depth 1 gets 80% impact, depth 2 gets 55%
        const cascadeRatio = Math.max(0.3, 1 - depth * 0.25);
        const latency = Math.round(base.latency + intensity * 4.8 * cascadeRatio);
        const errorRate = +(base.errorRate + intensity * 0.16 * cascadeRatio).toFixed(2);
        const cpu = Math.min(95, Math.round(base.cpu + intensity * 0.45 * cascadeRatio));
        const memory = Math.min(90, Math.round(base.memory + intensity * 0.3 * cascadeRatio));
        const availability = +(Math.max(50, 100 - errorRate * 1.8)).toFixed(2);

        const health: HealthStatus = errorRate > 20 || latency > 400 ? 'CRITICAL' : 'DEGRADED';
        const healthScore = Math.max(30, 100 - Math.round((errorRate * 2) + (latency / 15)));

        return {
          ...service,
          health,
          healthScore,
          currentMetrics: {
            latency,
            errorRate,
            cpu,
            memory,
            rps: Math.round(base.rps * 0.85),
            availability,
          },
        };
      }

      // CASE 3: Unaffected Services (e.g. Auth Service or Inventory Service when Payment fails)
      // Normal jitter (+/- 2%)
      const jitter = (Math.random() - 0.5) * 4;
      return {
        ...service,
        health: 'HEALTHY' as HealthStatus,
        healthScore: 98,
        currentMetrics: {
          ...service.currentMetrics,
          latency: Math.max(5, Math.round(base.latency + jitter)),
          cpu: Math.max(10, Math.round(base.cpu + jitter * 0.5)),
        },
      };
    });

    // Update dependency statuses
    const updatedDeps = currentDeps.map((dep) => {
      const sourceSvc = updatedServices.find((s) => s.id === dep.source);
      const targetSvc = updatedServices.find((s) => s.id === dep.target);

      if (!sourceSvc || !targetSvc) return dep;

      if (targetSvc.health === 'FAILED') {
        return {
          ...dep,
          status: dep.circuitBreaker ? ('CIRCUIT_OPEN' as const) : ('FAILING' as const),
          currentLatency: dep.timeoutMs,
        };
      }

      if (targetSvc.health === 'CRITICAL' || targetSvc.health === 'DEGRADED') {
        return {
          ...dep,
          status: 'DEGRADED' as const,
          currentLatency: targetSvc.currentMetrics.latency,
        };
      }

      return {
        ...dep,
        status: 'NORMAL' as const,
        currentLatency: targetSvc.baselineMetrics.latency,
      };
    });

    // Generate telemetry points for each service
    const telemetryBatch = updatedServices.map((svc) => {
      let status: 'NORMAL' | 'WARNING' | 'ANOMALY' | 'CRITICAL' = 'NORMAL';
      let anomalyScore = 0.05;

      if (svc.health === 'FAILED' || svc.currentMetrics.errorRate > 25) {
        status = 'CRITICAL';
        anomalyScore = 0.95;
      } else if (svc.health === 'CRITICAL' || svc.currentMetrics.latency > 350) {
        status = 'ANOMALY';
        anomalyScore = 0.82;
      } else if (svc.health === 'DEGRADED' || svc.currentMetrics.latency > 150) {
        status = 'WARNING';
        anomalyScore = 0.55;
      }

      return this.generateTelemetryPoint(svc, tickSecond, status, anomalyScore);
    });

    return {
      updatedServices,
      updatedDeps,
      telemetryBatch,
      blastRadius: blastRadiusInfo.percentage,
      affectedServiceIds: affectedIds,
    };
  }

  private generateTelemetryPoint(
    service: ServiceNode,
    second: number,
    status: 'NORMAL' | 'WARNING' | 'ANOMALY' | 'CRITICAL',
    anomalyScore: number
  ): TelemetryPoint {
    const cur = service.currentMetrics;
    const now = new Date();
    now.setSeconds(now.getSeconds() + second);

    return {
      timestamp: now.toISOString(),
      second,
      serviceId: service.id,
      cpu: cur.cpu,
      memory: cur.memory,
      latency: cur.latency,
      errorRate: cur.errorRate,
      rps: cur.rps,
      availability: cur.availability,
      anomalyScore,
      status,
    };
  }
}
