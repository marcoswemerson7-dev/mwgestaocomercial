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
