# Testes — Etapa 07

Validações incluídas:

- tipagem TypeScript sem erros;
- lint ESLint sem erros;
- build Vite/Vinext/Nitro;
- renderização independente de `/clients` e `/clients/[id]`;
- estrutura do cadastro e das oito abas;
- pesquisa e filtros;
- CPF/CNPJ e contatos sem duplicidade;
- RLS de contatos, notas, arquivos e financeiro;
- bloqueio de acesso direto às views financeiras;
- RPC financeira com autorização tripla;
- proteção de exclusão por `ON DELETE RESTRICT`;
- identificadores únicos de auditoria dentro da mesma transação;
- Financeiro Pessoal ausente das views;
- SQL consolidado idêntico à migration;
- parser PostgreSQL para os dez arquivos SQL da etapa.

Resultado final automatizado: **86 testes aprovados, 0 falhas**.
