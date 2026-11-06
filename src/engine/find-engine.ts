import type { Catalogue } from '../data/catalogue';
import { similarity } from '../data/similar';
import { likelihood, type CompiledEffect } from './likelihood';
import { infoGain } from './info-gain';
import { gateOpen, type GateState } from './gating';
import { mulberry32, type Rng } from './rng';
import type { Answer, Effect, Option, Question } from './types';

/** HANDOVER §8. Tunables in one place. */
export const TUNING = {
  aliveRatio: 0.08, // alive = p ≥ max(p) · ratio (spec default 0.015; tuned by sim, see docs/FIND_ENGINE.md)
  topForIG: 500,
  maxQuestions: 14,
  minQuestionsToStop: 5,
  stopTopP: 0.3,
  stopAlive: 3,
  tastePrior: 0.6, // (1 + 0.6 · taste_sim)
  popPower: 0.35,
  variety: 1.15,
  pacing: 0.6,
  novelty: 0.85,
  jitter: 0.07,
  mmrLambda: 0.5,
  themeMass: [0.03, 0.6] as const,
  /** p ← p · L^β. β > 1 sharpens evidence; the ε floor still guarantees no single answer zeroes a title. */
  evidencePower: 2.5,
  /** Expected share of "don't care" answers; IG of questions offering one is discounted by it. */
  neutralShare: 0.25,
  /** Also stop once the leader clearly beats 4th place (p1 ≥ ratio · p4) after this many questions. */
  stopLeadRatio: 3,
  stopLeadAfter: 8,
  /** …or when no remaining question is worth asking (best IG in bits). */
  minIG: 0.1,
};

export interface EngineCtx {
  /** taste_sim(i) in [-1, 1], or null if no taste yet. */
  taste?: ((i: number) => number) | null;
  /** Titles to leave out entirely (not-for-me, optionally watched). */
  exclude?: (i: number) => boolean;
  /** Pre-set kind (skips "Movie or series?"). */
  kind?: 'movie' | 'series' | 'any';
  seed?: number;
  maxQuestions?: number;
  /** Question ids seen in the user's last 3 sessions (novelty penalty). */
  recentQuestionIds?: string[];
}

export interface AskedEntry { id: string; kind: Question['kind']; groupKey: string; neutral: boolean }

export interface AnswerResult {
  aliveBefore: number;
  aliveAfter: number;
  eliminated: number[]; // title ids
  revived: number[]; // title ids
  reactionTag?: string;
  /** Contextual voice tags (HANDOVER §11): bigDrop / tinyDrop / revive / closeCall / almostThere. */
  contextTags: string[];
}

export interface EngineSnapshot {
  v: 1;
  p: number[];
  mask: number[];
  kind: 'movie' | 'series' | 'any';
  asked: AskedEntry[];
  answers: [string, string | string[] | number][];
  everAlive: number[];
  rng: number;
  maxQ: number;
  rejects: number;
  probeDone: boolean;
  justShowMe: boolean;
  generated: Question[];
}

export class FindEngine {
  private readonly K: number;
  private readonly N: number;
  private readonly bank: Map<string, Question>;
  private readonly compiled = new Map<string, CompiledEffect[]>();
  private p: Float64Array;
  private mask: Uint8Array;
  private kind: 'movie' | 'series' | 'any';
  private asked: AskedEntry[] = [];
  private answers = new Map<string, string | string[] | number>();
  private everAlive = new Set<number>();
  private rng: Rng;
  private maxQ: number;
  private rejects = 0;
  private probeDone = false;
  private showNow = false;
  private generated = new Map<string, Question>();
  private quantiles = new Map<number, Float32Array>();

  constructor(
    private readonly cat: Catalogue,
    questions: Question[],
    private readonly ctx: EngineCtx = {},
  ) {
    this.K = cat.traitKeys.length;
    this.N = cat.titles.length;
    this.bank = new Map(questions.map((q) => [q.id, q]));
    this.rng = mulberry32(ctx.seed ?? Date.now());
    this.maxQ = ctx.maxQuestions ?? TUNING.maxQuestions;
    this.kind = ctx.kind ?? 'any';
    this.mask = new Uint8Array(this.N).fill(1);
    this.p = new Float64Array(this.N);

    // Prior (§8.1): popularity_norm^0.35 × (1 + 0.6 · taste_sim). popularity_norm = percentile rank.
    const order = cat.titles.map((_, i) => i).sort((a, b) => cat.titles[a]!.popularity - cat.titles[b]!.popularity);
    const pct = new Float64Array(this.N);
    order.forEach((i, r) => (pct[i] = Math.max(0.05, (r + 1) / this.N)));
    for (let i = 0; i < this.N; i++) {
      if (ctx.exclude?.(i) || (this.kind !== 'any' && cat.titles[i]!.kind !== this.kind)) {
        this.mask[i] = 0;
        continue;
      }
      const taste = ctx.taste ? Math.max(-0.9, ctx.taste(i)) : 0;
      this.p[i] = Math.pow(pct[i]!, TUNING.popPower) * (1 + TUNING.tastePrior * taste);
    }
    this.normalise();
    for (const i of this.aliveIdx()) this.everAlive.add(i);
  }

  // ---------- public API (§8.9) ----------

  /** Next question, or null → reveal. */
  next(): Question | null {
    if (this.shouldStop()) return null;
    const gate = this.gateState();

    // Fixed opening sequence (§8.6).
    const openings = [...this.bank.values()].filter((q) => q.opening !== undefined).sort((a, b) => a.opening! - b.opening!);
    for (const q of openings) {
      if (this.answers.has(q.id) || this.isAskedGroup(q.groupKey)) continue;
      if (q.id === 'q_kind' && this.ctx.kind) continue;
      if (gateOpen(q, gate)) return q;
    }

    const alive = this.topAlive(TUNING.topForIG);
    const sub = new Float64Array(alive.length);
    alive.forEach((i, k) => (sub[k] = this.p[i]!));

    let best: { q: Question; s: number } | null = null;
    let bestIG = 0;
    for (const q of this.bank.values()) {
      if (q.opening !== undefined || this.answers.has(q.id)) continue;
      if (!gateOpen(q, gate)) continue;
      if (q.themeKey && !this.themeSplits(q.themeKey)) continue;
      const ig = this.questionIG(q, alive, sub);
      bestIG = Math.max(bestIG, ig);
      const s = ig * this.modifiers(q);
      if (s > 0 && (!best || s > best.s)) best = { q, s };
    }

    // Generated: duel (after Q3, once) and the "Seen X?" probe (after Q6, once).
    if (this.asked.length >= 3 && !this.answers.has('q_duel')) {
      const duel = this.buildDuel(alive);
      if (duel) {
        const s = this.questionIG(duel, alive, sub) * this.modifiers(duel);
        if (!best || s > best.s) best = { q: duel, s };
      }
    }
    if (this.asked.length >= TUNING.minQuestionsToStop && this.extendedFrom < 0 && bestIG < TUNING.minIG && !(best && best.q.id === 'q_duel')) return null;
    if (this.asked.length >= 6 && !this.probeDone && bestIG < 0.35) {
      const probe = this.buildProbe();
      if (probe) best = { q: probe, s: Infinity };
    }
    return best?.q ?? null;
  }

  answer(qid: string, ans: Answer): AnswerResult {
    const q = this.bank.get(qid) ?? this.generated.get(qid);
    if (!q) throw new Error(`Unknown question ${qid}`);
    const before = new Set(this.aliveIdx());
    const topBefore = this.top(1)[0];
    let neutral = false;
    let reactionTag = q.reactionTag;

    if (q.kind === 'probe') {
      this.applyProbe(q, ans as string);
      reactionTag = ans === 'no' ? 'interesting' : 'great';
      this.probeDone = true;
    } else if (typeof ans === 'object' && 'slider' in ans) {
      const v = Math.min(1, Math.max(0, ans.slider));
      this.applyEffects([this.sliderEffect(q, v)]);
      this.answers.set(qid, v);
    } else if (typeof ans === 'object' && 'chips' in ans) {
      const picked = q.options.filter((o) => ans.chips.includes(o.id) && o.effects.length);
      neutral = picked.length === 0;
      if (!neutral) this.applyAny(picked);
      this.answers.set(qid, ans.chips);
      reactionTag = neutral ? 'chill' : picked.length > 1 ? 'great' : picked[0]!.reactionTag ?? 'interesting';
    } else {
      const opt = q.options.find((o) => o.id === ans);
      if (!opt) throw new Error(`Unknown option ${String(ans)} for ${qid}`);
      if (opt.hard) this.applyHard(opt.hard);
      if (opt.effects.length) this.applyEffects(opt.effects);
      neutral = !opt.effects.length && !opt.hard;
      if (q.id === 'q_kind') this.kind = (opt.hard?.kind ?? 'any') as typeof this.kind;
      this.answers.set(qid, opt.id);
      reactionTag = opt.reactionTag ?? reactionTag;
    }
    this.asked.push({ id: qid, kind: q.kind, groupKey: q.groupKey, neutral });

    const after = this.aliveIdx();
    const afterSet = new Set(after);
    const eliminated = [...before].filter((i) => !afterSet.has(i)).map((i) => this.cat.titles[i]!.id);
    const revived = after.filter((i) => !before.has(i) && this.everAlive.has(i)).map((i) => this.cat.titles[i]!.id);
    for (const i of after) this.everAlive.add(i);

    const contextTags: string[] = [];
    const drop = before.size ? 1 - after.length / before.size : 0;
    if (drop > 0.4) contextTags.push('bigDrop');
    else if (drop < 0.05 && q.opening === undefined) contextTags.push('tinyDrop');
    if (revived.length) contextTags.push('revive');
    const [a, b] = this.top(2);
    if (a && b && (a.p - b.p) / a.p < 0.1 && after.length <= 12) contextTags.push('closeCall');
    if (after.length <= 10 && after.length > 1) contextTags.push('almostThere');
    void topBefore;

    return { aliveBefore: before.size, aliveAfter: after.length, eliminated, revived, reactionTag, contextTags };
  }

  /** Alive title ids, sorted by p desc. */
  alive(): number[] {
    return this.aliveIdx()
      .sort((a, b) => this.p[b]! - this.p[a]!)
      .map((i) => this.cat.titles[i]!.id);
  }

  top(n: number): { id: number; p: number }[] {
    return this.topIdx(n).map((i) => ({ id: this.cat.titles[i]!.id, p: this.p[i]! }));
  }

  /** Winner = argmax p; runners-up are diverse (MMR, λ = 0.5). */
  reveal(): { winner: number; runnersUp: number[] } {
    const cands = this.topIdx(40);
    const w = cands[0];
    if (w === undefined) return { winner: -1, runnersUp: [] };
    const pmax = this.p[w]!;
    const chosen = [w];
    while (chosen.length < 3 && chosen.length < cands.length) {
      let best = -Infinity;
      let pick = -1;
      for (const i of cands) {
        if (chosen.includes(i)) continue;
        const rel = this.p[i]! / pmax;
        const red = Math.max(...chosen.map((c) => similarity(this.cat, c, i)));
        const s = rel - TUNING.mmrLambda * red;
        if (s > best) {
          best = s;
          pick = i;
        }
      }
      if (pick < 0) break;
      chosen.push(pick);
    }
    return { winner: this.cat.titles[w]!.id, runnersUp: chosen.slice(1).map((i) => this.cat.titles[i]!.id) };
  }

  /** "Not this one": removes the title, returns the next winner id. */
  reject(id: number): number {
    const i = this.cat.indexById.get(id);
    if (i !== undefined) this.p[i] = 0;
    this.rejects++;
    this.normalise();
    return this.reveal().winner;
  }

  get rejectCount() {
    return this.rejects;
  }

  /** "Ask me 3 more?" after rejects, or continuing a session. */
  extend(n = 3) {
    this.maxQ = Math.max(this.maxQ, this.asked.length + n);
    this.showNow = false;
    this.extendedFrom = this.asked.length;
  }
  private extendedFrom = -1;

  /** "Just show me!" */
  justShowMe() {
    this.showNow = true;
  }

  get questionsAsked() {
    return this.asked.length;
  }

  /** Dominant genres by probability mass among alive titles (drives the mood background). */
  genreMass(): { genre: number; mass: number }[] {
    const m = new Map<number, number>();
    for (const i of this.aliveIdx()) for (const g of this.cat.titles[i]!.genres.slice(0, 1)) m.set(g, (m.get(g) ?? 0) + this.p[i]!);
    return [...m.entries()].map(([genre, mass]) => ({ genre, mass })).sort((a, b) => b.mass - a.mass);
  }

  snapshot(): EngineSnapshot {
    return {
      v: 1,
      p: Array.from(this.p),
      mask: Array.from(this.mask),
      kind: this.kind,
      asked: [...this.asked],
      answers: [...this.answers.entries()],
      everAlive: [...this.everAlive],
      rng: this.rng.state(),
      maxQ: this.maxQ,
      rejects: this.rejects,
      probeDone: this.probeDone,
      justShowMe: this.showNow,
      generated: [...this.generated.values()],
    };
  }

  static restore(cat: Catalogue, questions: Question[], ctx: EngineCtx, s: EngineSnapshot): FindEngine {
    const e = new FindEngine(cat, questions, ctx);
    e.p = Float64Array.from(s.p);
    e.mask = Uint8Array.from(s.mask);
    e.kind = s.kind;
    e.asked = [...s.asked];
    e.answers = new Map(s.answers);
    e.everAlive = new Set(s.everAlive);
    e.rng.set(s.rng);
    e.maxQ = s.maxQ;
    e.rejects = s.rejects;
    e.probeDone = s.probeDone;
    e.showNow = s.justShowMe;
    e.generated = new Map(s.generated.map((q) => [q.id, q]));
    return e;
  }

  // ---------- internals ----------

  private shouldStop(): boolean {
    if (this.showNow) return true;
    const n = this.asked.length;
    if (n >= this.maxQ) return true;
    if (this.extendedFrom >= 0 && n < this.maxQ) return false; // honour "ask me 3 more"
    if (n < TUNING.minQuestionsToStop) return false;
    const top = this.topIdx(1)[0];
    if (top !== undefined && this.p[top]! >= TUNING.stopTopP) return true;
    if (n >= TUNING.stopLeadAfter) {
      const [a, , , d] = this.topIdx(4);
      if (a !== undefined && d !== undefined && this.p[a]! >= TUNING.stopLeadRatio * this.p[d]!) return true;
    }
    return this.aliveIdx().length <= TUNING.stopAlive;
  }

  private normalise() {
    let z = 0;
    for (let i = 0; i < this.N; i++) {
      if (!this.mask[i]) this.p[i] = 0;
      z += this.p[i]!;
    }
    if (z > 0) for (let i = 0; i < this.N; i++) this.p[i]! /= z;
  }

  private aliveIdx(): number[] {
    let max = 0;
    for (let i = 0; i < this.N; i++) if (this.p[i]! > max) max = this.p[i]!;
    const cut = max * TUNING.aliveRatio;
    const out: number[] = [];
    for (let i = 0; i < this.N; i++) if (this.p[i]! > 0 && this.p[i]! >= cut) out.push(i);
    return out;
  }

  private topIdx(n: number): number[] {
    const idx: number[] = [];
    for (let i = 0; i < this.N; i++) if (this.p[i]! > 0) idx.push(i);
    idx.sort((a, b) => this.p[b]! - this.p[a]!);
    return idx.slice(0, n);
  }

  private topAlive(n: number): number[] {
    return this.aliveIdx()
      .sort((a, b) => this.p[b]! - this.p[a]!)
      .slice(0, n);
  }

  private gateState(): GateState {
    return {
      asked: this.asked.length,
      kind: this.kind,
      answers: this.answers,
      traitMass: (trait) => {
        const j = this.cat.traitIndex.get(trait);
        if (j === undefined) return 0;
        let s = 0;
        for (let i = 0; i < this.N; i++) if (this.p[i]! > 0) s += this.p[i]! * this.cat.traits[i * this.K + j]!;
        return s;
      },
    };
  }

  private isAskedGroup(groupKey: string) {
    return this.asked.some((a) => a.groupKey === groupKey);
  }

  private modifiers(q: Question): number {
    const recent = this.asked.slice(-3);
    // 0 if the group was already answered decisively (§8.4); theme templates are independent.
    if (q.groupKey !== 'theme_tpl' && this.asked.some((a) => a.groupKey === q.groupKey && !a.neutral)) return 0;
    let m = q.weight;
    const lastKinds = this.asked.slice(-2).map((a) => a.kind);
    if (lastKinds.length && lastKinds.every((k) => k !== q.kind)) m *= TUNING.variety;
    if (recent.some((a) => a.groupKey === q.groupKey)) m *= TUNING.pacing;
    if (this.ctx.recentQuestionIds?.includes(q.id)) m *= TUNING.novelty;
    m *= 1 + (this.rng.next() * 2 - 1) * TUNING.jitter;
    return m;
  }

  private themeSplits(key: string): boolean {
    const j = this.cat.traitIndex.get(`theme_${key}`);
    if (j === undefined) return false;
    let s = 0;
    let z = 0;
    for (const i of this.aliveIdx()) {
      s += this.p[i]! * this.cat.traits[i * this.K + j]!;
      z += this.p[i]!;
    }
    const mass = z ? s / z : 0;
    return mass >= TUNING.themeMass[0] && mass <= TUNING.themeMass[1];
  }

  private compile(key: string, effects: Effect[]): CompiledEffect[] {
    const hit = this.compiled.get(key);
    if (hit) return hit;
    const c = effects
      .map((e) => ({ j: this.cat.traitIndex.get(e.trait) ?? -1, op: e.op, value: e.value ?? 0.5, strength: e.strength }))
      .filter((e) => e.j >= 0);
    this.compiled.set(key, c);
    return c;
  }

  /** Answers used for IG: non-neutral options / slider detents / individual chips. */
  private answerEffects(q: Question): CompiledEffect[][] {
    if (q.kind === 'slider' && q.slider) {
      return [0, 0.25, 0.5, 0.75, 1].map((v) => this.compile(`${q.id}@${v}`, [this.sliderEffect(q, v)]));
    }
    return q.options.filter((o) => o.effects.length).map((o) => this.compile(`${q.id}:${o.id}`, o.effects));
  }

  private questionIG(q: Question, alive: number[], sub: Float64Array): number {
    const effs = this.answerEffects(q);
    if (effs.length < 2 && !(effs.length === 1 && q.options.length > 1)) return 0;
    const lik = effs.map((e) => {
      const L = new Float64Array(alive.length);
      alive.forEach((i, k) => (L[k] = Math.pow(likelihood(e, this.cat.traits, i, this.K), TUNING.evidencePower)));
      return L;
    });
    // A single non-neutral option vs "don't care": compare against L = 1.
    if (lik.length === 1) lik.push(new Float64Array(alive.length).fill(1));
    const hasNeutral = q.kind !== 'slider' && q.options.some((o) => !o.effects.length && !o.hard);
    return infoGain(sub, lik) * (hasNeutral ? 1 - TUNING.neutralShare : 1);
  }

  /** Slider → `near` on the trait's catalogue quantile; stronger toward the extremes (§8.2). */
  private sliderEffect(q: Question, v: number): Effect {
    const trait = q.slider!.trait;
    const j = this.cat.traitIndex.get(trait)!;
    let qs = this.quantiles.get(j);
    if (!qs) {
      const col = new Float32Array(this.N);
      for (let i = 0; i < this.N; i++) col[i] = this.cat.traits[i * this.K + j]!;
      qs = col.sort();
      this.quantiles.set(j, qs);
    }
    const target = qs[Math.min(this.N - 1, Math.floor((0.08 + 0.84 * v) * (this.N - 1)))]!;
    return { trait, op: 'near', value: target, strength: 0.3 + 0.55 * Math.abs(v - 0.5) * 2 };
  }

  private applyEffects(effects: Effect[]) {
    const c = effects
      .map((e) => ({ j: this.cat.traitIndex.get(e.trait) ?? -1, op: e.op, value: e.value ?? 0.5, strength: e.strength }))
      .filter((e) => e.j >= 0);
    const b = TUNING.evidencePower;
    for (let i = 0; i < this.N; i++) if (this.p[i]! > 0) this.p[i]! *= Math.pow(likelihood(c, this.cat.traits, i, this.K), b);
    this.normalise();
  }

  /** Chips 'any': a title only needs to match one of the picked chips. */
  private applyAny(opts: Option[]) {
    const cs = opts.map((o) => this.compile(`any:${o.id}:${o.effects.map((e) => e.trait).join()}`, o.effects));
    for (let i = 0; i < this.N; i++) {
      if (!(this.p[i]! > 0)) continue;
      let best = 0;
      for (const c of cs) best = Math.max(best, likelihood(c, this.cat.traits, i, this.K));
      this.p[i]! *= Math.pow(best, TUNING.evidencePower);
    }
    this.normalise();
  }

  private applyHard(h: NonNullable<Option['hard']>) {
    const fs = this.cat.traitIndex.get('family_safe');
    for (let i = 0; i < this.N; i++) {
      if (h.kind && this.cat.titles[i]!.kind !== h.kind) this.mask[i] = 0;
      if (h.family_safe && fs !== undefined && this.cat.traits[i * this.K + fs]! < 0.5) this.mask[i] = 0;
    }
    this.normalise();
  }

  private buildDuel(alive: number[]): Question | null {
    const scales = ['intensity', 'scare', 'laughs', 'romance', 'cry', 'brain', 'pace', 'darkness', 'feelgood', 'action', 'spectacle', 'weird', 'slow_burn', 'tension'];
    // Most uncertain axis = highest p-weighted variance.
    let axis = '';
    let bestVar = 0;
    for (const t of scales) {
      const j = this.cat.traitIndex.get(t);
      if (j === undefined) continue;
      let m = 0;
      let z = 0;
      for (const i of alive) {
        m += this.p[i]! * this.cat.traits[i * this.K + j]!;
        z += this.p[i]!;
      }
      m /= z || 1;
      let v = 0;
      for (const i of alive) v += this.p[i]! * (this.cat.traits[i * this.K + j]! - m) ** 2;
      v /= z || 1;
      if (v > bestVar) {
        bestVar = v;
        axis = t;
      }
    }
    if (!axis) return null;
    const j = this.cat.traitIndex.get(axis)!;
    const pool = alive.slice(0, 80).filter((i) => this.cat.titles[i]!.votes >= 500 && this.cat.titles[i]!.backdrop);
    if (pool.length < 6) return null;
    const sorted = [...pool].sort((a, b) => this.cat.traits[a * this.K + j]! - this.cat.traits[b * this.K + j]!);
    const q4 = Math.max(1, Math.floor(sorted.length / 4));
    const byPop = (xs: number[]) => xs.sort((a, b) => this.cat.titles[b]!.popularity - this.cat.titles[a]!.popularity)[0]!;
    const A = byPop(sorted.slice(-q4));
    const B = byPop(sorted.slice(0, q4));
    if (A === B) return null;
    const diffs = scales
      .map((t) => {
        const k = this.cat.traitIndex.get(t)!;
        return { t, d: Math.abs(this.cat.traits[A * this.K + k]! - this.cat.traits[B * this.K + k]!) };
      })
      .sort((x, y) => y.d - x.d)
      .slice(0, 3);
    const opt = (i: number, id: string): Option => ({
      id,
      label: this.cat.titles[i]!.title,
      titleId: this.cat.titles[i]!.id,
      reactionTag: 'interesting',
      effects: diffs.map(({ t }) => ({ trait: t, op: 'near' as const, value: this.cat.traits[i * this.K + this.cat.traitIndex.get(t)!]!, strength: 0.5 })),
    });
    const q: Question = {
      id: 'q_duel',
      kind: 'duel',
      prompt: 'This vibe or that vibe?',
      groupKey: 'duel',
      weight: 1,
      options: [opt(A, 'a'), opt(B, 'b'), { id: 'neither', label: 'Neither', effects: [], reactionTag: 'noted' }],
    };
    this.generated.set(q.id, q);
    this.compiled.delete('q_duel:a');
    this.compiled.delete('q_duel:b');
    return q;
  }

  private buildProbe(): Question | null {
    const top = this.topIdx(1)[0];
    if (top === undefined || this.p[top]! < 0.08) return null;
    const t = this.cat.titles[top]!;
    if (t.votes < 300) return null;
    const q: Question = {
      id: 'q_probe',
      kind: 'probe',
      prompt: `Seen ${t.title}?`,
      groupKey: 'probe',
      weight: 1,
      options: [
        { id: 'loved', label: 'Seen it, loved it', emoji: '😍', effects: [], titleId: t.id },
        { id: 'meh', label: "Seen it, wasn't for me", emoji: '😐', effects: [], titleId: t.id },
        { id: 'no', label: "Nope, haven't", emoji: '🙈', effects: [], titleId: t.id },
      ],
    };
    this.generated.set(q.id, q);
    return q;
  }

  /** Probe (§ seed notes): seen+loved → boost neighbours; seen+meh → dampen them; not seen → small curiosity boost. */
  private applyProbe(q: Question, ans: string) {
    const id = q.options[0]!.titleId!;
    const top = this.cat.indexById.get(id);
    if (top === undefined) return;
    if (ans === 'no') {
      this.p[top]! *= 1.25;
    } else {
      this.p[top] = 0;
      const k = ans === 'loved' ? 1.4 : -0.6;
      for (let i = 0; i < this.N; i++) {
        if (!(this.p[i]! > 0)) continue;
        const s = Math.max(0, similarity(this.cat, top, i));
        this.p[i]! *= Math.max(0.1, 1 + k * s);
      }
    }
    this.answers.set(q.id, ans);
    this.normalise();
  }
}
