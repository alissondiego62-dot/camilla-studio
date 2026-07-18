select c.relname as table_name,c.relrowsecurity as rls_enabled,count(p.policyname) as policies
from pg_class c join pg_namespace n on n.oid=c.relnamespace
left join pg_policies p on p.schemaname=n.nspname and p.tablename=c.relname
where n.nspname='public' and c.relkind='r'
group by c.relname,c.relrowsecurity
having not c.relrowsecurity or count(p.policyname)=0
order by c.relname;
-- Avaliar em homologação com perfis reais: proprietária, administrador, gestor e colaborador.
