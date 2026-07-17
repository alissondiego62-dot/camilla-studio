# Etapa 09 — Relatórios gerais

Os relatórios usam códigos fechados em `get_operational_report(text,jsonb,integer,integer)`. O cliente não envia SQL nem nomes arbitrários de tabelas.

## Catálogo

### Projetos
- projetos por etapa;
- projetos por status;
- projetos por responsável;
- prazos vencidos;
- prazos futuros.

### Atividades e operação
- atividades por status;
- atividades por responsável;
- atividades atrasadas;
- checklists;
- produtividade.

### Clientes, auditoria e agenda
- clientes;
- histórico de alterações;
- agenda.

### Financeiro profissional
- contas a receber;
- contas a pagar.

## Exportação
- CSV UTF-8 compatível com Excel;
- visualização de impressão para geração de PDF;
- filtros e colunas autorizadas preservados;
- auditoria em `report_export_audit`.

Relatórios financeiros exigem permissão de relatório e permissão financeira de valores.
