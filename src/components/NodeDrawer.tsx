import React, { useState } from 'react';
import {
  ServiceNode,
  ServiceDependency,
} from '../types';
import {
  X,
  Activity,
  Layers,
  Flame,
  Code2,
  Sliders,
} from 'lucide-react';

interface NodeDrawerProps {
  service: ServiceNode | null;
  onClose: () => void;
  dependencies: ServiceDependency[];
  allServices: ServiceNode[];
  onInjectChaos: (serviceId: string) => void;
  isRemediated: boolean;
  onToggleCircuitBreaker: (serviceId: string) => void;
}

export const NodeDrawer: React.FC<NodeDrawerProps> = ({
  service,
  onClose,
  dependencies,
  allServices,
  onInjectChaos,
  isRemediated,
  onToggleCircuitBreaker,
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'dependencies' | 'config' | 'yaml'>('metrics');

  if (!service) return null;

  const servicesMap = new Map(allServices.map((s) => [s.id, s]));

  const callers = dependencies
    .filter((d) => d.target === service.id)
    .map((d) => ({
      service: servicesMap.get(d.source),
      dep: d,
    }))
    .filter((c) => c.service !== undefined);

  const downstream = dependencies
    .filter((d) => d.source === service.id)
    .map((d) => ({
      service: servicesMap.get(d.target),
      dep: d,
    }))
    .filter((d) => d.service !== undefined);

  const cur = service.currentMetrics;
  const base = service.baselineMetrics;

  const yamlSpec = `# Kubernetes Deployment Spec & Resilience Profile
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${service.id}
  namespace: microservices-prod
  labels:
    app.kubernetes.io/name: ${service.id}
    resilience.chaosbrain.ai/tier: "${service.tier}"
spec:
  replicas: ${service.config.replicas}
  template:
    spec:
      containers:
      - name: ${service.id}
        image: registry.chaosbrain.internal/${service.id}:v2.4.1
        resources:
          limits:
            cpu: "${service.config.cpuLimit}"
            memory: "${service.config.memoryLimit}"
        env:
        - name: HTTP_TIMEOUT_MS
          value: "${service.config.timeoutMs}"
        - name: MAX_RETRIES
          value: "${service.config.retries}"
        - name: CIRCUIT_BREAKER_ENABLED
          value: "${service.config.circuitBreakerEnabled || isRemediated ? 'true' : 'false'}"
        - name: FALLBACK_CACHE_ENABLED
          value: "${service.config.fallbackCache ? 'true' : 'false'}"`;

  return (
    <div className="fixed top-0 right-0 w-96 max-w-full h-full bg-[#0d0e12] border-l border-[#1f2128] shadow-2xl z-40 flex flex-col backdrop-blur">
      {/* Drawer Header */}
      <div className="p-4 border-b border-[#1f2128] flex items-start justify-between gap-3 bg-[#111217]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono-code text-[10px] text-white bg-[#1a1c24] border border-[#2c2f3a] px-1.5 py-0.5 rounded uppercase">
              {service.type} · Tier {service.tier}
            </span>
            <span
              className={`font-mono-code text-[10px] px-1.5 py-0.5 rounded border uppercase ${
                service.health === 'HEALTHY'
                  ? 'border-emerald-800 text-emerald-400 bg-emerald-950/40'
                  : service.health === 'DEGRADED'
                  ? 'border-amber-800 text-amber-400 bg-amber-950/40'
                  : 'border-red-800 text-red-400 bg-red-950/40'
              }`}
            >
              {service.health}
            </span>
          </div>
          <h3 className="font-bold text-base text-white">{service.name}</h3>
          <p className="text-xs text-[#717380] font-mono-code">{service.id}</p>
        </div>
        <button
          onClick={onClose}
          className="text-[#717380] hover:text-white p-1 hover:bg-[#1a1c24] rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Navigation Tabs */}
      <div className="flex items-center border-b border-[#1f2128] bg-[#0c0d11] text-xs font-mono-code px-2">
        {[
          { id: 'metrics', label: 'Telemetry', icon: Activity },
          { id: 'dependencies', label: 'Dependencies', icon: Layers },
          { id: 'config', label: 'Config', icon: Sliders },
          { id: 'yaml', label: 'K8s YAML', icon: Code2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-white text-white'
                  : 'border-transparent text-[#717380] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'metrics' && (
          <div className="space-y-3 font-mono-code">
            <div className="bg-[#121318] border border-[#1f2128] p-3 rounded-md">
              <span className="text-[#717380] text-[10px] uppercase block mb-1">Health Score</span>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-2xl font-bold text-white">{service.healthScore}</span>
                <span className="text-[#717380] text-[11px]">Target: &gt;90</span>
              </div>
              <div className="w-full bg-[#0b0c10] h-2 rounded-full overflow-hidden border border-[#1f2128]">
                <div
                  className={`h-full ${
                    service.healthScore >= 80
                      ? 'bg-emerald-400'
                      : service.healthScore >= 60
                      ? 'bg-amber-400'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${service.healthScore}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#121318] border border-[#1f2128] p-2.5 rounded">
                <span className="text-[#717380] text-[10px] uppercase block">Latency</span>
                <span className="text-base font-bold text-white">{cur.latency}ms</span>
                <span className="text-[10px] text-[#717380] block mt-0.5">
                  Base: {base.latency}ms
                </span>
              </div>

              <div className="bg-[#121318] border border-[#1f2128] p-2.5 rounded">
                <span className="text-[#717380] text-[10px] uppercase block">Error Rate</span>
                <span
                  className={`text-base font-bold ${
                    cur.errorRate > 10 ? 'text-red-400' : cur.errorRate > 1 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {cur.errorRate}%
                </span>
                <span className="text-[10px] text-[#717380] block mt-0.5">Base: {base.errorRate}%</span>
              </div>

              <div className="bg-[#121318] border border-[#1f2128] p-2.5 rounded">
                <span className="text-[#717380] text-[10px] uppercase block">CPU Load</span>
                <span className="text-base font-bold text-white">{cur.cpu}%</span>
                <span className="text-[10px] text-[#717380] block mt-0.5">Limit: {service.config.cpuLimit}</span>
              </div>

              <div className="bg-[#121318] border border-[#1f2128] p-2.5 rounded">
                <span className="text-[#717380] text-[10px] uppercase block">Availability</span>
                <span className="text-base font-bold text-emerald-400">{cur.availability}%</span>
                <span className="text-[10px] text-[#717380] block mt-0.5">SLA: 99.95%</span>
              </div>
            </div>

            <div className="p-3 bg-[#121318] border border-[#1f2128] rounded">
              <span className="text-[11px] font-sans text-[#ededef] block mb-1">Service Description</span>
              <p className="text-[#8e909d] font-sans text-xs leading-relaxed">{service.description}</p>
            </div>
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="space-y-4 font-mono-code">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#717380] font-semibold block mb-2">
                Upstream Callers ({callers.length})
              </span>
              {callers.length === 0 ? (
                <p className="text-[#555763] text-xs italic">Edge ingress service — no upstream callers.</p>
              ) : (
                <div className="space-y-2">
                  {callers.map(({ service: caller, dep }) => (
                    <div
                      key={dep.id}
                      className="bg-[#121318] border border-[#1f2128] p-2 rounded flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-white block">{caller?.name}</span>
                        <span className="text-[10px] text-[#717380]">{dep.protocol} · Timeout {dep.timeoutMs}ms</span>
                      </div>
                      <span className="text-[10px] text-white bg-[#1a1c24] px-1.5 py-0.5 rounded border border-[#2b2e3a]">
                        Caller
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#717380] font-semibold block mb-2">
                Downstream Dependencies ({downstream.length})
              </span>
              {downstream.length === 0 ? (
                <p className="text-[#555763] text-xs italic">Terminal leaf service — no downstream dependencies.</p>
              ) : (
                <div className="space-y-2">
                  {downstream.map(({ service: callee, dep }) => (
                    <div
                      key={dep.id}
                      className="bg-[#121318] border border-[#1f2128] p-2 rounded flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-white block">{callee?.name}</span>
                        <span className="text-[10px] text-[#717380]">
                          {dep.protocol} · {dep.circuitBreaker ? 'Circuit Breaker Enabled' : 'No Circuit Breaker'}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          dep.isCritical
                            ? 'text-red-400 bg-red-950/40 border-red-900/60'
                            : 'text-[#8e909d] bg-[#1a1b22] border-[#2b2e3a]'
                        }`}
                      >
                        {dep.isCritical ? 'Critical' : 'Optional'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="space-y-3 font-mono-code">
            <div className="bg-[#121318] border border-[#1f2128] p-3 rounded">
              <span className="text-[#717380] text-[10px] uppercase block mb-2">Resilience Policy</span>

              <div className="flex items-center justify-between py-1.5 border-b border-[#1f2128]">
                <span className="text-[#ededef]">Circuit Breaker</span>
                <button
                  onClick={() => onToggleCircuitBreaker(service.id)}
                  className={`text-xs px-2 py-0.5 rounded border font-semibold ${
                    service.config.circuitBreakerEnabled || isRemediated
                      ? 'border-emerald-700 bg-emerald-950 text-emerald-300'
                      : 'border-[#2c2f3a] bg-[#1a1b22] text-[#8e909d] hover:text-white'
                  }`}
                >
                  {service.config.circuitBreakerEnabled || isRemediated ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#1f2128]">
                <span className="text-[#ededef]">Timeout Threshold</span>
                <span className="text-white">{service.config.timeoutMs} ms</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#1f2128]">
                <span className="text-[#ededef]">Retry Attempts</span>
                <span className="text-white">{service.config.retries} attempts</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#1f2128]">
                <span className="text-[#ededef]">Replicas</span>
                <span className="text-white">{service.config.replicas} pods</span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#ededef]">Fallback Cache</span>
                <span className="text-white">{service.config.fallbackCache ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'yaml' && (
          <div className="space-y-2">
            <span className="text-[#717380] font-mono-code text-[11px] block">
              Kubernetes Resource Manifest
            </span>
            <pre className="bg-[#0b0c10] border border-[#1f2128] p-3 rounded text-[11px] font-mono-code text-[#ededef] overflow-x-auto whitespace-pre leading-relaxed">
              {yamlSpec}
            </pre>
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="p-4 border-t border-[#1f2128] bg-[#111217] flex items-center gap-2">
        <button
          onClick={() => {
            onClose();
            onInjectChaos(service.id);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 rounded-md text-xs transition-colors shadow-sm"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Inject Chaos on this Node</span>
        </button>
      </div>
    </div>
  );
};
