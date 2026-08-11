'use client'

import { Body, WolfHead, Aura, C, LINE } from './_shared'
import type { CharacterProps } from './_shared'

// Sói Trắng — the same wolf build as Ma Sói so the pack reads as one family,
// repainted bone with amber eyes and a cracked mark across the brow.
export function WhiteWerewolf({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.yellow} />}
      <Body fill={C.boneDark} collar={C.bone} />
      <WolfHead fur={C.bone} inner={C.yellowDark} muzzle={C.white} eyeColor={C.yellowDark} state={state} />

      {/* Fracture — the wolf that turns on its own pack */}
      <path
        d="M 64 14 L 59 23 L 65 26 L 60 34"
        stroke={LINE}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
