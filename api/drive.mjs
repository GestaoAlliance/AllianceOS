import {requireAllianceUser,authError} from './_lib/auth.mjs';
import {createSign} from 'node:crypto';
import PizZip from 'pizzip';
import PDFDocument from 'pdfkit';
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

function cleanWordText(value){
  let s=xmlDecode(String(value||''));
  s=s.replace(/<w:tab\s*\/>/gi,'\t').replace(/<w:br(?:\s+[^>]*)?\s*\/>/gi,'\n');
  s=s.replace(/<[^>]+>/g,'');
  s=s.replace(/\b(?:w|xml):[A-Za-z][\w:.-]*="[^"]*"/g,'');
  s=s.replace(/\s*\/>/g,' ');
  s=s.replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n');
  return s;
}
function docxRuns(paragraph){
  const runs=[];
  for(const m of paragraph.matchAll(/<w:r\b[\s\S]*?<\/w:r>/g)){
    const xml=m[0],texts=[...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(x=>cleanWordText(x[1]));
    const tabs=(xml.match(/<w:tab\s*\/>/g)||[]).length;
    const breaks=(xml.match(/<w:br(?:\s+[^>]*)?\s*\/>/g)||[]).length;
    let text=cleanWordText(texts.join(''));
    if(tabs)text+=Array(tabs).fill('\t').join('');
    if(breaks)text+=Array(breaks).fill('\n').join('');
    text=cleanWordText(text);
    if(!text)continue;
    const sizeMatch=xml.match(/<w:sz\s+w:val="(\d+)"/);
    runs.push({
      text,
      bold:/<w:b(?:\s+w:val="(?:1|true)")?\s*\/>|<w:b>/.test(xml),
      italic:/<w:i(?:\s+w:val="(?:1|true)")?\s*\/>|<w:i>/.test(xml),
      underline:/<w:u\s+w:val="(?!none)[^"]+"/.test(xml),
      size:sizeMatch?Math.max(8,Math.min(18,Number(sizeMatch[1])/2)):null
    });
  }
  if(!runs.length){
    const text=cleanWordText([...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(x=>x[1]).join(''));
    if(text)runs.push({text,bold:false,italic:false,underline:false,size:null});
  }
  return runs;
}
function paragraphPdfMeta(paragraph,text){
  const jc=paragraph.match(/<w:jc\s+w:val="([^"]+)"/)?.[1]||'left';
  const align=jc==='center'?'center':jc==='right'?'right':(jc==='both'||jc==='distribute')?'justify':'left';
  const after=Number(paragraph.match(/<w:spacing[^>]*w:after="(\d+)"/)?.[1]||0)/20;
  const before=Number(paragraph.match(/<w:spacing[^>]*w:before="(\d+)"/)?.[1]||0)/20;
  const left=Number(paragraph.match(/<w:ind[^>]*w:left="(\d+)"/)?.[1]||0)/20;
  const first=Number(paragraph.match(/<w:ind[^>]*w:firstLine="(\d+)"/)?.[1]||0)/20;
  const style=paragraph.match(/<w:pStyle\s+w:val="([^"]+)"/)?.[1]||'';
  const normalized=String(text||'').trim();
  const heading=/^(CONTRATO|TERMO|ANEXO|CLÁUSULA|CLAUSULA)\b/i.test(normalized)
    ||(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 .,:;()\-/]{8,}$/.test(normalized)&&normalized.length<=120)
    ||/title|heading|titulo|título/i.test(style);
  const pageBreak=/<w:br\s+w:type="page"\s*\/>/.test(paragraph)||/<w:pageBreakBefore\s*\/>/.test(paragraph);
  return {align,after:Math.max(0,Math.min(12,after)),before:Math.max(0,Math.min(12,before)),left:Math.max(0,Math.min(72,left)),first:Math.max(0,Math.min(36,first)),heading,pageBreak};
}
function docxPdfBlocks(docxBuffer){
  const zip=new PizZip(docxBuffer),file=zip.file('word/document.xml');
  if(!file)throw Error('O modelo não contém document.xml.');
  const xml=file.asText(),body=xml.match(/<w:body\b[\s\S]*?<\/w:body>/)?.[0]||xml;
  const blocks=[];
  for(const m of body.matchAll(/<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/g)){
    const raw=m[0];
    if(raw.startsWith('<w:tbl')){
      const rows=[];
      for(const rm of raw.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)){
        const cells=[];
        for(const cm of rm[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)){
          const text=cleanWordText([...cm[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(x=>x[1]).join(' ')).replace(/\s+/g,' ').trim();
          cells.push(text);
        }
        if(cells.length)rows.push(cells);
      }
      if(rows.length)blocks.push({type:'table',rows});
      continue;
    }
    const runs=docxRuns(raw),text=cleanWordText(runs.map(r=>r.text).join(''));
    blocks.push({type:'p',runs:runs.map(r=>({...r,text:cleanWordText(r.text)})).filter(r=>r.text),text,meta:paragraphPdfMeta(raw,text)});
  }
  return blocks;
}
function pdfFont(run,heading){
  const b=heading||run?.bold,i=run?.italic;
  if(b&&i)return'Times-BoldItalic';
  if(b)return'Times-Bold';
  if(i)return'Times-Italic';
  return'Times-Roman';
}
function renderContractSignature(doc,{party={},tipo='creator',contentWidth,ensure}){
  ensure(205);
  const x=58,gap=24,cw=(contentWidth-gap)/2,y=doc.y+8,right=x+cw+gap;
  const partnerEntity=tipo==='creator'?(party.razao_social||party.nome_completo||'CONTRATADA'):(party.nome_completo||'CONTRATADA');
  const partnerDoc=tipo==='creator'?(party.cnpj?('CNPJ: '+party.cnpj):''):(party.cpf?('CPF: '+party.cpf):'');
  doc.fillColor('#111').font('Times-Bold').fontSize(10.2).text('CONTRATANTE',x,y,{width:cw});
  doc.text('CONTRATADA',right,y,{width:cw});
  let ly=y+20,ry=y+20;
  doc.font('Times-Roman').fontSize(9.8).text('BOTANIKA SAUDE NATURAL LTDA',x,ly,{width:cw});ly=doc.y+2;
  doc.text(partnerEntity,right,ry,{width:cw});ry=doc.y+2;
  doc.text('CNPJ: 65.100.830/0001-36',x,ly,{width:cw});ly=doc.y+2;
  if(partnerDoc){doc.text(partnerDoc,right,ry,{width:cw});ry=doc.y+2}
  doc.text('Representante legal:',x,ly,{width:cw});ly=doc.y+18;
  doc.text('Representante legal: '+(party.nome_completo||''),right,ry,{width:cw});ry=doc.y+18;
  doc.moveTo(x,ly).lineTo(x+cw-10,ly).lineWidth(.6).strokeColor('#555').stroke();
  doc.moveTo(right,ry).lineTo(right+cw-10,ry).stroke();
  const signBottom=Math.max(ly,ry)+32;
  doc.y=signBottom;
  doc.font('Times-Bold').fontSize(9.8).text('TESTEMUNHA 1',x,doc.y,{width:cw});
  const wy=doc.y;
  doc.text('TESTEMUNHA 2',right,wy,{width:cw});
  const nameY=wy+22;
  doc.font('Times-Roman').fontSize(9.5).text('Nome: ____________________________',x,nameY,{width:cw});
  doc.text('Nome: ____________________________',right,nameY,{width:cw});
  const cpfY=nameY+24;
  doc.text('CPF: _____________________________',x,cpfY,{width:cw});
  doc.text('CPF: _____________________________',right,cpfY,{width:cw});
  doc.y=cpfY+42;
}
function renderContractPdf(docxBuffer,{title='Contrato',party={},tipo='creator'}={}){
  return new Promise((resolve,reject)=>{
    try{
      const chunks=[];
      const doc=new PDFDocument({size:'A4',margins:{top:54,right:58,bottom:58,left:58},bufferPages:true,info:{Title:title,Author:'AllianceOS',Creator:'AllianceOS'}});
      doc.on('data',x=>chunks.push(x));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
      const blocks=docxPdfBlocks(docxBuffer),pageWidth=595.28,contentWidth=pageWidth-116;
      const ensure=h=>{if(doc.y+h>doc.page.height-66)doc.addPage()};
      let blankStreak=0,skippingSignatureTail=false;
      for(const block of blocks){
        if(block.type==='table'){
          blankStreak=0;
          if(skippingSignatureTail)continue;
          const cols=Math.max(1,...block.rows.map(r=>r.length)),cw=contentWidth/cols;
          for(const row of block.rows){
            const heights=row.map(cell=>doc.font('Times-Roman').fontSize(9.5).heightOfString(cell||' ',{width:cw-12,lineGap:1}));
            const rh=Math.max(24,...heights.map(h=>h+12));ensure(rh+4);const y=doc.y;
            row.forEach((cell,i)=>{const x=58+i*cw;doc.lineWidth(.45).strokeColor('#b9b9b9').rect(x,y,cw,rh).stroke();doc.fillColor('#111').font('Times-Roman').fontSize(9.5).text(cell||'',x+6,y+6,{width:cw-12,height:rh-12,lineGap:1});});
            doc.y=y+rh;
          }
          doc.moveDown(.6);continue;
        }
        const {runs,text,meta}=block,trimmed=String(text||'').trim();
        if(skippingSignatureTail){
          if(/^(TERMO|ANEXO|CLÁUSULA|CLAUSULA)\b/i.test(trimmed))skippingSignatureTail=false;
          else continue;
        }
        if(/^CONTRATANTE\b/i.test(trimmed)&&/CONTRATADA/i.test(trimmed)){
          renderContractSignature(doc,{party,tipo,contentWidth,ensure});
          skippingSignatureTail=true;blankStreak=0;continue;
        }
        if(meta.pageBreak&&doc.y>85&&trimmed)doc.addPage();
        if(meta.before&&trimmed)doc.y+=meta.before;
        if(!trimmed){
          blankStreak++;
          if(blankStreak===1)doc.moveDown(.28);
          continue;
        }
        blankStreak=0;
        const heading=meta.heading,baseSize=heading?11.5:10.2;
        const estimated=doc.font(heading?'Times-Bold':'Times-Roman').fontSize(baseSize).heightOfString(trimmed.replace(/\t/g,'    '),{width:contentWidth-meta.left,lineGap:1.5,align:meta.align});
        ensure(Math.min(estimated+meta.after+6,220));
        const startX=58+meta.left,width=contentWidth-meta.left;
        let first=true;
        for(let i=0;i<runs.length;i++){
          const run=runs[i],last=i===runs.length-1,size=run.size||baseSize,runText=cleanWordText(run.text).replace(/\t/g,'    ');
          if(!runText)continue;
          doc.fillColor('#111').font(pdfFont(run,heading)).fontSize(size);
          const opts={continued:!last,width,align:meta.align,lineGap:1.4,paragraphGap:last?Math.max(3,meta.after||4):0,indent:first?meta.first:0};
          if(run.underline)opts.underline=true;
          doc.text(runText,first?startX:undefined,undefined,opts);
          first=false;
        }
        if(first)doc.font(heading?'Times-Bold':'Times-Roman').fontSize(baseSize).text(trimmed,startX,undefined,{width,align:meta.align,lineGap:1.4,paragraphGap:Math.max(3,meta.after||4)});
      }
      const range=doc.bufferedPageRange(),total=range.count;
      for(let i=range.start;i<range.start+total;i++){
        doc.switchToPage(i);
        const footerY=doc.page.height-doc.page.margins.bottom-15;
        doc.fillColor('#777').font('Helvetica').fontSize(7.5).text('Página '+(i-range.start+1)+' de '+total,58,footerY,{width:contentWidth,align:'center',lineBreak:false});
      }
      doc.end();
    }catch(e){reject(e)}
  });
}
async function downloadPrivateContract(session,path){
  const conf=await cfg(),url=conf.url+'/storage/v1/object/authenticated/creator-contracts/'+encodePath(path);
  const r=await fetch(url,{headers:{apikey:conf.anon,Authorization:session.authorization},cache:'no-store'});
  if(!r.ok){const txt=await r.text().catch(()=>(''));throw Object.assign(Error('Falha ao ler contrato: '+txt.slice(0,180)),{status:r.status})}
  return Buffer.from(await r.arrayBuffer());
}
async function uploadPrivateContract(session,path,buffer,mime='application/pdf'){
  const conf=await cfg(),url=conf.url+'/storage/v1/object/creator-contracts/'+encodePath(path);
  const sendWith=type=>fetch(url,{method:'POST',headers:{apikey:conf.anon,Authorization:session.authorization,'Content-Type':type,'x-upsert':'false'},body:buffer});
  let r=await sendWith(mime),txt=await r.text();
  if(!r.ok&&mime==='application/pdf'&&/mime|type|not allowed|invalid/i.test(txt||'')){
    r=await sendWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    txt=await r.text();
  }
  if(!r.ok)throw Object.assign(Error('Falha ao salvar contrato: '+String(txt||'').slice(0,220)),{status:r.status});
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
  if(contrato?.metadata?.storage_path_pdf&&Number(contrato?.metadata?.pdf_renderer_version||0)>=2&&!force)return{contract:contrato,reused:true};

  const rendered=renderContractDocx(tipo,p),geradoEm=new Date().toISOString(),data=dataContrato();
  const pdfBuffer=await renderContractPdf(rendered.buffer,{title:modelo.name+' - '+p.nome_completo,party:p,tipo});
  const safe=String(p.nome_completo||'parceiro').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'parceiro';
  const base=vinculo.brand_id+'/'+partnerBrandId+'/'+Date.now()+'-'+safe+'-'+tipo;
  const docxPath=base+'.docx',pdfPath=base+'.pdf';
  await uploadPrivateContract(session,docxPath,rendered.buffer,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  await uploadPrivateContract(session,pdfPath,pdfBuffer,'application/pdf');
  const metadata={...(contrato?.metadata||{}),generation_state:rendered.remaining.length?'generated_with_warning':'generated',storage_bucket:'creator-contracts',storage_path:pdfPath,storage_path_pdf:pdfPath,storage_path_docx:docxPath,pdf_bytes:pdfBuffer.length,pdf_renderer_version:2,template_drive_id:modelo.drive_template_id,template_name:modelo.name,model_type:tipo,generated_at:geradoEm,remaining_placeholders:rendered.remaining,versions:[...((contrato?.metadata?.versions)||[]),{storage_path_pdf:pdfPath,storage_path_docx:docxPath,generated_at:geradoEm}]};
  const payload={documento_url:'storage://creator-contracts/'+pdfPath,inicio_em:data.iso,fim_em:somarMeses(data.iso,modelo.duration_months),metadata,atualizado_em:geradoEm,atualizado_por:session.user.id};
  if(contrato){const up=await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contrato.id),{method:'PATCH',prefer:'return=representation',body:payload});contrato=up?.[0]||{...contrato,...payload}}
  else{const up=await authRest(session,'/rest/v1/creator_contracts',{method:'POST',prefer:'return=representation',body:{partner_brand_id:partnerBrandId,status:'rascunho',provider:'autentique',...payload,criado_por:session.user.id}});contrato=up?.[0]}
  await authRest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(partnerBrandId),{method:'PATCH',prefer:'return=minimal',body:{proxima_acao:'Enviar contrato para assinatura',proxima_acao_em:null,atualizado_em:geradoEm,atualizado_por:session.user.id}});
  await authRest(session,'/rest/v1/creator_history',{method:'POST',prefer:'return=minimal',body:{partner_brand_id:partnerBrandId,evento:'contrato_gerado',descricao:'Contrato PDF gerado automaticamente a partir do modelo '+modelo.name,origem:'automacao',actor_id:session.user.id,dados:{contract_id:contrato?.id,storage_path_pdf:pdfPath,storage_path_docx:docxPath,template_drive_id:modelo.drive_template_id,model_type:tipo,remaining_placeholders:rendered.remaining}}});
  return{contract:contrato,created:true,format:'pdf',warning:rendered.remaining.length?rendered.remaining:null}
}
async function contractUrl(session,contractId){
  let rows=await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contractId)+'&arquivado_em=is.null&select=id,partner_brand_id,metadata&limit=1');
  let contract=rows?.[0];if(!contract)throw Object.assign(Error('Contrato gerado não encontrado.'),{status:404});
  if(!contract.metadata?.storage_path_pdf||Number(contract.metadata?.pdf_renderer_version||0)<2){
    const generated=await gerarContratoCreator(session,contract.partner_brand_id,true);
    contract=generated.contract;
  }
  const path=contract?.metadata?.storage_path_pdf||contract?.metadata?.storage_path;
  if(!path)throw Object.assign(Error('PDF do contrato não encontrado.'),{status:404});
  return signPrivateContract(session,path,3600);
}

async function contractPdfBuffer(session,contractId){
  let rows=await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contractId)+'&arquivado_em=is.null&select=id,partner_brand_id,metadata&limit=1');
  let contract=rows?.[0];if(!contract)throw Object.assign(Error('Contrato não encontrado.'),{status:404});
  if(!contract.metadata?.storage_path_pdf||Number(contract.metadata?.pdf_renderer_version||0)<2){
    const generated=await gerarContratoCreator(session,contract.partner_brand_id,true);
    contract=generated.contract;
  }
  const path=contract?.metadata?.storage_path_pdf||contract?.metadata?.storage_path;
  if(!path)throw Object.assign(Error('PDF do contrato não encontrado.'),{status:404});
  return {contract,path,buffer:await downloadPrivateContract(session,path)};
}
async function autentiqueToken(session,brandId){
  const env=String(process.env.AUTENTIQUE_API_TOKEN||'').trim();
  if(env)return env;
  if(!brandId)throw Object.assign(Error('Selecione uma marca para usar a Autentique.'),{status:400,code:'AUTENTIQUE_BRAND_REQUIRED'});
  const entries=await authRest(session,'/rest/v1/rpc/access_center_list',{method:'POST',body:{p_brand_id:brandId}});
  const list=Array.isArray(entries)?entries:(Array.isArray(entries?.entries)?entries.entries:[]);
  const entry=list.find(e=>/autentique/i.test(String(e?.name||'')));
  const secret=(entry?.secrets||[]).find(s=>/api\\s*token|api\\s*key|token|chave/i.test(String(s?.label||'')+' '+String(s?.kind||'')));
  if(!secret?.id)throw Object.assign(Error('Cadastre a credencial “API Token” no acesso Autentique da Central de Acessos.'),{status:503,code:'AUTENTIQUE_NOT_CONFIGURED'});
  const value=await authRest(session,'/rest/v1/rpc/access_center_reveal_secret',{method:'POST',body:{p_secret_id:secret.id}});
  const token=String(value??'').replace(/^"|"$/g,'').trim();
  if(!token)throw Object.assign(Error('A credencial “API Token” da Autentique está vazia.'),{status:503,code:'AUTENTIQUE_NOT_CONFIGURED'});
  return token;
}
function autentiqueErrorMessage(j,fallback='Erro na Autentique'){
  const errors=Array.isArray(j?.errors)?j.errors:[];
  const parts=[];
  for(const e of errors){
    if(e?.message)parts.push(String(e.message));
    const validation=e?.extensions?.validation;
    if(validation&&typeof validation==='object'){
      for(const [field,value] of Object.entries(validation)){
        const messages=Array.isArray(value)?value:[value];
        for(const message of messages)if(message)parts.push(field+': '+String(message));
      }
    }
  }
  return [...new Set(parts)].join(' · ')||fallback;
}
async function autentiqueJson(token,query,variables={}){
  const r=await fetch('https://api.autentique.com.br/v2/graphql',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({query,variables})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(autentiqueErrorMessage(j,'Autentique HTTP '+r.status)),{status:r.status||502});
  if(j.errors?.length)throw Object.assign(Error(autentiqueErrorMessage(j,'A Autentique recusou a operação.')),{status:422});
  return j.data||{};
}
async function autentiqueUpload(token,query,variables,pdfBuffer,filename){
  const form=new FormData();
  form.append('operations',JSON.stringify({query,variables:{...variables,file:null}}));
  form.append('map',JSON.stringify({file:['variables.file']}));
  form.append('file',new Blob([pdfBuffer],{type:'application/pdf'}),filename);
  const r=await fetch('https://api.autentique.com.br/v2/graphql',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(autentiqueErrorMessage(j,'Autentique HTTP '+r.status)),{status:r.status||502});
  if(j.errors?.length)throw Object.assign(Error(autentiqueErrorMessage(j,'A Autentique recusou o documento.')),{status:422});
  return j.data||{};
}
async function autentiqueDocument(token,id){
  const safe=JSON.stringify(String(id));
  const data=await autentiqueJson(token,'query { document(id: '+safe+') { id name created_at files { original signed pades } signatures { public_id name email delivery_method link { short_link } viewed { created_at } signed { created_at } rejected { created_at } } } }');
  return data.document;
}
async function sendContractAutentique(session,contractId,forceEmail=false){
  const {contract,pdfBuffer}=await contractPdfBuffer(session,contractId);
  const previousDelivery=String(contract.metadata?.autentique?.delivery_method||'');
  const alreadyEmail=previousDelivery==='DELIVERY_METHOD_EMAIL'||contract.metadata?.autentique?.email_dispatched_by_autentique===true;
  if(contract.provider_document_id&&alreadyEmail&&!forceEmail)return{contract,reused:true,signature_url:contract.metadata?.autentique?.signature_url||null,email_dispatched:true};

  const links=await authRest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(contract.partner_brand_id)+'&arquivado_em=is.null&select=*,partner:creator_partners(*)&limit=1');
  const link=links?.[0],partner=link?.partner||{};
  if(!link)throw Object.assign(Error('Parceiro do contrato não encontrado.'),{status:404});
  if(!partner.email)throw Object.assign(Error('Preencha o e-mail do parceiro antes de enviar para assinatura.'),{status:409});

  const token=await autentiqueToken(session,link.brand_id);
  const me=(await autentiqueJson(token,'query { me { id name email organization { id name } } }')).me;
  if(!me?.email)throw Error('A conta da Autentique não retornou o e-mail do titular.');

  const signers=[];
  if(String(me.email).toLowerCase()!==String(partner.email).toLowerCase()){
    signers.push({name:me.name||'Alliance',email:me.email,delivery_method:'DELIVERY_METHOD_LINK',action:'SIGN'});
  }
  // For e-mail signers, Autentique sends the signature request automatically.
  // Do not use DELIVERY_METHOD_LINK here: that mode only generates a link and does not send it.
  // Para entrega por e-mail, a Autentique espera o signatário identificado pelo e-mail.
  // O nome é resolvido pela própria Autentique/conta e não deve ser enviado junto
  // no modo padrão de DELIVERY_METHOD_EMAIL.
  signers.push({email:partner.email,action:'SIGN'});

  const mutation='mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) { createDocument(document:$document, signers:$signers, file:$file) { id name created_at signatures { public_id name email delivery_method link { short_link } user { id name email } } } }';
  const created=(await autentiqueUpload(token,mutation,{document:{name:'Contrato - '+(partner.nome_completo||'Parceiro'),sortable:true,refusable:true,locale:{country:'BR',language:'pt-BR',timezone:'America/Sao_Paulo'}},signers},pdfBuffer,'contrato-'+String(partner.nome_completo||'parceiro').replace(/[^a-zA-Z0-9._-]+/g,'-')+'.pdf')).createDocument;
  if(!created?.id)throw Error('A Autentique não retornou o ID do documento.');

  if(signers.length>1){
    try{await autentiqueJson(token,'mutation { signDocument(id: '+JSON.stringify(created.id)+') }')}catch(e){console.warn('[autentique] assinatura do titular não concluída automaticamente',e?.message||e)}
  }

  let remote=await autentiqueDocument(token,created.id);
  let partnerSignature=(remote?.signatures||[]).find(s=>String(s.email||'').toLowerCase()===String(partner.email).toLowerCase())
    ||(remote?.signatures||[]).find(s=>String(s.name||'').trim().toLowerCase()===String(partner.nome_completo||'').trim().toLowerCase());
  if(!partnerSignature)throw Error('A Autentique criou o documento, mas não retornou o signatário do parceiro.');

  let signatureUrl=partnerSignature.link?.short_link||null;
  if(!signatureUrl){
    const linkData=await autentiqueJson(token,'mutation { createLinkToSignature(public_id: '+JSON.stringify(partnerSignature.public_id)+') { short_link } }');
    signatureUrl=linkData.createLinkToSignature?.short_link||null;
  }
  if(!signatureUrl)throw Error('Não foi possível gerar o link de assinatura.');

  const now=new Date().toISOString(),metadata={...(contract.metadata||{}),autentique:{...(contract.metadata?.autentique||{}),previous_document_id:contract.provider_document_id||contract.metadata?.autentique?.document_id||null,document_id:created.id,partner_signature_public_id:partnerSignature.public_id,signature_url:signatureUrl,delivery_method:partnerSignature.delivery_method||'DELIVERY_METHOD_EMAIL',delivery_email:partner.email,email_dispatched_by_autentique:true,owner_email:me.email,organization_id:me.organization?.id||null,organization_name:me.organization?.name||null,sent_at:now}};
  const updated=(await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contract.id),{method:'PATCH',prefer:'return=representation',body:{provider:'autentique',provider_document_id:created.id,status:'aguardando_assinatura',enviado_em:now,metadata,atualizado_em:now,atualizado_por:session.user.id}}))?.[0];
  await authRest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(contract.partner_brand_id),{method:'PATCH',prefer:'return=minimal',body:{status:'aguardando_assinatura',proxima_acao:'Cobrar assinatura do contrato',proxima_acao_em:new Date(Date.now()+24*3600e3).toISOString(),atualizado_em:now,atualizado_por:session.user.id}});
  await authRest(session,'/rest/v1/creator_history',{method:'POST',prefer:'return=minimal',body:{partner_brand_id:contract.partner_brand_id,evento:'contrato_enviado_autentique',descricao:'Contrato PDF enviado para a Autentique. A solicitação de assinatura foi enviada por e-mail ao parceiro; o link foi mantido como backup interno.',origem:'automacao',actor_id:session.user.id,dados:{contract_id:contract.id,autentique_document_id:created.id}}});
  return{contract:updated||{...contract,provider_document_id:created.id,status:'aguardando_assinatura',enviado_em:now,metadata},signature_url:signatureUrl,created:true};
}
async function refreshContractAutentique(session,contractId){
  const rows=await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contractId)+'&arquivado_em=is.null&select=*&limit=1');
  const contract=rows?.[0];if(!contract)throw Object.assign(Error('Contrato não encontrado.'),{status:404});
  if(!contract.provider_document_id)throw Object.assign(Error('Este contrato ainda não foi enviado para a Autentique.'),{status:409});
  const links=await authRest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(contract.partner_brand_id)+'&arquivado_em=is.null&select=brand_id&limit=1');
  const brandId=links?.[0]?.brand_id;if(!brandId)throw Object.assign(Error('Marca do parceiro não encontrada.'),{status:404});
  const token=await autentiqueToken(session,brandId);
  const remote=await autentiqueDocument(token,contract.provider_document_id);
  if(!remote)throw Error('Documento não encontrado na Autentique.');

  const sigId=contract.metadata?.autentique?.partner_signature_public_id;
  const partnerSig=(remote.signatures||[]).find(s=>s.public_id===sigId)||(remote.signatures||[]).find(s=>s.link?.short_link===contract.metadata?.autentique?.signature_url);
  const now=new Date().toISOString();
  let status='aguardando_assinatura',partnerStatus='aguardando_assinatura',signedAt=null,nextAction='Cobrar assinatura do contrato';
  if(partnerSig?.rejected?.created_at){status='recusado';partnerStatus='acompanhamento';nextAction='Revisar recusa do contrato'}
  else if(partnerSig?.signed?.created_at){status='assinado';partnerStatus='contrato_assinado';signedAt=partnerSig.signed.created_at;nextAction='Preparar envio de produtos'}

  const metadata={...(contract.metadata||{}),autentique:{...(contract.metadata?.autentique||{}),last_sync_at:now,viewed_at:partnerSig?.viewed?.created_at||null,signed_at:partnerSig?.signed?.created_at||null,rejected_at:partnerSig?.rejected?.created_at||null,signed_file_url:remote.files?.signed||null,pades_file_url:remote.files?.pades||null,original_file_url:remote.files?.original||null}};
  const changed=status!==contract.status;
  const updated=(await authRest(session,'/rest/v1/creator_contracts?id=eq.'+encodeURIComponent(contract.id),{method:'PATCH',prefer:'return=representation',body:{status,assinado_em:signedAt||contract.assinado_em||null,metadata,atualizado_em:now,atualizado_por:session.user.id}}))?.[0];
  if(changed){
    await authRest(session,'/rest/v1/creator_partner_brands?id=eq.'+encodeURIComponent(contract.partner_brand_id),{method:'PATCH',prefer:'return=minimal',body:{status:partnerStatus,proxima_acao:nextAction,proxima_acao_em:null,atualizado_em:now,atualizado_por:session.user.id}});
    await authRest(session,'/rest/v1/creator_history',{method:'POST',prefer:'return=minimal',body:{partner_brand_id:contract.partner_brand_id,evento:status==='assinado'?'contrato_assinado':status==='recusado'?'contrato_recusado':'contrato_atualizado',descricao:status==='assinado'?'Contrato assinado na Autentique.':status==='recusado'?'Contrato recusado na Autentique.':'Status do contrato atualizado.',origem:'automacao',actor_id:session.user.id,dados:{contract_id:contract.id,autentique_document_id:contract.provider_document_id,status}}});
  }
  return{contract:updated||{...contract,status,metadata},remote_status:status,signature_url:contract.metadata?.autentique?.signature_url||null,signed_file_url:remote.files?.signed||null};
}

export default async function handler(req,res){try{
  const healthUrl=new URL(req.url,'http://x');
  if(req.method==='GET'&&healthUrl.searchParams.get('contract_health')==='1'){
    try{
      const test=renderContractDocx('creator',{nome_completo:'Teste AllianceOS',cpf:'000.000.000-00',cnpj:'00.000.000/0000-00',razao_social:'Teste AllianceOS LTDA',endereco:'Endereço de teste'});
      const pdf=await renderContractPdf(test.buffer,{title:'Contrato teste AllianceOS',party:{nome_completo:'Teste AllianceOS',cpf:'000.000.000-00',cnpj:'00.000.000/0000-00',razao_social:'Teste AllianceOS LTDA'},tipo:'creator'});
      return send(res,200,{ok:true,mode:'private_storage_pdf',template_ready:test.buffer.length>10000,pdf_ready:pdf.subarray(0,5).toString()==='%PDF-',pdf_bytes:pdf.length,autentique_configured:!!String(process.env.AUTENTIQUE_API_TOKEN||'').trim(),remaining_placeholders:test.remaining});
    }catch(e){return send(res,200,{ok:false,mode:'private_storage',erro:String(e.message||e).slice(0,180)})}
  }
  const session=await requireAllianceUser(req);const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  if(req.method==='POST'&&body.action==='copy_storage'){const arquivo=await copiarStorage(body,session);return send(res,200,{ok:true,arquivo})}
  if(req.method==='POST'&&body.action==='generate_creator_contract'){const id=String(body.partner_brand_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'partner_brand_id inválido'});const result=await gerarContratoCreator(session,id,body.force===true);return send(res,200,{ok:true,...result})}
  if(req.method==='POST'&&body.action==='get_creator_contract_url'){const id=String(body.contract_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'contract_id inválido'});return send(res,200,{ok:true,url:await contractUrl(session,id)})}
  if(req.method==='POST'&&body.action==='download_creator_contract'){
    const id=String(body.contract_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'contract_id inválido'});
    const {buffer,contract}=await contractPdfBuffer(session,id);
    const filename=String(contract?.metadata?.template_name||'contrato').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-')+'.pdf';
    res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','inline; filename="'+filename+'"');return res.status(200).send(buffer);
  }
  if(req.method==='POST'&&body.action==='test_autentique'){
    const brandId=String(body.brand_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(brandId))return send(res,400,{erro:'brand_id inválido'});
    const token=await autentiqueToken(session,brandId);
    const me=(await autentiqueJson(token,'query { me { id name email organization { id name } } }')).me;
    if(!me?.id)throw Object.assign(Error('A Autentique não retornou a conta conectada.'),{status:502});
    return send(res,200,{ok:true,configured:true,account:{name:me.name||null,email:me.email||null,organization:me.organization?.name||null}});
  }
  if(req.method==='POST'&&body.action==='send_creator_contract_autentique'){const id=String(body.contract_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'contract_id inválido'});return send(res,200,{ok:true,...await sendContractAutentique(session,id,body.force_email===true)})}
  if(req.method==='POST'&&body.action==='refresh_creator_contract_autentique'){const id=String(body.contract_id||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{erro:'contract_id inválido'});return send(res,200,{ok:true,...await refreshContractAutentique(session,id)})}
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
