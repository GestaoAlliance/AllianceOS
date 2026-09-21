-- Backfill campaign lifecycle after round 2.
-- Closes expired campaigns without deleting anything and records history + one notification per user/event.

do $$
declare
  campaigns jsonb;
  out_campaigns jsonb := '[]'::jsonb;
  c jsonb;
  end_date text;
  ts text := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  select coalesce(valor,'[]'::jsonb) into campaigns
  from public.operacional_estado
  where chave='central.campaigns.vitor-gutierrez' and dono is null
  for update;

  if jsonb_typeof(campaigns)='array' then
    for c in select value from jsonb_array_elements(campaigns)
    loop
      end_date := left(coalesce(c->>'endAt',c->>'end',''),10);
      if nullif(end_date,'') is not null
         and end_date < current_date::text
         and lower(coalesce(c->>'status','')) in ('em execução','em execucao')
         and nullif(c->>'archivedAt','') is null then
        c := c || jsonb_build_object('status','encerrada','endedAt',coalesce(nullif(c->>'endedAt',''),ts));
        c := jsonb_set(
          c,
          '{history}',
          jsonb_build_array(jsonb_build_object(
            'at',ts,
            'by','Gestão Alliance',
            'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
            'authorType','servico',
            'origin','migration',
            'campo','status',
            'antes','em execução',
            'depois','encerrada',
            'text','status: em execução → encerrada (data final ultrapassada).'
          )) || coalesce(c->'history','[]'::jsonb),
          true
        );
      end if;
      out_campaigns := out_campaigns || jsonb_build_array(c);
    end loop;

    update public.operacional_estado
    set valor=out_campaigns,atualizado_em=now()
    where chave='central.campaigns.vitor-gutierrez' and dono is null;
  end if;
end
$$;

insert into public.notifications(user_id,actor_id,kind,title,body,task_id,event_key)
select
  p.id,
  'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid,
  'campaign_closed',
  'Campanha encerrada: '||coalesce(c.value->>'name','Campanha'),
  'A data final da campanha foi ultrapassada.',
  null,
  'campaign-closed:'||coalesce(c.value->>'id','sem-id')||':'||left(coalesce(c.value->>'endAt',c.value->>'end',''),10)
from public.operacional_estado o
cross join lateral jsonb_array_elements(o.valor) c(value)
cross join public.profiles p
where o.chave='central.campaigns.vitor-gutierrez'
  and o.dono is null
  and lower(coalesce(c.value->>'status',''))='encerrada'
  and left(coalesce(c.value->>'endAt',c.value->>'end',''),10) < current_date::text
  and p.ativo=true
  and coalesce(p.tipo_membro,'usuario')<>'servico'
  and not exists (
    select 1 from public.notifications n
    where n.user_id=p.id
      and n.kind='campaign_closed'
      and n.event_key='campaign-closed:'||coalesce(c.value->>'id','sem-id')||':'||left(coalesce(c.value->>'endAt',c.value->>'end',''),10)
  );
