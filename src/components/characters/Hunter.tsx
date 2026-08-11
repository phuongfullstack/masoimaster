'use client'

import { Body, HumanHead, Eyes, Blush, Mouth, Aura, C, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Thợ Săn — wide brim with a red feather, bow at the side. Green coat so the
// tan hat and the red arrow both have something to read against.
export function Hunter({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.red} />}
      <Body fill={C.green} collar="#a8e88c" />
      {/* Bandolier */}
      <path d="M 38 58 L 62 84" stroke={C.brownDark} strokeWidth="5.5" strokeLinecap="round" />
      <g fill={C.red}>
        <circle cx="45" cy="66" r="2" />
        <circle cx="53" cy="75" r="2" />
      </g>

      <HumanHead />
      <path d="M 27 30 C 30 17 38 11 50 11 C 62 11 70 17 73 30 C 64 22 36 22 27 30 Z" fill={C.hair} {...outline} />

      <Eyes state={state} />
      <Blush />
      <Mouth state={state} />

      {/* Hat: crown over a darker brim */}
      <path d="M 32 24 C 33 6 40 1 50 1 C 60 1 67 6 68 24 C 58 18 42 18 32 24 Z" fill={C.brown} {...outline} />
      <path d="M 14 24 C 32 14 68 14 86 24 C 68 32 32 32 14 24 Z" fill={C.brownDark} {...outline} />
      <path d="M 32 20 C 42 15 58 15 68 20 L 68 26 C 58 21 42 21 32 26 Z" fill="#5e4326" />
      {/* Feather */}
      <path d="M 64 16 C 82 0 78 16 90 9 C 80 22 72 25 68 27 Z" fill={C.red} {...outline} />

      {/* Bow with a nocked arrow */}
      <path d="M 76 50 C 89 59 89 79 76 88" stroke={C.brownDark} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M 77 51 L 77 87" stroke={C.ink} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="69" y="67.2" width="25" height="3.8" rx="1.9" fill={C.red} />
      <path d="M 97 69 L 88 63.5 L 88 74.5 Z" fill={C.red} {...outline} />
    </svg>
  )
}
