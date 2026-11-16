# MW Gestão Comercial

Sistema financeiro e caixa diário para Supermercado Vitória e Açaí Vitória, desenvolvido pela MW TECH SISTEMAS LTDA.

Tecnologias: React, Vite, TypeScript, Tailwind CSS, Supabase.

## Desenvolvimento

```bash
npm install
cp .env.example .env
npm run dev
```

A aplicação apresenta o painel inicial e o portal de atendimento. Para persistir dados financeiros e manifestações, configure o projeto Supabase e execute as migrações em `supabase/migrations`.

**Importante:** Não cadastrar movimentos financeiros reais antes de habilitar autenticação, políticas RLS e fluxos transacionais de fechamento.

## Supabase exclusivo (16/11/2026)
- Projeto: `gestaocomercialmw` (`gncggcsoiakyzfvktdws`), organização MW TECH CONTROL.
- URL: `https://gncggcsoiakyzfvktdws.supabase.co`.
- Migração inicial aplicada e verificada: estabelecimentos, permissões, caixas, sessões, movimentações, fechamentos, manifestações e auditoria (RLS habilitada).
- Na Vercel do projeto **mwgestaocomercial**, em Settings > Environment Variables, configurar `VITE_SUPABASE_URL` com a URL acima e `VITE_SUPABASE_ANON_KEY` com **somente a chave publishable** do projeto (a chave `sb_publishable_...` funciona no cliente Supabase JS). Nunca utilizar secret/service_role no frontend.
- Salvar para Production e Preview; fazer **Redeploy** após alterar as variáveis: Vite as incorpora no momento da compilação.
- O conector Vercel disponível nesta sessão não lista o projeto `mwgestaocomercial`; não mudar variáveis do projeto `mw-tech-financeiro`.
- Cadastrar usuário em Authentication > Users e atribuir permissões em `usuarios_estabelecimentos` antes de usar o painel. Os registros financeiros ainda são somente leitura até implementar operações seguras.
- O portal de manifestações ficará bloqueado até implementar proteção contra abuso, privacidade e API de envio.
