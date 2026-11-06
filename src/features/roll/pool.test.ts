import { buildCatalogue } from '../../data/catalogue';
import { rollPool, weightedPick, DEFAULT_FILTERS } from './pool';

const mk = (id: number, kind: 'movie' | 'series', genres: number[], popularity = 10) => ({
  id, kind, title: String(id), year: 2020, poster: '/p', backdrop: null, genres, rating: 7, votes: 100, popularity,
  runtime: 100, seasons: null, episodes: null, cert: null, lang: 'en', color: '#000', blurhash: '', providers: {},
});
const titles = Array.from({ length: 40 }, (_, i) => mk(i * 10 + (i % 2), i % 2 ? 'series' : 'movie', [i % 3]));
const cat = buildCatalogue({ version: 't', region: 'ZA', traitKeys: ['x'], genres: ['A', 'B', 'C'], providers: [], titles }, new Uint8Array(40));
const u = (p: object) => ({ onList: false, liked: null, watched: false, watchedAt: null, myRating: null, notForMe: false, updatedAt: 0, ...p });

test('respects kind, genre and my-list filters', () => {
  expect(rollPool(cat, { ...DEFAULT_FILTERS, kind: 'series' }, {}, []).every((i) => cat.titles[i]!.kind === 'series')).toBe(true);
  expect(rollPool(cat, { ...DEFAULT_FILTERS, genres: [2] }, {}, []).every((i) => cat.titles[i]!.genres.includes(2))).toBe(true);
  const items = { [titles[3]!.id]: u({ onList: true }) };
  expect(rollPool(cat, { ...DEFAULT_FILTERS, fromMyList: true }, items, [])).toEqual([3]);
});

test('excludes not-for-me and anything in the last 30 rolls', () => {
  const items = { [titles[0]!.id]: u({ notForMe: true }) };
  const recent = titles.slice(1, 31).map((t) => t.id);
  const pool = rollPool(cat, DEFAULT_FILTERS, items, recent);
  expect(pool).not.toContain(0);
  for (let i = 1; i <= 30; i++) expect(pool).not.toContain(i);
  expect(pool.length).toBe(9);
});

test('weighted pick never returns outside the pool, and favours popular titles', () => {
  const pool = [0, 1, 2];
  const pop = buildCatalogue({ version: 't', region: 'ZA', traitKeys: ['x'], genres: [], providers: [], titles: [mk(1, 'movie', [], 1), mk(2, 'movie', [], 1), mk(3, 'movie', [], 100000)] }, new Uint8Array(3));
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const counts = [0, 0, 0];
  for (let k = 0; k < 3000; k++) counts[weightedPick(pop, pool, rng)!]!++;
  expect(counts[2]).toBeGreaterThan(counts[0]! * 2);
  expect(weightedPick(pop, [], rng)).toBeNull();
});
