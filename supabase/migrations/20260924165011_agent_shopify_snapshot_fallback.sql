CREATE OR REPLACE FUNCTION public.agent_operational_summary(p_brand_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_now_sp timestamp := now() at time zone 'America/Sao_Paulo';
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_month_start timestamptz := (date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
  v_next_month timestamptz := ((date_trunc('month', now() at time zone 'America/Sao_Paulo') + interval '1 month') at time zone 'America/Sao_Paulo');
  v_today_start timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo');
  v_tomorrow_start timestamptz := ((date_trunc('day', now() at time zone 'America/Sao_Paulo') + interval '1 day') at time zone 'America/Sao_Paulo');
  v_brand text;
  v_orders_month bigint := 0;
  v_paid_month bigint := 0;
  v_gross_month numeric := 0;
  v_refunds_month numeric := 0;
  v_net_month numeric := 0;
  v_ticket_month numeric := 0;
  v_orders_today bigint := 0;
  v_net_today numeric := 0;
  v_last_order_at timestamptz;
  v_campaigns bigint := 0;
  v_active_campaigns bigint := 0;
  v_deliveries bigint := 0;
  v_active_deliveries bigint := 0;
  v_tasks bigint := 0;
  v_active_tasks bigint := 0;
  v_shopify_status text;
  v_shopify_last_sync timestamptz;
  v_shopify_last_success timestamptz;
  v_shopify_last_error text;
  v_shopify_meta jsonb := '{}'::jsonb;
  v_snapshot jsonb := '{}'::jsonb;
  v_data_mode text := 'none';
begin
  if (select auth.uid()) is null then
    raise exception 'Sessão inválida';
  end if;

  if p_brand_id is null or not app.pode_acessar_marca(p_brand_id) then
    raise exception 'Acesso negado à marca';
  end if;

  select nome into v_brand
  from public.brands
  where id = p_brand_id;

  select
    count(*),
    count(*) filter (
      where lower(coalesce(financial_status,'')) in ('paid','partially_paid','partially_refunded','authorized')
    ),
    coalesce(sum(coalesce(total,0)),0),
    coalesce(sum(coalesce(refunded_amount,0)),0),
    coalesce(sum(greatest(coalesce(total,0) - coalesce(refunded_amount,0),0)),0),
    max(criado_em)
  into
    v_orders_month,
    v_paid_month,
    v_gross_month,
    v_refunds_month,
    v_net_month,
    v_last_order_at
  from alliance_data.commerce_orders
  where brand_id = p_brand_id
    and criado_em >= v_month_start
    and criado_em < v_next_month;

  if v_orders_month > 0 then
    v_data_mode := 'orders';
    v_ticket_month := v_net_month / v_orders_month;
  end if;

  select
    count(*),
    coalesce(sum(greatest(coalesce(total,0) - coalesce(refunded_amount,0),0)),0)
  into v_orders_today, v_net_today
  from alliance_data.commerce_orders
  where brand_id = p_brand_id
    and criado_em >= v_today_start
    and criado_em < v_tomorrow_start;

  select status, last_sync_at, last_success_at, last_error, coalesce(meta,'{}'::jsonb)
  into v_shopify_status, v_shopify_last_sync, v_shopify_last_success, v_shopify_last_error, v_shopify_meta
  from public.integration_sources
  where brand_id = p_brand_id
    and source = 'shopify'
  order by updated_at desc
  limit 1;

  v_snapshot := coalesce(v_shopify_meta->'sales_snapshot','{}'::jsonb);

  if v_orders_month = 0
     and coalesce(v_snapshot->>'month','') = to_char(v_now_sp,'YYYY-MM') then
    v_data_mode := 'snapshot';
    v_orders_month := coalesce((v_snapshot->>'orders_month')::bigint,0);
    v_gross_month := coalesce((v_snapshot->>'total_sales_month')::numeric,0);
    v_net_month := coalesce((v_snapshot->>'net_sales_month')::numeric,0);
    v_ticket_month := coalesce((v_snapshot->>'average_order_value_month')::numeric,0);

    if coalesce(v_snapshot->>'date','') = to_char(v_today,'YYYY-MM-DD') then
      v_orders_today := coalesce((v_snapshot->>'orders_today')::bigint,0);
      v_net_today := coalesce((v_snapshot->>'net_sales_today')::numeric,0);
    end if;
  end if;

  select
    coalesce(tasks,0),
    coalesce(active_tasks,0),
    coalesce(campaigns,0),
    coalesce(active_campaigns,0),
    coalesce(deliveries,0),
    coalesce(active_deliveries,0)
  into
    v_tasks,
    v_active_tasks,
    v_campaigns,
    v_active_campaigns,
    v_deliveries,
    v_active_deliveries
  from alliance_data.brand_operational_summary
  where brand_id = p_brand_id;

  return jsonb_build_object(
    'brand_id', p_brand_id,
    'brand_name', coalesce(v_brand,'Marca'),
    'generated_at', now(),
    'date', v_today,
    'month', to_char(v_now_sp,'YYYY-MM'),
    'sales', jsonb_build_object(
      'data_mode', v_data_mode,
      'orders_month', coalesce(v_orders_month,0),
      'paid_orders_month', coalesce(v_paid_month,0),
      'gross_revenue_month', coalesce(v_gross_month,0),
      'refunds_month', coalesce(v_refunds_month,0),
      'net_revenue_month', coalesce(v_net_month,0),
      'average_ticket_month', coalesce(v_ticket_month,0),
      'orders_today', coalesce(v_orders_today,0),
      'net_revenue_today', coalesce(v_net_today,0),
      'last_order_at', v_last_order_at
    ),
    'operation', jsonb_build_object(
      'tasks', coalesce(v_tasks,0),
      'active_tasks', coalesce(v_active_tasks,0),
      'campaigns', coalesce(v_campaigns,0),
      'active_campaigns', coalesce(v_active_campaigns,0),
      'deliveries', coalesce(v_deliveries,0),
      'active_deliveries', coalesce(v_active_deliveries,0)
    ),
    'shopify', jsonb_build_object(
      'status', coalesce(v_shopify_status,'não configurada'),
      'last_sync_at', v_shopify_last_sync,
      'last_success_at', v_shopify_last_success,
      'last_error', v_shopify_last_error,
      'has_month_data', coalesce(v_orders_month,0) > 0,
      'data_mode', v_data_mode,
      'snapshot_captured_at', v_snapshot->>'captured_at'
    )
  );
end;
$function$


revoke all on function public.agent_operational_summary(uuid) from public;
grant execute on function public.agent_operational_summary(uuid) to authenticated;
