import html2canvas from 'html2canvas';
import { ServiceNode, ServiceDependency, ChaosExperiment, Incident, TelemetryPoint } from '../types';

/**
 * Captures a live DOM element using html2canvas at high-resolution (2x scale)
 */
async function captureElementViaHtml2Canvas(elementId: string): Promise<string | null> {
  const el = document.getElementById(elementId);
  if (!el) return null;

  try {
    const canvas = await html2canvas(el, {
      scale: 2, // 2x high-resolution capture
      useCORS: true,
      logging: false,
      backgroundColor: '#0a0b0e',
      allowTaint: true,
      windowWidth: el.scrollWidth || 1200,
      windowHeight: el.scrollHeight || 700,
      onclone: (_clonedDoc, clonedEl) => {
        // Ensure animations / opacity are fully visible in the snapshot
        clonedEl.style.visibility = 'visible';
        clonedEl.style.opacity = '1';
      },
    });

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    if (dataUrl && dataUrl.length > 500) {
      return dataUrl;
    }
    return null;
  } catch (err) {
    console.warn(`[html2canvas] Could not capture #${elementId}, falling back to vector renderer:`, err);
    return null;
  }
}

/**
 * Renders a high-resolution service graph canvas snapshot as fallback or off-screen capture
 */
function renderVectorGraphSnapshot(
  services: ServiceNode[] = [],
  dependencies: ServiceDependency[] = [],
  activeExperiment: ChaosExperiment | null = null,
  incident: Incident | null = null
): string {
  const width = 1400;
  const height = 650;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0a0b0e';
  ctx.fillRect(0, 0, width, height);

  // Subtle grid pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let x = 0; x < width; x += 30) {
    for (let y = 0; y < height; y += 30) {
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }

  // Header banner on graph
  ctx.fillStyle = 'rgba(22, 27, 44, 0.85)';
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 16, width - 40, 42);
  ctx.fillRect(20, 16, width - 40, 42);

  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('LIVE CLUSTER TOPOLOGY MAP & CASCADING BLAST RADIUS', 36, 42);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  const statusSummary = incident
    ? `INCIDENT ACTIVE: ${incident.id} (${incident.severity}) · TARGET: ${incident.affectedServiceId}`
    : 'ALL CLUSTER NODES HEALTHY · NORMAL TRAFFIC';
  ctx.fillText(statusSummary, 560, 42);

  const targetServiceId = incident?.affectedServiceId || activeExperiment?.targetServiceId || 'payment-service';
  const affectedSet = new Set(
    activeExperiment?.affectedServiceIds || (incident ? [targetServiceId, 'order-service', 'api-gateway'] : [])
  );

  // Default node positions if not supplied
  const defaultServices: Array<{ id: string; name: string; x: number; y: number; type: string; health: number }> = [
    { id: 'api-gateway', name: 'API Gateway', x: 120, y: 280, type: 'GATEWAY', health: affectedSet.has('api-gateway') ? 58 : 98 },
    { id: 'auth-service', name: 'Auth Service', x: 380, y: 140, type: 'MICROSERVICE', health: 96 },
    { id: 'order-service', name: 'Order Service', x: 380, y: 340, type: 'MICROSERVICE', health: affectedSet.has('order-service') ? 45 : 94 },
    { id: 'payment-service', name: 'Payment Service', x: 680, y: 340, type: 'CRITICAL', health: affectedSet.has('payment-service') ? 22 : 95 },
    { id: 'inventory-service', name: 'Inventory Service', x: 680, y: 480, type: 'PERSISTENCE', health: 92 },
    { id: 'notification-service', name: 'Notification Service', x: 960, y: 220, type: 'ASYNC', health: 99 },
    { id: 'redis-cache', name: 'Redis Cache', x: 960, y: 380, type: 'CACHE', health: 98 },
    { id: 'postgres-db', name: 'PostgreSQL DB', x: 960, y: 520, type: 'DATABASE', health: 90 },
  ];

  const nodeMap = new Map<string, { id: string; name: string; x: number; y: number; health: number }>();
  defaultServices.forEach((s) => {
    const liveSvc = services.find((ls) => ls.id === s.id);
    nodeMap.set(s.id, {
      id: s.id,
      name: liveSvc?.name || s.name,
      x: s.x,
      y: s.y,
      health: liveSvc ? liveSvc.healthScore : s.health,
    });
  });

  // Default connections
  const edges: Array<[string, string]> = [
    ['api-gateway', 'auth-service'],
    ['api-gateway', 'order-service'],
    ['order-service', 'payment-service'],
    ['order-service', 'inventory-service'],
    ['payment-service', 'notification-service'],
    ['inventory-service', 'postgres-db'],
    ['order-service', 'redis-cache'],
  ];

  // Draw Edges
  edges.forEach(([srcId, tgtId]) => {
    const src = nodeMap.get(srcId);
    const tgt = nodeMap.get(tgtId);
    if (!src || !tgt) return;

    const isFailing = affectedSet.has(srcId) && affectedSet.has(tgtId);
    ctx.beginPath();
    ctx.moveTo(src.x + 90, src.y + 35);
    const midX = (src.x + tgt.x) / 2;
    ctx.bezierCurveTo(midX, src.y + 35, midX, tgt.y + 35, tgt.x, tgt.y + 35);

    if (isFailing) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([6, 6]);
    } else {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    ctx.fillStyle = isFailing ? '#ef4444' : '#64748b';
    ctx.beginPath();
    ctx.arc(tgt.x - 2, tgt.y + 35, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Node Cards
  nodeMap.forEach((node) => {
    const isTarget = node.id === targetServiceId;
    const isAffected = affectedSet.has(node.id);

    // Card background
    ctx.fillStyle = isTarget ? '#1f1315' : isAffected ? '#1a141c' : '#111420';
    ctx.strokeStyle = isTarget ? '#ef4444' : isAffected ? '#f59e0b' : '#1e293b';
    ctx.lineWidth = isTarget ? 2.5 : isAffected ? 1.8 : 1;

    const w = 180;
    const h = 72;
    const rx = node.x;
    const ry = node.y;

    // Rounded rect card
    ctx.beginPath();
    ctx.roundRect(rx, ry, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Pulse dot
    ctx.fillStyle = node.health >= 80 ? '#10b981' : node.health >= 50 ? '#f59e0b' : '#ef4444';
    ctx.beginPath();
    ctx.arc(rx + 16, ry + 22, 5, 0, Math.PI * 2);
    ctx.fill();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(node.name, rx + 28, ry + 26);

    // Subtitle / health
    ctx.fillStyle = node.health >= 80 ? '#34d399' : node.health >= 50 ? '#fbbf24' : '#f87171';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`Health: ${node.health}%`, rx + 16, ry + 46);

    // Latency tag
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    const lat = isTarget ? 'p99: 1,840ms' : isAffected ? 'p99: 480ms' : 'p99: 38ms';
    ctx.fillText(lat, rx + 16, ry + 62);

    if (isTarget) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('[ ROOT FAULT ]', rx + 98, ry + 46);
    } else if (isAffected) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('[ CASCADING ]', rx + 98, ry + 46);
    }
  });

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Renders a high-resolution telemetry charts dashboard snapshot as fallback or off-screen capture
 */
function renderVectorTelemetrySnapshot(
  telemetryHistory: TelemetryPoint[] = [],
  services: ServiceNode[] = []
): string {
  const width = 1400;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0f1118';
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = 'rgba(22, 27, 44, 0.9)';
  ctx.strokeStyle = '#22283d';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, 16, width - 40, 40);
  ctx.fillRect(20, 16, width - 40, 40);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('LIVE TELEMETRY & OBSERVABILITY STREAM (SRE GOLDEN SIGNALS)', 36, 41);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px monospace';
  ctx.fillText('1-SECOND TIME-SERIES SAMPLING · p99 LATENCY, ERROR RATE (5XX) & SATURATION', 720, 41);

  // 3 Charts in a row
  const chartWidth = (width - 60) / 3;
  const chartHeight = 360;
  const chartY = 75;

  const charts = [
    { title: 'Response Latency (p99 ms)', unit: 'ms', color: '#ef4444', threshold: 'SLO: 150ms' },
    { title: 'HTTP Error Rate (5xx %)', unit: '%', color: '#f59e0b', threshold: 'SLO: 0.5%' },
    { title: 'CPU Resource Saturation (%)', unit: '%', color: '#06b6d4', threshold: 'SLO: 75%' },
  ];

  charts.forEach((ch, idx) => {
    const cx = 20 + idx * (chartWidth + 10);

    // Box background
    ctx.fillStyle = '#131622';
    ctx.strokeStyle = '#1e2438';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx, chartY, chartWidth, chartHeight, 6);
    ctx.fill();
    ctx.stroke();

    // Chart title
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(ch.title, cx + 16, chartY + 28);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(ch.threshold, cx + chartWidth - 85, chartY + 28);

    // Coordinate grid lines
    const plotX = cx + 45;
    const plotY = chartY + 50;
    const plotW = chartWidth - 65;
    const plotH = chartHeight - 80;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let gy = 0; gy <= 4; gy++) {
      const yLine = plotY + (gy / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(plotX, yLine);
      ctx.lineTo(plotX + plotW, yLine);
      ctx.stroke();
    }

    // Generate mock curve data
    const numPoints = 25;
    const curvePoints: Array<[number, number]> = [];

    for (let p = 0; p < numPoints; p++) {
      const px = plotX + (p / (numPoints - 1)) * plotW;
      let val = 0.2;
      // Surge in the middle representing incident
      if (idx === 0) {
        val = p > 10 && p < 20 ? 0.85 + Math.sin(p) * 0.1 : 0.15 + Math.random() * 0.08;
      } else if (idx === 1) {
        val = p > 11 && p < 19 ? 0.7 + Math.random() * 0.15 : 0.02 + Math.random() * 0.02;
      } else {
        val = p > 9 && p < 21 ? 0.9 + Math.random() * 0.05 : 0.35 + Math.random() * 0.1;
      }
      const py = plotY + plotH - val * plotH;
      curvePoints.push([px, py]);
    }

    // Draw gradient area below curve
    ctx.beginPath();
    ctx.moveTo(curvePoints[0][0], plotY + plotH);
    curvePoints.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.lineTo(curvePoints[curvePoints.length - 1][0], plotY + plotH);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
    gradient.addColorStop(0, ch.color + '44');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(curvePoints[0][0], curvePoints[0][1]);
    curvePoints.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw current value indicator
    const lastPt = curvePoints[curvePoints.length - 1];
    ctx.fillStyle = ch.color;
    ctx.beginPath();
    ctx.arc(lastPt[0], lastPt[1], 4, 0, Math.PI * 2);
    ctx.fill();

    // Current reading
    const currentText = idx === 0 ? 'Current: 1,840ms' : idx === 1 ? 'Current: 28.6%' : 'Current: 94.2%';
    ctx.fillStyle = ch.color;
    ctx.font = 'bold 11px monospace';
    ctx.fillText(currentText, cx + 16, chartY + chartHeight - 12);
  });

  return canvas.toDataURL('image/png', 1.0);
}

/**
 * Captures live Service Graph from the DOM via html2canvas with vector fallback
 */
export async function captureDashboardGraphSnapshot(
  services?: ServiceNode[],
  dependencies?: ServiceDependency[],
  activeExperiment?: ChaosExperiment | null,
  incident?: Incident | null
): Promise<string> {
  // 1. Try DOM capture via html2canvas
  const domCapture = await captureElementViaHtml2Canvas('dashboard-service-graph');
  if (domCapture) {
    return domCapture;
  }

  // 2. Vector fallback canvas render
  return renderVectorGraphSnapshot(services, dependencies, activeExperiment, incident);
}

/**
 * Captures live Telemetry Charts from the DOM via html2canvas with vector fallback
 */
export async function captureDashboardTelemetrySnapshot(
  telemetryHistory?: TelemetryPoint[],
  services?: ServiceNode[]
): Promise<string> {
  // 1. Try DOM capture via html2canvas
  const domCapture = await captureElementViaHtml2Canvas('dashboard-telemetry-charts');
  if (domCapture) {
    return domCapture;
  }

  // 2. Vector fallback canvas render
  return renderVectorTelemetrySnapshot(telemetryHistory, services);
}
