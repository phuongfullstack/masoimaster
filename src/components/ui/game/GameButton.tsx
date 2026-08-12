'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type GameButtonVariant = 'primary' | 'danger' | 'secondary' | 'ghost'

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant
  size?: 'sm' | 'md' | 'lg'
}

// Canvas style: primary = nền ánh trăng + chữ tối + glow; các variant còn lại
// là outline trên nền trong suốt với viền đặc #2E2B3F.
const variantClasses: Record<GameButtonVariant, string> = {
  primary:
    'bg-[rgb(var(--ms-moon))] text-[rgb(var(--ms-on-moon))] shadow-game-blue hover:bg-[rgb(var(--ms-moon-hover))] active:brightness-95',
  danger:
    'bg-[rgb(var(--ms-wolf))]/[0.16] text-[#FF8A8A] border border-[rgb(var(--ms-wolf))] hover:bg-[rgb(var(--ms-wolf))]/[0.28]',
  secondary:
    'bg-transparent text-[rgb(var(--ms-moon))] border border-[rgb(var(--ms-border))] hover:border-[rgb(var(--ms-moon))]',
  ghost:
    'bg-transparent text-[rgb(var(--ms-text-secondary))] hover:text-[rgb(var(--ms-text-primary))] hover:bg-[rgb(var(--ms-card-hover))] shadow-none',
}

// Chiều cao/bo góc lấy thẳng từ canvas (42 / 46 / 52px — radius 14 / 16 / 18px).
const sizeClasses = {
  sm: 'h-[42px] px-4 text-[12.5px] rounded-[14px]',
  md: 'h-[46px] px-6 text-sm rounded-2xl',
  lg: 'h-[52px] px-8 text-[15px] rounded-[18px]',
}

const GameButton = forwardRef<HTMLButtonElement, GameButtonProps>(
  ({ variant = 'primary', size = 'md', className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-extrabold transition-all duration-100',
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
