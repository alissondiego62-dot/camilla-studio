-- Execute antes do hotfix.
select exists(select 1 from public.system_versions where version='3.0.17') as etapa_17_aplicada;
select count(*) as projetos_ativos from public.projects where archived_at is null;
select
  coalesce(sum(contract_value),0) as contratos_a_preservar,
  coalesce(sum(amount_received),0) as recebido_a_preservar,
  coalesce(sum(greatest(contract_value-amount_received,0)),0) as saldo_a_preservar
from public.projects
where archived_at is null;
select p.name,p.email,pp.code as perfil
from public.profiles p
join public.permission_profiles pp on pp.id=p.permission_profile_id
where p.active=true and p.archived_at is null and pp.code in('administrator','owner')
order by p.name;
