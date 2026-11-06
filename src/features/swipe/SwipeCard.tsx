import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { HeartIcon, XIcon, EyeIcon } from '@phosphor-icons/react';
import { loadDetail, type Catalogue } from '../../data/catalogue';
import { Poster } from '../../design/Poster';
import type { Dir } from './store';

export interface SwipeCardHandle {
  fling: (dir: Dir) => void;
}

interface Props {
  cat: Catalogue;
  index: number;
  width: number;
  height: number;
  /** 0..1 how far the top card is toward committing; drives the card behind. */
  progress: MotionValue<number>;
  onCommit: (dir: Dir) => void;
  onTap: () => void;
  /** Undo: fly back in from where it left. */
  enterFrom?: Dir;
}

/**
 * Top card (HANDOVER §9.5): drag with ±12° tilt, coloured edge glow, commit at 35% width
 * (or 25% height up) or > 800px/s, otherwise spring back.
 */
export const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard({ cat, index, width, height, progress, onCommit, onTap, enterFrom }, ref) {
  const t = cat.titles[index]!;
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-width, width], [-12, 12]);
  const right = useTransform(x, [0, width * 0.35], [0, 1]);
  const left = useTransform(x, [0, -width * 0.35], [0, 1]);
  const up = useTransform(y, [0, -height * 0.25], [0, 1]);
  const [tagline, setTagline] = useState<string | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!enterFrom) return;
    if (enterFrom === 'up') y.jump(-height * 1.3);
    else x.jump((enterFrom === 'right' ? 1 : -1) * width * 1.5);
    void animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    void animate(y, 0, { type: 'spring', stiffness: 300, damping: 30 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let live = true;
    loadDetail(t.id).then((d) => live && setTagline(d?.tagline || null));
    return () => {
      live = false;
    };
  }, [t.id]);

  useEffect(() => {
    const upd = () => progress.set(Math.min(1, Math.max(Math.abs(x.get()) / (width * 0.35), -y.get() / (height * 0.25), 0)));
    const a = x.on('change', upd);
    const b = y.on('change', upd);
    return () => {
      a();
      b();
    };
  }, [x, y, width, height, progress]);

  const fling = (dir: Dir, vx = 0, vy = 0) => {
    if (gone) return;
    setGone(true);
    onCommit(dir);
    const spring = { type: 'spring' as const, stiffness: 220, damping: 30 };
    if (dir === 'up') {
      void animate(y, -height * 1.4, { ...spring, velocity: vy });
      void animate(x, x.get() * 0.5, spring);
    } else {
      void animate(x, (dir === 'right' ? 1 : -1) * width * 1.6, { ...spring, velocity: vx });
      void animate(y, y.get() + vy * 0.1, spring);
    }
  };
  useImperativeHandle(ref, () => ({ fling: (d) => fling(d, d === 'up' ? 0 : d === 'right' ? 900 : -900, d === 'up' ? -900 : 0) }));

  return (
    <motion.div
      className="absolute inset-0 touch-none overflow-hidden rounded-[24px] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
      style={{ x, y, rotate, zIndex: 10 }}
      drag={!gone}
      dragElastic={0.9}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const { offset, velocity } = info;
        if (-offset.y > height * 0.25 || (velocity.y < -800 && Math.abs(velocity.x) < Math.abs(velocity.y))) return fling('up', 0, velocity.y);
        if (offset.x > width * 0.35 || velocity.x > 800) return fling('right', velocity.x, velocity.y);
        if (offset.x < -width * 0.35 || velocity.x < -800) return fling('left', velocity.x, velocity.y);
        void animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
        void animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }}
      onTap={() => !gone && Math.abs(x.get()) < 4 && Math.abs(y.get()) < 4 && onTap()}
    >
      <CardFace cat={cat} index={index} tagline={tagline} />
      {/* Edge glows */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[24px]" style={{ opacity: right, boxShadow: 'inset 0 0 0 3px var(--yes), inset 0 0 60px 0 rgba(61,245,167,0.55)' }} />
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[24px]" style={{ opacity: left, boxShadow: 'inset 0 0 0 3px var(--no), inset 0 0 60px 0 rgba(255,77,109,0.55)' }} />
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[24px]" style={{ opacity: up, boxShadow: 'inset 0 0 0 3px var(--gold-400), inset 0 0 60px 0 rgba(255,200,87,0.5)' }} />
      {/* Badges */}
      <Badge opacity={right} className="left-5 top-5 bg-yes text-black" label="Into it">
        <HeartIcon size={18} weight="fill" />
      </Badge>
      <Badge opacity={left} className="right-5 top-5 bg-no text-white" label="Nah">
        <XIcon size={18} weight="bold" />
      </Badge>
      <Badge opacity={up} className="left-1/2 top-5 -translate-x-1/2 bg-gold text-black" label="Seen it">
        <EyeIcon size={18} weight="fill" />
      </Badge>
    </motion.div>
  );
});

function Badge({ opacity, className, label, children }: { opacity: MotionValue<number>; className: string; label: string; children: React.ReactNode }) {
  const scale = useTransform(opacity, [0, 1], [0.7, 1]);
  return (
    <motion.div aria-hidden className={`pointer-events-none absolute flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${className}`} style={{ opacity, scale }}>
      {children}
      {label}
    </motion.div>
  );
}

export function CardFace({ cat, index, tagline }: { cat: Catalogue; index: number; tagline?: string | null }) {
  const t = cat.titles[index]!;
  const genres = t.genres.slice(0, 2).map((g) => cat.genres[g]);
  return (
    <>
      <Poster title={t} size="w500" eager className="!aspect-auto h-full w-full !rounded-none" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black via-black/65 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="font-title text-[2.1rem] leading-[0.98]">{t.title}</div>
        <div className="mt-1.5 text-sm text-mid">
          {[t.year, t.kind === 'series' ? 'Series' : null].filter(Boolean).join(' · ')} · <span className="font-semibold text-gold">★ {t.rating.toFixed(1)}</span>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {genres.map((g) => (
            <span key={g} className="rounded-full bg-white/[0.14] px-2.5 py-1 text-xs font-medium backdrop-blur">{g}</span>
          ))}
        </div>
        {tagline && <p className="mt-2.5 line-clamp-1 text-[13.5px] italic text-hi/75">{tagline}</p>}
      </div>
    </>
  );
}
