-- AllianceOS organization structure: areas, subareas/sectors and user seat assignments
-- Source: Organograma Alliance (Miro/CSV), 2026-10-01.
-- Non-destructive: legacy operational public.areas remains untouched for task filters.

begin;

create table if not exists alliance_data.org_subareas (
  key text primary key,
  area_key text not null references alliance_data.org_areas(key),
  name text not null,
  description text null,
  display_order integer not null default 100,
  is_active boolean not null default true,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(area_key,name)
);

alter table alliance_data.org_subareas enable row level security;
revoke all on alliance_data.org_subareas from anon, authenticated;

alter table alliance_data.org_seats
  add column if not exists subarea_key text null references alliance_data.org_subareas(key),
  add column if not exists is_reference boolean not null default false,
  add column if not exists merged_into_code text null,
  add column if not exists updated_by uuid null references public.profiles(id),
  add column if not exists update_source text not null default 'migration';

insert into alliance_data.org_areas(key,name,head_seat_code,head_name,description,display_order,is_active,archived_at,updated_at)
values
('content','Conteúdo','C10','Ítalo','Presença orgânica, calendário editorial e execução de conteúdo das marcas.',5,true,null,now()),
('influencers','Influenciadoras','C11','Ana','Prospecção, relacionamento, ativação e resultado da rede de influenciadores.',6,true,null,now())
on conflict(key) do update set
  name=excluded.name,
  head_seat_code=excluded.head_seat_code,
  head_name=excluded.head_name,
  description=excluded.description,
  display_order=excluded.display_order,
  is_active=true,
  archived_at=null,
  updated_at=now();

update alliance_data.org_areas
set name='Ferramentas & Automações',
    head_seat_code='C13',
    head_name='Sarah',
    description='Ferramentas, automações, infraestrutura e integrações da Alliance em uma estrutura unificada.',
    display_order=7,
    updated_at=now()
where key='technology_automations';

update alliance_data.org_areas
set name='Suporte e Vendas',
    head_seat_code=null,
    head_name=null,
    description='Atendimento, resolução de primeiro nível e conversão assistida, separado por marca.',
    display_order=8,
    updated_at=now()
where key='support_cx';

update alliance_data.org_areas
set head_seat_code='C18', head_name='Mafe', display_order=9, updated_at=now()
where key='marketplaces_channels';

-- Old combined area remains archived for history; no physical deletion.
update alliance_data.org_areas
set is_active=false, archived_at=coalesce(archived_at,now()), updated_at=now()
where key='content_influencers';

insert into alliance_data.org_subareas(key,area_key,name,description,display_order,is_active,archived_at,updated_at)
values
('operations_project_management','operations_pmo','Gestão de Projetos / PMO','Gestão direta dos projetos e cronogramas dentro de Operações & PMO.',10,true,null,now()),
('marketing_performance','marketing_cro','Performance','Mídia paga, aquisição e eficiência de tráfego.',10,true,null,now()),
('marketing_ecommerce_cro','marketing_cro','E-commerce & CRO','Experiência de compra, funil e otimização de conversão.',20,true,null,now()),
('marketing_copy_creative','marketing_cro','Copy & Estratégia Criativa','Mensagem, ângulos e direcionamento criativo para conversão.',30,true,null,now()),
('support_botanika','support_cx','Botanika','Atendimento e vendas da marca Botanika.',10,true,null,now()),
('support_vermefree','support_cx','VermeFree','Atendimento e vendas da marca VermeFree.',20,true,null,now()),
('marketplaces_tiktok_shop','marketplaces_channels','TikTok Shop','Operação do marketplace TikTok Shop.',10,true,null,now())
on conflict(key) do update set
  area_key=excluded.area_key,
  name=excluded.name,
  description=excluded.description,
  display_order=excluded.display_order,
  is_active=true,
  archived_at=null,
  updated_at=now();

update alliance_data.org_seats
set area_key='content', subarea=null, subarea_key=null, updated_at=now(), update_source='migration'
where code='C10';

update alliance_data.org_seats
set area_key='influencers', subarea=null, subarea_key=null, updated_at=now(), update_source='migration'
where code in ('C11','C12');

update alliance_data.org_seats
set subarea_key=case code
  when 'C05' then 'operations_project_management'
  when 'C07' then 'marketing_performance'
  when 'C08' then 'marketing_ecommerce_cro'
  when 'C09' then 'marketing_copy_creative'
  when 'C16' then 'support_botanika'
  when 'C17' then 'support_vermefree'
  when 'C18' then 'marketplaces_tiktok_shop'
  else subarea_key end,
  subarea=case code
  when 'C05' then 'Gestão de Projetos / PMO'
  when 'C07' then 'Performance'
  when 'C08' then 'E-commerce & CRO'
  when 'C09' then 'Copy & Estratégia Criativa'
  when 'C16' then 'Botanika'
  when 'C17' then 'VermeFree'
  when 'C18' then 'TikTok Shop'
  else subarea end,
  updated_at=now(),
  update_source='migration'
where code in ('C05','C07','C08','C09','C16','C17','C18');

update alliance_data.org_seats
set subarea=null, subarea_key=null, updated_at=now(), update_source='migration'
where code in ('C13','C14','C15');

-- Seats explicitly marked as unified/reference by the approved organogram.
update alliance_data.org_seats
set is_reference=true,
    merged_into_code=case code when 'C05' then 'C04' when 'C14' then 'C13' when 'C15' then 'C13' end,
    profile_id=null,
    updated_at=now(),
    update_source='migration'
where code in ('C05','C14','C15');

update alliance_data.org_seats
set is_reference=false, merged_into_code=null, updated_at=now(), update_source='migration'
where code not in ('C05','C14','C15');

-- Link seats to known real AllianceOS profiles.
update alliance_data.org_seats
set profile_id='8c3beb8b-3ad9-4dcb-9b78-4b0cb6bd5839',
    occupant_name='Gabriel',
    updated_by='395ed61f-dde7-4fb6-a6da-ea5301304765',
    updated_at=now(),
    update_source='migration'
where code in ('C01','C02');

update alliance_data.org_seats
set profile_id='411f4c88-af77-4b0a-8a2b-c87bac7443cf',
    occupant_name='Lissia',
    updated_by='395ed61f-dde7-4fb6-a6da-ea5301304765',
    updated_at=now(),
    update_source='migration'
where code='C16';

create or replace function public.meu_perfil_organizacional()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when (select auth.uid()) is null then jsonb_build_object('autenticado',false)
    else jsonb_build_object(
      'autenticado',true,
      'areas',coalesce((
        select jsonb_agg(x order by x->>'name')
        from (
          select distinct jsonb_build_object('key',a.key,'name',a.name) x
          from alliance_data.org_seats s
          join alliance_data.org_areas a on a.key=s.area_key
          where s.profile_id=(select auth.uid())
            and s.is_active and s.archived_at is null and not s.is_reference
        ) q
      ),'[]'::jsonb),
      'subareas',coalesce((
        select jsonb_agg(x order by x->>'name')
        from (
          select distinct jsonb_build_object('key',sa.key,'name',sa.name,'area_key',sa.area_key) x
          from alliance_data.org_seats s
          join alliance_data.org_subareas sa on sa.key=s.subarea_key
          where s.profile_id=(select auth.uid())
            and s.is_active and s.archived_at is null and not s.is_reference
        ) q
      ),'[]'::jsonb),
      'seats',coalesce((
        select jsonb_agg(jsonb_build_object(
          'code',s.code,'title',s.title,'level',s.level,
          'area_key',s.area_key,'area',coalesce(a.name,'Direção executiva'),
          'subarea_key',s.subarea_key,'subarea',coalesce(sa.name,s.subarea),'scope',s.scope
        ) order by s.code)
        from alliance_data.org_seats s
        left join alliance_data.org_areas a on a.key=s.area_key
        left join alliance_data.org_subareas sa on sa.key=s.subarea_key
        where s.profile_id=(select auth.uid())
          and s.is_active and s.archived_at is null and not s.is_reference
      ),'[]'::jsonb)
    )
  end;
$function$;

revoke all on function public.meu_perfil_organizacional() from public, anon;
grant execute on function public.meu_perfil_organizacional() to authenticated;

create or replace function public.admin_atualizar_cadeiras_usuario(
  p_profile_id uuid,
  p_seat_codes text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_codes text[] := coalesce(p_seat_codes,array[]::text[]);
  v_name text;
begin
  if (select auth.uid()) is null then raise exception 'Sessão inválida.'; end if;

  if not exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.ativo and p.papel::text='admin'
  ) then
    raise exception 'Apenas administradores podem alterar cadeiras.';
  end if;

  select p.nome into v_name from public.profiles p
  where p.id=p_profile_id and p.ativo;
  if v_name is null then raise exception 'Perfil não encontrado ou inativo.'; end if;

  if exists (
    select 1 from unnest(v_codes) c
    where not exists (
      select 1 from alliance_data.org_seats s
      where s.code=c and s.is_active and s.archived_at is null and not s.is_reference
    )
  ) then
    raise exception 'Uma das cadeiras selecionadas é inválida ou apenas referência.';
  end if;

  if exists (
    select 1 from alliance_data.org_seats s
    where s.code=any(v_codes)
      and s.profile_id is not null and s.profile_id<>p_profile_id
      and s.is_active and s.archived_at is null and not s.is_reference
  ) then
    raise exception 'Uma das cadeiras selecionadas já está atribuída a outra pessoa.';
  end if;

  update alliance_data.org_seats s
     set profile_id=null, updated_by=(select auth.uid()), updated_at=now(), update_source='interface'
   where s.profile_id=p_profile_id
     and not s.is_reference
     and not (s.code=any(v_codes));

  update alliance_data.org_seats s
     set profile_id=p_profile_id, occupant_name=v_name,
         updated_by=(select auth.uid()), updated_at=now(), update_source='interface'
   where s.code=any(v_codes)
     and s.is_active and s.archived_at is null and not s.is_reference;

  return jsonb_build_object('profile_id',p_profile_id,'seat_codes',to_jsonb(v_codes),'updated_at',now());
end
$function$;

revoke all on function public.admin_atualizar_cadeiras_usuario(uuid,text[]) from public, anon;
grant execute on function public.admin_atualizar_cadeiras_usuario(uuid,text[]) to authenticated;

create or replace function public.organization_snapshot()
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select case
    when (select auth.uid()) is null then null
    else jsonb_build_object(
      'areas',coalesce((
        select jsonb_agg(jsonb_build_object(
          'key',a.key,'name',a.name,'head_seat_code',a.head_seat_code,'head_name',a.head_name,
          'description',a.description,'display_order',a.display_order,
          'subareas',coalesce((
            select jsonb_agg(jsonb_build_object(
              'key',sa.key,'name',sa.name,'description',sa.description,'display_order',sa.display_order
            ) order by sa.display_order,sa.name)
            from alliance_data.org_subareas sa
            where sa.area_key=a.key and sa.is_active and sa.archived_at is null
          ),'[]'::jsonb),
          'seats',coalesce((
            select jsonb_agg(jsonb_build_object(
              'code',s.code,'title',s.title,'level',s.level,
              'subarea_key',s.subarea_key,'subarea',coalesce(sa.name,s.subarea),
              'occupant_name',s.occupant_name,'profile_id',s.profile_id,'scope',s.scope,
              'is_reference',s.is_reference,'merged_into_code',s.merged_into_code,
              'mission',s.mission,'summary',s.summary,'authority',s.authority,'escalation',s.escalation,
              'kpis',coalesce((
                select jsonb_agg(jsonb_build_object(
                  'name',k.name,'frequency',k.frequency,'formula',k.formula,'target_note',k.target_note
                ) order by k.name)
                from alliance_data.org_kpis k
                where k.owner_seat_code=s.code and k.is_active and k.archived_at is null
              ),'[]'::jsonb)
            ) order by s.code)
            from alliance_data.org_seats s
            left join alliance_data.org_subareas sa on sa.key=s.subarea_key
            where s.area_key=a.key and s.is_active and s.archived_at is null
          ),'[]'::jsonb)
        ) order by a.display_order)
        from alliance_data.org_areas a
        where a.is_active and a.archived_at is null
      ),'[]'::jsonb),
      'executive_seats',coalesce((
        select jsonb_agg(jsonb_build_object(
          'code',s.code,'title',s.title,'level',s.level,'occupant_name',s.occupant_name,'profile_id',s.profile_id,
          'is_reference',s.is_reference,'merged_into_code',s.merged_into_code,
          'mission',s.mission,'summary',s.summary,'authority',s.authority,'escalation',s.escalation
        ) order by s.code)
        from alliance_data.org_seats s
        where s.area_key is null and s.is_active and s.archived_at is null
      ),'[]'::jsonb),
      'rituals',coalesce((
        select jsonb_agg(to_jsonb(r)-'created_at'-'updated_at' order by r.code)
        from alliance_data.management_rituals r
        where r.is_active and r.archived_at is null
      ),'[]'::jsonb),
      'management_cycle','Planejar → Estruturar → Executar → Validar → Medir → Corrigir → Aprender'
    )
  end;
$function$;

revoke all on function public.organization_snapshot() from public, anon;
grant execute on function public.organization_snapshot() to authenticated;

create or replace function public.meu_acesso()
returns jsonb
language sql
stable security definer
set search_path to 'public','pg_temp'
as $function$
  select case
    when auth.uid() is null then jsonb_build_object('autenticado',false)
    else jsonb_build_object(
      'autenticado',true,
      'perfil',(
        select jsonb_build_object(
          'id',p.id,'nome',p.nome,'email',p.email,'foto_url',p.foto_url,'papel',p.papel,
          'cargo',p.cargo,'area_id',p.area_id,'ativo',p.ativo,'tipo_membro',p.tipo_membro,
          'configuracoes',p.configuracoes,'onboarding_version',p.onboarding_version,
          'onboarding_completed_at',p.onboarding_completed_at
        )
        from public.profiles p where p.id=auth.uid()
      ),
      'organizacao',public.meu_perfil_organizacional(),
      'marcas',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',b.id,'nome',b.nome,'slug',b.slug,'foto_url',b.foto_url,'cor',b.cor
        ) order by b.nome)
        from public.profile_brands pb
        join public.brands b on b.id=pb.brand_id
        where pb.profile_id=auth.uid() and pb.ativo and b.ativo
      ),'[]'::jsonb),
      'convite',(
        select jsonb_build_object('aceito_em',c.aceito_em,'papel',c.papel,'nome',c.nome)
        from public.equipe_convites c
        join public.profiles p on p.id=auth.uid()
        where lower(c.email)=lower(p.email)
        limit 1
      )
    )
  end
$function$;

revoke all on function public.meu_acesso() from public,anon;
grant execute on function public.meu_acesso() to authenticated;

create or replace function public.meu_onboarding()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public','app','pg_temp'
as $function$
declare
  p public.profiles%rowtype;
  v_selected uuid[] := array[]::uuid[];
begin
  if auth.uid() is null then return jsonb_build_object('autenticado',false); end if;

  select * into p from public.profiles where id=auth.uid();
  if not found then return jsonb_build_object('autenticado',true,'erro','perfil'); end if;

  select coalesce(array_agg(pb.brand_id),array[]::uuid[])
    into v_selected
  from public.profile_brands pb
  join public.brands b on b.id=pb.brand_id and b.ativo
  where pb.profile_id=p.id and pb.ativo;

  return jsonb_build_object(
    'autenticado',true,
    'precisa',coalesce(p.onboarding_version,0)<1,
    'versao',coalesce(p.onboarding_version,0),
    'perfil',jsonb_build_object(
      'id',p.id,'nome',p.nome,'email',p.email,'foto_url',p.foto_url,
      'cargo',p.cargo,'area_id',p.area_id,'papel',p.papel
    ),
    'organizacao',public.meu_perfil_organizacional(),
    'areas',coalesce((
      select jsonb_agg(jsonb_build_object('id',a.id,'nome',a.nome,'slug',a.slug) order by a.ordem,a.nome)
      from public.areas a
    ),'[]'::jsonb),
    'marcas',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',b.id,'nome',b.nome,'slug',b.slug,'foto_url',b.foto_url,
        'cor',b.cor,'descricao',b.descricao,'selecionada',b.id=any(v_selected)
      ) order by b.nome)
      from public.brands b where b.ativo
    ),'[]'::jsonb)
  );
end
$function$;

revoke all on function public.meu_onboarding() from public,anon;
grant execute on function public.meu_onboarding() to authenticated;

commit;
