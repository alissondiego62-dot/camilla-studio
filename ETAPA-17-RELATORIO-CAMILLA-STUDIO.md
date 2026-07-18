# Relatório técnico — Etapa 17

## Identificação

- Produto: Camilla Studio
- Versão: 3.0.17
- Base utilizada: Etapa 16 — Financeiro integrado
- Escopo: saldo contratual por projeto e confidencialidade administrativa
- Banco analisado: projeto Supabase `ljnxzbpthzzswqyvtvqn`
- SQL aplicado remotamente durante a geração: **não**

## Resultado funcional

### Financeiro geral

A página Financeiro ganhou a seção **Posição contratual por projeto**, com:

- total dos contratos;
- total recebido;
- total a receber;
- total vencido;
- tabela por projeto e cliente;
- acesso direto à área financeira do projeto.

A posição contratual não depende do filtro de período. O filtro mensal continua controlando os lançamentos e gráficos da página.

### Projetos

A listagem de Projetos apresenta, somente ao nível administrativo:

- Valor do contrato;
- Valor recebido;
- Valor a receber.

A ficha individual do projeto utiliza a mesma origem de dados. O contrato pode ser alterado por função segura e os lançamentos criados na ficha permanecem vinculados ao Financeiro geral.

### Regra de cálculo

```text
valor recebido = maior entre:
  - valor recebido legado do projeto;
  - soma dos recebimentos profissionais vinculados ao projeto

valor a receber = máximo(valor do contrato − valor recebido, 0)
```

Essa regra preserva a base antiga e evita duplicação enquanto os registros financeiros são recadastrados. Nenhum contrato ou recebimento é excluído pela migration.

## Confidencialidade

Os dados financeiros ficam disponíveis somente para:

- `administrator`;
- `owner`, tratado como autoridade superior ao Administrador.

A proteção foi aplicada em quatro níveis:

1. menu e rota do Financeiro;
2. componentes de Projetos, Clientes e ficha individual;
3. RPCs com validação administrativa;
4. privilégios de colunas no PostgreSQL.

As colunas `projects.contract_value`, `projects.amount_received` e `projects.balance_due` deixam de ser consultáveis diretamente pelo papel `authenticated`. As demais colunas do projeto continuam disponíveis conforme RLS.

## Alterações no banco

O SQL da Etapa 17:

- cria `is_financial_administrator()`;
- cria `get_project_financial_summary(uuid)`;
- cria `list_project_financial_summaries()`;
- cria `set_project_contract_value(uuid,numeric)`;
- atualiza `get_project_financial_entries(uuid)`;
- restringe o Financeiro profissional aos perfis administrativos;
- retira permissões financeiras incompatíveis de outros perfis;
- protege a tabela financeira legada;
- remove grants diretos das colunas contratuais;
- registra a versão `3.0.17`.

Não foram apagados projetos, lançamentos, pagamentos, contratos ou valores recebidos.

## Auditoria somente leitura do banco atual

Antes da aplicação da Etapa 17, o banco remoto apresentava:

- versão aplicada: `3.0.16`;
- 17 projetos ativos;
- contratos registrados: R$ 79.950,00;
- valores recebidos preservados: R$ 59.925,00;
- saldo contratual calculado: R$ 20.025,00;
- 7 projetos com saldo a receber.

Esses valores foram apenas consultados. A Etapa 17 não foi aplicada remotamente.

## Validações executadas

| Validação | Resultado |
|---|---:|
| Testes Node | 128 aprovados |
| Testes renderizados sem build | 27 ignorados |
| Falhas nos testes executáveis | 0 |
| Arquivos TypeScript/TSX analisados | 342 |
| Erros de sintaxe TS/TSX | 0 |
| Rotas analisadas | 28 |
| Colisões de rota | 0 |
| Arquivos TSX na auditoria de acessibilidade | 242 |
| Identidade Camilla Studio | aprovada |
| Arquivos SQL da Etapa 17 analisados | 7 |
| SQL consolidado e migration | idênticos |

## Limitação da validação

O pacote de distribuição não contém `node_modules`, e o ambiente estava sem acesso ao registro NPM. Por isso, não foi possível executar nesta rodada:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Antes da publicação, execute localmente:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Aplicação

Execute somente:

```text
camilla-studio-etapa-17-saldo-contratual.sql
```

Não execute também a migration equivalente. Consulte `docs/ETAPA-17-APLICACAO-SQL.md` para a ordem completa.
