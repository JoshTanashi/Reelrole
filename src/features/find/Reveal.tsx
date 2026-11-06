import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotionConfig } from 'motion/react';
import { CheckIcon, PlayIcon, PlusIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { img, loadDetail, type Catalogue, type TitleDetail } from '../../data/catalogue';
import { Poster } from '../../design/Poster';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { play } from '../../audio/synth';
import { useSheet } from '../../store/sheet';
import { useLibrary } from '../../store/library';
import { voiceSession } from '../../voice/reactions';
import { lengthLabel } from '../title/format';
import { useFind, acceptPick } from './session';

type Stage = 'collapse' | 'drum' | 'flip' | 'done';

/** Reveal (HANDOVER §9.4): collapse → drumroll → flip to the winner → details. ≤ 2.4s, tap to skip. */
export function Reveal({ cat }: { cat: Catalogue }) {
  const { winner, runnersUp, aliveTop, rejected, notThis, askMore, toRecap, reset } = useFind();
  const reduce = useReducedMotionConfig();
  const [stage, setStage] = useState<Stage>(reduce ? 'done' : 'collapse');
  const [line] = useState(() => voiceSession.say('reveal'));
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [shuffleK, setShuffleK] = useState(0);
  const timers = useRef<number[]>([]);
  const openTitle = useSheet((s) => s.openTitle);
  const onList = useLibrary((s) => (winner !== null ? !!s.items[winner]?.onList : false));

  const stack = useMemo(() => {
    const ids = aliveTop.filter((id) => id !== winner).slice(0, 7);
    return ids.map((id, k) => ({ id, x: (Math.sin(k * 12.9) * 0.5) * 300, y: (Math.cos(k * 7.3) * 0.5) * 420 - 80, r: Math.sin(k * 3.1) * 14 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduce) {
      play('reveal.sting');
      haptics.success();
      return;
    }
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    at(560, () => {
      setStage('drum');
      play('reveal.drum');
      for (let k = 0; k < 7; k++) at(k * 95, () => haptics.selection());
    });
    at(1260, () => {
      setStage('flip');
      play('reveal.sting');
      haptics.success();
    });
    at(1900, () => setStage('done'));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let live = true;
    setDetail(null);
    if (winner !== null) loadDetail(winner).then((d) => live && setDetail(d));
    return () => {
      live = false;
    };
  }, [winner]);

  const skip = () => {
    if (stage === 'done' || stage === 'flip') return;
    timers.current.forEach(clearTimeout);
    play('reveal.sting');
    haptics.success();
    setStage('done');
  };

  if (winner === null) return null;
  const wi = cat.indexById.get(winner);
  if (wi === undefined) return null;
  const t = cat.titles[wi]!;
  const streams = (t.providers.flatrate ?? []).map((id) => cat.providerById.get(id)).filter((p) => !!p).slice(0, 3);
  const showInfo = stage === 'done';

  return (
    <div className="relative h-full overflow-hidden" onClick={skip}>
      {/* Dim + blurred backdrop of the winner */}
      <motion.div className="absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 0.88 }} transition={{ duration: 0.4 }} />
      <AnimatePresence>
        {(stage === 'flip' || stage === 'done') && t.backdrop && (
          <motion.img
            key={`bd-${winner}`}
            src={img(t.backdrop, 'w780')}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover"
            style={{ filter: 'blur(28px) saturate(140%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-0/40 to-bg-0" />

      <div className="no-scrollbar relative h-full overflow-y-auto pb-[calc(var(--sab)+110px)] pt-[calc(var(--sat)+28px)]">
        {/* Poster stage */}
        <div className="relative mx-auto flex h-[min(58vh,430px)] items-center justify-center" style={{ perspective: 1200 }}>
          {stage !== 'done' &&
            stack.map((s, k) => {
              const i = cat.indexById.get(s.id);
              if (i === undefined) return null;
              return (
                <motion.div
                  key={s.id}
                  className="absolute w-[46vw] max-w-[220px]"
                  initial={{ x: s.x, y: s.y, rotate: s.r, opacity: 0.7, scale: 0.7 }}
                  animate={
                    stage === 'collapse'
                      ? { x: 0, y: 0, rotate: s.r * 0.25, opacity: 1, scale: 0.92 }
                      : stage === 'drum'
                        ? { x: [0, -3, 3, -2, 2, 0], y: 0, rotate: s.r * 0.25, scale: 0.92 }
                        : { opacity: 0, scale: 0.85 }
                  }
                  transition={stage === 'drum' ? { duration: 0.6, repeat: 0 } : { ...spring, delay: k * 0.03 }}
                >
                  <Poster title={cat.titles[i]!} size="w342" eager />
                </motion.div>
              );
            })}
          <AnimatePresence mode="popLayout">
            {(stage === 'flip' || stage === 'done') && (
              <motion.button
                key={`${winner}-${shuffleK}`}
                className="relative w-[58vw] max-w-[270px] rounded-poster"
                style={{ boxShadow: '0 0 0 2px rgba(255,200,87,0.7), 0 0 70px 6px rgba(255,200,87,0.35), 0 30px 60px -20px rgba(0,0,0,0.9)' }}
                initial={reduce ? { opacity: 0 } : { rotateY: -180, scale: 0.85, opacity: 0.6 }}
                animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { rotateY: 90, opacity: 0, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                onClick={(e) => {
                  e.stopPropagation();
                  haptics.light();
                  openTitle(winner);
                }}
                aria-label={`${t.title}: details`}
              >
                <Poster title={t} size="w500" eager />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Info */}
        <AnimatePresence>
          {showInfo && (
            <motion.div className="relative px-5" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring} onClick={(e) => e.stopPropagation()}>
              <div className="mt-5 text-center">
                <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-gold">{line}</div>
                <h2 className="font-title mt-1.5 text-[2.3rem] leading-[1]">{t.title}</h2>
                <p className="mt-2 text-sm text-mid">
                  {[t.year, lengthLabel(t)].filter(Boolean).join(' · ')} · <span className="font-semibold text-gold">★ {t.rating.toFixed(1)}</span>
                </p>
                <div className="mt-2.5 flex justify-center gap-1.5">
                  {t.genres.slice(0, 3).map((g) => (
                    <span key={g} className="rounded-full border border-line px-2.5 py-1 text-xs text-mid">{cat.genres[g]}</span>
                  ))}
                </div>
                {streams.length > 0 && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-[13px] text-mid">
                    {streams.map((p) => (
                      <img key={p.id} src={img(p.logo, 'w92')} alt={p.name} className="h-6 w-6 rounded-md" />
                    ))}
                    <span>Stream on {streams[0]!.name}</span>
                  </div>
                )}
              </div>

              {/* CTAs */}
              <div className="mt-5 flex gap-2.5">
                {detail?.watchLink && streams.length > 0 && (
                  <a
                    href={detail.watchLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-[54px] flex-1 items-center justify-center gap-2 rounded-full bg-ember text-[16px] font-bold text-white"
                    onClick={() => {
                      haptics.medium();
                      acceptPick(cat, t.id);
                    }}
                  >
                    <PlayIcon size={18} weight="fill" /> Watch now
                  </a>
                )}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  className={`flex h-[54px] flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-bold ${streams.length && detail?.watchLink ? 'border border-white/15 bg-white/[0.08]' : 'bg-ember text-white'}`}
                  onClick={() => {
                    haptics.light();
                    if (!onList) acceptPick(cat, t.id);
                    else useLibrary.getState().toggleList(t.id);
                  }}
                >
                  {onList ? <CheckIcon size={18} weight="bold" /> : <PlusIcon size={18} weight="bold" />}
                  {onList ? 'On my list' : 'Add to list'}
                </motion.button>
              </div>
              {rejected.length >= 3 ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={spring}
                  className="glass mt-2.5 flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
                  onClick={() => {
                    haptics.medium();
                    askMore(cat);
                  }}
                >
                  Ask me 3 more?
                </motion.button>
              ) : null}
              <button
                className="mt-1.5 flex h-12 w-full items-center justify-center gap-2 text-[15px] font-semibold text-mid"
                onClick={() => {
                  haptics.light();
                  play('q.whoosh');
                  notThis(cat);
                  setShuffleK((k) => k + 1);
                }}
              >
                <ArrowsClockwiseIcon size={17} weight="bold" /> Not this one
              </button>

              {/* Runners-up */}
              {runnersUp.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-lo">Also in the running</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {runnersUp.map((id) => {
                      const i = cat.indexById.get(id);
                      if (i === undefined) return null;
                      const r = cat.titles[i]!;
                      return (
                        <motion.button key={id} whileTap={{ scale: 0.96 }} transition={spring} className="flex gap-2.5 rounded-2xl border border-line bg-white/[0.04] p-2 text-left" onClick={() => openTitle(id)}>
                          <Poster title={r} size="w185" className="w-[52px] shrink-0 !rounded-[8px]" />
                          <div className="min-w-0 py-0.5">
                            <div className="line-clamp-2 text-[13px] font-semibold leading-tight">{r.title}</div>
                            <div className="mt-1 text-[11.5px] text-lo">
                              {r.year} · ★ {r.rating.toFixed(1)}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <button className="h-12 rounded-full border border-line text-[14px] font-semibold text-mid" onClick={toRecap}>
                  How I got here
                </button>
                <button
                  className="h-12 rounded-full border border-line text-[14px] font-semibold text-mid"
                  onClick={() => {
                    haptics.light();
                    reset();
                  }}
                >
                  New round
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
