'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type GameButtonVariant = 'primary' | 'danger' | 'secondary' | 'ghost'

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant
  size?: 'sm' | 'md' | 'lg'
}

// Canvas style: nền đậm hơn một tông, viền sáng mảnh + glow mềm cùng màu.
const variantClasses: Record<GameButtonVariant, string> = {
  primary:
    'bg-[rgb(var(--ms-brand))] text-white border border-white/15 shadow-game-green hover:brightness-110 active:brightness-95',
  danger:
    'bg-[rgb(var(--ms-wolf-dark))] text-white border border-white/15 shadow-game-red hover:brightness-110 active:brightness-95',
  secondary:
    'bg-[rgb(var(--ms-card-hover))] text-[rgb(var(--ms-moon))] border border-[rgba(167,197,235,0.35)] shadow-game-blue hover:brightness-125 active:brightness-95',
  ghost:
    'bg-transparent text-[rgb(var(--ms-text-secondary))] hover:text-[rgb(var(--ms-text-primary))] hover:bg-[rgb(var(--ms-card-hover))] shadow-none',
}

const sizeClasses = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
}

const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  ({ variant = 'primary', size = 'md', className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-bold transition-all duration-100',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

GameButton.displayName = 'GameButton'

export { GameButton, type GameButtonProps, type GameButtonVariant }
