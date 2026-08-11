'use client'

import { Body, HumanHead, Eyes, Blush, Mouth, Aura, C, LINE, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Bác Sĩ — head mirror and stethoscope. Reads as a healer without borrowing
// the Guard's shield or the Witch's vials, which is the collision risk here.
export function Doctor({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.green} />}

      {/* White coat over teal scrubs */}
      <Body fill={C.white} />
      <path d="M 43 56 L 50 68 L 57 56 L 57 86 L 43 86 Z" fill={C.teal} {...outline} />
      <path d="M 40 58 C 35 68 39 78 44 81" stroke={C.tealDark} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M 60 58 C 65 68 61 78 56 81" stroke={C.tealDark} strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="82" r="4.2" fill={C.tealDark} {...outline} />

      <HumanHead />
      {/* Short tidy hair */}
      <path d="M 26 30 C 28 15 37 8 50 8 C 63 8 72 15 74 30 C 66 20 34 20 26 30 Z" fill="#3a3128" {...outline} />

      <Eyes state={state} />
      <Blush />
      <Mouth state={state} />

      {/* Head mirror on a band */}
      <path d="M 24 22 C 33 13 67 13 76 22 L 76 29 C 66 21 34 21 24 29 Z" fill="#5b6479" {...outline} />
      <circle cx="50" cy="15" r="8" fill={C.slate} {...outline} />
      <circle cx="50" cy="15" r="3" fill={LINE} />

      {/* Cross badge */}
      <rect x="69" y="64" width="18" height="18" rx="5" fill={C.green} {...outline} />
      <rect x="75.8" y="67.2" width="4.4" height="11.6" rx="2.2" fill={C.white} />
      <rect x="72.2" y="70.8" width="11.6" height="4.4" rx="2.2" fill={C.white} />
    </svg>
  )
}
