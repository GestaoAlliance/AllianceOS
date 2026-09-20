
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
      statusPanel:'<rect x="6" y="5" width="12" height="15" rx="2"/><path d="M9 5V3.5h6V5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 8.5v1M12 14.5v1"/>',
      context:'<path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2M8 11h8M8 15h5"/>',
      tag:'<path d="M4 12 12 4h6l2 2v6l-8 8-8-8Z"/><circle cx="16" cy="8" r="1"/>',
      dependency:'<circle cx="7" cy="5.5" r="2"/><circle cx="7" cy="18.5" r="2"/><circle cx="17" cy="18.5" r="2"/><path d="M7 7.5v5M7 12.5h10v4"/>',
      comment:'<rect x="4.5" y="5" width="15" height="11.5" rx="2.2"/><path d="M8 16.5v2.6l3.2-2.6"/><circle cx="9" cy="10.7" r=".7" fill="currentColor" stroke="none"/><circle cx="12" cy="10.7" r=".7" fill="currentColor" stroke="none"/><circle cx="15" cy="10.7" r=".7" fill="currentColor" stroke="none"/>',
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
      statusDoneMini:'<circle cx="12" cy="12" r="7"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
      statusBlockedMini:'<rect x="5.5" y="5.5" width="13" height="13" rx="2.2"/><path d="M12 8.7v4.6M12 15.8h.01"/>',
      statusPendingMini:'<circle cx="12" cy="12" r="7"/><path d="M12 8v4l2.7 1.8"/>',
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
      priorityMark:'<circle cx="12" cy="12" r="5.3" fill="currentColor" stroke="none"/>',
      objectiveTarget:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2"/>',
      paperclip:'<path d="m8.5 12.5 6.2-6.2a3.1 3.1 0 0 1 4.4 4.4l-7.6 7.6a5 5 0 0 1-7.1-7.1l7.2-7.2"/><path d="m10.2 10.8-4.1 4.1a2.3 2.3 0 1 0 3.3 3.3l7.1-7.1"/>',
      fileText:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 12h6M9 16h6"/>',
      archiveFile:'<path d="M6 3h12v5H6z"/><path d="M7 8h10v13H7zM10 12h4M10 16h4"/>',
      download:'<path d="M12 4v10"/><path d="m8 11 4 4 4-4"/><path d="M5 19h14"/>',
      close:'<path d="m8 8 8 8M16 8l-8 8"/>',
      uploadCloud:'<path d="M7 18h10a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.5 9.5 4 4 0 0 0 7 18Z"/><path d="M12 16V8"/><path d="m8.8 11.2 3.2-3.2 3.2 3.2"/>',
      link:'<path d="M10 13a5 5 0 0 0 7.1.1l1.8-1.8a5 5 0 0 0-7.1-7.1L10.8 5"/><path d="M14 11a5 5 0 0 0-7.1-.1l-1.8 1.8a5 5 0 0 0 7.1 7.1l1-1"/>',
      arrowUpRight:'<path d="M7 17 17 7"/><path d="M9 7h8v8"/>',
      videoMedia:'<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
      audioMedia:'<path d="M9 18V6l9-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/>',
      pencil:'<path d="m4 20 4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m13.8 7.2 3 3"/>',
      trash:'<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
      copy:'<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'
    };
    return '<svg class="r10-svg" viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.task)+'</svg>';
  };

  const r10Short = v => String(v||'').split('|')[0].trim();
  const r10Initials = v => {
    const p=r10Short(v).split(/\s+/).filter(Boolean);
    return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase() || '—';
  };
  const r10Person = (name,userId) => {
    const members=(window.AllianceOSDirectory?.members||[]).filter(m=>m?.tipo==='usuario');
    if(userId){
      const byId=members.find(m=>String(m.id)===String(userId));
      if(byId)return byId;
    }
    const normName=String(r10Short(name)||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    if(!normName)return null;
    const exact=members.find(m=>String(m.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()===normName);
    if(exact)return exact;
    const first=normName.split(/\s+/)[0];
    const firstMatches=members.filter(m=>String(m.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().split(/\s+/)[0]===first);
    return firstMatches.length===1?firstMatches[0]:null;
  };
  const r10AvatarInner = (name,userId) => {
    const person=r10Person(name,userId);
    return person?.foto_url?'<img src="'+r10Esc(person.foto_url)+'" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block">':r10Esc(r10Initials(person?.nome||name));
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
    const type=String(f?.type||'').toLowerCase();
    if(type.startsWith('image/')||/\.(png|jpg|jpeg|webp|gif|svg|heic)$/.test(name))return 'image';
    if(type.startsWith('video/')||/\.(mp4|mov|webm|mkv|avi|m4v)$/.test(name))return 'video';
    if(type.startsWith('audio/')||/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(name))return 'audio';
    if(type==='application/pdf'||/\.pdf$/.test(name))return 'pdf';
    if(/\.(zip|rar|7z|tar|gz)$/.test(name))return 'archive';
    if(type.startsWith('text/')||/\.(txt|md|csv|rtf)$/.test(name))return 'textfile';
    return 'file';
  };
  const r10AttachmentIcon = f => {
    const tone=r10AttachmentTone(f);
    if(tone==='archive')return r10Icon('archiveFile');
    if(tone==='image')return r10Icon('image');
    if(tone==='video')return r10Icon('videoMedia');
    if(tone==='audio')return r10Icon('audioMedia');
    return r10Icon('fileText');
  };
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
  function r10DueVisual(t){
    const raw=t?.dueAt||t?.due||'';
    if(!raw)return {main:'Sem prazo',sub:''};
    const source=String(raw);
    const d=new Date(source.length===10?source+'T12:00:00':source);
    if(Number.isNaN(d.getTime()))return {main:'Sem prazo',sub:''};
    const main=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
    const today=new Date();today.setHours(0,0,0,0);
    const target=new Date(d);target.setHours(0,0,0,0);
    const diff=Math.round((target-today)/86400000);
    let sub='Hoje';
    if(diff===1)sub='Amanhã';
    else if(diff>1)sub='Em '+diff+' dias';
    else if(diff===-1)sub='Atrasada há 1 dia';
    else if(diff<-1)sub='Atrasada há '+Math.abs(diff)+' dias';
    return {main,sub};
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
          textarea.style.setProperty('height','auto','important');
          textarea.style.setProperty('height',Math.max(78,textarea.scrollHeight)+'px','important');
        };
        textarea._r10Fit=fit;
        textarea.addEventListener('input',fit);
        requestAnimationFrame(fit);
      }
    }
    const legacyAttachments=oldMain.querySelector('#attachmentInput')&&oldMain.querySelector('#attachmentInput').closest('.v3-section');
    let attachments=null;
    if(legacyAttachments){
      const files=Array.isArray(t.attachments)?t.attachments:[];
      const count=files.length;
      attachments=document.createElement('section');
      attachments.className='tsection v3-section r10-materials-card';
      const rows=files.length?files.map((file,i)=>{
        const tone=r10AttachmentTone(file);
        const download=file?.dataUrl
          ? '<a class="r10-material-action r10-material-download" href="'+r10Esc(file.dataUrl)+'" download="'+r10Esc(file.name||'arquivo')+'" title="Baixar material" aria-label="Baixar material">'+r10Icon('download')+'</a>'
          : '<button type="button" class="r10-material-action r10-material-download is-disabled" data-r10-missing-download="'+i+'" title="Arquivo antigo sem conteúdo salvo para download" aria-label="Download indisponível">'+r10Icon('download')+'</button>';
        const remove='<button type="button" class="r10-material-action r10-material-remove" data-r10-remove-material="'+i+'" title="Remover arquivo" aria-label="Remover arquivo">'+r10Icon('close')+'</button>';
        return '<div class="r10-material-item type-'+tone+'"><span class="r10-material-fileicon">'+r10AttachmentIcon(file)+'</span><span class="r10-material-copy"><strong title="'+r10Esc(file.name||'Arquivo')+'">'+r10Esc(file.name||'Arquivo')+'</strong><small>'+r10Esc(r10AttachmentMeta(file))+'</small></span><span class="r10-material-actions">'+download+remove+'</span></div>';
      }).join(''):'<button type="button" class="r10-material-empty" data-r10-add-material>'+r10Icon('paperclip')+'<span><b>Nenhum material anexado</b><small>Adicionar arquivos para esta tarefa</small></span></button>';
      attachments.innerHTML='<div class="tsection-head"><span class="r10-materials-heading"><label class="r10-section-icon r10-materials-icon" title="Adicionar arquivos">'+r10Icon('paperclip')+'<input class="r10-material-input" id="r10AttachmentInput" type="file" multiple aria-label="Adicionar arquivos"></label><strong>Materiais e insumos</strong></span><span class="r10-material-count">'+count+' '+(count===1?'item':'itens')+'</span></div><div class="r10-material-list">'+rows+'</div>';
    }
    const incoming=oldMain.querySelector('.v5-incoming-section'), delivery=oldMain.querySelector('.v5-delivery-section');
    const conferenceSection=oldMain.querySelector('#detailChecklist')&&oldMain.querySelector('#detailChecklist').closest('.v3-section');

    if(incoming){
      incoming.classList.add('r10-incoming-card');
      const incomingHead=incoming.querySelector('.tsection-head');
      const incomingItems=[...incoming.querySelectorAll('.v5-material')];
      const incomingCount=incomingItems.length;

      if(incomingHead){
        incomingHead.innerHTML='<span class="r10-materials-heading r10-incoming-heading"><span class="r10-section-icon r10-materials-icon r10-incoming-icon">'+r10Icon('folderSolid')+'</span><strong>Materiais recebidos das etapas anteriores</strong></span><span class="r10-material-count">'+incomingCount+' '+(incomingCount===1?'item':'itens')+'</span>';
      }

      incoming.querySelectorAll('.v5-delivery-card').forEach(card=>card.classList.add('r10-incoming-source-card'));

      incomingItems.forEach(item=>{
        item.classList.add('r10-delivery-sent-item');
        const nameEl=item.querySelector('b');
        const metaEl=item.querySelector('small');
        const lead=item.querySelector('.v5-material-icon');
        const kind=String(item.dataset.v5Kind||'file');
        item.classList.add('type-'+kind);

        if(lead){
          lead.className='r10-delivery-sent-icon';
          const iconName=kind==='link'?'link':kind==='text'?'document':kind==='image'?'image':kind==='video'?'videoMedia':kind==='audio'?'audioMedia':kind==='archive'?'archiveFile':'fileText';
          lead.innerHTML=r10Icon(iconName);
        }
        if(nameEl)nameEl.classList.add('r10-delivery-sent-name');
        if(metaEl)metaEl.classList.add('r10-delivery-sent-meta');

        const actions=item.querySelector('.v5-material-actions');
        if(actions){
          actions.classList.add('r10-delivery-sent-actions');
          actions.querySelectorAll('a,button').forEach(action=>{
            action.classList.add('r10-delivery-sent-action');
            if(action.hasAttribute('data-v5-delivery-download')||action.hasAttribute('data-v5-download-unavailable'))action.innerHTML=r10Icon('download');
            else if(action.hasAttribute('data-v5-open-link'))action.innerHTML=r10Icon('arrowUpRight');
            else if(action.hasAttribute('data-v5-copy-value'))action.innerHTML=r10Icon('copy');
          });
        }
      });
    }

    if(delivery){
      delivery.classList.add('r10-delivery-card');
      const sentDeliveries=Array.isArray(t.deliveries)?t.deliveries:[];
      const sentItemCount=sentDeliveries.reduce((sum,d)=>sum+(String(d?.note||d?.text||'').trim()?1:0)+(Array.isArray(d?.files)?d.files.length:0)+(Array.isArray(d?.links)?d.links.length:0),0);
      const head=delivery.querySelector('.tsection-head');
      if(head)head.innerHTML='<span class="r10-materials-heading r10-delivery-heading"><span class="r10-section-icon r10-materials-icon r10-delivery-head-icon">'+r10Icon('folderSolid')+'</span><strong>Sua entrega</strong></span><span class="r10-material-count">'+sentItemCount+' '+(sentItemCount===1?'item':'itens')+'</span>';

      const compose=delivery.querySelector('.v5-delivery-compose');
      const fileInput=delivery.querySelector('#v5DeliveryFiles');
      const sendBtn=delivery.querySelector('#v5SendDelivery');
      const sendCompleteBtn=delivery.querySelector('#v5SendAndComplete');
      const legacyGrid=delivery.querySelector('.v5-compose-grid');
      const sentFiles=(Array.isArray(t.deliveries)?t.deliveries:[]).flatMap(d=>Array.isArray(d?.files)?d.files:[]);
      const sentCount=sentFiles.length;

      delivery.querySelectorAll('.v5-delivery-list .v5-material').forEach(item=>{
        item.classList.add('r10-delivery-sent-item');
        const nameEl=item.querySelector('b');
        const metaEl=item.querySelector('small');
        const lead=item.querySelector('.v5-material-icon');
        const kind=String(item.dataset.v5Kind||'file');
        item.classList.add('type-'+kind);

        if(lead){
          lead.className='r10-delivery-sent-icon';
          const iconName=kind==='link'?'link':kind==='text'?'document':kind==='image'?'image':kind==='video'?'videoMedia':kind==='audio'?'audioMedia':kind==='archive'?'archiveFile':'fileText';
          lead.innerHTML=r10Icon(iconName);
        }
        if(nameEl)nameEl.classList.add('r10-delivery-sent-name');
        if(metaEl)metaEl.classList.add('r10-delivery-sent-meta');

        const actions=item.querySelector('.v5-material-actions');
        if(actions){
          actions.classList.add('r10-delivery-sent-actions');
          actions.querySelectorAll('a,button').forEach(action=>{
            action.classList.add('r10-delivery-sent-action');
            if(action.hasAttribute('data-v5-delivery-download')||action.hasAttribute('data-v5-download-unavailable'))action.innerHTML=r10Icon('download');
            else if(action.hasAttribute('data-v5-open-link'))action.innerHTML=r10Icon('arrowUpRight');
            else if(action.hasAttribute('data-v5-copy-value'))action.innerHTML=r10Icon('copy');
            else if(action.matches('[data-v5-edit-note],[data-v5-edit-link],[data-v5-edit-file]'))action.innerHTML=r10Icon('pencil');
            else if(action.matches('[data-v5-delete-note],[data-v5-delete-link],[data-v5-delete-file]')){action.classList.add('is-delete');action.innerHTML=r10Icon('trash')}
          });
        }
      });
      if(fileInput&&compose){
        fileInput.setAttribute('accept','image/*,video/*,audio/*,.pdf,.zip,.rar,.7z,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx');

        const alternatives=document.createElement('div');
        alternatives.className='r10-delivery-alternatives';
        alternatives.innerHTML='<div class="r10-delivery-alt-head"><strong>Ou entregue por texto ou link</strong><span>Use quando a entrega não for um arquivo.</span></div><div class="r10-delivery-alt-grid"></div>';
        const altGrid=alternatives.querySelector('.r10-delivery-alt-grid');
        const noteInput=delivery.querySelector('#v5DeliveryNote');
        const linkInput=delivery.querySelector('#v5DeliveryLink');
        const linkLabelInput=delivery.querySelector('#v5DeliveryLinkLabel');
        const noteField=noteInput?.closest('label');
        const linkField=linkInput?.closest('label');
        const linkLabelField=linkLabelInput?.closest('label');
        if(noteField){
          noteField.classList.add('r10-delivery-note-field');
          noteField.childNodes[0].nodeValue='Texto da entrega';
          noteInput.setAttribute('placeholder','Escreva aqui o conteúdo ou a mensagem final desta tarefa.');
          altGrid.appendChild(noteField);
        }
        if(linkField){
          linkField.classList.add('r10-delivery-link-field');
          linkField.childNodes[0].nodeValue='Link da entrega';
          linkInput.setAttribute('placeholder','https://drive.google.com/… ou Figma, Docs, etc.');
          altGrid.appendChild(linkField);
        }
        if(linkLabelField){
          linkLabelField.classList.add('r10-delivery-link-label-field');
          linkLabelField.childNodes[0].nodeValue='Nome do link';
          linkLabelInput.setAttribute('placeholder','Ex.: Copy aprovada');
          altGrid.appendChild(linkLabelField);
        }

        const drop=document.createElement('label');
        drop.className='r10-delivery-dropzone';
        drop.setAttribute('for','v5DeliveryFiles');
        drop.innerHTML='<span class="r10-delivery-drop-icon">'+r10Icon('folderSolid')+'</span><span class="r10-delivery-drop-copy"><strong>Arraste e solte os arquivos aqui</strong><span>ou clique para anexar</span><small>Imagens, PDFs, ZIP, até 1,2 MB</small></span>';
        drop.appendChild(fileInput);

        const switcher=document.createElement('div');
        switcher.className='r10-delivery-mode-switch';
        switcher.innerHTML='<button type="button" class="r10-delivery-mode-btn is-active" data-r10-delivery-mode="file">'+r10Icon('folderSolid')+'<span>Enviar arquivo</span></button><button type="button" class="r10-delivery-mode-btn" data-r10-delivery-mode="alt">'+r10Icon('link')+'<span>Texto ou link</span></button>';

        const bar=document.createElement('div');
        bar.className='r10-delivery-files-bar';
        bar.innerHTML='<strong class="r10-delivery-files-count">Arquivos anexados ('+sentCount+')</strong><span class="r10-delivery-files-status">'+(sentCount?sentCount+' '+(sentCount===1?'arquivo anexado':'arquivos anexados')+'.':'Nenhum arquivo anexado ainda.')+'</span><span class="r10-delivery-actions"></span>';
        const actions=bar.querySelector('.r10-delivery-actions');
        if(sendBtn)actions.appendChild(sendBtn);
        if(sendCompleteBtn)actions.appendChild(sendCompleteBtn);

        if(legacyGrid)legacyGrid.remove();
        alternatives.hidden=true;
        compose.prepend(switcher,drop,alternatives,bar);

        const setDeliveryMode=mode=>{
          const altMode=mode==='alt';
          drop.hidden=altMode;
          alternatives.hidden=!altMode;
          switcher.querySelectorAll('[data-r10-delivery-mode]').forEach(btn=>{
            const active=btn.dataset.r10DeliveryMode===mode;
            btn.classList.toggle('is-active',active);
            btn.setAttribute('aria-pressed',active?'true':'false');
          });
        };
        switcher.querySelectorAll('[data-r10-delivery-mode]').forEach(btn=>btn.addEventListener('click',e=>{
          e.preventDefault();
          e.stopPropagation();
          setDeliveryMode(btn.dataset.r10DeliveryMode);
        }));
        setDeliveryMode('file');

        const syncDeliveryState=()=>{
          const selected=[...(fileInput.files||[])];
          const total=sentCount+selected.length;
          const hasText=!!String(noteInput?.value||'').trim();
          const hasLink=!!String(linkInput?.value||'').trim();
          const hasContent=selected.length>0||hasText||hasLink;
          delivery.classList.toggle('has-selection',selected.length>0);
          delivery.classList.toggle('has-content',hasContent);
          const countEl=bar.querySelector('.r10-delivery-files-count');
          const statusEl=bar.querySelector('.r10-delivery-files-status');
          if(countEl)countEl.textContent='Arquivos anexados ('+total+')';
          if(statusEl){
            if(selected.length)statusEl.textContent=selected.length+' '+(selected.length===1?'arquivo selecionado':'arquivos selecionados')+' para envio.';
            else if(hasText||hasLink)statusEl.textContent='Entrega pronta para enviar.';
            else statusEl.textContent=sentCount?sentCount+' '+(sentCount===1?'arquivo anexado':'arquivos anexados')+'.':'Nenhum arquivo anexado ainda.';
          }
        };
        fileInput.addEventListener('change',syncDeliveryState);
        noteInput?.addEventListener('input',syncDeliveryState);
        linkInput?.addEventListener('input',syncDeliveryState);
        linkLabelInput?.addEventListener('input',syncDeliveryState);
        ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('is-dragging')}));
        drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));
        drop.addEventListener('drop',e=>{
          e.preventDefault();
          drop.classList.remove('is-dragging');
          if(e.dataTransfer?.files?.length){
            try{fileInput.files=e.dataTransfer.files}catch{}
            fileInput.dispatchEvent(new Event('change',{bubbles:true}));
          }
        });
        syncDeliveryState();
      }
    }
    const simpleAction=oldMain.querySelector('.v7-simple-action'), comments=oldMain.querySelector('#commentList')&&oldMain.querySelector('#commentList').closest('.v3-section');
    const legacyCompleteButton=oldMain.querySelector('#v3CompleteTaskBtn');
    let completionAction=null;
    if(legacyCompleteButton){
      completionAction=document.createElement('section');
      completionAction.className='r10-completion-card';
      completionAction.innerHTML='<div class="r10-completion-copy"><strong>Conclusão da tarefa</strong><span>Finalize quando a entrega e as conferências estiverem prontas.</span></div><div class="r10-completion-action"></div>';
      legacyCompleteButton.classList.add('r10-complete-btn');
      completionAction.querySelector('.r10-completion-action').appendChild(legacyCompleteButton);
    }
    if(simpleAction)simpleAction.remove();
    oldMain.querySelectorAll('.v7-flow-summary,.v9-workspace-title,.v7-advanced-flow,.v3-continuity,.v5-tree-section').forEach(x=>x.classList.add('r10-engine-hidden'));

    const statusField=r10MoveField(oldSide,'detailStatus'), ownerField=r10MoveField(oldSide,'detailPrimaryAssignee'), dueField=r10MoveField(oldSide,'detailDue'), priorityField=r10MoveField(oldSide,'detailPriority'), campaignField=r10MoveField(oldSide,'detailCampaign'), startField=r10MoveField(oldSide,'detailStart'), supportField=r10MoveField(oldSide,'detailAddAssignee'), recurrenceField=r10MoveField(oldSide,'detailRecurrence');
    if(statusField){statusField.classList.add('r10-field-status','state-'+r10Norm(r10Status(t)).replace(/\s+/g,'-'));statusField.querySelector('label').textContent='Status';statusField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn status-dot"></span>')}
    if(ownerField){ownerField.classList.add('r10-field-owner');ownerField.querySelector('label').textContent='Responsável';ownerField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn owner-avatar">'+r10AvatarInner((t.assignees||[])[0]||'',(t.assigneeIds||[])[0])+'</span>')}
    if(dueField){
      dueField.classList.add('r10-field-due');
      dueField.querySelector('label').textContent='Prazo';
      dueField.querySelectorAll('small').forEach(x=>x.remove());
      const dueVisual=r10DueVisual(t);
      dueField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn r10-due-icon">'+r10Icon('calendar')+'</span><button type="button" class="r10-due-display" data-r10-edit-due title="Editar prazo" aria-label="Editar prazo"><strong>'+r10Esc(dueVisual.main)+'</strong><small>'+r10Esc(dueVisual.sub)+'</small></button>');
    }
    if(priorityField){
      const prioritySelect=priorityField.querySelector('#detailPriority');
      const priorityUI=window.AlliancePriorityUI;
      const applyPriorityVisual=value=>{
        const canon=priorityUI?.canon?priorityUI.canon(value):String(value||'normal');
        const level=priorityUI?.level?priorityUI.level(canon):(canon==='baixa'?1:canon==='normal'?2:3);
        const tone=priorityUI?.tone?priorityUI.tone(canon):(canon==='baixa'?'low':canon==='alta'?'high':canon==='urgente'?'urgent':'normal');
        priorityField.classList.remove('priority-baixa','priority-normal','priority-alta','priority-urgente','tone-low','tone-normal','tone-high','tone-urgent');
        priorityField.classList.add('r10-field-priority','priority-'+canon,'tone-'+tone);
        let bars=priorityField.querySelector('.r10-priority-level-bars');
        if(!bars){
          priorityField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn r10-priority-level-bars" aria-hidden="true"><i></i><i></i><i></i></span>');
          bars=priorityField.querySelector('.r10-priority-level-bars');
        }
        bars.classList.remove('level-1','level-2','level-3');
        bars.classList.add('level-'+level);
        bars.dataset.priorityLevel=String(level);
      };
      applyPriorityVisual(t.priority);
      prioritySelect?.addEventListener('change',()=>{
        applyPriorityVisual(prioritySelect.value);
      });
    }
    if(campaignField){
      campaignField.classList.add('r10-field-campaign');
      campaignField.querySelector('label').textContent=t.campaignId?'Campanha':'Lista';
      campaignField.querySelectorAll('small').forEach(x=>x.remove());

      const campaignSelect=campaignField.querySelector('#detailCampaign');
      const directoryLists=Array.isArray(window.AllianceOSDirectory?.lists)?window.AllianceOSDirectory.lists:[];
      const linkedList=directoryLists.find(l=>
        (t.listId&&String(l.id)===String(t.listId)) ||
        (t.campaignId&&String(l.campanha_id||'')===String(t.campaignId))
      );
      const campaignName=String(
        linkedList?.nome ||
        campaign?.name ||
        campaign?.nome ||
        (t.project&&t.project!=='Operação'?t.project:'') ||
        'Campanha vinculada'
      ).trim();

      if(campaignSelect){
        if(linkedList?.id){
          const listValue=String(linkedList.id);
          let option=[...campaignSelect.options].find(o=>String(o.value)===listValue);
          if(!option){
            option=document.createElement('option');
            option.value=listValue;
            option.textContent=campaignName;
            campaignSelect.appendChild(option);
          }else{
            option.textContent=campaignName;
          }
          campaignSelect.value=listValue;
        }else if(t.campaignId){
          let option=[...campaignSelect.options].find(o=>
            String(o.value)===String(t.campaignId) ||
            r10Norm(o.textContent).includes(r10Norm(campaignName))
          );
          if(!option){
            option=document.createElement('option');
            option.value=String(t.campaignId);
            option.textContent=campaignName;
            campaignSelect.appendChild(option);
          }
          campaignSelect.value=option.value;
        }
        campaignSelect.setAttribute('title',campaignName);
      }

      campaignField.insertAdjacentHTML('beforeend','<span class="r10-field-adorn r10-campaign-icon">'+r10Icon('folder')+'</span>');
    }

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
      visibleTitleInput=document.createElement('textarea');
      visibleTitleInput.rows=1;
      visibleTitleInput.className='r10-title-input';
      visibleTitleInput.setAttribute('aria-label','Título da tarefa');
      visibleTitleInput.setAttribute('placeholder','Nome da tarefa');
      visibleTitleInput.setAttribute('wrap','soft');
      visibleTitleInput.value=t.title||'';
      const fitVisibleTitle=()=>{
        visibleTitleInput.style.setProperty('height','auto','important');
        visibleTitleInput.style.setProperty('height',Math.max(38,visibleTitleInput.scrollHeight)+'px','important');
      };
      visibleTitleInput.addEventListener('input',()=>{
        if(legacyTitleInput)legacyTitleInput.value=visibleTitleInput.value.replace(/\s*\n\s*/g,' ');
        fitVisibleTitle();
      });
      visibleTitleInput.addEventListener('keydown',e=>{
        if(e.key==='Enter'){
          e.preventDefault();
          visibleTitleInput.blur();
        }
      });
      titleSlot.appendChild(visibleTitleInput);
      requestAnimationFrame(fitVisibleTitle);
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
        if(legacyTitleInput&&visibleTitleInput)legacyTitleInput.value=visibleTitleInput.value.replace(/\s*\n\s*/g,' ');
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
    const centerStack=center.querySelector('.r10-center-stack');if(conferenceSection)conferenceSection.remove();[briefing,attachments,incoming,delivery,completionAction].filter(Boolean).forEach(x=>centerStack.appendChild(x));workspace.appendChild(center);
    const objectiveTextarea=briefing?.querySelector('.description-area');
    if(objectiveTextarea?._r10Fit){
      requestAnimationFrame(()=>{objectiveTextarea._r10Fit();requestAnimationFrame(()=>objectiveTextarea._r10Fit());});
      window.addEventListener('resize',objectiveTextarea._r10Fit,{passive:true,once:false});
    }

    const side=document.createElement('aside');side.className='r10-side';side.innerHTML='<div class="r10-side-stack"></div>';const stack=side.querySelector('.r10-side-stack');
    const info=document.createElement('section');info.className='r10-side-card r10-status-card';info.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('statusPanel')+'</span><strong>Status e informações</strong></div><div class="r10-side-card-body"></div>';const ib=info.querySelector('.r10-side-card-body');[statusField,ownerField,dueField,priorityField].filter(Boolean).forEach(x=>ib.appendChild(x));stack.appendChild(info);

    const context=document.createElement('section');context.className='r10-side-card r10-context-card';context.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('folder')+'</span><strong>'+(t.campaignId?'Contexto da campanha':'Contexto da tarefa')+'</strong></div><div class="r10-side-card-body"></div>';const cb=context.querySelector('.r10-side-card-body');if(campaignField)cb.appendChild(campaignField);
    cb.insertAdjacentHTML('beforeend','<div class="r10-context-row"><span>Cliente</span><span class="r10-context-value r10-client-value"><i class="r10-brand-dot '+r10BrandTone(t.brand)+'"></i><span>'+r10Esc(t.brand||'—')+'</span></span></div>');
    stack.appendChild(context);

    const r10UniqueTasks=rows=>{
      const seen=new Set();
      return rows.filter(Boolean).filter(x=>{
        const id=String(x.id);
        if(seen.has(id))return false;
        seen.add(id);
        return true;
      });
    };
    const childSteps=taskData.filter(x=>String(x.parentTaskId||'')===String(t.id));
    const parentStep=t.parentTaskId?r10Task(t.parentTaskId):null;
    const deps=r10UniqueTasks([...r10Deps(t),...childSteps]);
    const dependents=r10UniqueTasks([...r10Dependents(t),parentStep]);
    const dependencyRow=(x,relation)=>{
      const status=r10Status(x);
      const tone=status==='Concluída'?'done':status==='Bloqueada'?'blocked':status==='Pendente'?'waiting':'ready';
      const icon=tone==='done'?r10Icon('done'):(tone==='blocked'||tone==='waiting')?r10Icon('hourglass'):r10Icon('next');
      const miniIcon=tone==='done'?r10Icon('statusDoneMini'):tone==='blocked'?r10Icon('statusBlockedMini'):r10Icon('statusPendingMini');
      return '<button type="button" class="r10-dep-row '+tone+'" data-r10-task="'+r10Esc(x.id)+'"><span class="r10-dep-icon">'+icon+'</span><span class="r10-dep-copy"><b>'+r10Esc(x.title)+'</b><span class="r10-dep-status '+tone+'"><span class="r10-dep-status-icon">'+miniIcon+'</span><span class="r10-dep-status-text">'+r10Esc(status)+'</span></span></span></button>';
    };
    const dependencyGroup=(label,rows,relation)=>{
      const content=rows.length?rows.map(x=>dependencyRow(x,relation)).join(''):'<div class="r10-dep-none">—</div>';
      return '<div class="r10-dep-group '+(rows.length?'has-items':'is-empty')+'"><span class="r10-dep-label">'+label+'</span><div class="r10-dep-list">'+content+'</div></div>';
    };
    const depHtml=dependencyGroup('Depende de',deps,'before')+dependencyGroup('Desbloqueia',dependents,'after');
    const depCard=document.createElement('section');
    depCard.className='r10-side-card r10-dependencies-card';
    depCard.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('dependency')+'</span><strong>Dependências</strong></div><div class="r10-side-card-body">'+depHtml+'</div>';
    stack.appendChild(depCard);

    if(comments){
      const card=document.createElement('section');
      card.className='r10-side-card r10-observations-card';
      card.innerHTML='<div class="r10-side-card-head"><span class="r10-side-card-icon">'+r10Icon('comment')+'</span><strong>Observações</strong></div><div class="r10-side-card-body"></div>';
      const cc=card.querySelector('.r10-side-card-body');
      const add=comments.querySelector('.v3-comment-add');
      const list=comments.querySelector('#commentList');
      if(list){
        list.querySelectorAll('.comment').forEach(row=>{
          const nameEl=row.querySelector('.comment-body>b');
          const avatarEl=row.querySelector('.cav');
          const person=r10Person(nameEl?.textContent||'');
          if(person){
            if(nameEl)nameEl.textContent=person.nome||nameEl.textContent;
            if(avatarEl)avatarEl.innerHTML=r10AvatarInner(person.nome,person.id);
          }
        });
      }
      if(add){
        const input=add.querySelector('#newCommentText');
        const submit=add.querySelector('#addCommentBtn');
        if(input){
          input.placeholder='Adicione uma observação...';
          input.setAttribute('aria-label','Adicionar observação');
          input.addEventListener('keydown',e=>{
            if(e.key==='Enter'&&!e.shiftKey){
              e.preventDefault();
              submit?.click();
            }
          });
        }
      }
      [add,list].filter(Boolean).forEach(x=>cc.appendChild(x));
      stack.appendChild(card);
    }
    workspace.appendChild(side);oldLayout.replaceWith(workspace);

    const syncVisibleTitle=()=>{
      const current=r10Task(taskState.selected);
      if(!current)return;
      const input=workspace.querySelector('.r10-title-input');
      if(input){
        current.title=input.value.replace(/\s*\n\s*/g,' ').trim()||current.title;
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
      workspace.querySelector('#r10AttachmentInput')?.click();
    });
    workspace.querySelector('#r10AttachmentInput')?.addEventListener('change',async e=>{
      const selected=[...e.target.files];
      if(!selected.length)return;
      t.attachments=Array.isArray(t.attachments)?t.attachments:[];
      const readDataUrl=file=>new Promise(resolve=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:'');
        reader.onerror=()=>resolve('');
        reader.readAsDataURL(file);
      });
      const additions=[];
      for(const file of selected){
        additions.push({
          name:file.name,
          size:(file.size>=1048576?(file.size/1048576).toFixed(file.size>=10485760?0:1)+' MB':Math.max(1,Math.round(file.size/1024))+' KB'),
          type:file.type||'',
          dataUrl:await readDataUrl(file)
        });
      }
      t.attachments.push(...additions);
      try{
        if(typeof v3Persist==='function')v3Persist(false);
      }catch(err){
        console.warn('[AllianceOS attachment persist]',err);
      }
      renderTaskDetailBody(t);
    });
    workspace.querySelectorAll('[data-r10-missing-download]').forEach(btn=>btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      if(typeof showToast==='function')showToast('Este anexo antigo não possui o arquivo salvo. Reanexe para habilitar o download.');
    }));
    workspace.querySelectorAll('[data-r10-remove-material]').forEach(btn=>btn.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      const index=Number(btn.dataset.r10RemoveMaterial);
      if(!Number.isInteger(index)||index<0)return;
      t.attachments.splice(index,1);
      if(typeof v3Persist==='function')v3Persist(false);
      renderTaskDetailBody(t);
    }));
    const dueInput=workspace.querySelector('#detailDue');
    const dueTrigger=workspace.querySelector('[data-r10-edit-due]');
    const refreshDueVisual=()=>{
      if(!dueTrigger||!dueInput)return;
      const dueVisual=r10DueVisual({dueAt:dueInput.value||''});
      const main=dueTrigger.querySelector('strong');
      const sub=dueTrigger.querySelector('small');
      if(main)main.textContent=dueVisual.main;
      if(sub)sub.textContent=dueVisual.sub;
    };
    dueTrigger?.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      if(!dueInput)return;
      try{
        if(typeof dueInput.showPicker==='function')dueInput.showPicker();
        else{dueInput.focus();dueInput.click();}
      }catch{
        dueInput.focus();
        dueInput.click();
      }
    });
    dueInput?.addEventListener('change',()=>{
      refreshDueVisual();
      dueField?.classList.add('r10-field-edited');
    });

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
  const r10BaseOpenTaskDetail=openTaskDetail;
  const r10BaseCloseTaskDetail=closeTaskDetail;
  const r10SetTaskModalLock=locked=>{
    document.documentElement.classList.toggle('r10-task-modal-open',locked);
    document.body.classList.toggle('r10-task-modal-open',locked);
  };
  openTaskDetail=function(id){
    r10SyncShellGeometry();
    r10SetTaskModalLock(true);
    r10BaseOpenTaskDetail(id);
    requestAnimationFrame(r10SyncShellGeometry);
  };
  closeTaskDetail=function(){
    r10BaseCloseTaskDetail();
    r10SetTaskModalLock(false);
  };
  const r10SyncShellGeometry=()=>{
    const root=document.documentElement;
    const main=document.querySelector('.main');
    const toolbar=document.querySelector('.global-toolbar');
    const sidebar=document.querySelector('.sidebar');
    if(!main||!toolbar)return;
    const mainRect=main.getBoundingClientRect();
    const barRect=toolbar.getBoundingClientRect();
    const sideRect=sidebar?.getBoundingClientRect();
    const gap=Math.max(8,Math.round(mainRect.left-(sideRect?.right??(mainRect.left-12))));
    const right=Math.max(8,Math.round(window.innerWidth-mainRect.right));
    const bottom=Math.max(8,Math.round(window.innerHeight-mainRect.bottom));
    root.style.setProperty('--r10-shell-left',Math.round(mainRect.left)+'px');
    root.style.setProperty('--r10-shell-right',right+'px');
    root.style.setProperty('--r10-shell-top',Math.round(barRect.bottom+gap)+'px');
    root.style.setProperty('--r10-shell-bottom',bottom+'px');
    root.style.setProperty('--r10-shell-gap',gap+'px');
  };
  r10SyncShellGeometry();
  window.addEventListener('resize',r10SyncShellGeometry,{passive:true});
  const r10ShellObserver=new ResizeObserver(()=>r10SyncShellGeometry());
  const r10MainShell=document.querySelector('.main');
  const r10ToolbarShell=document.querySelector('.global-toolbar');
  const r10SidebarShell=document.querySelector('.sidebar');
  if(r10MainShell)r10ShellObserver.observe(r10MainShell);
  if(r10ToolbarShell)r10ShellObserver.observe(r10ToolbarShell);
  if(r10SidebarShell)r10ShellObserver.observe(r10SidebarShell);

  const r10Drawer=document.getElementById('taskDetailDrawer');
  if(r10Drawer&&!r10Drawer.dataset.r10ScrollGuard){
    r10Drawer.dataset.r10ScrollGuard='1';
    r10Drawer.addEventListener('wheel',e=>{
      if(!e.target.closest('.tdrawer-panel'))e.preventDefault();
    },{passive:false});
    r10Drawer.addEventListener('touchmove',e=>{
      if(!e.target.closest('.tdrawer-panel'))e.preventDefault();
    },{passive:false});
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
  #taskDetailDrawer .r10-title-slot{
    box-sizing:border-box!important;
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
  }
  #taskDetailDrawer .r10-title,
  #taskDetailDrawer .r10-title-input{
    box-sizing:border-box!important;
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    font-size:clamp(28px,2.2vw,34px)!important;
    line-height:1.08!important;
    font-weight:720!important;
    letter-spacing:-.045em!important;
    color:#101418!important;
    white-space:pre-wrap!important;
    overflow-wrap:break-word!important;
    word-break:normal!important;
  }
  #taskDetailDrawer .r10-title-input{
    display:block!important;
    min-height:38px!important;
    margin:0!important;
    padding:0!important;
    border:0!important;
    outline:0!important;
    resize:none!important;
    overflow:hidden!important;
    background:transparent!important;
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    box-shadow:none!important;
  }
  #taskDetailDrawer .r10-subtitle{
    box-sizing:border-box!important;
    width:100%!important;
    max-width:none!important;
    min-width:0!important;
    margin:10px 0 0!important;
    color:#6f7a84!important;
    font-size:clamp(13px,.95vw,14px)!important;
    line-height:1.5!important;
    font-weight:430!important;
    white-space:normal!important;
    overflow:visible!important;
    text-overflow:clip!important;
    overflow-wrap:break-word!important;
    word-break:normal!important;
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

  #taskDetailDrawer .r10-head-chip.campaign,
  #taskDetailDrawer .r10-head-chip.priority{
    box-sizing:border-box!important;
    height:39px!important;
    min-height:39px!important;
    padding:0 10px!important;
    gap:6px!important;
    border:1px solid #d9dee3!important;
    border-radius:10px!important;
    background:#fff!important;
    color:#263039!important;
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    font-size:12.5px!important;
    font-weight:600!important;
    line-height:1!important;
    letter-spacing:-.008em!important;
    cursor:pointer!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign .r10-head-chip-label,
  #taskDetailDrawer .r10-head-chip.priority .r10-head-chip-label{
    display:block!important;
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    font-size:12.5px!important;
    font-weight:600!important;
    line-height:1!important;
    letter-spacing:-.008em!important;
    color:inherit!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign .r10-head-chip-icon,
  #taskDetailDrawer .r10-head-chip.priority .r10-head-chip-icon{
    width:17px!important;
    height:17px!important;
    min-width:17px!important;
    flex:0 0 17px!important;
    display:grid!important;
    place-items:center!important;
    margin:0!important;
    padding:0!important;
    border-radius:0!important;
    background:transparent!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign .r10-head-chip-icon .r10-svg,
  #taskDetailDrawer .r10-head-chip.priority .r10-head-chip-icon .r10-svg{
    display:block!important;
    width:13px!important;
    height:13px!important;
    min-width:13px!important;
    margin:0!important;
    padding:0!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign{
    color:#263039!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign .r10-head-chip-icon .r10-svg{
    color:#246bfe!important;
  }
  #taskDetailDrawer .r10-head-chip.campaign:hover{
    background:#f8faff!important;
    border-color:#cbd7ec!important;
  }

  #taskDetailDrawer .r10-head-chip.priority{
    color:#5d6870!important;
    cursor:default!important;
  }
  #taskDetailDrawer .r10-head-chip.priority .r10-head-chip-icon .r10-svg{
    color:#727d85!important;
  }
  #taskDetailDrawer .r10-head-chip.priority-high,
  #taskDetailDrawer .r10-head-chip.priority-urgent{
    background:#fff0f2!important;
    border-color:#f3cbd2!important;
    color:#ef3f4d!important;
  }
  #taskDetailDrawer .r10-head-chip.priority-high .r10-head-chip-icon .r10-svg,
  #taskDetailDrawer .r10-head-chip.priority-urgent .r10-head-chip-icon .r10-svg{
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
  #taskDetailDrawer .r10-main .r10-objective-card{
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
  }

  #taskDetailDrawer .r10-main .r10-objective-card .tsection-head,
  #taskDetailDrawer .r10-main .r10-materials-card .tsection-head{
    box-sizing:border-box!important;
    min-height:64px!important;
    padding:14px 18px 8px!important;
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
    width:40px!important;
    height:40px!important;
    min-width:40px!important;
    flex:0 0 40px!important;
    display:grid!important;
    place-items:center!important;
    border-radius:11px!important;
    background:#edf0f2!important;
    color:#20272c!important;
  }
  #taskDetailDrawer .r10-section-icon .r10-svg{
    display:block!important;
    position:static!important;
    width:21px!important;
    height:21px!important;
    min-width:21px!important;
    margin:0!important;
    padding:0!important;
    transform:none!important;
    translate:none!important;
    stroke-width:1.9!important;
  }
  #taskDetailDrawer .r10-objective-icon{
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    place-items:unset!important;
    padding:0!important;
    text-align:center!important;
  }
  #taskDetailDrawer .r10-objective-icon .r10-svg{
    flex:0 0 21px!important;
    margin:auto!important;
  }
  #taskDetailDrawer .r10-main .r10-objective-heading>strong,
  #taskDetailDrawer .r10-main .r10-materials-heading>strong{
    display:block!important;
    margin:0!important;
    padding:0!important;
    color:#12171b!important;
    font-size:17px!important;
    font-weight:720!important;
    line-height:1.15!important;
    letter-spacing:-.022em!important;
    white-space:nowrap!important;
  }

  #taskDetailDrawer .r10-main .r10-objective-card .description-area{
    box-sizing:border-box!important;
    display:block!important;
    width:100%!important;
    min-height:84px!important;
    margin:0!important;
    padding:0 22px 22px 72px!important;
    border:0!important;
    outline:0!important;
    height:auto;
    max-height:none!important;
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
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    place-items:unset!important;
    width:40px!important;
    height:40px!important;
    min-width:40px!important;
    flex:0 0 40px!important;
    padding:0!important;
    border-radius:11px!important;
    background:#edf0f2!important;
    color:#7f8a92!important;
    text-align:center!important;
    cursor:pointer!important;
  }
  #taskDetailDrawer .r10-materials-icon .r10-svg{
    display:block!important;
    position:static!important;
    width:21px!important;
    height:21px!important;
    min-width:21px!important;
    flex:0 0 21px!important;
    margin:auto!important;
    padding:0!important;
    transform:none!important;
    translate:none!important;
    color:#7f8a92!important;
    stroke-width:1.65!important;
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
    min-height:60px!important;
    width:100%!important;
    display:grid!important;
    grid-template-columns:38px minmax(0,1fr) auto!important;
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
    width:34px!important;
    height:34px!important;
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
  #taskDetailDrawer .r10-material-actions{
    display:flex!important;
    align-items:center!important;
    justify-content:flex-end!important;
    gap:4px!important;
    min-width:68px!important;
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
  #taskDetailDrawer .r10-material-download{
    color:#66727b!important;
  }
  #taskDetailDrawer .r10-material-download.is-disabled{
    opacity:.34!important;
    cursor:not-allowed!important;
  }
  #taskDetailDrawer .r10-material-remove{
    color:#8a949b!important;
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
  #taskDetailDrawer .r10-materials-card .file-pill,
  #taskDetailDrawer .r10-materials-card .attachment-drop,
  #taskDetailDrawer .r10-materials-card .v3-attachment-drop{
    display:none!important;
  }

  /* Incoming materials — same family as materials/inputs */
  #taskDetailDrawer .r10-main .r10-incoming-card{
    margin-top:16px!important;
    padding:0 0 18px!important;
    border:1px solid #e2e7ea!important;
    border-radius:16px!important;
    background:#fff!important;
    box-shadow:none!important;
    overflow:hidden!important;
  }
  #taskDetailDrawer .r10-main .r10-incoming-card>.tsection-head{
    box-sizing:border-box!important;
    min-height:70px!important;
    display:flex!important;
    flex-direction:row!important;
    align-items:center!important;
    justify-content:space-between!important;
    gap:12px!important;
    padding:15px 18px 10px!important;
    border:0!important;
    background:#fff!important;
  }
  #taskDetailDrawer .r10-incoming-heading{
    min-width:0!important;
    display:flex!important;
    align-items:center!important;
    gap:13px!important;
    margin:0!important;
    padding:0!important;
  }
  #taskDetailDrawer .r10-incoming-icon{
    width:40px!important;
    height:40px!important;
    min-width:40px!important;
    flex:0 0 40px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    padding:0!important;
    border-radius:11px!important;
    background:#edf0f2!important;
    color:#7f8a92!important;
  }
  #taskDetailDrawer .r10-incoming-icon .r10-svg{
    display:block!important;
    width:21px!important;
    height:21px!important;
    min-width:21px!important;
    margin:0!important;
    padding:0!important;
    color:#7f8a92!important;
    stroke-width:1.65!important;
  }
  #taskDetailDrawer .r10-main .r10-incoming-card>.tsection-head .r10-incoming-heading{
    min-width:0!important;display:flex!important;align-items:center!important;gap:13px!important;margin:0!important;padding:0!important;
  }
  #taskDetailDrawer .r10-main .r10-incoming-card>.tsection-head .r10-incoming-icon{
    width:40px!important;height:40px!important;min-width:40px!important;flex:0 0 40px!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0!important;padding:0!important;border-radius:11px!important;background:#edf0f2!important;color:#7f8a92!important;cursor:default!important;
  }
  #taskDetailDrawer .r10-main .r10-incoming-card>.tsection-head .r10-incoming-icon .r10-svg{
    width:21px!important;height:21px!important;min-width:21px!important;margin:0!important;color:#7f8a92!important;stroke-width:1.65!important;
  }
  #taskDetailDrawer .r10-main .r10-incoming-card>.tsection-head .r10-incoming-heading>strong{
    display:block!important;margin:0!important;padding:0!important;color:#12171b!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:17px!important;font-weight:720!important;line-height:1.15!important;letter-spacing:-.022em!important;white-space:nowrap!important;
  }
  #taskDetailDrawer .r10-incoming-card>.v5-delivery-list{
    display:flex!important;
    flex-direction:column!important;
    gap:10px!important;
    margin:0 18px!important;
    padding:0!important;
  }
  #taskDetailDrawer .r10-incoming-source-card{
    margin:0!important;
    padding:0!important;
    border:0!important;
    border-radius:0!important;
    background:transparent!important;
    box-shadow:none!important;
  }
  #taskDetailDrawer .r10-incoming-source-card .v5-delivery-card-head{
    margin-bottom:10px!important;
  }
  #taskDetailDrawer .r10-incoming-source-card .v5-delivery-card-head strong{
    color:#303a42!important;
    font-size:12.5px!important;
    font-weight:650!important;
    line-height:1.25!important;
  }
  #taskDetailDrawer .r10-incoming-source-card .v5-delivery-card-head>div>span{
    color:#8a949c!important;
    font-size:10.5px!important;
  }
  #taskDetailDrawer .r10-incoming-source-card .v5-materials{
    display:flex!important;
    flex-direction:column!important;
    gap:8px!important;
  }

  /* Delivery — reference layout */
  #taskDetailDrawer .r10-main .r10-delivery-card{
    margin-top:16px!important;
    padding:0 0 18px!important;
    border:1px solid #e2e7ea!important;
    border-radius:16px!important;
    background:#fff!important;
    box-shadow:none!important;
    overflow:hidden!important;
  }
  #taskDetailDrawer .r10-main .r10-delivery-card>.tsection-head{
    box-sizing:border-box!important;
    min-height:70px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-start!important;
    padding:16px 18px 10px!important;
    border:0!important;
    background:#fff!important;
  }
  #taskDetailDrawer .r10-delivery-heading{
    min-width:0!important;
    display:flex!important;
    flex-direction:row!important;
    align-items:center!important;
    justify-content:flex-start!important;
    gap:13px!important;
    margin:0!important;
    padding:0!important;
  }
  #taskDetailDrawer .r10-delivery-head-icon{
    position:relative!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    place-items:unset!important;
    width:40px!important;
    height:40px!important;
    min-width:40px!important;
    flex:0 0 40px!important;
    padding:0!important;
    border-radius:11px!important;
    background:#edf0f2!important;
    color:#7f8a92!important;
    text-align:center!important;
  }
  #taskDetailDrawer .r10-delivery-head-icon .r10-svg{
    display:block!important;
    position:static!important;
    width:21px!important;
    height:21px!important;
    min-width:21px!important;
    flex:0 0 21px!important;
    margin:auto!important;
    padding:0!important;
    transform:none!important;
    translate:none!important;
    color:#7f8a92!important;
    stroke-width:1.65!important;
  }
  #taskDetailDrawer .r10-delivery-heading>strong{
    display:block!important;
    margin:0!important;
    padding:0!important;
    color:#12171b!important;
    font-size:17px!important;
    font-weight:720!important;
    line-height:1.15!important;
    letter-spacing:-.022em!important;
    white-space:nowrap!important;
  }
  #taskDetailDrawer .r10-main .r10-delivery-card>.tsection-head .r10-delivery-heading>strong{
    display:block!important;
    margin:0!important;
    padding:0!important;
    color:#12171b!important;
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    font-size:17px!important;
    font-weight:720!important;
    line-height:1.15!important;
    letter-spacing:-.022em!important;
    white-space:nowrap!important;
  }
  #taskDetailDrawer .r10-main .r10-delivery-card>.tsection-head .r10-delivery-head-icon{
    cursor:default!important;
    width:40px!important;
    height:40px!important;
    min-width:40px!important;
    flex:0 0 40px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    margin:0!important;
    padding:0!important;
    border-radius:11px!important;
    background:#edf0f2!important;
    color:#7f8a92!important;
  }
  #taskDetailDrawer .r10-main .r10-delivery-card>.tsection-head .r10-delivery-head-icon .r10-svg{
    display:block!important;
    width:21px!important;
    height:21px!important;
    min-width:21px!important;
    margin:0!important;
    padding:0!important;
    color:#7f8a92!important;
    stroke-width:1.65!important;
    transform:none!important;
  }
  #taskDetailDrawer .r10-delivery-card .v5-delivery-state{
    display:none!important;
  }
  #taskDetailDrawer .r10-delivery-card .v5-delivery-compose{
    margin:0!important;
    padding:0!important;
    border:0!important;
    background:transparent!important;
  }
  #taskDetailDrawer .r10-delivery-mode-switch{
    display:flex!important;
    align-items:center!important;
    gap:8px!important;
    margin:0 18px 12px!important;
  }
  #taskDetailDrawer .r10-delivery-mode-btn{
    box-sizing:border-box!important;
    height:36px!important;
    display:inline-flex!important;
    align-items:center!important;
    justify-content:center!important;
    gap:7px!important;
    padding:0 11px!important;
    border:1px solid #dce2e6!important;
    border-radius:10px!important;
    background:#fff!important;
    color:#68737c!important;
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    font-size:11.5px!important;
    font-weight:600!important;
    line-height:1!important;
    cursor:pointer!important;
  }
  #taskDetailDrawer .r10-delivery-mode-btn .r10-svg{
    width:16px!important;
    height:16px!important;
    min-width:16px!important;
    margin:0!important;
    stroke-width:1.75!important;
  }
  #taskDetailDrawer .r10-delivery-mode-btn.is-active{
    background:#f3f5f6!important;
    border-color:#cfd8de!important;
    color:#222b31!important;
  }
  #taskDetailDrawer .r10-delivery-dropzone[hidden],
  #taskDetailDrawer .r10-delivery-alternatives[hidden]{
    display:none!important;
  }

  #taskDetailDrawer .r10-delivery-alternatives{
    box-sizing:border-box!important;
    margin:0 18px 16px!important;
    padding:14px!important;
    border:1px solid #e2e7ea!important;
    border-radius:13px!important;
    background:#fff!important;
  }
  #taskDetailDrawer .r10-delivery-alt-head{
    display:flex!important;
    align-items:baseline!important;
    gap:8px!important;
    margin-bottom:11px!important;
  }
  #taskDetailDrawer .r10-delivery-alt-head>strong{
    color:#20272d!important;
    font-size:13px!important;
    font-weight:650!important;
  }
  #taskDetailDrawer .r10-delivery-alt-head>span{
    color:#8a949c!important;
    font-size:10.5px!important;
    font-weight:450!important;
  }
  #taskDetailDrawer .r10-delivery-alt-grid{
    display:grid!important;
    grid-template-columns:minmax(0,1.15fr) minmax(230px,.85fr)!important;
    grid-template-rows:auto auto!important;
    gap:10px 12px!important;
  }
  #taskDetailDrawer .r10-delivery-alt-grid>label{
    display:flex!important;
    flex-direction:column!important;
    gap:6px!important;
    margin:0!important;
    color:#4c5861!important;
    font-size:10.5px!important;
    font-weight:650!important;
  }
  #taskDetailDrawer .r10-delivery-note-field{
    grid-column:1!important;
    grid-row:1 / 3!important;
  }
  #taskDetailDrawer .r10-delivery-link-field{
    grid-column:2!important;
    grid-row:1!important;
  }
  #taskDetailDrawer .r10-delivery-link-label-field{
    grid-column:2!important;
    grid-row:2!important;
  }
  #taskDetailDrawer .r10-delivery-alt-grid textarea,
  #taskDetailDrawer .r10-delivery-alt-grid input{
    box-sizing:border-box!important;
    width:100%!important;
    margin:0!important;
    border:1px solid #dce2e6!important;
    border-radius:10px!important;
    outline:0!important;
    background:#fff!important;
    color:#263139!important;
    font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
    font-size:12.5px!important;
    font-weight:450!important;
    line-height:1.4!important;
  }
  #taskDetailDrawer .r10-delivery-alt-grid textarea{
    min-height:96px!important;
    height:100%!important;
    padding:11px 12px!important;
    resize:vertical!important;
  }
  #taskDetailDrawer .r10-delivery-alt-grid input{
    height:43px!important;
    padding:0 12px!important;
  }
  #taskDetailDrawer .r10-delivery-alt-grid textarea:focus,
  #taskDetailDrawer .r10-delivery-alt-grid input:focus{
    border-color:#b9c5cd!important;
    box-shadow:0 0 0 2px rgba(59,93,116,.06)!important;
  }
  #taskDetailDrawer .r10-delivery-dropzone{
    box-sizing:border-box!important;
    position:relative!important;
    min-height:176px!important;
    margin:0 18px 16px!important;
    padding:24px!important;
    display:flex!important;
    flex-direction:column!important;
    align-items:center!important;
    justify-content:center!important;
    gap:12px!important;
    border:1px dashed #d7dfe5!important;
    border-radius:16px!important;
    background:#fbfcfd!important;
    text-align:center!important;
    cursor:pointer!important;
    transition:border-color .15s ease,background .15s ease!important;
  }
  #taskDetailDrawer .r10-delivery-dropzone:hover,
  #taskDetailDrawer .r10-delivery-dropzone.is-dragging{
    border-color:#bfcbd4!important;
    background:#f8fafb!important;
  }
  #taskDetailDrawer .r10-delivery-dropzone>#v5DeliveryFiles{
    position:absolute!important;
    inset:0!important;
    width:100%!important;
    height:100%!important;
    margin:0!important;
    padding:0!important;
    border:0!important;
    opacity:0!important;
    font-size:0!important;
    cursor:pointer!important;
    z-index:3!important;
  }
  #taskDetailDrawer .r10-delivery-drop-icon{
    width:62px!important;
    height:62px!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    border-radius:999px!important;
    background:#edf0f2!important;
    color:#7f8a92!important;
  }
  #taskDetailDrawer .r10-delivery-drop-icon .r10-svg{
    display:block!important;
    width:28px!important;
    height:28px!important;
    min-width:28px!important;
    margin:0!important;
    color:#7f8a92!important;
    stroke-width:1.6!important;
  }
  #taskDetailDrawer .r10-delivery-drop-copy{
    display:flex!important;
    flex-direction:column!important;
    align-items:center!important;
    gap:5px!important;
  }
  #taskDetailDrawer .r10-delivery-drop-copy>strong{
    margin:0!important;
    color:#182027!important;
    font-size:16px!important;
    font-weight:650!important;
    line-height:1.22!important;
  }
  #taskDetailDrawer .r10-delivery-drop-copy>span{
    color:#69757f!important;
    font-size:14px!important;
    font-weight:500!important;
    line-height:1.2!important;
  }
  #taskDetailDrawer .r10-delivery-drop-copy>small{
    color:#8b959d!important;
    font-size:12.5px!important;
    font-weight:450!important;
    line-height:1.2!important;
  }
  #taskDetailDrawer .r10-delivery-files-bar{
    box-sizing:border-box!important;
    min-height:58px!important;
    margin:0 18px!important;
    padding:0 16px!important;
    display:flex!important;
    align-items:center!important;
    gap:14px!important;
    border:1px solid #e2e7ea!important;
    border-radius:13px!important;
    background:#fff!important;
  }
  #taskDetailDrawer .r10-delivery-files-count{
    margin:0!important;
    color:#20272d!important;
    font-size:14px!important;
    font-weight:650!important;
    line-height:1!important;
    white-space:nowrap!important;
  }
  #taskDetailDrawer .r10-delivery-files-status{
    margin-left:auto!important;
    color:#7f8991!important;
    font-size:13px!important;
    font-weight:450!important;
    line-height:1.2!important;
    text-align:right!important;
  }
  #taskDetailDrawer .r10-delivery-actions{
    display:none!important;
    align-items:center!important;
    gap:8px!important;
    margin-left:auto!important;
  }
  #taskDetailDrawer .r10-delivery-card.has-content .r10-delivery-files-status{
    display:none!important;
  }
  #taskDetailDrawer .r10-delivery-card.has-content .r10-delivery-actions{
    display:flex!important;
  }
  #taskDetailDrawer .r10-delivery-actions button{
    min-height:34px!important;
    height:34px!important;
    padding:0 12px!important;
    border:1px solid #d8dee3!important;
    border-radius:9px!important;
    background:#fff!important;
    color:#2e3941!important;
    font-size:11px!important;
    font-weight:650!important;
    cursor:pointer!important;
  }
  #taskDetailDrawer .r10-delivery-actions button.primary{
    border-color:#171c20!important;
    background:#171c20!important;
    color:#fff!important;
  }
  #taskDetailDrawer .r10-delivery-actions button:disabled{
    opacity:.4!important;
    cursor:not-allowed!important;
  }
  #taskDetailDrawer .r10-delivery-card>.v5-delivery-list{
    margin:0 18px 14px!important;
    display:flex!important;
    flex-direction:column!important;
    gap:10px!important;
  }
  #taskDetailDrawer .r10-delivery-card .v5-delivery-card{
    padding:0!important;
    border:0!important;
    border-radius:0!important;
    background:transparent!important;
    box-shadow:none!important;
  }
  #taskDetailDrawer .r10-delivery-card .v5-delivery-card-head{
    margin-bottom:10px!important;
  }
  #taskDetailDrawer .r10-delivery-card .v5-materials{
    display:flex!important;
    flex-direction:column!important;
    gap:8px!important;
  }
  #taskDetailDrawer .r10-incoming-card .v5-delivery-ok,
  #taskDetailDrawer .r10-delivery-card .v5-delivery-ok{
    box-sizing:border-box!important;min-height:28px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;padding:0 10px!important;border:1px solid #d8eee1!important;border-radius:999px!important;background:#eff9f3!important;color:#31845e!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:11.5px!important;font-weight:650!important;line-height:1!important;white-space:nowrap!important;
  }
  #taskDetailDrawer .r10-incoming-card .v5-delivery-ok::before,
  #taskDetailDrawer .r10-delivery-card .v5-delivery-ok::before{
    content:""!important;width:7px!important;height:7px!important;flex:0 0 7px!important;border-radius:999px!important;background:#31a36f!important;
  }
  #taskDetailDrawer .r10-delivery-card .r10-delivery-sent-item,
  #taskDetailDrawer .r10-incoming-card .r10-delivery-sent-item{
    box-sizing:border-box!important;
    min-height:60px!important;
    width:100%!important;
    display:grid!important;
    grid-template-columns:38px minmax(0,1fr) auto!important;
    grid-template-rows:auto auto!important;
    align-items:center!important;
    gap:2px 11px!important;
    margin:0!important;
    padding:9px 10px!important;
    border:1px solid #e2e7ea!important;
    border-radius:11px!important;
    background:#fff!important;
    color:#20272d!important;
    text-decoration:none!important;
    overflow:hidden!important;
  }
  #taskDetailDrawer .r10-delivery-sent-icon{
    grid-column:1!important;
    grid-row:1 / 3!important;
    width:34px!important;
    height:34px!important;
    display:grid!important;
    place-items:center!important;
    border-radius:9px!important;
    background:#eef2f4!important;
    color:#68747d!important;
  }
  #taskDetailDrawer .r10-delivery-sent-icon .r10-svg{width:18px!important;height:18px!important;stroke-width:1.75!important}
  #taskDetailDrawer .r10-delivery-sent-item.type-pdf .r10-delivery-sent-icon{background:#fff0f1!important;color:#ef3f4d!important}
  #taskDetailDrawer .r10-delivery-sent-item.type-archive .r10-delivery-sent-icon{background:#fff2df!important;color:#e68a1f!important}
  #taskDetailDrawer .r10-delivery-sent-item.type-image .r10-delivery-sent-icon{background:#edf3ff!important;color:#3d73de!important}
  #taskDetailDrawer .r10-delivery-sent-item.type-video .r10-delivery-sent-icon{background:#f2efff!important;color:#7158d9!important}
  #taskDetailDrawer .r10-delivery-sent-item.type-audio .r10-delivery-sent-icon{background:#eaf8f1!important;color:#2a9363!important}
  #taskDetailDrawer .r10-delivery-sent-item.type-link .r10-delivery-sent-icon{background:#edf3ff!important;color:#3d73de!important}
  #taskDetailDrawer .r10-delivery-sent-item.type-text .r10-delivery-sent-icon,
  #taskDetailDrawer .r10-delivery-sent-item.type-textfile .r10-delivery-sent-icon{background:#f1f3f4!important;color:#66727b!important}
  #taskDetailDrawer .r10-delivery-sent-name{
    grid-column:2!important;grid-row:1!important;align-self:end!important;min-width:0!important;margin:0!important;color:#20272d!important;font-size:14px!important;font-weight:650!important;line-height:1.18!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important
  }
  #taskDetailDrawer .r10-delivery-sent-meta{
    grid-column:2!important;grid-row:2!important;align-self:start!important;min-width:0!important;margin:0!important;color:#7f8991!important;font-size:12px!important;font-weight:450!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important
  }
  #taskDetailDrawer .r10-delivery-sent-actions{
    grid-column:3!important;
    grid-row:1 / 3!important;
    display:flex!important;
    align-items:center!important;
    justify-content:flex-end!important;
    gap:11px!important;
    align-self:center!important;
    min-width:max-content!important;
    margin:0!important;
    padding:0 4px 0 14px!important;
    border:0!important;
    border-radius:0!important;
    background:transparent!important;
    background-color:transparent!important;
    background-image:none!important;
    box-shadow:none!important;
    filter:none!important;
  }
  #taskDetailDrawer .r10-incoming-card .v5-material-actions,
  #taskDetailDrawer .r10-delivery-card .v5-material-actions{
    border:0!important;
    border-radius:0!important;
    background:transparent!important;
    background-color:transparent!important;
    background-image:none!important;
    box-shadow:none!important;
    filter:none!important;
  }
  #taskDetailDrawer .r10-incoming-card .v5-material-actions::before,
  #taskDetailDrawer .r10-incoming-card .v5-material-actions::after,
  #taskDetailDrawer .r10-delivery-card .v5-material-actions::before,
  #taskDetailDrawer .r10-delivery-card .v5-material-actions::after{
    display:none!important;
    content:none!important;
  }
  #taskDetailDrawer .r10-delivery-sent-action{
    position:static!important;inset:auto!important;transform:none!important;translate:none!important;box-sizing:border-box!important;width:24px!important;height:24px!important;min-width:24px!important;flex:0 0 24px!important;display:grid!important;place-items:center!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#748089!important;opacity:1!important;cursor:pointer!important;text-decoration:none!important;
  }
  #taskDetailDrawer .r10-delivery-sent-action:hover{border:0!important;background:transparent!important;color:#20272d!important}
  #taskDetailDrawer .r10-delivery-sent-action.is-delete:hover{background:transparent!important;color:#df4452!important}
  #taskDetailDrawer .r10-delivery-sent-action .r10-svg{width:18px!important;height:18px!important;stroke-width:1.75!important}
  #taskDetailDrawer .r10-delivery-sent-actions>a,
  #taskDetailDrawer .r10-delivery-sent-actions>button,
  #taskDetailDrawer .r10-incoming-card .v5-material-actions>a,
  #taskDetailDrawer .r10-incoming-card .v5-material-actions>button,
  #taskDetailDrawer .r10-delivery-card .v5-material-actions>a,
  #taskDetailDrawer .r10-delivery-card .v5-material-actions>button{
    -webkit-appearance:none!important;
    appearance:none!important;
    position:static!important;
    inset:auto!important;
    transform:none!important;
    translate:none!important;
    box-sizing:border-box!important;
    width:24px!important;
    height:24px!important;
    min-width:24px!important;
    max-width:24px!important;
    flex:0 0 24px!important;
    display:grid!important;
    place-items:center!important;
    margin:0!important;
    padding:0!important;
    border:0!important;
    outline:0!important;
    border-radius:0!important;
    background:none!important;
    background-color:transparent!important;
    background-image:none!important;
    box-shadow:none!important;
    filter:none!important;
    color:#748089!important;
    opacity:1!important;
    cursor:pointer!important;
    text-decoration:none!important;
  }
  #taskDetailDrawer .r10-delivery-sent-actions>a:hover,
  #taskDetailDrawer .r10-delivery-sent-actions>button:hover,
  #taskDetailDrawer .r10-incoming-card .v5-material-actions>a:hover,
  #taskDetailDrawer .r10-incoming-card .v5-material-actions>button:hover,
  #taskDetailDrawer .r10-delivery-card .v5-material-actions>a:hover,
  #taskDetailDrawer .r10-delivery-card .v5-material-actions>button:hover{
    border:0!important;
    background:none!important;
    background-color:transparent!important;
    box-shadow:none!important;
    color:#20272d!important;
  }
  #taskDetailDrawer .r10-delivery-sent-actions>a::before,
  #taskDetailDrawer .r10-delivery-sent-actions>a::after,
  #taskDetailDrawer .r10-delivery-sent-actions>button::before,
  #taskDetailDrawer .r10-delivery-sent-actions>button::after{
    display:none!important;
    content:none!important;
  }
  #taskDetailDrawer [data-v5-download-unavailable]{
    opacity:.35!important;
    cursor:not-allowed!important;
  }
  #taskDetailDrawer .r10-delivery-card-head-actions{display:flex!important;align-items:center!important;gap:12px!important}

  #taskDetailDrawer .r10-completion-card{
    box-sizing:border-box!important;min-height:76px!important;margin-top:16px!important;padding:16px 18px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:18px!important;border:1px solid #e2e7ea!important;border-radius:16px!important;background:#fff!important
  }
  #taskDetailDrawer .r10-completion-copy{min-width:0!important;display:flex!important;flex-direction:column!important;gap:4px!important}
  #taskDetailDrawer .r10-completion-copy strong{color:#151a1e!important;font-size:15px!important;font-weight:700!important;line-height:1.2!important}
  #taskDetailDrawer .r10-completion-copy span{color:#7f8991!important;font-size:11.5px!important;line-height:1.35!important}
  #taskDetailDrawer .r10-complete-btn{
    box-sizing:border-box!important;min-width:150px!important;height:40px!important;margin:0!important;padding:0 15px!important;border:1px solid #171c20!important;border-radius:10px!important;background:#171c20!important;color:#fff!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:12px!important;font-weight:650!important;cursor:pointer!important
  }
  #taskDetailDrawer .r10-complete-btn.secondary{border-color:#d9e0e5!important;background:#fff!important;color:#4f5b64!important}
  #taskDetailDrawer .r10-complete-btn:disabled{border-color:#e0e5e8!important;background:#e7ebee!important;color:#9aa3aa!important;cursor:not-allowed!important}
  @media(max-width:1050px){
    #taskDetailDrawer .r10-delivery-alt-grid{
      grid-template-columns:1fr!important;
      grid-template-rows:auto!important;
    }
    #taskDetailDrawer .r10-delivery-note-field,
    #taskDetailDrawer .r10-delivery-link-field,
    #taskDetailDrawer .r10-delivery-link-label-field{
      grid-column:1!important;
      grid-row:auto!important;
    }
  }

  /* ===== Runtime V27 · grade final ===== */
  @media (min-width:901px){
    #taskDetailDrawer .r10-workspace{
      grid-template-columns:var(--alliance-task-flow-col,300px) minmax(0,1fr) var(--alliance-task-side-col,350px)!important;
    }
    #taskDetailDrawer .r10-flow{
      box-sizing:border-box!important;
      padding:18px 18px 24px!important;
      border-right:1px solid #e4e8eb!important;
    }
    #taskDetailDrawer .r10-main{
      box-sizing:border-box!important;
      padding:18px 22px 30px!important;
    }
    #taskDetailDrawer .r10-side{
      box-sizing:border-box!important;
      padding:18px 16px 26px!important;
      border-left:1px solid #e4e8eb!important;
    }
    #taskDetailDrawer .r10-flow-head,
    #taskDetailDrawer .r10-main-top,
    #taskDetailDrawer .r10-side-stack{
      margin-top:0!important;
    }
    #taskDetailDrawer .r10-progress-copy{
      margin-left:0!important;
      margin-right:0!important;
      padding-left:0!important;
      padding-right:0!important;
      border-top:0!important;
    }
  }

  body.v5-conference-modal-open{overflow:hidden!important}
  .v5-conference-modal{position:fixed!important;inset:0!important;z-index:2147483000!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:24px!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
  .v5-conference-backdrop{position:absolute!important;inset:0!important;background:rgba(17,24,39,.38)!important;backdrop-filter:blur(2px)!important}
  .v5-conference-dialog{position:relative!important;z-index:1!important;box-sizing:border-box!important;width:min(620px,calc(100vw - 40px))!important;max-height:min(760px,calc(100vh - 48px))!important;display:flex!important;flex-direction:column!important;border:1px solid #dfe5e9!important;border-radius:18px!important;background:#fff!important;box-shadow:0 24px 70px rgba(15,23,42,.18)!important;overflow:hidden!important}
  .v5-conference-head{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:20px!important;padding:22px 22px 16px!important;border-bottom:1px solid #edf0f2!important}
  .v5-conference-kicker{display:block!important;margin-bottom:7px!important;color:#8b959d!important;font-size:9px!important;font-weight:700!important;letter-spacing:.08em!important}
  .v5-conference-head h2{margin:0!important;color:#12171b!important;font-size:22px!important;font-weight:750!important;line-height:1.1!important;letter-spacing:-.025em!important}
  .v5-conference-head p{margin:7px 0 0!important;color:#75818a!important;font-size:12.5px!important;line-height:1.45!important}
  .v5-conference-close{width:34px!important;height:34px!important;display:grid!important;place-items:center!important;flex:0 0 34px!important;margin:0!important;padding:0!important;border:1px solid #dfe5e9!important;border-radius:9px!important;background:#fff!important;color:#65717a!important;font-size:19px!important;cursor:pointer!important}
  .v5-conference-progress{padding:14px 22px!important;border-bottom:1px solid #edf0f2!important}
  .v5-conference-progress>div:first-child{display:flex!important;align-items:baseline!important;justify-content:space-between!important;margin-bottom:8px!important}
  .v5-conference-progress strong{color:#20272d!important;font-size:12px!important;font-weight:700!important}
  .v5-conference-progress span{color:#8b959d!important;font-size:10.5px!important}
  .v5-conference-track{height:6px!important;border-radius:999px!important;background:#eef2f4!important;overflow:hidden!important}
  .v5-conference-track>span{display:block!important;height:100%!important;width:0;border-radius:inherit!important;background:#22b86f!important;transition:width .18s ease!important}
  .v5-conference-list{min-height:120px!important;max-height:430px!important;overflow:auto!important;padding:8px 14px!important}
  .v5-conference-item{box-sizing:border-box!important;min-height:52px!important;display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;align-items:center!important;gap:10px!important;padding:9px 10px!important;border-bottom:1px solid #eef1f3!important;cursor:pointer!important}
  .v5-conference-item:last-child{border-bottom:0!important}
  .v5-conference-item input{position:absolute!important;opacity:0!important;pointer-events:none!important}
  .v5-conference-box{width:22px!important;height:22px!important;display:grid!important;place-items:center!important;border:1px solid #cfd8de!important;border-radius:6px!important;background:#fff!important;color:transparent!important;font-size:12px!important;font-weight:800!important}
  .v5-conference-item.done .v5-conference-box{border-color:#22b86f!important;background:#22b86f!important;color:#fff!important}
  .v5-conference-text{color:#303a42!important;font-size:13px!important;font-weight:500!important;line-height:1.35!important}
  .v5-conference-item.done .v5-conference-text{color:#7b858d!important;text-decoration:line-through!important}
  .v5-conference-empty{padding:24px!important;text-align:center!important;color:#8b959d!important;font-size:12px!important}
  .v5-conference-foot{display:flex!important;justify-content:flex-end!important;gap:9px!important;padding:14px 18px!important;border-top:1px solid #edf0f2!important;background:#fbfcfd!important}
  .v5-conference-foot button{height:38px!important;padding:0 14px!important;border-radius:10px!important;font-family:inherit!important;font-size:12px!important;font-weight:650!important;cursor:pointer!important}
  .v5-conference-cancel{border:1px solid #d9e0e5!important;background:#fff!important;color:#53606a!important}
  .v5-conference-complete{border:1px solid #171c20!important;background:#171c20!important;color:#fff!important}
  .v5-conference-complete:disabled{border-color:#e0e5e8!important;background:#e7ebee!important;color:#9aa3aa!important;cursor:not-allowed!important}
  `;
  document.head.appendChild(r10FlowStyle);

  renderTaskDetailBody=function(t){r10RenderDetail(t)};
}
