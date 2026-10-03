import React, { useState } from 'react';
import { TelemetryPoint, ServiceNode } from '../types';
import { Activity, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface TelemetryChartsProps {
  telemetryHistory: TelemetryPoint[];
  services: ServiceNode[];
}

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({
  telemetryHistory,
  services,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>('payment-service');

  const filteredPoints = telemetryHistory
    .filter((t) => t.serviceId === selectedServiceId)
    .slice(-30);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const width = 500;
  const height = 135;
  const padding = { top: 15, right: 15, bottom: 25, left: 35 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const renderLineChart = (
    data: number[],
    maxVal: number,
    color: string,
    unit: string,
    threshold?: number
  ) => {
    if (data.length < 2) {
      return (
        <div className="h-[135px] flex items-center justify-center text-[#555763] font-mono-code text-xs">
          Awaiting telemetry stream...
        </div>
      );
    }

    const effectiveMax = Math.max(maxVal, ...data) * 1.15;
    const points = data.map((val, idx) => {
      const x = padding.left + (idx / (data.length - 1)) * chartW;
      const y = padding.top + chartH - (val / effectiveMax) * chartH;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;
    const areaD = `${pathD} L ${padding.left + chartW},${padding.top + chartH} L ${padding.left},${padding.top + chartH} Z`;

    const thresholdY = threshold
      ? padding.top + chartH - (threshold / effectiveMax) * chartH
      : null;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[135px] overflow-visible">
        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding.top + chartH * pct;
          const val = Math.round(effectiveMax * (1 - pct));
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartW}
                y2={y}
                stroke="#1f2128"
                strokeDasharray="2 2"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                textAnchor="end"
                fill="#555763"
                fontSize="9"
                fontFamily="monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* SLA Threshold line */}
        {thresholdY !== null && thresholdY >= padding.top && thresholdY <= padding.top + chartH && (
          <g>
            <line
              x1={padding.left}
              y1={thresholdY}
              x2={padding.left + chartW}
              y2={thresholdY}
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text
              x={padding.left + chartW - 5}
              y={thresholdY - 4}
              textAnchor="end"
              fill="#ef4444"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              SLA Limit ({threshold}{unit})
            </text>
          </g>
        )}

        <path d={areaD} fill={color} fillOpacity="0.08" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />

        {data.length > 0 && (
          <circle
            cx={padding.left + chartW}
            cy={padding.top + chartH - (data[data.length - 1] / effectiveMax) * chartH}
            r="3.5"
            fill={color}
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  const latencies = filteredPoints.map((p) => p.latency);
  const errorRates = filteredPoints.map((p) => p.errorRate);
  const cpuLoads = filteredPoints.map((p) => p.cpu);
  const rpsValues = filteredPoints.map((p) => p.rps);

  const cur = selectedService?.currentMetrics;

  return (
    <div className="bg-[#121318] border border-[#1f2128] rounded-lg p-4 space-y-4">
      {/* Header and Service Filter Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2128] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm text-white">Live Telemetry & Observability Feed</h3>
          <span className="text-[10px] font-mono-code text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/50">
            1s Tick Stream
          </span>
        </div>

        {/* Service Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
          {services.map((svc) => (
            <button
              key={svc.id}
              onClick={() => setSelectedServiceId(svc.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono-code transition-colors whitespace-nowrap ${
                selectedServiceId === svc.id
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'bg-[#181920] hover:bg-[#22242e] text-[#8e909d] border border-[#22242e]'
              }`}
            >
              {svc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Service Quick Info Strip */}
      {selectedService && (
        <div className="bg-[#0e0f13] border border-[#1f2128] px-3 py-2 rounded flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold">{selectedService.name}</span>
            <span className="text-[#3b3d48]">·</span>
            <span className="text-[#8e909d]">Base Latency: {selectedService.baselineMetrics.latency}ms</span>
            <span className="text-[#3b3d48]">·</span>
            <span className="text-[#8e909d]">Base Error: {selectedService.baselineMetrics.errorRate}%</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#8e909d]">
              Live Latency:{' '}
              <strong
                className={
                  (cur?.latency ?? 0) > 300
                    ? 'text-red-400'
                    : (cur?.latency ?? 0) > 150
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }
              >
                {cur?.latency ?? 0}ms
              </strong>
            </span>
            <span className="text-[#8e909d]">
              Live Error Rate:{' '}
              <strong className={(cur?.errorRate ?? 0) > 5 ? 'text-red-400' : 'text-emerald-400'}>
                {cur?.errorRate ?? 0}%
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latency Chart */}
        <div className="bg-[#0b0c10] border border-[#1f2128] p-3 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white font-mono-code flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#8e909d]" />
              Response Latency (p99)
            </span>
            <span className="text-xs font-mono-code font-bold text-white">
              {cur?.latency ?? 0} ms
            </span>
          </div>
          {renderLineChart(latencies, 200, '#EDEDEF', 'ms', 300)}
        </div>

        {/* Error Rate Chart */}
        <div className="bg-[#0b0c10] border border-[#1f2128] p-3 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white font-mono-code flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              Error Rate (%)
            </span>
            <span
              className={`text-xs font-mono-code font-bold ${
                (cur?.errorRate ?? 0) > 5 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {cur?.errorRate ?? 0} %
            </span>
          </div>
          {renderLineChart(errorRates, 10, '#ef4444', '%', 5)}
        </div>

        {/* CPU Utilization Chart */}
        <div className="bg-[#0b0c10] border border-[#1f2128] p-3 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white font-mono-code flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              CPU Utilization
            </span>
            <span className="text-xs font-mono-code font-bold text-amber-400">
              {cur?.cpu ?? 0} %
            </span>
          </div>
          {renderLineChart(cpuLoads, 100, '#f59e0b', '%', 85)}
        </div>

        {/* Request Rate (RPS) Chart */}
        <div className="bg-[#0b0c10] border border-[#1f2128] p-3 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white font-mono-code flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Throughput (RPS)
            </span>
            <span className="text-xs font-mono-code font-bold text-emerald-400">
              {cur?.rps ?? 0} req/s
            </span>
          </div>
          {renderLineChart(rpsValues, 1000, '#10b981', 'rps')}
        </div>
      </div>
    </div>
  );
};
