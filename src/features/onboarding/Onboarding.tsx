import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { CheckIcon } from '@phosphor-icons/react';
import { useCatalogue } from '../../data/useCatalogue';
import { Wordmark } from '../../design/Wordmark';
import { Poster } from '../../design/Poster';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { play, unlockAudio } from '../../audio/synth';
import { usePrefs } from '../../store/prefs';
import { useTaste, SIGNAL } from '../../store/taste';
import { useLibrary } from '../../store/library';
import { onboardingPicks } from './picks';

/** First run (HANDOVER §9.1): sting → "Tap 3 you loved". Services step dropped (where-to-watch is info only). */
export function Onboarding() {
  const [step, setStep] = useState<'sting' | 'taste'>('sting');
  const reduce = useReducedMotionConfig();

  useEffect(() => {
    if (step !== 'sting') return;
    const t = setTimeout(() => setStep('taste'), reduce ? 900 : 2200);
    return () => clearTimeout(t);
  }, [step, reduce]);

  return (
    <motion.div className="fixed inset-0 z-[95] bg-bg-0" exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      <AnimatePresence mode="wait">
        {step === 'sting' ? (
          <StingStep key="sting" onSkip={() => setStep('taste')} />
        ) : (
          <TasteStep key="taste" />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StingStep({ onSkip }: { onSkip: () => void }) {
  const reduce = useReducedMotionConfig();
  return (
    <motion.button
      className="absolute inset-0 grid place-items-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.35 } }}
      onClick={() => {
        unlockAudio();
        play('reveal.sting');
        haptics.success();
        onSkip();
      }}
      aria-label="Skip intro"
    >
      {/* grain fades in, then a brand-gradient glow sweeps left→right behind the wordmark */}
      <motion.div className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {!reduce && (
          <motion.div
            className="absolute top-1/2 h-[46vh] w-[90vw] -translate-y-1/2 rounded-full"
            style={{ background: 'var(--grad-brand)', filter: 'blur(70px)', opacity: 0.38 }}
            initial={{ x: '-110%' }}
            animate={{ x: '10%' }}
            transition={{ duration: 1.6, ease: [0.12, 0.9, 0.18, 1], delay: 0.2 }}
          />
        )}
      </motion.div>
      <div className="relative">
        <Wordmark className="text-[3.6rem] text-hi" />
        <motion.p className="mt-3 text-center text-[1rem] font-medium text-mid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
          Roll for tonight.
        </motion.p>
      </div>
    </motion.button>
  );
}

function TasteStep() {
  const cat = useCatalogue();
  const picks = useMemo(() => (cat ? onboardingPicks(cat) : []), [cat]);
  const [sel, setSel] = useState<number[]>([]);
  const finish = (skip: boolean) => {
    unlockAudio();
    if (cat && !skip) {
      for (const i of sel) {
        useTaste.getState().add(cat, i, SIGNAL.onboardingPick);
        const id = cat.titles[i]!.id;
        if (useLibrary.getState().get(id).liked !== true) useLibrary.getState().toggleLike(id);
      }
      play('reveal.sting');
      haptics.success();
    }
    usePrefs.getState().set({ onboarded: true });
  };

  return (
    <motion.div className="absolute inset-0 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={spring}>
      <div className="px-5 pt-[calc(var(--sat)+28px)]">
        <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ember">Quick taste check</div>
        <h1 className="font-title mt-1.5 text-[2.5rem] leading-[0.98]">Tap 3 you loved</h1>
        <p className="mt-2 text-[15px] text-mid">So my first picks aren't random.</p>
      </div>
      <div className="no-scrollbar mt-4 flex-1 overflow-y-auto px-4 pb-40">
        <div className="grid grid-cols-3 gap-2.5">
          {cat &&
            picks.map((i, k) => {
              const on = sel.includes(i);
              return (
                <motion.button
                  key={cat.titles[i]!.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, scale: on ? 0.94 : 1 }}
                  transition={{ ...spring, delay: Math.min(k, 15) * 0.03 }}
                  whileTap={{ scale: 0.9 }}
                  className="relative rounded-poster"
                  aria-pressed={on}
                  aria-label={cat.titles[i]!.title}
                  onClick={() => {
                    haptics.light();
                    unlockAudio();
                    play(on ? 'ui.tap' : 'lib.like');
                    setSel((s) => (on ? s.filter((x) => x !== i) : [...s, i]));
                  }}
                >
                  <Poster title={cat.titles[i]!} size="w342" eager={k < 9} />
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        className="absolute inset-0 rounded-poster"
                        style={{ boxShadow: 'inset 0 0 0 3px #fff, 0 0 0 3px transparent' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <span className="absolute -inset-[3px] -z-10 rounded-[17px]" style={{ background: 'var(--grad-brand)' }} />
                        <motion.span
                          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white text-black"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                        >
                          <CheckIcon size={16} weight="bold" />
                        </motion.span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-0 via-bg-0/95 to-transparent px-5 pb-[calc(var(--sab)+20px)] pt-12">
        <motion.button
          disabled={sel.length < 3}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          className="h-[58px] w-full rounded-full bg-ember text-[18px] font-bold text-white shadow-[0_14px_44px_-10px_rgba(255,46,77,0.7)] transition-opacity disabled:opacity-40 disabled:shadow-none"
          onClick={() => finish(false)}
        >
          {sel.length < 3 ? `Pick ${3 - sel.length} more` : "Let's roll"}
        </motion.button>
        <button className="mt-2 h-10 w-full text-sm font-medium text-lo" onClick={() => finish(true)}>
          Skip for now
        </button>
      </div>
    </motion.div>
  );
}
