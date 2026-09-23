update public.painel_marcas
set drive_pasta=case marca
  when 'Botanika' then '0AFdA5bpyMdo3Uk9PVA'
  when 'VermeFree' then '0AJHwaAQvWccYUk9PVA'
  when 'Revita' then '0AFDZM2KaC49hUk9PVA'
  else drive_pasta
end,
atualizado_em=now()
where marca in ('Botanika','VermeFree','Revita');

insert into public.operacional_estado(chave,dono,valor,atualizado_em)
select 'central.delivery-drive-routes.v1',null,'{"version":1,"learned":[]}'::jsonb,now()
where not exists (
  select 1 from public.operacional_estado
  where chave='central.delivery-drive-routes.v1' and dono is null
);

update storage.buckets
set file_size_limit=262144000
where id='alliance-deliveries';

drop policy if exists alliance_deliveries_delete on storage.objects;
create policy alliance_deliveries_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id='alliance-deliveries'
  and app.estou_ativo()
  and not app.eh_externo()
  and owner=auth.uid()
);
