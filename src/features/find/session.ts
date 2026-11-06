import { create } from 'zustand';
import type { Catalogue } from '../../data/catalogue';
import { FindEngine, type AnswerResult, type EngineSnapshot } from '../../engine/find-engine';
import { loadQuestions } from '../../engine/questions';
import type { Answer, Question } from '../../engine/types';
import seed from '../../../data/questions.seed.json';
import { useLibrary } from '../../store/library';
import { useTaste, tasteSimFn, SIGNAL } from '../../store/taste';
import { useMood, moodForGenres } from '../../design/moods';
import { voiceSession } from '../../voice/reactions';

export const QUESTIONS: Question[] = loadQuestions(seed as never);

export type Phase = 'start' | 'question' | 'reveal' | 'recap';

export interface Step {
  qid: string;
  prompt: string;
  answer: string; // human label for the recap
  aliveBefore: number;
  aliveAfter: number;
  ms: number;
}

interface Saved {
  snap: EngineSnapshot;
  steps: Step[];
  phase: Phase;
  qid: string | null;
  rejected: number[];
  savedAt: number;
}

const SAVE_KEY = 'reelrole.find.session.v1';
const HISTORY_KEY = 'reelrole.find.history.v1'; // last sessions' question ids (novelty) + logs for M9

interface FindState {
  phase: Phase;
  engine: FindEngine | null;
  question: Question | null;
  shownAt: number;
  aliveCount: number;
  aliveTop: number[]; // ids for the poster wall
  lastResult: (AnswerResult & { k: number }) | null;
  reaction: { text: string; k: number } | null;
  steps: Step[];
  winner: number | null;
  runnersUp: number[];
  rejected: number[];
  /** "Start over?" confirm (X button or re-tapping the Find tab mid-session). */
  leaveAsk: boolean;
  setLeaveAsk: (v: boolean) => void;
  begin: (cat: Catalogue, kind: 'movie' | 'series' | 'any') => void;
  submit: (cat: Catalogue, ans: Answer, label: string) => void;
  showMe: (cat: Catalogue) => void;
  notThis: (cat: Catalogue) => void;
  askMore: (cat: Catalogue) => void;
  toRecap: () => void;
  backToReveal: () => void;
  reset: () => void;
  resume: (cat: Catalogue) => boolean;
}

const WALL = 120;

function history(): { qids: string[][]; logs: unknown[] } {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '') as { qids: string[][]; logs: unknown[] };
  } catch {
    return { qids: [], logs: [] };
  }
}

function makeEngine(cat: Catalogue, snap?: EngineSnapshot) {
  const lib = useLibrary.getState().items;
  const ctx = {
    taste: tasteSimFn(cat, useTaste.getState().vec),
    exclude: (i: number) => {
      const u = lib[cat.titles[i]!.id];
      return !!(u && (u.notForMe || u.watched));
    },
    seed: Date.now() & 0xffffffff,
    recentQuestionIds: history().qids.slice(-3).flat(),
  };
  return snap ? FindEngine.restore(cat, QUESTIONS, ctx, snap) : new FindEngine(cat, QUESTIONS, ctx);
}

function labelFor(q: Question, ans: Answer): string {
  if (typeof ans === 'string') return q.options.find((o) => o.id === ans)?.label ?? ans;
  if ('slider' in ans) {
    const v = ans.slider;
    return v <= 0.125 ? q.slider!.left : v >= 0.875 ? q.slider!.right : v < 0.375 ? `More ${q.slider!.left.toLowerCase()}` : v > 0.625 ? `More ${q.slider!.right.toLowerCase()}` : 'Somewhere in the middle';
  }
  const picked = q.options.filter((o) => ans.chips.includes(o.id)).map((o) => o.label);
  return picked.length ? picked.join(', ') : 'None of these';
}

export const useFind = create<FindState>((set, get) => {
  const save = () => {
    const s = get();
    if (!s.engine) return;
    const data: Saved = { snap: s.engine.snapshot(), steps: s.steps, phase: s.phase, qid: s.question?.id ?? null, rejected: s.rejected, savedAt: Date.now() };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* quota / private mode: resume just won't work */
    }
  };

  const syncMood = (cat: Catalogue, e: FindEngine) => {
    const top = e.genreMass().slice(0, 1).map((g) => cat.genres[g.genre]!);
    useMood.getState().setMood(moodForGenres(top), 0.6);
  };

  const toReveal = (cat: Catalogue, e: FindEngine) => {
    const { winner, runnersUp } = e.reveal();
    set({ phase: 'reveal', question: null, winner, runnersUp });
    const wi = cat.indexById.get(winner);
    if (wi !== undefined) useMood.getState().setMood(moodForGenres(cat.titles[wi]!.genres.map((g) => cat.genres[g]!)), 0.65);
    save();
  };

  const advance = (cat: Catalogue, e: FindEngine) => {
    const q = e.next();
    const alive = e.alive();
    set({ aliveCount: alive.length, aliveTop: alive.slice(0, WALL) });
    if (!q) return toReveal(cat, e);
    set({ phase: 'question', question: q, shownAt: performance.now() });
    save();
  };

  const finishLog = (outcome: string) => {
    const s = get();
    if (!s.steps.length) return;
    const h = history();
    h.qids = [...h.qids, s.steps.map((x) => x.qid)].slice(-10);
    h.logs = [...h.logs, { at: Date.now(), steps: s.steps, winner: s.winner, runnersUp: s.runnersUp, rejected: s.rejected, outcome }].slice(-100);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    } catch {
      /* ignore */
    }
  };

  return {
    phase: 'start',
    engine: null,
    question: null,
    shownAt: 0,
    aliveCount: 0,
    aliveTop: [],
    lastResult: null,
    reaction: null,
    steps: [],
    winner: null,
    runnersUp: [],
    rejected: [],
    leaveAsk: false,
    setLeaveAsk: (v) => set({ leaveAsk: v }),

    begin: (cat, kind) => {
      const e = makeEngine(cat);
      set({ engine: e, steps: [], winner: null, runnersUp: [], rejected: [], reaction: null, lastResult: null, aliveCount: e.alive().length });
      const q = e.next()!; // q_kind
      set({ question: q, shownAt: performance.now() });
      get().submit(cat, kind, labelFor(q, kind));
    },

    submit: (cat, ans, label) => {
      const { engine: e, question: q, shownAt, steps } = get();
      if (!e || !q) return;
      const r = e.answer(q.id, ans);
      const step: Step = { qid: q.id, prompt: q.prompt, answer: label, aliveBefore: r.aliveBefore, aliveAfter: r.aliveAfter, ms: Math.round(performance.now() - shownAt) };
      // Voice priority (§11): contextual tag (40% if triggered) → option tag → generic.
      const ctxTag = r.contextTags[0];
      const tag = ctxTag && Math.random() < 0.4 ? ctxTag : r.reactionTag ?? 'neutralGood';
      set({ steps: [...steps, step], lastResult: { ...r, k: Date.now() }, reaction: { text: voiceSession.say(tag), k: Date.now() } });
      syncMood(cat, e);
      advance(cat, e);
    },

    showMe: (cat) => {
      const e = get().engine;
      if (!e) return;
      e.justShowMe();
      set({ reaction: { text: voiceSession.say('justShowMe'), k: Date.now() } });
      toReveal(cat, e);
    },

    notThis: (cat) => {
      const { engine: e, winner, rejected } = get();
      if (!e || winner === null) return;
      const wi = cat.indexById.get(winner);
      if (wi !== undefined) useTaste.getState().add(cat, wi, -0.3);
      const next = e.reject(winner);
      const { runnersUp } = e.reveal();
      const n = rejected.length + 1;
      set({ winner: next, runnersUp, rejected: [...rejected, winner], reaction: { text: voiceSession.say(n >= 3 ? 'rejectMany' : 'rejectOne'), k: Date.now() } });
      save();
    },

    askMore: (cat) => {
      const e = get().engine;
      if (!e) return;
      e.extend(3);
      advance(cat, e);
    },

    toRecap: () => set({ phase: 'recap' }),
    backToReveal: () => set({ phase: 'reveal' }),

    reset: () => {
      const s = get();
      if (s.phase === 'reveal' || s.phase === 'recap') finishLog(s.winner !== null && useLibrary.getState().items[s.winner]?.onList ? 'accepted' : 'done');
      else if (s.steps.length) finishLog('abandoned');
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        /* ignore */
      }
      useMood.getState().setMood('brand', 0.6);
      set({ leaveAsk: false, phase: 'start', engine: null, question: null, steps: [], winner: null, runnersUp: [], rejected: [], reaction: null, lastResult: null, aliveCount: 0, aliveTop: [] });
    },

    resume: (cat) => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw) as Saved;
        if (Date.now() - d.savedAt > 3 * 3600_000 || d.snap.p.length !== cat.titles.length) return false;
        const e = makeEngine(cat, d.snap);
        const alive = e.alive();
        set({ engine: e, steps: d.steps, rejected: d.rejected, aliveCount: alive.length, aliveTop: alive.slice(0, WALL) });
        if (d.phase === 'question') {
          const q = e.next();
          if (!q) toReveal(cat, e);
          else set({ phase: 'question', question: q, shownAt: performance.now() });
        } else toReveal(cat, e);
        syncMood(cat, e);
        return true;
      } catch {
        return false;
      }
    },
  };
});

/** Accepting a pick from the reveal feeds taste + library. */
export function acceptPick(cat: Catalogue, id: number) {
  const L = useLibrary.getState();
  if (!L.get(id).onList) L.toggleList(id);
  const i = cat.indexById.get(id);
  if (i !== undefined) useTaste.getState().add(cat, i, SIGNAL.list);
}
