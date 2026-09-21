import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const withId = (v: unknown): v is Array<Record<string, unknown> & { id: unknown }> => Array.isArray(v) && v.every((x) => isObj(x) && x.id != null)
const PROTECTED_KEYS = new Set(['central.tasks.vitor-gutierrez','allianceos.tasks.vitor-gutierrez'])
const validKey = (k: string) => (k.startsWith('central.') || k.startsWith('allianceos.')) && !k.includes('.__') && k.length <= 220

type RemovalAttempt = { path: string, id: string }

function mergeList(
  base: unknown,
  mine: Array<Record<string, unknown> & { id: unknown }>,
  server: Array<Record<string, unknown> & { id: unknown }>,
  attempts: RemovalAttempt[],
  path: string,
) {
  const remote = new Map(server.map((x) => [String(x.id), x]))
  const old = new Map((Array.isArray(base) ? base : []).filter(isObj).map((x) => [String(x.id), x]))
  const current = new Map(mine.map((x) => [String(x.id), x]))
  const out: Record<string, unknown>[] = []

  // Omission from a shared array is never physical deletion. Archive explicitly instead.
  for (const [id] of old) if (!current.has(id)) attempts.push({ path, id })

  for (const item of mine) {
    const id = String(item.id)
    const before = old.get(id)
    const fromServer = remote.get(id)
    if (before && fromServer) out.push(merge(before, item, fromServer, attempts, path+'['+id+']') as Record<string, unknown>)
    else if (fromServer) out.push(merge(undefined, item, fromServer, attempts, path+'['+id+']') as Record<string, unknown>)
    else out.push(item)
    remote.delete(id)
  }
  for (const item of remote.values()) out.push(item)
  return out
}

function merge(base: unknown, mine: unknown, server: unknown, attempts: RemovalAttempt[] = [], path = "$"): unknown {
  if (server === undefined || server === null) return mine
  if (Array.isArray(mine) && mine.length === 0 && Array.isArray(base) && base.length > 0) {
    if (withId(base)) for (const row of base) attempts.push({ path, id: String(row.id) })
    return server
  }
  if (withId(mine) && withId(server)) return mergeList(base, mine, server, attempts, path)
  if (isObj(mine) && isObj(server)) {
    const old = isObj(base) ? base : {}
    const out: Record<string, unknown> = {}
    for (const key of new Set([...Object.keys(server), ...Object.keys(mine)])) {
      const had = Object.prototype.hasOwnProperty.call(old, key)
      const has = Object.prototype.hasOwnProperty.call(mine, key)
      if (!has) { out[key] = server[key]; continue }
      if (!had) {
        out[key] = server[key] === undefined ? mine[key] : merge(undefined, mine[key], server[key], attempts, path+'.'+key)
        continue
      }
      out[key] = equal(old[key], mine[key]) ? server[key] : merge(old[key], mine[key], server[key], attempts, path+'.'+key)
    }
    return out
  }
  return base !== undefined && equal(base, mine) ? server : mine
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL') || ''
  let key = ''
  const secretJson = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretJson) { try { key = JSON.parse(secretJson).default || '' } catch {} }
  if (!key) key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!url || !key) throw new Error('Supabase admin configuration unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function authenticatedClient(req: Request) {
  const auth = req.headers.get('Authorization') || ''
  if (!auth.toLowerCase().startsWith('bearer ')) return null
  const url = Deno.env.get('SUPABASE_URL') || ''
  const key = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || ''
  if (!url || !key) throw new Error('Supabase user client configuration unavailable')
  const db = createClient(url, key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.auth.getUser()
  if (error || !data?.user) return null
  return db
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = adminClient()
    const userDb = await authenticatedClient(req)
    if (!userDb) return ok({ error: 'authentication_required' }, 401)
    const { data: authData, error: authError } = await userDb.auth.getUser()
    if (authError || !authData?.user) return ok({ error: 'authentication_required' }, 401)
    const actorId = authData.user.id
    const { data: profile, error: profileError } = await userDb.from('profiles').select('id,papel,ativo,tipo_membro').eq('id', actorId).maybeSingle()
    if (profileError || !profile?.ativo || profile?.papel === 'externo' || profile?.tipo_membro === 'servico') return ok({ error: 'access_not_allowed' }, 403)
    if (req.method === 'GET') {
      const { data, error } = await userDb.from('operacional_estado').select('chave,valor,atualizado_em').is('dono', null).or('chave.like.central.%,chave.like.allianceos.%').order('chave')
      if (error) throw error
      return ok({ items: data || [], user_id: actorId })
    }
    if (req.method !== 'POST') return ok({ error: 'method_not_allowed' }, 405)
    const raw = await req.text()
    if (raw.length > 5_000_000) return ok({ error: 'payload_too_large' }, 413)
    const body = JSON.parse(raw || '{}')
    const chave = String(body.chave || '')
    if (!validKey(chave)) return ok({ error: 'invalid_key' }, 400)
    if (body.deleted === true) {
      try { await admin.from('physical_delete_attempts').insert({actor_id:actorId,origin:'interface',entity_type:'operacional_estado',entity_id:chave,details:{route:'public-state',blocked:true}}) } catch {}
      return ok({ error: 'physical_delete_forbidden_use_archive', chave }, 405)
    }
    const { data: currentRow, error: readError } = await userDb.from('operacional_estado').select('valor').eq('chave', chave).is('dono', null).maybeSingle()
    if (readError) throw readError
    const removalAttempts: RemovalAttempt[] = []
    const finalValue = currentRow ? merge(body.base, body.valor, currentRow.valor, removalAttempts, "$") : body.valor
    if (removalAttempts.length) {
      try { await admin.from('physical_delete_attempts').insert(removalAttempts.slice(0,200).map((a)=>({actor_id:actorId,origin:'interface',entity_type:'operacional_estado_item',entity_id:a.id,details:{chave,path:a.path,blocked:true,reason:'item_omitted_from_shared_state'}}))) } catch {}
    }
    const row={chave,dono:null,valor:finalValue,atualizado_em:new Date().toISOString()}
    const { data, error } = await userDb.from('operacional_estado').upsert(row,{onConflict:'chave,dono'}).select('chave,valor,atualizado_em').single()
    if (error) throw error
    return ok({ok:true,item:data})
  } catch (e) {
    console.error(e)
    return ok({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
