'use client'

import { Body, HumanHead, Eyes, Blush, Mouth, Aura, C, LINE, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Tiên Tri — tallest headwear in the village set, plus the orb. The third eye
// on the turban is the one unmistakable mark.
export function Seer({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.purple} />}
      <Body fill={C.purple} collar="#dcc4ff" />
      <HumanHead />

      <Eyes state={state} />
      <Blush />
      <Mouth state={state} />

      {/* Turban: two stacked bands + gem */}
      <path d="M 24 30 C 25 11 36 2 50 2 C 64 2 75 11 76 30 C 64 22 36 22 24 30 Z" fill={C.purple} {...outline} />
      <path d="M 29 22 C 32 11 40 6 50 6 C 60 6 68 11 71 22 C 62 16 38 16 29 22 Z" fill="#dcc4ff" />
      <path d="M 24 27 C 36 20 64 20 76 27 L 76 33 C 64 26 36 26 24 33 Z" fill={C.purpleDark} {...outline} />
      <circle cx="50" cy="10" r="4.2" fill={C.yellow} {...outline} />

      {/* Third eye */}
      <ellipse cx="50" cy="28" rx="2.8" ry="3.8" fill={LINE} />

      {/* Crystal ball on a stand */}
      <path d="M 68 87 L 92 87 L 89 94 L 71 94 Z" fill={C.yellow} {...outline} />
      <circle cx="80" cy="74" r="12.5" fill="#d6f2ff" {...outline} />
      <circle cx="75.5" cy="69.5" r="3.2" fill={C.white} />
    </svg>
  )
}
