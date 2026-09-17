-- AllianceOS · perfil do próprio usuário
-- Atualização segura apenas de campos pessoais; papel/ativo/permissões não passam pelo cliente.

create or replace function public.atualizar_meu_perfil(
  p_nome text,
  p_cargo text default null,
  p_area_id uuid default null,
  p_foto_url text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  out_row public.profiles%rowtype;
begin
  if uid is null then
    raise exception 'não autenticado';
  end if;

  if nullif(trim(coalesce(p_nome, '')), '') is null then
    raise exception 'nome obrigatório';
  end if;

  if p_area_id is not null and not exists (
    select 1 from public.areas a where a.id = p_area_id
  ) then
    raise exception 'área inválida';
  end if;

  update public.profiles
     set nome = trim(p_nome),
         cargo = nullif(trim(coalesce(p_cargo, '')), ''),
         area_id = p_area_id,
         foto_url = nullif(trim(coalesce(p_foto_url, '')), '')
   where id = uid
   returning * into out_row;

  if out_row.id is null then
    raise exception 'perfil não encontrado';
  end if;

  return out_row;
end $$;

revoke all on function public.atualizar_meu_perfil(text,text,uuid,text) from public, anon;
grant execute on function public.atualizar_meu_perfil(text,text,uuid,text) to authenticated;

-- Bucket público apenas para fotos de perfil. Escrita continua restrita ao próprio usuário.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

alter table storage.objects enable row level security;

drop policy if exists alliance_profile_avatars_insert on storage.objects;
create policy alliance_profile_avatars_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists alliance_profile_avatars_update on storage.objects;
create policy alliance_profile_avatars_update on storage.objects
for update to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists alliance_profile_avatars_delete on storage.objects;
create policy alliance_profile_avatars_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists alliance_profile_avatars_select on storage.objects;
create policy alliance_profile_avatars_select on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);