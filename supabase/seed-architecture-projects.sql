-- Execute após a migration 20260716010000_architecture_platform.sql.
begin;

insert into public.clients(name) values
('Victor Bisneto'),('Marciano'),('Horacio'),('Aline/Mac'),('Aline'),('Julio'),('Lucas Cesar'),('Cleonice'),('Matheus'),('Adrielly'),('Angelita'),('João'),('Thiago'),('Ivan'),('Monte Sinai'),('Julia')
on conflict do nothing;

insert into public.projects(code,client_id,name,project_type,subtype,stage,status,priority,responsible_name,deadline_stage_1,deadline_stage_2,deadline_stage_3,contract_value,amount_received)
select v.code,c.id,v.name,v.project_type,v.subtype,v.stage,v.status,v.priority,v.responsible_name,v.d1,v.d2,v.d3,v.contract_value,v.amount_received
from (values
('ARQ-001','Victor Bisneto','Projeto Victor Bisneto','Arquitetura','Reforma','creation','in_progress','high',null,'2026-07-14'::date,'2026-07-17'::date,'2026-07-22'::date,0::numeric,0::numeric),
('INT-002','Marciano','Interiores Marciano','Interiores','Novo','creation','in_progress','normal',null,null,'2026-07-15'::date,'2026-07-30'::date,9850,4925),
('ARQ-003','Horacio','Projeto Horacio','Arquitetura','Reforma','executive','not_started','normal',null,null,null,'2026-07-20'::date,3700,1850),
('INT-004','Aline/Mac','Interiores Aline/Mac','Interiores','Novo','creation','not_started','normal',null,null,'2026-07-14'::date,'2026-07-23'::date,1500,750),
('INT-005','Aline','Interiores Aline','Interiores','Novo','adjustments','in_progress','high',null,null,'2026-07-13'::date,'2026-07-20'::date,1500,1500),
('ARQ-006','Julio','Projeto MCMV Julio','Arquitetura','MCMV','executive','not_started','normal',null,null,null,'2026-07-24'::date,3000,3000),
('INT-007','Lucas Cesar','Interiores Lucas Cesar','Interiores','Novo','executive','waiting','normal',null,null,null,null,10000,10000),
('ARQ-008','Cleonice','Projeto MCMV Cleonice','Arquitetura','MCMV','executive','not_started','normal',null,null,null,'2026-07-24'::date,3000,3000),
('INT-009','Matheus','Interiores Matheus','Interiores','Novo','executive','not_started','normal',null,null,null,'2026-07-20'::date,1800,1800),
('MIX-010','Adrielly','Arquitetura e Interiores Adrielly','Arquitetura e Interiores','Novo','executive','in_progress','high','Aldair',null,null,'2026-07-22'::date,3600,2600),
('INT-011','Angelita','Interiores Angelita','Interiores','Novo','adjustments','waiting','normal',null,null,null,null,5500,5500),
('ARQ-012','João','Projeto João','Arquitetura','Novo','creation','not_started','normal','Silvia',null,null,'2026-03-04'::date,0,0),
('RET-013','Thiago','Retificação Thiago','Retificação','Pontos georreferenciados','creation','in_progress','normal',null,null,null,'2026-07-15'::date,600,0),
('DES-014','Ivan','Desdobramento Ivan','Desdobramento',null,'executive','correction','high','Silvia',null,null,'2026-07-13'::date,600,0),
('LOT-015','Monte Sinai','Loteamento Monte Sinai','Loteamento','Loteamento','executive','waiting','normal',null,null,null,null,25000,25000),
('INT-016','Julia','Interiores Julia','Interiores','Novo','creation','not_started','normal',null,null,null,null,0,0)
) as v(code,client_name,name,project_type,subtype,stage,status,priority,responsible_name,d1,d2,d3,contract_value,amount_received)
join public.clients c on lower(c.name)=lower(v.client_name)
on conflict (code) do nothing;

commit;
