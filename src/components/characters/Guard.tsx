'use client'

import { Body, HumanHead, Eyes, Blush, Mouth, Aura, C, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Bảo Vệ — gold helmet over steel-blue armour, big shield. The shield is the
// shape players scan for when choosing who to save.
export function Guard({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.yellow} />}
      <Body fill="#7d8ab5" collar="#a9b4d6" />
      {/* Pauldrons */}
      <ellipse cx="34" cy="62" rx="8" ry="6" fill={C.yellow} {...outline} />
      <ellipse cx="66" cy="62" rx="8" ry="6" fill={C.yellow} {...outline} />

      <HumanHead />
      <Eyes state={state} />
      <Blush />
      <Mouth state={state} />

      {/* Helmet: dome + brow band + nose guard, all kept clear of the eye line */}
      <path d="M 24 28 C 24 9 35 1 50 1 C 65 1 76 9 76 28 C 64 20 36 20 24 28 Z" fill={C.yellow} {...outline} />
      <rect x="22.5" y="21" width="55" height="8.5" rx="4.2" fill={C.yellowDark} {...outline} />
      <path d="M 46.5 28 L 53.5 28 L 53.5 41 A 3.5 3.5 0 0 1 46.5 41 Z" fill={C.yellowDark} {...outline} />
      <circle cx="50" cy="3" r="4" fill={C.red} {...outline} />

      {/* Shield */}
      <path d="M 68 56 L 95 56 L 95 76 C 95 87 82 93 81.5 93 C 81 93 68 87 68 76 Z" fill={C.yellow} {...outline} />
      <rect x="79.4" y="63" width="4.6" height="21" rx="2.3" fill={C.red} />
      <rect x="72" y="71.2" width="19.5" height="4.6" rx="2.3" fill={C.red} />
    </svg>
  )
}
