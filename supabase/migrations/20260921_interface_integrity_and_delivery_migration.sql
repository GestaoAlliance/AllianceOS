-- AllianceOS — interface history/delivery integrity repair — 2026-09-21
-- No business row or JSON event is deleted. Existing duplicate/history data is preserved and marked.

alter table public.profiles
  add column if not exists tipo_membro text not null default 'usuario';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='profiles_tipo_membro_check'
      and conrelid='public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_tipo_membro_check
      check (tipo_membro in ('usuario','servico'));
  end if;
end $$;

-- This identity has an active profile but the Auth user is still unconfirmed/no sign-in.
-- Keep the pending invite untouched and expose the existing actor explicitly as a non-assignable service identity.
update public.profiles
set tipo_membro='servico'
where id='a02201ec-96d3-433f-b779-b81a4ee10066';

do $$
declare
  tasks jsonb;
  official jsonb;
  task jsonb;
  delivery jsonb;
  comment jsonb;
  hist jsonb;
  new_tasks jsonb := '[]'::jsonb;
  new_deliveries jsonb := '[]'::jsonb;
  new_comments jsonb;
  new_history jsonb;
  new_embedded jsonb;
  seen jsonb;
  task_idx int;
  item_idx int;
  hist_idx int;
  raw_at text;
  iso_at text;
  item_id text;
  millis text;
  source_id text;
  official_id text;
  recipient text;
  target_id text;
  source_title text;
  source_brand text;
  source_project text;
  source_campaign text;
  status_pt text;
  version_no int;
  migrated_count int;
  profile_id uuid;
  author_name text;
  duplicate_ref text;
  migration_event jsonb;
  official_match jsonb;
  dep_task jsonb;
  candidate_date text;
begin
  select valor into tasks
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null
  for update;

  select valor into official
  from public.operacional_estado
  where chave='central.deliveries.workspace.v1' and dono is null
  for update;

  tasks := coalesce(tasks,'[]'::jsonb);
  official := coalesce(official,'[]'::jsonb);
  new_deliveries := official;

  for task_idx in 0..greatest(jsonb_array_length(tasks)-1,-1) loop
    task := tasks->task_idx;
    source_id := task->>'id';
    source_title := coalesce(task->>'title','Tarefa');
    source_brand := task->>'brand';
    source_project := task->>'project';
    source_campaign := nullif(task->>'campaignId','');
    migrated_count := 0;

    -- Comments: recover exact timestamps from comment-<epoch-ms> where possible.
    new_comments := '[]'::jsonb;
    if jsonb_typeof(task->'comments')='array' then
      for item_idx in 0..greatest(jsonb_array_length(task->'comments')-1,-1) loop
        comment := task->'comments'->item_idx;
        raw_at := nullif(comment->>'at','');
        if raw_at='Agora' then
          millis := substring(coalesce(comment->>'id','') from 'comment-([0-9]{13})');
          if millis is not null then
            iso_at := to_char(to_timestamp(millis::numeric/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
            comment := comment || jsonb_build_object('at',iso_at,'atOriginal','Agora');
          else
            comment := comment || jsonb_build_object('at',null,'atOriginal','Agora','dataDesconhecida',true);
          end if;
        elsif raw_at is not null and raw_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]' then
          begin
            iso_at := to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
            comment := jsonb_set(comment,'{at}',to_jsonb(iso_at),true);
          exception when others then
            comment := comment || jsonb_build_object('at',null,'atOriginal',raw_at,'dataDesconhecida',true);
          end;
        end if;
        if not (comment ? 'source') then comment := comment || jsonb_build_object('source','interface'); end if;
        if not (comment ? 'authorId') and nullif(comment->>'author','') is not null then
          select p.id into profile_id
          from public.profiles p
          where lower(trim(p.nome))=lower(trim(comment->>'author'))
             or lower(split_part(trim(p.nome),' ',1))=lower(trim(comment->>'author'))
          order by case when lower(trim(p.nome))=lower(trim(comment->>'author')) then 0 else 1 end
          limit 1;
          if profile_id is not null then comment := comment || jsonb_build_object('authorId',profile_id); end if;
          profile_id := null;
        end if;
        new_comments := new_comments || jsonb_build_array(comment);
      end loop;
    end if;
    task := jsonb_set(task,'{comments}',new_comments,true);

    -- Embedded deliveries: normalize dates/status. Migrate only when a recipient can be recovered.
    new_embedded := '[]'::jsonb;
    if jsonb_typeof(task->'deliveries')='array' then
      for item_idx in 0..greatest(jsonb_array_length(task->'deliveries')-1,-1) loop
        delivery := task->'deliveries'->item_idx;
        item_id := coalesce(nullif(delivery->>'deliveryId',''),delivery->>'id');
        raw_at := nullif(delivery->>'at','');
        candidate_date := nullif(delivery->>'sentAt','');

        if raw_at='Agora' then
          if candidate_date is not null and candidate_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then
            begin
              iso_at := to_char(candidate_date::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
              delivery := delivery || jsonb_build_object('at',iso_at,'atOriginal','Agora');
            exception when others then
              delivery := delivery || jsonb_build_object('at',null,'atOriginal','Agora','dataDesconhecida',true);
            end;
          else
            millis := substring(coalesce(delivery->>'id','') from 'delivery-([0-9]{13})');
            if millis is not null then
              iso_at := to_char(to_timestamp(millis::numeric/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
              delivery := delivery || jsonb_build_object('at',iso_at,'atOriginal','Agora');
            else
              delivery := delivery || jsonb_build_object('at',null,'atOriginal','Agora','dataDesconhecida',true);
            end if;
          end if;
        elsif raw_at is not null and raw_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]' then
          begin
            iso_at := to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
            delivery := jsonb_set(delivery,'{at}',to_jsonb(iso_at),true);
          exception when others then null;
          end;
        end if;

        status_pt := case lower(coalesce(delivery->>'status','enviado'))
          when 'sent' then 'enviado'
          when 'approved' then 'aprovado'
          when 'rejected' then 'ajustes'
          when 'reprovado' then 'ajustes'
          else coalesce(delivery->>'status','enviado')
        end;
        delivery := delivery || jsonb_build_object('status',status_pt);

        -- Is there already an official row for this task/copy?
        select d.value into official_match
        from jsonb_array_elements(new_deliveries) d(value)
        where d.value->>'sourceTaskId'=source_id
          and (d.value->>'id'=item_id or d.value->>'id'=coalesce(delivery->>'deliveryId',''))
        limit 1;

        if official_match is null and coalesce(delivery->>'archivedAt',delivery->>'arquivado_em') is null then
          recipient := nullif(delivery->>'to','');
          target_id := nullif(delivery->>'targetTaskId','');

          -- Recover recipient/target from the first dependent task with a real assignee.
          if recipient is null then
            select dep.value->>'id',
                   dep.value#>>'{assignees,0}'
            into target_id,recipient
            from jsonb_array_elements(tasks) dep(value)
            where coalesce(dep.value->'dependencies','[]'::jsonb) ? source_id
              and nullif(dep.value#>>'{assignees,0}','') is not null
            order by dep.value->>'id'
            limit 1;
          end if;

          if recipient is not null then
            official_id := 'del-migrated-'||substr(md5(source_id||':'||coalesce(delivery->>'id','')),1,16);
            if not exists(select 1 from jsonb_array_elements(new_deliveries) d(value) where d.value->>'id'=official_id) then
              iso_at := coalesce(nullif(delivery->>'at',''),candidate_date);
              if iso_at is null or iso_at='Agora' then
                millis := substring(coalesce(delivery->>'id','') from 'delivery-([0-9]{13})');
                if millis is not null then iso_at := to_char(to_timestamp(millis::numeric/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); end if;
              end if;
              if iso_at is null or iso_at='Agora' then
                iso_at := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
              end if;

              select count(*)+1 into version_no
              from jsonb_array_elements(new_deliveries) d(value)
              where d.value->>'sourceTaskId'=source_id
                and lower(coalesce(d.value->>'to',''))=lower(recipient);

              new_deliveries := new_deliveries || jsonb_build_array(jsonb_build_object(
                'id',official_id,
                'legacyId',delivery->>'id',
                'sourceTaskId',source_id,
                'targetTaskId',coalesce(target_id,''),
                'campaignId',source_campaign,
                'campaignSource','task',
                'title','Entrega · '||source_title,
                'taskTitle',source_title,
                'project',source_project,
                'brand',source_brand,
                'from',coalesce(delivery->>'author','Interface'),
                'to',recipient,
                'note',coalesce(delivery->>'note',delivery->>'text',''),
                'status',status_pt,
                'createdAt',iso_at,
                'updatedAt',iso_at,
                'version',version_no,
                'completeTask',false,
                'files',coalesce(delivery->'files','[]'::jsonb),
                'links',coalesce(delivery->'links','[]'::jsonb),
                'events',jsonb_build_array(jsonb_build_object(
                  'at',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                  'by','Gestão Alliance',
                  'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
                  'origin','mcp',
                  'text','Entrega criada pela interface foi migrada para a coleção oficial.'
                )),
                'origin','interface',
                'archivedAt',null,
                'archivedBy',null
              ));
              delivery := delivery || jsonb_build_object(
                'deliveryId',official_id,
                'to',recipient,
                'targetTaskId',coalesce(target_id,''),
                'source','interface',
                'migrationStatus','migrada'
              );
              migrated_count := migrated_count+1;
            end if;
          else
            delivery := delivery || jsonb_build_object(
              'migrationStatus','pendente',
              'migrationWarning','Destinatário não pôde ser recuperado com segurança; a cópia não conta para a trava de entrega obrigatória.'
            );
          end if;
        elsif official_match is not null then
          delivery := delivery || jsonb_build_object(
            'deliveryId',official_match->>'id',
            'status',coalesce(official_match->>'status',status_pt)
          );
        end if;

        new_embedded := new_embedded || jsonb_build_array(delivery);
        official_match := null;
      end loop;
    end if;
    task := jsonb_set(task,'{deliveries}',new_embedded,true);

    -- History: ISO only. Recover precise timestamps when available; otherwise preserve original and mark unknown.
    new_history := '[]'::jsonb;
    seen := '{}'::jsonb;
    if jsonb_typeof(task->'history')='array' then
      for hist_idx in 0..greatest(jsonb_array_length(task->'history')-1,-1) loop
        hist := task->'history'->hist_idx;
        raw_at := nullif(hist->>'at','');
        iso_at := null;

        if raw_at='Agora' then
          if coalesce(hist->>'text','') ilike '%enviou a entrega%' and jsonb_array_length(new_embedded)=1 then
            iso_at := nullif(new_embedded->0->>'at','');
          elsif coalesce(hist->>'text','') ilike 'Tarefa criada%' then
            millis := substring(source_id from '-([0-9]{13})(?:-|$)');
            if millis is not null then iso_at := to_char(to_timestamp(millis::numeric/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'); end if;
          end if;
          if iso_at is not null then
            hist := hist || jsonb_build_object('at',iso_at,'atOriginal','Agora');
          else
            hist := hist || jsonb_build_object('at',null,'atOriginal','Agora','dataDesconhecida',true);
          end if;
        elsif raw_at is not null and raw_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]' then
          begin
            iso_at := to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
            hist := jsonb_set(hist,'{at}',to_jsonb(iso_at),true);
          exception when others then
            hist := hist || jsonb_build_object('at',null,'atOriginal',raw_at,'dataDesconhecida',true);
          end;
        end if;

        -- Preserve every duplicate, but only the first remains canonical.
        item_id := md5(coalesce(hist->>'text',''));
        if seen ? item_id then
          duplicate_ref := seen->>item_id;
          hist := hist || jsonb_build_object('duplicado',true,'duplicadoDe',duplicate_ref);
        else
          seen := jsonb_set(seen,array[item_id],to_jsonb(hist_idx::text),true);
        end if;

        new_history := new_history || jsonb_build_array(hist);
      end loop;
    end if;

    if migrated_count>0 then
      migration_event := jsonb_build_object(
        'at',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'by','Gestão Alliance',
        'authorId','a02201ec-96d3-433f-b779-b81a4ee10066',
        'origin','mcp',
        'text',migrated_count||' entrega(s) criada(s) pela interface foram migradas para a coleção oficial.'
      );
      new_history := jsonb_build_array(migration_event)||new_history;
    end if;
    task := jsonb_set(task,'{history}',new_history,true);
    new_tasks := new_tasks || jsonb_build_array(task);
  end loop;

  update public.operacional_estado
  set valor=new_tasks,atualizado_em=clock_timestamp()
  where chave='central.tasks.vitor-gutierrez' and dono is null;

  update public.operacional_estado
  set valor=new_deliveries,atualizado_em=clock_timestamp()
  where chave='central.deliveries.workspace.v1' and dono is null;

  -- Persist audit rows for embedded-only deliveries still lacking sufficient migration data.
  insert into public.task_action_audit(actor_id,origin,action,entity_type,entity_id,details)
  select
    'a02201ec-96d3-433f-b779-b81a4ee10066'::uuid,
    'mcp',
    'migracao_entrega_interface_pendente',
    'entrega',
    coalesce(d.value->>'id','sem-id'),
    jsonb_build_object('tarefa_id',t.value->>'id','motivo',d.value->>'migrationWarning')
  from jsonb_array_elements(new_tasks) t(value)
  cross join lateral jsonb_array_elements(coalesce(t.value->'deliveries','[]'::jsonb)) d(value)
  where d.value->>'migrationStatus'='pendente'
    and not exists (
      select 1 from public.task_action_audit a
      where a.action='migracao_entrega_interface_pendente'
        and a.entity_type='entrega'
        and a.entity_id=coalesce(d.value->>'id','sem-id')
    );
end $$;
