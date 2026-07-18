# Hotfix da Etapa 17 — Permissões e saldos

## Problemas corrigidos

- `permission denied for table projects` após aplicar o SQL da Etapa 17;
- posição contratual não visível no Financeiro;
- dependência excessiva da matriz de permissões para um perfil já classificado como Administrador.

## Solução

Os valores contratuais reais foram movidos para `project_contract_financials`, protegida por RLS e acessível somente a `administrator` e `owner`. As colunas financeiras antigas de `projects` permanecem zeradas apenas para compatibilidade. Dessa forma, o PostgREST pode voltar a ler `projects` normalmente sem revelar valores confidenciais.

A página Financeiro apresenta a posição contratual antes dos gráficos, e o frontend reconhece diretamente os perfis administrativos para acesso e visualização dos valores.

## Aplicação

Execute somente `camilla-studio-etapa-17-correcao-permissoes-saldos.sql` depois da Etapa 17 original. Não execute também a migration equivalente.
