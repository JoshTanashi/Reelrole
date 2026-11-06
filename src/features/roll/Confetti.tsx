import { motion } from 'motion/react';

/** Subtle landing confetti in the poster's colour (HANDOVER §9.6), ~700ms. */
export function Confetti({ color, seed }: { color: string; seed: number }) {
  const colors = [color, '#FFC857', '#F6F3FA', color];
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {Array.from({ length: 26 }, (_, i) => {
        const r = Math.sin(seed * 999 + i * 77.7) * 0.5 + 0.5;
        const a = (i / 26) * Math.PI * 2 + r;
        const dist = 120 + r * 110;
        return (
          <motion.span
            key={`${seed}-${i}`}
            className="absolute block rounded-[2px]"
            style={{ width: 6 + (i % 3) * 2, height: 10 - (i % 3) * 2, background: colors[i % colors.length], left: -4, top: -5 }}
            initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
            animate={{
              x: Math.cos(a) * dist,
              y: [0, Math.sin(a) * dist * 0.75, Math.sin(a) * dist * 0.75 + 90],
              rotate: r * 540 - 270,
              opacity: [1, 1, 0],
              scale: 1,
            }}
            transition={{ duration: 0.85, ease: [0.12, 0.9, 0.18, 1], times: [0, 0.6, 1] }}
          />
        );
      })}
    </div>
  );
}
