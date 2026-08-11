'use client'

import { ROLE_PALETTE } from './_shared'
import type { SVGProps } from 'react'

// ============================================================
// Role Crests — the small-size tier of the art system.
//
// A portrait carries face, headwear and prop; below ~28px all three collapse
// into a smudge. Crests are single filled marks on a 24×24 grid, solid enough
// to survive 16px, and they inherit `currentColor` so a badge or chip can tint
// them from its own text colour. Use these in lists, chips, badges and legends;
// use <CharacterIcon> for reveals, avatars and anything ≥48px.
// ============================================================

export type CrestRole =
  | 'werewolf'
  | 'white_werewolf'
  | 'alpha_wolf'
  | 'seer'
  | 'witch'
  | 'guard'
  | 'hunter'
  | 'cupid'
  | 'villager'
  | 'elder'
  | 'doctor'

// Shared wolf-head outline: two ear notches over a tapering muzzle.
const WOLF_HEAD =
  'M 12 22 C 7 19.8 3.6 15.6 3.6 11 L 3.6 2.4 L 8.2 7.2 L 15.8 7.2 L 20.4 2.4 L 20.4 11 C 20.4 15.6 17 19.8 12 22 Z'

const CRESTS: Record<CrestRole, React.ReactNode> = {
  werewolf: (
    <>
      <path d={WOLF_HEAD} fill="currentColor" />
      <circle cx="8.6" cy="12.2" r="1.9" fill="var(--crest-bg, #16182b)" />
      <circle cx="15.4" cy="12.2" r="1.9" fill="var(--crest-bg, #16182b)" />
      <path d="M 9.2 16.8 L 12 20 L 14.8 16.8 Z" fill="var(--crest-bg, #16182b)" />
    </>
  ),

  white_werewolf: (
    <>
      <path d={WOLF_HEAD} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="8.8" cy="12" r="1.4" fill="currentColor" />
      <circle cx="15.2" cy="12" r="1.4" fill="currentColor" />
      {/* fracture — marks the wolf that turns on its own pack */}
      <path
        d="M 12 6.6 L 10.6 10 L 13 11.4 L 11.2 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  alpha_wolf: (
    <>
      <path
        d="M 12 22.4 C 7.4 20.3 4.2 16.3 4.2 12 L 4.2 6.4 L 8.4 9.6 L 15.6 9.6 L 19.8 6.4 L 19.8 12 C 19.8 16.3 16.6 20.3 12 22.4 Z"
        fill="currentColor"
      />
      {/* crown */}
      <path d="M 4.6 7.6 L 6.4 1.6 L 9.4 5.2 L 12 0.8 L 14.6 5.2 L 17.6 1.6 L 19.4 7.6 Z" fill="currentColor" />
      <circle cx="8.9" cy="13.8" r="1.8" fill="var(--crest-bg, #16182b)" />
      <circle cx="15.1" cy="13.8" r="1.8" fill="var(--crest-bg, #16182b)" />
      <path d="M 9.4 17.8 L 12 20.8 L 14.6 17.8 Z" fill="var(--crest-bg, #16182b)" />
    </>
  ),

  seer: (
    <>
      <path d="M 12 5.4 C 17.4 5.4 21.4 9 22.6 12 C 21.4 15 17.4 18.6 12 18.6 C 6.6 18.6 2.6 15 1.4 12 C 2.6 9 6.6 5.4 12 5.4 Z" fill="currentColor" />
      <circle cx="12" cy="12" r="3.6" fill="var(--crest-bg, #16182b)" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="12" y1="3.4" x2="12" y2="0.8" />
        <line x1="4.6" y1="6" x2="2.8" y2="4.2" />
        <line x1="19.4" y1="6" x2="21.2" y2="4.2" />
      </g>
    </>
  ),

  witch: (
    <>
      <path
        d="M 9.4 2 L 14.6 2 L 14.6 8.6 L 19.6 18.4 C 20.5 20.1 19.4 22 17.5 22 L 6.5 22 C 4.6 22 3.5 20.1 4.4 18.4 L 9.4 8.6 Z"
        fill="currentColor"
      />
      <rect x="8.4" y="1" width="7.2" height="2.4" rx="1.2" fill="currentColor" />
      <circle cx="10.2" cy="17.4" r="1.7" fill="var(--crest-bg, #16182b)" />
      <circle cx="14.4" cy="19" r="1.2" fill="var(--crest-bg, #16182b)" />
      <circle cx="14" cy="15" r="1" fill="var(--crest-bg, #16182b)" />
    </>
  ),

  guard: (
    <>
      <path d="M 12 1.4 L 20.8 4.6 L 20.8 12 C 20.8 17.4 16.8 21.2 12 22.6 C 7.2 21.2 3.2 17.4 3.2 12 L 3.2 4.6 Z" fill="currentColor" />
      <rect x="10.8" y="7" width="2.4" height="10.4" rx="1.2" fill="var(--crest-bg, #16182b)" />
      <rect x="7" y="10.8" width="10" height="2.4" rx="1.2" fill="var(--crest-bg, #16182b)" />
    </>
  ),

  hunter: (
    <>
      {/* bow — heavy limbs, the string stays thin but the bow carries the mark */}
      <path
        d="M 5.6 1.8 C 12.4 5.2 12.4 18.8 5.6 22.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <line x1="5.6" y1="2.6" x2="5.6" y2="21.4" stroke="currentColor" strokeWidth="1.5" />
      {/* arrow */}
      <line x1="5" y1="12" x2="17" y2="12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M 15 6.6 L 23 12 L 15 17.4 Z" fill="currentColor" />
    </>
  ),

  cupid: (
    <>
      <path
        d="M 12 21 C 4.4 15.6 2 12.4 2 9.2 C 2 6.2 4.3 4 7.1 4 C 9 4 10.8 5 12 6.8 C 13.2 5 15 4 16.9 4 C 19.7 4 22 6.2 22 9.2 C 22 12.4 19.6 15.6 12 21 Z"
        fill="currentColor"
      />
      {/* arrow through the pair */}
      <line
        x1="2.6"
        y1="20.4"
        x2="21"
        y2="4.4"
        stroke="var(--crest-bg, #16182b)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <line x1="4" y1="19.2" x2="19.6" y2="5.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </>
  ),

  villager: (
    <>
      {/* nón lá */}
      <path d="M 12 1.6 L 21.8 17.2 C 15.4 20 8.6 20 2.2 17.2 Z" fill="currentColor" />
      <path
        d="M 2.2 17.2 C 8.6 20 15.4 20 21.8 17.2 C 15.4 22.4 8.6 22.4 2.2 17.2 Z"
        fill="currentColor"
      />
      <g stroke="var(--crest-bg, #16182b)" strokeWidth="1" opacity="0.5">
        <line x1="12" y1="4" x2="6.6" y2="17.4" />
        <line x1="12" y1="4" x2="17.4" y2="17.4" />
      </g>
    </>
  ),

  elder: (
    <>
      {/* Tapered beard under heavy brows. The earlier rounded version read as a
          blank egg at 16px — the point and the notch are what say "elder". */}
      <path
        d="M 4.6 6.2 C 4.6 3 7.9 1 12 1 C 16.1 1 19.4 3 19.4 6.2 L 19.4 9.4 C 19.4 14 17.6 17.6 15.4 19.6 L 12 23 L 8.6 19.6 C 6.4 17.6 4.6 14 4.6 9.4 Z"
        fill="currentColor"
      />
      {/* brows */}
      <path
        d="M 6.6 6.4 L 10.6 7.6 M 17.4 6.4 L 13.4 7.6"
        stroke="var(--crest-bg, #16182b)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* moustache split, carved through the beard */}
      <path
        d="M 12 11.6 L 12 19"
        stroke="var(--crest-bg, #16182b)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M 7.4 11.4 C 9.2 13.4 14.8 13.4 16.6 11.4"
        fill="none"
        stroke="var(--crest-bg, #16182b)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),

  doctor: (
    <>
      <path
        d="M 9 1.6 L 15 1.6 L 15 9 L 22.4 9 L 22.4 15 L 15 15 L 15 22.4 L 9 22.4 L 9 15 L 1.6 15 L 1.6 9 L 9 9 Z"
        fill="currentColor"
      />
      {/* Pulse trace. Kept to three strokes — a finer zigzag closed up at 16px
          and made the cross look chipped. */}
      <path
        d="M 3.4 12 L 8.4 12 L 10.6 7.4 L 13.4 16.6 L 15.4 12 L 20.6 12"
        fill="none"
        stroke="var(--crest-bg, #16182b)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
}

export interface RoleCrestProps extends Omit<SVGProps<SVGSVGElement>, 'role'> {
  role: string
  size?: number
  /** Tint from the role palette instead of inheriting currentColor. */
  tinted?: boolean
  /**
   * Colour punched through the crest for knocked-out details (eyes, cross bars).
   * Set this to the surface the crest sits on. Defaults to the dark card token.
   */
  cutout?: string
  title?: string
}

export function RoleCrest({
  role,
  size = 20,
  tinted = false,
  cutout,
  title,
  style,
  ...props
}: RoleCrestProps) {
  const mark = CRESTS[role as CrestRole] ?? CRESTS.villager
  const palette = ROLE_PALETTE[role]

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      style={{
        color: tinted && palette ? palette.accent : undefined,
        ['--crest-bg' as string]: cutout ?? 'rgb(var(--ms-card))',
        ...style,
      }}
      {...props}
    >
      {title && <title>{title}</title>}
      {mark}
    </svg>
  )
}
