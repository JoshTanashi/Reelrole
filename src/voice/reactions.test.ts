import { Voice } from './reactions';

test('never repeats a line within the LRU window when alternatives exist', () => {
  const v = new Voice();
  const seen = [v.say('scary'), v.say('scary'), v.say('scary'), v.say('scary')];
  expect(new Set(seen).size).toBe(4);
});

test('falls back to the generic bank for unknown tags', () => {
  const v = new Voice(() => 0);
  expect(v.say('definitely-not-a-tag')).toBeTruthy();
});
