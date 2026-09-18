
create index if not exists legacy_member_links_profile_idx on public.legacy_member_links(profile_id);
create index if not exists legacy_member_links_migrado_por_idx on public.legacy_member_links(migrado_por);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_actor_idx on public.notifications(actor_id);
create index if not exists task_action_audit_actor_created_idx on public.task_action_audit(actor_id, created_at desc);
create index if not exists task_lists_criado_por_idx on public.task_lists(criado_por);
create index if not exists task_lists_arquivado_por_idx on public.task_lists(arquivado_por);

drop policy if exists legacy_member_links_admin on public.legacy_member_links;
drop policy if exists legacy_member_links_admin_insert on public.legacy_member_links;
drop policy if exists legacy_member_links_admin_update on public.legacy_member_links;

create policy legacy_member_links_admin_insert on public.legacy_member_links
  for insert to authenticated
  with check (app.sou_admin());

create policy legacy_member_links_admin_update on public.legacy_member_links
  for update to authenticated
  using (app.sou_admin())
  with check (app.sou_admin());

revoke delete on public.legacy_member_links from authenticated;
revoke delete on public.task_lists from authenticated;
revoke delete on public.notifications from authenticated;
revoke delete on public.task_action_audit from authenticated;
