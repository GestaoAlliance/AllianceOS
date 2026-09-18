
create or replace function app.proteger_estado_tarefas()
returns trigger
language plpgsql
security invoker
set search_path to 'public','pg_temp'
as $$
begin
  if old.dono is null and old.chave in ('central.tasks.vitor-gutierrez','allianceos.tasks.vitor-gutierrez') then
    raise exception 'O estado de tarefas do AllianceOS não pode ser excluído; use arquivamento de tarefas.';
  end if;
  return old;
end
$$;

drop trigger if exists proteger_estado_tarefas_delete on public.operacional_estado;
create trigger proteger_estado_tarefas_delete
before delete on public.operacional_estado
for each row execute function app.proteger_estado_tarefas();
