# Reversão — Etapa 06

O arquivo `supabase/rollback/camilla-stage06-calendar-agenda-rollback.sql` remove a view e as RPCs da Etapa 06.

A reversão é conservadora:

- não remove eventos;
- não remove datas das atividades;
- não remove prazos;
- não remove histórico;
- não remove notificações;
- mantém colunas de arquivamento e cancelamento para evitar perda de estado.

Para reverter a interface, restaure o ZIP da Etapa 05.
