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

const asArray = (value: unknown): any[] => Array.isArray(value) ? value : [];

const humanValue = (value: unknown, max = 900) => {
  const parts: string[] = [];
  const walk = (v: any, depth = 0) => {
    if (v == null || parts.join(" · ").length >= max || depth > 4) return;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      const s = String(v).trim();
      if (s) parts.push(s);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v.slice(0, 12)) walk(item, depth + 1);
      return;
    }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v).slice(0, 18)) {
        if (val == null || val === "" || ["id","raw","history","historico"].includes(k)) continue;
        if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          const s = String(val).trim();
          if (s) parts.push(k.replace(/_/g," ") + ": " + s);
        } else {
          walk(val, depth + 1);
        }
      }
    }
  };
  walk(value);
  return clip(parts.join(" · "), max);
};

const dateBR = (value: unknown) => {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric"
  }).format(d);
};

function synthesizeUniversal(query: string, intentQ: string, context: any) {
  const q = normalize(query + " " + intentQ);
  const campaigns = asArray(context?.campaigns);
  const tasks = asArray(context?.tasks);
  const deliveries = asArray(context?.deliveries);
  const results = asArray(context?.results);
  const people = asArray(context?.people);
  const lists = asArray(context?.lists);
  const planning = asArray(context?.planning);
  const positive = (rows: any[]) => {
    const scored = rows.filter((x) => Number(x?.score || 0) > 0);
    return scored.length ? scored : rows.slice(0, 1);
  };

  const campaignWords = /(campanha|oferta|meta|verba|orcamento|orçamento|produto|sku|canal|cronograma|fase|tap|equipe|lancamento|lançamento|dia d|perpetuo|perpétuo)/.test(q);
  if (campaignWords && campaigns.length) {
    const c = positive(campaigns)[0];
    const name = String(c.name || "Campanha");
    if (/(oferta|desconto|brinde|frete|cupom)/.test(q)) {
      const value = humanValue(c.offer || c.sobre_evento || c.tap);
      if (value) return { answer: `A oferta de “${name}” é: ${value}`, entity: c, source_type: "campaign" };
    }
    if (/(produto|produtos|sku)/.test(q)) {
      const value = humanValue(c.products);
      if (value) return { answer: `Os produtos de “${name}” são: ${value}`, entity: c, source_type: "campaign" };
    }
    if (/(responsavel|responsável|equipe|quem faz|quem esta|quem está)/.test(q)) {
      const value = humanValue(c.equipe || c.tap);
      if (value) return { answer: `A equipe/responsáveis de “${name}” são: ${value}`, entity: c, source_type: "campaign" };
    }
    if (/(cronograma|fase|fases|quando|periodo|período|data)/.test(q)) {
      const period = [dateBR(c.start_at), dateBR(c.end_at)].filter(Boolean).join(" a ");
      const detail = humanValue(c.fases || c.cronograma || c.schedule, 1050);
      return { answer: `“${name}” acontece de ${period || "período não informado"}${detail ? ". Cronograma: " + detail : "."}`, entity: c, source_type: "campaign" };
    }
    if (/(meta|objetivo)/.test(q)) {
      const extras = humanValue(c.metas_por_fonte, 650);
      return { answer: `A meta de “${name}” é ${c.goal || "não informada"}${c.objective ? ". Objetivo: " + c.objective : ""}${extras ? ". Metas por fonte: " + extras : ""}.`, entity: c, source_type: "campaign" };
    }
    if (/(verba|orcamento|orçamento|budget|investimento)/.test(q)) {
      const value = humanValue(c.budget || c.metas_por_fonte);
      if (value) return { answer: `A verba/investimento de “${name}” é: ${value}`, entity: c, source_type: "campaign" };
    }
    if (/\btap\b/.test(q)) {
      const value = humanValue(c.tap, 1100);
      if (value) return { answer: `O TAP de “${name}” registra: ${value}`, entity: c, source_type: "campaign" };
    }
    return {
      answer: `“${name}” está com status ${c.status || "não informado"}, tipo ${c.type || "não informado"} e período de ${dateBR(c.start_at) || "—"} a ${dateBR(c.end_at) || "—"}${c.objective ? ". Objetivo: " + c.objective : ""}${c.goal ? ". Meta: " + c.goal : ""}.`,
      entity: c, source_type: "campaign"
    };
  }

  const taskWords = /(tarefa|tarefas|checklist|comentario|comentário|dependencia|dependência|prazo|responsavel|responsável|prioridade|subtarefa)/.test(q);
  if (taskWords && tasks.length) {
    const matches = positive(tasks).slice(0, /quais|lista|tarefas/.test(q) ? 6 : 1);
    if (matches.length > 1) {
      const lines = matches.map((t:any) => {
        const who = asArray(t.assignees).join(", ");
        return `“${t.title}” — ${t.status || "sem status"}${t.due_date_text ? ", prazo " + t.due_date_text : ""}${who ? ", responsável " + who : ""}`;
      });
      return { answer: "Encontrei estas tarefas: " + lines.join("; ") + ".", entity: matches[0], source_type: "task" };
    }
    const t = matches[0];
    if (/(checklist)/.test(q)) return { answer: `O checklist de “${t.title}” é: ${humanValue(t.checklist) || "não informado"}.`, entity:t, source_type:"task" };
    if (/(comentario|comentário)/.test(q)) return { answer: `Os comentários de “${t.title}” são: ${humanValue(t.comments) || "não há comentários registrados"}.`, entity:t, source_type:"task" };
    if (/(dependencia|dependência|bloque)/.test(q)) return { answer: `As dependências de “${t.title}” são: ${humanValue(t.dependencies) || "nenhuma registrada"}.`, entity:t, source_type:"task" };
    const who = asArray(t.assignees).join(", ");
    return {
      answer: `“${t.title}” está ${t.status || "sem status"}, prioridade ${t.priority || "normal"}${t.due_date_text ? ", com prazo " + t.due_date_text : ""}${who ? ", responsável: " + who : ""}${t.project ? ", projeto: " + t.project : ""}${t.description ? ". " + clip(t.description,420) : ""}.`,
      entity:t, source_type:"task"
    };
  }

  if (/(entrega|entregas|arquivo|link|aprovacao|aprovação|material)/.test(q) && deliveries.length) {
    const d = positive(deliveries)[0];
    const extra = /(arquivo|link|material)/.test(q) ? humanValue(d.files || d.links, 700) : clip(d.note || "", 380);
    return {
      answer: `A entrega “${d.title || d.task_title || "Sem título"}” está com status ${d.status || "não informado"}${d.project ? ", projeto " + d.project : ""}${d.sender ? ", enviada por " + d.sender : ""}${d.recipient ? " para " + d.recipient : ""}${extra ? ". " + extra : ""}.`,
      entity:d, source_type:"delivery"
    };
  }

  if (/(resultado|resultados|roas|faturamento.*campanha|campanha.*faturamento|fonte de receita|investimento)/.test(q) && results.length) {
    const rows = positive(results);
    const faturamento = rows.reduce((s:number,r:any)=>s+Number(r.faturamento||0),0);
    const investimento = rows.reduce((s:number,r:any)=>s+Number(r.investimento||0),0);
    const roas = investimento > 0 ? faturamento / investimento : null;
    const canais = [...new Set(rows.map((r:any)=>r.canal).filter(Boolean))].join(", ");
    return {
      answer: `Nos resultados relacionados encontrei faturamento de ${brl(faturamento)} e investimento de ${brl(investimento)}${roas != null ? ", ROAS " + roas.toFixed(2).replace(".",",") : ""}${canais ? ". Canais: " + canais : ""}.`,
      entity:rows[0], source_type:"campaign_result"
    };
  }

  if (/(pessoa|pessoas|time|equipe|cargo|area|área|quem e|quem é)/.test(q) && people.length) {
    const p = positive(people)[0];
    return {
      answer: `${p.nome || "Pessoa"}${p.cargo ? " — " + p.cargo : ""}${p.area ? ", área " + p.area : ""}${p.papel ? ", papel " + p.papel : ""}${p.email ? ". E-mail: " + p.email : ""}.`,
      entity:p, source_type:"profile"
    };
  }

  if (/(lista|listas)/.test(q) && lists.length) {
    const rows = positive(lists).slice(0,6);
    return { answer: "Listas encontradas: " + rows.map((l:any)=>`“${l.nome}”`).join(", ") + ".", entity:rows[0], source_type:"task_list" };
  }

  if (/(planejamento|meta do mes|meta do mês|meta mensal|ticket previsto|ticket medio previsto|ticket médio previsto)/.test(q) && planning.length) {
    const p = planning[0];
    const active = Number(p.meta_ativa || 1);
    const activeValue = p["meta" + active] ?? p.meta1;
    return {
      answer: `O planejamento de ${String(p.mes).padStart(2,"0")}/${p.ano} tem meta ativa de ${brl(activeValue)}${p.ticket_medio_previsto != null ? " e ticket médio previsto de " + brl(p.ticket_medio_previsto) : ""}. As três metas são ${brl(p.meta1)}, ${brl(p.meta2)} e ${brl(p.meta3)}.`,
      entity:p, source_type:"planning_month"
    };
  }

  const candidates = [
    ...campaigns.map((x:any)=>({x,type:"campaign"})),
    ...tasks.map((x:any)=>({x,type:"task"})),
    ...deliveries.map((x:any)=>({x,type:"delivery"})),
    ...people.map((x:any)=>({x,type:"profile"})),
    ...lists.map((x:any)=>({x,type:"task_list"})),
  ].sort((a,b)=>Number(b.x?.score||0)-Number(a.x?.score||0));
  if (candidates[0] && Number(candidates[0].x?.score || 0) > 0) {
    const item = candidates[0].x;
    const title = item.name || item.title || item.nome || item.task_title || "Registro";
    const detail = humanValue(item, 700);
    return { answer: `Encontrei “${title}” no AllianceOS. ${detail}`, entity:item, source_type:candidates[0].type };
  }
  return null;
}

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

  const taskIntent = /(tarefa|tarefas|prazo|prazos|atrasad|vencid|vencem|vence|pendente|pendentes|checklist|subtarefa|dependencia|dependência)/.test(intentQ);
  const taskSummaryIntent = /(quant|total|abert|atrasad|vencid|hoje|fazendo|andamento|revisao|revisão|pendente)/.test(intentQ);
  if (taskIntent && taskSummaryIntent && brandId) {
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
  const campaignResultsIntent = /(resultado|resultados|roas|campanha.*faturamento|faturamento.*campanha|investimento.*campanha|fonte de receita)/.test(intentQ);
  const salesIntent = /(venda|vendas|pedido|pedidos|faturamento|receita|ticket|shopify)/.test(intentQ) && !campaignResultsIntent;
  const campaignIntent = /(campanha|campanhas|lancamento|lançamento|dia d|perpetuo|perpétuo)/.test(intentQ);
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

        const campaignCountIntent = /(quant|total|ativa|ativas|cadastrad|numero|número)/.test(q);
        if (campaignCountIntent) {
          const active = Number(operation.active_campaigns || 0);
          const total = Number(operation.campaigns || 0);
          answer = `${brand} tem ${active} ${plural(active, "campanha")} ativa${active === 1 ? "" : "s"} agora, de ${total} cadastrada${total === 1 ? "" : "s"} no total.`;
        }
      } else if (deliveryIntent) {
        const deliveryCountIntent = /(quant|total|ativa|ativas|cadastrad|numero|número)/.test(q);
        if (deliveryCountIntent) {
          const active = Number(operation.active_deliveries || 0);
          const total = Number(operation.deliveries || 0);
          answer = `${brand} tem ${active} ${plural(active, "entrega")} ativa${active === 1 ? "" : "s"} agora, de ${total} cadastrada${total === 1 ? "" : "s"} no total.`;
        }
      }

      if (answer) return json({ query, answer, live_summary: summary, results: [] });
    }
  }

  if (brandId) {
    const searchText = [query, ...userHistory.slice(-3)].join(" ");
    const { data: universalContext, error: universalError } = await db.rpc("agent_universal_context", {
      p_brand_id: brandId,
      p_query: searchText,
      p_limit: 8,
    });
    if (!universalError && universalContext) {
      const synthesized = synthesizeUniversal(query, normalize(intentQ + " " + recentUserContext), universalContext);
      if (synthesized?.answer) {
        const e = synthesized.entity || {};
        return json({
          query,
          answer: synthesized.answer,
          universal_context: universalContext,
          results: [{
            source_type: synthesized.source_type,
            source_id: e.id || e.campaign_id || "",
            title: e.name || e.title || e.nome || e.task_title || synthesized.source_type,
            content: humanValue(e, 900),
            similarity: Number(e.score || 1),
            metadata: e,
          }],
        });
      }
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
  const answer = top && Number(top.similarity || 0) >= 0.42
    ? `Pelo que está registrado no AllianceOS sobre “${String(top.title || "Sem título")}”: ${clip(top.content, 700)}`
    : "Não encontrei informação suficiente registrada no AllianceOS para responder isso com segurança.";

  return json({ query, model: "gte-small", answer, results });
});
