// Reelrole ingest (HANDOVER §7.2): TMDB → tagged, ZA-provider-aware catalogue for the client.
// Run: npm run ingest   (TMDB auth via proxy-injected token, or TMDB_TOKEN env locally)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { tmdb, pool } from './tmdb.ts';
import { discover, type Candidate } from './discover.ts';
import { tag, TRAIT_KEYS, type TagInput } from './tagger.ts';
import { colorAndHash } from './colors.ts';

const OUT = join(import.meta.dirname, '../../public/catalogue');
const REGION = 'ZA';
const TARGET = { movie: Number(process.env.MOVIES ?? 2000), series: Number(process.env.SERIES ?? 1000) };
const BUCKETS = 32;

type ProvType = 'flatrate' | 'rent' | 'buy' | 'free' | 'ads';
const PROV_TYPES: ProvType[] = ['flatrate', 'rent', 'buy', 'free', 'ads'];

async function details(c: Candidate) {
  const isMovie = c.kind === 'movie';
  const append = isMovie
    ? 'keywords,videos,credits,release_dates,watch/providers,external_ids'
    : 'keywords,videos,credits,content_ratings,watch/providers,external_ids';
  return tmdb(`/${isMovie ? 'movie' : 'tv'}/${c.tmdbId}`, { language: 'en-US', append_to_response: append });
}

function certification(d: any, kind: 'movie' | 'series'): string | null {
  if (kind === 'movie') {
    const pick = (cc: string) =>
      d.release_dates?.results?.find((r: any) => r.iso_3166_1 === cc)?.release_dates?.map((x: any) => x.certification).find((x: string) => x) ?? null;
    return pick('ZA') ?? pick('US') ?? pick('GB');
  }
  const pick = (cc: string) => d.content_ratings?.results?.find((r: any) => r.iso_3166_1 === cc)?.rating || null;
  return pick('ZA') ?? pick('US') ?? pick('GB');
}

function trailer(d: any): string | null {
  const vids = (d.videos?.results ?? []).filter((v: any) => v.site === 'YouTube');
  const rank = (v: any) => (v.type === 'Trailer' ? 0 : v.type === 'Teaser' ? 2 : 4) + (v.official ? 0 : 1);
  vids.sort((a: any, b: any) => rank(a) - rank(b));
  return vids[0]?.key ?? null;
}

async function main() {
  const t0 = Date.now();
  const cands = await discover(TARGET);

  console.log(`details: fetching ${cands.length} titles…`);
  const raw = await pool(cands, 16, (c) => details(c).catch((e) => (console.warn(String(e)), null)), 'details');

  type Row = ReturnType<typeof normalise>;
  function normalise(c: Candidate, d: any) {
    const isMovie = c.kind === 'movie';
    const date: string = (isMovie ? d.release_date : d.first_air_date) ?? '';
    const za = d['watch/providers']?.results?.[REGION] ?? {};
    const providers: Partial<Record<ProvType, number[]>> = {};
    for (const t of PROV_TYPES) if (za[t]?.length) providers[t] = za[t].map((p: any) => p.provider_id);
    const cast = (d.credits?.cast ?? []).slice(0, 6).map((p: any) => ({ name: p.name, character: p.character ?? p.roles?.[0]?.character ?? '', profile: p.profile_path ?? null }));
    const tagIn: TagInput = {
      kind: c.kind,
      genres: (d.genres ?? []).map((g: any) => g.name),
      keywords: (isMovie ? d.keywords?.keywords : d.keywords?.results ?? []).map((k: any) => String(k.name).toLowerCase()),
      year: date ? Number(date.slice(0, 4)) : null,
      runtime: isMovie ? d.runtime || null : null,
      seasons: isMovie ? null : d.number_of_seasons ?? null,
      episodes: isMovie ? null : d.number_of_episodes ?? null,
      certification: certification(d, c.kind),
      originalLanguage: d.original_language ?? 'en',
      originCountries: d.origin_country ?? (d.production_countries ?? []).map((p: any) => p.iso_3166_1),
      voteAverage: d.vote_average ?? 0,
      voteCount: d.vote_count ?? 0,
      popularity: d.popularity ?? 0,
      inCollection: Boolean(d.belongs_to_collection),
      leadGender: d.credits?.cast?.[0]?.gender ?? null,
      castSize: d.credits?.cast?.length ?? 0,
      isMiniseries: d.type === 'Miniseries',
    };
    return {
      id: c.tmdbId * 10 + (isMovie ? 0 : 1),
      tmdbId: c.tmdbId,
      kind: c.kind,
      title: (isMovie ? d.title : d.name) as string,
      originalTitle: (isMovie ? d.original_title : d.original_name) as string,
      year: tagIn.year,
      overview: (d.overview ?? '') as string,
      tagline: (d.tagline ?? '') as string,
      runtime: tagIn.runtime,
      seasons: tagIn.seasons,
      episodes: tagIn.episodes,
      episodeRuntime: isMovie ? null : d.episode_run_time?.[0] ?? d.last_episode_to_air?.runtime ?? null,
      status: isMovie ? null : (d.status as string),
      certification: tagIn.certification,
      genres: tagIn.genres,
      language: tagIn.originalLanguage,
      poster: d.poster_path as string,
      backdrop: (d.backdrop_path ?? null) as string | null,
      trailer: trailer(d),
      voteAverage: Math.round((d.vote_average ?? 0) * 10) / 10,
      voteCount: d.vote_count ?? 0,
      popularity: Math.round((d.popularity ?? 0) * 10) / 10,
      imdbId: d.external_ids?.imdb_id ?? null,
      providers,
      watchLink: (za.link ?? null) as string | null,
      cast,
      tagIn,
    };
  }

  const rows: Row[] = [];
  cands.forEach((c, i) => {
    const d = raw[i];
    if (d && d.poster_path) rows.push(normalise(c, d));
  });

  // Catalogue-relative percentiles for hidden_gem.
  const pct = (kind: string, key: 'popularity' | 'voteCount') => {
    const xs = rows.filter((r) => r.kind === kind).map((r) => r[key]).sort((a, b) => a - b);
    return (x: number) => {
      let lo = 0, hi = xs.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (xs[m]! < x) lo = m + 1; else hi = m; }
      return lo / Math.max(1, xs.length - 1);
    };
  };
  const P = { movie: { pop: pct('movie', 'popularity'), vote: pct('movie', 'voteCount') }, series: { pop: pct('series', 'popularity'), vote: pct('series', 'voteCount') } };

  console.log('colours + blurhash…');
  const looks = await pool(rows, 24, (r) => colorAndHash(r.poster).catch(() => ({ color: '#2a2233', blurhash: '' })), 'posters');

  const traitsBin = new Uint8Array(rows.length * TRAIT_KEYS.length);
  rows.forEach((r, i) => {
    const tv = tag(r.tagIn, P[r.kind].pop(r.popularity), P[r.kind].vote(r.voteCount));
    TRAIT_KEYS.forEach((k, j) => (traitsBin[i * TRAIT_KEYS.length + j] = Math.round(tv[k]! * 255)));
  });

  // Providers available in ZA (logos + priority), limited to ones that appear in the catalogue.
  const used = new Map<number, number>();
  for (const r of rows) for (const id of new Set(Object.values(r.providers).flat())) used.set(id, (used.get(id) ?? 0) + 1);
  const provList = new Map<number, any>();
  for (const k of ['movie', 'tv']) {
    const res = await tmdb(`/watch/providers/${k}`, { watch_region: REGION, language: 'en-US' });
    for (const p of res.results) if (used.has(p.provider_id)) provList.set(p.provider_id, p);
  }
  const providers = [...provList.values()]
    .map((p) => ({ id: p.provider_id, name: p.provider_name, logo: p.logo_path, priority: p.display_priorities?.[REGION] ?? p.display_priority ?? 99, titles: used.get(p.provider_id) ?? 0 }))
    .sort((a, b) => a.priority - b.priority);

  const genreList = [...new Set(rows.flatMap((r) => r.genres))].sort();
  const version = new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + rows.length;

  const core = {
    version,
    region: REGION,
    generatedAt: new Date().toISOString(),
    traitKeys: TRAIT_KEYS,
    genres: genreList,
    providers,
    titles: rows.map((r, i) => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      year: r.year,
      poster: r.poster,
      backdrop: r.backdrop,
      genres: r.genres.map((g) => genreList.indexOf(g)),
      rating: r.voteAverage,
      votes: r.voteCount,
      popularity: r.popularity,
      runtime: r.runtime,
      seasons: r.seasons,
      episodes: r.episodes,
      cert: r.certification,
      lang: r.language,
      color: looks[i]!.color,
      blurhash: looks[i]!.blurhash,
      providers: r.providers,
    })),
  };

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'detail'), { recursive: true });
  const coreJson = JSON.stringify(core);
  writeFileSync(join(OUT, 'core.json'), coreJson);
  writeFileSync(join(OUT, 'traits.bin'), traitsBin);

  const buckets: Record<string, any>[] = Array.from({ length: BUCKETS }, () => ({}));
  for (const r of rows) {
    buckets[r.id % BUCKETS]![r.id] = {
      originalTitle: r.originalTitle !== r.title ? r.originalTitle : undefined,
      overview: r.overview,
      tagline: r.tagline || undefined,
      trailer: r.trailer,
      cast: r.cast,
      imdbId: r.imdbId,
      watchLink: r.watchLink,
      status: r.status ?? undefined,
      episodeRuntime: r.episodeRuntime ?? undefined,
      tmdbId: r.tmdbId,
    };
  }
  buckets.forEach((b, i) => writeFileSync(join(OUT, 'detail', `${i}.json`), JSON.stringify(b)));

  // Search index: original title + top-4 cast per title, aligned with core.titles order.
  const search = rows.map((r) => [r.originalTitle !== r.title ? r.originalTitle : '', r.cast.slice(0, 4).map((c: { name: string }) => c.name).join('|')]);
  writeFileSync(join(OUT, 'search.json'), JSON.stringify(search));

  // Report
  const n = (k: string) => rows.filter((r) => r.kind === k).length;
  const withProv = rows.filter((r) => Object.keys(r.providers).length).length;
  const withStream = rows.filter((r) => r.providers.flatrate?.length).length;
  const traitMean = (k: string) => {
    const j = TRAIT_KEYS.indexOf(k);
    let s = 0;
    for (let i = 0; i < rows.length; i++) s += traitsBin[i * TRAIT_KEYS.length + j]! / 255;
    return (s / rows.length).toFixed(2);
  };
  const report = [
    `# Catalogue report (${version})`,
    '',
    `- Movies: ${n('movie')} · Series: ${n('series')} · Total: ${rows.length}`,
    `- With any ZA provider: ${withProv} · Streamable (flatrate) in ZA: ${withStream}`,
    `- With trailer: ${rows.filter((r) => r.trailer).length} · With backdrop: ${rows.filter((r) => r.backdrop).length}`,
    `- South African titles: ${rows.filter((r) => r.tagIn.originCountries.includes('ZA')).length}`,
    `- core.json: ${(coreJson.length / 1e6).toFixed(2)} MB (${(gzipSync(coreJson).length / 1e6).toFixed(2)} MB gz) · traits.bin: ${(traitsBin.length / 1e3).toFixed(0)} KB`,
    `- Built in ${((Date.now() - t0) / 1000).toFixed(0)}s`,
    '',
    '## ZA providers (titles in catalogue, any type)',
    '',
    '| Provider | Titles | Streaming (flatrate) |',
    '|---|---|---|',
    ...providers
      .slice()
      .sort((a, b) => b.titles - a.titles)
      .slice(0, 30)
      .map((p) => `| ${p.name} | ${p.titles} | ${rows.filter((r) => r.providers.flatrate?.includes(p.id)).length} |`),
    '',
    '## Trait means (sanity check)',
    '',
    TRAIT_KEYS.filter((k) => !k.startsWith('theme_') && !k.startsWith('setting_')).map((k) => `${k} ${traitMean(k)}`).join(' · '),
    '',
    'Themes: ' + TRAIT_KEYS.filter((k) => k.startsWith('theme_')).map((k) => `${k.slice(6)} ${traitMean(k)}`).join(' · '),
  ].join('\n');
  writeFileSync(join(import.meta.dirname, '../../docs/CATALOGUE_REPORT.md'), report + '\n');
  console.log('\n' + report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
