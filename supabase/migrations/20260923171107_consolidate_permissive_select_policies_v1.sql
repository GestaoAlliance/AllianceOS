-- areas
drop policy if exists areas_admin on public.areas;
drop policy if exists areas_leitura on public.areas;
create policy areas_select on public.areas for select to authenticated
using (app.sou_admin() or (app.estou_ativo() and not app.eh_externo()));
create policy areas_admin_insert on public.areas for insert to authenticated
with check (app.sou_admin());
create policy areas_admin_update on public.areas for update to authenticated
using (app.sou_admin()) with check (app.sou_admin());
create policy areas_admin_delete on public.areas for delete to authenticated
using (app.sou_admin());

-- brands
drop policy if exists brands_admin on public.brands;
drop policy if exists brands_leitura on public.brands;
create policy brands_select on public.brands for select to authenticated
using (app.sou_admin() or app.pode_acessar_marca(id));
create policy brands_admin_insert on public.brands for insert to authenticated
with check (app.sou_admin());
create policy brands_admin_update on public.brands for update to authenticated
using (app.sou_admin()) with check (app.sou_admin());
create policy brands_admin_delete on public.brands for delete to authenticated
using (app.sou_admin());

-- equipe_convites: both old SELECT branches were identical admin checks
drop policy if exists equipe_convites_admin on public.equipe_convites;
drop policy if exists equipe_convites_leitura on public.equipe_convites;
create policy equipe_convites_select on public.equipe_convites for select to authenticated
using (app.sou_admin());
create policy equipe_convites_admin_insert on public.equipe_convites for insert to authenticated
with check (app.sou_admin());
create policy equipe_convites_admin_update on public.equipe_convites for update to authenticated
using (app.sou_admin()) with check (app.sou_admin());
create policy equipe_convites_admin_delete on public.equipe_convites for delete to authenticated
using (app.sou_admin());

-- painel_marcas
drop policy if exists painel_marcas_admin on public.painel_marcas;
drop policy if exists painel_marcas_leitura on public.painel_marcas;
create policy painel_marcas_select on public.painel_marcas for select to authenticated
using (app.sou_admin() or (app.estou_ativo() and not app.eh_externo()));
create policy painel_marcas_admin_insert on public.painel_marcas for insert to authenticated
with check (app.sou_admin());
create policy painel_marcas_admin_update on public.painel_marcas for update to authenticated
using (app.sou_admin()) with check (app.sou_admin());
create policy painel_marcas_admin_delete on public.painel_marcas for delete to authenticated
using (app.sou_admin());

-- profile_brands
drop policy if exists profile_brands_admin on public.profile_brands;
drop policy if exists profile_brands_leitura on public.profile_brands;
create policy profile_brands_select on public.profile_brands for select to authenticated
using (app.sou_admin() or app.pode_acessar_marca(brand_id));
create policy profile_brands_admin_insert on public.profile_brands for insert to authenticated
with check (app.sou_admin());
create policy profile_brands_admin_update on public.profile_brands for update to authenticated
using (app.sou_admin()) with check (app.sou_admin());
create policy profile_brands_admin_delete on public.profile_brands for delete to authenticated
using (app.sou_admin());

-- workspace_settings
drop policy if exists workspace_settings_admin on public.workspace_settings;
drop policy if exists workspace_settings_read on public.workspace_settings;
create policy workspace_settings_select on public.workspace_settings for select to authenticated
using (app.sou_admin() or (app.estou_ativo() and not app.eh_externo()));
create policy workspace_settings_admin_insert on public.workspace_settings for insert to authenticated
with check (app.sou_admin());
create policy workspace_settings_admin_update on public.workspace_settings for update to authenticated
using (app.sou_admin()) with check (app.sou_admin());
create policy workspace_settings_admin_delete on public.workspace_settings for delete to authenticated
using (app.sou_admin());
