(()=>{
  'use strict';

  const ua=String(navigator.userAgent||'');
  const coarse=!!window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;
  const shortSide=Math.min(Number(screen.width)||9999,Number(screen.height)||9999);
  const phoneUA=/iPhone|iPod|Android.*Mobile|Mobile.*Safari/i.test(ua);
  const phone=phoneUA||(coarse&&shortSide<=900)||window.innerWidth<=700;
  if(!phone)return;

  document.documentElement.classList.add('alliance-phone');

  const removeGuide=()=>{
    document.getElementById('allianceContextGuide')?.remove();
    document.getElementById('allianceContextGuideLauncher')?.remove();
  };

  const removeAuthArtifacts=()=>{
    if(
      !document.documentElement.classList.contains('alliance-authenticated') &&
      (location.pathname==='/login'||location.pathname==='/cadastro')
    ) return;

    document.querySelectorAll(
      'body > .auth-stage,body > .auth-frame,body > .auth-showcase,body > .showcase-device,body > .showcase-copy,body > .showcase-person,body > .showcase-grid,body > .showcase-shape'
    ).forEach(el=>el.remove());
  };

  const closeMore=()=>{
    document.getElementById('allianceMobileMoreLayer')?.remove();
  };

  const setupMobileNav=()=>{
    const nav=document.querySelector('.sidebar>.ref2-nav');
    if(!nav||nav.dataset.mobileIosReady==='1')return;

    const primaryKeys=new Set(['home','tasks','campaigns','deliveries']);
    const buttons=[...nav.querySelectorAll('.ref2-nav-btn[data-key]')];
    if(!buttons.length)return;

    nav.dataset.mobileIosReady='1';

    const hidden=[];
    buttons.forEach(btn=>{
      const key=btn.dataset.key||'';
      if(primaryKeys.has(key)){
        btn.classList.add('alliance-mobile-primary-tab');
      }else{
        btn.classList.add('alliance-mobile-overflow-tab');
        hidden.push(btn);
      }
    });

    const more=document.createElement('button');
    more.type='button';
    more.className='ref2-nav-btn alliance-mobile-more-tab';
    more.dataset.key='more';
    more.setAttribute('aria-label','Mais');
    more.innerHTML=
      '<span class="ref2-nav-icon" aria-hidden="true">'+
        '<svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"></circle><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"></circle><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"></circle></svg>'+
      '</span>'+
      '<span class="ref2-nav-label">Mais</span>';
    nav.appendChild(more);

    const syncMore=()=>{
      more.classList.toggle('active',hidden.some(btn=>btn.classList.contains('active')));
    };

    const openMore=()=>{
      closeMore();

      const layer=document.createElement('div');
      layer.id='allianceMobileMoreLayer';
      layer.className='alliance-mobile-more-layer';

      const backdrop=document.createElement('button');
      backdrop.type='button';
      backdrop.className='alliance-mobile-more-backdrop';
      backdrop.setAttribute('aria-label','Fechar');
      backdrop.addEventListener('click',closeMore);

      const sheet=document.createElement('section');
      sheet.className='alliance-mobile-more-sheet';
      sheet.setAttribute('aria-label','Mais opções');

      const handle=document.createElement('div');
      handle.className='alliance-mobile-sheet-handle';
      handle.setAttribute('aria-hidden','true');

      const title=document.createElement('div');
      title.className='alliance-mobile-sheet-title';
      title.textContent='Mais';

      const grid=document.createElement('div');
      grid.className='alliance-mobile-more-grid';

      hidden.forEach(source=>{
        const item=document.createElement('button');
        item.type='button';
        item.className='alliance-mobile-more-item';
        item.dataset.sourceKey=source.dataset.key||'';
        const icon=source.querySelector('.ref2-nav-icon')?.innerHTML||'';
        const label=source.querySelector('.ref2-nav-label')?.textContent||source.dataset.key||'';
        const badge=source.querySelector('.ref2-nav-badge')?.textContent||'';
        item.innerHTML=
          '<span class="alliance-mobile-more-icon">'+icon+
          (badge?'<em class="alliance-mobile-more-badge">'+badge+'</em>':'')+
          '</span><span>'+label+'</span>';
        item.addEventListener('click',()=>{
          closeMore();
          source.click();
          requestAnimationFrame(syncMore);
        });
        grid.appendChild(item);
      });

      sheet.append(handle,title,grid);
      layer.append(backdrop,sheet);
      document.body.appendChild(layer);
      requestAnimationFrame(()=>layer.classList.add('is-open'));
    };

    more.addEventListener('click',openMore);

    const classObserver=new MutationObserver(syncMore);
    buttons.forEach(btn=>classObserver.observe(btn,{attributes:true,attributeFilter:['class']}));
    syncMore();
  };

  const normalizePhone=()=>{
    removeGuide();
    removeAuthArtifacts();
    setupMobileNav();
  };

  const observer=new MutationObserver(normalizePhone);
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('DOMContentLoaded',normalizePhone,{once:true});
  window.addEventListener('pageshow',normalizePhone);
  window.addEventListener('resize',normalizePhone,{passive:true});
  window.addEventListener('orientationchange',()=>{
    closeMore();
    setTimeout(normalizePhone,80);
  });

  requestAnimationFrame(normalizePhone);
})();