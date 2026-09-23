create or replace function alliance_data.save_accessible_payload(
  p_source_key text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_current jsonb := '[]'::jsonb;
  v_preserved jsonb := '[]'::jsonb;
  v_merged jsonb := '[]'::jsonb;
  v_allowed_names text[];
  v_allowed_ids text[];
begin
  if p_source_key not in (
    'central.tasks.vitor-gutierrez',
    'central.campaigns.vitor-gutierrez',
    'central.deliveries.workspace.v1'
  ) then
    raise exception 'Fonte operacional não suportada.';
  end if;

  if not app.estou_ativo() or app.eh_externo() then
    raise exception 'Sem permissão para alterar dados operacionais.';
  end if;

  if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' then
    raise exception 'Formato inválido: esperado array JSON.';
  end if;

  select coalesce(valor,'[]'::jsonb)
    into v_current
  from public.operacional_estado
  where chave=p_source_key and dono is null
  for update;

  if app.sou_admin() then
    perform alliance_data.commit_operational_payload(
      p_source_key,
      coalesce(p_items,'[]'::jsonb)
    );
    return coalesce(p_items,'[]'::jsonb);
  end if;

  select
    array_agg(lower(nome)),
    array_agg(id::text)
  into v_allowed_names,v_allowed_ids
  from public.brands
  where ativo=true and app.pode_acessar_marca(id);

  if coalesce(array_length(v_allowed_names,1),0)=0 then
    raise exception 'Nenhuma marca disponível para esta conta.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) x
    where not (
      lower(coalesce(x->>'brand',''))=any(v_allowed_names)
      or coalesce(x->>'brandId','')=any(v_allowed_ids)
    )
  ) then
    raise exception 'A tentativa contém itens de uma marca sem acesso.';
  end if;

  select coalesce(jsonb_agg(x),'[]'::jsonb)
    into v_preserved
  from jsonb_array_elements(coalesce(v_current,'[]'::jsonb)) x
  where not (
    lower(coalesce(x->>'brand',''))=any(v_allowed_names)
    or coalesce(x->>'brandId','')=any(v_allowed_ids)
  );

  v_merged := coalesce(v_preserved,'[]'::jsonb) || coalesce(p_items,'[]'::jsonb);

  perform alliance_data.commit_operational_payload(
    p_source_key,
    v_merged
  );

  return coalesce(p_items,'[]'::jsonb);
end;
$function$;

revoke all on function alliance_data.save_accessible_payload(text,jsonb)
from public,anon,authenticated;
grant execute on function alliance_data.save_accessible_payload(text,jsonb)
to service_role;

create or replace function public.salvar_tarefas_acessiveis(p_tasks jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select alliance_data.save_accessible_payload(
    'central.tasks.vitor-gutierrez',
    p_tasks
  );
$$;

create or replace function public.salvar_campanhas_acessiveis(p_campaigns jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select alliance_data.save_accessible_payload(
    'central.campaigns.vitor-gutierrez',
    p_campaigns
  );
$$;

create or replace function public.salvar_entregas_acessiveis(p_deliveries jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select alliance_data.save_accessible_payload(
    'central.deliveries.workspace.v1',
    p_deliveries
  );
$$;

revoke execute on function public.salvar_tarefas_acessiveis(jsonb) from public,anon;
revoke execute on function public.salvar_campanhas_acessiveis(jsonb) from public,anon;
revoke execute on function public.salvar_entregas_acessiveis(jsonb) from public,anon;

grant execute on function public.salvar_tarefas_acessiveis(jsonb) to authenticated,service_role;
grant execute on function public.salvar_campanhas_acessiveis(jsonb) to authenticated,service_role;
grant execute on function public.salvar_entregas_acessiveis(jsonb) to authenticated,service_role;
