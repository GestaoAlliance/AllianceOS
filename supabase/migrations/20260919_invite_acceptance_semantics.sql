create or replace function app.ao_criar_usuario()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  primeiro boolean;
  c public.equipe_convites%rowtype;
begin
  select not exists(select 1 from public.profiles) into primeiro;
  select * into c from public.equipe_convites where email=lower(trim(new.email));
  insert into public.profiles(id,nome,email,foto_url,papel,ativo,area_id,cargo)
  values(
    new.id,
    coalesce(nullif(trim(c.nome),''),nullif(trim(new.raw_user_meta_data->>'nome'),''),nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(new.email,'@',1)),
    lower(new.email),
    new.raw_user_meta_data->>'avatar_url',
    case when primeiro then 'admin'::public.papel_usuario when c.email is not null then c.papel else 'membro'::public.papel_usuario end,
    primeiro or c.email is not null,
    c.area_id,
    nullif(trim(c.cargo),'')
  ) on conflict(id) do update set
    nome=excluded.nome,email=excluded.email,papel=excluded.papel,ativo=excluded.ativo,area_id=excluded.area_id,cargo=excluded.cargo;

  if primeiro then
    insert into public.profile_brands(profile_id,brand_id)
    select new.id,b.id from public.brands b where b.ativo on conflict do nothing;
  elsif c.email is not null then
    insert into public.profile_brands(profile_id,brand_id)
    select new.id,b.id from public.brands b
    where b.ativo and (cardinality(c.marcas)=0 or b.id=any(c.marcas))
    on conflict do nothing;
  end if;
  return new;
end
$function$;

create or replace function public.aceitar_meu_convite()
returns timestamptz
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_email text;
  v_aceito timestamptz;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
  select lower(email) into v_email from public.profiles where id=auth.uid() and ativo;
  if v_email is null then raise exception 'Perfil ativo não encontrado.'; end if;
  update public.equipe_convites
     set aceito_em=coalesce(aceito_em,now()), atualizado_em=now()
   where lower(email)=v_email
   returning aceito_em into v_aceito;
  return v_aceito;
end
$function$;

revoke all on function public.aceitar_meu_convite() from public;
revoke execute on function public.aceitar_meu_convite() from anon;
grant execute on function public.aceitar_meu_convite() to authenticated;
