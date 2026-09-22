import sharp from 'sharp';

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1114"/>
      <stop offset="1" stop-color="#171d21"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".18"/>
      <stop offset=".55" stop-color="#ffffff" stop-opacity=".04"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity=".10"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000" flood-opacity=".38"/>
    </filter>
    <pattern id="grid" width="54" height="54" patternUnits="userSpaceOnUse">
      <path d="M54 0H0V54" fill="none" stroke="#ffffff" stroke-opacity=".055" stroke-width="1"/>
    </pattern>
    <clipPath id="screenClip">
      <rect x="0" y="0" width="520" height="470" rx="28"/>
    </clipPath>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <!-- premium monochrome glass arcs -->
  <circle cx="1115" cy="-120" r="360" fill="none" stroke="#ffffff" stroke-opacity=".24" stroke-width="2"/>
  <circle cx="1115" cy="-120" r="286" fill="none" stroke="#ffffff" stroke-opacity=".10" stroke-width="58"/>
  <circle cx="600" cy="720" r="245" fill="url(#glass)" stroke="#ffffff" stroke-opacity=".20" stroke-width="2"/>
  <circle cx="650" cy="720" r="160" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="2"/>

  <!-- AllianceOS brand -->
  <rect x="64" y="70" width="66" height="66" rx="16" fill="#f7f7f7"/>
  <g transform="translate(97 103)" stroke="#111518" stroke-width="5.2" stroke-linecap="round">
    <path d="M0 -18V18"/><path d="M-18 0H18"/>
    <path d="M-13 -13L13 13"/><path d="M13 -13L-13 13"/>
  </g>
  <text x="151" y="115" fill="#f6f6f6" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="400" letter-spacing="-.5">AllianceOS</text>

  <!-- headline -->
  <text x="64" y="255" fill="#f7f7f7" font-family="Arial,Helvetica,sans-serif" font-size="62" font-weight="300" letter-spacing="-2">
    <tspan x="64" dy="0">Toda a operação</tspan>
    <tspan x="64" dy="72">em um só lugar</tspan>
  </text>
  <text x="66" y="399" fill="#c6cbd0" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="300">
    <tspan x="66" dy="0">Campanhas, tarefas, entregas e gestão</tspan>
    <tspan x="66" dy="34">das marcas da Alliance com clareza,</tspan>
    <tspan x="66" dy="34">organização e visibilidade.</tspan>
  </text>
  <line x1="66" y1="516" x2="108" y2="516" stroke="#d9dde0" stroke-width="2"/>
  <text x="66" y="553" fill="#d7dade" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="400" letter-spacing="6">
    <tspan x="66">MAIS ORGANIZAÇÃO.</tspan>
    <tspan x="66" dy="25">MAIS RESULTADOS.</tspan>
  </text>

  <!-- dashboard glass backing -->
  <g transform="translate(665 72) rotate(-3 260 235)" filter="url(#shadow)">
    <rect x="-18" y="-20" width="556" height="510" rx="36" fill="#ffffff" fill-opacity=".10" stroke="#ffffff" stroke-opacity=".24" stroke-width="2"/>
    <rect width="520" height="470" rx="28" fill="#f7f8f9"/>
    <g clip-path="url(#screenClip)">
      <!-- sidebar -->
      <rect width="145" height="470" fill="#ffffff"/>
      <rect x="18" y="20" width="34" height="34" rx="8" fill="#15191d"/>
      <g transform="translate(35 37)" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round">
        <path d="M0 -9V9"/><path d="M-9 0H9"/><path d="M-6 -6L6 6"/><path d="M6 -6L-6 6"/>
      </g>
      <text x="62" y="43" fill="#15191d" font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="600">AllianceOS</text>

      <g font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#616970">
        <text x="34" y="94">⌂</text><text x="60" y="94">Início</text>
        <rect x="18" y="111" width="112" height="42" rx="11" fill="#161a1e"/>
        <text x="33" y="137" fill="#ffffff">✓</text><text x="60" y="137" fill="#ffffff" font-weight="600">Tarefas</text>
        <text x="32" y="186">◁</text><text x="60" y="186">Campanhas</text>
        <text x="32" y="228">▦</text><text x="60" y="228">Entregas</text>
        <text x="31" y="270">◎</text><text x="60" y="270">Marcas</text>
        <text x="32" y="312">ϟ</text><text x="60" y="312">Automações</text>
      </g>

      <!-- top bar -->
      <rect x="145" y="0" width="375" height="78" fill="#f2f4f5"/>
      <rect x="170" y="18" width="240" height="42" rx="12" fill="#ffffff" stroke="#e5e8ea"/>
      <text x="192" y="44" fill="#8f969c" font-family="Arial,Helvetica,sans-serif" font-size="12">⌕  Buscar tarefas, campanhas...</text>
      <text x="461" y="43" fill="#5d646a" font-family="Arial,Helvetica,sans-serif" font-size="16">♢</text>
      <circle cx="493" cy="38" r="15" fill="#15191d"/>
      <text x="484" y="43" fill="#ffffff" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="700">VG</text>

      <!-- page -->
      <text x="170" y="106" fill="#858d93" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="700" letter-spacing="3">OPERAÇÃO</text>
      <text x="170" y="142" fill="#15191d" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="700">Tarefas</text>
      <rect x="395" y="102" width="104" height="38" rx="10" fill="#ffffff" stroke="#e4e7e9"/>
      <text x="412" y="126" fill="#5c646a" font-family="Arial,Helvetica,sans-serif" font-size="11">▣  Esta semana</text>

      <!-- stat cards -->
      <g font-family="Arial,Helvetica,sans-serif">
        <rect x="170" y="162" width="100" height="88" rx="14" fill="#ffffff" stroke="#e7eaec"/>
        <text x="184" y="184" fill="#858d93" font-size="10">Para hoje</text>
        <text x="184" y="217" fill="#171b1f" font-size="29" font-weight="700">08</text>
        <text x="184" y="236" fill="#9aa1a6" font-size="9">2 em revisão</text>

        <rect x="282" y="162" width="100" height="88" rx="14" fill="#ffffff" stroke="#e7eaec"/>
        <text x="296" y="184" fill="#858d93" font-size="10">Em andamento</text>
        <text x="296" y="217" fill="#171b1f" font-size="29" font-weight="700">12</text>
        <text x="296" y="236" fill="#9aa1a6" font-size="9">5 responsáveis</text>

        <rect x="394" y="162" width="106" height="88" rx="14" fill="#ffffff" stroke="#e7eaec"/>
        <text x="408" y="184" fill="#858d93" font-size="10">Concluídas</text>
        <text x="408" y="217" fill="#171b1f" font-size="29" font-weight="700">31</text>
        <text x="452" y="213" fill="#565e64" font-size="12">↑ 24%</text>
        <text x="408" y="236" fill="#9aa1a6" font-size="9">esta semana</text>
      </g>

      <!-- execution panel -->
      <rect x="170" y="267" width="330" height="184" rx="15" fill="#ffffff" stroke="#e7eaec"/>
      <text x="186" y="292" fill="#171b1f" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700">Execução da campanha</text>
      <rect x="186" y="307" width="278" height="6" rx="3" fill="#e6e9eb"/>
      <rect x="186" y="307" width="213" height="6" rx="3" fill="#20252a"/>
      <text x="470" y="314" fill="#20252a" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700">75%</text>

      <!-- tasks -->
      <g font-family="Arial,Helvetica,sans-serif">
        <rect x="186" y="329" width="16" height="16" rx="5" fill="#1d2226"/>
        <text x="190" y="341" fill="#fff" font-size="10">✓</text>
        <text x="214" y="339" fill="#20252a" font-size="11" font-weight="600">Revisar criativos da campanha</text>
        <text x="214" y="353" fill="#9aa1a6" font-size="8">Campanha Dia D</text>
        <rect x="455" y="329" width="35" height="18" rx="9" fill="#eef0f1"/>
        <text x="463" y="341" fill="#636b70" font-size="8">Hoje</text>

        <rect x="186" y="365" width="16" height="16" rx="5" fill="#fff" stroke="#929aa0"/>
        <text x="214" y="375" fill="#20252a" font-size="11" font-weight="600">Subir anúncios aprovados</text>
        <text x="214" y="389" fill="#9aa1a6" font-size="8">Mídia paga</text>
        <rect x="445" y="365" width="45" height="18" rx="9" fill="#eef0f1"/>
        <text x="452" y="377" fill="#636b70" font-size="8">Amanhã</text>

        <rect x="186" y="401" width="16" height="16" rx="5" fill="#fff" stroke="#929aa0"/>
        <text x="214" y="411" fill="#20252a" font-size="11" font-weight="600">Conferir entrega da landing page</text>
        <text x="214" y="425" fill="#9aa1a6" font-size="8">Revisão</text>
        <rect x="443" y="401" width="47" height="18" rx="9" fill="#eef0f1"/>
        <text x="450" y="413" fill="#636b70" font-size="8">12 de mar</text>
      </g>
    </g>
  </g>
</svg>`;

const pngPromise = sharp(Buffer.from(svg))
  .png({ compressionLevel: 9, palette: false, quality: 100 })
  .toBuffer();

export default async function handler(req,res){
  if(req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end();
  const body = await pngPromise;
  res.setHeader('Content-Type','image/png');
  res.setHeader('Content-Length',String(body.length));
  res.setHeader('Cache-Control','public, max-age=3600, s-maxage=31536000, immutable');
  if(req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(body);
}
