# Etapa 11 — Fluxos e checklists sincronizados

## Resultado

A Etapa 11 conecta os catálogos de etapas, status de projetos e status de atividades aos módulos operacionais. Os itens podem ser criados, editados, ativados, desativados, ordenados e excluídos com migração segura dos registros vinculados.

## Sincronização

- O Kanban carrega somente etapas ativas e não arquivadas, na ordem definida em Configurações.
- Os controles dos cards carregam etapas e status ativos do banco.
- O cadastro e a edição de projetos utilizam os catálogos dinâmicos.
- O módulo de Atividades já utiliza `activity_statuses` e passa a receber a gestão completa pelo mesmo catálogo.
- Itens inativos deixam de aparecer para novas seleções.
- Registros antigos permanecem legíveis; exclusões com vínculos exigem substituição.

## Checklists

Os sete modelos antigos são arquivados na primeira aplicação. Os nove itens já aplicados em projetos permanecem preservados em `project_checklist_items`.

A tela de Checklists passa a listar diretamente cada etapa ativa do Kanban. Cada etapa recebe um checklist padrão vazio, no qual podem ser cadastrados itens obrigatórios ou opcionais, seções e ordem.

## Banco

Foram adicionadas RPCs para consulta, gravação, ativação, reordenação e exclusão dos catálogos, além das RPCs de checklists por etapa. A migration registra a versão `3.0.12`.

## Aplicação

1. Faça backup do banco.
2. Execute `camilla-studio-etapa-11-fluxos-checklists.sql` uma única vez.
3. Execute `supabase/validation/etapa-11-postflight.sql`.
4. Execute `supabase/validation/etapa-11-data-integrity.sql`.
5. Publique a aplicação atualizada.

Não execute o SQL consolidado e a migration equivalente em sequência.
