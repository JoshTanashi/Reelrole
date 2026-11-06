# CLAUDE.md — Reelroll

You are building **Reelroll**, a mobile-first movie & series chooser that feels like a game.
The full product + technical spec lives in `docs/HANDOVER.md`. Read it fully before writing code.
Seed data lives in `data/`.

## Owner
Joshie (MOE Media, Johannesburg). Designer + React/Vite dev. Talk to him like a co-worker:
direct, no over-explaining basics. He wants it to look and feel *built* — premium, smooth, fun.

## Stack (do not swap without asking)
- React 18 + Vite + TypeScript (strict)
- Tailwind CSS + CSS variables for tokens
- `motion` (Framer Motion) for all animation, springs by default
- Zustand (client state), TanStack Query (server state)
- Supabase (Postgres, anon auth, edge functions, RLS)
- Howler.js for sound, `@capacitor/haptics` for haptics
- Capacitor for iOS/Android (web PWA first)
- Vitest + Testing Library, Playwright for flows

## Non-negotiables
1. **Mobile first.** Design at 390×844 (iPhone 14/15). Respect safe areas (`env(safe-area-inset-*)`).
2. **iOS-style floating tab bar** with blur — 4 tabs: Find · Swipe · Roll · Library. See HANDOVER §6.
3. **Netflix *vibes*, never Netflix assets.** No Netflix logo, red "N", Netflix Sans, or "ta-dum" sound. Our own brand, our own sounds.
4. **Voice is human, not AI.** Reactions like "ahh great choice", "mmm interesting", "ohhh scary… what else?". Never "As an AI", never robotic. Use `data/voice-lines.json`.
5. **Smooth, not overbearing.** 60fps. Springs, short durations (180–420ms), one hero animation per moment. Honour `prefers-reduced-motion`.
6. **TMDB API key never ships in the client.** Proxy through a Supabase edge function or prebuilt catalogue.
7. **Soft elimination engine** — never hard-delete a title on one answer. See HANDOVER §8.
8. Attribution: TMDB + JustWatch credits in Library → About.

## Working rules
- Build in the milestone order in HANDOVER §15. Ship each milestone runnable.
- After each milestone: short summary, what to test on phone, what's next.
- Keep components small; feature folders (`src/features/find`, `swipe`, `roll`, `library`, `title`).
- No placeholder lorem — use real TMDB data once M1 is done.
- Write tests for the engine (`src/engine/*`) — it's the heart of the app.

## ASK JOSHIE before guessing on any of these
Stop and ask (one message, grouped) when you hit:
- TMDB API key / Supabase project URL + anon key
- Final logo, app icon, wordmark (use the text wordmark placeholder until then)
- Sound pack (ship synthesized Web Audio placeholders first, list exactly which sounds are needed)
- Font licence choice (defaults in HANDOVER §5)
- Which streaming services to show for South Africa
- Any copy that's longer than a sentence
- Visual references — if a screen feels generic, ask him for references/screenshots rather than inventing
- Anything involving payments, ads, or accounts beyond anonymous auth
