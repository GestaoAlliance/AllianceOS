const RESOURCE='https://alliance-os-sooty.vercel.app/mcp';
const AUTHORIZATION_SERVER='https://lpnyrzsdiyzjnhovpduk.supabase.co/auth/v1';

export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','authorization,content-type');
  res.setHeader('Cache-Control','public, max-age=300');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
  const body={
    resource:RESOURCE,
    resource_name:'AllianceOS',
    authorization_servers:[AUTHORIZATION_SERVER],
    bearer_methods_supported:['header'],
    resource_documentation:'https://alliance-os-sooty.vercel.app'
  };
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).json(body);
}
