import {createSign} from 'node:crypto';

const BRAND='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-brand';
const PASTA='application/vnd.google-apps.folder';
const CAMPOS='id,name,mimeType,iconLink,webViewLink,thumbnailLink,modifiedTime,size,owners(displayName)';
function send(res,status,body){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');return res.status(status).send(JSON.stringify(body))}
async function marca(nome){const r=await fetch(`${BRAND}?marca=${encodeURIComponent(nome)}`,{cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j.erro||`marca HTTP ${r.status}`),{status:r.status});return j}
async function salvarPasta(nome,pasta){const r=await fetch(BRAND,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marca:nome,drive_pasta:pasta})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j.erro||`configuração HTTP ${r.status}`),{status:r.status});return j}
function conta(){const cru=process.env.GOOGLE_DRIVE_SA||'';if(!cru.trim())return null;const texto=cru.trim().startsWith('{')?cru:Buffer.from(cru,'base64').toString('utf8');const sa=JSON.parse(texto);if(!sa.client_email||!sa.private_key)throw Error('a chave da conta de serviço está incompleta');return sa}
const b64u=t=>Buffer.from(t).toString('base64url');
let guardado={token:null,ate:0};
async function token(){if(guardado.token&&Date.now()<guardado.ate-60000)return guardado.token;const sa=conta();if(!sa)throw Object.assign(Error('sem conta de serviço configurada'),{faltaChave:true});const agora=Math.floor(Date.now()/1000),cab=b64u(JSON.stringify({alg:'RS256',typ:'JWT'})),corpo=b64u(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/drive.readonly',aud:sa.token_uri||'https://oauth2.googleapis.com/token',iat:agora,exp:agora+3600})),assina=createSign('RSA-SHA256');assina.update(`${cab}.${corpo}`);const jwt=`${cab}.${corpo}.${assina.sign(sa.private_key).toString('base64url')}`,r=await fetch(sa.token_uri||'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})}),j=await r.json().catch(()=>({}));if(!r.ok||!j.access_token)throw Error(j.error_description||j.error||`Google recusou a chave (HTTP ${r.status})`);guardado={token:j.access_token,ate:Date.now()+(j.expires_in||3600)*1000};return guardado.token}
async function drive(caminho,params={}){const u=new URL(`https://www.googleapis.com/drive/v3/${caminho}`);for(const[k,v]of Object.entries(params))if(v!=null&&v!=='')u.searchParams.set(k,String(v));u.searchParams.set('supportsAllDrives','true');const r=await fetch(u,{headers:{Authorization:`Bearer ${await token()}`}}),j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(j?.error?.message||`Google Drive ${r.status}`),{status:r.status});return j}
async function dentroDe(id,raiz){if(!id||id===raiz)return true;let atual=id;for(let i=0;i<12;i++){const f=await drive(`files/${encodeURIComponent(atual)}`,{fields:'id,parents'}),pais=f.parents||[];if(!pais.length)return false;if(pais.includes(raiz))return true;atual=pais[0]}return false}
const aspas=t=>String(t).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
export default async function handler(req,res){try{
  const body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
  if(req.method==='POST'){
    const nome=String(body.marca||'Botanika'),raw=String(body.drive_pasta||body.pasta||'').trim(),limpo=raw.replace(/^https?:\/\/drive\.google\.com\/drive\/(u\/\d+\/)?folders\//,'').split(/[?#]/)[0].trim();
    if(!/^[A-Za-z0-9_-]{10,}$/.test(limpo))return send(res,400,{erro:'esse id não parece um id de pasta do Drive'});
    await salvarPasta(nome,limpo);return send(res,200,{ok:true,ligado:true,marca:nome,raiz:limpo,pasta:limpo});
  }
  if(req.method!=='GET')return send(res,405,{erro:'método não permitido'});
  const q=Object.fromEntries(new URL(req.url,'http://x').searchParams),nome=q.marca||'Botanika',m=await marca(nome);
  if(!m.ativo)return send(res,404,{erro:`marca sem ficha ativa: ${nome}`});
  if(!m.drive_pasta)return send(res,200,{ligado:false,marca:m.marca,erro:`A ${m.marca} ainda não tem pasta do Drive ligada.`});
  if(!conta())return send(res,200,{ligado:false,semChave:true,marca:m.marca,erro:'A AllianceOS ainda não tem a chave da conta de serviço do Google.'});
  const raiz=m.drive_pasta,pasta=q.pasta&&q.pasta!==raiz?q.pasta:raiz;
  if(pasta!==raiz&&!(await dentroDe(pasta,raiz)))return send(res,403,{erro:'essa pasta não é desta marca'});
  const busca=String(q.q||'').trim().slice(0,80),filtro=busca?`name contains '${aspas(busca)}' and trashed = false`:`'${aspas(pasta)}' in parents and trashed = false`;
  const lista=await drive('files',{q:filtro,fields:`nextPageToken, files(${CAMPOS})`,orderBy:'folder,name_natural',pageSize:'100',includeItemsFromAllDrives:'true',corpora:'allDrives',pageToken:q.pagina||null});
  const trilha=[];if(pasta!==raiz){let atual=pasta;for(let i=0;i<12;i++){const f=await drive(`files/${encodeURIComponent(atual)}`,{fields:'id,name,parents'});trilha.unshift({id:f.id,nome:f.name});if(f.id===raiz||!(f.parents||[]).length||(f.parents||[]).includes(raiz))break;atual=f.parents[0]}}
  const arquivos=(lista.files||[]).map(f=>({id:f.id,nome:f.name,tipo:f.mimeType,pasta:f.mimeType===PASTA,link:f.webViewLink||`https://drive.google.com/file/d/${f.id}/view`,icone:f.iconLink||'',miniatura:f.thumbnailLink||'',em:f.modifiedTime||'',tamanho:f.size?+f.size:null,dono:f.owners?.[0]?.displayName||''}));
  return send(res,200,{ligado:true,marca:m.marca,raiz,pasta,trilha,arquivos,proxima:lista.nextPageToken||null,busca:busca||null});
}catch(e){if(e.faltaChave)return send(res,200,{ligado:false,semChave:true,erro:'A AllianceOS ainda não tem a chave da conta de serviço do Google.'});console.error('[drive]',e);const msg=String(e.message||e).slice(0,240);if(/File not found|notFound|insufficient/i.test(msg))return send(res,200,{ligado:false,semAcesso:true,erro:'O Drive não encontra a pasta. Confira se ela foi compartilhada com a conta de serviço.'});return send(res,e.status||502,{erro:msg})}}
