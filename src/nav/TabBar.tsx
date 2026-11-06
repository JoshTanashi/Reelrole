import { motion } from 'motion/react';
import { SparkleIcon, CardsIcon, DiceFiveIcon, BookmarksSimpleIcon, type Icon } from '@phosphor-icons/react';
import { useNav, type Tab } from '../store/nav';
import { spring } from '../design/motion';
import { haptics } from '../haptics/haptics';
import { play } from '../audio/synth';

const ITEMS: { id: Tab; label: string; Icon: Icon }[] = [
  { id: 'find', label: 'Find', Icon: SparkleIcon },
  { id: 'swipe', label: 'Swipe', Icon: CardsIcon },
  { id: 'roll', label: 'Roll', Icon: DiceFiveIcon },
  { id: 'library', label: 'Library', Icon: BookmarksSimpleIcon },
];

/** Floating glass tab bar with a sliding pill (HANDOVER §6.1). */
export function TabBar() {
  const { tab, setTab, tabBarHidden } = useNav();
  return (
    <>
      {/* Shared gradient paint for active icons. */}
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id="rr-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF2E4D" />
            <stop offset="0.55" stopColor="#E81CFF" />
            <stop offset="1" stopColor="#6A3BFF" />
          </linearGradient>
        </defs>
      </svg>
      <motion.nav
        aria-label="Tabs"
        className="glass fixed inset-x-4 z-40 flex h-16 items-stretch rounded-[32px] p-1.5"
        style={{ bottom: 'calc(var(--sab) + 8px)', boxShadow: 'var(--glass-highlight), 0 12px 40px -12px rgba(0,0,0,0.8)' }}
        initial={false}
        animate={{ y: tabBarHidden ? 'calc(100% + 40px)' : 0 }}
        transition={spring}
      >
        {ITEMS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              aria-label={label}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5"
              onClick={() => {
                haptics.selection();
                play('ui.tab');
                setTab(id);
              }}
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-[26px] border border-white/[0.07] bg-white/[0.09]"
                  transition={spring}
                />
              )}
              <motion.span className="relative" animate={{ scale: active ? 1 : 0.94 }} transition={spring}>
                <Icon size={25} weight={active ? 'fill' : 'regular'} color={active ? 'url(#rr-grad)' : 'rgba(246,243,250,0.62)'} />
              </motion.span>
              <span className={`relative text-[10.5px] font-semibold tracking-tight ${active ? 'text-hi' : 'text-lo'}`}>{label}</span>
            </button>
          );
        })}
      </motion.nav>
    </>
  );
}
