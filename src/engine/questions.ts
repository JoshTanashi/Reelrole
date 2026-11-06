import type { Option, Question } from './types';

interface SeedFile {
  opening: Record<string, unknown>[];
  questions: Record<string, unknown>[];
  templates: {
    theme_patterns: string[];
    theme_labels: Record<string, string>;
    option_set: { id: string; label: string; emoji?: string; effects: { trait: string; op: string; strength: number }[]; reactionTag: string }[];
  };
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Turns questions.seed.json into engine Questions: opening sequence, the bank, and one
 * generated question per theme template (HANDOVER §8, seed 'templates'). Generated duel/probe
 * questions are built live by the engine, so their seed placeholders are skipped here.
 */
export function loadQuestions(seed: SeedFile): Question[] {
  const norm = (q: Record<string, unknown>, opening?: number): Question => ({
    id: q.id as string,
    kind: q.kind as Question['kind'],
    prompt: q.prompt as string,
    subprompt: q.subprompt as string | undefined,
    groupKey: (q.groupKey as string) ?? (q.id as string),
    options: ((q.options as Option[]) ?? []).map((o) => ({ ...o, effects: o.effects ?? [] })),
    requires: q.requires as Question['requires'],
    after: q.after as number | undefined,
    weight: (q.weight as number) ?? 1,
    combine: q.combine as 'any' | undefined,
    slider: q.slider as Question['slider'],
    reactionTag: q.reactionTag as string | undefined,
    opening,
  });

  const out: Question[] = seed.opening.map((q) => norm(q, q.order as number));
  for (const q of seed.questions) if (!q.generated) out.push(norm(q));

  const t = seed.templates;
  for (const [key, label] of Object.entries(t.theme_labels)) {
    const pattern = t.theme_patterns[hash(key) % t.theme_patterns.length]!;
    const prompt = pattern.replace('{label}', label);
    out.push({
      id: `q_theme_${key}`,
      kind: 'tri',
      prompt: prompt.charAt(0).toUpperCase() + prompt.slice(1),
      groupKey: 'theme_tpl',
      weight: 0.9,
      themeKey: key,
      options: t.option_set.map((o) => ({
        id: o.id,
        label: o.label,
        emoji: o.emoji,
        reactionTag: o.reactionTag,
        effects: o.effects.map((e) => ({ ...e, trait: e.trait.replace('{key}', key) })) as Option['effects'],
      })),
    });
  }
  return out;
}
