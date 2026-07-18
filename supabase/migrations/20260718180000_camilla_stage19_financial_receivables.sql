begin;

-- Camilla Studio 3.0.20 — Etapa 19
-- Receitas contratuais com e sem data, saldo bancário real, liquidação e exclusão segura.

-- Conta mínima para que toda baixa possa movimentar o saldo disponível.
insert into public.financial_accounts(environment,owner_user_id,name,type,institution,opening_balance,opening_balance_date,active,created_by)
select 'professional',null,'Caixa geral','cash','Camilla Studio',0,current_date,true,auth.uid()
where not exists(
  select 1 from public.financial_accounts
  where environment='professional' and archived_at is null and lower(name)=lower('Caixa geral')
);

-- Converte marcações legadas de recebido/pago em baixas reais para que componham o saldo das contas.
with default_account as (
  select id from public.financial_accounts
  where environment='professional' and archived_at is null and active=true and lower(name)=lower('Caixa geral')
  order by created_at limit 1
)
insert into public.financial_entry_payments(
  financial_entry_id,environment,account_id,payment_method_id,amount,discount_amount,interest_amount,fine_amount,net_amount,
  paid_at,document_number,notes,created_by
)
select entry.id,entry.environment,coalesce(active_account.id,default_account.id),entry.payment_method_id,entry.amount,0,0,0,entry.amount,
  coalesce(entry.settled_at,entry.updated_at,entry.created_at,now()),entry.document_number,
  concat_ws(E'\n',entry.notes,'Baixa técnica migrada pela Etapa 19 a partir do status '||entry.status||'.'),
  coalesce(entry.settled_by,entry.updated_by,entry.created_by,auth.uid())
from public.financial_entries entry
cross join default_account
left join public.financial_accounts active_account on active_account.id=entry.account_id and active_account.active=true and active_account.archived_at is null
where entry.environment='professional' and entry.entry_type in('income','expense') and entry.status in('received','paid')
  and entry.archived_at is null
  and not exists(select 1 from public.financial_entry_payments payment where payment.financial_entry_id=entry.id and payment.archived_at is null);

-- Receitas previstas vencidas passam a ser tratadas como vencidas quando ainda abertas.
-- A ordem real das colunas da view pode variar entre instalações antigas. Por isso,
-- a migration lê o catálogo do PostgreSQL e recria a view preservando exatamente
-- os nomes e a posição das colunas já existentes. Novos campos são anexados no fim.
do $stage19_rebuild_financial_balance_view$
declare
  v_view_oid regclass := to_regclass('public.financial_entry_balance_view');
  v_select_list text;
  v_sql text;
  v_unknown_column text;
  v_new_column text;
begin
  if v_view_oid is null then
    execute $create_view$
      create view public.financial_entry_balance_view with (security_invoker=true) as
      select
        balance_source.*,
        greatest(
          balance_source.amount + balance_source.adjustment_amount - balance_source.paid_amount,
          0
        )::numeric(18,2) as open_amount,
        case
          when balance_source.status='cancelled' then 'cancelled'
          when balance_source.archived_at is not null then balance_source.status
          when greatest(balance_source.amount + balance_source.adjustment_amount - balance_source.paid_amount,0)=0
            then case when balance_source.entry_type='income' then 'received' else 'paid' end
          when balance_source.paid_amount>0
            then case when balance_source.entry_type='income' then 'partially_received' else 'partially_paid' end
          when balance_source.due_date is not null
            and balance_source.due_date<current_date
            and balance_source.status not in('under_review','awaiting_approval')
            then 'overdue'
          else balance_source.status
        end as effective_status
      from (
        select
          f.*,
          coalesce((
            select sum(
              case
                when adjustment.adjustment_type in('interest','fine','correction') then adjustment.amount
                else -adjustment.amount
              end
            )
            from public.financial_entry_adjustments adjustment
            where adjustment.financial_entry_id=f.id
              and adjustment.archived_at is null
          ),0)::numeric(18,2) as adjustment_amount,
          case
            when f.status in('paid','received')
              and not exists(
                select 1
                from public.financial_entry_payments payment
                where payment.financial_entry_id=f.id
                  and payment.archived_at is null
              )
              then f.amount
            else coalesce((
              select sum(payment.net_amount)
              from public.financial_entry_payments payment
              where payment.financial_entry_id=f.id
                and payment.archived_at is null
            ),0)
          end::numeric(18,2) as paid_amount
        from public.financial_entries f
      ) balance_source
    $create_view$;
    return;
  end if;

  -- Interrompe com uma mensagem objetiva caso uma instalação possua alguma
  -- coluna calculada personalizada que esta migration não saiba reconstruir.
  select view_column.attname
    into v_unknown_column
  from pg_attribute view_column
  where view_column.attrelid=v_view_oid
    and view_column.attnum>0
    and not view_column.attisdropped
    and view_column.attname not in('adjustment_amount','paid_amount','open_amount','effective_status')
    and not exists(
      select 1
      from pg_attribute table_column
      where table_column.attrelid='public.financial_entries'::regclass
        and table_column.attnum>0
        and not table_column.attisdropped
        and table_column.attname=view_column.attname
    )
  order by view_column.attnum
  limit 1;

  if v_unknown_column is not null then
    raise exception 'A view financial_entry_balance_view possui a coluna personalizada "%". Revise essa coluna antes de executar a Etapa 19.',v_unknown_column;
  end if;

  select string_agg(
    case
      when view_column.attname='adjustment_amount'
        then 'balance_source.adjustment_amount as adjustment_amount'
      when view_column.attname='paid_amount'
        then 'balance_source.paid_amount as paid_amount'
      when view_column.attname='open_amount'
        then 'greatest(balance_source.amount + balance_source.adjustment_amount - balance_source.paid_amount,0)::numeric(18,2) as open_amount'
      when view_column.attname='effective_status'
        then $expression$
          case
            when balance_source.status='cancelled' then 'cancelled'
            when balance_source.archived_at is not null then balance_source.status
            when greatest(balance_source.amount + balance_source.adjustment_amount - balance_source.paid_amount,0)=0
              then case when balance_source.entry_type='income' then 'received' else 'paid' end
            when balance_source.paid_amount>0
              then case when balance_source.entry_type='income' then 'partially_received' else 'partially_paid' end
            when balance_source.due_date is not null
              and balance_source.due_date<current_date
              and balance_source.status not in('under_review','awaiting_approval')
              then 'overdue'
            else balance_source.status
          end as effective_status
        $expression$
      else format('balance_source.%I',view_column.attname)
    end,
    E',\n  '
    order by view_column.attnum
  )
  into v_select_list
  from pg_attribute view_column
  where view_column.attrelid=v_view_oid
    and view_column.attnum>0
    and not view_column.attisdropped;

  -- Os campos de auditoria foram adicionados após a criação original da view.
  -- Eles só são anexados ao fim, evitando qualquer tentativa de renomear colunas.
  foreach v_new_column in array array['deletion_reason','deleted_at','deleted_by']
  loop
    if exists(
      select 1
      from pg_attribute table_column
      where table_column.attrelid='public.financial_entries'::regclass
        and table_column.attnum>0
        and not table_column.attisdropped
        and table_column.attname=v_new_column
    ) and not exists(
      select 1
      from pg_attribute view_column
      where view_column.attrelid=v_view_oid
        and view_column.attnum>0
        and not view_column.attisdropped
        and view_column.attname=v_new_column
    ) then
      v_select_list:=v_select_list||format(E',\n  balance_source.%I',v_new_column);
    end if;
  end loop;

  v_sql:=format($replace_view$
    create or replace view public.financial_entry_balance_view with (security_invoker=true) as
    select
      %s
    from (
      select
        f.*,
        coalesce((
          select sum(
            case
              when adjustment.adjustment_type in('interest','fine','correction') then adjustment.amount
              else -adjustment.amount
            end
          )
          from public.financial_entry_adjustments adjustment
          where adjustment.financial_entry_id=f.id
            and adjustment.archived_at is null
        ),0)::numeric(18,2) as adjustment_amount,
        case
          when f.status in('paid','received')
            and not exists(
              select 1
              from public.financial_entry_payments payment
              where payment.financial_entry_id=f.id
                and payment.archived_at is null
            )
            then f.amount
          else coalesce((
            select sum(payment.net_amount)
            from public.financial_entry_payments payment
            where payment.financial_entry_id=f.id
              and payment.archived_at is null
          ),0)
        end::numeric(18,2) as paid_amount
      from public.financial_entries f
    ) balance_source
  $replace_view$,v_select_list);

  execute v_sql;
end
$stage19_rebuild_financial_balance_view$;

create or replace function public.refresh_financial_entry_status(p_entry_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.financial_entries%rowtype; paid numeric; adjusted numeric; open_value numeric;
begin
  select * into e from public.financial_entries where id=p_entry_id;
  if not found or e.status='cancelled' then return; end if;
  select coalesce(sum(net_amount),0) into paid from public.financial_entry_payments where financial_entry_id=p_entry_id and archived_at is null;
  select coalesce(sum(case when adjustment_type in('interest','fine','correction') then amount else -amount end),0) into adjusted from public.financial_entry_adjustments where financial_entry_id=p_entry_id and archived_at is null;
  open_value:=greatest(e.amount+adjusted-paid,0);
  update public.financial_entries set
    status=case
      when open_value=0 then case when e.entry_type='income' then 'received' else 'paid' end
      when paid>0 then case when e.entry_type='income' then 'partially_received' else 'partially_paid' end
      when e.due_date is not null and e.due_date<current_date and e.status not in('under_review','awaiting_approval') then 'overdue'
      else case when e.status in('paid','received','partially_paid','partially_received','overdue') then 'forecast' else e.status end
    end,
    settled_at=case when open_value=0 then coalesce(e.settled_at,now()) else null end,
    settled_by=case when open_value=0 then coalesce(e.settled_by,auth.uid()) else null end
  where id=p_entry_id;
end $$;

-- Exclusão lógica somente de lançamentos sem baixa. Recebimentos exigem estorno.
create or replace function public.remove_financial_entry(p_entry_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_entry public.financial_entries%rowtype;
begin
  if nullif(trim(p_reason),'') is null or length(trim(p_reason))<3 then raise exception 'Informe um motivo válido para a exclusão.'; end if;
  select * into v_entry from public.financial_entries where id=p_entry_id for update;
  if not found then raise exception 'Registro financeiro não encontrado.'; end if;
  if v_entry.archived_at is not null then raise exception 'O registro financeiro já foi removido.'; end if;
  if not public.can_access_financial_entry(p_entry_id,'archive') then raise exception 'Sem permissão para excluir o registro financeiro.'; end if;
  if exists(select 1 from public.financial_entry_payments where financial_entry_id=p_entry_id and archived_at is null) then
    raise exception 'Este lançamento possui baixa. Estorne o recebimento ou pagamento antes de excluí-lo.';
  end if;
  update public.financial_entries set archived_at=now(),archived_by=auth.uid(),deleted_at=now(),deleted_by=auth.uid(),deletion_reason=trim(p_reason),updated_at=now(),updated_by=auth.uid() where id=p_entry_id;
  insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata)
  values('financial_entry_removed',auth.uid(),'financial_entry',p_entry_id::text,true,jsonb_build_object('reason',trim(p_reason),'amount',v_entry.amount,'project_id',v_entry.project_id,'description',v_entry.description,'environment',v_entry.environment));
end $$;

-- Resumo contratual: o saldo não distribuído em parcelas é receita prevista sem data.
create or replace function public.get_project_financial_summary(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if not public.is_financial_administrator() then raise exception 'Informações financeiras restritas ao nível administrador.'; end if;
  if not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  with totals as (
    select
      coalesce(sum(entry.paid_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled'),0)::numeric(18,2) received_from_entries,
      coalesce(sum(entry.open_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled'),0)::numeric(18,2) open_total,
      coalesce(sum(entry.open_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled' and entry.due_date is not null),0)::numeric(18,2) open_dated,
      count(*) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled')::integer active_income_entries,
      coalesce(sum(entry.open_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled' and entry.effective_status='overdue'),0)::numeric(18,2) overdue_amount,
      min(entry.due_date) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled' and entry.open_amount>0 and entry.due_date is not null) next_due_date
    from public.financial_entry_balance_view entry where entry.project_id=p_project_id and entry.environment='professional'
  ), position as (
    select project.id,project.code,project.name,project.client_id,client.name client_name,
      coalesce(contract.contract_value,0)::numeric(18,2) contract_value,
      coalesce(contract.legacy_amount_received,0)::numeric(18,2) legacy_amount_received,
      totals.*,
      greatest(coalesce(contract.legacy_amount_received,0),totals.received_from_entries)::numeric(18,2) amount_received
    from public.projects project
    left join public.clients client on client.id=project.client_id
    left join public.project_contract_financials contract on contract.project_id=project.id
    cross join totals where project.id=p_project_id
  ), calculated as (
    select *,greatest(contract_value-amount_received,open_total,0)::numeric(18,2) balance_due from position
  )
  select jsonb_build_object(
    'project_id',id,'project_code',code,'project_name',name,'client_id',client_id,'client_name',client_name,
    'contract_value',contract_value,'legacy_amount_received',legacy_amount_received,'received_from_entries',received_from_entries,
    'amount_received',amount_received,'balance_due',balance_due,
    'receivable_dated',least(open_dated,balance_due),
    'receivable_undated',greatest(balance_due-least(open_dated,balance_due),0),
    'active_income_entries',active_income_entries,'overdue_amount',overdue_amount,'next_due_date',next_due_date
  ) into result from calculated;
  if result is null then raise exception 'Projeto não encontrado.'; end if;
  return result;
end $$;

create or replace function public.list_project_financial_summaries()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.is_financial_administrator() then raise exception 'Informações financeiras restritas ao nível administrador.'; end if;
  return coalesce((
    with entry_totals as (
      select entry.project_id,
        coalesce(sum(entry.paid_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled'),0)::numeric(18,2) received_from_entries,
        coalesce(sum(entry.open_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled'),0)::numeric(18,2) open_total,
        coalesce(sum(entry.open_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled' and entry.due_date is not null),0)::numeric(18,2) open_dated,
        count(*) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled')::integer active_income_entries,
        coalesce(sum(entry.open_amount) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled' and entry.effective_status='overdue'),0)::numeric(18,2) overdue_amount,
        min(entry.due_date) filter(where entry.entry_type='income' and entry.archived_at is null and entry.status<>'cancelled' and entry.open_amount>0 and entry.due_date is not null) next_due_date
      from public.financial_entry_balance_view entry
      where entry.environment='professional' and entry.project_id is not null group by entry.project_id
    ), positions as (
      select project.id project_id,project.code project_code,project.name project_name,project.client_id,client.name client_name,
        coalesce(contract.contract_value,0)::numeric(18,2) contract_value,
        coalesce(contract.legacy_amount_received,0)::numeric(18,2) legacy_amount_received,
        coalesce(totals.received_from_entries,0)::numeric(18,2) received_from_entries,
        coalesce(totals.open_total,0)::numeric(18,2) open_total,
        coalesce(totals.open_dated,0)::numeric(18,2) open_dated,
        coalesce(totals.active_income_entries,0)::integer active_income_entries,
        coalesce(totals.overdue_amount,0)::numeric(18,2) overdue_amount,totals.next_due_date,
        greatest(coalesce(contract.legacy_amount_received,0),coalesce(totals.received_from_entries,0))::numeric(18,2) amount_received
      from public.projects project
      left join public.clients client on client.id=project.client_id
      left join public.project_contract_financials contract on contract.project_id=project.id
      left join entry_totals totals on totals.project_id=project.id
      where project.archived_at is null and public.can_access_project(project.id)
    ), calculated as (
      select *,greatest(contract_value-amount_received,open_total,0)::numeric(18,2) balance_due from positions
    )
    select jsonb_agg(jsonb_build_object(
      'project_id',project_id,'project_code',project_code,'project_name',project_name,'client_id',client_id,'client_name',client_name,
      'contract_value',contract_value,'legacy_amount_received',legacy_amount_received,'received_from_entries',received_from_entries,
      'amount_received',amount_received,'balance_due',balance_due,
      'receivable_dated',least(open_dated,balance_due),
      'receivable_undated',greatest(balance_due-least(open_dated,balance_due),0),
      'active_income_entries',active_income_entries,'overdue_amount',overdue_amount,'next_due_date',next_due_date
    ) order by project_code) from calculated
  ),'[]'::jsonb);
end $$;

create or replace function public.get_project_financial_entries(p_project_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  if not public.can_access_finance_environment('professional',null,'view_values') then raise exception 'Sem permissão para visualizar valores.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',entry.id,'project_id',entry.project_id,'entry_type',entry.entry_type,'description',entry.description,
    'amount',entry.amount,'paid_amount',entry.paid_amount,'open_amount',entry.open_amount,
    'competence_date',entry.competence_date,'due_date',entry.due_date,'status',entry.effective_status,
    'account_id',entry.account_id,'payment_method_id',entry.payment_method_id,
    'notes',entry.notes,'created_at',entry.created_at
  ) order by entry.due_date asc nulls last,entry.competence_date desc,entry.created_at desc)
  from public.financial_entry_balance_view entry
  where entry.project_id=p_project_id and entry.environment='professional' and entry.archived_at is null and entry.status<>'cancelled'),'[]'::jsonb);
end $$;

-- Lançamentos reais sem data continuam visíveis nas páginas Receitas e Contas a receber.
create or replace function public.list_undated_financial_entries(p_environment text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare include_values boolean;
begin
  if p_environment not in('personal','professional','consolidated') then raise exception 'Ambiente financeiro inválido.'; end if;
  include_values:=case when p_environment='consolidated' then public.can_access_finance_environment('professional',null,'view_values') and public.can_access_finance_environment('personal',auth.uid(),'view_values') else public.can_access_finance_environment(p_environment,case when p_environment='personal' then auth.uid() else null end,'view_values') end;
  return coalesce((select jsonb_agg(public.finance_entry_json(entry.id,include_values) order by entry.competence_date desc,entry.created_at desc)
    from public.financial_entry_balance_view entry
    where entry.entry_type='income' and entry.open_amount>0 and entry.due_date is null and entry.archived_at is null and entry.status<>'cancelled'
      and public.can_access_finance_environment(entry.environment,entry.owner_user_id,'view')
      and (p_environment='consolidated' or entry.environment=p_environment)),'[]'::jsonb);
end $$;

-- Métricas corrigidas: saldo bancário real, baixas pelo dia do pagamento e posição contratual completa.
create or replace function public.get_finance_dashboard_metrics(p_environment text,p_start_date date default null,p_end_date date default null)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  v_current numeric:=0; v_realized_income numeric:=0; v_realized_expense numeric:=0;
  v_receivable numeric:=0; v_dated numeric:=0; v_undated numeric:=0;
  v_payable numeric:=0; v_overdue numeric:=0; v_expected_income numeric:=0; v_expected_expense numeric:=0;
begin
  if p_environment not in('personal','professional','consolidated') then raise exception 'Ambiente financeiro inválido.'; end if;
  if p_environment='professional' and not public.can_access_finance_environment('professional',null,'view_values') then raise exception 'Sem permissão para visualizar valores financeiros.'; end if;

  select coalesce(sum(account.current_balance),0) into v_current
  from public.financial_account_balance_view account
  where account.archived_at is null and account.active=true
    and public.can_access_finance_environment(account.environment,account.owner_user_id,'view_values')
    and (p_environment='consolidated' or account.environment=p_environment);

  select
    coalesce(sum(payment.net_amount) filter(where entry.entry_type='income'),0),
    coalesce(sum(payment.net_amount) filter(where entry.entry_type='expense'),0)
  into v_realized_income,v_realized_expense
  from public.financial_entry_payments payment
  join public.financial_entries entry on entry.id=payment.financial_entry_id
  where payment.archived_at is null and entry.archived_at is null and entry.status<>'cancelled'
    and public.can_access_finance_environment(entry.environment,entry.owner_user_id,'view_values')
    and (p_environment='consolidated' or entry.environment=p_environment)
    and (p_start_date is null or payment.paid_at::date>=p_start_date)
    and (p_end_date is null or payment.paid_at::date<=p_end_date);

  select
    coalesce(sum(entry.open_amount) filter(where entry.entry_type='expense'),0),
    coalesce(sum(entry.open_amount) filter(where entry.effective_status='overdue'),0),
    coalesce(sum(entry.open_amount) filter(where entry.entry_type='expense' and (coalesce(entry.due_date,entry.competence_date) between coalesce(p_start_date,'0001-01-01'::date) and coalesce(p_end_date,'9999-12-31'::date))),0)
  into v_payable,v_overdue,v_expected_expense
  from public.financial_entry_balance_view entry
  where entry.archived_at is null and entry.status<>'cancelled'
    and public.can_access_finance_environment(entry.environment,entry.owner_user_id,'view_values')
    and (p_environment='consolidated' or entry.environment=p_environment);

  if p_environment in('professional','consolidated') then
    with entry_totals as (
      select entry.project_id,
        coalesce(sum(entry.paid_amount),0)::numeric received,
        coalesce(sum(entry.open_amount),0)::numeric open_total,
        coalesce(sum(entry.open_amount) filter(where entry.due_date is not null),0)::numeric open_dated,
        coalesce(sum(entry.open_amount) filter(where entry.due_date is not null and entry.due_date between coalesce(p_start_date,'0001-01-01'::date) and coalesce(p_end_date,'9999-12-31'::date)),0)::numeric dated_period
      from public.financial_entry_balance_view entry
      where entry.environment='professional' and entry.entry_type='income' and entry.project_id is not null and entry.archived_at is null and entry.status<>'cancelled'
      group by entry.project_id
    ), project_positions as (
      select project.id,
        greatest(coalesce(contract.contract_value,0)-greatest(coalesce(contract.legacy_amount_received,0),coalesce(totals.received,0)),coalesce(totals.open_total,0),0)::numeric balance,
        coalesce(totals.open_dated,0)::numeric dated,
        coalesce(totals.dated_period,0)::numeric dated_period
      from public.projects project
      left join public.project_contract_financials contract on contract.project_id=project.id
      left join entry_totals totals on totals.project_id=project.id
      where project.archived_at is null and public.can_access_project(project.id)
    ), project_sums as (
      select coalesce(sum(balance),0) total,coalesce(sum(least(dated,balance)),0) dated,
        coalesce(sum(greatest(balance-least(dated,balance),0)),0) undated,
        coalesce(sum(least(dated_period,balance)),0) dated_period from project_positions
    ), unlinked as (
      select coalesce(sum(open_amount),0) total,
        coalesce(sum(open_amount) filter(where due_date is not null),0) dated,
        coalesce(sum(open_amount) filter(where due_date is null),0) undated,
        coalesce(sum(open_amount) filter(where due_date is not null and due_date between coalesce(p_start_date,'0001-01-01'::date) and coalesce(p_end_date,'9999-12-31'::date)),0) dated_period
      from public.financial_entry_balance_view
      where environment='professional' and entry_type='income' and project_id is null and archived_at is null and status<>'cancelled'
    )
    select projects.total+unlinked.total,projects.dated+unlinked.dated,projects.undated+unlinked.undated,
      projects.undated+unlinked.undated+projects.dated_period+unlinked.dated_period
    into v_receivable,v_dated,v_undated,v_expected_income from project_sums projects cross join unlinked;
  else
    select coalesce(sum(open_amount),0),coalesce(sum(open_amount) filter(where due_date is not null),0),coalesce(sum(open_amount) filter(where due_date is null),0),
      coalesce(sum(open_amount) filter(where due_date is null or due_date between coalesce(p_start_date,'0001-01-01'::date) and coalesce(p_end_date,'9999-12-31'::date)),0)
    into v_receivable,v_dated,v_undated,v_expected_income
    from public.financial_entry_balance_view
    where environment='personal' and owner_user_id=auth.uid() and entry_type='income' and archived_at is null and status<>'cancelled';
  end if;

  return jsonb_build_object(
    'current_balance',to_char(v_current,'FM999999999999990D00'),
    'expected_income',to_char(v_expected_income,'FM999999999999990D00'),
    'realized_income',to_char(v_realized_income,'FM999999999999990D00'),
    'expected_expense',to_char(v_expected_expense,'FM999999999999990D00'),
    'realized_expense',to_char(v_realized_expense,'FM999999999999990D00'),
    'net_result',to_char(v_realized_income-v_realized_expense,'FM999999999999990D00'),
    'receivable',to_char(v_receivable,'FM999999999999990D00'),
    'receivable_dated',to_char(v_dated,'FM999999999999990D00'),
    'receivable_undated',to_char(v_undated,'FM999999999999990D00'),
    'payable',to_char(v_payable,'FM999999999999990D00'),
    'overdue',to_char(v_overdue,'FM999999999999990D00'),
    'projected_balance',to_char(v_current+v_expected_income-v_expected_expense,'FM999999999999990D00'),
    'previous_period_result','0.00','result_change_percent',null
  );
end $$;

-- Permite receber diretamente o saldo contratual ainda não transformado em parcela.
create or replace function public.settle_project_receivable(p_project_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare summary jsonb; balance_value numeric; open_entries_value numeric; available_value numeric; amount_value numeric; entry_id uuid; project_row public.projects%rowtype; category_id_value uuid;
begin
  if not public.is_financial_administrator() or not public.can_access_finance_environment('professional',null,'settle') then raise exception 'Sem permissão para registrar recebimentos.'; end if;
  if not public.can_access_project(p_project_id) then raise exception 'Sem acesso ao projeto.'; end if;
  select * into project_row from public.projects where id=p_project_id;
  summary:=public.get_project_financial_summary(p_project_id);
  balance_value:=coalesce((summary->>'balance_due')::numeric,0);
  select coalesce(sum(open_amount),0) into open_entries_value
  from public.financial_entry_balance_view
  where project_id=p_project_id and environment='professional' and entry_type='income' and archived_at is null and status<>'cancelled';
  available_value:=greatest(balance_value-open_entries_value,0);
  amount_value:=round(coalesce(nullif(p_payload->>'amount','')::numeric,0),2);
  if amount_value<=0 then raise exception 'O valor recebido deve ser positivo.'; end if;
  if available_value<=0 then raise exception 'Todo o saldo contratual já está distribuído em lançamentos. Liquide a parcela correspondente.'; end if;
  if amount_value>available_value then raise exception 'O recebimento direto não pode exceder o saldo sem parcela de %.',to_char(available_value,'FM999999999990D00'); end if;
  if public.safe_uuid(p_payload->>'account_id') is null then raise exception 'Selecione a conta de entrada.'; end if;
  select id into category_id_value from public.financial_categories where environment='professional' and entry_type='income' and archived_at is null and code='project_income' order by created_at limit 1;
  insert into public.financial_entries(environment,owner_user_id,entry_type,description,amount,competence_date,due_date,status,category_id,account_id,client_id,project_id,payment_method_id,document_number,notes,created_by,updated_by)
  values('professional',null,'income',coalesce(nullif(trim(p_payload->>'description'),''),'Recebimento — '||project_row.name),amount_value,coalesce((p_payload->>'paid_at')::timestamptz,now())::date,coalesce((p_payload->>'paid_at')::timestamptz,now())::date,'pending',category_id_value,public.safe_uuid(p_payload->>'account_id'),project_row.client_id,p_project_id,public.safe_uuid(p_payload->>'payment_method_id'),nullif(trim(p_payload->>'document_number'),''),nullif(trim(p_payload->>'notes'),''),auth.uid(),auth.uid()) returning id into entry_id;
  return public.settle_financial_entry(entry_id,p_payload);
end $$;

revoke all on function public.get_finance_dashboard_metrics(text,date,date) from public,anon;
revoke all on function public.list_undated_financial_entries(text) from public,anon;
revoke all on function public.settle_project_receivable(uuid,jsonb) from public,anon;
revoke all on function public.get_project_financial_summary(uuid) from public,anon;
revoke all on function public.list_project_financial_summaries() from public,anon;
revoke all on function public.get_project_financial_entries(uuid) from public,anon;
revoke all on function public.remove_financial_entry(uuid,text) from public,anon;
grant execute on function public.get_finance_dashboard_metrics(text,date,date) to authenticated;
grant execute on function public.list_undated_financial_entries(text) to authenticated;
grant execute on function public.settle_project_receivable(uuid,jsonb) to authenticated;
grant execute on function public.get_project_financial_summary(uuid) to authenticated;
grant execute on function public.list_project_financial_summaries() to authenticated;
grant execute on function public.get_project_financial_entries(uuid) to authenticated;
grant execute on function public.remove_financial_entry(uuid,text) to authenticated;

insert into public.system_versions(version,notes,environment)
values('3.0.20','Etapa 19: receitas previstas sem data, separação do contas a receber com e sem vencimento, saldo bancário real, recebimentos no período, liquidação dentro do projeto e exclusão financeira segura.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
