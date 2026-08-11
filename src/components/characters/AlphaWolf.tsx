'use client'

import { Body, WolfHead, Aura, C, outline } from './_shared'
import type { CharacterProps } from './_shared'

// Sói Đầu Sỏ — the same wolf build plus a bone crown. Deep red separates it
// from Ma Sói's grey without changing the family silhouette.
export function AlphaWolf({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.orange} />}
      <Body fill="#8e4550" collar="#b05f6b" />
      <WolfHead
        fur="#b05f6b"
        inner="#7a2f3c"
        muzzle="#c98090"
        eyeColor={C.orange}
        state={state === 'idle' ? 'action' : state}
      />

      {/* Bone crown, sitting between the ears */}
      <path d="M 34 20 L 39 8 L 45 16 L 50 3 L 55 16 L 61 8 L 66 20 Z" fill={C.bone} {...outline} />
      <circle cx="50" cy="14" r="2.8" fill={C.orange} />
    </svg>
  )
}
