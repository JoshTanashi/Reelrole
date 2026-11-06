import { createClient } from '@supabase/supabase-js';

/** Public project URL + publishable key (safe to ship: RLS protects every table). */
export const SUPABASE_URL = 'https://yjbbtecdqhwxllgponls.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_bKt9EG9pMnWBAXdpvS6b-Q_rKkxsGHr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** HANDOVER §7.5: anonymous sign-in on first launch (upgradeable later). Never throws. */
export async function ensureUser(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const r = await supabase.auth.signInAnonymously();
    return r.data.user?.id ?? null;
  } catch {
    return null;
  }
}
