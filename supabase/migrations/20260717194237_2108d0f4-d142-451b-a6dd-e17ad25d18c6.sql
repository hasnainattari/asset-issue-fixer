
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles own insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using (id = auth.uid());

-- roles
create type public.app_role as enum ('admin','technician');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own role" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "admin reads all roles" on public.user_roles for select to authenticated using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin'));

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- new user trigger
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare
  requested text;
  final_role public.app_role;
begin
  requested := new.raw_user_meta_data->>'role';
  final_role := case when requested in ('admin','technician') then requested::public.app_role else 'technician'::public.app_role end;
  insert into public.profiles(id, full_name, email) values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  insert into public.user_roles(user_id, role) values (new.id, final_role);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- assets
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  asset_code text not null unique,
  name text not null,
  category text,
  location text,
  condition text,
  status text not null default 'operational',
  assigned_technician_id uuid references auth.users(id) on delete set null,
  last_service_date date,
  next_service_date date,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
grant select, insert, update, delete on public.assets to authenticated;
grant all on public.assets to service_role;
alter table public.assets enable row level security;
create policy "assets staff read" on public.assets for select to authenticated using (true);
create policy "assets admin write" on public.assets for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "assets admin update" on public.assets for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "assets admin delete" on public.assets for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- public asset view
create view public.public_assets with (security_invoker=true) as
  select id, asset_code, name, category, location, condition, status, last_service_date, next_service_date from public.assets;
grant select on public.public_assets to anon, authenticated;
create policy "assets anon public view" on public.assets for select to anon using (true);

-- issues
create sequence if not exists public.issue_seq;
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  issue_number text not null unique default ('ISS-' || lpad(nextval('public.issue_seq')::text, 5, '0')),
  asset_id uuid not null references public.assets(id) on delete cascade,
  title text not null,
  description text,
  category text,
  priority text not null default 'medium',
  status text not null default 'reported',
  reporter_name text,
  reporter_contact text,
  assigned_technician_id uuid references auth.users(id) on delete set null,
  ai_suggested_title text,
  ai_suggested_category text,
  ai_suggested_priority text,
  ai_possible_causes jsonb,
  ai_initial_checks jsonb,
  ai_was_edited boolean default false,
  evidence_urls text[],
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert on public.issues to anon;
grant all on public.issues to service_role;
alter table public.issues enable row level security;
create policy "issues anon insert" on public.issues for insert to anon with check (true);
create policy "issues anon select" on public.issues for select to anon using (true);
create policy "issues staff select" on public.issues for select to authenticated using (true);
create policy "issues staff insert" on public.issues for insert to authenticated with check (true);
create policy "issues staff update" on public.issues for update to authenticated using (true);
create policy "issues admin delete" on public.issues for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- asset history
create table public.asset_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  action text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now()
);
grant select on public.asset_history to anon;
grant select, insert, update, delete on public.asset_history to authenticated;
grant all on public.asset_history to service_role;
alter table public.asset_history enable row level security;
create policy "history anon select" on public.asset_history for select to anon using (true);
create policy "history staff all" on public.asset_history for all to authenticated using (true) with check (true);
