import { buildCatalogue } from '../../data/catalogue';
import { buildFeed, DEFAULT_SWIPE_FILTERS } from './feed';

const mk = (i: number) => ({
  id: i * 10, kind: (i % 2 ? 'series' : 'movie') as 'movie' | 'series', title: String(i), year: 1970 + (i % 55), poster: '/p', backdrop: null,
  genres: [i % 4], rating: 7, votes: 500, popularity: 1000 - i, runtime: 100, seasons: null, episodes: null, cert: null, lang: 'en', color: '#000', blurhash: '', providers: {},
});
const N = 400;
const cat = buildCatalogue({ version: 'v', region: 'ZA', traitKeys: ['x'], genres: ['A', 'B', 'C', 'D'], providers: [], titles: Array.from({ length: N }, (_, i) => mk(i)) }, new Uint8Array(N));
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test('no duplicates, respects exclusions and filters', () => {
  const feed = buildFeed(cat, { n: 30, exclude: (i) => i < 10, filters: { ...DEFAULT_SWIPE_FILTERS, kind: 'series', genres: [1, 3] }, sim: null, rng });
  expect(feed.length).toBe(30);
  expect(new Set(feed).size).toBe(30);
  for (const i of feed) {
    expect(i).toBeGreaterThanOrEqual(10);
    expect(cat.titles[i]!.kind).toBe('series');
    expect([1, 3]).toContain(cat.titles[i]!.genres[0]);
  }
});

test('~70% of the feed comes from the taste-matched set', () => {
  const sim = (i: number) => (i % 7 === 0 ? 1 : -1); // "taste" = multiples of 7
  const feed = buildFeed(cat, { n: 30, exclude: () => false, filters: DEFAULT_SWIPE_FILTERS, sim, rng });
  const matched = feed.filter((i) => i % 7 === 0).length;
  expect(matched).toBeGreaterThanOrEqual(21);
});

test('era filter', () => {
  const feed = buildFeed(cat, { n: 20, exclude: () => false, filters: { ...DEFAULT_SWIPE_FILTERS, era: 'retro' }, sim: null, rng });
  for (const i of feed) expect(cat.titles[i]!.year! >= 1980 && cat.titles[i]!.year! <= 1999).toBe(true);
});
