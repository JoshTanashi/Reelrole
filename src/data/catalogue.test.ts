import { buildCatalogue, trait } from './catalogue';

const core = {
  version: 't',
  region: 'ZA',
  traitKeys: ['scare', 'laughs'],
  genres: ['Horror'],
  providers: [{ id: 8, name: 'Netflix', logo: '/x.png', priority: 0, titles: 1 }],
  titles: [
    { id: 10, kind: 'movie' as const, title: 'A', year: 2020, poster: '/a', backdrop: null, genres: [0], rating: 7, votes: 1, popularity: 1, runtime: 90, seasons: null, episodes: null, cert: null, lang: 'en', color: '#fff', blurhash: '', providers: {} },
    { id: 21, kind: 'series' as const, title: 'B', year: 2021, poster: '/b', backdrop: null, genres: [], rating: 6, votes: 1, popularity: 1, runtime: null, seasons: 2, episodes: 10, cert: null, lang: 'en', color: '#000', blurhash: '', providers: {} },
  ],
};

test('decodes trait bytes row-major into 0..1', () => {
  const cat = buildCatalogue(core, new Uint8Array([255, 0, 51, 204]));
  expect(trait(cat, 0, 'scare')).toBe(1);
  expect(trait(cat, 0, 'laughs')).toBe(0);
  expect(trait(cat, 1, 'scare')).toBeCloseTo(0.2);
  expect(trait(cat, 1, 'laughs')).toBeCloseTo(0.8);
  expect(trait(cat, 1, 'nope')).toBe(0);
  expect(cat.indexById.get(21)).toBe(1);
});

test('rejects a traits.bin that does not match the title count', () => {
  expect(() => buildCatalogue(core, new Uint8Array(3))).toThrow();
});
