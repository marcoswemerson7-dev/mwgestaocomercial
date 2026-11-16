# Vitória Gestão — roadmap técnico
## Entregue na estrutura inicial
- Layout responsivo e navegação: visão geral, caixa diário, financeiro, funcionários, atendimento, relatórios e configurações.
- Demonstração interativa de movimentações e conferência, sem persistência financeira.
- Login Supabase quando variáveis de ambiente estiverem configuradas.
- Migração inicial: duas unidades, controle de acesso, sessões, movimentos, fechamentos, manifestações, respostas e auditoria.
- Portal público separado por unidade: `/atendimento/supermercado` e `/atendimento/acai`, com envio via RPC após ativação.

## Próximo sprint — requisitos obrigatórios antes de produção
1. Criar um projeto Supabase exclusivo; aplicar migrations em ambiente de teste.
2. Definir usuário administrador inicial e vincular cada usuário à unidade (sem contas padrão inseguras).
3. Implementar RPCs transacionais para abrir caixa, lançar, estornar e fechar, todas com validação de perfil, sessão, bloqueio concorrente e auditoria.
4. Implementar despesas, contas a pagar, funcionários e anexos com Storage privado e políticas específicas.
5. Implementar central de atendimento real, atribuição, resposta e acompanhamento com protocolo + segredo de consulta.
6. Proteger RPC de manifestação pública com anti-spam, CAPTCHA/limites no gateway e política de privacidade LGPD; não publicar a página antes dessas proteções.
7. PDF, Excel, filtros por data operacional e conciliação com extratos/maquininhas.
8. Testes automatizados de permissões entre unidades, duplicidade, concorrência, valores, datas e fechamento.
9. Gerar QRs de URLs definitivas após configurar o domínio Vercel (QR fictício não serve).
10. Configurar backup, monitoramento e testes de restauração.

## Avisos
- A tela inicial usa números **fictícios** em modo demo.
- Login não concede automaticamente acesso: é necessário vincular usuários às unidades.
- Nunca adicionar `service_role` ou credenciais em `VITE_*`.
- O repositório é público: não salvar dados reais de funcionários ou clientes no código.
- Não ativar transações financeiras reais sem as RPCs seguras e políticas respectivas.
