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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const db = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) {
    return json({ error: "unauthorized" }, 401);
  }

  const body = await req.json().catch(() => ({}));
  const query = String(body.query ?? "").trim();
  if (!query) return json({ error: "query_required" }, 400);

  const requested = Number(body.limit ?? 20);
  const limit = Math.max(1, Math.min(Number.isFinite(requested) ? requested : 20, 100));
  const brandId = body.brand_id ? String(body.brand_id) : null;

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
  return json({ query, model: "gte-small", results: data ?? [] });
});
