import { useLibrary, inSegment } from './library';

beforeEach(() => useLibrary.getState().clear());

test('list / like / watched / not-for-me toggles', () => {
  const L = useLibrary.getState();
  expect(L.toggleList(10)).toBe(true);
  expect(inSegment(useLibrary.getState().get(10), 'list')).toBe(true);
  expect(L.toggleLike(10)).toBe(true);
  L.setWatched(10, true, 5);
  const u = useLibrary.getState().get(10);
  expect(u.watched && u.myRating === 5 && u.liked === true).toBe(true);
});

test('not for me removes from list and clears a like', () => {
  const L = useLibrary.getState();
  L.toggleList(20);
  L.toggleLike(20);
  expect(L.toggleNotForMe(20)).toBe(true);
  const u = useLibrary.getState().get(20);
  expect(u.onList).toBe(false);
  expect(u.liked).toBe(null);
  expect(inSegment(u, 'nope')).toBe(true);
});
