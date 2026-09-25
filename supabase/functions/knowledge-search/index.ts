import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const model = new Supabase.ai.Session("gte-small");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const brl = (value: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

const plural = (n: number, singular: string, pluralForm?: string) =>
  n === 1 ? singular : (pluralForm ?? singular + "s");

const clip = (value: unknown, max = 260) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const db = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const query = String(body.query ?? "").trim();
  if (!query) return json({ error: "query_required" }, 400);

  const requested = Number(body.limit ?? 20);
  const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 20, 100));
  const brandId = body.brand_id ? String(body.brand_id) : null;
  const q = normalize(query);
  const history = Array.isArray(body.history) ? body.history : [];
  const userHistory = history
    .filter((item: any) => item && item.role === "user" && item.text)
    .slice(-4)
    .map((item: any) => normalize(item.text));
  const lastUserContext = userHistory.slice(-1).join(" ");
  const recentUserContext = userHistory.join(" ");
  const hasDirectDomain = /(tarefa|prazo|atrasad|vencid|pendente|cliente|comprador|venda|pedido|faturamento|receita|ticket|shopify|campanha|entrega|aprovacao|aprovação)/.test(q);
  const intentQ = hasDirectDomain ? q : normalize(q + " " + lastUserContext);

  const taskIntent = /(tarefa|tarefas|prazo|prazos|atrasad|vencid|vencem|vence|pendente|pendentes)/.test(intentQ);
  if (taskIntent && brandId) {
    const { data: summary, error: summaryError } = await db.rpc("agent_task_summary", {
      p_brand_id: brandId,
    });
    if (!summaryError && summary) {
      let answer = "";
      if (/(atrasad|vencid|em atraso)/.test(q)) {
        answer = `Há ${summary.overdue ?? 0} tarefas atrasadas em ${summary.brand_name ?? "esta marca"} hoje.`;
        if (Number(summary.due_today ?? 0) > 0) {
          answer += ` Além disso, ${summary.due_today} tarefa${Number(summary.due_today) === 1 ? "" : "s"} vence${Number(summary.due_today) === 1 ? "" : "m"} hoje.`;
        }
      } else if (/hoje/.test(q) && /(prazo|vence|vencem|tarefa|tarefas)/.test(q)) {
        answer = `Há ${summary.due_today ?? 0} tarefa${Number(summary.due_today) === 1 ? "" : "s"} com prazo para hoje em ${summary.brand_name ?? "esta marca"}.`;
      } else if (/(fazendo|andamento)/.test(q)) {
        answer = `Há ${summary.doing ?? 0} tarefa${Number(summary.doing) === 1 ? "" : "s"} em andamento em ${summary.brand_name ?? "esta marca"}.`;
      } else if (/(revisao|revisão)/.test(query.toLowerCase())) {
        answer = `Há ${summary.review ?? 0} tarefa${Number(summary.review) === 1 ? "" : "s"} em revisão em ${summary.brand_name ?? "esta marca"}.`;
      } else {
        answer = `Há ${summary.open ?? 0} tarefas abertas em ${summary.brand_name ?? "esta marca"}.`;
      }

      const overdueTasks = Array.isArray(summary.overdue_tasks) ? summary.overdue_tasks : [];
      const results = overdueTasks.slice(0, 5).map((task: any) => ({
        source_type: "task",
        source_id: task.id,
        title: task.title,
        content: [
          task.due_date ? `Prazo: ${task.due_date}` : "",
          task.status ? `Status: ${task.status}` : "",
          task.priority ? `Prioridade: ${task.priority}` : "",
          Array.isArray(task.assignees) && task.assignees.length ? `Responsável: ${task.assignees.join(", ")}` : "",
        ].filter(Boolean).join(" · "),
        similarity: 1,
        metadata: task,
      }));
      return json({ query, answer, live_summary: summary, results });
    }
  }

  const customerIntent = /(cliente|clientes|comprador|compradores|pessoa.*compr|pessoas.*compr)/.test(intentQ);
  const salesIntent = /(venda|vendas|pedido|pedidos|faturamento|receita|ticket|shopify)/.test(intentQ);
  const campaignIntent = /(campanha|campanhas)/.test(intentQ);
  const deliveryIntent = /(entrega|entregas|aprovacao|aprovação)/.test(intentQ);

  if ((customerIntent || salesIntent || campaignIntent || deliveryIntent) && brandId) {
    const { data: summary, error: summaryError } = await db.rpc("agent_operational_summary", {
      p_brand_id: brandId,
    });

    if (!summaryError && summary) {
      const brand = String(summary.brand_name || "esta marca");
      const sales = summary.sales || {};
      const operation = summary.operation || {};
      const shopify = summary.shopify || {};
      let answer = "";

      if (customerIntent) {
        const customersMonth = Number(sales.customers_month || 0);
        const newCustomersMonth = Number(sales.new_customers_month || 0);
        const returningCustomersMonth = Number(sales.returning_customers_month || 0);
        const customersToday = Number(sales.customers_today || 0);
        const hasCustomerData = Boolean(shopify.has_customer_data);

        if (!hasCustomerData) {
          answer = `Ainda não há dados de clientes sincronizados no AllianceOS para ${brand}. Assim que essa métrica entrar na sincronização, eu consigo responder clientes totais, novos e recorrentes.`;
        } else if (/hoje/.test(q)) {
          answer = `${brand} teve ${customersToday} ${plural(customersToday, "cliente")} hoje.`;
        } else if (/(novo|novos|nova|novas|primeira compra|primeira vez)/.test(intentQ)) {
          answer = `${brand} teve ${newCustomersMonth} ${plural(newCustomersMonth, "cliente novo", "clientes novos")} neste mês.`;
        } else if (/(recorr|retorn|recompr|recompra)/.test(intentQ)) {
          answer = `${brand} teve ${returningCustomersMonth} ${plural(returningCustomersMonth, "cliente recorrente", "clientes recorrentes")} neste mês.`;
        } else {
          answer = `${brand} teve ${customersMonth} ${plural(customersMonth, "cliente único", "clientes únicos")} neste mês.`;
        }
      } else if (salesIntent) {
        const ordersMonth = Number(sales.orders_month || 0);
        const paidMonth = Number(sales.paid_orders_month || 0);
        const ordersToday = Number(sales.orders_today || 0);
        const hasData = Boolean(shopify.has_month_data);
        const dataMode = String(sales.data_mode || shopify.data_mode || "none");

        if (!hasData) {
          const status = String(shopify.status || "pendente");
          answer = `Ainda não há pedidos da Shopify sincronizados no AllianceOS para ${brand} neste mês. A integração está com status “${status}”. Assim que a sincronização rodar, eu consigo responder vendas, faturamento e ticket com os dados reais.`;
        } else if (/hoje/.test(q)) {
          answer = `${brand} teve ${ordersToday} ${plural(ordersToday, "pedido")} hoje, com faturamento líquido de ${brl(sales.net_revenue_today)}.`;
        } else if (/ticket/.test(q)) {
          answer = `O ticket médio de ${brand} neste mês está em ${brl(sales.average_ticket_month)}, considerando ${ordersMonth} ${plural(ordersMonth, "pedido")}.`;
        } else if (/(faturamento|receita)/.test(q)) {
          answer = dataMode === "snapshot"
            ? `As vendas totais de ${brand} neste mês são ${brl(sales.gross_revenue_month)}, com vendas líquidas de ${brl(sales.net_revenue_month)}.`
            : `O faturamento líquido de ${brand} neste mês é ${brl(sales.net_revenue_month)}. O bruto é ${brl(sales.gross_revenue_month)} e os reembolsos somam ${brl(sales.refunds_month)}.`;
        } else {
          answer = dataMode === "snapshot"
            ? `${brand} teve ${ordersMonth} ${plural(ordersMonth, "pedido")} neste mês. As vendas totais somam ${brl(sales.gross_revenue_month)} e as vendas líquidas ${brl(sales.net_revenue_month)}.`
            : `${brand} teve ${ordersMonth} ${plural(ordersMonth, "pedido")} neste mês. ${paidMonth} estão com status financeiro pago/confirmado, e o faturamento líquido acumulado é ${brl(sales.net_revenue_month)}.`;
        }
      } else if (campaignIntent) {
        const campaignContext = normalize(query + " " + recentUserContext);
        const wantsPunctual = /(pontual|pontuais|nao perpetu|não perpetu|sem perpetu|fora do perpetu|fora do perp[eé]tuo)/.test(campaignContext);
        const wantsWeek = /(essa semana|esta semana|semana atual|nesta semana|dessa semana)/.test(campaignContext);
        const wantsToday = /(hoje|agora)/.test(campaignContext);

        if (wantsPunctual || wantsWeek || wantsToday) {
          const { data: campaignState, error: campaignStateError } = await db
            .from("operacional_estado")
            .select("valor")
            .eq("chave", "central.campaigns.vitor-gutierrez")
            .is("dono", null)
            .maybeSingle();

          if (!campaignStateError && Array.isArray(campaignState?.valor)) {
            const asDate = (value: unknown, end = false) => {
              const raw = String(value ?? "").trim();
              if (!raw) return null;
              const d = /^\d{4}-\d{2}-\d{2}$/.test(raw)
                ? new Date(raw + (end ? "T23:59:59-03:00" : "T00:00:00-03:00"))
                : new Date(raw);
              return Number.isNaN(d.getTime()) ? null : d;
            };
            const now = new Date();
            const spDate = new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
            }).format(now);
            const todayStart = new Date(spDate + "T00:00:00-03:00");
            const weekdayName = now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" });
            const weekday = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(weekdayName);
            const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
            const weekStart = new Date(todayStart.getTime() + mondayOffset * 86400000);
            const weekEnd = new Date(weekStart.getTime() + 7 * 86400000 - 1);
            const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);

            const campaigns = (campaignState.valor as any[])
              .filter((item: any) => item && normalize(item.brand) === normalize(brand))
              .filter((item: any) => !(item.archivedAt || item.archived_at || item.is_archived === true))
              .filter((item: any) => !wantsPunctual || !/(perpetuo|perp[eé]tuo)/.test(normalize(item.type)))
              .map((item: any) => ({
                ...item,
                _start: asDate(item.startAt || item.start_at || item.start),
                _end: asDate(item.endAt || item.end_at || item.end, true),
              }))
              .filter((item: any) => item._start && item._end)
              .filter((item: any) => {
                if (wantsToday) return item._start <= todayEnd && item._end >= todayStart;
                if (wantsWeek) return item._start <= weekEnd && item._end >= weekStart;
                return item._start <= now && item._end >= now;
              })
              .sort((a: any, b: any) => a._start.getTime() - b._start.getTime());

            if (campaigns.length) {
              const fmt = (d: Date) => new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit",
              }).format(d);
              const named = campaigns.map((item: any) =>
                "“" + String(item.name || "Sem nome") + "” (" + fmt(item._start) + " a " + fmt(item._end) + ")"
              );
              answer = campaigns.length === 1
                ? "A campanha pontual de " + brand + (wantsWeek ? " nesta semana é " : " agora é ") + named[0] + "."
                : "As campanhas pontuais de " + brand + (wantsWeek ? " nesta semana são: " : " agora são: ") + named.join("; ") + ".";

              const results = campaigns.slice(0, 8).map((item: any) => ({
                source_type: "campaign",
                source_id: item.id,
                title: item.name || "Campanha",
                content: [
                  item.status ? "Status: " + item.status : "",
                  item.type ? "Tipo: " + item.type : "",
                  "Período: " + fmt(item._start) + " a " + fmt(item._end),
                ].filter(Boolean).join(" · "),
                similarity: 1,
                metadata: item,
              }));
              return json({ query, answer, live_summary: summary, results });
            }

            if (wantsPunctual || wantsWeek) {
              answer = "Não encontrei campanha pontual de " + brand + (wantsWeek ? " com período nesta semana." : " em andamento agora.");
              return json({ query, answer, live_summary: summary, results: [] });
            }
          }
        }

        const active = Number(operation.active_campaigns || 0);
        const total = Number(operation.campaigns || 0);
        answer = `${brand} tem ${active} ${plural(active, "campanha")} ativa${active === 1 ? "" : "s"} agora, de ${total} cadastrada${total === 1 ? "" : "s"} no total.`;
      } else if (deliveryIntent) {
        const active = Number(operation.active_deliveries || 0);
        const total = Number(operation.deliveries || 0);
        answer = `${brand} tem ${active} ${plural(active, "entrega")} ativa${active === 1 ? "" : "s"} agora, de ${total} cadastrada${total === 1 ? "" : "s"} no total.`;
      }

      if (answer) return json({ query, answer, live_summary: summary, results: [] });
    }
  }

  const metricLikeIntent = /(quant[oa]s?|n[uú]mero|total|m[eé]dia|taxa|percentual|faturamento|receita|venda|pedido|cliente|comprador|ticket|convers[aã]o|sess[aã]o|acesso|reembolso|desconto|produto|sku|estoque|roas|investimento|custo|cac|ltv)/.test(intentQ);
  if (metricLikeIntent) {
    return json({
      query,
      answer: "Essa é uma pergunta de métrica, mas esse indicador ainda não está estruturado no AllianceOS. Hoje consigo responder diretamente vendas, pedidos, clientes, faturamento, ticket médio, tarefas, campanhas e entregas. Não vou misturar isso com tarefas ou documentos não relacionados.",
      results: []
    });
  }

  const embedding = await model.run(query.slice(0, 12000), {
    mean_pool: true,
    normalize: true,
  });

  const { data, error } = await db.rpc("buscar_conhecimento_semantico", {
    p_query_embedding: embedding,
    p_brand_id: brandId,
    p_limit: limit,
  });

  if (error) return json({ error: error.message }, 400);

  const results = Array.isArray(data) ? data : [];
  const top = results[0];
  const answer = top
    ? `Não encontrei uma métrica direta para essa pergunta. O registro mais relacionado no AllianceOS é “${String(top.title || "Sem título")}”: ${clip(top.content)}`
    : "Não encontrei dados suficientes no AllianceOS para responder essa pergunta ainda.";

  return json({ query, model: "gte-small", answer, results });
});
