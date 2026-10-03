import React, { useState, useRef, useEffect } from 'react';
import {
  ServiceNode,
  ServiceDependency,
  ChaosExperiment,
  Incident,
  TelemetryPoint,
} from '../types';
import {
  Server,
  Database,
  Globe,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ShieldCheck,
  Flame,
  Activity,
  AlertTriangle,
  Terminal,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { getHealthScoreColor } from '../utils/heatmap';
import { ServiceLogsModal } from './ServiceLogsModal';

interface ServiceGraphCanvasProps {
  services: ServiceNode[];
  dependencies: ServiceDependency[];
  selectedServiceId: string | null;
  onSelectService: (serviceId: string) => void;
  activeExperiment: ChaosExperiment | null;
  remediatedServices: Set<string>;
  incidents?: Incident[];
  telemetryHistory?: TelemetryPoint[];
  onToggleCircuitBreaker?: (serviceId: string) => void;
  onInjectChaos?: (serviceId: string) => void;
  onViewLogs?: (service: ServiceNode) => void;
}

export const ServiceGraphCanvas: React.FC<ServiceGraphCanvasProps> = ({
  services,
  dependencies,
  selectedServiceId,
  onSelectService,
  activeExperiment,
  remediatedServices,
  incidents = [],
  telemetryHistory = [],
  onToggleCircuitBreaker,
  onInjectChaos,
  onViewLogs,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 15 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [heatmapIntensity, setHeatmapIntensity] = useState<'normal' | 'vibrant'>('normal');
  const [contextMenu, setContextMenu] = useState<{
    service: ServiceNode;
    x: number;
    y: number;
  } | null>(null);
  const [activeLogsService, setActiveLogsService] = useState<ServiceNode | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close context menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, svc: ServiceNode) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 230;
    const menuHeight = 240;
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (x + menuWidth > rect.width) {
      x = rect.width - menuWidth - 8;
    }
    if (y + menuHeight > rect.height) {
      y = rect.height - menuHeight - 8;
    }

    setContextMenu({
      service: svc,
      x: Math.max(8, x),
      y: Math.max(8, y),
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) {
      setContextMenu(null);
    }
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoom = (delta: number) => {
    setContextMenu(null);
    setZoom((prev) => Math.max(0.6, Math.min(1.8, +(prev + delta).toFixed(2))));
  };

  const handleResetView = () => {
    setContextMenu(null);
    setZoom(1);
    setPan({ x: 20, y: 15 });
  };

  const servicesMap = new Map(services.map((s) => [s.id, s]));

  const avgHealthScore = Math.round(
    services.reduce((acc, s) => acc + (s.healthScore ?? 100), 0) / (services.length || 1)
  );

  const getServiceIcon = (type: ServiceNode['type']) => {
    switch (type) {
      case 'frontend':
        return <Globe className="w-3.5 h-3.5 text-[#a1a1aa]" />;
      case 'gateway':
        return <Layers className="w-3.5 h-3.5 text-[#a1a1aa]" />;
      case 'database':
        return <Database className="w-3.5 h-3.5 text-[#a1a1aa]" />;
      default:
        return <Server className="w-3.5 h-3.5 text-[#a1a1aa]" />;
    }
  };

  const getHealthStyles = (health: ServiceNode['health']) => {
    switch (health) {
      case 'HEALTHY':
        return {
          border: 'border-[#262833]',
          bg: 'bg-[#13141a]',
          badge: 'text-emerald-400 bg-emerald-950/40 border-emerald-900/60',
          dot: 'bg-emerald-400',
          glow: '',
        };
      case 'DEGRADED':
        return {
          border: 'border-amber-600/70',
          bg: 'bg-[#181614]',
          badge: 'text-amber-400 bg-amber-950/50 border-amber-800/60',
          dot: 'bg-amber-400 animate-pulse',
          glow: 'ring-1 ring-amber-500/30',
        };
      case 'CRITICAL':
        return {
          border: 'border-red-600',
          bg: 'bg-[#1a1214]',
          badge: 'text-red-400 bg-red-950/60 border-red-800',
          dot: 'bg-red-500 animate-ping',
          glow: 'ring-2 ring-red-500/40 shadow-lg shadow-red-950/50',
        };
      case 'FAILED':
        return {
          border: 'border-red-700',
          bg: 'bg-red-950/30',
          badge: 'text-red-300 bg-red-900/60 border-red-700',
          dot: 'bg-red-600 animate-ping',
          glow: 'ring-2 ring-red-600/60 animate-pulse-glow',
        };
      case 'RECOVERING':
        return {
          border: 'border-emerald-600/60',
          bg: 'bg-[#13141a]',
          badge: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
          dot: 'bg-emerald-400 animate-pulse',
          glow: 'ring-1 ring-emerald-500/30',
        };
    }
  };

  // Helper to determine if a service node is experiencing an active incident or high anomaly score
  const getServiceIncidentAndAnomalyStatus = (svc: ServiceNode) => {
    // 1. Check for active (unresolved) incident directly affecting or cascading to this service
    const activeIncident = incidents.find(
      (inc) =>
        inc.status !== 'RESOLVED' &&
        (inc.affectedServiceId === svc.id || inc.cascadingServices?.includes(svc.id))
    );

    const isChaosTarget =
      activeExperiment?.status === 'RUNNING' && activeExperiment.targetServiceId === svc.id;

    const isChaosAffected =
      activeExperiment?.status === 'RUNNING' &&
      activeExperiment.affectedServiceIds?.includes(svc.id);

    const hasActiveIncident =
      Boolean(activeIncident) ||
      isChaosTarget ||
      svc.health === 'FAILED' ||
      svc.health === 'CRITICAL';

    // 2. Check for high anomaly score:
    // Check latest point from live telemetry history for this service
    let telemetryAnomalyScore = 0;
    for (let i = telemetryHistory.length - 1; i >= 0; i--) {
      if (telemetryHistory[i].serviceId === svc.id) {
        telemetryAnomalyScore = telemetryHistory[i].anomalyScore ?? 0;
        break;
      }
    }

    // Statistical anomaly score based on current metrics vs baseline
    const cur = svc.currentMetrics;
    const base = svc.baselineMetrics;
    const zLatency = Math.max(0, (cur.latency - base.latency) / Math.max(10, base.latency * 0.2));
    const zError = Math.max(0, (cur.errorRate - base.errorRate) / Math.max(0.2, 0.5));
    const zCpu = Math.max(0, (cur.cpu - base.cpu) / 12);
    const calculatedAnomalyScore = Math.min(
      1.0,
      +(0.45 * Math.min(10, zLatency) + 0.35 * Math.min(10, zError) + 0.2 * Math.min(10, zCpu)) / 8
    );

    const effectiveAnomalyScore = Math.max(telemetryAnomalyScore, calculatedAnomalyScore);
    const hasHighAnomaly =
      !hasActiveIncident &&
      (effectiveAnomalyScore >= 0.6 ||
        svc.health === 'DEGRADED' ||
        isChaosAffected ||
        cur.errorRate > 5 ||
        cur.latency > Math.max(280, base.latency * 2.2));

    return {
      hasActiveIncident,
      hasHighAnomaly,
      effectiveAnomalyScore: +effectiveAnomalyScore.toFixed(2),
      activeIncidentTitle: activeIncident?.title,
    };
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-[620px] bg-[#0a0b0e] border border-[#1f2128] rounded-lg overflow-hidden select-none cursor-grab active:cursor-grabbing"
    >
      {/* Subtle Dot Matrix Background */}
      <div
        id="graph-bg"
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#4a4d5e 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating Canvas Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-[#14151b]/95 border border-[#22242e] p-1.5 rounded-md shadow-xl backdrop-blur">
        {/* Heatmap Layer Toggle */}
        <button
          onClick={() => setHeatmapEnabled(!heatmapEnabled)}
          title={heatmapEnabled ? 'Disable Health Heatmap Layer' : 'Enable Health Heatmap Layer (Red to Emerald)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono-code rounded transition-all ${
            heatmapEnabled
              ? 'bg-gradient-to-r from-red-500/20 via-amber-500/20 to-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-[#717380] hover:text-white hover:bg-[#1f2129]'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Heatmap</span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              heatmapEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-[#4a4d5e]'
            }`}
          />
        </button>

        {/* Heatmap Intensity Toggle */}
        {heatmapEnabled && (
          <button
            onClick={() =>
              setHeatmapIntensity((prev) => (prev === 'normal' ? 'vibrant' : 'normal'))
            }
            title="Toggle Heatmap Glow Intensity"
            className="px-2 py-1 text-[10px] font-mono-code text-[#a1a1aa] hover:text-white bg-[#1a1b22] hover:bg-[#252732] border border-[#262833] rounded transition-colors"
          >
            Aura: {heatmapIntensity === 'vibrant' ? 'Vibrant' : 'Standard'}
          </button>
        )}

        <div className="h-4 w-px bg-[#262833] mx-0.5" />

        <button
          onClick={() => handleZoom(0.15)}
          title="Zoom In"
          className="p-1.5 text-[#717380] hover:text-white hover:bg-[#1f2129] rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          title="Zoom Out"
          className="p-1.5 text-[#717380] hover:text-white hover:bg-[#1f2129] rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          title="Reset View"
          className="p-1.5 text-[#717380] hover:text-white hover:bg-[#1f2129] rounded transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono-code text-[#717380] px-2 border-l border-[#22242e]">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Graph Legend & Heatmap Color Bar */}
      <div className="absolute bottom-4 left-4 z-20 bg-[#14151b]/95 border border-[#22242e] p-2.5 rounded-md shadow-xl backdrop-blur text-xs flex flex-wrap items-center gap-4">
        {heatmapEnabled ? (
          <div className="flex items-center gap-2.5 pr-3 border-r border-[#22242e]">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[9px] font-mono-code">
                <span className="text-red-400 font-bold">0 Red</span>
                <span className="text-amber-400 font-semibold px-2">50 Amber</span>
                <span className="text-emerald-400 font-bold">100 Emerald</span>
              </div>
              <div
                className="w-36 h-2 rounded-full border border-white/10 shadow-inner"
                style={{
                  background:
                    'linear-gradient(to right, #ef4444 0%, #f97316 25%, #f59e0b 50%, #84cc16 75%, #10b981 100%)',
                }}
              />
            </div>
            <div className="text-[10px] font-mono-code text-[#ededef]">
              <span className="text-[#717380] block text-[9px]">Cluster Avg</span>
              <span className="font-bold text-emerald-400">{avgHealthScore}%</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-[#a1a1aa] font-mono-code text-[11px]">Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-[#a1a1aa] font-mono-code text-[11px]">Degraded</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-[#a1a1aa] font-mono-code text-[11px]">Critical / Failed</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[#717380] font-mono-code text-[11px]">Chaos Injected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[#717380] font-mono-code text-[11px]">Protected</span>
          </div>
        </div>

        {/* Conditional Glow Status Indicators */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#22242e]">
          <div className="flex items-center gap-1.5" title="Conditional pulsing glow applied during active incidents">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-incident-glow ring-1 ring-red-400"></span>
            <span className="text-[#a1a1aa] font-mono-code text-[11px]">Incident Glow</span>
          </div>
          <div className="flex items-center gap-1.5" title="Conditional pulsing glow applied on high anomaly breach">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-anomaly-glow ring-1 ring-amber-400"></span>
            <span className="text-[#a1a1aa] font-mono-code text-[11px]">Anomaly Glow</span>
          </div>
        </div>
      </div>

      {/* SVG Container for Heatmap Glow Underlay & Dependency Edges */}
      <svg
        className="w-full h-full absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <marker
            id="arrow-normal"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b3e4a" />
          </marker>
          <marker
            id="arrow-degraded"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>
          <marker
            id="arrow-failing"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
          </marker>

          {/* SVG Blur Filter for Thermal Blending */}
          <filter id="heatmap-blur-filter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={heatmapIntensity === 'vibrant' ? '40' : '26'} />
          </filter>

          {/* Radial Gradients for Each Node's Heatmap Aura */}
          {services.map((svc) => {
            const color = getHealthScoreColor(svc.healthScore ?? 100);
            const isVibrant = heatmapIntensity === 'vibrant';
            return (
              <radialGradient
                key={`heat-radial-${svc.id}`}
                id={`heat-radial-${svc.id}`}
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor={color.hex} stopOpacity={isVibrant ? '0.65' : '0.42'} />
                <stop offset="35%" stopColor={color.hex} stopOpacity={isVibrant ? '0.35' : '0.20'} />
                <stop offset="70%" stopColor={color.hex} stopOpacity={isVibrant ? '0.12' : '0.05'} />
                <stop offset="100%" stopColor={color.hex} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>

        {/* --- HEATMAP VISUALIZATION LAYER --- */}
        {heatmapEnabled && (
          <g id="heatmap-visualization-layer" className="transition-opacity duration-300">
            {/* Blended Thermal Heat Fields */}
            <g filter="url(#heatmap-blur-filter)">
              {services.map((svc) => {
                const cx = svc.position.x + 105;
                const cy = svc.position.y + 70;
                const r = heatmapIntensity === 'vibrant' ? 175 : 135;
                return (
                  <circle
                    key={`heat-aura-${svc.id}`}
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={`url(#heat-radial-${svc.id})`}
                  />
                );
              })}
            </g>

            {/* Thermal hotspot pulsation rings for degraded or critical nodes */}
            {services.map((svc) => {
              const score = svc.healthScore ?? 100;
              const color = getHealthScoreColor(score);
              const cx = svc.position.x + 105;
              const cy = svc.position.y + 70;

              if (score < 70) {
                return (
                  <g key={`heat-pulse-${svc.id}`}>
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={120}
                      ry={78}
                      fill="none"
                      stroke={color.rgba(0.4)}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                  </g>
                );
              }
              return null;
            })}
          </g>
        )}

        {/* --- DEPENDENCY EDGES --- */}
        {dependencies.map((dep) => {
          const src = servicesMap.get(dep.source);
          const tgt = servicesMap.get(dep.target);
          if (!src || !tgt) return null;

          const x1 = src.position.x + 105;
          const y1 = src.position.y + 72;
          const x2 = tgt.position.x + 105;
          const y2 = tgt.position.y;

          const dy = Math.max(40, (y2 - y1) * 0.5);
          const pathData = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

          const isFailing = dep.status === 'FAILING' || dep.status === 'CIRCUIT_OPEN';
          const isDegraded = dep.status === 'DEGRADED';

          const strokeColor = isFailing ? '#ef4444' : isDegraded ? '#f59e0b' : '#2b2d38';
          const markerId = isFailing
            ? 'url(#arrow-failing)'
            : isDegraded
            ? 'url(#arrow-degraded)'
            : 'url(#arrow-normal)';

          return (
            <g key={dep.id} className="transition-all">
              <path
                d={pathData}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isFailing ? 2.5 : 1.5}
                markerEnd={markerId}
              />
              <path
                d={pathData}
                fill="none"
                stroke={isFailing ? '#f87171' : isDegraded ? '#fbbf24' : '#52525b'}
                strokeWidth={isFailing ? 2.5 : 1.5}
                className="animate-packet-flow opacity-60"
              />

              {/* Protocol Badge at midpoint */}
              <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`}>
                <rect
                  x="-22"
                  y="-7"
                  width="44"
                  height="14"
                  rx="2"
                  fill="#0e0f13"
                  stroke={strokeColor}
                  strokeWidth="0.8"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#8e909d"
                  fontSize="8"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {dep.protocol}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Render Service Nodes with Heatmap Highlighting */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {services.map((svc) => {
          const isSelected = selectedServiceId === svc.id;
          const isTarget = activeExperiment?.targetServiceId === svc.id;
          const isRemediated = remediatedServices.has(svc.id);
          const defaultStyles = getHealthStyles(svc.health);
          const score = svc.healthScore ?? 100;
          const heatColor = getHealthScoreColor(score);
          const { hasActiveIncident, hasHighAnomaly, effectiveAnomalyScore } =
            getServiceIncidentAndAnomalyStatus(svc);

          // Conditional CSS animation:
          // Subtle glow effect only when node is experiencing an active incident or high anomaly score
          const glowAnimationClass = hasActiveIncident
            ? 'animate-incident-glow'
            : hasHighAnomaly
            ? 'animate-anomaly-glow'
            : '';

          // When conditional animation is active, do not set inline borderColor/boxShadow so keyframes animate smoothly
          const hasGlowAnimation = hasActiveIncident || hasHighAnomaly;

          const nodeStyle: React.CSSProperties = {
            left: `${svc.position.x}px`,
            top: `${svc.position.y}px`,
            width: '210px',
            borderColor: hasGlowAnimation
              ? undefined
              : heatmapEnabled
              ? heatColor.rgba(0.85)
              : undefined,
            background: hasGlowAnimation
              ? hasActiveIncident
                ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.16) 0%, #151114 80%)'
                : 'linear-gradient(180deg, rgba(245, 158, 11, 0.14) 0%, #161411 80%)'
              : heatmapEnabled
              ? `linear-gradient(180deg, ${heatColor.rgba(0.12)} 0%, #121318 75%)`
              : undefined,
            boxShadow: hasGlowAnimation
              ? undefined
              : heatmapEnabled
              ? `0 0 22px -3px ${heatColor.rgba(0.35)}`
              : undefined,
          };

          return (
            <div
              key={svc.id}
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu(null);
                onSelectService(svc.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleContextMenu(e, svc);
              }}
              style={nodeStyle}
              className={`absolute pointer-events-auto p-2.5 rounded-md border ${glowAnimationClass} ${
                hasGlowAnimation
                  ? ''
                  : heatmapEnabled
                  ? ''
                  : defaultStyles.border
              } ${
                hasGlowAnimation
                  ? ''
                  : heatmapEnabled
                  ? ''
                  : defaultStyles.bg
              } ${
                hasGlowAnimation
                  ? ''
                  : heatmapEnabled
                  ? ''
                  : defaultStyles.glow
              } ${
                isSelected
                  ? 'ring-2 ring-white/90 shadow-lg shadow-black'
                  : 'hover:border-[#3a3d4a]'
              } transition-all cursor-pointer backdrop-blur`}
            >
              {/* Target / Remediated Badges */}
              {isTarget && (
                <div className="absolute -top-3 left-2 bg-red-600 text-white font-mono-code text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1 animate-bounce">
                  <Flame className="w-2.5 h-2.5" />
                  <span>CHAOS TARGET</span>
                </div>
              )}

              {isRemediated && !isTarget && (
                <div className="absolute -top-3 right-2 bg-emerald-600 text-white font-mono-code text-[9px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  <span>PROTECTED</span>
                </div>
              )}

              {/* Node Header */}
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {getServiceIcon(svc.type)}
                  <span className="font-semibold text-xs text-white truncate" title={svc.name}>
                    {svc.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Active Incident Beacon Badge */}
                  {hasActiveIncident && (
                    <span className="text-[8px] font-mono-code font-bold text-red-300 bg-red-950/80 px-1 py-0.2 rounded border border-red-800 animate-pulse flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-red-400 animate-ping" />
                      INCIDENT
                    </span>
                  )}
                  {/* High Anomaly Beacon Badge */}
                  {hasHighAnomaly && (
                    <span className="text-[8px] font-mono-code font-bold text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-800 animate-pulse flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                      ANOMALY {Math.round(effectiveAnomalyScore * 100)}%
                    </span>
                  )}
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasActiveIncident
                        ? 'bg-red-500 animate-ping'
                        : hasHighAnomaly
                        ? 'bg-amber-400 animate-pulse'
                        : heatmapEnabled
                        ? ''
                        : defaultStyles.dot
                    }`}
                    style={
                      !hasGlowAnimation && heatmapEnabled
                        ? { backgroundColor: heatColor.hex }
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Heatmap Health Score Meter */}
              {heatmapEnabled && (
                <div className="mb-1.5 px-1.5 py-1 rounded bg-[#0b0c10]/80 border border-[#1f2128] flex items-center justify-between gap-1.5 font-mono-code text-[10px]">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: heatColor.hex }}
                    />
                    <span className="text-[#8e909d] text-[9px] uppercase tracking-wider">Health</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 max-w-[110px]">
                    <div className="w-full bg-[#1b1c24] h-1.5 rounded-full overflow-hidden border border-[#2b2d38]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${score}%`,
                          backgroundColor: heatColor.hex,
                          boxShadow: `0 0 6px ${heatColor.hex}`,
                        }}
                      />
                    </div>
                    <span
                      className="font-bold text-[10px] min-w-[30px] text-right"
                      style={{ color: heatColor.hex }}
                    >
                      {score}%
                    </span>
                  </div>
                </div>
              )}

              {/* Metrics Row */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono-code bg-[#0b0c10] p-1.5 rounded border border-[#1f2128] mb-1.5">
                <div>
                  <span className="text-[#717380] block leading-tight">Latency</span>
                  <span
                    className={`font-semibold ${
                      svc.currentMetrics.latency > 300
                        ? 'text-red-400'
                        : svc.currentMetrics.latency > 150
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {svc.currentMetrics.latency}ms
                  </span>
                </div>
                <div>
                  <span className="text-[#717380] block leading-tight">Error Rate</span>
                  <span
                    className={`font-semibold ${
                      svc.currentMetrics.errorRate > 10
                        ? 'text-red-400'
                        : svc.currentMetrics.errorRate > 2
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {svc.currentMetrics.errorRate}%
                  </span>
                </div>
              </div>

              {/* Footer row: Health state & Tier */}
              <div className="flex items-center justify-between text-[9px] font-mono-code text-[#717380]">
                <span>Tier {svc.tier} · Crit {Math.round(svc.criticality * 100)}%</span>
                <span
                  className="px-1 py-0.2 rounded border uppercase font-semibold text-[8px]"
                  style={
                    heatmapEnabled
                      ? {
                          color: heatColor.hex,
                          borderColor: heatColor.rgba(0.6),
                          backgroundColor: heatColor.rgba(0.15),
                        }
                      : undefined
                  }
                >
                  {svc.health}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute z-40 w-60 bg-[#121319]/95 border border-[#2b2d38] rounded-lg shadow-2xl shadow-black/80 backdrop-blur-md p-1.5 text-xs font-mono-code animate-in fade-in zoom-in-95 duration-100 select-none"
        >
          {/* Header */}
          <div className="px-2.5 py-2 border-b border-[#21232d] mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {getServiceIcon(contextMenu.service.type)}
              <div className="min-w-0">
                <span className="font-bold text-white text-xs block truncate">
                  {contextMenu.service.name}
                </span>
                <span className="text-[10px] text-[#717380] block truncate">
                  {contextMenu.service.id} · Tier {contextMenu.service.tier}
                </span>
              </div>
            </div>
            <span
              className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                contextMenu.service.health === 'HEALTHY'
                  ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800'
                  : contextMenu.service.health === 'DEGRADED'
                  ? 'text-amber-400 bg-amber-950/60 border border-amber-800'
                  : 'text-red-400 bg-red-950/60 border border-red-800'
              }`}
            >
              {contextMenu.service.health}
            </span>
          </div>

          {/* Quick Action: Inject Chaos */}
          <button
            onClick={() => {
              const svcId = contextMenu.service.id;
              setContextMenu(null);
              onInjectChaos?.(svcId);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded text-left hover:bg-red-950/30 text-[#e4e4e7] hover:text-red-300 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-red-950/40 border border-red-900/60 rounded group-hover:border-red-600 transition-colors">
                <Flame className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div>
                <span className="font-bold text-xs block text-red-200">Inject Chaos</span>
                <span className="text-[9px] text-[#717380] block">Target failure simulation</span>
              </div>
            </div>
            <span className="text-[9px] text-red-400/80 font-bold bg-red-950/60 px-1 py-0.5 rounded border border-red-900/40">
              SIM
            </span>
          </button>

          {/* Quick Action: Toggle Circuit Breaker */}
          <button
            onClick={() => {
              const svcId = contextMenu.service.id;
              setContextMenu(null);
              onToggleCircuitBreaker?.(svcId);
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded text-left hover:bg-[#1a1c25] text-[#e4e4e7] hover:text-white transition-colors group mt-0.5"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1 rounded border transition-colors ${
                  contextMenu.service.config.circuitBreakerEnabled
                    ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400'
                    : 'bg-amber-950/40 border-amber-900/60 text-amber-400'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-bold text-xs block">Toggle Circuit Breaker</span>
                <span className="text-[9px] text-[#717380] block">
                  Envoy outlier ejection
                </span>
              </div>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                contextMenu.service.config.circuitBreakerEnabled
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
                  : 'text-amber-400 bg-amber-950/60 border-amber-800'
              }`}
            >
              {contextMenu.service.config.circuitBreakerEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Quick Action: View Logs */}
          <button
            onClick={() => {
              const svc = contextMenu.service;
              setContextMenu(null);
              if (onViewLogs) {
                onViewLogs(svc);
              } else {
                setActiveLogsService(svc);
              }
            }}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded text-left hover:bg-[#1a1c25] text-[#e4e4e7] hover:text-white transition-colors group mt-0.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-cyan-950/40 border border-cyan-900/60 rounded group-hover:border-cyan-500 transition-colors">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <span className="font-bold text-xs block text-cyan-200">View Logs</span>
                <span className="text-[9px] text-[#717380] block">Live stdout & trace stream</span>
              </div>
            </div>
            <span className="text-[9px] text-cyan-400/80 font-bold bg-cyan-950/60 px-1 py-0.5 rounded border border-cyan-900/40">
              TAIL
            </span>
          </button>

          <div className="my-1 border-t border-[#21232d]" />

          {/* Utility: Copy Service ID */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.service.id);
              setCopiedId(true);
              setTimeout(() => {
                setCopiedId(false);
                setContextMenu(null);
              }, 600);
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left hover:bg-[#1a1c25] text-[#8e909d] hover:text-white transition-colors text-[11px]"
          >
            <div className="flex items-center gap-2">
              {copiedId ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-[#717380]" />
              )}
              <span>{copiedId ? 'Copied to Clipboard!' : 'Copy Service ID'}</span>
            </div>
            <span className="text-[9px] text-[#555763]">ID</span>
          </button>
        </div>
      )}

      {/* Service Logs Modal */}
      {activeLogsService && (
        <ServiceLogsModal
          service={activeLogsService}
          onClose={() => setActiveLogsService(null)}
          onToggleCircuitBreaker={onToggleCircuitBreaker}
        />
      )}
    </div>
  );
};
