'use client'

import { Body, HumanHead, Eyes, C, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Lão Làng — the long beard is the whole silhouette. It widens the figure
// downward where every other village role narrows.
export function Elder({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <Body fill="#7a839b" collar="#a3abbf" />
      <HumanHead />

      {/* Bald crown with side tufts */}
      <path d="M 26 32 C 24 22 27 15 33 13 L 36 21 C 32 23 30 27 30 33 Z" fill={C.bone} {...outline} />
      <path d="M 74 32 C 76 22 73 15 67 13 L 64 21 C 68 23 70 27 70 33 Z" fill={C.bone} {...outline} />

      {/* Heavy brows */}
      <g fill={C.bone} {...outline}>
        <path d="M 32 26 C 36 22 44 23 46 27 C 42 25 36 25 32 29 Z" />
        <path d="M 68 26 C 64 22 56 23 54 27 C 58 25 64 25 68 29 Z" />
      </g>

      <Eyes state={state} />

      {/* Long beard over the lower face */}
      <path
        d="M 30 44 C 26 62 32 80 41 89 C 46 93 54 93 59 89 C 68 80 74 62 70 44 C 64 52 36 52 30 44 Z"
        fill={C.bone}
        {...outline}
      />
      {/* Moustache */}
      <path d="M 33 43 C 39 51 46 49 50 47 C 54 49 61 51 67 43 C 64 53 55 55 50 53 C 45 55 36 53 33 43 Z" fill={C.white} {...outline} />
      <g stroke={C.boneDark} strokeWidth="1.5" fill="none">
        <path d="M 42 60 C 40 71 43 80 45 85" />
        <path d="M 58 60 C 60 71 57 80 55 85" />
      </g>

      {/* Walking staff */}
      <rect x="86" y="20" width="6.5" height="74" rx="3.2" fill={C.brown} {...outline} transform="rotate(7 89 57)" />
      <path d="M 83 22 C 85 9 96 9 97 18 C 92 17 89 22 89 28 Z" fill={C.brownDark} {...outline} />
    </svg>
  )
}
