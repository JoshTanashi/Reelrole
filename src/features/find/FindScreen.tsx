import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Screen } from '../../nav/Screen';
import { useCatalogue } from '../../data/useCatalogue';
import type { Catalogue } from '../../data/catalogue';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { unlockAudio, play } from '../../audio/synth';
import { useNav } from '../../store/nav';
import { useMemo } from 'react';
import { InfoIcon, PlusIcon, CheckIcon } from '@phosphor-icons/react';
import { img } from '../../data/catalogue';
import { useLibrary } from '../../store/library';
import { useTaste, tasteSimFn } from '../../store/taste';
import { useSheet } from '../../store/sheet';
import { PosterRow } from '../library/Rows';
import { homeRows } from './homeRows';
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
    else if (s.phase !== 'start') s.reset(cat);
  }, [resetSignal, cat]);

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
  const items = useLibrary((s) => s.items);
  const vec = useTaste((s) => s.vec);
  const openTitle = useSheet((s) => s.openTitle);
  const { spotlight, rows } = useMemo(() => homeRows(cat, items, tasteSimFn(cat, vec)), [cat, items, vec]);
  const hero = spotlight !== null ? cat.titles[spotlight]! : null;
  const go = (kind: 'movie' | 'series' | 'any') => {
    unlockAudio();
    haptics.light();
    play('q.whoosh');
    begin(cat, kind);
  };

  return (
    <div className="no-scrollbar h-full overflow-y-auto pb-[calc(var(--sab)+110px)]">
      {/* Spotlight */}
      <div className="relative h-[62vh] max-h-[560px] min-h-[420px]">
        {hero?.backdrop && (
          <motion.img
            src={img(hero.backdrop, 'w1280')}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: [0.12, 0.9, 0.18, 1] }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-bg-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-[calc(var(--sat)+12px)]">
          <span className="font-wordmark text-[1.5rem] text-hi drop-shadow">reelr<span className="text-grad">o</span>le</span>
          <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-hi/85 backdrop-blur">Tonight</span>
        </div>
        {hero && (
          <div className="absolute inset-x-0 bottom-[150px] px-5">
            <div className="text-[12px] font-semibold uppercase tracking-[0.2em] text-gold">Spotlight · for you</div>
            <button className="mt-1 block text-left" onClick={() => openTitle(hero.id)}>
              <h2 className="font-title text-[2.6rem] leading-[0.95] drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]">{hero.title}</h2>
            </button>
            <p className="mt-2 text-[13px] text-hi/80">
              {[hero.year, ...hero.genres.slice(0, 2).map((g) => cat.genres[g])].filter(Boolean).join(' · ')} · <span className="font-semibold text-gold">★ {hero.rating.toFixed(1)}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} transition={spring} className="flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-bold text-black" onClick={() => { haptics.light(); openTitle(hero.id); }}>
                <InfoIcon size={17} weight="bold" /> Details
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} transition={spring} className="flex h-10 items-center gap-1.5 rounded-full bg-white/[0.18] px-4 text-[14px] font-semibold backdrop-blur" onClick={() => { haptics.light(); if (!useLibrary.getState().get(hero.id).onList) play('lib.add'); useLibrary.getState().toggleList(hero.id); }}>
                {items[hero.id]?.onList ? <CheckIcon size={17} weight="bold" /> : <PlusIcon size={17} weight="bold" />} My List
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* The game */}
      <motion.section
        className="glass relative z-10 mx-4 -mt-[132px] rounded-[28px] p-5"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
      >
        <div className="flex items-baseline justify-between">
          <h1 className="font-title text-[1.9rem] leading-none">Movie or series?</h1>
          <span className="text-[12px] text-lo">{cat.titles.length.toLocaleString()} titles</span>
        </div>
        <p className="mt-1.5 text-[14px] text-mid">A few questions. One pick you'll actually watch.</p>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {TILES.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.15 + i * 0.04 }}
              whileTap={{ scale: 0.95 }}
              className={`flex h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold ${i === 2 ? 'bg-ember text-white shadow-[0_10px_30px_-10px_rgba(255,46,77,0.8)]' : 'border border-white/10 bg-white/[0.08]'}`}
              onClick={() => go(t.id)}
            >
              <span className="text-[1.7rem]">{t.emoji}</span>
              {i === 2 ? 'Surprise me' : t.label}
            </motion.button>
          ))}
        </div>
      </motion.section>

      {rows.map((r) => (
        <PosterRow key={r.title} cat={cat} title={r.title} indices={r.items} numbered={r.numbered} />
      ))}
    </div>
  );
}
