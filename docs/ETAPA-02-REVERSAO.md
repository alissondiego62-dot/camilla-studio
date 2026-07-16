# Reversão — Etapa 02

Arquivo:

`supabase/rollback/20260716090000_camilla_stage02_admin_security_rollback.sql`

## Comportamento

O rollback é conservador:

- não apaga usuários;
- não apaga projetos, atividades ou clientes;
- não apaga checklists aplicados;
- não apaga auditorias;
- remove os triggers da Etapa 02;
- remove as políticas da Etapa 02;
- entra em **modo administrativo seguro** em vez de restaurar políticas abertas;
- mantém conexões e tokens do Google Drive inacessíveis diretamente.

## Ordem

1. Faça backup.
2. Execute o rollback no SQL Editor.
3. Restaure o ZIP da Etapa 01, caso também queira reverter a interface.
4. Valide login administrativo e leitura dos registros.
5. Corrija a causa da reversão antes de reaplicar a migration.

O rollback preserva tabelas e funções novas para permitir reaplicação sem perda. A remoção física deve ser feita apenas em uma manutenção específica, após exportação e análise de dependências.
