'use client'

import { cn } from '@/lib/utils'
import { CharacterIcon } from '@/components/characters/CharacterIcon'

interface GameAvatarProps {
  index: number
  username?: string
  role?: string
  isAlive?: boolean
  isHost?: boolean
  isSelected?: boolean
  showCharacter?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}

const SIZE_PX = { sm: 40, md: 52, lg: 68 }

export function GameAvatar({
  index,
  username,
  role,
  isAlive = true,
  isHost = false,
  isSelected = false,
  showCharacter = false,
  size = 'md',
  onClick,
  className,
}: GameAvatarProps) {
  const px = SIZE_PX[size]

  return (
    <div
      className={cn(
        'relative inline-flex flex-col items-center gap-1',
        onClick && 'cursor-pointer',
        !isAlive && 'opacity-40',
        className,
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center overflow-hidden transition-all duration-150',
          'border-2',
          isSelected ? 'border-[rgb(var(--ms-moon))] shadow-game-blue scale-110' : 'border-[rgb(var(--ms-border))]',
          isHost && 'ring-2 ring-[rgb(var(--ms-white-wolf))] ring-offset-2 ring-offset-[rgb(var(--ms-bg-primary))]',
        )}
        style={{ width: px, height: px, backgroundColor: 'rgb(var(--ms-card))' }}
      >
        {showCharacter && role ? (
          <CharacterIcon role={role} size={size === 'sm' ? 'sm' : size === 'md' ? 'sm' : 'md'} />
        ) : (
          <span className="text-white font-bold" style={{ fontSize: px * 0.35 }}>
            {index + 1}
          </span>
        )}
      </div>
      {username && (
        <span className={cn(
          'text-center leading-tight max-w-[60px] truncate',
          size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm',
          !isAlive ? 'line-through text-[rgb(var(--ms-text-muted))]' : 'text-[rgb(var(--ms-text-secondary))]',
        )}>
          {username}
        </span>
      )}
    </div>
  )
}
