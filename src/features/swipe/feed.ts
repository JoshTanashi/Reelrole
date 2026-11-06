import type { Catalogue, Kind } from '../../data/catalogue';

export interface SwipeFilters {
  kind: Kind | 'both';
  genres: number[];
  era: 'any' | 'classic' | 'retro' | 'y2k' | 'tens' | 'recent';
}
export const DEFAULT_SWIPE_FILTERS: SwipeFilters = { kind: 'both', genres: [], era: 'any' };

const ERA: Record<Exclude<SwipeFilters['era'], 'any'>, [number, number]> = {
  classic: [0, 1979], retro: [1980, 1999], y2k: [2000, 2009], tens: [2010, 2019], recent: [2020, 9999],
};

export function passes(cat: Catalogue, i: number, f: SwipeFilters): boolean {
  const t = cat.titles[i]!;
  if (f.kind !== 'both' && t.kind !== f.kind) return false;
  if (f.genres.length && !t.genres.some((g) => f.genres.includes(g))) return false;
  if (f.era !== 'any') {
    const [a, b] = ERA[f.era];
    if (!t.year || t.year < a || t.year > b) return false;
  }
  return true;
}

/**
 * Swipe feed (HANDOVER §9.5): 70% taste-matched, 20% popular, 10% wildcard.
 * Without a taste vector yet, the taste share falls back to popular.
 */
export function buildFeed(
  cat: Catalogue,
  opts: { n?: number; exclude: (i: number) => boolean; filters: SwipeFilters; sim: ((i: number) => number) | null; rng?: () => number },
): number[] {
  const { n = 30, exclude, filters, sim, rng = Math.random } = opts;
  const cands = cat.titles.map((_, i) => i).filter((i) => !exclude(i) && passes(cat, i, filters));
  if (!cands.length) return [];

  const pick = (from: number[], k: number, taken: Set<number>) => {
    const out: number[] = [];
    const pool = from.filter((i) => !taken.has(i));
    while (out.length < k && pool.length) {
      const j = Math.floor(rng() * pool.length);
      out.push(pool[j]!);
      taken.add(pool[j]!);
      pool.splice(j, 1);
    }
    return out;
  };

  const byPop = [...cands].sort((a, b) => cat.titles[b]!.popularity - cat.titles[a]!.popularity);
  const popular = byPop.slice(0, Math.max(60, Math.round(cands.length * 0.2)));
  const known = cands.filter((i) => cat.titles[i]!.votes >= 150);
  const matched = sim ? [...known].sort((a, b) => sim(b) - sim(a)).slice(0, Math.max(60, Math.round(known.length * 0.12))) : popular;

  const taken = new Set<number>();
  const nTaste = Math.round(n * 0.7);
  const nPop = Math.round(n * 0.2);
  const a = pick(matched, nTaste, taken);
  const b = pick(popular, nPop, taken);
  const c = pick(known.length ? known : cands, n - a.length - b.length, taken);
  const all = [...a, ...b, ...c];
  // Interleave so wildcards/popular aren't bunched at the end.
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all;
}
