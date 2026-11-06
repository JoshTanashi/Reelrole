/** Shannon entropy (bits) of a non-negative weight vector (normalised internally). */
export function entropy(w: ArrayLike<number>): number {
  let z = 0;
  for (let i = 0; i < w.length; i++) z += w[i]!;
  if (z <= 0) return 0;
  let h = 0;
  for (let i = 0; i < w.length; i++) {
    const p = w[i]! / z;
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/**
 * IG(q) = H(p) − Σ_a P(a) · H(p | a)   with   P(a) ∝ Σ_t p_t · L(a|t)   (HANDOVER §8.4).
 * `lik[a][t]` = L(answer a | title t) for the titles in `p`.
 */
export function infoGain(p: Float64Array, lik: Float64Array[]): number {
  if (lik.length < 2) return 0;
  const H = entropy(p);
  const Z: number[] = [];
  const Ha: number[] = [];
  const post = new Float64Array(p.length);
  for (const L of lik) {
    let z = 0;
    for (let t = 0; t < p.length; t++) {
      post[t] = p[t]! * L[t]!;
      z += post[t]!;
    }
    Z.push(z);
    Ha.push(entropy(post));
  }
  const zs = Z.reduce((a, b) => a + b, 0);
  if (zs <= 0) return 0;
  let expected = 0;
  for (let a = 0; a < lik.length; a++) expected += (Z[a]! / zs) * Ha[a]!;
  return Math.max(0, H - expected);
}
