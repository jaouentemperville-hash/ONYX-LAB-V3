-- =====================================================================
-- Coach IA - Configuration Supabase (à exécuter dans SQL Editor)
-- =====================================================================
-- Ce script crée les tables et Row Level Security (RLS) strictes.
-- Chaque utilisateur ne voit et ne modifie QUE ses propres données.
-- =====================================================================

-- 1) PROFILS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sport text default 'MMA',
  niveau text default 'intermediaire',
  poids_kg numeric,
  taille_cm numeric,
  objectifs text,
  created_at timestamptz not null default now()
);

-- 2) DONNEES DE SANTE / RECUPERATION QUOTIDIENNES
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

-- 3) SEANCES / WORKOUTS
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

-- 4) RETOURS DE SEANCE (RPA)
create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  transcript text,
  ai_analysis jsonb,
  created_at timestamptz not null default now()
);
create index if not exists feedback_user_idx on public.session_feedback(user_id, created_at desc);

-- 5) IMPORTS (liens vidéos, images)
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

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.health_data      enable row level security;
alter table public.workouts         enable row level security;
alter table public.session_feedback enable row level security;
alter table public.imports          enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

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
drop policy if exists "workouts_all_own" on public.workouts;
create policy "workouts_select_own" on public.workouts for select to authenticated using ((select auth.uid()) = user_id);
create policy "workouts_insert_own" on public.workouts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "workouts_update_own" on public.workouts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "workouts_delete_own" on public.workouts for delete to authenticated using ((select auth.uid()) = user_id);

-- SESSION FEEDBACK
create policy "feedback_select_own" on public.session_feedback for select to authenticated using ((select auth.uid()) = user_id);
create policy "feedback_insert_own" on public.session_feedback for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "feedback_update_own" on public.session_feedback for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "feedback_delete_own" on public.session_feedback for delete to authenticated using ((select auth.uid()) = user_id);

-- IMPORTS
create policy "imports_select_own" on public.imports for select to authenticated using ((select auth.uid()) = user_id);
create policy "imports_insert_own" on public.imports for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "imports_update_own" on public.imports for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "imports_delete_own" on public.imports for delete to authenticated using ((select auth.uid()) = user_id);

-- =====================================================================
-- TRIGGER auto-création du profil à l'inscription
-- =====================================================================
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

-- =====================================================================
-- v3: Journal Nutrition
-- =====================================================================
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

alter table public.meals enable row level security;
create policy "meals_select_own" on public.meals for select to authenticated using ((select auth.uid()) = user_id);
create policy "meals_insert_own" on public.meals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "meals_update_own" on public.meals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "meals_delete_own" on public.meals for delete to authenticated using ((select auth.uid()) = user_id);
