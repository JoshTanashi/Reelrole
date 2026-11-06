import { motion } from 'motion/react';
import type { Option } from '../../../engine/types';
import { spring } from '../../../design/motion';

/** 6 gradient swatches with one-word labels (HANDOVER §9.3). */
export function Mood({ options, onPick, disabled }: { options: Option[]; onPick: (o: Option) => void; disabled: boolean }) {
  const swatches = options.filter((o) => o.swatch);
  const rest = options.filter((o) => !o.swatch);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2.5">
        {swatches.map((o, i) => (
          <motion.button
            key={o.id}
            disabled={disabled}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.03 + i * 0.03 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onPick(o)}
            className="relative flex h-[84px] items-end overflow-hidden rounded-2xl p-2.5 text-left text-[15px] font-bold"
            style={{ background: `linear-gradient(135deg, ${o.swatch![0]} 0%, ${o.swatch![1]} 100%)` }}
          >
            <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            <span className="relative drop-shadow">{o.label}</span>
          </motion.button>
        ))}
      </div>
      {rest.map((o) => (
        <button key={o.id} disabled={disabled} onClick={() => onPick(o)} className="mt-2 h-11 w-full rounded-full text-[15px] font-medium text-mid">
          {o.label}
        </button>
      ))}
    </div>
  );
}
