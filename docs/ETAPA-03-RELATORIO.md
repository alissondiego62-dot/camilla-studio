# Camilla Studio — Relatório da Etapa 03

## 1. Identificação

- **Etapa:** 03 — Projetos, Kanban, miniaturas, prazos e etapas
- **Versão do sistema:** 3.0.4
- **Base obrigatória:** `camilla-studio-etapa-02-hotfix-vercel-rotas.zip`
- **SHA-256 da base:** `133cfc4b21e50037366e5aa0f166144687b247eeb02c5b2f7d295beb0df71551`
- **Fuso operacional:** `America/Boa_Vista`
- **Idioma:** português do Brasil
- **Moeda:** BRL / R$

A implementação foi realizada sobre a versão corrigida da Etapa 02. Não houve reconstrução do projeto, atualização indiscriminada de dependências, alteração de IDs ou inclusão de dados fictícios.

## 2. Auditoria remota anterior à implementação

Foi executada auditoria **somente de leitura** no projeto Supabase `Camila` (`ljnxzbpthzzswqyvtvqn`). Nenhum SQL da Etapa 03 foi aplicado remotamente durante a elaboração do pacote.

Estado observado em 16/07/2026:

| Etapa registrada | Projetos |
|---|---:|
| Ajustes | 4 |
| Aprovação | 2 |
| Estudo Preliminar — código legado `briefing_preliminary` | 1 |
| Criação | 4 |
| Executivo | 6 |
| Obra — `construction` | 0 |
| **Total** | **17** |

Também foram confirmadas as estruturas de atividades, agenda, arquivos, comentários, histórico e checklists criadas ou consolidadas nas etapas anteriores.

## 3. Nomenclatura e fluxo de etapas

### 3.1 Estudo Preliminar

O código interno `briefing_preliminary` foi preservado para não quebrar relações existentes. O nome oficial passou a ser **Estudo Preliminar** em:

- Kanban;
- formulários;
- filtros;
- página de projetos;
- página individual do projeto;
- configurações de fluxo;
- checklists;
- relatórios e indicadores que utilizam o catálogo central;
- histórico exibido pela aplicação.

O SQL corrige textos históricos que ainda contenham “Briefing Preliminar”, preservando o texto anterior dentro do campo de metadados antes da atualização.

### 3.2 Remoção de Obra

A etapa `construction` foi retirada do fluxo operacional, do Kanban, dos seletores, dos formulários e das configurações ativas.

A migration trata registros antigos da seguinte forma:

- projeto em Obra com status `completed` → etapa `completed`;
- projeto em Obra com qualquer outro status → etapa `revision`.

Antes da alteração é criado um registro `stage_migrated` em `project_history`, contendo etapa anterior, etapa nova, status anterior, motivo e identificador da migration. O catálogo e os modelos de checklist de Obra são arquivados, não apagados.

Na auditoria remota não havia projeto em Obra, mas a migration permanece idempotente para instalações ou backups que contenham esse valor.

## 4. Projetos

A listagem de projetos foi ampliada para trabalhar com dados reais de clientes, responsáveis, etapas e status. Foi criada a rota individual:

```text
/projects/[id]
```

A página individual centraliza:

- visão geral e edição dos dados permitidos;
- cliente;
- etapa, status, prioridade e responsável;
- miniatura;
- prazos e datas planejadas;
- atividades;
- agenda;
- arquivos;
- comentários;
- checklist operacional;
- histórico;
- informações financeiras relacionadas, consultadas somente quando o usuário possui permissão.

Cada seção possui carregamento e feedback próprios. Um erro de uma seção não exige recarregar toda a aplicação.

## 5. Kanban

O Kanban foi reorganizado em componentes independentes:

- quadro;
- coluna;
- card;
- ações do card;
- atalhos;
- serviço de atualização.

O card exibe:

- miniatura ou placeholder discreto;
- código e nome do projeto;
- cliente;
- responsável;
- prazo principal;
- resumo de datas planejadas;
- status;
- etapa;
- progresso do checklist;
- contadores de histórico, arquivos, agenda e comentários.

Os atalhos abrem diretamente as seções correspondentes na página do projeto.

### Atualizações do card

A movimentação utiliza atualização otimista com rollback. Após uma operação bem-sucedida, somente o projeto alterado é consultado novamente para atualizar:

- card;
- contador da coluna de origem;
- contador da coluna de destino;
- prazos;
- checklist;
- indicadores e contadores.

Não há recarregamento integral do sistema.

### Drag and drop

Foram implementados e testados:

- arraste entre etapas;
- bloqueio sem permissão;
- feedback visual do destino;
- prevenção de operação duplicada;
- rollback quando o banco rejeita a operação;
- seletor de etapa como alternativa para teclado e dispositivos móveis;
- aplicação do checklist da nova etapa pelo gatilho de banco;
- histórico estruturado da movimentação.

## 6. Miniatura do projeto

Foi criada a tabela `project_thumbnails` e o bucket privado:

```text
project-thumbnails
```

Formatos permitidos:

- PNG;
- JPG/JPEG;
- WEBP.

Limite configurado: **8 MB**.

O fluxo permite:

- pré-visualização local;
- upload;
- substituição;
- remoção lógica;
- versionamento;
- URL assinada temporária;
- fallback para o campo legado `projects.cover_url`;
- placeholder quando não existir imagem.

São registrados projeto, bucket, caminho, tipo MIME, tamanho, versão, autor, criação, substituição, remoção, data e horário. As políticas do Storage verificam acesso ao projeto e a permissão de arquivos.

## 7. Datas planejadas e prazo principal

Foi criada a tabela `project_dates` com suporte a:

- Estudo preliminar;
- Anteprojeto;
- Projeto executivo;
- Apresentação;
- Aprovação;
- Entrega parcial;
- Entrega final;
- Reunião;
- Visita;
- Outra finalidade configurável.

Cada registro pode conter título, descrição, data e horário de início e fim, dia inteiro, conclusão, atividade relacionada, evento da agenda, autor e arquivamento lógico.

Apenas uma data ativa pode ser o prazo principal por projeto. Um índice único parcial e as funções transacionais impedem duplicidade. O campo legado `projects.main_deadline` é sincronizado para manter compatibilidade com módulos existentes.

Os prazos antigos são migrados sem duplicação. A interface identifica:

- vencido;
- próximo do vencimento;
- futuro;
- concluído;
- alterado recentemente;
- prazo principal.

## 8. Atividades e agenda relacionadas

Uma data planejada pode:

- ser relacionada a atividade existente;
- ser relacionada a evento existente;
- originar uma nova atividade;
- originar um novo evento da agenda.

A criação do vínculo é explícita. A alteração posterior de uma data não modifica silenciosamente atividade ou agenda.

## 9. Checklist operacional

A página individual mostra o snapshot do checklist da etapa, incluindo:

- progresso;
- seção;
- obrigatoriedade;
- responsável;
- início;
- conclusão;
- itens pendentes.

A Etapa 03 adiciona suporte a dispensa controlada de item obrigatório:

- exige permissão `checklists.approve`;
- exige justificativa;
- registra usuário, data, horário e motivo;
- mantém o item e seu histórico.

A conclusão do projeto é bloqueada quando existem itens obrigatórios pendentes sem dispensa válida.

## 10. Histórico

`project_history` foi ampliada, preservando as colunas existentes, com:

- `field_name`;
- `old_value`;
- `new_value`;
- `metadata`.

Foram consolidados registros de mudança de etapa, status, responsável, prazo principal, datas, miniatura, checklist, prioridade, cliente e arquivamento. A função existente `log_project_change()` foi substituída por uma versão estruturada para evitar registros paralelos e duplicados.

## 11. Permissões e RLS

As permissões da Etapa 02 foram preservadas e aplicadas às novas estruturas.

Principais regras:

- datas e miniaturas só podem ser lidas quando o usuário acessa o projeto;
- inclusão e edição exigem permissão e escopo compatíveis;
- remoção de miniatura exige `files.remove_file`;
- alteração de etapa, status e responsável passa pelo RPC `update_project_workflow`;
- Financeiro não é consultado quando o usuário não possui acesso;
- a view do Kanban usa `security_invoker = true`;
- tabelas expostas possuem RLS;
- funções privilegiadas têm execução revogada de `PUBLIC` e concedida apenas aos papéis necessários.

A relação detalhada está em `docs/ETAPA-03-POLITICAS-RLS.md`.

## 12. Componentes técnicos reaproveitados da Publicolor

Somente padrões tecnicamente compatíveis foram adaptados:

| Origem | Uso na Etapa 03 | Adaptação |
|---|---|---|
| `app/hooks/useSynchronizedKanbanScroll.ts` | sincronização das barras superior e inferior do Kanban | aplicado a projetos, sem nomes ou cores da Publicolor |
| `app/legacy-page.tsx` | padrão de atualização otimista com reversão | reimplementado em `KanbanPage.tsx` com RPC e atualização de um único card |
| `app/kanban-cards.css` e CSS legado | composição compacta, miniatura, drop target e responsividade | reconstruído nos estilos atuais usando exclusivamente tokens da Camilla |
| padrões de histórico antigos | registro de movimentação | convertido para `project_history` com valores anterior/novo e metadados |

Não foram copiados identidade visual, clientes, pedidos, setores, OPs, textos industriais ou dados da Publicolor.

## 13. Banco de dados

Esta etapa exige SQL.

Arquivos:

```text
camilla-studio-etapa-03.sql
supabase/migrations/20260716170000_camilla_stage03_projects_kanban.sql
supabase/rollback/camilla-stage03-projects-kanban-rollback.sql
supabase/validation/etapa-03-preflight.sql
supabase/validation/etapa-03-postflight.sql
supabase/validation/etapa-03-data-integrity.sql
supabase/validation/etapa-03-rls-tests.sql
```

O SQL consolidado e a migration são byte a byte idênticos.

### Ordem de aplicação

1. Fazer backup do banco e do bucket atual.
2. Executar `supabase/validation/etapa-03-preflight.sql`.
3. Executar somente `camilla-studio-etapa-03.sql`.
4. Executar `supabase/validation/etapa-03-postflight.sql`.
5. Executar `supabase/validation/etapa-03-data-integrity.sql`.
6. Executar `supabase/validation/etapa-03-rls-tests.sql` em homologação.
7. Publicar a aplicação e validar operações com cada perfil.

O SQL **não foi aplicado remotamente** durante a geração desta entrega.

## 14. Plano de reversão

O rollback é conservador. Ele:

- restaura `construction` como valor aceito quando necessário;
- reativa o catálogo da etapa Obra;
- tenta restaurar somente projetos migrados automaticamente que não tenham recebido outra mudança posterior;
- preserva históricos;
- preserva datas e miniaturas;
- não apaga objetos do Storage automaticamente;
- remove ou desativa policies e gatilhos da Etapa 03 de forma controlada.

A aplicação anterior pode ser restaurada pelo ZIP da Etapa 02. As instruções completas estão em `docs/ETAPA-03-REVERSAO.md`.

## 15. Execução local

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm test
pnpm dev
```

Variáveis públicas esperadas estão documentadas em `.env.example`. Nenhum arquivo `.env` com credenciais está incluído.

## 16. Validações realizadas

| Validação | Resultado |
|---|---|
| Instalação mantendo `pnpm-lock.yaml` | Aprovada |
| TypeScript | Zero erros |
| ESLint | Zero erros e zero avisos no código do projeto |
| Build Vite/Vinext/Nitro | Aprovado |
| Testes automatizados | 40 aprovados, 0 falhas |
| Rota `/projects/[id]` | Aprovada |
| Ausência de colisão de rotas | Aprovada |
| Parser PostgreSQL nos 7 arquivos SQL | Aprovado |
| SQL consolidado = migration | Confirmado |
| Drag and drop e rollback estrutural | Aprovado por testes automatizados |
| Formatos e limite da miniatura | Aprovado por testes automatizados |

O build apresentou apenas dois avisos internos `INEFFECTIVE_DYNAMIC_IMPORT` do Vinext. Eles não impedem a compilação e não representam erro do código da aplicação.

## 17. Erros encontrados e soluções

| Ocorrência | Solução aplicada |
|---|---|
| tipos legados ainda aceitavam Obra como etapa ativa | separação entre etapa ativa e valor histórico, com guarda de compatibilidade |
| gatilho antigo poderia gerar histórico paralelo | função `log_project_change()` consolidada e estruturada |
| atualização otimista poderia manter contadores antigos | consulta somente do projeto alterado após confirmação do RPC |
| regra de estado React gerava alerta de lint | inicialização preguiçosa e atualização controlada |
| retorno genérico de trigger de datas era inválido em PostgreSQL | ramos explícitos para INSERT, UPDATE e DELETE |
| instalação encontrou instabilidade temporária no registro de pacotes | versões e lockfile foram preservados; nenhuma atualização indiscriminada |
| risco de nova colisão de rota na Vercel | mantida uma única lista `/projects` e uma única rota dinâmica `/projects/[id]` |

## 18. Arquivos

A comparação com a base inicial está em:

```text
docs/ETAPA-03-ARQUIVOS.md
```

Os artefatos de build e dependências não integram o ZIP final.

## 19. Pendências reais

- Aplicar o SQL no ambiente autorizado do Supabase.
- Executar os testes de escrita, RLS e Storage por perfil em homologação após a aplicação.
- Validar upload e URL assinada com os limites reais do projeto Supabase.
- Executar smoke test visual no domínio publicado após o deploy.

Não existe pendência de build, tipagem, lint ou teste automatizado local.
