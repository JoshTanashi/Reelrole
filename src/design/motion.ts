import type { Transition } from 'motion/react';

/** HANDOVER §5.5 — springs by default. */
export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 };
export const springGentle: Transition = { type: 'spring', stiffness: 260, damping: 30 };

export const dur = { micro: 0.15, standard: 0.28, hero: 0.56 } as const;

/** Cinematic ease-out used for reveals and the reel deceleration. */
export const easeCine = [0.12, 0.9, 0.18, 1] as const;

export const stagger = 0.035;
