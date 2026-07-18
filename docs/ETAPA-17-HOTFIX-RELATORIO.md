# Camilla Studio — Hotfix da Etapa 17

## Objetivo

Corrigir o bloqueio `permission denied for table projects` e garantir que os saldos contratuais sejam exibidos no Financeiro para a administradora, sem expor valores a outros perfis.

## Diagnóstico confirmado

A Etapa 17 removeu o privilégio de leitura da tabela `projects` e concedeu leitura por coluna. Embora a consulta SQL direta por colunas seja válida no PostgreSQL, o PostgREST/Supabase pode tratar a tabela como indisponível, provocando o erro apresentado na página do projeto.

A usuária `arquitetacamillalves` está ativa, não está bloqueada e possui o perfil `administrator`.

Na auditoria anterior ao hotfix foram preservados:

- 17 projetos ativos;
- R$ 79.950,00 em contratos;
- R$ 59.925,00 recebidos;
- R$ 20.025,00 a receber.

## Correção do banco

Foi criada a tabela protegida `project_contract_financials` para armazenar:

- valor do contrato;
- valor recebido legado preservado;
- auditoria de atualização.

Os valores reais são migrados para essa tabela antes de qualquer limpeza. As três colunas financeiras antigas de `projects` ficam zeradas e protegidas por trigger. Isso permite restaurar a leitura normal da tabela `projects` sem revelar dados confidenciais.

As RPCs foram atualizadas para consultar a nova tabela:

- `get_project_financial_summary(uuid)`;
- `list_project_financial_summaries()`;
- `set_project_contract_value(uuid,numeric)`.

A regra permanece:

`A receber = contrato - maior valor entre recebido legado e recebimentos lançados`, limitado ao mínimo de zero.

## Permissões

O acesso financeiro profissional é liberado diretamente para:

- `administrator`;
- `owner`.

Outros perfis não conseguem consultar `project_contract_financials` por causa do RLS.

## Correção do frontend

- Administradores não dependem de uma permissão duplicada da matriz para abrir o Financeiro.
- Valores financeiros ficam visíveis para o perfil administrativo.
- A posição contratual por projeto foi movida para o início da visão geral, antes dos gráficos.
- A leitura do retorno JSON das RPCs aceita tanto array nativo quanto JSON serializado.

## Aplicação

1. Faça backup do banco.
2. Execute `supabase/validation/etapa-17-hotfix-preflight.sql`.
3. Execute apenas `camilla-studio-etapa-17-correcao-permissoes-saldos.sql`.
4. Execute os arquivos de pós-validação.
5. Saia e entre novamente na aplicação.
6. Publique o ZIP do hotfix.

Não execute também a migration equivalente.

## Validações

- 158 testes encontrados;
- 131 aprovados;
- 27 ignorados por dependerem do build renderizado;
- 0 falhas;
- 28 rotas sem colisão;
- 242 arquivos TSX aprovados na auditoria estrutural de acessibilidade;
- identidade Camilla Studio aprovada;
- SQL principal e migration idênticos;
- sintaxe dos SQLs validada com parser PostgreSQL.

## Observação

O SQL não foi aplicado remotamente. O pacote foi preparado para aplicação manual no projeto Supabase.
