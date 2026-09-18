import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.6.0'
import { z } from 'npm:zod@4.3.6'

const TASKS_KEY = 'central.tasks.vitor-gutierrez'
const CAMPAIGNS_KEY = 'central.campaigns.vitor-gutierrez'
const APP_URL = 'https://alliance-os-sooty.vercel.app'

type AnyRow = Record<string, any>

const nowIso = () => new Date().toISOString()
const norm = (v: unknown) => String(v ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim()
const slug = (v: unknown) => norm(v).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const taskLink = (id: string) => `${APP_URL}/?task=${encodeURIComponent(id)}#tasks`
const listId = (brand: string, project: string) => `${brand}::${project}`


function statusCanon(v?: string | null) {
  if (v == null) return undefined
  const n = norm(v)
  if (['a fazer','afazer','pendente','todo','to do'].includes(n)) return 'a fazer'
  if (['fazendo','em andamento','andamento','doing'].includes(n)) return 'fazendo'
  if (['em revisao','revisao','revisar','review'].includes(n)) return 'em revisão'
  if (['bloqueado','blocked'].includes(n)) return 'bloqueado'
  if (['feito','concluido','concluida','concluído','concluída','done'].includes(n)) return 'feito'
  throw new Error('Status inválido. Use: a fazer, fazendo, em revisão, bloqueado ou feito.')
}

function priorityCanon(v?: string | null) {
  if (v == null) return undefined
  const n = norm(v)
  if (['urgente','urgent'].includes(n)) return 'urgent'
  if (['alta','high'].includes(n)) return 'high'
  if (['normal','media','média','medium'].includes(n)) return 'normal'
  if (['baixa','low'].includes(n)) return 'low'
  throw new Error('Prioridade inválida. Use: urgente, alta, normal ou baixa.')
}

function recurrenceFromTask(t: AnyRow) {
  const raw=t.recurrenceRule
  if(raw && typeof raw==='object') return {tipo:raw.tipo||'nenhuma',dias_semana:Array.isArray(raw.dias_semana)?raw.dias_semana:[]}
  const legacy=String(t.recurrence||'none')
  if(legacy==='weekly') return {tipo:'semanal',dias_semana:[]}
  if(legacy==='biweekly') return {tipo:'quinzenal',dias_semana:[]}
  if(legacy==='monthly') return {tipo:'mensal',dias_semana:[]}
  if(legacy==='weekdays') return {tipo:'dias_semana',dias_semana:Array.isArray(t.recurrenceDays)?t.recurrenceDays:[]}
  return {tipo:'nenhuma',dias_semana:[]}
}

function publicTask(t: AnyRow) {
  return {
    id: String(t.id),
    link: taskLink(String(t.id)),
    nome: t.title ?? '',
    descricao_markdown: t.description ?? '',
    lista_id: t.listId ?? null,
    lista: t.project ?? 'Operação',
    marca: t.brand ?? null,
    projeto: t.project ?? 'Operação',
    campanha_id: t.campaignId ?? null,
    responsaveis: Array.isArray(t.assignees) ? t.assignees : [],
    responsaveis_ids: Array.isArray(t.assigneeIds) ? t.assigneeIds : [],
    status: t.status ?? 'a fazer',
    motivo_bloqueio: t.blockedReason ?? null,
    prazo: t.dueAt ?? t.due ?? null,
    prazo_data: t.due ?? (t.dueAt ? String(t.dueAt).slice(0,10) : null),
    prazo_tem_hora: !!t.dueAt,
    prioridade: t.priority ?? 'normal',
    tarefa_mae: t.parentTaskId ?? null,
    recorrencia: recurrenceFromTask(t),
    arquivada: !!t.archivedAt,
    arquivada_em: t.archivedAt ?? null,
    origem: t.source ?? null,
  }
}

function toolText(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }
}


async function actor(supabase: any) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) throw new Error('Usuário OAuth não autenticado.')
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,nome,email,papel,cargo,ativo')
    .eq('id', authData.user.id)
    .maybeSingle()
  if (error || !profile?.ativo) throw new Error('Usuário sem perfil ativo no AllianceOS.')
  return {
    id: String(profile.id),
    nome: profile.nome || authData.user.email || 'Usuário',
    email: profile.email || authData.user.email || null,
    papel: profile.papel || null,
    cargo: profile.cargo || null,
  }
}

async function requireAdmin(supabase: any) {
  const who=await actor(supabase)
  if(who.papel!=='admin') throw new Error('Esta ação exige papel de administrador.')
  return who
}

async function readState(supabase: any, key: string): Promise<AnyRow[]> {
  const { data, error } = await supabase
    .from('operacional_estado')
    .select('valor')
    .eq('chave', key)
    .is('dono', null)
    .maybeSingle()
  if (error) throw new Error(`Sem acesso ao estado "${key}": ${error.message}`)
  if (!data) throw new Error(`Estado "${key}" não encontrado ou não visível para este usuário.`)
  return Array.isArray(data.valor) ? data.valor : []
}

async function writeTasks(supabase: any, tasks: AnyRow[]) {
  const { data, error } = await supabase
    .from('operacional_estado')
    .update({ valor: tasks, atualizado_em: nowIso() })
    .eq('chave', TASKS_KEY)
    .is('dono', null)
    .select('chave')
  if (error) throw new Error(`Não foi possível salvar as tarefas: ${error.message}`)
  if (!data?.length) throw new Error('O usuário autenticado não tem permissão para alterar as tarefas.')
}


async function audit(supabase: any, who: AnyRow, action: string, entityType: string, entityId: string, details: AnyRow = {}) {
  const { error } = await supabase.from('task_action_audit').insert({
    actor_id: who.id, origin: 'mcp', action, entity_type: entityType, entity_id: entityId, details
  })
  if (error) console.error('audit', error.message)
}

async function notifyUsers(supabase: any, who: AnyRow, ids: string[], kind: string, title: string, body: string | null, taskId: string | null, eventKey?: string | null) {
  const unique=[...new Set((ids||[]).filter(Boolean).filter(id=>id!==who.id))]
  if(!unique.length) return
  const rows=unique.map(user_id=>({user_id,actor_id:who.id,kind,title,body,task_id:taskId,event_key:eventKey||null}))
  const { error } = await supabase.from('notifications').insert(rows)
  if(error && !String(error.message).toLowerCase().includes('duplicate')) console.error('notifications',error.message)
}


async function listBrands(supabase: any) {
  const { data, error } = await supabase.from('brands').select('id,nome,slug,ativo').eq('ativo',true).order('nome')
  if(error) throw new Error('Não foi possível listar marcas: '+error.message)
  return data || []
}

async function buildLists(supabase: any, includeArchived=false) {
  const [tasks,brands]=await Promise.all([readState(supabase,TASKS_KEY),listBrands(supabase)])
  let q=supabase.from('task_lists').select('id,nome,brand_id,campanha_id,arquivado_em,criado_em,atualizado_em')
  if(!includeArchived) q=q.is('arquivado_em',null)
  const {data,error}=await q.order('nome')
  if(error) throw new Error('Não foi possível listar listas: '+error.message)
  const brandMap=new Map((brands||[]).map((b:AnyRow)=>[String(b.id),b]))
  return (data||[]).map((x:AnyRow)=>{
    const b=brandMap.get(String(x.brand_id))
    const count=tasks.filter(t=>{
      if(t.archivedAt) return false
      if(String(t.listId||'')===String(x.id)) return true
      return !t.listId && norm(t.brand)===norm(b?.nome) && norm(t.project||'Operação')===norm(x.nome)
    }).length
    return {id:String(x.id),nome:x.nome,marca:b?.nome||null,marca_id:x.brand_id,campanha_id:x.campanha_id||null,tarefas:count,arquivada:!!x.arquivado_em,arquivada_em:x.arquivado_em||null}
  }).sort((a:AnyRow,b:AnyRow)=>String(a.marca).localeCompare(String(b.marca),'pt-BR')||String(a.nome).localeCompare(String(b.nome),'pt-BR'))
}

async function resolveBrand(supabase:any,input:string) {
  const brands=await listBrands(supabase)
  const n=norm(input)
  const b=brands.find((x:AnyRow)=>String(x.id)===String(input)||norm(x.nome)===n||norm(x.slug)===n)
  if(!b) throw new Error('Marca não encontrada. Use listar_marcas para obter valores válidos.')
  return b
}

async function resolveList(supabase:any,input:string,allowArchived=false) {
  const lists=await buildLists(supabase,true)
  const exact=lists.find((x:AnyRow)=>String(x.id)===String(input))
  if(exact){
    if(exact.arquivada&&!allowArchived) throw new Error('A lista está arquivada.')
    return exact
  }
  const n=norm(input)
  const matches=lists.filter((x:AnyRow)=>norm(x.nome)===n||norm(String(x.marca)+' / '+String(x.nome))===n)
  if(matches.length===1){
    if(matches[0].arquivada&&!allowArchived) throw new Error('A lista está arquivada.')
    return matches[0]
  }
  if(!matches.length) throw new Error('Lista não encontrada. Use listar_listas e envie o campo id.')
  throw new Error('Nome de lista ambíguo entre marcas. Use o id retornado por listar_listas.')
}

async function memberDirectory(supabase:any) {
  const [tasks,linksResult,profilesResult,invitesResult]=await Promise.all([
    readState(supabase,TASKS_KEY),
    supabase.from('legacy_member_links').select('legacy_name,profile_id'),
    supabase.from('profiles').select('id,nome,email,papel,cargo,ativo').eq('ativo',true).order('nome'),
    supabase.from('equipe_convites').select('email,nome,cargo,papel,enviado_em,aceito_em').order('nome')
  ])
  if(profilesResult.error) throw new Error('Não foi possível listar membros: '+profilesResult.error.message)
  const profiles=profilesResult.data||[]
  const links=linksResult.data||[]
  const linked=new Set(links.map((x:AnyRow)=>norm(x.legacy_name)))
  const rows:AnyRow[]=profiles.map((p:AnyRow)=>({id:String(p.id),nome:p.nome||p.email,email:p.email,papel:p.papel,cargo:p.cargo,tipo:'usuario',atribuivel:true}))
  const known=new Set(rows.map(r=>norm(r.nome)))
  for(const t of tasks){
    for(const name of Array.isArray(t.assignees)?t.assignees:[]){
      if(!name||known.has(norm(name))||linked.has(norm(name))) continue
      known.add(norm(name))
      rows.push({id:'nome:'+slug(name),nome:name,email:null,papel:null,cargo:null,tipo:'legado',atribuivel:false})
    }
  }
  for(const c of invitesResult.data||[]){
    if(c.aceito_em) continue
    if(profiles.some((p:AnyRow)=>norm(p.email)===norm(c.email))) continue
    rows.push({id:'convite:'+String(c.email),nome:c.nome||c.email,email:c.email,papel:c.papel,cargo:c.cargo,tipo:'convite_pendente',atribuivel:false,enviado_em:c.enviado_em||null})
  }
  return rows
}

async function resolveAssignees(supabase:any,inputs:string[]|undefined) {
  if(!inputs) return undefined
  const members=await memberDirectory(supabase)
  const names:string[]=[]
  const ids:string[]=[]
  for(const input of inputs){
    const n=norm(input)
    const m=members.find((x:AnyRow)=>x.id===input||norm(x.nome)===n||norm(x.email)===n)
    if(!m) throw new Error('Responsável não encontrado: '+input+'. Use listar_membros.')
    if(m.tipo!=='usuario'||!m.atribuivel) throw new Error('"'+m.nome+'" ainda é responsável legado ou convite pendente. Vincule-o a um usuário real antes de atribuir novas tarefas.')
    if(!names.includes(m.nome)) names.push(m.nome)
    if(!ids.includes(m.id)) ids.push(m.id)
  }
  return {names,ids}
}

function findTask(tasks: AnyRow[], id: string) {
  const t = tasks.find(x => String(x.id) === String(id))
  if (!t) throw new Error(`Tarefa "${id}" não encontrada ou não visível para este usuário.`)
  return t
}

function completionProblem(t: AnyRow, tasks: AnyRow[]) {
  const blockers = (Array.isArray(t.dependencies) ? t.dependencies : [])
    .map((id: string) => tasks.find(x => String(x.id) === String(id)))
    .filter(Boolean)
    .filter((x: AnyRow) => x.status !== 'feito')
  if (blockers.length) return `Há dependências pendentes: ${blockers.slice(0,3).map((x: AnyRow)=>x.title).join(', ')}.`
  if (t.conferenceRequired) {
    const items = Array.isArray(t.checklist) ? t.checklist : []
    const pending = items.filter((x: AnyRow) => !x.done)
    if (!items.length) return 'A lista de conferência obrigatória está sem itens.'
    if (pending.length) return `A lista de conferência tem ${pending.length} item(ns) pendente(s).`
  }
  if (t.deliveryRequired && !(Array.isArray(t.deliveries) && t.deliveries.length)) {
    return 'A tarefa exige uma entrega antes de ser concluída.'
  }
  return ''
}


function dueValue(t: AnyRow) {
  return t.dueAt || t.due || null
}

function hasDependencyPath(tasks:AnyRow[],fromId:string,targetId:string,seen=new Set<string>()):boolean {
  if(String(fromId)===String(targetId)) return true
  if(seen.has(String(fromId))) return false
  seen.add(String(fromId))
  const t=tasks.find(x=>String(x.id)===String(fromId))
  if(!t) return false
  return (Array.isArray(t.dependencies)?t.dependencies:[]).some((id:string)=>hasDependencyPath(tasks,id,targetId,seen))
}

const recurrenceSchema=z.object({
  tipo:z.enum(['nenhuma','semanal','quinzenal','mensal','dias_semana']).default('nenhuma'),
  dias_semana:z.array(z.number().int().min(1).max(7)).max(7).optional()
}).optional().describe('Recorrência; dias_semana usa 1=segunda até 7=domingo.')

function applyRecurrence(t:AnyRow,value:AnyRow|null|undefined){
  if(value===undefined) return
  const v=value||{tipo:'nenhuma',dias_semana:[]}
  if(v.tipo==='dias_semana'&&(!Array.isArray(v.dias_semana)||!v.dias_semana.length)) throw new Error('Recorrência por dias da semana exige ao menos um dia.')
  t.recurrenceRule={tipo:v.tipo,dias_semana:Array.isArray(v.dias_semana)?[...new Set(v.dias_semana)].sort():[]}
  t.recurrence=v.tipo==='semanal'?'weekly':v.tipo==='quinzenal'?'biweekly':v.tipo==='mensal'?'monthly':v.tipo==='dias_semana'?'weekdays':'none'
  t.recurrenceDays=t.recurrenceRule.dias_semana
}

function pad(n:number){return String(n).padStart(2,'0')}

function offsetInfo(iso:string){
  const m=String(iso).match(/(Z|[+-]\d{2}:\d{2})$/)
  if(!m||m[1]==='Z') return {minutes:0,suffix:'Z'}
  const sign=m[1][0]==='-'?-1:1
  return {minutes:sign*(Number(m[1].slice(1,3))*60+Number(m[1].slice(4,6))),suffix:m[1]}
}

function formatAtOffset(ms:number,off:AnyRow){
  const d=new Date(ms+off.minutes*60000)
  return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+':'+pad(d.getUTCMinutes())+':'+pad(d.getUTCSeconds())+off.suffix
}

function shiftDateTime(iso:string,days=0,months=0){
  const off=offsetInfo(iso)
  const local=new Date(new Date(iso).getTime()+off.minutes*60000)
  if(months) local.setUTCMonth(local.getUTCMonth()+months)
  if(days) local.setUTCDate(local.getUTCDate()+days)
  return formatAtOffset(local.getTime()-off.minutes*60000,off)
}

function shiftDateOnly(date:string,days=0,months=0){
  const m=String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const d=m?new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0)):new Date()
  if(months) d.setUTCMonth(d.getUTCMonth()+months)
  if(days) d.setUTCDate(d.getUTCDate()+days)
  return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())
}

function isoWeekday(d:Date){
  const x=d.getUTCDay()
  return x===0?7:x
}

function nextWeekdayDate(baseDate:string,days:number[]){
  const m=String(baseDate).match(/^(\d{4})-(\d{2})-(\d{2})/)
  const d=m?new Date(Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0)):new Date()
  for(let i=1;i<=14;i++){
    const c=new Date(d);c.setUTCDate(d.getUTCDate()+i)
    if(days.includes(isoWeekday(c))) return c.getUTCFullYear()+'-'+pad(c.getUTCMonth()+1)+'-'+pad(c.getUTCDate())
  }
  return shiftDateOnly(baseDate,7)
}

function nextDue(t:AnyRow){
  const r=recurrenceFromTask(t)
  if(r.tipo==='nenhuma') return null
  const baseDate=t.due||(t.dueAt?String(t.dueAt).slice(0,10):nowIso().slice(0,10))
  let nextDate=baseDate
  if(r.tipo==='semanal') nextDate=shiftDateOnly(baseDate,7)
  if(r.tipo==='quinzenal') nextDate=shiftDateOnly(baseDate,14)
  if(r.tipo==='mensal') nextDate=shiftDateOnly(baseDate,0,1)
  if(r.tipo==='dias_semana') nextDate=nextWeekdayDate(baseDate,r.dias_semana)
  let nextDueAt=null
  if(t.dueAt){
    if(r.tipo==='semanal') nextDueAt=shiftDateTime(t.dueAt,7)
    if(r.tipo==='quinzenal') nextDueAt=shiftDateTime(t.dueAt,14)
    if(r.tipo==='mensal') nextDueAt=shiftDateTime(t.dueAt,0,1)
    if(r.tipo==='dias_semana'){
      const delta=Math.round((new Date(nextDate+'T12:00:00Z').getTime()-new Date(baseDate+'T12:00:00Z').getTime())/86400000)
      nextDueAt=shiftDateTime(t.dueAt,delta)
    }
  }
  return {due:nextDate,dueAt:nextDueAt}
}

function generateNextOccurrence(tasks:AnyRow[],t:AnyRow){
  const r=recurrenceFromTask(t)
  if(r.tipo==='nenhuma') return null
  const existing=tasks.find(x=>String(x.recurrenceGeneratedFrom||'')===String(t.id))
  if(existing) return existing
  const nd=nextDue(t);if(!nd) return null
  const next:AnyRow={
    ...t,
    id:'rec-'+Date.now()+'-'+crypto.randomUUID().slice(0,8),
    status:'a fazer',
    blockedReason:null,
    due:nd.due,
    dueAt:nd.dueAt,
    comments:[],
    deliveries:[],
    archivedAt:null,
    archivedBy:null,
    recurrenceSeriesId:t.recurrenceSeriesId||t.id,
    recurrenceGeneratedFrom:t.id,
    history:[{at:nowIso(),text:'Ocorrência recorrente criada automaticamente a partir de "'+String(t.title||'')+'".'}],
    checklist:(Array.isArray(t.checklist)?t.checklist:[]).map((x:AnyRow)=>({...x,done:false})),
    dependencies:[],
    parentTaskId:null,
    source:'allianceos-mcp'
  }
  tasks.unshift(next)
  return next
}

const dt=z.string().datetime({offset:true}).describe('Data e hora em ISO 8601 com fuso, por exemplo 2026-09-18T18:00:00-03:00')

const protectedHandler = withOAuthProtectedResource(
  withSupabase({ auth: 'user' }, async (req: Request, { supabase }: any) => {
    const handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'AllianceOS Gestão', version: '2.0.0' })

      
      server.registerTool('listar_marcas', {
        description: 'Lista as marcas ativas visíveis ao usuário autenticado. Use o id ou nome ao criar listas.',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      }, async () => toolText({ marcas: await listBrands(supabase) }))

      server.registerTool('listar_listas', {
        description: 'Lista as listas operacionais. Por padrão não mostra listas arquivadas. Use o id retornado em tarefas.',
        inputSchema: z.object({ incluir_arquivadas: z.boolean().default(false) }),
        annotations: { readOnlyHint: true },
      }, async ({ incluir_arquivadas }: { incluir_arquivadas: boolean }) => {
        return toolText({ listas: await buildLists(supabase, incluir_arquivadas) })
      })

      server.registerTool('criar_lista', {
        description: 'Cria uma lista operacional com nome, marca e campanha opcional. Não existe exclusão; use arquivamento.',
        inputSchema: z.object({
          nome: z.string().min(1).max(200),
          marca: z.string().min(1),
          campanha_id: z.string().min(1).nullable().optional(),
        }),
      }, async (args: AnyRow) => {
        const who=await actor(supabase)
        const b=await resolveBrand(supabase,args.marca)
        const {data,error}=await supabase.from('task_lists').insert({
          nome:args.nome.trim(),brand_id:b.id,campanha_id:args.campanha_id||null,criado_por:who.id
        }).select('id,nome,brand_id,campanha_id,arquivado_em').single()
        if(error) throw new Error('Não foi possível criar a lista: '+error.message)
        await audit(supabase,who,'criar_lista','lista',String(data.id),{nome:data.nome,marca:b.nome})
        return toolText({lista:{id:String(data.id),nome:data.nome,marca:b.nome,marca_id:b.id,campanha_id:data.campanha_id,arquivada:false}})
      })

      server.registerTool('atualizar_lista', {
        description: 'Renomeia, troca marca/campanha quando necessário, arquiva ou desarquiva uma lista. Nunca exclui.',
        inputSchema: z.object({
          id:z.string().min(1),
          nome:z.string().min(1).max(200).optional(),
          marca:z.string().min(1).optional(),
          campanha_id:z.string().nullable().optional(),
          arquivada:z.boolean().optional(),
        }),
      }, async (args:AnyRow) => {
        const who=await actor(supabase)
        const old=await resolveList(supabase,args.id,true)
        const b=args.marca?await resolveBrand(supabase,args.marca):{id:old.marca_id,nome:old.marca}
        const patch:AnyRow={}
        if(args.nome!==undefined) patch.nome=args.nome.trim()
        if(args.marca!==undefined) patch.brand_id=b.id
        if(args.campanha_id!==undefined) patch.campanha_id=args.campanha_id
        if(args.arquivada!==undefined){
          patch.arquivado_em=args.arquivada?nowIso():null
          patch.arquivado_por=args.arquivada?who.id:null
        }
        const {data,error}=await supabase.from('task_lists').update(patch).eq('id',old.id).select('id,nome,brand_id,campanha_id,arquivado_em').single()
        if(error) throw new Error('Não foi possível atualizar a lista: '+error.message)
        if(args.nome!==undefined||args.marca!==undefined||args.campanha_id!==undefined){
          const tasks=await readState(supabase,TASKS_KEY)
          let changed=0
          for(const t of tasks){
            const match=String(t.listId||'')===String(old.id)||(!t.listId&&norm(t.brand)===norm(old.marca)&&norm(t.project||'Operação')===norm(old.nome))
            if(!match) continue
            t.listId=String(old.id);t.project=data.nome;t.brand=b.nome;t.campaignId=data.campanha_id||null
            t.history=Array.isArray(t.history)?t.history:[]
            t.history.unshift({at:nowIso(),text:'Lista atualizada via MCP por '+who.nome+'.'})
            changed++
          }
          if(changed) await writeTasks(supabase,tasks)
        }
        await audit(supabase,who,'atualizar_lista','lista',String(data.id),patch)
        return toolText({lista:{id:String(data.id),nome:data.nome,marca:b.nome,marca_id:b.id,campanha_id:data.campanha_id,arquivada:!!data.arquivado_em}})
      })

      

      server.registerTool('consolidar_lista', {
        description: 'Admin: move todas as tarefas de uma lista importada para uma lista destino e arquiva a lista de origem. Não exclui dados.',
        inputSchema: z.object({
          lista_origem: z.string().min(1),
          lista_destino: z.string().min(1),
        }),
      }, async (args:AnyRow) => {
        const who=await requireAdmin(supabase)
        const source=await resolveList(supabase,args.lista_origem,true)
        const dest=await resolveList(supabase,args.lista_destino,false)
        if(String(source.id)===String(dest.id)) throw new Error('A lista de origem e a lista de destino devem ser diferentes.')
        if(source.arquivada) throw new Error('A lista de origem já está arquivada.')

        const tasks=await readState(supabase,TASKS_KEY)
        let count=0
        for(const t of tasks){
          const matches=String(t.listId||'')===String(source.id)
            ||(!t.listId&&norm(t.brand)===norm(source.marca)&&norm(t.project||'Operação')===norm(source.nome))
          if(!matches) continue
          t.listId=String(dest.id)
          t.project=dest.nome
          t.brand=dest.marca
          t.campaignId=dest.campanha_id||null
          t.history=Array.isArray(t.history)?t.history:[]
          t.history.unshift({at:nowIso(),text:'Tarefa movida da lista "'+source.nome+'" para "'+dest.nome+'" via MCP por '+who.nome+'.'})
          count++
        }
        if(!count) throw new Error('Nenhuma tarefa foi encontrada na lista de origem.')
        await writeTasks(supabase,tasks)
        const {error}=await supabase.from('task_lists').update({
          arquivado_em:nowIso(),arquivado_por:who.id
        }).eq('id',source.id)
        if(error) throw new Error('As tarefas foram movidas, mas não foi possível arquivar a lista de origem: '+error.message)
        await audit(supabase,who,'consolidar_lista','lista',String(source.id),{
          lista_origem:source.nome,lista_destino_id:dest.id,lista_destino:dest.nome,tarefas_movidas:count
        })
        return toolText({
          lista_origem:{id:source.id,nome:source.nome,arquivada:true},
          lista_destino:{id:dest.id,nome:dest.nome,marca:dest.marca},
          tarefas_movidas:count
        })
      })

      server.registerTool('listar_membros', {
        description: 'Lista usuários reais, convites pendentes e nomes legados. Só registros tipo usuario com atribuivel=true podem receber novas tarefas.',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      }, async () => toolText({ membros: await memberDirectory(supabase) }))

      server.registerTool('convidar_membro', {
        description: 'Admin: registra convite por e-mail, papel (admin ou membro), cargo e marcas; envia link mágico de acesso.',
        inputSchema: z.object({
          nome:z.string().min(1).max(200),
          email:z.string().email(),
          cargo:z.string().max(200).nullable().optional(),
          papel:z.enum(['admin','membro']).default('membro'),
          marcas:z.array(z.string().min(1)).default([]),
        }),
      }, async (args:AnyRow) => {
        const who=await requireAdmin(supabase)
        const brandIds:string[]=[]
        for(const input of args.marcas||[]){
          const b=await resolveBrand(supabase,input)
          if(!brandIds.includes(String(b.id))) brandIds.push(String(b.id))
        }
        const {error}=await supabase.from('equipe_convites').upsert({
          email:args.email.toLowerCase().trim(),
          nome:args.nome.trim(),
          cargo:args.cargo||null,
          papel:args.papel,
          marcas:brandIds,
          criado_por:who.id,
          enviado_em:nowIso(),
        },{onConflict:'email'})
        if(error) throw new Error('Não foi possível registrar o convite: '+error.message)
        let status='convite registrado'
        const {error:otpError}=await supabase.auth.signInWithOtp({
          email:args.email.toLowerCase().trim(),
          options:{emailRedirectTo:APP_URL},
        })
        if(otpError) status+='; envio de e-mail falhou: '+otpError.message
        await audit(supabase,who,'convidar_membro','membro',args.email,{nome:args.nome,papel:args.papel,marcas:brandIds})
        return toolText({convite:{email:args.email,nome:args.nome,papel:args.papel,status}})
      })

      server.registerTool('migrar_responsavel_legado', {
        description: 'Admin: vincula um nome legado a um usuário real e migra de uma vez todas as tarefas desse nome, preservando histórico.',
        inputSchema: z.object({
          nome_legado:z.string().min(1),
          usuario_id:z.string().uuid(),
        }),
      }, async (args:AnyRow) => {
        const who=await requireAdmin(supabase)
        const {data:p,error}=await supabase.from('profiles').select('id,nome,email,ativo').eq('id',args.usuario_id).maybeSingle()
        if(error||!p?.ativo) throw new Error('Usuário real não encontrado ou inativo.')
        const tasks=await readState(supabase,TASKS_KEY)
        let count=0
        for(const t of tasks){
          const ass=Array.isArray(t.assignees)?t.assignees:[]
          if(!ass.some((x:string)=>norm(x)===norm(args.nome_legado))) continue
          t.assignees=[...new Set(ass.map((x:string)=>norm(x)===norm(args.nome_legado)?p.nome:x))]
          t.assigneeIds=Array.isArray(t.assigneeIds)?t.assigneeIds:[]
          if(!t.assigneeIds.includes(String(p.id))) t.assigneeIds.push(String(p.id))
          t.history=Array.isArray(t.history)?t.history:[]
          t.history.unshift({at:nowIso(),text:'Responsável legado "'+args.nome_legado+'" vinculado a '+p.nome+' por '+who.nome+'.'})
          count++
        }
        if(count) await writeTasks(supabase,tasks)
        const {error:linkError}=await supabase.from('legacy_member_links').upsert({
          legacy_name:args.nome_legado,
          profile_id:p.id,
          migrado_por:who.id,
          migrado_em:nowIso(),
          tarefas_migradas:count,
        },{onConflict:'legacy_name'})
        if(linkError) throw new Error('Não foi possível registrar o vínculo legado: '+linkError.message)
        await notifyUsers(supabase,who,[String(p.id)],'legacy_migration','Tarefas migradas para sua conta',String(count)+' tarefa(s) vinculadas à sua conta.',null)
        await audit(supabase,who,'migrar_responsavel_legado','membro',String(p.id),{nome_legado:args.nome_legado,tarefas_migradas:count})
        return toolText({migracao:{nome_legado:args.nome_legado,usuario:{id:p.id,nome:p.nome,email:p.email},tarefas_migradas:count}})
      })

      
      server.registerTool('buscar_tarefas', {
        description: 'Busca tarefas visíveis ao usuário. Por padrão ignora arquivadas. Retorna prazo completo com hora/fuso quando existe.',
        inputSchema: z.object({
          texto:z.string().min(1).optional(),
          lista:z.string().min(1).optional(),
          responsavel:z.string().min(1).optional(),
          status:z.string().min(1).optional(),
          prazo_de:dt.optional(),
          prazo_ate:dt.optional(),
          incluir_arquivadas:z.boolean().default(false),
          limite:z.number().int().min(1).max(200).default(50),
        }),
        annotations:{readOnlyHint:true},
      }, async (args:AnyRow) => {
        let tasks=await readState(supabase,TASKS_KEY)
        if(!args.incluir_arquivadas) tasks=tasks.filter(t=>!t.archivedAt)
        if(args.texto){
          const n=norm(args.texto)
          tasks=tasks.filter(t=>norm(t.title).includes(n)||norm(t.description).includes(n)||norm(t.blockedReason).includes(n))
        }
        if(args.lista){
          const l=await resolveList(supabase,args.lista,true)
          tasks=tasks.filter(t=>String(t.listId||'')===String(l.id)||(!t.listId&&norm(t.brand)===norm(l.marca)&&norm(t.project||'Operação')===norm(l.nome)))
        }
        if(args.responsavel){
          const n=norm(args.responsavel)
          const members=await memberDirectory(supabase)
          const m=members.find((x:AnyRow)=>x.id===args.responsavel||norm(x.nome)===n||norm(x.email)===n)
          if(!m) throw new Error('Responsável não encontrado.')
          tasks=tasks.filter(t=>(Array.isArray(t.assigneeIds)&&t.assigneeIds.includes(m.id))||(t.assignees||[]).some((a:string)=>norm(a)===norm(m.nome)))
        }
        if(args.status){
          const st=statusCanon(args.status)
          tasks=tasks.filter(t=>t.status===st)
        }
        if(args.prazo_de) tasks=tasks.filter(t=>dueValue(t)&&new Date(dueValue(t)).getTime()>=new Date(args.prazo_de).getTime())
        if(args.prazo_ate) tasks=tasks.filter(t=>dueValue(t)&&new Date(dueValue(t)).getTime()<=new Date(args.prazo_ate).getTime())
        tasks.sort((a,b)=>String(dueValue(a)||'9999').localeCompare(String(dueValue(b)||'9999')))
        return toolText({total:tasks.length,tarefas:tasks.slice(0,args.limite).map(publicTask)})
      })

      server.registerTool('obter_tarefa', {
        description: 'Obtém uma tarefa com subtarefas, comentários, checklist, dependências, entregas, recorrência, bloqueio, arquivamento e histórico.',
        inputSchema:z.object({id:z.string().min(1)}),
        annotations:{readOnlyHint:true},
      }, async ({id}:{id:string}) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,id)
        const depIds=Array.isArray(t.dependencies)?t.dependencies:[]
        const deps=depIds.map((x:string)=>tasks.find(q=>String(q.id)===String(x))).filter(Boolean).map(publicTask)
        const dependents=tasks.filter(x=>(x.dependencies||[]).some((d:string)=>String(d)===String(t.id))).map(publicTask)
        return toolText({tarefa:{
          ...publicTask(t),
          subtarefas:tasks.filter(x=>String(x.parentTaskId||'')===String(id)).map(publicTask),
          comentarios:Array.isArray(t.comments)?t.comments:[],
          checklist:Array.isArray(t.checklist)?t.checklist:[],
          lista_conferencia_obrigatoria:!!t.conferenceRequired,
          dependencias:deps,
          bloqueia:dependents,
          entrega_obrigatoria:!!t.deliveryRequired,
          entregas:Array.isArray(t.deliveries)?t.deliveries:[],
          historico:Array.isArray(t.history)?t.history:[],
          travas_conclusao:completionProblem(t,tasks)||null,
        }})
      })

      
      server.registerTool('criar_tarefa', {
        description: 'Cria tarefa ou subtarefa. Novas atribuições aceitam apenas usuários reais. Prazo preserva data, hora e fuso. Pode configurar recorrência, checklist, dependências e entrega obrigatória.',
        inputSchema:z.object({
          nome:z.string().min(1).max(300),
          descricao_markdown:z.string().max(50000).default(''),
          lista:z.string().min(1),
          responsaveis:z.array(z.string().min(1)).default([]),
          prazo:dt.optional(),
          prioridade:z.string().default('normal'),
          status:z.string().optional(),
          motivo_bloqueio:z.string().max(500).nullable().optional(),
          tarefa_mae:z.string().min(1).optional(),
          recorrencia:recurrenceSchema,
          checklist:z.array(z.string().min(1).max(500)).max(100).default([]),
          checklist_obrigatoria:z.boolean().default(false),
          dependencias:z.array(z.string().min(1)).max(100).default([]),
          entrega_obrigatoria:z.boolean().default(false),
        }),
      }, async (args:AnyRow) => {
        const who=await actor(supabase)
        const [tasks,l,assignees]=await Promise.all([
          readState(supabase,TASKS_KEY),
          resolveList(supabase,args.lista),
          resolveAssignees(supabase,args.responsaveis),
        ])
        if(args.tarefa_mae) findTask(tasks,args.tarefa_mae)
        for(const d of args.dependencias||[]) findTask(tasks,d)
        const st=statusCanon(args.status||'a fazer')||'a fazer'
        if(st==='bloqueado'&&!String(args.motivo_bloqueio||'').trim()) throw new Error('Status bloqueado exige motivo_bloqueio.')
        const id='mcp-'+Date.now()+'-'+crypto.randomUUID().slice(0,8)
        const t:AnyRow={
          id,
          title:args.nome.trim(),
          description:args.descricao_markdown||'',
          status:st,
          blockedReason:st==='bloqueado'?String(args.motivo_bloqueio||'').trim():null,
          assignees:assignees?.names||[],
          assigneeIds:assignees?.ids||[],
          due:args.prazo?String(args.prazo).slice(0,10):null,
          dueAt:args.prazo||null,
          start:null,
          brand:l.marca,
          project:l.nome,
          listId:l.id,
          campaignId:l.campanha_id||null,
          priority:priorityCanon(args.prioridade)||'normal',
          checklist:(args.checklist||[]).map((text:string)=>({id:'check-'+crypto.randomUUID().slice(0,8),text,done:false})),
          conferenceRequired:!!args.checklist_obrigatoria,
          subtasks:[],attachments:[],comments:[],
          history:[{at:nowIso(),text:'Tarefa criada via MCP por '+who.nome+'.'}],
          recurrence:'none',
          recurrenceRule:{tipo:'nenhuma',dias_semana:[]},
          tags:[],
          source:'allianceos-mcp',
          dependencies:[...(args.dependencias||[])],
          parentTaskId:args.tarefa_mae||null,
          deliveries:[],
          deliveryRequired:!!args.entrega_obrigatoria,
          archivedAt:null,
          archivedBy:null,
        }
        applyRecurrence(t,args.recorrencia)
        tasks.unshift(t)
        await writeTasks(supabase,tasks)
        await notifyUsers(supabase,who,t.assigneeIds,'task_assigned','Nova tarefa atribuída',t.title,String(t.id),'assigned:'+String(t.id))
        await audit(supabase,who,'criar_tarefa','tarefa',String(t.id),{lista_id:t.listId,responsaveis_ids:t.assigneeIds})
        return toolText({tarefa:publicTask(t)})
      })

      
      server.registerTool('atualizar_tarefa', {
        description: 'Atualiza uma tarefa. Suporta em revisão, bloqueado com motivo, recorrência, entrega obrigatória e arquivamento sem exclusão. Ao concluir respeita todas as travas.',
        inputSchema:z.object({
          id:z.string().min(1),
          nome:z.string().min(1).max(300).optional(),
          descricao_markdown:z.string().max(50000).optional(),
          lista:z.string().min(1).optional(),
          responsaveis:z.array(z.string().min(1)).optional(),
          prazo:dt.nullable().optional(),
          prioridade:z.string().optional(),
          tarefa_mae:z.string().min(1).nullable().optional(),
          status:z.string().optional(),
          motivo_bloqueio:z.string().max(500).nullable().optional(),
          recorrencia:recurrenceSchema,
          entrega_obrigatoria:z.boolean().optional(),
          arquivada:z.boolean().optional(),
        }),
      }, async (args:AnyRow) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,args.id)
        const who=await actor(supabase)
        const beforeIds=Array.isArray(t.assigneeIds)?[...t.assigneeIds]:[]
        const beforeStatus=t.status
        const beforeDue=dueValue(t)

        if(args.nome!==undefined) t.title=args.nome.trim()
        if(args.descricao_markdown!==undefined) t.description=args.descricao_markdown
        if(args.lista!==undefined){
          const l=await resolveList(supabase,args.lista)
          t.brand=l.marca;t.project=l.nome;t.listId=l.id;t.campaignId=l.campanha_id||null
        }
        if(args.responsaveis!==undefined){
          const a=await resolveAssignees(supabase,args.responsaveis)
          t.assignees=a?.names||[]
          t.assigneeIds=a?.ids||[]
        }
        if(args.prazo!==undefined){
          t.dueAt=args.prazo
          t.due=args.prazo?String(args.prazo).slice(0,10):null
        }
        if(args.prioridade!==undefined) t.priority=priorityCanon(args.prioridade)
        if(args.tarefa_mae!==undefined){
          if(args.tarefa_mae!==null){
            if(String(args.tarefa_mae)===String(t.id)) throw new Error('Uma tarefa não pode ser mãe de si mesma.')
            findTask(tasks,args.tarefa_mae)
          }
          t.parentTaskId=args.tarefa_mae
        }
        if(args.entrega_obrigatoria!==undefined) t.deliveryRequired=!!args.entrega_obrigatoria
        applyRecurrence(t,args.recorrencia)

        if(args.arquivada!==undefined){
          if(args.arquivada){
            t.archivedAt=t.archivedAt||nowIso()
            t.archivedBy=who.id
          }else{
            t.archivedAt=null
            t.archivedBy=null
          }
        }

        if(args.status!==undefined){
          const next=statusCanon(args.status)
          const reason=args.motivo_bloqueio!==undefined?args.motivo_bloqueio:t.blockedReason
          if(next==='bloqueado'&&!String(reason||'').trim()) throw new Error('Status bloqueado exige motivo_bloqueio.')
          if(next==='feito'){
            const problem=completionProblem(t,tasks)
            if(problem) throw new Error('Não foi possível concluir a tarefa: '+problem)
          }
          t.status=next
          if(next==='bloqueado'){
            t.blockedReason=String(reason||'').trim()
          }else if(beforeStatus==='bloqueado'){
            t.history=Array.isArray(t.history)?t.history:[]
            if(t.blockedReason) t.history.unshift({at:nowIso(),text:'Bloqueio encerrado. Motivo anterior: '+t.blockedReason})
            t.blockedReason=null
          }
        }else if(args.motivo_bloqueio!==undefined){
          t.blockedReason=args.motivo_bloqueio
        }

        let nextOccurrence=null
        if(t.status==='feito'&&beforeStatus!=='feito') nextOccurrence=generateNextOccurrence(tasks,t)

        t.history=Array.isArray(t.history)?t.history:[]
        t.history.unshift({at:nowIso(),text:'Tarefa atualizada via MCP por '+who.nome+'.'})
        await writeTasks(supabase,tasks)

        const newIds=(Array.isArray(t.assigneeIds)?t.assigneeIds:[]).filter((id:string)=>!beforeIds.includes(id))
        await notifyUsers(supabase,who,newIds,'task_assigned','Nova tarefa atribuída',t.title,String(t.id),'assigned:'+String(t.id)+':'+newIds.join(','))
        if(args.status!==undefined&&beforeStatus!==t.status){
          await notifyUsers(supabase,who,t.assigneeIds||[],'task_status','Status alterado: '+t.title,'Novo status: '+t.status,String(t.id),null)
        }
        if(args.prazo!==undefined&&beforeDue!==dueValue(t)){
          await notifyUsers(supabase,who,t.assigneeIds||[],'task_due','Prazo atualizado: '+t.title,dueValue(t)?'Novo prazo: '+dueValue(t):'Prazo removido',String(t.id),null)
        }
        await audit(supabase,who,'atualizar_tarefa','tarefa',String(t.id),{status:t.status,arquivada:!!t.archivedAt})
        return toolText({tarefa:publicTask(t),proxima_ocorrencia:nextOccurrence?publicTask(nextOccurrence):null})
      })

      server.registerTool('definir_dependencia', {
        description: 'Adiciona uma dependência. A tarefa bloqueada só poderá ser concluída após a tarefa que bloqueia. Impede ciclos.',
        inputSchema:z.object({
          tarefa_bloqueada:z.string().min(1),
          tarefa_que_bloqueia:z.string().min(1),
        }),
      }, async (args:AnyRow) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,args.tarefa_bloqueada)
        const dep=findTask(tasks,args.tarefa_que_bloqueia)
        if(String(t.id)===String(dep.id)||hasDependencyPath(tasks,String(dep.id),String(t.id))) throw new Error('Esse vínculo criaria um ciclo de dependências.')
        t.dependencies=Array.isArray(t.dependencies)?t.dependencies:[]
        if(!t.dependencies.some((x:string)=>String(x)===String(dep.id))) t.dependencies.push(String(dep.id))
        const who=await actor(supabase)
        t.history=Array.isArray(t.history)?t.history:[]
        t.history.unshift({at:nowIso(),text:'Dependência adicionada via MCP por '+who.nome+': "'+dep.title+'".'})
        await writeTasks(supabase,tasks)
        await audit(supabase,who,'definir_dependencia','tarefa',String(t.id),{tarefa_que_bloqueia:dep.id})
        return toolText({tarefa:publicTask(t),dependencia:publicTask(dep)})
      })

      server.registerTool('remover_dependencia', {
        description: 'Remove um vínculo de dependência sem excluir nenhuma tarefa.',
        inputSchema:z.object({
          tarefa_bloqueada:z.string().min(1),
          tarefa_que_bloqueia:z.string().min(1),
        }),
      }, async (args:AnyRow) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,args.tarefa_bloqueada)
        const dep=findTask(tasks,args.tarefa_que_bloqueia)
        t.dependencies=(Array.isArray(t.dependencies)?t.dependencies:[]).filter((x:string)=>String(x)!==String(dep.id))
        const who=await actor(supabase)
        t.history=Array.isArray(t.history)?t.history:[]
        t.history.unshift({at:nowIso(),text:'Dependência removida via MCP por '+who.nome+': "'+dep.title+'".'})
        await writeTasks(supabase,tasks)
        await audit(supabase,who,'remover_dependencia','tarefa',String(t.id),{tarefa_que_bloqueia:dep.id})
        return toolText({tarefa:publicTask(t)})
      })

      server.registerTool('definir_checklist', {
        description: 'Define ou substitui a checklist da tarefa. Pode torná-la obrigatória para conclusão.',
        inputSchema:z.object({
          id:z.string().min(1),
          itens:z.array(z.string().min(1).max(500)).max(100),
          obrigatoria:z.boolean().default(false),
        }),
      }, async (args:AnyRow) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,args.id)
        t.checklist=(args.itens||[]).map((text:string)=>({id:'check-'+crypto.randomUUID().slice(0,8),text,done:false}))
        t.conferenceRequired=!!args.obrigatoria
        const who=await actor(supabase)
        t.history=Array.isArray(t.history)?t.history:[]
        t.history.unshift({at:nowIso(),text:'Checklist definida via MCP por '+who.nome+' com '+t.checklist.length+' item(ns).'})
        await writeTasks(supabase,tasks)
        await audit(supabase,who,'definir_checklist','tarefa',String(t.id),{itens:t.checklist.length,obrigatoria:t.conferenceRequired})
        return toolText({tarefa:{...publicTask(t),checklist:t.checklist,lista_conferencia_obrigatoria:t.conferenceRequired}})
      })

      server.registerTool('marcar_item_checklist', {
        description: 'Marca ou desmarca um item de checklist pelo item_id retornado em obter_tarefa ou definir_checklist.',
        inputSchema:z.object({
          id:z.string().min(1),
          item_id:z.string().min(1),
          concluido:z.boolean().default(true),
        }),
      }, async (args:AnyRow) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,args.id)
        const item=(Array.isArray(t.checklist)?t.checklist:[]).find((x:AnyRow)=>String(x.id)===String(args.item_id))
        if(!item) throw new Error('Item de checklist não encontrado.')
        item.done=!!args.concluido
        item.updatedAt=nowIso()
        const who=await actor(supabase)
        t.history=Array.isArray(t.history)?t.history:[]
        t.history.unshift({at:nowIso(),text:'Checklist atualizado via MCP por '+who.nome+': "'+item.text+'" = '+(item.done?'concluído':'pendente')+'.'})
        await writeTasks(supabase,tasks)
        await audit(supabase,who,'marcar_item_checklist','tarefa',String(t.id),{item_id:item.id,concluido:item.done})
        return toolText({tarefa:{...publicTask(t),checklist:t.checklist}})
      })

      

      server.registerTool('registrar_entrega', {
        description: 'Registra uma entrega em uma tarefa. Use para satisfazer a trava de entrega obrigatória sem remover a exigência.',
        inputSchema:z.object({
          id:z.string().min(1),
          entrega:z.string().min(1).max(10000),
        }),
      }, async ({id,entrega}:{id:string;entrega:string}) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,id)
        const who=await actor(supabase)
        t.deliveries=Array.isArray(t.deliveries)?t.deliveries:[]
        const item={id:'mcp-delivery-'+crypto.randomUUID(),text:entrega.trim(),at:nowIso(),author:who.nome,authorId:who.id,source:'mcp'}
        t.deliveries.unshift(item)
        t.history=Array.isArray(t.history)?t.history:[]
        t.history.unshift({at:nowIso(),text:'Entrega registrada via MCP por '+who.nome+'.'})
        await writeTasks(supabase,tasks)
        await notifyUsers(supabase,who,t.assigneeIds||[],'task_delivery','Entrega registrada: '+t.title,entrega.trim().slice(0,500),String(t.id),null)
        await audit(supabase,who,'registrar_entrega','tarefa',String(t.id),{delivery_id:item.id})
        return toolText({tarefa:publicTask(t),entrega:item})
      })

      server.registerTool('comentar_tarefa', {
        description: 'Adiciona comentário com autoria do usuário OAuth e origem MCP. Notifica os responsáveis reais da tarefa.',
        inputSchema:z.object({
          id:z.string().min(1),
          comentario:z.string().min(1).max(10000),
        }),
      }, async ({id,comentario}:{id:string;comentario:string}) => {
        const tasks=await readState(supabase,TASKS_KEY)
        const t=findTask(tasks,id)
        const who=await actor(supabase)
        t.comments=Array.isArray(t.comments)?t.comments:[]
        const comment={id:'mcp-comment-'+crypto.randomUUID(),author:who.nome,authorId:who.id,text:comentario.trim(),at:nowIso(),source:'mcp'}
        t.comments.unshift(comment)
        t.history=Array.isArray(t.history)?t.history:[]
        t.history.unshift({at:nowIso(),text:'Comentário via MCP por '+who.nome+'.'})
        await writeTasks(supabase,tasks)
        await notifyUsers(supabase,who,t.assigneeIds||[],'task_comment','Novo comentário: '+t.title,comentario.trim().slice(0,500),String(t.id),null)
        await audit(supabase,who,'comentar_tarefa','tarefa',String(t.id),{comment_id:comment.id})
        return toolText({tarefa:{id:String(t.id),link:taskLink(String(t.id))},comentario:comment})
      })

      server.registerTool('listar_notificacoes', {
        description: 'Lista notificações do usuário OAuth atual. Por padrão retorna apenas não lidas.',
        inputSchema:z.object({
          somente_nao_lidas:z.boolean().default(true),
          limite:z.number().int().min(1).max(100).default(30),
        }),
        annotations:{readOnlyHint:true},
      }, async ({somente_nao_lidas,limite}:{somente_nao_lidas:boolean;limite:number}) => {
        const who=await actor(supabase)
        let q=supabase.from('notifications').select('id,kind,title,body,task_id,created_at,read_at').eq('user_id',who.id).order('created_at',{ascending:false}).limit(limite)
        if(somente_nao_lidas) q=q.is('read_at',null)
        const {data,error}=await q
        if(error) throw new Error('Não foi possível listar notificações: '+error.message)
        return toolText({notificacoes:(data||[]).map((n:AnyRow)=>({...n,link:n.task_id?taskLink(n.task_id):null}))})
      })

      server.registerTool('marcar_notificacao_lida', {
        description: 'Marca uma notificação do usuário atual como lida ou não lida.',
        inputSchema:z.object({
          id:z.number().int().positive(),
          lida:z.boolean().default(true),
        }),
      }, async ({id,lida}:{id:number;lida:boolean}) => {
        const who=await actor(supabase)
        const {data,error}=await supabase.from('notifications').update({read_at:lida?nowIso():null}).eq('id',id).eq('user_id',who.id).select('id,read_at').maybeSingle()
        if(error||!data) throw new Error('Notificação não encontrada ou sem permissão.')
        return toolText({notificacao:data})
      })

      return server
    })
    return handler.fetch(req)
  })
)

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  if (url.pathname.endsWith('/health')) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    let oauth_discovery_status: number | null = null
    try {
      const r = await fetch(supabaseUrl.replace(/\/$/,'') + '/.well-known/oauth-authorization-server/auth/v1')
      oauth_discovery_status = r.status
    } catch {}
    return Response.json({
      ok: true,
      service: 'AllianceOS MCP',
      transport: 'Streamable HTTP',
      oauth: 'Supabase Auth OAuth 2.1',
      oauth_discovery_status,
      tools: ['listar_marcas','listar_listas','criar_lista','atualizar_lista','consolidar_lista','listar_membros','convidar_membro','migrar_responsavel_legado','buscar_tarefas','obter_tarefa','criar_tarefa','atualizar_tarefa','definir_dependencia','remover_dependencia','definir_checklist','marcar_item_checklist','registrar_entrega','comentar_tarefa','listar_notificacoes','marcar_notificacao_lida'],
      deletion_tool: false,
    })
  }
  return protectedHandler(req)
})
