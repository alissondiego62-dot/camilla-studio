# Fase 5 — Edição da visão geral

Execute no SQL Editor do Supabase, depois das migrations anteriores:

`supabase/migrations/20260720010000_editable_project_overview_and_history.sql`

Alterações:

- responsável removido dos cards duplicados e mantido apenas no seletor superior;
- lista inicial de responsáveis: Camilla, Aldair e Silvia;
- prazo principal independente e editável;
- valor do contrato editável;
- datas das três entregas planejadas editáveis;
- saldo somente leitura e calculado por contrato menos recebimentos;
- histórico automático para etapa, status, responsável, prazo principal, entregas e contrato.
