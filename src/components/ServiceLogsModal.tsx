import React, { useState, useMemo } from 'react';
import { ServiceNode } from '../types';
import {
  Terminal,
  X,
  Search,
  Copy,
  Check,
  Download,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface ServiceLogsModalProps {
  service: ServiceNode;
  onClose: () => void;
  onToggleCircuitBreaker?: (serviceId: string) => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  traceId: string;
  latencyMs?: number;
  httpStatus?: number;
}

export const ServiceLogsModal: React.FC<ServiceLogsModalProps> = ({
  service,
  onClose,
  onToggleCircuitBreaker,
}) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Generate contextual realistic logs based on current service metrics and state
  const logs = useMemo<LogEntry[]>(() => {
    const list: LogEntry[] = [];
    const now = Date.now();
    const cur = service.currentMetrics;
    const isDegraded = service.health === 'DEGRADED';
    const isFailing = service.health === 'FAILED' || service.health === 'CRITICAL';
    const cb = service.config.circuitBreakerEnabled;

    const baseComponents = ['envoy-proxy', 'http-handler', 'circuit-breaker', 'metrics-agent', 'grpc-client'];

    for (let i = 25; i >= 0; i--) {
      const time = new Date(now - i * 1800).toISOString().split('T')[1].slice(0, 12);
      const traceId = `trace-${service.id.slice(0, 4)}-${Math.random().toString(36).substring(2, 8)}`;
      const component = baseComponents[i % baseComponents.length];

      let level: 'INFO' | 'WARN' | 'ERROR' = 'INFO';
      let message = '';
      let latencyMs = Math.round(cur.latency * (0.85 + (i % 5) * 0.08));
      let httpStatus = 200;

      if (isFailing && i < 15) {
        level = i % 2 === 0 ? 'ERROR' : 'WARN';
        httpStatus = i % 3 === 0 ? 504 : 503;
        message = i % 3 === 0
          ? `upstream request timeout after ${service.config.timeoutMs}ms to callee socket`
          : `connection refused / upstream host unhealthy in cluster '${service.name}'`;
      } else if (isDegraded && i < 18) {
        level = i % 3 === 0 ? 'WARN' : 'INFO';
        httpStatus = i % 4 === 0 ? 429 : 200;
        message = i % 4 === 0
          ? `rate-limiter throttling caller pool; queue saturation at ${Math.round(cur.cpu)}%`
          : `p99 latency breach observed: ${latencyMs}ms exceeds SLA limit of 300ms`;
      } else {
        level = 'INFO';
        httpStatus = 200;
        message = i % 4 === 0
          ? `HTTP GET /api/v1/${service.id}/health responded 200 OK (${latencyMs}ms)`
          : `dispatching ${Math.round(cur.rps / 10)} req/s across ${service.config.replicas} active worker replicas`;
      }

      // Add circuit breaker events
      if (i === 4 && cb) {
        level = isFailing ? 'WARN' : 'INFO';
        message = isFailing
          ? `circuit breaker tripped: consecutive failure threshold exceeded, shedding 100% traffic`
          : `circuit breaker arming verified: threshold set to ${service.config.circuitBreakerThreshold ?? 25}% error rate`;
      }

      list.push({
        id: `log-${i}`,
        timestamp: time,
        level,
        component,
        message,
        traceId,
        latencyMs,
        httpStatus,
      });
    }

    return list;
  }, [service]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.component.toLowerCase().includes(q) ||
        log.traceId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyLogs = () => {
    const raw = filteredLogs.map((l) => `[${l.timestamp}] [${l.level}] [${l.component}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(raw);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const raw = filteredLogs.map((l) => `[${l.timestamp}] [${l.level}] [${l.component}] ${l.message}`).join('\n');
    const blob = new Blob([raw], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${service.id}-logs-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e0f14] border border-[#262833] w-full max-w-4xl h-[650px] rounded-lg shadow-2xl flex flex-col overflow-hidden text-xs font-mono-code animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 border-b border-[#1f2128] bg-[#121319] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#1b1d26] rounded border border-[#2b2d38]">
              <Terminal className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">{service.name}</h3>
                <span className="text-[10px] text-[#717380] font-normal">({service.id})</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    service.health === 'HEALTHY'
                      ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                      : service.health === 'DEGRADED'
                      ? 'text-amber-400 bg-amber-950/60 border border-amber-800'
                      : 'text-red-400 bg-red-950/60 border border-red-800'
                  }`}
                >
                  {service.health}
                </span>
              </div>
              <p className="text-[10px] text-[#8e909d]">
                Live ingress / egress stream · Envoy service mesh telemetry · Tier {service.tier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onToggleCircuitBreaker && (
              <button
                onClick={() => onToggleCircuitBreaker(service.id)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-colors ${
                  service.config.circuitBreakerEnabled
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/80 hover:bg-emerald-900/60'
                    : 'bg-[#1b1c24] text-[#8e909d] border-[#2b2d38] hover:text-white'
                }`}
                title="Toggle Circuit Breaker configuration"
              >
                CB: {service.config.circuitBreakerEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            )}

            <button
              onClick={handleCopyLogs}
              className="p-1.5 text-[#8e909d] hover:text-white hover:bg-[#1a1b22] border border-[#262833] rounded transition-colors"
              title="Copy visible logs"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-1.5 text-[#8e909d] hover:text-white hover:bg-[#1a1b22] border border-[#262833] rounded transition-colors"
              title="Download log file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#8e909d] hover:text-white hover:bg-[#1a1b22] rounded transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-2.5 bg-[#0a0b0e] border-b border-[#1f2128] flex items-center justify-between gap-3 text-[11px]">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#717380] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter logs by message, component, or trace ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#13141a] border border-[#262833] rounded pl-8 pr-3 py-1.5 text-white placeholder-[#555763] focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#13141a] p-0.5 rounded border border-[#262833]">
              {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                    filterLevel === lvl
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      : 'text-[#717380] hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-[#717380] flex items-center gap-3">
            <span>Latency: <strong className="text-white">{service.currentMetrics.latency}ms</strong></span>
            <span>Error: <strong className="text-white">{service.currentMetrics.errorRate}%</strong></span>
            <span>Logs: <strong className="text-white">{filteredLogs.length}</strong></span>
          </div>
        </div>

        {/* Log Viewer Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#090a0d] select-text">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-[#555763]">
              <p>No matching logs for filter criteria.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const levelColor =
                log.level === 'ERROR'
                  ? 'text-red-400 bg-red-950/40 border-red-900/60'
                  : log.level === 'WARN'
                  ? 'text-amber-400 bg-amber-950/40 border-amber-900/60'
                  : 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40';

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-1 px-2 rounded hover:bg-[#13141c] transition-colors leading-relaxed group"
                >
                  <span className="text-[#555763] shrink-0 text-[10px] select-none">
                    {log.timestamp}
                  </span>

                  <span className={`px-1 rounded text-[9px] font-bold shrink-0 border ${levelColor}`}>
                    {log.level}
                  </span>

                  <span className="text-[#8e909d] shrink-0 text-[10px] w-28 truncate">
                    [{log.component}]
                  </span>

                  <span className="flex-1 text-[#d4d4d8] text-[11px] font-mono break-all">
                    {log.message}
                  </span>

                  {log.httpStatus && (
                    <span
                      className={`text-[9px] font-bold shrink-0 px-1 rounded ${
                        log.httpStatus >= 500
                          ? 'text-red-400 bg-red-950/50'
                          : log.httpStatus >= 400
                          ? 'text-amber-400 bg-amber-950/50'
                          : 'text-emerald-400 bg-emerald-950/50'
                      }`}
                    >
                      {log.httpStatus}
                    </span>
                  )}

                  <span className="text-[#555763] text-[9px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {log.traceId}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 border-t border-[#1f2128] bg-[#121319] flex items-center justify-between text-[10px] text-[#717380]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Streaming tail via stdout buffer (PID 10842)</span>
          </div>
          <div>
            <span>Press <kbd className="px-1 py-0.5 bg-[#1f2128] text-white rounded">ESC</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
