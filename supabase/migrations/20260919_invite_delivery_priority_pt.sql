alter table public.equipe_convites
  add column if not exists envio_status text not null default 'pendente',
  add column if not exists envio_erro text,
  add column if not exists ultimo_envio_em timestamptz,
  add column if not exists tentativas_envio integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='equipe_convites_envio_status_check'
      and conrelid='public.equipe_convites'::regclass
  ) then
    alter table public.equipe_convites
      add constraint equipe_convites_envio_status_check
      check (envio_status in ('pendente','enviado','falhou'));
  end if;
end $$;

update public.operacional_estado o
set valor = q.valor,
    atualizado_em = now()
from (
  select o2.ctid,
         jsonb_agg(
           case lower(coalesce(e->>'priority','normal'))
             when 'urgent' then jsonb_set(e,'{priority}','"urgente"'::jsonb,true)
             when 'high' then jsonb_set(e,'{priority}','"alta"'::jsonb,true)
             when 'low' then jsonb_set(e,'{priority}','"baixa"'::jsonb,true)
             else jsonb_set(e,'{priority}','"normal"'::jsonb,true)
           end
           order by ord
         ) as valor
  from public.operacional_estado o2
  cross join lateral jsonb_array_elements(o2.valor) with ordinality as x(e,ord)
  where o2.chave='central.tasks.vitor-gutierrez' and o2.dono is null
  group by o2.ctid
) q
where o.ctid=q.ctid;
