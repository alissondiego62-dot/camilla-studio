# Etapa 04 — Modelo de notificações

## Estruturas

- `notification_type_catalog`: catálogo dos tipos, módulo, prioridade e valores padrão.
- `notification_profile_rules`: padrão herdado por perfil.
- `notification_user_rules`: exceção pessoal, com precedência sobre o perfil.
- `notification_preferences`: resumo diário, lembretes, horário e fuso.
- `notifications`: caixa persistente individual.
- `notification_deliveries`: tentativas e resultados de entrega push.
- `record_views`: última visualização individual de cada área.

## Campos centrais

Cada linha de `notifications` possui destinatário, ator, tipo, módulo, registro, projeto relacionado, título, descrição, prioridade, link, leitura, arquivamento, chave de deduplicação, metadados e horário.

## Resolução de regras

1. A regra individual tem prioridade.
2. Na ausência de regra individual, usa-se a regra do perfil.
3. Na ausência das duas, usa-se o catálogo.
4. Usuários inativos, bloqueados ou arquivados não recebem notificações.
5. O autor da alteração não recebe a própria notificação.

## Leitura e indicadores

- `mark_notification_read`: marca uma notificação do próprio usuário.
- `mark_all_notifications_read`: marca todas ou somente as de determinado módulo.
- `mark_record_view`: registra a visualização da área e marca notificações relacionadas.
- Os cards do Kanban usam `record_views` para calcular novidades individualmente.

## Alertas agendados

`generate_due_notifications` cria alertas de prazos e contas respeitando a antecedência efetiva de cada usuário. A deduplicação diária evita repetição indevida.

## Entrega push

`dispatch-notifications` exige `CRON_SECRET`, lê somente notificações pendentes, respeita regras de push, registra a entrega e desativa assinaturas expiradas. Os segredos VAPID ficam somente no Supabase.
