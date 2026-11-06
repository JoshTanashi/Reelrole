import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Screen } from '../../nav/Screen';
import { useCatalogue } from '../../data/useCatalogue';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { voiceSession } from '../../voice/reactions';
import { PosterWall } from './PosterWall';

const TILES = [
  { id: 'movie', label: 'Movie', emoji: '🎬', tag: 'kindMovie' },
  { id: 'series', label: 'Series', emoji: '📺', tag: 'kindSeries' },
  { id: 'any', label: 'Surprise me', emoji: '🎲', tag: 'surprise' },
] as const;

/** Find start (HANDOVER §9.2). The question loop arrives in M7. */
export function FindScreen() {
  const cat = useCatalogue();
  const [line, setLine] = useState<{ text: string; k: number } | null>(null);

  return (
    <Screen tab="find" className="overflow-hidden">
      {() => (
        <div className="relative flex min-h-full flex-col">
          {cat && <PosterWall cat={cat} />}
          <div className="relative flex flex-1 flex-col justify-center px-5 pb-[calc(var(--sab)+96px)] pt-[calc(var(--sat)+24px)]">
            <div className="text-center">
              <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ember">Tonight</div>
              <h1 className="font-title mt-2 text-[2.9rem] leading-[0.95]">Movie or series?</h1>
              <p className="mt-3 text-[15px] text-mid">
                {cat ? `${cat.titles.length.toLocaleString()} titles. Let's find yours.` : ' '}
              </p>
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
                    haptics.light();
                    setLine({ text: voiceSession.say(t.tag), k: Date.now() });
                  }}
                >
                  <span className={i === 2 ? 'text-2xl' : 'text-[2rem]'}>{t.emoji}</span>
                  <span className="text-[17px] font-semibold">{t.label}</span>
                </motion.button>
              ))}
            </div>

            <div className="mt-6 h-14 text-center">
              <AnimatePresence mode="wait">
                {line && (
                  <motion.div key={line.k} initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={spring}>
                    <span className="inline-block rounded-full bg-white/[0.08] px-4 py-2 text-[15px] font-medium">{line.text}</span>
                    <div className="mt-2 text-xs text-lo">The questions arrive in M7</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
