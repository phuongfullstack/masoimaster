'use client'

import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GameCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  glow?: string
  hover?: boolean
}

export function GameCard({ children, glow, hover = false, className, style, ...props }: GameCardProps) {
  return (
    <div
      className={cn(
        // Canvas card: gradient tối 155deg + viền #353251 mờ, glow mềm.
        'rounded-2xl border shadow-game-sm p-5',
        hover && 'hover:brightness-110 transition-[filter] duration-150 cursor-pointer',
        glow && `glow-${glow}`,
        className,
      )}
      style={{
        background: 'linear-gradient(155deg, rgb(var(--ms-bg-secondary)), rgb(var(--ms-card-hover)))',
        borderColor: 'rgba(53, 50, 81, 0.5)',
        ...style,
      }}
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
