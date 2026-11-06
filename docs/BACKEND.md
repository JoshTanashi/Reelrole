# Backend (M9): Supabase

Project **Reelrole** · ref `yjbbtecdqhwxllgponls` · eu-central-1 (Frankfurt).

## What lives where
- **Catalogue** stays static (`public/catalogue/*`, rebuilt by `npm run ingest`). Supabase mirrors only title ids/names
  (`titles`) so crowd corrections can reference them. No TMDB key on the server or the phone.
- **Phone is the source of truth** (local-first). `src/data/sync.ts` pushes in the background (launch, app goes to
  background, 5s after library edits, end of a Find round) and pulls the live question bank + crowd corrections.
- **Auth**: anonymous sign-in on first launch (one private user per phone). `/admin` uses a magic-link email login
  with its own storage, so it never mixes with the phone's anonymous user.

## Tables (all RLS on)
| Table | Who | What |
|---|---|---|
| `questions`, `question_options` | read: everyone · write: admins | the live question bank (seeded from `data/questions.seed.json`) |
| `app_config.questions_version` | read: everyone · write: admins | phones re-download questions when it changes |
| `sessions`, `session_answers` | owner (+ admins read) | every Find round: answers, titles left before/after, time to answer, outcome |
| `user_titles`, `swipes`, `user_prefs` | owner | library, swipe log, prefs + taste vector |
| `trait_feedback` | insert own | "accepted a title that contradicts an answer" signals (§12.3) |
| `trait_corrections` | read: everyone | aggregated crowd nudges, capped ±0.25, applied on top of shipped traits at boot |
| `question_stats` | admins | output of the nightly learning job |
| `admin_emails` | admins | who can use /admin |

## Learning loop (§12)
`learn()` runs **every night at 02:00 SAST** (pg_cron) and on demand from /admin:
1. Per question (last 90 days): times asked, average realised information gain (log₂ titles-before/after),
   drop-off (sessions abandoned at that question), median answer time, acceptance rate of sessions it appeared in.
2. Weights drift 20% per night toward `gain / average gain × (1 − 2·drop-off)`, clamped 0.4–1.6, only once a
   question has 20+ answers. If any weight changes, the question bank version bumps and phones pick it up.
3. Median answer time > 6s flags the question as **slow** (⚠︎ in /admin: copy probably confusing).
4. Crowd trait feedback is summed per title/trait and capped at ±0.25.

**North-star**: reveal acceptance rate, shown on /admin for the last 7 days.

## A/B harness (§12.5)
Set a question's **variant** to `b` in /admin: only ~20% of phones (bucketed by user id) get it. `a` = the rest.

## Deviations from the spec
- No edge functions (title-detail / tmdb-proxy / nightly-learn): the catalogue is static and learning is pure SQL,
  so there's nothing for them to do. Less to run, nothing to pay for.
- `title_traits` became `trait_corrections` (deltas only); base traits ship in `traits.bin`.

## Ops
- `npm run seed:db -- you@email` re-seeds titles + adds an admin. New seed questions are added; questions edited
  in /admin are never overwritten.
- Migrations: `supabase/migrations/*.sql` (applied through the Supabase Management API).
