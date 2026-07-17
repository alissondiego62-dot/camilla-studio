# Relatório técnico — Etapa 07: Cadastro completo e página individual de clientes

## Identificação

- Sistema: **Camilla Studio**
- Versão anterior: **3.0.7**
- Versão desta entrega: **3.0.8**
- Base utilizada: `camilla-studio-etapa-06-calendario-agenda.zip`
- Banco auditado: projeto Supabase Camila, somente por consultas de leitura
- SQL aplicado remotamente durante a execução: **não**

## Resultado

A aba Clientes foi reformulada como um módulo de relacionamento integrado. A lista continua disponível em `/clients` e cada registro possui ficha própria em `/clients/[id]`, com navegação por oito áreas:

1. Visão geral;
2. Projetos;
3. Atividades;
4. Agenda;
5. Financeiro;
6. Arquivos;
7. Observações;
8. Histórico.

Os **17 clientes reais**, seus UUIDs e os **17 projetos relacionados** foram preservados. Nenhum campo ausente foi preenchido com informação fictícia.

## Cadastro e diretório

Foram implementados:

- pessoa física e jurídica;
- nome, razão social e nome fantasia;
- CPF, CNPJ, inscrição estadual e municipal;
- telefone principal, telefones adicionais e WhatsApp;
- e-mail principal e e-mails adicionais;
- site e endereço completo;
- contato principal e cargo;
- responsável interno;
- origem, segmento e status de relacionamento;
- pesquisa por nome, documentos, telefone, WhatsApp e e-mail;
- filtros por tipo, relacionamento, origem, segmento, responsável e arquivamento;
- arquivamento e reativação;
- exclusão definitiva somente quando não há vínculos.

Clientes homônimos são permitidos. CPF e CNPJ ativos são únicos após normalização.

## Relações com os demais módulos

A ficha utiliza as fontes reais já existentes:

- `projects.client_id` para projetos;
- `project_activities.client_id` ou cliente do projeto para atividades;
- `calendar_events.client_id`, projeto ou atividade para Agenda;
- `project_files.client_id` para arquivos e versões;
- `history_entries` para auditoria;
- `financial_entries.client_id` ou cliente do projeto para Financeiro profissional.

A view `agenda_items` foi ampliada sem alterar a ordem das colunas existentes, acrescentando `client_id` e `client_name` ao final. Isso mantém compatibilidade com a Etapa 06 e evita falha de `CREATE OR REPLACE VIEW`.

## Observações

Foi criada a tabela `client_notes`, com:

- autor;
- data e horário do registro;
- tipo configurável;
- importância;
- fixação;
- edição controlada;
- arquivamento lógico;
- histórico automático.

Observações financeiras exigem autorização financeira no banco, inclusive em alterações diretas via Data API.

## Financeiro autorizado

A ficha mostra somente o ambiente profissional e exige simultaneamente:

- `clients.view_financial`;
- `finance_professional.view`;
- `finance_professional.view_values`.

As views internas de cálculo não concedem `SELECT` direto a `authenticated`. Os valores são retornados pela RPC `get_client_financial_workspace(uuid)`, que repete as verificações de autorização no banco. O Financeiro Pessoal não participa da ficha.

Indicadores implementados:

- receitas previstas;
- receitas recebidas;
- contas a receber;
- valor em aberto;
- valor vencido;
- pagamentos parciais;
- total faturado;
- ticket médio;
- último pagamento.

A tabela `financial_entry_payments` prepara o registro de pagamentos parciais e poderá ser ampliada no módulo Financeiro.

## Arquivos

Foi reutilizado o gerenciador seguro da Etapa 04 para:

- upload privado;
- links externos e Google Drive;
- categorias de cliente;
- abertura e download autorizado;
- substituição com versionamento;
- arquivamento;
- relação simultânea com cliente, projeto, atividade ou lançamento.

A policy de inclusão de arquivo ligado diretamente ao cliente exige `can_edit_client(client_id)` no banco.

## Histórico e auditoria

O histórico central passou a reconhecer clientes, contatos e observações. Foram corrigidos dois riscos:

- funções de gatilho usam `to_jsonb(NEW/OLD)` e não acessam campos polimórficos inexistentes;
- o `source_id` recebe UUID por disparo, evitando colisão quando vários gatilhos alteram o mesmo cliente na mesma transação.

Históricos financeiros e observações financeiras exigem autorização para visualizar valores.

## Banco de dados

SQL necessário: **sim**.

Arquivos principais:

- `camilla-studio-etapa-07.sql`;
- `supabase/migrations/20260717010000_camilla_stage07_clients_crm.sql`;
- `supabase/rollback/camilla-stage07-clients-crm-rollback.sql`.

Novas tabelas:

- `client_phones`;
- `client_emails`;
- `client_notes`;
- `financial_entry_payments`.

Novas views:

- `client_directory_view`;
- `client_financial_entries_view`;
- `client_financial_summary_view`.

Principais RPCs:

- `save_client`;
- `archive_client`;
- `reactivate_client`;
- `delete_client_safely`;
- `save_client_note`;
- `archive_client_note`;
- `pin_client_note`;
- `search_clients`;
- `get_client_financial_workspace`;
- `get_client_indicators`.

## Ordem para aplicar o SQL

1. Fazer backup do banco e do Storage.
2. Executar `supabase/validation/etapa-07-preflight.sql`.
3. Executar **somente** `camilla-studio-etapa-07.sql`.
4. Executar `supabase/validation/etapa-07-postflight.sql`.
5. Executar `supabase/validation/etapa-07-data-integrity.sql`.
6. Executar `supabase/validation/etapa-07-search-tests.sql`.
7. Executar em homologação:
   - `etapa-07-financial-permission-tests.sql`;
   - `etapa-07-rls-tests.sql`;
   - `etapa-07-delete-protection-tests.sql`.
8. Publicar o projeto atualizado.

O SQL consolidado e a migration são idênticos. Não execute os dois em sequência.

## Plano de reversão

1. Restaurar o ZIP da Etapa 06.
2. Executar `supabase/rollback/camilla-stage07-clients-crm-rollback.sql` quando necessário.
3. Manter as novas tabelas e colunas, preservando contatos, observações, pagamentos e vínculos reais.
4. Não excluir automaticamente arquivos, histórico ou dados criados após a migration.

O rollback desativa as superfícies exclusivas e remove as views/RPCs, mas é deliberadamente conservador com dados.

## Execução local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Variáveis públicas devem ser configuradas a partir de `.env.example`. Nenhum segredo foi incluído.

## Validações realizadas

| Validação | Resultado |
|---|---|
| TypeScript | Zero erros |
| ESLint | Zero erros |
| Build Vite/Vinext/Nitro | Aprovado |
| Testes automatizados | **86 aprovados, 0 falhas** |
| Rotas renderizadas | **30 rotas aprovadas**, incluindo `/clients/[id]` |
| Parser PostgreSQL | **10 arquivos SQL aprovados** |
| SQL consolidado e migration | Idênticos |
| Colisões de rotas | Nenhuma |
| Dados fictícios no módulo | Nenhum |
| Dependências atualizadas indiscriminadamente | Não |

O build apresenta apenas avisos internos `INEFFECTIVE_DYNAMIC_IMPORT` do Vinext, sem impedir a compilação.

## Erros e riscos encontrados durante a implementação

- referências iniciais de miniaturas foram corrigidas para `bucket_id` e `object_path`;
- ajustes de renderização React detectados pelo lint foram corrigidos;
- a ordem da view `agenda_items` foi preservada para compatibilidade PostgreSQL;
- acesso direto às views financeiras foi revogado;
- policies de observações financeiras, pagamentos e arquivos de cliente foram reforçadas;
- colisões do índice único do histórico em uma mesma transação foram eliminadas;
- nenhuma perda de dados ou alteração remota ocorreu.

## Componentes e padrões da Publicolor

Nenhum trecho foi copiado literalmente. Foram comparados e adaptados apenas padrões técnicos presentes no legado:

- `app/pcp-v2.css`: comportamento móvel, overflow e cartões compactos;
- `app/legacy-page.tsx`: organização de ações e estados vazios;
- padrões já internalizados nos componentes Camilla: atualização localizada, feedback de erro e drawers responsivos.

Não foram transferidos identidade visual, cores, logotipo, clientes, pedidos, OPs, setores ou regras industriais.

## Arquivos criados — 54

- `ETAPA-07-RELATORIO-CAMILLA-STUDIO.md`
- `app/(studio)/clients/[id]/error.tsx`
- `app/(studio)/clients/[id]/loading.tsx`
- `app/(studio)/clients/[id]/page.tsx`
- `app/features/clients/ClientAddressFields.tsx`
- `app/features/clients/ClientAgendaPanel.tsx`
- `app/features/clients/ClientCard.tsx`
- `app/features/clients/ClientContactFields.tsx`
- `app/features/clients/ClientDetailPage.tsx`
- `app/features/clients/ClientEmailList.tsx`
- `app/features/clients/ClientFilesPanel.tsx`
- `app/features/clients/ClientFinancialPanel.tsx`
- `app/features/clients/ClientFormDrawer.tsx`
- `app/features/clients/ClientHeader.tsx`
- `app/features/clients/ClientHistoryPanel.tsx`
- `app/features/clients/ClientIndicators.tsx`
- `app/features/clients/ClientNavigation.tsx`
- `app/features/clients/ClientNoteCard.tsx`
- `app/features/clients/ClientNoteForm.tsx`
- `app/features/clients/ClientNotesPanel.tsx`
- `app/features/clients/ClientOverviewPanel.tsx`
- `app/features/clients/ClientPhoneList.tsx`
- `app/features/clients/ClientProjectsPanel.tsx`
- `app/features/clients/ClientsFilters.tsx`
- `app/features/clients/ClientsToolbar.tsx`
- `app/features/clients/client-detail.service.ts`
- `app/features/clients/client-financial.service.ts`
- `app/features/clients/client-search.ts`
- `app/features/clients/clients.mutations.ts`
- `app/features/clients/clients.repository.ts`
- `app/features/clients/useClientDetail.ts`
- `app/features/clients/useClientsDirectory.ts`
- `camilla-studio-etapa-07.sql`
- `docs/ETAPA-07-APLICACAO-SQL.md`
- `docs/ETAPA-07-ARQUIVOS.json`
- `docs/ETAPA-07-ARQUIVOS.md`
- `docs/ETAPA-07-ESTRUTURA-CLIENTES.md`
- `docs/ETAPA-07-PERMISSOES-FINANCEIRAS.md`
- `docs/ETAPA-07-PESQUISA.md`
- `docs/ETAPA-07-POLITICAS-RLS.md`
- `docs/ETAPA-07-RELACOES.md`
- `docs/ETAPA-07-RELATORIO.md`
- `docs/ETAPA-07-REVERSAO.md`
- `docs/ETAPA-07-TESTES.md`
- `supabase/migrations/20260717010000_camilla_stage07_clients_crm.sql`
- `supabase/rollback/camilla-stage07-clients-crm-rollback.sql`
- `supabase/validation/etapa-07-data-integrity.sql`
- `supabase/validation/etapa-07-delete-protection-tests.sql`
- `supabase/validation/etapa-07-financial-permission-tests.sql`
- `supabase/validation/etapa-07-postflight.sql`
- `supabase/validation/etapa-07-preflight.sql`
- `supabase/validation/etapa-07-rls-tests.sql`
- `supabase/validation/etapa-07-search-tests.sql`
- `tests/stage07-structure.test.mjs`

## Arquivos modificados — 27

- `README.md`
- `app/(studio)/projects/page.tsx`
- `app/config/permission-catalog.ts`
- `app/features/activities/ActivitiesWorkspace.tsx`
- `app/features/activities/ActivityDrawer.tsx`
- `app/features/activities/ActivityForm.tsx`
- `app/features/agenda/AgendaActivityForm.tsx`
- `app/features/agenda/AgendaEventForm.tsx`
- `app/features/agenda/AgendaFilters.tsx`
- `app/features/agenda/AgendaItemDrawer.tsx`
- `app/features/agenda/AgendaPage.tsx`
- `app/features/agenda/AgendaWorkspace.tsx`
- `app/features/agenda/agenda.repository.ts`
- `app/features/agenda/types.ts`
- `app/features/agenda/useAgendaWorkspace.ts`
- `app/features/clients/ClientActivitiesPanel.tsx`
- `app/features/clients/ClientsPage.tsx`
- `app/features/clients/clients.service.ts`
- `app/features/clients/types.ts`
- `app/features/projects/ProjectsPage.tsx`
- `app/features/settings/SystemInformationPage.tsx`
- `app/features/settings/VersionHistoryPage.tsx`
- `app/styles/components.css`
- `app/styles/responsive.css`
- `app/types/permissions.ts`
- `package.json`
- `tests/rendered-html.test.mjs`

## Arquivos removidos

- Nenhum.

## Pendências reais

- O SQL da Etapa 07 não foi aplicado remotamente durante a geração do pacote.
- Os roteiros RLS e financeiros com usuários de perfis diferentes devem ser executados em homologação após a migration.
- Não há impedimento técnico conhecido para publicação após essas validações.
