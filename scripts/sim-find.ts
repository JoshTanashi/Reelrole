// CLI simulation (HANDOVER §15 M6): a simulated user secretly picks a title and answers
// truthfully (with noise). Measures how fast the engine narrows 3,000 → 1 and how good the pick is.
// Run: npm run sim -- [sessions=300] [noise=0.1]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCatalogue, trait } from '../src/data/catalogue';
import { similarity } from '../src/data/similar';
import { FindEngine, TUNING } from '../src/engine/find-engine';
import { loadQuestions } from '../src/engine/questions';
import { likelihood } from '../src/engine/likelihood';
import { mulberry32 } from '../src/engine/rng';
import type { Question } from '../src/engine/types';

const root = join(import.meta.dirname, '..');
const core = JSON.parse(readFileSync(join(root, 'public/catalogue/core.json'), 'utf8'));
const cat = buildCatalogue(core, new Uint8Array(readFileSync(join(root, 'public/catalogue/traits.bin'))));
const questions = loadQuestions(JSON.parse(readFileSync(join(root, 'data/questions.seed.json'), 'utf8')));
const SESSIONS = Number(process.argv[2] ?? 300);
const NOISE = Number(process.argv[3] ?? 0.1);
const K = cat.traitKeys.length;
// Override tuning from env, e.g. TUNE='{"evidencePower":1.6,"aliveRatio":0.05}'
if (process.env.TUNE) Object.assign(TUNING, JSON.parse(process.env.TUNE));
const QUIET = !!process.env.QUIET;
const rng = mulberry32(2026);

const compile = (q: Question, effects: Question['options'][number]['effects']) =>
  effects.map((e) => ({ j: cat.traitIndex.get(e.trait) ?? -1, op: e.op, value: e.value ?? 0.5, strength: e.strength })).filter((e) => e.j >= 0);
const L = (q: Question, effects: Question['options'][number]['effects'], t: number) => likelihood(compile(q, effects), cat.traits, t, K);

const pctOf = (traitKey: string, t: number) => {
  const j = cat.traitIndex.get(traitKey)!;
  const v = cat.traits[t * K + j]!;
  let below = 0;
  for (let i = 0; i < cat.titles.length; i++) if (cat.traits[i * K + j]! < v) below++;
  return below / cat.titles.length;
};

function respond(q: Question, t: number): string | { slider: number } | { chips: string[] } {
  const target = cat.titles[t]!;
  const noisy = rng.next() < NOISE;
  switch (q.id) {
    case 'q_kind':
      return rng.next() < 0.6 ? target.kind : 'any';
    case 'q_who':
      return trait(cat, t, 'family_safe') > 0.6 && rng.next() < 0.3 ? 'family' : rng.next() < 0.15 ? 'date' : 'solo';
    case 'q_time_movie':
      return trait(cat, t, 'len_short') > 0.5 ? 'short' : trait(cat, t, 'len_long') > 0.5 ? 'long' : 'normal';
    case 'q_time_series':
      return trait(cat, t, 'commit_limited') > 0.5 ? 'limited' : trait(cat, t, 'commit_long_haul') > 0.5 ? 'long' : 'few';
  }
  if (q.kind === 'slider' && q.slider) {
    const pct = pctOf(q.slider.trait, t);
    const v = Math.round(Math.min(1, Math.max(0, (pct - 0.08) / 0.84)) * 4) / 4;
    return { slider: noisy ? Math.round(rng.next() * 4) / 4 : v };
  }
  if (q.kind === 'chips') {
    const hits = q.options.filter((o) => o.effects.length && L(q, o.effects, t) >= 0.85).map((o) => o.id);
    return { chips: hits.length ? hits : ['none'] };
  }
  if (q.kind === 'probe') {
    const pid = cat.indexById.get(q.options[0]!.titleId!)!;
    if (pid === t || rng.next() < 0.5) return 'no';
    return similarity(cat, pid, t) > 0.25 ? 'loved' : 'meh';
  }
  const opts = q.options;
  if (noisy) return opts[Math.floor(rng.next() * opts.length)]!.id;
  // Truthful: the option that best describes the target (ties → the more specific, non-neutral option).
  let best = opts[0]!;
  let bestL = -1;
  for (const o of opts) {
    const l = o.effects.length ? L(q, o.effects, t) : 0.7;
    if (l > bestL) {
      bestL = l;
      best = o;
    }
  }
  return best.id;
}

const pool = cat.titles.map((_, i) => i).filter((i) => cat.titles[i]!.votes >= 800);
let qSum = 0, win = 0, top3 = 0, aliveEnd = 0, simSum = 0, randSim = 0, nextMs = 0, nextCalls = 0, maxNext = 0;
const qHist = new Map<number, number>();
const qUse = new Map<string, number>();
const examples: string[] = [];
const aliveAt: number[][] = [];
const leaderStable: number[] = [];

for (let s = 0; s < SESSIONS; s++) {
  const t = pool[Math.floor(rng.next() * pool.length)]!;
  const e = new FindEngine(cat, questions, { seed: 1000 + s });
  const trail: string[] = [];
  for (;;) {
    const t0 = performance.now();
    const q = e.next();
    const ms = performance.now() - t0;
    nextMs += ms;
    nextCalls++;
    maxNext = Math.max(maxNext, ms);
    if (!q) break;
    const a = respond(q, t);
    const r = e.answer(q.id, a);
    (aliveAt[e.questionsAsked] ??= []).push(r.aliveAfter);
    qUse.set(q.id, (qUse.get(q.id) ?? 0) + 1);
    trail.push(`${q.id.replace(/^q_/, '')}=${typeof a === 'string' ? a : JSON.stringify(a).replace(/"/g, '')} (${r.aliveAfter})`);
  }
  const n = e.questionsAsked;
  qSum += n;
  qHist.set(n, (qHist.get(n) ?? 0) + 1);
  const { winner, runnersUp } = e.reveal();
  const wi = cat.indexById.get(winner)!;
  const tid = cat.titles[t]!.id;
  if (winner === tid) win++;
  if (winner === tid || runnersUp.includes(tid)) top3++;
  if (e.alive().includes(tid)) aliveEnd++;
  simSum += similarity(cat, wi, t);
  randSim += similarity(cat, pool[Math.floor(rng.next() * pool.length)]!, t);
  if (examples.length < 6) {
    examples.push(
      `• Thinking of: ${cat.titles[t]!.title} (${cat.titles[t]!.year})\n  ${trail.join(' → ')}\n  Reveal: ${cat.titles[wi]!.title}` +
        ` · also: ${runnersUp.map((id) => cat.titles[cat.indexById.get(id)!]!.title).join(', ')}`,
    );
  }
}

console.log('avg alive after Q: ' + aliveAt.map((xs, i) => xs ? `${i}:${Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)}` : '').filter(Boolean).join(' '));
const pc = (x: number) => `${((100 * x) / SESSIONS).toFixed(1)}%`;
console.log(`\n${process.env.TUNE ?? 'default tuning'} — Find engine simulation — ${SESSIONS} sessions, ${cat.titles.length} titles, noise ${NOISE * 100}%\n`);
console.log(`Questions per session: avg ${(qSum / SESSIONS).toFixed(1)}  · histogram ${[...qHist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`Exact title revealed as winner: ${pc(win)} · in winner + 2 runners-up: ${pc(top3)} · still alive at reveal: ${pc(aliveEnd)}`);
console.log(`Similarity winner↔secret title: ${(simSum / SESSIONS).toFixed(2)} (random pick: ${(randSim / SESSIONS).toFixed(2)})`);
console.log(`next() timing: avg ${(nextMs / nextCalls).toFixed(1)}ms · max ${maxNext.toFixed(1)}ms (Node, desktop CPU)`);
if (!QUIET) console.log(`\nMost-asked questions: ${[...qUse.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k.replace(/^q_/, '')} ${v}`).join(' · ')}`);
if (!QUIET) console.log(`\nExample sessions (alive count after each answer):\n${examples.join('\n\n')}\n`);
