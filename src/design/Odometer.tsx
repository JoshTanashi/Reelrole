import { motion, useReducedMotionConfig } from 'motion/react';

const DIGITS = '0123456789'.split('');

/** Rolling digit counter (HANDOVER §5.3 / §9.3). Each digit column springs to its value. */
export function Odometer({ value, className = '' }: { value: number; className?: string }) {
  const reduce = useReducedMotionConfig();
  const chars = value.toLocaleString('en-US').split('');
  return (
    <span className={`tabular inline-flex overflow-hidden leading-none ${className}`} aria-hidden>
      {chars.map((ch, i) => {
        const key = chars.length - i; // stable per place value
        if (!/\d/.test(ch))
          return (
            <span key={`s${key}`} className="inline-block">
              {ch}
            </span>
          );
        const d = Number(ch);
        return (
          <span key={key} className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
            <motion.span
              className="absolute left-0 top-0 flex flex-col"
              initial={false}
              animate={{ y: `${-d}em` }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20, mass: 0.8, delay: (chars.length - i) * 0.03 }}
            >
              {DIGITS.map((x) => (
                <span key={x} className="block h-[1em] text-center">
                  {x}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}
