import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Screen } from '../../nav/Screen';
import { useCatalogue } from '../../data/useCatalogue';
import { Poster } from '../../design/Poster';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { useSheet } from '../../store/sheet';

/** Roll preview: reel window + button (HANDOVER §9.6). The real spinning reel, lever and shake arrive in M4. */
export function RollScreen() {
  const cat = useCatalogue();
  const open = useSheet((s) => s.openTitle);
  const [pick, setPick] = useState<number | null>(null);

  const roll = () => {
    if (!cat) return;
    haptics.heavy();
    // Light weighting so it's random but rarely awful: popularity^0.3.
    const w = cat.titles.map((t) => Math.pow(Math.max(1, t.popularity), 0.3));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    let i = 0;
    while ((r -= w[i]!) > 0) i++;
    setPick(i);
  };
  const t = cat && pick !== null ? cat.titles[pick]! : null;

  return (
    <Screen tab="roll" className="overflow-hidden">
      {() => (
        <div className="flex h-full flex-col items-center px-5 pb-[calc(var(--sab)+100px)] pt-[calc(var(--sat)+12px)]">
          <div className="flex w-full items-baseline justify-between">
            <h1 className="font-title text-[2.125rem]">Roll</h1>
            <span className="text-xs text-lo">reel + lever arrive in M4</span>
          </div>

          <div className="relative mt-4 flex w-full flex-1 items-center justify-center">
            <div className="relative aspect-[2/3] h-full max-h-[60vh] rounded-[26px] p-[3px]" style={{ background: 'var(--grad-brand)' }}>
              <div className="relative h-full w-full overflow-hidden rounded-[23px] bg-bg-1">
                <AnimatePresence mode="popLayout">
                  {t ? (
                    <motion.button
                      key={t.id}
                      className="absolute inset-0"
                      initial={{ y: '-100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={spring}
                      onClick={() => open(t.id)}
                      aria-label={t.title}
                    >
                      <Poster title={t} size="w500" eager className="!aspect-auto h-full w-full !rounded-none" />
                    </motion.button>
                  ) : (
                    <motion.div key="empty" exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center text-center">
                      <div className="font-title text-[5rem] text-white/10">?</div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0 rounded-[23px]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.35) 100%)' }} />
              </div>
            </div>
          </div>

          <div className="mt-4 h-6 text-center text-[15px] font-semibold">{t ? t.title : ' '}</div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            transition={spring}
            onClick={roll}
            className="mt-4 h-16 w-full max-w-xs rounded-full bg-ember text-[1.25rem] font-bold tracking-wide text-white shadow-[0_14px_44px_-10px_rgba(255,46,77,0.75)]"
          >
            ROLL
          </motion.button>
        </div>
      )}
    </Screen>
  );
}
