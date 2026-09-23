alter table public.access_center_entries
  add column if not exists pending_secret_labels text[] not null default '{}'::text[];

create or replace function public.access_center_list(p_brand_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Sessão inválida'; end if;

  select coalesce(jsonb_agg(item order by item->>'category',(item->>'sort_order')::int,item->>'name'),'[]'::jsonb)
  into result
  from (
    select jsonb_build_object(
      'id',e.id,'brand_id',e.brand_id,'brand_name',b.nome,'category',e.category,'name',e.name,
      'description',e.description,'kind',e.kind,'status',e.status,'owner',e.owner,'payment_method',e.payment_method,
      'cost_amount',e.cost_amount,'cost_label',e.cost_label,'purchase_date',e.purchase_date,'renewal_day',e.renewal_day,
      'renewal_date',e.renewal_date,'recurrence',e.recurrence,'username',e.username,'recovery_contact',e.recovery_contact,
      'login_url',e.login_url,'two_factor_enabled',e.two_factor_enabled,'notes',e.notes,'sort_order',e.sort_order,
      'source_sheet',e.source_sheet,'source_row',e.source_row,'pending_secret_labels',to_jsonb(e.pending_secret_labels),
      'can_manage',private.access_center_can_manage(e.brand_id),
      'secrets',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',s.id,'label',s.label,'kind',s.secret_kind,'sort_order',s.sort_order
        ) order by s.sort_order,s.label)
        from public.access_center_secrets s where s.entry_id=e.id
      ),'[]'::jsonb)
    ) item
    from public.access_center_entries e
    join public.brands b on b.id=e.brand_id
    where e.status<>'archived'
      and (p_brand_id is null or e.brand_id=p_brand_id)
      and private.access_center_can_view(e.brand_id)
  ) q;

  return coalesce(result,'[]'::jsonb);
end;
$$;

create or replace function public.access_center_set_secret(
  p_entry_id uuid,
  p_secret_id uuid default null,
  p_label text default 'Senha',
  p_kind text default 'password',
  p_value text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path=''
as $$
declare
  v_entry public.access_center_entries%rowtype;
  v_secret_id uuid;
  v_vault_id uuid;
  v_name text;
begin
  select * into v_entry from public.access_center_entries where id=p_entry_id and status<>'archived';
  if not found then raise exception 'Acesso não encontrado'; end if;
  if not private.access_center_can_manage(v_entry.brand_id) then
    raise exception 'Você não tem permissão para editar credenciais desta marca';
  end if;
  if nullif(p_value,'') is null then raise exception 'Valor da credencial obrigatório'; end if;
  if nullif(trim(p_label),'') is null then raise exception 'Rótulo obrigatório'; end if;

  if p_secret_id is null then
    v_secret_id:=gen_random_uuid();
    v_name:='access-center/'||v_entry.brand_id::text||'/'||p_entry_id::text||'/'||v_secret_id::text;
    select vault.create_secret(p_value,v_name,'AllianceOS Central de Acessos · '||trim(p_label)) into v_vault_id;
    insert into public.access_center_secrets(id,entry_id,label,secret_kind,vault_secret_id)
    values(v_secret_id,p_entry_id,trim(p_label),coalesce(nullif(trim(p_kind),''),'password'),v_vault_id);
  else
    select id,vault_secret_id into v_secret_id,v_vault_id
    from public.access_center_secrets
    where id=p_secret_id and entry_id=p_entry_id;
    if not found then raise exception 'Credencial não encontrada'; end if;
    perform vault.update_secret(v_vault_id,p_value,null,'AllianceOS Central de Acessos · '||trim(p_label));
    update public.access_center_secrets
    set label=trim(p_label),secret_kind=coalesce(nullif(trim(p_kind),''),secret_kind),updated_at=now()
    where id=v_secret_id;
  end if;

  update public.access_center_entries
  set pending_secret_labels=array_remove(pending_secret_labels,trim(p_label)),
      updated_by=(select auth.uid()),
      updated_at=now()
  where id=p_entry_id;

  insert into public.access_center_audit(entry_id,brand_id,actor_id,action,metadata)
  values(
    p_entry_id,v_entry.brand_id,(select auth.uid()),
    case when p_secret_id is null then 'create_secret' else 'update_secret' end,
    jsonb_build_object('secret_id',v_secret_id,'label',p_label)
  );

  return v_secret_id;
end;
$$;

revoke all on function public.access_center_list(uuid) from public,anon;
revoke all on function public.access_center_set_secret(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.access_center_list(uuid) to authenticated;
grant execute on function public.access_center_set_secret(uuid,uuid,text,text,text) to authenticated;
