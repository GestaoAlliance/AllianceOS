create or replace function app.ao_aceitar_convite_no_login()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
begin
  if (
    (new.email_confirmed_at is not null and old.email_confirmed_at is null)
    or
    (new.last_sign_in_at is not null and old.last_sign_in_at is distinct from new.last_sign_in_at)
  ) then
    update public.equipe_convites
       set aceito_em=coalesce(aceito_em,now()),
           atualizado_em=now()
     where lower(email)=lower(new.email)
       and aceito_em is null;
  end if;
  return new;
end
$function$;

drop trigger if exists allianceos_convite_aceito on auth.users;
create trigger allianceos_convite_aceito
after update of email_confirmed_at,last_sign_in_at on auth.users
for each row execute function app.ao_aceitar_convite_no_login();

drop function if exists public.aceitar_meu_convite();
