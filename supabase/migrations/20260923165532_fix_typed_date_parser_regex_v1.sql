create or replace function alliance_data.try_date(p_value text)
returns date
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then
    return null;
  end if;
  return left(p_value,10)::date;
exception when others then
  return null;
end;
$$;

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
    if new.month_ref ~ '^[0-9]{4}-[0-9]{2}$' then
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

update alliance_data.tasks set id=id;
update alliance_data.campaigns set id=id;
update alliance_data.deliveries set id=id;
