# Etapa 03 — Reversão

O arquivo `supabase/rollback/camilla-stage03-projects-kanban-rollback.sql` executa uma reversão conservadora.

Ele:

- remove a view e as funções operacionais da Etapa 03;
- remove as políticas novas;
- restaura a etapa Obra e a restrição anterior;
- restaura somente projetos migrados automaticamente que não receberam mudança posterior de etapa;
- restaura a função anterior de histórico;
- preserva tabelas, datas, miniaturas, objetos e históricos;
- mantém o bucket privado;
- desativa os novos tipos de data;
- remove o registro de versão 3.0.4.

## Ordem de reversão

1. Retire o frontend da Etapa 03 de produção.
2. Faça novo backup do banco e do bucket.
3. Execute o rollback.
4. Execute o preflight anterior da Etapa 02 ou valide manualmente as rotas antigas.
5. Publique novamente o ZIP da Etapa 02 com o hotfix da Vercel.

O rollback não apaga arquivos do Storage nem registros criados nas tabelas novas. Essa decisão evita perda de dados.
