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
    'select app.enqueue_knowledge_embeddings(5) from generate_series(1,10);'
  );
end
$cron$;

update alliance_data.data_catalog
set metadata=coalesce(metadata,'{}'::jsonb)
  || jsonb_build_object('worker_batch_size',5,'worker_fanout_per_minute',10,'worker_strategy','small_parallel_batches'),
    updated_at=now()
where id='knowledge.embeddings';
