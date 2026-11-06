import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useReducedMotionConfig, useTransform } from 'motion/react';
import { useEffect } from 'react';
import type { Catalogue } from '../../data/catalogue';
import { Poster } from '../../design/Poster';
import { springGentle } from '../../design/motion';
import { useSheet, type Rect } from '../../store/sheet';
import { sheetTop } from '../../nav/sheetProgress';

/** Poster slot inside the sheet, relative to the sheet's top edge (mirrors TitleSheet layout). */
function slot() {
  const W = window.innerWidth;
  const heroH = Math.min(320, Math.max(208, 0.58 * W));
  return { x: 20, dy: heroH - 64, w: 104, h: 156 };
}

/** Shared-element feel: the tapped poster flies into its place in the detail sheet, landing with the sheet. */
export function PosterFlight({ cat }: { cat: Catalogue }) {
  const { titleId, origin, flying, landed } = useSheet();
  const reduce = useReducedMotionConfig();
  useEffect(() => {
    if (flying && reduce) landed();
  }, [flying, reduce, landed]);
  if (!flying || !origin || titleId === null || reduce) return null;
  const i = cat.indexById.get(titleId);
  if (i === undefined) return null;
  return createPortal(<Flight key={titleId} cat={cat} index={i} origin={origin} onDone={landed} />, document.body);
}

function Flight({ cat, index, origin, onDone }: { cat: Catalogue; index: number; origin: Rect; onDone: () => void }) {
  const s = slot();
  const p = useMotionValue(0);
  const x = useTransform(p, (v) => origin.x + (s.x - origin.x) * v);
  const y = useTransform([p, sheetTop], ([v, top]: number[]) => origin.y + (top! + s.dy - origin.y) * v!);
  const w = useTransform(p, (v) => origin.w + (s.w - origin.w) * v);
  const h = useTransform(p, (v) => origin.h + (s.h - origin.h) * v);
  useEffect(() => {
    const a = animate(p, 1, springGentle);
    a.then(onDone);
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[55] overflow-hidden rounded-poster shadow-[0_16px_40px_-10px_rgba(0,0,0,0.9)]"
      style={{ x, y, width: w, height: h }}
    >
      <Poster title={cat.titles[index]!} size="w342" eager className="!aspect-auto h-full w-full !rounded-none" />
    </motion.div>
  );
}
