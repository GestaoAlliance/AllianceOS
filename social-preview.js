const fs = require('fs');
const sharp = require('sharp');

function font(file) {
  return fs.readFileSync(require.resolve('@fontsource/inter/files/' + file));
}

const h = String.raw;

async function generateSocialPreview(outPath) {
  const satori = (await import('satori')).default;
  const { html } = await import('satori-html');

  const light = font('inter-latin-300-normal.woff');
  const regular = font('inter-latin-400-normal.woff');
  const medium = font('inter-latin-500-normal.woff');
  const semibold = font('inter-latin-600-normal.woff');

  const markup = html(h`
    <div style="width:1200px;height:630px;display:flex;position:relative;overflow:hidden;background:#0d1215;color:#f5f6f7;font-family:Inter;">
      <div style="position:absolute;inset:0;display:flex;background-image:linear-gradient(135deg,#0b1013 0%,#11171b 62%,#171e22 100%);"></div>

      <!-- subtle grid -->
      <div style="position:absolute;left:0;top:0;width:1200px;height:630px;display:flex;opacity:.09;
        background-image:linear-gradient(to right,#8b949a 1px,transparent 1px),linear-gradient(to bottom,#8b949a 1px,transparent 1px);
        background-size:55px 55px;"></div>

      <!-- glass arcs -->
      <div style="position:absolute;right:-205px;top:-250px;width:580px;height:580px;display:flex;border:2px solid rgba(255,255,255,.30);border-radius:999px;"></div>
      <div style="position:absolute;right:-145px;top:-190px;width:460px;height:460px;display:flex;border:54px solid rgba(255,255,255,.09);border-radius:999px;"></div>
      <div style="position:absolute;left:335px;bottom:-315px;width:500px;height:500px;display:flex;border:2px solid rgba(255,255,255,.26);border-radius:999px;background:rgba(255,255,255,.035);"></div>
      <div style="position:absolute;left:418px;bottom:-232px;width:335px;height:335px;display:flex;border:2px solid rgba(255,255,255,.18);border-radius:999px;"></div>

      <!-- brand -->
      <div style="position:absolute;left:64px;top:76px;width:64px;height:64px;display:flex;align-items:center;justify-content:center;border-radius:15px;background:#f5f6f7;">
        <div style="position:absolute;width:5px;height:38px;display:flex;border-radius:5px;background:#111518;"></div>
        <div style="position:absolute;width:38px;height:5px;display:flex;border-radius:5px;background:#111518;"></div>
        <div style="position:absolute;width:5px;height:38px;display:flex;border-radius:5px;background:#111518;transform:rotate(45deg);"></div>
        <div style="position:absolute;width:5px;height:38px;display:flex;border-radius:5px;background:#111518;transform:rotate(-45deg);"></div>
      </div>
      <div style="position:absolute;left:148px;top:92px;display:flex;font-size:35px;font-weight:400;letter-spacing:-1px;">AllianceOS</div>

      <!-- hero copy -->
      <div style="position:absolute;left:65px;top:198px;width:480px;display:flex;flex-direction:column;">
        <div style="display:flex;font-size:59px;font-weight:300;line-height:1.10;letter-spacing:-2.7px;">Toda a operação</div>
        <div style="display:flex;font-size:59px;font-weight:300;line-height:1.10;letter-spacing:-2.7px;">em um só lugar</div>
      </div>

      <div style="position:absolute;left:67px;top:350px;width:475px;display:flex;flex-direction:column;color:#d0d4d7;font-size:25px;font-weight:300;line-height:1.30;letter-spacing:-.5px;">
        <div style="display:flex;">Campanhas, tarefas, entregas e gestão</div>
        <div style="display:flex;">das marcas da Alliance com clareza,</div>
        <div style="display:flex;">organização e visibilidade.</div>
      </div>

      <div style="position:absolute;left:67px;top:513px;width:44px;height:2px;display:flex;background:#e4e6e7;"></div>
      <div style="position:absolute;left:67px;top:536px;display:flex;flex-direction:column;color:#d6dadd;font-size:11px;font-weight:500;line-height:2.15;letter-spacing:5.2px;">
        <div style="display:flex;">MAIS ORGANIZAÇÃO.</div>
        <div style="display:flex;">MAIS RESULTADOS.</div>
      </div>

      <!-- product mockup backing -->
      <div style="position:absolute;left:565px;top:74px;width:635px;height:535px;display:flex;border:2px solid rgba(255,255,255,.28);border-radius:34px;background:rgba(226,231,234,.14);transform:rotate(-3deg);"></div>

      <!-- product screen -->
      <div style="position:absolute;left:585px;top:94px;width:590px;height:490px;display:flex;overflow:hidden;border-radius:24px;background:#f4f6f7;transform:rotate(-3deg);box-shadow:0 22px 44px rgba(0,0,0,.30);">
        <!-- sidebar -->
        <div style="width:150px;height:490px;display:flex;position:relative;flex-direction:column;background:#ffffff;">
          <div style="position:absolute;left:18px;top:18px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#15191d;">
            <div style="position:absolute;width:3px;height:20px;display:flex;background:#fff;border-radius:3px;"></div>
            <div style="position:absolute;width:20px;height:3px;display:flex;background:#fff;border-radius:3px;"></div>
            <div style="position:absolute;width:3px;height:20px;display:flex;background:#fff;border-radius:3px;transform:rotate(45deg);"></div>
            <div style="position:absolute;width:3px;height:20px;display:flex;background:#fff;border-radius:3px;transform:rotate(-45deg);"></div>
          </div>
          <div style="position:absolute;left:61px;top:25px;display:flex;color:#171b1f;font-size:16px;font-weight:600;">AllianceOS</div>

          <div style="position:absolute;left:18px;top:77px;width:118px;height:30px;display:flex;align-items:center;color:#60686e;font-size:11px;">
            <div style="width:22px;display:flex;justify-content:center;">⌂</div><div style="display:flex;margin-left:9px;">Início</div>
          </div>
          <div style="position:absolute;left:16px;top:112px;width:120px;height:40px;display:flex;align-items:center;border-radius:11px;background:#15191d;color:#fff;font-size:11px;font-weight:600;">
            <div style="width:22px;display:flex;justify-content:center;margin-left:5px;">✓</div><div style="display:flex;margin-left:8px;">Tarefas</div>
          </div>
          <div style="position:absolute;left:18px;top:160px;width:118px;height:30px;display:flex;align-items:center;color:#60686e;font-size:11px;"><div style="width:22px;display:flex;justify-content:center;">◇</div><div style="display:flex;margin-left:9px;">Campanhas</div></div>
          <div style="position:absolute;left:18px;top:200px;width:118px;height:30px;display:flex;align-items:center;color:#60686e;font-size:11px;"><div style="width:22px;display:flex;justify-content:center;">▦</div><div style="display:flex;margin-left:9px;">Entregas</div></div>
          <div style="position:absolute;left:18px;top:240px;width:118px;height:30px;display:flex;align-items:center;color:#60686e;font-size:11px;"><div style="width:22px;display:flex;justify-content:center;">◎</div><div style="display:flex;margin-left:9px;">Marcas</div></div>
          <div style="position:absolute;left:18px;top:280px;width:118px;height:30px;display:flex;align-items:center;color:#60686e;font-size:11px;"><div style="width:22px;display:flex;justify-content:center;">ϟ</div><div style="display:flex;margin-left:9px;">Automações</div></div>
        </div>

        <!-- content -->
        <div style="width:440px;height:490px;display:flex;position:relative;flex-direction:column;background:#f3f5f6;">
          <div style="position:absolute;left:0;top:0;width:440px;height:72px;display:flex;background:#f0f3f4;"></div>
          <div style="position:absolute;left:18px;top:17px;width:300px;height:40px;display:flex;align-items:center;border:1px solid #e2e6e8;border-radius:11px;background:#fff;color:#92999e;font-size:10px;padding-left:16px;">⌕&nbsp;&nbsp; Buscar tarefas, campanhas...</div>
          <div style="position:absolute;right:17px;top:20px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:15px;background:#15191d;color:#fff;font-size:10px;font-weight:600;">VG</div>

          <div style="position:absolute;left:18px;top:95px;display:flex;color:#7f878d;font-size:9px;font-weight:600;letter-spacing:2.7px;">OPERAÇÃO</div>
          <div style="position:absolute;left:18px;top:116px;display:flex;color:#15191d;font-size:28px;font-weight:600;">Tarefas</div>
          <div style="position:absolute;right:18px;top:104px;width:104px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #e2e6e8;border-radius:10px;background:#fff;color:#626a70;font-size:10px;">▣&nbsp;&nbsp; Esta semana</div>

          <div style="position:absolute;left:18px;top:155px;width:105px;height:82px;display:flex;flex-direction:column;border:1px solid #e4e8ea;border-radius:13px;background:#fff;padding:12px;">
            <div style="display:flex;color:#858d93;font-size:9px;">Para hoje</div><div style="display:flex;color:#15191d;font-size:27px;font-weight:600;margin-top:8px;">08</div><div style="display:flex;color:#9aa1a6;font-size:8px;margin-top:2px;">2 em revisão</div>
          </div>
          <div style="position:absolute;left:133px;top:155px;width:105px;height:82px;display:flex;flex-direction:column;border:1px solid #e4e8ea;border-radius:13px;background:#fff;padding:12px;">
            <div style="display:flex;color:#858d93;font-size:9px;">Em andamento</div><div style="display:flex;color:#15191d;font-size:27px;font-weight:600;margin-top:8px;">12</div><div style="display:flex;color:#9aa1a6;font-size:8px;margin-top:2px;">5 responsáveis</div>
          </div>
          <div style="position:absolute;left:248px;top:155px;width:125px;height:82px;display:flex;flex-direction:column;border:1px solid #e4e8ea;border-radius:13px;background:#fff;padding:12px;">
            <div style="display:flex;color:#858d93;font-size:9px;">Concluídas</div><div style="display:flex;color:#15191d;font-size:27px;font-weight:600;margin-top:8px;">31</div><div style="display:flex;color:#9aa1a6;font-size:8px;margin-top:2px;">esta semana</div>
          </div>

          <div style="position:absolute;left:18px;top:252px;width:355px;height:190px;display:flex;position:relative;flex-direction:column;border:1px solid #e4e8ea;border-radius:14px;background:#fff;">
            <div style="position:absolute;left:16px;top:14px;display:flex;color:#171b1f;font-size:12px;font-weight:600;">Execução da campanha</div>
            <div style="position:absolute;left:16px;top:43px;width:300px;height:6px;display:flex;border-radius:3px;background:#e3e7e9;"></div>
            <div style="position:absolute;left:16px;top:43px;width:224px;height:6px;display:flex;border-radius:3px;background:#1a1f23;"></div>
            <div style="position:absolute;right:16px;top:39px;display:flex;color:#20252a;font-size:10px;font-weight:600;">75%</div>

            <div style="position:absolute;left:16px;top:69px;width:323px;height:32px;display:flex;align-items:center;border-bottom:1px solid #edf0f1;">
              <div style="width:15px;height:15px;display:flex;align-items:center;justify-content:center;border-radius:4px;background:#181d21;color:#fff;font-size:9px;">✓</div>
              <div style="display:flex;flex-direction:column;margin-left:11px;"><div style="display:flex;color:#252a2e;font-size:10px;font-weight:600;">Revisar criativos da campanha</div><div style="display:flex;color:#9aa1a6;font-size:8px;margin-top:2px;">Campanha Dia D</div></div>
              <div style="margin-left:auto;width:48px;height:19px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#eff1f2;color:#6b7277;font-size:8px;">Hoje</div>
            </div>
            <div style="position:absolute;left:16px;top:107px;width:323px;height:32px;display:flex;align-items:center;border-bottom:1px solid #edf0f1;">
              <div style="width:15px;height:15px;display:flex;border:1px solid #929aa0;border-radius:4px;background:#fff;"></div>
              <div style="display:flex;flex-direction:column;margin-left:11px;"><div style="display:flex;color:#252a2e;font-size:10px;font-weight:600;">Subir anúncios aprovados</div><div style="display:flex;color:#9aa1a6;font-size:8px;margin-top:2px;">Mídia paga</div></div>
              <div style="margin-left:auto;width:58px;height:19px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#eff1f2;color:#6b7277;font-size:8px;">Amanhã</div>
            </div>
            <div style="position:absolute;left:16px;top:145px;width:323px;height:32px;display:flex;align-items:center;">
              <div style="width:15px;height:15px;display:flex;border:1px solid #929aa0;border-radius:4px;background:#fff;"></div>
              <div style="display:flex;flex-direction:column;margin-left:11px;"><div style="display:flex;color:#252a2e;font-size:10px;font-weight:600;">Conferir entrega da landing page</div><div style="display:flex;color:#9aa1a6;font-size:8px;margin-top:2px;">Revisão</div></div>
              <div style="margin-left:auto;width:59px;height:19px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:#eff1f2;color:#6b7277;font-size:8px;">12 de mar</div>
            </div>
          </div>
        </div>
      </div>
    </div>`);

  const svg = await satori(markup, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: light, weight: 300, style: 'normal' },
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: medium, weight: 500, style: 'normal' },
      { name: 'Inter', data: semibold, weight: 600, style: 'normal' }
    ]
  });

  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath);
}

module.exports = { generateSocialPreview };
