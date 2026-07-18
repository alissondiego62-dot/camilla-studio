# Checklist final — Etapa 10

Legenda: **Implementado**, **Validado**, **Não aplicável** ou **Bloqueado tecnicamente**.

| Requisito | Situação | Evidência |
|---|---|---|
| Base no ZIP da Etapa 09 | Validado | SHA-256 registrado no relatório final |
| Preservação dos dados e UUIDs | Validado | Migration aditiva, sem recriação de registros |
| Monitor grande, desktop, notebook, tablet e celulares | Validado | Baseline 320–2560 px e auditoria estrutural responsiva |
| Menu recolhível em telas pequenas | Implementado | `StudioShell` e `responsive.css` |
| Tabelas adaptadas para celular | Implementado | transformação para cards e wrappers de overflow |
| Modais e drawers dentro do viewport | Implementado | `dvh`, rolagem interna e foco preso |
| Agenda utilizável no celular | Validado | estilos Dia/Semana/Mês preservados e reforçados |
| Separação Pessoal/Profissional | Validado | serviços e RLS das Etapas 08/09 preservados |
| Contraste e foco visível | Implementado | tokens Camilla, `:focus-visible` e auditoria |
| Navegação por teclado | Implementado | skip link, focus trap, Esc e retorno de foco |
| Rótulos e campos obrigatórios | Implementado | `FormField`/`SelectField` com ARIA |
| Ícones com nome acessível | Validado | auditoria automática de botões de ícone |
| Status não dependente apenas de cor | Validado | textos e badges legíveis mantidos |
| Carregamento somente do necessário | Implementado | colunas explícitas e abas sob demanda preservadas |
| Paginação de listas extensas | Implementado | histórico progressivo e paginações existentes |
| Atualização localizada | Validado | reducers e serviços das etapas anteriores preservados |
| Precisão financeira | Validado | `numeric(18,2)` no banco |
| RLS em tabelas públicas | Validado | 72/72 tabelas públicas com RLS na auditoria inicial |
| Hardening de SECURITY DEFINER | Implementado | SQL final revoga `PUBLIC` e `anon` |
| Índices operacionais | Implementado | índices `idx_stage10_*` |
| Duplicidades e órfãos | Validado | scripts de integridade com resultado esperado zero |
| Login, usuários e permissões | Validado | build, rotas e suíte de regressão |
| Projetos, Kanban e drag-and-drop | Validado | testes estruturais das Etapas 03 e 10 |
| Atividades e cinco visualizações | Validado | testes das Etapas 05 e 10 |
| Agenda Dia/Semana/Mês | Validado | testes das Etapas 06 e 10 |
| Clientes e ficha completa | Validado | testes da Etapa 07 |
| Financeiro completo | Validado | testes da Etapa 08 e precisão final |
| Dashboard e relatórios | Validado | testes da Etapa 09 |
| Google Drive sem credenciais no cliente | Validado | Edge Functions e schema privado preservados |
| Paleta Camilla | Validado | `#5E3021`, `#9B6352`, `#D3C0BD`, `#EFEAE7` |
| Cor R = 239 | Validado | `#EFEAE7` |
| Ausência de R = 293 | Validado | auditoria automática |
| Ausência de identidade ativa da Publicolor | Validado | arquivos legados removidos e auditoria automática |
| Build | Validado | Vite/Vinext/Nitro |
| Tipagem | Validado | TypeScript sem erros |
| Lint | Validado | ESLint sem erros |
| Testes com conta real e OAuth real | Bloqueado tecnicamente | dependem de credenciais e usuários de homologação; scripts e roteiro entregues |
