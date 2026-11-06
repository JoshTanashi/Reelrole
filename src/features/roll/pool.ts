import type { Catalogue, Kind } from '../../data/catalogue';
import type { UserTitle } from '../../store/library';

export interface RollFilters {
  kind: Kind | 'both';
  genres: number[]; // any-of; empty = any
  fromMyList: boolean;
}

export const DEFAULT_FILTERS: RollFilters = { kind: 'both', genres: [], fromMyList: false };

/** Candidate pool for Roll (HANDOVER §9.6): filters, minus not-for-me and the last 30 rolls. */
export function rollPool(cat: Catalogue, f: RollFilters, items: Record<number, UserTitle>, recent: number[]): number[] {
  const avoid = new Set(recent.slice(-30));
  const out: number[] = [];
  cat.titles.forEach((t, i) => {
    const u = items[t.id];
    if (u?.notForMe) return;
    if (f.kind !== 'both' && t.kind !== f.kind) return;
    if (f.genres.length && !t.genres.some((g) => f.genres.includes(g))) return;
    if (f.fromMyList && !u?.onList) return;
    if (avoid.has(t.id)) return;
    out.push(i);
  });
  return out;
}

/** Weighted random: popularity^0.3 × taste boost, so it's random but rarely awful. */
export function weightedPick(cat: Catalogue, pool: number[], rng: () => number = Math.random, taste: (i: number) => number = () => 1): number | null {
  if (!pool.length) return null;
  const w = pool.map((i) => Math.pow(Math.max(1, cat.titles[i]!.popularity), 0.3) * Math.max(0.05, taste(i)));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let k = 0; k < pool.length; k++) {
    r -= w[k]!;
    if (r <= 0) return pool[k]!;
  }
  return pool[pool.length - 1]!;
}
