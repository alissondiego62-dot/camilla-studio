# Relatório técnico — Camilla Studio Etapa 04

## Identificação

- Base: `camilla-studio-etapa-03-projetos-kanban.zip`
- Base SHA-256: `0e3b4ba4df20f1cbd3a506c0f0e8bb24c46476ac3972740a6b3acdaa27dec78a`
- Versão entregue: `3.0.5`
- Escopo: notificações, histórico, arquivos, comentários e indicadores individuais.
- Banco remoto: auditado somente por leitura; o SQL da Etapa 04 não foi aplicado automaticamente.

## Implementações

### Notificações

- Central em `/notifications`.
- Sino no cabeçalho com total não lido e lista resumida.
- Marcação individual e em lote.
- Filtro por módulo e somente não lidas.
- Realtime filtrado pelo destinatário.
- Catálogo de tipos, regras por perfil e exceções pessoais.
- Antecedência individual para prazos e contas.
- Deduplicação por usuário e evento.
- Exclusão do autor da alteração.
- Entrega push com controle de tentativas e falhas.

### Indicadores

- Contadores individuais em Histórico, Arquivos, Agenda e Comentários.
- Abertura da área registra `record_views` e remove somente o indicador daquele usuário.
- O Kanban não usa mais uma janela genérica de sete dias para indicar novidade.

### Histórico

- Histórico central em `/history`.
- Importação preservadora dos registros de `project_history`.
- Valores anterior e novo, autor, ação, módulo e descrição legível.
- Cobertura de projetos, clientes, atividades, agenda, financeiro, arquivos, comentários, usuários, permissões e configurações.
- Somente leitura para usuários comuns.
- Proteção específica para Financeiro Pessoal e observações internas.

### Arquivos

- Vínculo com projeto, cliente, atividade ou lançamento financeiro.
- Upload privado no bucket `linked-files`.
- Google Drive e links externos apenas como metadados e abertura.
- Edição de nome, categoria, observação, link e permissão de download.
- Substituição com histórico completo de versões.
- `version_group_id` preserva toda a cadeia, inclusive após várias substituições.
- Arquivamento lógico e registro do usuário.
- URLs assinadas para abertura e download.

### Comentários

- Comentários, respostas, menções e observações internas.
- Edição pelo autor durante 15 minutos ou por usuário com permissão total.
- Exclusão lógica.
- Contador individual de não lidos.
- Menções limitadas a usuários que possuem acesso ao projeto.
- Observações internas exigem permissão específica.
- O mencionado recebe apenas a notificação de menção, evitando duplicidade com a notificação genérica.

## Segurança

- RLS aplicada nas novas tabelas.
- Novas tabelas possuem concessões explícitas para a Data API.
- `notifications` concede somente leitura direta; alterações de leitura são feitas por RPC.
- Funções `SECURITY DEFINER` tiveram execução pública revogada.
- Funções chamadas por RLS receberam somente o `EXECUTE` indispensável.
- `generate_due_notifications` é executável somente por `service_role`.
- Buckets permanecem privados.
- O Realtime publica somente `notifications`, com RLS e filtro por `user_id`.
- Edge Functions agendadas exigem `CRON_SECRET`; a ausência do segredo bloqueia a execução.
- Nenhum token do Google Drive, `service_role`, senha ou VAPID privada é enviado ao frontend.

## Banco de dados

SQL consolidado:

`camilla-studio-etapa-04.sql`

Migration equivalente:

`supabase/migrations/20260716190000_camilla_stage04_notifications_history.sql`

Os dois arquivos são byte a byte idênticos. Foram criados também preflight, postflight, integridade, testes de notificações, roteiro RLS e rollback conservador.

## Auditoria remota de leitura

Antes da conclusão, o esquema remoto confirmou:

- 73 registros em `project_history`;
- nenhum comentário e nenhum arquivo vinculado no momento da auditoria;
- três assinaturas push;
- `notification_deliveries.event_id` já anulável;
- restrição legada de tipos de entrega limitada a resumo e lembrete;
- restrição de antecedência limitada a 120 minutos;
- `project_files.project_id` e `drive_url` ainda obrigatórios.

A migration trata essas diferenças sem excluir registros: amplia a antecedência para até sete dias, cataloga os tipos de entrega, permite os novos vínculos e preserva os campos legados.

## Componentes técnicos adaptados da Publicolor

Somente padrões técnicos já presentes na base foram considerados:

- badges e contadores compactos dos cards;
- atualização localizada sem recarregar todo o Kanban;
- organização de modais e feedback de operações;
- responsividade de cards e painéis;
- estrutura de histórico e atalhos.

Todos foram reescritos para os domínios, permissões, tabelas e identidade da Camilla. Nenhuma cor, logo, cliente, pedido, OP, setor, imagem ou regra industrial foi copiada.

## Arquivos alterados

- 49 arquivos criados.
- 31 arquivos modificados.
- Nenhum arquivo da base foi excluído.
- Relação completa: `docs/ETAPA-04-ARQUIVOS.md`.

## Validações realizadas

| Validação | Resultado |
|---|---|
| Instalação com lockfile preservado | Aprovada |
| TypeScript | Zero erros |
| ESLint | Zero erros |
| Build Vite/Vinext/Nitro | Aprovado |
| Rotas renderizadas | 29 rotas aprovadas, incluindo `/notifications` e `/history` |
| Testes automatizados | 51 aprovados, 0 falhas |
| Parser PostgreSQL | SQL consolidado, migration, rollback e 5 validações aprovados |
| SQL x migration | Idênticos |
| Colisões de rotas | Nenhuma |
| Credenciais no código | Nenhuma |

O build mantém dois avisos internos `INEFFECTIVE_DYNAMIC_IMPORT` do Vinext. Eles não interrompem o build e não são originados nos módulos do Camilla Studio.

## Erros encontrados e soluções

1. A tabela legada de entregas aceitava somente `daily_summary` e `event_reminder`.
   - Solução: catálogo compatível e chave estrangeira para os novos tipos.
2. `sent_at` era preenchido antes de a entrega push ocorrer.
   - Solução: remoção do valor padrão e preenchimento somente após sucesso.
3. A antecedência antiga aceitava no máximo 120 minutos.
   - Solução: faixa segura de 0 a 10.080 minutos.
4. Cadeias com três ou mais versões de arquivo poderiam ficar fragmentadas.
   - Solução: `version_group_id` e índice único por grupo e versão.
5. Observações internas poderiam aparecer no histórico para usuários sem permissão.
   - Solução: validação específica antes do acesso pelo projeto.
6. Histórico financeiro ligado a projeto poderia herdar acesso operacional.
   - Solução: o ambiente financeiro é validado antes do vínculo com o projeto.
7. Mencionados poderiam receber duas notificações do mesmo comentário.
   - Solução: notificação genérica exclui os usuários mencionados.
8. Edge Functions poderiam funcionar sem segredo quando a variável não existisse.
   - Solução: ausência ou divergência de `CRON_SECRET` retorna 401.

## Pendências reais

- Aplicar o SQL no Supabase seguindo a documentação.
- Implantar as três Edge Functions atualizadas.
- Configurar segredos e agendamentos no Supabase.
- Executar os testes RLS com contas reais de cada perfil em homologação.
- Testar entrega push em navegadores e dispositivos reais; o ambiente de build não possui endpoint push externo.

## Reversão

O rollback é conservador: desativa triggers e novas gravações, restaura políticas compatíveis com a Etapa 03 e preserva dados, versões e objetos do Storage. A restauração completa da interface é feita publicando novamente o ZIP da Etapa 03.
