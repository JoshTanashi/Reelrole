import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { GearSixIcon } from '@phosphor-icons/react';
import { Screen } from '../../nav/Screen';
import { LargeTitle } from '../../nav/LargeTitle';
import { useCatalogue } from '../../data/useCatalogue';
import { spring } from '../../design/motion';
import { haptics } from '../../haptics/haptics';
import { voiceSession } from '../../voice/reactions';
import { PosterRow } from './Rows';
import { browseRows } from './browse';

const SEGMENTS = [
  { id: 'list', label: 'My List', empty: 'emptyList' },
  { id: 'liked', label: 'Liked', empty: 'emptyLiked' },
  { id: 'watched', label: 'Watched', empty: 'emptyWatched' },
  { id: 'nope', label: 'Not for me', empty: 'emptyList' },
] as const;

export function LibraryScreen() {
  const cat = useCatalogue();
  const [seg, setSeg] = useState<(typeof SEGMENTS)[number]['id']>('list');
  const rows = useMemo(() => (cat ? browseRows(cat) : []), [cat]);
  const empties = useMemo(() => Object.fromEntries(SEGMENTS.map((s) => [s.id, voiceSession.say(s.empty)])), []);

  return (
    <Screen tab="library" hideBarOnScroll>
      {(ref) => (
        <div className="pb-[calc(var(--sab)+110px)]">
          <LargeTitle
            title="Library"
            scrollRef={ref}
            right={
              <button aria-label="Settings" className="grid h-9 w-9 place-items-center rounded-full text-mid" onClick={() => haptics.light()}>
                <GearSixIcon size={23} />
              </button>
            }
          />

          {/* Segmented control */}
          <div className="mx-5 mt-4 flex rounded-full border border-line bg-white/[0.04] p-1">
            {SEGMENTS.map((s) => (
              <button
                key={s.id}
                className="relative h-9 flex-1 text-[13px] font-semibold"
                onClick={() => {
                  haptics.selection();
                  setSeg(s.id);
                }}
              >
                {seg === s.id && <motion.span layoutId="lib-seg" className="absolute inset-0 rounded-full bg-white/[0.12]" transition={spring} />}
                <span className={`relative ${seg === s.id ? 'text-hi' : 'text-lo'}`}>{s.label}</span>
              </button>
            ))}
          </div>

          <motion.div
            key={seg}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="mx-5 mt-4 grid h-36 place-items-center rounded-card border border-dashed border-white/10 text-center"
          >
            <p className="px-8 text-[15px] text-mid">{empties[seg]}</p>
          </motion.div>

          {cat && rows.map((r) => <PosterRow key={r.title} cat={cat} title={r.title} indices={r.items} numbered={'numbered' in r && r.numbered} />)}
        </div>
      )}
    </Screen>
  );
}
