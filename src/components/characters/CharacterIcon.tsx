'use client'

import { Werewolf } from './Werewolf'
import { WhiteWerewolf } from './WhiteWerewolf'
import { AlphaWolf } from './AlphaWolf'
import { Seer } from './Seer'
import { Witch } from './Witch'
import { Guard } from './Guard'
import { Hunter } from './Hunter'
import { Cupid } from './Cupid'
import { Villager } from './Villager'
import { Elder } from './Elder'
import { Doctor } from './Doctor'
import { RoleCrest } from './RoleCrest'
import type { CharacterProps, CharacterState } from './_shared'
import type { ComponentType } from 'react'

type CharacterSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero'

interface CharacterIconProps {
  role: string
  size?: CharacterSize
  state?: CharacterState
  className?: string
  animated?: boolean
  glow?: boolean
  /** Accessible name. Omit for decorative use next to a visible role label. */
  title?: string
}

const SIZE_MAP: Record<CharacterSize, number> = {
  xs: 20,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
  hero: 200,
}

/** At or below this the portrait's face collapses, so we swap in the crest. */
const CREST_THRESHOLD = 36

const GLOW_CLASS: Record<string, string> = {
  werewolf: 'glow-wolf',
  white_werewolf: 'glow-white-wolf',
  alpha_wolf: 'glow-alpha-wolf',
  seer: 'glow-seer',
  witch: 'glow-witch',
  guard: 'glow-guard',
  hunter: 'glow-hunter',
  cupid: 'glow-cupid',
  villager: 'glow-villager',
  elder: 'glow-elder',
  doctor: 'glow-doctor',
  wolf_seer: 'glow-wolf-seer',
  cursed_wolf: 'glow-cursed-wolf',
  detective: 'glow-detective',
  medium: 'glow-medium',
  raven: 'glow-raven',
  chief: 'glow-chief',
  jester: 'glow-jester',
}

const CHARACTERS: Record<string, ComponentType<CharacterProps>> = {
  werewolf: Werewolf,
  white_werewolf: WhiteWerewolf,
  alpha_wolf: AlphaWolf,
  seer: Seer,
  witch: Witch,
  guard: Guard,
  hunter: Hunter,
  cupid: Cupid,
  villager: Villager,
  elder: Elder,
  doctor: Doctor,
}

export function CharacterIcon({
  role,
  size = 'md',
  state = 'idle',
  className = '',
  animated = false,
  glow = false,
  title,
}: CharacterIconProps) {
  const px = SIZE_MAP[size]
  const glowClass = glow ? GLOW_CLASS[role] || '' : ''
  // Vai chưa có portrait (7 vai mới) → dùng crest ở MỌI kích thước, tuyệt đối
  // không fallback sang portrait Dân Thường (lộ/nhầm vai).
  const Component = CHARACTERS[role]

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${animated ? 'animate-float' : ''} ${glowClass} ${className}`}
      style={{ width: px, height: px }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {px <= CREST_THRESHOLD || !Component ? (
        <RoleCrest role={role} size={px <= CREST_THRESHOLD ? px : Math.round(px * 0.72)} tinted />
      ) : (
        <Component state={state} width={px} height={px} />
      )}
    </span>
  )
}

export type { CharacterState, CharacterSize }
export { GLOW_CLASS, CHARACTERS }
