-- AllianceOS notification idempotency observability — 2026-09-21
-- Keeps duplicate attempts out of the table and records their source in the private app schema.

create schema if not exists app;

do $$
begin
  if to_regclass('app.notification_dedup_probe') is not null
     and to_regclass('app.notification_dedup_attempts') is null then
    alter table app.notification_dedup_probe rename to notification_dedup_attempts;
  end if;
end
$$;

create table if not exists app.notification_dedup_attempts(
  id bigint generated always as identity primary key,
  attempted_at timestamptz not null default now(),
  user_id uuid,
  actor_id uuid,
  kind text,
  task_id text,
  event_key text,
  title text,
  db_user text not null default current_user,
  jwt_sub text
);

create index if not exists notification_dedup_attempts_time_idx
  on app.notification_dedup_attempts(attempted_at desc);

create index if not exists notification_dedup_attempts_event_idx
  on app.notification_dedup_attempts(event_key)
  where event_key is not null;

create or replace function app.observe_duplicate_notification()
returns trigger
language plpgsql
security definer
set search_path=public,app
as $$
begin
  if new.event_key is not null and exists(
    select 1 from public.notifications n
    where n.user_id=new.user_id
      and n.kind=new.kind
      and coalesce(n.task_id,'')=coalesce(new.task_id,'')
      and n.event_key=new.event_key
  ) then
    insert into app.notification_dedup_attempts(
      user_id,actor_id,kind,task_id,event_key,title,db_user,jwt_sub
    )
    values(
      new.user_id,new.actor_id,new.kind,new.task_id,new.event_key,new.title,
      current_user,auth.uid()::text
    );
    return null;
  end if;
  return new;
end
$$;

revoke all on table app.notification_dedup_attempts from public,anon,authenticated;
revoke all on function app.observe_duplicate_notification() from public,anon,authenticated;

drop trigger if exists observe_duplicate_notification on public.notifications;
create trigger observe_duplicate_notification
before insert on public.notifications
for each row execute function app.observe_duplicate_notification();
