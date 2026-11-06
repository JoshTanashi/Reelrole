import { useState } from 'react';
import { motion } from 'motion/react';
import type { Option } from '../../../engine/types';
import type { Catalogue } from '../../../data/catalogue';
import { Poster } from '../../../design/Poster';
import { spring } from '../../../design/motion';

/** "This vibe or that vibe?" Two posters; tap one and the other slides away (HANDOVER §9.3). */
export function Duel({ cat, options, onPick, disabled }: { cat: Catalogue; options: Option[]; onPick: (o: Option) => void; disabled: boolean }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const pair = options.filter((o) => o.titleId !== undefined);
  const neither = options.find((o) => o.titleId === undefined);
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {pair.map((o, k) => {
          const i = cat.indexById.get(o.titleId!);
          if (i === undefined) return null;
          const out = chosen !== null && chosen !== o.id;
          return (
            <motion.button
              key={o.id}
              disabled={disabled || chosen !== null}
              initial={{ opacity: 0, x: k ? 30 : -30 }}
              animate={out ? { opacity: 0, x: k ? 80 : -80, rotate: k ? 8 : -8 } : { opacity: 1, x: 0, scale: chosen === o.id ? 1.04 : 1 }}
              transition={spring}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setChosen(o.id);
                setTimeout(() => onPick(o), 280);
              }}
              className="text-left"
            >
              <Poster title={cat.titles[i]!} size="w342" eager className={chosen === o.id ? 'ring-2 ring-white' : ''} />
              <div className="mt-1.5 truncate text-[13px] font-semibold">{o.label}</div>
            </motion.button>
          );
        })}
      </div>
      {neither && (
        <button disabled={disabled || chosen !== null} className="mt-2 h-11 w-full rounded-full text-[15px] font-medium text-mid" onClick={() => onPick(neither)}>
          {neither.label}
        </button>
      )}
    </div>
  );
}
