# Fase 13 — Briefing preliminar, checklist e filtro financeiro

## Kanban

As etapas Prospecção, Briefing e Levantamento foram consolidadas em **Briefing preliminar**. A migration converte automaticamente projetos antigos dessas três colunas.

## Checklist

Cada projeto possui uma nova aba **Checklist**. É possível:

- gerar um modelo para a etapa atual;
- usar grupos internos, como Prospecção, Briefing e Levantamento;
- adicionar itens manuais;
- concluir/reabrir itens;
- remover itens;
- acompanhar o progresso geral.

Os modelos do Executivo variam entre projetos de Arquitetura e Interiores.

## Financeiro

A página Financeiro abre com o mês atual selecionado. O período pode ser alterado por data inicial e final.

Os indicadores exibem:

- contratos de projetos cadastrados no período;
- recebimentos lançados no período;
- saldo pendente dos contratos cadastrados no período;
- despesas do período;
- receitas avulsas do período.

## Supabase

Execute:

`supabase/migrations/20260723010000_briefing_checklists_finance_period.sql`
