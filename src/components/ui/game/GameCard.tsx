'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GameCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glow?: string
  hover?: boolean
}

export function GameCard({ children, glow, hover = false, className, ...props }: GameCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-[rgb(var(--ms-card))] border border-white/[0.06] shadow-game-sm p-5',
        hover && 'hover:bg-[rgb(var(--ms-card-hover))] transition-colors duration-150 cursor-pointer',
        glow && `glow-${glow}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function GameCardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function GameCardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-bold text-[rgb(var(--ms-text-primary))]', className)} {...props}>
      {children}
    </h3>
  )
}

export function GameCardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}
