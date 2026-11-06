// Step 1: build the candidate list (HANDOVER §7.2.1).
import { tmdb } from './tmdb.ts';

export type Kind = 'movie' | 'series';
export interface Candidate { tmdbId: number; kind: Kind; popularity: number; voteCount: number; voteAverage: number; za: boolean; topRated: boolean }

const TV_EXCLUDE_GENRES = '10763|10767'; // News, Talk

async function pages(path: string, params: Record<string, string | number>, n: number) {
  const out: any[] = [];
  for (let p = 1; p <= n; p++) {
    const r = await tmdb(path, { ...params, page: p });
    out.push(...r.results);
    if (p >= r.total_pages) break;
  }
  return out;
}

export async function discover(target: { movie: number; series: number }): Promise<Candidate[]> {
  const map = new Map<string, Candidate>();
  const add = (kind: Kind, r: any, flags: Partial<Candidate> = {}) => {
    if (r.adult || !r.poster_path) return;
    if (flags.za && (r.vote_average ?? 0) < 5.5) return;
    const key = `${kind}:${r.id}`;
    const prev = map.get(key);
    map.set(key, {
      tmdbId: r.id,
      kind,
      popularity: r.popularity ?? 0,
      voteCount: r.vote_count ?? 0,
      voteAverage: r.vote_average ?? 0,
      za: Boolean(prev?.za || flags.za),
      topRated: Boolean(prev?.topRated || flags.topRated),
    });
  };

  const common = { include_adult: 'false', language: 'en-US' };
  console.log('discover: movies by popularity…');
  for (const r of await pages('/discover/movie', { ...common, sort_by: 'popularity.desc', 'vote_count.gte': 300 }, 140)) add('movie', r);
  console.log('discover: movies by vote count…');
  for (const r of await pages('/discover/movie', { ...common, sort_by: 'vote_count.desc' }, 60)) add('movie', r);
  console.log('discover: top rated movies…');
  for (const r of await pages('/movie/top_rated', { language: 'en-US' }, 25)) if (r.vote_count >= 300) add('movie', r, { topRated: true });

  console.log('discover: series by popularity…');
  for (const r of await pages('/discover/tv', { ...common, sort_by: 'popularity.desc', 'vote_count.gte': 150, without_genres: TV_EXCLUDE_GENRES }, 80)) add('series', r);
  console.log('discover: series by vote count…');
  for (const r of await pages('/discover/tv', { ...common, sort_by: 'vote_count.desc', without_genres: TV_EXCLUDE_GENRES }, 30)) add('series', r);
  console.log('discover: top rated series…');
  for (const r of await pages('/tv/top_rated', { language: 'en-US' }, 15)) if (r.vote_count >= 150) add('series', r, { topRated: true });

  // Proudly SA: lower thresholds so local titles exist for q_local.
  console.log('discover: South African titles…');
  for (const r of await pages('/discover/movie', { ...common, with_origin_country: 'ZA', sort_by: 'popularity.desc', 'vote_count.gte': 8 }, 5)) add('movie', r, { za: true });
  for (const r of await pages('/discover/tv', { ...common, with_origin_country: 'ZA', sort_by: 'popularity.desc', 'vote_count.gte': 3, without_genres: TV_EXCLUDE_GENRES }, 5)) add('series', r, { za: true });

  const pick = (kind: Kind, n: number) => {
    const all = [...map.values()].filter((c) => c.kind === kind);
    const rank = (key: 'popularity' | 'voteCount') => {
      const sorted = [...all].sort((a, b) => b[key] - a[key]);
      return new Map(sorted.map((c, i) => [c, 1 - i / sorted.length]));
    };
    const rp = rank('popularity');
    const rv = rank('voteCount');
    const score = (c: Candidate) => 0.5 * rp.get(c)! + 0.5 * rv.get(c)! + (c.topRated ? 0.15 : 0) + (c.za ? 2 : 0);
    return all.sort((a, b) => score(b) - score(a)).slice(0, n);
  };

  const movies = pick('movie', target.movie);
  const series = pick('series', target.series);
  console.log(`discover: ${map.size} candidates → ${movies.length} movies + ${series.length} series`);
  return [...movies, ...series];
}
