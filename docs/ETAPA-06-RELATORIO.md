# Relatório técnico — Etapa 06

## Identificação

- Sistema: Camilla Studio
- Versão: 3.0.7
- Base: `camilla-studio-etapa-05-atividades.zip`
- Base SHA-256: `a6310cdb2a545804a59694375c3e4845cd484f8cc9ad9fee7d6c6923745f0126`
- Entrega: Calendário, Agenda e integração bidirecional com Atividades

## Estado auditado antes da execução

A auditoria de leitura no Supabase confirmou:

- versão 3.0.6 aplicada;
- 7 eventos manuais;
- 2 atividades, sendo 1 com data;
- 21 datas planejadas;
- nenhum evento diretamente ligado a atividade;
- histórico e notificações da Etapa 04 ativos.

Nenhum SQL da Etapa 06 foi aplicado remotamente durante a geração do pacote.

## Implementação

### Visualizações

A rota `/agenda` agora contém:

- Dia;
- Semana;
- Mês.

As visualizações possuem navegação por período, botão Hoje, dia atual destacado, faixa de dia inteiro, criação por data ou horário, abertura de detalhes, filtros e atualização localizada.

### Fontes unificadas

A view `agenda_items` reúne:

- `calendar_events`;
- `project_activities`;
- `project_dates`.

Nenhuma atividade ou prazo é copiado para `calendar_events`. Um prazo já convertido em atividade ou evento deixa de aparecer como prazo separado, evitando duplicidade.

### Sincronização

- atividade alterada atualiza a Agenda;
- arraste da atividade atualiza `starts_at`, `due_at` e `due_date`;
- prazo de projeto movido atualiza `project_dates` e o prazo principal do projeto;
- evento manual movido atualiza `calendar_events`;
- redimensionamento altera início e fim;
- conclusão e cancelamento atualizam a apresentação;
- eventos arquivados, atividades arquivadas e registros excluídos logicamente deixam a visão padrão.

### Arraste e duração

O calendário usa HTML Drag and Drop para mouse e Pointer Events para redimensionamento. A movimentação é otimista e possui rollback quando a RPC falha. No celular, o painel lateral permite alterar data e horário sem depender do arraste.

### Realtime

Uma assinatura acompanha alterações nas três tabelas de origem. Ao receber uma mudança, o cliente busca somente o item alterado na view e faz `upsert` ou remoção por `item_key`.

### Histórico e notificações

As alterações continuam passando pelos triggers existentes. A movimentação pela Agenda também envia notificação ao responsável relacionado quando ele não é o próprio autor da ação.

Ao abrir o item, a visualização é registrada e notificações correspondentes são marcadas como lidas.

## Banco de dados

SQL necessário: `camilla-studio-etapa-06.sql`.

### Alterações principais

- colunas de dia inteiro, arquivamento e cancelamento em `calendar_events`;
- constraint de intervalo válido;
- índices por período e responsável;
- configurações de Agenda;
- permissões de mover, redimensionar, cancelar e arquivar;
- view `agenda_items` com `security_invoker=true`;
- RPCs:
  - `save_calendar_event`;
  - `create_activity_from_agenda`;
  - `update_agenda_item`;
  - `set_agenda_item_status`;
  - `archive_calendar_event`;
  - `mark_agenda_item_viewed`;
- normalização de evento concluído com status legado incorreto;
- registro da versão 3.0.7.

O SQL consolidado e a migration são byte a byte idênticos.

## Segurança

- a view respeita RLS das tabelas de origem;
- `anon` não recebe acesso à view nem às RPCs;
- as RPCs validam `auth.uid()`;
- movimentação de atividade exige `can_edit_activity`;
- movimentação de prazo exige `can_edit_project` e `projects.change_deadline`;
- evento exige permissão da Agenda e acesso ao registro;
- intervalos inválidos são recusados no banco;
- evento pessoal não é liberado por mera autenticação.

## Componentes adaptados da Publicolor

Nenhum código de identidade visual ou regra industrial foi copiado. Foram analisados e adaptados apenas padrões técnicos:

| Referência | Uso técnico adaptado |
|---|---|
| `app/components/ArchitectureAgendaCalendar.tsx` | navegação de período e agrupamento por data |
| `app/components/InstallationAgendaView.tsx` | cartões compactos e leitura responsiva |
| `app/legacy-page.tsx` | ações de editar, concluir, reabrir e remover |
| `app/pcp-v2.css` | tratamento de overflow e celular |
| Kanban atual da Camilla | atualização otimista e rollback |

Foram descartados logo, cores, pedidos, OPs, setores, clientes, equipes e regras da Publicolor.

## Arquivos criados

### Agenda

- `app/features/agenda/AgendaActivityForm.tsx`
- `app/features/agenda/AgendaCreateMenu.tsx`
- `app/features/agenda/AgendaEventForm.tsx`
- `app/features/agenda/AgendaFilters.tsx`
- `app/features/agenda/AgendaItemDrawer.tsx`
- `app/features/agenda/AgendaToolbar.tsx`
- `app/features/agenda/AgendaWorkspace.tsx`
- `app/features/agenda/agenda-date-utils.ts`
- `app/features/agenda/agenda.mutations.ts`
- `app/features/agenda/agenda.reducer.ts`
- `app/features/agenda/agenda.repository.ts`
- `app/features/agenda/useAgendaDragResize.ts`
- `app/features/agenda/useAgendaRealtime.ts`
- `app/features/agenda/useAgendaWorkspace.ts`

### Componentes e visualizações

- `app/features/agenda/components/AgendaAllDayLane.tsx`
- `app/features/agenda/components/AgendaItemCard.tsx`
- `app/features/agenda/components/AgendaMonthCell.tsx`
- `app/features/agenda/components/AgendaNowIndicator.tsx`
- `app/features/agenda/components/AgendaTimeGrid.tsx`
- `app/features/agenda/views/AgendaDayView.tsx`
- `app/features/agenda/views/AgendaMonthView.tsx`
- `app/features/agenda/views/AgendaWeekView.tsx`
- `app/styles/agenda.css`

### Banco e validações

- `camilla-studio-etapa-06.sql`
- `supabase/migrations/20260716230000_camilla_stage06_calendar_agenda.sql`
- `supabase/rollback/camilla-stage06-calendar-agenda-rollback.sql`
- `supabase/validation/etapa-06-preflight.sql`
- `supabase/validation/etapa-06-postflight.sql`
- `supabase/validation/etapa-06-data-integrity.sql`
- `supabase/validation/etapa-06-duplicate-tests.sql`
- `supabase/validation/etapa-06-sync-tests.sql`
- `supabase/validation/etapa-06-rls-tests.sql`

### Documentação e testes

- `docs/ETAPA-06-RELATORIO.md`
- `docs/ETAPA-06-MODELO-AGENDA.md`
- `docs/ETAPA-06-SINCRONIZACAO.md`
- `docs/ETAPA-06-POLITICAS-RLS.md`
- `docs/ETAPA-06-APLICACAO-SQL.md`
- `docs/ETAPA-06-REVERSAO.md`
- `docs/ETAPA-06-TESTES.md`
- `tests/stage06-structure.test.mjs`
- `ETAPA-06-RELATORIO-CAMILLA-STUDIO.md`

## Arquivos modificados

- `README.md`
- `package.json`
- `app/layout.tsx`
- `app/features/agenda/AgendaPage.tsx`
- `app/features/agenda/agenda.service.ts`
- `app/features/agenda/types.ts`
- `app/features/activities/ActivityAgendaPanel.tsx`
- `app/features/project-dates/ProjectDateCard.tsx`
- `app/features/settings/AgendaSettingsPage.tsx`

Nenhum arquivo da base foi excluído.

## Aplicação do SQL

1. Fazer backup do banco.
2. Executar `supabase/validation/etapa-06-preflight.sql`.
3. Executar somente `camilla-studio-etapa-06.sql`.
4. Executar `supabase/validation/etapa-06-postflight.sql`.
5. Executar `supabase/validation/etapa-06-data-integrity.sql`.
6. Executar `supabase/validation/etapa-06-duplicate-tests.sql`.
7. Em homologação, executar os testes de sincronização e RLS.
8. Publicar o projeto atualizado.

Não executar também a migration equivalente.

## Reversão

O rollback remove a view e as RPCs da Etapa 06, mas preserva dados, histórico, notificações, datas e estados de arquivamento. Para reverter a interface, restaurar o ZIP da Etapa 05.

## Execução local

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

## Validações finais

| Validação | Resultado |
|---|---|
| TypeScript | zero erros |
| ESLint | zero erros |
| Build Vite/Vinext/Nitro | aprovado |
| Testes automatizados | 72 aprovados, 0 falhas |
| Rotas renderizadas | 29 aprovadas |
| Arquivos SQL da Etapa 06 | 9 analisados pelo parser PostgreSQL |
| SQL e migration | idênticos |
| Dados fictícios na Agenda | nenhum |
| Colisões de rota | nenhuma |
| Credenciais adicionadas | nenhuma |

O build emitiu avisos internos `INEFFECTIVE_DYNAMIC_IMPORT` do Vinext, sem impedir a compilação.

## Erros encontrados e soluções

1. O Corepack tentou buscar o pnpm na internet, indisponível no ambiente. As validações usaram as dependências fixadas e já instaladas da base, sem atualizar pacotes.
2. O lint identificou uma atualização imediata de estado dentro de `useEffect`. O carregamento foi agendado e recebeu limpeza do temporizador.
3. A auditoria de duplicidade identificou que um prazo convertido poderia coexistir com sua atividade ou evento. A view passou a ocultar a fonte de prazo convertida.
4. A chave de movimentação foi mantida como `source_type:source_id`, impedindo que uma ação atualize a tabela errada.

## Pendências operacionais

- aplicar o SQL no Supabase;
- executar os testes RLS com usuários reais de homologação;
- publicar a aplicação.

Não há impedimento técnico comprovado no pacote entregue.
