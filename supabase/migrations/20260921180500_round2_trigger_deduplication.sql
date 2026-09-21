-- Deduplicate legacy hardening triggers after round 2.
-- New canonical triggers are allianceos_guard_operational_state_items and allianceos_no_physical_delete.

drop trigger if exists guard_operational_state_items on public.operacional_estado;
drop trigger if exists prevent_physical_delete on public.operacional_estado;

do $$
declare t text;
begin
  foreach t in array array[
    'task_lists','planning_months','planning_maps','planning_map_nodes','campaign_results',
    'campaign_revenue_sources','alliance_tags','alliance_clients','alliance_automations',
    'notifications','task_action_audit','brands','profiles','equipe_convites',
    'legacy_member_links','legacy_member_names','physical_delete_attempts'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('drop trigger if exists prevent_physical_delete on public.%I',t);
    end if;
  end loop;
end
$$;
