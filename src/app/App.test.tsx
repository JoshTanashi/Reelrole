import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders wordmark and primary CTA', () => {
  render(<App />);
  expect(screen.getByLabelText('reelrole')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /let's roll/i })).toBeInTheDocument();
});
