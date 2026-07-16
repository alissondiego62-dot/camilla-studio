# Testes — Etapa 04

## Automáticos

- TypeScript sem erros.
- ESLint sem erros.
- Build Vite/Vinext/Nitro aprovado.
- Rotas independentes, incluindo `/notifications` e `/history`.
- Estrutura SQL, RLS, Realtime, Storage e funções agendadas.
- Comentários, menções e exclusão lógica.
- Versionamento e metadados de arquivos.
- Indicadores individuais no Kanban.
- Ausência de colisões de rota.

## Homologação recomendada

### Notificações

- próprio autor não recebe notificação;
- destinatário recebe somente os tipos ativos;
- regra individual prevalece sobre perfil;
- marcar uma e todas como lidas;
- contador persiste após atualização;
- deduplicação diária de prazo;
- push registra sucesso ou falha.

### Comentários

- criar, responder e mencionar;
- bloquear menção sem acesso ao projeto;
- editar dentro e fora da janela;
- observação interna invisível sem permissão;
- exclusão lógica;
- contador individual de não lidos.

### Arquivos

- upload, abertura e download;
- link do Drive;
- edição de metadados;
- substituição com todas as versões;
- arquivamento;
- vínculos com projeto, cliente, atividade e financeiro;
- bloqueio de acesso cruzado.

### Histórico

- valor anterior e novo;
- autor e horário;
- financeiro pessoal protegido;
- observação interna protegida;
- tentativa de alteração direta negada.
