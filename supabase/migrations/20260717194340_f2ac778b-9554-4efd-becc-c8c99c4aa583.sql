
-- maintenance_records
create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  technician_id uuid not null references auth.users(id) on delete set null,
  inspection_notes text,
  work_performed text,
  parts_used text,
  cost numeric(12,2),
  final_condition text,
  evidence_urls text[],
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.maintenance_records to authenticated;
grant all on public.maintenance_records to service_role;
alter table public.maintenance_records enable row level security;
create policy "mr staff read" on public.maintenance_records for select to authenticated using (auth.uid() is not null);
create policy "mr technician insert own" on public.maintenance_records for insert to authenticated with check (technician_id = auth.uid());
create policy "mr technician update own" on public.maintenance_records for update to authenticated using (technician_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "mr admin delete" on public.maintenance_records for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- tighten permissive policies (replace true with auth.uid() is not null)
drop policy "issues staff insert" on public.issues;
drop policy "issues staff update" on public.issues;
drop policy "history staff all" on public.asset_history;
create policy "issues staff insert" on public.issues for insert to authenticated with check (auth.uid() is not null);
create policy "issues staff update" on public.issues for update to authenticated using (auth.uid() is not null);
create policy "history staff select" on public.asset_history for select to authenticated using (auth.uid() is not null);
create policy "history staff insert" on public.asset_history for insert to authenticated with check (auth.uid() is not null);
create policy "history staff update" on public.asset_history for update to authenticated using (auth.uid() is not null);
create policy "history admin delete" on public.asset_history for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- lock down SECURITY DEFINER function execution to only what needs it
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
