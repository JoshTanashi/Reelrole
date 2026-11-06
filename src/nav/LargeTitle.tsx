import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';

/**
 * iOS large title (HANDOVER §5.3/6.2): 34pt title in the content that hands off to a
 * 17pt inline title in a glass bar once it scrolls under the status bar.
 */
export function LargeTitle({ title, scrollRef, right }: { title: string; scrollRef: React.RefObject<HTMLElement | null>; right?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const on = () => setCollapsed(el.scrollTop > 44);
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, [scrollRef]);

  return (
    <>
      <div className="sticky top-0 z-30 -mb-[calc(var(--sat)+44px)] h-[calc(var(--sat)+44px)]">
        <motion.div
          className="absolute inset-0 border-b"
          initial={false}
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ background: 'rgba(12,10,16,0.72)', WebkitBackdropFilter: 'var(--glass-blur)', backdropFilter: 'var(--glass-blur)', borderColor: 'var(--line)' }}
        />
        <div className="relative flex h-full items-end justify-center px-4 pb-2.5">
          <motion.span className="text-[17px] font-semibold" initial={false} animate={{ opacity: collapsed ? 1 : 0, y: collapsed ? 0 : 6 }} transition={{ duration: 0.18 }}>
            {title}
          </motion.span>
          {right && <div className="absolute bottom-1.5 right-3">{right}</div>}
        </div>
      </div>
      <h1 className="font-title px-5 pt-[calc(var(--sat)+52px)] text-[2.125rem] leading-[1.05]">{title}</h1>
    </>
  );
}
