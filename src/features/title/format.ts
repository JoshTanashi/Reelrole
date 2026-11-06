import type { Title } from '../../data/catalogue';

export const fmtRuntime = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`);

export const fmtVotes = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

/** "2h 14m" for movies, "3 seasons · 24 eps" for series. */
export function lengthLabel(t: Title): string | null {
  if (t.kind === 'movie') return t.runtime ? fmtRuntime(t.runtime) : null;
  if (!t.seasons) return null;
  const s = `${t.seasons} season${t.seasons > 1 ? 's' : ''}`;
  return t.episodes ? `${s} · ${t.episodes} eps` : s;
}
