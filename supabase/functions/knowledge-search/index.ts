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

  const taskIntent = /(tarefa|tarefas|prazo|prazos|atrasad|vencid|vencem|vence|pendente|pendentes)/.test(q);
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

  const salesIntent = /(venda|vendas|pedido|pedidos|faturamento|receita|ticket|shopify)/.test(q);
  const campaignIntent = /(campanha|campanhas)/.test(q);
  const deliveryIntent = /(entrega|entregas|aprovacao|aprovação)/.test(q);

  if ((salesIntent || campaignIntent || deliveryIntent) && brandId) {
    const { data: summary, error: summaryError } = await db.rpc("agent_operational_summary", {
      p_brand_id: brandId,
    });

    if (!summaryError && summary) {
      const brand = String(summary.brand_name || "esta marca");
      const sales = summary.sales || {};
      const operation = summary.operation || {};
      const shopify = summary.shopify || {};
      let answer = "";

      if (salesIntent) {
        const ordersMonth = Number(sales.orders_month || 0);
        const paidMonth = Number(sales.paid_orders_month || 0);
        const ordersToday = Number(sales.orders_today || 0);
        const hasData = Boolean(shopify.has_month_data);

        if (!hasData) {
          const status = String(shopify.status || "pendente");
          answer = `Ainda não há pedidos da Shopify sincronizados no AllianceOS para ${brand} neste mês. A integração está com status “${status}”. Assim que a sincronização rodar, eu consigo responder vendas, faturamento e ticket com os dados reais.`;
        } else if (/hoje/.test(q)) {
          answer = `${brand} teve ${ordersToday} ${plural(ordersToday, "pedido")} hoje, com faturamento líquido de ${brl(sales.net_revenue_today)}.`;
        } else if (/ticket/.test(q)) {
          answer = `O ticket médio de ${brand} neste mês está em ${brl(sales.average_ticket_month)}, considerando ${ordersMonth} ${plural(ordersMonth, "pedido")}.`;
        } else if (/(faturamento|receita)/.test(q)) {
          answer = `O faturamento líquido de ${brand} neste mês é ${brl(sales.net_revenue_month)}. O bruto é ${brl(sales.gross_revenue_month)} e os reembolsos somam ${brl(sales.refunds_month)}.`;
        } else {
          answer = `${brand} teve ${ordersMonth} ${plural(ordersMonth, "pedido")} neste mês. ${paidMonth} estão com status financeiro pago/confirmado, e o faturamento líquido acumulado é ${brl(sales.net_revenue_month)}.`;
        }
      } else if (campaignIntent) {
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
