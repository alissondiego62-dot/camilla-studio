# Relatório técnico — Etapa 08: Financeiro pessoal e profissional/CNPJ

## Identificação

- Sistema: **Camilla Studio**
- Versão anterior: **3.0.8**
- Versão desta entrega: **3.0.9**
- Base utilizada: `camilla-studio-etapa-07-clientes.zip`
- SHA-256 da base: `18c7b54b47b56e753bb587d4e2025ad4a5c238480a133338df5d2e94c13d48a5`
- Banco auditado: projeto Supabase Camila, por consultas somente de leitura
- SQL aplicado remotamente durante a execução: **não**

## Resultado

O módulo `/finance` foi reformulado como um workspace financeiro completo com separação efetiva entre **Pessoal** e **Profissional/CNPJ**. A origem do ambiente permanece registrada em cada lançamento, conta, cartão, categoria, modelo, recorrência, transferência e autorização.

Os dois lançamentos profissionais existentes foram preservados:

- receita pendente de **R$ 5.000,00**;
- despesa pendente de **R$ 3.000,00**.

Nenhum lançamento fictício foi incluído e nenhum UUID existente foi alterado.

## Ambientes e privacidade

Foram implementados:

- ambiente Pessoal;
- ambiente Profissional/CNPJ;
- visão consolidada opcional;
- herança automática do ambiente selecionado no formulário;
- confirmação e permissão para mudança de ambiente;
- identificação permanente da origem na visão consolidada.

O Financeiro Pessoal exige, no banco:

1. permissão no módulo `finance_personal`;
2. propriedade por `owner_user_id` ou delegação ativa;
3. autorização específica para a ação.

Um perfil administrativo genérico não recebe acesso pessoal automaticamente. O ambiente profissional utiliza permissões independentes em `finance_professional`.

## Navegação e abas

A rota principal permanece `/finance` e mantém o contexto por parâmetros de URL. Foram implementadas as áreas:

1. Visão geral;
2. Receitas;
3. Despesas;
4. Contas a receber;
5. Contas a pagar;
6. Fluxo de caixa;
7. Categorias;
8. Contas;
9. Cartões;
10. Modelos;
11. Cadastros auxiliares;
12. Relatórios.

Receitas e despesas possuem consultas e telas separadas. A interface inclui filtros por período e, conforme o ambiente, cliente, projeto, conta, cartão, centro de custo, fornecedor, categoria e finalidade.

## Visão geral e fluxo de caixa

A visão geral apresenta, conforme autorização de valores:

- saldo atual;
- receitas previstas e realizadas;
- despesas previstas e realizadas;
- resultado líquido;
- contas a receber e a pagar;
- vencidos;
- projeção de caixa;
- comparação com o período anterior.

Foram criados gráficos próprios em SVG/CSS para receitas, despesas, resultado, categorias, situação e projeção. O fluxo de caixa pode ser consultado por período e mantém separação por ambiente.

## Lançamentos

`financial_entries` permanece como livro central. Foram incorporados:

- receita e despesa;
- previsto e realizado;
- cadastro, edição e duplicação;
- cancelamento, arquivamento e reativação;
- cliente, projeto, fornecedor, conta, cartão e centro de custo;
- categoria e subcategoria;
- forma de pagamento;
- documento e observações;
- comprovantes e arquivos vinculados pela estrutura existente;
- autoria, última edição, baixa, aprovação e cancelamento.

Status suportados:

- Previsto;
- Pendente;
- Pago;
- Recebido;
- Parcialmente pago;
- Parcialmente recebido;
- Vencido;
- Cancelado;
- Em análise;
- Aguardando aprovação.

## Precisão monetária

Valores monetários são armazenados como `numeric(18,2)` no PostgreSQL. A interface envia strings decimais e os cálculos oficiais permanecem no banco. As rotinas de parcelamento convertem o total para centavos inteiros e distribuem o resto entre as primeiras parcelas, preservando exatamente o valor total.

## Baixas e ajustes

A RPC `settle_financial_entry` registra baixa total ou parcial com:

- valor pago ou recebido;
- conta;
- forma de pagamento;
- desconto;
- juros;
- multa;
- documento;
- observação;
- autor e horário.

Descontos, juros, multas, correções e baixas especiais ficam em `financial_entry_adjustments`, sem sobrescrever silenciosamente o valor original. Estornos recalculam o saldo e a situação do lançamento.

## Parcelamentos, recorrências e modelos

Foram implementadas estruturas para:

- grupos de parcelamento;
- criação transacional das parcelas;
- modelos separados por ambiente;
- regras recorrentes;
- ocorrências idempotentes por regra e competência.

Alterações em modelos e recorrências não modificam lançamentos históricos. Registros liquidados são protegidos contra alterações retroativas incompatíveis.

## Contas, cartões e cadastros auxiliares

Foram implementados cadastros de:

- contas bancárias;
- caixa físico;
- carteiras;
- contas digitais e investimentos;
- cartões com identificação mascarada;
- faturas de cartão;
- categorias e subcategorias;
- formas de pagamento;
- centros de custo;
- fornecedores;
- modelos e recorrências.

O saldo oficial é derivado do livro financeiro. Alterações de saldo devem ser registradas por lançamento, pagamento, ajuste ou transferência.

## Transferências e movimentos societários

Transferências são criadas por RPC transacional e geram os dois lados da operação. Estão preparados os tipos:

- transferência pessoal;
- transferência empresarial;
- aporte para CNPJ;
- retirada;
- pró-labore;
- distribuição de lucros.

Cancelar uma transferência cancela o par associado. Não é permitido alterar apenas um lado da operação.

## Aprovações

Foi criada a estrutura `financial_approvals` para operações que exigem revisão, incluindo:

- lançamento aguardando aprovação;
- mudança de ambiente;
- ajustes excepcionais;
- cancelamentos e alterações sensíveis.

A decisão registra solicitante, revisor, horário e justificativa.

## Relatórios e exportações

A RPC `get_financial_report` fornece relatórios por ambiente e repete a validação de valores antes da consulta. Foram preparados relatórios para:

- receitas e despesas pessoais;
- receitas e despesas profissionais;
- fluxo de caixa;
- consolidado autorizado;
- contas a receber e a pagar;
- inadimplência;
- resultado;
- receita por cliente e projeto;
- despesa por fornecedor e categoria;
- previsto versus realizado;
- aportes, retiradas, pró-labore, distribuição e transferências.

A interface exporta CSV compatível com Excel e utiliza visualização de impressão para geração de PDF. Os filtros e o ambiente permanecem aplicados.

## Integrações preservadas

Foram atualizadas as consultas de:

- Dashboard;
- Relatórios gerais;
- Financeiro do projeto;
- Financeiro do cliente;
- arquivos vinculados;
- histórico;
- notificações.

Dashboard, Relatórios e Projetos passaram a usar RPCs protegidas, evitando acesso direto indevido a valores pessoais.

## Banco de dados

SQL necessário: **sim**.

Arquivo principal:

- `camilla-studio-etapa-08.sql`.

Migration equivalente:

- `supabase/migrations/20260717030000_camilla_stage08_finance.sql`.

Rollback:

- `supabase/rollback/camilla-stage08-finance-rollback.sql`.

### Novas tabelas

- `financial_environment_access`;
- `financial_accounts`;
- `financial_cards`;
- `financial_card_statements`;
- `financial_categories`;
- `financial_payment_methods`;
- `financial_cost_centers`;
- `financial_suppliers`;
- `financial_templates`;
- `financial_recurring_rules`;
- `financial_recurring_occurrences`;
- `financial_installment_groups`;
- `financial_entry_adjustments`;
- `financial_transfers`;
- `financial_approvals`.

### Estruturas ampliadas

- `financial_entries`;
- `financial_entry_payments`;
- catálogo e perfis de permissões;
- histórico e notificações financeiras.

### Views principais

- `financial_entry_balance_view`;
- `financial_account_balance_view`;
- `financial_cash_flow_view`;
- `financial_receivables_view`;
- `financial_payables_view`;
- `financial_report_base_view`;
- `client_financial_entries_view`.

As views usam `security_invoker=true` e as superfícies com valores não concedem leitura direta geral a `authenticated`.

### RPCs principais

- `get_finance_workspace`;
- `get_financial_entry`;
- `save_financial_entry`;
- `duplicate_financial_entry`;
- `archive_financial_entry`;
- `reactivate_financial_entry`;
- `cancel_financial_entry`;
- `change_financial_environment`;
- `settle_financial_entry`;
- `reverse_financial_payment`;
- `create_installment_entries`;
- `create_recurring_entries`;
- `create_financial_transfer`;
- `cancel_financial_transfer`;
- `review_financial_approval`;
- `get_financial_report`;
- `get_dashboard_summary`;
- `get_report_summary`;
- `get_project_financial_entries`.

## Políticas RLS

Foram aplicados os seguintes princípios:

- RLS em todas as novas tabelas expostas;
- pessoal limitado por proprietária ou delegação explícita;
- profissional com permissões independentes;
- `UPDATE` com `USING` e `WITH CHECK`;
- exclusões físicas bloqueadas nas estruturas auditáveis;
- operações compostas por RPC transacional;
- funções privilegiadas com `search_path` fixo;
- execução revogada para `PUBLIC` e `anon`;
- valores pessoais não retornados por simples autenticação;
- Realtime e notificações preservam o ambiente do destinatário.

## Ordem para aplicar o SQL

1. Fazer backup do banco e do Storage.
2. Executar `supabase/validation/etapa-08-preflight.sql`.
3. Executar **somente** `camilla-studio-etapa-08.sql`.
4. Executar `supabase/validation/etapa-08-postflight.sql`.
5. Executar `supabase/validation/etapa-08-data-integrity.sql`.
6. Executar em homologação:
   - `supabase/validation/etapa-08-separation-tests.sql`;
   - `supabase/validation/etapa-08-payment-tests.sql`;
   - `supabase/validation/etapa-08-recurrence-tests.sql`;
   - `supabase/validation/etapa-08-report-tests.sql`;
   - `supabase/validation/etapa-08-rls-tests.sql`.
7. Publicar o projeto atualizado.

O SQL consolidado e a migration possuem conteúdo idêntico. Não execute os dois em sequência.

## Plano de reversão

1. Restaurar o ZIP da Etapa 07.
2. Executar `supabase/rollback/camilla-stage08-finance-rollback.sql` quando necessário.
3. Manter contas, cartões, categorias, fornecedores, modelos, recorrências, parcelas, pagamentos, ajustes, transferências, aprovações e histórico.
4. Não excluir automaticamente registros financeiros criados após a migration.

O rollback é deliberadamente conservador: desativa superfícies exclusivas da Etapa 08 e preserva dados.

## Execução local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

As variáveis públicas devem ser configuradas a partir de `.env.example`. Nenhum segredo foi incluído.

## Validações realizadas

| Validação | Resultado |
|---|---|
| TypeScript | Zero erros |
| ESLint | Zero erros |
| Build Vite/Vinext/Nitro | Aprovado |
| Testes automatizados | **102 aprovados, 0 falhas** |
| Rotas renderizadas | **30 aprovadas**, incluindo `/finance` |
| Parser PostgreSQL | **10 arquivos SQL aprovados** |
| SQL consolidado e migration | Idênticos |
| Dados fictícios no Financeiro | Nenhum |
| Colisões de rotas | Nenhuma |
| Dependências atualizadas indiscriminadamente | Não |

O build apresenta três avisos internos `INEFFECTIVE_DYNAMIC_IMPORT` do Vinext. Eles não impedem a compilação.

## Erros e soluções aplicadas

- componentes inicialmente incompatíveis com a tipagem do modal de confirmação foram corrigidos;
- literais BigInt incompatíveis com o alvo ES2017 foram substituídos por construções compatíveis;
- tipos legados do serviço financeiro foram alinhados ao novo domínio;
- cálculo de saldo durante renderização foi tornado imutável para atender ao lint React;
- dependência ausente no hook do workspace foi corrigida;
- variável de ambiente persistida foi tipada corretamente;
- checks legados do banco foram auditados para não bloquear os novos estados;
- Dashboard, Projetos e Relatórios deixaram de consultar valores diretamente;
- recorrências receberam chave idempotente;
- transferências receberam operação atômica de dupla partida;
- nenhuma alteração remota ou perda de dados ocorreu.

## Componentes e padrões da Publicolor

Nenhum trecho foi copiado literalmente. Foram comparados e adaptados apenas padrões técnicos do legado:

- `app/pcp-v2.css`: comportamento responsivo, métricas compactas, overflow e filtros móveis;
- `app/legacy-page.tsx`: organização de ações, cartões, tabelas e estados vazios;
- padrões já internalizados na Camilla: drawers, feedback de erro, atualização localizada e rollback visual.

Não foram transferidos identidade visual, cores, logotipo, clientes, pedidos, OPs, setores, regras industriais ou dados financeiros.

## Arquivos criados — 67

- `ETAPA-08-RELATORIO-CAMILLA-STUDIO.md`
- `app/(studio)/finance/error.tsx`
- `app/(studio)/finance/loading.tsx`
- `app/features/finance/FinanceEntryDrawer.tsx`
- `app/features/finance/FinanceEntryForm.tsx`
- `app/features/finance/FinanceEnvironmentSwitcher.tsx`
- `app/features/finance/FinanceFilters.tsx`
- `app/features/finance/FinanceInstallmentDrawer.tsx`
- `app/features/finance/FinanceNavigation.tsx`
- `app/features/finance/FinancePaymentDrawer.tsx`
- `app/features/finance/FinanceToolbar.tsx`
- `app/features/finance/FinanceTransferDrawer.tsx`
- `app/features/finance/FinanceWorkspace.tsx`
- `app/features/finance/charts/FinanceBarChart.tsx`
- `app/features/finance/charts/FinanceCategoryChart.tsx`
- `app/features/finance/charts/FinanceLineChart.tsx`
- `app/features/finance/charts/FinanceStatusChart.tsx`
- `app/features/finance/finance.export.ts`
- `app/features/finance/finance.filters.ts`
- `app/features/finance/finance.money.ts`
- `app/features/finance/finance.mutations.ts`
- `app/features/finance/finance.reducer.ts`
- `app/features/finance/finance.reports.ts`
- `app/features/finance/finance.repository.ts`
- `app/features/finance/useFinanceWorkspace.ts`
- `app/features/finance/views/FinanceAccounts.tsx`
- `app/features/finance/views/FinanceAuxiliaryRecords.tsx`
- `app/features/finance/views/FinanceCards.tsx`
- `app/features/finance/views/FinanceCashFlow.tsx`
- `app/features/finance/views/FinanceCatalogManager.tsx`
- `app/features/finance/views/FinanceCategories.tsx`
- `app/features/finance/views/FinanceEntriesTable.tsx`
- `app/features/finance/views/FinanceExpenses.tsx`
- `app/features/finance/views/FinanceOverview.tsx`
- `app/features/finance/views/FinancePayables.tsx`
- `app/features/finance/views/FinanceReceivables.tsx`
- `app/features/finance/views/FinanceRecurringRules.tsx`
- `app/features/finance/views/FinanceReports.tsx`
- `app/features/finance/views/FinanceRevenue.tsx`
- `app/features/finance/views/FinanceTemplates.tsx`
- `app/features/finance/views/FinanceTemplatesWorkspace.tsx`
- `app/styles/finance.css`
- `camilla-studio-etapa-08.sql`
- `docs/ETAPA-08-APLICACAO-SQL.md`
- `docs/ETAPA-08-ARQUIVOS.json`
- `docs/ETAPA-08-ARQUIVOS.md`
- `docs/ETAPA-08-BAIXAS-E-PARCELAMENTOS.md`
- `docs/ETAPA-08-ESTRUTURA-FINANCEIRA.md`
- `docs/ETAPA-08-FLUXO-DE-CAIXA.md`
- `docs/ETAPA-08-POLITICAS-RLS.md`
- `docs/ETAPA-08-RECORRENCIAS.md`
- `docs/ETAPA-08-RELATORIO.md`
- `docs/ETAPA-08-RELATORIOS.md`
- `docs/ETAPA-08-REVERSAO.md`
- `docs/ETAPA-08-SEPARACAO-AMBIENTES.md`
- `docs/ETAPA-08-TESTES.md`
- `supabase/migrations/20260717030000_camilla_stage08_finance.sql`
- `supabase/rollback/camilla-stage08-finance-rollback.sql`
- `supabase/validation/etapa-08-data-integrity.sql`
- `supabase/validation/etapa-08-payment-tests.sql`
- `supabase/validation/etapa-08-postflight.sql`
- `supabase/validation/etapa-08-preflight.sql`
- `supabase/validation/etapa-08-recurrence-tests.sql`
- `supabase/validation/etapa-08-report-tests.sql`
- `supabase/validation/etapa-08-rls-tests.sql`
- `supabase/validation/etapa-08-separation-tests.sql`
- `tests/stage08-structure.test.mjs`

## Arquivos modificados — 12

- `README.md`
- `app/config/permission-catalog.ts`
- `app/features/dashboard/dashboard.service.ts`
- `app/features/finance/FinancePage.tsx`
- `app/features/finance/finance.service.ts`
- `app/features/finance/types.ts`
- `app/features/project-detail/project-detail.service.ts`
- `app/features/reports/reports.service.ts`
- `app/features/settings/FinanceSettingsPage.tsx`
- `app/layout.tsx`
- `app/types/permissions.ts`
- `package.json`

## Arquivos removidos — 0

- Nenhum.

## Contagem final

- Arquivos-fonte da base: **528**;
- Arquivos-fonte finais: **595**;
- Criados: **67**;
- Modificados: **12**;
- Removidos: **0**.

## Pendências reais

- o SQL da Etapa 08 não foi aplicado remotamente;
- os testes RLS com usuários reais devem ser executados em homologação após a migration;
- a exportação PDF utiliza a visualização de impressão do navegador, preservando permissões e filtros;
- nenhuma pendência de build, tipagem, lint ou teste automatizado permanece.
