import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Backdrop } from '../design/Backdrop';
import { Wordmark } from '../design/Wordmark';
import { spring } from '../design/motion';
import { haptics } from '../haptics/haptics';
import { CatalogueCheck } from './CatalogueCheck';

const SWATCHES = [
  { name: 'bg-0', v: 'var(--bg-0)' },
  { name: 'bg-1', v: 'var(--bg-1)' },
  { name: 'bg-2', v: 'var(--bg-2)' },
  { name: 'ember', v: 'var(--ember-500)' },
  { name: 'magenta', v: 'var(--magenta-500)' },
  { name: 'violet', v: 'var(--violet-500)' },
  { name: 'gold', v: 'var(--gold-400)' },
  { name: 'yes', v: 'var(--yes)' },
  { name: 'no', v: 'var(--no)' },
];

const BUILD = import.meta.env.VITE_BUILD_ID as string | undefined;

export function App() {
  const [play, setPlay] = useState(0);
  const checkRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-dvh">
      <Backdrop />

      {/* Hero / sting */}
      <section
        className="relative flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe text-center"
        onClick={() => {
          haptics.light();
          setPlay((p) => p + 1);
        }}
      >
        <Wordmark play={play} className="text-[3.6rem] text-hi" />
        <motion.p
          key={`tag-${play}`}
          className="mt-4 text-[1.05rem] font-medium tracking-tight text-mid"
          initial={{ opacity: 0, y: reduce ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.75 }}
        >
          Roll for tonight.
        </motion.p>

        <motion.button
          className="mt-10 h-14 rounded-full bg-ember px-9 text-[1.05rem] font-semibold text-white shadow-[0_10px_40px_-8px_rgba(255,46,77,0.7)]"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring, delay: 1.0 }}
          whileTap={{ scale: 0.96 }}
          onClick={(e) => {
            e.stopPropagation();
            haptics.medium();
            checkRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
          }}
        >
          Let&apos;s roll
        </motion.button>

        <p className="absolute bottom-[calc(var(--sab)+20px)] text-xs text-lo">tap anywhere to replay · scroll for design check</p>
      </section>

      {/* M0 design check — removed once real screens exist */}
      <section ref={checkRef} className="mx-auto max-w-md px-5 pb-[calc(var(--sab)+48px)] pt-6">
        <h2 className="font-title text-[2.125rem] leading-tight">Catalogue check</h2>
        <p className="mt-1 mb-5 text-sm text-mid">M1: the real TMDB catalogue. Tap a poster.</p>
        <CatalogueCheck />

        <h2 className="mt-14 font-title text-[2.125rem] leading-tight">Design check</h2>
        <p className="mt-1 text-sm text-mid">M0 tokens, type and surfaces. Judge these on your phone.</p>

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Colour</h3>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {SWATCHES.map((s) => (
            <div key={s.name} className="overflow-hidden rounded-card border border-line">
              <div className="h-16" style={{ background: s.v }} />
              <div className="bg-bg-1 px-3 py-2 text-xs text-mid">{s.name}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 h-16 rounded-card" style={{ background: 'var(--grad-brand)' }} />

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Type</h3>
        <div className="mt-3 space-y-3 rounded-card border border-line bg-bg-1 p-5">
          <div className="font-title text-[2.6rem] leading-[0.95]">The Grand Heist</div>
          <div className="font-title text-[1.5rem] text-grad">Tonight&apos;s pick</div>
          <div className="font-title tabular text-[4.5rem] leading-none">847</div>
          <div className="-mt-1 text-sm text-mid">titles left</div>
          <p className="text-[1.0625rem] leading-relaxed text-hi">
            Inter for everything you read. Archivo, cut condensed and heavy, for titles and big numbers.
          </p>
          <p className="text-sm text-mid">2023 · 2h 14m · ★ 7.8 · Thriller</p>
        </div>

        <h3 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-lo">Surfaces & buttons</h3>
        <div className="glass mt-3 rounded-card p-5">
          <div className="text-[1.5rem] font-semibold tracking-tight">Wanna be scared?</div>
          <div className="mt-4 flex flex-col gap-3">
            {['Yes, terrify me', 'Nope', 'Either / don’t care'].map((l, i) => (
              <motion.button
                key={l}
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => haptics.light()}
                className={
                  i === 2
                    ? 'h-12 rounded-full text-[0.95rem] font-medium text-mid'
                    : 'h-14 rounded-full border border-line bg-white/[0.06] text-[1.05rem] font-semibold'
                }
              >
                {l}
              </motion.button>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-lo">reelrole · M1{BUILD ? ` · ${BUILD.slice(0, 7)}` : ''}</p>
      </section>
    </div>
  );
}
