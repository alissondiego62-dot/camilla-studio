# Etapa 05 — Testes

## Automatizados

- existência das cinco visualizações;
- fonte única de atividades;
- visualizações salvas;
- hierarquia segura;
- RPCs transacionais;
- ausência de dados fictícios;
- observações sem HTML arbitrário;
- comentários e arquivos no painel;
- identidade entre SQL e migration;
- colisões de rotas e renderização das páginas.

## Banco

Os arquivos em `supabase/validation` verificam estrutura, integridade, RLS, ciclos, progresso e apenas uma visualização padrão por usuário. Os testes transacionais executam `ROLLBACK` ao final.
