# MW Gestão Comercial

Painel gerencial de controle financeiro e acompanhamento de atendimentos para Supermercado Vitória e Açaí Vitória, desenvolvido pela MW TECH SISTEMAS LTDA.

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

## Painel gerencial — atualização 16/11/2026
- Tela principal após login: Visão Geral, Atendimento (QR Code), Financeiro, Relatórios, Configurações.
- Sem operação de PDV ou caixa diário no fluxo principal. Foco em consultas e acompanhamento gerencial.
- Indicadores usam dados reais de `movimentacoes_caixa` e manifestações recebidas; valores não são simulados.
- Atendimento consulta `manifestacoes`, ligada a `estabelecimentos` por FK, com status `recebida`, `em_analise`, `respondida`, `concluida`.
- O sistema requer permissões cadastradas em `usuarios_estabelecimentos` para cada usuário; sem essas permissões, a RLS pode mostrar tabelas vazias.
- A imagem dos painéis é referência visual; logotipos estilizados dos banners são provisórios enquanto não são incorporados os arquivos originais.

## Controle financeiro gerencial — 16/11/2026
- Menu agrupado em Visão Gerencial, Gestão Financeira e Administração.
- Caixa do Dia, Entradas e Saídas, Despesas e Fechamento Diário operam por unidade, sem PDV, itens, estoque ou venda individual.
- Lançamentos persistidos em `financeiro_lancamentos`; fechamentos em `financeiro_fechamentos`, com bloqueio de lançamento após fechamento e índice único por unidade/data.
- Conta de autenticação existente vinculada como administrador do Supermercado e do Açaí (o único usuário existente no momento da configuração).
- Tela Usuários e Gerentes permite convidar pessoas por e-mail via Edge Function `convidar-gerente-comercial`; função exige JWT e perfil de administrador na unidade. Os convidados precisam aceitar o e-mail e definir senha.
- Rota pública do atendimento corrigida: slug obtido do caminho `/atendimento/:slug`, não mais de `useParams` sem contexto de rota.
- Logomarcas em `public/brands/supermercado-vitoria.png` e `public/brands/acai-vitoria.png` ainda **não existem** no repositório; incluir arquivos originais para reprodução visual fiel.
- Publicação automática na Vercel e compilação de produção ainda **não verificadas** pela conexão disponível.

## Atendimento e logomarcas — 16/11/2026
- Formulários públicos nas rotas `/atendimento/supermercado` e `/atendimento/acai` passam a exibir a marca da unidade no cabeçalho e acima do formulário.
- Corrigida a chamada inexistente a `enviar_manifestacao`: envio agora usa Edge Function `receber-atendimento-comercial` (sem JWT, com validação de dados/origem e limitação de até cinco mensagens por IP/hora no banco). Ela chama a RPC restrita `registrar_manifestacao_publica` e retorna protocolo.
- O painel gerencial permite buscar mensagens por protocolo/nome/conteúdo, filtrar situações, visualizar histórico de respostas e registrar providências com a RPC `gerenciar_manifestacao`, que valida permissão de administrador/gerente por estabelecimento.
- As imagens atualmente referenciadas no código são os arquivos transparentes `public/brands/supermercado-vitoria.svg` e `public/brands/acai-vitoria.svg`, que existem no repositório e não dependem dos antigos caminhos PNG inexistentes. Versões PNG externas podem ser adicionadas depois preservando os mesmos nomes-base.
- Validação SQL: o recebimento gerou protocolo dentro de transação desfeita, sem criar mensagem de teste permanente. Função Edge está ativa; envio real via navegador e build/deploy Vercel ainda não verificados.
