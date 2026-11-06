import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { ArrowCounterClockwiseIcon, EyeIcon, HeartIcon, SlidersHorizontalIcon, XIcon } from '@phosphor-icons/react';
import { Screen } from '../../nav/Screen';
import { useCatalogue } from '../../data/useCatalogue';
import type { Catalogue } from '../../data/catalogue';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { play, unlockAudio } from '../../audio/synth';
import { useSheet } from '../../store/sheet';
import { useNav } from '../../store/nav';
import { useLibrary, type UserTitle } from '../../store/library';
import { useTaste, tasteSimFn, SIGNAL } from '../../store/taste';
import { useMood, moodForGenres } from '../../design/moods';
import { voiceSession } from '../../voice/reactions';
import { SwipeCard, CardFace, type SwipeCardHandle } from './SwipeCard';
import { SwipeFilterSheet } from './SwipeFilters';
import { buildFeed } from './feed';
import { useSwipe, type Dir } from './store';

interface UndoEntry {
  index: number;
  dir: Dir;
  prev: UserTitle | undefined;
  taste: number; // weight applied (reversed on undo)
}

const FLY_MS = 260;

/** Swipe (HANDOVER §9.5). */
export function SwipeScreen() {
  const cat = useCatalogue();
  return (
    <Screen tab="swipe" className="overflow-hidden">
      {() => (cat ? <SwipeInner cat={cat} /> : null)}
    </Screen>
  );
}

function SwipeInner({ cat }: { cat: Catalogue }) {
  const active = useNav((s) => s.tab === 'swipe');
  const openTitle = useSheet((s) => s.openTitle);
  const setMood = useMood((s) => s.setMood);
  const { filters, record, unrecord } = useSwipe();
  const [queue, setQueue] = useState<number[]>([]);
  const [undo, setUndo] = useState<UndoEntry[]>([]);
  const [enter, setEnter] = useState<{ index: number; dir: Dir; nonce: number } | null>(null);
  const [seen, setSeen] = useState<number | null>(null);
  const [milestone, setMilestone] = useState(false);
  const [line, setLine] = useState<{ text: string; k: number } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const busy = useRef(false);
  const topRef = useRef<SwipeCardHandle>(null);
  const progress = useMotionValue(0);
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 358, h: 560 });

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rebuild = useCallback(
    (keep: number[] = []) => {
      const lib = useLibrary.getState().items;
      const swiped = new Set(useSwipe.getState().swiped);
      const keepSet = new Set(keep);
      const sim = tasteSimFn(cat, useTaste.getState().vec);
      const fresh = buildFeed(cat, {
        n: 30,
        filters: useSwipe.getState().filters,
        sim,
        exclude: (i) => {
          const id = cat.titles[i]!.id;
          const u = lib[id];
          return keepSet.has(i) || swiped.has(id) || !!(u && (u.onList || u.watched || u.notForMe || u.liked !== null));
        },
      });
      setQueue([...keep, ...fresh]);
    },
    [cat],
  );

  // (Re)build on mount and whenever filters change.
  useEffect(() => rebuild(), [rebuild, filters]);

  // Background follows the top card's genre while Swipe is on screen.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const top = queue[0];
  useEffect(() => {
    if (!active || top === undefined) return;
    setMood(moodForGenres(cat.titles[top]!.genres.map((g) => cat.genres[g]!)), 0.45);
  }, [active, top, cat, setMood]);

  const say = (tag: string, chance: number) => {
    if (Math.random() < chance) setLine({ text: voiceSession.say(tag), k: Date.now() });
  };

  const commit = (dir: Dir) => {
    if (busy.current || top === undefined) return;
    busy.current = true;
    unlockAudio();
    const t = cat.titles[top]!;
    const L = useLibrary.getState();
    const prev = L.items[t.id];
    let w = 0;
    if (dir === 'right') {
      if (!L.get(t.id).onList) L.toggleList(t.id);
      w = SIGNAL.swipeRight;
      play('swipe.right');
      say('swipeRight', 0.35);
    } else if (dir === 'left') {
      w = SIGNAL.swipeLeft;
      play('swipe.left');
      say('swipeLeft', 0.15);
    } else {
      L.setWatched(t.id, true);
      play('swipe.up');
      setSeen(top);
    }
    if (w) useTaste.getState().add(cat, top, w);
    haptics.light();
    record(t.id, dir);
    setUndo((u) => [...u, { index: top, dir, prev, taste: w }].slice(-5));
    setEnter(null);

    setTimeout(() => {
      const n = useSwipe.getState().count;
      const rest = queueRef.current.slice(1);
      // Refresh with the updated taste every 10 swipes (keeping the visible cards), or when running low.
      if (n % 10 === 0) rebuild(rest.slice(0, 3));
      else if (rest.length < 6) rebuild(rest);
      else setQueue(rest);
      if (n > 0 && n % 25 === 0) {
        setMilestone(true);
        haptics.success();
      }
      progress.set(0);
      busy.current = false;
    }, FLY_MS);
  };

  const rateSeen = (kind: 'loved' | 'fine' | 'hated') => {
    if (seen === null) return;
    const id = cat.titles[seen]!.id;
    const L = useLibrary.getState();
    const rating = kind === 'loved' ? 5 : kind === 'fine' ? 3 : 1;
    L.setWatched(id, true, rating);
    if (kind === 'loved' && L.get(id).liked !== true) L.toggleLike(id);
    if (kind === 'hated') useLibrary.setState((s) => ({ items: { ...s.items, [id]: { ...s.items[id]!, liked: false } } }));
    const w = kind === 'loved' ? SIGNAL.seenLoved : kind === 'fine' ? SIGNAL.seenFine : SIGNAL.seenHated;
    useTaste.getState().add(cat, seen, w);
    setUndo((u) => u.map((e, i) => (i === u.length - 1 && e.index === seen ? { ...e, taste: e.taste + w } : e)));
    haptics.selection();
    setSeen(null);
  };

  useEffect(() => {
    if (seen === null) return;
    const t = setTimeout(() => setSeen(null), 6000);
    return () => clearTimeout(t);
  }, [seen]);

  const doUndo = () => {
    const last = undo[undo.length - 1];
    if (!last || busy.current) return;
    const id = cat.titles[last.index]!.id;
    useLibrary.getState().restore(id, last.prev);
    if (last.taste) useTaste.getState().add(cat, last.index, -last.taste);
    unrecord(id);
    setUndo((u) => u.slice(0, -1));
    setSeen(null);
    setMilestone(false);
    setEnter({ index: last.index, dir: last.dir, nonce: Date.now() });
    setQueue((q) => [last.index, ...q.filter((i) => i !== last.index)]);
    haptics.light();
  };

  const pickFromRightSwipes = () => {
    const lib = useLibrary.getState().items;
    const sim = tasteSimFn(cat, useTaste.getState().vec);
    const mine = cat.titles.map((_, i) => i).filter((i) => lib[cat.titles[i]!.id]?.onList);
    if (!mine.length) return;
    const best = sim ? mine.sort((a, b) => sim(b) - sim(a))[0]! : mine[Math.floor(Math.random() * mine.length)]!;
    setMilestone(false);
    setLine({ text: voiceSession.say('reveal'), k: Date.now() });
    openTitle(cat.titles[best]!.id);
  };

  const behind = queue.slice(1, 3);
  const nothing = queue.length === 0;

  return (
    <div className="flex h-full flex-col px-4 pb-[calc(var(--sab)+92px)] pt-[calc(var(--sat)+12px)]">
      <div className="flex items-center justify-between px-1">
        <h1 className="font-title text-[2.125rem] leading-none">Swipe</h1>
        <button
          aria-label="Filters"
          className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white/[0.05] text-mid"
          onClick={() => {
            haptics.light();
            setFiltersOpen(true);
          }}
        >
          <SlidersHorizontalIcon size={20} weight="bold" />
        </button>
      </div>
      <div className="mt-1 h-5 px-1">
        <AnimatePresence mode="wait">
          {line && (
            <motion.span key={line.k} className="text-[13px] font-medium text-mid" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
              {line.text}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div ref={area} className="relative mt-2 flex-1">
        {nothing && !milestone && (
          <div className="absolute inset-0 grid place-items-center rounded-[24px] border border-dashed border-white/10 px-10 text-center text-[15px] text-mid">
            You've seen everything that matches. Loosen the filters?
          </div>
        )}
        {[...behind].reverse().map((i, r) => (
          <BehindCard key={cat.titles[i]!.id} cat={cat} index={i} depth={behind.length - r} progress={progress} />
        ))}
        {top !== undefined && !milestone && (
          <SwipeCard
            key={`${cat.titles[top]!.id}-${enter?.index === top ? enter.nonce : 0}`}
            ref={topRef}
            cat={cat}
            index={top}
            width={size.w}
            height={size.h}
            progress={progress}
            onCommit={commit}
            onTap={() => {
              haptics.light();
              openTitle(cat.titles[top]!.id);
            }}
            enterFrom={enter?.index === top ? enter.dir : undefined}
          />
        )}
        <AnimatePresence>
          {milestone && (
            <motion.div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-[24px] px-8 text-center"
              style={{ background: 'var(--grad-brand)' }}
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={spring}
            >
              <div className="absolute inset-0 bg-black/25" />
              <div className="relative">
                <div className="font-title text-[3.4rem] leading-none">{useSwipe.getState().count}</div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-white/80">swipes</div>
                <p className="font-title mt-5 text-[1.7rem] leading-tight">You've got taste.</p>
                <p className="mt-2 text-[15px] text-white/85">Want me to pick from your right-swipes?</p>
                <div className="mt-7 flex flex-col gap-3">
                  <motion.button whileTap={{ scale: 0.96 }} transition={spring} className="h-13 rounded-full bg-white py-3.5 text-[16px] font-bold text-black" onClick={pickFromRightSwipes}>
                    Pick for me
                  </motion.button>
                  <button className="py-2 text-[15px] font-semibold text-white/85" onClick={() => setMilestone(false)}>
                    Keep swiping
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Seen-it follow-up */}
        <AnimatePresence>
          {seen !== null && (
            <motion.div
              className="glass absolute inset-x-3 bottom-3 z-30 rounded-card p-3.5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={spring}
            >
              <div className="mb-2.5 truncate text-center text-sm font-semibold">How was {cat.titles[seen]!.title}?</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['loved', 'Loved it', '😍'],
                    ['fine', 'It was fine', '🙂'],
                    ['hated', 'Hated it', '😬'],
                  ] as const
                ).map(([k, label, e]) => (
                  <motion.button key={k} whileTap={{ scale: 0.95 }} transition={spring} className="rounded-2xl bg-white/[0.08] py-2.5 text-[13px] font-semibold" onClick={() => rateSeen(k)}>
                    <div className="text-lg">{e}</div>
                    {label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons (also the accessible alternative to gestures) */}
      <div className="mt-4 flex items-center justify-center gap-4">
        <RoundButton label="Undo" size={46} disabled={!undo.length} onClick={doUndo}>
          <ArrowCounterClockwiseIcon size={20} weight="bold" />
        </RoundButton>
        <RoundButton label="Nah" size={60} tint="var(--no)" disabled={nothing || milestone} onClick={() => topRef.current?.fling('left')}>
          <XIcon size={26} weight="bold" />
        </RoundButton>
        <RoundButton label="Seen it" size={50} tint="var(--gold-400)" disabled={nothing || milestone} onClick={() => topRef.current?.fling('up')}>
          <EyeIcon size={22} weight="fill" />
        </RoundButton>
        <RoundButton label="Into it" size={60} tint="var(--yes)" disabled={nothing || milestone} onClick={() => topRef.current?.fling('right')}>
          <HeartIcon size={26} weight="fill" />
        </RoundButton>
      </div>

      <SwipeFilterSheet cat={cat} open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </div>
  );
}

function BehindCard({ cat, index, depth, progress }: { cat: Catalogue; index: number; depth: number; progress: MotionValue<number> }) {
  // depth 1 = next card: grows toward full size as the top card is dragged away.
  const scale = useTransform(progress, [0, 1], [1 - depth * 0.04, 1 - (depth - 1) * 0.04]);
  const y = useTransform(progress, [0, 1], [-depth * 10, -(depth - 1) * 10]);
  const dim = useTransform(progress, [0, 1], [0.25 + depth * 0.1, 0.25 + (depth - 1) * 0.1]);
  return (
    <motion.div className="absolute inset-0 overflow-hidden rounded-[24px]" style={{ scale, y, zIndex: 10 - depth, transformOrigin: '50% 0%' }} aria-hidden>
      <CardFace cat={cat} index={index} />
      <motion.div className="absolute inset-0 bg-black" style={{ opacity: dim }} />
    </motion.div>
  );
}

function RoundButton({ label, size, tint, disabled, onClick, children }: { label: string; size: number; tint?: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      disabled={disabled}
      onClick={onClick}
      className="grid place-items-center rounded-full border border-line bg-white/[0.06] disabled:opacity-35"
      style={{ width: size, height: size, color: tint ?? 'var(--text-mid)', boxShadow: tint ? `0 8px 26px -10px ${tint}` : undefined }}
    >
      {children}
    </motion.button>
  );
}
