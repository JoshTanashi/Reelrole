import { motion, useReducedMotionConfig } from 'motion/react';
import { MOODS, useMood } from './moods';

/**
 * Living background (HANDOVER §5.2): soft radial blobs drifting on 20–40s loops.
 * Only transform is animated (blobs are pre-soft radial gradients, no animated blur).
 * Mood colour changes interpolate over 1.2s via registered CSS custom properties.
 */
const BLOBS = [
  { x: '-18%', y: '-12%', size: '95vmax', dur: 26, path: { x: ['0%', '12%', '-4%', '0%'], y: ['0%', '8%', '14%', '0%'] }, c: 0 },
  { x: '35%', y: '30%', size: '85vmax', dur: 34, path: { x: ['0%', '-14%', '6%', '0%'], y: ['0%', '-10%', '6%', '0%'] }, c: 1 },
  { x: '-30%', y: '55%', size: '80vmax', dur: 38, path: { x: ['0%', '10%', '18%', '0%'], y: ['0%', '-12%', '4%', '0%'] }, c: 2 },
  { x: '40%', y: '-30%', size: '60vmax', dur: 22, path: { x: ['0%', '-8%', '-16%', '0%'], y: ['0%', '12%', '4%', '0%'] }, c: 0 },
];

export function MeshGradient() {
  const { mood, intensity } = useMood();
  const reduce = useReducedMotionConfig();
  const colors = MOODS[mood];
  return (
    <div
      aria-hidden
      className="mesh pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-0"
      style={{ '--m0': colors[0], '--m1': colors[1], '--m2': colors[2] } as React.CSSProperties}
    >
      <div className="absolute inset-0" style={{ opacity: intensity }}>
        {BLOBS.map((b, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full will-change-transform"
            style={{
              left: b.x,
              top: b.y,
              width: b.size,
              height: b.size,
              background: `radial-gradient(closest-side, var(--m${b.c}) 0%, color-mix(in srgb, var(--m${b.c}) 35%, transparent) 45%, transparent 100%)`,
              opacity: i === 3 ? 0.5 : 0.7,
            }}
            animate={reduce ? undefined : b.path}
            transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      {/* Cinematic falloff: keep the top bright-ish, crush the bottom to near-black for content. */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,6,10,0.15) 0%, rgba(7,6,10,0.55) 45%, rgba(7,6,10,0.92) 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 100% at 50% 30%, transparent 50%, rgba(0,0,0,0.7) 100%)' }} />
    </div>
  );
}
