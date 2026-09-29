import {requireAllianceUser,authError} from './_lib/auth.mjs';
import {createSign} from 'node:crypto';
import PizZip from 'pizzip';
import creatorTemplateB64 from './_lib/botanika-creator-template.mjs';
import prescritorTemplateB64 from './_lib/botanika-prescritor-template.mjs';
import ugcTemplateB64 from './_lib/botanika-ugc-template.mjs';

const BRAND='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-brand';
const CONFIG='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
const DELIVERY_BUCKET='alliance-deliveries';
const PASTA='application/vnd.google-apps.folder';
const CAMPOS='id,name,mimeType,iconLink,webViewLink,thumbnailLink,modifiedTime,size,owners(displayName)';
function send(res,status,body){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');return res.status(status).send(JSON.stringify(body))}
async function marca(nome){const r=await fetch(`${BRAND}?marca=${encodeURIComponent(nome)}`,{cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j.erro||`marca HTTP ${r.status}`),{status:r.status});return j}
async function salvarPasta(nome,pasta){const r=await fetch(BRAND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marca:nome,drive_pasta:pasta})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j.erro||`configuração HTTP ${r.status}`),{status:r.status});return j}
function conta(){const cru=process.env.GOOGLE_DRIVE_SA||'';if(!cru.trim())return null;const texto=cru.trim().startsWith('{')?cru:Buffer.from(cru,'base64').toString('utf8');const sa=JSON.parse(texto);if(!sa.client_email||!sa.private_key)throw Error('a chave da conta de serviço está incompleta');return sa}
const b64u=t=>Buffer.from(t).toString('base64url');
let guardado={token:null,ate:0};
async function token(){if(guardado.token&&Date.now()<guardado.ate-60000)return guardado.token;const sa=conta();if(!sa)throw Object.assign(Error('sem conta de serviço configurada'),{faltaChave:true});const agora=Math.floor(Date.now()/1000),cab=b64u(JSON.stringify({alg:'RS256',typ:'JWT'})),corpo=b64u(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/drive',aud:sa.token_uri||'https://oauth2.googleapis.com/token',iat:agora,exp:agora+3600})),assina=createSign('RSA-SHA256');assina.update(`${cab}.${corpo}`);const jwt=`${cab}.${corpo}.${assina.sign(sa.private_key).toString('base64url')}`,r=await fetch(sa.token_uri||'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}),j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token)throw Error(j.error_description||j.error||`Google recusou a chave (HTTP ${r.status})`);guardado={token:j.access_token,ate:Date.now()+(j.expires_in||3600)*1000};return guardado.token}
async function drive(caminho,params={}){const u=new URL(`https://www.googleapis.com/drive/v3/${caminho}`);for(const[k,v]of Object.entries(params))if(v!=null&&v!=='')u.searchParams.set(k,String(v));u.searchParams.set('supportsAllDrives','true');const r=await fetch(u,{headers:{Authorization:`Bearer ${await token()}`}}),j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j?.error?.message||`Google Drive ${r.status}`),{status:r.status});return j}
async function dentroDe(id,raiz){if(!id||id===raiz)return true;let atual=id;for(let i=0;i<18;i++){const f=await drive(`files/${encodeURIComponent(atual)}`,{fields:'id,parents'}),pais=f.parents||[];if(!pais.length)return false;if(pais.includes(raiz))return true;atual=pais[0]}return false}
const aspas=t=>String(t).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
let cfgCache=null;
async function cfg(){if(cfgCache)return cfgCache;const r=await fetch(CONFIG,{cache:'no-store'});if(!r.ok)throw Error('configuração do armazenamento indisponível');cfgCache=await r.json();return cfgCache}
const encodePath=p=>String(p||'').split('/').filter(Boolean).map(encodeURIComponent).join('/');
async function stagingObject(auth,bucket,path){if(bucket!==DELIVERY_BUCKET)throw Object.assign(Error('bucket de entrega inválido'),{status:400});const c=await cfg(),url=`${c.url}/storage/v1/object/authenticated/${encodeURIComponent(bucket)}/${encodePath(path)}`;const r=await fetch(url,{headers:{apikey:c.anon,Authorization:auth},cache:'no-store'});if(!r.ok){const msg=await r.text().catch(()=>(''));throw Object.assign(Error(msg||`arquivo temporário HTTP ${r.status}`),{status:r.status})}return {response:r,config:c}}
async function apagarStaging(auth,c,bucket,path){try{await fetch(`${c.url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodePath(path)}`,{method:'DELETE',headers:{apikey:c.anon,Authorization:auth}})}catch{}}
async function existentePorUploadId(pasta,uploadId){if(!uploadId)return null;const q=`'${aspas(pasta)}' in parents and appProperties has { key='allianceUploadId' and value='${aspas(uploadId)}' } and trashed = false`;const list=await drive('files',{q,fields:'files(id,name,mimeType,webViewLink,size,parents)',pageSize:'2',includeItemsFromAllDrives:'true',corpora:'allDrives'});return list.files?.[0]||null}
async function enviarAoDrive({pasta,nome,mime,size,uploadId,storageResponse}){const existing=await existentePorUploadId(pasta,uploadId);if(existing)return existing;const folder=await drive(`files/${encodeURIComponent(pasta)}`,{fields:'id,name,mimeType,capabilities(canAddChildren)'});if(folder.mimeType!==PASTA)throw Object.assign(Error('o destino escolhido não é uma pasta do Drive'),{status:400});if(folder.capabilities&&folder.capabilities.canAddChildren===false)throw Object.assign(Error('a conta do AllianceOS não pode adicionar arquivos nesta pasta'),{status:403});const init=new URL('https://www.googleapis.com/upload/drive/v3/files');init.searchParams.set('uploadType','resumable');init.searchParams.set('supportsAllDrives','true');init.searchParams.set('fields','id,name,mimeType,webViewLink,size,parents');const auth=`Bearer ${await token()}`;const start=await fetch(init,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':mime||'application/octet-stream','X-Upload-Content-Length':String(size||0)},body:JSON.stringify({name:nome,parents:[pasta],appProperties:{allianceUploadId:String(uploadId||''),allianceOS:'delivery'}})});if(!start.ok){const j=await start.json().catch(()=>({}));throw Object.assign(Error(j?.error?.message||`Google Drive ${start.status}`),{status:start.status})}const location=start.headers.get('location');if(!location)throw Error('Google não abriu uma sessão de upload');const put=await fetch(location,{method:'PUT',headers:{Authorization:auth,'Content-Type':mime||'application/octet-stream','Content-Length':String(size||0)},body:storageResponse.body,duplex:'half'});const file=await put.json().catch(()=>({}));if(!put.ok)throw Object.assign(Error(file?.error?.message||`upload Google Drive ${put.status}`),{status:put.status});if(file.webViewLink)return file;return drive(`files/${encodeURIComponent(file.id)}`,{fields:'id,name,mimeType,webViewLink,size,parents'})}
async function copiarStorage(body,session){const nome=String(body.marca||'').trim(),m=await marca(nome);if(!m.drive_pasta)throw Object.assign(Error(`A ${m.marca} ainda não tem a raiz do Drive configurada.`),{status:409});const raiz=m.drive_pasta,pasta=String(body.pasta||'').trim();if(!pasta)throw Object.assign(Error('escolha uma pasta de destino'),{status:400});if(!(await dentroDe(pasta,raiz)))throw Object.assign(Error('essa pasta não pertence ao Drive configurado para esta marca'),{status:403});const bucket=String(body.bucket||''),path=String(body.path||'').trim();if(!path||!path.startsWith(String(session.user.id)+'/'))throw Object.assign(Error('arquivo temporário inválido para este usuário'),{status:403});const staged=await stagingObject(session.authorization,bucket,path);const tamanho=Number(body.size||staged.response.headers.get('content-length')||0);const mime=String(body.mime_type||staged.response.headers.get('content-type')||'application/octet-stream').split(';')[0];const arquivo=await enviarAoDrive({pasta,nome:String(body.name||'arquivo'),mime,size:tamanho,uploadId:String(body.upload_id||path),storageResponse:staged.response});await apagarStaging(session.authorization,staged.config,bucket,path);return {id:arquivo.id,nome:arquivo.name,tipo:arquivo.mimeType,link:arquivo.webViewLink||`https://drive.google.com/file/d/${arquivo.id}/view`,tamanho:arquivo.size?+arquivo.size:tamanho,pasta,raiz}}

async function authRest(session,path,{method='GET',body,prefer}={}){
  const conf=await cfg();
  const r=await fetch(conf.url+path,{method,headers:{apikey:conf.anon,Authorization:session.authorization,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body==null?undefined:JSON.stringify(body),cache:'no-store'});
  const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
  if(!r.ok){const msg=typeof data==='object'&&data?(data.message||data.error||data.hint):txt;throw Object.assign(Error(String(msg||'erro no banco').slice(0,300)),{status:r.status})}
  return data;
}
async function baixarArquivoDrive(id){
  const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?alt=media&supportsAllDrives=true',{headers:{Authorization:'Bearer '+await token()}});
  if(!r.ok){const t=await r.text().catch(()=>(''));throw Object.assign(Error('Não foi possível ler o modelo no Drive: '+t.slice(0,180)),{status:r.status})}
  return Buffer.from(await r.arrayBuffer());
}
async function contratoExistenteNoDrive(pasta,partnerBrandId){
  const q="'"+aspas(pasta)+"' in parents and appProperties has { key='creatorPartnerBrandId' and value='"+aspas(partnerBrandId)+"' } and trashed = false";
  const list=await drive('files',{q,fields:'files(id,name,mimeType,webViewLink,createdTime)',pageSize:'5',includeItemsFromAllDrives:'true',corpora:'allDrives'});
  return list.files?.[0]||null;
}
async function importarModeloComoDoc(bytes,{nome,pasta,partnerBrandId,templateId}){
  const boundary='alliance_'+Date.now().toString(36);
  const meta=Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({
    name:nome,mimeType:'application/vnd.google-apps.document',parents:[pasta],
    appProperties:{allianceOS:'creator-contract',creatorPartnerBrandId:String(partnerBrandId),creatorTemplateId:String(templateId)}
  })+'\r\n--'+boundary+'\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n');
  const fim=Buffer.from('\r\n--'+boundary+'--'),body=Buffer.concat([meta,bytes,fim]);
  const r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink,parents',{method:'POST',headers:{Authorization:'Bearer '+await token(),'Content-Type':'multipart/related; boundary='+boundary,'Content-Length':String(body.length)},body});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(j?.error?.message||'Falha ao criar contrato no Drive.'),{status:r.status});
  return j;
}
function dataContrato(){
  const parts=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'long',year:'numeric'}).formatToParts(new Date());
  const dia=parts.find(x=>x.type==='day')?.value||'',mes=parts.find(x=>x.type==='month')?.value||'',ano=parts.find(x=>x.type==='year')?.value||'';
  const num=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date());
  const dd=num.find(x=>x.type==='day')?.value||'',mm=num.find(x=>x.type==='month')?.value||'',yyyy=num.find(x=>x.type==='year')?.value||'';
  return {lower:dia+' de '+mes+' de '+ano,capital:dia+' de '+mes.charAt(0).toUpperCase()+mes.slice(1)+' de '+ano,iso:yyyy+'-'+mm+'-'+dd};
}
function somarMeses(iso,meses){const [y,m,d]=iso.split('-').map(Number),x=new Date(Date.UTC(y,m-1,d));x.setUTCMonth(x.getUTCMonth()+Number(meses||6));return x.toISOString().slice(0,10)}
function tipoContrato(tipos=[]){if(tipos.includes('prescritor'))return'prescritor';if(tipos.includes('ugc'))return'ugc';if(tipos.includes('creator'))return'creator';return null}
function substituicoesContrato(tipo,p){
  const data=dataContrato(),nome=String(p.nome_completo||'').trim(),cpf=String(p.cpf||'').trim(),cnpj=String(p.cnpj||'').trim(),razao=String(p.razao_social||nome).trim(),endereco=String(p.endereco||'').trim();
  if(tipo==='prescritor')return[
    ['por NOME, inscrita no CPF sob o n. CPF, residente no endereço: ENDEREÇO','por '+nome+', inscrita no CPF sob o n. '+cpf+', residente no endereço: '+endereco],
    ['por NOME, inscrita no CPF sob o n. CPF','por '+nome+', inscrita no CPF sob o n. '+cpf],
    ['residente no endereço: ENDEREÇO','residente no endereço: '+endereco],
    ['NOME CONTRATADO',nome],['CPF sob o nº CPF','CPF sob o nº '+cpf],['Belo Horizonte/MG, data','Belo Horizonte/MG, '+data.lower]
  ];
  if(tipo==='ugc')return[
    ['CONTRATADA: xxxxx, inscrita no CPF sob o n. xxxxxx,  residente no endereço: xxxxx.','CONTRATADA: '+nome+', inscrita no CPF sob o n. '+cpf+', residente no endereço: '+endereco+'.'],
    ['CONTRATADA: xxxxx, inscrita no CPF sob o n. xxxxxx','CONTRATADA: '+nome+', inscrita no CPF sob o n. '+cpf],
    ['residente no endereço: xxxxx.','residente no endereço: '+endereco+'.'],
    ['NOME COMPLETO',nome],['CPF sob o nº XXXXXXXXX','CPF sob o nº '+cpf],['XX de setembro de 2026',data.lower]
  ];
  return[
    ['Rua [endereço completo]',endereco],['[RAZÃO SOCIAL]',razao],
    ['CNPJ sob nº XXXXXXXXX','CNPJ sob nº '+cnpj],['CNPJ: XXXXXXXXX','CNPJ: '+cnpj],
    ['CPF nº xxxxxxxxxxx','CPF nº '+cpf],['[Nome Completo do Autorizante]',nome],['[Nome completo]',nome],['[nome completo]',nome],
    ['[Número do CPF]',cpf],['[Endereço Completo]',endereco],['15 de Setembro de 2026',data.capital],['15 de setembro de 2026',data.lower]
  ];
}
async function preencherGoogleDoc(id,replacements){
  const requests=replacements.filter(([,to])=>String(to||'').trim()).map(([from,to])=>({replaceAllText:{containsText:{text:from,matchCase:true},replaceText:String(to)}}));
  const r=await fetch('https://docs.googleapis.com/v1/documents/'+encodeURIComponent(id)+':batchUpdate',{method:'POST',headers:{Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify({requests})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j?.error?.message||'Falha ao preencher contrato.'),{status:r.status});return j
}
function textoDoc(node,out=[]){if(!node||typeof node!=='object')return out;if(typeof node.content==='string')out.push(node.content);if(Array.isArray(node.content))node.content.forEach(x=>textoDoc(x,out));if(Array.isArray(node.body?.content))node.body.content.forEach(x=>textoDoc(x,out));if(Array.isArray(node.paragraph?.elements))node.paragraph.elements.forEach(x=>{if(x.textRun?.content)out.push(x.textRun.content)});if(Array.isArray(node.table?.tableRows))node.table.tableRows.forEach(x=>textoDoc(x,out));if(Array.isArray(node.tableCells))node.tableCells.forEach(x=>textoDoc(x,out));return out}
async function placeholdersRestantes(id,tipo){
  const r=await fetch('https://docs.googleapis.com/v1/documents/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+await token()}});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j?.error?.message||'Falha ao verificar contrato.'),{status:r.status});
  const txt=textoDoc(j).join(''),tokens=tipo==='prescritor'?['NOME CONTRATADO','ENDEREÇO','Belo Horizonte/MG, data']:tipo==='ugc'?['NOME COMPLETO','XXXXXXXXX','xxxxxx']:['[RAZÃO SOCIAL]','XXXXXXXXX','xxxxxxxxxxx','[Nome completo]','[Número do CPF]','[Endereço Completo]'];
  return tokens.filter(x=>txt.includes(x));
}
function contractTemplateB64(tipo){if(tipo==='prescritor')return prescritorTemplateB64;if(tipo==='ugc')return ugcTemplateB64;return creatorTemplateB64}
function xmlDecode(s){return String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&')}
function xmlEscape(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function replaceInParagraph(paragraph,replacements){
  const nodes=[...paragraph.matchAll(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g)];if(!nodes.length)return paragraph;
  const plain=nodes.map(m=>xmlDecode(m[2])).join('');let next=plain;
  for(const [from,to] of replacements)next=next.split(String(from)).join(String(to));
  if(next===plain)return paragraph;
  let first=true;
  return paragraph.replace(/<w:t([^>]*)>[\s\S]*?<\/w:t>/g,(m,attrs)=>{
    if(!first)return '<w:t'+attrs+'></w:t>';
    first=false;const a=/xml:space=/.test(attrs)?attrs:(attrs+' xml:space="preserve"');
    return '<w:t'+a+'>'+xmlEscape(next)+'</w:t>';
  });
}
function renderContractDocx(tipo,p){
  const zip=new PizZip(Buffer.from(contractTemplateB64(tipo),'base64')),replacements=substituicoesContrato(tipo,p);
  const xmlFiles=Object.keys(zip.files).filter(n=>/^word\/(document|header\d+|footer\d+)\.xml$/.test(n));
  let combined='';
  for(const name of xmlFiles){
    const file=zip.file(name);if(!file)continue;let xml=file.asText();
    xml=xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g,para=>replaceInParagraph(para,replacements));
    zip.file(name,xml);combined+='\n'+xmlDecode(xml.replace(/<[^>]+>/g,''));
  }
  const tokens=tipo==='prescritor'?['NOME CONTRATADO','Belo Horizonte/MG, data','residente no endereço: ENDEREÇO']:tipo==='ugc'?['NOME COMPLETO','CPF sob o nº XXXXXXXXX','residente no endereço: xxxxx']:['[RAZÃO SOCIAL]','CNPJ sob nº XXXXXXXXX','CPF nº xxxxxxxxxxx','[Nome completo]','[Número do CPF]','[Endereço Completo]'];
  const remaining=tokens.filter(t=>combined.includes(t));
  return {buffer:zip.generate({type:'nodebuffer',compression:'DEFLATE'}),remaining};
}
async function uploadPrivateContract(session,path,buffer){
  const conf=await cfg(),url=conf.url+'/storage/v1/object/creator-contracts/'+encodePath(path);
  const r=await fetch(url,{method:'POST',headers:{apikey:conf.anon,Authorization:session.authorization,'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','x-upsert':'false'},body:buffer});
  const txt=await r.text();if(!r.ok)throw Object.assign(Error('Falha ao salvar contrato: '+txt.slice(0,220)),{status:r.status});
  return path;
}
async function signPrivateContract(session,path,expiresIn=3600){
  const conf=await cfg(),url=conf.url+'/storage/v1/object/sign/creator-contracts/'+encodePath(path);
  const r=await fetch(url,{method:'POST',headers:{apikey:conf.anon,Authorization:session.authorization,'Content-Type':'application/json'},body:JSON.stringify({expiresIn})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j?.message||j?.error||'Falha ao abrir contrato.'),{status:r.status});
  const signed=j.signedURL||j.signedUrl;if(!signed)throw Error('Storage não retornou link assinado.');
  return /^https?:/.test(signed)?signed:conf.url+(signed.startsWith('/storage/v1')?'': '/storage/v1')+signed;
}
async function gerarContratoCreator(session,partnerBrandId,force=false){
  const links=await authRest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(partnerBrandId)+'&arquivado_em=is.null&select=*,partner:creator_partners(*)');
  const vinculo=links?.[0];if(!vinculo)throw Object.assign(Error('Parceiro não encontrado.'),{status:404});
  if(vinculo.status!=='aprovado'&&!force)throw Object.assign(Error('O parceiro precisa estar aprovado para gerar o contrato.'),{status:409});
  const tipo=tipoContrato(vinculo.tipos||[]);if(!tipo)throw Object.assign(Error('Defina o tipo do parceiro antes de gerar o contrato.'),{status:409});
  const p=vinculo.partner||{},faltam=[];if(!p.nome_completo)faltam.push('nome completo');if(!p.cpf)faltam.push('CPF');if(!p.endereco)faltam.push('endereço');if(tipo==='creator'&&!p.cnpj)faltam.push('CNPJ');if(tipo==='creator'&&!p.razao_social)faltam.push('razão social');if(faltam.length)throw Object.assign(Error('Faltam dados obrigatórios para o contrato: '+faltam.join(', ')+'.'),{status:409});
  const modelos=await authRest(session,'/rest/v1/creator_contract_templates?brand_id=eq.'+encodeURIComponent(vinculo.brand_id)+'&partner_type=eq.'+encodeURIComponent(tipo)+'&active=eq.true&select=*&limit=1');
  const modelo=modelos?.[0];if(!modelo)throw Object.assign(Error('Não existe modelo de contrato ativo para este tipo e marca.'),{status:409});
  const rows=await authRest(session,'/rest/v1/creator_contracts?partner_brand_id=eq.'+encodeURIComponent(partnerBrandId)+'&arquivado_em=is.null&select=*&order=criado_em.desc&limit=1');
  let contrato=rows?.[0]||null;
  if(contrato?.metadata?.storage_path&&!force)return{contract:contrato,reused:true};

  const {buffer,remaining}=renderContractDocx(tipo,p),geradoEm=new Date().toISOString(),data=dataContrato();
  const safe=String(p.nome_completo||'parceiro').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'parceiro';
  const path=vinculo.brand_id+'/'+partnerBrandId+'/'+Date.now()+'-'+safe+'-'+tipo+'.docx';
  await uploadPrivateContract(session,path,buffer);
  const metadata={...(contrato?.metadata||{}),generation_state:remaining.length?'generated_with_warning':'generated',storage_bucket:'creator-contracts',storage_path:path,template_drive_id:modelo.drive_template_id,template_name:modelo.name,model_type:tipo,generated_at:geradoEm,remaining_placeholders:remaining,versions:[...((contrato?.metadata?.versions)||[]),{storage_path:path,generated_at:geradoEm}]};
  const payload={documento_url:'storage://creator-contracts/'+path,inicio_em:data.iso,fim_em:somarMeses(data.iso,modelo.duration_months),metadata,atualizado_em:geradoEm,atualizado_por:session.user.id};
  if(contrato){const up=await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contrato.id),{method:'PATCH',prefer:'return=representation',body:payload});contrato=up?.[0]||{...contrato,...payload}}
  else{const up=await authRest(session,'/rest/v1/creator_contracts',{method:'POST',prefer:'return=representation',body:{partner_brand_id:partnerBrandId,status:'rascunho',provider:'autentique',...payload,criado_por:session.user.id}});contrato=up?.[0]}
  await authRest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(partnerBrandId),{method:'PATCH',prefer:'return=minimal',body:{proxima_acao:'Enviar contrato para assinatura',proxima_acao_em:null,atualizado_em:geradoEm,atualizado_por:session.user.id}});
  await authRest(session,'/rest/v1/creator_history',{method:'POST',prefer:'return=minimal',body:{partner_brand_id:partnerBrandId,evento:'contrato_gerado',descricao:'Contrato gerado automaticamente a partir do modelo '+modelo.name,origem:'automacao',actor_id:session.user.id,dados:{contract_id:contrato?.id,storage_path:path,template_drive_id:modelo.drive_template_id,model_type:tipo,remaining_placeholders:remaining}}});
  return{contract:contrato,created:true,warning:remaining.length?remaining:null}
}
async function contractUrl(session,contractId){
  const rows=await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contractId)+'&arquivado_em=is.null&select=id,metadata&limit=1');
  const c=rows?.[0],path=c?.metadata?.storage_path;if(!c||!path)throw Object.assign(Error('Contrato gerado não encontrado.'),{status:404});
  return signPrivateContract(session,path,3600);
}

export default async function handler(req,res){try{
  const healthUrl=new URL(req.url,'http://x');
  if(req.method==='GET'&&healthUrl.searchParams.get('contract_health')==='1'){
    try{
      const test=renderContractDocx('creator',{nome_completo:'Teste AllianceOS',cpf:'000.000.000-00',cnpj:'00.000.000/0000-00',razao_social:'Teste AllianceOS LTDA',endereco:'Endereço de teste'});
      return send(res,200,{ok:true,mode:'private_storage',template_ready:test.buffer.length>10000,remaining_placeholders:test.remaining});
    }catch(e){return send(res,200,{ok:false,mode:'private_storage',erro:String(e.message||e).slice(0,180)})}
  }
  const session=await requireAllianceUser(req);const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  if(req.method==='POST'&&body.action==='copy_storage'){const arquivo=await copiarStorage(body,session);return send(res,200,{ok:true,arquivo})}
  if(req.method==='POST'&&body.action==='generate_creator_contract'){const id=String(body.partner_brand_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'partner_brand_id inválido'});const result=await gerarContratoCreator(session,id,body.force===true);return send(res,200,{ok:true,...result})}
  if(req.method==='POST'&&body.action==='get_creator_contract_url'){const id=String(body.contract_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'contract_id inválido'});return send(res,200,{ok:true,url:await contractUrl(session,id)})}
  if(req.method==='POST'){const nome=String(body.marca||'Botanika'),raw=String(body.drive_pasta||body.pasta||'').trim(),limpo=raw.replace(/^https?:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\//,'').split(/[?#]/)[0].trim();if(!/^[A-Za-z0-9_-]{10,}$/.test(limpo))return send(res,400,{erro:'esse id não parece um id de pasta do Drive'});await salvarPasta(nome,limpo);return send(res,200,{ok:true,ligado:true,marca:nome,raiz:limpo,pasta:limpo})}
  if(req.method!=='GET')return send(res,405,{erro:'método não permitido'});
  const q=Object.fromEntries(new URL(req.url,'http://x').searchParams),nome=q.marca||'Botanika',m=await marca(nome);
  if(q.diagnostico==='1')return send(res,200,{marca:m.marca,conta_servico_configurada:!!conta(),pasta_configurada:!!m.drive_pasta});
  if(!m.drive_pasta)return send(res,200,{ligado:false,marca:m.marca,erro:`A ${m.marca} ainda não tem pasta do Drive ligada.`});
  if(!conta())return send(res,200,{ligado:false,semChave:true,marca:m.marca,erro:'A AllianceOS ainda não tem a chave da conta de serviço do Google.'});
  const raiz=m.drive_pasta,pasta=q.pasta&&q.pasta!==raiz?q.pasta:raiz;if(pasta!==raiz&&!(await dentroDe(pasta,raiz)))return send(res,403,{erro:'essa pasta não é desta marca'});
  const busca=String(q.q||'').trim().slice(0,80),filtro=busca?`name contains '${aspas(busca)}' and trashed = false`:`'${aspas(pasta)}' in parents and trashed = false`;
  const lista=await drive('files',{q:filtro,fields:`nextPageToken, files(${CAMPOS})`,orderBy:'folder,name_natural',pageSize:'100',includeItemsFromAllDrives:'true',corpora:'allDrives',pageToken:q.pagina||null});
  const trilha=[];if(pasta!==raiz){let atual=pasta;for(let i=0;i<18;i++){const f=await drive(`files/${encodeURIComponent(atual)}`,{fields:'id,name,parents'});trilha.unshift({id:f.id,nome:f.name});if(f.id===raiz||!(f.parents||[]).length||(f.parents||[]).includes(raiz))break;atual=f.parents[0]}}
  const arquivos=(lista.files||[]).map(f=>({id:f.id,nome:f.name,tipo:f.mimeType,pasta:f.mimeType===PASTA,link:f.webViewLink||`https://drive.google.com/file/d/${f.id}/view`,icone:f.iconLink||'',miniatura:f.thumbnailLink||'',em:f.modifiedTime||'',tamanho:f.size?+f.size:null,dono:f.owners?.[0]?.displayName||''}));
  return send(res,200,{ligado:true,marca:m.marca,raiz,pasta,trilha,arquivos,proxima:lista.nextPageToken||null,busca:busca||null})
}catch(e){if(e?.status===401||e?.status===403)return authError(res,e);if(e.faltaChave)return send(res,200,{ligado:false,semChave:true,erro:'A AllianceOS ainda não tem a chave da conta de serviço do Google.'});console.error('[drive]',e);const msg=String(e.message||e).slice(0,300);if(/File not found|notFound|insufficient|permission/i.test(msg))return send(res,e.status===403?403:200,{ligado:false,semAcesso:true,erro:'O Drive não encontra ou não permite gravar nesta pasta. Confira o acesso da conta de serviço.'});return send(res,e.status||502,{erro:msg})}}
