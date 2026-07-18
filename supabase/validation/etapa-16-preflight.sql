select to_regclass('public.financial_entries') as financial_entries,
       to_regclass('public.security_audit_events') as security_audit_events,
       to_regprocedure('public.save_financial_entry(uuid,jsonb)') as save_financial_entry;
