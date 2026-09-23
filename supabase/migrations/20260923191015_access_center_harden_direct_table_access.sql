revoke select on public.access_center_entries from authenticated;

drop policy if exists access_center_secrets_deny_direct on public.access_center_secrets;
create policy access_center_secrets_deny_direct
on public.access_center_secrets
for all
to authenticated
using (false)
with check (false);

drop policy if exists access_center_audit_deny_direct on public.access_center_audit;
create policy access_center_audit_deny_direct
on public.access_center_audit
for all
to authenticated
using (false)
with check (false);
