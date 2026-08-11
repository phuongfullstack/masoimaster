'use client'

import { cn } from '@/lib/utils'

interface GameProgressProps {
  value: number // 0-100
  max?: number
  color?: string
  height?: number
  showLabel?: boolean
  label?: string
  animated?: boolean
  className?: string
}

export function GameProgress({
  value,
  max = 100,
  color,
  height = 12,
  showLabel = false,
  label,
  animated = true,
  className,
}: GameProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const bgColor = color || 'rgb(var(--ms-brand))'

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm font-medium text-[rgb(var(--ms-text-secondary))]">
            {label || ''}
          </span>
          <span className="text-sm font-bold text-[rgb(var(--ms-text-primary))]">
            {Math.round(pct)}%
          </span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden bg-[rgb(var(--ms-surface))]"
        style={{ height }}
      >
        <div
          className={cn(
            'h-full rounded-full',
            animated && 'transition-all duration-500 ease-out',
          )}
          style={{
            width: `${pct}%`,
            backgroundColor: bgColor,
          }}
        />
      </div>
    </div>
  )
}

// Circular timer variant
interface GameTimerCircleProps {
  timeLeft: number
  totalTime: number
  size?: number
  strokeWidth?: number
  color?: string
  urgent?: boolean
  className?: string
}

export function GameTimerCircle({
  timeLeft,
  totalTime,
  size = 60,
  strokeWidth = 4,
  color,
  urgent = false,
  className,
}: GameTimerCircleProps) {
  const pct = Math.min(1, Math.max(0, timeLeft / totalTime))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - pct)
  const strokeColor = urgent ? 'rgb(var(--ms-wolf))' : color || 'rgb(var(--ms-brand))'

  return (
    <div className={cn('relative inline-flex items-center justify-center', urgent && 'animate-glow-pulse', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--ms-surface))"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={urgent ? '' : 'transition-all duration-200 ease-linear'}
        />
      </svg>
      <span className={cn(
        'absolute text-sm font-bold',
        urgent ? 'text-[rgb(var(--ms-wolf))]' : 'text-[rgb(var(--ms-text-primary))]',
      )}>
        {timeLeft}s
      </span>
    </div>
  )
}
