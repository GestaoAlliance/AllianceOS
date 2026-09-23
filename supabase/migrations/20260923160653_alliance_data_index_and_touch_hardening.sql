create index if not exists alliance_activity_events_actor_idx
  on alliance_data.activity_events(actor_id);

create index if not exists alliance_decisions_decided_by_idx
  on alliance_data.decisions(decided_by);

create index if not exists alliance_decisions_source_event_idx
  on alliance_data.decisions(source_event_id);

create index if not exists alliance_documents_created_by_idx
  on alliance_data.documents(created_by);

create index if not exists alliance_learnings_created_by_idx
  on alliance_data.learnings(created_by);

create or replace function alliance_data.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function alliance_data.touch_updated_at() from public, anon, authenticated;

drop trigger if exists alliance_decisions_touch on alliance_data.decisions;
create trigger alliance_decisions_touch
before update on alliance_data.decisions
for each row execute function alliance_data.touch_updated_at();

drop trigger if exists alliance_learnings_touch on alliance_data.learnings;
create trigger alliance_learnings_touch
before update on alliance_data.learnings
for each row execute function alliance_data.touch_updated_at();

drop trigger if exists alliance_documents_touch on alliance_data.documents;
create trigger alliance_documents_touch
before update on alliance_data.documents
for each row execute function alliance_data.touch_updated_at();

drop trigger if exists alliance_data_catalog_touch on alliance_data.data_catalog;
create trigger alliance_data_catalog_touch
before update on alliance_data.data_catalog
for each row execute function alliance_data.touch_updated_at();

drop trigger if exists integration_sources_touch on public.integration_sources;
create trigger integration_sources_touch
before update on public.integration_sources
for each row execute function alliance_data.touch_updated_at();
