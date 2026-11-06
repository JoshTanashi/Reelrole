-- learn() runs nightly via pg_cron; admins can also trigger it from /admin.
revoke execute on function learn() from public, anon, authenticated;
create or replace function admin_learn() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admins only'; end if;
  return learn();
end $$;
revoke execute on function admin_learn() from public, anon;
grant execute on function admin_learn() to authenticated;
grant execute on function is_admin() to anon, authenticated;
