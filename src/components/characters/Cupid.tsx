'use client'

import { Body, HumanHead, Eyes, Blush, Mouth, Aura, C, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Cúp Đôi — the only winged figure in the set, so it can never be confused
// with another role. Two hearts state the pairing mechanic.
export function Cupid({ state = 'idle', ...props }: CharacterProps) {
  const heart = (x: number, y: number, s: number) =>
    `M ${x} ${y + 3.6 * s} C ${x - 5 * s} ${y - 1.4 * s} ${x - 3.6 * s} ${y - 5 * s} ${x} ${y - 1.8 * s} ` +
    `C ${x + 3.6 * s} ${y - 5 * s} ${x + 5 * s} ${y - 1.4 * s} ${x} ${y + 3.6 * s} Z`

  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.pink} />}

      {/* Wings, behind the body */}
      <g fill={C.white} {...outline}>
        <path d="M 38 80 C 16 82 3 70 4 52 C 11 61 18 60 21 55 C 25 64 31 66 36 65 Z" />
        <path d="M 62 80 C 84 82 97 70 96 52 C 89 61 82 60 79 55 C 75 64 69 66 64 65 Z" />
      </g>

      <Body fill={C.pink} collar="#ffd0ea" />
      <HumanHead />

      {/* Curly hair */}
      <g fill={C.yellow} {...outline}>
        <circle cx="35" cy="20" r="8" />
        <circle cx="50" cy="14" r="9" />
        <circle cx="65" cy="20" r="8" />
      </g>

      <Eyes state={state} />
      <Blush />
      <Mouth state={state === 'idle' ? 'happy' : state} />

      {/* Halo */}
      <ellipse cx="50" cy="5" rx="13" ry="4" fill="none" stroke={C.yellow} strokeWidth="3.4" />

      {/* Two hearts */}
      <path d={heart(80, 74, 2.1)} fill={C.red} {...outline} />
      <path d={heart(91, 84, 1.5)} fill={C.pink} {...outline} />
    </svg>
  )
}
