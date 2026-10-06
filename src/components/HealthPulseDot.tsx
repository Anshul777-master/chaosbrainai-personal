import React from 'react';

export interface HealthPulseDotProps {
  score?: number;
  status?: string;
  hasActiveIncident?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export const HealthPulseDot: React.FC<HealthPulseDotProps> = ({
  score = 100,
  status = 'HEALTHY',
  hasActiveIncident = false,
  size = 'sm',
  className = '',
  title,
}) => {
  // Determine severity tier
  const isCritical = hasActiveIncident || score < 50 || status === 'CRITICAL' || status === 'FAILED';
  const isDegraded = !isCritical && (score < 80 || status === 'DEGRADED');
  const isRecovering = !isCritical && !isDegraded && status === 'RECOVERING';

  // Sizing definitions
  const sizeMap = {
    xs: { outer: 'w-2 h-2', inner: 'w-1.5 h-1.5' },
    sm: { outer: 'w-2.5 h-2.5', inner: 'w-2 h-2' },
    md: { outer: 'w-3 h-3', inner: 'w-2.5 h-2.5' },
    lg: { outer: 'w-3.5 h-3.5', inner: 'w-3 h-3' },
  };

  const currentSize = sizeMap[size] || sizeMap.sm;

  let pingColor = 'bg-emerald-400';
  let coreColor = 'bg-emerald-400';
  let glowClass = 'drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]';
  let animationClass = 'animate-pulse';
  let defaultTitle = `Healthy (${score}/100)`;

  if (isCritical) {
    pingColor = 'bg-red-500';
    coreColor = 'bg-red-500';
    glowClass = 'drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]';
    animationClass = 'animate-ping';
    defaultTitle = `Critical / Struggling (${score}/100) · Active Incident`;
  } else if (isDegraded) {
    pingColor = 'bg-amber-400';
    coreColor = 'bg-amber-400';
    glowClass = 'drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]';
    animationClass = 'animate-pulse';
    defaultTitle = `Degraded Performance (${score}/100)`;
  } else if (isRecovering) {
    pingColor = 'bg-cyan-400';
    coreColor = 'bg-cyan-400';
    glowClass = 'drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]';
    animationClass = 'animate-pulse';
    defaultTitle = `Recovering (${score}/100)`;
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 ${currentSize.outer} ${className}`}
      title={title || defaultTitle}
      aria-label={title || defaultTitle}
    >
      {/* Outer subtle expanding heartbeat pulse halo */}
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-65 ${pingColor} ${
          isCritical ? 'animate-ping duration-1000' : 'animate-pulse duration-2000'
        }`}
      />
      {/* Inner solid high-visibility luminous core dot */}
      <span
        className={`relative inline-flex rounded-full ${currentSize.inner} ${coreColor} ${glowClass} ${
          isCritical ? 'animate-pulse' : ''
        }`}
      />
    </span>
  );
};
