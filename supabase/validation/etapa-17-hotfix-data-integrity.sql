select
  (select count(*) from public.projects) as projetos,
  (select count(*) from public.project_contract_financials) as registros_contratuais;
select
  coalesce(sum(contract_value),0) as contratos,
  coalesce(sum(legacy_amount_received),0) as recebido_preservado,
  coalesce(sum(greatest(contract_value-legacy_amount_received,0)),0) as saldo_preservado
from public.project_contract_financials;
select count(*) as contratos_negativos
from public.project_contract_financials
where contract_value<0 or legacy_amount_received<0;
