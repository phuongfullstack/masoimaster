'use client'

import { useId } from 'react'
import type { SVGProps } from 'react'

// ============================================================
// Ma Sói — Character Art System (line-art / "thỏ bảy màu" treatment)
//
// This borrows the *drawing style* only. Each role is its own character —
// wolves are wolves, villagers are people. What is shared is how they are
// drawn, not what they are.
//
// Hard rules. Breaking one drops the drawing out of the set:
//
//   1. BLACK OUTLINE ON EVERYTHING, one consistent weight. This is the
//      single strongest signal of the style.
//   2. Eyes are small SOLID BLACK dots. No whites, no pupils, no
//      highlights, no eyebrows in the neutral pose.
//   3. No mouth at rest. A mouth appears only to carry an expression.
//   4. Flat fills only — no gradients, no shading, no rim light.
//   5. Few, large shapes. Detail below ~4 units gets cut.
//   6. Chibi proportions: head ~50% of the figure, small body, small feet.
//
// Frame (viewBox 0 0 100 100):
//
//   y  4–30   headwear zone
//   y  9–59   head       (cx 50, cy 34, r 25)
//   y 38      eye line   (x 42 / 58)
//   y 46      blush line
//   y 56–86   body
//   y 84–93   feet
//   x 66–96   prop zone
// ============================================================

export type CharacterState = 'idle' | 'happy' | 'sad' | 'action'

export interface CharacterProps extends SVGProps<SVGSVGElement> {
  state?: CharacterState
}

/** clipPath ids must be unique per instance; useId emits colons, illegal in url(#…). */
export function useArtId() {
  return useId().replace(/[^a-zA-Z0-9]/g, '')
}

// ---- Style constants ----
export const LINE = '#20202a'
export const SW = 2.4
export const SKIN = '#ffd9b8'
export const BLUSH_COLOR = '#f7a3bb'

/** Spread onto any shape so it inherits the house outline. */
export const outline = {
  stroke: LINE,
  strokeWidth: SW,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
}

// ---- Flat costume palette ----
export const C = {
  red: '#ff5a5a', redDark: '#d63b3b',
  blue: '#5bb8f5', blueDark: '#3d94cf',
  yellow: '#ffcc4d', yellowDark: '#e0a721',
  purple: '#b98bf0', purpleDark: '#9366c9',
  teal: '#4fd1c0', tealDark: '#2ba694',
  pink: '#ff9ed2', pinkDark: '#e070ae',
  green: '#7ed957', greenDark: '#5cb63a',
  orange: '#ffa04d', orangeDark: '#dd7c26',
  brown: '#b98a5e', brownDark: '#8d6440',
  slate: '#b9c2d4', slateDark: '#8e99b0',
  bone: '#f0ebdd', boneDark: '#cfc7b2',
  hair: '#4a3a2e',
  white: '#ffffff',
  ink: LINE,
}

/** Per-role accent, used to tint crests. */
export const ROLE_PALETTE: Record<string, { accent: string }> = {
  werewolf: { accent: C.red },
  white_werewolf: { accent: C.yellow },
  alpha_wolf: { accent: C.orange },
  seer: { accent: C.purple },
  witch: { accent: C.teal },
  guard: { accent: C.yellow },
  hunter: { accent: C.red },
  cupid: { accent: C.pink },
  villager: { accent: C.blue },
  elder: { accent: C.slate },
  doctor: { accent: C.green },
  wolf_seer: { accent: '#d16bf0' },
  cursed_wolf: { accent: '#c0392b' },
  detective: { accent: C.blue },
  medium: { accent: C.purple },
  raven: { accent: C.slate },
  chief: { accent: C.yellow },
  jester: { accent: C.pink },
}

// ============================================================
// Shared body — the same under every role, human or wolf
// ============================================================

const BODY = 'M 37 54 C 34 64 34 78 36 84 C 38 87 62 87 64 84 C 66 78 66 64 63 54 Z'

/** Torso and feet. Draw before the head so the head overlaps the neckline. */
export function Body({ fill, collar }: { fill: string; collar?: string }) {
  return (
    <g>
      <ellipse cx="42" cy="89" rx="5.4" ry="5" fill={C.white} {...outline} />
      <ellipse cx="58" cy="89" rx="5.4" ry="5" fill={C.white} {...outline} />
      <path d={BODY} fill={fill} {...outline} />
      {collar && <path d="M 41 56 Q 50 65 59 56 L 59 61 Q 50 70 41 61 Z" fill={collar} />}
    </g>
  )
}

/** Round human head with small ears. Wolves supply their own head. */
export function HumanHead({ skin = SKIN }: { skin?: string }) {
  return (
    <g>
      <circle cx="23.5" cy="38" r="5" fill={skin} {...outline} />
      <circle cx="76.5" cy="38" r="5" fill={skin} {...outline} />
      <circle cx="50" cy="34" r="25" fill={skin} {...outline} />
    </g>
  )
}

/**
 * Eyes: small solid dots. The whole expressive range comes from swapping the
 * dot for an arc — in this style there is nothing else to work with.
 */
export function Eyes({
  state = 'idle',
  color = LINE,
  x1 = 42,
  x2 = 58,
  y = 38,
}: {
  state?: CharacterState
  color?: string
  x1?: number
  x2?: number
  y?: number
}) {
  if (state === 'happy') {
    return (
      <g stroke={color} strokeWidth="2.8" strokeLinecap="round" fill="none">
        <path d={`M ${x1 - 4.2} ${y + 1.6} Q ${x1} ${y - 4} ${x1 + 4.2} ${y + 1.6}`} />
        <path d={`M ${x2 - 4.2} ${y + 1.6} Q ${x2} ${y - 4} ${x2 + 4.2} ${y + 1.6}`} />
      </g>
    )
  }

  return (
    <g>
      <ellipse cx={x1} cy={y} rx="3" ry="4.2" fill={color} />
      <ellipse cx={x2} cy={y} rx="3" ry="4.2" fill={color} />
      {state === 'action' && (
        <g stroke={LINE} strokeWidth="2.4" strokeLinecap="round">
          <line x1={x1 - 5} y1={y - 8.5} x2={x1 + 4} y2={y - 6} />
          <line x1={x2 + 5} y1={y - 8.5} x2={x2 - 4} y2={y - 6} />
        </g>
      )}
      {state === 'sad' && (
        <g stroke={LINE} strokeWidth="2.2" strokeLinecap="round">
          <line x1={x1 - 5} y1={y - 7} x2={x1 + 4} y2={y - 9.5} />
          <line x1={x2 + 5} y1={y - 7} x2={x2 - 4} y2={y - 9.5} />
        </g>
      )}
    </g>
  )
}

export function Blush({ y = 46, x = 17 }: { y?: number; x?: number }) {
  return (
    <g fill={BLUSH_COLOR}>
      <ellipse cx={50 - x} cy={y} rx="4.6" ry="2.9" />
      <ellipse cx={50 + x} cy={y} rx="4.6" ry="2.9" />
    </g>
  )
}

/** No mouth at rest — that is the reference's default and it must be kept. */
export function Mouth({ state = 'idle', cy = 50 }: { state?: CharacterState; cy?: number }) {
  if (state === 'idle') return null
  if (state === 'happy') {
    return <path d={`M 45 ${cy} Q 50 ${cy + 5} 55 ${cy}`} stroke={LINE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
  }
  if (state === 'sad') {
    return <path d={`M 46 ${cy + 2.5} Q 50 ${cy - 1.5} 54 ${cy + 2.5}`} stroke={LINE} strokeWidth="2.2" strokeLinecap="round" fill="none" />
  }
  return <ellipse cx="50" cy={cy + 1} rx="4" ry="3.2" fill={LINE} />
}

/** The `action` tell: a flat outlined ring, consistent with the line style. */
export function Aura({ color }: { color: string }) {
  return (
    <>
      <circle cx="50" cy="50" r="47" fill={color} opacity="0.16" />
      <circle cx="50" cy="50" r="47" fill="none" stroke={color} strokeWidth="2.2" opacity="0.6" />
    </>
  )
}

// ============================================================
// Wolf head — shared by the three wolf roles so the pack reads as a family
// ============================================================

export function WolfHead({
  fur,
  inner,
  muzzle,
  eyeColor,
  state,
}: {
  fur: string
  inner: string
  muzzle: string
  eyeColor: string
  state: CharacterState
}) {
  return (
    <g>
      {/* Pointed ears, standing up — the opposite of any village silhouette */}
      <path d="M 30 22 L 23 3 L 44 16 Z" fill={fur} {...outline} />
      <path d="M 70 22 L 77 3 L 56 16 Z" fill={fur} {...outline} />
      <path d="M 32 17 L 28.5 7 L 40 15 Z" fill={inner} />
      <path d="M 68 17 L 71.5 7 L 60 15 Z" fill={inner} />

      {/* Skull, slightly wider than tall */}
      <ellipse cx="50" cy="34" rx="26" ry="24" fill={fur} {...outline} />

      {/* Muzzle, pushed below the skull line so it reads canine, not feline */}
      <ellipse cx="50" cy="48" rx="14" ry="10" fill={muzzle} {...outline} />
      <path d="M 45.5 44 Q 50 41 54.5 44 Q 50 48.5 45.5 44 Z" fill={LINE} />
      <path
        d="M 50 47 L 50 49.5 M 50 49.5 Q 45.5 54.5 42.5 49.5 M 50 49.5 Q 54.5 54.5 57.5 49.5"
        stroke={LINE}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M 43.5 52 L 42.5 56 L 46 52 Z" fill={C.white} stroke={LINE} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M 56.5 52 L 57.5 56 L 54 52 Z" fill={C.white} stroke={LINE} strokeWidth="1.3" strokeLinejoin="round" />

      <Eyes state={state} color={eyeColor} y={33} />
    </g>
  )
}
