// Layer-1 rules tagger (HANDOVER §7.3). Deterministic: TMDB metadata → trait values in 0..1.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXACT, CONTAINS } from './keyword-rules.ts';

const traits = JSON.parse(readFileSync(join(import.meta.dirname, '../../data/traits.json'), 'utf8'));

export const SCALES: string[] = traits.scales.map((s: any) => s.key);
export const BOOLS: string[] = traits.bools.map((b: any) => b.key);
const ENUM_KEYS: string[] = (['era', 'len', 'commit', 'setting', 'ending'] as const).flatMap((e) =>
  (traits.enums[e] as string[]).map((v) => `${e}_${v}`),
);
const THEME_KEYS: string[] = traits.themes.map((t: string) => `theme_${t}`);

/** Canonical vector order — the app reads this from the catalogue, never hard-codes it. */
export const TRAIT_KEYS: string[] = [...SCALES, ...BOOLS, ...ENUM_KEYS, ...THEME_KEYS];
const KEYSET = new Set(TRAIT_KEYS);

function resolve(k: string): string | null {
  if (KEYSET.has(k)) return k;
  for (const p of ['theme_', 'setting_']) if (KEYSET.has(p + k)) return p + k;
  return null;
}

const BASELINE: Record<string, number> = {
  intensity: 0.35, scare: 0.04, gore: 0.08, laughs: 0.15, romance: 0.12, cry: 0.18, brain: 0.35, pace: 0.45,
  darkness: 0.3, feelgood: 0.4, action: 0.15, spectacle: 0.3, weird: 0.15, slow_burn: 0.3, tension: 0.3,
};

const FAMILY_CERTS = new Set(['G', 'PG', 'A', 'PG-10', '7-9PG', '10-12PG', 'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'U', '0', '6', '7', '10']);
const ADULT_CERTS = new Set(['R', 'NC-17', '18', '16', 'TV-MA', '18+', 'X18', 'R18']);
const AFRICA = new Set('DZ AO BJ BW BF BI CM CV CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW'.split(' '));

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export interface TagInput {
  kind: 'movie' | 'series';
  genres: string[];
  keywords: string[];
  year: number | null;
  runtime: number | null; // movie minutes
  seasons: number | null;
  episodes: number | null;
  certification: string | null;
  originalLanguage: string;
  originCountries: string[];
  voteAverage: number;
  voteCount: number;
  popularity: number;
  inCollection: boolean;
  leadGender: number | null; // TMDB: 1 female, 2 male
  castSize: number;
  isMiniseries: boolean;
}

export function tag(t: TagInput, popPct: number, votePct: number): Record<string, number> {
  const v: Record<string, number> = {};
  const up = (k: string, x: number) => {
    const key = resolve(k);
    if (key) v[key] = Math.max(v[key] ?? 0, x);
  };

  // 1. Genres → scales: weighted mean of genre targets (earlier genres weigh more), else baseline.
  const acc: Record<string, { s: number; w: number }> = {};
  t.genres.forEach((g, i) => {
    const rules = traits.tmdb_genre_rules[g] as Record<string, number> | undefined;
    if (!rules) return;
    const w = Math.max(0.4, 1 - i * 0.2);
    for (const [k, x] of Object.entries(rules)) {
      if (SCALES.includes(k)) (acc[k] ??= { s: 0, w: 0 }).s += x * w, (acc[k]!.w += w);
      else up(k, x);
    }
  });
  for (const k of SCALES) if (k in BASELINE) v[k] = acc[k] ? acc[k]!.s / acc[k]!.w : BASELINE[k]!;

  // Genre combos the per-genre table can't express.
  const has = (g: string) => t.genres.includes(g);
  if (has('Horror') && has('Comedy')) v.weird = Math.max(v.weird!, 0.55);
  if (has('Comedy') && has('Romance')) v.feelgood = Math.max(v.feelgood!, 0.7);
  if (has('Animation') && (has('Family') || has('Kids'))) up('family_safe', 1);
  if (has('Thriller') || has('Horror')) v.slow_burn = Math.max(v.slow_burn!, 0.4);
  if (has('Science Fiction') || has('Sci-Fi & Fantasy')) up('setting_future', 0.5);

  // 2. Keywords.
  const examples = traits.keyword_rules_examples as Record<string, Record<string, number>>;
  for (const kw of t.keywords) {
    for (const [k, x] of Object.entries(EXACT[kw] ?? {})) up(k, x);
    for (const [k, x] of Object.entries(examples[kw] ?? {})) up(k, x);
    for (const [frag, r] of CONTAINS) if (kw.includes(frag)) for (const [k, x] of Object.entries(r)) up(k, x);
  }

  // 3. Certification.
  const cert = (t.certification ?? '').toUpperCase();
  if (FAMILY_CERTS.has(cert) && !has('Horror')) up('family_safe', has('Family') || has('Animation') || has('Kids') ? 1 : 0.7);
  if (ADULT_CERTS.has(cert)) {
    v.family_safe = 0;
    v.intensity = Math.max(v.intensity!, 0.5);
    if (has('Horror') || has('Crime') || has('War')) v.gore = Math.max(v.gore!, 0.45);
  }
  if (has('Horror') || (v.gore ?? 0) > 0.5) v.family_safe = Math.min(v.family_safe ?? 0, 0.1);

  // 4. Length / commitment.
  if (t.kind === 'movie' && t.runtime) {
    up(t.runtime < 100 ? 'len_short' : t.runtime <= 140 ? 'len_normal' : 'len_long', 1);
  }
  if (t.kind === 'series') {
    const s = t.seasons ?? 1;
    up(t.isMiniseries || s <= 1 ? 'commit_limited' : s <= 4 ? 'commit_few_seasons' : 'commit_long_haul', 1);
  }

  // 5. Era + nostalgia.
  if (t.year) {
    const y = t.year;
    const era = y < 1980 ? 'classic' : y < 2000 ? 'retro' : y < 2010 ? 'y2k' : y < 2020 ? 'tens' : 'recent';
    up(`era_${era}`, 1);
    v.nostalgia = Math.max(v.nostalgia ?? 0, { classic: 0.85, retro: 0.75, y2k: 0.5, tens: 0.2, recent: 0.05 }[era]);
  }

  // 6. Language / origin.
  if (t.originalLanguage && t.originalLanguage !== 'en') up('subtitles_needed', 1);
  if (t.originCountries.some((c) => AFRICA.has(c))) up('african', 1);
  if (t.originCountries.includes('ZA')) up('south_african', 1);

  // 7. Acclaim + hidden gem (needs catalogue-relative popularity percentiles).
  const reliability = smooth(50, 800, t.voteCount);
  v.acclaim = smooth(6.4, 8.4, t.voteAverage) * (0.6 + 0.4 * reliability);
  v.hidden_gem = smooth(6.6, 7.6, t.voteAverage) * (1 - Math.max(popPct, votePct)) ** 1.5;

  // 8. People / structure.
  if (has('Animation')) up('animated', 1);
  if (t.inCollection) up('franchise', 1);
  if (t.leadGender === 1) up('female_lead', 0.85);
  if (t.kind === 'series' && (has('Drama') || has('Comedy'))) up('ensemble', 0.45);
  if (has('Documentary')) up('true_story', 1);
  if (has('Kids') || has('Family')) up('kid_lead', 0.35);

  // 9. Ending: soft distribution when no keyword says it outright.
  const endingKnown = ['ending_happy', 'ending_bittersweet', 'ending_dark', 'ending_open'].some((k) => (v[k] ?? 0) >= 0.7);
  if (!endingKnown) {
    const fg = v.feelgood!, dk = v.darkness!, cr = v.cry!;
    up('ending_happy', Math.max(0, fg - dk * 0.5));
    up('ending_dark', Math.max(0, dk - fg * 0.5) * 0.8);
    up('ending_bittersweet', Math.min(0.7, cr * 0.9));
  }

  // Coherence: feel-good fights darkness; scary implies tension.
  if ((v.scare ?? 0) > 0.6) v.tension = Math.max(v.tension!, 0.65);
  v.feelgood = Math.min(v.feelgood!, 1.05 - (v.darkness ?? 0));
  if ((has('Science Fiction') || has('Mystery')) && v.acclaim! > 0.8) v.brain = Math.max(v.brain!, 0.65);

  const out: Record<string, number> = {};
  for (const k of TRAIT_KEYS) out[k] = Math.round(Math.min(1, Math.max(0, v[k] ?? 0)) * 100) / 100;
  return out;
}
