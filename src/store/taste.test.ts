import { buildCatalogue } from '../data/catalogue';
import { useTaste, tasteSimFn } from './taste';

const t = (id: number) => ({ id, kind: 'movie' as const, title: String(id), year: 2020, poster: '/p', backdrop: null, genres: [], rating: 7, votes: 100, popularity: 1, runtime: 100, seasons: null, episodes: null, cert: null, lang: 'en', color: '#000', blurhash: '', providers: {} });
// scare, laughs
const cat = buildCatalogue({ version: 'v', region: 'ZA', traitKeys: ['scare', 'laughs'], genres: [], providers: [], titles: [t(10), t(20), t(30), t(40)] }, new Uint8Array([250, 10, 240, 20, 10, 250, 20, 240]));

beforeEach(() => useTaste.getState().reset());

test('no taste → null sim function', () => {
  expect(tasteSimFn(cat, useTaste.getState().vec)).toBeNull();
});

test('liking a horror title makes other horror score high and comedy low', () => {
  useTaste.getState().add(cat, 0, 1);
  const sim = tasteSimFn(cat, useTaste.getState().vec)!;
  expect(sim(1)).toBeGreaterThan(0.5);
  expect(sim(2)).toBeLessThan(-0.5);
});

test('negative signals push away', () => {
  useTaste.getState().add(cat, 2, -1); // disliked comedy
  const sim = tasteSimFn(cat, useTaste.getState().vec)!;
  expect(sim(3)).toBeLessThan(0);
  expect(sim(1)).toBeGreaterThan(0);
});
