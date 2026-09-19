-- Applied to production as allianceos_full_system_mcp_hardening.
revoke delete on public.planning_months from anon, authenticated, public;
revoke delete on public.planning_maps from anon, authenticated, public;
revoke delete on public.planning_map_nodes from anon, authenticated, public;
revoke delete on public.alliance_clients from anon, authenticated, public;
revoke delete on public.alliance_automations from anon, authenticated, public;
revoke delete on public.campaign_results from anon, authenticated, public;
revoke delete on public.alliance_tags from anon, authenticated, public;
revoke delete on public.alliance_channels from anon, authenticated, public;
create index if not exists planning_months_brand_id_idx on public.planning_months(brand_id);
create index if not exists planning_maps_brand_id_idx on public.planning_maps(brand_id);
create index if not exists planning_maps_month_id_idx on public.planning_maps(month_id);
create index if not exists planning_map_nodes_map_id_idx on public.planning_map_nodes(map_id);
create index if not exists alliance_clients_brand_id_idx on public.alliance_clients(brand_id);
create index if not exists alliance_automations_brand_id_full_idx on public.alliance_automations(brand_id);
create index if not exists campaign_results_brand_id_idx on public.campaign_results(brand_id);
create index if not exists alliance_tags_brand_id_idx on public.alliance_tags(brand_id);
