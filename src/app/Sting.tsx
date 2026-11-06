import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Wordmark } from '../design/Wordmark';
import { loadCatalogue } from '../data/catalogue';

/**
 * Boot sting (HANDOVER §9.1 step 1, short version): plays while the catalogue loads.
 * ≤ 2.2s, tap to skip. Full onboarding sting + sound lands in M8.
 */
export function Sting() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const min = new Promise((r) => setTimeout(r, 1700));
    const max = setTimeout(() => setShow(false), 2200);
    Promise.all([min, loadCatalogue().catch(() => null)]).then(() => setShow(false));
    return () => clearTimeout(max);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-bg-0"
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.42, ease: [0.12, 0.9, 0.18, 1] }}
          onClick={() => setShow(false)}
        >
          <div className="absolute inset-0" style={{ background: 'radial-gradient(55% 35% at 50% 50%, rgba(255,46,77,0.28) 0%, transparent 70%)' }} />
          <Wordmark className="relative text-[3.4rem] text-hi" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
