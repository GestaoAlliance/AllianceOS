import zlib from 'node:zlib';

const W=1200,H=630;
const px=Buffer.alloc(W*H*4);

function rgb(hex){
  const n=parseInt(hex.replace('#',''),16);
  return [(n>>16)&255,(n>>8)&255,n&255,255];
}
function setPixel(x,y,c){
  if(x<0||y<0||x>=W||y>=H)return;
  const i=(y*W+x)*4;
  px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];px[i+3]=c[3]??255;
}
function fillRect(x,y,w,h,c){
  for(let yy=Math.max(0,y);yy<Math.min(H,y+h);yy++){
    let i=(yy*W+Math.max(0,x))*4;
    for(let xx=Math.max(0,x);xx<Math.min(W,x+w);xx++){
      px[i]=c[0];px[i+1]=c[1];px[i+2]=c[2];px[i+3]=c[3]??255;i+=4;
    }
  }
}
function circle(cx,cy,r,c){
  const r2=r*r;
  for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++){
    for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++){
      const dx=x-cx,dy=y-cy;
      if(dx*dx+dy*dy<=r2)setPixel(x,y,c);
    }
  }
}
function roundedRect(x,y,w,h,r,c){
  fillRect(x+r,y,w-2*r,h,c);
  fillRect(x,y+r,w,h-2*r,c);
  circle(x+r,y+r,r,c); circle(x+w-r-1,y+r,r,c);
  circle(x+r,y+h-r-1,r,c); circle(x+w-r-1,y+h-r-1,r,c);
}
function line(x0,y0,x1,y1,width,c){
  const dx=x1-x0,dy=y1-y0,steps=Math.max(Math.abs(dx),Math.abs(dy));
  for(let i=0;i<=steps;i++){
    const t=steps?i/steps:0;
    circle(Math.round(x0+dx*t),Math.round(y0+dy*t),Math.max(1,Math.floor(width/2)),c);
  }
}
function draw(){
  fillRect(0,0,W,H,rgb('#0e1215'));
  roundedRect(70,70,1060,490,40,rgb('#151b1f'));

  // AllianceOS mark
  roundedRect(105,108,104,104,24,rgb('#f5f7f8'));
  const ink=rgb('#121619');
  line(157,132,157,188,7,ink);
  line(129,160,185,160,7,ink);
  line(137,140,177,180,7,ink);
  line(177,140,137,180,7,ink);

  // Decorative headline bars
  roundedRect(246,120,250,24,12,rgb('#f4f6f7'));
  roundedRect(246,160,160,12,6,rgb('#7f8b92'));
  roundedRect(108,286,430,28,14,rgb('#f4f6f7'));
  roundedRect(108,334,360,28,14,rgb('#f4f6f7'));
  roundedRect(110,410,410,14,7,rgb('#a7b0b6'));
  roundedRect(110,443,350,14,7,rgb('#7f8b92'));

  // UI mockup
  roundedRect(735,108,350,394,30,rgb('#f5f7f8'));
  roundedRect(755,128,86,354,20,rgb('#1a2024'));
  for(let i=0;i<5;i++){
    roundedRect(777,164+i*57,42,36,10,i===0?rgb('#eef1f2'):rgb('#2b3338'));
  }
  roundedRect(865,132,194,48,14,rgb('#e8ecee'));
  roundedRect(885,150,118,12,6,rgb('#c7cfd3'));
  for(let j=0;j<3;j++){
    const yy=205+j*99;
    roundedRect(865,yy,194,80,14,rgb('#ffffff'));
    roundedRect(885,yy+16,126,13,6,rgb('#2c3236'));
    roundedRect(885,yy+42,154,10,5,rgb('#c9d0d4'));
    roundedRect(885,yy+60,84,8,4,rgb('#dce1e4'));
    circle(1028,yy+40,11,rgb('#4e6a5c'));
  }
  roundedRect(735,522,350,30,15,rgb('#191f23'));
}
draw();

const crcTable=(()=>{
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
    t[n]=c>>>0;
  }
  return t;
})();
function crc32(buf){
  let c=0xffffffff;
  for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);
  return (c^0xffffffff)>>>0;
}
function chunk(type,data=Buffer.alloc(0)){
  const t=Buffer.from(type,'ascii');
  const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);
  return Buffer.concat([len,t,data,crc]);
}
function png(){
  const raw=Buffer.alloc((W*4+1)*H);
  for(let y=0;y<H;y++){
    const ro=y*(W*4+1);raw[ro]=0;
    px.copy(raw,ro+1,y*W*4,(y+1)*W*4);
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);
  ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),
    chunk('IDAT',zlib.deflateSync(raw,{level:9})),
    chunk('IEND')
  ]);
}
const body=png();

export default function handler(req,res){
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
  res.setHeader('Content-Type','image/png');
  res.setHeader('Content-Length',String(body.length));
  res.setHeader('Cache-Control','public, max-age=86400, s-maxage=31536000, immutable');
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).send(body);
}
