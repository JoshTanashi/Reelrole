import { trait, type Catalogue } from '../../data/catalogue';
import type { UserTitle } from '../../store/library';

const ADJ: Record<string, string> = {
  scare: 'Scary', laughs: 'Funny', romance: 'Romantic', cry: 'Emotional', brain: 'Clever', darkness: 'Dark',
  feelgood: 'Feel-good', action: 'Action-packed', weird: 'Weird', pace: 'Fast', slow_burn: 'Slow-burn',
  tension: 'Tense', spectacle: 'Epic', nostalgia: 'Nostalgic',
};

/** "34 watched · 12 hours of horror · Your vibe: Dark & clever." (HANDOVER §9.7) */
export function libraryStats(cat: Catalogue, items: Record<number, UserTitle>): string | null {
  const entries = Object.entries(items).filter(([, u]) => u.onList || u.watched || u.liked === true);
  if (!entries.length) return null;
  const parts: string[] = [];

  const watched = entries.filter(([, u]) => u.watched);
  if (watched.length) {
    parts.push(`${watched.length} watched`);
    const minutesByGenre = new Map<number, number>();
    for (const [id] of watched) {
      const i = cat.indexById.get(Number(id));
      if (i === undefined) continue;
      const t = cat.titles[i]!;
      const mins = t.runtime ?? (t.episodes ?? 0) * 40;
      const g = t.genres[0];
      if (g !== undefined) minutesByGenre.set(g, (minutesByGenre.get(g) ?? 0) + mins);
    }
    const top = [...minutesByGenre.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 60) parts.push(`${Math.round(top[1] / 60)} hours of ${cat.genres[top[0]]!.toLowerCase()}`);
  }

  if (entries.length >= 3) {
    const keys = Object.keys(ADJ);
    const mean = (idxs: number[], k: string) => idxs.reduce((s, i) => s + trait(cat, i, k), 0) / Math.max(1, idxs.length);
    const mine = entries.map(([id]) => cat.indexById.get(Number(id))).filter((i): i is number => i !== undefined);
    const all = cat.titles.map((_, i) => i).filter((i) => i % 7 === 0); // cheap baseline sample
    const lift = keys.map((k) => [k, mean(mine, k) - mean(all, k)] as const).sort((a, b) => b[1] - a[1]);
    const [a, b] = lift;
    if (a && b && a[1] > 0.03) parts.push(`Your vibe: ${ADJ[a[0]]} & ${ADJ[b[0]]!.toLowerCase()}`);
  }
  return parts.join(' · ') || null;
}
