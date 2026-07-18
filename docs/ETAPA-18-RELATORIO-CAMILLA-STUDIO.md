# Relatório técnico — Etapa 18

## Identificação

- Produto: Camilla Studio
- Versão do pacote: 3.0.19
- Base utilizada: Etapa 17 com hotfix de permissões e saldos
- Escopo: valores contratuais nos projetos, edição financeira administrativa, gestão de atividades e agenda e correção da pilha de modais

## Resultado funcional

### Projetos

A página **Projetos** passa a consultar a posição financeira protegida por RPC e apresenta, somente para os perfis `administrator` e `owner`:

- valor do contrato;
- valor recebido;
- valor a receber.

Em telas estreitas, a tabela utiliza o comportamento responsivo já existente e transforma cada linha em card sem reservar campos financeiros para usuários não administrativos.

### Novo projeto

O formulário de cadastro apresenta **Valor do contrato** somente ao nível administrativo. O projeto e o contrato são gravados pela RPC transacional `create_project_with_contract(jsonb)`. O prazo principal continua sendo registrado na estrutura de prazos após a criação.

### Financeiro do projeto

A aba Financeiro permite alterar o valor do contrato por `set_project_contract_value(uuid,numeric)`. O valor é salvo em `project_contract_financials`, sem atualizar diretamente `projects.balance_due`, que é uma coluna `GENERATED ALWAYS`.

O saldo exibido permanece:

```text
valor a receber = máximo(valor do contrato − valor recebido, 0)
```

A alteração do contrato é registrada no histórico do projeto.

### Atividades do projeto

Cada atividade principal agora oferece:

- Editar;
- Concluir ou reabrir;
- Excluir com confirmação;
- Abrir no workspace completo.

A edição contempla título, descrição, status, prioridade, responsável e prazo com horário. A exclusão utiliza `delete_activity_logically`, preservando o histórico técnico.

### Agenda do projeto

Cada compromisso agora oferece:

- Editar;
- Concluir ou reabrir;
- Excluir com confirmação.

A edição contempla título, tipo, status, início, fim, responsável, local, dia inteiro e observações. O vínculo com o projeto e com o cliente é reenviado durante a atualização para impedir perda de relacionamento.

A exclusão utiliza `archive_calendar_event`, retirando o compromisso das telas operacionais sem destruir o histórico.

### Página geral de Agenda

O drawer da Agenda agora permite editar todos os dados de um evento e excluir com confirmação. Atividades e prazos continuam usando a edição compatível com suas fontes reais.

### Confirmação sobreposta ao drawer

A confirmação de exclusão passa a ser renderizada pelo portal global do componente `Modal`, com `z-index: 160`. O foco do drawer é suspenso enquanto a confirmação está aberta. Isso impede que a confirmação fique atrás do painel ou que o foco seja devolvido indevidamente ao drawer.

## Banco de dados

Arquivo principal:

```text
camilla-studio-etapa-18-valor-contrato-atividades-agenda.sql
```

O SQL:

- preserva os contratos e recebimentos existentes;
- não apaga lançamentos financeiros;
- cria a RPC transacional de projeto com contrato;
- atualiza a RPC de alteração do contrato;
- mantém a confidencialidade pela função `is_financial_administrator()`;
- não tenta modificar a coluna gerada `balance_due`;
- cria índices operacionais para atividades e agenda;
- registra a versão 3.0.19.

O SQL principal e a migration são idênticos.

## Validações executadas

| Validação | Resultado |
|---|---:|
| Testes automatizados | 137 aprovados |
| Falhas | 0 |
| Testes renderizados dependentes de build | 27 ignorados |
| Testes específicos da Etapa 18 | 6 aprovados |
| Arquivos TS/TSX analisados sintaticamente | 359 aprovados |
| Arquivos analisados para imports locais | 389; nenhum import ausente |
| Rotas | 28, sem colisões |
| Acessibilidade estrutural | 242 TSX aprovados |
| Identidade visual | aprovada |
| Sintaxe PostgreSQL | aprovada por parser |
| Funções existentes no banco auditadas | atividades, agenda e financeiro confirmadas |

## Alterações no pacote

- 13 arquivos criados;
- 17 arquivos modificados;
- nenhum arquivo removido;
- 728 arquivos finais no pacote, antes da compactação.

## Limitação da validação

O ambiente não contém `node_modules`, o executável `pnpm` não está disponível e o registro NPM estava inacessível. Por isso, não foi possível executar nesta sessão:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Foi executada a transpilação sintática de todos os arquivos TypeScript/TSX com o compilador disponível, além da verificação dos imports locais e da suíte estática completa. Após publicar, o teste final deve confirmar no navegador: criação de projeto com contrato, edição/exclusão de atividade, edição/exclusão de compromisso e confirmação acima do drawer.

## Aplicação

1. Faça backup do banco.
2. Execute `supabase/validation/etapa-18-preflight.sql`.
3. Execute somente `camilla-studio-etapa-18-valor-contrato-atividades-agenda.sql`.
4. Execute os arquivos de postflight, integridade e segurança.
5. Publique o ZIP.
6. Saia e entre novamente como Camila.
7. Atualize com `Ctrl + F5`.

O SQL não foi aplicado remotamente durante a geração deste pacote.
