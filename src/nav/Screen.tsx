import { useEffect, useRef, type ReactNode } from 'react';
import { useNav, type Tab } from '../store/nav';

/**
 * A tab's own scroll container. Stays mounted when inactive (keeps scroll + state),
 * scrolls to top when its tab is re-tapped, and can hide the tab bar on scroll-down.
 */
export function Screen({ tab, children, hideBarOnScroll = false, className = '' }: { tab: Tab; children: (scrollRef: React.RefObject<HTMLDivElement | null>) => ReactNode; hideBarOnScroll?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useNav((s) => s.tab === tab);
  const reset = useNav((s) => s.reset[tab]);
  const setHidden = useNav((s) => s.setTabBarHidden);
  const last = useRef(0);

  useEffect(() => {
    if (reset) ref.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [reset]);

  return (
    <div
      ref={ref}
      aria-hidden={!active}
      className={`no-scrollbar absolute inset-0 overflow-y-auto overscroll-contain transition-opacity duration-200 ${active ? 'opacity-100' : 'pointer-events-none invisible opacity-0'} ${className}`}
      onScroll={(e) => {
        if (!hideBarOnScroll || !active) return;
        const y = e.currentTarget.scrollTop;
        const dy = y - last.current;
        if (Math.abs(dy) > 6) {
          setHidden(dy > 0 && y > 120);
          last.current = y;
        }
      }}
    >
      {children(ref)}
    </div>
  );
}
