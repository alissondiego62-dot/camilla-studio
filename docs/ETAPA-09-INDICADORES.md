# Etapa 09 — Indicadores do Dashboard

O Dashboard é montado por `get_dashboard_workspace(jsonb)` e respeita o escopo do usuário no banco.

## Projetos
- ativos;
- atrasados;
- próximos do prazo;
- concluídos no período;
- distribuição por etapa;
- distribuição por responsável.

## Atividades
- abertas;
- do dia;
- atrasadas;
- da semana;
- concluídas no período;
- distribuição por status;
- distribuição por responsável.

## Agenda e clientes
- agenda do dia;
- próximos compromissos;
- clientes com movimentação recente;
- pendências operacionais e checklists obrigatórios.

## Novidades
- comentários não visualizados;
- arquivos não visualizados;
- notificações não lidas.

## Financeiro
Somente quando o banco confirma `dashboard.view_financial` e acesso aos valores profissionais:
- receitas;
- despesas;
- resultado;
- contas a receber;
- contas a pagar;
- vencidos;
- próximos vencimentos;
- série de receitas versus despesas.

Nenhum valor financeiro é retornado para usuários sem autorização.
