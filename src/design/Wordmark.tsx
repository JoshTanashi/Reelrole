import { motion, useReducedMotion } from 'motion/react';
import { ReelO } from './ReelO';

const LETTERS = ['r', 'e', 'e', 'l', 'r', 'o', 'l', 'e'] as const;

/**
 * Text wordmark placeholder (until Joshie's logo lands).
 * Intro: letters rise in, the "o" reel spins down, then a light sweep passes once.
 */
export function Wordmark({ className = '', play = 0 }: { className?: string; play?: number }) {
  const reduce = useReducedMotion();
  return (
    <h1 key={play} className={`font-wordmark relative inline-flex items-baseline leading-none ${className}`} aria-label="reelrole">
      {LETTERS.map((ch, i) =>
        ch === 'o' ? (
          <motion.span
            key={i}
            aria-hidden
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.35em' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9, delay: 0.08 + i * 0.04 }}
          >
            <ReelO delay={0.1 + i * 0.04} />
          </motion.span>
        ) : (
          <motion.span
            key={i}
            aria-hidden
            className="inline-block"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: '0.35em' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9, delay: 0.08 + i * 0.04 }}
          >
            {ch}
          </motion.span>
        ),
      )}
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-[-10%] w-[40%]"
          style={{
            background: 'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            mixBlendMode: 'overlay',
            filter: 'blur(6px)',
          }}
          initial={{ left: '-45%', opacity: 0 }}
          animate={{ left: '110%', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.9, delay: 1.05, ease: 'easeInOut' }}
        />
      )}
    </h1>
  );
}
