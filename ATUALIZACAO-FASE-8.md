# Fase 8 — Correção da Agenda

## Correção

O formulário de novo compromisso agora mantém uma referência estável ao elemento HTML antes das operações assíncronas com o Supabase.

Isso corrige o erro:

`Cannot read properties of null (reading 'reset')`

O formulário continua sendo limpo após o compromisso ser salvo com sucesso, tanto no modo demonstração quanto conectado ao Supabase.

## Banco de dados

Esta correção não exige nova migration.
