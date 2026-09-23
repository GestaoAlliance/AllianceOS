with b as (
  select id from public.brands where lower(nome)=lower('Botanika') limit 1
), rows(source_row,name,description,notes,login_url,sort_order) as (
  values
    (9,'Postgres account','Credenciais do Postgres usadas nas automações','Campos Host, User e Password existem na planilha e estão vazios.',null::text,109),
    (14,'n8n · ChatAI · Lael','Credencial de integração da organização ChatAI · Lael','Campos Org ID e API Key existem na planilha e estão vazios.',null::text,114),
    (18,'n8n · ADMKT','Credencial de integração da organização ADMKT','Campos Org ID e API Key existem na planilha e estão vazios.',null::text,118),
    (22,'Supabase · Automação','Credencial técnica do Supabase usada nas automações','Importado da aba Credenciais N8N.','https://jigbeyfzijwuhzqeimbt.supabase.co'::text,122),
    (26,'Meta API · Aplicativo','Token do aplicativo usado nas automações','Importado da aba Credenciais N8N.',null::text,126)
)
insert into public.access_center_entries(
  brand_id,category,name,description,kind,status,owner,login_url,notes,sort_order,source_sheet,source_row
)
select b.id,'Credenciais técnicas',r.name,r.description,'technical','active',null,r.login_url,r.notes,r.sort_order,'Credenciais N8N',r.source_row
from b cross join rows r
where not exists (
  select 1 from public.access_center_entries e
  where e.brand_id=b.id and e.source_sheet='Credenciais N8N' and e.source_row=r.source_row
);

update public.access_center_secrets s
set entry_id=e.id,updated_at=now()
from public.access_center_entries e
where s.label='Service Role Secret'
  and e.brand_id='91a66f9e-6dc8-40c8-b7ca-33b8b39676f4'::uuid
  and e.source_sheet='Credenciais N8N' and e.source_row=22
  and s.entry_id in (
    select id from public.access_center_entries
    where brand_id=e.brand_id and source_sheet='Central de Acessos' and source_row=25
  );

update public.access_center_secrets s
set entry_id=e.id,updated_at=now()
from public.access_center_entries e
where s.label='Token do aplicativo'
  and e.brand_id='91a66f9e-6dc8-40c8-b7ca-33b8b39676f4'::uuid
  and e.source_sheet='Credenciais N8N' and e.source_row=26
  and s.entry_id in (
    select id from public.access_center_entries
    where brand_id=e.brand_id and source_sheet='Central de Acessos' and source_row=22
  );
