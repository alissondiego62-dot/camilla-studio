# Etapa 13 — Simplificação e otimização

Versão: 3.0.13

## Interface
- Miniaturas do Kanban ajustadas ao espaço do card em proporção 16:9, sem corte do conteúdo.
- Proteções contra overflow em cards, prazos, seletores e conteúdo global.
- Layout revisado para 320 px até telas amplas.
- Favicon e ícones PWA regenerados a partir da logo oficial.

## Navegação
- Página geral de Relatórios removida da navegação e das rotas.
- Página geral de Arquivos removida; anexos continuam disponíveis dentro de projetos, clientes e atividades.
- Página geral de Usuários removida; gestão disponível em Configurações > Usuários.
- Financeiro pessoal e consolidado removidos da interface; somente Financeiro profissional permanece.

## Banco
O SQL da etapa não apaga dados pessoais antigos. Ele desativa permissões do módulo financeiro pessoal, remove overrides individuais desse módulo e cria índices idempotentes para consultas operacionais.

## Validações
- Auditoria de rotas: aprovada, 28 páginas, sem colisões.
- Auditoria estrutural de acessibilidade: aprovada em 240 TSX.
- Auditoria de identidade: aprovada.
- Favicon: válido em formato ICO, derivado da logo oficial.

## Publicação
Execute o SQL uma única vez e publique o ZIP. Não execute também a migration equivalente.
