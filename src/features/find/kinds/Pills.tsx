import { motion } from 'motion/react';
import type { Option } from '../../../engine/types';
import { spring } from '../../../design/motion';

/** binary / tri / chips-single: big pills; "don't care" options are quieter (HANDOVER §9.3). */
export function Pills({ options, onPick, disabled }: { options: Option[]; onPick: (o: Option) => void; disabled: boolean }) {
  const loud = options.filter((o) => o.effects.length || o.hard);
  const quiet = options.filter((o) => !o.effects.length && !o.hard);
  const many = loud.length > 3;
  return (
    <div className="flex flex-col gap-2.5">
      <div className={many ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2.5'}>
        {loud.map((o, i) => (
          <motion.button
            key={o.id}
            disabled={disabled}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.04 + i * 0.035 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(o)}
            className={`flex items-center border border-white/10 bg-white/[0.07] text-left font-semibold ${many ? 'min-h-14 gap-2 rounded-[20px] px-3.5 py-2 text-[14.5px] leading-tight' : 'h-[58px] gap-3 rounded-full px-5 text-[17px]'}`}
          >
            {o.emoji && <span className="shrink-0 text-[1.3em]">{o.emoji}</span>}
            <span className={many ? '' : 'truncate'}>{o.label}</span>
          </motion.button>
        ))}
      </div>
      {quiet.map((o) => (
        <motion.button
          key={o.id}
          disabled={disabled}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onPick(o)}
          className="h-11 rounded-full text-[15px] font-medium text-mid"
        >
          {o.emoji && <span className="mr-1.5">{o.emoji}</span>}
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}
