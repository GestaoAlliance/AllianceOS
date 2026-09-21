(() => {
  'use strict';

  const CONFIG_URL='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const TASKS_KEY='central.tasks.vitor-gutierrez';
  const APP_URL='https://alliance-os-sooty.vercel.app';
  const state={sb:null,user:null,profile:null,members:[],lists:[],brands:[],areas:[],links:[],invites:[],tasks:[],notifications:[]};
  window.AllianceOSDirectory={members:[],lists:[],brands:[]};

  const esc=(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=(v)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const initials=(v)=>{const p=String(v||'').trim().split(/\s+/).filter(Boolean);return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase()||'—';};
  const avatarInner=(person,fallbackName='')=>person?.foto_url
    ? '<img src="'+esc(person.foto_url)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">'
    : esc(initials(person?.nome||fallbackName));
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const toast=(msg)=>{
    if(window.showToast)return window.showToast(msg);
    let el=$('#allianceAdminToast');if(!el){el=document.createElement('div');el.id='allianceAdminToast';document.body.appendChild(el);}
    el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);
  };

  async function initClient(){
    const cfgRes=await fetch(CONFIG_URL,{cache:'no-store'});
    if(!cfgRes.ok)throw new Error('Não foi possível carregar a configuração do AllianceOS.');
    const cfg=await cfgRes.json();
    const mod=await import('https://esm.sh/@supabase/supabase-js@2.116.0');
    state.sb=mod.createClient(cfg.url,cfg.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data:{session}}=await state.sb.auth.getSession();
    state.user=session?.user||null;
    window.AllianceOSSession={user:state.user};
    state.sb.auth.onAuthStateChange((_event,session)=>{
      const before=state.user?.id||null;
      state.user=session?.user||null;
      window.AllianceOSSession={user:state.user};
      if(before!==state.user?.id)sessionStorage.removeItem('allianceos.rls_tasks_hydrated');
      setTimeout(refreshAll,20);
    });
  }

  async function audit(action,entityType,entityId,details={}){
    if(!state.user||!state.sb)return;
    await state.sb.from('task_action_audit').insert({
      actor_id:state.user.id,origin:'interface',action,entity_type:entityType,entity_id:String(entityId),details
    }).catch(()=>{});
  }

  async function notify(ids,kind,title,body,taskId,eventKey=null){
    if(!state.user||!state.sb)return;
    const uniq=[...new Set((ids||[]).filter(Boolean).filter(id=>id!==state.user.id))];
    if(!uniq.length)return;
    const rows=uniq.map(user_id=>({user_id,actor_id:state.user.id,kind,title,body,task_id:taskId||null,event_key:eventKey}));
    const {error}=await state.sb.from('notifications').insert(rows);
    if(error&&!String(error.message).toLowerCase().includes('duplicate'))console.warn('[AllianceOS notifications]',error.message);
  }

  function idsForNames(names=[]){
    return names.map(name=>state.members.find(m=>m.tipo==='usuario'&&m.atribuivel!==false&&norm(m.nome)===norm(name))?.id).filter(Boolean);
  }
  function idsForMentions(text=''){
    const n=norm(text);
    return state.members.filter(m=>{
      if(m.tipo!=='usuario'||!m.nome)return false;
      const full=norm(m.nome), first=full.split(/\s+/)[0];
      return n.includes('@'+full)||n.includes('@'+first);
    }).map(m=>m.id);
  }

  window.AllianceOSOps={
    audit,
    notify,
    memberIdsByNames:idsForNames,
    async recordTaskAction(action,task,details={}){
      if(!state.user||!task)return;
      await audit(action,'tarefa',task.id,{...details,origem:'interface'});
      if(action==='criar_tarefa'){
        const ids=idsForNames(task.assignees||[]);
        await notify(ids,'task_assigned','Nova tarefa atribuída',task.title||'',String(task.id),'ui-assigned:'+String(task.id));
      }
      if(action==='comentar_tarefa'){
        const recipients=[...new Set([...idsForNames(task.assignees||[]),...idsForMentions(details.comentario||'')])];
        await notify(recipients,'task_comment','Novo comentário: '+(task.title||''),details.comentario||'',String(task.id));
      }
      if(action==='atualizar_tarefa'&&details.status){
        await notify(idsForNames(task.assignees||[]),'task_status','Status alterado: '+(task.title||''),'Novo status: '+details.status,String(task.id));
      }
    }
  };

  async function readTasks(){
    if(!state.user)return [];
    const {data,error}=await state.sb.from('operacional_estado').select('valor').eq('chave',TASKS_KEY).is('dono',null).maybeSingle();
    if(error)throw error;
    return Array.isArray(data?.valor)?data.valor:[];
  }
  async function writeTasks(tasks){
    const {data,error}=await state.sb.from('operacional_estado').update({valor:tasks,atualizado_em:new Date().toISOString()}).eq('chave',TASKS_KEY).is('dono',null).select('chave');
    if(error)throw error;if(!data?.length)throw new Error('Sem permissão para alterar tarefas.');
  }

  async function loadDirectory(){
    if(!state.user){
      state.members=[];state.lists=[];state.brands=[];state.tasks=[];
      localStorage.removeItem(TASKS_KEY);
      sessionStorage.removeItem('allianceos.rls_tasks_hydrated');
      window.AllianceOSDirectory={members:[],lists:[],brands:[]};
      return;
    }
    const [profileR,profilesR,brandsR,areasR,listsR,linksR,invitesR,tasks]=await Promise.all([
      state.sb.from('profiles').select('id,nome,email,foto_url,papel,cargo,area_id,ativo,tipo_membro').eq('id',state.user.id).maybeSingle(),
      state.sb.from('profiles').select('id,nome,email,foto_url,papel,cargo,area_id,ativo,tipo_membro').eq('ativo',true).order('nome'),
      state.sb.from('brands').select('id,nome,slug,ativo').eq('ativo',true).order('nome'),
      state.sb.from('areas').select('id,nome').order('nome'),
      state.sb.from('task_lists').select('id,nome,brand_id,campanha_id,arquivado_em').order('nome'),
      state.sb.from('legacy_member_links').select('legacy_name,profile_id,migrado_em,tarefas_migradas'),
      state.sb.from('equipe_convites').select('email,nome,cargo,papel,enviado_em,ultimo_envio_em,envio_status,envio_erro,tentativas_envio,aceito_em').order('nome'),
      readTasks()
    ]);
    state.profile=profileR.data||null;
    state.brands=brandsR.data||[];
    state.areas=areasR.data||[];
    state.links=linksR.data||[];
    state.invites=invitesR.data||[];
    state.tasks=tasks;
    const remoteTasks=JSON.stringify(tasks);
    const localTasks=localStorage.getItem(TASKS_KEY);
    if(localTasks!==remoteTasks){
      localStorage.setItem(TASKS_KEY,remoteTasks);
      const hydratedKey='allianceos.rls_tasks_hydrated';
      if(sessionStorage.getItem(hydratedKey)!==String(state.user.id)){
        sessionStorage.setItem(hydratedKey,String(state.user.id));
        setTimeout(()=>location.reload(),60);
      }else{
        toast('Tarefas atualizadas pelo servidor.');
      }
    }else{
      sessionStorage.setItem('allianceos.rls_tasks_hydrated',String(state.user.id));
    }
    const linked=new Set(state.links.map(x=>norm(x.legacy_name)));
    const inviteByEmail=new Map(state.invites.map(x=>[norm(x.email),x]));
    const profileEmails=new Set((profilesR.data||[]).map(p=>norm(p.email)).filter(Boolean));
    state.members=(profilesR.data||[]).map(p=>{
      const c=inviteByEmail.get(norm(p.email)),tipo=p.tipo_membro==='servico'?'servico':'usuario';
      return {...p,tipo,atribuivel:tipo==='usuario',
        convite_status:c?.aceito_em?'aceito':(c?.envio_status||null),
        convite_enviado_em:c?.enviado_em||null,
        convite_ultimo_envio_em:c?.ultimo_envio_em||null,
        convite_erro:c?.envio_erro||null,
        convite_aceito_em:c?.aceito_em||null,
        convite_tentativas:Number(c?.tentativas_envio||0)
      };
    });
    const known=new Set(state.members.map(x=>norm(x.nome)));
    for(const t of tasks){
      for(const name of Array.isArray(t.assignees)?t.assignees:[]){
        if(!name||known.has(norm(name))||linked.has(norm(name)))continue;
        known.add(norm(name));state.members.push({id:'nome:'+norm(name),nome:name,email:null,tipo:'legado',atribuivel:false});
      }
    }
    for(const c of state.invites){
      if(c.aceito_em||profileEmails.has(norm(c.email)))continue;
      state.members.push({id:'convite:'+c.email,nome:c.nome||c.email,email:c.email,papel:c.papel,cargo:c.cargo,tipo:'convite_pendente',atribuivel:false,
        convite_status:c.envio_status||'pendente',convite_enviado_em:c.enviado_em||null,convite_ultimo_envio_em:c.ultimo_envio_em||null,
        convite_erro:c.envio_erro||null,convite_aceito_em:c.aceito_em||null,convite_tentativas:Number(c.tentativas_envio||0)});
    }
    const brandMap=new Map(state.brands.map(b=>[String(b.id),b]));
    state.lists=(listsR.data||[]).map(l=>({...l,marca:brandMap.get(String(l.brand_id))?.nome||'',arquivada:!!l.arquivado_em}));
    window.AllianceOSDirectory={members:state.members,lists:state.lists,brands:state.brands,areas:state.areas};
    window.dispatchEvent(new CustomEvent('allianceos:directory',{detail:window.AllianceOSDirectory}));
    renderDirectoryChrome();
    installNav();
  }

  async function loadNotifications(){
    if(!state.user){state.notifications=[];renderBell();return;}
    const now=Date.now(), horizon=now+24*60*60*1000;
    const assigned=state.tasks.filter(t=>!t.archivedAt&&(t.assigneeIds||[]).includes(state.user.id));
    for(const t of assigned){
      const raw=t.dueAt||t.due;if(!raw)continue;
      const ms=t.dueAt?new Date(t.dueAt).getTime():new Date(String(t.due)+'T18:00:00').getTime();
      if(Number.isNaN(ms)||ms<now||ms>horizon)continue;
      const {error:dueError}=await state.sb.from('notifications').insert({
        user_id:state.user.id,actor_id:state.user.id,kind:'task_due_soon',title:'Prazo próximo: '+(t.title||'Tarefa'),
        body:t.dueAt?'Prazo: '+new Date(t.dueAt).toLocaleString('pt-BR'):'Prazo: '+t.due,
        task_id:String(t.id),event_key:'due:'+String(t.id)+':'+String(raw)
      });
      if(dueError&&!String(dueError.message).toLowerCase().includes('duplicate'))console.warn('[AllianceOS due notification]',dueError.message);
    }
    const {data}=await state.sb.from('notifications').select('id,kind,title,body,task_id,created_at,read_at').eq('user_id',state.user.id).order('created_at',{ascending:false}).limit(50);
    state.notifications=data||[];renderBell();
  }

  async function refreshAll(){
    try{await loadDirectory();await loadNotifications();renderModalBody();}catch(e){console.warn('[AllianceOS admin]',e);}
  }

  function ensureModal(){
    if($('#allianceAdminModal'))return;
    const modal=document.createElement('div');
    modal.id='allianceAdminModal';
    modal.innerHTML='<div class="aa-backdrop" data-aa-close></div><section class="aa-panel"><header><div><strong>Administração do AllianceOS</strong><span>Equipe, listas, migração e limpeza</span></div><button type="button" data-aa-close>×</button></header><nav><button data-aa-tab="team" class="active">Equipe</button><button data-aa-tab="lists">Listas</button><button data-aa-tab="cleanup">Limpeza</button></nav><div id="allianceAdminBody"></div></section>';
    document.body.appendChild(modal);
    $$('[data-aa-close]',modal).forEach(b=>b.addEventListener('click',closeModal));
    $$('[data-aa-tab]',modal).forEach(b=>b.addEventListener('click',()=>{modal.dataset.tab=b.dataset.aaTab;$$('[data-aa-tab]',modal).forEach(x=>x.classList.toggle('active',x===b));renderModalBody();}));
    modal.dataset.tab='team';
  }

  function openModal(){ensureModal();$('#allianceAdminModal').classList.add('open');refreshAll();}
  function closeModal(){$('#allianceAdminModal')?.classList.remove('open');}


  let profileRemovePhoto=false;
  let profilePhotoBlob=null;
  const profileCrop={image:null,url:null,offsetX:0,offsetY:0,zoom:1,drag:false,lastX:0,lastY:0};

  function profileRevokeCropUrl(){
    if(profileCrop.url){try{URL.revokeObjectURL(profileCrop.url)}catch{}}
    profileCrop.url=null;
  }

  function ensureProfileStyles(){
    if($('#allianceProfileStyles'))return;
    const st=document.createElement('style');st.id='allianceProfileStyles';
    st.textContent=[
      '.ref2-avatar,.ref2-team-avatar,.mini-av,.bigav,.r10-step-avatar,.cav{overflow:hidden!important;aspect-ratio:1/1!important;flex-shrink:0!important}',
      '.ref2-avatar img,.ref2-team-avatar img,.mini-av img,.bigav img,.r10-step-avatar img,.cav img{display:block!important;width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;max-width:none!important;max-height:none!important;object-fit:cover!important;object-position:center center!important;aspect-ratio:1/1!important;border-radius:inherit!important}',
      '.aa-profile-modal{position:fixed;inset:0;z-index:100200;display:none;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.aa-profile-modal.open{display:block}',
      '.aa-profile-backdrop{position:absolute;inset:0;background:rgba(17,22,26,.46);backdrop-filter:blur(4px)}',
      '.aa-profile-card{position:absolute;right:22px;top:22px;width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 44px);overflow:auto;background:#fff;border:1px solid #e0e5e8;border-radius:20px;box-shadow:0 24px 70px rgba(18,26,31,.22);color:#171b1e}',
      '.aa-profile-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 22px;border-bottom:1px solid #edf0f2}.aa-profile-head h2{margin:0;font-size:18px;letter-spacing:-.03em}.aa-profile-head p{margin:5px 0 0;color:#7c868d;font-size:11px}.aa-profile-close{width:34px;height:34px;border:1px solid #dfe4e7;border-radius:10px;background:#fff;font-size:18px}',
      '.aa-profile-body{padding:22px;display:grid;gap:18px}.aa-profile-photo-row{display:flex;align-items:center;gap:16px}.aa-profile-photo{width:82px;height:82px;border-radius:50%;background:#eef1f2;display:grid;place-items:center;font-size:22px;font-weight:800;overflow:hidden;flex:0 0 auto}.aa-profile-photo img{width:100%;height:100%;object-fit:cover}.aa-profile-photo-actions{display:grid;gap:7px}.aa-profile-photo-actions input{font-size:10px;max-width:310px}.aa-profile-photo-actions small{font-size:9px;color:#889198;line-height:1.4}.aa-profile-photo-buttons{display:flex;flex-wrap:wrap;gap:7px}',
      '.aa-profile-crop{display:grid;gap:12px;padding:14px;border:1px solid #e2e7ea;border-radius:15px;background:#f7f9fa}.aa-profile-crop[hidden]{display:none!important}.aa-profile-crop-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.aa-profile-crop-head b{font-size:12px}.aa-profile-crop-head span{display:block;margin-top:3px;font-size:9px;color:#7f8990}.aa-crop-stage{width:280px;height:280px;max-width:100%;aspect-ratio:1/1;margin:0 auto;border-radius:50%;overflow:hidden;background:#dfe4e7;box-shadow:0 0 0 1px #d2d9dd,0 12px 30px rgba(31,40,46,.12);cursor:grab;touch-action:none;position:relative}.aa-crop-stage.dragging{cursor:grabbing}.aa-crop-stage canvas{display:block;width:100%;height:100%}.aa-crop-stage:after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 3px rgba(255,255,255,.85),inset 0 0 0 4px rgba(24,31,36,.12);pointer-events:none}.aa-crop-zoom{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;font-size:9px;color:#68727a}.aa-crop-zoom input{width:100%}.aa-crop-actions{display:flex;justify-content:flex-end;gap:8px}',
      '.aa-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.aa-profile-field{display:grid;gap:6px}.aa-profile-field.full{grid-column:1/-1}.aa-profile-field label{font-size:10px;font-weight:750;color:#667078}.aa-profile-field input,.aa-profile-field select{height:41px;border:1px solid #dce1e4;border-radius:9px;padding:0 10px;background:#fff;color:#20262a;outline:none}.aa-profile-field input[readonly]{background:#f7f8f9;color:#7a848b}',
      '.aa-profile-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:4px}.aa-profile-btn{height:40px;border:1px solid #dce1e4;border-radius:9px;background:#fff;padding:0 13px;font-weight:750;font-size:11px}.aa-profile-btn.primary{background:#171b1e;color:#fff;border-color:#171b1e}.aa-profile-btn.danger{color:#a43d43;width:max-content}.aa-profile-btn:disabled{opacity:.5}',
      '@media(max-width:560px){.aa-profile-card{right:8px;top:8px;width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.aa-profile-grid{grid-template-columns:1fr}.aa-profile-field.full{grid-column:auto}.aa-profile-photo-row{align-items:flex-start;flex-direction:column}.aa-crop-stage{width:min(280px,78vw)}}'
    ].join('');
    document.head.appendChild(st);
  }

  function ensureProfileModal(){
    if($('#allianceProfileModal'))return;
    ensureProfileStyles();
    const modal=document.createElement('div');modal.id='allianceProfileModal';modal.className='aa-profile-modal';
    modal.innerHTML='<div class="aa-profile-backdrop" data-aa-profile-close></div><section class="aa-profile-card"><header class="aa-profile-head"><div><h2>Meu perfil</h2><p>Atualize como você aparece no AllianceOS.</p></div><button class="aa-profile-close" type="button" data-aa-profile-close>×</button></header><div class="aa-profile-body" id="allianceProfileBody"></div></section>';
    document.body.appendChild(modal);
    $$('[data-aa-profile-close]',modal).forEach(x=>x.addEventListener('click',closeProfileModal));
  }

  function closeProfileModal(){
    $('#allianceProfileModal')?.classList.remove('open');
    const crop=$('#aaProfileCropWrap');if(crop)crop.hidden=true;
  }

  function profileCropClamp(){
    const canvas=$('#aaProfileCropCanvas'),img=profileCrop.image;
    if(!canvas||!img)return;
    const size=canvas.width;
    const base=Math.max(size/img.naturalWidth,size/img.naturalHeight);
    const scale=base*profileCrop.zoom;
    const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    const mx=Math.max(0,(w-size)/2),my=Math.max(0,(h-size)/2);
    profileCrop.offsetX=Math.max(-mx,Math.min(mx,profileCrop.offsetX));
    profileCrop.offsetY=Math.max(-my,Math.min(my,profileCrop.offsetY));
  }

  function profileDrawCrop(){
    const canvas=$('#aaProfileCropCanvas'),img=profileCrop.image;
    if(!canvas||!img)return;
    profileCropClamp();
    const ctx=canvas.getContext('2d'),size=canvas.width;
    const base=Math.max(size/img.naturalWidth,size/img.naturalHeight);
    const scale=base*profileCrop.zoom;
    const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
    const x=(size-w)/2+profileCrop.offsetX,y=(size-h)/2+profileCrop.offsetY;
    ctx.clearRect(0,0,size,size);
    ctx.fillStyle='#eef1f2';ctx.fillRect(0,0,size,size);
    ctx.drawImage(img,x,y,w,h);
  }

  function profileOpenCropBlob(blob){
    if(!blob)return;
    profileRevokeCropUrl();
    const url=URL.createObjectURL(blob),img=new Image();
    profileCrop.url=url;
    img.onload=()=>{
      profileCrop.image=img;profileCrop.offsetX=0;profileCrop.offsetY=0;profileCrop.zoom=1;
      const zoom=$('#aaProfileZoom');if(zoom)zoom.value='1';
      const wrap=$('#aaProfileCropWrap');if(wrap)wrap.hidden=false;
      profileDrawCrop();
    };
    img.onerror=()=>toast('Não foi possível abrir essa foto.');
    img.src=url;
  }

  async function profileOpenExistingCrop(){
    if(profilePhotoBlob){profileOpenCropBlob(profilePhotoBlob);return;}
    const url=state.profile?.foto_url;
    if(!url){toast('Escolha uma foto primeiro.');return;}
    try{
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok)throw new Error('Falha ao carregar a foto.');
      profileOpenCropBlob(await res.blob());
    }catch(err){toast(err?.message||'Não foi possível carregar a foto.');}
  }

  function profileCropOutput(){
    return new Promise((resolve,reject)=>{
      const img=profileCrop.image;if(!img)return reject(new Error('Nenhuma foto para enquadrar.'));
      const size=512,out=document.createElement('canvas');out.width=size;out.height=size;
      const ctx=out.getContext('2d');
      const preview=$('#aaProfileCropCanvas'),ratio=size/(preview?.width||280);
      const base=Math.max(size/img.naturalWidth,size/img.naturalHeight);
      const scale=base*profileCrop.zoom;
      const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
      const x=(size-w)/2+profileCrop.offsetX*ratio,y=(size-h)/2+profileCrop.offsetY*ratio;
      ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);ctx.drawImage(img,x,y,w,h);
      out.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível gerar o recorte.')),'image/jpeg',0.92);
    });
  }

  async function profileApplyCrop(){
    try{
      profilePhotoBlob=await profileCropOutput();
      profileRemovePhoto=false;
      const preview=$('#aaProfilePreview'),remove=$('#aaProfileRemovePhoto'),adjust=$('#aaProfileAdjustPhoto');
      const url=URL.createObjectURL(profilePhotoBlob);
      if(preview)preview.innerHTML='<img src="'+esc(url)+'" alt="">';
      if(remove)remove.disabled=false;if(adjust)adjust.disabled=false;
      const wrap=$('#aaProfileCropWrap');if(wrap)wrap.hidden=true;
      toast('Enquadramento aplicado.');
    }catch(err){toast(err?.message||String(err));}
  }

  function profileBindCrop(){
    const canvas=$('#aaProfileCropCanvas'),zoom=$('#aaProfileZoom');
    if(!canvas||canvas.dataset.bound)return;
    canvas.dataset.bound='1';
    canvas.addEventListener('pointerdown',e=>{
      if(!profileCrop.image)return;
      profileCrop.drag=true;profileCrop.lastX=e.clientX;profileCrop.lastY=e.clientY;
      canvas.closest('.aa-crop-stage')?.classList.add('dragging');
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
      if(!profileCrop.drag||!profileCrop.image)return;
      const rect=canvas.getBoundingClientRect(),factor=canvas.width/Math.max(rect.width,1);
      profileCrop.offsetX+=(e.clientX-profileCrop.lastX)*factor;
      profileCrop.offsetY+=(e.clientY-profileCrop.lastY)*factor;
      profileCrop.lastX=e.clientX;profileCrop.lastY=e.clientY;profileDrawCrop();
    });
    const end=e=>{profileCrop.drag=false;canvas.closest('.aa-crop-stage')?.classList.remove('dragging');try{canvas.releasePointerCapture?.(e.pointerId)}catch{}};
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    zoom?.addEventListener('input',()=>{profileCrop.zoom=Number(zoom.value)||1;profileDrawCrop();});
  }

  function renderProfileForm(){
    const body=$('#allianceProfileBody');if(!body||!state.profile)return;
    const p=state.profile,photo=p.foto_url||'';
    const areaOptions='<option value="">Sem área definida</option>'+state.areas.map(a=>'<option value="'+esc(a.id)+'" '+(String(p.area_id||'')===String(a.id)?'selected':'')+'>'+esc(a.nome)+'</option>').join('');
    body.innerHTML=
      '<div class="aa-profile-photo-row"><div class="aa-profile-photo" id="aaProfilePreview">'+avatarInner(p,p.nome)+'</div><div class="aa-profile-photo-actions"><input id="aaProfilePhoto" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><small>Escolha a foto e depois ajuste o rosto dentro do círculo.</small><div class="aa-profile-photo-buttons"><button class="aa-profile-btn" id="aaProfileAdjustPhoto" type="button" '+(!photo?'disabled':'')+'>Ajustar enquadramento</button><button class="aa-profile-btn danger" id="aaProfileRemovePhoto" type="button" '+(!photo?'disabled':'')+'>Remover foto</button></div></div></div>'+
      '<div class="aa-profile-crop" id="aaProfileCropWrap" hidden><div class="aa-profile-crop-head"><div><b>Ajuste seu enquadramento</b><span>Arraste a foto até o rosto ficar onde você quer dentro do círculo.</span></div></div><div class="aa-crop-stage"><canvas id="aaProfileCropCanvas" width="280" height="280"></canvas></div><div class="aa-crop-zoom"><span>−</span><input id="aaProfileZoom" type="range" min="1" max="3" step="0.01" value="1" aria-label="Zoom da foto"><span>+</span></div><div class="aa-crop-actions"><button class="aa-profile-btn" type="button" id="aaProfileCropCancel">Cancelar</button><button class="aa-profile-btn primary" type="button" id="aaProfileCropApply">Aplicar enquadramento</button></div></div>'+
      '<div class="aa-profile-grid"><div class="aa-profile-field full"><label>Nome</label><input id="aaProfileName" value="'+esc(p.nome||'')+'" maxlength="200"></div><div class="aa-profile-field"><label>Cargo</label><input id="aaProfileCargo" value="'+esc(p.cargo||'')+'" maxlength="200" placeholder="Ex.: Gestão de projetos"></div><div class="aa-profile-field"><label>Área</label><select id="aaProfileArea">'+areaOptions+'</select></div><div class="aa-profile-field"><label>E-mail</label><input value="'+esc(p.email||'')+'" readonly></div><div class="aa-profile-field"><label>Papel</label><input value="'+esc(p.papel==='admin'?'Administrador':'Membro')+'" readonly></div></div>'+
      '<div class="aa-profile-actions"><button class="aa-profile-btn" type="button" data-aa-profile-close-inside>Cancelar</button><button class="aa-profile-btn primary" id="aaProfileSave" type="button">Salvar perfil</button></div>';
    profileRemovePhoto=false;profilePhotoBlob=null;profileCrop.image=null;profileCrop.zoom=1;profileCrop.offsetX=0;profileCrop.offsetY=0;
    $('[data-aa-profile-close-inside]',body)?.addEventListener('click',closeProfileModal);
    const input=$('#aaProfilePhoto',body),preview=$('#aaProfilePreview',body),remove=$('#aaProfileRemovePhoto',body),adjust=$('#aaProfileAdjustPhoto',body);
    input?.addEventListener('change',()=>{
      const file=input.files?.[0];if(!file)return;
      if(file.size>5*1024*1024){toast('A foto precisa ter no máximo 5 MB.');input.value='';return;}
      if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){toast('Use JPG, PNG, WEBP ou GIF.');input.value='';return;}
      profileRemovePhoto=false;if(remove)remove.disabled=false;if(adjust)adjust.disabled=false;
      profileOpenCropBlob(file);
    });
    adjust?.addEventListener('click',profileOpenExistingCrop);
    remove?.addEventListener('click',()=>{
      profileRemovePhoto=true;profilePhotoBlob=null;profileCrop.image=null;if(input)input.value='';
      const crop=$('#aaProfileCropWrap');if(crop)crop.hidden=true;
      preview.textContent=initials($('#aaProfileName',body)?.value||p.nome);remove.disabled=true;if(adjust)adjust.disabled=true;
    });
    $('#aaProfileCropApply',body)?.addEventListener('click',profileApplyCrop);
    $('#aaProfileCropCancel',body)?.addEventListener('click',()=>{const crop=$('#aaProfileCropWrap');if(crop)crop.hidden=true;});
    $('#aaProfileSave',body)?.addEventListener('click',saveProfile);
    profileBindCrop();
  }

  async function saveProfile(){
    if(!state.user||!state.profile)return;
    const btn=$('#aaProfileSave'),name=$('#aaProfileName')?.value.trim(),cargo=$('#aaProfileCargo')?.value.trim()||null,area=$('#aaProfileArea')?.value||null;
    if(!name){toast('Digite seu nome.');return;}
    btn.disabled=true;btn.textContent='Salvando…';
    const oldName=state.profile.nome;
    try{
      let fotoUrl=state.profile.foto_url||null;
      const path=state.user.id+'/avatar';
      if(profileRemovePhoto){
        const rem=await state.sb.storage.from('profile-avatars').remove([path]);
        if(rem.error&&!String(rem.error.message||'').toLowerCase().includes('not found'))throw rem.error;
        fotoUrl=null;
      }else{
        let uploadBlob=profilePhotoBlob;
        const crop=$('#aaProfileCropWrap');
        if(!uploadBlob&&profileCrop.image&&crop&&!crop.hidden)uploadBlob=await profileCropOutput();
        if(uploadBlob){
          const upload=await state.sb.storage.from('profile-avatars').upload(path,uploadBlob,{upsert:true,contentType:'image/jpeg',cacheControl:'3600'});
          if(upload.error)throw upload.error;
          const pub=state.sb.storage.from('profile-avatars').getPublicUrl(path);
          fotoUrl=(pub.data?.publicUrl||'')+'?v='+Date.now();
        }
      }
      const {data,error}=await state.sb.rpc('atualizar_meu_perfil',{p_nome:name,p_cargo:cargo,p_area_id:area,p_foto_url:fotoUrl});
      if(error)throw error;
      const updated=Array.isArray(data)?data[0]:data;if(updated)state.profile=updated;
      if(norm(oldName)!==norm(name)){
        try{
          let touched=false;
          for(const t of state.tasks){
            if(!(t.assigneeIds||[]).some(id=>String(id)===String(state.user.id))||!Array.isArray(t.assignees))continue;
            const next=t.assignees.map(n=>norm(n)===norm(oldName)?name:n);
            if(JSON.stringify(next)!==JSON.stringify(t.assignees)){t.assignees=next;touched=true;}
          }
          if(touched)await writeTasks(state.tasks);
        }catch(syncErr){console.warn('[AllianceOS profile task name sync]',syncErr);}
      }
      await audit('atualizar_perfil','perfil',state.user.id,{nome:name,cargo,area_id:area,foto:!!fotoUrl});
      await refreshAll();closeProfileModal();toast('Perfil atualizado.');
    }catch(err){toast(err?.message||String(err));}
    finally{btn.disabled=false;btn.textContent='Salvar perfil';}
  }

  function openProfileModal(){
    if(!state.user){openModal();return;}
    ensureProfileModal();renderProfileForm();$('#allianceProfileModal').classList.add('open');
  }

    function installNav(){
    const legacyNav=$('.nav')||$('.sidebar');
    if(legacyNav&&!$('#allianceAdminNav')){
      const b=document.createElement('button');
      b.type='button';b.id='allianceAdminNav';b.className='navitem aa-navitem';
      b.innerHTML='<span class="icon">⚙</span><span>Equipe & listas</span>';
      b.addEventListener('click',openModal);legacyNav.appendChild(b);
    }

    const bindCapture=(el,key,handler)=>{
      if(!el||el.dataset[key])return;
      el.dataset[key]='1';
      el.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();handler(e);
      },true);
    };
    bindCapture($('.ref2-nav-btn[data-key="settings"]'),'aaAdminBound',()=>openModal());
    bindCapture($('.ref2-team'),'aaAdminBound',()=>openModal());
    bindCapture($('.ref2-profile'),'aaProfileBound',()=>state.user?openProfileModal():openModal());
    bindCapture($('.ref2-nav-btn[data-key="notifications"]'),'aaNotifBound',e=>state.user?openNotifications(e):openModal());
  }

  function renderDirectoryChrome(){
    const real=state.members.filter(m=>m.tipo==='usuario');
    const count=real.length;
    $$('.ref2-workspace-copy span').forEach(el=>el.textContent=count+' membro'+(count===1?'':'s'));
    const team=$('.ref2-team');
    if(team){
      team.setAttribute('aria-label','Equipe Alliance · '+count+' membro'+(count===1?'':'s'));
      const shown=real.slice(0,2);
      team.innerHTML=shown.map(m=>'<span class="ref2-team-avatar">'+avatarInner(m,m.nome)+'</span>').join('')+
        (count>2?'<span class="ref2-team-avatar more">+'+(count-2)+'</span>':'');
    }
    if(state.profile){
      const av=$('.ref2-avatar');
      if(av){av.innerHTML=avatarInner(state.profile,state.profile.nome);av.style.overflow='hidden';}
      const profileBtn=$('.ref2-profile');if(profileBtn)profileBtn.setAttribute('aria-label','Editar perfil · '+(state.profile.nome||'Perfil'));
    }
  }

  function loginView(){
    return '<div class="aa-login"><h2>Entrar para administrar</h2><p>Equipe, listas e notificações usam a conta real do AllianceOS e respeitam as políticas RLS.</p><label>E-mail<input id="aaLoginEmail" type="email" autocomplete="email"></label><label>Senha<input id="aaLoginPassword" type="password" autocomplete="current-password"></label><button id="aaLoginButton" class="primary">Entrar</button><button id="aaMagicButton">Enviar link mágico</button><small id="aaLoginMsg"></small></div>';
  }

  function memberBadge(m){return m.tipo==='usuario'?'<span class="aa-badge ok">usuário real</span>':m.tipo==='legado'?'<span class="aa-badge warn">legado</span>':'<span class="aa-badge">convite pendente</span>';}
  function inviteStatusHtml(m){
    if(m.convite_aceito_em)return '<span class="aa-badge ok">convite aceito · '+esc(new Date(m.convite_aceito_em).toLocaleString('pt-BR'))+'</span>';
    if(m.convite_status==='enviado')return '<span class="aa-badge ok">enviado · '+esc(m.convite_enviado_em?new Date(m.convite_enviado_em).toLocaleString('pt-BR'):'agora')+'</span>';
    if(m.convite_status==='falhou')return '<span class="aa-badge warn" title="'+esc(m.convite_erro||'Falha no envio')+'">falhou · '+esc(m.convite_erro||'erro no envio')+'</span>';
    if(m.tipo==='convite_pendente')return '<span class="aa-badge">ainda não enviado</span>';
    return '';
  }

  function teamView(){
    const real=state.members.filter(m=>m.tipo==='usuario');
    const legacy=state.members.filter(m=>m.tipo==='legado');
    const pending=state.members.filter(m=>m.tipo==='convite_pendente');
    const admin=state.profile?.papel==='admin';
    return '<div class="aa-section"><div class="aa-title"><div><h2>Equipe</h2><p>Somente usuários reais recebem novas atribuições e notificações.</p></div><span>'+real.length+' ativos</span></div>'+
      (admin?'<form id="aaInviteForm" class="aa-form"><input id="aaInviteName" placeholder="Nome" required><input id="aaInviteEmail" type="email" placeholder="E-mail" required><input id="aaInviteRoleName" placeholder="Cargo"><select id="aaInviteRole"><option value="membro">Membro</option><option value="admin">Admin</option></select><select id="aaInviteBrand" multiple>'+state.brands.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nome)+'</option>').join('')+'</select><button class="primary">Convidar por e-mail</button></form>':'')+
      '<div class="aa-grid-list">'+real.map(m=>'<article><div><b>'+esc(m.nome)+'</b><small>'+esc(m.email||'')+'</small></div>'+memberBadge(m)+inviteStatusHtml(m)+(admin?'<input class="aa-member-cargo" data-aa-member-cargo="'+esc(m.id)+'" value="'+esc(m.cargo||'')+'" placeholder="Cargo"><select data-aa-member-role="'+esc(m.id)+'"><option value="membro" '+(m.papel==='membro'?'selected':'')+'>Membro</option><option value="admin" '+(m.papel==='admin'?'selected':'')+'>Admin</option></select><button data-aa-save-member="'+esc(m.id)+'">Salvar</button>':'')+'</article>').join('')+'</div>'+
      (pending.length?'<h3>Convites pendentes</h3><div class="aa-grid-list">'+pending.map(m=>'<article><div><b>'+esc(m.nome)+'</b><small>'+esc(m.email||'')+'</small></div>'+inviteStatusHtml(m)+(admin?'<button data-aa-resend-invite="'+esc(m.email)+'">Reenviar convite</button>':'')+'</article>').join('')+'</div>':'')+
      (legacy.length?'<h3>Responsáveis legados para migrar</h3><div class="aa-grid-list">'+legacy.map(m=>'<article class="aa-legacy"><div><b>'+esc(m.nome)+'</b><small>Nome importado, sem conta real</small></div><select data-aa-migrate-select="'+esc(m.nome)+'"><option value="">Vincular a usuário…</option>'+real.map(r=>'<option value="'+esc(r.id)+'">'+esc(r.nome)+'</option>').join('')+'</select><button data-aa-migrate="'+esc(m.nome)+'" '+(!admin?'disabled':'')+'>Migrar tarefas</button></article>').join('')+'</div>':'<div class="aa-empty">Nenhum responsável legado pendente.</div>')+
      '</div>';
  }

  function listsView(){
    const admin=state.profile?.papel==='admin';
    return '<div class="aa-section"><div class="aa-title"><div><h2>Listas</h2><p>Hierarquia: marca → lista/campanha → tarefa → subtarefa.</p></div><span>'+state.lists.filter(l=>!l.arquivada).length+' ativas</span></div>'+
      '<form id="aaListForm" class="aa-form"><input id="aaListName" placeholder="Nome da lista" required><select id="aaListBrand">'+state.brands.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nome)+'</option>').join('')+'</select><input id="aaListCampaign" placeholder="ID de campanha (opcional)"><button class="primary">Criar lista</button></form>'+
      '<div class="aa-grid-list">'+state.lists.map(l=>'<article class="'+(l.arquivada?'archived':'')+'"><div><input class="aa-inline-name" data-aa-list-name="'+esc(l.id)+'" value="'+esc(l.nome)+'"><small>'+esc(l.marca)+(l.campanha_id?' · campanha '+esc(l.campanha_id):'')+'</small></div><button data-aa-save-list="'+esc(l.id)+'">Salvar</button><button data-aa-archive-list="'+esc(l.id)+'">'+(l.arquivada?'Desarquivar':'Arquivar')+'</button></article>').join('')+'</div></div>';
  }

  function cleanupView(){
    const candidates=state.lists.filter(l=>!l.arquivada&&state.tasks.filter(t=>String(t.listId||'')===String(l.id)||(!t.listId&&norm(t.brand)===norm(l.marca)&&norm(t.project||'Operação')===norm(l.nome))).length===1);
    const active=state.lists.filter(l=>!l.arquivada);
    return '<div class="aa-section"><div class="aa-title"><div><h2>Limpeza de listas</h2><p>Nada é convertido automaticamente. Escolha explicitamente a lista e o destino.</p></div><span>'+candidates.length+' candidatas</span></div>'+
      (candidates.length?'<div class="aa-grid-list">'+candidates.map(l=>'<article class="aa-clean-row"><div><b>'+esc(l.nome)+'</b><small>'+esc(l.marca)+' · 1 tarefa</small></div><select data-aa-clean-target="'+esc(l.id)+'"><option value="">Mover tarefa para…</option>'+active.filter(x=>x.id!==l.id&&x.marca===l.marca).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>').join('')+'</select><button data-aa-clean="'+esc(l.id)+'">Converter e arquivar origem</button></article>').join('')+'</div>':'<div class="aa-empty">Nenhuma lista com uma única tarefa encontrada.</div>')+
      '</div>';
  }

  function renderModalBody(){
    const body=$('#allianceAdminBody');if(!body)return;
    if(!state.user){body.innerHTML=loginView();bindLogin();return;}
    const tab=$('#allianceAdminModal')?.dataset.tab||'team';
    body.innerHTML=tab==='lists'?listsView():tab==='cleanup'?cleanupView():teamView();
    if(tab==='team')bindTeam();
    if(tab==='lists')bindLists();
    if(tab==='cleanup')bindCleanup();
  }

  function bindLogin(){
    $('#aaLoginButton')?.addEventListener('click',async()=>{
      const email=$('#aaLoginEmail').value.trim(),password=$('#aaLoginPassword').value,msg=$('#aaLoginMsg');msg.textContent='Entrando…';
      const {error}=await state.sb.auth.signInWithPassword({email,password});msg.textContent=error?error.message:'';
    });
    $('#aaMagicButton')?.addEventListener('click',async()=>{
      const email=$('#aaLoginEmail').value.trim(),msg=$('#aaLoginMsg');if(!email){msg.textContent='Digite seu e-mail.';return}
      msg.textContent='Enviando…';const {error}=await state.sb.auth.signInWithOtp({email,options:{emailRedirectTo:APP_URL}});
      msg.textContent=error?error.message:'Link enviado. Abra o e-mail neste navegador.';
    });
  }

  async function sendInviteFromInterface(email){
    const normalized=String(email||'').toLowerCase().trim();
    const current=state.invites.find(x=>norm(x.email)===norm(normalized));
    const attemptedAt=new Date().toISOString();
    const attempts=Number(current?.tentativas_envio||0)+1;
    const {error:mailError}=await state.sb.auth.signInWithOtp({email:normalized,options:{emailRedirectTo:APP_URL,shouldCreateUser:true}});
    const patch={
      ultimo_envio_em:attemptedAt,
      tentativas_envio:attempts,
      envio_status:mailError?'falhou':'enviado',
      envio_erro:mailError?String(mailError.message||'Falha desconhecida no envio'):null,
      atualizado_em:attemptedAt
    };
    if(!mailError)patch.enviado_em=attemptedAt;
    const {error:updateError}=await state.sb.from('equipe_convites').update(patch).eq('email',normalized);
    if(updateError)throw updateError;
    return {status:patch.envio_status,erro:patch.envio_erro,enviado_em:patch.enviado_em||current?.enviado_em||null,ultimo_envio_em:attemptedAt};
  }

  function bindTeam(){
    $$('[data-aa-save-member]').forEach(btn=>btn.addEventListener('click',async()=>{
      const id=btn.dataset.aaSaveMember,cargo=$('[data-aa-member-cargo="'+id+'"]')?.value.trim()||null,papel=$('[data-aa-member-role="'+id+'"]')?.value||'membro';
      try{
        if(id===state.user.id&&state.profile?.papel==='admin'&&papel!=='admin'&&state.members.filter(m=>m.tipo==='usuario'&&m.papel==='admin').length<=1)throw new Error('Não é possível remover o último administrador.');
        const {error}=await state.sb.from('profiles').update({cargo,papel}).eq('id',id);if(error)throw error;
        await audit('atualizar_membro','membro',id,{cargo,papel});toast('Membro atualizado');await refreshAll();
      }catch(err){toast(err.message||String(err));}
    }));
    $('#aaInviteForm')?.addEventListener('submit',async e=>{
      e.preventDefault();
      try{
        const email=$('#aaInviteEmail').value.trim().toLowerCase(),nome=$('#aaInviteName').value.trim(),cargo=$('#aaInviteRoleName').value.trim(),papel=$('#aaInviteRole').value,marcas=[...$('#aaInviteBrand').selectedOptions].map(o=>o.value);
        const {error}=await state.sb.from('equipe_convites').upsert({email,nome,cargo:cargo||null,papel,marcas,criado_por:state.user.id,envio_status:'pendente',envio_erro:null,atualizado_em:new Date().toISOString()},{onConflict:'email'});
        if(error)throw error;
        const envio=await sendInviteFromInterface(email);
        await audit('convidar_membro','membro',email,{nome,papel,marcas,envio_status:envio.status,envio_erro:envio.erro});
        toast(envio.status==='enviado'?'Convite enviado':'Convite registrado; envio falhou: '+(envio.erro||'erro desconhecido'));await refreshAll();
      }catch(err){toast(err.message||String(err));}
    });
    $$('[data-aa-resend-invite]').forEach(btn=>btn.addEventListener('click',async()=>{
      const email=btn.dataset.aaResendInvite;btn.disabled=true;
      try{
        const envio=await sendInviteFromInterface(email);
        await audit('reenviar_convite','membro',email,{envio_status:envio.status,envio_erro:envio.erro});
        toast(envio.status==='enviado'?'Convite reenviado':'Reenvio falhou: '+(envio.erro||'erro desconhecido'));
        await refreshAll();
      }catch(err){toast(err.message||String(err));btn.disabled=false;}
    }));
    $$('[data-aa-migrate]').forEach(btn=>btn.addEventListener('click',async()=>{
      const legacy=btn.dataset.aaMigrate,select=$('[data-aa-migrate-select="'+CSS.escape(legacy)+'"]'),profileId=select?.value;
      if(!profileId){toast('Escolha um usuário real.');return;}
      if(!confirm('Migrar todas as tarefas de "'+legacy+'" para o usuário escolhido?'))return;
      btn.disabled=true;
      try{
        const {data,error}=await state.sb.rpc('migrar_responsavel_legado',{p_legacy_name:legacy,p_profile_id:profileId});
        if(error)throw error;
        const count=Number(data?.tarefas_migradas||0);
        toast(count+' tarefa(s) migrada(s) com histórico preservado.');
        await refreshAll();
        setTimeout(()=>location.reload(),450);
      }catch(err){toast(err.message||String(err));btn.disabled=false;}
    }));
  }

  function bindLists(){
    $('#aaListForm')?.addEventListener('submit',async e=>{
      e.preventDefault();try{
        const nome=$('#aaListName').value.trim(),brand_id=$('#aaListBrand').value,campanha_id=$('#aaListCampaign').value.trim()||null;
        const {data,error}=await state.sb.from('task_lists').insert({nome,brand_id,campanha_id,criado_por:state.user.id}).select('id').single();if(error)throw error;
        await audit('criar_lista','lista',data.id,{nome,brand_id});toast('Lista criada');await refreshAll();
      }catch(err){toast(err.message||String(err));}
    });
    $$('[data-aa-save-list]').forEach(btn=>btn.addEventListener('click',async()=>{
      const id=btn.dataset.aaSaveList,l=state.lists.find(x=>String(x.id)===String(id)),nome=$('[data-aa-list-name="'+id+'"]')?.value.trim();if(!l||!nome)return;
      try{
        const {error}=await state.sb.from('task_lists').update({nome}).eq('id',id);if(error)throw error;
        let changed=0;for(const t of state.tasks){if(String(t.listId||'')===String(id)||(!t.listId&&norm(t.brand)===norm(l.marca)&&norm(t.project||'Operação')===norm(l.nome))){t.listId=id;t.project=nome;changed++;}}
        if(changed){await writeTasks(state.tasks);localStorage.setItem(TASKS_KEY,JSON.stringify(state.tasks));}
        await audit('atualizar_lista','lista',id,{nome});toast('Lista atualizada');await refreshAll();
      }catch(err){toast(err.message||String(err));}
    }));
    $$('[data-aa-archive-list]').forEach(btn=>btn.addEventListener('click',async()=>{
      const id=btn.dataset.aaArchiveList,l=state.lists.find(x=>String(x.id)===String(id));if(!l)return;
      try{
        const {error}=await state.sb.from('task_lists').update({arquivado_em:l.arquivada?null:new Date().toISOString(),arquivado_por:l.arquivada?null:state.user.id}).eq('id',id);if(error)throw error;
        await audit(l.arquivada?'desarquivar_lista':'arquivar_lista','lista',id);toast(l.arquivada?'Lista desarquivada':'Lista arquivada');await refreshAll();
      }catch(err){toast(err.message||String(err));}
    }));
  }

  function bindCleanup(){
    $$('[data-aa-clean]').forEach(btn=>btn.addEventListener('click',async()=>{
      const sourceId=btn.dataset.aaClean,targetId=$('[data-aa-clean-target="'+sourceId+'"]')?.value;
      if(!targetId){toast('Escolha a lista destino.');return;}
      const src=state.lists.find(x=>String(x.id)===String(sourceId)),dst=state.lists.find(x=>String(x.id)===String(targetId));
      if(!src||!dst)return;
      const matches=state.tasks.filter(t=>String(t.listId||'')===String(sourceId)||(!t.listId&&norm(t.brand)===norm(src.marca)&&norm(t.project||'Operação')===norm(src.nome)));
      if(matches.length!==1){toast('A lista não possui exatamente uma tarefa; nada foi alterado.');return;}
      if(!confirm('Mover "'+matches[0].title+'" para "'+dst.nome+'" e arquivar a lista "'+src.nome+'"?'))return;
      btn.disabled=true;
      try{
        const {data,error}=await state.sb.rpc('consolidar_lista_em_destino',{p_source_list:sourceId,p_dest_list:targetId});
        if(error)throw error;
        toast(Number(data?.tarefas_movidas||0)+' tarefa(s) movida(s); lista de origem arquivada.');
        await refreshAll();
        setTimeout(()=>location.reload(),450);
      }catch(err){toast(err.message||String(err));btn.disabled=false;}
    }));
  }

  function renderBell(){
    const n=state.notifications.filter(x=>!x.read_at).length;
    $$('.ref2-top-badge,.ref2-nav-badge').forEach(badge=>{
      badge.textContent=String(n);
      badge.style.display=n?'grid':'none';
    });
  }

  function openNotifications(e){
    e?.preventDefault();e?.stopPropagation();e?.stopImmediatePropagation?.();
    if(!state.user){openModal();return;}
    let panel=$('#allianceNotifications');
    if(panel){panel.remove();return;}
    panel=document.createElement('div');panel.id='allianceNotifications';
    panel.innerHTML='<header><b>Notificações</b><button type="button">×</button></header><div>'+((state.notifications||[]).map(n=>'<button class="aa-notification '+(n.read_at?'read':'')+'" data-aa-notification="'+n.id+'" data-task="'+esc(n.task_id||'')+'"><b>'+esc(n.title)+'</b><span>'+esc(n.body||'')+'</span><small>'+new Date(n.created_at).toLocaleString('pt-BR')+'</small></button>').join('')||'<div class="aa-empty">Nenhuma notificação.</div>')+'</div>';
    document.body.appendChild(panel);panel.querySelector('header button').onclick=()=>panel.remove();
    $$('[data-aa-notification]',panel).forEach(b=>b.addEventListener('click',async()=>{
      await state.sb.from('notifications').update({read_at:new Date().toISOString()}).eq('id',Number(b.dataset.aaNotification)).eq('user_id',state.user.id);
      const task=b.dataset.task;if(task){location.href='/?task='+encodeURIComponent(task)+'#tasks';location.reload();}else{panel.remove();await loadNotifications();}
    }));
  }

  function installBell(){
    const bell=$('.ref2-top-bell');if(!bell||bell.dataset.aaBound)return;bell.dataset.aaBound='1';bell.addEventListener('click',openNotifications,true);
  }

  window.AllianceOSAdmin={open:openModal,refresh:refreshAll};

  async function boot(){
    try{
      await initClient();
      ensureModal();
      const install=()=>{installNav();installBell();};
      install();setTimeout(install,600);setTimeout(install,1800);
      await refreshAll();
      setInterval(()=>{loadNotifications().catch(()=>{});},30000);
    }catch(e){console.warn('[AllianceOS admin boot]',e);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();