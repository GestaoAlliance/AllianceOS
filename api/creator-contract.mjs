import { createSign } from 'node:crypto';
import { requireAllianceUser, authError } from './_lib/auth.mjs';

const CONFIG='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
const GOOGLE_DOC='application/vnd.google-apps.document';
const DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function send(res,status,body){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.status(status).send(JSON.stringify(body));
}
let cfgCache=null;
async function cfg(){if(cfgCache)return cfgCache;const r=await fetch(CONFIG,{cache:'no-store'});if(!r.ok)throw Object.assign(Error('configuração indisponível'),{status:503});cfgCache=await r.json();return cfgCache}
async function rest(session,path,{method='GET',body,prefer}={}){
  const c=await cfg();
  const r=await fetch(c.url+path,{method,headers:{apikey:c.anon,Authorization:session.authorization,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body==null?undefined:JSON.stringify(body),cache:'no-store'});
  const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
  if(!r.ok){const msg=typeof data==='object'&&data?(data.message||data.error||data.hint):txt;throw Object.assign(Error(String(msg||'Erro no banco').slice(0,300)),{status:r.status})}
  return data;
}
function serviceAccount(){
  const raw=process.env.GOOGLE_DRIVE_SA||'';
  if(!raw.trim())throw Object.assign(Error('Conta de serviço do Google Drive não configurada.'),{status:503});
  const text=raw.trim().startsWith('{')?raw:Buffer.from(raw,'base64').toString('utf8');
  const sa=JSON.parse(text);
  if(!sa.client_email||!sa.private_key)throw Object.assign(Error('Conta de serviço do Google incompleta.'),{status:503});
  return sa;
}
const b64u=v=>Buffer.from(v).toString('base64url');
let tokenCache={value:null,until:0};
async function googleToken(){
  if(tokenCache.value&&Date.now()<tokenCache.until-60000)return tokenCache.value;
  const sa=serviceAccount(),now=Math.floor(Date.now()/1000);
  const head=b64u(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const payload=b64u(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents',aud:sa.token_uri||'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const signer=createSign('RSA-SHA256');signer.update(head+'.'+payload);
  const jwt=head+'.'+payload+'.'+signer.sign(sa.private_key).toString('base64url');
  const r=await fetch(sa.token_uri||'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.access_token)throw Object.assign(Error(j.error_description||j.error||'Falha ao autenticar no Google.'),{status:502});
  tokenCache={value:j.access_token,until:Date.now()+(j.expires_in||3600)*1000};
  return j.access_token;
}
async function downloadDrive(id){
  const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media&supportsAllDrives=true',{headers:{Authorization:'Bearer '+await googleToken()}});
  if(!r.ok){const t=await r.text();throw Object.assign(Error('Não foi possível ler o modelo no Drive: '+t.slice(0,180)),{status:r.status})}
  return Buffer.from(await r.arrayBuffer());
}
async function existingGenerated(folderId,partnerBrandId){
  const q="'"+folderId+"' in parents and appProperties has { key='creatorPartnerBrandId' and value='"+String(partnerBrandId).replace(/'/g,"\\'")+"' } and trashed = false";
  const u=new URL('https://www.googleapis.com/drive/v3/files');u.searchParams.set('q',q);u.searchParams.set('fields','files(id,name,mimeType,webViewLink,createdTime)');u.searchParams.set('pageSize','5');u.searchParams.set('supportsAllDrives','true');u.searchParams.set('includeItemsFromAllDrives','true');u.searchParams.set('corpora','allDrives');
  const r=await fetch(u,{headers:{Authorization:'Bearer '+await googleToken()}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(j?.error?.message||'Falha ao verificar contratos no Drive.'),{status:r.status});
  return j.files?.[0]||null;
}
async function importAsGoogleDoc(bytes,{name,folderId,partnerBrandId,templateId}){
  const boundary='alliance_'+Date.now().toString(36);
  const meta=Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({
    name,mimeType:GOOGLE_DOC,parents:[folderId],
    appProperties:{allianceOS:'creator-contract',creatorPartnerBrandId:String(partnerBrandId),creatorTemplateId:String(templateId)}
  })+'\r\n--'+boundary+'\r\nContent-Type: '+DOCX+'\r\n\r\n');
  const end=Buffer.from('\r\n--'+boundary+'--');
  const body=Buffer.concat([meta,bytes,end]);
  const u='https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink,parents';
  const r=await fetch(u,{method:'POST',headers:{Authorization:'Bearer '+await googleToken(),'Content-Type':'multipart/related; boundary='+boundary,'Content-Length':String(body.length)},body});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(j?.error?.message||'Falha ao criar contrato no Drive.'),{status:r.status});
  return j;
}
function ptDate(){
  const d=new Date(),parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'long',year:'numeric'}).formatToParts(d);
  const day=parts.find(x=>x.type==='day')?.value||'',month=parts.find(x=>x.type==='month')?.value||'',year=parts.find(x=>x.type==='year')?.value||'';
  return {lower:day+' de '+month+' de '+year,capital:day+' de '+month.charAt(0).toUpperCase()+month.slice(1)+' de '+year,iso:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)};
}
function addMonths(dateIso,months){const d=new Date(dateIso+'T12:00:00-03:00');d.setMonth(d.getMonth()+Number(months||6));return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function replacementMap(type,p){
  const date=ptDate(),name=String(p.nome_completo||'').trim(),cpf=String(p.cpf||'').trim(),cnpj=String(p.cnpj||'').trim(),company=String(p.razao_social||name).trim(),address=String(p.endereco||'').trim();
  if(type==='prescritor')return [
    ['por NOME, inscrita no CPF sob o n. CPF, residente no endereço: ENDEREÇO','por '+name+', inscrita no CPF sob o n. '+cpf+', residente no endereço: '+address],
    ['por NOME, inscrita no CPF sob o n. CPF','por '+name+', inscrita no CPF sob o n. '+cpf],
    ['residente no endereço: ENDEREÇO','residente no endereço: '+address],
    ['NOME CONTRATADO',name],
    ['CPF sob o nº CPF','CPF sob o nº '+cpf],
    ['Belo Horizonte/MG, data','Belo Horizonte/MG, '+date.lower]
  ];
  if(type==='ugc')return [
    ['CONTRATADA: xxxxx, inscrita no CPF sob o n. xxxxxx,  residente no endereço: xxxxx.','CONTRATADA: '+name+', inscrita no CPF sob o n. '+cpf+', residente no endereço: '+address+'.'],
    ['CONTRATADA: xxxxx, inscrita no CPF sob o n. xxxxxx','CONTRATADA: '+name+', inscrita no CPF sob o n. '+cpf],
    ['residente no endereço: xxxxx.','residente no endereço: '+address+'.'],
    ['NOME COMPLETO',name],
    ['CPF sob o nº XXXXXXXXX','CPF sob o nº '+cpf],
    ['XX de setembro de 2026',date.lower]
  ];
  return [
    ['Rua [endereço completo]',address],
    ['[RAZÃO SOCIAL]',company],
    ['CNPJ sob nº XXXXXXXXX','CNPJ sob nº '+cnpj],
    ['CNPJ: XXXXXXXXX','CNPJ: '+cnpj],
    ['CPF nº xxxxxxxxxxx','CPF nº '+cpf],
    ['[Nome Completo do Autorizante]',name],
    ['[Nome completo]',name],
    ['[nome completo]',name],
    ['[Número do CPF]',cpf],
    ['[Endereço Completo]',address],
    ['15 de Setembro de 2026',date.capital],
    ['15 de setembro de 2026',date.lower]
  ];
}
async function replaceDocText(documentId,replacements){
  const requests=replacements.filter(([,to])=>String(to||'').trim()).map(([from,to])=>({replaceAllText:{containsText:{text:from,matchCase:true},replaceText:String(to)}}));
  const r=await fetch('https://docs.googleapis.com/v1/documents/'+encodeURIComponent(documentId)+':batchUpdate',{method:'POST',headers:{Authorization:'Bearer '+await googleToken(),'Content-Type':'application/json'},body:JSON.stringify({requests})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(j?.error?.message||'Falha ao preencher o contrato.'),{status:r.status});
  return j;
}
function collectText(node,out=[]){
  if(!node||typeof node!=='object')return out;
  if(typeof node.content==='string')out.push(node.content);
  if(Array.isArray(node.content))node.content.forEach(x=>collectText(x,out));
  if(Array.isArray(node.body?.content))node.body.content.forEach(x=>collectText(x,out));
  if(Array.isArray(node.paragraph?.elements))node.paragraph.elements.forEach(x=>{if(x.textRun?.content)out.push(x.textRun.content)});
  if(Array.isArray(node.table?.tableRows))node.table.tableRows.forEach(x=>collectText(x,out));
  if(Array.isArray(node.tableCells))node.tableCells.forEach(x=>collectText(x,out));
  return out;
}
async function verifyDoc(documentId,type){
  const r=await fetch('https://docs.googleapis.com/v1/documents/'+encodeURIComponent(documentId),{headers:{Authorization:'Bearer '+await googleToken()}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(j?.error?.message||'Falha ao verificar contrato gerado.'),{status:r.status});
  const text=collectText(j).join('');
  const tokens=type==='prescritor'?['NOME CONTRATADO','ENDEREÇO','Belo Horizonte/MG, data']:type==='ugc'?['NOME COMPLETO','XXXXXXXXX','xxxxxx']:['[RAZÃO SOCIAL]','XXXXXXXXX','xxxxxxxxxxx','[Nome completo]','[Número do CPF]','[Endereço Completo]'];
  return tokens.filter(x=>text.includes(x));
}
function validate(type,p){
  const miss=[];
  if(!p.nome_completo)miss.push('nome completo');
  if(!p.cpf)miss.push('CPF');
  if(!p.endereco)miss.push('endereço');
  if(type==='creator'&& !p.cnpj)miss.push('CNPJ');
  if(type==='creator'&& !p.razao_social)miss.push('razão social');
  return miss;
}
async function generate(session,partnerBrandId,force=false){
  const links=await rest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(partnerBrandId)+'&arquivado_em=is.null&select=*,partner:creator_partners(*)');
  const link=links?.[0];if(!link)throw Object.assign(Error('Parceiro não encontrado.'),{status:404});
  if(link.status!=='aprovado'&&!force)throw Object.assign(Error('O parceiro precisa estar aprovado para gerar o contrato.'),{status:409});
  const type=(link.tipos||[]).includes('prescritor')?'prescritor':(link.tipos||[]).includes('ugc')?'ugc':(link.tipos||[]).includes('creator')?'creator':null;
  if(!type)throw Object.assign(Error('Defina se o parceiro é Creator, Prescritor ou UGC antes de gerar o contrato.'),{status:409});
  const p=link.partner||{},missing=validate(type,p);if(missing.length)throw Object.assign(Error('Faltam dados obrigatórios para o contrato: '+missing.join(', ')+'.'),{status:409});
  const templates=await rest(session,'/rest/v1/creator_contract_templates?brand_id=eq.'+encodeURIComponent(link.brand_id)+'&partner_type=eq.'+encodeURIComponent(type)+'&active=eq.true&select=*&limit=1');
  const template=templates?.[0];if(!template)throw Object.assign(Error('Não existe modelo de contrato ativo para este tipo e marca.'),{status:409});
  const contracts=await rest(session,'/rest/v1/creator_contracts?partner_brand_id=eq.'+encodeURIComponent(partnerBrandId)+'&arquivado_em=is.null&select=*&order=criado_em.desc&limit=1');
  let contract=contracts?.[0]||null;
  if(contract?.documento_url&&!force)return {contract,created:false,reused:true};

  if(!force){
    const found=await existingGenerated(template.drive_destination_folder_id,partnerBrandId);
    if(found){
      const metadata={...(contract?.metadata||{}),generation_state:'generated',drive_document_id:found.id,template_drive_id:template.drive_template_id,model_type:type,recovered_existing:true};
      const body={documento_url:found.webViewLink||('https://docs.google.com/document/d/'+found.id+'/edit'),metadata,atualizado_em:new Date().toISOString(),atualizado_por:session.user.id};
      if(contract){
        const rows=await rest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contract.id),{method:'PATCH',prefer:'return=representation',body});contract=rows?.[0]||{...contract,...body};
      }else{
        const rows=await rest(session,'/rest/v1/creator_contracts',{method:'POST',prefer:'return=representation',body:{partner_brand_id:partnerBrandId,status:'rascunho',provider:'autentique',...body,criado_por:session.user.id}});contract=rows?.[0];
      }
      return {contract,created:false,recovered:true};
    }
  }

  const bytes=await downloadDrive(template.drive_template_id);
  const suffix=type==='prescritor'?'Prescritores':type==='ugc'?'UGC':'Contrato influenciadores botanika';
  const file=await importAsGoogleDoc(bytes,{name:(type==='ugc'?'Contrato UGC - ':p.nome_completo+' - ')+suffix,folderId:template.drive_destination_folder_id,partnerBrandId,templateId:template.drive_template_id});
  await replaceDocText(file.id,replacementMap(type,p));
  const remaining=await verifyDoc(file.id,type);
  const generatedAt=new Date().toISOString(),date=ptDate();
  const metadata={...(contract?.metadata||{}),generation_state:remaining.length?'generated_with_warning':'generated',drive_document_id:file.id,drive_file_name:file.name,template_drive_id:template.drive_template_id,template_name:template.name,model_type:type,generated_at:generatedAt,remaining_placeholders:remaining,versions:[...((contract?.metadata?.versions)||[]),{drive_document_id:file.id,documento_url:file.webViewLink||('https://docs.google.com/document/d/'+file.id+'/edit'),generated_at:generatedAt}]};
  const payload={documento_url:file.webViewLink||('https://docs.google.com/document/d/'+file.id+'/edit'),inicio_em:date.iso,fim_em:addMonths(date.iso,template.duration_months),metadata,atualizado_em:generatedAt,atualizado_por:session.user.id};
  if(contract){
    const rows=await rest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contract.id),{method:'PATCH',prefer:'return=representation',body:payload});contract=rows?.[0]||{...contract,...payload};
  }else{
    const rows=await rest(session,'/rest/v1/creator_contracts',{method:'POST',prefer:'return=representation',body:{partner_brand_id:partnerBrandId,status:'rascunho',provider:'autentique',...payload,criado_por:session.user.id}});contract=rows?.[0];
  }
  await rest(session,'/rest/v1/creator_history',{method:'POST',prefer:'return=minimal',body:{partner_brand_id:partnerBrandId,evento:'contrato_gerado',descricao:'Contrato gerado automaticamente a partir do modelo '+template.name,origem:'automacao',actor_id:session.user.id,dados:{contract_id:contract?.id,drive_document_id:file.id,template_drive_id:template.drive_template_id,model_type:type,remaining_placeholders:remaining}}});
  return {contract,created:true,warning:remaining.length?remaining:null};
}

export default async function handler(req,res){
  try{
    if(req.method==='GET'&&new URL(req.url,'http://x').searchParams.get('health')==='1'){
      let drive=false;try{serviceAccount();drive=true}catch{}
      return send(res,200,{ok:true,drive_configured:drive});
    }
    if(req.method!=='POST')return send(res,405,{erro:'método não permitido'});
    const session=await requireAllianceUser(req);
    const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const id=String(body.partner_brand_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'partner_brand_id inválido'});
    const result=await generate(session,id,body.force===true);
    return send(res,200,{ok:true,...result});
  }catch(e){
    if(e?.status===401||e?.status===403)return authError(res,e);
    console.error('[creator-contract]',e);
    return send(res,Number(e?.status)||500,{erro:String(e?.message||e).slice(0,400)});
  }
}