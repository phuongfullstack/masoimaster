/* ============================================================
   Framer Motion Animation Variants
   Playful bouncy feel for Ma Sói game UI
   ============================================================ */

import type { Variants, Transition } from 'framer-motion'

// ---- Spring Configs ----
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 17,
}

export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 15,
}

export const springGentle: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 20,
}

// ---- Page / Screen Transitions ----
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: 'easeIn' } },
}

// ---- Card Entrance ----
export const cardVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: springBouncy },
}

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: springGentle },
}

// ---- Character Animations ----
export const characterFloat: Variants = {
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

export const characterBounce: Variants = {
  initial: { scale: 0.3, opacity: 0 },
  animate: {
    scale: [0.3, 1.05, 0.95, 1],
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
}

export const characterHappy: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    rotate: [0, -3, 3, 0],
    transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const characterSad: Variants = {
  animate: {
    y: [0, 2, 0],
    opacity: [1, 0.7, 1],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
}

// ---- Button Press (targets for whileTap / whileHover) ----
export const buttonPress = {
  tap: { scale: 0.95, y: 2 } as const,
  hover: { scale: 1.02 } as const,
}

// ---- Badge / Vote Selection (targets for whileTap / whileHover) ----
export const selectBounce = {
  tap: { scale: 0.9 } as const,
  hover: { scale: 1.05 } as const,
}

// ---- Timer Urgent Pulse ----
export const timerPulse: Variants = {
  animate: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
  },
}

// ---- Death / Elimination ----
export const deathFade: Variants = {
  initial: { opacity: 1, scale: 1 },
  animate: {
    opacity: 0.3,
    scale: 0.8,
    transition: { duration: 0.5, ease: 'easeIn' },
  },
}

// ---- Win Celebration ----
export const winBounce: Variants = {
  initial: { scale: 0 },
  animate: {
    scale: [0, 1.2, 0.9, 1],
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

export const confettiVariants: Variants = {
  initial: { y: -20, opacity: 1, scale: 0 },
  animate: {
    y: 100,
    opacity: 0,
    scale: 1,
    rotate: 360,
    transition: { duration: 2, ease: 'easeIn' },
  },
}

// ---- Chat Message ----
export const chatMessage: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
}

// ---- Skull Overlay (death) ----
export const skullOverlay: Variants = {
  initial: { opacity: 0, scale: 1.5 },
  animate: { opacity: 1, scale: 1, transition: springSnappy },
}
