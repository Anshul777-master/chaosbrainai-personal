/**
 * Utility functions for health score heatmap color interpolation
 * Maps node health scores (0 - 100) onto a color gradient from red to emerald.
 */

export interface HeatmapColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  rgb: string;
  rgba: (alpha: number) => string;
  borderClass: string;
  textClass: string;
  bgClass: string;
}

/**
 * Calculates a continuous gradient from Red (0) -> Amber (50) -> Lime (75) -> Emerald (100)
 */
export function getHealthScoreColor(score: number): HeatmapColor {
  const clamped = Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 100)));
  const t = clamped / 100;

  let r = 16;
  let g = 185;
  let b = 129;

  if (t <= 0.25) {
    // 0.0 -> 0.25 : Crimson Red (#ef4444 = 239, 68, 68) -> Deep Orange (#f97316 = 249, 115, 22)
    const factor = t / 0.25;
    r = Math.round(239 + (249 - 239) * factor);
    g = Math.round(68 + (115 - 68) * factor);
    b = Math.round(68 + (22 - 68) * factor);
  } else if (t <= 0.5) {
    // 0.25 -> 0.5 : Deep Orange (#f97316 = 249, 115, 22) -> Warm Amber (#f59e0b = 245, 158, 11)
    const factor = (t - 0.25) / 0.25;
    r = Math.round(249 + (245 - 249) * factor);
    g = Math.round(115 + (158 - 115) * factor);
    b = Math.round(22 + (11 - 22) * factor);
  } else if (t <= 0.75) {
    // 0.5 -> 0.75 : Warm Amber (#f59e0b = 245, 158, 11) -> Chartreuse / Lime (#84cc16 = 132, 204, 22)
    const factor = (t - 0.5) / 0.25;
    r = Math.round(245 + (132 - 245) * factor);
    g = Math.round(158 + (204 - 158) * factor);
    b = Math.round(11 + (22 - 11) * factor);
  } else {
    // 0.75 -> 1.0 : Lime (#84cc16 = 132, 204, 22) -> Pure Emerald (#10b981 = 16, 185, 129)
    const factor = (t - 0.75) / 0.25;
    r = Math.round(132 + (16 - 132) * factor);
    g = Math.round(204 + (185 - 204) * factor);
    b = Math.round(22 + (129 - 22) * factor);
  }

  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const rgba = (alpha: number) => `rgba(${r}, ${g}, ${b}, ${alpha})`;

  let borderClass = 'border-emerald-500/60';
  let textClass = 'text-emerald-400';
  let bgClass = 'bg-emerald-950/40';

  if (clamped < 35) {
    borderClass = 'border-red-500/70';
    textClass = 'text-red-400';
    bgClass = 'bg-red-950/50';
  } else if (clamped < 65) {
    borderClass = 'border-amber-500/70';
    textClass = 'text-amber-400';
    bgClass = 'bg-amber-950/50';
  } else if (clamped < 85) {
    borderClass = 'border-lime-500/70';
    textClass = 'text-lime-400';
    bgClass = 'bg-lime-950/50';
  }

  return { r, g, b, hex, rgb, rgba, borderClass, textClass, bgClass };
}
