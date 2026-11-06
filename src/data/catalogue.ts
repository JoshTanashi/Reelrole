import { applyCorrections } from './remote';
// Client catalogue (HANDOVER §7.5): core.json + traits.bin, cached by the service worker.
export type Kind = 'movie' | 'series';
export type ProvType = 'flatrate' | 'rent' | 'buy' | 'free' | 'ads';

export interface Title {
  id: number;
  kind: Kind;
  title: string;
  year: number | null;
  poster: string;
  backdrop: string | null;
  genres: number[];
  rating: number;
  votes: number;
  popularity: number;
  runtime: number | null;
  seasons: number | null;
  episodes: number | null;
  cert: string | null;
  lang: string;
  color: string;
  blurhash: string;
  providers: Partial<Record<ProvType, number[]>>;
}

export interface Provider { id: number; name: string; logo: string; priority: number; titles: number }

export interface TitleDetail {
  originalTitle?: string;
  overview: string;
  tagline?: string;
  trailer: string | null;
  cast: { name: string; character: string; profile: string | null }[];
  imdbId: string | null;
  watchLink: string | null;
  status?: string;
  episodeRuntime?: number;
  tmdbId: number;
}

export interface Catalogue {
  version: string;
  region: string;
  traitKeys: string[];
  traitIndex: Map<string, number>;
  genres: string[];
  providers: Provider[];
  providerById: Map<number, Provider>;
  titles: Title[];
  indexById: Map<number, number>;
  /** Row-major N × K, values 0..1. */
  traits: Float32Array;
}

const BASE = `${import.meta.env?.BASE_URL ?? "/"}catalogue`;
const DETAIL_BUCKETS = 32;

export function decodeTraits(bytes: Uint8Array): Float32Array {
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i]! / 255;
  return out;
}

export function buildCatalogue(core: Omit<Catalogue, 'traitIndex' | 'providerById' | 'indexById' | 'traits'>, traitBytes: Uint8Array): Catalogue {
  const expected = core.titles.length * core.traitKeys.length;
  if (traitBytes.length !== expected) throw new Error(`traits.bin size ${traitBytes.length} ≠ ${expected}`);
  return {
    ...core,
    traitIndex: new Map(core.traitKeys.map((k, i) => [k, i])),
    providerById: new Map(core.providers.map((p) => [p.id, p])),
    indexById: new Map(core.titles.map((t, i) => [t.id, i])),
    traits: decodeTraits(traitBytes),
  };
}

let loading: Promise<Catalogue> | null = null;
export function loadCatalogue(): Promise<Catalogue> {
  loading ??= (async () => {
    const [core, bin] = await Promise.all([
      fetch(`${BASE}/core.json`).then((r) => r.json()),
      fetch(`${BASE}/traits.bin`).then((r) => r.arrayBuffer()),
    ]);
    const cat = buildCatalogue(core, new Uint8Array(bin));
    applyCorrections(cat); // crowd-learned trait nudges (cached from Supabase)
    return cat;
  })();
  return loading;
}

export function trait(cat: Catalogue, titleIndex: number, key: string): number {
  const j = cat.traitIndex.get(key);
  return j === undefined ? 0 : cat.traits[titleIndex * cat.traitKeys.length + j]!;
}

const detailCache = new Map<number, Promise<Record<string, TitleDetail>>>();
export async function loadDetail(id: number): Promise<TitleDetail | null> {
  const b = id % DETAIL_BUCKETS;
  if (!detailCache.has(b)) detailCache.set(b, fetch(`${BASE}/detail/${b}.json`).then((r) => r.json()));
  return (await detailCache.get(b)!)[id] ?? null;
}

export type ImgSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original';
export const img = (path: string | null, size: ImgSize) => (path ? `https://image.tmdb.org/t/p/${size}${path}` : '');
