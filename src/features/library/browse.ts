import { trait, type Catalogue } from '../../data/catalogue';

const NETFLIX = 8;

/** Netflix-style browse rows built from the catalogue (M2 content for Library; real lists land in M3). */
export function browseRows(cat: Catalogue) {
  const idx = cat.titles.map((_, i) => i);
  const byPop = [...idx].sort((a, b) => cat.titles[b]!.popularity - cat.titles[a]!.popularity);
  const where = (f: (i: number) => boolean, n = 16) => byPop.filter(f).slice(0, n);
  const shuffleTop = (xs: number[], n: number) => xs.slice(0, n * 2).sort(() => Math.random() - 0.5).slice(0, n);
  return [
    { title: 'Most popular right now', items: byPop.slice(0, 10), numbered: true },
    { title: 'On Netflix in SA', items: shuffleTop(where((i) => !!cat.titles[i]!.providers.flatrate?.includes(NETFLIX), 40), 16) },
    { title: 'Proudly South African', items: where((i) => trait(cat, i, 'south_african') > 0.5) },
    { title: 'Big laughs', items: shuffleTop(where((i) => trait(cat, i, 'laughs') >= 0.7, 40), 16) },
    { title: 'Properly scary', items: shuffleTop(where((i) => trait(cat, i, 'scare') >= 0.7, 40), 16) },
    { title: 'Critics loved it', items: shuffleTop(where((i) => trait(cat, i, 'acclaim') >= 0.95, 40), 16) },
    { title: 'Bring tissues', items: shuffleTop(where((i) => trait(cat, i, 'cry') >= 0.7, 40), 16) },
    { title: 'Bingeable series', items: shuffleTop(where((i) => cat.titles[i]!.kind === 'series' && cat.titles[i]!.rating >= 8, 40), 16) },
  ];
}
