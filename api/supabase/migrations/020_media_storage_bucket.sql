-- Migration 020: Public storage bucket for gallery media uploads
-- ponytail: hosted-Supabase only — the local docker stack is Postgres + PostgREST
-- with no Storage service, so gallery upload is untestable on docker.
insert into storage.buckets (id, name, public)
values ('wedding-media', 'wedding-media', true)
on conflict do nothing;
