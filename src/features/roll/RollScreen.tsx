import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { PlusIcon, CheckIcon, InfoIcon } from '@phosphor-icons/react';
import { Screen } from '../../nav/Screen';
import { useCatalogue } from '../../data/useCatalogue';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { play, unlockAudio } from '../../audio/synth';
import { useSheet } from '../../store/sheet';
import { useLibrary } from '../../store/library';
import { useNav } from '../../store/nav';
import { useMood, moodForGenres } from '../../design/moods';
import { voiceSession } from '../../voice/reactions';
import { lengthLabel } from '../title/format';
import { Reel, type ReelHandle } from './Reel';
import { Lever } from './Lever';
import { Confetti } from './Confetti';
import { RollFilters } from './Filters';
import { useShake } from './useShake';
import { useRoll } from './store';
import { rollPool, weightedPick } from './pool';
import { useTaste, tasteSimFn } from '../../store/taste';

function useViewportHeight() {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 844 : window.innerHeight));
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

/** Roll (HANDOVER §9.6): slot reel, lever / button / shake, land with glow + confetti. */
export function RollScreen() {
  const cat = useCatalogue();
  const reduce = !!useReducedMotionConfig();
  const active = useNav((s) => s.tab === 'roll');
  const openTitle = useSheet((s) => s.openTitle);
  const items = useLibrary((s) => s.items);
  const toggleList = useLibrary((s) => s.toggleList);
  const { filters, recent, pushRecent } = useRoll();
  const setMood = useMood((s) => s.setMood);
  const reel = useRef<ReelHandle>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [landedKey, setLandedKey] = useState(0);
  const [count, setCount] = useState(0);
  const [line, setLine] = useState('');
  const [empty, setEmpty] = useState(false);

  const vh = useViewportHeight();
  const winH = Math.max(250, Math.min(440, vh - 400));
  const itemH = Math.round(winH * 0.76);
  const itemW = Math.round((itemH * 2) / 3);

  const pool = useMemo(() => (cat ? rollPool(cat, filters, items, recent) : []), [cat, filters, items, recent]);

  const roll = async () => {
    if (!cat || spinning || !reel.current) return;
    unlockAudio();
    const sim = tasteSimFn(cat, useTaste.getState().vec);
    const boost = sim ? (i: number) => 1 + 0.6 * Math.max(0, sim(i)) : undefined;
    const winner = weightedPick(cat, pool, Math.random, boost);
    if (winner === null) {
      setEmpty(true);
      haptics.light();
      return;
    }
    setEmpty(false);
    const others = pool.filter((i) => i !== winner);
    const fake = !reduce && others.length > 3 && Math.random() < 0.3 ? weightedPick(cat, others) : null;
    const src = pool.length > 30 ? pool : cat.titles.map((_, i) => i);
    const fillers = Array.from({ length: 24 }, () => src[Math.floor(Math.random() * src.length)]!);

    setSpinning(true);
    setResult(null);
    const n = count + 1;
    setCount(n);
    await reel.current.spin(winner, fillers, fake, reduce);

    play('reel.stop');
    haptics.heavy();
    setTimeout(() => {
      play('roll.confetti');
      haptics.success();
    }, 90);
    const t = cat.titles[winner]!;
    pushRecent(t.id);
    setResult(winner);
    setLandedKey((k) => k + 1);
    setMood(moodForGenres(t.genres.map((g) => cat.genres[g]!)), 0.6);
    setLine(
      n >= 3
        ? n === 4
          ? voiceSession.say('reroll', 'rollLand', (l) => l.includes('4 times'))
          : voiceSession.say('reroll', 'rollLand', (l) => !/\d/.test(l))
        : voiceSession.say('rollLand'),
    );
    setSpinning(false);
  };

  const { perm, request } = useShake(() => void roll(), active && !spinning);
  const t = cat && result !== null ? cat.titles[result]! : null;
  const onList = t ? !!items[t.id]?.onList : false;

  return (
    <Screen tab="roll" className="overflow-hidden">
      {() => (
        <div className="flex h-full flex-col px-5 pb-[calc(var(--sab)+96px)] pt-[calc(var(--sat)+12px)]">
          <div className="flex items-center justify-between">
            <h1 className="font-title text-[2.125rem] leading-none">Roll</h1>
            {perm === 'needs-permission' ? (
              <button className="rounded-full border border-line bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-mid" onClick={() => void request()}>
                Enable shake 📳
              </button>
            ) : perm === 'granted' ? (
              <span className="text-xs text-lo">or shake your phone</span>
            ) : null}
          </div>
          {cat && <RollFilters cat={cat} poolSize={pool.length} />}

          {/* Reel + lever */}
          <div className="relative mt-2 flex flex-1 items-center justify-center gap-3">
            <motion.div
              className="relative rounded-[30px] p-[3px]"
              style={{ background: 'var(--grad-brand)' }}
              animate={t && !reduce ? { scale: [1, 1.035, 1], boxShadow: `0 0 60px -6px ${t.color}` } : { scale: 1, boxShadow: '0 0 0px 0px rgba(0,0,0,0)' }}
              transition={{ duration: 0.45, ease: [0.12, 0.9, 0.18, 1] }}
            >
              <div className="relative overflow-hidden rounded-[27px] bg-[#0a080e]">
                {cat && <Reel ref={reel} cat={cat} itemW={itemW} itemH={itemH} winH={winH} initial={null} landed={!!t} />}
                {/* centre pointers + glass reflection */}
                <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[27px]" style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 32%)' }} />
                <div aria-hidden className="pointer-events-none absolute left-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-l-[10px] border-y-transparent border-l-white/70" />
                <div aria-hidden className="pointer-events-none absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[8px] border-r-[10px] border-y-transparent border-r-white/70" />
              </div>
              {t && !reduce && <Confetti key={landedKey} color={t.color} seed={landedKey} />}
            </motion.div>
            <Lever onPull={() => void roll()} disabled={spinning} height={winH} />
          </div>

          {/* Result */}
          <div className="mt-3 h-[52px] text-center">
            <AnimatePresence mode="wait">
              {empty ? (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-3 text-sm text-mid">
                  Nothing in the reel. Loosen the filters?
                </motion.p>
              ) : t ? (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
                  <div className="truncate text-[17px] font-bold">{t.title}</div>
                  <div className="mt-0.5 text-[13px] text-mid">
                    {[t.year, lengthLabel(t)].filter(Boolean).join(' · ')} · <span className="font-semibold text-gold">★ {t.rating.toFixed(1)}</span>
                    <span className="text-lo"> · {line}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.p key="hint" exit={{ opacity: 0 }} className="pt-3 text-sm text-lo">
                  {spinning ? ' ' : 'Pull the lever or hit roll'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <AnimatePresence initial={false}>
              {t && (
                <motion.button
                  key="list"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={spring}
                  whileTap={{ scale: 0.9 }}
                  aria-label={onList ? 'On my list' : 'Add to my list'}
                  className={`grid h-14 w-14 place-items-center rounded-full border ${onList ? 'border-white/20 bg-white/[0.14]' : 'border-line bg-white/[0.05]'}`}
                  onClick={() => {
                    haptics.light();
                    toggleList(t.id);
                  }}
                >
                  {onList ? <CheckIcon size={22} weight="bold" /> : <PlusIcon size={22} weight="bold" />}
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              layout
              whileTap={{ scale: 0.95 }}
              transition={spring}
              disabled={spinning}
              onClick={() => {
                haptics.medium();
                void roll();
              }}
              className="h-14 flex-1 max-w-[220px] rounded-full bg-ember text-[1.15rem] font-bold tracking-wide text-white shadow-[0_14px_44px_-10px_rgba(255,46,77,0.75)] disabled:opacity-60"
            >
              {spinning ? 'Rolling…' : count ? 'Roll again' : 'ROLL'}
            </motion.button>
            <AnimatePresence initial={false}>
              {t && (
                <motion.button
                  key="info"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={spring}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Details"
                  className="grid h-14 w-14 place-items-center rounded-full border border-line bg-white/[0.05]"
                  onClick={() => {
                    haptics.light();
                    openTitle(t.id);
                  }}
                >
                  <InfoIcon size={24} weight="bold" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </Screen>
  );
}
