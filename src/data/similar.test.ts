import { buildCatalogue } from './catalogue';
import { similar } from './similar';

const t = (id: number, kind: 'movie' | 'series' = 'movie') => ({
  id, kind, title: String(id), year: 2020, poster: '/p', backdrop: null, genres: [], rating: 7, votes: 100, popularity: 1,
  runtime: 100, seasons: null, episodes: null, cert: null, lang: 'en', color: '#000', blurhash: '', providers: {},
});

test('nearest neighbours follow trait shape, not shared baselines', () => {
  // traits: scare, laughs, romance
  const bytes = new Uint8Array([
    250, 10, 10, // 0 horror
    240, 20, 0, //  1 horror-ish
    10, 250, 30, // 2 comedy
    0, 240, 20, //  3 comedy-ish
    20, 30, 250, // 4 romance
  ]);
  const cat = buildCatalogue(
    { version: 't', region: 'ZA', traitKeys: ['scare', 'laughs', 'romance'], genres: [], providers: [], titles: [0, 1, 2, 3, 4].map((i) => t(i * 10)) },
    bytes,
  );
  expect(similar(cat, 0, 1)).toEqual([1]);
  expect(similar(cat, 2, 1)).toEqual([3]);
  expect(similar(cat, 0, 4)).not.toContain(0);
  expect(similar(cat, 0, 2, (i) => i === 1)).toEqual(expect.not.arrayContaining([1]));
});
