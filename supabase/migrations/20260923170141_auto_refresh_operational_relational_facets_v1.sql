create or replace function alliance_data.refresh_facets_after_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_key in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) and coalesce(new.in_sync,false) then
    perform alliance_data.refresh_relational_facets(new.source_key);
  end if;
  return new;
end;
$$;

drop trigger if exists sync_status_refresh_relational_facets
  on alliance_data.sync_status;

create trigger sync_status_refresh_relational_facets
after insert or update on alliance_data.sync_status
for each row execute function alliance_data.refresh_facets_after_sync();

revoke all on function alliance_data.refresh_facets_after_sync()
from public,anon,authenticated;
grant execute on function alliance_data.refresh_facets_after_sync()
to service_role;
