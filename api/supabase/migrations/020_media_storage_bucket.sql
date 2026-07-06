-- Migration 020: Public storage bucket for gallery media uploads
-- ponytail: hosted-Supabase only — the local docker stack is Postgres + PostgREST
-- with no Storage service, so gallery upload is untestable on docker. Guarded so
-- the migration is a no-op (instead of a hard failure) on plain Postgres.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('wedding-media', 'wedding-media', true)
    on conflict do nothing;
  end if;
end $$;
