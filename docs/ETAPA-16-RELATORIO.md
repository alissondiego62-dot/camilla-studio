# Etapa 16 — Financeiro integrado

## Base

Pacote aplicado sobre a Etapa 15, sem reescrita do sistema.

## Implementações

- exclusão lógica de registros financeiros com confirmação e motivo obrigatório;
- auditoria da exclusão em `security_audit_events`;
- ação Excluir nas listas de receitas, despesas, contas a receber e contas a pagar;
- financeiro do projeto conectado à mesma tabela `financial_entries` usada pela página geral;
- cadastro de previsões de recebimento dentro do projeto, incluindo data prevista;
- indicadores do projeto calculados a partir dos lançamentos vinculados;
- seletor único de período na página Financeiro;
- período padrão e atualização definidos como mês atual;
- correção do indicador de atualização cortado no rodapé do card do Kanban;
- índices para projeto, vencimento e período financeiro.

## Banco de dados

Execute apenas `camilla-studio-etapa-16-financeiro-integrado.sql`. Não execute também a migration equivalente.

A remoção é lógica: o registro recebe `archived_at`, `deleted_at`, `deleted_by` e `deletion_reason`. Os dados continuam disponíveis para auditoria, mas deixam de aparecer nas consultas operacionais.

## Validações

- auditoria de rotas: 28 rotas, sem colisão;
- auditoria estrutural de acessibilidade: 241 TSX aprovados;
- identidade Camilla Studio aprovada;
- 5 testes específicos da Etapa 16 aprovados;
- SQL consolidado e migration idênticos.

A compilação completa não foi executada porque o pacote não contém `node_modules`. O `tsc` global confirmou a ausência das dependências React/Next no ambiente, não uma falha específica desta etapa. Os testes antigos dependentes de servidor também não puderam iniciar pelo mesmo motivo; alguns testes históricos possuem expectativas de versões e rotas anteriores.
