-- Employee management: administrator-only per establishment.
begin;
create table if not exists public.comercial_funcionarios (
 id uuid primary key default gen_random_uuid(),
 estabelecimento_id uuid not null references public.estabelecimentos(id),
 nome text not null check (length(trim(nome))>0),
 cargo text not null check (length(trim(cargo))>0),
 salario numeric(12,2) not null check (salario>0),
 admissao date not null,
 ativo boolean not null default true,
 unique(id,estabelecimento_id)
);
create table if not exists public.comercial_frequencia (
 id uuid primary key default gen_random_uuid(),
 estabelecimento_id uuid not null references public.estabelecimentos(id),
 funcionario_id uuid not null,
 data date not null,
 tipo text not null check (tipo in ('injustificada','justificada','atraso')),
 observacao text not null default '',
 foreign key(funcionario_id,estabelecimento_id) references public.comercial_funcionarios(id,estabelecimento_id),
 unique(funcionario_id,data)
);
alter table public.comercial_funcionarios enable row level security;
alter table public.comercial_frequencia enable row level security;
revoke all on public.comercial_funcionarios,public.comercial_frequencia from anon,authenticated;
grant select,insert,update on public.comercial_funcionarios to authenticated;
grant select,insert on public.comercial_frequencia to authenticated;
create policy comercial_funcionarios_admin on public.comercial_funcionarios for all to authenticated
using (exists(select 1 from public.usuarios_estabelecimentos p where p.usuario_id=(select auth.uid()) and p.estabelecimento_id=comercial_funcionarios.estabelecimento_id and p.ativo and p.perfil='administrador'))
with check (exists(select 1 from public.usuarios_estabelecimentos p where p.usuario_id=(select auth.uid()) and p.estabelecimento_id=comercial_funcionarios.estabelecimento_id and p.ativo and p.perfil='administrador'));
create policy comercial_frequencia_admin on public.comercial_frequencia for all to authenticated
using (exists(select 1 from public.usuarios_estabelecimentos p where p.usuario_id=(select auth.uid()) and p.estabelecimento_id=comercial_frequencia.estabelecimento_id and p.ativo and p.perfil='administrador'))
with check (exists(select 1 from public.usuarios_estabelecimentos p where p.usuario_id=(select auth.uid()) and p.estabelecimento_id=comercial_frequencia.estabelecimento_id and p.ativo and p.perfil='administrador'));
commit;
