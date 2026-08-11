'use client'

import { Body, WolfHead, Aura, C } from './_shared'
import type { CharacterProps } from './_shared'

// Ma Sói — an actual wolf, not a costume. Pointed ears standing up plus the
// muzzle give it the only non-human silhouette in the village line-up.
export function Werewolf({ state = 'idle', ...props }: CharacterProps) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {state === 'action' && <Aura color={C.red} />}
      <Body fill="#6f6f8e" collar="#8b8ba8" />
      <WolfHead fur="#8b8ba8" inner={C.redDark} muzzle="#a3a3bd" eyeColor={C.red} state={state} />
    </svg>
  )
}
