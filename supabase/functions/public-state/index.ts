import { createClient } from 'npm:@supabase/supabase-js@2.95.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-alliance-sync-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const withId = (v: unknown): v is Array<Record<string, unknown> & { id: unknown }> => Array.isArray(v) && v.every((x) => isObj(x) && x.id != null)
const PROTECTED_KEYS = new Set(['central.tasks.vitor-gutierrez','allianceos.tasks.vitor-gutierrez'])
const validKey = (k: string) => (k.startsWith('central.') || k.startsWith('allianceos.')) && !k.includes('.__') && k.length <= 220

function planningMapInfo(key: string) {
  const match = key.match(/^(central|allianceos)\.planning\.map\.([^.]+)\.(.+)$/)
  return match ? { prefix: match[1], owner: match[2], brand: match[3] } : null
}

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

async function normalizePlanningMap(admin: ReturnType<typeof adminClient>, value: unknown) {
  if (!isObj(value) || !Array.isArray(value.nos)) return value

  const originalNodes = value.nos.filter(isObj)
  const campaignIds = [...new Set(
    originalNodes
      .map((node) => String(node.campId || '').trim())
      .filter(Boolean)
  )]

  const campaigns = new Map<string, { name: string; archived: boolean }>()
  if (campaignIds.length) {
    const { data, error } = await admin
      .schema('alliance_data')
      .from('campaigns')
      .select('id,name,is_archived')
      .in('id', campaignIds)
    if (!error) {
      for (const row of data || []) {
        campaigns.set(String(row.id), {
          name: String(row.name || ''),
          archived: row.is_archived === true,
        })
      }
    } else {
      console.warn('[planning map] campaign lookup failed', error.message)
    }
  }

  const rootIds = new Set(
    originalNodes
      .filter((node) => node.pai == null)
      .map((node) => String(node.id))
  )

  const removedIds = new Set<string>()
  const prepared: Record<string, unknown>[] = []

  for (const source of originalNodes) {
    const node = { ...source }
    const id = String(node.id ?? '')
    const parent = node.pai == null ? null : String(node.pai)
    const campId = String(node.campId || '').trim()
    const campaign = campId ? campaigns.get(campId) : undefined

    // A campaign archived in the database must not return as a top-level
    // campaign node in the planning map.
    if (parent && rootIds.has(parent) && campaign?.archived) {
      removedIds.add(id)
      continue
    }

    // Root/structural nodes sometimes inherited campId from old UI bugs.
    // Keep the node, but remove the misleading campaign badge/link.
    if (campId && (parent == null || (campaign && !(
      normalizeText(node.t).includes(normalizeText(campaign.name)) ||
      normalizeText(campaign.name).includes(normalizeText(node.t))
    )))) {
      delete node.campId
    }

    prepared.push(node)
  }

  // If a removed duplicate had children, reparent them to the root instead of
  // leaving invisible/orphaned nodes.
  for (const node of prepared) {
    const parent = node.pai == null ? null : String(node.pai)
    if (parent && removedIds.has(parent)) {
      const firstRoot = originalNodes.find((candidate) => candidate.pai == null)
      node.pai = firstRoot?.id ?? null
    }
  }

  // Exact sibling duplicates are a visual corruption, not distinct entities.
  // Keep the oldest node id and preserve one visual instance.
  const seen = new Set<string>()
  const deduped: Record<string, unknown>[] = []
  for (const node of prepared.sort((a,b) => Number(a.id || 0) - Number(b.id || 0))) {
    const signature = [
      node.pai == null ? 'root' : String(node.pai),
      normalizeText(node.t),
      String(node.campId || ''),
    ].join('|')
    if (seen.has(signature)) continue
    seen.add(signature)
    deduped.push(node)
  }

  const maxId = deduped.reduce((max,node) => Math.max(max, Number(node.id || 0)), 0)
  return {
    ...value,
    nos: deduped,
    prox: Math.max(Number(value.prox || 1), maxId + 1),
  }
}

type RemovalAttempt = { path: string, id: string }

const CAMPAIGNS_KEY = 'central.campaigns.vitor-gutierrez'
const CAMPAIGN_META_KEYS = new Set(['history','updatedAt','updated_at','updatedBy','updated_by','origin'])
function campaignComparable(value: unknown) {
  if (!isObj(value)) return value
  const out: Record<string, unknown> = {}
  for (const [key,val] of Object.entries(value)) if (!CAMPAIGN_META_KEYS.has(key)) out[key]=val
  return out
}
function campaignChangedKeys(before: Record<string, unknown>|undefined, after: Record<string, unknown>) {
  const a=before||{}
  return [...new Set([...Object.keys(a),...Object.keys(after)])]
    .filter((key)=>!CAMPAIGN_META_KEYS.has(key) && !equal(a[key],after[key]))
}
function annotateCampaignInterfaceChanges(
  current: unknown,
  next: unknown,
  actorId: string,
  actorName: string,
) {
  if (!withId(next)) return next
  const oldById=new Map(
    (Array.isArray(current)?current:[])
      .filter(isObj)
      .filter((x)=>x.id!=null)
      .map((x)=>[String(x.id),x]),
  )
  const at=new Date().toISOString()
  return next.map((item)=>{
    const id=String(item.id)
    const before=oldById.get(id)
    const changed=!before || !equal(campaignComparable(before),campaignComparable(item))
    if(!changed)return item
    const keys=campaignChangedKeys(before,item)
    const history=Array.isArray(item.history)?[...item.history]:[]
    history.unshift({
      at,
      by:actorName||'Usuário',
      authorId:actorId,
      origin:'interface',
      campos:keys,
      text:before
        ? 'Campanha atualizada pela interface'+(keys.length?': '+keys.join(', '):'')+'.'
        : 'Campanha criada pela interface.',
    })
    return {
      ...item,
      history,
      updatedAt:at,
      updatedBy:actorId,
      origin:'interface',
    }
  })
}

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


const TASKS_KEY = 'central.tasks.vitor-gutierrez'

async function featureEnabled(admin: ReturnType<typeof adminClient>, key: string) {
  const { data, error } = await admin
    .from('system_feature_flags')
    .select('enabled,config')
    .eq('key', key)
    .maybeSingle()
  if (error) {
    console.warn('[feature flag] read failed', key, error.message)
    return { enabled: false, config: {} as Record<string, unknown> }
  }
  return {
    enabled: data?.enabled === true,
    config: isObj(data?.config) ? data.config : {},
  }
}

async function taskMirrorItem(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin.rpc('alliance_task_mirror_sync_payload')
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row || row.in_sync !== true) return null
  if (Number(row.source_count || 0) !== Number(row.mirror_count || 0)) return null
  if (!row.source_hash || row.source_hash !== row.mirror_hash) return null
  if (!Array.isArray(row.valor)) return null
  return {
    chave: TASKS_KEY,
    valor: row.valor,
    atualizado_em: row.atualizado_em,
  }
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
    const { data: profile, error: profileError } = await userDb.from('profiles').select('id,nome,papel,ativo,tipo_membro').eq('id', actorId).maybeSingle()
    if (profileError || !profile?.ativo || profile?.papel === 'externo' || profile?.tipo_membro === 'servico') return ok({ error: 'access_not_allowed' }, 403)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = String(url.searchParams.get('mode') || '')
      const key = String(url.searchParams.get('key') || '')
      if (key) {
        if (!validKey(key)) return ok({ error: 'invalid_key' }, 400)
        if (key === TASKS_KEY) {
          const flag = await featureEnabled(admin, 'tasks_mirror_read')
          if (flag.enabled) {
            try {
              const mirror = await taskMirrorItem(admin)
              if (mirror) return ok({ item: mirror, user_id: actorId, read_source: 'alliance_data' })
              console.warn('[tasks mirror] parity check failed; falling back to operacional_estado')
            } catch (e) {
              console.warn('[tasks mirror] read failed; falling back to operacional_estado', e)
            }
          }
        }
        const { data, error } = await userDb.from('operacional_estado').select('chave,valor,atualizado_em').eq('chave', key).is('dono', null).maybeSingle()
        if (error) throw error
        if (data) return ok({ item: data, user_id: actorId, read_source: 'operacional_estado' })

        const mapInfo = planningMapInfo(key)
        if (mapInfo) {
          const pattern = 'central.planning.map.%.' + mapInfo.brand
          const { data: fallback, error: fallbackError } = await userDb
            .from('operacional_estado')
            .select('valor,atualizado_em')
            .like('chave', pattern)
            .is('dono', null)
            .order('atualizado_em', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (fallbackError) throw fallbackError
          if (fallback) {
            return ok({
              item: { chave: key, valor: fallback.valor, atualizado_em: fallback.atualizado_em },
              user_id: actorId,
              read_source: 'planning_map_shared_fallback',
            })
          }
        }
        return ok({ item: null, user_id: actorId, read_source: 'operacional_estado' })
      }
      if (mode === 'meta') {
        const { data, error } = await userDb.from('operacional_estado').select('chave,atualizado_em').is('dono', null).or('chave.like.central.%,chave.like.allianceos.%').order('chave')
        if (error) throw error
        return ok({ items: data || [], user_id: actorId, mode: 'meta' })
      }
      if (mode === 'full') {
        const { data, error } = await userDb.from('operacional_estado').select('chave,valor,atualizado_em').is('dono', null).or('chave.like.central.%,chave.like.allianceos.%').order('chave')
        if (error) throw error
        return ok({ items: data || [], user_id: actorId, mode: 'full' })
      }
      // Clientes antigos faziam download de todo o workspace a cada 20 s.
      // Falhar de forma explícita preserva o cache local desses clientes e
      // interrompe o egress até que a aba seja recarregada com o sync v2.
      return ok({ error: 'client_upgrade_required' }, 409)
    }
    if (req.method !== 'POST') return ok({ error: 'method_not_allowed' }, 405)
    const raw = await req.text()
    if (raw.length > 12_000_000) return ok({ error: 'payload_too_large' }, 413)
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
    // Planning maps contain visual nodes. Removing a node from the canvas is not
    // a destructive deletion of the underlying campaign/task entity, so do not
    // resurrect omitted map nodes through the shared-array anti-delete merge.
    // For map state, the latest authenticated save is authoritative.
    const mapInfo = planningMapInfo(chave)
    const isPlanningMap = !!mapInfo
    let finalValue = isPlanningMap
      ? await normalizePlanningMap(admin, body.valor)
      : (currentRow ? merge(body.base, body.valor, currentRow.valor, removalAttempts, "$") : body.valor)
    if (chave === CAMPAIGNS_KEY) {
      finalValue = annotateCampaignInterfaceChanges(
        currentRow?.valor,
        finalValue,
        actorId,
        String(profile.nome || authData.user.email || 'Usuário'),
      )
    }
    if (removalAttempts.length) {
      try { await admin.from('physical_delete_attempts').insert(removalAttempts.slice(0,200).map((a)=>({actor_id:actorId,origin:'interface',entity_type:'operacional_estado_item',entity_id:a.id,details:{chave,path:a.path,blocked:true,reason:'item_omitted_from_shared_state'}}))) } catch {}
    }
    const row={chave,dono:null,valor:finalValue,atualizado_em:new Date().toISOString()}
    const { data, error } = await userDb.from('operacional_estado').upsert(row,{onConflict:'chave,dono'}).select('chave,valor,atualizado_em').single()
    if (error) throw error

    // Planning is shared by brand, not private per user. Mirror an authenticated
    // map save to every existing per-user key and keep one stable shared copy.
    if (mapInfo) {
      const canonicalKey = 'central.planning.map.shared.' + mapInfo.brand
      const now = new Date().toISOString()
      const pattern = 'central.planning.map.%.' + mapInfo.brand
      const { error: mirrorError } = await admin
        .from('operacional_estado')
        .update({ valor: finalValue, atualizado_em: now })
        .like('chave', pattern)
        .is('dono', null)
      if (mirrorError) console.warn('[planning map] mirror existing keys failed', mirrorError.message)

      const { error: canonicalError } = await admin
        .from('operacional_estado')
        .upsert({ chave: canonicalKey, dono: null, valor: finalValue, atualizado_em: now }, { onConflict: 'chave,dono' })
      if (canonicalError) console.warn('[planning map] canonical save failed', canonicalError.message)
    }
    const syncV2 = req.headers.get('x-alliance-sync-version') === '2'
    if (!syncV2) return ok({ok:true,item:data})
    const mergedChanged = !equal(finalValue, body.valor)
    return ok({
      ok:true,
      merged:mergedChanged,
      item:mergedChanged ? data : {chave:data.chave,atualizado_em:data.atualizado_em},
    })
  } catch (e) {
    console.error(e)
    return ok({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
