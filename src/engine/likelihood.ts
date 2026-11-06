import type { Effect } from './types';

/** Soft floor: no title is ever zeroed by one answer (HANDOVER §8.2). */
export const EPSILON = 0.12;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** How well a trait value matches one effect, 0..1. */
export function match(op: Effect['op'], x: number, value = 0.5): number {
  switch (op) {
    case 'gte':
      return smoothstep(value - 0.15, value + 0.15, x);
    case 'lte':
      return 1 - smoothstep(value - 0.15, value + 0.15, x);
    case 'near':
      return Math.exp(-((x - value) ** 2) / (2 * 0.18 ** 2));
    case 'eq':
      return Math.exp(-((x - value) ** 2) / (2 * 0.08 ** 2));
    case 'has':
      return x;
    case 'not':
      return 1 - x;
  }
}

/** Effect with its trait resolved to a column index for speed. */
export interface CompiledEffect { j: number; op: Effect['op']; value: number; strength: number }

/**
 * L(a|t) = ε + (1−ε) · Π_e [1 − s_e · (1 − match_e)]
 * (for a single effect this is exactly §8.2's ε + (1−ε)[1 − s(1 − match)]).
 * No effects (don't care) → L = 1 for every title.
 */
export function likelihood(effects: CompiledEffect[], traits: Float32Array, row: number, K: number): number {
  if (!effects.length) return 1;
  let f = 1;
  for (const e of effects) f *= 1 - e.strength * (1 - match(e.op, traits[row * K + e.j]!, e.value));
  return EPSILON + (1 - EPSILON) * f;
}
