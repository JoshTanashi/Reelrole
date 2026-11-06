import { motion } from 'motion/react';
import { ArrowLeftIcon, ShareNetworkIcon } from '@phosphor-icons/react';
import type { Catalogue } from '../../data/catalogue';
import { spring, stagger } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { useFind } from './session';

/** Session recap (HANDOVER §3): your answers, replay, share. */
export function Recap({ cat }: { cat: Catalogue }) {
  const { steps, winner, backToReveal, reset } = useFind();
  const wi = winner !== null ? cat.indexById.get(winner) : undefined;
  const t = wi !== undefined ? cat.titles[wi]! : null;
  const share = async () => {
    haptics.light();
    const text = t ? `Reelrole picked ${t.title}${t.year ? ` (${t.year})` : ''} for me in ${steps.length} questions 🎬` : 'Reelrole: roll for tonight 🎬';
    try {
      if (navigator.share) await navigator.share({ text, url: location.origin });
      else await navigator.clipboard.writeText(`${text} ${location.origin}`);
    } catch {
      /* cancelled */
    }
  };
  return (
    <div className="no-scrollbar h-full overflow-y-auto px-5 pb-[calc(var(--sab)+110px)] pt-[calc(var(--sat)+14px)]">
      <button className="glass grid h-10 w-10 place-items-center rounded-full" aria-label="Back to the pick" onClick={backToReveal}>
        <ArrowLeftIcon size={18} weight="bold" />
      </button>
      <h1 className="font-title mt-4 text-[2.2rem] leading-none">How I got here</h1>
      <p className="mt-2 text-sm text-mid">
        {cat.titles.length.toLocaleString()} titles → {t ? <span className="font-semibold text-hi">{t.title}</span> : 'your pick'} in {steps.length} questions.
      </p>
      <ol className="mt-6 space-y-2.5">
        {steps.map((s, k) => (
          <motion.li
            key={s.qid + k}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: k * stagger }}
            className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.04] px-4 py-3"
          >
            <span className="font-title w-6 text-[1.1rem] text-lo">{k + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-mid">{s.prompt}</div>
              <div className="truncate text-[15px] font-semibold">{s.answer}</div>
            </div>
            <span className="tabular text-right text-xs text-lo">
              {s.aliveAfter.toLocaleString()}
              <br />
              left
            </span>
          </motion.li>
        ))}
      </ol>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <motion.button whileTap={{ scale: 0.96 }} transition={spring} className="flex h-[52px] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.08] font-semibold" onClick={share}>
          <ShareNetworkIcon size={18} weight="bold" /> Share
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          transition={spring}
          className="h-[52px] rounded-full bg-ember font-bold text-white"
          onClick={() => {
            haptics.medium();
            reset();
          }}
        >
          Play again
        </motion.button>
      </div>
    </div>
  );
}
