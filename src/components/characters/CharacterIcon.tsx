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
  const Component = CHARACTERS[role] ?? CHARACTERS.villager

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${animated ? 'animate-float' : ''} ${glowClass} ${className}`}
      style={{ width: px, height: px }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {px <= CREST_THRESHOLD ? (
        <RoleCrest role={role} size={px} tinted />
      ) : (
        <Component state={state} width={px} height={px} />
      )}
    </span>
  )
}

export type { CharacterState, CharacterSize }
export { GLOW_CLASS, CHARACTERS }
