export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
  const manifest={
    id:'/',
    name:'AllianceOS',
    short_name:'AllianceOS',
    description:'Sistema operacional interno da Alliance.',
    start_url:'/',
    scope:'/',
    display:'standalone',
    orientation:'any',
    background_color:'#121417',
    theme_color:'#121417',
    categories:['business','productivity'],
    icons:[
      {src:'/api/brand-icon?v=20260921-2',sizes:'512x512',type:'image/png',purpose:'any'},
      {src:'/api/brand-icon?v=20260921-2',sizes:'512x512',type:'image/png',purpose:'monochrome'},
      {src:'/api/brand-icon?variant=maskable&v=20260921-2',sizes:'512x512',type:'image/png',purpose:'maskable'}
    ]
  };
  const body=JSON.stringify(manifest);
  res.setHeader('Content-Type','application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=3600');
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).send(body);
}
