(()=>{
  'use strict';
  const ua=String(navigator.userAgent||'');
  const coarse=!!window.matchMedia&&window.matchMedia('(pointer:coarse)').matches;
  const shortSide=Math.min(Number(screen.width)||9999,Number(screen.height)||9999);
  const phoneUA=/iPhone|iPod|Android.*Mobile|Mobile.*Safari/i.test(ua);
  const phone=phoneUA||(coarse&&shortSide<=900)||window.innerWidth<=700;
  if(!phone)return;

  document.documentElement.classList.add('alliance-phone');

  const clean=()=>{
    document.getElementById('allianceContextGuide')?.remove();
    document.getElementById('allianceContextGuideLauncher')?.remove();

    if(
      document.documentElement.classList.contains('alliance-authenticated') ||
      (location.pathname!=='/login'&&location.pathname!=='/cadastro')
    ){
      document.querySelectorAll(
        'body > .auth-stage,body > .auth-frame,body > .auth-showcase,body > .showcase-device,body > .showcase-copy,body > .showcase-person,body > .showcase-grid,body > .showcase-shape'
      ).forEach(el=>el.remove());
    }
  };

  const observer=new MutationObserver(clean);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('DOMContentLoaded',clean,{once:true});
  window.addEventListener('pageshow',clean);
  window.addEventListener('resize',clean,{passive:true});
  requestAnimationFrame(clean);
})();