import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckIcon } from '@phosphor-icons/react';
import type { Option } from '../../../engine/types';
import { spring } from '../../../design/motion';
import { haptics } from '../../../haptics/haptics';

/** Multi-select themes with "None of these" (HANDOVER §9.3). */
export function Chips({ options, onDone, disabled }: { options: Option[]; onDone: (ids: string[], label: string) => void; disabled: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const real = options.filter((o) => o.effects.length);
  const none = options.find((o) => !o.effects.length);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {real.map((o, i) => {
          const on = sel.includes(o.id);
          return (
            <motion.button
              key={o.id}
              disabled={disabled}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.03 + i * 0.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                haptics.selection();
                setSel((s) => (on ? s.filter((x) => x !== o.id) : [...s, o.id]));
              }}
              className={`flex h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition-colors ${on ? 'border-white/30 bg-white text-black' : 'border-white/10 bg-white/[0.07]'}`}
            >
              {on ? <CheckIcon size={15} weight="bold" /> : o.emoji && <span>{o.emoji}</span>}
              {o.label}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-5 flex gap-2.5">
        {none && (
          <button disabled={disabled} className="h-[54px] flex-1 rounded-full text-[15px] font-medium text-mid" onClick={() => onDone([none.id], none.label)}>
            {none.label}
          </button>
        )}
        <motion.button
          disabled={disabled || !sel.length}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          className="h-[54px] flex-1 rounded-full bg-ember text-[17px] font-bold text-white disabled:opacity-35"
          onClick={() => onDone(sel, real.filter((o) => sel.includes(o.id)).map((o) => o.label).join(', '))}
        >
          {sel.length > 1 ? `These ${sel.length}` : 'This one'}
        </motion.button>
      </div>
    </div>
  );
}
