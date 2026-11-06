import type { Catalogue } from './catalogue';

/**
 * Trait-space neighbours (HANDOVER §9.8 "More like this").
 * Vectors are mean-centred per trait then L2-normalised, so cosine reflects what makes a
 * title *distinct*, not the baseline values every title shares.
 */
const cache = new WeakMap<Catalogue, Float32Array>();

/** Mean-centred, L2-normalised trait vectors (N × K), cached per catalogue. */
export function normalised(cat: Catalogue): Float32Array {
  const hit = cache.get(cat);
  if (hit) return hit;
  const K = cat.traitKeys.length;
  const N = cat.titles.length;
  const mean = new Float32Array(K);
  for (let i = 0; i < N; i++) for (let k = 0; k < K; k++) mean[k]! += cat.traits[i * K + k]! / N;
  const out = new Float32Array(N * K);
  for (let i = 0; i < N; i++) {
    let norm = 0;
    for (let k = 0; k < K; k++) {
      const v = cat.traits[i * K + k]! - mean[k]!;
      out[i * K + k] = v;
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (let k = 0; k < K; k++) out[i * K + k]! /= norm;
  }
  cache.set(cat, out);
  return out;
}

export function similarity(cat: Catalogue, a: number, b: number): number {
  const v = normalised(cat);
  const K = cat.traitKeys.length;
  let s = 0;
  for (let k = 0; k < K; k++) s += v[a * K + k]! * v[b * K + k]!;
  return s;
}

export function similar(cat: Catalogue, index: number, n = 10, exclude: (i: number) => boolean = () => false): number[] {
  const v = normalised(cat);
  const K = cat.traitKeys.length;
  const kind = cat.titles[index]!.kind;
  const scored: [number, number][] = [];
  for (let i = 0; i < cat.titles.length; i++) {
    if (i === index || exclude(i)) continue;
    let s = 0;
    for (let k = 0; k < K; k++) s += v[index * K + k]! * v[i * K + k]!;
    if (cat.titles[i]!.kind === kind) s += 0.05;
    s += Math.min(0.04, Math.log10(1 + cat.titles[i]!.votes) / 100); // gentle tie-break toward known titles
    scored.push([s, i]);
  }
  scored.sort((x, y) => y[0] - x[0]);
  return scored.slice(0, n).map(([, i]) => i);
}
