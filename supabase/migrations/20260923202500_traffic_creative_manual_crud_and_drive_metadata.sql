create or replace function public.salvar_criativo_trafego(
  p_brand_id uuid,
  p_id uuid default null,
  p_asset_ref text default null,
  p_asset_url text default null,
  p_description text default null,
  p_model text default null,
  p_funnel text default null,
  p_observation text default null,
  p_traffic_name text default null,
  p_audience text default null,
  p_format text default null,
  p_generation text default null,
  p_copy_variant text default null,
  p_cta_variant text default null,
  p_produced boolean default false,
  p_edited boolean default false,
  p_in_traffic boolean default false,
  p_drive_file_id text default null,
  p_drive_folder_id text default null,
  p_drive_name text default null,
  p_drive_mime_type text default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid := coalesce(p_id, extensions.gen_random_uuid());
  v_current_status text;
  v_status text;
  v_metadata jsonb := '{}'::jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Sessão inválida'; end if;
  if p_brand_id is null or not app.pode_acessar_marca(p_brand_id) then
    raise exception 'Sem acesso à marca';
  end if;

  if p_id is not null then
    select c.lifecycle_status,c.metadata into v_current_status,v_metadata
    from alliance_data.traffic_creatives c
    where c.id=p_id and c.brand_id=p_brand_id and c.archived_at is null;
    if not found then raise exception 'Criativo não encontrado'; end if;
  end if;

  v_status := case
    when v_current_status in ('EM_TESTE','VENCEDOR','PERDEDOR','PAUSADO') then v_current_status
    when coalesce(p_in_traffic,false) then 'EM_TRAFEGO'
    when coalesce(p_produced,false) and coalesce(p_edited,false) then 'PRONTO'
    else 'BACKLOG'
  end;

  v_metadata := coalesce(v_metadata,'{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'drive_file_id',nullif(trim(p_drive_file_id),''),
    'drive_folder_id',nullif(trim(p_drive_folder_id),''),
    'drive_name',nullif(trim(p_drive_name),''),
    'drive_mime_type',nullif(trim(p_drive_mime_type),''),
    'created_via','traffic_ui',
    'updated_by',(select auth.uid()),
    'updated_at',clock_timestamp()
  ));

  insert into alliance_data.traffic_creatives(
    id,brand_id,source_system,source_key,asset_ref,asset_url,traffic_name,description,
    model,funnel,observation,audience,format,generation,copy_variant,cta_variant,
    produced,edited,in_traffic,lifecycle_status,metadata
  ) values(
    v_id,p_brand_id,'allianceos','manual-'||replace(v_id::text,'-',''),
    coalesce(nullif(trim(p_asset_ref),''),nullif(trim(p_drive_name),''),'Criativo'),
    nullif(trim(p_asset_url),''),
    nullif(trim(p_traffic_name),''),
    nullif(trim(p_description),''),
    nullif(trim(p_model),''),
    nullif(trim(p_funnel),''),
    nullif(trim(p_observation),''),
    nullif(trim(p_audience),''),
    nullif(upper(trim(p_format)),''),
    nullif(trim(p_generation),''),
    nullif(trim(p_copy_variant),''),
    nullif(trim(p_cta_variant),''),
    coalesce(p_produced,false),
    coalesce(p_edited,false),
    coalesce(p_in_traffic,false),
    v_status,
    v_metadata
  )
  on conflict (id) do update set
    asset_ref=excluded.asset_ref,
    asset_url=excluded.asset_url,
    traffic_name=excluded.traffic_name,
    description=excluded.description,
    model=excluded.model,
    funnel=excluded.funnel,
    observation=excluded.observation,
    audience=excluded.audience,
    format=excluded.format,
    generation=excluded.generation,
    copy_variant=excluded.copy_variant,
    cta_variant=excluded.cta_variant,
    produced=excluded.produced,
    edited=excluded.edited,
    in_traffic=excluded.in_traffic,
    lifecycle_status=v_status,
    metadata=v_metadata,
    updated_at=clock_timestamp();

  return v_id;
end;
$$;

revoke all on function public.salvar_criativo_trafego(
  uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,text,text
) from public,anon;
grant execute on function public.salvar_criativo_trafego(
  uuid,uuid,text,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,text,text,text,text
) to authenticated;

create or replace function public.obter_criativo_trafego(p_creative_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $$
  select to_jsonb(c)
  from alliance_data.traffic_creatives c
  where c.id=p_creative_id
    and c.archived_at is null
    and app.pode_acessar_marca(c.brand_id)
$$;

revoke all on function public.obter_criativo_trafego(uuid) from public,anon;
grant execute on function public.obter_criativo_trafego(uuid) to authenticated;
