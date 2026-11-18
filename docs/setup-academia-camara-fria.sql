-- Preserve historical payment methods while accepting the new combined option.
alter table public.financeiro_lancamentos drop constraint financeiro_lancamentos_forma_pagamento_check;
alter table public.financeiro_lancamentos add constraint financeiro_lancamentos_forma_pagamento_check
 check (forma_pagamento in ('Dinheiro','Pix','Cartão','Débito','Crédito','Transferência','Boleto','Outro'));
insert into public.estabelecimentos(slug,nome)
 values ('academia-camara-fria','Academia - Câmara Fria') on conflict(slug) do nothing;
-- The requesting owner gets access; other users retain their existing grants.
insert into public.usuarios_estabelecimentos(usuario_id,estabelecimento_id,perfil,ativo)
 select u.id,e.id,'administrador',true
 from auth.users u cross join public.estabelecimentos e
 where lower(u.email)='marcoswemerson7@gmail.com' and e.slug='academia-camara-fria'
 on conflict(usuario_id,estabelecimento_id) do nothing;
