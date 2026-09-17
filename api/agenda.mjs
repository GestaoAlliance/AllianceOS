const ENDPOINT='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-agenda';
function send(res,status,body){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');return res.status(status).send(body)}
export default async function handler(req,res){
  try{
    const incoming=new URL(req.url,'http://alliance.local');
    const target=new URL(ENDPOINT);
    for(const [k,v] of incoming.searchParams)target.searchParams.append(k,v);
    const opts={method:req.method||'GET',headers:{'Content-Type':'application/json'}};
    if(req.method==='POST')opts.body=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
    const r=await fetch(target,opts);
    const text=await r.text();
    return send(res,r.status,text||'{}');
  }catch(e){console.error('[agenda proxy]',e);return send(res,502,JSON.stringify({erro:String(e.message||e).slice(0,250)}))}
}
