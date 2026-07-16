-- Etapa 06 — prevenção de duplicidade
-- Deve retornar zero em todas as linhas.
select 'item_key_repetida' as teste,count(*) as falhas from (select item_key from public.agenda_items group by item_key having count(*)>1) x
union all
select 'atividade_repetida',count(*) from (select source_id from public.agenda_items where source_type='activity' group by source_id having count(*)>1) x
union all
select 'prazo_repetido',count(*) from (select source_id from public.agenda_items where source_type='project_date' group by source_id having count(*)>1) x
union all
select 'evento_repetido',count(*) from (select source_id from public.agenda_items where source_type='event' group by source_id having count(*)>1) x;
