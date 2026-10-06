# CHAOSBRAIN AI --- Hello my name is the BOSS
## Graph-Driven Continuous Resilience Simulator & Auto-Remediation Patch Generator

ChaosBrain AI is a cloud-native resilience-testing and automated incident-response platform for distributed microservices. It models infrastructure as a **directed service dependency graph**, simulates controlled failures inside that graph, observes cascading failure propagation and real-time telemetry, determines the probable root cause using graph algorithms and temporal precedence, and generates validated configuration patches to restore system resilience.

---

## 1. Core End-to-End Pipeline

```text
Infrastructure / Service Configuration
            ↓
Dependency Graph Construction (NetworkX Directed Graph)
            ↓
System Health Baseline (Metrics Calibration)
            ↓
Chaos Scenario Generation (High Latency, Service Failure, Error Spike)
            ↓
Controlled Failure Simulation (Tick-by-Tick Failure Propagation)
            ↓
Telemetry Collection (Latency, Error Rate, CPU, RPS)
            ↓
Incident Detection (Statistical Anomaly Scoring + Multi-Threshold Breach)
            ↓
Graph-Based Blast Radius Analysis (Downstream Reachability & Criticality)
            ↓
Root Cause Analysis (Deterministic Temporal Precedence + Causal Path)
            ↓
AI-Assisted Remediation (Envoy Circuit Breaker, Timeout, Replica Scaling)
            ↓
Patch / Configuration Recommendation (Unified Git Diff)
            ↓
Multi-Stage Validation (Syntax, Timeout Bounds, Storm Check)
            ↓
Resilience Score & Report (+44 points Benchmark)
```

---

## 2. Key Capabilities & Engineering Architecture

1. **Service Dependency Graph Engine**:
   - Directed acyclic/cyclic graph with forward/reverse adjacency lists.
   - Algorithms: BFS, DFS, shortest path, degree centrality, downstream cascading reachability.
   - **Blast Radius Formula**:
     $$\text{Blast Radius} = \frac{\sum_{s \in \text{Affected}} \text{Criticality}(s)}{\sum_{s \in \text{Total}} \text{Criticality}(s)} \times 100\%$$

2. **Controlled Chaos Simulation Engine**:
   - Failure Modes: `HIGH_LATENCY`, `SERVICE_FAILURE`, `ERROR_SPIKE`, `CPU_STRESS`, `MEMORY_PRESSURE`, `DATABASE_FAILURE`.
   - Physics-based cascading failure propagation: Upstream callers experience thread pool exhaustion and timeout breaches unless decoupled by circuit breakers.
   - Real-time tick engine generating high-frequency telemetry.

3. **Multi-Metric Incident & Anomaly Detection**:
   - Rule-based dynamic thresholding (Latency > 300ms, Error rate > 5%, Availability < 95%).
   - Statistical multivariate Z-score anomaly model.
   - Severity classification: `P1_CRITICAL`, `P2_HIGH`, `P3_MEDIUM`, `P4_LOW`.

4. **Hybrid Root Cause Analysis (RCA) Engine**:
   - Deterministic graph back-tracing & temporal precedence correlation.
   - Explains evidence with concrete metrics and exact timing.
   - Outputs confidence score (e.g. 88%) and ranked suspects.

5. **Auto-Remediation & Patch Generator**:
   - Generates production-ready Istio/Envoy/Kubernetes configuration patches.
   - Unified Git Diff viewer (`--- a/config.yaml`, `+++ b/config.yaml`).
   - 4-Stage Safety Auditor: Syntax, Bounded Timeout, Retry Storm Prevention, Cluster Quota.
   - Human-in-the-loop approval and simulated verification.

6. **Explainable 5-Factor Resilience Index**:
   $$\text{Resilience Score} = 0.30 \times \text{Availability} + 0.25 \times \text{Isolation} + 0.20 \times \text{Recovery} + 0.15 \times \text{Error} + 0.10 \times \text{Latency}$$
   - Benchmarking comparison: **Baseline (86)** $\rightarrow$ **During Failure (49)** $\rightarrow$ **Post-Remediation (93)**.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, SVG Interactive Graph Canvas, Lucide Icons, Motion.
- **Backend Architecture**: FastAPI, NetworkX, Pydantic, SQLAlchemy, PostgreSQL 16.
- **Observability**: Real-Time SVG Time-Series Telemetry Charts (Latency, Error Rate, CPU, Throughput).
- **Security & RBAC**: ADMIN, ENGINEER, VIEWER roles, immutable audit trail.
- **Testing**: Built-in Automated Verification Test Suite executing live in-browser.

---

## 4. Quick Start & Demonstration

1. Click **Demo Scenario** in the header to run the full 12-step resilience lifecycle automatically.
2. Watch the **Interactive Service Dependency Graph** as `payment-service` experiences latency injection and failure propagates upward to `order-service`, `api-gateway`, and `frontend`.
3. Review the **Incident Queue** and click **Run RCA Analysis** to inspect the evidence and causal path.
4. Click **Generate Auto-Remediation** to inspect the Envoy Circuit Breaker unified patch.
5. Click **Simulate & Apply Patch** to verify the cluster recovery and see the resilience score jump to 93 (+44 points).
6. Click **Print / PDF** or **Download Markdown** to generate the executive incident report.
7. Click **Run Tests** in the navigation to verify all 8 automated test suites live!
