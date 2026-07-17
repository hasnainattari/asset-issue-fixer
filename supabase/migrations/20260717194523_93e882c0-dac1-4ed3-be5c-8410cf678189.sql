
drop policy "issues anon insert" on public.issues;
create policy "issues anon insert" on public.issues for insert to anon with check (asset_id is not null and title is not null);

-- storage.objects RLS for evidence bucket
create policy "evidence anon upload public-reports" on storage.objects
  for insert to anon with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = 'public-reports');
create policy "evidence staff upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'evidence');
create policy "evidence anon read" on storage.objects
  for select to anon using (bucket_id = 'evidence');
create policy "evidence staff read" on storage.objects
  for select to authenticated using (bucket_id = 'evidence');
create policy "evidence admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'evidence' and public.has_role(auth.uid(),'admin'));
