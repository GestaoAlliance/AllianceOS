create or replace function alliance_data.try_uuid(p_value text)
returns uuid
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function alliance_data.try_date(p_value text)
returns date
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if p_value !~ '^\\d{4}-\\d{2}-\\d{2}' then
    return null;
  end if;
  return left(p_value,10)::date;
exception when others then
  return null;
end;
$$;

create or replace function alliance_data.try_timestamptz(p_value text)
returns timestamptz
language plpgsql
stable
strict
set search_path = ''
as $$
begin
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

revoke execute on function alliance_data.try_uuid(text) from public, anon, authenticated;
revoke execute on function alliance_data.try_date(text) from public, anon, authenticated;
revoke execute on function alliance_data.try_timestamptz(text) from public, anon, authenticated;
grant execute on function alliance_data.try_uuid(text) to service_role;
grant execute on function alliance_data.try_date(text) to service_role;
grant execute on function alliance_data.try_timestamptz(text) to service_role;

alter table alliance_data.tasks
  add column if not exists task_list_id uuid,
  add column if not exists due_date date,
  add column if not exists due_at timestamptz,
  add column if not exists start_date date,
  add column if not exists archived_at timestamptz;

alter table alliance_data.campaigns
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists month_start date,
  add column if not exists archived_at timestamptz;

alter table alliance_data.deliveries
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists archived_at timestamptz;

create or replace function alliance_data.derive_operational_typed_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name='tasks' then
    new.task_list_id := alliance_data.try_uuid(new.list_id);
    new.due_date := alliance_data.try_date(new.due_date_text);
    new.due_at := alliance_data.try_timestamptz(new.due_at_text);
    new.start_date := alliance_data.try_date(new.start_date_text);
    new.archived_at := alliance_data.try_timestamptz(new.archived_at_text);
  elsif tg_table_name='campaigns' then
    new.start_at := alliance_data.try_timestamptz(coalesce(nullif(new.start_at_text,''),nullif(new.start_date_text,'')));
    new.end_at := alliance_data.try_timestamptz(coalesce(nullif(new.end_at_text,''),nullif(new.end_date_text,'')));
    if new.month_ref ~ '^\\d{4}-\\d{2}$' then
      new.month_start := alliance_data.try_date(new.month_ref||'-01');
    else
      new.month_start := null;
    end if;
    new.archived_at := alliance_data.try_timestamptz(new.archived_at_text);
  elsif tg_table_name='deliveries' then
    new.created_at := alliance_data.try_timestamptz(new.created_at_text);
    new.updated_at := alliance_data.try_timestamptz(new.updated_at_text);
    new.archived_at := alliance_data.try_timestamptz(new.archived_at_text);
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_derive_typed_fields on alliance_data.tasks;
create trigger tasks_derive_typed_fields
before insert or update on alliance_data.tasks
for each row execute function alliance_data.derive_operational_typed_fields();

drop trigger if exists campaigns_derive_typed_fields on alliance_data.campaigns;
create trigger campaigns_derive_typed_fields
before insert or update on alliance_data.campaigns
for each row execute function alliance_data.derive_operational_typed_fields();

drop trigger if exists deliveries_derive_typed_fields on alliance_data.deliveries;
create trigger deliveries_derive_typed_fields
before insert or update on alliance_data.deliveries
for each row execute function alliance_data.derive_operational_typed_fields();

update alliance_data.tasks set id=id;
update alliance_data.campaigns set id=id;
update alliance_data.deliveries set id=id;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='tasks_campaign_id_fkey'
      and conrelid='alliance_data.tasks'::regclass
  ) then
    alter table alliance_data.tasks
      add constraint tasks_campaign_id_fkey
      foreign key (campaign_id)
      references alliance_data.campaigns(id)
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='tasks_parent_task_id_fkey'
      and conrelid='alliance_data.tasks'::regclass
  ) then
    alter table alliance_data.tasks
      add constraint tasks_parent_task_id_fkey
      foreign key (parent_task_id)
      references alliance_data.tasks(id)
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='tasks_task_list_id_fkey'
      and conrelid='alliance_data.tasks'::regclass
  ) then
    alter table alliance_data.tasks
      add constraint tasks_task_list_id_fkey
      foreign key (task_list_id)
      references public.task_lists(id)
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='deliveries_source_task_id_fkey'
      and conrelid='alliance_data.deliveries'::regclass
  ) then
    alter table alliance_data.deliveries
      add constraint deliveries_source_task_id_fkey
      foreign key (source_task_id)
      references alliance_data.tasks(id)
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='deliveries_target_task_id_fkey'
      and conrelid='alliance_data.deliveries'::regclass
  ) then
    alter table alliance_data.deliveries
      add constraint deliveries_target_task_id_fkey
      foreign key (target_task_id)
      references alliance_data.tasks(id)
      deferrable initially deferred;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='decisions_campaign_id_fkey'
      and conrelid='alliance_data.decisions'::regclass
  ) then
    alter table alliance_data.decisions
      add constraint decisions_campaign_id_fkey
      foreign key (campaign_id)
      references alliance_data.campaigns(id)
      deferrable initially deferred;
  end if;
end
$$;

create index if not exists alliance_tasks_due_at_idx
  on alliance_data.tasks(due_at) where due_at is not null;
create index if not exists alliance_tasks_due_date_idx
  on alliance_data.tasks(due_date) where due_date is not null;
create index if not exists alliance_tasks_task_list_idx
  on alliance_data.tasks(task_list_id) where task_list_id is not null;
create index if not exists alliance_tasks_parent_idx
  on alliance_data.tasks(parent_task_id) where parent_task_id is not null;
create index if not exists alliance_campaigns_start_end_idx
  on alliance_data.campaigns(start_at,end_at);
create index if not exists alliance_campaigns_month_start_idx
  on alliance_data.campaigns(month_start) where month_start is not null;
create index if not exists alliance_deliveries_created_at_idx
  on alliance_data.deliveries(created_at desc) where created_at is not null;

update alliance_data.data_catalog
set metadata=coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object(
    'typed_columns',true,
    'relational_integrity',true,
    'legacy_text_preserved',true
  ),
  updated_at=now()
where id in ('operation.tasks','operation.campaigns','operation.deliveries');
