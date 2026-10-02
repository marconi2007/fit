-- Simula o mínimo do Supabase num PostgreSQL comum, só para os testes locais:
-- esquema auth com auth.users e auth.uid(), papéis anon/authenticated e as
-- permissões padrão que o Supabase dá a eles. Não rode isto no Supabase.
create schema if not exists auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin; end if;
end $$;

grant usage on schema public, auth, extensions to anon, authenticated, supabase_auth_admin;
grant execute on function auth.uid() to anon, authenticated;
grant insert, select on auth.users to supabase_auth_admin;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
