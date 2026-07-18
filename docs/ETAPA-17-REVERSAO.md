# Reversão da Etapa 17

Arquivo: `supabase/rollback/camilla-stage17-contract-balance-rollback.sql`.

O rollback restaura as funções, policies e privilégios anteriores. A Etapa 17 também desativa permissões financeiras de perfis não administrativos e remove overrides incompatíveis. Esses valores personalizados não podem ser reconstruídos com segurança; para uma reversão integral, restaure as tabelas `profile_permissions` e `user_permission_overrides` a partir do backup anterior à migration.
