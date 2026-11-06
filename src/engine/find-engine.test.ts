import { buildCatalogue } from '../data/catalogue';
import { FindEngine, TUNING } from './find-engine';
import type { Question } from './types';

// Synthetic catalogue: 200 titles, traits [scare, laughs, family_safe, theme_heist], half movies / half series.
const N = 200;
const keys = ['scare', 'laughs', 'family_safe', 'theme_heist'];
const bytes = new Uint8Array(N * keys.length);
const titles = Array.from({ length: N }, (_, i) => {
  const scary = i % 4 === 0;
  const funny = i % 4 === 1;
  bytes[i * 4] = scary ? 230 : 20;
  bytes[i * 4 + 1] = funny ? 230 : 30;
  bytes[i * 4 + 2] = funny ? 255 : 0;
  bytes[i * 4 + 3] = i % 10 === 0 ? 255 : 0;
  return {
    id: i * 10 + (i % 2), kind: (i % 2 ? 'series' : 'movie') as 'movie' | 'series', title: `T${i}`, year: 2010, poster: '/p', backdrop: null,
    genres: [], rating: 7, votes: 1000, popularity: 100 + i, runtime: 100, seasons: null, episodes: null, cert: null, lang: 'en', color: '#000', blurhash: '', providers: {},
  };
});
const cat = buildCatalogue({ version: 't', region: 'ZA', traitKeys: keys, genres: [], providers: [], titles }, bytes);

const Q: Question[] = [
  { id: 'q_kind', kind: 'tri', prompt: 'Movie or series?', groupKey: 'kind', weight: 1, opening: 1, options: [
    { id: 'movie', label: 'Movie', effects: [], hard: { kind: 'movie' } },
    { id: 'series', label: 'Series', effects: [], hard: { kind: 'series' } },
    { id: 'any', label: 'Surprise', effects: [] },
  ] },
  { id: 'q_who', kind: 'chips-single', prompt: "Who's watching?", groupKey: 'who', weight: 1, opening: 2, options: [
    { id: 'solo', label: 'Me', effects: [] },
    { id: 'family', label: 'Family', effects: [], hard: { family_safe: 1 } },
  ] },
  { id: 'q_scary', kind: 'tri', prompt: 'Scared?', groupKey: 'scare', weight: 1, options: [
    { id: 'yes', label: 'Yes', effects: [{ trait: 'scare', op: 'gte', value: 0.55, strength: 0.85 }] },
    { id: 'no', label: 'No', effects: [{ trait: 'scare', op: 'lte', value: 0.35, strength: 0.8 }] },
    { id: 'either', label: 'Either', effects: [] },
  ] },
  { id: 'q_laugh', kind: 'tri', prompt: 'Laugh?', groupKey: 'laughs', weight: 1, options: [
    { id: 'yes', label: 'Yes', effects: [{ trait: 'laughs', op: 'gte', value: 0.6, strength: 0.8 }] },
    { id: 'no', label: 'No', effects: [{ trait: 'laughs', op: 'lte', value: 0.4, strength: 0.6 }] },
    { id: 'either', label: 'Either', effects: [] },
  ] },
  { id: 'q_scare_type', kind: 'tri', prompt: 'Jump or dread?', groupKey: 'scare_sub', weight: 1, requires: { answered: { q_scary: 'yes' } }, options: [
    { id: 'jump', label: 'Jump', effects: [{ trait: 'scare', op: 'gte', value: 0.8, strength: 0.4 }] },
    { id: 'dread', label: 'Dread', effects: [{ trait: 'scare', op: 'lte', value: 0.85, strength: 0.4 }] },
  ] },
  { id: 'q_series_only', kind: 'binary', prompt: 'Binge?', groupKey: 'binge', weight: 1, requires: { kind: 'series' }, options: [
    { id: 'yes', label: 'Yes', effects: [{ trait: 'laughs', op: 'has', strength: 0.3 }] },
    { id: 'no', label: 'No', effects: [{ trait: 'laughs', op: 'not', strength: 0.3 }] },
  ] },
  { id: 'q_late', kind: 'binary', prompt: 'Late?', groupKey: 'late', weight: 5, after: 4, options: [
    { id: 'yes', label: 'Yes', effects: [{ trait: 'theme_heist', op: 'has', strength: 0.9 }] },
    { id: 'no', label: 'No', effects: [{ trait: 'theme_heist', op: 'not', strength: 0.9 }] },
  ] },
  { id: 'q_chips', kind: 'chips', combine: 'any', prompt: 'Any?', groupKey: 'themes', weight: 1, options: [
    { id: 'heist', label: 'Heist', effects: [{ trait: 'theme_heist', op: 'has', strength: 0.6 }] },
    { id: 'funny', label: 'Funny', effects: [{ trait: 'laughs', op: 'has', strength: 0.6 }] },
    { id: 'none', label: 'None', effects: [] },
  ] },
];

const mk = (seed = 1, extra = {}) => new FindEngine(cat, Q, { seed, ...extra });

test('opening sequence comes first, in order', () => {
  const e = mk();
  expect(e.next()!.id).toBe('q_kind');
  e.answer('q_kind', 'movie');
  expect(e.next()!.id).toBe('q_who');
});

test('hard filters: kind and family remove titles entirely', () => {
  const e = mk();
  e.answer('q_kind', 'series');
  e.answer('q_who', 'family');
  const alive = e.alive();
  expect(alive.length).toBeGreaterThan(0);
  for (const id of alive) {
    const t = cat.titles[cat.indexById.get(id)!]!;
    expect(t.kind).toBe('series');
  }
  expect(alive.every((id) => cat.titles[cat.indexById.get(id)!]!.title.match(/^T\d+$/) && (cat.indexById.get(id)! % 4 === 1))).toBe(true);
});

test("don't care is a no-op on the distribution", () => {
  const e = mk();
  e.answer('q_kind', 'any');
  const before = e.top(5);
  const r = e.answer('q_scary', 'either');
  expect(e.top(5)).toEqual(before);
  expect(r.aliveAfter).toBe(r.aliveBefore);
});

test('soft elimination: one contradicting answer never zeroes a title', () => {
  const e = mk();
  e.answer('q_kind', 'any');
  e.answer('q_scary', 'no'); // scary titles are disfavoured...
  const scaryId = titles[0]!.id;
  const all = e.top(N).map((x) => x.id);
  expect(all).toContain(scaryId); // ...but still have p > 0
});

test('gating: answered / kind / after', () => {
  const e = mk();
  e.answer('q_kind', 'movie');
  e.answer('q_who', 'solo');
  const ids = new Set<string>();
  for (let k = 0; k < 6; k++) {
    const q = e.next();
    if (!q) break;
    ids.add(q.id);
    expect(q.id).not.toBe('q_series_only'); // kind gate
    if (q.id === 'q_late') expect(e.questionsAsked).toBeGreaterThanOrEqual(4); // after gate
    if (q.id === 'q_scare_type') expect(ids.has('q_scary')).toBe(true);
    e.answer(q.id, q.kind === 'chips' ? ({ chips: ['none'] } as never) : q.id === 'q_scary' ? 'no' : q.options[0]!.id);
  }
  expect(ids.has('q_scare_type')).toBe(false); // answered gate: q_scary was 'no'
});

test('stop conditions: hard cap, just-show-me, confident top', () => {
  const capped = new FindEngine(cat, Q, { seed: 3, maxQuestions: 3 });
  capped.answer('q_kind', 'any');
  capped.answer('q_who', 'solo');
  capped.answer('q_scary', 'either');
  expect(capped.next()).toBeNull();

  const impatient = mk();
  impatient.justShowMe();
  expect(impatient.next()).toBeNull();

  const fresh = mk();
  fresh.answer('q_kind', 'any');
  expect(fresh.next()).not.toBeNull(); // < 5 asked never stops on confidence
});

test('revive path: a title knocked out comes back when later answers favour it', () => {
  const saved = TUNING.aliveRatio;
  TUNING.aliveRatio = 0.5; // make "alive" strict so one answer is enough to knock a title out
  try {
    const e = mk();
    e.answer('q_kind', 'any');
    const funny = titles[197]!.id; // popular + funny (197 % 4 === 1)
    expect(e.alive()).toContain(funny);
    e.answer('q_laugh', 'no');
    expect(e.alive()).not.toContain(funny); // knocked out (but p > 0)
    expect(e.top(N).map((x) => x.id)).toContain(funny);
    const r = e.answer('q_chips', { chips: ['funny'] });
    expect(r.revived).toContain(funny);
    expect(r.contextTags).toContain('revive');
    expect(e.alive()).toContain(funny);
  } finally {
    TUNING.aliveRatio = saved;
  }
});

test('chips "any": matching one picked chip is enough', () => {
  const e = mk();
  e.answer('q_kind', 'any');
  e.answer('q_chips', { chips: ['heist', 'funny'] });
  const top = e.top(20).map((x) => cat.indexById.get(x.id)!);
  expect(top.every((i) => i % 10 === 0 || i % 4 === 1)).toBe(true);
});

test('determinism with a seeded RNG', () => {
  const run = (seed: number) => {
    const e = new FindEngine(cat, Q, { seed });
    const ids: string[] = [];
    for (let k = 0; k < 8; k++) {
      const q = e.next();
      if (!q) break;
      ids.push(q.id);
      e.answer(q.id, q.kind === 'chips' ? ({ chips: [q.options[0]!.id] } as never) : q.options[0]!.id);
    }
    return { ids, reveal: e.reveal() };
  };
  expect(run(42)).toEqual(run(42));
});

test('reject removes the winner and the next best takes over; snapshot round-trips', () => {
  const e = mk(9);
  e.answer('q_kind', 'any');
  e.answer('q_scary', 'yes');
  const { winner } = e.reveal();
  const next = e.reject(winner);
  expect(next).not.toBe(winner);
  expect(e.alive()).not.toContain(winner);
  const copy = FindEngine.restore(cat, Q, { seed: 9 }, JSON.parse(JSON.stringify(e.snapshot())));
  expect(copy.reveal()).toEqual(e.reveal());
  expect(copy.questionsAsked).toBe(e.questionsAsked);
  expect(copy.rejectCount).toBe(1);
});

test('runners-up are distinct from the winner', () => {
  const e = mk();
  e.answer('q_kind', 'any');
  const { winner, runnersUp } = e.reveal();
  expect(runnersUp.length).toBe(2);
  expect(runnersUp).not.toContain(winner);
  expect(new Set(runnersUp).size).toBe(2);
});
