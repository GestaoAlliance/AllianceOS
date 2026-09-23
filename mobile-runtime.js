(()=>{
  'use strict';

  const ua=String(navigator.userAgent||'');
  const coarse=!!window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;
  const shortSide=Math.min(Number(screen.width)||9999,Number(screen.height)||9999);
  const phoneUA=/iPhone|iPod|Android.*Mobile|Mobile.*Safari/i.test(ua);
  const phone=phoneUA||(coarse&&shortSide<=900)||window.innerWidth<=700;
  if(!phone)return;

  document.documentElement.classList.add('alliance-phone');

  const PHONE_ICONS={
    home:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.8 10.7 12 3.9l8.2 6.8"/><path d="M5.7 9.9v9.2h12.6V9.9"/><path d="M9.4 19.1v-5.5h5.2v5.5"/></svg>',
    tasks:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4"/><path d="m7.8 12 2.6 2.7 5.9-6.1"/></svg>',
    campaigns:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.2 9.4v5.2h4.1l7.6 3.1V6.3L8.3 9.4H4.2Z"/><path d="m8 14.6 1.5 4h3.2l-1.4-2.9"/><path d="M18.2 8.7c1 .8 1.6 2 1.6 3.3s-.6 2.5-1.6 3.3"/></svg>',
    deliveries:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 8.2h16v10.6H4z"/><path d="m6.2 8.2 2.2-4h7.2l2.2 4"/><path d="M7.7 13.1h2.2l1.3 2h1.6l1.3-2h2.2"/></svg>',
    more:'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>'
  };

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

  const closeMore=()=>document.getElementById('allianceMobileMoreLayer')?.remove();

  const setupTaskDrawer=()=>{
    const drawer=document.getElementById('taskDetailDrawer');
    if(!drawer||drawer.dataset.mobileObserverReady==='1')return;
    drawer.dataset.mobileObserverReady='1';
    const sync=()=>{
      const open=drawer.classList.contains('open');
      document.documentElement.classList.toggle('alliance-task-open',open);
      if(open)closeMore();
    };
    new MutationObserver(sync).observe(drawer,{attributes:true,attributeFilter:['class']});
    sync();
  };

  const setupMobileNav=()=>{
    const nav=document.querySelector('.sidebar>.ref2-nav');
    if(!nav)return;

    /* Important: this function is called from a subtree MutationObserver.
       Never rewrite the nav after it has been initialized, otherwise
       innerHTML/class mutations retrigger the observer forever on iOS. */
    if(nav.dataset.mobileIosReady==='1')return;

    const primaryKeys=new Set(['home','tasks','campaigns','deliveries']);
    const buttons=[...nav.querySelectorAll('.ref2-nav-btn[data-key]')].filter(b=>b.dataset.key!=='more');
    if(!buttons.length)return;

    nav.dataset.mobileIosReady='1';

    buttons.forEach(btn=>{
      const key=btn.dataset.key||'';
      const icon=btn.querySelector('.ref2-nav-icon');
      if(icon&&PHONE_ICONS[key]&&icon.dataset.mobileIconReady!=='1'){
        icon.innerHTML=PHONE_ICONS[key];
        icon.dataset.mobileIconReady='1';
      }
      btn.classList.toggle('alliance-mobile-primary-tab',primaryKeys.has(key));
      btn.classList.toggle('alliance-mobile-overflow-tab',!primaryKeys.has(key));
    });

    let more=nav.querySelector('.alliance-mobile-more-tab');
    if(!more){
      more=document.createElement('button');
      more.type='button';
      more.className='ref2-nav-btn alliance-mobile-more-tab';
      more.dataset.key='more';
      more.setAttribute('aria-label','Mais');
      more.innerHTML='<span class="ref2-nav-icon" aria-hidden="true">'+PHONE_ICONS.more+'</span><span class="ref2-nav-label">Mais</span>';
      nav.appendChild(more);
    }

    const hidden=buttons.filter(btn=>!primaryKeys.has(btn.dataset.key||''));
    const syncMore=()=>more.classList.toggle('active',hidden.some(btn=>btn.classList.contains('active')));

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
        const icon=source.querySelector('.ref2-nav-icon')?.innerHTML||'';
        const label=source.querySelector('.ref2-nav-label')?.textContent||source.dataset.key||'';
        const badge=source.querySelector('.ref2-nav-badge')?.textContent||'';
        item.innerHTML='<span class="alliance-mobile-more-icon">'+icon+
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
    setupTaskDrawer();
  };

  const rootObserver=new MutationObserver(normalizePhone);
  rootObserver.observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener('DOMContentLoaded',normalizePhone,{once:true});
  window.addEventListener('pageshow',normalizePhone);
  window.addEventListener('resize',normalizePhone,{passive:true});
  window.addEventListener('orientationchange',()=>{
    closeMore();
    setTimeout(normalizePhone,80);
  });

  requestAnimationFrame(normalizePhone);
})();