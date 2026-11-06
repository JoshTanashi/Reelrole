import { useEffect, useMemo, useState } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../../data/supabase';
import { loadCatalogue, type Catalogue } from '../../data/catalogue';
import { likelihood } from '../../engine/likelihood';

// Separate auth storage so signing in here never touches the app's anonymous user.
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: 'reelrole-admin', persistSession: true, detectSessionInUrl: true } });

interface QRow {
  id: string; kind: string; prompt: string; subprompt: string | null; group_key: string; active: boolean; weight: number;
  opening: number | null; sort: number; variant: string | null;
}
interface ORow { question_id: string; option_id: string; label: string; emoji: string | null; effects: unknown; reaction_tag: string | null; sort: number }
interface Stat { question_id: string; asked: number; avg_gain: number; dropoff: number; median_ms: number; acceptance: number; slow: boolean }

/** /admin (HANDOVER §12.6): question list with learned stats, live editing, split preview. */
export function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) return setAdmin(null);
    db.rpc('is_admin').then(({ data }) => setAdmin(!!data));
  }, [session]);

  return (
    <div className="min-h-dvh bg-bg-0 px-4 pb-20 pt-[calc(var(--sat)+16px)] text-hi md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="font-wordmark text-[1.6rem]">
            reelrole <span className="font-ui text-base font-semibold text-mid">admin</span>
          </h1>
          {session && (
            <button className="text-sm text-mid underline" onClick={() => db.auth.signOut()}>
              Sign out
            </button>
          )}
        </div>
        {!session ? <SignIn /> : admin === null ? <p className="mt-10 text-mid">Checking…</p> : admin ? <Dashboard /> : <p className="mt-10 text-mid">{session.user.email} isn't an admin.</p>}
      </div>
    </div>
  );
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  return (
    <div className="mt-16 max-w-sm">
      <h2 className="font-title text-[2rem]">Sign in</h2>
      {sent ? (
        <p className="mt-3 text-mid">Check {email} for the magic link, then open it on this device.</p>
      ) : (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr('');
            const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/admin`, shouldCreateUser: true } });
            if (error) setErr(error.message);
            else setSent(true);
          }}
        >
          <input className="h-12 rounded-xl bg-white/[0.08] px-4 outline-none" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="h-12 rounded-full bg-ember font-bold text-white">Email me a link</button>
          {err && <p className="text-sm text-no">{err}</p>}
        </form>
      )}
    </div>
  );
}

function Dashboard() {
  const [qs, setQs] = useState<QRow[]>([]);
  const [os, setOs] = useState<ORow[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [msg, setMsg] = useState('');
  const [sessions, setSessions] = useState<{ n: number; accepted: number } | null>(null);

  const load = async () => {
    const [a, b, c, d, s] = await Promise.all([
      db.from('questions').select('*').order('sort'),
      db.from('question_options').select('*').order('sort'),
      db.from('question_stats').select('*'),
      db.from('app_config').select('value').eq('key', 'questions_version').maybeSingle(),
      db.from('sessions').select('outcome').gte('ended_at', new Date(Date.now() - 7 * 864e5).toISOString()),
    ]);
    setQs((a.data ?? []) as QRow[]);
    setOs((b.data ?? []) as ORow[]);
    setStats(Object.fromEntries(((c.data ?? []) as Stat[]).map((x) => [x.question_id, x])));
    setVersion(Number(d.data?.value ?? 0));
    const rows = (s.data ?? []) as { outcome: string }[];
    setSessions({ n: rows.length, accepted: rows.filter((r) => r.outcome === 'accepted').length });
  };
  useEffect(() => {
    void load();
    void loadCatalogue().then(setCat);
  }, []);

  const bump = async () => {
    await db.from('app_config').update({ value: version + 1, updated_at: new Date().toISOString() }).eq('key', 'questions_version');
    setVersion(version + 1);
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Questions" value={`${qs.filter((q) => q.active).length} / ${qs.length} live`} />
        <Kpi label="Sessions (7 days)" value={sessions ? String(sessions.n) : '…'} />
        <Kpi label="Reveal acceptance (7d)" value={sessions?.n ? `${Math.round((100 * sessions.accepted) / sessions.n)}%` : '–'} />
        <Kpi label="Question bank version" value={`v${version}`} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-full border border-line px-4 text-sm font-semibold"
          onClick={async () => {
            const { data, error } = await db.rpc('admin_learn');
            setMsg(error ? error.message : `Learning ran: ${JSON.stringify(data)}`);
            void load();
          }}
        >
          Run learning now
        </button>
        <span className="text-sm text-mid">{msg || 'Runs automatically every night at 02:00.'}</span>
      </div>

      <div className="mt-6 overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-lo">
            <tr>
              <th className="p-3">Question</th>
              <th className="p-3">Weight</th>
              <th className="p-3">Asked</th>
              <th className="p-3">Gain (bits)</th>
              <th className="p-3">Drop-off</th>
              <th className="p-3">Accepted</th>
              <th className="p-3">Median time</th>
              <th className="p-3">Live</th>
            </tr>
          </thead>
          <tbody>
            {qs.map((q) => {
              const st = stats[q.id];
              return (
                <tr key={q.id} className="cursor-pointer border-t border-line hover:bg-white/[0.03]" onClick={() => setOpen(q.id)}>
                  <td className="p-3">
                    <div className="font-semibold">{q.prompt}</div>
                    <div className="text-xs text-lo">
                      {q.id} · {q.kind}
                      {q.opening !== null ? ' · opening' : ''}
                      {q.variant ? ` · variant ${q.variant}` : ''}
                    </div>
                  </td>
                  <td className="p-3 tabular">{Number(q.weight).toFixed(2)}</td>
                  <td className="p-3 tabular">{st?.asked ?? 0}</td>
                  <td className="p-3 tabular">{st ? Number(st.avg_gain).toFixed(2) : '–'}</td>
                  <td className="p-3 tabular">{st ? `${Math.round(Number(st.dropoff) * 100)}%` : '–'}</td>
                  <td className="p-3 tabular">{st ? `${Math.round(Number(st.acceptance) * 100)}%` : '–'}</td>
                  <td className={`p-3 tabular ${st?.slow ? 'text-maybe' : ''}`}>{st ? `${(st.median_ms / 1000).toFixed(1)}s${st.slow ? ' ⚠︎' : ''}` : '–'}</td>
                  <td className="p-3">{q.active ? '●' : '○'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-lo">Weights move nightly once a question has 20+ answers. ⚠︎ = median answer time over 6s (copy may be confusing).</p>

      {open && (
        <Editor
          key={open}
          q={qs.find((x) => x.id === open)!}
          options={os.filter((o) => o.question_id === open)}
          cat={cat}
          onClose={() => setOpen(null)}
          onSaved={async () => {
            await bump();
            await load();
            setMsg('Saved. Phones pick it up on their next launch.');
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-white/[0.03] p-4">
      <div className="text-xs uppercase tracking-wider text-lo">{label}</div>
      <div className="font-title mt-1 text-[1.6rem]">{value}</div>
    </div>
  );
}

function Editor({ q, options, cat, onClose, onSaved }: { q: QRow; options: ORow[]; cat: Catalogue | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ prompt: q.prompt, subprompt: q.subprompt ?? '', weight: String(q.weight), active: q.active, variant: q.variant ?? '' });
  const [opts, setOpts] = useState(options.map((o) => ({ ...o, effectsText: JSON.stringify(o.effects, null, 1) })));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Split preview: share of the (popularity-weighted) catalogue that each answer favours.
  const split = useMemo(() => {
    if (!cat) return null;
    const K = cat.traitKeys.length;
    const parsed = opts.map((o) => {
      try {
        const e = JSON.parse(o.effectsText) as { trait: string; op: string; value?: number; strength: number }[];
        return e.map((x) => ({ j: cat.traitIndex.get(x.trait) ?? -1, op: x.op as never, value: x.value ?? 0.5, strength: x.strength })).filter((x) => x.j >= 0);
      } catch {
        return null;
      }
    });
    if (parsed.some((p) => p === null)) return null;
    const live = parsed.map((p, k) => ({ p: p!, k })).filter((x) => x.p.length);
    if (!live.length) return [];
    const mass = live.map(() => 0);
    for (let i = 0; i < cat.titles.length; i++) {
      const prior = Math.pow(Math.max(1, cat.titles[i]!.popularity), 0.35);
      live.forEach((x, a) => (mass[a]! += prior * likelihood(x.p, cat.traits, i, K)));
    }
    const z = mass.reduce((a, b) => a + b, 0);
    return live.map((x, a) => ({ label: opts[x.k]!.label, pct: Math.round((100 * mass[a]!) / z) }));
  }, [cat, opts]);

  const save = async () => {
    setErr('');
    const w = Number(form.weight);
    if (!(w >= 0.1 && w <= 3)) return setErr('Weight must be between 0.1 and 3.');
    let parsed: unknown[];
    try {
      parsed = opts.map((o) => JSON.parse(o.effectsText));
    } catch {
      return setErr('One of the effects boxes is not valid JSON.');
    }
    setSaving(true);
    const a = await db
      .from('questions')
      .update({ prompt: form.prompt, subprompt: form.subprompt || null, weight: w, active: form.active, variant: form.variant || null, updated_at: new Date().toISOString() })
      .eq('id', q.id);
    if (a.error) {
      setSaving(false);
      return setErr(a.error.message);
    }
    for (let k = 0; k < opts.length; k++) {
      const o = opts[k]!;
      const r = await db
        .from('question_options')
        .update({ label: o.label, emoji: o.emoji || null, reaction_tag: o.reaction_tag || null, effects: parsed[k] })
        .eq('question_id', q.id)
        .eq('option_id', o.option_id);
      if (r.error) {
        setSaving(false);
        return setErr(r.error.message);
      }
    }
    setSaving(false);
    onSaved();
  };

  const input = 'h-11 w-full rounded-xl bg-white/[0.08] px-3 outline-none';
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 md:p-10" onClick={onClose}>
      <div className="mx-auto max-w-3xl rounded-sheet bg-bg-1 p-5 md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-lo">
              {q.id} · {q.kind} · group {q.group_key}
            </div>
            <h2 className="font-title mt-1 text-[1.6rem]">Edit question</h2>
          </div>
          <button className="text-mid" onClick={onClose}>
            Close
          </button>
        </div>
        <label className="mt-4 block text-xs text-lo">Prompt</label>
        <input className={input} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
        <label className="mt-3 block text-xs text-lo">Subprompt</label>
        <input className={input} value={form.subprompt} onChange={(e) => setForm({ ...form, subprompt: e.target.value })} />
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-lo">Weight (0.4–1.6 learned)</label>
            <input className={input} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-lo">A/B variant (blank = all, a, b)</label>
            <input className={input} value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} />
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Live
          </label>
        </div>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-lo">Options</h3>
        <div className="mt-2 space-y-3">
          {opts.map((o, k) => (
            <div key={o.option_id} className="rounded-card border border-line p-3">
              <div className="grid grid-cols-[60px_1fr_140px] gap-2">
                <input className={input} value={o.emoji ?? ''} placeholder="emoji" onChange={(e) => setOpts(opts.map((x, i) => (i === k ? { ...x, emoji: e.target.value } : x)))} />
                <input className={input} value={o.label} onChange={(e) => setOpts(opts.map((x, i) => (i === k ? { ...x, label: e.target.value } : x)))} />
                <input className={input} value={o.reaction_tag ?? ''} placeholder="reaction tag" onChange={(e) => setOpts(opts.map((x, i) => (i === k ? { ...x, reaction_tag: e.target.value } : x)))} />
              </div>
              <textarea
                className="mt-2 h-24 w-full rounded-xl bg-white/[0.06] p-3 font-mono text-xs outline-none"
                value={o.effectsText}
                onChange={(e) => setOpts(opts.map((x, i) => (i === k ? { ...x, effectsText: e.target.value } : x)))}
              />
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-card border border-line bg-white/[0.03] p-3 text-sm">
          <span className="text-lo">Split preview: </span>
          {split === null ? 'fix the JSON to preview' : split.length ? split.map((s) => `${s.label} ${s.pct}%`).join(' · ') : 'no effects (neutral)'}
        </div>
        {err && <p className="mt-3 text-sm text-no">{err}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button className="h-11 rounded-full border border-line px-5" onClick={onClose}>
            Cancel
          </button>
          <button disabled={saving} className="h-11 rounded-full bg-ember px-6 font-bold text-white disabled:opacity-50" onClick={save}>
            {saving ? 'Saving…' : 'Save & publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
