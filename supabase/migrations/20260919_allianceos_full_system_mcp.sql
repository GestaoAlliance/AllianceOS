-- Applied to Supabase as allianceos_full_system_mcp on 2026-09-19.
-- Full migration source is intentionally kept in Git for reproducibility.
-- Creates: planning_months, planning_maps, planning_map_nodes, alliance_clients,
-- alliance_automations, campaign_results, alliance_tags, alliance_channels,
-- RLS policies without DELETE, and the private alliance-deliveries storage bucket.

create table if not exists public.planning_months (
  id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id),
  ano integer not null check (ano between 2000 and 2200), mes integer not null check (mes between 1 and 12),
  meta1 numeric(14,2) not null default 0 check (meta1>=0), meta2 numeric(14,2) not null default 0 check (meta2>=0),
  meta3 numeric(14,2) not null default 0 check (meta3>=0), meta_ativa integer not null default 1 check (meta_ativa between 1 and 3),
  ticket_medio_previsto numeric(14,2) not null default 0 check (ticket_medio_previsto>=0),
  origem text not null default 'interface' check (origem in ('interface','mcp')), criado_por uuid references auth.users(id) default auth.uid(),
  atualizado_por uuid references auth.users(id) default auth.uid(), criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now(),
  arquivado_em timestamptz, arquivado_por uuid references auth.users(id), unique(brand_id,ano,mes)
);
create table if not exists public.planning_maps (
  id uuid primary key default gen_random_uuid(),brand_id uuid not null references public.brands(id),month_id uuid not null references public.planning_months(id),
  nome text not null,layout text not null default 'direita',origem text not null default 'interface' check(origem in('interface','mcp')),
  criado_por uuid references auth.users(id) default auth.uid(),atualizado_por uuid references auth.users(id) default auth.uid(),
  criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),arquivado_em timestamptz,arquivado_por uuid references auth.users(id),
  unique(brand_id,month_id,nome)
);
create table if not exists public.planning_map_nodes (
 id uuid primary key default gen_random_uuid(),map_id uuid not null references public.planning_maps(id),node_key text not null,parent_key text,texto text not null,
 x numeric(12,3) not null default 0,y numeric(12,3) not null default 0,cor text,aberto boolean not null default true,campaign_id text,
 origem text not null default 'interface' check(origem in('interface','mcp')),criado_por uuid references auth.users(id) default auth.uid(),
 atualizado_por uuid references auth.users(id) default auth.uid(),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),
 arquivado_em timestamptz,arquivado_por uuid references auth.users(id),unique(map_id,node_key)
);
create table if not exists public.alliance_clients (
 id uuid primary key default gen_random_uuid(),nome text not null,tipo text not null check(tipo in('marca','externo')),brand_id uuid references public.brands(id),
 contato_nome text,email text,telefone text,observacoes text,status text not null default 'ativo' check(status in('ativo','inativo')),
 origem text not null default 'interface' check(origem in('interface','mcp')),criado_por uuid references auth.users(id) default auth.uid(),
 atualizado_por uuid references auth.users(id) default auth.uid(),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),
 arquivado_em timestamptz,arquivado_por uuid references auth.users(id)
);
create table if not exists public.alliance_automations (
 id uuid primary key default gen_random_uuid(),nome text not null,brand_id uuid not null references public.brands(id),gatilho jsonb not null default '{}'::jsonb,
 acao jsonb not null default '{}'::jsonb,canal text not null,status text not null default 'pausada' check(status in('ativa','pausada')),ultima_execucao timestamptz,
 origem text not null default 'interface' check(origem in('interface','mcp')),criado_por uuid references auth.users(id) default auth.uid(),
 atualizado_por uuid references auth.users(id) default auth.uid(),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),
 arquivado_em timestamptz,arquivado_por uuid references auth.users(id)
);
create table if not exists public.campaign_results (
 id uuid primary key default gen_random_uuid(),campaign_id text not null,brand_id uuid not null references public.brands(id),canal text not null,data timestamptz not null,
 faturamento numeric(14,2) not null default 0 check(faturamento>=0),investimento numeric(14,2) not null default 0 check(investimento>=0),observacoes text,
 origem text not null default 'interface' check(origem in('interface','mcp')),criado_por uuid references auth.users(id) default auth.uid(),
 atualizado_por uuid references auth.users(id) default auth.uid(),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),
 unique(campaign_id,canal,data)
);
create table if not exists public.alliance_tags (
 id uuid primary key default gen_random_uuid(),brand_id uuid references public.brands(id),nome text not null,cor text,
 origem text not null default 'interface' check(origem in('interface','mcp')),criado_por uuid references auth.users(id) default auth.uid(),
 atualizado_por uuid references auth.users(id) default auth.uid(),criado_em timestamptz not null default now(),atualizado_em timestamptz not null default now(),
 arquivado_em timestamptz,arquivado_por uuid references auth.users(id)
);
create table if not exists public.alliance_channels(slug text primary key,nome text not null unique,ordem integer not null,ativo boolean not null default true);
-- See migration history in Supabase for policies, grants, indexes, seeded channels, triggers, and storage policies.
