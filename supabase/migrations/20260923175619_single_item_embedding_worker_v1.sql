update alliance_data.knowledge_chunks
set embedding_claimed_at=null
where embedding is null;

do $cron$
declare r record;
begin
  for r in select jobid from cron.job where jobname='alliance-knowledge-embeddings'
  loop
    perform cron.unschedule(r.jobid);
  end loop;

  perform cron.schedule(
    'alliance-knowledge-embeddings',
    '* * * * *',
    'select app.enqueue_knowledge_embeddings(1) from generate_series(1,20);'
  );
end
$cron$;

update alliance_data.data_catalog
set metadata=coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object('worker_batch_size',1,'worker_fanout_per_minute',20,'worker_strategy','single_item_parallel_workers'),
    updated_at=now()
where id='knowledge.embeddings';
