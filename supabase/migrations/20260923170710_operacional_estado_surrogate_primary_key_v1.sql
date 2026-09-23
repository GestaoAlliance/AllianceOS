alter table public.operacional_estado
  add column if not exists id uuid default gen_random_uuid();

update public.operacional_estado
set id=gen_random_uuid()
where id is null;

alter table public.operacional_estado
  alter column id set default gen_random_uuid(),
  alter column id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.operacional_estado'::regclass
      and contype='p'
  ) then
    alter table public.operacional_estado
      add constraint operacional_estado_pkey primary key(id);
  end if;
end
$$;
