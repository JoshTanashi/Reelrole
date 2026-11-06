// Background sync to Supabase (HANDOVER §7.5 local-first, §12 logging). Phone stays the source of truth;
// everything here is best-effort, idempotent, and silent when offline.
import { supabase, ensureUser } from './supabase';
import { refreshQuestions, refreshCorrections } from './remote';
import { useLibrary } from '../store/library';
import { useSwipe } from '../features/swipe/store';
import { useTaste } from '../store/taste';
import { usePrefs } from '../store/prefs';

const MARK = 'reelrole.sync.v1';
const FEEDBACK = 'reelrole.feedback.outbox.v1';
const HISTORY = 'reelrole.find.history.v1';

interface Marks { library: number; swipes: number; sessions: number; prefs: number }

const read = <T,>(k: string, d: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(k) ?? 'null') as T) ?? d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

export function queueTraitFeedback(rows: { title_id: number; trait: string; delta: number }[]) {
  if (!rows.length) return;
  write(FEEDBACK, [...read<typeof rows>(FEEDBACK, []), ...rows].slice(-500));
}

let running: Promise<void> | null = null;

export function syncNow(): Promise<void> {
  running ??= (async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      const uid = await ensureUser();
      if (!uid) return;
      const marks = read<Marks>(MARK, { library: 0, swipes: 0, sessions: 0, prefs: 0 });
      const now = Date.now();

      // Library (user_titles)
      const items = Object.entries(useLibrary.getState().items).filter(([, u]) => u.updatedAt > marks.library);
      if (items.length) {
        const { error } = await supabase.from('user_titles').upsert(
          items.map(([id, u]) => ({
            title_id: Number(id),
            on_list: u.onList,
            liked: u.liked,
            watched: u.watched,
            watched_at: u.watchedAt ? new Date(u.watchedAt).toISOString() : null,
            my_rating: u.myRating,
            not_for_me: u.notForMe,
            updated_at: new Date(u.updatedAt).toISOString(),
          })),
        );
        if (!error) marks.library = Math.max(...items.map(([, u]) => u.updatedAt));
      }

      // Swipes
      const swipes = useSwipe.getState().log.filter((l) => l.at > marks.swipes);
      if (swipes.length) {
        const { error } = await supabase
          .from('swipes')
          .upsert(swipes.map((l) => ({ title_id: l.id, direction: l.dir, created_at: new Date(l.at).toISOString() })), { ignoreDuplicates: true });
        if (!error) marks.swipes = Math.max(...swipes.map((l) => l.at));
      }

      // Find sessions + answers
      const logs = read<{ logs: SessionLog[] }>(HISTORY, { logs: [] }).logs.filter((l) => l.id && l.at > marks.sessions);
      for (const l of logs) {
        const { error } = await supabase.from('sessions').upsert({
          id: l.id,
          mode: 'find',
          kind_filter: l.kind ?? null,
          started_at: l.startedAt ? new Date(l.startedAt).toISOString() : null,
          ended_at: new Date(l.at).toISOString(),
          winner_title_id: l.winner,
          runner_up_ids: l.runnersUp ?? [],
          rejected_ids: l.rejected ?? [],
          questions_asked: l.steps.length,
          outcome: l.outcome,
        });
        if (error) break;
        if (l.steps.length) {
          await supabase.from('session_answers').upsert(
            l.steps.map((s, idx) => ({
              session_id: l.id,
              idx,
              question_id: s.qid,
              answer_label: s.answer,
              alive_before: s.aliveBefore,
              alive_after: s.aliveAfter,
              ms_to_answer: s.ms,
            })),
          );
        }
        marks.sessions = l.at;
      }

      // Crowd trait feedback
      const fb = read<{ title_id: number; trait: string; delta: number }[]>(FEEDBACK, []);
      if (fb.length) {
        const { error } = await supabase.from('trait_feedback').insert(fb);
        if (!error) write(FEEDBACK, []);
      }

      // Prefs + taste (at most hourly)
      if (now - marks.prefs > 3600_000) {
        const p = usePrefs.getState();
        const { error } = await supabase.from('user_prefs').upsert({
          sound: p.sound,
          haptics: p.haptics,
          reduced_motion: p.reducedMotion,
          taste: { vec: useTaste.getState().vec, version: useTaste.getState().version },
          updated_at: new Date().toISOString(),
        });
        if (!error) marks.prefs = now;
      }
      write(MARK, marks);

      // Pull: live questions + crowd corrections (used from the next session / boot).
      await refreshQuestions(uid);
      await refreshCorrections();
    } catch {
      /* offline or transient: try again next time */
    } finally {
      running = null;
    }
  })();
  return running;
}

interface SessionLog {
  id: string;
  at: number;
  startedAt?: number;
  kind?: string;
  steps: { qid: string; answer: string; aliveBefore: number; aliveAfter: number; ms: number }[];
  winner: number | null;
  runnersUp?: number[];
  rejected?: number[];
  outcome: string;
}

/** Boot + lifecycle wiring: sync on launch, when the app goes to the background, and after library edits. */
export function startSync() {
  void syncNow();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void syncNow();
  });
  let t: number | undefined;
  useLibrary.subscribe(() => {
    clearTimeout(t);
    t = window.setTimeout(() => void syncNow(), 5000);
  });
}
