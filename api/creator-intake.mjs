const ENDPOINT='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/creator-intake-v2';
function send(res,status,body,contentType='application/json; charset=utf-8'){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',contentType);
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  return res.status(status).send(body);
}
export default async function handler(req,res){
  if(req.method==='OPTIONS')return send(res,204,'');
  try{
    const incoming=new URL(req.url,'https://alliance.local');
    const target=new URL(ENDPOINT);
    for(const [k,v] of incoming.searchParams)target.searchParams.append(k,v);
    const opts={method:req.method||'GET',headers:{'Content-Type':'application/json'}};
    if(req.method==='POST')opts.body=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
    const r=await fetch(target,opts);
    const text=await r.text();
    return send(res,r.status,text,r.headers.get('content-type')||'application/json; charset=utf-8');
  }catch(e){
    console.error('[creator-intake proxy]',e);
    return send(res,502,JSON.stringify({erro:'Falha ao conectar o formulário.'}));
  }
}