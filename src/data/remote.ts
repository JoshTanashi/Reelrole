// Live question bank + crowd trait corrections from Supabase, cached locally so the app boots offline.
import seed from '../../data/questions.seed.json';
import { loadQuestions } from '../engine/questions';
import type { Question } from '../engine/types';
import type { Catalogue } from './catalogue';
import { supabase } from './supabase';

const Q_KEY = 'reelrole.questions.v1';
const C_KEY = 'reelrole.corrections.v1';

interface CachedQuestions { version: number; opening: unknown[]; questions: unknown[] }

const read = <T,>(k: string): T | null => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null') as T | null;
  } catch {
    return null;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
};

/** The question bank the engine should use right now: remote (cached) if we have it, else the bundled seed. */
export function currentQuestions(): Question[] {
  const c = read<CachedQuestions>(Q_KEY);
  const s = seed as unknown as { opening: unknown[]; questions: unknown[]; templates: unknown };
  return loadQuestions({ opening: c?.opening ?? s.opening, questions: c?.questions ?? s.questions, templates: s.templates } as never);
}

/** A/B harness (HANDOVER §12.5): ~20% of users in bucket 'b'. */
function bucket(userId: string | null): 'a' | 'b' {
  if (!userId) return 'a';
  const h = [...userId].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return h % 5 === 0 ? 'b' : 'a';
}

export async function refreshQuestions(userId: string | null): Promise<boolean> {
  const { data: cfg } = await supabase.from('app_config').select('value').eq('key', 'questions_version').maybeSingle();
  const version = Number(cfg?.value ?? 0);
  const cached = read<CachedQuestions>(Q_KEY);
  if (cached && cached.version === version) return false;
  const [{ data: qs, error: e1 }, { data: os, error: e2 }] = await Promise.all([
    supabase.from('questions').select('*').eq('active', true).order('sort'),
    supabase.from('question_options').select('*').order('sort'),
  ]);
  if (e1 || e2 || !qs?.length) return false;
  const b = bucket(userId);
  const byQ = new Map<string, unknown[]>();
  for (const o of os ?? []) {
    const list = byQ.get(o.question_id) ?? [];
    list.push({ id: o.option_id, label: o.label, emoji: o.emoji ?? undefined, swatch: o.swatch ?? undefined, hard: o.hard ?? undefined, effects: o.effects ?? [], reactionTag: o.reaction_tag ?? undefined });
    byQ.set(o.question_id, list);
  }
  const toSeed = (q: Record<string, any>) => ({
    id: q.id,
    kind: q.kind,
    prompt: q.prompt,
    subprompt: q.subprompt ?? undefined,
    groupKey: q.group_key,
    requires: q.requires ?? undefined,
    after: q.after_n ?? undefined,
    order: q.opening ?? undefined,
    combine: q.combine ?? undefined,
    slider: q.slider ?? undefined,
    reactionTag: q.reaction_tag ?? undefined,
    weight: Number(q.weight ?? 1),
    options: byQ.get(q.id) ?? [],
  });
  const live = qs.filter((q) => !q.variant || q.variant === b);
  write(Q_KEY, {
    version,
    opening: live.filter((q) => q.opening !== null).map(toSeed),
    questions: live.filter((q) => q.opening === null).map(toSeed),
  });
  return true;
}

/** Crowd corrections (HANDOVER §12.3) are applied on top of the shipped trait values at boot. */
export function applyCorrections(cat: Catalogue) {
  const list = read<[number, string, number][]>(C_KEY) ?? [];
  const K = cat.traitKeys.length;
  for (const [id, trait, delta] of list) {
    const i = cat.indexById.get(id);
    const j = cat.traitIndex.get(trait);
    if (i === undefined || j === undefined) continue;
    cat.traits[i * K + j] = Math.min(1, Math.max(0, cat.traits[i * K + j]! + delta));
  }
}

export async function refreshCorrections() {
  const { data, error } = await supabase.from('trait_corrections').select('title_id,trait,delta').neq('delta', 0).limit(20000);
  if (error || !data) return;
  write(C_KEY, data.map((r) => [Number(r.title_id), r.trait, Number(r.delta)]));
}
