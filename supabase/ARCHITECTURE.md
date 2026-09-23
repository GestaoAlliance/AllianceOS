# AllianceOS — arquitetura de dados no Supabase

## Estado atual

O schema `alliance_data` é a camada canônica de dados do AllianceOS para operação, histórico, conhecimento e leitura unificada.

A tabela `public.operacional_estado` continua existindo apenas como camada de compatibilidade com partes antigas da interface, jobs e integrações. Para tarefas, campanhas e entregas, toda gravação canônica deve convergir para `alliance_data` e a projeção legada deve permanecer idêntica por hash.

### Fluxo de escrita

```
interface / MCP / job
        ↓
public.salvar_*_acessiveis ou helper interno
        ↓
alliance_data.commit_operational_payload(...)
        ↓
alliance_data.replace_canonical_payload(...)
        ↓
tabelas relacionais alliance_data
        ↓
alliance_data.project_operational_payload(...)
        ↓
public.operacional_estado (compatibilidade)
```

A transação falha e faz rollback caso contagem ou hash não coincidam.

Escritas antigas diretamente em `operacional_estado` continuam aceitas temporariamente. O trigger `alliance_data_operational_mirror` transforma esse payload novamente na camada canônica e, em modo strict, rejeita a transação se o espelho não puder ser materializado.

## Núcleo operacional canônico

- `alliance_data.tasks`
- `alliance_data.campaigns`
- `alliance_data.deliveries`
- `alliance_data.sync_status`
- `alliance_data.operational_health`
- `alliance_data.operational_data_quality`

Datas que antes existiam apenas como texto também possuem colunas tipadas (`date` / `timestamptz`). As colunas legadas continuam preservadas para compatibilidade.

As relações críticas possuem FKs adiáveis, permitindo o refresh transacional sem perder integridade:

- tarefa → campanha
- tarefa → tarefa mãe
- tarefa → lista
- entrega → tarefa origem
- entrega → tarefa destino
- decisão → campanha

## Campos aninhados normalizados

Os arrays JSON continuam preservados no `raw`, mas possuem projeções relacionais consultáveis:

- `task_assignees`
- `task_dependencies`
- `task_tags`
- `campaign_channels`
- `campaign_products`
- `delivery_files`
- `delivery_links`
- `delivery_events`

Essas tabelas são atualizadas automaticamente após a sincronização do núcleo operacional.

## Arquivos de entrega

`delivery_files` guarda apenas metadados. Conteúdo `dataUrl` não é duplicado nessa tabela.

Ainda existem 4 arquivos históricos com base64 inline nos payloads legados/canônicos, totalizando aproximadamente 4,63 milhões de caracteres. Eles devem ser removidos somente depois de cada arquivo possuir um destino persistente confirmado (Google Drive ou outra camada de arquivos) e a interface conseguir resolver esse destino sem depender de `dataUrl`.

## Camada de leitura unificada

Além do núcleo operacional, `alliance_data` possui views internas para:

- marcas e perfis;
- listas de tarefas;
- resultados e histórico de campanhas;
- planejamento mensal, mapas e nós;
- notificações e auditoria;
- Shopify;
- Meta Ads;
- Instagram;
- saúde das integrações;
- conhecimento, decisões e aprendizados.

O catálogo oficial está em `alliance_data.data_catalog`.

## Segurança

O schema `alliance_data` é privado para clientes comuns.

- `anon`: sem acesso ao schema;
- `authenticated`: sem acesso direto ao schema;
- `service_role`: acesso interno conforme grants;
- APIs públicas necessárias ficam em funções `public.*`, com validação de usuário e marca.

RLS permanece habilitado como defesa adicional nas tabelas privadas.

## APIs de escrita padronizadas

- `public.salvar_tarefas_acessiveis(jsonb)`
- `public.salvar_campanhas_acessiveis(jsonb)`
- `public.salvar_entregas_acessiveis(jsonb)`

Todas usam `alliance_data.save_accessible_payload` e respeitam as marcas acessíveis ao usuário.

Jobs e helpers internos que alteram tarefas/campanhas também devem usar `alliance_data.commit_operational_payload` em vez de atualizar o JSON legado diretamente.

## Compatibilidade e remoção futura do legado

Não remover `operacional_estado` ainda.

A remoção segura deve acontecer somente quando:

1. a interface não fizer mais writes diretos no JSON legado;
2. MCP/jobs estiverem usando as APIs canônicas;
3. leituras estiverem 100% na camada relacional;
4. os blobs base64 históricos tiverem sido externalizados;
5. o monitor `operational_health` permanecer sincronizado durante uma janela de observação.

Até lá, `operacional_estado` é uma projeção/entrada de compatibilidade, não a fonte conceitual de verdade.

## Migrações desta fase

- `20260923165453_typed_operational_core_and_relational_integrity_v1`
- `20260923165532_fix_typed_date_parser_regex_v1`
- `20260923165750_canonical_operational_core_with_legacy_projection_v1`
- `20260923170110_normalize_operational_nested_relations_v1`
- `20260923170141_auto_refresh_operational_relational_facets_v1`
- `20260923170319_route_internal_operational_writers_through_canonical_gateway_v1`
- `20260923170351_unified_accessible_operational_write_api_v1`
- `20260923170441_alliance_data_unified_read_layer_and_quality_v1`
- `20260923170546_cover_remaining_foreign_keys_v1`
- `20260923170710_operacional_estado_surrogate_primary_key_v1`

