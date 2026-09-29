import { createHash, randomUUID } from 'node:crypto';
import { sb } from './_lib/datahub.mjs';

function send(res,status,body){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  return res.status(status).send(JSON.stringify(body));
}
const text=v=>String(v??'').trim();
const digits=v=>text(v).replace(/\D/g,'');
const instagram=v=>text(v).toLowerCase().replace(/[^a-z0-9._]/g,'');
const email=v=>text(v).toLowerCase();
const hash=v=>createHash('sha256').update(String(v||'')).digest('hex');
const q=v=>encodeURIComponent(String(v));

async function sourceByToken(token){
  const h=hash(token);
  const rows=await sb('/rest/v1/creator_form_sources?select=id,brand_id,name,default_types,metadata&active=eq.true&token_hash=eq.'+q(h)+'&limit=1');
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function findPartner(f){
  const checks=[
    ['cpf_norm',digits(f.cpf)],
    ['email_norm',email(f.email)],
    ['whatsapp_norm',digits(f.whatsapp)],
    ['instagram_norm',instagram(f.instagram)],
  ].filter(([,v])=>v);
  for(const [col,val] of checks){
    const rows=await sb('/rest/v1/creator_partners?select=*&arquivado_em=is.null&'+col+'=eq.'+q(val)+'&limit=1');
    if(Array.isArray(rows)&&rows[0])return rows[0];
  }
  return null;
}
function parseType(v,defaults){
  const s=text(v).toLowerCase();
  if(s.includes('prescr'))return ['prescritor'];
  if(s.includes('ugc'))return ['ugc'];
  if(s.includes('creator')||s.includes('influ'))return ['creator'];
  return Array.isArray(defaults)&&defaults.length?defaults:['creator'];
}
function partnerPatch(f){
  const out={
    nome_completo:text(f.nome_completo),
    whatsapp:text(f.whatsapp)||null,
    email:text(f.email)||null,
    instagram:text(f.instagram)||null,
    cpf:text(f.cpf)||null,
    cnpj:text(f.cnpj)||null,
    razao_social:text(f.razao_social)||null,
    chave_pix:text(f.pix)||null,
    endereco:text(f.endereco)||null,
    cidade_uf:text(f.cidade_uf)||null,
    seguidores:Number(String(f.seguidores||'').replace(/[^0-9]/g,''))||null,
    visualizacoes_stories:Number(String(f.visualizacoes_stories||'').replace(/[^0-9]/g,''))||null,
    nicho:text(f.nicho)||null,
    origem:'Formulário AllianceOS',
    cadastro_metadata:{
      seguidores_resposta:text(f.seguidores)||null,
      visualizacoes_stories_resposta:text(f.visualizacoes_stories)||null,
    },
    atualizado_em:new Date().toISOString(),
  };
  return out;
}
function linkMetadata(f,source,submissionId){
  return {
    intake_source_id:source.id,
    intake_source_name:source.name,
    last_submission_id:submissionId,
    sugestao_cupom:text(f.cupom_sugerido)||null,
    conteudo:text(f.conteudo)||null,
    experiencia_comissao:text(f.experiencia_comissao)||null,
    conhece_marca:text(f.conhece_marca)||null,
    motivo_parceria:text(f.motivo_parceria)||null,
    aceita_receber_divulgar:text(f.aceita_receber_divulgar)||null,
    interesse_collab:text(f.interesse_collab)||null,
    formulario_recebido_em:new Date().toISOString(),
  };
}
async function getSettings(brandId){
  const rows=await sb('/rest/v1/creator_sector_settings?select=manager_profile_id,default_hunter_profile_id&brand_id=eq.'+q(brandId)+'&limit=1');
  return Array.isArray(rows)&&rows[0]?rows[0]:{};
}
async function notifyManager(settings,partnerName,partnerBrandId,submissionId){
  if(!settings?.manager_profile_id)return;
  try{
    await sb('/rest/v1/notifications',{
      method:'POST',
      headers:{Prefer:'return=minimal'},
      body:{
        user_id:settings.manager_profile_id,
        kind:'creator_new_intake',
        title:'Novo cadastro de parceiro',
        body:partnerName+' preencheu o formulário e entrou na Gestão de Creators.',
        event_key:'creator:intake:'+submissionId,
        created_at:new Date().toISOString(),
      }
    });
  }catch(e){ console.warn('[creator-intake] notification',e?.message||e); }
}
async function intake(req,res,source){
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  const f=body.fields||{};
  const submissionId=text(body.submission_id)||randomUUID();

  if(!text(f.nome_completo)||!text(f.whatsapp)||!text(f.instagram)||!text(f.email)||!text(f.cpf)){
    return send(res,400,{erro:'Preencha nome, WhatsApp, Instagram, e-mail e CPF.'});
  }
  if(text(f.website))return send(res,200,{ok:true});

  const prior=await sb('/rest/v1/creator_intake_submissions?select=id,status,partner_brand_id&source_id=eq.'+q(source.id)+'&external_id=eq.'+q(submissionId)+'&limit=1');
  if(Array.isArray(prior)&&prior[0]?.status==='processed'){
    return send(res,200,{ok:true,duplicate:true});
  }

  let intakeId=prior?.[0]?.id||null;
  if(!intakeId){
    const created=await sb('/rest/v1/creator_intake_submissions',{
      method:'POST',
      headers:{Prefer:'return=representation'},
      body:{source_id:source.id,external_id:submissionId,payload:f,status:'received',received_at:new Date().toISOString()}
    });
    intakeId=created?.[0]?.id||null;
  }

  try{
    let partner=await findPartner(f);
    const ppatch=partnerPatch(f);
    if(!partner){
      const created=await sb('/rest/v1/creator_partners',{
        method:'POST',
        headers:{Prefer:'return=representation'},
        body:{...ppatch,criado_em:new Date().toISOString()}
      });
      partner=created?.[0];
    }else{
      const merged={...ppatch,cadastro_metadata:{...(partner.cadastro_metadata||{}),...(ppatch.cadastro_metadata||{})}};
      const updated=await sb('/rest/v1/creator_partners?id=eq.'+q(partner.id),{
        method:'PATCH',
        headers:{Prefer:'return=representation'},
        body:merged
      });
      partner=updated?.[0]||partner;
    }
    if(!partner?.id)throw new Error('Não foi possível salvar o cadastro.');

    const settings=await getSettings(source.brand_id);
    const types=parseType(f.tipo,source.default_types);
    let links=await sb('/rest/v1/creator_partner_brands?select=*&partner_id=eq.'+q(partner.id)+'&brand_id=eq.'+q(source.brand_id)+'&arquivado_em=is.null&limit=1');
    let link=Array.isArray(links)?links[0]:null;
    const meta=linkMetadata(f,source,submissionId);
    if(!link){
      const created=await sb('/rest/v1/creator_partner_brands',{
        method:'POST',
        headers:{Prefer:'return=representation'},
        body:{
          partner_id:partner.id,
          brand_id:source.brand_id,
          tipos:types,
          status:'novo_cadastro',
          hunter_id:settings.default_hunter_profile_id||null,
          cupom:text(f.cupom_sugerido)||null,
          proxima_acao:'Analisar cadastro',
          proxima_acao_em:new Date().toISOString(),
          metadata:meta,
          criado_em:new Date().toISOString(),
          atualizado_em:new Date().toISOString(),
        }
      });
      link=created?.[0];
    }else{
      const mergedTypes=[...new Set([...(link.tipos||[]),...types])];
      const updated=await sb('/rest/v1/creator_partner_brands?id=eq.'+q(link.id),{
        method:'PATCH',
        headers:{Prefer:'return=representation'},
        body:{
          tipos:mergedTypes,
          hunter_id:link.hunter_id||settings.default_hunter_profile_id||null,
          cupom:link.cupom||text(f.cupom_sugerido)||null,
          metadata:{...(link.metadata||{}),...meta},
          atualizado_em:new Date().toISOString(),
        }
      });
      link=updated?.[0]||link;
    }
    if(!link?.id)throw new Error('Não foi possível vincular o cadastro à marca.');

    await sb('/rest/v1/creator_history',{
      method:'POST',
      headers:{Prefer:'return=minimal'},
      body:{
        partner_brand_id:link.id,
        evento:'formulario_recebido',
        descricao:'Cadastro recebido pelo formulário público do AllianceOS',
        origem:'formulario_publico',
        dados:{submission_id:submissionId,source_id:source.id},
        criado_em:new Date().toISOString(),
      }
    });

    if(intakeId){
      await sb('/rest/v1/creator_intake_submissions?id=eq.'+q(intakeId),{
        method:'PATCH',
        headers:{Prefer:'return=minimal'},
        body:{status:'processed',partner_brand_id:link.id,processed_at:new Date().toISOString(),error:null}
      });
    }
    await notifyManager(settings,partner.nome_completo,link.id,submissionId);
    return send(res,200,{ok:true,partner_brand_id:link.id});
  }catch(e){
    console.error('[creator-intake]',e);
    if(intakeId){
      try{await sb('/rest/v1/creator_intake_submissions?id=eq.'+q(intakeId),{method:'PATCH',headers:{Prefer:'return=minimal'},body:{status:'error',error:String(e.message||e).slice(0,500),processed_at:new Date().toISOString()}})}catch{}
    }
    return send(res,500,{erro:'Não foi possível enviar agora. Tente novamente.'});
  }
}

export default async function handler(req,res){
  if(req.method==='OPTIONS')return send(res,204,{});
  const incoming=new URL(req.url,'https://alliance-os.local');
  const token=text(incoming.searchParams.get('s')||(typeof req.body==='object'?req.body?.source_token:''));
  if(!token)return send(res,404,{erro:'Formulário não encontrado.'});
  let source;
  try{source=await sourceByToken(token)}catch(e){console.error('[creator-intake source]',e);return send(res,500,{erro:'Falha de configuração.'})}
  if(!source)return send(res,404,{erro:'Formulário não encontrado ou desativado.'});

  if(req.method==='GET'){
    return send(res,200,{ok:true,brand_name:source.metadata?.brand_name||'Alliance',form_name:source.name});
  }
  if(req.method!=='POST')return send(res,405,{erro:'método não permitido'});
  try{return await intake(req,res,source)}
  catch(e){console.error('[creator-intake fatal]',e);return send(res,500,{erro:'Falha ao processar cadastro.'})}
}
