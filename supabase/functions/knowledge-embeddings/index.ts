import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const model = new Supabase.ai.Session("gte-small");

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });

  const workerToken = req.headers.get("x-worker-token") ?? "";
  const { data: valid, error: authError } = await db.rpc("ai_validate_worker_token", { p_token: workerToken });
  if (authError || valid !== true) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { data: chunks, error: claimError } = await db.rpc("ai_claim_knowledge_chunks", { p_limit: 1 });
  if (claimError) return Response.json({ error: claimError.message }, { status: 500 });
  const chunk = chunks?.[0];
  if (!chunk) return Response.json({ model: "gte-small", claimed: 0, completed: 0, failed: 0 });

  try {
    const input = ("# " + (chunk.title ?? "") + "\n\n" + (chunk.content ?? "")).slice(0, 12000);
    const embedding = await model.run(input, { mean_pool: true, normalize: true });
    const { data: stored, error: storeError } = await db.rpc("ai_complete_knowledge_embedding", {
      p_id: chunk.id,
      p_content_hash: chunk.content_hash,
      p_embedding: embedding,
      p_model: "gte-small",
    });
    if (storeError) throw storeError;
    return Response.json({ model: "gte-small", claimed: 1, completed: stored === true ? 1 : 0, failed: 0 });
  } catch (error) {
    await db.rpc("ai_fail_knowledge_embedding", {
      p_id: chunk.id,
      p_error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ model: "gte-small", claimed: 1, completed: 0, failed: 1 }, { status: 500 });
  }
});
