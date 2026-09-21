import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createMcpHandler, InMemoryServerEventBus, McpServer } from 'npm:@modelcontextprotocol/server@2.0.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.6.0'
import { z } from 'npm:zod@4.3.6'
import { hasOwn, cloneBatchItem } from './batch-patch.ts'

const TASKS_KEY = 'central.tasks.vitor-gutierrez'
const CAMPAIGNS_KEY = 'central.campaigns.vitor-gutierrez'
const DELIVERIES_KEY = 'central.deliveries.workspace.v1'
const FULL_CHANNELS = ['E-mails base antiga','E-mails base captada','WhatsApp grupos antigos','WhatsApp grupos da campanha','WhatsApp API','Criativos em vídeo','Criativos em imagem','Instagram feed','Instagram stories','Alteração no site'] as const
const DEFAULT_REVENUE_SOURCES = ['Tráfego','Influencer','Instagram Bio/stories','Atendimento','Grupos antigos','API'] as const
const APP_URL = 'https://alliance-os-sooty.vercel.app'
const TOOL_SCHEMA_VERSION = '2026-09-21.4'
const MCP_EVENT_BUS = new InMemoryServerEventBus()

type AnyRow = Record<string, any>

const nowIso = () => new Date().toISOString()
const norm = (v: unknown) => String(v ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim()
const slug = (v: unknown) => norm(v).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const taskLink = (id: string) => `${APP_URL}/?task=${encodeURIComponent(id)}#tasks`
const listLink = (id: string) => `${APP_URL}/?list=${encodeURIComponent(id)}#tasks`
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
  if (['urgente','urgent'].includes(n)) return 'urgente'
  if (['alta','high'].includes(n)) return 'alta'
  if (['normal','media','média','medium'].includes(n)) return 'normal'
  if (['baixa','low'].includes(n)) return 'baixa'
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
    campanha_id: t.campaignId ?? null,
    canal: t.channel ?? null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    responsaveis: Array.isArray(t.assignees) ? t.assignees : [],
    responsaveis_ids: Array.isArray(t.assigneeIds) ? t.assigneeIds : [],
    status: t.status ?? 'a fazer',
    motivo_bloqueio: t.blockedReason ?? null,
    prazo: t.dueAt ?? t.due ?? null,
    prazo_data: t.due ?? (t.dueAt ? String(t.dueAt).slice(0,10) : null),
    prazo_tem_hora: !!t.dueAt,
    prioridade: priorityCanon(t.priority) ?? 'normal',
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


async function sendInviteEmail(supabase:any,emailInput:string) {
  const email=String(emailInput||'').toLowerCase().trim()
  const {data:invite,error:readError}=await supabase.from('equipe_convites')
    .select('email,aceito_em,enviado_em,tentativas_envio')
    .eq('email',email).maybeSingle()
  if(readError||!invite) throw new Error('Convite não encontrado para '+email+'.')
  if(invite.aceito_em) return {status:'aceito',email,aceito_em:invite.aceito_em,enviado_em:invite.enviado_em||null,erro:null}

  const attemptedAt=nowIso()
  const attempt=Number(invite.tentativas_envio||0)+1
  const {error:otpError}=await supabase.auth.signInWithOtp({
    email,
    options:{emailRedirectTo:APP_URL,shouldCreateUser:true},
  })
  const patch:AnyRow={
    ultimo_envio_em:attemptedAt,
    tentativas_envio:attempt,
    envio_status:otpError?'falhou':'enviado',
    envio_erro:otpError?String(otpError.message||'Falha desconhecida no envio'):null,
    atualizado_em:attemptedAt,
  }
  if(!otpError) patch.enviado_em=attemptedAt
  const {data:updated,error:updateError}=await supabase.from('equipe_convites')
    .update(patch).eq('email',email)
    .select('email,enviado_em,ultimo_envio_em,envio_status,envio_erro,tentativas_envio,aceito_em')
    .single()
  if(updateError) throw new Error('O e-mail foi processado, mas não foi possível registrar o resultado do envio: '+updateError.message)
  return {
    status:updated.aceito_em?'aceito':updated.envio_status,
    email:updated.email,
    enviado_em:updated.enviado_em||null,
    ultimo_envio_em:updated.ultimo_envio_em||null,
    tentativas_envio:Number(updated.tentativas_envio||0),
    erro:updated.envio_erro||null,
    aceito_em:updated.aceito_em||null,
  }
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
    return {id:String(x.id),link:listLink(String(x.id)),nome:x.nome,marca:b?.nome||null,marca_id:x.brand_id,campanha_id:x.campanha_id||null,tarefas:count,arquivada:!!x.arquivado_em,arquivada_em:x.arquivado_em||null}
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
  const [tasks,linksResult,profilesResult,invitesResult,legacyResult]=await Promise.all([
    readState(supabase,TASKS_KEY),
    supabase.from('legacy_member_links').select('legacy_name,profile_id'),
    supabase.from('profiles').select('id,nome,email,papel,cargo,ativo,tipo_membro').eq('ativo',true).order('nome'),
    supabase.from('equipe_convites').select('email,nome,cargo,papel,enviado_em,ultimo_envio_em,envio_status,envio_erro,tentativas_envio,aceito_em').order('nome'),
    supabase.from('legacy_member_names').select('id,nome,cargo,observacoes,arquivado_em').is('arquivado_em',null).order('nome')
  ])
  if(profilesResult.error) throw new Error('Não foi possível listar membros: '+profilesResult.error.message)
  const profiles=profilesResult.data||[]
  const invites=invitesResult.data||[]
  const inviteByEmail=new Map(invites.map((x:AnyRow)=>[norm(x.email),x]))
  const links=linksResult.data||[]
  const linked=new Set(links.map((x:AnyRow)=>norm(x.legacy_name)))
  const profileEmails=new Set(profiles.map((p:AnyRow)=>norm(p.email)).filter(Boolean))
  const rows:AnyRow[]=profiles.map((p:AnyRow)=>{
    const c=inviteByEmail.get(norm(p.email)),tipo=p.tipo_membro==='servico'?'servico':'usuario'
    return {
      id:String(p.id),nome:p.nome||p.email,email:p.email,papel:p.papel,cargo:p.cargo,tipo,atribuivel:tipo==='usuario',
      convite_status:c?.aceito_em?'aceito':(c?.envio_status||null),
      convite_enviado_em:c?.enviado_em||null,
      convite_ultimo_envio_em:c?.ultimo_envio_em||null,
      convite_erro:c?.envio_erro||null,
      convite_aceito_em:c?.aceito_em||null,
      convite_tentativas:Number(c?.tentativas_envio||0),
    }
  })
  const known=new Set(rows.map(r=>norm(r.nome)))
  for(const legacy of legacyResult.data||[]){
    if(!legacy?.nome||known.has(norm(legacy.nome))||linked.has(norm(legacy.nome)))continue
    known.add(norm(legacy.nome))
    rows.push({id:'nome:'+slug(legacy.nome),nome:legacy.nome,email:null,papel:null,cargo:legacy.cargo||null,tipo:'legado',atribuivel:false,observacoes:legacy.observacoes||null})
  }
  for(const t of tasks){
    for(const name of Array.isArray(t.assignees)?t.assignees:[]){
      if(!name||known.has(norm(name))||linked.has(norm(name))) continue
      known.add(norm(name))
      rows.push({id:'nome:'+slug(name),nome:name,email:null,papel:null,cargo:null,tipo:'legado',atribuivel:false})
    }
  }
  for(const c of invites){
    if(c.aceito_em||profileEmails.has(norm(c.email))) continue
    rows.push({
      id:'convite:'+String(c.email),nome:c.nome||c.email,email:c.email,papel:c.papel,cargo:c.cargo,
      tipo:'convite_pendente',atribuivel:false,
      convite_status:c.envio_status||'pendente',
      convite_enviado_em:c.enviado_em||null,
      convite_ultimo_envio_em:c.ultimo_envio_em||null,
      convite_erro:c.envio_erro||null,
      convite_aceito_em:c.aceito_em||null,
      convite_tentativas:Number(c.tentativas_envio||0),
    })
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

async function hasOfficialDelivery(supabase:any,t:any){
  const rows=await fullDeliveries(supabase)
  return rows.some((d:any)=>String(d.sourceTaskId||'')===String(t.id)&&!d.archivedAt&&!d.arquivado_em)
}
async function completionProblem(supabase:any,t: AnyRow, tasks: AnyRow[], assumeOfficialDelivery=false) {
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
  if (t.deliveryRequired && !assumeOfficialDelivery && !(await hasOfficialDelivery(supabase,t))) {
    return 'A tarefa exige uma entrega existente na coleção oficial antes de ser concluída.'
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

/* ================= AllianceOS full-system MCP ================= */
function fullChannelCanon(v:any){
  if(v==null||String(v).trim()==='')return null
  const n=norm(v),c=(FULL_CHANNELS as readonly string[]).find(x=>norm(x)===n)
  if(!c)throw new Error('Canal inválido. Use listar_canais.')
  return c
}
function fullCampaignType(v:any){
  const n=norm(v)
  if(n==='perpetuo')return'perpetuo'
  if(['diad','dia d','dia-d'].includes(n))return'diaD'
  if(n==='gap')return'gap'
  if(n==='lancamento')return'lancamento'
  throw new Error('Tipo inválido. Use: perpetuo, diaD, gap ou lancamento.')
}
function fullCampaignStatus(v:any){
  const n=norm(v)
  if(['planejamento','planejando'].includes(n))return'planejamento'
  if(['em execucao','execucao','executando','ativa','ativo'].includes(n))return'em execução'
  if(['pausada','pausado'].includes(n))return'pausada'
  if(['concluida','concluido','feito'].includes(n))return'concluída'
  throw new Error('Status de campanha inválido. Use: planejamento, em execução, pausada ou concluída.')
}
function fullLinks(kind:string,id:string){
  const h:any={campanha:'campaigns',mes:'planning',mapa:'planning',entrega:'deliveries',cliente:'clients',automacao:'automations',relatorio:'reports'}
  const q:any={campanha:'campaign',mes:'month',mapa:'map',entrega:'delivery',cliente:'client',automacao:'automation',relatorio:'campaign'}
  return APP_URL+'/?'+q[kind]+'='+encodeURIComponent(id)+'#'+h[kind]
}
async function fullReadOperational(supabase:any,key:string,def:any){
  const {data,error}=await supabase.from('operacional_estado').select('valor').eq('chave',key).is('dono',null).maybeSingle()
  if(error)throw new Error('Sem acesso a '+key+': '+error.message)
  return data?data.valor:structuredClone(def)
}
async function fullWriteOperational(supabase:any,key:string,value:any){
  const {data,error}=await supabase.from('operacional_estado').update({valor:value,atualizado_em:nowIso()}).eq('chave',key).is('dono',null).select('chave')
  if(error)throw new Error('Falha ao salvar '+key+': '+error.message)
  if(data?.length)return
  const {error:e}=await supabase.from('operacional_estado').insert({chave:key,dono:null,valor:value,atualizado_em:nowIso()})
  if(e)throw new Error('Falha ao criar '+key+': '+e.message)
}
async function fullCampaigns(s:any){const v=await fullReadOperational(s,CAMPAIGNS_KEY,[]);return Array.isArray(v)?v:[]}
async function fullSaveCampaigns(s:any,v:any[]){await fullWriteOperational(s,CAMPAIGNS_KEY,v)}
async function fullDeliveries(s:any){const v=await fullReadOperational(s,DELIVERIES_KEY,[]);return Array.isArray(v)?v.map((x:any)=>fullNormalizeDeliveryShape(x,false)):[]}
async function fullSaveDeliveries(s:any,v:any[]){await fullWriteOperational(s,DELIVERIES_KEY,v.map((x:any)=>fullNormalizeDeliveryShape(x,true)))}
function fullCampaign(rows:any[],id:any){
  const n=norm(id),m=rows.filter(c=>String(c.id)===String(id)||norm(c.name)===n)
  if(!m.length)throw new Error('Campanha não encontrada.')
  if(m.length>1&&!m.some(c=>String(c.id)===String(id)))throw new Error('Nome de campanha ambíguo; use o id.')
  return m.find(c=>String(c.id)===String(id))||m[0]
}
function fullHistory(o:any,text:string,who:any){o.history=Array.isArray(o.history)?o.history:[];o.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text})}
function fullMoney(v:any){
  let s=String(v??'').trim().replace(/[^\d,.\-]/g,'')
  if(!s)return 0
  if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.')
  else if(s.includes(','))s=s.replace(',','.')
  else if(/^\-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'')
  const n=Number(s)
  return Number.isFinite(n)?n:0
}

function fullPercentPreserve(v:any){
  if(v==null)return null
  if(typeof v==='number')return Number.isFinite(v)?v:null
  const raw=String(v).trim()
  if(!raw||['—','-'].includes(raw))return null
  const single=raw.replace(',','.').match(/^\s*(\d+(?:\.\d+)?)\s*%?\s*$/)
  return single?Number(single[1]):raw
}
function fullRevenueSourceName(v:any){
  const raw=String(v??'').trim()
  if(!raw)throw new Error('Fonte de receita vazia.')
  return (DEFAULT_REVENUE_SOURCES as readonly string[]).find(x=>norm(x)===norm(raw))||raw
}
function fullDefaultPhases(type:any){
  const t=fullCampaignType(type)
  const by:any={
    diaD:['Captação','Antecipação','É amanhã','Dia D (venda)','Última chance'],
    gap:['Diagnóstico do gap','Ativar combo/orderbump','Comunicar a base','Medir e ajustar'],
    perpetuo:['Sempre no ar'],
    lancamento:['Captação','Aquecimento','Acesso antecipado','Lançamento','Pós-lançamento'],
  }
  return (by[t]||[]).map((nome:string)=>({nome,tem:true,data:null}))
}
function exactCampaign(rows:any[],id:any){
  const c=rows.find(x=>String(x.id)===String(id))
  if(!c)throw new Error('campanha_id inválido: '+String(id)+'. Use listar_campanhas para obter um id existente.')
  return c
}
async function exactCampaignForBrand(s:any,id:any,brandName?:string|null){
  const c=exactCampaign(await fullCampaigns(s),id)
  if(brandName&&norm(c.brand)!==norm(brandName))throw new Error('A campanha pertence a outra marca.')
  return c
}
function taskCampaignFromLists(t:any,listById:Map<string,any>){
  const direct=String(t.campaignId||'').trim()
  if(direct)return direct
  const l=listById.get(String(t.listId||''))
  return String(l?.campanha_id||'').trim()||null
}
function taskMonthRef(t:any,listById?:Map<string,any>){
  const raw=t.dueAt||t.due||t.startAt||t.start||t.createdAt||''
  const own=String(raw).slice(0,7)
  if(own)return own
  const l=listById?.get(String(t.listId||''))
  return String(l?.criado_em||'').slice(0,7)||null
}
function taskCampaignIsDirect(t:any,listCampaign:any){
  if(t.campaignSource==='direct')return true
  if(t.campaignSource==='list')return false
  const current=String(t.campaignId||'')
  const inherited=String(listCampaign||'')
  return !!current&&current!==inherited
}
function fullSearchValues(v:any):string[]{
  if(v==null)return[]
  if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return[String(v)]
  if(Array.isArray(v))return v.flatMap(fullSearchValues)
  if(typeof v==='object')return Object.values(v).flatMap(fullSearchValues)
  return[]
}


const FULL_EXPORT_SECTIONS=['mes','campanhas','taps','listas','tarefas','entregas','resultados'] as const
function fullCursorOffset(cursor:any){
  if(cursor==null||String(cursor).trim()==='')return 0
  try{
    const decoded=atob(String(cursor)),n=Number(decoded)
    if(Number.isInteger(n)&&n>=0)return n
  }catch{}
  throw new Error('Cursor inválido.')
}
function fullCursor(offset:number){return btoa(String(Math.max(0,offset)))}
function fullPage<T>(rows:T[],cursor:any,limit:number){
  const offset=fullCursorOffset(cursor),items=rows.slice(offset,offset+limit),next=offset+limit<rows.length?fullCursor(offset+limit):null
  return{items,total:rows.length,offset,limite:limit,proximo_cursor:next}
}
function fullTaskSummary(t:any,campaignId?:string|null){
  return{id:String(t.id),nome:t.title??'',lista_id:t.listId??null,lista:t.project??'Operação',campanha_id:campaignId??t.campaignId??null,responsaveis:Array.isArray(t.assignees)?t.assignees:[],status:t.status??'a fazer',prazo:t.dueAt??t.due??null,prioridade:priorityCanon(t.priority)??'normal',arquivada:!!t.archivedAt}
}
function fullTapForMode(c:any,mode:'completo'|'resumo'){
  const t=fullTapTotals(c)
  if(mode==='resumo'&&t&&typeof t==='object'){
    const x=structuredClone(t)
    delete x.legacy_sections
    return x
  }
  return t
}
function fullResultPublic(r:any){
  return{id:String(r.id),link:fullLinks('relatorio',String(r.campaign_id)),campanha_id:String(r.campaign_id),marca_id:r.brand_id,fonte_receita:r.fonte_receita||null,canal:r.canal||null,data:r.data,faturamento:Number(r.faturamento||0),investimento:Number(r.investimento||0),roas:Number(r.investimento)?Number(r.faturamento)/Number(r.investimento):null,observacoes:r.observacoes||null,arquivado:!!r.arquivado_em,arquivado_em:r.arquivado_em||null,arquivado_por:r.arquivado_por||null,historico:Array.isArray(r.historico)?r.historico:[],origem:r.origem||null}
}
function fullDeliveryStatus(v:any){
  const n=norm(v)
  if(['sent','enviado','enviada'].includes(n))return'enviado'
  if(['approved','aprovado','aprovada'].includes(n))return'aprovado'
  if(['rejected','ajustes','reprovado','reprovada'].includes(n))return'ajustes'
  return String(v||'enviado')
}

function fullIsoActivityDate(v:any){
  const raw=String(v??'').trim()
  if(!raw)return null
  if(raw==='Agora')return null
  let normalized=raw.replace(/^(\d{4}-\d{2}-\d{2})\s+/,'$1T')
  normalized=normalized.replace(/([+-]\d{2})$/,'$1:00')
  const d=new Date(normalized)
  return Number.isNaN(d.getTime())?null:d.toISOString()
}
function fullNormalizeActivityEntry(input:any){
  const x=structuredClone(input||{}),raw=x.at
  const iso=fullIsoActivityDate(raw)
  if(iso)x.at=iso
  else if(raw!=null&&String(raw).trim()){
    if(!x.atOriginal)x.atOriginal=String(raw)
    x.at=null
    x.dataDesconhecida=true
  }
  return x
}
function fullNormalizeActivityList(rows:any){
  return (Array.isArray(rows)?rows:[]).map(fullNormalizeActivityEntry)
}

function fullHasOffsetDateTime(v:any){
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(String(v??'').trim())
}
function fullCampaignBoundary(v:any,kind:'inicio'|'fim'){
  const raw=String(v??'').trim()
  if(!raw)return null
  if(fullHasOffsetDateTime(raw))return raw
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw+(kind==='fim'?'T23:59:00-03:00':'T00:00:00-03:00')
  return raw
}
function fullMeaningfulLegacyDate(v:any){
  const raw=String(v??'').trim()
  return !!raw&&!['—','-'].includes(raw)
}
function fullParseLegacyDeliveryDate(v:any){
  const raw=String(v??'').trim()
  if(!raw)return{value:null,original:null}
  if(fullHasOffsetDateTime(raw))return{value:raw,original:null}
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return{value:raw+'T00:00:00-03:00',original:raw}
  if(/^\d{4}-\d{2}-\d{2}[ T]/.test(raw)){
    let normalized=raw.replace(/^(\d{4}-\d{2}-\d{2})\s+/,'$1T').replace(/([+-]\d{2})$/,'$1:00')
    const parsed=new Date(normalized)
    if(!Number.isNaN(parsed.getTime()))return{value:parsed.toISOString(),original:raw}
  }
  const months:any={jan:1,janeiro:1,fev:2,fevereiro:2,mar:3,marco:3,'março':3,abr:4,abril:4,mai:5,maio:5,jun:6,junho:6,jul:7,julho:7,ago:8,agosto:8,set:9,setembro:9,out:10,outubro:10,nov:11,novembro:11,dez:12,dezembro:12}
  const m=raw.match(/^(\d{1,2})\s+(?:de\s+)?([A-Za-zÀ-ÿ]+)(?:\s*[·,\-]\s*|\s+)(\d{1,2}):(\d{2})$/i)
  if(!m)return{value:raw,original:null}
  const month=months[norm(m[2])];if(!month)return{value:raw,original:null}
  return{value:'2026-'+String(month).padStart(2,'0')+'-'+String(Number(m[1])).padStart(2,'0')+'T'+String(Number(m[3])).padStart(2,'0')+':'+String(Number(m[4])).padStart(2,'0')+':00-03:00',original:raw}
}
function fullNormalizeDeliveryShape(input:any,strict=false){
  const d=structuredClone(input||{})
  d.status=fullDeliveryStatus(d.status)
  const normalize=(key:string)=>{
    const parsed=fullParseLegacyDeliveryDate(d[key])
    if(parsed.original&&!d[key+'Original'])d[key+'Original']=parsed.original
    if(parsed.value!=null)d[key]=parsed.value
    if(strict&&d[key]&&!fullHasOffsetDateTime(d[key]))throw new Error('Data de entrega inválida em '+key+'. Use ISO 8601 com hora e fuso.')
  }
  normalize('createdAt');normalize('updatedAt');normalize('sentAt')
  d.events=Array.isArray(d.events)?d.events.map((e:any)=>{
    const x=structuredClone(e||{}),parsed=fullParseLegacyDeliveryDate(x.at)
    if(parsed.original&&!x.atOriginal)x.atOriginal=parsed.original
    if(parsed.value!=null)x.at=parsed.value
    if(strict&&x.at&&!fullHasOffsetDateTime(x.at))throw new Error('Data inválida no histórico da entrega. Use ISO 8601 com hora e fuso.')
    return x
  }):[]
  return d
}
function fullDeliveryDecisionText(decision:any){
  return decision==='aprovar'?'Entrega aprovada':'Entrega reprovada'
}

function fullLegacyPhaseDate(raw:any,c:any){
  const text=String(raw??'').trim()
  if(!text||['—','-','nao tem','não tem'].includes(text.toLowerCase()))return null
  const m=text.match(/(\d{1,2})\/(\d{1,2})(?:\s*[·\-]\s*(\d{1,2})(?::(\d{2}))?\s*h?)?/i)
  if(!m)return null
  const year=Number(String(c.startAt||c.start||new Date().getFullYear()).slice(0,4))||new Date().getFullYear()
  const hh=m[3]?Number(m[3]):0,mm=m[4]?Number(m[4]):0
  return year+'-'+String(Number(m[2])).padStart(2,'0')+'-'+String(Number(m[1])).padStart(2,'0')+'T'+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')+':00-03:00'
}
function fullLegacyPeople(raw:any){
  const text=String(raw??'').trim()
  if(!text)return[]
  const matches=text.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÁÉÍÓÚÂÊÔÃÕÇáéíóúâêôãõç]+/g)||[]
  const stop=new Set(['Equipe','Base','CTA','SKU'])
  return[...new Set(matches.filter(x=>!stop.has(x)))]
}
function fullLegacyOfferProducts(c:any,offer:any){
  const rows=Array.isArray(offer?.rows)?offer.rows:[]
  const current=Array.isArray(c.products)?c.products:[]
  if(!rows.length)return current.map((p:any)=>({sku:String(p.sku||''),nome:String(p.name||p.nome||''),preco:Number(p.price??p.preco??0),desconto:Number(p.discount??p.desconto??0)}))
  return rows.map((r:any,i:number)=>{
    const detail=String(r?.[1]||''),sku=(detail.match(/\bSKU\s+([^·\s]+(?:\.[^·\s]+)*)/i)||[])[1]||String(current[i]?.sku||'')
    const pm=(detail.match(/R\$\s*([\d.,]+)/i)||[])[1]
    return{sku:String(sku||''),nome:String(r?.[0]||current[i]?.name||current[i]?.nome||''),preco:pm?fullMoney(pm):Number(current[i]?.price??current[i]?.preco??0),desconto:fullMoney(r?.[2]??current[i]?.discount??current[i]?.desconto??0)}
  })
}

function fullLegacyTap(c:any){
  if(c.tapStructured&&typeof c.tapStructured==='object'){
    const t=structuredClone(c.tapStructured)
    if(!Array.isArray(t.metas_por_fonte)){
      const legacy=Array.isArray(t.metas_por_canal)?t.metas_por_canal:[]
      t.metas_por_fonte=legacy.map((x:any)=>({fonte:fullRevenueSourceName(x.fonte??x.canal),investimento:Number(x.investimento||0),meta_faturamento:Number(x.meta_faturamento||0),roas_alvo:x.roas_alvo==null?null:Number(x.roas_alvo),responsavel:x.responsavel??null}))
    }
    if(!Array.isArray(t.fases)||!t.fases.length)t.fases=fullDefaultPhases(c.type)
    t.fases=(t.fases||[]).map((x:any)=>({...x,data:x.data||fullLegacyPhaseDate(x.data_legada,c),data_legada:x.data_legada??null}))
    t.metas_por_fonte=(t.metas_por_fonte||[]).map((x:any)=>({...x,roas_alvo:Number(x.investimento||0)>0?(x.roas_alvo??null):null}))
    t.cronograma=(t.cronograma||[]).map((x:any)=>({...x,responsaveis:Array.isArray(x.responsaveis)&&x.responsaveis.length?x.responsaveis:fullLegacyPeople(x.quem_faz),quem_faz:x.quem_faz??null}))
    return t
  }
  const sections=Array.isArray(c.tap)?c.tap:[]
  const sec=(re:RegExp)=>sections.find((x:any)=>re.test(String(x?.title||'')))
  const kv=(x:any)=>Object.fromEntries((x?.rows||[]).filter((r:any)=>Array.isArray(r)&&r.length).map((r:any)=>[norm(r[0]),r[1]??'']))
  const ev=kv(sec(/SOBRE O EVENTO/i)),team=sec(/^EQUIPE/i),ph=sec(/^FASES/i),offerSec=sec(/SOBRE A OFERTA/i),tick=sec(/TICKET/i),cron=sec(/CANAIS.*CRONOGRAMA/i),met=sec(/^METAS/i)
  const products=fullLegacyOfferProducts(c,offerSec)
  const schedule:any[]=[]
  if(cron?.columns?.length)for(const r of cron.rows||[]){
    const canal=(FULL_CHANNELS as readonly string[]).find(x=>norm(x)===norm(r?.[0]))
    if(!canal)continue
    const quem=String(r?.[cron.columns.length-1]||'')
    for(let i=2;i<cron.columns.length-1;i++){
      const content=String(r?.[i]??'').trim()
      if(content&&!['—','-','0','nao tem'].includes(norm(content)))schedule.push({canal,periodo:String(cron.columns[i]),periodo_inicio:null,periodo_fim:null,conteudo:content,responsaveis:fullLegacyPeople(quem),prazo:null,quem_faz:quem})
    }
  }
  const goalBy=new Map<string,any>(),invBy=new Map<string,number>();let campaignRoas:number|null=null
  for(const r of met?.rows||[]){
    const label=String(r?.[0]||'').trim(),n=norm(label)
    if(/^meta faturamento\s*[—-]\s*/i.test(label)){
      const name=label.replace(/^meta faturamento\s*[—-]\s*/i,'').trim()
      if(name&&!/^total$/i.test(name))goalBy.set(norm(name),{fonte:fullRevenueSourceName(name),investimento:0,meta_faturamento:fullMoney(r?.[1]),roas_alvo:null,responsavel:String(r?.[2]||'')||null})
    }else if(/^investimento\s*[—-]\s*/i.test(label)){
      const name=label.replace(/^investimento\s*[—-]\s*/i,'').trim();if(name)invBy.set(norm(name),fullMoney(r?.[1]))
    }else if(n==='roas alvo')campaignRoas=fullMoney(r?.[1])||null
  }
  for(const [k,v] of invBy){const x=goalBy.get(k);if(x)x.investimento=v}
  for(const x of goalBy.values())if(x.roas_alvo==null&&campaignRoas!=null&&Number(x.investimento||0)>0)x.roas_alvo=campaignRoas
  const phases=(ph?.rows||[]).length?(ph?.rows||[]).map((r:any)=>{const legacy=String(r?.[2]??'');return{nome:String(r?.[0]||'').replace(/^Fase\s*\d+\s*:\s*/i,''),tem:/^sim$/i.test(String(r?.[1]||'')),data:fullLegacyPhaseDate(legacy,c),data_legada:legacy||null}}).filter((x:any)=>x.nome):fullDefaultPhases(c.type)
  return{
    sobre_evento:{nome:String(ev['nome da campanha']||c.name||''),formato:String(ev['formato da campanha']||c.objective||''),cupom_automatico:String(ev['cupom automatico']||''),bonus_universal:String(ev['bonus universal']||''),bonus_influencer:String(ev['bonus via influencer']||''),observacoes:''},
    equipe:(team?.rows||[]).map((r:any)=>({quem:String(r?.[0]||''),responsabilidade:String(r?.[1]||'')})).filter((x:any)=>x.quem),
    fases:phases,
    oferta:{produtos:products,desconto_geral:Number(products[0]?.desconto||0),desconto_por_sku:{},frete:String(ev['frete']||''),brinde:'',bonus_universal:String(ev['bonus universal']||''),bonus_influencer:String(ev['bonus via influencer']||'')},
    aumento_ticket:(tick?.rows||[]).map((r:any)=>({estrategia:String(r?.[0]||''),detalhe:String(r?.[1]||''),desconto:fullPercentPreserve(r?.[2])})).filter((x:any)=>x.estrategia),
    metas_por_fonte:[...goalBy.values()],cronograma:schedule,roas_alvo_campanha:campaignRoas,legacy_sections:sections
  }
}

function fullGoal(c:any){const t=fullLegacyTap(c),sum=(t.metas_por_fonte||[]).reduce((n:number,x:any)=>n+Number(x.meta_faturamento||0),0);return sum>0?sum:Number(c.goal||0)}
function fullInvestment(c:any){const t=fullLegacyTap(c),sum=(t.metas_por_fonte||[]).reduce((n:number,x:any)=>n+Number(x.investimento||0),0);return sum>0?sum:Number(c.budget||0)}
function fullPublicCampaign(c:any){let tipo=c.type||null,status=c.status||'planejamento';try{tipo=fullCampaignType(tipo)}catch{}try{status=fullCampaignStatus(status)}catch{}return{id:String(c.id),link:fullLinks('campanha',String(c.id)),nome:c.name||'',marca:c.brand||null,tipo,inicio:fullCampaignBoundary(c.startAt||c.start,'inicio'),fim:fullCampaignBoundary(c.endAt||c.end,'fim'),meta_faturamento:fullGoal(c),meta_manual:Number(c.goal||0),investimento_total:fullInvestment(c),status,mes_referencia:c.monthRef||String(c.startAt||c.start||'').slice(0,7)||null,mes_id:c.monthId||null,canais:Array.isArray(c.channels)?c.channels:[],cliente_id:c.clientId||null,tags:Array.isArray(c.tags)?c.tags:[],arquivada:!!c.archivedAt,arquivada_em:c.archivedAt||null,origem:c.origin||c.source||null}}
function fullMonthRef(c:any){return c.monthRef||String(c.startAt||c.start||'').slice(0,7)||null}
function fullTapTotals(c:any){const t=fullLegacyTap(c),fat=(t.metas_por_fonte||[]).reduce((n:number,x:any)=>n+Number(x.meta_faturamento||0),0),inv=(t.metas_por_fonte||[]).reduce((n:number,x:any)=>n+Number(x.investimento||0),0);return{...t,totais:{faturamento:fat,investimento:inv,lucro_aproximado:fat-inv,roas:inv?fat/inv:null}}}
function fullCampaignWarnings(c:any){const t=fullLegacyTap(c),plans=t.metas_por_fonte||[],sum=plans.reduce((n:number,x:any)=>n+Number(x.meta_faturamento||0),0),manual=Number(c.goal||0),a=[] as string[];if(sum>0&&manual>0&&Math.abs(sum-manual)>.01)a.push('A meta manual é R$ '+manual.toFixed(2)+', mas as metas por fonte somam R$ '+sum.toFixed(2)+'. Vale a soma por fonte de receita.');for(const x of plans){const meta=Number(x.meta_faturamento||0),inv=Number(x.investimento||0),target=x.roas_alvo==null?null:Number(x.roas_alvo);if(meta>0&&inv>0&&target!=null&&target>=0){const calc=meta/inv,diff=calc?Math.abs(target-calc)/calc:0;if(diff>.20)a.push('ROAS alvo de '+String(x.fonte)+' ('+target.toFixed(2)+') difere mais de 20% do ROAS calculado ('+calc.toFixed(2)+').')}}return a}

async function fullAuditHistory(s:any,entityType:string,entityId:string){
  const {data,error}=await s.from('task_action_audit').select('id,actor_id,origin,action,details,created_at').eq('entity_type',entityType).eq('entity_id',String(entityId)).order('created_at',{ascending:false}).limit(100)
  if(error)return[]
  const ids=[...new Set((data||[]).map((x:any)=>x.actor_id).filter(Boolean))]
  let names=new Map<string,string>()
  if(ids.length){
    const {data:p}=await s.from('profiles').select('id,nome').in('id',ids)
    names=new Map((p||[]).map((x:any)=>[String(x.id),String(x.nome||'')]))
  }
  return(data||[]).map((x:any)=>({id:x.id,at:x.created_at,autor_id:x.actor_id,autor:names.get(String(x.actor_id))||null,origem:x.origin,acao:x.action,detalhes:x.details||{}}))
}
async function fullResolveMonth(s:any,brand:any,ref:string,id?:string|null){
  let q=s.from('planning_months').select('*').is('arquivado_em',null)
  if(id)q=q.eq('id',id)
  else{
    const m=String(ref||'').match(/^(\d{4})-(\d{2})$/)
    if(!m)throw new Error('Mês de referência inválido.')
    q=q.eq('brand_id',brand.id).eq('ano',Number(m[1])).eq('mes',Number(m[2]))
  }
  const {data,error}=await q.maybeSingle()
  if(error||!data)throw new Error('Mês da marca não encontrado. Crie o mês antes da campanha.')
  if(String(data.brand_id)!==String(brand.id))throw new Error('O mês informado pertence a outra marca.')
  return data
}
async function fullBrand(s:any,input:any){const bs=await listBrands(s),n=norm(input),b=bs.find((x:any)=>String(x.id)===String(input)||norm(x.nome)===n||norm(x.slug)===n);if(!b)throw new Error('Marca não encontrada.');return b}
async function fullMonthPayload(s:any,row:any){
  const bs=await listBrands(s),b=bs.find((x:any)=>String(x.id)===String(row.brand_id)),cs=(await fullCampaigns(s)).filter((c:any)=>!c.archivedAt&&norm(c.brand)===norm(b?.nome)&&(String(c.monthId||'')===String(row.id)||fullMonthRef(c)===row.ano+'-'+String(row.mes).padStart(2,'0'))),sum=cs.reduce((n:number,c:any)=>n+fullGoal(c),0),active=Number(row.meta_ativa||1),mv=Number(row['meta'+active]||0),warnings=[] as string[]
  if(mv>0&&Math.abs(sum-mv)>.01)warnings.push('As campanhas somam R$ '+sum.toFixed(2)+' e não batem com a Meta '+active+' ativa da marca (R$ '+mv.toFixed(2)+').')
  return{id:String(row.id),link:fullLinks('mes',String(row.id)),marca:b?.nome||null,marca_id:row.brand_id,ano:row.ano,mes:row.mes,meta1:Number(row.meta1||0),meta2:Number(row.meta2||0),meta3:Number(row.meta3||0),meta_ativa:active,ticket_medio_previsto:Number(row.ticket_medio_previsto||0),soma_metas_campanhas:sum,campanhas:cs.map(fullPublicCampaign),avisos:warnings,arquivada:!!row.arquivado_em,historico:await fullAuditHistory(s,'mes',String(row.id))}
}
async function fullMapNodes(s:any,mapId:string,arch=true){let q=s.from('planning_map_nodes').select('*').eq('map_id',mapId).order('criado_em');if(!arch)q=q.is('arquivado_em',null);const{data,error}=await q;if(error)throw new Error(error.message);return data||[]}
async function fullMap(s:any,id:string){const{data,error}=await s.from('planning_maps').select('*').eq('id',id).maybeSingle();if(error||!data)throw new Error('Mapa não encontrado.');return data}
async function fullSyncMap(s:any,map:any){
  const [nodes,bs]=await Promise.all([fullMapNodes(s,map.id,true),listBrands(s)]),b=bs.find((x:any)=>String(x.id)===String(map.brand_id)),live=nodes.filter((n:any)=>!n.arquivado_em),legacy:any={v:2,layout:map.layout||'direita',prox:2,proxItem:1,itens:[],nos:[]};let mx=1
  for(const n of live){const id=/^\d+$/.test(String(n.node_key))?Number(n.node_key):String(n.node_key),p=n.parent_key==null?null:(/^\d+$/.test(String(n.parent_key))?Number(n.parent_key):String(n.parent_key));if(typeof id==='number')mx=Math.max(mx,id);legacy.nos.push({id,pai:p,t:n.texto,cor:n.cor??0,x:Number(n.x),y:Number(n.y),fech:!n.aberto,campId:n.campaign_id||undefined})}legacy.prox=mx+1;await fullWriteOperational(s,'central.planning.map.vitor-gutierrez'+(b?.nome?'.'+b.nome:''),legacy)
}
async function fullMapPayload(s:any,map:any){const[nodes,month,bs]=await Promise.all([fullMapNodes(s,map.id,true),s.from('planning_months').select('*').eq('id',map.month_id).single(),listBrands(s)]),b=bs.find((x:any)=>String(x.id)===String(map.brand_id));return{id:String(map.id),link:fullLinks('mapa',String(map.id)),nome:map.nome,marca:b?.nome||null,ano:month.data?.ano,mes:month.data?.mes,layout:map.layout,nos:nodes.map((n:any)=>({id:String(n.id),chave:n.node_key,pai:n.parent_key,texto:n.texto,x:Number(n.x),y:Number(n.y),cor:n.cor,aberto:n.aberto,campanha_id:n.campaign_id||null,arquivado:!!n.arquivado_em})),arquivado:!!map.arquivado_em}}
function fullDelivery(d:any,tasks:any[],campaigns:any[]){const x=fullNormalizeDeliveryShape(d,false),t=tasks.find(q=>String(q.id)===String(x.sourceTaskId)),cid=hasOwn(x,'campaignId')?x.campaignId:(hasOwn(x,'campanha_id')?x.campanha_id:(t?.campaignId||null)),c=cid?campaigns.find(q=>String(q.id)===String(cid)):null;return{id:String(x.id),link:fullLinks('entrega',String(x.id)),tarefa_id:x.sourceTaskId||null,proxima_tarefa_id:x.targetTaskId||null,titulo:x.title||x.taskTitle||'Entrega',campanha_id:c?.id||cid||null,marca:x.brand||t?.brand||null,de:x.from||null,para:x.to||null,mensagem:x.note||'',status:fullDeliveryStatus(x.status),versao:Number(x.version||1),criada_em:x.createdAt||null,criada_em_original:x.createdAtOriginal||null,atualizada_em:x.updatedAt||null,atualizada_em_original:x.updatedAtOriginal||null,arquivos:x.files||[],links:x.links||[],historico:x.events||[],comentario_ajuste:x.adjustmentNote||null,arquivada:!!x.archivedAt,arquivada_em:x.archivedAt||null,arquivada_por:x.archivedBy||null}}
async function fullResults(s:any,filter:any){
  let q=s.from('campaign_results').select('*').order('data')
  if(filter.campaign_id)q=q.eq('campaign_id',filter.campaign_id)
  if(filter.brand_id)q=q.eq('brand_id',filter.brand_id)
  if(filter.canal)q=q.eq('canal',filter.canal)
  if(filter.fonte_receita)q=q.eq('fonte_receita',filter.fonte_receita)
  if(filter.inicio)q=q.gte('data',filter.inicio)
  if(filter.fim)q=q.lte('data',filter.fim)
  if(!filter.incluir_arquivados)q=q.is('arquivado_em',null)
  const{data,error}=await q;if(error)throw new Error(error.message);return data||[]
}
function fullAgg(rows:any[]){
  let faturamento=0,investimento=0
  const byChannel=new Map<string,any>(),bySource=new Map<string,any>()
  for(const r of rows){
    const f=Number(r.faturamento||0),i=Number(r.investimento||0);faturamento+=f;investimento+=i
    if(r.canal){const x=byChannel.get(r.canal)||{canal:r.canal,faturamento:0,investimento:0};x.faturamento+=f;x.investimento+=i;byChannel.set(r.canal,x)}
    if(r.fonte_receita){const x=bySource.get(r.fonte_receita)||{fonte_receita:r.fonte_receita,faturamento:0,investimento:0};x.faturamento+=f;x.investimento+=i;bySource.set(r.fonte_receita,x)}
  }
  const add=(x:any)=>({...x,roas:x.investimento?x.faturamento/x.investimento:null})
  return{faturamento,investimento,roas:investimento?faturamento/investimento:null,por_canal:[...byChannel.values()].map(add),por_fonte:[...bySource.values()].map(add)}
}
async function fullSyncRevenueSources(s:any,c:any,who:any){
  const plans=fullLegacyTap(c).metas_por_fonte||[],b=await fullBrand(s,c.brand)
  const{data:existing,error:e}=await s.from('campaign_revenue_sources').select('*').eq('campaign_id',String(c.id));if(e)throw new Error(e.message)
  const active=new Set(plans.map((x:any)=>norm(x.fonte)))
  for(const p of plans){
    const nome=fullRevenueSourceName(p.fonte),old=(existing||[]).find((x:any)=>norm(x.nome)===norm(nome))
    const row:any={campaign_id:String(c.id),brand_id:b.id,nome,responsavel:p.responsavel||null,investimento_previsto:Number(p.investimento||0),meta_faturamento:Number(p.meta_faturamento||0),roas_alvo:p.roas_alvo==null?null:Number(p.roas_alvo),ativa:true,origem:'mcp',atualizado_por:who.id}
    if(old){const{error}=await s.from('campaign_revenue_sources').update(row).eq('id',old.id);if(error)throw new Error(error.message)}
    else{row.criado_por=who.id;const{error}=await s.from('campaign_revenue_sources').insert(row);if(error)throw new Error(error.message)}
  }
  for(const old of existing||[])if(old.ativa&&!active.has(norm(old.nome))){const{error}=await s.from('campaign_revenue_sources').update({ativa:false,atualizado_por:who.id}).eq('id',old.id);if(error)throw new Error(error.message)}
}

async function fullTag(s:any,input:string){const{data,error}=await s.from('alliance_tags').select('*').is('arquivado_em',null);if(error)throw new Error(error.message);const n=norm(input),m=(data||[]).filter((t:any)=>String(t.id)===String(input)||norm(t.nome)===n);if(!m.length)throw new Error('Tag não encontrada.');if(m.length>1&&!m.some((t:any)=>String(t.id)===String(input)))throw new Error('Tag ambígua; use id.');return m.find((t:any)=>String(t.id)===String(input))||m[0]}
async function fullCompletion(supabase:any,t:any,tasks:any[],assumeOfficialDelivery=false){const b=(t.dependencies||[]).map((id:any)=>tasks.find(x=>String(x.id)===String(id))).filter(Boolean).filter((x:any)=>x.status!=='feito');if(b.length)return'Há dependências pendentes.';if(t.conferenceRequired){const p=(t.checklist||[]).filter((x:any)=>!x.done);if(!(t.checklist||[]).length)return'Checklist obrigatória sem itens.';if(p.length)return'Checklist obrigatória pendente.'}if(t.deliveryRequired&&!assumeOfficialDelivery&&!(await hasOfficialDelivery(supabase,t)))return'Entrega obrigatória pendente na coleção oficial.';return''}

const fullTapSchema=z.object({
  sobre_evento:z.object({nome:z.string().max(300).default(''),formato:z.string().max(1000).default(''),cupom_automatico:z.string().max(1000).default(''),bonus_universal:z.string().max(2000).default(''),bonus_influencer:z.string().max(2000).default(''),observacoes:z.string().max(10000).default('')}),
  equipe:z.array(z.object({quem:z.string().min(1),responsabilidade:z.string().min(1),usuario_id:z.string().nullable().optional()})).max(100).default([]),
  fases:z.array(z.object({nome:z.string().min(1),tem:z.boolean(),data:dt.nullable().optional(),data_legada:z.string().nullable().optional()})).max(100).default([]),
  oferta:z.object({produtos:z.array(z.object({sku:z.string().default(''),nome:z.string().min(1),preco:z.number().min(0),desconto:z.number().min(0).default(0)})).max(500).default([]),desconto_geral:z.number().min(0).default(0),desconto_por_sku:z.record(z.string(),z.number().min(0)).default({}),frete:z.string().default(''),brinde:z.string().default(''),bonus_universal:z.string().default(''),bonus_influencer:z.string().default('')}),
  aumento_ticket:z.array(z.object({estrategia:z.string().min(1),detalhe:z.string().default(''),desconto:z.union([z.number().min(0),z.string().max(100)]).nullable().default(null)})).max(100).default([]),
  metas_por_fonte:z.array(z.object({fonte:z.string().min(1),investimento:z.number().min(0).default(0),meta_faturamento:z.number().min(0).default(0),roas_alvo:z.number().min(0).nullable().optional(),responsavel:z.string().nullable().optional()})).max(100).default([]),
  metas_por_canal:z.array(z.object({canal:z.string(),investimento:z.number().min(0).default(0),meta_faturamento:z.number().min(0).default(0),roas_alvo:z.number().min(0).nullable().optional(),responsavel:z.string().nullable().optional()})).max(100).optional().describe('Obsoleto: use metas_por_fonte.'),
  cronograma:z.array(z.object({canal:z.string(),periodo:z.string().min(1),periodo_inicio:dt.nullable().optional(),periodo_fim:dt.nullable().optional(),conteudo:z.string().default(''),responsaveis:z.array(z.string()).max(20).default([]),prazo:dt.nullable().optional(),quem_faz:z.string().nullable().optional()})).max(1000).default([])
})

function registerFullSystemTools(server:any,supabase:any){
  server.registerTool('listar_canais',{description:'Lista os canais estruturados oficiais do AllianceOS.',inputSchema:z.object({}),annotations:{readOnlyHint:true}},async()=>toolText({canais:FULL_CHANNELS}))
  server.registerTool('listar_fontes_receita',{
    description:'Lista fontes de receita. Sem campanha retorna a lista oficial editável; com campanha retorna metas/ROAS/investimento da própria campanha.',
    inputSchema:z.object({campanha_id:z.string().optional(),marca:z.string().optional(),incluir_inativas:z.boolean().default(false)}),
    annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const oficiais=[...DEFAULT_REVENUE_SOURCES]
    if(!a.campanha_id)return toolText({fontes_oficiais:oficiais})
    const c=exactCampaign(await fullCampaigns(supabase),a.campanha_id)
    if(a.marca){const b=await fullBrand(supabase,a.marca);if(norm(c.brand)!==norm(b.nome))throw new Error('A campanha pertence a outra marca.')}
    const{data,error}=await supabase.from('campaign_revenue_sources').select('*').eq('campaign_id',String(c.id)).order('nome')
    if(error)throw new Error(error.message)
    const persisted=(data||[]).filter((x:any)=>a.incluir_inativas||x.ativa).map((x:any)=>({id:String(x.id),campanha_id:x.campaign_id,nome:x.nome,responsavel:x.responsavel,investimento_previsto:Number(x.investimento_previsto||0),meta_faturamento:Number(x.meta_faturamento||0),roas_alvo:x.roas_alvo==null?null:Number(x.roas_alvo),ativa:!!x.ativa}))
    const by=new Map(persisted.map((x:any)=>[norm(x.nome),x]))
    for(const p of fullLegacyTap(c).metas_por_fonte||[])if(!by.has(norm(p.fonte)))by.set(norm(p.fonte),{id:null,campanha_id:String(c.id),nome:p.fonte,responsavel:p.responsavel||null,investimento_previsto:Number(p.investimento||0),meta_faturamento:Number(p.meta_faturamento||0),roas_alvo:p.roas_alvo??null,ativa:true})
    return toolText({campanha:{id:String(c.id),nome:c.name},fontes:[...by.values()],fontes_oficiais:oficiais})
  })

  server.registerTool('criar_campanha',{description:'Cria campanha na mesma coleção usada pela tela Campanhas.',inputSchema:z.object({nome:z.string().min(1),marca:z.string().min(1),tipo:z.string(),inicio:dt,fim:dt,meta_faturamento:z.number().min(0).default(0),investimento_total:z.number().min(0).default(0),status:z.string().default('planejamento'),mes_referencia:z.string().regex(/^\d{4}-\d{2}$/).optional(),mes_id:z.string().uuid().nullable().optional(),canais:z.array(z.string()).max(10).default([]),cliente_id:z.string().uuid().nullable().optional()})},async(a:any)=>{const who=await actor(supabase),b=await fullBrand(supabase,a.marca),rows=await fullCampaigns(supabase);if(new Date(a.fim)<new Date(a.inicio))throw new Error('fim anterior a início.');const monthRef=a.mes_referencia||String(a.inicio).slice(0,7),month=await fullResolveMonth(supabase,b,monthRef,a.mes_id||null),id='camp-'+Date.now()+'-'+crypto.randomUUID().slice(0,8),c:any={id,name:a.nome.trim(),brand:b.nome,type:fullCampaignType(a.tipo),start:String(a.inicio).slice(0,10),end:String(a.fim).slice(0,10),startAt:a.inicio,endAt:a.fim,goal:a.meta_faturamento,budget:a.investimento_total,status:fullCampaignStatus(a.status),monthRef:month.ano+'-'+String(month.mes).padStart(2,'0'),monthId:month.id,channels:a.canais.map(fullChannelCanon),clientId:a.cliente_id||null,tags:[],tapStructured:null,origin:'mcp',history:[],archivedAt:null};fullHistory(c,'Campanha criada via MCP.',who);rows.unshift(c);await fullSaveCampaigns(supabase,rows);await audit(supabase,who,'criar_campanha','campanha',id,{marca:b.nome});return toolText({campanha:fullPublicCampaign(c),avisos:fullCampaignWarnings(c)})})
  server.registerTool('atualizar_campanha',{
    description:'Atualiza ou arquiva campanha. Tipo/status são normalizados e o mês é vinculado automaticamente quando existir. Nunca exclui.',
    inputSchema:z.object({id:z.string(),nome:z.string().min(1).optional(),marca:z.string().optional(),tipo:z.string().optional(),inicio:dt.optional(),fim:dt.optional(),meta_faturamento:z.number().min(0).optional(),investimento_total:z.number().min(0).optional(),status:z.string().optional(),mes_referencia:z.string().regex(/^\d{4}-\d{2}$/).optional(),mes_id:z.string().uuid().nullable().optional(),canais:z.array(z.string()).optional(),cliente_id:z.string().uuid().nullable().optional(),arquivada:z.boolean().optional()})
  },async(a:any)=>{
    const who=await actor(supabase),rows=await fullCampaigns(supabase),c=fullCampaign(rows,a.id)
    if(a.nome!==undefined)c.name=a.nome.trim();if(a.marca)c.brand=(await fullBrand(supabase,a.marca)).nome;if(a.tipo)c.type=fullCampaignType(a.tipo);else c.type=fullCampaignType(c.type)
    if(a.inicio){c.startAt=a.inicio;c.start=String(a.inicio).slice(0,10)}else c.startAt=fullCampaignBoundary(c.startAt||c.start,'inicio')
    if(a.fim){c.endAt=a.fim;c.end=String(a.fim).slice(0,10)}else c.endAt=fullCampaignBoundary(c.endAt||c.end,'fim')
    if(c.startAt)c.start=String(c.startAt).slice(0,10);if(c.endAt)c.end=String(c.endAt).slice(0,10);if(c.startAt&&c.endAt&&new Date(c.endAt)<new Date(c.startAt))throw new Error('fim anterior a início.')
    if(a.meta_faturamento!==undefined)c.goal=a.meta_faturamento;if(a.investimento_total!==undefined)c.budget=a.investimento_total;if(a.status)c.status=fullCampaignStatus(a.status);else c.status=fullCampaignStatus(c.status||'planejamento')
    if(a.canais)c.channels=a.canais.map(fullChannelCanon);if(a.cliente_id!==undefined)c.clientId=a.cliente_id
    const brand=await fullBrand(supabase,c.brand),ref=a.mes_referencia||c.monthRef||String(c.startAt||c.start||'').slice(0,7);let month:any=null
    if(a.mes_id){const{data}=await supabase.from('planning_months').select('*').eq('id',a.mes_id).is('arquivado_em',null).maybeSingle();if(!data)throw new Error('Mês informado não encontrado.');if(String(data.brand_id)!==String(brand.id))throw new Error('O mês informado pertence a outra marca.');month=data}
    else if(ref){const m=String(ref).match(/^(\d{4})-(\d{2})$/);if(m){const{data}=await supabase.from('planning_months').select('*').eq('brand_id',brand.id).eq('ano',Number(m[1])).eq('mes',Number(m[2])).is('arquivado_em',null).maybeSingle();month=data||null}}
    if(month){c.monthId=month.id;c.monthRef=month.ano+'-'+String(month.mes).padStart(2,'0')}else if(a.mes_id===null){c.monthId=null;if(a.mes_referencia)c.monthRef=a.mes_referencia}else if(a.mes_referencia)c.monthRef=a.mes_referencia
    if(a.arquivada!==undefined){c.archivedAt=a.arquivada?(c.archivedAt||nowIso()):null;c.archivedBy=a.arquivada?who.id:null}
    fullHistory(c,'Campanha atualizada via MCP.',who);await fullSaveCampaigns(supabase,rows);await audit(supabase,who,'atualizar_campanha','campanha',String(c.id),{arquivada:!!c.archivedAt,mes_id:c.monthId||null,tipo:c.type,status:c.status});return toolText({campanha:fullPublicCampaign(c),avisos:fullCampaignWarnings(c)})
  })
  server.registerTool('listar_campanhas',{description:'Lista campanhas por marca, mês, tipo e status.',inputSchema:z.object({marca:z.string().optional(),mes:z.string().regex(/^\d{4}-\d{2}$/).optional(),tipo:z.string().optional(),status:z.string().optional(),incluir_arquivadas:z.boolean().default(false)}),annotations:{readOnlyHint:true}},async(a:any)=>{let rows=await fullCampaigns(supabase);if(!a.incluir_arquivadas)rows=rows.filter((c:any)=>!c.archivedAt);if(a.marca){const b=await fullBrand(supabase,a.marca);rows=rows.filter((c:any)=>norm(c.brand)===norm(b.nome))}if(a.mes)rows=rows.filter((c:any)=>fullMonthRef(c)===a.mes);if(a.tipo){const t=fullCampaignType(a.tipo);rows=rows.filter((c:any)=>c.type===t)}if(a.status){const st=fullCampaignStatus(a.status);rows=rows.filter((c:any)=>norm(c.status)===norm(st))}return toolText({campanhas:rows.map((c:any)=>({...fullPublicCampaign(c),avisos:fullCampaignWarnings(c)}))})})
  server.registerTool('obter_campanha',{
    description:'Obtém campanha com paginação. Permite escolher seções e modo completo/resumo sem repetir tarefas.',
    inputSchema:z.object({id:z.string(),secoes:z.array(z.enum(['campanha','tap','listas','tarefas','entregas','resultados','historico'])).default(['campanha','tap','listas','tarefas','entregas','resultados','historico']),modo:z.enum(['completo','resumo']).default('completo'),cursor:z.string().optional(),limite:z.number().int().min(1).max(100).default(50),incluir_arquivados:z.boolean().default(false)}),annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const[camps,lists,tasks,deliveries]=await Promise.all([fullCampaigns(supabase),buildLists(supabase,true),readState(supabase,TASKS_KEY),fullDeliveries(supabase)])
    const c=fullCampaign(camps,a.id),byList=new Map(lists.map((l:any)=>[String(l.id),l])),selected=new Set(a.secoes),offset=fullCursorOffset(a.cursor)
    const ls=lists.filter((l:any)=>String(l.campanha_id||'')===String(c.id)&&(a.incluir_arquivados||!l.arquivada))
    const ts=tasks.filter((t:any)=>String(taskCampaignFromLists(t,byList)||'')===String(c.id)&&(a.incluir_arquivados||!t.archivedAt))
    const taskIds=new Set(ts.map((t:any)=>String(t.id))),ds=deliveries.filter((d:any)=>taskIds.has(String(d.sourceTaskId))||taskIds.has(String(d.targetTaskId))),rs=await fullResults(supabase,{campaign_id:String(c.id),incluir_arquivados:a.incluir_arquivados})
    const out:any={avisos:fullCampaignWarnings(c),paginacao:{cursor:a.cursor||null,limite:a.limite,offset,proximo_cursor:null,totais:{}}};let maxTotal=0
    const addPage=(key:string,rows:any[],map:(x:any)=>any=x=>x)=>{out.paginacao.totais[key]=rows.length;maxTotal=Math.max(maxTotal,rows.length);if(selected.has(key as any))out[key]=rows.slice(offset,offset+a.limite).map(map)}
    if(selected.has('campanha'))out.campanha=fullPublicCampaign(c);if(selected.has('tap'))out.tap=fullTapForMode(c,a.modo)
    addPage('listas',ls);addPage('tarefas',ts,(t:any)=>a.modo==='resumo'?fullTaskSummary(t,String(c.id)):({...publicTask(t),campanha_id:String(c.id)}));addPage('entregas',ds,(d:any)=>fullDelivery(d,tasks,camps));addPage('resultados',rs,fullResultPublic)
    if(selected.has('historico')){out.historico=fullNormalizeActivityList(c.history).slice(offset,offset+a.limite);out.paginacao.totais.historico=(c.history||[]).length;maxTotal=Math.max(maxTotal,(c.history||[]).length)}
    if(offset+a.limite<maxTotal)out.paginacao.proximo_cursor=fullCursor(offset+a.limite)
    return toolText(out)
  })
  server.registerTool('criar_mes',{description:'Cria mês da marca com três metas, meta ativa e ticket médio previsto.',inputSchema:z.object({marca:z.string(),ano:z.number().int().min(2000).max(2200),mes:z.number().int().min(1).max(12),meta1:z.number().min(0).default(0),meta2:z.number().min(0).default(0),meta3:z.number().min(0).default(0),meta_ativa:z.number().int().min(1).max(3).default(1),ticket_medio_previsto:z.number().min(0).default(0)})},async(a:any)=>{const who=await actor(supabase),b=await fullBrand(supabase,a.marca);const{data:old}=await supabase.from('planning_months').select('id').eq('brand_id',b.id).eq('ano',a.ano).eq('mes',a.mes).maybeSingle();if(old)throw new Error('Mês já existe.');const{data,error}=await supabase.from('planning_months').insert({brand_id:b.id,ano:a.ano,mes:a.mes,meta1:a.meta1,meta2:a.meta2,meta3:a.meta3,meta_ativa:a.meta_ativa,ticket_medio_previsto:a.ticket_medio_previsto,origem:'mcp',criado_por:who.id,atualizado_por:who.id}).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'criar_mes','mes',data.id,{marca:b.nome});return toolText({mes:await fullMonthPayload(supabase,data)})})
  server.registerTool('atualizar_mes',{description:'Atualiza ou arquiva mês.',inputSchema:z.object({id:z.string().uuid(),meta1:z.number().min(0).optional(),meta2:z.number().min(0).optional(),meta3:z.number().min(0).optional(),meta_ativa:z.number().int().min(1).max(3).optional(),ticket_medio_previsto:z.number().min(0).optional(),arquivado:z.boolean().optional()})},async(a:any)=>{const who=await actor(supabase);const{data:old,error:e}=await supabase.from('planning_months').select('*').eq('id',a.id).maybeSingle();if(e||!old)throw new Error('Mês não encontrado.');const p:any={atualizado_por:who.id};for(const k of ['meta1','meta2','meta3','meta_ativa','ticket_medio_previsto'])if(a[k]!==undefined)p[k]=a[k];if(a.arquivado!==undefined){p.arquivado_em=a.arquivado?(old.arquivado_em||nowIso()):null;p.arquivado_por=a.arquivado?who.id:null}const{data,error}=await supabase.from('planning_months').update(p).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'atualizar_mes','mes',a.id,{arquivado:!!data.arquivado_em});return toolText({mes:await fullMonthPayload(supabase,data)})})
  server.registerTool('listar_meses',{description:'Lista meses planejados.',inputSchema:z.object({marca:z.string().optional(),ano:z.number().int().optional(),incluir_arquivados:z.boolean().default(false)}),annotations:{readOnlyHint:true}},async(a:any)=>{let q=supabase.from('planning_months').select('*').order('ano',{ascending:false}).order('mes',{ascending:false});if(!a.incluir_arquivados)q=q.is('arquivado_em',null);if(a.ano)q=q.eq('ano',a.ano);if(a.marca)q=q.eq('brand_id',(await fullBrand(supabase,a.marca)).id);const{data,error}=await q;if(error)throw new Error(error.message);const out=[];for(const x of data||[])out.push(await fullMonthPayload(supabase,x));return toolText({meses:out})})
  server.registerTool('obter_mes',{description:'Obtém mês, campanhas, soma das metas e aviso de divergência.',inputSchema:z.object({id:z.string().uuid()}),annotations:{readOnlyHint:true}},async({id}:any)=>{const{data,error}=await supabase.from('planning_months').select('*').eq('id',id).maybeSingle();if(error||!data)throw new Error('Mês não encontrado.');return toolText({mes:await fullMonthPayload(supabase,data)})})

  server.registerTool('definir_tap',{
    description:'Define TAP estruturado. Metas financeiras são por fonte de receita; cronograma continua usando canais oficiais de execução.',
    inputSchema:z.object({campanha_id:z.string(),tap:fullTapSchema,usar_fases_padrao:z.boolean().default(true)})
  },async(a:any)=>{
    const who=await actor(supabase),rows=await fullCampaigns(supabase),c=fullCampaign(rows,a.campanha_id),tap:any=structuredClone(a.tap)
    if((!tap.metas_por_fonte||!tap.metas_por_fonte.length)&&Array.isArray(tap.metas_por_canal))tap.metas_por_fonte=tap.metas_por_canal.map((x:any)=>({fonte:fullRevenueSourceName(x.canal),investimento:x.investimento||0,meta_faturamento:x.meta_faturamento||0,roas_alvo:x.roas_alvo??null,responsavel:x.responsavel??null}))
    tap.metas_por_fonte=(tap.metas_por_fonte||[]).map((x:any)=>({...x,fonte:fullRevenueSourceName(x.fonte)}))
    delete tap.metas_por_canal
    if(a.usar_fases_padrao&&!(tap.fases||[]).length)tap.fases=fullDefaultPhases(c.type)
    tap.cronograma=(tap.cronograma||[]).map((x:any)=>({...x,canal:fullChannelCanon(x.canal)}))
    c.tapStructured=tap
    c.channels=[...new Set([...(c.channels||[]),...tap.cronograma.map((x:any)=>x.canal)])]
    fullHistory(c,'TAP estruturado definido via MCP.',who)
    await fullSaveCampaigns(supabase,rows);await fullSyncRevenueSources(supabase,c,who)
    await audit(supabase,who,'definir_tap','campanha',c.id,{})
    return toolText({campanha:{id:c.id,link:fullLinks('campanha',c.id)},tap:fullTapTotals(c),avisos:fullCampaignWarnings(c)})
  })
  server.registerTool('obter_tap',{
    description:'Obtém TAP estruturado. Metas são por fonte de receita e cronograma por canal de execução.',
    inputSchema:z.object({campanha_id:z.string()}),annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const c=fullCampaign(await fullCampaigns(supabase),a.campanha_id)
    return toolText({campanha:{id:c.id,link:fullLinks('campanha',c.id),nome:c.name},tap:fullTapTotals(c),avisos:fullCampaignWarnings(c)})
  })
  server.registerTool('atualizar_secao_tap',{
    description:'Atualiza uma seção do TAP. Use metas_por_fonte para faturamento; metas_por_canal é alias legado de entrada.',
    inputSchema:z.object({campanha_id:z.string(),secao:z.enum(['sobre_evento','equipe','fases','oferta','aumento_ticket','metas_por_fonte','metas_por_canal','cronograma']),valor:z.any()})
  },async(a:any)=>{
    const who=await actor(supabase),rows=await fullCampaigns(supabase),c=fullCampaign(rows,a.campanha_id),base=fullLegacyTap(c),section=a.secao==='metas_por_canal'?'metas_por_fonte':a.secao
    let parsed:any
    if(section==='metas_por_fonte'){
      const incoming=a.secao==='metas_por_canal'?(a.valor||[]).map((x:any)=>({fonte:x.fonte??x.canal,investimento:x.investimento||0,meta_faturamento:x.meta_faturamento||0,roas_alvo:x.roas_alvo??null,responsavel:x.responsavel??null})):a.valor
      parsed=fullTapSchema.shape.metas_por_fonte.parse(incoming).map((x:any)=>({...x,fonte:fullRevenueSourceName(x.fonte)}))
    }else{
      parsed=(fullTapSchema.shape as any)[section].parse(a.valor)
      if(section==='cronograma')for(const x of parsed)x.canal=fullChannelCanon(x.canal)
    }
    c.tapStructured={...base,[section]:parsed};delete c.tapStructured.metas_por_canal
    fullHistory(c,'Seção '+section+' do TAP atualizada via MCP.',who)
    await fullSaveCampaigns(supabase,rows);if(section==='metas_por_fonte')await fullSyncRevenueSources(supabase,c,who)
    await audit(supabase,who,'atualizar_secao_tap','campanha',c.id,{secao:section})
    return toolText({campanha:{id:c.id,link:fullLinks('campanha',c.id)},tap:fullTapTotals(c),avisos:fullCampaignWarnings(c)})
  })
  server.registerTool('gerar_tarefas_do_tap',{description:'Transforma cronograma do TAP em tarefas da campanha, preservando responsável e prazo ISO com fuso.',inputSchema:z.object({campanha_id:z.string(),lista:z.string().optional(),prioridade:z.string().default('normal'),status:z.string().default('a fazer')})},async(a:any)=>{const who=await actor(supabase),c=fullCampaign(await fullCampaigns(supabase),a.campanha_id),tap=fullLegacyTap(c),schedule=tap.cronograma||[];let l:any=null;if(a.lista)l=await resolveList(supabase,a.lista);else{const ls=(await buildLists(supabase,false)).filter((x:any)=>String(x.campanha_id||'')===String(c.id));l=ls[0];if(!l){const b=await fullBrand(supabase,c.brand),{data,error}=await supabase.from('task_lists').insert({nome:c.name,brand_id:b.id,campanha_id:String(c.id),criado_por:who.id,atualizado_por:who.id}).select('id,nome,brand_id,campanha_id').single();if(error)throw new Error(error.message);l={id:String(data.id),nome:data.nome,marca:b.nome,campanha_id:c.id}}}const tasks=await readState(supabase,TASKS_KEY),made=[],skip=[];for(const r of schedule){if(!r.prazo){skip.push({canal:r.canal,periodo:r.periodo,motivo:'sem prazo com hora/fuso'});continue}const text=String(r.conteudo||'').trim();if(!text)continue;let ass:any={names:[],ids:[]};if(r.responsaveis?.length)ass=await resolveAssignees(supabase,r.responsaveis);const id='mcp-'+Date.now()+'-'+crypto.randomUUID().slice(0,7),t:any={id,title:(r.canal+' — '+text).slice(0,300),description:'Campanha: '+c.name+'\nPeríodo: '+r.periodo+'\nGerada do TAP.',status:statusCanon(a.status)||'a fazer',blockedReason:null,assignees:ass.names,assigneeIds:ass.ids,due:String(r.prazo).slice(0,10),dueAt:r.prazo,start:null,brand:c.brand,project:l.nome,listId:l.id,campaignId:String(c.id),channel:fullChannelCanon(r.canal),priority:priorityCanon(a.prioridade)||'normal',checklist:[],conferenceRequired:false,subtasks:[],attachments:[],comments:[],history:[{at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Tarefa gerada do TAP.'}],recurrence:'none',recurrenceRule:{tipo:'nenhuma',dias_semana:[]},tags:[],source:'allianceos-mcp',dependencies:[],parentTaskId:null,deliveries:[],deliveryRequired:false,archivedAt:null};tasks.unshift(t);made.push(publicTask(t))}if(made.length)await writeTasks(supabase,tasks);await audit(supabase,who,'gerar_tarefas_do_tap','campanha',c.id,{quantidade:made.length});return toolText({campanha:{id:c.id,link:fullLinks('campanha',c.id)},lista:l,tarefas_criadas:made,ignoradas:skip})})

  server.registerTool('criar_mapa',{
    description:'Cria mapa mental e importa JSON. campId legado é resolvido por mapa de correspondência ou nome; sem correspondência fica nulo com aviso.',
    inputSchema:z.object({marca:z.string(),ano:z.number().int(),mes:z.number().int().min(1).max(12),nome:z.string().default('Planejamento'),layout:z.string().default('direita'),mapa_json:z.any().optional(),nos:z.array(z.any()).optional(),correspondencia_campanhas:z.record(z.string(),z.string()).default({})})
  },async(a:any)=>{
    const who=await actor(supabase),b=await fullBrand(supabase,a.marca),{data:m}=await supabase.from('planning_months').select('*').eq('brand_id',b.id).eq('ano',a.ano).eq('mes',a.mes).maybeSingle()
    if(!m)throw new Error('Crie primeiro o mês.')
    const campaigns=(await fullCampaigns(supabase)).filter((c:any)=>norm(c.brand)===norm(b.nome)),byName=new Map(campaigns.map((c:any)=>[norm(c.name),c])),mapping=a.correspondencia_campanhas||{}
    const{data:map,error}=await supabase.from('planning_maps').insert({brand_id:b.id,month_id:m.id,nome:a.nome,layout:a.layout,origem:'mcp',criado_por:who.id,atualizado_por:who.id}).select('*').single();if(error)throw new Error(error.message)
    const raw=a.mapa_json??a.nos??[],input=Array.isArray(raw)?raw:(raw?.nos||[]),warnings:any[]=[]
    const nodes=input.map((n:any,i:number)=>{
      const legacy=n.campaign_id??n.campId??null;let campaignId:string|null=null
      if(legacy!=null&&String(legacy).trim()){
        const direct=campaigns.find((c:any)=>String(c.id)===String(legacy))
        const mapped=mapping[String(legacy)]?campaigns.find((c:any)=>String(c.id)===String(mapping[String(legacy)])):null
        const named=byName.get(norm(n.campaign_name??n.campanha??n.texto??n.t??n.title??''))
        const chosen=direct||mapped||named
        if(chosen)campaignId=String(chosen.id)
        else warnings.push({no:String(n.node_key??n.chave??n.id??i+1),texto:String(n.texto??n.t??n.title??''),campanha_legada:String(legacy),aviso:'Sem correspondência; campanha_id ficou nulo.'})
      }
      return{map_id:map.id,node_key:String(n.node_key??n.chave??n.id??i+1),parent_key:n.parent_key??n.pai??n.parent??null,texto:String(n.texto??n.t??n.title??'sem título'),x:Number(n.x??0),y:Number(n.y??0),cor:n.cor??n.color??null,aberto:n.aberto!==undefined?!!n.aberto:!n.fech,campaign_id:campaignId,origem:'mcp',criado_por:who.id,atualizado_por:who.id}
    })
    if(nodes.length){const{error:e}=await supabase.from('planning_map_nodes').insert(nodes);if(e)throw new Error(e.message)}
    await fullSyncMap(supabase,map);await audit(supabase,who,'criar_mapa','mapa',map.id,{nos:nodes.length,avisos:warnings.length})
    return toolText({mapa:await fullMapPayload(supabase,map),avisos:warnings})
  })
  server.registerTool('listar_mapas',{description:'Lista mapas por marca/mês.',inputSchema:z.object({marca:z.string().optional(),ano:z.number().int().optional(),mes:z.number().int().optional(),incluir_arquivados:z.boolean().default(false)}),annotations:{readOnlyHint:true}},async(a:any)=>{let q=supabase.from('planning_maps').select('*,planning_months!inner(ano,mes)');if(!a.incluir_arquivados)q=q.is('arquivado_em',null);if(a.marca)q=q.eq('brand_id',(await fullBrand(supabase,a.marca)).id);if(a.ano)q=q.eq('planning_months.ano',a.ano);if(a.mes)q=q.eq('planning_months.mes',a.mes);const{data,error}=await q;if(error)throw new Error(error.message);return toolText({mapas:(data||[]).map((x:any)=>({id:String(x.id),link:fullLinks('mapa',String(x.id)),nome:x.nome,marca_id:x.brand_id,ano:x.planning_months?.ano,mes:x.planning_months?.mes,arquivado:!!x.arquivado_em}))})})
  server.registerTool('obter_mapa',{description:'Obtém mapa e nós.',inputSchema:z.object({id:z.string().uuid()}),annotations:{readOnlyHint:true}},async({id}:any)=>toolText({mapa:{...(await fullMapPayload(supabase,await fullMap(supabase,id))),historico:await fullAuditHistory(supabase,'mapa',id)}}))
  server.registerTool('atualizar_mapa',{description:'Atualiza ou arquiva o mapa; nunca exclui.',inputSchema:z.object({id:z.string().uuid(),nome:z.string().min(1).optional(),layout:z.string().optional(),arquivado:z.boolean().optional()})},async(a:any)=>{const who=await actor(supabase),old=await fullMap(supabase,a.id),p:any={atualizado_por:who.id};if(a.nome!==undefined)p.nome=a.nome;if(a.layout!==undefined)p.layout=a.layout;if(a.arquivado!==undefined){p.arquivado_em=a.arquivado?(old.arquivado_em||nowIso()):null;p.arquivado_por=a.arquivado?who.id:null}const{data,error}=await supabase.from('planning_maps').update(p).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await fullSyncMap(supabase,data);await audit(supabase,who,'atualizar_mapa','mapa',a.id,{arquivada:!!data.arquivado_em});return toolText({mapa:{...(await fullMapPayload(supabase,data)),historico:await fullAuditHistory(supabase,'mapa',a.id)}})})
  server.registerTool('adicionar_no',{
    description:'Adiciona nó. campanha_id, quando informado, precisa ser um id existente.',
    inputSchema:z.object({mapa_id:z.string().uuid(),chave:z.string().optional(),pai:z.string().nullable().optional(),texto:z.string().min(1),x:z.number().default(0),y:z.number().default(0),cor:z.string().nullable().optional(),aberto:z.boolean().default(true),campanha_id:z.string().nullable().optional()})
  },async(a:any)=>{
    const who=await actor(supabase),map=await fullMap(supabase,a.mapa_id);let campaignId:any=null
    if(a.campanha_id)campaignId=String(exactCampaign(await fullCampaigns(supabase),a.campanha_id).id)
    const{data,error}=await supabase.from('planning_map_nodes').insert({map_id:map.id,node_key:a.chave||crypto.randomUUID(),parent_key:a.pai??null,texto:a.texto,x:a.x,y:a.y,cor:a.cor??null,aberto:a.aberto,campaign_id:campaignId,origem:'mcp',criado_por:who.id,atualizado_por:who.id}).select('*').single()
    if(error)throw new Error(error.message);await fullSyncMap(supabase,map);await audit(supabase,who,'adicionar_no','mapa_no',data.id,{mapa_id:map.id})
    return toolText({no:{id:String(data.id),link:fullLinks('mapa',map.id),chave:data.node_key,texto:data.texto,campanha_id:data.campaign_id}})
  })
  server.registerTool('atualizar_no',{description:'Atualiza ou arquiva nó.',inputSchema:z.object({id:z.string().uuid(),texto:z.string().optional(),pai:z.string().nullable().optional(),cor:z.string().nullable().optional(),aberto:z.boolean().optional(),arquivado:z.boolean().optional()})},async(a:any)=>{const who=await actor(supabase),{data:old}=await supabase.from('planning_map_nodes').select('*').eq('id',a.id).maybeSingle();if(!old)throw new Error('Nó não encontrado.');const p:any={atualizado_por:who.id};for(const k of ['texto','cor','aberto'])if(a[k]!==undefined)p[k]=a[k];if(a.pai!==undefined)p.parent_key=a.pai;if(a.arquivado!==undefined){p.arquivado_em=a.arquivado?(old.arquivado_em||nowIso()):null;p.arquivado_por=a.arquivado?who.id:null}const{data,error}=await supabase.from('planning_map_nodes').update(p).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await fullSyncMap(supabase,await fullMap(supabase,data.map_id));await audit(supabase,who,'atualizar_no','mapa_no',data.id,{});return toolText({no:{id:String(data.id),link:fullLinks('mapa',data.map_id),chave:data.node_key,texto:data.texto,arquivado:!!data.arquivado_em}})})
  server.registerTool('mover_no',{description:'Move nó x/y.',inputSchema:z.object({id:z.string().uuid(),x:z.number(),y:z.number()})},async(a:any)=>{const who=await actor(supabase),{data,error}=await supabase.from('planning_map_nodes').update({x:a.x,y:a.y,atualizado_por:who.id}).eq('id',a.id).select('*').maybeSingle();if(error||!data)throw new Error('Nó não encontrado.');await fullSyncMap(supabase,await fullMap(supabase,data.map_id));await audit(supabase,who,'mover_no','mapa_no',data.id,{x:a.x,y:a.y});return toolText({no:{id:String(data.id),link:fullLinks('mapa',data.map_id),x:Number(data.x),y:Number(data.y)}})})
  server.registerTool('vincular_no_a_campanha',{
    description:'Vincula/desvincula nó a campanha existente.',
    inputSchema:z.object({id:z.string().uuid(),campanha_id:z.string().nullable()})
  },async(a:any)=>{
    const who=await actor(supabase);let campaignId:any=null
    if(a.campanha_id)campaignId=String(exactCampaign(await fullCampaigns(supabase),a.campanha_id).id)
    const{data,error}=await supabase.from('planning_map_nodes').update({campaign_id:campaignId,atualizado_por:who.id}).eq('id',a.id).select('*').maybeSingle()
    if(error||!data)throw new Error('Nó não encontrado.');await fullSyncMap(supabase,await fullMap(supabase,data.map_id));await audit(supabase,who,'vincular_no_a_campanha','mapa_no',data.id,{campanha_id:campaignId})
    return toolText({no:{id:String(data.id),link:fullLinks('mapa',data.map_id),campanha_id:data.campaign_id}})
  })
  server.registerTool('arquivar_no',{description:'Arquiva/desarquiva nó. Nunca exclui.',inputSchema:z.object({id:z.string().uuid(),arquivado:z.boolean().default(true)})},async(a:any)=>{const who=await actor(supabase),{data:old}=await supabase.from('planning_map_nodes').select('*').eq('id',a.id).maybeSingle();if(!old)throw new Error('Nó não encontrado.');const{data,error}=await supabase.from('planning_map_nodes').update({arquivado_em:a.arquivado?(old.arquivado_em||nowIso()):null,arquivado_por:a.arquivado?who.id:null,atualizado_por:who.id}).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await fullSyncMap(supabase,await fullMap(supabase,data.map_id));await audit(supabase,who,'arquivar_no','mapa_no',data.id,{arquivado:a.arquivado});return toolText({no:{id:String(data.id),link:fullLinks('mapa',data.map_id),arquivado:!!data.arquivado_em}})})

  server.registerTool('listar_entregas',{
    description:'Lista a mesma coleção da tela Entregas. Arquivadas ficam fora por padrão.',
    inputSchema:z.object({campanha_id:z.string().optional(),tarefa_id:z.string().optional(),responsavel:z.string().optional(),inicio:dt.optional(),fim:dt.optional(),status:z.string().optional(),incluir_arquivadas:z.boolean().default(false),limite:z.number().int().min(1).max(500).default(100)}),
    annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const[d,t,c]=await Promise.all([fullDeliveries(supabase),readState(supabase,TASKS_KEY),fullCampaigns(supabase)])
    let rows=d.filter((x:any)=>a.incluir_arquivadas||!x.archivedAt)
    if(a.tarefa_id)rows=rows.filter((x:any)=>String(x.sourceTaskId)===a.tarefa_id||String(x.targetTaskId)===a.tarefa_id)
    if(a.campanha_id){
      exactCampaign(c,a.campanha_id)
      rows=rows.filter((x:any)=>{const task=t.find((q:any)=>String(q.id)===String(x.sourceTaskId));const cid=hasOwn(x,'campaignId')?x.campaignId:(hasOwn(x,'campanha_id')?x.campanha_id:(task?.campaignId||null));return String(cid||'')===String(a.campanha_id)})
    }
    if(a.responsavel){const n=norm(a.responsavel);rows=rows.filter((x:any)=>norm(x.from)===n||norm(x.to)===n)}
    if(a.status)rows=rows.filter((x:any)=>norm(fullDeliveryStatus(x.status))===norm(a.status))
    if(a.inicio)rows=rows.filter((x:any)=>x.createdAt&&new Date(x.createdAt)>=new Date(a.inicio))
    if(a.fim)rows=rows.filter((x:any)=>x.createdAt&&new Date(x.createdAt)<=new Date(a.fim))
    return toolText({entregas:rows.slice(0,a.limite).map((x:any)=>fullDelivery(x,t,c)),total:rows.length})
  })
  server.registerTool('obter_entrega',{description:'Obtém entrega com anexos e histórico.',inputSchema:z.object({id:z.string()}),annotations:{readOnlyHint:true}},async({id}:any)=>{const[d,t,c]=await Promise.all([fullDeliveries(supabase),readState(supabase,TASKS_KEY),fullCampaigns(supabase)]),x=d.find((q:any)=>String(q.id)===String(id));if(!x)throw new Error('Entrega não encontrada.');const out=fullDelivery(x,t,c);for(const f of out.arquivos||[]){if(f.storage_path){const{data}=await supabase.storage.from('alliance-deliveries').createSignedUrl(f.storage_path,3600);f.url=data?.signedUrl||null}}return toolText({entrega:out})})
  server.registerTool('registrar_entrega',{
    description:'Registra entrega com link ou arquivo base64 na mesma coleção da tela Entregas. Valida o vínculo de campanha da tarefa e grava datas ISO com fuso.',
    inputSchema:z.object({tarefa_id:z.string(),destinatario:z.string(),titulo:z.string().optional(),mensagem:z.string().default(''),proxima_tarefa_id:z.string().nullable().optional(),anexos:z.array(z.discriminatedUnion('tipo',[z.object({tipo:z.literal('link'),nome:z.string().default('Link'),url:z.string().url()}),z.object({tipo:z.literal('arquivo'),nome:z.string(),mime_type:z.string().default('application/octet-stream'),conteudo_base64:z.string()})])).max(20).default([]),concluir_tarefa:z.boolean().default(false)})
  },async(a:any)=>{
    const who=await actor(supabase),[tasks,campaigns,lists]=await Promise.all([readState(supabase,TASKS_KEY),fullCampaigns(supabase),buildLists(supabase,true)]),t=findTask(tasks,a.tarefa_id),byList=new Map(lists.map((l:any)=>[String(l.id),l])),campaignId=taskCampaignFromLists(t,byList)
    if(campaignId)exactCampaign(campaigns,campaignId)
    const ass=await resolveAssignees(supabase,[a.destinatario]),to=ass.names[0];if(a.proxima_tarefa_id)findTask(tasks,a.proxima_tarefa_id);if(a.concluir_tarefa){const p=await fullCompletion(supabase,t,tasks,true);if(p)throw new Error(p)}
    const ds=await fullDeliveries(supabase),id='del-'+Date.now()+'-'+crypto.randomUUID().slice(0,8),files=[] as any[],web=[] as any[]
    for(const x of a.anexos){if(x.tipo==='link'){web.push({id:'l-'+crypto.randomUUID().slice(0,8),label:x.nome,url:x.url});continue}let bytes;try{bytes=Uint8Array.from(atob(x.conteudo_base64),(c:string)=>c.charCodeAt(0))}catch{throw new Error('base64 inválido em '+x.nome)}const path=who.id+'/'+id+'/'+crypto.randomUUID().slice(0,8)+'-'+x.nome.replace(/[^A-Za-z0-9._-]+/g,'_'),{error}=await supabase.storage.from('alliance-deliveries').upload(path,bytes,{contentType:x.mime_type,upsert:false});if(error)throw new Error(error.message);files.push({id:'f-'+crypto.randomUUID().slice(0,8),name:x.nome,type:x.mime_type,size:bytes.length,storage_path:path})}
    const ts=nowIso(),d:any={id,sourceTaskId:String(t.id),targetTaskId:String(a.proxima_tarefa_id||''),campaignId:campaignId||null,campaignSource:'task',title:a.titulo||'Entrega · '+t.title,taskTitle:t.title,project:t.project,brand:t.brand,from:who.nome,to,note:a.mensagem,status:'enviado',createdAt:ts,updatedAt:ts,version:ds.filter((x:any)=>String(x.sourceTaskId)===String(t.id)&&norm(x.to)===norm(to)).length+1,completeTask:a.concluir_tarefa,files,links:web,events:[{at:ts,by:who.nome,authorId:who.id,origin:'mcp',text:'Entrega enviada para '+to+'.'}],origin:'mcp',archivedAt:null,archivedBy:null}
    ds.unshift(d);t.deliveries=Array.isArray(t.deliveries)?t.deliveries:[];t.deliveries.unshift({id,deliveryId:id,text:d.title,note:d.note,at:ts,author:who.nome,authorId:who.id,source:'mcp',status:'enviado',campaignId:d.campaignId,targetTaskId:d.targetTaskId,links:structuredClone(d.links),archivedAt:null,archivedBy:null});t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:ts,by:who.nome,authorId:who.id,origin:'mcp',text:'Entrega registrada via MCP por '+who.nome+'.'});if(a.concluir_tarefa)t.status='feito'
    await writeTasks(supabase,tasks);await fullSaveDeliveries(supabase,ds);await audit(supabase,who,'registrar_entrega','entrega',id,{tarefa_id:t.id,campanha_id:campaignId||null});return toolText({entrega:fullDelivery(d,tasks,campaigns),tarefa:publicTask(t)})
  })
  server.registerTool('atualizar_entrega',{
    description:'Edita ou arquiva/desarquiva uma entrega sem excluir. Permite título, mensagem, destinatário, campanha, próxima tarefa e links; sincroniza a cópia na tarefa.',
    inputSchema:z.object({id:z.string(),titulo:z.string().min(1).optional(),mensagem:z.string().optional(),destinatario:z.string().optional(),campanha_id:z.string().nullable().optional(),proxima_tarefa_id:z.string().nullable().optional(),links:z.array(z.object({nome:z.string().default('Link'),url:z.string().url()})).max(50).optional(),arquivada:z.boolean().optional()})
  },async(a:any)=>{
    const who=await actor(supabase),[ds,tasks,campaigns]=await Promise.all([fullDeliveries(supabase),readState(supabase,TASKS_KEY),fullCampaigns(supabase)]),d=ds.find((x:any)=>String(x.id)===String(a.id))
    if(!d)throw new Error('Entrega não encontrada.')
    const t=tasks.find((x:any)=>String(x.id)===String(d.sourceTaskId)),changes:string[]=[]
    if(hasOwn(a,'titulo')){d.title=a.titulo;changes.push('título')}
    if(hasOwn(a,'mensagem')){d.note=a.mensagem;changes.push('mensagem')}
    if(hasOwn(a,'destinatario')){const ass=await resolveAssignees(supabase,[a.destinatario]);d.to=ass.names[0];changes.push('destinatário')}
    if(hasOwn(a,'campanha_id')){
      if(a.campanha_id===null){d.campaignId=null;d.campaignSource='direct'}
      else{const c=t?await exactCampaignForBrand(supabase,a.campanha_id,t.brand):exactCampaign(campaigns,a.campanha_id);d.campaignId=String(c.id);d.campaignSource='direct'}
      changes.push('campanha')
    }
    if(hasOwn(a,'proxima_tarefa_id')){if(a.proxima_tarefa_id)findTask(tasks,a.proxima_tarefa_id);d.targetTaskId=String(a.proxima_tarefa_id||'');changes.push('próxima tarefa')}
    if(hasOwn(a,'links')){d.links=(a.links||[]).map((x:any)=>({id:'l-'+crypto.randomUUID().slice(0,8),label:x.nome,url:x.url}));changes.push('links')}
    if(hasOwn(a,'arquivada')){d.archivedAt=a.arquivada?(d.archivedAt||nowIso()):null;d.archivedBy=a.arquivada?who.id:null;changes.push(a.arquivada?'arquivamento':'desarquivamento')}
    d.updatedAt=nowIso();d.events=Array.isArray(d.events)?d.events:[];d.events.push({at:d.updatedAt,by:who.nome,authorId:who.id,origin:'mcp',text:'Entrega atualizada via MCP: '+(changes.join(', ')||'sem alteração de campos')+'.'})
    if(t){
      t.deliveries=Array.isArray(t.deliveries)?t.deliveries:[]
      const embedded=t.deliveries.find((x:any)=>String(x.id||x.deliveryId)===String(d.id))
      if(embedded){embedded.text=d.title;embedded.note=d.note;embedded.to=d.to;embedded.status=fullDeliveryStatus(d.status);embedded.campaignId=hasOwn(d,'campaignId')?d.campaignId:null;embedded.targetTaskId=d.targetTaskId;embedded.links=structuredClone(d.links||[]);embedded.archivedAt=d.archivedAt||null;embedded.archivedBy=d.archivedBy||null;embedded.updatedAt=d.updatedAt}
      t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:d.updatedAt,by:who.nome,authorId:who.id,origin:'mcp',text:'Entrega atualizada via MCP: '+(changes.join(', ')||'sem alteração de campos')+'.'})
      await writeTasks(supabase,tasks)
    }
    await fullSaveDeliveries(supabase,ds);await audit(supabase,who,'atualizar_entrega','entrega',String(d.id),{tarefa_id:d.sourceTaskId||null,campos:changes,arquivada:!!d.archivedAt,campanha_id:hasOwn(d,'campaignId')?d.campaignId:null})
    return toolText({entrega:fullDelivery(d,tasks,campaigns)})
  })
  server.registerTool('aprovar_ou_reprovar_entrega',{
    description:'Aprova ou reprova entrega com comentário e sincroniza a cópia dentro da tarefa.',
    inputSchema:z.object({id:z.string(),decisao:z.enum(['aprovar','reprovar']),comentario:z.string().default('')})
  },async(a:any)=>{
    const who=await actor(supabase),ds=await fullDeliveries(supabase),d=ds.find((x:any)=>String(x.id)===String(a.id));if(!d)throw new Error('Entrega não encontrada.');if(d.archivedAt)throw new Error('A entrega está arquivada. Desarquive antes de aprovar ou reprovar.')
    d.status=a.decisao==='aprovar'?'aprovado':'ajustes';d.updatedAt=nowIso();d.events=Array.isArray(d.events)?d.events:[];d.events.push({at:d.updatedAt,by:who.nome,authorId:who.id,origin:'mcp',text:a.decisao==='aprovar'?'Entrega aprovada'+(a.comentario?': '+a.comentario:'.'):'Entrega reprovada'+(a.comentario?': '+a.comentario:'.')});if(a.decisao==='reprovar')d.adjustmentNote=a.comentario
    const tasks=await readState(supabase,TASKS_KEY),t=tasks.find((x:any)=>String(x.id)===String(d.sourceTaskId))
    if(t){
      t.deliveries=Array.isArray(t.deliveries)?t.deliveries:[]
      const embedded=t.deliveries.find((x:any)=>String(x.id||x.deliveryId)===String(d.id))
      if(embedded){embedded.status=d.status;embedded.updatedAt=d.updatedAt;embedded.adjustmentNote=d.adjustmentNote||null;embedded.events=Array.isArray(embedded.events)?embedded.events:[];embedded.events.push({at:d.updatedAt,by:who.nome,authorId:who.id,origin:'mcp',text:'Status sincronizado com a entrega oficial: '+d.status+'.'})}
      t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:d.updatedAt,by:who.nome,authorId:who.id,origin:'mcp',text:fullDeliveryDecisionText(a.decisao)+' via MCP.'});await writeTasks(supabase,tasks)
    }
    await fullSaveDeliveries(supabase,ds);await audit(supabase,who,'aprovar_ou_reprovar_entrega','entrega',d.id,{decisao:a.decisao,tarefa_id:d.sourceTaskId||null});return toolText({entrega:{id:d.id,link:fullLinks('entrega',d.id),status:d.status,comentario:a.comentario}})
  })
  server.registerTool('criar_cliente',{description:'Cria cliente: marca atendida ou cliente externo.',inputSchema:z.object({nome:z.string().min(1),tipo:z.enum(['marca','externo']),marca:z.string().nullable().optional(),contato_nome:z.string().nullable().optional(),email:z.string().email().nullable().optional(),telefone:z.string().nullable().optional(),observacoes:z.string().nullable().optional(),status:z.enum(['ativo','inativo']).default('ativo')})},async(a:any)=>{const who=await actor(supabase),b=a.marca?await fullBrand(supabase,a.marca):null;if(a.tipo==='marca'&&!b)throw new Error('tipo marca exige marca.');const{data,error}=await supabase.from('alliance_clients').insert({nome:a.nome,tipo:a.tipo,brand_id:b?.id||null,contato_nome:a.contato_nome||null,email:a.email||null,telefone:a.telefone||null,observacoes:a.observacoes||null,status:a.status,origem:'mcp',criado_por:who.id,atualizado_por:who.id}).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'criar_cliente','cliente',data.id,{});return toolText({cliente:{...data,id:String(data.id),link:fullLinks('cliente',String(data.id)),marca:b?.nome||null}})})
  server.registerTool('atualizar_cliente',{description:'Atualiza/arquiva cliente; nunca exclui.',inputSchema:z.object({id:z.string().uuid(),nome:z.string().optional(),tipo:z.enum(['marca','externo']).optional(),marca:z.string().nullable().optional(),contato_nome:z.string().nullable().optional(),email:z.string().email().nullable().optional(),telefone:z.string().nullable().optional(),observacoes:z.string().nullable().optional(),status:z.enum(['ativo','inativo']).optional(),arquivado:z.boolean().optional()})},async(a:any)=>{const who=await actor(supabase),{data:old}=await supabase.from('alliance_clients').select('*').eq('id',a.id).maybeSingle();if(!old)throw new Error('Cliente não encontrado.');const p:any={atualizado_por:who.id};for(const k of ['nome','tipo','contato_nome','email','telefone','observacoes','status'])if(a[k]!==undefined)p[k]=a[k];if(a.marca!==undefined)p.brand_id=a.marca?(await fullBrand(supabase,a.marca)).id:null;if(a.arquivado!==undefined){p.arquivado_em=a.arquivado?(old.arquivado_em||nowIso()):null;p.arquivado_por=a.arquivado?who.id:null}const{data,error}=await supabase.from('alliance_clients').update(p).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'atualizar_cliente','cliente',a.id,{arquivado:!!data.arquivado_em});return toolText({cliente:{...data,id:String(data.id),link:fullLinks('cliente',String(data.id))}})})
  server.registerTool('listar_clientes',{description:'Lista clientes.',inputSchema:z.object({tipo:z.enum(['marca','externo']).optional(),marca:z.string().optional(),status:z.enum(['ativo','inativo']).optional(),incluir_arquivados:z.boolean().default(false)}),annotations:{readOnlyHint:true}},async(a:any)=>{let q=supabase.from('alliance_clients').select('*');if(!a.incluir_arquivados)q=q.is('arquivado_em',null);if(a.tipo)q=q.eq('tipo',a.tipo);if(a.status)q=q.eq('status',a.status);if(a.marca)q=q.eq('brand_id',(await fullBrand(supabase,a.marca)).id);const{data,error}=await q.order('nome');if(error)throw new Error(error.message);return toolText({clientes:(data||[]).map((x:any)=>({...x,id:String(x.id),link:fullLinks('cliente',String(x.id))}))})})
  server.registerTool('obter_cliente',{description:'Obtém cliente e campanhas vinculadas.',inputSchema:z.object({id:z.string().uuid()}),annotations:{readOnlyHint:true}},async({id}:any)=>{const{data,error}=await supabase.from('alliance_clients').select('*').eq('id',id).maybeSingle();if(error||!data)throw new Error('Cliente não encontrado.');const cs=(await fullCampaigns(supabase)).filter((c:any)=>String(c.clientId||'')===String(id)).map(fullPublicCampaign);return toolText({cliente:{...data,id:String(data.id),link:fullLinks('cliente',String(data.id)),campanhas:cs,historico:await fullAuditHistory(supabase,'cliente',id)}})})
  server.registerTool('vincular_cliente_a_campanha',{description:'Vincula/desvincula cliente da campanha.',inputSchema:z.object({cliente_id:z.string().uuid().nullable(),campanha_id:z.string()})},async(a:any)=>{const who=await actor(supabase),cs=await fullCampaigns(supabase),c=fullCampaign(cs,a.campanha_id);if(a.cliente_id){const{data}=await supabase.from('alliance_clients').select('id').eq('id',a.cliente_id).is('arquivado_em',null).maybeSingle();if(!data)throw new Error('Cliente não encontrado.')}c.clientId=a.cliente_id;fullHistory(c,'Cliente vinculado/desvinculado via MCP.',who);await fullSaveCampaigns(supabase,cs);await audit(supabase,who,'vincular_cliente_a_campanha','campanha',c.id,{cliente_id:a.cliente_id});return toolText({campanha:fullPublicCampaign(c)})})

  server.registerTool('listar_automacoes',{description:'Lista automações.',inputSchema:z.object({marca:z.string().optional(),canal:z.enum(['WhatsApp','e-mail','API']).optional(),status:z.enum(['ativa','pausada']).optional(),incluir_arquivadas:z.boolean().default(false)}),annotations:{readOnlyHint:true}},async(a:any)=>{let q=supabase.from('alliance_automations').select('*');if(!a.incluir_arquivadas)q=q.is('arquivado_em',null);if(a.marca)q=q.eq('brand_id',(await fullBrand(supabase,a.marca)).id);if(a.canal)q=q.eq('canal',a.canal);if(a.status)q=q.eq('status',a.status);const{data,error}=await q.order('nome');if(error)throw new Error(error.message);return toolText({automacoes:(data||[]).map((x:any)=>({...x,id:String(x.id),link:fullLinks('automacao',String(x.id))}))})})
  server.registerTool('obter_automacao',{description:'Obtém automação.',inputSchema:z.object({id:z.string().uuid()}),annotations:{readOnlyHint:true}},async({id}:any)=>{const{data,error}=await supabase.from('alliance_automations').select('*').eq('id',id).maybeSingle();if(error||!data)throw new Error('Automação não encontrada.');return toolText({automacao:{...data,id:String(data.id),link:fullLinks('automacao',String(data.id)),historico:await fullAuditHistory(supabase,'automacao',id)}})})
  server.registerTool('criar_automacao',{description:'Cria automação.',inputSchema:z.object({nome:z.string(),marca:z.string(),gatilho:z.record(z.string(),z.any()).default({}),acao:z.record(z.string(),z.any()).default({}),canal:z.enum(['WhatsApp','e-mail','API']),status:z.enum(['ativa','pausada']).default('pausada'),ultima_execucao:dt.nullable().optional()})},async(a:any)=>{const who=await actor(supabase),b=await fullBrand(supabase,a.marca),{data,error}=await supabase.from('alliance_automations').insert({nome:a.nome,brand_id:b.id,gatilho:a.gatilho,acao:a.acao,canal:a.canal,status:a.status,ultima_execucao:a.ultima_execucao||null,origem:'mcp',criado_por:who.id,atualizado_por:who.id}).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'criar_automacao','automacao',data.id,{});return toolText({automacao:{...data,id:String(data.id),link:fullLinks('automacao',String(data.id))}})})
  server.registerTool('atualizar_automacao',{description:'Atualiza/arquiva automação.',inputSchema:z.object({id:z.string().uuid(),nome:z.string().optional(),marca:z.string().optional(),gatilho:z.record(z.string(),z.any()).optional(),acao:z.record(z.string(),z.any()).optional(),canal:z.enum(['WhatsApp','e-mail','API']).optional(),status:z.enum(['ativa','pausada']).optional(),ultima_execucao:dt.nullable().optional(),arquivada:z.boolean().optional()})},async(a:any)=>{const who=await actor(supabase),{data:old}=await supabase.from('alliance_automations').select('*').eq('id',a.id).maybeSingle();if(!old)throw new Error('Automação não encontrada.');const p:any={atualizado_por:who.id};for(const k of ['nome','gatilho','acao','canal','status','ultima_execucao'])if(a[k]!==undefined)p[k]=a[k];if(a.marca)p.brand_id=(await fullBrand(supabase,a.marca)).id;if(a.arquivada!==undefined){p.arquivado_em=a.arquivada?(old.arquivado_em||nowIso()):null;p.arquivado_por=a.arquivada?who.id:null}const{data,error}=await supabase.from('alliance_automations').update(p).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'atualizar_automacao','automacao',a.id,{});return toolText({automacao:{...data,id:String(data.id),link:fullLinks('automacao',String(data.id))}})})
  server.registerTool('ativar_ou_pausar_automacao',{description:'Ativa ou pausa automação.',inputSchema:z.object({id:z.string().uuid(),status:z.enum(['ativa','pausada'])})},async(a:any)=>{const who=await actor(supabase),{data,error}=await supabase.from('alliance_automations').update({status:a.status,atualizado_por:who.id}).eq('id',a.id).is('arquivado_em',null).select('*').maybeSingle();if(error||!data)throw new Error('Automação não encontrada.');await audit(supabase,who,'ativar_ou_pausar_automacao','automacao',a.id,{status:a.status});return toolText({automacao:{id:String(data.id),link:fullLinks('automacao',String(data.id)),status:data.status}})})

  server.registerTool('registrar_resultado',{
    description:'Registra faturamento/investimento realizado com fonte de receita e/ou canal de execução. Resultados arquivados nunca são reaproveitados.',
    inputSchema:z.object({campanha_id:z.string(),fonte_receita:z.string().optional(),canal:z.string().optional(),data:dt,faturamento:z.number().min(0).default(0),investimento:z.number().min(0).default(0),observacoes:z.string().nullable().optional()}).refine(x=>!!x.fonte_receita||!!x.canal,{message:'Informe fonte_receita e/ou canal.'})
  },async(a:any)=>{
    const who=await actor(supabase),c=exactCampaign(await fullCampaigns(supabase),a.campanha_id),b=await fullBrand(supabase,c.brand),canal=a.canal?fullChannelCanon(a.canal):null,fonte=a.fonte_receita?fullRevenueSourceName(a.fonte_receita):null,at=nowIso()
    let q=supabase.from('campaign_results').select('*').eq('campaign_id',String(c.id)).eq('data',a.data).is('arquivado_em',null);q=canal?q.eq('canal',canal):q.is('canal',null);q=fonte?q.eq('fonte_receita',fonte):q.is('fonte_receita',null)
    const{data:old}=await q.maybeSingle(),event={at,by:who.nome,authorId:who.id,origin:'mcp',text:old?'Resultado atualizado por novo registro via MCP.':'Resultado registrado via MCP.'},payload:any={canal,fonte_receita:fonte,faturamento:a.faturamento,investimento:a.investimento,observacoes:a.observacoes||null,atualizado_por:who.id,origem:'mcp'};let row:any,error:any
    if(old)({data:row,error}=await supabase.from('campaign_results').update({...payload,historico:[event,...(Array.isArray(old.historico)?old.historico:[])]}).eq('id',old.id).select('*').single())
    else({data:row,error}=await supabase.from('campaign_results').insert({...payload,campaign_id:String(c.id),brand_id:b.id,data:a.data,criado_por:who.id,historico:[event]}).select('*').single())
    if(error)throw new Error(error.message);await audit(supabase,who,'registrar_resultado','resultado',row.id,{campanha_id:c.id,canal,fonte_receita:fonte});return toolText({resultado:fullResultPublic(row)})
  })
  server.registerTool('listar_resultados',{
    description:'Lista resultados com filtros e paginação. Arquivados ficam fora por padrão.',
    inputSchema:z.object({campanha_id:z.string().optional(),marca:z.string().optional(),ano:z.number().int().optional(),mes:z.number().int().min(1).max(12).optional(),canal:z.string().optional(),fonte_receita:z.string().optional(),incluir_arquivados:z.boolean().default(false),cursor:z.string().optional(),limite:z.number().int().min(1).max(200).default(50)}),annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const filter:any={incluir_arquivados:a.incluir_arquivados};if(a.campanha_id)filter.campaign_id=String(fullCampaign(await fullCampaigns(supabase),a.campanha_id).id);if(a.marca)filter.brand_id=(await fullBrand(supabase,a.marca)).id;if(a.canal)filter.canal=fullChannelCanon(a.canal);if(a.fonte_receita)filter.fonte_receita=fullRevenueSourceName(a.fonte_receita)
    if(a.ano&&a.mes){const mm=String(a.mes).padStart(2,'0'),last=new Date(Date.UTC(a.ano,a.mes,0)).getUTCDate();filter.inicio=a.ano+'-'+mm+'-01T00:00:00-03:00';filter.fim=a.ano+'-'+mm+'-'+String(last).padStart(2,'0')+'T23:59:59-03:00'}
    const rows=await fullResults(supabase,filter),page=fullPage(rows,a.cursor,a.limite);return toolText({total:page.total,cursor:a.cursor||null,proximo_cursor:page.proximo_cursor,resultados:page.items.map(fullResultPublic)})
  })
  server.registerTool('atualizar_resultado',{
    description:'Corrige resultado ou arquiva/desarquiva sem excluir. Registra autor, data e alteração no histórico.',
    inputSchema:z.object({id:z.string().uuid(),data:dt.optional(),canal:z.string().nullable().optional(),fonte_receita:z.string().nullable().optional(),faturamento:z.number().min(0).optional(),investimento:z.number().min(0).optional(),observacoes:z.string().nullable().optional(),arquivado:z.boolean().optional()})
  },async(a:any)=>{
    const who=await actor(supabase),{data:old,error:e}=await supabase.from('campaign_results').select('*').eq('id',a.id).maybeSingle();if(e||!old)throw new Error('Resultado não encontrado.')
    const patch:any={atualizado_por:who.id},changes:string[]=[];if(hasOwn(a,'data')){patch.data=a.data;changes.push('data')}if(hasOwn(a,'canal')){patch.canal=a.canal===null?null:fullChannelCanon(a.canal);changes.push('canal')}if(hasOwn(a,'fonte_receita')){patch.fonte_receita=a.fonte_receita===null?null:fullRevenueSourceName(a.fonte_receita);changes.push('fonte_receita')}if(hasOwn(a,'faturamento')){patch.faturamento=a.faturamento;changes.push('faturamento')}if(hasOwn(a,'investimento')){patch.investimento=a.investimento;changes.push('investimento')}if(hasOwn(a,'observacoes')){patch.observacoes=a.observacoes;changes.push('observacoes')}
    const finalCanal=hasOwn(a,'canal')?patch.canal:old.canal,finalFonte=hasOwn(a,'fonte_receita')?patch.fonte_receita:old.fonte_receita;if(!finalCanal&&!finalFonte)throw new Error('O resultado precisa manter fonte_receita e/ou canal.')
    if(hasOwn(a,'arquivado')){patch.arquivado_em=a.arquivado?(old.arquivado_em||nowIso()):null;patch.arquivado_por=a.arquivado?who.id:null;changes.push(a.arquivado?'arquivado':'desarquivado')}
    const event={at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Resultado '+(changes.length?changes.join(', '):'revisado')+' via MCP.'};patch.historico=[event,...(Array.isArray(old.historico)?old.historico:[])]
    const{data,error}=await supabase.from('campaign_results').update(patch).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'atualizar_resultado','resultado',a.id,{campos:changes,arquivado:!!data.arquivado_em});return toolText({resultado:fullResultPublic(data)})
  })
  server.registerTool('obter_resultado_campanha',{
    description:'Obtém planejado versus realizado por fonte de receita, mantendo canal como dimensão de execução.',
    inputSchema:z.object({campanha_id:z.string(),inicio:dt.optional(),fim:dt.optional(),incluir_arquivados:z.boolean().default(false)}),annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const c=fullCampaign(await fullCampaigns(supabase),a.campanha_id),rows=await fullResults(supabase,{campaign_id:String(c.id),inicio:a.inicio,fim:a.fim,incluir_arquivados:a.incluir_arquivados}),agg=fullAgg(rows),plans=fullLegacyTap(c).metas_por_fonte||[]
    const names=[...new Set([...plans.map((x:any)=>x.fonte),...agg.por_fonte.map((x:any)=>x.fonte_receita)])]
    const sources=names.map((fonte:any)=>{const p=plans.find((x:any)=>norm(x.fonte)===norm(fonte))||{},rr=agg.por_fonte.find((x:any)=>norm(x.fonte_receita)===norm(fonte))||{};return{fonte_receita:fonte,meta:Number(p.meta_faturamento||0),realizado:Number(rr.faturamento||0),diferenca:Number(rr.faturamento||0)-Number(p.meta_faturamento||0),investimento_previsto:Number(p.investimento||0),investimento_realizado:Number(rr.investimento||0),roas_previsto:p.roas_alvo??(Number(p.investimento)?Number(p.meta_faturamento)/Number(p.investimento):null),roas_realizado:rr.roas??null}})
    return toolText({campanha:fullPublicCampaign(c),planejado:{meta:fullGoal(c),investimento:fullInvestment(c),roas:fullInvestment(c)?fullGoal(c)/fullInvestment(c):null},realizado:agg,diferenca_faturamento:agg.faturamento-fullGoal(c),por_fonte:sources,por_canal_realizado:agg.por_canal})
  })
  server.registerTool('obter_resultado_mes',{description:'Obtém resultado consolidado do mês. Arquivados ficam fora por padrão.',inputSchema:z.object({marca:z.string(),ano:z.number().int(),mes:z.number().int().min(1).max(12),incluir_arquivados:z.boolean().default(false)}),annotations:{readOnlyHint:true}},async(a:any)=>{const b=await fullBrand(supabase,a.marca),ref=a.ano+'-'+String(a.mes).padStart(2,'0'),cs=(await fullCampaigns(supabase)).filter((c:any)=>!c.archivedAt&&norm(c.brand)===norm(b.nome)&&fullMonthRef(c)===ref),ids=new Set(cs.map((c:any)=>String(c.id))),rows=(await fullResults(supabase,{brand_id:b.id,incluir_arquivados:a.incluir_arquivados})).filter((r:any)=>ids.has(String(r.campaign_id))),agg=fullAgg(rows),meta=cs.reduce((n:number,c:any)=>n+fullGoal(c),0),inv=cs.reduce((n:number,c:any)=>n+fullInvestment(c),0);return toolText({marca:b.nome,ano:a.ano,mes:a.mes,planejado:{meta,investimento:inv,roas:inv?meta/inv:null},realizado:agg,diferenca_faturamento:agg.faturamento-meta})})
  server.registerTool('comparar_planejado_realizado',{
    description:'Compara planejado/realizado por marca, mês, campanha, fonte de receita ou canal de execução.',
    inputSchema:z.object({marca:z.string().optional(),ano:z.number().int().optional(),mes:z.number().int().min(1).max(12).optional(),campanha_id:z.string().optional(),fonte_receita:z.string().optional(),canal:z.string().optional(),incluir_arquivados:z.boolean().default(false)}).refine(x=>!(x.fonte_receita&&x.canal),{message:'Filtre por fonte_receita ou canal, não pelos dois.'}),annotations:{readOnlyHint:true}
  },async(a:any)=>{
    let cs=await fullCampaigns(supabase);if(a.marca){const b=await fullBrand(supabase,a.marca);cs=cs.filter((c:any)=>norm(c.brand)===norm(b.nome))}if(a.ano&&a.mes){const ref=a.ano+'-'+String(a.mes).padStart(2,'0');cs=cs.filter((c:any)=>fullMonthRef(c)===ref)}if(a.campanha_id)cs=[fullCampaign(cs,a.campanha_id)]
    const out=[] as any[]
    for(const c of cs.filter((x:any)=>!x.archivedAt)){
      const fonte=a.fonte_receita?fullRevenueSourceName(a.fonte_receita):null,canal=a.canal?fullChannelCanon(a.canal):null,rows=await fullResults(supabase,{campaign_id:String(c.id),fonte_receita:fonte,canal,incluir_arquivados:a.incluir_arquivados}),agg=fullAgg(rows)
      if(fonte){const p=(fullLegacyTap(c).metas_por_fonte||[]).find((x:any)=>norm(x.fonte)===norm(fonte))||{};out.push({campanha_id:c.id,campanha:c.name,fonte_receita:fonte,meta:Number(p.meta_faturamento||0),realizado:agg.faturamento,diferenca:agg.faturamento-Number(p.meta_faturamento||0),investimento_previsto:Number(p.investimento||0),investimento_realizado:agg.investimento,roas_previsto:p.roas_alvo??(Number(p.investimento)?Number(p.meta_faturamento)/Number(p.investimento):null),roas_realizado:agg.roas})}
      else if(canal)out.push({campanha_id:c.id,campanha:c.name,canal,realizado:agg.faturamento,investimento_realizado:agg.investimento,roas_realizado:agg.roas,observacao:'Planejamento financeiro é por fonte de receita; canal é dimensão de execução.'})
      else out.push({campanha_id:c.id,campanha:c.name,marca:c.brand,meta:fullGoal(c),realizado:agg.faturamento,diferenca:agg.faturamento-fullGoal(c),investimento_previsto:fullInvestment(c),investimento_realizado:agg.investimento,roas_previsto:fullInvestment(c)?fullGoal(c)/fullInvestment(c):null,roas_realizado:agg.roas})
    }
    return toolText({comparacao:out})
  })
  server.registerTool('criar_tag',{description:'Cria tag para tarefas/campanhas.',inputSchema:z.object({nome:z.string().min(1),marca:z.string().nullable().optional(),cor:z.string().nullable().optional()})},async(a:any)=>{const who=await actor(supabase),b=a.marca?await fullBrand(supabase,a.marca):null,{data,error}=await supabase.from('alliance_tags').insert({brand_id:b?.id||null,nome:a.nome,cor:a.cor||null,origem:'mcp',criado_por:who.id,atualizado_por:who.id}).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'criar_tag','tag',data.id,{});return toolText({tag:{id:String(data.id),link:APP_URL+'/#tasks',nome:data.nome,cor:data.cor,marca:b?.nome||null}})})
  server.registerTool('listar_tags',{description:'Lista tags.',inputSchema:z.object({marca:z.string().optional(),incluir_globais:z.boolean().default(true),incluir_arquivadas:z.boolean().default(false)}),annotations:{readOnlyHint:true}},async(a:any)=>{let q=supabase.from('alliance_tags').select('*');if(!a.incluir_arquivadas)q=q.is('arquivado_em',null);if(a.marca){const b=await fullBrand(supabase,a.marca);q=a.incluir_globais?q.or('brand_id.eq.'+b.id+',brand_id.is.null'):q.eq('brand_id',b.id)}const{data,error}=await q.order('nome');if(error)throw new Error(error.message);return toolText({tags:(data||[]).map((x:any)=>({id:String(x.id),nome:x.nome,cor:x.cor,marca_id:x.brand_id,arquivada:!!x.arquivado_em}))})})
  server.registerTool('atualizar_tag',{description:'Atualiza, arquiva ou desarquiva tag; nunca exclui.',inputSchema:z.object({id:z.string().uuid(),nome:z.string().min(1).optional(),cor:z.string().nullable().optional(),marca:z.string().nullable().optional(),arquivada:z.boolean().optional()})},async(a:any)=>{const who=await actor(supabase),{data:old}=await supabase.from('alliance_tags').select('*').eq('id',a.id).maybeSingle();if(!old)throw new Error('Tag não encontrada.');const p:any={atualizado_por:who.id};if(a.nome!==undefined)p.nome=a.nome;if(a.cor!==undefined)p.cor=a.cor;if(a.marca!==undefined)p.brand_id=a.marca?(await fullBrand(supabase,a.marca)).id:null;if(a.arquivada!==undefined){p.arquivado_em=a.arquivada?(old.arquivado_em||nowIso()):null;p.arquivado_por=a.arquivada?who.id:null}const{data,error}=await supabase.from('alliance_tags').update(p).eq('id',a.id).select('*').single();if(error)throw new Error(error.message);await audit(supabase,who,'atualizar_tag','tag',a.id,{arquivada:!!data.arquivado_em});return toolText({tag:{id:String(data.id),link:APP_URL+'/#tasks',nome:data.nome,cor:data.cor,marca_id:data.brand_id,arquivada:!!data.arquivado_em,historico:await fullAuditHistory(supabase,'tag',a.id)}})})
  server.registerTool('marcar_tag',{description:'Marca tag em tarefa ou campanha.',inputSchema:z.object({tag:z.string(),tipo:z.enum(['tarefa','campanha']),registro_id:z.string()})},async(a:any)=>{const who=await actor(supabase),tag=await fullTag(supabase,a.tag),obj={id:String(tag.id),nome:tag.nome,cor:tag.cor||null};if(a.tipo==='tarefa'){const ts=await readState(supabase,TASKS_KEY),t=findTask(ts,a.registro_id);t.tags=Array.isArray(t.tags)?t.tags:[];if(!t.tags.some((x:any)=>String(x?.id||x)===String(tag.id)))t.tags.push(obj);t.history=t.history||[];t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Tag '+tag.nome+' adicionada via MCP por '+who.nome+'.'});await writeTasks(supabase,ts);await audit(supabase,who,'marcar_tag','tarefa',t.id,{tag_id:tag.id});return toolText({tarefa:publicTask(t)})}const cs=await fullCampaigns(supabase),c=fullCampaign(cs,a.registro_id);c.tags=Array.isArray(c.tags)?c.tags:[];if(!c.tags.some((x:any)=>String(x?.id||x)===String(tag.id)))c.tags.push(obj);fullHistory(c,'Tag '+tag.nome+' adicionada via MCP.',who);await fullSaveCampaigns(supabase,cs);await audit(supabase,who,'marcar_tag','campanha',c.id,{tag_id:tag.id});return toolText({campanha:fullPublicCampaign(c)})})
  server.registerTool('desmarcar_tag',{description:'Desmarca tag sem excluir a tag.',inputSchema:z.object({tag:z.string(),tipo:z.enum(['tarefa','campanha']),registro_id:z.string()})},async(a:any)=>{const who=await actor(supabase),tag=await fullTag(supabase,a.tag),keep=(x:any)=>String(x?.id||x)!==String(tag.id)&&norm(x?.nome||x)!==norm(tag.nome);if(a.tipo==='tarefa'){const ts=await readState(supabase,TASKS_KEY),t=findTask(ts,a.registro_id);t.tags=(t.tags||[]).filter(keep);await writeTasks(supabase,ts);await audit(supabase,who,'desmarcar_tag','tarefa',t.id,{tag_id:tag.id});return toolText({tarefa:publicTask(t)})}const cs=await fullCampaigns(supabase),c=fullCampaign(cs,a.registro_id);c.tags=(c.tags||[]).filter(keep);await fullSaveCampaigns(supabase,cs);await audit(supabase,who,'desmarcar_tag','campanha',c.id,{tag_id:tag.id});return toolText({campanha:fullPublicCampaign(c)})})

  const batchTask=z.object({id_temporario:z.string().min(1).optional(),nome:z.string().min(1),descricao_markdown:z.string().default(''),lista:z.string(),campanha_id:z.string().nullable().optional(),responsaveis:z.array(z.string()).default([]),prazo:dt.optional(),prioridade:z.string().default('normal'),status:z.string().default('a fazer'),motivo_bloqueio:z.string().nullable().optional(),tarefa_mae:z.string().nullable().optional(),dependencias:z.array(z.string()).default([]),checklist:z.array(z.string()).default([]),checklist_obrigatoria:z.boolean().default(false),entrega_obrigatoria:z.boolean().default(false),canal:z.string().nullable().optional(),recorrencia:recurrenceSchema})
  server.registerTool('criar_tarefas_em_lote',{
    description:'Cria até 200 tarefas. tarefa_mae/dependencias podem usar id_temporario ou nome único de outra tarefa do mesmo lote.',
    inputSchema:z.object({tarefas:z.array(batchTask).min(1).max(200)})
  },async(a:any)=>{
    const who=await actor(supabase),ts=await readState(supabase,TASKS_KEY),created:any[]=[],meta:any[]=[]
    const inputs=(a.tarefas||[]).map((raw:any)=>cloneBatchItem(raw))
    for(let i=0;i<inputs.length;i++){
      const x=inputs[i],l=await resolveList(supabase,x.lista),ass=await resolveAssignees(supabase,x.responsaveis),st=statusCanon(x.status)||'a fazer'
      if(st==='bloqueado'&&!String(x.motivo_bloqueio||'').trim())throw new Error('bloqueado exige motivo.')
      let campaignId:any=l.campanha_id||null,campaignSource='list'
      if(hasOwn(x,'campanha_id')){campaignId=x.campanha_id===null?null:String((await exactCampaignForBrand(supabase,x.campanha_id,l.marca)).id);campaignSource='direct'}
      const id='mcp-'+Date.now()+'-'+i+'-'+crypto.randomUUID().slice(0,5)
      const t:any={id,title:x.nome,description:x.descricao_markdown,status:st,blockedReason:st==='bloqueado'?String(x.motivo_bloqueio||'').trim():null,assignees:[...(ass?.names||[])],assigneeIds:[...(ass?.ids||[])],due:x.prazo?String(x.prazo).slice(0,10):null,dueAt:x.prazo||null,start:null,brand:l.marca,project:l.nome,listId:l.id,campaignId,campaignSource,channel:x.canal?fullChannelCanon(x.canal):null,priority:priorityCanon(x.prioridade)||'normal',checklist:(x.checklist||[]).map((v:string)=>({id:'check-'+crypto.randomUUID().slice(0,7),text:v,done:false})),conferenceRequired:!!x.checklist_obrigatoria,subtasks:[],attachments:[],comments:[],history:[{at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Tarefa criada em lote via MCP por '+who.nome+'.'}],recurrence:'none',recurrenceRule:{tipo:'nenhuma',dias_semana:[]},tags:[],source:'allianceos-mcp',dependencies:[],parentTaskId:null,deliveries:[],deliveryRequired:!!x.entrega_obrigatoria,archivedAt:null,archivedBy:null}
      applyRecurrence(t,x.recorrencia);created.push(t);meta.push({input:x,task:t,index:i});ts.unshift(t)
    }
    const temp=new Map<string,any>(),names=new Map<string,any[]>()
    for(const m of meta){if(m.input.id_temporario){if(temp.has(String(m.input.id_temporario)))throw new Error('id_temporario duplicado: '+m.input.id_temporario);temp.set(String(m.input.id_temporario),m.task)}const k=norm(m.task.title);names.set(k,[...(names.get(k)||[]),m.task])}
    const resolveRef=(ref:any)=>{
      const key=String(ref||'');if(temp.has(key))return temp.get(key)
      const byName=names.get(norm(key))||[];if(byName.length===1)return byName[0];if(byName.length>1)throw new Error('Nome ambíguo dentro do lote: '+key+'. Use id_temporario.')
      return findTask(ts,key)
    }
    for(const m of meta){
      const x=m.input,t=m.task
      if(x.tarefa_mae){const p=resolveRef(x.tarefa_mae);if(String(p.id)===String(t.id))throw new Error('Uma tarefa não pode ser mãe de si mesma.');t.parentTaskId=String(p.id)}
      t.dependencies=(x.dependencias||[]).map((ref:string)=>String(resolveRef(ref).id))
      if(t.dependencies.includes(String(t.id)))throw new Error('Uma tarefa não pode depender de si mesma.')
    }
    for(const t of created)for(const d of t.dependencies||[])if(hasDependencyPath(ts,String(d),String(t.id)))throw new Error('O lote criaria um ciclo de dependências envolvendo "'+t.title+'".')
    await writeTasks(supabase,ts)
    for(const t of created)await notifyUsers(supabase,who,t.assigneeIds||[],'task_assigned','Nova tarefa atribuída',t.title,String(t.id),'assigned:'+String(t.id))
    await audit(supabase,who,'criar_tarefas_em_lote','tarefa_lote','batch-'+Date.now(),{quantidade:created.length})
    return toolText({quantidade:created.length,tarefas:created.map(publicTask)})
  })
  server.registerTool('atualizar_tarefas_em_lote',{
    description:'Atualiza até 200 tarefas. Cada item altera somente campos presentes nele; nenhum valor é herdado entre itens.',
    inputSchema:z.object({tarefas:z.array(z.object({id:z.string(),nome:z.string().optional(),descricao_markdown:z.string().optional(),responsaveis:z.array(z.string()).optional(),prazo:dt.nullable().optional(),status:z.string().optional(),motivo_bloqueio:z.string().nullable().optional(),prioridade:z.string().optional(),canal:z.string().nullable().optional(),lista:z.string().optional(),campanha_id:z.string().nullable().optional(),tarefa_mae:z.string().nullable().optional(),dependencias:z.array(z.string()).optional(),checklist:z.array(z.string()).optional(),tags:z.array(z.any()).optional(),entrega_obrigatoria:z.boolean().optional(),arquivada:z.boolean().optional()})).min(1).max(200)})
  },async(a:any)=>{
    const who=await actor(supabase),ts=await readState(supabase,TASKS_KEY),out:any[]=[]
    for(const raw of a.tarefas){
      const x=cloneBatchItem(raw),t=findTask(ts,x.id),oldListId=t.listId,oldList=oldListId?await resolveList(supabase,String(oldListId),true):null
      if(hasOwn(x,'nome'))t.title=String(x.nome).trim()
      if(hasOwn(x,'descricao_markdown'))t.description=x.descricao_markdown
      if(hasOwn(x,'responsaveis')){const rr=await resolveAssignees(supabase,x.responsaveis);t.assignees=[...(rr?.names||[])];t.assigneeIds=[...(rr?.ids||[])]}
      if(hasOwn(x,'prazo')){t.dueAt=x.prazo;t.due=x.prazo?String(x.prazo).slice(0,10):null}
      if(hasOwn(x,'prioridade'))t.priority=priorityCanon(x.prioridade)
      if(hasOwn(x,'canal'))t.channel=x.canal===null?null:fullChannelCanon(x.canal)
      if(hasOwn(x,'lista')){const l=await resolveList(supabase,x.lista);t.brand=l.marca;t.project=l.nome;t.listId=l.id;if(!hasOwn(x,'campanha_id')&&!taskCampaignIsDirect(t,oldList?.campanha_id)){t.campaignId=l.campanha_id||null;t.campaignSource='list'}}
      if(hasOwn(x,'campanha_id')){if(x.campanha_id===null){t.campaignId=null;t.campaignSource='direct'}else{const c=await exactCampaignForBrand(supabase,x.campanha_id,t.brand);t.campaignId=String(c.id);t.campaignSource='direct'}}
      if(hasOwn(x,'tarefa_mae')){if(x.tarefa_mae!==null){if(String(x.tarefa_mae)===String(t.id))throw new Error('Uma tarefa não pode ser mãe de si mesma.');findTask(ts,x.tarefa_mae)}t.parentTaskId=x.tarefa_mae}
      if(hasOwn(x,'dependencias')){for(const d of x.dependencias||[])findTask(ts,d);t.dependencies=[...(x.dependencias||[])]}
      if(hasOwn(x,'checklist'))t.checklist=(x.checklist||[]).map((v:any)=>typeof v==='string'?{id:'check-'+crypto.randomUUID().slice(0,7),text:v,done:false}:structuredClone(v))
      if(hasOwn(x,'tags'))t.tags=structuredClone(x.tags||[])
      if(hasOwn(x,'entrega_obrigatoria'))t.deliveryRequired=!!x.entrega_obrigatoria
      if(hasOwn(x,'status')){const st=statusCanon(x.status),reason=hasOwn(x,'motivo_bloqueio')?x.motivo_bloqueio:t.blockedReason;if(st==='bloqueado'&&!String(reason||'').trim())throw new Error('bloqueado exige motivo.');if(st==='feito'){const p=await fullCompletion(supabase,t,ts,false);if(p)throw new Error(t.title+': '+p)}t.status=st;t.blockedReason=st==='bloqueado'?String(reason):null}
      else if(hasOwn(x,'motivo_bloqueio'))t.blockedReason=x.motivo_bloqueio
      if(hasOwn(x,'arquivada')){t.archivedAt=x.arquivada?(t.archivedAt||nowIso()):null;t.archivedBy=x.arquivada?who.id:null}
      t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Tarefa atualizada em lote via MCP por '+who.nome+'.'});out.push(publicTask(t))
    }
    await writeTasks(supabase,ts);await audit(supabase,who,'atualizar_tarefas_em_lote','tarefa_lote','batch-'+Date.now(),{quantidade:out.length});return toolText({quantidade:out.length,tarefas:out})
  })
  server.registerTool('busca_global',{
    description:'Busca por texto em tarefas, campanhas, listas e entregas, incluindo tags, anexos e observações do TAP.',
    inputSchema:z.object({texto:z.string().min(2),limite_por_tipo:z.number().int().min(1).max(100).default(20)}),annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const n=norm(a.texto),[ts,cs,ls,ds]=await Promise.all([readState(supabase,TASKS_KEY),fullCampaigns(supabase),buildLists(supabase,true),fullDeliveries(supabase)]),has=(v:any)=>norm(v).includes(n),lim=a.limite_por_tipo
    return toolText({
      tarefas:ts.filter((t:any)=>[t.title,t.description,t.project,t.brand,t.channel,...(t.assignees||[]),...fullSearchValues(t.tags),...fullSearchValues(t.attachments),...fullSearchValues(t.comments)].some(has)).slice(0,lim).map(publicTask),
      campanhas:cs.filter((c:any)=>[c.name,c.brand,c.type,c.status,c.objective,c.offer,...fullSearchValues(c.tags),...fullSearchValues(fullLegacyTap(c)?.sobre_evento?.observacoes),...fullSearchValues(fullLegacyTap(c)?.legacy_sections)].some(has)).slice(0,lim).map(fullPublicCampaign),
      listas:ls.filter((l:any)=>[l.nome,l.marca].some(has)).slice(0,lim),
      entregas:ds.filter((d:any)=>[d.title,d.taskTitle,d.note,d.from,d.to,d.brand,d.project,...fullSearchValues(d.files),...fullSearchValues(d.links),...fullSearchValues(d.events)].some(has)).slice(0,lim).map((d:any)=>({id:String(d.id),link:fullLinks('entrega',String(d.id)),titulo:d.title||d.taskTitle,status:d.status}))
    })
  })
  server.registerTool('auditar_vinculos_campanha',{
    description:'Lista vínculos de campanha inválidos em listas, tarefas, nós, entregas e resultados sem alterar ou apagar dados.',
    inputSchema:z.object({}),annotations:{readOnlyHint:true}
  },async()=>{
    const[camps,lists,tasks,deliveries,resultsQuery]=await Promise.all([fullCampaigns(supabase),buildLists(supabase,true),readState(supabase,TASKS_KEY),fullDeliveries(supabase),supabase.from('campaign_results').select('id,campaign_id,data,canal,fonte_receita')]),ids=new Set(camps.map((c:any)=>String(c.id))),byTask=new Map(tasks.map((t:any)=>[String(t.id),t]))
    const invalidLists=lists.filter((l:any)=>l.campanha_id&&!ids.has(String(l.campanha_id))).map((l:any)=>({id:l.id,nome:l.nome,campanha_id:l.campanha_id}))
    const invalidTasks=tasks.filter((t:any)=>t.campaignId&&!ids.has(String(t.campaignId))).map((t:any)=>({id:String(t.id),nome:t.title,campanha_id:t.campaignId,lista_id:t.listId||null}))
    const{data:nodes,error}=await supabase.from('planning_map_nodes').select('id,map_id,node_key,texto,campaign_id').not('campaign_id','is',null);if(error)throw new Error(error.message)
    if(resultsQuery.error)throw new Error(resultsQuery.error.message)
    const invalidNodes=(nodes||[]).filter((x:any)=>!ids.has(String(x.campaign_id))).map((x:any)=>({id:String(x.id),mapa_id:String(x.map_id),chave:x.node_key,texto:x.texto,campanha_id:x.campaign_id}))
    const invalidDeliveries=deliveries.map((d:any)=>{const t=byTask.get(String(d.sourceTaskId)),cid=hasOwn(d,'campaignId')?d.campaignId:(hasOwn(d,'campanha_id')?d.campanha_id:(t?.campaignId||null));return{id:String(d.id),titulo:d.title||d.taskTitle||'Entrega',tarefa_id:d.sourceTaskId||null,campanha_id:cid}}).filter((d:any)=>d.campanha_id&&!ids.has(String(d.campanha_id)))
    const invalidResults=(resultsQuery.data||[]).filter((r:any)=>r.campaign_id&&!ids.has(String(r.campaign_id))).map((r:any)=>({id:String(r.id),campanha_id:r.campaign_id,data:r.data,canal:r.canal||null,fonte_receita:r.fonte_receita||null}))
    return toolText({listas_invalidas:invalidLists,tarefas_invalidas:invalidTasks,nos_invalidos:invalidNodes,entregas_invalidas:invalidDeliveries,resultados_invalidos:invalidResults})
  })
  server.registerTool('auditar_taps_legados',{
    description:'Audita TAPs/campanhas legadas: percentuais suspeitos, tipo/status, mês, SKUs, fases e responsáveis do cronograma.',
    inputSchema:z.object({}),annotations:{readOnlyHint:true}
  },async()=>{
    const cs=await fullCampaigns(supabase),suspeitos:any[]=[],legados:any[]=[],desalinhamentos:any[]=[],{data:months}=await supabase.from('planning_months').select('id,brand_id,ano,mes').is('arquivado_em',null),brands=await listBrands(supabase)
    for(const c of cs){if(Array.isArray(c.tap)&&!c.tapStructured)legados.push({campanha_id:String(c.id),campanha:c.name});for(const x of fullLegacyTap(c).aumento_ticket||[])if(typeof x.desconto==='number'&&x.desconto>100)suspeitos.push({campanha_id:String(c.id),campanha:c.name,estrategia:x.estrategia,desconto:x.desconto});const issues:string[]=[]
      try{if(c.type!==fullCampaignType(c.type))issues.push('tipo não canônico: '+String(c.type))}catch{issues.push('tipo inválido: '+String(c.type))}try{if(c.status!==fullCampaignStatus(c.status))issues.push('status não canônico: '+String(c.status))}catch{issues.push('status inválido: '+String(c.status))}
      const ref=fullMonthRef(c),brand=brands.find((b:any)=>norm(b.nome)===norm(c.brand)),expected=brand&&ref?(months||[]).find((m:any)=>String(m.brand_id)===String(brand.id)&&ref===m.ano+'-'+String(m.mes).padStart(2,'0')):null;if(expected&&String(c.monthId||'')!==String(expected.id))issues.push('mês não vinculado ao registro canônico')
      const tap=fullLegacyTap(c),missingSku=(tap.oferta?.produtos||[]).filter((p:any)=>!String(p.sku||'').trim()).length;if(missingSku)issues.push(missingSku+' produto(s) sem SKU');const legacyDates=(tap.fases||[]).filter((p:any)=>p.tem!==false&&fullMeaningfulLegacyDate(p.data_legada)&&!p.data).length;if(legacyDates)issues.push(legacyDates+' fase(s) com data legada não convertida');const rawStart=c.startAt||c.start,rawEnd=c.endAt||c.end;if(!fullHasOffsetDateTime(rawStart))issues.push('início sem hora/fuso ISO');if(!fullHasOffsetDateTime(rawEnd))issues.push('fim sem hora/fuso ISO');const unstructured=(tap.cronograma||[]).filter((x:any)=>x.quem_faz&&!(x.responsaveis||[]).length).length;if(unstructured)issues.push(unstructured+' item(ns) de cronograma sem responsáveis estruturados');if(issues.length)desalinhamentos.push({campanha_id:String(c.id),campanha:c.name,problemas:issues})
    }return toolText({taps_legados:legados,valores_suspeitos:suspeitos,desalinhamentos})
  })
  server.registerTool('exportar_mes',{
    description:'Exporta o mês paginado. Use secoes e modo resumo para evitar respostas grandes. Tarefas aparecem apenas no bloco tarefas.',
    inputSchema:z.object({marca:z.string(),ano:z.number().int(),mes:z.number().int().min(1).max(12),secoes:z.array(z.enum(['mes','campanhas','taps','listas','tarefas','entregas','resultados'])).default(['mes','campanhas','taps','listas','tarefas','entregas','resultados']),modo:z.enum(['completo','resumo']).default('completo'),cursor:z.string().optional(),limite:z.number().int().min(1).max(100).default(25),incluir_arquivados:z.boolean().default(false)}),annotations:{readOnlyHint:true}
  },async(a:any)=>{
    const b=await fullBrand(supabase,a.marca),ref=a.ano+'-'+String(a.mes).padStart(2,'0'),selected=new Set(a.secoes),offset=fullCursorOffset(a.cursor),[cs0,ts0,ls,ds,mr,rs]=await Promise.all([fullCampaigns(supabase),readState(supabase,TASKS_KEY),buildLists(supabase,true),fullDeliveries(supabase),supabase.from('planning_months').select('*').eq('brand_id',b.id).eq('ano',a.ano).eq('mes',a.mes).maybeSingle(),fullResults(supabase,{brand_id:b.id,incluir_arquivados:a.incluir_arquivados})])
    const cs=cs0.filter((c:any)=>norm(c.brand)===norm(b.nome)&&fullMonthRef(c)===ref&&(a.incluir_arquivados||!c.archivedAt)),ids=new Set(cs.map((c:any)=>String(c.id))),byList=new Map(ls.map((l:any)=>[String(l.id),l])),brandTasks=ts0.filter((t:any)=>norm(t.brand)===norm(b.nome)&&(a.incluir_arquivados||!t.archivedAt)),monthTasks=brandTasks.filter((t:any)=>ids.has(String(taskCampaignFromLists(t,byList)||''))||taskMonthRef(t,byList)===ref),taskIds=new Set(monthTasks.map((t:any)=>String(t.id))),relevantListIds=new Set(monthTasks.map((t:any)=>String(t.listId||'')).filter(Boolean)),monthLists=ls.filter((l:any)=>norm(l.marca)===norm(b.nome)&&(ids.has(String(l.campanha_id||''))||relevantListIds.has(String(l.id))||String(l.criado_em||'').slice(0,7)===ref)&&(a.incluir_arquivados||!l.arquivada)),deliveries=ds.filter((d:any)=>taskIds.has(String(d.sourceTaskId))||taskIds.has(String(d.targetTaskId))),results=rs.filter((r:any)=>ids.has(String(r.campaign_id)))
    const out:any={versao:3,gerado_em:nowIso(),marca:b.nome,ano:a.ano,mes:a.mes,modo:a.modo,secoes:a.secoes,paginacao:{cursor:a.cursor||null,limite:a.limite,offset,proximo_cursor:null,totais:{}}};let maxTotal=0
    const addPage=(key:string,rows:any[],map:(x:any)=>any=x=>x)=>{out.paginacao.totais[key]=rows.length;maxTotal=Math.max(maxTotal,rows.length);if(selected.has(key as any))out[key]=rows.slice(offset,offset+a.limite).map(map)}
    if(selected.has('mes'))out.mes=mr.data?await fullMonthPayload(supabase,mr.data):null;addPage('campanhas',cs,fullPublicCampaign);addPage('taps',cs,(c:any)=>({campanha_id:String(c.id),campanha:c.name,tap:fullTapForMode(c,a.modo),avisos:fullCampaignWarnings(c)}));addPage('listas',monthLists);addPage('tarefas',monthTasks,(t:any)=>{const cid=taskCampaignFromLists(t,byList);return a.modo==='resumo'?fullTaskSummary(t,cid):({...publicTask(t),campanha_id:cid})});addPage('entregas',deliveries,(d:any)=>fullDelivery(d,monthTasks,cs));addPage('resultados',results,fullResultPublic);if(offset+a.limite<maxTotal){out.paginacao.proximo_cursor=fullCursor(offset+a.limite);out.paginacao.restantes=Math.max(0,maxTotal-(offset+a.limite));out.paginacao.instrucao='Há mais itens. Chame exportar_mes novamente com cursor="'+out.paginacao.proximo_cursor+'" e os mesmos modo/secoes/limite.'}else{out.paginacao.restantes=0;out.paginacao.instrucao='Fim da exportação: não há próxima página.'}return toolText(out)
  })
}


function assertAdvertisedToolSchemas(server:any){
  const requireFields=(name:string,fields:string[])=>{
    const schema=server.toolInputSchemaJson(name)
    if(!schema)throw new Error('Ferramenta não anunciada em tools/list: '+name)
    const props=(schema as any).properties||{}
    const missing=fields.filter(f=>!Object.prototype.hasOwnProperty.call(props,f))
    if(missing.length)throw new Error('Schema MCP desatualizado em '+name+': faltam '+missing.join(', '))
  }
  requireFields('listar_resultados',['cursor','limite','incluir_arquivados'])
  requireFields('atualizar_resultado',['id','arquivado'])
  requireFields('exportar_mes',['modo','secoes','cursor','limite'])
  requireFields('obter_campanha',['modo','secoes','cursor','limite'])
  requireFields('buscar_tarefas',['cursor','limite'])
  requireFields('atualizar_entrega',['id','campanha_id','arquivada'])
}




const protectedHandler = withOAuthProtectedResource(
  withSupabase({ auth: 'user' }, async (req: Request, { supabase }: any) => {
    let mcpMethod:string|null=null
    if(req.method==='POST'){
      try{const body:any=await req.clone().json();mcpMethod=Array.isArray(body)?String(body[0]?.method||''):String(body?.method||'')}catch{}
    }
    const handler = createMcpHandler(() => {
      const server = new McpServer({ name: 'AllianceOS Gestão', version: '2.3.0' })

      
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

      server.registerTool('criar_lista',{
        description:'Cria uma lista operacional com marca e campanha opcional. campanha_id aceita somente id existente.',
        inputSchema:z.object({nome:z.string().min(1).max(200),marca:z.string().min(1),campanha_id:z.string().min(1).nullable().optional()})
      },async(args:AnyRow)=>{
        const who=await actor(supabase),b=await resolveBrand(supabase,args.marca);let campaignId:any=null
        if(args.campanha_id)campaignId=String((await exactCampaignForBrand(supabase,args.campanha_id,b.nome)).id)
        const{data,error}=await supabase.from('task_lists').insert({nome:args.nome.trim(),brand_id:b.id,campanha_id:campaignId,criado_por:who.id}).select('id,nome,brand_id,campanha_id,arquivado_em').single()
        if(error)throw new Error('Não foi possível criar a lista: '+error.message)
        await audit(supabase,who,'criar_lista','lista',String(data.id),{nome:data.nome,marca:b.nome,campanha_id:data.campanha_id})
        return toolText({lista:{id:String(data.id),link:listLink(String(data.id)),nome:data.nome,marca:b.nome,marca_id:b.id,campanha_id:data.campanha_id,arquivada:false}})
      })
      server.registerTool('atualizar_lista',{
        description:'Renomeia, troca marca/campanha, arquiva ou desarquiva lista. campanha_id precisa existir; nunca exclui.',
        inputSchema:z.object({id:z.string().min(1),nome:z.string().min(1).max(200).optional(),marca:z.string().min(1).optional(),campanha_id:z.string().nullable().optional(),arquivada:z.boolean().optional()})
      },async(args:AnyRow)=>{
        const who=await actor(supabase),old=await resolveList(supabase,args.id,true),b=args.marca?await resolveBrand(supabase,args.marca):{id:old.marca_id,nome:old.marca};let canonicalCampaign:any=old.campanha_id||null
        if(hasOwn(args,'campanha_id'))canonicalCampaign=args.campanha_id===null?null:String((await exactCampaignForBrand(supabase,args.campanha_id,b.nome)).id)
        const patch:AnyRow={}
        if(hasOwn(args,'nome'))patch.nome=args.nome.trim()
        if(hasOwn(args,'marca'))patch.brand_id=b.id
        if(hasOwn(args,'campanha_id'))patch.campanha_id=canonicalCampaign
        if(hasOwn(args,'arquivada')){patch.arquivado_em=args.arquivada?nowIso():null;patch.arquivado_por=args.arquivada?who.id:null}
        const{data,error}=await supabase.from('task_lists').update(patch).eq('id',old.id).select('id,nome,brand_id,campanha_id,arquivado_em').single()
        if(error)throw new Error('Não foi possível atualizar a lista: '+error.message)
        if(hasOwn(args,'nome')||hasOwn(args,'marca')||hasOwn(args,'campanha_id')){
          const tasks=await readState(supabase,TASKS_KEY);let changed=0
          for(const t of tasks){
            const match=String(t.listId||'')===String(old.id)||(!t.listId&&norm(t.brand)===norm(old.marca)&&norm(t.project||'Operação')===norm(old.nome));if(!match)continue
            const direct=taskCampaignIsDirect(t,old.campanha_id);t.listId=String(old.id);t.project=data.nome;t.brand=b.nome
            if(!direct){t.campaignId=data.campanha_id||null;t.campaignSource='list'}
            t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Lista atualizada via MCP por '+who.nome+'.'});changed++
          }
          if(changed)await writeTasks(supabase,tasks)
        }
        await audit(supabase,who,'atualizar_lista','lista',String(data.id),patch)
        return toolText({lista:{id:String(data.id),link:listLink(String(data.id)),nome:data.nome,marca:b.nome,marca_id:b.id,campanha_id:data.campanha_id,arquivada:!!data.arquivado_em}})
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
          const directCampaign=taskCampaignIsDirect(t,source.campanha_id)
          t.listId=String(dest.id)
          t.project=dest.nome
          t.brand=dest.marca
          if(!directCampaign){t.campaignId=dest.campanha_id||null;t.campaignSource='list'}
          t.history=Array.isArray(t.history)?t.history:[]
          t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Tarefa movida da lista "'+source.nome+'" para "'+dest.nome+'" via MCP por '+who.nome+'.'})
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
        description: 'Admin: registra o convite e tenta enviar um link mágico. A resposta informa explicitamente enviado, falhou ou aceito.',
        inputSchema: z.object({
          nome:z.string().min(1).max(200),
          email:z.string().email(),
          cargo:z.string().max(200).nullable().optional(),
          papel:z.enum(['admin','membro']).default('membro'),
          marcas:z.array(z.string().min(1)).default([]),
        }),
      }, async (args:AnyRow) => {
        const who=await requireAdmin(supabase)
        const email=args.email.toLowerCase().trim()
        const [{data:existingProfile},{data:existingInvite}]=await Promise.all([
          supabase.from('profiles').select('id,nome,email,ativo').eq('email',email).maybeSingle(),
          supabase.from('equipe_convites').select('email,aceito_em').eq('email',email).maybeSingle(),
        ])
        if(existingProfile?.ativo && (!existingInvite || existingInvite.aceito_em)) throw new Error('Este e-mail já possui um usuário real ativo no AllianceOS.')
        const brandIds:string[]=[]
        for(const input of args.marcas||[]){
          const b=await resolveBrand(supabase,input)
          if(!brandIds.includes(String(b.id))) brandIds.push(String(b.id))
        }
        const {error}=await supabase.from('equipe_convites').upsert({
          email,
          nome:args.nome.trim(),
          cargo:args.cargo||null,
          papel:args.papel,
          marcas:brandIds,
          criado_por:who.id,
          envio_status:'pendente',
          envio_erro:null,
          atualizado_em:nowIso(),
        },{onConflict:'email'})
        if(error) throw new Error('Não foi possível registrar o convite: '+error.message)
        const envio=await sendInviteEmail(supabase,email)
        await audit(supabase,who,'convidar_membro','membro',email,{nome:args.nome,papel:args.papel,marcas:brandIds,envio_status:envio.status,envio_erro:envio.erro})
        return toolText({convite:{email,nome:args.nome,papel:args.papel,...envio}})
      })

      server.registerTool('reenviar_convite', {
        description: 'Admin: reenvia o link mágico de um convite pendente e registra sucesso ou falha da tentativa.',
        inputSchema:z.object({email:z.string().email()}),
      }, async ({email}:{email:string}) => {
        const who=await requireAdmin(supabase)
        const normalized=email.toLowerCase().trim()
        const {data:invite,error}=await supabase.from('equipe_convites').select('email,nome,aceito_em').eq('email',normalized).maybeSingle()
        if(error||!invite) throw new Error('Convite não encontrado.')
        if(invite.aceito_em) throw new Error('Este convite já foi aceito.')
        const envio=await sendInviteEmail(supabase,normalized)
        await audit(supabase,who,'reenviar_convite','membro',normalized,{envio_status:envio.status,envio_erro:envio.erro})
        return toolText({convite:{email:normalized,nome:invite.nome,...envio}})
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
          t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Responsável legado "'+args.nome_legado+'" vinculado a '+p.nome+' por '+who.nome+'.'})
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
        description:'Busca tarefas visíveis ao usuário com cursor/limite. Por padrão ignora arquivadas.',
        inputSchema:z.object({texto:z.string().min(1).optional(),lista:z.string().min(1).optional(),responsavel:z.string().min(1).optional(),status:z.string().min(1).optional(),prazo_de:dt.optional(),prazo_ate:dt.optional(),incluir_arquivadas:z.boolean().default(false),cursor:z.string().optional(),limite:z.number().int().min(1).max(200).default(50)}),
        annotations:{readOnlyHint:true},
      },async(args:AnyRow)=>{
        let tasks=await readState(supabase,TASKS_KEY)
        if(!args.incluir_arquivadas)tasks=tasks.filter(t=>!t.archivedAt)
        if(args.texto){const n=norm(args.texto);tasks=tasks.filter(t=>norm(t.title).includes(n)||norm(t.description).includes(n)||norm(t.blockedReason).includes(n))}
        if(args.lista){const l=await resolveList(supabase,args.lista,true);tasks=tasks.filter(t=>String(t.listId||'')===String(l.id)||(!t.listId&&norm(t.brand)===norm(l.marca)&&norm(t.project||'Operação')===norm(l.nome)))}
        if(args.responsavel){const n=norm(args.responsavel),members=await memberDirectory(supabase),m=members.find((x:AnyRow)=>x.id===args.responsavel||norm(x.nome)===n||norm(x.email)===n);if(!m)throw new Error('Responsável não encontrado.');tasks=tasks.filter(t=>(Array.isArray(t.assigneeIds)&&t.assigneeIds.includes(m.id))||(t.assignees||[]).some((a:string)=>norm(a)===norm(m.nome)))}
        if(args.status){const st=statusCanon(args.status);tasks=tasks.filter(t=>t.status===st)}
        if(args.prazo_de)tasks=tasks.filter(t=>dueValue(t)&&new Date(dueValue(t)).getTime()>=new Date(args.prazo_de).getTime())
        if(args.prazo_ate)tasks=tasks.filter(t=>dueValue(t)&&new Date(dueValue(t)).getTime()<=new Date(args.prazo_ate).getTime())
        tasks.sort((a,b)=>String(dueValue(a)||'9999').localeCompare(String(dueValue(b)||'9999')))
        const page=fullPage(tasks,args.cursor,args.limite);return toolText({total:page.total,cursor:args.cursor||null,proximo_cursor:page.proximo_cursor,tarefas:page.items.map(publicTask)})
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
          comentarios:fullNormalizeActivityList(t.comments),
          checklist:Array.isArray(t.checklist)?t.checklist:[],
          lista_conferencia_obrigatoria:!!t.conferenceRequired,
          dependencias:deps,
          bloqueia:dependents,
          entrega_obrigatoria:!!t.deliveryRequired,
          entregas:(Array.isArray(t.deliveries)?t.deliveries:[]).map((d:any)=>({...d,at:fullIsoActivityDate(d.at||d.sentAt),atOriginal:d.at==='Agora'?'Agora':d.atOriginal||null,dataDesconhecida:d.at==='Agora'&&!fullIsoActivityDate(d.sentAt)})),
          historico:fullNormalizeActivityList(t.history),
          travas_conclusao:(await completionProblem(supabase,t,tasks))||null,
        }})
      })

      
      server.registerTool('criar_tarefa',{
        description:'Cria tarefa/subtarefa. A tarefa herda a campanha da lista, salvo campanha_id explícito, que precisa existir. Prazo preserva hora/fuso.',
        inputSchema:z.object({
          nome:z.string().min(1).max(300),descricao_markdown:z.string().max(50000).default(''),lista:z.string().min(1),campanha_id:z.string().nullable().optional(),
          responsaveis:z.array(z.string().min(1)).default([]),prazo:dt.optional(),prioridade:z.string().default('normal'),status:z.string().optional(),motivo_bloqueio:z.string().max(500).nullable().optional(),
          tarefa_mae:z.string().min(1).optional(),recorrencia:recurrenceSchema,checklist:z.array(z.string().min(1).max(500)).max(100).default([]),checklist_obrigatoria:z.boolean().default(false),
          dependencias:z.array(z.string().min(1)).max(100).default([]),entrega_obrigatoria:z.boolean().default(false),canal:z.string().nullable().optional()
        })
      },async(args:AnyRow)=>{
        const who=await actor(supabase),[tasks,l,assignees]=await Promise.all([readState(supabase,TASKS_KEY),resolveList(supabase,args.lista),resolveAssignees(supabase,args.responsaveis)])
        if(args.tarefa_mae)findTask(tasks,args.tarefa_mae);for(const d of args.dependencias||[])findTask(tasks,d)
        const st=statusCanon(args.status||'a fazer')||'a fazer';if(st==='bloqueado'&&!String(args.motivo_bloqueio||'').trim())throw new Error('Status bloqueado exige motivo_bloqueio.')
        let campaignId:any=l.campanha_id||null,campaignSource='list'
        if(hasOwn(args,'campanha_id')){campaignId=args.campanha_id===null?null:String((await exactCampaignForBrand(supabase,args.campanha_id,l.marca)).id);campaignSource='direct'}
        const id='mcp-'+Date.now()+'-'+crypto.randomUUID().slice(0,8),t:AnyRow={
          id,title:args.nome.trim(),description:args.descricao_markdown||'',status:st,blockedReason:st==='bloqueado'?String(args.motivo_bloqueio||'').trim():null,
          assignees:[...(assignees?.names||[])],assigneeIds:[...(assignees?.ids||[])],due:args.prazo?String(args.prazo).slice(0,10):null,dueAt:args.prazo||null,start:null,brand:l.marca,project:l.nome,listId:l.id,
          campaignId,campaignSource,channel:args.canal===undefined?null:fullChannelCanon(args.canal),priority:priorityCanon(args.prioridade)||'normal',
          checklist:(args.checklist||[]).map((text:string)=>({id:'check-'+crypto.randomUUID().slice(0,8),text,done:false})),conferenceRequired:!!args.checklist_obrigatoria,subtasks:[],attachments:[],comments:[],
          history:[{at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Tarefa criada via MCP por '+who.nome+'.'}],recurrence:'none',recurrenceRule:{tipo:'nenhuma',dias_semana:[]},tags:[],source:'allianceos-mcp',
          dependencies:[...(args.dependencias||[])],parentTaskId:args.tarefa_mae||null,deliveries:[],deliveryRequired:!!args.entrega_obrigatoria,archivedAt:null,archivedBy:null
        }
        applyRecurrence(t,args.recorrencia);tasks.unshift(t);await writeTasks(supabase,tasks)
        await notifyUsers(supabase,who,t.assigneeIds,'task_assigned','Nova tarefa atribuída',t.title,String(t.id),'assigned:'+String(t.id));await audit(supabase,who,'criar_tarefa','tarefa',String(t.id),{lista_id:t.listId,campanha_id:t.campaignId,responsaveis_ids:t.assigneeIds})
        return toolText({tarefa:publicTask(t)})
      })
      server.registerTool('atualizar_tarefa',{
        description:'Atualiza somente os campos enviados. Ausência de campo nunca limpa mãe, dependências, checklist, tags ou responsáveis. campanha_id explícito sobrepõe a lista.',
        inputSchema:z.object({
          id:z.string().min(1),nome:z.string().min(1).max(300).optional(),descricao_markdown:z.string().max(50000).optional(),lista:z.string().min(1).optional(),campanha_id:z.string().nullable().optional(),
          responsaveis:z.array(z.string().min(1)).optional(),prazo:dt.nullable().optional(),prioridade:z.string().optional(),tarefa_mae:z.string().min(1).nullable().optional(),status:z.string().optional(),
          motivo_bloqueio:z.string().max(500).nullable().optional(),recorrencia:recurrenceSchema,entrega_obrigatoria:z.boolean().optional(),canal:z.string().nullable().optional(),arquivada:z.boolean().optional()
        })
      },async(raw:AnyRow)=>{
        const args=cloneBatchItem(raw),tasks=await readState(supabase,TASKS_KEY),t=findTask(tasks,args.id),who=await actor(supabase),beforeIds=Array.isArray(t.assigneeIds)?[...t.assigneeIds]:[],beforeStatus=t.status,beforeDue=dueValue(t),oldList=t.listId?await resolveList(supabase,String(t.listId),true):null
        if(hasOwn(args,'nome'))t.title=args.nome.trim()
        if(hasOwn(args,'descricao_markdown'))t.description=args.descricao_markdown
        if(hasOwn(args,'lista')){const l=await resolveList(supabase,args.lista);t.brand=l.marca;t.project=l.nome;t.listId=l.id;if(!hasOwn(args,'campanha_id')&&!taskCampaignIsDirect(t,oldList?.campanha_id)){t.campaignId=l.campanha_id||null;t.campaignSource='list'}}
        if(hasOwn(args,'campanha_id')){if(args.campanha_id===null){t.campaignId=null;t.campaignSource='direct'}else{const c=await exactCampaignForBrand(supabase,args.campanha_id,t.brand);t.campaignId=String(c.id);t.campaignSource='direct'}}
        if(hasOwn(args,'responsaveis')){const a=await resolveAssignees(supabase,args.responsaveis);t.assignees=[...(a?.names||[])];t.assigneeIds=[...(a?.ids||[])]}
        if(hasOwn(args,'prazo')){t.dueAt=args.prazo;t.due=args.prazo?String(args.prazo).slice(0,10):null}
        if(hasOwn(args,'prioridade'))t.priority=priorityCanon(args.prioridade)
        if(hasOwn(args,'tarefa_mae')){if(args.tarefa_mae!==null){if(String(args.tarefa_mae)===String(t.id))throw new Error('Uma tarefa não pode ser mãe de si mesma.');findTask(tasks,args.tarefa_mae)}t.parentTaskId=args.tarefa_mae}
        if(hasOwn(args,'entrega_obrigatoria'))t.deliveryRequired=!!args.entrega_obrigatoria
        if(hasOwn(args,'canal'))t.channel=args.canal===null?null:fullChannelCanon(args.canal)
        if(hasOwn(args,'recorrencia'))applyRecurrence(t,args.recorrencia)
        if(hasOwn(args,'arquivada')){t.archivedAt=args.arquivada?(t.archivedAt||nowIso()):null;t.archivedBy=args.arquivada?who.id:null}
        if(hasOwn(args,'status')){
          const next=statusCanon(args.status),reason=hasOwn(args,'motivo_bloqueio')?args.motivo_bloqueio:t.blockedReason
          if(next==='bloqueado'&&!String(reason||'').trim())throw new Error('Status bloqueado exige motivo_bloqueio.')
          if(next==='feito'){const problem=await completionProblem(supabase,t,tasks);if(problem)throw new Error('Não foi possível concluir a tarefa: '+problem)}
          t.status=next
          if(next==='bloqueado')t.blockedReason=String(reason||'').trim()
          else if(beforeStatus==='bloqueado'){if(t.blockedReason){t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Bloqueio encerrado. Motivo anterior: '+t.blockedReason})}t.blockedReason=null}
        }else if(hasOwn(args,'motivo_bloqueio'))t.blockedReason=args.motivo_bloqueio
        let nextOccurrence=null;if(t.status==='feito'&&beforeStatus!=='feito')nextOccurrence=generateNextOccurrence(tasks,t)
        t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Tarefa atualizada via MCP por '+who.nome+'.'});await writeTasks(supabase,tasks)
        const newIds=(Array.isArray(t.assigneeIds)?t.assigneeIds:[]).filter((id:string)=>!beforeIds.includes(id));await notifyUsers(supabase,who,newIds,'task_assigned','Nova tarefa atribuída',t.title,String(t.id),'assigned:'+String(t.id)+':'+newIds.join(','))
        if(hasOwn(args,'status')&&beforeStatus!==t.status)await notifyUsers(supabase,who,t.assigneeIds||[],'task_status','Status alterado: '+t.title,'Novo status: '+t.status,String(t.id),null)
        if(hasOwn(args,'prazo')&&beforeDue!==dueValue(t))await notifyUsers(supabase,who,t.assigneeIds||[],'task_due','Prazo atualizado: '+t.title,dueValue(t)?'Novo prazo: '+dueValue(t):'Prazo removido',String(t.id),null)
        await audit(supabase,who,'atualizar_tarefa','tarefa',String(t.id),{campos:Object.keys(args).filter(k=>k!=='id'),status:t.status,arquivada:!!t.archivedAt});return toolText({tarefa:publicTask(t),proxima_ocorrencia:nextOccurrence?publicTask(nextOccurrence):null})
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
        t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Dependência adicionada via MCP por '+who.nome+': "'+dep.title+'".'})
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
        t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Dependência removida via MCP por '+who.nome+': "'+dep.title+'".'})
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
        t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Checklist definida via MCP por '+who.nome+' com '+t.checklist.length+' item(ns).'})
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
        t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Checklist atualizado via MCP por '+who.nome+': "'+item.text+'" = '+(item.done?'concluído':'pendente')+'.'})
        await writeTasks(supabase,tasks)
        await audit(supabase,who,'marcar_item_checklist','tarefa',String(t.id),{item_id:item.id,concluido:item.done})
        return toolText({tarefa:{...publicTask(t),checklist:t.checklist}})
      })

      

      server.registerTool('registrar_entrega_texto_legado',{
        description:'OBSOLETA: compatibilidade com integrações antigas. Registra texto na tarefa e espelha a entrega na coleção oficial da tela Entregas. Prefira registrar_entrega.',
        inputSchema:z.object({id:z.string().min(1),entrega:z.string().min(1).max(10000)})
      },async({id,entrega}:{id:string;entrega:string})=>{
        const [tasks,campaigns,lists]=await Promise.all([readState(supabase,TASKS_KEY),fullCampaigns(supabase),buildLists(supabase,true)]),t=findTask(tasks,id),who=await actor(supabase),ts=nowIso(),deliveryId='mcp-delivery-'+crypto.randomUUID(),byList=new Map(lists.map((l:any)=>[String(l.id),l])),campaignId=taskCampaignFromLists(t,byList)
        if(campaignId)exactCampaign(campaigns,campaignId)
        t.deliveries=Array.isArray(t.deliveries)?t.deliveries:[]
        const item={id:deliveryId,deliveryId,text:entrega.trim(),note:entrega.trim(),at:ts,author:who.nome,authorId:who.id,source:'mcp',status:'enviado',files:[],links:[]};t.deliveries.unshift(item)
        t.history=Array.isArray(t.history)?t.history:[];t.history.unshift({at:ts,by:who.nome,authorId:who.id,origin:'mcp',text:'Entrega registrada pela ferramenta legada via MCP por '+who.nome+'.'})
        const ds=await fullDeliveries(supabase)
        if(!ds.some((d:any)=>String(d.id)===deliveryId))ds.unshift({id:deliveryId,sourceTaskId:String(t.id),targetTaskId:'',campaignId:campaignId||null,title:'Entrega · '+t.title,taskTitle:t.title,project:t.project,brand:t.brand,from:who.nome,to:(t.assignees||[])[0]||'Equipe',note:entrega.trim(),status:'enviado',createdAt:ts,updatedAt:ts,version:1,completeTask:false,files:[],links:[],events:[{at:ts,by:who.nome,authorId:who.id,origin:'mcp',text:'Entrega textual legada registrada e espelhada na coleção oficial.'}],origin:'mcp'})
        await writeTasks(supabase,tasks);await fullSaveDeliveries(supabase,ds)
        await notifyUsers(supabase,who,t.assigneeIds||[],'task_delivery','Entrega registrada: '+t.title,entrega.trim().slice(0,500),String(t.id),null)
        await audit(supabase,who,'registrar_entrega_texto_legado','entrega',deliveryId,{tarefa_id:t.id,campanha_id:campaignId||null,obsoleta:true})
        return toolText({tarefa:publicTask(t),entrega:fullDelivery(ds.find((d:any)=>String(d.id)===deliveryId),tasks,campaigns),aviso:'Ferramenta obsoleta; use registrar_entrega.'})
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
        t.history.unshift({at:nowIso(),by:who.nome,authorId:who.id,origin:'mcp',text:'Comentário via MCP por '+who.nome+'.'})
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

      registerFullSystemTools(server,supabase)
      assertAdvertisedToolSchemas(server)
      return server
    },{bus:MCP_EVENT_BUS})
    const response=await handler.fetch(req)
    if(mcpMethod==='initialize'||mcpMethod==='notifications/initialized'||mcpMethod==='subscriptions/listen'||mcpMethod==='tools/list'){
      queueMicrotask(()=>{try{void handler.notify.toolsChanged()}catch(e){console.error('tools/list_changed',e)}})
    }
    return response
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
      tools: ["listar_marcas","listar_listas","criar_lista","atualizar_lista","consolidar_lista","listar_membros","convidar_membro","reenviar_convite","migrar_responsavel_legado","buscar_tarefas","obter_tarefa","criar_tarefa","atualizar_tarefa","definir_dependencia","remover_dependencia","definir_checklist","marcar_item_checklist","registrar_entrega_texto_legado","comentar_tarefa","listar_notificacoes","marcar_notificacao_lida","listar_canais","listar_fontes_receita","criar_campanha","atualizar_campanha","listar_campanhas","obter_campanha","criar_mes","atualizar_mes","listar_meses","obter_mes","definir_tap","obter_tap","atualizar_secao_tap","gerar_tarefas_do_tap","criar_mapa","listar_mapas","obter_mapa","atualizar_mapa","adicionar_no","atualizar_no","mover_no","vincular_no_a_campanha","arquivar_no","listar_entregas","obter_entrega","registrar_entrega","atualizar_entrega","aprovar_ou_reprovar_entrega","criar_cliente","atualizar_cliente","listar_clientes","obter_cliente","vincular_cliente_a_campanha","listar_automacoes","obter_automacao","criar_automacao","atualizar_automacao","ativar_ou_pausar_automacao","registrar_resultado","listar_resultados","atualizar_resultado","obter_resultado_campanha","obter_resultado_mes","comparar_planejado_realizado","criar_tag","listar_tags","atualizar_tag","marcar_tag","desmarcar_tag","criar_tarefas_em_lote","atualizar_tarefas_em_lote","busca_global","auditar_vinculos_campanha","auditar_taps_legados","exportar_mes"],
      tool_schema_version: TOOL_SCHEMA_VERSION,
      tools_list_changed: true,
      deletion_tool: false,
    })
  }
  return protectedHandler(req)
})
