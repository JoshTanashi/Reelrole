import { useState } from 'react';
import { motion } from 'motion/react';
import { Sheet } from '../../nav/Sheet';
import { usePrefs } from '../../store/prefs';
import { useLibrary } from '../../store/library';
import { useCatalogue } from '../../data/useCatalogue';
import { haptics } from '../../haptics/haptics';
import { spring } from '../../design/motion';

/** Settings + About (HANDOVER §9.7, attributions per §7.1). */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePrefs();
  const clear = useLibrary((s) => s.clear);
  const count = useLibrary((s) => Object.keys(s.items).length);
  const cat = useCatalogue();
  const [confirm, setConfirm] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} label="Settings">
      <div className="px-5 pt-9">
        <h2 className="font-title text-[2rem]">Settings</h2>

        <Group title="Feel">
          <Toggle label="Sound" sub="Coming with the sound pack" value={p.sound} onChange={(v) => p.set({ sound: v })} />
          <Toggle label="Haptics" sub="Native app only on iPhone" value={p.haptics} onChange={(v) => p.set({ haptics: v })} />
          <Toggle label="Reduce motion" sub="Calmer animations, no drifting" value={p.reducedMotion} onChange={(v) => p.set({ reducedMotion: v })} />
        </Group>

        <Group title="Your data">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-[15px]">Clear my library</div>
              <div className="text-xs text-lo">{count} title{count === 1 ? '' : 's'} saved on this phone</div>
            </div>
            <button
              className={`h-9 rounded-full px-4 text-sm font-semibold ${confirm ? 'bg-no text-white' : 'border border-line text-mid'}`}
              onClick={() => {
                haptics.medium();
                if (!confirm) return setConfirm(true);
                clear();
                setConfirm(false);
              }}
            >
              {confirm ? 'Sure? Tap again' : 'Clear'}
            </button>
          </div>
        </Group>

        <Group title="About">
          <p className="py-3 text-[15px] text-mid">
            <span className="font-wordmark text-hi">reelrole</span> · Roll for tonight.
          </p>
          <p className="py-2 text-sm leading-relaxed text-mid">
            This product uses the TMDB API but is not endorsed or certified by TMDB. Title data and images from{' '}
            <a className="text-hi underline" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
              The Movie Database (TMDB)
            </a>
            .
          </p>
          <p className="py-2 text-sm leading-relaxed text-mid">
            Where-to-watch data in South Africa provided by{' '}
            <a className="text-hi underline" href="https://www.justwatch.com" target="_blank" rel="noreferrer">
              JustWatch
            </a>
            .
          </p>
          <p className="py-3 text-xs text-lo">Catalogue {cat?.version ?? '…'} · {cat?.titles.length.toLocaleString() ?? '…'} titles · Region ZA</p>
        </Group>
      </div>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-lo">{title}</h3>
      <div className="mt-2 divide-y divide-white/[0.06] rounded-card border border-line bg-white/[0.03] px-4">{children}</div>
    </section>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      className="flex w-full items-center justify-between py-3 text-left"
      role="switch"
      aria-checked={value}
      onClick={() => {
        haptics.selection();
        onChange(!value);
      }}
    >
      <div>
        <div className="text-[15px]">{label}</div>
        {sub && <div className="text-xs text-lo">{sub}</div>}
      </div>
      <span className={`relative h-[31px] w-[51px] rounded-full transition-colors ${value ? 'bg-yes' : 'bg-white/15'}`}>
        <motion.span className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow" animate={{ left: value ? 22 : 2 }} transition={spring} />
      </span>
    </button>
  );
}
