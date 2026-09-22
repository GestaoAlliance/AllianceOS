import { Readable } from 'node:stream';

const UPSTREAM='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/alliance-mcp';
const PUBLIC_RESOURCE='https://alliance-os-sooty.vercel.app/mcp';
const RESOURCE_METADATA=PUBLIC_RESOURCE+'/oauth-protected-resource';
const HOP_BY_HOP=new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailers','transfer-encoding','upgrade','host','content-length']);

export const config={api:{bodyParser:true,responseLimit:false}};

function requestHeaders(req){
  const h=new Headers();
  for(const [key,value] of Object.entries(req.headers||{})){
    const k=String(key).toLowerCase();
    if(HOP_BY_HOP.has(k)||value==null)continue;
    if(Array.isArray(value)){for(const item of value)h.append(key,String(item));}
    else h.set(key,String(value));
  }
  if(!h.has('accept'))h.set('accept','application/json, text/event-stream');
  return h;
}

function requestBody(req){
  const method=String(req.method||'GET').toUpperCase();
  if(method==='GET'||method==='HEAD')return undefined;
  if(Buffer.isBuffer(req.body))return req.body;
  if(typeof req.body==='string')return req.body;
  if(req.body==null)return undefined;
  return JSON.stringify(req.body);
}

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','authorization,content-type,accept,mcp-protocol-version,mcp-session-id,last-event-id');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Expose-Headers','www-authenticate,mcp-session-id,mcp-protocol-version');
}

export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS')return res.status(204).end();
  try{
    const upstream=await fetch(UPSTREAM,{
      method:req.method||'GET',
      headers:requestHeaders(req),
      body:requestBody(req),
      redirect:'manual'
    });

    res.statusCode=upstream.status;
    for(const [key,value] of upstream.headers.entries()){
      const k=key.toLowerCase();
      if(HOP_BY_HOP.has(k)||k==='www-authenticate')continue;
      res.setHeader(key,value);
    }
    const challenge=upstream.headers.get('www-authenticate');
    if(challenge){
      res.setHeader('WWW-Authenticate',`Bearer resource_metadata="${RESOURCE_METADATA}"`);
    }
    res.setHeader('X-AllianceOS-MCP','proxy-v1');
    if(req.method==='HEAD'||!upstream.body)return res.end();

    const stream=Readable.fromWeb(upstream.body);
    stream.on('error',(error)=>{
      console.error('[AllianceOS MCP proxy stream]',error);
      if(!res.headersSent)res.statusCode=502;
      try{res.end();}catch{}
    });
    stream.pipe(res);
  }catch(error){
    console.error('[AllianceOS MCP proxy]',error);
    if(!res.headersSent)res.statusCode=502;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.end(JSON.stringify({error:'AllianceOS MCP upstream unavailable'}));
  }
}
