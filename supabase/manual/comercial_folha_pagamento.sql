begin;
create table public.comercial_folhas (
 id uuid primary key default gen_random_uuid(),
 estabelecimento_id uuid not null references public.estabelecimentos(id),
 competencia date not null check(extract(day from competencia)=1),
 pagamento date not null,
 total numeric(12,2) not null check(total>0),
 detalhes jsonb not null,
 lancamento_id uuid not null unique references public.financeiro_lancamentos(id),
 criado_por uuid not null default auth.uid() references auth.users(id),
 criado_em timestamptz not null default now(),
 unique(estabelecimento_id,competencia)
);
alter table public.comercial_folhas enable row level security;
revoke all on public.comercial_folhas from anon,authenticated;
grant select,insert on public.comercial_folhas to authenticated;
create policy comercial_folhas_admin on public.comercial_folhas for all to authenticated
using (exists(select 1 from public.usuarios_estabelecimentos p where p.usuario_id=(select auth.uid()) and p.estabelecimento_id=comercial_folhas.estabelecimento_id and p.ativo and p.perfil='administrador'))
with check (criado_por=(select auth.uid()) and exists(select 1 from public.usuarios_estabelecimentos p where p.usuario_id=(select auth.uid()) and p.estabelecimento_id=comercial_folhas.estabelecimento_id and p.ativo and p.perfil='administrador'));
create function public.comercial_pagar_folha(p_unidade uuid,p_mes date,p_data date,p_forma text,p_ajustes jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare v_total numeric; v_detalhes jsonb; v_lancamento uuid;
begin
 if not exists(select 1 from public.usuarios_estabelecimentos p where p.usuario_id=auth.uid() and p.estabelecimento_id=p_unidade and p.ativo and p.perfil='administrador') then raise exception 'Sem permissão'; end if;
 if p_mes is null or extract(day from p_mes)<>1 or p_mes>current_date or p_data is null or p_data>current_date then raise exception 'Competência ou data inválida'; end if;
 if exists(select 1 from public.financeiro_fechamentos where estabelecimento_id=p_unidade and data_fechamento=p_data) then raise exception 'Dia financeiro fechado'; end if;
 if exists(select 1 from public.comercial_folhas where estabelecimento_id=p_unidade and competencia=p_mes) then raise exception 'Folha já registrada'; end if;
 if jsonb_typeof(p_ajustes) is distinct from 'object' then raise exception 'Ajustes inválidos'; end if;
 with base as (
 select f.id,f.nome,f.salario,(select count(*) from public.comercial_frequencia a where a.funcionario_id=f.id and a.tipo='injustificada' and a.data>=p_mes and a.data<p_mes+interval '1 month') faltas,
 coalesce((p_ajustes->f.id::text->>'bonus')::numeric,0) bonus,coalesce((p_ajustes->f.id::text->>'discount')::numeric,0) desconto
 from public.comercial_funcionarios f where f.estabelecimento_id=p_unidade and f.ativo and f.admissao<p_mes+interval '1 month'
 ), calc as (select *,round(salario*faltas/30,2) desconto_faltas,round(greatest(0,salario-round(salario*faltas/30,2)+bonus-desconto),2) liquido from base)
 select sum(liquido),jsonb_agg(to_jsonb(calc) order by nome) into v_total,v_detalhes from calc;
 if v_total is null or v_total<=0 or exists(select 1 from jsonb_array_elements(v_detalhes) j where (j->>'bonus')::numeric<0 or (j->>'desconto')::numeric<0) then raise exception 'Valores inválidos'; end if;
 insert into public.financeiro_lancamentos(estabelecimento_id,data_lancamento,tipo,categoria,descricao,valor,forma_pagamento) values(p_unidade,p_data,'saida','Folha de pagamento','Folha de pagamento - '||to_char(p_mes,'MM/YYYY'),v_total,p_forma) returning id into v_lancamento;
 insert into public.comercial_folhas(estabelecimento_id,competencia,pagamento,total,detalhes,lancamento_id) values(p_unidade,p_mes,p_data,v_total,v_detalhes,v_lancamento);
 return v_lancamento;
end $$;
revoke all on function public.comercial_pagar_folha(uuid,date,date,text,jsonb) from public,anon;
grant execute on function public.comercial_pagar_folha(uuid,date,date,text,jsonb) to authenticated;
commit;