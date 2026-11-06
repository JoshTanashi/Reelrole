import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Screen } from '../../nav/Screen';
import { useCatalogue } from '../../data/useCatalogue';
import { Poster } from '../../design/Poster';
import { spring } from '../../design/motion';
import { useSheet } from '../../store/sheet';
import { haptics } from '../../haptics/haptics';

/** Swipe preview: the stack look (HANDOVER §9.5). Gestures, undo and filters arrive in M5. */
export function SwipeScreen() {
  const cat = useCatalogue();
  const open = useSheet((s) => s.openTitle);
  const stack = useMemo(() => {
    if (!cat) return [];
    const pool = cat.titles.map((_, i) => i).filter((i) => cat.titles[i]!.backdrop && cat.titles[i]!.votes > 2000);
    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
  }, [cat]);

  return (
    <Screen tab="swipe" className="overflow-hidden">
      {() => (
        <div className="flex h-full flex-col px-4 pb-[calc(var(--sab)+92px)] pt-[calc(var(--sat)+12px)]">
          <div className="flex items-baseline justify-between px-1">
            <h1 className="font-title text-[2.125rem]">Swipe</h1>
            <span className="text-xs text-lo">gestures arrive in M5</span>
          </div>
          <div className="relative mt-3 flex-1">
            {cat &&
              [...stack].reverse().map((i, r) => {
                const depth = stack.length - 1 - r;
                const t = cat.titles[i]!;
                const genres = t.genres.slice(0, 2).map((g) => cat.genres[g]);
                return (
                  <motion.button
                    key={t.id}
                    className="absolute inset-0 overflow-hidden rounded-[24px] text-left shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
                    style={{ zIndex: 10 - depth, transformOrigin: '50% 100%' }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: depth * -10, scale: 1 - depth * 0.04 }}
                    transition={{ ...spring, delay: depth * 0.05 }}
                    whileTap={depth === 0 ? { scale: 0.985 } : undefined}
                    onClick={() => {
                      if (depth) return;
                      haptics.light();
                      open(t.id);
                    }}
                    aria-label={t.title}
                  >
                    <Poster title={t} size="w500" eager className="!aspect-auto h-full w-full !rounded-none" />
                    <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black via-black/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <div className="font-title text-[2.1rem] leading-[0.98]">{t.title}</div>
                      <div className="mt-1.5 text-sm text-mid">
                        {t.year} · <span className="font-semibold text-gold">★ {t.rating.toFixed(1)}</span>
                      </div>
                      <div className="mt-2.5 flex gap-1.5">
                        {genres.map((g) => (
                          <span key={g} className="rounded-full bg-white/[0.12] px-2.5 py-1 text-xs font-medium backdrop-blur">{g}</span>
                        ))}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
          </div>
        </div>
      )}
    </Screen>
  );
}
