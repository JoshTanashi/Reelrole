import { motion, useReducedMotionConfig } from 'motion/react';

/** The "o" in reelrole, drawn as a film reel. Spins once on the intro, then rests. */
export function ReelO({ size = '0.74em', spin = true, delay = 0 }: { size?: string; spin?: boolean; delay?: number }) {
  const reduce = useReducedMotionConfig();
  const holes = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return { cx: 50 + Math.cos(a) * 24, cy: 50 + Math.sin(a) * 24 };
  });
  return (
    <motion.svg
      viewBox="0 0 100 100"
      aria-hidden
      style={{ width: size, height: size, display: 'inline-block', verticalAlign: '-0.02em', margin: '0 0.02em' }}
      initial={{ rotate: reduce || !spin ? 0 : -420 }}
      animate={{ rotate: 0 }}
      transition={{ duration: reduce ? 0 : 1.5, delay, ease: [0.12, 0.9, 0.18, 1] }}
    >
      <defs>
        <linearGradient id="reel-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF2E4D" />
          <stop offset="0.52" stopColor="#E81CFF" />
          <stop offset="1" stopColor="#6A3BFF" />
        </linearGradient>
        <mask id="reel-m">
          <circle cx="50" cy="50" r="50" fill="#fff" />
          {holes.map((h, i) => (
            <circle key={i} cx={h.cx} cy={h.cy} r="11" fill="#000" />
          ))}
          <circle cx="50" cy="50" r="6" fill="#000" />
        </mask>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#reel-g)" mask="url(#reel-m)" />
    </motion.svg>
  );
}
