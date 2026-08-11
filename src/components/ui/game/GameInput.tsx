'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface GameInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

const GameInput = forwardRef<HTMLInputElement, GameInputProps>(
  ({ icon, className, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--ms-text-muted))]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-2xl bg-[rgb(var(--ms-card))] text-[rgb(var(--ms-text-primary))] placeholder:text-[rgb(var(--ms-text-muted))]',
            'border-2 border-white/[0.08] shadow-game-sm',
            'focus:border-[rgb(var(--ms-brand))] focus:outline-none focus:shadow-[0_4px_0_0_rgb(var(--ms-brand-dark))]',
            'transition-all duration-150',
            'font-medium',
            icon ? 'pl-11 pr-4' : 'px-4',
            'py-3 text-base',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
      </div>
    )
  }
)

GameInput.displayName = 'GameInput'

export { GameInput }
