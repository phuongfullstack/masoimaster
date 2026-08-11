'use client'

import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface GameBadgeProps extends HTMLAttributes<HTMLDivElement> {
  color?: string // hex color e.g. '#ff4b4b'
  size?: 'sm' | 'md'
}

export function GameBadge({ color, size = 'md', className, children, ...props }: GameBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 font-bold rounded-full',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        className,
      )}
      style={{
        backgroundColor: color ? `${color}22` : 'rgb(var(--ms-surface))',
        color: color || 'rgb(var(--ms-text-primary))',
        border: color ? `1px solid ${color}44` : '1px solid rgb(var(--ms-surface))',
      }}
      {...props}
    >
      {children}
    </div>
  )
}
