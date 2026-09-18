
update public.operacional_estado o
set valor = (
  select jsonb_agg(
    case
      when (not (e ? 'dueAt') or nullif(e->>'dueAt','') is null)
       and nullif(e->>'due','') is not null
       and e->>'title' ~* 'até[[:space:]]+[0-9]{1,2}h'
      then e || jsonb_build_object(
        'dueAt',
        (e->>'due') || 'T' ||
          lpad(((regexp_match(e->>'title','até[[:space:]]+([0-9]{1,2})h','i'))[1]),2,'0') ||
          ':00:00-03:00',
        'history',
        jsonb_build_array(jsonb_build_object(
          'at', now()::text,
          'text', 'Horário do prazo recuperado automaticamente do título importado.'
        )) || coalesce(e->'history','[]'::jsonb)
      )
      else e
    end
    order by ord
  )
  from jsonb_array_elements(o.valor) with ordinality a(e,ord)
)
where o.chave in ('central.tasks.vitor-gutierrez','allianceos.tasks.vitor-gutierrez')
  and o.dono is null
  and jsonb_typeof(o.valor)='array';
