import { useRef } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { haptics } from '../../haptics/haptics';
import { play, unlockAudio } from '../../audio/synth';

const TRAVEL = 120;
const FIRE_AT = 0.72;

/** Pull-down lever (HANDOVER §9.6). Drag the knob down past ~70% and let go to roll. */
export function Lever({ onPull, disabled, height }: { onPull: () => void; disabled: boolean; height: number }) {
  const y = useMotionValue(0);
  const armed = useRef(false);
  const stick = useTransform(y, (v) => 28 + v);
  const glow = useTransform(y, [0, TRAVEL * FIRE_AT, TRAVEL], [0.25, 0.6, 1]);

  return (
    <div className="relative flex w-11 justify-center" style={{ height }} aria-hidden={disabled}>
      {/* track */}
      <div className="glass absolute top-0 h-[calc(100%-0px)] w-3 rounded-full" style={{ height: TRAVEL + 56 }} />
      {/* stick */}
      <motion.div className="absolute top-3 w-[3px] rounded-full bg-gradient-to-b from-white/60 to-white/20" style={{ height: stick }} />
      {/* knob */}
      <motion.button
        aria-label="Pull the lever to roll"
        className="absolute top-0 h-11 w-11 touch-none rounded-full"
        style={{
          y,
          background: 'radial-gradient(circle at 35% 30%, #ff8a9c 0%, #FF2E4D 38%, #a3002a 100%)',
          boxShadow: '0 6px 18px -4px rgba(255,46,77,0.8), inset 0 -3px 6px rgba(0,0,0,0.35)',
        }}
        drag={disabled ? false : 'y'}
        dragConstraints={{ top: 0, bottom: TRAVEL }}
        dragElastic={0.05}
        dragMomentum={false}
        onPointerDown={() => unlockAudio()}
        onDrag={() => {
          const past = y.get() >= TRAVEL * FIRE_AT;
          if (past !== armed.current) {
            armed.current = past;
            haptics.selection();
          }
        }}
        onDragEnd={() => {
          const fire = armed.current;
          armed.current = false;
          animate(y, 0, { type: 'spring', stiffness: 520, damping: 18 });
          if (fire) {
            play('reel.lever');
            haptics.medium();
            onPull();
          }
        }}
        whileTap={{ scale: 1.06 }}
      >
        <motion.span className="absolute inset-0 rounded-full" style={{ opacity: glow, boxShadow: '0 0 24px 6px rgba(255,46,77,0.55)' }} />
      </motion.button>
    </div>
  );
}
