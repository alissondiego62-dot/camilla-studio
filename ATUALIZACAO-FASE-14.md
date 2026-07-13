# Fase 14 — Correção do saldo dos contratos

O indicador **Saldo dos contratos** no Financeiro agora soma somente o campo `balance_due` dos projetos cadastrados no período.

Assim, valores já registrados como recebidos na importação inicial também são descontados, mesmo quando não existe um lançamento financeiro histórico correspondente na tabela de movimentações.

Esta atualização não exige migration no Supabase.
