// Synthesized placeholder sounds (HANDOVER §10) — swapped for Joshie's pack in M8.
// All original, all tiny. Master volume 0.6. Silent until a user gesture unlocks audio.
import { usePrefs } from '../store/prefs';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  return ctx;
}

// Final sound pack: files listed in /sounds/manifest.json ({ "files": { "reel.stop": "reel-stop.mp3" } })
// replace the synth for that key. Missing keys keep the placeholder.
const samples = new Map<string, AudioBuffer>();
let samplesLoading = false;
function loadSamples(c: AudioContext) {
  if (samplesLoading) return;
  samplesLoading = true;
  fetch('/sounds/manifest.json')
    .then((r) => r.json() as Promise<{ files?: Record<string, string> }>)
    .then(async (m) => {
      for (const [key, file] of Object.entries(m.files ?? {})) {
        try {
          const buf = await fetch(`/sounds/${file}`).then((r) => r.arrayBuffer());
          samples.set(key, await c.decodeAudioData(buf));
        } catch {
          /* keep synth for this key */
        }
      }
    })
    .catch(() => {});
}

/** Call from any user gesture; iOS needs this before sound can play. */
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state !== 'running') void c.resume();
  loadSamples(c);
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

type Key = 'reel.tick' | 'reel.stop' | 'reel.lever' | 'ui.tap' | 'roll.confetti' | 'swipe.right' | 'swipe.left' | 'swipe.up' | 'q.pop' | 'q.whoosh' | 'count.tick' | 'count.drop' | 'reveal.drum' | 'reveal.sting' | 'ui.tab' | 'lib.add' | 'lib.like';

export function play(key: Key, opts: { pitch?: number } = {}) {
  if (!usePrefs.getState().sound) return;
  const c = ac();
  if (!c || !master || c.state !== 'running') return;
  const t = c.currentTime + 0.005;
  const out = master;

  const sample = samples.get(key);
  if (sample) {
    const src = c.createBufferSource();
    src.buffer = sample;
    if (key === 'reel.tick' && opts.pitch) src.playbackRate.value = 1 + opts.pitch * 0.5;
    src.connect(out);
    src.start(t);
    return;
  }

  switch (key) {
    case 'reel.tick': {
      // Clacky tick; pitch rises as the reel slows (caller passes 0..1).
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.03);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + (opts.pitch ?? 0) * 2200;
      bp.Q.value = 6;
      const g = c.createGain();
      env(g, t, 0.5, 0.001, 0.025);
      n.connect(bp).connect(g).connect(out);
      n.start(t);
      n.stop(t + 0.04);
      break;
    }
    case 'reel.stop': {
      // Heavy clunk: low sine thump + filtered noise + short tail.
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
      const g = c.createGain();
      env(g, t, 0.9, 0.004, 0.32);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.4);
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.12);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g2 = c.createGain();
      env(g2, t, 0.45, 0.002, 0.09);
      n.connect(lp).connect(g2).connect(out);
      n.start(t);
      break;
    }
    case 'reel.lever': {
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.2);
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(600, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
      bp.Q.value = 3;
      const g = c.createGain();
      env(g, t, 0.35, 0.01, 0.16);
      n.connect(bp).connect(g).connect(out);
      n.start(t);
      break;
    }
    case 'ui.tap': {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 660;
      const g = c.createGain();
      env(g, t, 0.18, 0.002, 0.035);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.05);
      break;
    }
    case 'swipe.right': {
      // Bright 2-note ding, up.
      [740, 1108].forEach((f, i) => {
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = c.createGain();
        env(g, t + i * 0.06, 0.2, 0.003, 0.16);
        o.connect(g).connect(out);
        o.start(t + i * 0.06);
        o.stop(t + i * 0.06 + 0.2);
      });
      break;
    }
    case 'swipe.left': {
      // Soft low thud.
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      const g = c.createGain();
      env(g, t, 0.35, 0.004, 0.13);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.18);
      break;
    }
    case 'swipe.up': {
      // Paper flick: short high-passed noise.
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.12);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 2500;
      const g = c.createGain();
      env(g, t, 0.28, 0.002, 0.1);
      n.connect(hp).connect(g).connect(out);
      n.start(t);
      break;
    }
    case 'ui.tab': {
      // Tiny glassy tick.
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = 2400;
      const g = c.createGain();
      env(g, t, 0.06, 0.001, 0.05);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.07);
      break;
    }
    case 'lib.add': {
      // Soft "shk" + chime.
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.06);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4000;
      const g = c.createGain();
      env(g, t, 0.12, 0.002, 0.05);
      n.connect(hp).connect(g).connect(out);
      n.start(t);
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = 1568;
      const g2 = c.createGain();
      env(g2, t + 0.05, 0.14, 0.003, 0.16);
      o.connect(g2).connect(out);
      o.start(t + 0.05);
      o.stop(t + 0.25);
      break;
    }
    case 'lib.like': {
      // Warm pluck.
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(659, t);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3000, t);
      lp.frequency.exponentialRampToValueAtTime(600, t + 0.16);
      const g = c.createGain();
      env(g, t, 0.22, 0.003, 0.17);
      o.connect(lp).connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.2);
      break;
    }
    case 'q.pop': {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(980, t + 0.06);
      const g = c.createGain();
      env(g, t, 0.22, 0.004, 0.1);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.13);
      break;
    }
    case 'q.whoosh': {
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.3);
      const bp = c.createBiquadFilter();
      bp.type = 'lowpass';
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(2200, t + 0.12);
      bp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
      const g = c.createGain();
      env(g, t, 0.16, 0.06, 0.18);
      n.connect(bp).connect(g).connect(out);
      n.start(t);
      break;
    }
    case 'count.tick': {
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.02);
      const hp = c.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3500;
      const g = c.createGain();
      env(g, t, 0.12, 0.001, 0.015);
      n.connect(hp).connect(g).connect(out);
      n.start(t);
      break;
    }
    case 'count.drop': {
      // Descending "fwoomp".
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.38);
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const g = c.createGain();
      env(g, t, 0.35, 0.02, 0.36);
      o.connect(lp).connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.45);
      break;
    }
    case 'reveal.drum': {
      // ~700ms snare roll, crescendo.
      for (let k = 0; k < 18; k++) {
        const at = t + k * 0.038;
        const n = c.createBufferSource();
        n.buffer = noiseBuffer(c, 0.05);
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1800;
        bp.Q.value = 0.8;
        const g = c.createGain();
        env(g, at, 0.08 + (k / 18) * 0.28, 0.002, 0.04);
        n.connect(bp).connect(g).connect(out);
        n.start(at);
      }
      break;
    }
    case 'reveal.sting': {
      // Original 2-note "bwaa-oom": a rising fifth on detuned saws + sub boom. Not a ta-dum.
      const notes: [number, number][] = [[196, 0], [293.7, 0.2]];
      for (const [f, d] of notes) {
        for (const det of [-7, 0, 7]) {
          const o = c.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = f;
          o.detune.value = det;
          const lp = c.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(500, t + d);
          lp.frequency.exponentialRampToValueAtTime(2600, t + d + 0.25);
          lp.frequency.exponentialRampToValueAtTime(700, t + d + 1.0);
          const g = c.createGain();
          env(g, t + d, 0.07, 0.05, 0.95);
          o.connect(lp).connect(g).connect(out);
          o.start(t + d);
          o.stop(t + d + 1.1);
        }
      }
      const sub = c.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(70, t + 0.2);
      sub.frequency.exponentialRampToValueAtTime(40, t + 1.1);
      const sg = c.createGain();
      env(sg, t + 0.2, 0.55, 0.01, 0.9);
      sub.connect(sg).connect(out);
      sub.start(t + 0.2);
      sub.stop(t + 1.2);
      break;
    }
    case 'roll.confetti': {
      // Two bright plucks, up a fifth.
      [880, 1320].forEach((f, i) => {
        const o = c.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        const g = c.createGain();
        env(g, t + i * 0.07, 0.16, 0.003, 0.18);
        o.connect(g).connect(out);
        o.start(t + i * 0.07);
        o.stop(t + i * 0.07 + 0.25);
      });
      break;
    }
  }
}
