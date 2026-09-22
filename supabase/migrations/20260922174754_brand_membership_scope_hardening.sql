create or replace function app.pode_ver_perfil(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select app.estou_ativo() and (
    p_profile_id=(select auth.uid())
    or app.sou_admin()
    or exists (
      select 1 from public.profile_brands pb
      where pb.profile_id=p_profile_id
        and app.pode_acessar_marca(pb.brand_id)
    )
  );
$$;

revoke all on function app.pode_ver_perfil(uuid) from public;
revoke all on function app.pode_ver_perfil(uuid) from anon;
grant execute on function app.pode_ver_perfil(uuid) to authenticated;

create or replace function app.pode_acessar_mapa(p_map_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.planning_maps pm
    where pm.id=p_map_id and app.pode_acessar_marca(pm.brand_id)
  );
$$;

revoke all on function app.pode_acessar_mapa(uuid) from public;
revoke all on function app.pode_acessar_mapa(uuid) from anon;
grant execute on function app.pode_acessar_mapa(uuid) to authenticated;

drop policy if exists profiles_leitura on public.profiles;
create policy profiles_leitura on public.profiles for select to authenticated using (app.pode_ver_perfil(id));

drop policy if exists profile_brands_leitura on public.profile_brands;
create policy profile_brands_leitura on public.profile_brands for select to authenticated using (app.pode_acessar_marca(brand_id));

drop policy if exists task_lists_read on public.task_lists;
drop policy if exists task_lists_insert on public.task_lists;
drop policy if exists task_lists_update on public.task_lists;
create policy task_lists_read on public.task_lists for select to authenticated using (app.pode_acessar_marca(brand_id));
create policy task_lists_insert on public.task_lists for insert to authenticated with check (app.pode_acessar_marca(brand_id));
create policy task_lists_update on public.task_lists for update to authenticated using (app.pode_acessar_marca(brand_id)) with check (app.pode_acessar_marca(brand_id));

drop policy if exists planning_months_read on public.planning_months;
drop policy if exists planning_months_insert on public.planning_months;
drop policy if exists planning_months_update on public.planning_months;
create policy planning_months_read on public.planning_months for select to authenticated using (app.pode_acessar_marca(brand_id));
create policy planning_months_insert on public.planning_months for insert to authenticated with check (app.pode_acessar_marca(brand_id));
create policy planning_months_update on public.planning_months for update to authenticated using (app.pode_acessar_marca(brand_id)) with check (app.pode_acessar_marca(brand_id));

drop policy if exists planning_maps_read on public.planning_maps;
drop policy if exists planning_maps_insert on public.planning_maps;
drop policy if exists planning_maps_update on public.planning_maps;
create policy planning_maps_read on public.planning_maps for select to authenticated using (app.pode_acessar_marca(brand_id));
create policy planning_maps_insert on public.planning_maps for insert to authenticated with check (app.pode_acessar_marca(brand_id));
create policy planning_maps_update on public.planning_maps for update to authenticated using (app.pode_acessar_marca(brand_id)) with check (app.pode_acessar_marca(brand_id));

drop policy if exists planning_map_nodes_read on public.planning_map_nodes;
drop policy if exists planning_map_nodes_insert on public.planning_map_nodes;
drop policy if exists planning_map_nodes_update on public.planning_map_nodes;
create policy planning_map_nodes_read on public.planning_map_nodes for select to authenticated using (app.pode_acessar_mapa(map_id));
create policy planning_map_nodes_insert on public.planning_map_nodes for insert to authenticated with check (app.pode_acessar_mapa(map_id));
create policy planning_map_nodes_update on public.planning_map_nodes for update to authenticated using (app.pode_acessar_mapa(map_id)) with check (app.pode_acessar_mapa(map_id));

drop policy if exists alliance_automations_read on public.alliance_automations;
drop policy if exists alliance_automations_insert on public.alliance_automations;
drop policy if exists alliance_automations_update on public.alliance_automations;
create policy alliance_automations_read on public.alliance_automations for select to authenticated using (app.pode_acessar_marca(brand_id));
create policy alliance_automations_insert on public.alliance_automations for insert to authenticated with check (app.pode_acessar_marca(brand_id));
create policy alliance_automations_update on public.alliance_automations for update to authenticated using (app.pode_acessar_marca(brand_id)) with check (app.pode_acessar_marca(brand_id));

drop policy if exists campaign_results_read on public.campaign_results;
drop policy if exists campaign_results_insert on public.campaign_results;
drop policy if exists campaign_results_update on public.campaign_results;
create policy campaign_results_read on public.campaign_results for select to authenticated using (app.pode_acessar_marca(brand_id));
create policy campaign_results_insert on public.campaign_results for insert to authenticated with check (app.pode_acessar_marca(brand_id));
create policy campaign_results_update on public.campaign_results for update to authenticated using (app.pode_acessar_marca(brand_id)) with check (app.pode_acessar_marca(brand_id));

drop policy if exists campaign_revenue_sources_read on public.campaign_revenue_sources;
drop policy if exists campaign_revenue_sources_insert on public.campaign_revenue_sources;
drop policy if exists campaign_revenue_sources_update on public.campaign_revenue_sources;
create policy campaign_revenue_sources_read on public.campaign_revenue_sources for select to authenticated using (app.pode_acessar_marca(brand_id));
create policy campaign_revenue_sources_insert on public.campaign_revenue_sources for insert to authenticated with check (app.pode_acessar_marca(brand_id));
create policy campaign_revenue_sources_update on public.campaign_revenue_sources for update to authenticated using (app.pode_acessar_marca(brand_id)) with check (app.pode_acessar_marca(brand_id));

drop policy if exists alliance_clients_read on public.alliance_clients;
drop policy if exists alliance_clients_insert on public.alliance_clients;
drop policy if exists alliance_clients_update on public.alliance_clients;
create policy alliance_clients_read on public.alliance_clients for select to authenticated using ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id));
create policy alliance_clients_insert on public.alliance_clients for insert to authenticated with check ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id));
create policy alliance_clients_update on public.alliance_clients for update to authenticated using ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id)) with check ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id));

drop policy if exists alliance_tags_read on public.alliance_tags;
drop policy if exists alliance_tags_insert on public.alliance_tags;
drop policy if exists alliance_tags_update on public.alliance_tags;
create policy alliance_tags_read on public.alliance_tags for select to authenticated using ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id));
create policy alliance_tags_insert on public.alliance_tags for insert to authenticated with check ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id));
create policy alliance_tags_update on public.alliance_tags for update to authenticated using ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id)) with check ((brand_id is null and app.estou_ativo() and not app.eh_externo()) or app.pode_acessar_marca(brand_id));
