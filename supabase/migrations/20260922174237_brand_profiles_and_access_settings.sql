alter table public.brands
  add column if not exists foto_url text,
  add column if not exists cor text,
  add column if not exists descricao text,
  add column if not exists site_url text,
  add column if not exists configuracoes jsonb not null default '{}'::jsonb,
  add column if not exists atualizado_em timestamptz not null default now(),
  add column if not exists atualizado_por uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.brands'::regclass
      and conname='brands_cor_hex_check'
  ) then
    alter table public.brands
      add constraint brands_cor_hex_check
      check (cor is null or cor ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

create or replace function app.pode_acessar_marca(p_brand_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select
    exists(
      select 1 from public.profiles p
      where p.id=(select auth.uid()) and p.ativo and p.papel='admin'::public.papel_usuario
    )
    or exists(
      select 1
      from public.profile_brands pb
      join public.profiles p on p.id=pb.profile_id
      where pb.profile_id=(select auth.uid())
        and pb.brand_id=p_brand_id
        and p.ativo
        and p.papel<>'externo'::public.papel_usuario
    );
$$;

revoke all on function app.pode_acessar_marca(uuid) from public;
revoke all on function app.pode_acessar_marca(uuid) from anon;
grant execute on function app.pode_acessar_marca(uuid) to authenticated;

drop policy if exists brands_leitura on public.brands;
create policy brands_leitura on public.brands for select to authenticated
using (app.pode_acessar_marca(id));

drop policy if exists profile_brands_leitura on public.profile_brands;
create policy profile_brands_leitura on public.profile_brands for select to authenticated
using (
  app.sou_admin()
  or (profile_id=(select auth.uid()) and app.estou_ativo())
);
