import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Screen } from '../../nav/Screen';
import { useCatalogue } from '../../data/useCatalogue';
import type { Catalogue } from '../../data/catalogue';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { unlockAudio, play } from '../../audio/synth';
import { useNav } from '../../store/nav';
import { PosterWall } from './PosterWall';
import { QuestionView } from './QuestionView';
import { Reveal } from './Reveal';
import { Recap } from './Recap';
import { useFind } from './session';

const TILES = [
  { id: 'movie', label: 'Movie', emoji: '🎬' },
  { id: 'series', label: 'Series', emoji: '📺' },
  { id: 'any', label: 'Surprise me', emoji: '🎲' },
] as const;

/** Find (HANDOVER §9.2–9.4): start → question loop → reveal → recap. */
export function FindScreen() {
  const cat = useCatalogue();
  return (
    <Screen tab="find" className="overflow-hidden">
      {() => (cat ? <FindInner cat={cat} /> : null)}
    </Screen>
  );
}

function FindInner({ cat }: { cat: Catalogue }) {
  const phase = useFind((s) => s.phase);
  const resetSignal = useNav((s) => s.reset.find);
  const tried = useRef(false);

  // Resume a session the app was backgrounded in (§8.9 snapshot).
  useEffect(() => {
    if (tried.current) return;
    tried.current = true;
    useFind.getState().resume(cat);
  }, [cat]);

  // Re-tapping the Find tab: confirm mid-session, otherwise start fresh.
  const first = useRef(resetSignal);
  useEffect(() => {
    if (resetSignal === first.current) return;
    const s = useFind.getState();
    if (s.phase === 'question') s.setLeaveAsk(true);
    else if (s.phase !== 'start') s.reset();
  }, [resetSignal]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={phase} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
        {phase === 'start' && <Start cat={cat} />}
        {phase === 'question' && <QuestionView cat={cat} />}
        {phase === 'reveal' && <Reveal cat={cat} />}
        {phase === 'recap' && <Recap cat={cat} />}
      </motion.div>
    </AnimatePresence>
  );
}

function Start({ cat }: { cat: Catalogue }) {
  const begin = useFind((s) => s.begin);
  return (
    <div className="relative flex h-full flex-col">
      <PosterWall cat={cat} />
      <div className="relative flex flex-1 flex-col justify-center px-5 pb-[calc(var(--sab)+96px)] pt-[calc(var(--sat)+24px)]">
        <div className="text-center">
          <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ember">Tonight</div>
          <h1 className="font-title mt-2 text-[2.9rem] leading-[0.95]">Movie or series?</h1>
          <p className="mt-3 text-[15px] text-mid">{cat.titles.length.toLocaleString()} titles. A few questions. One pick.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3">
          {TILES.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.05 + i * 0.04 }}
              whileTap={{ scale: 0.96 }}
              className={`glass flex h-28 flex-col items-center justify-center gap-2 rounded-card ${i === 2 ? 'col-span-2 h-[76px] flex-row' : ''}`}
              onClick={() => {
                unlockAudio();
                haptics.light();
                play('q.whoosh');
                begin(cat, t.id);
              }}
            >
              <span className={i === 2 ? 'text-2xl' : 'text-[2rem]'}>{t.emoji}</span>
              <span className="text-[17px] font-semibold">{t.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
