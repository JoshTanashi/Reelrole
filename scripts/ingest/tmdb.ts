// Minimal TMDB v3 client for the build-time ingest. Auth header is injected by the
// environment's network proxy (or TMDB_TOKEN locally); the token never ships in the app.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BASE = 'https://api.themoviedb.org/3';
const CACHE = join(import.meta.dirname, '..', '.cache', 'tmdb');
mkdirSync(CACHE, { recursive: true });

const token = process.env.TMDB_TOKEN ?? 'proxy-injected';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function tmdb<T = any>(path: string, params: Record<string, string | number> = {}, { cache = true } = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const url = `${BASE}${path}${qs.size ? `?${qs}` : ''}`;
  const file = join(CACHE, createHash('sha1').update(url).digest('hex') + '.json');
  if (cache && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, accept: 'application/json' } });
      if (res.status === 429 || res.status >= 500) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`TMDB ${res.status} ${url}`);
      const json = await res.json();
      if (cache) writeFileSync(file, JSON.stringify(json));
      return json as T;
    } catch (e) {
      if (attempt === 5) throw e;
      await sleep(500 * 2 ** attempt);
    }
  }
  throw new Error('unreachable');
}

/** Run async jobs with bounded concurrency, reporting progress. */
export async function pool<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>, label = ''): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  const workers = Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
      done++;
      if (label && done % 250 === 0) console.log(`  ${label}: ${done}/${items.length}`);
    }
  });
  await Promise.all(workers);
  return out;
}
