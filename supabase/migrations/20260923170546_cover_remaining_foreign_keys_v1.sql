create index if not exists brands_atualizado_por_idx
  on public.brands(atualizado_por);

create index if not exists campaign_results_arquivado_por_idx
  on public.campaign_results(arquivado_por);

create index if not exists equipe_convites_area_id_idx
  on public.equipe_convites(area_id);

create index if not exists equipe_convites_criado_por_idx
  on public.equipe_convites(criado_por);

create index if not exists legacy_member_names_arquivado_por_idx
  on public.legacy_member_names(arquivado_por);

create index if not exists legacy_member_names_atualizado_por_idx
  on public.legacy_member_names(atualizado_por);

create index if not exists legacy_member_names_criado_por_idx
  on public.legacy_member_names(criado_por);

create index if not exists notifications_archived_by_idx
  on public.notifications(archived_by);

create index if not exists operacional_estado_dono_idx
  on public.operacional_estado(dono);

create index if not exists physical_delete_attempts_actor_id_idx
  on public.physical_delete_attempts(actor_id);

create index if not exists profile_brands_brand_id_idx
  on public.profile_brands(brand_id);

create index if not exists profiles_area_id_idx
  on public.profiles(area_id);

create index if not exists workspace_settings_atualizado_por_idx
  on public.workspace_settings(atualizado_por);
