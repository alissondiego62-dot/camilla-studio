-- Etapa 08 — teste transacional de baixa e precisão. Executar em homologação.
begin;
do $$
declare entry_id uuid; open_value numeric; status_value text;
begin
 insert into public.financial_entries(environment,entry_type,description,amount,competence_date,due_date,status)
 values('professional','expense','TESTE ETAPA 08 — BAIXA',100.01,current_date,current_date,'pending') returning id into entry_id;
 insert into public.financial_entry_adjustments(financial_entry_id,adjustment_type,amount,reason) values(entry_id,'discount',10.00,'Teste de desconto');
 insert into public.financial_entry_payments(financial_entry_id,environment,amount,discount_amount,interest_amount,fine_amount,net_amount,paid_at)
 values(entry_id,'professional',40.00,10.00,0,0,40.00,now());
 select open_amount,effective_status into open_value,status_value from public.financial_entry_balance_view where id=entry_id;
 if open_value<>50.01 or status_value<>'partially_paid' then raise exception 'Falha na baixa: saldo %, status %',open_value,status_value; end if;
end $$;
rollback;
