import { AnimatePresence, motion } from 'motion/react';
import { XIcon } from '@phosphor-icons/react';
import { createPortal } from 'react-dom';
import { springGentle } from '../../design/motion';

/** Full-screen trailer modal (YouTube, privacy-enhanced embed). */
export function TrailerModal({ ytKey, open, onClose }: { ytKey: string; open: boolean; onClose: () => void }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-center bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="aspect-video w-full" initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} transition={springGentle} onClick={(e) => e.stopPropagation()}>
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${ytKey}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
              title="Trailer"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </motion.div>
          <button aria-label="Close trailer" onClick={onClose} className="glass absolute right-4 top-[calc(var(--sat)+12px)] grid h-10 w-10 place-items-center rounded-full">
            <XIcon size={20} weight="bold" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
