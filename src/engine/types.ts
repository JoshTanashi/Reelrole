export type Op = 'gte' | 'lte' | 'eq' | 'near' | 'has' | 'not';
export interface Effect { trait: string; op: Op; value?: number; strength: number }
export type QKind = 'binary' | 'tri' | 'slider' | 'duel' | 'mood' | 'chips' | 'chips-single' | 'probe';

export interface Option {
  id: string;
  label: string;
  emoji?: string;
  swatch?: string[];
  effects: Effect[];
  /** Pool filters (kind / family_safe) applied instead of likelihoods. */
  hard?: { kind?: 'movie' | 'series'; family_safe?: number };
  reactionTag?: string;
  /** Duel options carry the title they represent. */
  titleId?: number;
}

export interface Requires {
  kind?: 'movie' | 'series';
  trait_mass?: Record<string, string>; // e.g. { scare: '>0.35' }
  after?: number;
  not_answered?: string;
  answered?: Record<string, string>;
}

export interface Question {
  id: string;
  kind: QKind;
  prompt: string;
  subprompt?: string;
  groupKey: string;
  options: Option[];
  requires?: Requires;
  after?: number;
  weight: number;
  combine?: 'any';
  slider?: { trait: string; left: string; right: string; detents: number };
  reactionTag?: string;
  opening?: number; // order in the fixed opening sequence
  /** Theme-template questions: only eligible when the theme splits the alive mass. */
  themeKey?: string;
}

export type Answer = string | { slider: number } | { chips: string[] };
