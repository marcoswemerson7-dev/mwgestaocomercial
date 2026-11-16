-- Vitória Gestão: núcleo inicial seguro e portal público.
-- Execute em um projeto Supabase NOVO. A migração não insere receitas fictícias.
create extension if not exists pgcrypto;

create table public.estabelecimentos (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
 nome text not null,
 ativo boolean not null default true,
 criado_em timestamptz not null default now()
);
insert into public.estabelecimentos(slug,nome) values
 ('supermercado','Supermercado Vitória'),('acai','Açaí Vitória');

create table public.usuarios_estabelecimentos (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 estabelecimento_id uuid not null references public.estabelecimentos(id) on delete cascade,
 perfil text not null check (perfil in ('administrador','gerente','caixa','financeiro','consulta')),
 ativo boolean not null default true,
 primary key(usuario_id,estabelecimento_id)
);
create index on public.usuarios_estabelecimentos(estabelecimento_id,usuario_id);

create or replace function public.pode_acessar_estabelecimento(p_estabelecimento uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.usuarios_estabelecimentos
 where usuario_id=(select auth.uid()) and estabelecimento_id=p_estabelecimento and ativo=true)
$$;
create or replace function public.pode_administrar_estabelecimento(p_estabelecimento uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.usuarios_estabelecimentos
 where usuario_id=(select auth.uid()) and estabelecimento_id=p_estabelecimento and ativo=true and perfil in ('administrador','gerente'))
$$;

create table public.caixas (
 id uuid primary key default gen_random_uuid(),
 estabelecimento_id uuid not null references public.estabelecimentos(id),
 nome text not null,
 ativo boolean not null default true,
 unique(estabelecimento_id,nome),
 unique(id,estabelecimento_id)
);
create table public.sessoes_caixa (
 id uuid primary key default gen_random_uuid(),
 estabelecimento_id uuid not null,
 caixa_id uuid not null,
 operador_id uuid not null references auth.users(id),
 data_operacional date not null default current_date,
 saldo_inicial numeric(14,2) not null default 0 check(saldo_inicial>=0),
 status text not null default 'aberto' check(status in ('aberto','em_conferencia','fechado')),
 aberto_em timestamptz not null default now(),
 fechado_em timestamptz,
 foreign key(caixa_id,estabelecimento_id) references public.caixas(id,estabelecimento_id),
 unique(id,estabelecimento_id)
);
create unique index apenas_uma_sessao_aberta on public.sessoes_caixa(caixa_id) where status <> 'fechado';
create index on public.sessoes_caixa(estabelecimento_id,data_operacional desc);

create table public.movimentacoes_caixa (
 id uuid primary key default gen_random_uuid(),
 estabelecimento_id uuid not null references public.estabelecimentos(id),
 sessao_id uuid not null,
 tipo text not null check(tipo in ('entrada','saida')),
 categoria text not null,
 descricao text not null,
 valor numeric(14,2) not null check(valor>0),
 forma_pagamento text not null check(forma_pagamento in ('Dinheiro','Pix','Débito','Crédito','Transferência','Outro')),
 ocorrido_em timestamptz not null default now(),
 criado_por uuid not null references auth.users(id),
 cancelado_em timestamptz,
 foreign key(sessao_id,estabelecimento_id) references public.sessoes_caixa(id,estabelecimento_id)
);
create index on public.movimentacoes_caixa(estabelecimento_id,ocorrido_em desc);
create index on public.movimentacoes_caixa(sessao_id);

create table public.fechamentos_caixa (
 id uuid primary key default gen_random_uuid(),
 sessao_id uuid not null unique references public.sessoes_caixa(id),
 dinheiro_esperado numeric(14,2) not null,
 dinheiro_contado numeric(14,2) not null check(dinheiro_contado>=0),
 diferenca numeric(14,2) not null,
 justificativa text,
 fechado_por uuid not null references auth.users(id),
 fechado_em timestamptz not null default now()
);

create table public.manifestacoes (
 id uuid primary key default gen_random_uuid(),
 estabelecimento_id uuid not null references public.estabelecimentos(id),
 protocolo text not null unique,
 categoria text not null check(categoria in ('sugestao','reclamacao','duvida','elogio')),
 mensagem text not null check(char_length(mensagem) between 10 and 2000),
 nome text,
 contato text,
 status text not null default 'recebida' check(status in ('recebida','em_analise','respondida','concluida')),
 criada_em timestamptz not null default now()
);
create index on public.manifestacoes(estabelecimento_id,criada_em desc);
create table public.manifestacoes_respostas (
 id uuid primary key default gen_random_uuid(),
 manifestacao_id uuid not null references public.manifestacoes(id) on delete cascade,
 autor_id uuid not null references auth.users(id),
 mensagem text not null,
 criada_em timestamptz not null default now()
);

create table public.auditoria_eventos (
 id uuid primary key default gen_random_uuid(),
 usuario_id uuid references auth.users(id),
 estabelecimento_id uuid references public.estabelecimentos(id),
 entidade text not null,
 entidade_id uuid,
 acao text not null,
 detalhes jsonb,
 criado_em timestamptz not null default now()
);
create index on public.auditoria_eventos(estabelecimento_id,criado_em desc);

-- Acesso mínimo, incluindo proteção contra acesso direto com anon.
alter table public.estabelecimentos enable row level security;
alter table public.usuarios_estabelecimentos enable row level security;
alter table public.caixas enable row level security;
alter table public.sessoes_caixa enable row level security;
alter table public.movimentacoes_caixa enable row level security;
alter table public.fechamentos_caixa enable row level security;
alter table public.manifestacoes enable row level security;
alter table public.manifestacoes_respostas enable row level security;
alter table public.auditoria_eventos enable row level security;

create policy unidades_autorizadas on public.estabelecimentos for select to authenticated using (public.pode_acessar_estabelecimento(id));
create policy usuario_proprias_unidades on public.usuarios_estabelecimentos for select to authenticated using(usuario_id=(select auth.uid()));
create policy caixas_por_unidade on public.caixas for select to authenticated using(public.pode_acessar_estabelecimento(estabelecimento_id));
create policy sessoes_por_unidade on public.sessoes_caixa for select to authenticated using(public.pode_acessar_estabelecimento(estabelecimento_id));
create policy movimentos_por_unidade on public.movimentacoes_caixa for select to authenticated using(public.pode_acessar_estabelecimento(estabelecimento_id));
create policy fechamentos_por_unidade on public.fechamentos_caixa for select to authenticated using(exists(select 1 from public.sessoes_caixa s where s.id=sessao_id and public.pode_acessar_estabelecimento(s.estabelecimento_id)));
create policy manifestacoes_por_gerente on public.manifestacoes for select to authenticated using(public.pode_administrar_estabelecimento(estabelecimento_id));
create policy respostas_por_gerente on public.manifestacoes_respostas for select to authenticated using(exists(select 1 from public.manifestacoes m where m.id=manifestacao_id and public.pode_administrar_estabelecimento(m.estabelecimento_id)));
create policy auditoria_por_gerente on public.auditoria_eventos for select to authenticated using(public.pode_administrar_estabelecimento(estabelecimento_id));

-- Somente leitura autenticada conforme políticas. Nenhum write financeiro direto.
revoke all on public.estabelecimentos,public.usuarios_estabelecimentos,public.caixas,public.sessoes_caixa,public.movimentacoes_caixa,public.fechamentos_caixa,public.manifestacoes,public.manifestacoes_respostas,public.auditoria_eventos from anon,authenticated;
grant select on public.estabelecimentos,public.usuarios_estabelecimentos,public.caixas,public.sessoes_caixa,public.movimentacoes_caixa,public.fechamentos_caixa,public.manifestacoes,public.manifestacoes_respostas,public.auditoria_eventos to authenticated;


-- O envio público de manifestações só será habilitado após controle de abuso no servidor.
-- Funções de consulta de autorização usadas exclusivamente nas políticas RLS.
revoke all on function public.pode_acessar_estabelecimento(uuid) from public,anon;
revoke all on function public.pode_administrar_estabelecimento(uuid) from public,anon;
grant execute on function public.pode_acessar_estabelecimento(uuid) to authenticated;
grant execute on function public.pode_administrar_estabelecimento(uuid) to authenticated;
