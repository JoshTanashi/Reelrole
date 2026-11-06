import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { XIcon } from '@phosphor-icons/react';
import type { Catalogue } from '../../data/catalogue';
import type { Answer, Option } from '../../engine/types';
import { Odometer } from '../../design/Odometer';
import { MOODS, useMood } from '../../design/moods';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { play, unlockAudio } from '../../audio/synth';
import { useFind } from './session';
import { AliveWall } from './AliveWall';
import { Pills } from './kinds/Pills';
import { Slider } from './kinds/Slider';
import { Mood } from './kinds/Mood';
import { Chips } from './kinds/Chips';
import { Duel } from './kinds/Duel';
import { Probe } from './kinds/Probe';

/** The main game screen (HANDOVER §9.3). */
export function QuestionView({ cat }: { cat: Catalogue }) {
  const { question: q, aliveCount, aliveTop, steps, reaction, lastResult, submit, showMe, reset, leaveAsk: confirmLeave, setLeaveAsk: setConfirmLeave } = useFind();
  const mood = useMood((s) => s.mood);
  const [locked, setLocked] = useState(false);
  const [burst, setBurst] = useState(0);
  const lastK = useRef(0);

  // React to each answer: drop sounds/haptics, particles on big drops, reaction pop.
  useEffect(() => {
    if (!lastResult || lastResult.k === lastK.current) return;
    lastK.current = lastResult.k;
    const drop = lastResult.aliveBefore ? 1 - lastResult.aliveAfter / lastResult.aliveBefore : 0;
    if (drop > 0.3) {
      play('count.drop');
      haptics.medium();
      setBurst((b) => b + 1);
    } else if (drop > 0) play('count.tick');
    setTimeout(() => play('q.pop'), 120);
  }, [lastResult]);

  if (!q) return null;
  const asked = steps.length;

  const answer = (ans: Answer, label: string) => {
    if (locked) return;
    unlockAudio();
    haptics.light();
    play('q.whoosh');
    setLocked(true);
    setTimeout(() => setLocked(false), 300);
    submit(cat, ans, label);
  };
  const pick = (o: Option) => answer(o.id, o.label);

  return (
    <div className="relative flex h-full flex-col">
      <AliveWall cat={cat} ids={aliveTop} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[calc(var(--sat)+10px)]">
        <button aria-label="Leave session" className="glass grid h-10 w-10 place-items-center rounded-full" onClick={() => setConfirmLeave(true)}>
          <XIcon size={18} weight="bold" />
        </button>
        <div className="flex items-center gap-1.5" aria-label={`${asked} questions answered`}>
          {Array.from({ length: Math.min(14, Math.max(asked + 1, 8)) }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < asked ? 'w-1.5 bg-white/70' : i === asked ? 'w-4 bg-white' : 'w-1.5 bg-white/20'}`} />
          ))}
        </div>
        <AnimatePresence>
          {asked >= 3 ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={spring}
              whileTap={{ scale: 0.94 }}
              className="glass h-10 rounded-full px-3.5 text-[13px] font-semibold"
              onClick={() => {
                haptics.medium();
                showMe(cat);
              }}
            >
              Just show me!
            </motion.button>
          ) : (
            <span className="w-10" />
          )}
        </AnimatePresence>
      </div>

      {/* Counter + reaction */}
      <div className="relative z-10 mt-[8vh] flex flex-col items-center" aria-live="polite">
        <div className="relative">
          <Odometer value={aliveCount} className="font-title text-[5.2rem] text-hi drop-shadow-[0_6px_30px_rgba(0,0,0,0.8)]" />
          {burst > 0 && <Burst key={burst} color={MOODS[mood][0]} />}
        </div>
        <span className="sr-only">{aliveCount} titles left</span>
        <div className="-mt-1 text-[13px] font-semibold uppercase tracking-[0.2em] text-mid">titles left</div>
        <div className="mt-4 h-10">
          <AnimatePresence mode="wait">
            {reaction && (
              <motion.div
                key={reaction.k}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: [0, 1, 1, 0], y: [8, 0, 0, -4], scale: [0.9, 1, 1, 1] }}
                transition={{ duration: 1.5, times: [0, 0.12, 0.72, 1] }}
                className="rounded-full bg-white/[0.12] px-4 py-2 text-[15px] font-semibold backdrop-blur"
              >
                {reaction.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Question card */}
      <div className="relative z-10 mt-auto px-3 pb-[calc(var(--sab)+92px)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={q.id}
            className="glass rounded-[28px] p-5"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <h2 className="font-title text-[1.85rem] leading-[1.05]">{q.prompt}</h2>
            {q.subprompt && <p className="mt-1 text-sm text-mid">{q.subprompt}</p>}
            <div className="mt-4">
              {q.kind === 'slider' && q.slider ? (
                <Slider
                  left={q.slider.left}
                  right={q.slider.right}
                  disabled={locked}
                  onDone={(v) => answer({ slider: v }, v <= 0.125 ? q.slider!.left : v >= 0.875 ? q.slider!.right : v === 0.5 ? 'Middle' : v < 0.5 ? `Leaning ${q.slider!.left}` : `Leaning ${q.slider!.right}`)}
                />
              ) : q.kind === 'mood' ? (
                <Mood options={q.options} onPick={pick} disabled={locked} />
              ) : q.kind === 'chips' ? (
                <Chips options={q.options} disabled={locked} onDone={(ids, label) => answer({ chips: ids }, label)} />
              ) : q.kind === 'duel' ? (
                <Duel cat={cat} options={q.options} onPick={pick} disabled={locked} />
              ) : q.kind === 'probe' ? (
                <Probe cat={cat} options={q.options} onPick={pick} disabled={locked} />
              ) : (
                <Pills options={q.options} onPick={pick} disabled={locked} />
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>

      {/* Leave confirm */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div className="absolute inset-0 z-30 grid place-items-center bg-black/60 px-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmLeave(false)}>
            <motion.div className="glass w-full rounded-card p-5 text-center" initial={{ scale: 0.92 }} animate={{ scale: 1 }} transition={spring} onClick={(e) => e.stopPropagation()}>
              <div className="font-title text-[1.5rem]">Start over?</div>
              <p className="mt-1 text-sm text-mid">You'll lose this round's answers.</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button className="h-12 rounded-full border border-line font-semibold" onClick={() => setConfirmLeave(false)}>
                  Keep going
                </button>
                <button
                  className="h-12 rounded-full bg-ember font-semibold text-white"
                  onClick={() => {
                    haptics.medium();
                    setConfirmLeave(false);
                    reset(cat);
                  }}
                >
                  Start over
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Burst({ color }: { color: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const d = 70 + (i % 3) * 22;
        return (
          <motion.span
            key={i}
            className="absolute h-2 w-2 rounded-full"
            style={{ background: i % 3 ? color : '#fff', left: -4, top: -4 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.65, ease: [0.12, 0.9, 0.18, 1] }}
          />
        );
      })}
    </span>
  );
}
