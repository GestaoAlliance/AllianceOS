-- AllianceOS — correção dos vínculos de campanha inválidos criados em testes.
-- 2026-09-21. Nenhuma linha/registro é excluído.

-- 1) Lista: apenas campanha_id -> NULL; histórico via task_action_audit.
with fixed as (
  update public.task_lists
  set campanha_id = null,
      atualizado_em = now()
  where id = '0d04d623-d3dd-43de-93ba-7071d8855321'::uuid
    and campanha_id = 'bot-acoes-de-gap'
  returning id
)
insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
select
  'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid,
  'mcp',
  'corrigir_vinculo_campanha_invalido',
  'lista',
  id::text,
  jsonb_build_object(
    'campo','campanha_id',
    'valor_anterior','bot-acoes-de-gap',
    'valor_novo',null,
    'motivo','Correção de vínculo inválido criado em teste antes da validação de campanha_id.'
  )
from fixed;

-- 2) Tarefas: altera apenas campaignId/campaignSource e acrescenta um evento de histórico.
with state as (
  select ctid, valor
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
  for update
),
targets as (
  select t.item->>'id' id
  from state s
  cross join lateral jsonb_array_elements(s.valor) t(item)
  where t.item->>'id' in (
    'mcp-1789850884804-9a7473aa',
    'mcp-1789850868076-2c57e60f'
  )
    and t.item->>'campaignId'='bot-acoes-de-gap'
),
fixed as (
  update public.operacional_estado o
  set valor = (
        select jsonb_agg(
          case
            when item->>'id' in (
              'mcp-1789850884804-9a7473aa',
              'mcp-1789850868076-2c57e60f'
            ) and item->>'campaignId'='bot-acoes-de-gap'
            then
              jsonb_set(
                jsonb_set(
                  jsonb_set(item,'{campaignId}','null'::jsonb,true),
                  '{campaignSource}',
                  '"direct"'::jsonb,
                  true
                ),
                '{history}',
                jsonb_build_array(
                  jsonb_build_object(
                    'at',now()::text,
                    'by','Gestão Alliance',
                    'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
                    'origin','mcp',
                    'text','Vínculo de campanha inválido corrigido: campanha_id definido como nulo, sem alterar os demais campos.'
                  )
                ) || coalesce(item->'history','[]'::jsonb),
                true
              )
            else item
          end
          order by ord
        )
        from jsonb_array_elements(o.valor) with ordinality x(item,ord)
      ),
      atualizado_em=now()
  where o.ctid=(select ctid from state)
    and exists(select 1 from targets)
  returning 1
)
insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
select
  'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid,
  'mcp',
  'corrigir_vinculo_campanha_invalido',
  'tarefa',
  t.id,
  jsonb_build_object(
    'campo','campaignId',
    'valor_anterior','bot-acoes-de-gap',
    'valor_novo',null,
    'motivo','Correção de vínculo inválido criado em teste antes da validação de campanha_id.'
  )
from targets t
cross join fixed;

-- 3) Entrega: cria vínculo explícito nulo, preserva todos os demais campos e registra evento.
with state as (
  select ctid, valor
  from public.operacional_estado
  where chave='central.deliveries.workspace.v1' and dono is null
  for update
),
target as (
  select d.item->>'id' id
  from state s
  cross join lateral jsonb_array_elements(s.valor) d(item)
  where d.item->>'id'='mcp-delivery-6ec74fcd-a895-4ee4-93a7-2600c70dc8b9'
    and not coalesce(
      (d.item->'events') @> jsonb_build_array(
        jsonb_build_object(
          'text','Vínculo de campanha inválido corrigido: campanha_id definido como nulo, sem alterar os demais campos.'
        )
      ),
      false
    )
),
fixed as (
  update public.operacional_estado o
  set valor = (
        select jsonb_agg(
          case
            when item->>'id'='mcp-delivery-6ec74fcd-a895-4ee4-93a7-2600c70dc8b9'
            then
              jsonb_set(
                jsonb_set(
                  jsonb_set(item,'{campaignId}','null'::jsonb,true),
                  '{campaignSource}',
                  '"direct"'::jsonb,
                  true
                ),
                '{events}',
                coalesce(item->'events','[]'::jsonb) || jsonb_build_array(
                  jsonb_build_object(
                    'at',now()::text,
                    'by','Gestão Alliance',
                    'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
                    'origin','mcp',
                    'text','Vínculo de campanha inválido corrigido: campanha_id definido como nulo, sem alterar os demais campos.'
                  )
                ),
                true
              )
            else item
          end
          order by ord
        )
        from jsonb_array_elements(o.valor) with ordinality x(item,ord)
      ),
      atualizado_em=now()
  where o.ctid=(select ctid from state)
    and exists(select 1 from target)
  returning 1
)
insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
select
  'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid,
  'mcp',
  'corrigir_vinculo_campanha_invalido',
  'entrega',
  t.id,
  jsonb_build_object(
    'campo','campaignId',
    'valor_anterior','bot-acoes-de-gap',
    'valor_novo',null,
    'motivo','Correção de vínculo inválido criado em teste antes da validação de campanha_id.'
  )
from target t
cross join fixed;
