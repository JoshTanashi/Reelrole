# Reelroll — Full Build Handover

> **Roll for tonight.**
> A movie & series chooser that plays like a game: answer a few fun questions, watch hundreds of titles fall away, and land on the one you'll actually watch, plus where to stream it in South Africa.

Owner: Joshie / MOE Media · Region: South Africa (ZA) · Platform: mobile-first PWA → Capacitor iOS/Android

---

## 0. TL;DR for the builder

- 4 tabs in an iOS-style floating, blurred tab bar: **Find** (questionnaire), **Swipe** (left/right cards), **Roll** (random slot-reel), **Library** (watched / liked / my list).
- The catalogue is **~2,000 movies + ~1,000 series** from TMDB, with posters, backdrops, trailers, ratings and **ZA watch providers**. Joshie never uploads images.
- Every title is tagged on ~50 **traits**. Questions are mapped to traits. The engine picks the **most informative next question** (Akinator-style) and **soft-scores** titles so one wrong answer never kills the perfect pick.
- The voice is a **funny friend on the couch**, not an AI: "ahh great choice", "mmm interesting", "ohhh scary… what else?".
- Look: **cinematic dark + living gradients**. Netflix vibes (dark, red-led, cinematic, row carousels, bold reveals), with **zero Netflix assets**.
- Everything logs, so the engine **gets smarter** over time (§12).

---

## 1. Product pillars

1. **It's a game.** Live "titles left" counter, a poster wall that thins out, a dramatic reveal, streaks and replays.
2. **It feels built.** Spring physics, shared-element transitions, haptics and sound on every meaningful action. Polished, never noisy.
3. **It's honest and local.** The answer comes with *where to watch it in SA tonight* on the services you actually have.
4. **It's human.** The copy is warm, cheeky and short. No walls of text, no AI tone.
5. **It learns.** Every answer, swipe and "watched it / loved it" makes the next pick better.

---

## 2. Users & core jobs

| Situation | Job | Tab |
|---|---|---|
| "I don't know what I want" | Guide me with questions | **Find** |
| "Show me stuff, I'll know it when I see it" | Fast browse by gut | **Swipe** |
| "Just pick for me" | Instant random (with light filters) | **Roll** |
| "What was that thing I saved?" | Manage watched / liked / my list | **Library** |
| Couple / group night | Overlap of tastes | **Find → Group mode** (v1.5) |

---

## 3. Information architecture

```
App
├── First-run onboarding (3 steps)
│   ├── 1. Welcome sting (logo reveal)
│   ├── 2. "What do you stream on?" → service chips (Netflix, Showmax, Disney+, Prime Video, Apple TV+, …)
│   └── 3. "Quick taste check" → pick 3+ posters you love (seeds taste vector)
├── Tab: Find (questionnaire)
│   ├── Start screen ("Movie or series?")
│   ├── Question loop (poster wall + counter + question card)
│   ├── Reveal (winner + 2 runners-up)
│   └── Session recap (your answers, replay, share)
├── Tab: Swipe (card stack)
├── Tab: Roll (slot-reel random)
├── Tab: Library
│   ├── Segments: My List · Liked · Watched · Not for me
│   ├── Search (all catalogue)
│   └── Settings / About (services, region, sounds, haptics, reduced motion, attributions)
└── Title Detail Sheet (global, opens from anywhere)
```

---

## 4. Brand

**Name:** Reelroll (wordmark: lowercase `reelroll`, the double "ll" can become a film-reel ligature later).
**Tagline:** *Roll for tonight.*
**Personality:** the friend who always knows what to put on. Confident, playful, a little dramatic, never smug.

Alt names if Joshie wants options: *Cue*, *Popcue*, *Flickpick*, *Showroll*. **ASK before changing.**

### Voice rules
- Max ~6 words per reaction. Drawn-out vowels are allowed ("ohhhh", "maybeee").
- React to the *answer*, then move on. Never explain the algorithm.
- Light SA flavour is welcome but sparing ("lekker", "eish", "shame"). Max 1 in 10 lines.
- Never: "As an AI", "Based on your preferences", "Great question!", emoji spam (max 1 emoji per line, optional).
- The full bank is in `data/voice-lines.json`. Pick by `reactionTag`, and don't repeat a line within a session (LRU of 12).

---

## 5. Design system

### 5.1 Colour tokens (CSS vars)

```css
:root {
  /* Base — cinematic near-black, slightly warm */
  --bg-0: #07060A;      /* app background */
  --bg-1: #0F0D14;      /* cards */
  --bg-2: #18151F;      /* raised */
  --line: rgba(255,255,255,0.08);
  --text-hi: #F6F3FA;
  --text-mid: rgba(246,243,250,0.68);
  --text-lo: rgba(246,243,250,0.42);

  /* Brand — "Ember" (the Netflix-vibe red, but ours) */
  --ember-500: #FF2E4D;
  --ember-600: #E0173A;
  --magenta-500: #E81CFF;
  --violet-500: #6A3BFF;
  --gold-400: #FFC857;   /* ratings, winner glow */

  /* Brand gradient */
  --grad-brand: linear-gradient(135deg, #FF2E4D 0%, #E81CFF 52%, #6A3BFF 100%);

  /* Semantic */
  --yes: #3DF5A7;
  --no: #FF4D6D;
  --maybe: #FFC857;
}
```

### 5.2 Mood gradients (living background)
The background is a slow-drifting **mesh gradient**: 3–4 blurred radial blobs animated with `motion`, 20–40s loops. As the session's weighted genre mix shifts, blob colours **interpolate** toward the dominant moods (lerp over 1.2s).

| Mood / genre | Blob colours |
|---|---|
| Default / brand | `#FF2E4D` `#E81CFF` `#6A3BFF` |
| Horror / thriller | `#8B0012` `#FF2E4D` `#1A0005` |
| Romance | `#FF7AA2` `#FFC2A8` `#B83280` |
| Sci-fi | `#00E5FF` `#6A3BFF` `#0A1A3F` |
| Comedy | `#FFD23F` `#FF7A00` `#FF2E8A` |
| Drama | `#C77DFF` `#3C096C` `#FF9E7A` |
| Action | `#FF5400` `#FFBD00` `#390099` |
| Fantasy / animation | `#7CFFCB` `#74F2CE` `#8E7DFF` |
| Crime / mystery | `#2EC4B6` `#011627` `#E71D36` |
| Documentary | `#E9ECEF` `#ADB5BD` `#3D5A80` |

Add a **film grain** overlay (SVG noise, 4–6% opacity, `mix-blend-mode: overlay`) and a vignette for a cinematic feel.

### 5.3 Type
- Display: **Clash Display** (Fontshare, free), weights 600/700, for titles, reveal and counters.
- UI/body: **Satoshi** or **Inter**, 400/500/700.
- Counter digits: tabular numerals and an animated digit roll (odometer).
- iOS large-title pattern: 34pt bold title that collapses to a 17pt inline title on scroll.
- **ASK Joshie** to confirm fonts.

### 5.4 Shape, depth, glass
- Radius: cards 20, sheets 28, chips 999, posters 14.
- Glass: `backdrop-filter: blur(24px) saturate(160%)`, background `rgba(20,16,28,0.55)`, 1px `--line` border, inner top highlight `rgba(255,255,255,0.06)`.
- Shadows: soft, coloured by the poster's dominant colour (extract at build time; store `title.color`).

### 5.5 Motion principles
- Default spring: `{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }`.
- Gentle spring (sheets): `{ stiffness: 260, damping: 30 }`.
- Durations: micro 120–180ms · standard 240–320ms · hero 420–700ms · reveal sequence ≤ 2.4s total.
- **One hero motion per moment.** Everything else is subtle (opacity, 4–8px translate, 0.98 → 1 scale).
- Shared element: poster → detail sheet uses `layoutId={"poster-"+id}`.
- Stagger lists at 30–40ms.
- `prefers-reduced-motion` and the in-app toggle swap motion for crossfades, stop the background drift, and turn the reel spin into a fade carousel.
- Target 60fps on a mid-range Android: animate only transform/opacity and avoid animating blur.

### 5.6 Haptics map (`@capacitor/haptics`, no-op on web)
| Action | Haptic |
|---|---|
| Tab tap | `selection` |
| Answer tap | `impact light` |
| Titles eliminated (big drop) | `impact medium` |
| Swipe commit | `impact light` |
| Reel tick (each poster pass) | `selection` (throttled ≥ 60ms) |
| Reel stop | `impact heavy` |
| Reveal | `notification success` |
| Add to list / like | `impact light` |

---

## 6. iOS-style navigation

### 6.1 Floating tab bar
- Floats 8px above the bottom safe area, side margin 16, height 64, radius 32, glass style (§5.4).
- 4 items: **Find** (sparkle/compass), **Swipe** (stacked cards), **Roll** (dice / film reel), **Library** (bookmark stack).
- Icons: Lucide or Phosphor, outline when inactive and **filled + brand gradient** when active, label 10–11pt.
- The active indicator is a pill that slides between tabs (`layoutId="tab-pill"`) with a spring.
- Tapping the active tab scrolls to top / resets the stack (with confirm in Find if mid-session).
- It hides on scroll-down in Library and shows on scroll-up (iOS Safari behaviour).
- Tab state persists per tab (keep mounted or restore from store).

### 6.2 Navigation patterns
- **Large titles** collapse on scroll (Library, Search).
- **Bottom sheets** for title detail, filters and settings: drag handle, 3 detents (40% / 88% / full), velocity-based dismiss, background scales to 0.94 with rounded corners (iOS card-modal feel).
- Swipe-from-left-edge for back on stacked screens.
- No hamburger menus, ever.

---

## 7. Catalogue & data

### 7.1 Source
**TMDB API v3** (`api.themoviedb.org/3`). It provides posters, backdrops, overview, genres, keywords, runtime, certification, cast, videos (trailers), vote average/count, popularity, and **watch providers per region (ZA)**, which TMDB sources from JustWatch.

Optional: OMDb for IMDb / Rotten Tomatoes scores (requires a key; **ASK Joshie**).

Images load straight from TMDB's image CDN: `https://image.tmdb.org/t/p/{size}{path}`
- Swipe/Roll cards: `w500` · grid posters: `w342` · backdrops: `w1280` (detail) / `w780` (lists) · tiny blur placeholder: `w92` + CSS blur, or precomputed BlurHash.

**Legal:** show "This product uses the TMDB API but is not endorsed or certified by TMDB" + the TMDB logo in About, and credit JustWatch next to watch-provider data. TMDB's free API is for non-commercial use, so if Reelroll is monetised, Joshie needs to check TMDB's commercial terms. **Flag this to Joshie before any monetisation work.**

### 7.2 Ingestion pipeline (`/scripts/ingest`)
A Node script run locally / by GitHub Action weekly:
1. Pull `discover/movie` and `discover/tv` sorted by popularity + vote_count, with filters `vote_count ≥ 300` (movies) / `≥ 150` (tv). Target 2,000 movies + 1,000 series. Also add `top_rated` to catch classics.
2. For each title, fetch `append_to_response=keywords,videos,credits,release_dates,content_ratings,watch/providers`.
3. Keep only the ZA providers block (`flatrate`, `rent`, `buy`, `free`, `ads`).
4. Compute the **dominant colour** from the poster (`sharp` + `node-vibrant`) and a **BlurHash**.
5. Run the **trait tagger** (§7.3).
6. Upsert into Supabase, and also emit a compact `catalogue.min.json` (~1.5–3MB gz) for offline/fast boot.

### 7.3 Trait tagging
Traits live in `data/traits.json`. Every title gets a vector:
- **Booleans** (0/1): animated, true_story, based_on_book, subtitles_needed, family_safe, has_twist, ensemble, single_location, etc.
- **Scales** (0–1): intensity, scare, gore, laughs, romance, cry, brain, pace, darkness, feelgood, action, spectacle, weird, nostalgia, acclaim, hidden_gem.
- **Enums**: era, length bucket, series commitment, setting(s), ending type.
- **Theme tags**: time_travel, heist, zombies, space, serial_killer, ai_robots, revenge, survival, coming_of_age, sports, music, war, superhero, courtroom, cooking, animals, road_trip, and more.

Tagging layers (stored with `source` + `confidence`):
1. **Rules** (deterministic): TMDB genres → base scales (Horror → scare 0.7), keywords → themes ("time travel" → time_travel=1), certification → family_safe/gore hints, runtime → length bucket, year → era, original_language ≠ en → subtitles_needed, vote_average & popularity → acclaim/hidden_gem.
2. **Offline enrichment (optional, build time)**: a one-off script may use an LLM to fill the fuzzy scales (cry, brain, weird, ending). It writes JSON only, has humans spot-check 100 titles, and never runs in the app. **ASK Joshie** whether he wants this or rules-only for v1.
3. **Crowd correction** (§12): user feedback nudges scales over time.

### 7.4 Supabase schema (Postgres)

```sql
create table titles (
  id bigint primary key,            -- tmdb id * 10 + (0 movie | 1 tv) to avoid collisions
  tmdb_id int not null,
  kind text check (kind in ('movie','series')) not null,
  title text not null,
  original_title text,
  year int,
  overview text,
  tagline text,
  runtime_min int,                  -- movies
  seasons int, episodes int, episode_runtime_min int,  -- series
  status text,                      -- series: Ended / Returning
  certification_za text,
  genres text[],
  original_language text,
  poster_path text, backdrop_path text,
  trailer_youtube_key text,
  vote_average numeric, vote_count int, popularity numeric,
  imdb_id text, imdb_rating numeric, rt_score int,
  color text, blurhash text,
  cast_top jsonb,                   -- [{name, character, profile_path}] x6
  updated_at timestamptz default now()
);

create table title_traits (
  title_id bigint references titles(id) on delete cascade,
  trait text not null,
  value numeric not null,           -- 0..1 (bools as 0/1)
  source text default 'rules',      -- rules | enrich | crowd | manual
  confidence numeric default 0.6,
  primary key (title_id, trait)
);

create table providers (id int primary key, name text, logo_path text, display_priority int);
create table title_providers (
  title_id bigint references titles(id) on delete cascade,
  provider_id int references providers(id),
  type text check (type in ('flatrate','rent','buy','free','ads')),
  region text default 'ZA',
  primary key (title_id, provider_id, type, region)
);

create table questions (
  id text primary key,              -- e.g. 'q_scare_level'
  kind text,                        -- binary | tri | slider | duel | mood | chips
  prompt text not null,
  subprompt text,
  group_key text,                   -- for pacing / mutual exclusion
  requires jsonb,                   -- gating conditions (see §8.5)
  active boolean default true,
  weight numeric default 1.0        -- learned usefulness multiplier
);

create table question_options (
  question_id text references questions(id) on delete cascade,
  option_id text,
  label text,
  emoji text,
  effects jsonb not null,           -- [{trait, op, value, strength}]
  reaction_tag text,
  primary key (question_id, option_id)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                     -- supabase anon user
  mode text,                        -- find | swipe | roll
  kind_filter text,
  started_at timestamptz default now(),
  ended_at timestamptz,
  winner_title_id bigint,
  runner_up_ids bigint[],
  questions_asked int,
  outcome text                      -- accepted | rerolled | abandoned
);

create table session_answers (
  session_id uuid references sessions(id) on delete cascade,
  idx int,
  question_id text,
  option_id text,
  slider_value numeric,
  alive_before int, alive_after int,
  ms_to_answer int,
  primary key (session_id, idx)
);

create table user_titles (
  user_id uuid,
  title_id bigint references titles(id),
  on_list boolean default false,
  liked boolean,                    -- true / false (disliked) / null
  watched boolean default false,
  watched_at timestamptz,
  my_rating smallint,               -- 1..5 optional
  not_for_me boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, title_id)
);

create table swipes (
  user_id uuid, title_id bigint, direction text, -- left | right | up | down
  created_at timestamptz default now()
);

create table user_prefs (
  user_id uuid primary key,
  services int[],                   -- provider ids
  region text default 'ZA',
  sound boolean default true, haptics boolean default true, reduced_motion boolean default false,
  taste jsonb                       -- running trait vector
);
```

Turn RLS on for user tables (`user_id = auth.uid()`). Catalogue tables are read-only for anon users.

### 7.5 Client data strategy
- On boot, load `catalogue.min.json` (cached via service worker, versioned), which holds titles + trait vectors as Float32 arrays. The engine runs **fully client-side** for instant feel.
- Fetch the detail fields (cast, providers) lazily via the edge function `/title/:id`, or from the catalogue if present.
- Library state is **local-first** (IndexedDB via `idb-keyval`) and syncs to Supabase in the background.
- Auth uses Supabase **anonymous sign-in** on first launch, upgradeable to Apple/Google/email later.

---

## 8. The Find engine (the heart)

### 8.1 Model
- Pool **T** = all titles matching hard filters (kind, user services if "only my services" on, not_for_me excluded, watched excluded unless toggled).
- Each title has weight `w_t`. Prior: `w_t = popularity_norm^0.35 × (1 + 0.6·taste_sim_t) × service_boost_t`.
  - `taste_sim_t` = cosine(user taste vector, title traits) from onboarding picks + swipes + likes.
  - `service_boost_t` = 1.25 if available flatrate on a user service, else 1.0.
- Normalise to probabilities `p_t`.

### 8.2 Answer likelihoods
Each option's `effects` define a likelihood `L(a | t) ∈ [ε, 1]`:

```
op: 'gte' | 'lte' | 'eq' | 'near' | 'has' | 'not'
strength: 0..1 (how much this answer should matter)

match_t = trait-specific match score in 0..1
  gte:  smoothstep(value-0.15, value+0.15, trait_t)
  lte:  1 - smoothstep(value-0.15, value+0.15, trait_t)
  near: exp(-((trait_t - value)^2) / (2·0.18^2))
  has:  trait_t           (bool/theme)
  not:  1 - trait_t

L(a|t) = ε + (1-ε) · [1 - strength · (1 - Π match_t)]
ε = 0.12   // soft floor: no title is ever zeroed by one answer
```

The "Don't care / Either" option has `L = 1` for all titles: no effect, and it's still logged.

**Slider** answers map to `near` on the slider's trait, with strength scaled by distance from the middle (an extreme slider value has stronger strength).

### 8.3 Update
`p_t ← p_t · L(a|t)`, then renormalise.
**Alive** = titles with `p_t ≥ max(p) · 0.015` (tunable). The UI counter shows the alive count, and the poster wall removes titles that drop out of alive.
Titles can **come back** if later answers favour them. Animate them back in subtly (fade up); it's rare but feels magical.

### 8.4 Picking the next question
For each eligible question `q` (computed over the top 500 alive titles for speed, in a **Web Worker**):

```
IG(q) = H(p) − Σ_a P(a) · H(p | a)
P(a)  = Σ_t p_t · L(a|t)      // expected answer distribution
score(q) = IG(q) × q.weight × variety_bonus × pacing_penalty × novelty
```

- `variety_bonus`: 1.15 if the question's `kind` differs from the last 2.
- `pacing_penalty`: 0.6 if same `group_key` was asked in last 3; 0 if group already answered decisively.
- `novelty`: 0.85 if the user has seen this exact question in their last 3 sessions.
- Add a small random jitter (±7%) so sessions don't feel scripted.

### 8.5 Gating (`requires`)
Questions can require conditions, for example:
- `{"kind":"series"}`: only for series (e.g. "Binge it or one ep a night?").
- `{"trait_mass": {"scare": ">0.35"}}`: only ask "Jump scares or slow dread?" when enough of the remaining probability mass is horror-ish.
- `{"after": 3}`: not before question 3.
- `{"not_answered": "q_family"}`.

### 8.6 Fixed opening sequence
1. **Movie or series?** (Movie / Series / Surprise me): this is a hard filter unless "Surprise me".
2. **Who's watching?** (Just me / Date night / Friends / Family with kids): family applies a hard `family_safe` filter, and date night boosts romance/feelgood slightly.
3. **How much time you got?** Movies: "Under 100 min / Normal / I've got all night". Series: "Limited series / A couple seasons / Give me a long one".

After those, the engine takes over.

### 8.7 Stop conditions
Stop and reveal when any of these hold:
- top `p_t ≥ 0.45` and ≥ 5 questions asked, or
- alive ≤ 3 and ≥ 5 questions asked, or
- 14 questions asked (hard cap; never feel endless), or
- user taps **"Just show me!"** (always visible after Q4).

### 8.8 Reveal + after
- Winner = argmax p_t. Runners-up = next 2 that are **diverse** (MMR: penalise trait similarity to winner by λ=0.5).
- Buttons: **Watch now** (deep link to provider app/website if available) · **Add to list** · **Not this one** (removes winner, re-reveals the next best with a quick shuffle; logs a negative).
- "Not this one" ×3 → offer **"Ask me 3 more?"** to continue the session.

### 8.9 Engine API (TypeScript)

```ts
type TraitVec = Float32Array;               // index per trait in traits.json order
interface Title { id: number; kind: 'movie'|'series'; traits: TraitVec; popularity: number; /* … */ }
interface Effect { trait: string; op: 'gte'|'lte'|'eq'|'near'|'has'|'not'; value?: number; strength: number }
interface Option { id: string; label: string; emoji?: string; effects: Effect[]; reactionTag: string }
interface Question { id: string; kind: QKind; prompt: string; options: Option[]; groupKey: string; requires?: Requires; weight: number }

class FindEngine {
  constructor(catalogue: Title[], questions: Question[], ctx: { taste?: TraitVec; services?: number[]; filters: Filters })
  next(): Question | null              // null → reveal
  answer(qid: string, optionId: string | { slider: number }): { aliveBefore: number; aliveAfter: number; eliminated: number[]; revived: number[] }
  alive(): number[]                    // ids, sorted by p desc
  top(n: number): { id: number; p: number }[]
  reveal(): { winner: number; runnersUp: number[] }
  reject(id: number): number           // next winner
  snapshot(): EngineState               // for resume after app backgrounding
}
```

Unit tests must cover: likelihood floor, don't-care = no-op, gating, stop conditions, the revive path, and determinism with a seeded RNG.

---

## 9. Screen specs

### 9.1 First-run onboarding
1. **Sting**: black → grain fades in → the brand gradient sweeps left-to-right through the wordmark `reelroll` → the "ll" spins like a reel → original 2-note sting + haptic success. ≤ 2.2s, skippable on tap.
2. **Services**: "What do you stream on?" with provider logo chips in a 3-col grid, multi-select, and a spring pop on select. Toggle: "Only show stuff I can watch" (default ON).
3. **Taste check**: "Tap 3 you loved" on a 3-col poster grid of 24 diverse popular titles. A selected poster gets a gradient ring + check. CTA: "Let's roll" (enabled after 3).

### 9.2 Find: start
- Big centred card on the living gradient: **"Movie or series?"** with 3 chunky tiles (Movie 🎬 / Series 📺 / Surprise me 🎲).
- Behind it, a faint, slowly drifting **poster wall** (all titles in pool, tiny `w92` posters, 30% opacity, parallax with device tilt if allowed).

### 9.3 Find: question loop (main game screen)
Layout top → bottom:
- **Top bar**: close (X), progress dots (soft, not numbered), and **"Just show me!"** pill (from Q4).
- **Counter**: big Clash Display odometer: `847` with "titles left" under it. On update, digits roll, plus a small burst of particles in the dominant mood colour when the drop is > 30%.
- **Poster wall** (behind/under counter): a grid of the alive titles' posters. On answer, eliminated posters **flip and fall** (rotateX + translateY + fade, staggered 8ms, max 120 animated; the rest just fade). Survivors re-layout smoothly (`layout` prop).
- **Reaction bubble**: after an answer, a short line ("ohhh scary… what else?") pops in near the counter, holds 900ms, fades. Sound: soft "pop".
- **Question card** (bottom 55%): glass card with the prompt (24–28pt), optional subprompt, and the answer UI by kind:
  - `binary` / `tri`: big pill buttons, the third being "Either / don't care" in a quieter style.
  - `slider`: a custom thumb on a gradient track with labelled ends ("Chill 😌 ↔ Edge of my seat 😰"). Snaps to 5 detents with haptic ticks.
  - `duel`: two posters side by side, "This vibe or that vibe?" Tap one; the other slides away.
  - `mood`: 6 gradient swatches with one-word labels (Cosy, Dark, Electric, Dreamy, Wild, Heavy).
  - `chips`: multi-select themes ("Any of these sound good?"), with a "None of these" option.
- **Transition between questions**: the card slides up/out (y −24, opacity 0, 200ms), the reaction shows, then the next card springs in from below. Total ≤ 650ms. Don't block taps for longer than 300ms.

### 9.4 Find: reveal
Sequence (≤ 2.4s, skippable):
1. The UI dims to near-black, and the poster wall collapses toward centre (all remaining posters fly to centre and stack).
2. Drumroll (short, 700ms) + haptic ticks.
3. The stack **flips** to reveal the winner poster at hero size with a gold glow; the backdrop image fades in behind at 40% with heavy blur; the sting plays; haptic success.
4. Under it: title, year · runtime/seasons · rating ★ 7.8 · genre chips, then a **"Where to watch"** row of provider logos (or "Rent on Apple TV" / "Not streaming in SA right now"), then CTAs.
5. Runners-up as 2 small cards: "Also in the running".
6. Reaction line: "This one. Trust me." (tag `reveal`).

### 9.5 Swipe
- Full-height card stack (3 visible, offset 8px / scale 0.96 each).
- Card: poster (w500) fills it, with a bottom gradient scrim, title, year, ★ rating, 2 genre chips, and a one-line tagline.
- Gestures:
  - **Right** = "Into it" → adds to My List + strong positive taste signal. Green glow edge, `ding`.
  - **Left** = "Nah" → negative signal (not "not for me"). Red glow edge, soft thud.
  - **Up** = "Seen it" → watched=true, then asks a tiny follow-up chip: "Loved it / It was fine / Hated it".
  - **Tap** = open the detail sheet (shared poster transition).
- Commit threshold is 35% width or a velocity > 800px/s; otherwise spring back. The card rotates ±12° proportional to drag.
- Undo button (last 5 swipes), bottom left.
- Filter button opens a sheet with Movie/Series, genres, "only my services", era.
- Feed: 70% taste-matched, 20% popular, 10% wildcard. It refreshes as taste updates (every 10 swipes).
- Milestones: every 25 swipes a small celebration card says "25 swipes. You've got taste. Want me to pick from your right-swipes?" and runs a mini-Find on the My List pool.

### 9.6 Roll (random)
The fun one: a **slot-machine reel of posters**.
- Centre: a vertical (or 3-column) reel window with a gradient frame and glass reflections.
- Top: filter chips (Movie / Series / Both, genre picker, "My services", "From my list").
- Trigger options: a big **ROLL** button, **pull-down lever** (drag the handle down), or **shake the phone** (DeviceMotion; ask permission on iOS).
- Spin: posters blur-scroll fast (motion blur via stretched scaleY), decelerate with a custom ease (`cubic-bezier(0.12, 0.9, 0.18, 1)`, ~2.2s), with ticks (sound + selection haptic) as each poster passes, slowing down. **Near-miss tease**: the reel briefly slows on a "fake" poster before nudging to the winner (30% of rolls).
- Land: clunk + heavy haptic, the winner pops forward with a glow, and confetti in the poster's dominant colour (subtle, 600ms).
- Card actions: **Roll again** · **Add to list** · **Details**. Streak counter: "Rolled 4 times… picky tonight hey 😅" (voice tag `reroll`).
- Weighted random: from the filtered pool, weights = `popularity^0.3 × taste boost` (so it's random but rarely awful). Never repeat a title within the last 30 rolls.

### 9.7 Library
- Large title "Library", segmented control: **My List · Liked · Watched · Not for me**.
- Each segment uses Netflix-vibe **horizontal rows** grouped by genre/kind ("Series on your list", "Thrillers you saved"), or toggles to a 3-col grid.
- A search bar (pull down to reveal, iOS style) searches the whole catalogue with instant fuzzy search (Fuse.js on title + original_title + cast names).
- Stats header (fun): "34 watched · 12 hours of horror · Your vibe: Dark & clever."
- Empty states have personality: "Nothing here yet. Go roll something 🎲".
- Settings live behind a gear in the top right as a sheet: services, region, sound, haptics, reduced motion, clear data, attributions, version.

### 9.8 Title Detail Sheet (global)
Opens as a bottom sheet with the shared poster transition. Content:
- **Hero**: backdrop (w1280) with a gradient into `--bg-0`, poster overlapping bottom left, a **trailer play** button (YouTube embed in a modal; autoplay muted preview in hero after 1.5s if on Wi-Fi, optional).
- **Title block**: title (Clash 28), year · runtime or "3 seasons · 24 eps" · certification badge.
- **Ratings row**: TMDB ★ 7.8 (vote count), plus IMDb and RT if available. Clean chips, not cluttered.
- **Action row** (4 big icon buttons, each animates its state):
  - **＋ My List** (toggles a check, morphing icon)
  - **♥ Like** (heart burst animation)
  - **✓ Watched** (on tap: asks "How was it?" with 5-star quick rating or skip)
  - **⊘ Not for me** (hidden behind a "…" overflow to avoid mis-taps)
- **Where to watch (South Africa)**: provider logos split into Stream / Rent / Buy, each tappable (deep link), plus "Powered by JustWatch".
- **Overview** (3 lines, then "more").
- **Genres + vibe tags**: our traits shown as human chips ("Slow burn", "Twisty", "Big laughs", "Bring tissues").
- **Cast** row (6, round photos).
- **"More like this"**: 10 nearest neighbours by trait cosine.
- For series: season count, status ("Ended", "Still going").

---

## 10. Sound design

All sounds are **original**. Ship synthesized Web Audio placeholders first (`src/audio/synth.ts`), then swap in the final pack from Joshie. **ASK Joshie for the sound pack** (or approve sourcing from a royalty-free library he picks).

| Key | Where | Character | Length |
|---|---|---|---|
| `ui.tap` | buttons | soft muted click | 40ms |
| `ui.tab` | tab switch | tiny glassy tick | 60ms |
| `q.whoosh` | question transition | airy swoosh, low-passed | 250ms |
| `q.pop` | reaction bubble | bubbly pop | 120ms |
| `count.tick` | odometer digits | dry mechanical tick (throttled) | 20ms |
| `count.drop` | big elimination | descending "fwoomp" | 400ms |
| `swipe.right` | like | bright 2-note ding (up) | 180ms |
| `swipe.left` | nope | soft low thud | 150ms |
| `swipe.up` | seen | paper flick | 150ms |
| `reel.spin` | roll loop | ratchety film-projector whir | loop |
| `reel.tick` | reel poster pass | clacky tick, pitch rises as it slows | 25ms |
| `reel.stop` | land | heavy clunk + short reverb tail | 350ms |
| `reveal.drum` | before reveal | short snare roll | 700ms |
| `reveal.sting` | winner | **original** 2-note cinematic "bwaa-oom" with sub boom. Must NOT resemble Netflix's ta-dum. | 1.2s |
| `lib.add` | add to list | soft "shk" + chime | 200ms |
| `lib.like` | like | warm pluck | 180ms |

Rules: master volume 0.6, respect the iOS silent switch (Capacitor), a global mute toggle, no sound on first paint until a user gesture unlocks audio, and preload with Howler sprites (single file).

---

## 11. Copy & voice system

- `data/voice-lines.json` holds lines grouped by `reactionTag`.
- Each option in the question bank has a `reactionTag`. The engine also adds **contextual tags**:
  - `bigDrop` (> 40% eliminated): "ooh that narrowed it down."
  - `tinyDrop` (< 5%): "noted. still plenty."
  - `revive`: "wait… someone's back."
  - `closeCall` (top two p within 10%): "it's between two now…"
- Priority: contextual tag (if triggered, 40% chance) → option tag → generic.
- Store the last 12 lines used and never repeat within a session.

---

## 12. Always improving (learning loop)

**Log** (anonymous by default): sessions, every answer with `alive_before/after` and `ms_to_answer`, reveal outcome, rejects, swipes, library actions. Keep it privacy-light: no PII, and anon user ids.

**Signals → improvements:**
1. **Question usefulness**: nightly SQL job computes the average realised info gain + drop-off rate per question. Update `questions.weight` (clamp 0.4–1.6). Questions people abandon at get down-weighted.
2. **Slow questions**: if median `ms_to_answer` > 6s, flag for copy rewrite (people found it confusing).
3. **Trait correction (crowd)**: when a user answered "no scary stuff" but accepted & liked a title tagged scare 0.7, nudge that title's scare down by `η=0.02` (source `crowd`, cap total crowd shift ±0.25 from base). Do the reverse for rejections.
4. **Reveal acceptance rate** is the north-star metric. Track it per week and per question set.
5. **A/B harness**: `questions.active` + a `variant` field to test new questions on 20% of sessions.
6. **Admin page** (`/admin`, Supabase auth role `admin`): question list with weight, IG, drop-off and acceptance; edit prompts/options/effects live; preview a question against the catalogue ("splits 48/52").

Joshie can add new questions by inserting rows. No deploy needed, because the client pulls questions on boot (cached, with a version stamp).

---

## 13. Project structure

```
reelroll/
├── CLAUDE.md
├── docs/HANDOVER.md
├── data/
│   ├── traits.json
│   ├── questions.seed.json
│   └── voice-lines.json
├── scripts/
│   ├── ingest/ (tmdb.ts, tagger.ts, colors.ts, build-catalogue.ts)
│   └── seed-questions.ts
├── supabase/
│   ├── migrations/
│   └── functions/ (title-detail, tmdb-proxy, nightly-learn)
├── src/
│   ├── app/ (App.tsx, routes.tsx, providers.tsx)
│   ├── design/ (tokens.css, MeshGradient.tsx, Grain.tsx, Glass.tsx, Odometer.tsx)
│   ├── nav/ (TabBar.tsx, LargeTitle.tsx, Sheet.tsx)
│   ├── engine/ (find-engine.ts, likelihood.ts, info-gain.ts, gating.ts, worker.ts, *.test.ts)
│   ├── features/
│   │   ├── onboarding/
│   │   ├── find/ (StartCard, QuestionCard, kinds/*, PosterWall, Reveal, Recap)
│   │   ├── swipe/ (CardStack, SwipeCard, Undo, Filters)
│   │   ├── roll/ (Reel, Lever, ShakeTrigger, RollResult)
│   │   ├── library/ (Segments, Rows, Grid, Search, Stats, Settings)
│   │   └── title/ (DetailSheet, Providers, Ratings, ActionRow, MoreLikeThis)
│   ├── audio/ (sound.ts, synth.ts, sprites.json)
│   ├── haptics/ (haptics.ts)
│   ├── data/ (catalogue.ts, queries.ts, supabase.ts, localdb.ts)
│   ├── voice/ (reactions.ts)
│   └── store/ (prefs.ts, library.ts, session.ts)
├── public/ (icons, manifest, catalogue.min.json)
└── capacitor.config.ts
```

---

## 14. Performance, accessibility, quality

- **Boot**: interactive in < 2s on 4G. The catalogue is cached by the service worker; show the onboarding sting while loading.
- **Poster wall**: render as a CSS grid of `<img loading="lazy" decoding="async">` with `w92`. Above ~300 tiles, switch to a single `<canvas>` layer for the background wall.
- **Engine**: next-question compute < 30ms in the worker on the top 500 titles.
- Images get a BlurHash placeholder and fade in at 200ms.
- **A11y**: all buttons labelled; Dynamic Type friendly (rem-based); contrast AA on text; reduced motion; VoiceOver reads the counter politely (`aria-live="polite"`, throttled).
- **Offline**: Roll and Swipe work offline from the cached catalogue; library actions queue and sync.
- **Analytics**: own events table in Supabase (no third-party trackers in v1).

---

## 15. Milestones (build in this order)

| # | Milestone | Done when |
|---|---|---|
| M0 | Repo, Vite+TS+Tailwind, tokens, fonts, PWA manifest, Capacitor init | App runs on phone via `npm run dev -- --host` |
| M1 | Ingestion pipeline + Supabase schema + `catalogue.min.json` | ≥ 2,000 movies + 1,000 series with posters, ZA providers, traits |
| M2 | Design shell: MeshGradient, Grain, Glass, **TabBar**, LargeTitle, Sheet | 4 tabs switch with a sliding pill, haptics, 60fps |
| M3 | **Title Detail Sheet** + **Library** (list/like/watched/not-for-me, search) | Can open any title, toggle states, persist offline |
| M4 | **Roll** | Lever / button / shake, reel spin, land, re-roll, filters |
| M5 | **Swipe** | Gestures, undo, filters, taste updates, seen-it follow-up |
| M6 | **Find engine** + tests | Engine passes tests; CLI sim narrows 3,000 → 1 in ≤ 14 Qs |
| M7 | **Find UI**: start, all question kinds, poster wall, counter, reactions, reveal | Full session feels great on phone |
| M8 | Onboarding + sound pack + haptics polish | Joshie sign-off on feel |
| M9 | Logging + nightly learning + `/admin` | Weights update; questions editable live |
| M10 | Capacitor builds (iOS/Android), icons, splash | TestFlight / internal APK |
| v1.5 | **Group mode**: 2–4 phones join via a 4-letter code, all answer, engine multiplies likelihoods across players | "Date night" sessions work |

---

## 16. Acceptance criteria (spot checks Joshie will do)

- [ ] Opening the app feels like opening a premium streaming app: dark, cinematic, smooth.
- [ ] The tab bar looks and behaves like iOS (floating, blurred, sliding pill, haptic).
- [ ] Find gets from thousands to a confident pick in 6–12 questions on average.
- [ ] One "wrong" answer never makes an obviously perfect title disappear forever.
- [ ] Reactions feel like a friend, with no repeats in a session.
- [ ] Every poster and image loads by itself (no manual uploads).
- [ ] Any title opens a detail sheet with description, ratings, trailer, where to watch in SA, and list/like/watched.
- [ ] Roll is genuinely fun to spam.
- [ ] Swipe feels as good as the best dating apps (physics, glow, sound).
- [ ] Nothing uses Netflix's logo, font or sound.
- [ ] Reduced motion mode still feels good.

---

## 17. Open questions for Joshie (Claude Code: ask these up front)

1. TMDB API key (free at themoviedb.org → Settings → API). Also an OMDb key for IMDb/RT ratings, yes or no?
2. Supabase project: create a new one, or use an existing org?
3. Rules-only trait tagging, or a one-off LLM enrichment pass at build time for fuzzier traits?
4. Final name + logo: stick with **Reelroll**?
5. Sound pack: will Joshie produce or source it, or should the dev keep the synthesized placeholders for now?
6. Fonts: Clash Display + Satoshi OK?
7. SA streaming services to feature in onboarding (default: Netflix, Showmax, Disney+, Prime Video, Apple TV+, BritBox, YouTube, DStv Stream).
8. Any visual references (apps, Dribbble shots) for the reveal and reel moments?
9. Monetisation plans? (This affects TMDB terms.)
