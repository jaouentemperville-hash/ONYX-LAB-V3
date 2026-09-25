-- =====================================================================
-- ONYX 🧬 — Migration v8 (à exécuter dans Supabase → SQL Editor → Run)
-- Idempotent : peut être relancée sans risque.
-- Corrige : tables one_rm/progress_photos manquantes, type club_schedule,
--           colonnes profil manquantes, et le bug "Database error creating
--           new user" (inscription) via un trigger robuste.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) PROFILES — colonnes manquantes (façon Zepp / Google Health)
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists poids_objectif_kg numeric;
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists sexe text;
alter table public.profiles add column if not exists niveau_activite text default 'modere';
alter table public.profiles add column if not exists sync_token uuid unique default gen_random_uuid();
update public.profiles set sync_token = gen_random_uuid() where sync_token is null;

-- ---------------------------------------------------------------------
-- 2) CLUB_SCHEDULE — forcer le type jsonb (corrige le bug d'inscription)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='club_schedule'
  ) then
    alter table public.profiles add column club_schedule jsonb default '[]'::jsonb;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name='club_schedule' and data_type <> 'jsonb'
  ) then
    alter table public.profiles alter column club_schedule drop default;
    alter table public.profiles alter column club_schedule type jsonb using (
      case when club_schedule is null then '[]'::jsonb else to_jsonb(club_schedule) end
    );
    alter table public.profiles alter column club_schedule set default '[]'::jsonb;
  end if;
end $$;
update public.profiles set club_schedule = '[]'::jsonb where club_schedule is null;

-- ---------------------------------------------------------------------
-- 3) ONE_RM — suivi des maxis force (historique)
-- ---------------------------------------------------------------------
create table if not exists public.one_rm (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  exercise text not null,
  value_kg numeric not null,
  reps integer default 1,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists one_rm_user_idx on public.one_rm(user_id, exercise, date desc);

-- ---------------------------------------------------------------------
-- 4) PROGRESS_PHOTOS — photos de progression / physique cible
-- ---------------------------------------------------------------------
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  kind text default 'progress',
  image_data text not null,
  mime_type text default 'image/jpeg',
  ai_analysis jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists progress_photos_user_idx on public.progress_photos(user_id, kind, date desc);

-- ---------------------------------------------------------------------
-- 5) RLS pour les nouvelles tables
-- ---------------------------------------------------------------------
alter table public.one_rm          enable row level security;
alter table public.progress_photos enable row level security;

drop policy if exists "one_rm_select_own" on public.one_rm;
create policy "one_rm_select_own" on public.one_rm for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "one_rm_insert_own" on public.one_rm;
create policy "one_rm_insert_own" on public.one_rm for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "one_rm_update_own" on public.one_rm;
create policy "one_rm_update_own" on public.one_rm for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "one_rm_delete_own" on public.one_rm;
create policy "one_rm_delete_own" on public.one_rm for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "photos_select_own" on public.progress_photos;
create policy "photos_select_own" on public.progress_photos for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "photos_insert_own" on public.progress_photos;
create policy "photos_insert_own" on public.progress_photos for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "photos_update_own" on public.progress_photos;
create policy "photos_update_own" on public.progress_photos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "photos_delete_own" on public.progress_photos;
create policy "photos_delete_own" on public.progress_photos for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 6) TRIGGER robuste auto-création du profil (répare l'inscription)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Ne jamais bloquer la création du compte auth si le profil échoue
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- FIN. Vérifie que one_rm et progress_photos apparaissent dans Tables.
-- =====================================================================
