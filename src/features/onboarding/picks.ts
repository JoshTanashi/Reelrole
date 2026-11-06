import type { Catalogue } from '../../data/catalogue';

/**
 * 24 diverse, well-known titles for "Tap 3 you loved" (HANDOVER §9.1): round-robin across
 * genres so the grid isn't all superheroes, mixing movies and series and eras.
 */
export function onboardingPicks(cat: Catalogue, n = 24, rng: () => number = Math.random): number[] {
  const known = cat.titles
    .map((_, i) => i)
    .filter((i) => cat.titles[i]!.votes >= 4000 && cat.titles[i]!.poster)
    .sort((a, b) => cat.titles[b]!.votes - cat.titles[a]!.votes)
    .slice(0, 400);
  const byGenre = new Map<number, number[]>();
  for (const i of known) {
    const g = cat.titles[i]!.genres[0];
    if (g === undefined) continue;
    byGenre.set(g, [...(byGenre.get(g) ?? []), i]);
  }
  // Shuffle within each genre a little so the grid changes between installs.
  for (const [g, xs] of byGenre) byGenre.set(g, xs.slice(0, 12).sort(() => rng() - 0.5));
  const genres = [...byGenre.keys()].sort((a, b) => byGenre.get(b)!.length - byGenre.get(a)!.length);
  const out: number[] = [];
  const seenDecade = new Map<number, number>();
  let series = 0;
  for (let round = 0; out.length < n && round < 12; round++) {
    for (const g of genres) {
      if (out.length >= n) break;
      const xs = byGenre.get(g)!;
      const k = xs.findIndex((i) => {
        const t = cat.titles[i]!;
        const dec = Math.floor((t.year ?? 2000) / 10);
        if ((seenDecade.get(dec) ?? 0) >= 8) return false;
        if (t.kind === 'series' && series >= 8) return false;
        return true;
      });
      if (k < 0) continue;
      const i = xs.splice(k, 1)[0]!;
      const t = cat.titles[i]!;
      seenDecade.set(Math.floor((t.year ?? 2000) / 10), (seenDecade.get(Math.floor((t.year ?? 2000) / 10)) ?? 0) + 1);
      if (t.kind === 'series') series++;
      out.push(i);
    }
  }
  return out.sort(() => rng() - 0.5);
}
