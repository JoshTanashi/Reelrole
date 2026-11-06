# Decisions log

Answers from Joshie (2026-11-06) and calls made since. Newest at the bottom.

| # | Topic | Decision |
|---|---|---|
| 1 | TMDB key / OMDb | Ask again before M1 (TMDB key via secure env form, never in chat/repo). OMDb: remind at the end. |
| 2 | Supabase | New project, deferred to M9. M0–M8 run on a prebuilt `catalogue.min.json` + local-first library (IndexedDB). |
| 3 | Network | OK to allow TMDB / image CDN / Supabase hosts when needed. |
| 4 | Name | **Reelrole** (wordmark `reelrole`, the "o" is a film reel). |
| 5 | Trait tagging | Rules only for M1; add an LLM pass before M6 if Find feels off. |
| 6 | SA services | Pull real ZA provider list from TMDB in M1, confirm with Joshie. |
| 7 | Watch now | Opens the JustWatch/TMDB "where to watch" page. |
| 8 | Monetisation | None. Personal, non-public project (TMDB non-commercial terms OK). |
| 9 | Fonts | Archivo Variable (condensed 800 for titles/numbers, wide 800 for wordmark) + Inter Variable for UI. Both OFL, self-hosted via Fontsource. Clash/Satoshi dropped (Fontshare unreachable + not needed). |
| 10 | Logo | Text wordmark placeholder + reel-mark icon until final logo. |
| 11 | Sound | Synth placeholders; list of sounds handed over at M8. |
| 12 | References | Feel target: **Netflix** (dark, red-led, cinematic rows, bold reveals) with our own brand. Claude picks the rest; Joshie sends refs later to tune. |
| 13 | Device | iPhone mostly. |
| 14 | Previews | Vercel (team `father8son951-3200's projects`), auto-deploy per push. |
| 15/16 | Native | No Apple dev account → PWA "Add to Home Screen" is the iPhone target. Haptics are wired but only fire in a future native build (Android web falls back to vibrate). |
| 17 | Git | Keep pushing to `claude/clever-feynman-dwbqq2`. |
| M1 | Catalogue | Prebuilt static catalogue in `public/catalogue/` (core.json + traits.bin + 32 detail buckets), rebuilt with `npm run ingest`. 2,000 movies + 1,000 series + SA titles boosted in. |
| M1 | Cloud env | Personal environment `reelrole` allows api.themoviedb.org + image.tmdb.org; TMDB token is a proxy-injected secret, never in repo. |
| M1 | ZA provider gap | TMDB/JustWatch ZA data has Netflix, Prime Video, Apple TV, Crunchyroll, MUBI, Apple TV Store (rent/buy)… but **no Showmax / Disney+ / DStv Stream / BritBox**. Only ~31% of titles show a ZA streaming service. Needs Joshie's call. |
