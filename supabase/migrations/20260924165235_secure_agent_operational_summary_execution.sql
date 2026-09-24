revoke all on function public.agent_operational_summary(uuid) from public;
revoke all on function public.agent_operational_summary(uuid) from anon;
grant execute on function public.agent_operational_summary(uuid) to authenticated;
