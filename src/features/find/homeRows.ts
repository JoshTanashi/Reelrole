import { trait, type Catalogue } from '../../data/catalogue';
import { similar } from '../../data/similar';
import type { UserTitle } from '../../store/library';

/** Netflix-style rows for the Find home, personalised by taste + library. */
export function homeRows(cat: Catalogue, items: Record<number, UserTitle>, sim: ((i: number) => number) | null) {
  const N = cat.titles.length;
  const seen = (i: number) => {
    const u = items[cat.titles[i]!.id];
    return !!(u && (u.watched || u.notForMe));
  };
  const all = Array.from({ length: N }, (_, i) => i).filter((i) => !seen(i));
  const byPop = [...all].sort((a, b) => cat.titles[b]!.popularity - cat.titles[a]!.popularity);
  const day = Math.floor(Date.now() / 86_400_000);
  const rot = <T,>(xs: T[], n: number) => xs.slice(0, n * 2).map((x, k) => ({ x, r: Math.sin(day * 97 + k * 13.1) })).sort((a, b) => a.r - b.r).map((o) => o.x).slice(0, n);

  // Spotlight: a strong, well-known taste match with a backdrop; changes daily.
  const strong = all.filter((i) => cat.titles[i]!.backdrop && cat.titles[i]!.votes >= 1500 && cat.titles[i]!.rating >= 7);
  const ranked = sim ? [...strong].sort((a, b) => sim(b) - sim(a)) : [...strong].sort((a, b) => cat.titles[b]!.popularity - cat.titles[a]!.popularity);
  const spotlight = ranked.length ? ranked[day % Math.min(10, ranked.length)]! : null;

  const rows: { title: string; items: number[]; numbered?: boolean }[] = [];
  if (sim) {
    const picked = all.filter((i) => cat.titles[i]!.votes >= 300 && i !== spotlight).sort((a, b) => sim(b) - sim(a));
    rows.push({ title: 'Picked for you', items: rot(picked, 16) });
  }
  const liked = Object.entries(items)
    .filter(([, u]) => u.liked === true)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([id]) => cat.indexById.get(Number(id)))
    .filter((i): i is number => i !== undefined);
  if (liked.length) {
    const anchor = liked[day % Math.min(3, liked.length)]!;
    rows.push({ title: `Because you liked ${cat.titles[anchor]!.title}`, items: similar(cat, anchor, 14, (i) => seen(i) || cat.titles[i]!.votes < 200) });
  }
  rows.push({ title: 'Trending now', items: byPop.slice(0, 10), numbered: true });
  const gems = all.filter((i) => trait(cat, i, 'hidden_gem') >= 0.55);
  rows.push({ title: 'Hidden gems', items: rot(sim ? gems.sort((a, b) => sim(b) - sim(a)) : gems, 14) });
  const list = Object.entries(items)
    .filter(([, u]) => u.onList)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .map(([id]) => cat.indexById.get(Number(id)))
    .filter((i): i is number => i !== undefined);
  if (list.length) rows.push({ title: 'On your list', items: list.slice(0, 16) });
  rows.push({ title: 'Proudly South African', items: rot(all.filter((i) => trait(cat, i, 'south_african') > 0.5), 14) });
  return { spotlight, rows: rows.filter((r) => r.items.length) };
}
