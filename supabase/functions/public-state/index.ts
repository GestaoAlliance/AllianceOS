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

function mergeList(base: unknown, mine: Array<Record<string, unknown> & { id: unknown }>, server: Array<Record<string, unknown> & { id: unknown }>) {
  const remote = new Map(server.map((x) => [String(x.id), x]))
  const old = new Map((Array.isArray(base) ? base : []).filter(isObj).map((x) => [String(x.id), x]))
  const current = new Map(mine.map((x) => [String(x.id), x]))
  for (const id of old.keys()) if (!current.has(id)) remote.delete(id)
  const out: Record<string, unknown>[] = []
  for (const item of mine) {
    const id = String(item.id)
    const before = old.get(id)
    const fromServer = remote.get(id)
    out.push(!before || !equal(before, item) ? item : (fromServer || item))
    remote.delete(id)
  }
  for (const item of remote.values()) out.push(item)
  return out
}

function merge(base: unknown, mine: unknown, server: unknown): unknown {
  if (server === undefined || server === null) return mine
  if (Array.isArray(mine) && mine.length === 0 && Array.isArray(base) && base.length > 0) return server
  if (withId(mine) && withId(server)) return mergeList(base, mine, server)
  if (isObj(mine) && isObj(server)) {
    const old = isObj(base) ? base : {}
    const out: Record<string, unknown> = {}
    for (const key of new Set([...Object.keys(server), ...Object.keys(mine)])) {
      const had = Object.prototype.hasOwnProperty.call(old, key)
      const has = Object.prototype.hasOwnProperty.call(mine, key)
      if (had && !has) continue
      if (!has) { out[key] = server[key]; continue }
      out[key] = !had || !equal(old[key], mine[key]) ? merge(old[key], mine[key], server[key]) : server[key]
    }
    return out
  }
  return mine
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
    if (req.method === 'GET') {
      const { data, error } = await admin.from('operacional_estado')
        .select('chave,valor,atualizado_em')
        .is('dono', null)
        .or('chave.like.central.%,chave.like.allianceos.%')
        .order('chave')
      if (error) throw error
      const items = (data || []).filter((row) => !PROTECTED_KEYS.has(String(row.chave)))
      const userDb = await authenticatedClient(req)
      if (userDb) {
        const { data: protectedRows, error: protectedError } = await userDb.from('operacional_estado')
          .select('chave,valor,atualizado_em')
          .is('dono', null)
          .in('chave', [...PROTECTED_KEYS])
        if (protectedError) throw protectedError
        items.push(...(protectedRows || []))
      }
      items.sort((a,b)=>String(a.chave).localeCompare(String(b.chave)))
      return ok({ items })
    }

    if (req.method !== 'POST') return ok({ error: 'method_not_allowed' }, 405)
    const raw = await req.text()
    if (raw.length > 5_000_000) return ok({ error: 'payload_too_large' }, 413)
    const body = JSON.parse(raw || '{}')
    const chave = String(body.chave || '')
    if (!validKey(chave)) return ok({ error: 'invalid_key' }, 400)
    const protectedKey = PROTECTED_KEYS.has(chave)
    const db = protectedKey ? await authenticatedClient(req) : admin
    if (protectedKey && !db) return ok({ error: 'authentication_required' }, 401)

    if (body.deleted === true) {
      if (protectedKey) return ok({ error: 'task_state_cannot_be_deleted' }, 405)
      const { error } = await db.from('operacional_estado').delete().eq('chave', chave).is('dono', null)
      if (error) throw error
      return ok({ ok: true, deleted: true, chave })
    }

    const { data: currentRow, error: readError } = await db.from('operacional_estado')
      .select('valor').eq('chave', chave).is('dono', null).maybeSingle()
    if (readError) throw readError
    const finalValue = currentRow ? merge(body.base, body.valor, currentRow.valor) : body.valor
    const row = { chave, dono: null, valor: finalValue, atualizado_em: new Date().toISOString() }
    const { data, error } = await db.from('operacional_estado')
      .upsert(row, { onConflict: 'chave,dono' })
      .select('chave,valor,atualizado_em').single()
    if (error) throw error
    return ok({ ok: true, item: data })
  } catch (e) {
    console.error(e)
    return ok({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
