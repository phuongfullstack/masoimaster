'use client'

import { Body, HumanHead, Eyes, Blush, Mouth, Aura, C, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Phù Thủy — bent pointed hat carries the silhouette. Two vials spell out the
// mechanic: one save, one poison.
export function Witch({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.teal} />}
      <Body fill={C.teal} collar="#9ff0e4" />
      <HumanHead />

      {/* Long side hair */}
      <path d="M 26 34 C 24 20 34 9 50 9 C 66 9 76 20 74 34 C 72 24 62 19 50 19 C 38 19 28 24 26 34 Z" fill="#8a5a3c" {...outline} />
      <path d="M 26 32 C 22 44 24 54 27 58 L 34 54 C 31 48 30 40 31 34 Z" fill="#8a5a3c" {...outline} />
      <path d="M 74 32 C 78 44 76 54 73 58 L 66 54 C 69 48 70 40 69 34 Z" fill="#75492e" {...outline} />

      <Eyes state={state} />
      <Blush />
      <Mouth state={state} />

      {/* Pointed hat: brim, bent cone, band */}
      <path d="M 14 23 C 32 14 68 14 86 23 C 68 31 32 31 14 23 Z" fill="#3f3a5e" {...outline} />
      <path d="M 31 24 C 33 4 44 -2 64 1 C 53 6 54 20 55 25 Z" fill="#4b456e" {...outline} />
      <path d="M 31 20 C 40 16 50 17 55 21 L 55 27 C 48 22 40 21 31 26 Z" fill={C.teal} {...outline} />
      <circle cx="42" cy="24" r="2.6" fill={C.yellow} />

      {/* Vials */}
      <path d="M 69 66 L 78 66 L 78 81 A 4.5 4.5 0 0 1 69 81 Z" fill={C.white} {...outline} />
      <path d="M 69 74 L 78 74 L 78 81 A 4.5 4.5 0 0 1 69 81 Z" fill={C.teal} />
      <rect x="70.2" y="61.5" width="6.6" height="5" rx="1.8" fill={C.brown} {...outline} />

      <path d="M 82 73 L 90 73 L 90 86 A 4 4 0 0 1 82 86 Z" fill={C.white} {...outline} />
      <path d="M 82 80 L 90 80 L 90 86 A 4 4 0 0 1 82 86 Z" fill={C.pink} />
      <rect x="83" y="69" width="6" height="4.5" rx="1.6" fill={C.brown} {...outline} />
    </svg>
  )
}
