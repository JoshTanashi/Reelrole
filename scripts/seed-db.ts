// Seeds Supabase (HANDOVER §13 seed-questions): titles mirror + question bank + admin email.
// Run: npm run seed:db -- [admin-email]. Uses the Supabase Management API (token via env proxy or SUPABASE_TOKEN).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REF = process.env.SUPABASE_REF ?? 'yjbbtecdqhwxllgponls';
const root = join(import.meta.dirname, '..');
const token = process.env.SUPABASE_TOKEN ?? 'proxy-injected';

async function sql(query: string) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 500)}`);
  return text;
}

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

async function main() {
  const core = JSON.parse(readFileSync(join(root, 'public/catalogue/core.json'), 'utf8'));
  const rows = core.titles.map(
    (t: { id: number; kind: string; title: string; year: number | null; popularity: number }) =>
      `(${t.id}, ${Math.floor(t.id / 10)}, ${lit(t.kind)}, ${lit(t.title)}, ${lit(t.year)}, ${lit(t.popularity)})`,
  );
  for (let i = 0; i < rows.length; i += 1000) {
    await sql(
      `insert into titles (id, tmdb_id, kind, title, year, popularity) values ${rows.slice(i, i + 1000).join(',')}
       on conflict (id) do update set title = excluded.title, year = excluded.year, popularity = excluded.popularity, updated_at = now();`,
    );
  }
  console.log(`titles: ${rows.length}`);

  const seed = JSON.parse(readFileSync(join(root, 'data/questions.seed.json'), 'utf8'));
  const qs = [...seed.opening, ...seed.questions.filter((q: { generated?: boolean }) => !q.generated)];
  const qRows: string[] = [];
  const oRows: string[] = [];
  qs.forEach((q: Record<string, any>, k: number) => {
    qRows.push(
      `(${lit(q.id)}, ${lit(q.kind)}, ${lit(q.prompt)}, ${lit(q.subprompt)}, ${lit(q.groupKey ?? q.id)}, ${lit(q.requires)}, ${lit(q.after)}, ${lit(q.order)}, ${lit(q.combine)}, ${lit(q.slider)}, ${lit(q.reactionTag)}, ${k})`,
    );
    (q.options ?? []).forEach((o: Record<string, any>, j: number) =>
      oRows.push(`(${lit(q.id)}, ${lit(o.id)}, ${lit(o.label)}, ${lit(o.emoji)}, ${lit(o.swatch)}, ${lit(o.hard)}, ${lit(o.effects ?? [])}, ${lit(o.reactionTag)}, ${j})`),
    );
  });
  // Only insert questions that don't exist yet, so /admin edits are never overwritten by a re-seed.
  await sql(`
    insert into questions (id, kind, prompt, subprompt, group_key, requires, after_n, opening, combine, slider, reaction_tag, sort)
    values ${qRows.join(',')} on conflict (id) do nothing;
    insert into question_options (question_id, option_id, label, emoji, swatch, hard, effects, reaction_tag, sort)
    values ${oRows.join(',')} on conflict (question_id, option_id) do nothing;`);
  console.log(`questions: ${qRows.length} · options: ${oRows.length}`);

  const admin = process.argv[2];
  if (admin) {
    await sql(`insert into admin_emails (email) values (${lit(admin.toLowerCase())}) on conflict do nothing;`);
    console.log(`admin: ${admin}`);
  }
  console.log(await sql(`select (select count(*) from titles) titles, (select count(*) from questions) questions, (select count(*) from question_options) options, (select value from app_config where key='questions_version') version;`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
