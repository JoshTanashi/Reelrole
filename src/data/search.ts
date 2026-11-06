import Fuse from 'fuse.js';
import type { Catalogue } from './catalogue';

interface Doc { i: number; title: string; original: string; cast: string }

let fuse: Promise<Fuse<Doc>> | null = null;

/** Instant fuzzy search over title, original title and top cast (HANDOVER §9.7). */
export function searchIndex(cat: Catalogue): Promise<Fuse<Doc>> {
  fuse ??= fetch(`${import.meta.env.BASE_URL}catalogue/search.json`)
    .then((r) => r.json() as Promise<[string, string][]>)
    .catch(() => [] as [string, string][])
    .then((extra) => {
      const docs: Doc[] = cat.titles.map((t, i) => ({ i, title: t.title, original: extra[i]?.[0] ?? '', cast: (extra[i]?.[1] ?? '').replace(/\|/g, ' · ') }));
      return new Fuse(docs, {
        keys: [
          { name: 'title', weight: 0.65 },
          { name: 'original', weight: 0.15 },
          { name: 'cast', weight: 0.2 },
        ],
        threshold: 0.32,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
    });
  return fuse;
}

export async function search(cat: Catalogue, q: string, limit = 30): Promise<number[]> {
  const f = await searchIndex(cat);
  const hits = f.search(q.trim(), { limit: limit * 2 });
  // Fuse score first, then nudge well-known titles up among near-equal matches.
  return hits
    .map((h) => ({ i: h.item.i, s: (h.score ?? 1) - Math.log10(1 + cat.titles[h.item.i]!.votes) * 0.01 }))
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map((h) => h.i);
}
