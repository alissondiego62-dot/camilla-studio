-- Execute em homologação com usuários reais.
select has_function_privilege('anon','public.save_workflow_catalog(text,jsonb)','execute') as anon_can_save_workflow,
       has_function_privilege('authenticated','public.save_workflow_catalog(text,jsonb)','execute') as authenticated_can_save_workflow;
select has_function_privilege('anon','public.list_stage_checklists()','execute') as anon_can_list_checklists,
       has_function_privilege('authenticated','public.list_stage_checklists()','execute') as authenticated_can_list_checklists;
