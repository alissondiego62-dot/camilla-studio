# Auditoria remota somente de leitura

Foi consultado o projeto Supabase **Camila** sem executar DDL ou alterar registros.

## Estado encontrado

- 2 perfis de usuário: 1 `admin` legado e 1 `viewer` legado.
- 17 projetos reais.
- Etapas em uso: `adjustments`, `approval`, `briefing_preliminary`, `creation` e `executive`.
- Status em uso: `completed`, `in_progress`, `not_started` e `waiting`.
- Tabelas administrativas granulares da Etapa 02 ainda não estavam instaladas.
- Algumas migrations futuras haviam sido aplicadas parcialmente, gerando `camilla_role`, arquivos, comentários, checklists e políticas sobrepostas.

## Alertas de segurança encontrados

- políticas `ALL` com `USING/WITH CHECK true` em tabelas operacionais;
- funções `SECURITY DEFINER` executáveis por `PUBLIC`;
- tabela de tokens do Google Drive com RLS sem política e necessidade de bloqueio direto;
- proteção contra senhas vazadas desabilitada no Supabase Auth.

O SQL consolidado foi adaptado a esse estado: mantém IDs e etapas, remove políticas abertas, protege funções, separa financeiros e bloqueia acesso direto aos tokens.
