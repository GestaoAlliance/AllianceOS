(() => {
  'use strict';

  const CONFIG_URL='https://lpnyrzsdiyzjnhovpduk.supabase.co/functions/v1/public-config';
  const TASKS_KEY='central.tasks.vitor-gutierrez';
  const APP_URL='https://alliance-os-sooty.vercel.app';
  const state={sb:null,user:null,profile:null,members:[],lists:[],brands:[],links:[],invites:[],tasks:[],notifications:[]};
  window.AllianceOSDirectory={members:[],lists:[],brands:[]};

  const esc=(v)=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const norm=(v)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
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
    return names.map(name=>state.members.find(m=>m.tipo==='usuario'&&norm(m.nome)===norm(name))?.id).filter(Boolean);
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
    const [profileR,profilesR,brandsR,listsR,linksR,invitesR,tasks]=await Promise.all([
      state.sb.from('profiles').select('id,nome,email,papel,cargo,ativo').eq('id',state.user.id).maybeSingle(),
      state.sb.from('profiles').select('id,nome,email,papel,cargo,ativo').eq('ativo',true).order('nome'),
      state.sb.from('brands').select('id,nome,slug,ativo').eq('ativo',true).order('nome'),
      state.sb.from('task_lists').select('id,nome,brand_id,campanha_id,arquivado_em').order('nome'),
      state.sb.from('legacy_member_links').select('legacy_name,profile_id,migrado_em,tarefas_migradas'),
      state.sb.from('equipe_convites').select('email,nome,cargo,papel,enviado_em,aceito_em').order('nome'),
      readTasks()
    ]);
    state.profile=profileR.data||null;
    state.brands=brandsR.data||[];
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
    state.members=(profilesR.data||[]).map(p=>({...p,tipo:'usuario',atribuivel:true}));
    const known=new Set(state.members.map(x=>norm(x.nome)));
    for(const t of tasks){
      for(const name of Array.isArray(t.assignees)?t.assignees:[]){
        if(!name||known.has(norm(name))||linked.has(norm(name)))continue;
        known.add(norm(name));state.members.push({id:'nome:'+norm(name),nome:name,email:null,tipo:'legado',atribuivel:false});
      }
    }
    for(const c of state.invites){
      if(c.aceito_em||(profilesR.data||[]).some(p=>norm(p.email)===norm(c.email)))continue;
      state.members.push({id:'convite:'+c.email,nome:c.nome||c.email,email:c.email,papel:c.papel,cargo:c.cargo,tipo:'convite_pendente',atribuivel:false,enviado_em:c.enviado_em});
    }
    const brandMap=new Map(state.brands.map(b=>[String(b.id),b]));
    state.lists=(listsR.data||[]).map(l=>({...l,marca:brandMap.get(String(l.brand_id))?.nome||'',arquivada:!!l.arquivado_em}));
    window.AllianceOSDirectory={members:state.members,lists:state.lists,brands:state.brands};
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
      team.innerHTML=shown.map(m=>'<span class="ref2-team-avatar">'+esc((String(m.nome||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('')||'—').toUpperCase())+'</span>').join('')+
        (count>2?'<span class="ref2-team-avatar more">+'+(count-2)+'</span>':'');
    }
    if(state.profile){
      const av=$('.ref2-avatar');
      if(av)av.textContent=(String(state.profile.nome||'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('')||'—').toUpperCase();
      const profileBtn=$('.ref2-profile');if(profileBtn)profileBtn.setAttribute('aria-label',state.profile.nome||'Perfil');
    }
  }

  function loginView(){
    return '<div class="aa-login"><h2>Entrar para administrar</h2><p>Equipe, listas e notificações usam a conta real do AllianceOS e respeitam as políticas RLS.</p><label>E-mail<input id="aaLoginEmail" type="email" autocomplete="email"></label><label>Senha<input id="aaLoginPassword" type="password" autocomplete="current-password"></label><button id="aaLoginButton" class="primary">Entrar</button><button id="aaMagicButton">Enviar link mágico</button><small id="aaLoginMsg"></small></div>';
  }

  function memberBadge(m){return m.tipo==='usuario'?'<span class="aa-badge ok">usuário real</span>':m.tipo==='legado'?'<span class="aa-badge warn">legado</span>':'<span class="aa-badge">convite pendente</span>';}

  function teamView(){
    const real=state.members.filter(m=>m.tipo==='usuario');
    const legacy=state.members.filter(m=>m.tipo==='legado');
    const pending=state.members.filter(m=>m.tipo==='convite_pendente');
    const admin=state.profile?.papel==='admin';
    return '<div class="aa-section"><div class="aa-title"><div><h2>Equipe</h2><p>Somente usuários reais recebem novas atribuições e notificações.</p></div><span>'+real.length+' ativos</span></div>'+
      (admin?'<form id="aaInviteForm" class="aa-form"><input id="aaInviteName" placeholder="Nome" required><input id="aaInviteEmail" type="email" placeholder="E-mail" required><input id="aaInviteRoleName" placeholder="Cargo"><select id="aaInviteRole"><option value="membro">Membro</option><option value="admin">Admin</option></select><select id="aaInviteBrand" multiple>'+state.brands.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nome)+'</option>').join('')+'</select><button class="primary">Convidar por e-mail</button></form>':'')+
      '<div class="aa-grid-list">'+real.map(m=>'<article><div><b>'+esc(m.nome)+'</b><small>'+esc(m.email||'')+'</small></div>'+memberBadge(m)+(admin?'<input class="aa-member-cargo" data-aa-member-cargo="'+esc(m.id)+'" value="'+esc(m.cargo||'')+'" placeholder="Cargo"><select data-aa-member-role="'+esc(m.id)+'"><option value="membro" '+(m.papel==='membro'?'selected':'')+'>Membro</option><option value="admin" '+(m.papel==='admin'?'selected':'')+'>Admin</option></select><button data-aa-save-member="'+esc(m.id)+'">Salvar</button>':'')+'</article>').join('')+'</div>'+
      (pending.length?'<h3>Convites pendentes</h3><div class="aa-grid-list">'+pending.map(m=>'<article><div><b>'+esc(m.nome)+'</b><small>'+esc(m.email||'')+'</small></div>'+memberBadge(m)+'</article>').join('')+'</div>':'')+
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
        const {error}=await state.sb.from('equipe_convites').upsert({email,nome,cargo:cargo||null,papel,marcas,criado_por:state.user.id,enviado_em:new Date().toISOString()},{onConflict:'email'});
        if(error)throw error;
        const {error:mailError}=await state.sb.auth.signInWithOtp({email,options:{emailRedirectTo:APP_URL}});
        await audit('convidar_membro','membro',email,{nome,papel,marcas});
        toast(mailError?'Convite salvo; envio de e-mail falhou':'Convite enviado');await refreshAll();
      }catch(err){toast(err.message||String(err));}
    });
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