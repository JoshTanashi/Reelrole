import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PlusIcon, CheckIcon, HeartIcon, EyeIcon, DotsThreeIcon, ProhibitIcon, StarIcon } from '@phosphor-icons/react';
import { useLibrary } from '../../store/library';
import { useTaste, SIGNAL } from '../../store/taste';
import { useCatalogue } from '../../data/useCatalogue';
import { haptics } from '../../haptics/haptics';
import { spring } from '../../design/motion';

/** My List · Like · Watched · (…) Not for me — HANDOVER §9.8. */
export function ActionRow({ id }: { id: number }) {
  const u = useLibrary((s) => s.items[id]);
  const L = useLibrary.getState();
  const cat = useCatalogue();
  const learn = (w: number) => {
    const i = cat?.indexById.get(id);
    if (cat && i !== undefined) useTaste.getState().add(cat, i, w);
  };
  const [askRating, setAskRating] = useState(false);
  const [menu, setMenu] = useState(false);
  const [burst, setBurst] = useState(0);
  const onList = !!u?.onList;
  const liked = u?.liked === true;
  const watched = !!u?.watched;

  return (
    <div className="mt-5">
      <div className="grid grid-cols-4 gap-2">
        <Action
          label={onList ? 'On my list' : 'My List'}
          active={onList}
          onClick={() => {
            haptics.light();
            learn(L.toggleList(id) ? SIGNAL.list : -SIGNAL.list);
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={onList ? 'c' : 'p'} initial={{ rotate: -90, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.4, opacity: 0 }} transition={spring}>
              {onList ? <CheckIcon size={24} weight="bold" /> : <PlusIcon size={24} weight="bold" />}
            </motion.span>
          </AnimatePresence>
        </Action>

        <Action
          label="Like"
          active={liked}
          tint="#FF4D6D"
          onClick={() => {
            haptics.light();
            if (L.toggleLike(id)) {
              setBurst((b) => b + 1);
              learn(SIGNAL.like);
            } else learn(-SIGNAL.like);
          }}
        >
          <span className="relative">
            <motion.span key={`h${burst}`} className="block" initial={liked ? { scale: 0.6 } : false} animate={{ scale: [0.6, 1.25, 1] }} transition={{ duration: 0.35 }}>
              <HeartIcon size={24} weight={liked ? 'fill' : 'bold'} color={liked ? '#FF4D6D' : undefined} />
            </motion.span>
            {burst > 0 && liked && <Burst key={burst} />}
          </span>
        </Action>

        <Action
          label={watched ? 'Watched' : 'Watched?'}
          active={watched}
          tint="#3DF5A7"
          onClick={() => {
            haptics.light();
            if (watched) {
              L.setWatched(id, false, null);
              setAskRating(false);
            } else {
              L.setWatched(id, true);
              setAskRating(true);
            }
          }}
        >
          <EyeIcon size={24} weight={watched ? 'fill' : 'bold'} color={watched ? '#3DF5A7' : undefined} />
        </Action>

        <div className="relative">
          <Action label="More" active={false} onClick={() => setMenu((m) => !m)}>
            <DotsThreeIcon size={24} weight="bold" />
          </Action>
          <AnimatePresence>
            {menu && (
              <motion.button
                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                transition={spring}
                className="glass absolute right-0 top-[calc(100%+8px)] z-10 flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold"
                onClick={() => {
                  haptics.medium();
                  learn(L.toggleNotForMe(id) ? SIGNAL.notForMe : -SIGNAL.notForMe);
                  setMenu(false);
                }}
              >
                <ProhibitIcon size={18} weight="bold" className="text-no" />
                {u?.notForMe ? 'Undo “Not for me”' : 'Not for me'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {askRating && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={spring} className="overflow-hidden">
            <div className="mt-3 flex items-center justify-between rounded-card border border-line bg-white/[0.04] px-4 py-3">
              <span className="text-sm font-semibold">How was it?</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    className="p-1"
                    onClick={() => {
                      haptics.selection();
                      L.setRating(id, n);
                      setTimeout(() => setAskRating(false), 450);
                    }}
                  >
                    <StarIcon size={24} weight={(u?.myRating ?? 0) >= n ? 'fill' : 'regular'} color={(u?.myRating ?? 0) >= n ? 'var(--gold-400)' : 'rgba(246,243,250,0.4)'} />
                  </button>
                ))}
                <button className="ml-1 px-1 text-xs text-lo" onClick={() => setAskRating(false)}>
                  skip
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Action({ label, active, tint, onClick, children }: { label: string; active: boolean; tint?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={spring}
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-[68px] w-full flex-col items-center justify-center gap-1 rounded-2xl border transition-colors ${active ? 'border-white/15 bg-white/[0.1]' : 'border-line bg-white/[0.04]'}`}
      style={active && tint ? { boxShadow: `inset 0 0 0 1px ${tint}33` } : undefined}
    >
      {children}
      <span className={`text-[11px] font-semibold ${active ? 'text-hi' : 'text-mid'}`}>{label}</span>
    </motion.button>
  );
}

/** Small heart-burst particles for Like. */
function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{ background: i % 2 ? '#FF4D6D' : '#E81CFF', left: -3, top: -3 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 22, y: Math.sin(a) * 22, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.5, ease: [0.12, 0.9, 0.18, 1] }}
          />
        );
      })}
    </span>
  );
}
