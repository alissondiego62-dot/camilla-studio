# Relatório — Etapa 05: Atividades e Subatividades

## Base

- Base obrigatória: `camilla-studio-etapa-04-final-corrigido.zip`.
- SHA-256 da base: `e36af168e04073d2e20631c1c2019d51392c7005f74dd3a4df32399838b5647b`.
- Nova versão: `3.0.6`.
- O banco remoto foi auditado somente por leitura. O SQL da Etapa 05 não foi aplicado remotamente durante a geração do pacote.

## Preservação

Foram preservados os UUIDs, as duas atividades reais existentes, projetos, clientes, usuários, permissões, notificações, histórico, arquivos, comentários, agenda, checklists, migrations anteriores, integrações e rotas atuais. Nenhum registro real foi recriado ou excluído.

## Implementado

### Workspace de atividades

A rota `/activities` utiliza os mesmos registros nas visualizações Tabela, Lista, Quadro, Calendário e Linha do tempo. A barra superior permite pesquisa, filtros, ordenação, agrupamento, propriedades visíveis, ordem e largura das colunas, visualizações salvas, paginação e ações em massa.

### Visualizações salvas

Cada usuário pode salvar configurações independentes com tipo, filtros, ordenação, agrupamento, propriedades, ordem, larguras, paginação e visualização padrão. RLS limita leitura e escrita ao proprietário.

### Cadastro e edição

O painel lateral mantém o contexto da listagem e utiliza URL direta por UUID. Permite criar, editar, duplicar, arquivar, reativar e excluir logicamente. São suportados título, descrição, observações estruturadas, status, prioridade, responsável, participantes, período, dia inteiro, projeto, cliente, etapa, tags, anexos, comentários, progresso e auditoria.

### Ações em massa

Status, responsável, prioridade e prazo podem ser alterados em lote por RPC transacional. Se uma atividade estiver fora do escopo, a operação é abortada.

### Subatividades

- criação abaixo da atividade principal;
- promoção para atividade principal;
- movimentação e reordenação;
- um nível operacional de hierarquia;
- bloqueio de autorreferência e ciclos;
- progresso automático do pai;
- indicador “N de M concluídas”;
- alerta para conclusão com pendências;
- conclusão forçada somente com permissão e justificativa;
- configuração de conclusão automática do pai.

A FK de `parent_id` foi alterada de `ON DELETE CASCADE` para `ON DELETE SET NULL`, evitando perda de filhos em exclusões físicas acidentais.

### Observações

As observações são separadas dos comentários e armazenadas como documento JSON com blocos permitidos: título, parágrafo, listas, checklist, link, imagem, arquivo e destaque. HTML arbitrário não é renderizado.

### Relações

Atividades podem ser relacionadas a cliente, projeto, etapa e evento da agenda. O projeto e o cliente exibem atividades relacionadas. Comentários, menções, respostas, anexos versionados e agenda são carregados somente ao abrir o painel.

### Status

O código `waiting` foi preservado e o nome passou para “Aguardando”. O status configurável `blocked` foi adicionado como “Bloqueada”.

## Banco de dados

SQL necessário: **sim**.

Arquivos:

- `camilla-studio-etapa-05.sql`;
- `supabase/migrations/20260716210000_camilla_stage05_activities_workspace.sql`;
- `supabase/rollback/camilla-stage05-activities-workspace-rollback.sql`;
- validações preflight, postflight, integridade, RLS, hierarquia e visualizações salvas.

O SQL consolidado e a migration são idênticos.

### Novas tabelas

- `activity_participants`;
- `activity_saved_views`.

### Colunas adicionadas

Em `project_activities`: cliente, início, prazo com horário, dia inteiro, documento de observações, último editor, responsável pela conclusão, arquivamento e exclusão lógica.

Em `project_comments`: relação opcional com atividade.

Em `calendar_events`: relação opcional com atividade.

### Funções principais

- `save_activity`;
- `set_activity_status`;
- `bulk_update_activities`;
- `duplicate_activity`;
- `move_activity`;
- `reorder_activity`;
- `archive_activity`;
- `reactivate_activity`;
- `delete_activity_logically`;
- validação da hierarquia e recálculo de progresso.

## Segurança

- RLS aplicada em atividades, participantes e visualizações salvas;
- `USING` e `WITH CHECK` nas atualizações;
- comentários, arquivos e agenda respeitam o acesso à atividade;
- funções `SECURITY DEFINER` têm execução pública revogada;
- exclusão normal é lógica;
- ações em massa são transacionais;
- observações não aceitam HTML arbitrário.

## Correções encontradas durante a validação

1. O componente legado de atividades continha registros fictícios. A lista local foi esvaziada, preservando o componente apenas para compatibilidade do código legado.
2. A RPC `save_activity` possuía uma variável com o mesmo nome da coluna `activity_id`; isso poderia remover participantes de outros registros. A variável foi renomeada para `v_activity_id` e recebeu teste de regressão.
3. Triggers podiam acessar `OLD` durante `INSERT` ou `NEW` durante `DELETE`. O tratamento passou a verificar `TG_OP`, com teste específico.
4. A FK de subatividades usava exclusão em cascata. Foi substituída por `SET NULL`.

## Componentes e padrões da Publicolor

Nenhum trecho visual, identidade, pedido, OP, setor, cliente ou regra industrial foi copiado. Foram adaptados apenas padrões técnicos presentes na base legada:

- `app/pcp-v2.css`: conceito de filtros em painel móvel e largura mínima de 320 px, reconstruído em `app/styles/activities.css` com tokens da Camilla;
- padrões de cards compactos e barras de ferramentas: adaptados às visualizações de atividades;
- padrão de atualização otimista com reversão do código legado: aplicado ao estado por UUID;
- tratamento responsivo de tabelas: adaptado para cartões no celular.

## Arquivos

- Criados: **42**;
- Modificados: **18**;
- Removidos: **0**.

A relação completa está em `docs/ETAPA-05-ARQUIVOS.md` e `docs/ETAPA-05-ARQUIVOS.json`.

## Validações

| Validação | Resultado |
|---|---|
| TypeScript | zero erros |
| ESLint | zero erros |
| Build Vite/Vinext/Nitro | aprovado |
| Testes automatizados | 63 aprovados, 0 falhas |
| Rotas renderizadas | 29 aprovadas |
| Parser PostgreSQL | 9 arquivos aprovados |
| SQL e migration | idênticos |
| Dados fictícios na interface ativa | nenhum |
| Colisão de rotas | nenhuma |

O build apresentou apenas avisos internos `INEFFECTIVE_DYNAMIC_IMPORT` do Vinext, sem interromper a compilação.

## Aplicação do SQL

1. Faça backup do banco.
2. Execute `supabase/validation/etapa-05-preflight.sql`.
3. Execute somente `camilla-studio-etapa-05.sql`.
4. Execute o postflight e a integridade.
5. Execute testes de hierarquia e visualizações em homologação.
6. Execute testes RLS com perfis reais de teste.
7. Publique a aplicação atualizada.

Não execute o SQL consolidado e a migration equivalente em sequência.

## Reversão

O rollback fornecido é conservador: desativa automações, mas preserva todos os dados aditivos. Para reverter a interface, publique novamente o ZIP final corrigido da Etapa 04.

## Pendências reais

- O SQL não foi aplicado no banco remoto durante a geração do pacote.
- Testes RLS completos precisam de sessões autenticadas de cada perfil em homologação.
- O arraste no quadro usa HTML5 e possui alternativas por seletores e painel; dispositivos móveis devem ser verificados no navegador final da publicação.
