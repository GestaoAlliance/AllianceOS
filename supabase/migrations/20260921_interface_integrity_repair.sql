-- AllianceOS interface integrity repair — 2026-09-21
-- No records are deleted. Legacy data is preserved and annotated.

-- Make the known management account explicit in the member directory.
update public.profiles
set tipo_membro='servico',
    atualizado_em=now()
where id='a02201ec-96d3-433f-b779-b81a4ee10066'::uuid
  and coalesce(tipo_membro,'')<>'servico';

do $$
declare
  tasks jsonb;
  official jsonb;
  ti integer;
  di integer;
  hi integer;
  ci integer;
  t jsonb;
  d jsonb;
  h jsonb;
  c jsonb;
  new_deliveries jsonb;
  new_history jsonb;
  new_comments jsonb;
  old_id text;
  new_id text;
  to_name text;
  created_ts text;
  raw_at text;
  epoch_ms numeric;
  migrated integer;
  prev_text text;
  prev_idx integer;
  actor_name text;
  actor_id text;
begin
  select coalesce(valor,'[]'::jsonb)
    into tasks
  from public.operacional_estado
  where chave='central.tasks.vitor-gutierrez' and dono is null;

  select coalesce(valor,'[]'::jsonb)
    into official
  from public.operacional_estado
  where chave='central.deliveries.workspace.v1' and dono is null;

  tasks:=coalesce(tasks,'[]'::jsonb);
  official:=coalesce(official,'[]'::jsonb);

  if jsonb_array_length(tasks)>0 then
    for ti in 0..jsonb_array_length(tasks)-1 loop
      t:=tasks->ti;
      migrated:=0;
      new_deliveries:='[]'::jsonb;

      if jsonb_array_length(coalesce(t->'deliveries','[]'::jsonb))>0 then
        for di in 0..jsonb_array_length(coalesce(t->'deliveries','[]'::jsonb))-1 loop
          d:=coalesce(t->'deliveries','[]'::jsonb)->di;
          old_id:=coalesce(d->>'id',d->>'deliveryId','');
          to_name:=trim(coalesce(d->>'to',''));

          if old_id<>'' and not exists (
            select 1 from jsonb_array_elements(official) x where x->>'id'=old_id
          ) then
            if to_name<>'' then
              new_id:=case
                when old_id like 'del-%' then old_id
                else 'del-migrated-'||substr(md5(old_id),1,16)
              end;

              if not exists (
                select 1 from jsonb_array_elements(official) x where x->>'id'=new_id
              ) then
                raw_at:=coalesce(nullif(d->>'at',''),nullif(d->>'sentAt',''),nullif(d->>'createdAt',''));
                created_ts:=null;
                if raw_at is not null and raw_at<>'Agora' then
                  begin
                    created_ts:=to_char((replace(raw_at,' ','T'))::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
                  exception when others then
                    created_ts:=null;
                  end;
                end if;
                if created_ts is null then
                  begin
                    epoch_ms:=substring(old_id from '([0-9]{13})')::numeric;
                    created_ts:=to_char(to_timestamp(epoch_ms/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
                  exception when others then
                    created_ts:=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
                  end;
                end if;

                actor_name:=coalesce(nullif(d->>'author',''),'Interface');
                select p.id::text into actor_id
                from public.profiles p
                where p.ativo=true and lower(trim(p.nome))=lower(trim(actor_name))
                order by p.criado_em
                limit 1;

                official:=official||jsonb_build_array(jsonb_build_object(
                  'id',new_id,
                  'legacyId',old_id,
                  'sourceTaskId',t->>'id',
                  'targetTaskId',coalesce(d->>'targetTaskId',''),
                  'campaignId',nullif(t->>'campaignId',''),
                  'campaignSource','task',
                  'title','Entrega · '||coalesce(t->>'title','Tarefa'),
                  'taskTitle',coalesce(t->>'title','Tarefa'),
                  'project',t->>'project',
                  'brand',t->>'brand',
                  'from',actor_name,
                  'fromId',actor_id,
                  'to',to_name,
                  'note',coalesce(d->>'note',d->>'text',d->>'name',''),
                  'status',case lower(coalesce(d->>'status','enviado'))
                    when 'sent' then 'enviado'
                    when 'approved' then 'aprovado'
                    when 'rejected' then 'ajustes'
                    else coalesce(d->>'status','enviado')
                  end,
                  'createdAt',created_ts,
                  'updatedAt',created_ts,
                  'sentAt',created_ts,
                  'createdAtOriginal',case when raw_at is not null and raw_at<>created_ts then raw_at else null end,
                  'version',1,
                  'completeTask',false,
                  'files',coalesce(d->'files','[]'::jsonb),
                  'links',coalesce(d->'links','[]'::jsonb),
                  'events',jsonb_build_array(jsonb_build_object(
                    'at',created_ts,
                    'by','Migração AllianceOS',
                    'authorId',null,
                    'origin','mcp',
                    'text','Entrega criada pela interface foi migrada para a coleção oficial.'
                  )),
                  'origin','interface',
                  'archivedAt',d->'archivedAt',
                  'archivedBy',d->'archivedBy'
                ));
              end if;

              d:=d||jsonb_build_object(
                'legacyId',old_id,
                'id',new_id,
                'deliveryId',new_id,
                'migrationStatus','migrada',
                'migrationWarning',null
              );
              migrated:=migrated+1;
            else
              d:=d||jsonb_build_object(
                'migrationStatus','pendente',
                'migrationWarning','Destinatário não pôde ser recuperado com segurança; a cópia não conta para a trava de entrega obrigatória.'
              );
            end if;
          end if;

          new_deliveries:=new_deliveries||jsonb_build_array(d);
        end loop;
      end if;
      t:=jsonb_set(t,'{deliveries}',new_deliveries,true);

      -- Comments: "Agora" is presentation-only. Recover timestamp from id when possible.
      new_comments:='[]'::jsonb;
      if jsonb_array_length(coalesce(t->'comments','[]'::jsonb))>0 then
        for ci in 0..jsonb_array_length(coalesce(t->'comments','[]'::jsonb))-1 loop
          c:=coalesce(t->'comments','[]'::jsonb)->ci;
          raw_at:=c->>'at';
          if raw_at='Agora' then
            begin
              epoch_ms:=substring(coalesce(c->>'id','') from '([0-9]{13})')::numeric;
              c:=c||jsonb_build_object(
                'at',to_char(to_timestamp(epoch_ms/1000.0) at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                'atOriginal','Agora'
              );
            exception when others then
              c:=c||jsonb_build_object('at',null,'atOriginal','Agora','dataDesconhecida',true);
            end;
          elsif raw_at ~ '^\d{4}-\d{2}-\d{2}\s' then
            begin
              c:=c||jsonb_build_object('at',to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'atOriginal',raw_at);
            exception when others then null;
            end;
          end if;
          new_comments:=new_comments||jsonb_build_array(c);
        end loop;
      end if;
      t:=jsonb_set(t,'{comments}',new_comments,true);

      -- History: normalize time and mark consecutive duplicates; never remove them.
      new_history:='[]'::jsonb;
      prev_text:=null;
      prev_idx:=null;
      if jsonb_array_length(coalesce(t->'history','[]'::jsonb))>0 then
        for hi in 0..jsonb_array_length(coalesce(t->'history','[]'::jsonb))-1 loop
          h:=coalesce(t->'history','[]'::jsonb)->hi;
          raw_at:=h->>'at';
          if raw_at='Agora' then
            h:=h||jsonb_build_object('at',null,'atOriginal','Agora','dataDesconhecida',true);
          elsif raw_at ~ '^\d{4}-\d{2}-\d{2}\s' then
            begin
              h:=h||jsonb_build_object('at',to_char(raw_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'atOriginal',raw_at);
            exception when others then null;
            end;
          end if;

          if prev_text is not null
             and h->>'text'=prev_text
             and coalesce((h->>'duplicado')::boolean,false)=false then
            h:=h||jsonb_build_object(
              'duplicado',true,
              'duplicadoDe',prev_idx::text,
              'duplicadoMotivo','evento consecutivo idêntico'
            );
          else
            if coalesce((h->>'duplicado')::boolean,false)=false then
              prev_text:=h->>'text';
              prev_idx:=hi;
            end if;
          end if;
          new_history:=new_history||jsonb_build_array(h);
        end loop;
      end if;

      if migrated>0 then
        new_history:=jsonb_build_array(jsonb_build_object(
          'at',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'by','Migração AllianceOS',
          'authorId',null,
          'origin','mcp',
          'text',migrated||' entrega(s) criada(s) pela interface foram sincronizadas com a coleção oficial.'
        ))||new_history;
      end if;

      t:=jsonb_set(t,'{history}',new_history,true);
      tasks:=jsonb_set(tasks,array[ti::text],t,true);
    end loop;
  end if;

  update public.operacional_estado
  set valor=tasks,atualizado_em=now()
  where chave='central.tasks.vitor-gutierrez' and dono is null;

  update public.operacional_estado
  set valor=official,atualizado_em=now()
  where chave='central.deliveries.workspace.v1' and dono is null;
end $$;
