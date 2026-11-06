import { likelihood, match, EPSILON, type CompiledEffect } from './likelihood';

const traits = new Float32Array([0, 0.5, 1]); // 3 titles × 1 trait
const L = (e: CompiledEffect[], row: number) => likelihood(e, traits, row, 1);

test('likelihood floor: even a total mismatch at full strength stays ≥ ε', () => {
  const e: CompiledEffect[] = [{ j: 0, op: 'has', value: 0, strength: 1 }];
  expect(L(e, 0)).toBeCloseTo(EPSILON);
  expect(L(e, 2)).toBe(1);
  for (const op of ['gte', 'lte', 'near', 'eq', 'has', 'not'] as const)
    for (let r = 0; r < 3; r++) expect(L([{ j: 0, op, value: 0.5, strength: 1 }], r)).toBeGreaterThanOrEqual(EPSILON - 1e-9);
});

test("don't care (no effects) is a no-op: L = 1 for everyone", () => {
  for (let r = 0; r < 3; r++) expect(L([], r)).toBe(1);
});

test('strength scales how much an answer matters', () => {
  const weak = L([{ j: 0, op: 'has', value: 0, strength: 0.2 }], 0);
  const strong = L([{ j: 0, op: 'has', value: 0, strength: 0.9 }], 0);
  expect(weak).toBeGreaterThan(strong);
});

test('match ops behave', () => {
  expect(match('gte', 0.9, 0.5)).toBe(1);
  expect(match('gte', 0.1, 0.5)).toBe(0);
  expect(match('lte', 0.1, 0.5)).toBe(1);
  expect(match('near', 0.5, 0.5)).toBe(1);
  expect(match('near', 0.9, 0.5)).toBeLessThan(0.2);
  expect(match('not', 0.25)).toBe(0.75);
});
