
/* AllianceOS · Task Reference V10 */
{
  const r10BaseRenderDetail = renderTaskDetailBody;
  const r10Esc = v => String(v == null ? '' : v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});

  const r10Icon = name => {
    const paths={
      campaign:'<rect x="4" y="4" width="6" height="6" rx="1.3"/><rect x="14" y="4" width="6" height="6" rx="1.3"/><rect x="4" y="14" width="6" height="6" rx="1.3"/><path d="M17 14v6M14 17h6"/>',
      task:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
      done:'<path d="m6 12 4 4 8-8"/>',
      pending:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 12h6"/>',
      status:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
      context:'<path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2M8 11h8M8 15h5"/>',
      tag:'<path d="M4 12 12 4h6l2 2v6l-8 8-8-8Z"/><circle cx="16" cy="8" r="1"/>',
      dependency:'<circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 7h4a4 4 0 0 1 4 4v4M15 17h-4a4 4 0 0 1-4-4V9"/>',
      comment:'<path d="M5 5h14v11H9l-4 3V5Z"/><path d="M8 9h8M8 12h5"/>',
      alert:'<path d="M12 4v9"/><path d="M12 17h.01"/>',
      next:'<path d="m9 6 6 6-6 6"/>',
      whatsapp:'<circle cx="12" cy="12" r="8"/><path d="M8.5 8.8c.7 3 2.7 5 5.7 5.8l1.4-1.4 2 .8-.7 2.2c-.2.6-.8 1-1.5 1C10.6 17 7 13.4 6.8 8.6c0-.7.4-1.3 1-1.5L10 6.4l.8 2-1.4 1.4Z"/>',
      folder:'<path d="M3.8 7.5h6l1.7 2H20v8.7a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.2V7.5Z"/><path d="M4 8V5.8A1.8 1.8 0 0 1 5.8 4h4l1.7 2H18"/>',
      calendar:'<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16"/>',
      user:'<circle cx="12" cy="8" r="3"/><path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6"/>',
      priority:'<path d="M6 19V13M12 19V9M18 19V5"/>',
      brand:'<circle cx="12" cy="12" r="8"/><path d="M8.5 12h7M12 8.5v7"/>',
      document:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>',
      image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m6 17 4-4 3 3 2-2 3 3"/>',
      hourglass:'<path d="M7 3h10M7 21h10M8 3c0 4 1 6 4 9-3 3-4 5-4 9M16 3c0 4-1 6-4 9 3 3 4 5 4 9"/>',
      review:'<circle cx="12" cy="12" r="8"/><path d="m10 8 5 4-5 4z"/>',
      send:'<path d="m4 12 16-8-5 16-3-6-8-2Z"/><path d="m12 14 3-3"/>',
      chart:'<path d="M5 19V9M10 19V5M15 19v-7M20 19V3"/><path d="M3 19h19"/>',
      chevronUp:'<path d="m8 14 4-4 4 4"/>',
      running:'<circle cx="12" cy="12" r="6.5"/>',
      blocked:'<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 12h6"/>',
      waiting:'<path d="m9 7 7 5-7 5Z"/>',
      reviewState:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2"/>',
      arrowLeft:'<path d="m15 6-6 6 6 6"/><path d="M9 12h10"/>',
      chevronLeft:'<path d="m14 7-5 5 5 5"/>',
      chevronRight:'<path d="m10 7 5 5-5 5"/>',
      more:'<circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/>',
      flame:'<path d="M13.5 3.5c.3 3-1.7 4.2-3.2 5.8-1.5 1.6-2.2 3-1.2 5.1.5-1.4 1.5-2.2 2.5-3 .2 2.2 1 3.3 2.2 4.4 1.4 1.2 1.8 3.1.8 4.7 3-.9 5.1-3.6 5.1-6.8 0-4.1-2.8-7.8-6.2-10.2Z"/><path d="M9.7 20.5c-2.5-.8-4.2-3-4.2-5.8 0-2.4 1.1-4.3 2.8-5.9-.2 2.3.6 3.4 1.9 4.5-1 1.3-1.4 2.9-.5 4.3.5.8 1.1 1.5 2 2.2-.6.4-1.2.6-2 .7Z"/>',
      whatsappBrand:'<circle cx="12" cy="12" r="9" fill="#22c86a" stroke="none"/><path d="M8.4 8.7c.7 3 2.8 5.2 5.8 5.9l1.5-1.5 2.1.8-.8 2.2c-.2.7-.8 1.1-1.6 1.1-4.8-.2-8.5-3.9-8.7-8.7 0-.7.4-1.3 1.1-1.6l2.2-.8.8 2.1-1.5 1.5Z" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
      folderSolid:'<path d="M3.8 7.5h6.1l1.8 2H20v8.7a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.2V7.5Z" fill="currentColor" stroke="none"/><path d="M4 7.8V5.9A1.9 1.9 0 0 1 5.9 4h4l1.8 2H18" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/>',
      priorityMark:'<path d="m12 3.8 2.15 1.05 2.38.18 1.04 2.16 1.8 1.57-.52 2.34.52 2.34-1.8 1.57-1.04 2.16-2.38.18L12 20.2l-2.15-1.05-2.38-.18-1.04-2.16-1.8-1.57.52-2.34-.52-2.34 1.8-1.57 1.04-2.16 2.38-.18L12 3.8Z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.55" fill="#fff" stroke="none"/>',
      objectiveTarget:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2"/>',
      paperclip:'<path d="m8.5 12.5 6.2-6.2a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a5 5 0 0 1-7.1-7.1l7.2-7.2"/><path d="m10.2 10.8-4.1 4.1a2.3 2.3 0 1 0 3.3 3.3l7.1-7.1"/>',
      fileText:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
      archiveFile:'<path d="M6 3h12v5H6z"/><path d="M7 8h10v13H7zM10 12h4M10 16h4"/>',
      download:'<path d="M12 4v10"/><path d="m8 11 4 4 4-4"/><path d="M5 19h14"/>',
      close:'<path d="m8 8 8 8M16 8l-8 8"/>'
    };
    return '<svg class="r10-svg" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.task)+'</svg>';
  };

  const r10Short = v => String(v||'').split('|')[0].trim();
  const r10Initials = v => {
    const p=r10Short(v).split(/\s+/).filter(Boolean);
    return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase() || '—';
  };
  const r10AvatarInner = (name,userId) => {
    const members=window.AllianceOSDirectory?.members||[];
    const key=String(r10Short(name)||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const person=members.find(m=>m.tipo==='usuario'&&((userId&&String(m.id)===String(userId))||String(m.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()===key));
    return person?.foto_url?'<img src="'+r10Esc(person.foto_url)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">':r10Esc(r10Initials(name));
  };
  const r10Task = id => taskData.find(x=>String(x.id)===String(id))||null;
  const r10Deps = t => (t.dependencies||[]).map(r10Task).filter(Boolean);
  const r10Dependents = t => taskData.filter(x=>(x.dependencies||[]).some(id=>String(id)===String(t.id)));
  const r10Uid = () => window.user?.id || 'vitor-gutierrez';
  const r10CampaignList = () => {
    try{
      const rows=JSON.parse(localStorage.getItem('central.campaigns.'+r10Uid())||'[]');
      return Array.isArray(rows)?rows:[];
    }catch{return []}
  };
  const r10CampaignRecord = t => {
    if(!t?.campaignId)return null;
    return r10CampaignList().find(c=>String(c.id)===String(t.campaignId))||null;
  };
  const r10SameCampaign = (a,b) => {
    if(!b?.campaignId)return String(a.id)===String(b.id);
    return !!a?.campaignId && String(a.campaignId)===String(b.campaignId);
  };
  function r10CampaignTasks(t){
    let rows;
    if(t.campaignId){
      rows=taskData.filter(x=>r10SameCampaign(x,t));
    }else{
      const currentId=String(t.id);
      const related=[
        t,
        ...r10Deps(t),
        ...r10Dependents(t),
        ...(t.parentTaskId?[r10Task(t.parentTaskId)]:[]),
        ...taskData.filter(x=>String(x.parentTaskId||'')===currentId)
      ].filter(Boolean);
      const unique=new Map();
      related.forEach(x=>{if(!unique.has(String(x.id)))unique.set(String(x.id),x)});
      const directDeps=new Set((t.dependencies||[]).map(String));
      const directDependents=new Set(r10Dependents(t).map(x=>String(x.id)));
      rows=[...unique.values()].map(x=>{
        const id=String(x.id);
        let relation='Relacionada';
        if(id===currentId)relation='Tarefa atual';
        else if(directDeps.has(id))relation='Precisa acontecer antes';
        else if(directDependents.has(id))relation='Depende desta tarefa';
        else if(String(x.parentTaskId||'')===currentId)relation='Subtarefa / etapa';
        else if(String(t.parentTaskId||'')===id)relation='Tarefa principal';
        return {...x,_r10Relation:relation};
      });
    }
    const set=new Set(rows.map(x=>String(x.id))), memo=new Map(), visiting=new Set();
    function depth(x){
      const k=String(x.id);if(memo.has(k))return memo.get(k);if(visiting.has(k))return 0;visiting.add(k);
      const ds=(x.dependencies||[]).map(r10Task).filter(d=>d&&set.has(String(d.id)));
      const d=ds.length?1+Math.max.apply(null,ds.map(depth)):0;visiting.delete(k);memo.set(k,d);return d;
    }
    const relationRank={'Precisa acontecer antes':0,'Tarefa principal':1,'Tarefa atual':2,'Subtarefa / etapa':3,'Depende desta tarefa':4,'Relacionada':5};
    return rows.slice().sort((a,b)=>depth(a)-depth(b)||(relationRank[a._r10Relation]??0)-(relationRank[b._r10Relation]??0)||String(a.due||'9999').localeCompare(String(b.due||'9999'))||String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));
  }
  const r10Status = t => t.status==='feito'?'Concluída':t.status==='bloqueado'?'Bloqueada':r10Deps(t).some(x=>x.status!=='feito')?'Bloqueada':t.status==='em revisão'?'Em revisão':(t.status==='fazendo'||t.status==='em andamento')?'Em andamento':'Pendente';
  const r10Priority = t => ({urgent:'Urgente',high:'Alta',alta:'Alta',normal:'Normal',low:'Baixa',baixa:'Baixa'}[String(t.priority||'').toLowerCase()]||String(t.priority||'Normal'));

  const r10Norm = v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const r10BrandTone = brand => {
    const n=r10Norm(brand);
    if(n.includes('botanika'))return 'botanika';
    if(n.includes('revita'))return 'revita';
    if(n.includes('verme'))return 'vermefree';
    if(n.includes('shoty'))return 'shoty';
    return 'default';
  };
  const r10Channel = (t,campaign) => {
    const direct=t?.channel||t?.canal||campaign?.channel||campaign?.canal||campaign?.platform||campaign?.plataforma;
    if(direct)return String(direct);
    const tags=(t?.tags||[]).map(String);
    return tags.find(x=>/whatsapp|instagram|email|meta|youtube|tiktok/i.test(x))||'';
  };
  const r10TagClass = value => {
    const n=r10Norm(value);
    if(n.includes('whatsapp'))return ' whatsapp';
    if(n.includes('criacao')||n.includes('criação'))return ' creation';
    if(n.includes('conversao')||n.includes('conversão'))return ' conversion';
    if(n.includes('urgente')||n.includes('alta'))return ' priority';
    return '';
  };
  const r10MetaPill = (icon,label,kind='') => '<span class="r10-pill '+kind+'">'+r10Icon(icon)+'<span>'+r10Esc(label)+'</span></span>';

  const r10PriorityTone = value => {
    const n=r10Norm(value);
    if(n.includes('urgent'))return 'urgent';
    if(n.includes('alta')||n.includes('high'))return 'high';
    if(n.includes('baixa')||n.includes('low'))return 'low';
    return 'normal';
  };
  const r10PriorityHeaderLabel = value => {
    const p=r10Priority(value);
    if(p==='Alta')return 'Alta prioridade';
    if(p==='Baixa')return 'Baixa prioridade';
    if(p==='Urgente')return 'Urgente';
    return 'Prioridade normal';
  };
  const r10BriefText = (value,max=190) => {
    const clean=String(value||'').replace(/\s+/g,' ').trim();
    if(!clean)return '';
    const sentence=clean.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||clean;
    const source=sentence.length>=55?sentence:clean;
    if(source.length<=max)return source;
    const cut=source.slice(0,max+1), at=cut.lastIndexOf(' ');
    return (at>Math.floor(max*.72)?cut.slice(0,at):source.slice(0,max)).trim()+'…';
  };
  const r10AutoTaskSummary = t => {
    const title=String(t?.title||'esta tarefa').trim();
    const n=r10Norm(title);
    if(/dispar|envi|program/.test(n))return 'Executar '+title.toLowerCase()+' conforme o briefing, os materiais e as orientações definidos para esta tarefa.';
    if(/cri|desenvolv|produz|mont/.test(n))return title+' conforme o briefing, os materiais e o resultado esperado definidos para esta tarefa.';
    if(/revis|aprov|valid/.test(n))return title+' conferindo os critérios, materiais e resultado esperado desta tarefa.';
    return 'Executar '+title.toLowerCase()+' conforme o briefing, os materiais e o resultado esperado desta tarefa.';
  };
  const r10TaskSubtitle = t => r10BriefText(t?.summary||t?.shortDescription||t?.description||t?.objective||t?.briefing)||r10AutoTaskSummary(t);
  const r10AttachmentMeta = f => {
    const name=String(f?.name||'arquivo');
    const ext=(name.includes('.')?name.split('.').pop():'ARQ').toUpperCase();
    const size=String(f?.sizeLabel||f?.size||'').trim();
    return [ext,size].filter(Boolean).join(' · ');
  };
  const r10AttachmentTone = f => {
    const name=r10Norm(f?.name);
    if(/\.pdf$/.test(name))return 'pdf';
    if(/\.(zip|rar|7z)$/.test(name))return 'archive';
    if(/\.(png|jpg|jpeg|webp|gif|svg)$/.test(name))return 'image';
    return 'file';
  };
  const r10AttachmentIcon = f => r10Icon(r10AttachmentTone(f)==='archive'?'archiveFile':'fileText');
  const r10HeaderPill = (icon,label,kind='',attrs='') => '<span class="r10-head-chip '+kind+'" '+attrs+'><span class="r10-head-chip-icon">'+r10Icon(icon)+'</span><span class="r10-head-chip-label">'+r10Esc(label)+'</span></span>';
  const r10CampaignHeaderPill = label => '<button type="button" class="r10-head-chip campaign r10-campaign-link" data-r10-open-campaign="'+r10Esc(label)+'" title="Abrir campanha"><span class="r10-head-chip-icon">'+r10Icon('folderSolid')+'</span><span class="r10-head-chip-label">'+r10Esc(label)+'</span></button>';

  const r10StatusClass = value => 'status-'+r10Norm(value).replace(/\s+/g,'-');
  const r10StatusIcon = value => {
    const n=r10Norm(value);
    if(n==='concluida')return r10Icon('done');
    if(n==='em andamento')return r10Icon('running');
    if(n==='bloqueada')return r10Icon('blocked');
    if(n==='em revisao')return r10Icon('reviewState');
    return r10Icon('waiting');
  };
  const r10FlowDisplayStatus = (x,currentId) => {
    if(x.status==='feito')return 'Concluída';
    if(x.status==='bloqueado'||r10Deps(x).some(d=>d.status!=='feito'))return 'Bloqueada';
    if(x.status==='em revisão')return 'Em revisão';
    if(x.status==='fazendo'||x.status==='em andamento'||String(x.id)===String(currentId))return 'Em andamento';
    return 'Pendente';
  };
  const r10FlowState = (campaign,rows,currentId) => {
    const c=r10Norm(campaign?.status);
    if(c.includes('conclu'))return 'Concluída';
    if(c.includes('execu')||c.includes('prepar')||c.includes('leitura'))return 'Em andamento';
    if(c.includes('bloq'))return 'Bloqueada';
    if(rows.length&&rows.every(x=>x.status==='feito'))return 'Concluída';
    const executable=rows.some(x=>r10FlowDisplayStatus(x,currentId)==='Em andamento');
    if(executable)return 'Em andamento';
    const blocked=rows.some(x=>r10FlowDisplayStatus(x,currentId)==='Bloqueada');
    if(blocked&&rows.every(x=>['Bloqueada','Concluída'].includes(r10FlowDisplayStatus(x,currentId))))return 'Bloqueada';
    return 'Pendente';
  };
  const r10CampaignSubtitle = campaign => {
    const direct=campaign?.summary||campaign?.shortDescription||campaign?.description||campaign?.descricao||campaign?.objective||campaign?.context;
    if(String(direct||'').trim())return String(direct).trim();
    const channels=Array.isArray(campaign?.channels)?campaign.channels.filter(Boolean).join(', '):'';
    let period='';
    if(campaign?.start){
      const d=new Date(String(campaign.start)+'T12:00:00');
      if(!Number.isNaN(d.getTime())){
        period=d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(' de ',' ');
        period=period.charAt(0).toUpperCase()+period.slice(1);
      }
    }
    return [channels,period].filter(Boolean).join(' | ')||campaign?.name||'Campanha vinculada';
  };
  const r10CompletionLabel = t => {
    const raw=t?.completedAt||t?.completed_at||t?.concluidaEm||t?.concluidoEm||'';
    if(raw){
      const d=new Date(raw);
      if(!Number.isNaN(d.getTime())){
        const mon=d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
        return 'Concluída em '+String(d.getDate()).padStart(2,'0')+' '+mon+', '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
      }
      return 'Concluída em '+String(raw);
    }
    const history=(t?.history||[]).find(h=>h?.at&&h.at!=='Agora'&&/(para [“"]?feito|conclu[ií]d)/i.test(String(h.text||'')));
    return history?'Concluída em '+history.at:'Concluída';
  };
  const r10DependencyLabel = (t,rows) => {
    const indexes=[...new Set((t.dependencies||[]).map(id=>rows.findIndex(x=>String(x.id)===String(id))).filter(i=>i>=0).map(i=>i+1))].sort((a,b)=>a-b);
    if(!indexes.length)return '';
    if(indexes.length===1)return 'Depende da tarefa '+indexes[0];
    return 'Depende das tarefas '+indexes.slice(0,-1).join(', ')+' e '+indexes[indexes.length-1];
  };
  const r10StepIcon = (t,status) => {
    const n=r10Norm(t?.title);
    if(status==='Concluída')return r10Icon('done');
    if(status==='Bloqueada')return r10Icon('hourglass');
    if(/arte|criativ|design|banner|imagem|foto/.test(n))return r10Icon('image');
    if(/revis|aprov|valid/.test(n))return r10Icon('review');
    if(/disparo|envio|program|whatsapp|e-mail|email|mensagem/.test(n))return r10Icon('send');
    if(/resultado|acompanh|relat|metric|analise/.test(n))return r10Icon('chart');
    if(/brief|copy|texto|roteir|conteudo/.test(n))return r10Icon('document');
    return r10Icon('task');
  };
  const r10FlowStateHtml = state => '<span class="r10-flow-state state-'+r10Norm(state).replace(/\s+/g,'-')+'"><span class="r10-status-symbol">'+r10StatusIcon(state)+'</span><span>'+r10Esc(state)+'</span></span>';
  const r10StepStatusHtml = (t,status) => {
    if(status==='Concluída')return '<small class="r10-step-completed">'+r10StatusIcon(status)+'<span>'+r10Esc(r10CompletionLabel(t))+'</span></small>';
    return '<span class="r10-step-status '+r10StatusClass(status)+'"><span class="r10-status-symbol">'+r10StatusIcon(status)+'</span><span>'+r10Esc(status)+'</span></span>';
  };

  function r10FlowHtml(t,rows){
    const campaign=r10CampaignRecord(t);
    const linked=!!t.campaignId;
    const hasStandaloneFlow=!linked&&rows.some(x=>String(x.id)!==String(t.id));
    const done=rows.filter(x=>x.status==='feito').length, pct=rows.length?Math.round(done/rows.length*100):0;
    const flowTitle=linked?'Execução da Campanha':'Fluxo da tarefa';
    const flowSubtitle=linked?r10CampaignSubtitle(campaign):(hasStandaloneFlow?'Subtarefas, etapas e dependências':'Tarefa avulsa');
    const flowState=r10FlowState(linked?campaign:null,rows,t.id);
    const flowIcon=linked?r10Icon('campaign'):r10Icon('task');
    let html='<aside class="r10-flow"><div class="r10-flow-head"><span class="r10-flow-icon">'+flowIcon+'</span><div class="r10-flow-head-copy"><strong>'+r10Esc(flowTitle)+'</strong><span title="'+r10Esc(flowSubtitle)+'">'+r10Esc(flowSubtitle)+'</span></div><span class="r10-flow-chevron" aria-hidden="true">'+r10Icon('chevronUp')+'</span></div>'+r10FlowStateHtml(flowState);
    if(linked||hasStandaloneFlow){
      html+='<div class="r10-progress-copy"><b>'+done+' de '+rows.length+' tarefas concluídas</b><span>'+pct+'%</span></div><div class="r10-progress"><i style="width:'+pct+'%"></i></div>';
    }else{
      html+='<div class="r10-progress-copy"><b>Nenhuma etapa vinculada</b><span>—</span></div>';
    }
    html+='<div class="r10-flow-list">';
    rows.forEach(function(x,i){
      const status=r10FlowDisplayStatus(x,t.id), stateClass=' '+r10StatusClass(status);
      const cl=(x.status==='feito'?' done':'')+(String(x.id)===String(t.id)?' current':'')+stateClass;
      const dependency=r10DependencyLabel(x,rows);
      const blockedReason=!dependency&&status==='Bloqueada'&&x.blockedReason?String(x.blockedReason):'';
      const meta=dependency||blockedReason;
      const who=(x.assignees||[])[0]||'';
      const showAvatar=!!who&&(String(x.id)===String(t.id)||status==='Em andamento');
      const avatar=showAvatar?'<span class="r10-step-avatar">'+r10AvatarInner(who,(x.assigneeIds||[])[0])+'</span>':'';
      html+='<button type="button" class="r10-step'+cl+'" data-r10-task="'+r10Esc(x.id)+'" data-number="'+(i+1)+'"><span class="r10-step-icon">'+r10StepIcon(x,status)+'</span><span class="r10-step-copy"><b>'+r10Esc(x.title||'Tarefa')+'</b>'+r10StepStatusHtml(x,status)+(meta?'<small class="r10-step-meta">'+r10Esc(meta)+'</small>':'')+'</span>'+avatar+'</button>';
    });
    return html+'</div></aside>';
  }
  function r10Card(title,icon,body){
    return '<section class="r10-side-card"><div class="r10-side-card-head"><span class="r10-side-card-icon">'+icon+'</span><strong>'+r10Esc(title)+'</strong></div><div class="r10-side-card-body">'+body+'</div></section>';
  }
  function r10MoveField(root,id){const x=root.querySelector('#'+id);return x?x.closest('.tfield'):null}

  function r10RenderDetail(t){
    r10BaseRenderDetail(t);
    const body=document.getElementById('taskDetailBody'), oldLayout=body&&body.querySelector('.tdetail-layout');
    const oldMain=oldLayout&&oldLayout.querySelector('.tdetail-main'), oldSide=oldLayout&&oldLayout.querySelector('.tdetail-side');
    if(!body||!oldLayout||!oldMain||!oldSide)return;

    const campaign=r10CampaignRecord(t);
    const legacyTitleInput=document.getElementById('taskTitleInput');
    const legacySaveButton=document.getElementById('taskSaveBtn');
    const rows=r10CampaignTasks(t), index=Math.max(0,rows.findIndex(x=>String(x.id)===String(t.id))), prev=rows[index-1], nextTask=rows[index+1];
    const briefing=oldMain.querySelector('.description-area')&&oldMain.querySelector('.description-area').closest('.v3-section');
    if(briefing){
      briefing.classList.add('r10-objective-card');
      const head=briefing.querySelector('.tsection-head');
      const textarea=briefing.querySelector('.description-area');
      if(head)head.innerHTML='<span class="r10-objective-heading"><span class="r10-section-icon r10-objective-icon">'+r10Icon('objectiveTarget')+'</span><strong>Objetivo</strong></span>';
      if(textarea){
        textarea.setAttribute('aria-label','Objetivo da tarefa');
        textarea.setAttribute('placeholder','Descreva o resultado esperado desta tarefa, o contexto necessário para executar e como saber que ficou pronto.');
        const fit=()=>{
          textarea.style.height='auto';
          textarea.style.height=Math.max(78,textarea.scrollHeight)+'px';
        };
        textarea.addEventListener('input',fit);
        requestAnimationFrame(fit);
      }
    }
    const attachments=oldMain.querySelector('#attachmentInput')&&oldMain.querySelector('#attachmentInput').closest('.v3-section');
    if(attachments){
      attachments.classList.add('r10-materials-card');
      const files=Array.isArray(t.attachments)?t.attachments:[];
      const count=files.length;
      const head=attachments.querySelector('.tsection-head');
      const input=attachments.querySelector('#attachmentInput');
      const oldDrop=attachments.querySelector('.attachment-drop,.v3-attachment-drop');
      if(head){
        head.innerHTML='<span class="r10-materials-heading"><label class="r10-section-icon r10-materials-icon" title="Adicionar arquivos">'+r10Icon('paperclip')+'</label><strong>Materiais e insumos</strong></span><span class="r10-material-count">'+count+' '+(count===1?'item':'itens')+'</span>';
        const uploadLabel=head.querySelector('.r10-materials-icon');
        if(uploadLabel&&input){
          input.classList.add('r10-material-input');
          input.setAttribute('aria-label','Adicionar arquivos');
          uploadLabel.appendChild(input);
        }
      }
      if(oldDrop&&oldDrop!==input?.parentElement)oldDrop.remove();

      let list=attachments.querySelector('#attachmentList');
      if(!list){
        list=document.createElement('div');
        list.id='attachmentList';
        attachments.appendChild(list);
      }
      list.className='r10-material-list';
      list.replaceChildren();

      if(files.length){
        files.forEach((file,i)=>{
          const row=document.createElement('div');
          const tone=r10AttachmentTone(file);
          row.className='r10-material-item type-'+tone;
          const action=file?.dataUrl
            ? '<a class="r10-material-action" href="'+r10Esc(file.dataUrl)+'" download="'+r10Esc(file.name||'arquivo')+'" title="Baixar arquivo" aria-label="Baixar arquivo">'+r10Icon('download')+'</a>'
            : '<button type="button" class="r10-material-action r10-material-remove" data-r10-remove-material="'+i+'" title="Remover arquivo" aria-label="Remover arquivo">'+r10Icon('close')+'</button>';
          row.innerHTML='<span class="r10-material-fileicon">'+r10AttachmentIcon(file)+'</span><span class="r10-material-copy"><strong>'+r10Esc(file.name||'Arquivo')+'</strong><small>'+r10Esc(r10AttachmentMeta(file))+'</small></span>'+action;
          list.appendChild(row);
        });
      }else{
        list.innerHTML='<button type="button" class="r10-material-empty" data-r10-add-material>'+r10Icon('paperclip')+'<span><b>Nenhum material anexado</b><small>Adicionar arquivos para esta tarefa</small></span></button>';
      }
    }
    const incoming=oldMain.querySelector('.v5-incoming-section'), delivery=oldMain.querySelector('.v5-delivery-section');
    const conferenceSection=oldMain.querySelector('#detailChecklist')&&oldMain.querySelector('#detailChecklist').closest('.v3-section');
    if(delivery){const h=delivery.querySelector('.tsection-head strong'),s=delivery.querySelector('.tsection-head span');if(h)h.textContent='Sua entrega';if(s)s.textContent=t.deliveryRequired?'Obrigatória para concluir a tarefa':'Envie o material final desta execução'}
    const simpleAction=oldMain.querySelector('.v7-simple-action'), comments=oldMain.querySelector('#commentList')&&oldMain.querySelector('#commentList').closest('.v3-section');
    oldMain.querySelectorAll('.v7-flow-summary,.v9-workspace-title,.v7-advanced-flow,.v3-continuity,.v5-tree-section').forEach(x=>x.classList.add('r10-engine-hidden'));

    const statusField=r10MoveField(oldSide,'detailStatus'), ownerField=r10MoveField(oldSide,'detailPrimaryAssignee'), dueField=r10MoveField(oldSide,'detailDue'), priorityField=r10MoveField(oldSide,'detailPriority'), campaignField=r10MoveField(oldSide,'detailCampaign'), startField=r10MoveField(oldSide,'detailStart'), supportField=r10MoveField(oldSide,'detailAddAssignee'), recurrenceField=r10MoveField(oldSide,'detailRecurrence');
    if(statusField){statusField.classList.add('r10-field-status','state-'+r10Norm(r10Status(t)).replace(/\s+/g,'-'));statusField.querySelector('label').textContent='Status';statusField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn status-dot"></span>')}
    if(ownerField){ownerField.classList.add('r10-field-owner');ownerField.querySelector('label').textContent='Responsável';ownerField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn owner-avatar">'+r10AvatarInner((t.assignees||[])[0]||'',(t.assigneeIds||[])[0])+'</span>')}
    if(dueField){dueField.classList.add('r10-field-due');dueField.querySelector('label').textContent='Prazo';dueField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn">'+r10Icon('calendar')+'</span>')}
    if(priorityField){priorityField.classList.add('r10-field-priority','priority-'+r10Norm(r10Priority(t)));priorityField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn">'+r10Icon('priority')+'</span>')}
    if(campaignField){campaignField.classList.add('r10-field-campaign');campaignField.querySelector('label').textContent=t.campaignId?'Campanha':'Lista';campaignField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn">'+r10Icon('folder')+'</span>')}

    const workspace=document.createElement('div');workspace.className='r10-workspace';workspace.insertAdjacentHTML('beforeend',r10FlowHtml(t,rows));

    const center=document.createElement('main');center.className='r10-main';
    const channel=r10Channel(t,campaign);
    const campaignLabel=t.campaignId?(campaign?.name||t.project||'Campanha'):'';
    const priorityLabel=r10PriorityHeaderLabel(t);
    const priorityTone=r10PriorityTone(priorityLabel);
    const headPills=[
      channel?r10HeaderPill(channel.toLowerCase().includes('whatsapp')?'whatsappBrand':'tag',channel,'channel'):null,
      t.campaignId?r10CampaignHeaderPill(campaignLabel):null,
      r10HeaderPill('priorityMark',priorityLabel,'priority priority-'+priorityTone)
    ].filter(Boolean).join('');
    const subtitle=r10TaskSubtitle(t);
    center.innerHTML='<div class="r10-main-top"><button type="button" class="r10-icon-btn" data-r10-back aria-label="Voltar">'+r10Icon('arrowLeft')+'</button><div class="r10-main-nav"><button type="button" class="r10-icon-btn" data-r10-more aria-label="Mais opções">'+r10Icon('more')+'</button><button type="button" class="r10-icon-btn" '+(prev?'':'disabled')+' data-r10-prev="'+(prev?r10Esc(prev.id):'')+'" aria-label="Tarefa anterior">'+r10Icon('chevronLeft')+'</button><span class="r10-counter">'+(index+1)+' de '+Math.max(rows.length,1)+'</span><button type="button" class="r10-icon-btn" '+(nextTask?'':'disabled')+' data-r10-next="'+(nextTask?r10Esc(nextTask.id):'')+'" aria-label="Próxima tarefa">'+r10Icon('chevronRight')+'</button><span class="r10-save-slot"></span></div></div><header class="r10-task-head"><span class="r10-kicker">'+r10Icon('task')+'<span>TAREFA</span></span><div class="r10-title-slot"></div><p class="r10-subtitle">'+r10Esc(subtitle)+'</p><div class="r10-pills">'+headPills+'</div></header><div class="r10-center-stack"></div>';
    const titleSlot=center.querySelector('.r10-title-slot');
    let visibleTitleInput=null;
    if(titleSlot){
      visibleTitleInput=document.createElement('input');
      visibleTitleInput.type='text';
      visibleTitleInput.className='r10-title-input';
      visibleTitleInput.setAttribute('aria-label','Título da tarefa');
      visibleTitleInput.setAttribute('placeholder','Nome da tarefa');
      visibleTitleInput.value=t.title||'';
      visibleTitleInput.addEventListener('input',()=>{
        if(legacyTitleInput)legacyTitleInput.value=visibleTitleInput.value;
      });
      titleSlot.appendChild(visibleTitleInput);
    }
    const saveSlot=center.querySelector('.r10-save-slot');
    if(saveSlot){
      const saveButton=document.createElement('button');
      saveButton.type='button';
      saveButton.className='r10-save-btn';
      saveButton.textContent='Salvar alterações';
      saveButton.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        const id=String(taskState.selected||t.id);
        if(legacyTitleInput&&visibleTitleInput)legacyTitleInput.value=visibleTitleInput.value;
        try{
          saveCurrentTask();
        }catch(err){
          console.error('[AllianceOS task save]',err);
          showToast('Não foi possível salvar a tarefa.');
          return;
        }
        requestAnimationFrame(()=>{
          const drawer=document.getElementById('taskDetailDrawer');
          if(drawer&&!drawer.classList.contains('open')&&r10Task(id))openTaskDetail(id);
        });
      });
      saveSlot.appendChild(saveButton);
    }
    if(legacySaveButton)legacySaveButton.hidden=true;
    const centerStack=center.querySelector('.r10-center-stack');[briefing,attachments,incoming,delivery,conferenceSection,simpleAction].filter(Boolean).forEach(x=>centerStack.appendChild(x));workspace.appendChild(center);

    const side=document.createElement('aside');side.className='r10-side';side.innerHTML='<div class="r10-side-stack"></div>';const stack=side.querySelector('.r10-side-stack');
    const info=document.createElement('section');info.className='r10-side-card';info.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('status')+'</span><strong>Status e informações</strong></div><div class="r10-side-card-body"></div>';const ib=info.querySelector('.r10-side-card-body');[statusField,ownerField,dueField,priorityField].filter(Boolean).forEach(x=>ib.appendChild(x));stack.appendChild(info);

    const context=document.createElement('section');context.className='r10-side-card';context.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('context')+'</span><strong>'+(t.campaignId?'Contexto da campanha':'Contexto da tarefa')+'</strong></div><div class="r10-side-card-body"></div>';const cb=context.querySelector('.r10-side-card-body');if(campaignField)cb.appendChild(campaignField);
    cb.insertAdjacentHTML('beforeend','<div class="r10-context-row"><span>Cliente</span><span class="r10-context-value"><i class="r10-brand-dot '+r10BrandTone(t.brand)+'"></i>'+r10Esc(t.brand||'—')+'</span></div>'+
      (channel?'<div class="r10-context-row"><span>Canal</span><span class="r10-context-value">'+r10Icon(channel.toLowerCase().includes('whatsapp')?'whatsapp':'tag')+'<span>'+r10Esc(channel)+'</span></span></div>':'')+
      '<div class="r10-context-row"><span>Tipo</span><span class="r10-context-value">'+r10Icon('task')+'<span>'+r10Esc(t.campaignId?'Execução de campanha':'Tarefa avulsa')+'</span></span></div>');
    stack.appendChild(context);

    const tags=(t.tags||[]).filter(Boolean);const defaultTags=[channel,t.brand||'Operação',r10Priority(t)].filter(Boolean);const tagList=(tags.length?tags:defaultTags).map(x=>'<span class="r10-tag'+r10TagClass(x)+'">'+r10Esc(x)+'</span>').join('');stack.insertAdjacentHTML('beforeend',r10Card('Sinais e tags',r10Icon('tag'),'<div class="r10-tags">'+tagList+'<button type="button" class="r10-add-tag">＋ Adicionar tag</button></div>'));

    const deps=r10Deps(t), dependents=r10Dependents(t);let depHtml='';
    if(deps.length){depHtml+='<div class="r10-context-row"><span>Depende de</span><div>';deps.forEach(x=>{depHtml+='<button type="button" class="r10-dep-row '+(x.status==='feito'?'':'blocked')+'" data-r10-task="'+r10Esc(x.id)+'"><span class="r10-dep-dot">'+(x.status==='feito'?'✓':'!')+'</span><span><b>'+r10Esc(x.title)+'</b><span>'+r10Esc(r10Status(x))+'</span></span></button>'});depHtml+='</div></div>'}
    if(dependents.length){depHtml+='<div class="r10-context-row"><span>Desbloqueia</span><div>';dependents.forEach(x=>{depHtml+='<button type="button" class="r10-dep-row '+(r10Status(x)==='Bloqueada'?'blocked':'')+'" data-r10-task="'+r10Esc(x.id)+'"><span class="r10-dep-dot">→</span><span><b>'+r10Esc(x.title)+'</b><span>'+r10Esc(r10Status(x))+'</span></span></button>'});depHtml+='</div></div>'}
    if(!depHtml)depHtml='<div style="font-size:9px;color:#8e979f">Sem dependências vinculadas.</div>';stack.insertAdjacentHTML('beforeend',r10Card('Dependências',r10Icon('dependency'),depHtml));

    if(comments){const card=document.createElement('section');card.className='r10-side-card';card.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('comment')+'</span><strong>Observações</strong></div><div class="r10-side-card-body"></div>';const cc=card.querySelector('.r10-side-card-body');[comments.querySelector('.v3-comment-add'),comments.querySelector('#commentList'),comments.querySelector('.v3-history')].filter(Boolean).forEach(x=>cc.appendChild(x));stack.appendChild(card)}

    const extra=document.createElement('details');extra.className='r10-side-card r10-more';extra.innerHTML='<summary>Mais opções da tarefa</summary><div class="r10-more-body"></div>';const eb=extra.querySelector('.r10-more-body');[startField,supportField,recurrenceField].filter(Boolean).forEach(x=>eb.appendChild(x));if(eb.children.length)stack.appendChild(extra);
    workspace.appendChild(side);oldLayout.replaceWith(workspace);

    const syncVisibleTitle=()=>{
      const current=r10Task(taskState.selected);
      if(!current)return;
      const input=workspace.querySelector('.r10-title-input');
      if(input){
        current.title=input.value.trim()||current.title;
        if(legacyTitleInput)legacyTitleInput.value=input.value;
      }
    };
    const openRelatedTask=id=>{
      if(!id)return;
      syncVisibleTitle();
      openTaskDetail(id);
    };

    workspace.querySelector('[data-r10-back]')?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      closeTaskDetail();
    });
    workspace.querySelector('[data-r10-prev]')?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const btn=e.currentTarget;
      if(btn.disabled)return;
      openRelatedTask(btn.dataset.r10Prev);
    });
    workspace.querySelector('[data-r10-next]')?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const btn=e.currentTarget;
      if(btn.disabled)return;
      openRelatedTask(btn.dataset.r10Next);
    });
    workspace.querySelector('[data-r10-more]')?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      extra.open=!extra.open;
    });
    workspace.querySelectorAll('[data-r10-task]').forEach(el=>el.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      openRelatedTask(el.dataset.r10Task);
    }));
    workspace.querySelector('[data-r10-add-material]')?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      document.getElementById('attachmentInput')?.click();
    });
    workspace.querySelectorAll('[data-r10-remove-material]').forEach(btn=>btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const index=Number(btn.dataset.r10RemoveMaterial);
      if(!Number.isInteger(index)||index<0)return;
      t.attachments.splice(index,1);
      if(typeof v3Persist==='function')v3Persist(false);
      renderTaskDetailBody(t);
    }));
    const campaignLink=workspace.querySelector('[data-r10-open-campaign]');
    campaignLink?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const name=campaignLink.dataset.r10OpenCampaign||campaignLabel;
      closeTaskDetail();
      if(typeof window.openCampaignWorkspaceByName==='function')setTimeout(()=>window.openCampaignWorkspaceByName(name),0);
      else if(typeof window.__centralShowCampaigns==='function')setTimeout(()=>window.__centralShowCampaigns(),0);
    });
  }
  function r10PersistCompletionStamp(){
    try{localStorage.setItem(taskStorageKey,JSON.stringify(taskData));}catch{}
  }
  function r10SyncCompletionStamp(t,beforeStatus){
    if(!t)return false;
    if(beforeStatus!=='feito'&&t.status==='feito'&&!t.completedAt){t.completedAt=new Date().toISOString();return true;}
    if(beforeStatus==='feito'&&t.status!=='feito'&&t.completedAt){delete t.completedAt;return true;}
    return false;
  }
  const r10BaseSaveCurrentTask=saveCurrentTask;
  saveCurrentTask=function(){
    const t=r10Task(taskState.selected), before=t?.status;
    r10BaseSaveCurrentTask();
    if(r10SyncCompletionStamp(t,before))r10PersistCompletionStamp();
  };
  const r10BaseBindTaskElements=bindTaskElements;
  bindTaskElements=function(){
    r10BaseBindTaskElements();
    document.querySelectorAll('[data-v3-toggle-done]').forEach(btn=>{
      if(btn.dataset.r10CompletionStamp)return;
      btn.dataset.r10CompletionStamp='1';
      btn.addEventListener('click',()=>{
        const t=r10Task(btn.dataset.v3ToggleDone), before=t?.status;
        queueMicrotask(()=>{if(r10SyncCompletionStamp(t,before))r10PersistCompletionStamp();});
      },true);
    });
  };
  const r10BaseBindDrag=bindDrag;
  bindDrag=function(){
    r10BaseBindDrag();
    document.querySelectorAll('[data-v3-drop-status]').forEach(col=>{
      if(col.dataset.r10CompletionStamp)return;
      col.dataset.r10CompletionStamp='1';
      col.addEventListener('drop',e=>{
        const id=e.dataTransfer?.getData('text/plain'), t=r10Task(id), before=t?.status;
        queueMicrotask(()=>{if(r10SyncCompletionStamp(t,before))r10PersistCompletionStamp();});
      },true);
    });
  };

  document.getElementById('r10-flow-reference-polish')?.remove();
  const r10FlowStyle=document.createElement('style');
  r10FlowStyle.id='r10-flow-reference-polish';
  r10FlowStyle.textContent=`
  #taskDetailDrawer .tdrawer-head{
    position:absolute!important;
    width:1px!important;
    height:1px!important;
    overflow:hidden!important;
    clip-path:inset(50%)!important;
    opacity:0!important;
    pointer-events:none!important;
  }
  #taskDetailDrawer .r10-main{
    padding:18px 24px 28px!important;
  }
  #taskDetailDrawer .r10-main-top{
    margin:0 0 24px!important;
    min-height:42px!important;
  }
  #taskDetailDrawer .r10-icon-btn{
    width:42px!important;
    height:42px!important;
    min-width:42px!important;
    border-radius:11px!important;
    border:1px solid #dde3e7!important;
    background:#fff!important;
    color:#293239!important;
    box-shadow:0 1px 1px rgba(24,31,36,.015)!important;
  }
  #taskDetailDrawer .r10-icon-btn .r10-svg{
    width:18px!important;
    height:18px!important;
    stroke-width:1.8!important;
  }
  #taskDetailDrawer .r10-main-top,
  #taskDetailDrawer .r10-main-nav,
  #taskDetailDrawer .r10-icon-btn,
  #taskDetailDrawer .r10-pills,
  #taskDetailDrawer .r10-pill{
    pointer-events:auto!important;
  }
  #taskDetailDrawer .r10-main-nav{gap:10px!important}
  #taskDetailDrawer .r10-counter{
    min-width:46px!important;
    text-align:center!important;
    font-size:9px!important;
    color:#7d8790!important;
  }
  #taskDetailDrawer .r10-task-head{
    padding:0 2px 22px!important;
  }
  #taskDetailDrawer .r10-kicker{
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    gap:6px!important;
    width:auto!important;
    min-width:78px!important;
    height:24px!important;
    min-height:24px!important;
    margin:0 0 10px!important;
    padding:0 9px!important;
    border:0!important;
    border-radius:7px!important;
    background:#f1f3f4!important;
    color:#78828a!important;
    font-size:8.5px!important;
    font-weight:650!important;
    line-height:1!important;
    letter-spacing:.035em!important;
  }
  #taskDetailDrawer .r10-kicker .r10-svg{
    width:11px!important;
    height:11px!important;
    flex:0 0 11px!important;
    stroke-width:1.8!important;
  }
  #taskDetailDrawer .r10-title,
  #taskDetailDrawer .r10-title-input{
    font-size:34px!important;
    line-height:1.06!important;
    font-weight:720!important;
    letter-spacing:-.045em!important;
    color:#101418!important;
  }
  #taskDetailDrawer .r10-title-input{
    min-height:38px!important;
  }
  #taskDetailDrawer .r10-subtitle{
    max-width:760px!important;
    margin:9px 0 0!important;
    color:#6f7a84!important;
    font-size:14px!important;
    line-height:1.48!important;
    font-weight:430!important;
    white-space:normal!important;
    overflow-wrap:anywhere!important;
  }
  #taskDetailDrawer .r10-pills{
    display:flex!important;
    align-items:center!important;
    flex-wrap:wrap!important;
    gap:9px!important;
    margin-top:15px!important;
  }

  /* Header chips: isolated from legacy .r10-pill rules. */
  #taskDetailDrawer .r10-head-chip{
    appearance:none!important;
    -webkit-appearance:none!important;
    box-sizing:border-box!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:flex-start!important;
    gap:8px!important;
    height:39px!important;
    min-height:39px!important;
    max-width:320px!important;
    margin:0!important;
    padding:0 11px!important;
    border:1px solid #d9dee3!important;
    border-radius:10px!important;
    background:#fff!important;
    color:#263039!important;
    font:600 14px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    letter-spacing:-.012em!important;
    text-decoration:none!important;
    box-shadow:0 1px 1px rgba(20,28,34,.015)!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    vertical-align:middle!important;
  }
  #taskDetailDrawer .r10-head-chip-label{
    display:block!important;
    min-width:0!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
    line-height:1!important;
  }
  #taskDetailDrawer .r10-head-chip-icon{
    width:18px!important;
    height:18px!important;
    min-width:18px!important;
    flex:0 0 18px!important;
    display:grid!important;
    place-items:center!important;
    line-height:0!important;
  }
  #taskDetailDrawer .r10-head-chip-icon .r10-svg{
    display:block!important;
    width:18px!important;
    height:18px!important;
    min-width:18px!important;
    flex:0 0 18px!important;
  }

  #taskDetailDrawer .r10-head-chip.channel{
    background:#fff!important;
    border-color:#d9dee3!important;
    color:#20292f!important;
  }
  #taskDetailDrawer .r10-head-chip.channel .r10-head-chip-icon .r10-svg{
    width:19px!important;
    height:19px!important;
    color:#25d366!important;
  }

  #taskDetailDrawer .r10-head-chip.campaign{
    background:#fff!important;
    border-color:#d9dee3!important;
    color:#20292f!important;
    cursor:pointer!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign .r10-head-chip-icon .r10-svg{
    width:17px!important;
    height:17px!important;
    color:#246bfe!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign:hover{
    background:#f8faff!important;
    border-color:#cbd7ec!important;
  }

  #taskDetailDrawer .r10-head-chip.priority{
    background:#f5f7f8!important;
    border-color:#dfe4e8!important;
    color:#56616a!important;
  }
  #taskDetailDrawer .r10-head-chip.priority .r10-head-chip-icon{
    width:18px!important;
    height:18px!important;
    min-width:18px!important;
    flex-basis:18px!important;
    border-radius:6px!important;
    background:#e9edf0!important;
    color:#68747d!important;
  }
  #taskDetailDrawer .r10-head-chip.priority .r10-head-chip-icon .r10-svg{
    width:13px!important;
    height:13px!important;
    color:#68747d!important;
  }
  #taskDetailDrawer .r10-head-chip.priority-high,
  #taskDetailDrawer .r10-head-chip.priority-urgent{
    background:#fff0f2!important;
    border-color:#f6cfd5!important;
    color:#ef3f4d!important;
  }
  #taskDetailDrawer .r10-head-chip.priority-high .r10-head-chip-icon,
  #taskDetailDrawer .r10-head-chip.priority-urgent .r10-head-chip-icon{
    background:transparent!important;
    color:#ef3f4d!important;
  }
  #taskDetailDrawer .r10-head-chip.priority-high .r10-head-chip-icon .r10-svg,
  #taskDetailDrawer .r10-head-chip.priority-urgent .r10-head-chip-icon .r10-svg{
    width:16px!important;
    height:16px!important;
    color:#ef3f4d!important;
  }
  #taskDetailDrawer .r10-head-chip.priority-low{
    background:#f6f8fa!important;
    border-color:#dfe4e8!important;
    color:#64717a!important;
  }

  #taskDetailDrawer .r10-main-top,
  #taskDetailDrawer .r10-main-nav,
  #taskDetailDrawer .r10-icon-btn,
  #taskDetailDrawer .r10-pills,
  #taskDetailDrawer .r10-head-chip{
    pointer-events:auto!important;
  }

  #taskDetailDrawer .r10-flow{
    overflow-x:hidden!important;
    padding:20px 16px 18px!important;
  }
  #taskDetailDrawer .r10-flow-head{
    display:grid!important;
    grid-template-columns:36px minmax(0,1fr) 24px!important;
    align-items:start!important;
    gap:11px!important;
    padding:0 2px 10px!important;
  }
  #taskDetailDrawer .r10-flow-head-copy strong{
    font-size:15px!important;
    line-height:1.12!important;
    font-weight:720!important;
  }
  #taskDetailDrawer .r10-flow-head-copy span{
    display:-webkit-box!important;
    margin-top:5px!important;
    line-height:1.35!important;
    white-space:normal!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    -webkit-line-clamp:2!important;
    -webkit-box-orient:vertical!important;
    overflow-wrap:anywhere!important;
  }
  #taskDetailDrawer .r10-flow-chevron{
    width:24px!important;
    height:24px!important;
    display:grid!important;
    place-items:center!important;
    color:#758089!important;
    margin-top:1px!important;
  }
  #taskDetailDrawer .r10-flow-chevron .r10-svg{width:15px!important;height:15px!important}
  #taskDetailDrawer .r10-flow-state{
    display:flex!important;
    width:max-content!important;
    align-items:center!important;
    gap:5px!important;
    margin:0 2px 14px auto!important;
    padding:5px 9px!important;
    border-radius:999px!important;
    font-size:9px!important;
    font-weight:650!important;
  }
  #taskDetailDrawer .r10-flow-state:before{content:none!important;display:none!important}
  #taskDetailDrawer .r10-flow-state .r10-status-symbol,
  #taskDetailDrawer .r10-step-status .r10-status-symbol{
    width:11px!important;
    height:11px!important;
    min-width:11px!important;
    display:inline-grid!important;
    place-items:center!important;
    margin:0!important;
    padding:0!important;
    background:transparent!important;
    color:inherit!important;
  }
  #taskDetailDrawer .r10-flow-state .r10-status-symbol .r10-svg,
  #taskDetailDrawer .r10-step-status .r10-status-symbol .r10-svg{
    width:11px!important;
    height:11px!important;
    stroke-width:2!important;
  }
  #taskDetailDrawer .r10-flow-state.state-em-andamento{background:#e5f8ed!important;color:#208657!important}
  #taskDetailDrawer .r10-flow-state.state-bloqueada{background:#fff1df!important;color:#b66e12!important}
  #taskDetailDrawer .r10-flow-state.state-pendente{background:#f0f2f4!important;color:#626c74!important}
  #taskDetailDrawer .r10-flow-state.state-concluida{background:#e5f8ed!important;color:#208657!important}

  #taskDetailDrawer .r10-progress-copy{
    margin:0 -16px 7px!important;
    padding:15px 18px 0!important;
    border-top:1px solid #edf0f2!important;
    font-size:10px!important;
  }
  #taskDetailDrawer .r10-progress{
    height:7px!important;
    margin:0 2px 18px!important;
  }

  #taskDetailDrawer .r10-flow-list{
    gap:10px!important;
    padding:0 0 6px 34px!important;
  }
  #taskDetailDrawer .r10-flow-list:before{
    left:13px!important;
    top:47px!important;
    bottom:47px!important;
    width:2px!important;
    background:repeating-linear-gradient(to bottom,#cbd4da 0 5px,transparent 5px 9px)!important;
  }
  #taskDetailDrawer .r10-step{
    box-sizing:border-box!important;
    min-height:94px!important;
    grid-template-columns:34px minmax(0,1fr) auto!important;
    gap:10px!important;
    align-items:center!important;
    padding:12px!important;
    border:1px solid #dfe5e9!important;
    border-radius:13px!important;
    background:#fff!important;
    overflow:visible!important;
  }
  #taskDetailDrawer .r10-step.current{
    border-color:#8eb5fa!important;
    box-shadow:0 0 0 1px rgba(82,132,234,.16)!important;
    background:#fff!important;
  }
  #taskDetailDrawer .r10-step:before{
    left:-34px!important;
    width:26px!important;
    height:26px!important;
    font-size:9px!important;
    z-index:4!important;
  }
  #taskDetailDrawer .r10-step.current:before{
    background:#15191d!important;
    border-color:#15191d!important;
    color:#fff!important;
  }
  #taskDetailDrawer .r10-step.done:before{
    background:#24b66e!important;
    border-color:#24b66e!important;
    color:#fff!important;
  }
  #taskDetailDrawer .r10-step.done:not(:last-child):after{
    content:""!important;
    position:absolute!important;
    left:-21px!important;
    top:50%!important;
    height:calc(100% + 10px)!important;
    width:2px!important;
    background:#79d6a8!important;
    z-index:3!important;
  }
  #taskDetailDrawer .r10-step-icon{
    width:34px!important;
    height:34px!important;
    min-width:34px!important;
    border-radius:9px!important;
    background:#f1f3f4!important;
    color:#4a555d!important;
  }
  #taskDetailDrawer .r10-step-icon .r10-svg{
    width:17px!important;
    height:17px!important;
    stroke-width:1.8!important;
  }
  #taskDetailDrawer .r10-step.done .r10-step-icon{background:#edf9f2!important;color:#24a766!important}
  #taskDetailDrawer .r10-step.status-bloqueada .r10-step-icon{background:#fff1df!important;color:#d48620!important}

  #taskDetailDrawer .r10-step-copy{
    min-width:0!important;
    overflow:hidden!important;
  }
  #taskDetailDrawer .r10-step-copy b{
    display:-webkit-box!important;
    font-size:11px!important;
    line-height:1.28!important;
    font-weight:650!important;
    white-space:normal!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    -webkit-line-clamp:2!important;
    -webkit-box-orient:vertical!important;
    overflow-wrap:anywhere!important;
  }
  #taskDetailDrawer .r10-step.done .r10-step-copy b{
    text-decoration:line-through!important;
    text-decoration-thickness:1px!important;
    color:#7d858b!important;
  }
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-status{
    display:inline-flex!important;
    align-items:center!important;
    gap:5px!important;
    width:max-content!important;
    max-width:100%!important;
    margin-top:6px!important;
    padding:4px 7px!important;
    border-radius:999px!important;
    font-size:8px!important;
    font-weight:650!important;
    line-height:1!important;
  }
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-status.status-em-andamento{background:#e7f8ee!important;color:#238759!important}
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-status.status-bloqueada{background:#eef0f2!important;color:#4f5961!important}
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-status.status-pendente{background:#eef0f2!important;color:#59636b!important}
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-status.status-em-revisao{background:#f2edfb!important;color:#7659aa!important}
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-status span{
    margin:0!important;
    padding:0!important;
    background:transparent!important;
    color:inherit!important;
    font-size:inherit!important;
    line-height:inherit!important;
  }
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-meta{
    display:block!important;
    margin-top:6px!important;
    padding:0!important;
    border-radius:0!important;
    background:transparent!important;
    color:#858e95!important;
    font-size:8.5px!important;
    font-weight:450!important;
    line-height:1.25!important;
    white-space:normal!important;
    overflow-wrap:anywhere!important;
  }
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-completed{
    display:flex!important;
    align-items:center!important;
    gap:5px!important;
    margin-top:6px!important;
    padding:0!important;
    background:transparent!important;
    color:#7b858c!important;
    font-size:8.5px!important;
    font-weight:450!important;
    line-height:1.25!important;
  }
  #taskDetailDrawer .r10-step .r10-step-copy .r10-step-completed .r10-svg{
    width:11px!important;
    height:11px!important;
    color:#28a96a!important;
    flex:0 0 11px!important;
  }
  #taskDetailDrawer .r10-step-avatar{
    width:30px!important;
    height:30px!important;
    min-width:30px!important;
    border:2px solid #fff!important;
    box-shadow:0 0 0 1px #dfe4e7!important;
  }

  /* Objective + materials — reference layout */
  #taskDetailDrawer .r10-main .r10-objective-card,
  #taskDetailDrawer .r10-main .r10-materials-card{
    margin-top:16px!important;
    border:1px solid #e2e7ea!important;
    border-radius:16px!important;
    background:#fff!important;
    box-shadow:none!important;
    overflow:hidden!important;
  }

  #taskDetailDrawer .r10-main .r10-objective-card .tsection-head,
  #taskDetailDrawer .r10-main .r10-materials-card .tsection-head{
    box-sizing:border-box!important;
    min-height:68px!important;
    padding:16px 18px 10px!important;
    display:flex!important;
    flex-direction:row!important;
    align-items:center!important;
    gap:13px!important;
    border:0!important;
    background:#fff!important;
    text-align:left!important;
  }
  #taskDetailDrawer .r10-main .r10-objective-card .tsection-head{
    justify-content:flex-start!important;
  }
  #taskDetailDrawer .r10-main .r10-materials-card .tsection-head{
    justify-content:space-between!important;
  }

  #taskDetailDrawer .r10-main .r10-objective-heading,
  #taskDetailDrawer .r10-main .r10-materials-heading{
    min-width:0!important;
    display:flex!important;
    flex-direction:row!important;
    align-items:center!important;
    justify-content:flex-start!important;
    gap:13px!important;
    margin:0!important;
    padding:0!important;
  }

  #taskDetailDrawer .r10-section-icon{
    width:42px!important;
    height:42px!important;
    min-width:42px!important;
    flex:0 0 42px!important;
    display:grid!important;
    place-items:center!important;
    border-radius:11px!important;
    background:#edf0f2!important;
    color:#20272c!important;
  }
  #taskDetailDrawer .r10-section-icon .r10-svg{
    width:21px!important;
    height:21px!important;
    stroke-width:1.9!important;
  }
  #taskDetailDrawer .r10-main .r10-objective-heading>strong,
  #taskDetailDrawer .r10-main .r10-materials-heading>strong{
    display:block!important;
    margin:0!important;
    padding:0!important;
    color:#12171b!important;
    font-size:18px!important;
    font-weight:720!important;
    line-height:1.15!important;
    letter-spacing:-.022em!important;
    white-space:nowrap!important;
  }

  #taskDetailDrawer .r10-main .r10-objective-card .description-area{
    box-sizing:border-box!important;
    display:block!important;
    width:100%!important;
    min-height:88px!important;
    margin:0!important;
    padding:0 22px 24px 72px!important;
    border:0!important;
    outline:0!important;
    resize:none!important;
    overflow:hidden!important;
    background:#fff!important;
    color:#65717b!important;
    font:430 15px/1.55 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    letter-spacing:-.006em!important;
  }
  #taskDetailDrawer .r10-main .r10-objective-card .description-area::placeholder{
    color:#7f8a93!important;
    opacity:1!important;
  }

  #taskDetailDrawer .r10-materials-icon{
    position:relative!important;
    cursor:pointer!important;
  }
  #taskDetailDrawer .r10-material-input{
    position:absolute!important;
    inset:0!important;
    width:100%!important;
    height:100%!important;
    margin:0!important;
    padding:0!important;
    border:0!important;
    opacity:0!important;
    color:transparent!important;
    font-size:0!important;
    cursor:pointer!important;
    z-index:3!important;
  }
  #taskDetailDrawer .r10-material-count{
    min-height:30px!important;
    padding:0 11px!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    border:0!important;
    border-radius:9px!important;
    background:#f2f4f5!important;
    color:#7b858d!important;
    font-size:11px!important;
    font-weight:600!important;
    line-height:1!important;
    white-space:nowrap!important;
  }

  #taskDetailDrawer .r10-main .r10-material-list{
    display:flex!important;
    flex-direction:column!important;
    gap:8px!important;
    margin:0!important;
    padding:0 18px 18px!important;
  }
  #taskDetailDrawer .r10-main .r10-material-item{
    box-sizing:border-box!important;
    min-height:62px!important;
    width:100%!important;
    display:grid!important;
    grid-template-columns:40px minmax(0,1fr) 34px!important;
    align-items:center!important;
    gap:11px!important;
    margin:0!important;
    padding:9px 10px!important;
    border:1px solid #e2e7ea!important;
    border-radius:11px!important;
    background:#fff!important;
    overflow:hidden!important;
  }
  #taskDetailDrawer .r10-material-fileicon{
    width:36px!important;
    height:36px!important;
    display:grid!important;
    place-items:center!important;
    border-radius:9px!important;
    background:#eef2f4!important;
    color:#68747d!important;
  }
  #taskDetailDrawer .r10-material-fileicon .r10-svg{
    width:18px!important;
    height:18px!important;
    stroke-width:1.75!important;
  }
  #taskDetailDrawer .r10-material-item.type-pdf .r10-material-fileicon{
    background:#fff0f1!important;
    color:#ef3f4d!important;
  }
  #taskDetailDrawer .r10-material-item.type-archive .r10-material-fileicon{
    background:#fff2df!important;
    color:#e68a1f!important;
  }
  #taskDetailDrawer .r10-material-item.type-image .r10-material-fileicon{
    background:#edf3ff!important;
    color:#3d73de!important;
  }

  #taskDetailDrawer .r10-material-copy{
    min-width:0!important;
    display:flex!important;
    flex-direction:column!important;
    gap:3px!important;
    overflow:hidden!important;
  }
  #taskDetailDrawer .r10-material-copy>strong{
    min-width:0!important;
    margin:0!important;
    color:#20272d!important;
    font-size:14px!important;
    font-weight:650!important;
    line-height:1.18!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #taskDetailDrawer .r10-material-copy>small{
    margin:0!important;
    color:#7f8991!important;
    font-size:12px!important;
    font-weight:450!important;
    line-height:1.2!important;
    white-space:nowrap!important;
  }
  #taskDetailDrawer .r10-material-action{
    width:32px!important;
    height:32px!important;
    display:grid!important;
    place-items:center!important;
    margin:0!important;
    padding:0!important;
    border:0!important;
    border-radius:8px!important;
    background:transparent!important;
    color:#66727b!important;
    cursor:pointer!important;
    text-decoration:none!important;
  }
  #taskDetailDrawer .r10-material-action:hover{
    background:#f4f6f7!important;
  }
  #taskDetailDrawer .r10-material-action .r10-svg{
    width:18px!important;
    height:18px!important;
    stroke-width:1.85!important;
  }

  #taskDetailDrawer .r10-material-empty{
    box-sizing:border-box!important;
    min-height:62px!important;
    width:100%!important;
    display:flex!important;
    align-items:center!important;
    gap:11px!important;
    padding:10px 12px!important;
    border:1px dashed #d9e0e5!important;
    border-radius:11px!important;
    background:#fbfcfd!important;
    color:#65717a!important;
    cursor:pointer!important;
    text-align:left!important;
  }
  #taskDetailDrawer .r10-material-empty>.r10-svg{
    width:20px!important;
    height:20px!important;
    flex:0 0 20px!important;
  }
  #taskDetailDrawer .r10-material-empty span{
    min-width:0!important;
    display:flex!important;
    flex-direction:column!important;
    gap:3px!important;
  }
  #taskDetailDrawer .r10-material-empty b{
    color:#343d44!important;
    font-size:12px!important;
    font-weight:650!important;
  }
  #taskDetailDrawer .r10-material-empty small{
    color:#8b949b!important;
    font-size:10px!important;
  }
  `;
  document.head.appendChild(r10FlowStyle);

  renderTaskDetailBody=function(t){r10RenderDetail(t)};
}
