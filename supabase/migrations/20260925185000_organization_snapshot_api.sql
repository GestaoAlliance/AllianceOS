
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
      'areas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'key',a.key,'name',a.name,'head_seat_code',a.head_seat_code,'head_name',a.head_name,
          'description',a.description,'display_order',a.display_order,
          'seats',coalesce((
            select jsonb_agg(jsonb_build_object(
              'code',s.code,'title',s.title,'level',s.level,'subarea',s.subarea,
              'occupant_name',s.occupant_name,'profile_id',s.profile_id,'scope',s.scope,
              'mission',s.mission,'summary',s.summary,'authority',s.authority,'escalation',s.escalation,
              'kpis',coalesce((
                select jsonb_agg(jsonb_build_object('name',k.name,'frequency',k.frequency,'formula',k.formula,'target_note',k.target_note) order by k.name)
                from alliance_data.org_kpis k
                where k.owner_seat_code=s.code and k.is_active and k.archived_at is null
              ),'[]'::jsonb)
            ) order by s.code)
            from alliance_data.org_seats s
            where s.area_key=a.key and s.is_active and s.archived_at is null
          ),'[]'::jsonb)
        ) order by a.display_order)
        from alliance_data.org_areas a
        where a.is_active and a.archived_at is null
      ),'[]'::jsonb),
      'executive_seats',coalesce((
        select jsonb_agg(jsonb_build_object(
          'code',s.code,'title',s.title,'level',s.level,'occupant_name',s.occupant_name,'profile_id',s.profile_id,
          'mission',s.mission,'summary',s.summary,'authority',s.authority,'escalation',s.escalation
        ) order by s.code)
        from alliance_data.org_seats s
        where s.area_key is null and s.is_active and s.archived_at is null
      ),'[]'::jsonb),
      'rituals',coalesce((
        select jsonb_agg(to_jsonb(r) - 'created_at' - 'updated_at' order by r.code)
        from alliance_data.management_rituals r
        where r.is_active and r.archived_at is null
      ),'[]'::jsonb),
      'management_cycle','Planejar → Estruturar → Executar → Validar → Medir → Corrigir → Aprender'
    )
  end;
$function$;

revoke all on function public.organization_snapshot() from public;
grant execute on function public.organization_snapshot() to authenticated;
