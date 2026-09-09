-- =====================================================================
-- ONYX 🧬 — Setup Supabase v7 (COMPLET & PROPRE)
-- =====================================================================
-- À exécuter dans Supabase Dashboard → SQL Editor → New query → Run
-- Idempotent : peut être relancé sans risque.
-- =====================================================================

-- ================================================================
-- 1) EXTENSIONS
-- ================================================================
create extension if not exists "pgcrypto";

-- ================================================================
-- 2) TABLES (ordre : profiles d'abord car référencée par les autres)
-- ================================================================

-- Profils utilisateurs (1 ligne par user auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sport text default 'MMA',
  niveau text default 'intermediaire',
  poids_kg numeric,
  taille_cm numeric,
  objectifs text,
  club_schedule jsonb default '[]'::jsonb,
  sync_token uuid unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists sync_token uuid unique default gen_random_uuid();
alter table public.profiles add column if not exists club_schedule jsonb default '[]'::jsonb;
update public.profiles set sync_token = gen_random_uuid() where sync_token is null;
update public.profiles set club_schedule = '[]'::jsonb where club_schedule is null;

-- Données de santé / récupération quotidiennes
create table if not exists public.health_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  sleep_hours numeric,
  hrv numeric,
  recovery_score numeric,
  fatigue integer,
  charge numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists health_data_user_date_idx on public.health_data(user_id, date desc);

-- Séances / workouts (incluant week_plan et auto)
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  sport text,
  type_seance text,
  program_json jsonb,
  status text default 'planifie',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists workouts_user_date_idx on public.workouts(user_id, date desc);

-- Retours de séance vocaux (RPA)
create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  transcript text,
  ai_analysis jsonb,
  created_at timestamptz not null default now()
);
create index if not exists feedback_user_idx on public.session_feedback(user_id, created_at desc);

-- Imports (liens vidéos, images, analyses)
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text,
  source_url text,
  description text,
  ai_analysis jsonb,
  created_at timestamptz not null default now()
);
create index if not exists imports_user_idx on public.imports(user_id, created_at desc);

-- Journal nutrition
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  meal_type text,
  name text,
  portion text,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists meals_user_date_idx on public.meals(user_id, date desc);

-- ================================================================
-- 3) ROW LEVEL SECURITY
-- ================================================================
alter table public.profiles         enable row level security;
alter table public.health_data      enable row level security;
alter table public.workouts         enable row level security;
alter table public.session_feedback enable row level security;
alter table public.imports          enable row level security;
alter table public.meals            enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- HEALTH DATA
drop policy if exists "health_select_own" on public.health_data;
create policy "health_select_own" on public.health_data for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "health_insert_own" on public.health_data;
create policy "health_insert_own" on public.health_data for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "health_update_own" on public.health_data;
create policy "health_update_own" on public.health_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "health_delete_own" on public.health_data;
create policy "health_delete_own" on public.health_data for delete to authenticated using ((select auth.uid()) = user_id);

-- WORKOUTS
drop policy if exists "workouts_select_own" on public.workouts;
create policy "workouts_select_own" on public.workouts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "workouts_insert_own" on public.workouts;
create policy "workouts_insert_own" on public.workouts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "workouts_update_own" on public.workouts;
create policy "workouts_update_own" on public.workouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "workouts_delete_own" on public.workouts;
create policy "workouts_delete_own" on public.workouts for delete to authenticated using ((select auth.uid()) = user_id);

-- SESSION FEEDBACK
drop policy if exists "feedback_select_own" on public.session_feedback;
create policy "feedback_select_own" on public.session_feedback for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "feedback_insert_own" on public.session_feedback;
create policy "feedback_insert_own" on public.session_feedback for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "feedback_update_own" on public.session_feedback;
create policy "feedback_update_own" on public.session_feedback for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "feedback_delete_own" on public.session_feedback;
create policy "feedback_delete_own" on public.session_feedback for delete to authenticated using ((select auth.uid()) = user_id);

-- IMPORTS
drop policy if exists "imports_select_own" on public.imports;
create policy "imports_select_own" on public.imports for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "imports_insert_own" on public.imports;
create policy "imports_insert_own" on public.imports for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "imports_update_own" on public.imports;
create policy "imports_update_own" on public.imports for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "imports_delete_own" on public.imports;
create policy "imports_delete_own" on public.imports for delete to authenticated using ((select auth.uid()) = user_id);

-- MEALS
drop policy if exists "meals_select_own" on public.meals;
create policy "meals_select_own" on public.meals for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "meals_insert_own" on public.meals;
create policy "meals_insert_own" on public.meals for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "meals_update_own" on public.meals;
create policy "meals_update_own" on public.meals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "meals_delete_own" on public.meals;
create policy "meals_delete_own" on public.meals for delete to authenticated using ((select auth.uid()) = user_id);

-- ================================================================
-- 4) TRIGGER auto-création profil à l'inscription
-- ================================================================
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
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================================
-- 5) RPC apple_health_sync — Sync depuis Apple Shortcut
-- Reçoit Health data + retourne le contexte user pour l'IA
-- ================================================================
drop function if exists public.apple_health_sync(uuid, numeric, numeric, numeric, integer, numeric);

create or replace function public.apple_health_sync(
  p_token uuid,
  p_sleep_hours numeric default null,
  p_hrv numeric default null,
  p_recovery_score numeric default null,
  p_fatigue integer default null,
  p_resting_hr numeric default null
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_today date := current_date;
  v_profile jsonb;
  v_recent jsonb;
begin
  select id into v_user_id from public.profiles where sync_token = p_token;
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  delete from public.health_data where user_id = v_user_id and date = v_today;
  insert into public.health_data (user_id, date, sleep_hours, hrv, recovery_score, fatigue, charge, notes)
  values (v_user_id, v_today, p_sleep_hours, p_hrv, p_recovery_score, p_fatigue, p_resting_hr, 'Synchronisé depuis Apple Health');

  select to_jsonb(p) - 'sync_token' into v_profile from public.profiles p where p.id = v_user_id;

  select coalesce(jsonb_agg(row_to_json(w)), '[]'::jsonb) into v_recent
  from (
    select date, sport, type_seance,
           program_json->>'intensite' as intensite,
           program_json->>'focus' as focus,
           program_json->>'duree_minutes' as duree
    from public.workouts
    where user_id = v_user_id and type_seance <> 'week_plan'
    order by created_at desc
    limit 5
  ) w;

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'date', v_today,
    'profile', v_profile,
    'recent_sessions', v_recent
  );
end;
$$;

grant execute on function public.apple_health_sync(uuid, numeric, numeric, numeric, integer, numeric) to anon, authenticated;

-- ================================================================
-- 6) RPC save_auto_workout — Sauve le programme auto-généré
-- ================================================================
drop function if exists public.save_auto_workout(uuid, text, jsonb);

create or replace function public.save_auto_workout(
  p_token uuid,
  p_sport text,
  p_program jsonb
) returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_today date := current_date;
begin
  select id into v_user_id from public.profiles where sync_token = p_token;
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;
  delete from public.workouts
    where user_id = v_user_id and date = v_today and type_seance in ('auto', 'ia_auto');
  insert into public.workouts (user_id, date, sport, type_seance, program_json, status)
  values (v_user_id, v_today, coalesce(p_sport, 'MMA'), 'auto', p_program, 'planifie');
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.save_auto_workout(uuid, text, jsonb) to anon, authenticated;

-- ================================================================
-- 7) VÉRIFICATIONS (facultatif — pour visualiser après exécution)
-- ================================================================
-- select table_name from information_schema.tables where table_schema = 'public' order by table_name;
-- select proname from pg_proc where pronamespace = 'public'::regnamespace order by proname;
