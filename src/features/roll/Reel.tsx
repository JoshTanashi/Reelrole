import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform, useVelocity } from 'motion/react';
import { img, type Catalogue } from '../../data/catalogue';
import { Poster } from '../../design/Poster';
import { haptics } from '../../haptics/haptics';
import { play } from '../../audio/synth';

export interface ReelHandle {
  /** Spin to `winner`; `fake` (optional) is the near-miss tease. Resolves on landing. */
  spin: (winner: number, fillers: number[], fake: number | null, reduced: boolean) => Promise<void>;
}

const EASE = [0.12, 0.9, 0.18, 1] as const;
const GAP = 14;

/**
 * Vertical slot reel (HANDOVER §9.6). Posters fall downward through the window; fast
 * fillers use tiny w92 images (they read as motion blur and cost nothing), the last few use
 * full-res. Ticks fire as each poster crosses the centre line, pitch rising as it slows.
 */
export const Reel = forwardRef<ReelHandle, { cat: Catalogue; itemW: number; itemH: number; winH: number; initial: number | null; landed: boolean }>(
  function Reel({ cat, itemW, itemH, winH, initial, landed }, ref) {
    const step = itemH + GAP;
    const center = (winH - itemH) / 2;
    const [strip, setStrip] = useState<number[]>(initial !== null ? [initial] : []);
    const y = useMotionValue(0);
    const opacity = useMotionValue(1);
    const vel = useVelocity(y);
    const streaks = useTransform(vel, (v) => Math.min(0.55, Math.abs(v) / 9000));
    const stretch = useTransform(vel, (v) => 1 + Math.min(0.1, Math.abs(v) / 40000));
    const lastTick = useRef({ idx: 0, t: 0 });

    useImperativeHandle(ref, () => ({
      spin: async (winner, fillers, fake, reduced) => {
        const start = strip.length ? strip[strip.length - 1]! : fillers[0]!;
        const seq = [start, ...fillers, ...(fake !== null ? [fake] : []), winner, fillers[0] ?? winner];
        const K = seq.length - 2; // winner index
        setStrip(seq);
        y.jump(0);
        lastTick.current = { idx: 0, t: 0 };

        if (reduced) {
          // Fade carousel: a few quick crossfades, no travel.
          for (const k of [Math.floor(K / 3), Math.floor((2 * K) / 3), K]) {
            await animate(opacity, 0, { duration: 0.12 });
            y.jump(k * step);
            await animate(opacity, 1, { duration: 0.16 });
          }
          return;
        }

        const t0 = performance.now();
        const total = 2200;
        const unsub = y.on('change', (v) => {
          const idx = Math.round(v / step);
          if (idx !== lastTick.current.idx) {
            const now = performance.now();
            lastTick.current.idx = idx;
            play('reel.tick', { pitch: Math.min(1, (now - t0) / total) });
            if (now - lastTick.current.t >= 60) {
              haptics.selection();
              lastTick.current.t = now;
            }
          }
        });

        if (fake !== null) {
          await animate(y, (K - 1) * step + step * 0.08, { duration: 2.0, ease: EASE });
          await new Promise((r) => setTimeout(r, 260));
          await animate(y, K * step, { type: 'spring', stiffness: 320, damping: 20, mass: 0.9 });
        } else {
          await animate(y, K * step, { duration: total / 1000, ease: EASE });
        }
        unsub();
      },
    }));

    return (
      <div className="relative overflow-hidden" style={{ width: itemW + 28, height: winH }}>
        <motion.div className="absolute inset-0" style={{ y, opacity }}>
          {strip.map((i, k) => {
            const t = cat.titles[i]!;
            const hiRes = k === 0 || k >= strip.length - 3;
            return (
              <motion.div
                key={`${k}-${t.id}`}
                className="absolute left-[14px] overflow-hidden rounded-[18px]"
                style={{ top: center - k * step, width: itemW, height: itemH, scaleY: stretch }}
              >
                {hiRes ? (
                  <Poster title={t} size="w500" eager className="!aspect-auto h-full w-full !rounded-none" />
                ) : (
                  <div className="h-full w-full" style={{ backgroundColor: t.color }}>
                    <img src={img(t.poster, 'w92')} alt="" className="h-full w-full object-cover" draggable={false} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
        {/* speed streaks */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: streaks,
            background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.0) 0px, rgba(255,255,255,0.07) 2px, rgba(255,255,255,0) 7px)',
          }}
        />
        {/* top/bottom falloff so neighbours peek like a real reel drum */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-[#0a080e] to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] bg-gradient-to-t from-[#0a080e] to-transparent" />
        {!landed && strip.length === 0 && (
          <div className="absolute grid place-items-center rounded-[18px] border border-dashed border-white/10" style={{ left: 14, top: center, width: itemW, height: itemH }}>
            <span className="font-title text-[5rem] text-white/10">?</span>
          </div>
        )}
      </div>
    );
  },
);
