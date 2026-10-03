export type UserRole = 'ADMIN' | 'ENGINEER' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  token?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  servicesCount: number;
  environment: 'production-sim' | 'staging-sim';
  resilienceTarget: number;
}

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILED' | 'RECOVERING';
export type ServiceType = 'gateway' | 'microservice' | 'database' | 'cache' | 'frontend' | 'queue';

export interface ServiceMetrics {
  cpu: number;         // percentage (0 - 100)
  memory: number;      // percentage (0 - 100)
  latency: number;     // ms (e.g. 45 - 2500)
  errorRate: number;   // percentage (0 - 100)
  rps: number;         // requests per second
  availability: number;// percentage (0 - 100)
}

export interface ServiceConfig {
  timeoutMs: number;
  retries: number;
  circuitBreakerEnabled: boolean;
  circuitBreakerThreshold?: number; // error rate % to trip
  replicas: number;
  cpuLimit: string;
  memoryLimit: string;
  fallbackCache: boolean;
}

export interface ServiceNode {
  id: string;
  name: string;
  type: ServiceType;
  tier: 1 | 2 | 3; // 1 = Mission Critical, 2 = Core Business, 3 = Auxiliary
  criticality: number; // 0.0 - 1.0 (weight for blast radius calculation)
  health: HealthStatus;
  healthScore: number; // 0 - 100
  baselineMetrics: ServiceMetrics;
  currentMetrics: ServiceMetrics;
  config: ServiceConfig;
  position: { x: number; y: number };
  description: string;
}

export interface ServiceDependency {
  id: string;
  source: string; // caller / upstream service
  target: string; // callee / downstream dependency
  protocol: 'gRPC' | 'HTTP/REST' | 'SQL';
  timeoutMs: number;
  isCritical: boolean;
  circuitBreaker: boolean;
  currentLatency: number;
  status: 'NORMAL' | 'DEGRADED' | 'CIRCUIT_OPEN' | 'FAILING';
}

export type ChaosFailureType =
  | 'HIGH_LATENCY'
  | 'SERVICE_FAILURE'
  | 'ERROR_SPIKE'
  | 'CPU_STRESS'
  | 'MEMORY_PRESSURE'
  | 'DATABASE_FAILURE'
  | 'NETWORK_DELAY';

export interface ChaosExperiment {
  id: string;
  name: string;
  targetServiceId: string;
  failureType: ChaosFailureType;
  intensity: number; // 1 - 100 %
  duration: number; // in seconds
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'ABORTED';
  startedAt?: string;
  elapsedSeconds: number;
  blastRadius: number; // 0 - 100 %
  affectedServiceIds: string[];
  propagationChain: string[][];
  incidentId?: string;
}

export interface TelemetryPoint {
  timestamp: string;
  second: number;
  serviceId: string;
  cpu: number;
  memory: number;
  latency: number;
  errorRate: number;
  rps: number;
  availability: number;
  anomalyScore: number;
  status: 'NORMAL' | 'WARNING' | 'ANOMALY' | 'CRITICAL';
}

export type IncidentSeverity = 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MEDIUM' | 'P4_LOW';
export type IncidentStatus =
  | 'DETECTED'
  | 'ANALYZING'
  | 'ROOT_CAUSE_IDENTIFIED'
  | 'REMEDIATION_PROPOSED'
  | 'VALIDATED'
  | 'RESOLVED';

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  affectedServiceId: string;
  detectedAt: string;
  status: IncidentStatus;
  triggerMetric: string;
  blastRadius: number;
  cascadingServices: string[];
  experimentId?: string;
}

export interface RootCauseAnalysis {
  incidentId: string;
  probableRootCauseId: string;
  confidence: number; // 0.0 - 1.0 (e.g. 0.88)
  rankedSuspects: Array<{
    serviceId: string;
    score: number;
    reason: string;
    precedenceSeconds: number;
  }>;
  evidence: string[];
  dependencyChain: string[];
  timeline: Array<{
    time: string;
    serviceId: string;
    event: string;
    severity: 'INFO' | 'WARN' | 'CRITICAL';
  }>;
  aiInsights?: string;
}

export type RemediationActionType =
  | 'INCREASE_TIMEOUT'
  | 'ENABLE_CIRCUIT_BREAKER'
  | 'ADD_RETRY_POLICY'
  | 'SCALE_REPLICAS'
  | 'ADD_FALLBACK_CACHE'
  | 'ADJUST_RESOURCE_LIMITS';

export interface GeneratedPatch {
  filename: string;
  fileType: 'yaml' | 'json';
  originalConfig: string;
  proposedConfig: string;
  diffUnified: string;
  changeSummary: string[];
}

export interface PatchValidation {
  syntaxValid: boolean;
  schemaValid: boolean;
  riskLevel: 'VALID' | 'NEEDS_REVIEW' | 'HIGH_RISK';
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  explanation: string;
}

export interface RemediationAction {
  id: string;
  incidentId: string;
  targetServiceId: string;
  actionType: RemediationActionType;
  title: string;
  description: string;
  reason: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedImpact: string;
  patch: GeneratedPatch;
  validation: PatchValidation;
  status: 'PENDING' | 'VALIDATED' | 'APPLIED' | 'REJECTED';
}

export interface ResilienceScore {
  overall: number; // 0 - 100
  breakdown: {
    availability: number;       // 30% weight
    failureIsolation: number;   // 25% weight
    recoveryCapability: number; // 20% weight
    errorTolerance: number;     // 15% weight
    latencyStability: number;   // 10% weight
  };
  metrics: {
    baseline: number;
    duringFailure: number;
    postRemediation: number;
  };
  comparison: {
    latency: { before: number; during: number; after: number };
    errorRate: { before: number; during: number; after: number };
    availability: { before: number; during: number; after: number };
    blastRadius: { before: number; during: number; after: number };
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  role: UserRole;
  action: string;
  resource: string;
  details: string;
}
