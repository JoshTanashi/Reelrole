# Sound list (for the final pack)

Every sound in the app today is a **synthesized placeholder** (`src/audio/synth.ts`, Web Audio, all original).
To swap one in: drop the file in `public/sounds/` and map it in `public/sounds/manifest.json`:

```json
{ "files": { "reel.stop": "reel-stop.mp3", "reveal.sting": "sting.mp3" } }
```

Anything not listed keeps its placeholder, so the pack can arrive in pieces. Format: **mp3 or m4a, 44.1/48 kHz,
mono is fine, peak ≤ −1 dBFS, trimmed tight** (no leading silence). Master volume is 0.6 in-app.

| Key | Where it plays | Character | Length | Notes |
|---|---|---|---|---|
| `ui.tap` | onboarding deselect, small taps | soft muted click | ~40 ms | |
| `ui.tab` | switching tabs | tiny glassy tick | ~60 ms | plays a lot: keep it very quiet |
| `q.whoosh` | answering / next question | airy swoosh, low-passed | ~250 ms | |
| `q.pop` | reaction bubble appears | bubbly pop | ~120 ms | |
| `count.tick` | counter drops a little | dry mechanical tick | ~20 ms | |
| `count.drop` | big elimination (> 30%) | descending "fwoomp" | ~400 ms | |
| `swipe.right` | Swipe: Into it | bright 2-note ding (up) | ~180 ms | |
| `swipe.left` | Swipe: Nah | soft low thud | ~150 ms | |
| `swipe.up` | Swipe: Seen it | paper flick | ~150 ms | |
| `reel.lever` | pulling the Roll lever | ratchet / spring stretch | ~200 ms | |
| `reel.tick` | each poster passing in the reel | clacky tick | ~25 ms | app raises pitch as the reel slows (playbackRate up to 1.5×) |
| `reel.stop` | reel lands | heavy clunk + short reverb tail | ~350 ms | |
| `roll.confetti` | right after landing | two bright plucks | ~300 ms | |
| `reveal.drum` | Find reveal build-up | short snare roll, crescendo | ~700 ms | |
| `reveal.sting` | Find reveal + onboarding | **original** 2-note cinematic "bwaa-oom" with sub boom | ~1.2 s | must NOT resemble Netflix's ta-dum |
| `lib.add` | add to My List | soft "shk" + chime | ~200 ms | |
| `lib.like` | like / onboarding pick | warm pluck | ~180 ms | |

Not used (spec'd, but the reel's ticks already carry the spin): `reel.spin` loop.

**iPhone notes:** the web app can't read the silent switch (Safari doesn't expose it), so the in-app
Settings → Sound toggle is the mute. Sound starts after your first tap (iOS rule). I used Web Audio directly
instead of Howler: it does the same job here with zero extra weight. Happy to switch if you prefer.
