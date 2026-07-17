# Relatório técnico — Etapa 09

## Identificação
- Sistema: Camilla Studio 3.0
- Versão: 3.0.10
- Etapa: Dashboard, Relatórios Gerais e Google Drive
- Base: ZIP final da Etapa 08
- SQL principal: `camilla-studio-etapa-09.sql`
- Migration: `supabase/migrations/20260717050000_camilla_stage09_dashboard_reports_drive.sql`

## Resultado
A Etapa 09 finaliza o Dashboard como página inicial, cria o catálogo de relatórios operacionais e implementa a integração segura com Google Drive sem mover regras de negócio para o serviço externo.

## Dashboard
- filtros por período, responsável, projeto e cliente;
- projetos ativos, atrasados, próximos do prazo e concluídos;
- projetos por etapa e responsável;
- atividades abertas, de hoje, atrasadas, da semana e concluídas;
- atividades por status e responsável;
- agenda do dia e próximos compromissos;
- clientes com movimentações recentes;
- pendências, checklists, notificações e itens não visualizados;
- painel financeiro profissional somente quando autorizado;
- gráficos SVG com tokens da paleta Camilla.

A RPC `get_dashboard_workspace(jsonb)` agrega somente registros acessíveis ao usuário. Valores financeiros não são retornados sem as permissões exigidas.

## Relatórios
Foram implementados 15 relatórios:
1. projetos por etapa;
2. projetos por status;
3. projetos por responsável;
4. prazos vencidos;
5. prazos futuros;
6. atividades por status;
7. atividades por responsável;
8. atividades atrasadas;
9. checklists;
10. clientes;
11. histórico de alterações;
12. agenda;
13. produtividade;
14. contas a receber;
15. contas a pagar.

Recursos:
- filtros;
- paginação;
- gráficos;
- CSV UTF-8 compatível com Excel;
- visualização de impressão para PDF;
- auditoria de exportações;
- autorização financeira aplicada no servidor.

## Google Drive
- conexão OAuth;
- callback com estado de uso único;
- tokens criptografados com AES-GCM;
- upload de arquivos;
- atualização de metadados;
- abertura pelo link oficial;
- compartilhamento com e-mail específico;
- revogação do compartilhamento;
- histórico de operações;
- relações com projeto, cliente, atividade ou lançamento financeiro.

O banco continua armazenando relações, categoria, versão, autor, acesso e histórico. O Drive armazena apenas o conteúdo externo e seus metadados técnicos.

## Estruturas do banco
Criadas ou ampliadas:
- `report_export_audit`;
- `google_drive_operations`;
- `google_drive_shares`;
- `integration_private.google_drive_credentials`;
- `integration_private.google_drive_oauth_states`;
- metadados adicionais em `google_drive_settings`, `google_drive_connections` e `project_files`;
- permissões adicionais para Dashboard, Relatórios, Integrações e Arquivos.

RPCs principais:
- `get_dashboard_workspace(jsonb)`;
- `get_operational_report(text,jsonb,integer,integer)`;
- `get_report_filter_options()`;
- `register_report_export(text,text,jsonb,integer)`;
- `get_google_drive_workspace()`.

## Correção incorporada da Etapa 08
O ZIP anterior ainda continha a versão inicial do SQL da Etapa 08. O pacote atual substitui:
- `camilla-studio-etapa-08.sql`;
- `supabase/migrations/20260717030000_camilla_stage08_finance.sql`.

A versão corrigida remove temporariamente as views financeiras dependentes antes de alterar `financial_entries.amount` para `numeric(18,2)` e as recria ao final. Essa correção serve para instalações novas; o SQL da Etapa 08 não deve ser reaplicado no banco atual.

## Componentes adaptados da Publicolor
Referências técnicas:
- `app/legacy-page.tsx` — hierarquia de métricas, prioridades e compromissos;
- `app/pcp-v2.css` — cards compactos, filtros móveis, métricas horizontais e overflow;
- `app/publicolor-integration.css` — verificação de padrões legados de integração.

Adaptação:
- identidade visual substituída integralmente pela paleta Camilla;
- pedidos, OPs, setores, instalações, clientes e regras industriais descartados;
- consultas e permissões reescritas para Projetos, Atividades, Agenda, Clientes, Financeiro e RLS da Camilla.

## Segurança
- RLS nas novas tabelas públicas;
- funções privilegiadas com `search_path` fixo;
- execução revogada para `PUBLIC` e `anon`;
- schema de credenciais privado;
- refresh tokens nunca enviados ao frontend;
- compartilhamento público desativado por padrão;
- relatórios utilizam códigos fechados, sem SQL arbitrário;
- permissões do arquivo e do registro relacionado verificadas separadamente.

## Arquivos
- 55 arquivos criados;
- 21 arquivos modificados;
- nenhum arquivo removido;
- 650 arquivos-fonte no pacote final.

A lista nominal está em `docs/ETAPA-09-ARQUIVOS.md` e `docs/ETAPA-09-ARQUIVOS.json`.

## Validações
- TypeScript: zero erros;
- ESLint: zero erros;
- build Vite/Vinext/Nitro: aprovado;
- testes automatizados: 114 aprovados, 0 falhas;
- rotas independentes: 30 aprovadas;
- parser PostgreSQL: 10 arquivos aprovados;
- SQL consolidado e migration: idênticos;
- colisões de rota: nenhuma.

O build exibiu três avisos internos `INEFFECTIVE_DYNAMIC_IMPORT` do Vinext. Eles não impedem a compilação.

## Erros encontrados e soluções
1. O SQL interno da Etapa 08 estava anterior ao hotfix: substituído pelo SQL corrigido e sincronizado com a migration.
2. Agregação de checklist com ordenação inválida: consulta corrigida para ordenação dentro do agregado.
3. Total financeiro do relatório calculado fora do escopo da CTE: cálculo movido para a mesma consulta.
4. Persistência de refresh token após renovação: Edge Functions atualizadas para recriptografar e salvar o token renovado.
5. Conexão do Drive com índice parcial: inserção/atualização refeita sem depender de `upsert` incompatível.

## Pendências externas reais
A conexão real com o Google Drive depende de:
- projeto e tela de consentimento no Google Cloud;
- client ID e client secret;
- URI de callback cadastrada;
- chave AES-GCM de 32 bytes em Base64;
- secrets configurados no Supabase;
- publicação das três Edge Functions.

Sem esses itens, links manuais e Storage privado continuam funcionando. A aplicação não simula uma conexão.

## Aplicação
1. backup;
2. preflight;
3. `camilla-studio-etapa-09.sql` uma única vez;
4. postflight;
5. integridade;
6. testes em homologação;
7. secrets e Edge Functions;
8. aplicação web.

O SQL da Etapa 09 não foi aplicado remotamente durante a geração do pacote.
