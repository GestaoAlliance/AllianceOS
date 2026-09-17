-- AllianceOS · Auth hardening + admin bootstrap
-- Idempotent: safe to apply more than once.

-- 1) The designated administrator is explicitly invited with global brand access.
insert into public.equipe_convites (email, nome, papel, marcas, observacao)
values (
  'comercialvittorgutieerez@gmail.com',
  'Vitor Gutierrez',
  'admin'::public.papel_usuario,
  '{}'::uuid[],
  'Administrador global do AllianceOS'
)
on conflict (email) do update set
  nome = excluded.nome,
  papel = 'admin'::public.papel_usuario,
  marcas = '{}'::uuid[],
  observacao = excluded.observacao,
  atualizado_em = now();

-- 2) New users never become admin merely for being the first signup.
-- Only an explicit invite can activate a profile or assign permissions.
create or replace function app.ao_criar_usuario() returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  novo_id uuid := new.id;
  c public.equipe_convites%rowtype;
begin
  select * into c
    from public.equipe_convites
   where email = lower(trim(new.email));

  insert into public.profiles (id, nome, email, foto_url, papel, ativo, area_id, cargo)
  values (
    novo_id,
    coalesce(
      nullif(trim(c.nome), ''),
      nullif(trim(new.raw_user_meta_data->>'nome'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      split_part(new.email, '@', 1)
    ),
    lower(trim(new.email)),
    new.raw_user_meta_data->>'avatar_url',
    case when c.email is not null then c.papel else 'membro'::public.papel_usuario end,
    c.email is not null,
    c.area_id,
    nullif(trim(c.cargo), '')
  )
  on conflict (id) do update set
    nome = excluded.nome,
    email = excluded.email,
    foto_url = coalesce(excluded.foto_url, public.profiles.foto_url),
    papel = excluded.papel,
    ativo = excluded.ativo,
    area_id = excluded.area_id,
    cargo = excluded.cargo;

  if c.email is not null then
    insert into public.profile_brands (profile_id, brand_id)
    select novo_id, b.id
      from public.brands b
     where b.ativo
       and (cardinality(c.marcas) = 0 or b.id = any(c.marcas))
    on conflict do nothing;
  end if;

  return new;
end $$;

-- 3) If the auth account already exists, promote/repair it immediately.
do $$
declare
  uid uuid;
begin
  select id into uid
    from auth.users
   where lower(email) = 'comercialvittorgutieerez@gmail.com'
   order by created_at asc
   limit 1;

  if uid is not null then
    insert into public.profiles (id, nome, email, papel, ativo)
    values (
      uid,
      'Vitor Gutierrez',
      'comercialvittorgutieerez@gmail.com',
      'admin'::public.papel_usuario,
      true
    )
    on conflict (id) do update set
      nome = excluded.nome,
      email = excluded.email,
      papel = 'admin'::public.papel_usuario,
      ativo = true;

    insert into public.profile_brands (profile_id, brand_id)
    select uid, b.id from public.brands b where b.ativo
    on conflict do nothing;
  end if;
end $$;
