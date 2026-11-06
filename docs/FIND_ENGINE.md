# Find engine (M6)

`src/engine/` · HANDOVER §8 · run the simulator with `npm run sim -- [sessions] [noise]`.

## How it works

1. **Prior** (§8.1): every title starts with `popularity_pct^0.35 × (1 + 0.6·taste_sim)`. Taste comes
   from Swipe / likes / list adds (M5). No service boost: where-to-watch is info only (Joshie, M1).
2. **Answers** (§8.2) multiply each title's probability by `L(a|t)`, where
   `L = ε + (1−ε)·Π[1 − strength·(1 − match)]` and `ε = 0.12`, so **no single answer can zero a title**.
   "Don't care" options have no effects → `L = 1` (no-op). Chips combine with **any** (best match wins).
   Hard filters only for *Movie/Series* and *Family + kids*.
3. **Alive** = titles within a ratio of the leader; titles drop out and can **come back** (revive).
4. **Next question** (§8.4): expected information gain over the top 500 alive titles × weight ×
   variety (1.15) × pacing (0.6) × novelty (0.85) × ±7% seeded jitter; groups answered decisively are
   skipped. Gating (§8.5): `kind`, `trait_mass`, `after`, `answered`, `not_answered`.
5. **Fixed opening** (§8.6): Movie or series? → Who's watching? → How much time? (skipped for "Surprise me").
6. **Generated questions**: one per theme template (only when the theme splits 3–60% of alive mass),
   a **duel** ("This vibe or that vibe?": two popular alive titles far apart on the most uncertain trait),
   and one **"Seen X?" probe** of the current leader late in the session.
7. **Stop** (§8.7): ≥ 5 asked and (leader p ≥ 0.3, or ≤ 3 alive, or leader ≥ 3× 4th place after Q8,
   or nothing left worth asking), hard cap 14, or **Just show me!**
8. **Reveal** (§8.8): winner + 2 runners-up chosen with MMR (λ = 0.5) so they're *different*.
   `reject()` = "Not this one"; `extend(3)` = "Ask me 3 more?". `snapshot()/restore()` for app backgrounding.

## Where I tuned away from the spec (all in `TUNING`)

| Knob | Spec | Now | Why |
|---|---|---|---|
| Evidence power β (`p ← p·L^β`) | 1 | **2.5** | With β = 1 the 3,000 pool barely moved (3,000 → ~2,000 after 14 Qs) and every session hit the cap. The ε floor still holds (ε^β ≈ 0.005 per answer, never 0). |
| Alive ratio | 0.015 | **0.08** | Makes the "titles left" counter drop like a game: ~3,000 → ~600 by Q4 → ~100 by Q9. |
| Stop: leader p | 0.45 | **0.3** | 0.45 is almost unreachable over thousands of titles. |
| Extra stops | – | leader ≥ 3× 4th after Q8; best IG < 0.1 bits | "Confident" in practice; avoids pointless questions. |
| IG of questions with a "don't care" option | – | × 0.75 | Expected share of shrug answers. |
| Slider | `near` on raw value | `near` on the trait's **catalogue percentile** | Rule-tagged traits rarely reach 0 or 1, so "Make me think" would otherwise punish almost everything. |
| Worker | Web Worker | main thread for now | `next()` averages ~3 ms (max ~40 ms first call) in Node. I'll move it into a worker in M7 if the phone profile shows jank. |

Seed fix: **"Pick an era" had no 2010s option** (36% of the catalogue). Added `tens` · 2010s 📱.

## Simulation (300 sessions, simulated user answers truthfully with 10% random noise)

```
avg alive after Q: 1:2273 2:2146 3:1131 4:407 5:264 6:186 7:131 8:93 9:73 10:59 11:51 12:48 13:44 14:41
default tuning — Find engine simulation — 300 sessions, 3000 titles, noise 10%
Questions per session: avg 11.8  · histogram 6:1 7:4 8:27 9:25 10:40 11:34 12:29 13:29 14:111
Exact title revealed as winner: 33.7% · in winner + 2 runners-up: 55.7% · still alive at reveal: 84.7%
Similarity winner↔secret title: 0.65 (random pick: 0.01)
next() timing: avg 3.1ms · max 35.1ms (Node, desktop CPU)
```

"Exact title" is a harsh test: the simulated user is thinking of one specific title out of 3,000.
The real goal is a pick they'll love; the similarity score (0 = random, 1 = identical vibe) is the better
proxy. Biggest lever left: richer traits (LLM enrichment pass, decision #5).
