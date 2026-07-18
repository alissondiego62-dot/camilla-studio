begin;

-- Camilla Studio 3.0.21 — Etapa 19.1
-- Hotfix isolado para bancos que já concluíram a Etapa 19.
-- Permite cancelar receitas recebidas e despesas pagas com estorno atômico das baixas.

create or replace function public.cancel_financial_entry(p_entry_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_entry public.financial_entries%rowtype;
  v_reason text:=trim(coalesce(p_reason,''));
  v_payment_count integer:=0;
  v_payment_total numeric:=0;
begin
  select * into v_entry from public.financial_entries where id=p_entry_id for update;
  if not found then raise exception 'Lançamento financeiro não encontrado.'; end if;
  if v_entry.status='cancelled' then raise exception 'Este lançamento já está cancelado.'; end if;
  if not public.can_access_financial_entry(p_entry_id,'cancel_entry') then raise exception 'Sem permissão para cancelar.'; end if;
  if length(v_reason)<5 then raise exception 'Informe o motivo do cancelamento com pelo menos 5 caracteres.'; end if;

  select count(*),coalesce(sum(net_amount),0)
    into v_payment_count,v_payment_total
  from public.financial_entry_payments
  where financial_entry_id=p_entry_id and archived_at is null;

  if v_payment_count>0 then
    if not public.can_access_finance_environment(v_entry.environment,v_entry.owner_user_id,'settle') then
      raise exception 'Este lançamento possui baixa. É necessária permissão para estornar antes de cancelar.';
    end if;

    update public.financial_entry_payments
      set archived_at=now(),archived_by=auth.uid(),updated_at=now(),
          notes=concat_ws(E'\n',notes,'Estorno automático para cancelamento: '||v_reason)
    where financial_entry_id=p_entry_id and archived_at is null;

    update public.financial_entry_adjustments
      set archived_at=now(),archived_by=auth.uid()
    where financial_entry_id=p_entry_id and archived_at is null;

    insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata)
    values('financial_entry_settlements_reversed_for_cancellation',auth.uid(),'financial_entry',p_entry_id::text,true,
      jsonb_build_object('reason',v_reason,'payment_count',v_payment_count,'payment_total',v_payment_total,'entry_type',v_entry.entry_type,'environment',v_entry.environment));
  end if;

  update public.financial_entries set
    status='cancelled',cancelled_at=now(),cancelled_by=auth.uid(),settled_at=null,settled_by=null,
    notes=concat_ws(E'\n',notes,case when v_payment_count>0 then 'Baixas estornadas e lançamento cancelado: ' else 'Cancelamento: ' end||v_reason),
    updated_at=now(),updated_by=auth.uid()
  where id=p_entry_id;

  insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata)
  values('financial_entry_cancelled',auth.uid(),'financial_entry',p_entry_id::text,true,
    jsonb_build_object('reason',v_reason,'reversed_settlements',v_payment_count,'reversed_total',v_payment_total,'amount',v_entry.amount,'project_id',v_entry.project_id,'entry_type',v_entry.entry_type,'environment',v_entry.environment));
end $$;

-- Corrige lançamentos cancelados por versões anteriores que ainda mantêm baixas ativas.
do $$
declare v_item record;
begin
  for v_item in
    select entry.id,count(payment.id)::integer payment_count,coalesce(sum(payment.net_amount),0) payment_total
    from public.financial_entries entry
    join public.financial_entry_payments payment on payment.financial_entry_id=entry.id and payment.archived_at is null
    where entry.status='cancelled'
    group by entry.id
  loop
    update public.financial_entry_payments
      set archived_at=now(),archived_by=auth.uid(),updated_at=now(),
          notes=concat_ws(E'\n',notes,'Estorno técnico: baixa ativa encontrada em lançamento já cancelado.')
    where financial_entry_id=v_item.id and archived_at is null;

    update public.financial_entry_adjustments
      set archived_at=now(),archived_by=auth.uid()
    where financial_entry_id=v_item.id and archived_at is null;

    update public.financial_entries
      set settled_at=null,settled_by=null,updated_at=now(),updated_by=coalesce(auth.uid(),updated_by),
          notes=concat_ws(E'\n',notes,'Correção técnica da Etapa 19.1: baixas ativas foram estornadas após cancelamento.')
    where id=v_item.id;

    insert into public.security_audit_events(event_type,actor_user_id,target_type,target_id,success,metadata)
    values('cancelled_financial_entry_balance_reconciled',auth.uid(),'financial_entry',v_item.id::text,true,
      jsonb_build_object('payment_count',v_item.payment_count,'payment_total',v_item.payment_total,'migration','3.0.21'));
  end loop;
end $$;

revoke all on function public.cancel_financial_entry(uuid,text) from public,anon;
grant execute on function public.cancel_financial_entry(uuid,text) to authenticated;

insert into public.system_versions(version,notes,environment)
values('3.0.21','Etapa 19.1: cancelamento seguro de receitas e despesas liquidadas com estorno atômico de baixas e ajustes.','production')
on conflict(version) do update set notes=excluded.notes,environment=excluded.environment,released_at=now();

commit;
