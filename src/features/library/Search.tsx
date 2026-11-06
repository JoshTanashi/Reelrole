import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MagnifyingGlassIcon, XCircleIcon } from '@phosphor-icons/react';
import type { Catalogue } from '../../data/catalogue';
import { search, searchIndex } from '../../data/search';
import { Poster } from '../../design/Poster';
import { spring } from '../../design/motion';
import { useSheet } from '../../store/sheet';
import { haptics } from '../../haptics/haptics';

/** The field that sits under the large title; tapping it opens the search overlay. */
export function SearchField({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="mx-5 mt-3 flex h-10 w-[calc(100%-40px)] items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-left text-[15px] text-lo"
    >
      <MagnifyingGlassIcon size={18} weight="bold" />
      Titles, actors…
    </button>
  );
}

export function SearchOverlay({ cat, open, onClose }: { cat: Catalogue; open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<number[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const openTitle = useSheet((s) => s.openTitle);
  const popular = useMemo(() => cat.titles.map((_, i) => i).sort((a, b) => cat.titles[b]!.popularity - cat.titles[a]!.popularity).slice(0, 12), [cat]);

  useEffect(() => {
    if (open) {
      void searchIndex(cat);
      setTimeout(() => input.current?.focus(), 60);
    } else setQ('');
  }, [open, cat]);

  useEffect(() => {
    let live = true;
    if (q.trim().length < 2) setHits([]);
    else search(cat, q).then((r) => live && setHits(r));
    return () => {
      live = false;
    };
  }, [q, cat]);

  const list = q.trim().length >= 2 ? hits : popular;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[45] flex flex-col bg-bg-0/95 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(var(--sat)+12px)]">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-white/[0.1] px-3">
              <MagnifyingGlassIcon size={18} weight="bold" className="text-lo" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Titles, actors…"
                enterKeyHint="search"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-hi outline-none placeholder:text-lo"
              />
              {q && (
                <button aria-label="Clear" onClick={() => setQ('')} className="text-lo">
                  <XCircleIcon size={18} weight="fill" />
                </button>
              )}
            </div>
            <button className="shrink-0 text-[16px] font-medium text-ember" onClick={onClose}>
              Cancel
            </button>
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-[calc(var(--sab)+24px)]">
            <div className="mb-3 mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-lo">
              {q.trim().length >= 2 ? (hits.length ? `${hits.length} result${hits.length > 1 ? 's' : ''}` : 'Nothing found. Try an actor?') : 'Popular right now'}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {list.map((i, n) => {
                const t = cat.titles[i]!;
                return (
                  <motion.button
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: Math.min(n, 12) * 0.02 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-left"
                    onClick={(e) => {
                      haptics.light();
                      input.current?.blur();
                      openTitle(t.id, e.currentTarget.firstElementChild);
                    }}
                  >
                    <Poster title={t} size="w342" />
                    <div className="mt-1 truncate text-[11.5px] font-medium text-mid">{t.title}</div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
