# Etapa 03 — Datas planejadas

## Estrutura

A tabela `project_dates` armazena várias datas por projeto com:

- finalidade configurável;
- título e descrição;
- início e fim com horário;
- indicador de dia inteiro;
- situação;
- conclusão;
- prazo principal;
- atividade relacionada;
- evento da agenda relacionado;
- criação, atualização e arquivamento lógico.

## Finalidades iniciais

- Estudo preliminar;
- Anteprojeto;
- Projeto executivo;
- Apresentação;
- Aprovação;
- Entrega parcial;
- Entrega final;
- Reunião;
- Visita;
- Outra finalidade.

As finalidades usam `system_categories` com o módulo `project_date_type`, permitindo novos tipos sem alteração estrutural do banco.

## Prazo principal

Um índice único parcial impede mais de um prazo principal ativo no mesmo projeto. A função `save_project_date` troca o prazo dentro de uma transação e sincroniza `projects.main_deadline` para compatibilidade.

Os campos legados `main_deadline`, `deadline_stage_1`, `deadline_stage_2` e `deadline_stage_3` são copiados para `project_dates` sem duplicação. Os campos originais não são removidos.

## Fuso

Datas e horários são tratados em `America/Boa_Vista`, com interface em `pt-BR` e relógio de 24 horas.
