import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';
import { useNav } from '../store/nav';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
});

test('renders the four tabs and switches on tap', () => {
  render(<App />);
  for (const name of ['Find', 'Swipe', 'Roll', 'Library']) expect(screen.getByRole('tab', { name })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Roll' }));
  expect(useNav.getState().tab).toBe('roll');
  expect(screen.getByRole('tab', { name: 'Roll' })).toHaveAttribute('aria-selected', 'true');
});

test('re-tapping the active tab bumps its reset signal', () => {
  render(<App />);
  const before = useNav.getState().reset.library;
  fireEvent.click(screen.getByRole('tab', { name: 'Library' }));
  fireEvent.click(screen.getByRole('tab', { name: 'Library' }));
  expect(useNav.getState().reset.library).toBe(before + 1);
});
