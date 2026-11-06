import type { Question } from './types';

export interface GateState {
  asked: number;
  kind: 'movie' | 'series' | 'any';
  answers: Map<string, string | string[] | number>;
  /** Σ p·trait over the current distribution. */
  traitMass: (trait: string) => number;
}

const cmp = (expr: string, x: number) => {
  const m = /^(>=|<=|>|<)\s*([\d.]+)$/.exec(expr.trim());
  if (!m) return true;
  const v = Number(m[2]);
  return m[1] === '>' ? x > v : m[1] === '<' ? x < v : m[1] === '>=' ? x >= v : x <= v;
};

/** HANDOVER §8.5: kind / trait_mass / after / not_answered / answered. */
export function gateOpen(q: Question, s: GateState): boolean {
  const after = q.requires?.after ?? q.after;
  if (after !== undefined && s.asked < after) return false;
  const r = q.requires;
  if (!r) return true;
  if (r.kind && s.kind !== r.kind) return false;
  if (r.not_answered && s.answers.has(r.not_answered)) return false;
  if (r.answered) for (const [qid, opt] of Object.entries(r.answered)) if (s.answers.get(qid) !== opt) return false;
  if (r.trait_mass) for (const [trait, expr] of Object.entries(r.trait_mass)) if (!cmp(expr, s.traitMass(trait))) return false;
  return true;
}
