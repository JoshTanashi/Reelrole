import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { spring } from '../../../design/motion';
import { haptics } from '../../../haptics/haptics';

const STOPS = [0, 0.25, 0.5, 0.75, 1];

/** Gradient-track slider with 5 detents + haptic ticks (HANDOVER §9.3). */
export function Slider({ left, right, onDone, disabled }: { left: string; right: string; onDone: (v: number) => void; disabled: boolean }) {
  const [v, setV] = useState(0.5);
  const track = useRef<HTMLDivElement>(null);
  const setFrom = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const raw = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const snap = STOPS.reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a));
    if (snap !== v) {
      haptics.selection();
      setV(snap);
    }
  };
  return (
    <div className="pt-2">
      <div className="flex justify-between text-[14px] font-semibold">
        <span className={v <= 0.25 ? 'text-hi' : 'text-mid'}>{left}</span>
        <span className={v >= 0.75 ? 'text-hi' : 'text-mid'}>{right}</span>
      </div>
      <div
        ref={track}
        className="relative mt-5 h-12 touch-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFrom(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && setFrom(e.clientX)}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={v * 4}
        aria-label={`${left} to ${right}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setV((x) => Math.min(1, x + 0.25));
          if (e.key === 'ArrowLeft') setV((x) => Math.max(0, x - 0.25));
        }}
      >
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full" style={{ background: 'var(--grad-brand)' }} />
        {STOPS.map((s) => (
          <div key={s} className="absolute top-1/2 h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" style={{ left: `${s * 100}%` }} />
        ))}
        <motion.div
          className="absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_6px_20px_rgba(0,0,0,0.5)]"
          animate={{ left: `${v * 100}%` }}
          transition={spring}
        />
      </div>
      <motion.button
        disabled={disabled}
        whileTap={{ scale: 0.97 }}
        transition={spring}
        className="mt-6 h-[54px] w-full rounded-full bg-ember text-[17px] font-bold text-white"
        onClick={() => onDone(v)}
      >
        That's it
      </motion.button>
    </div>
  );
}
