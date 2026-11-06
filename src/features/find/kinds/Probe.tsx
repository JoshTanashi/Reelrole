import { motion } from 'motion/react';
import type { Option } from '../../../engine/types';
import type { Catalogue } from '../../../data/catalogue';
import { Poster } from '../../../design/Poster';
import { spring } from '../../../design/motion';

/** "Seen X?" — the leader's poster + three answers. */
export function Probe({ cat, options, onPick, disabled }: { cat: Catalogue; options: Option[]; onPick: (o: Option) => void; disabled: boolean }) {
  const i = cat.indexById.get(options[0]!.titleId!);
  return (
    <div className="flex gap-4">
      {i !== undefined && <Poster title={cat.titles[i]!} size="w342" eager className="w-[96px] shrink-0 self-start" />}
      <div className="flex flex-1 flex-col gap-2">
        {options.map((o, k) => (
          <motion.button
            key={o.id}
            disabled={disabled}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: k * 0.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(o)}
            className="flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 text-left text-[14.5px] font-semibold"
          >
            <span>{o.emoji}</span>
            <span className="truncate">{o.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
