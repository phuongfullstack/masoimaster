'use client'

import { Body, HumanHead, Eyes, Blush, Mouth, C, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Dân Thường — nón lá gives the plainest role the widest silhouette in the set.
// No prop, because this role has no power.
export function Villager({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <Body fill={C.blue} collar="#a5dcff" />
      <HumanHead />

      {/* Hair fringe under the brim */}
      <path d="M 27 30 C 30 16 38 10 50 10 C 62 10 70 16 73 30 C 64 21 36 21 27 30 Z" fill={C.hair} {...outline} />

      <Eyes state={state} />
      <Blush />
      <Mouth state={state} />

      {/* Nón lá */}
      <path d="M 13 26 L 50 2 L 87 26 C 69 31 31 31 13 26 Z" fill="#f2cd7a" {...outline} />
      <path d="M 13 26 C 31 31 69 31 87 26 C 69 34 31 34 13 26 Z" fill="#d9ac4f" {...outline} />
      <g stroke="#c9993a" strokeWidth="1.4">
        <path d="M 50 6 L 29 25" />
        <path d="M 50 6 L 71 25" />
      </g>

      {/* No chin strap. On a chibi head there is no chin for it to pass under,
          so the strap arced straight across the face and read as a red grin. */}
    </svg>
  )
}
