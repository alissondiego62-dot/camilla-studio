import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("..",import.meta.url);
async function content(path){return readFile(new URL(path,root),"utf8")}
const required=[
 "app/(studio)/clients/[id]/page.tsx","app/(studio)/clients/[id]/loading.tsx","app/(studio)/clients/[id]/error.tsx",
 "app/features/clients/ClientDetailPage.tsx","app/features/clients/ClientOverviewPanel.tsx","app/features/clients/ClientProjectsPanel.tsx",
 "app/features/clients/ClientActivitiesPanel.tsx","app/features/clients/ClientAgendaPanel.tsx","app/features/clients/ClientFinancialPanel.tsx",
 "app/features/clients/ClientFilesPanel.tsx","app/features/clients/ClientNotesPanel.tsx","app/features/clients/ClientHistoryPanel.tsx",
 "supabase/validation/etapa-07-search-tests.sql","supabase/validation/etapa-07-financial-permission-tests.sql","supabase/validation/etapa-07-delete-protection-tests.sql"
];

test("Etapa 07 possui ficha individual e oito áreas integradas",()=>{for(const path of required)assert.equal(existsSync(new URL(path,root)),true,`${path} deve existir`)});

test("cadastro cobre pessoa, documentos, contatos, endereço e relacionamento",async()=>{const form=await content("app/features/clients/ClientFormDrawer.tsx");for(const field of["legal_name","trade_name","cpf","cnpj","state_registration","municipal_registration","website","postal_code","internal_responsible_user_id","source_code","segment_code","relationship_status"])assert.match(form,new RegExp(field));assert.match(form,/ClientContactFields/);assert.match(form,/ClientAddressFields/)});

test("página individual usa projetos, atividades, agenda, financeiro, arquivos, notas e histórico",async()=>{const detail=await content("app/features/clients/ClientDetailPage.tsx");for(const panel of["ClientOverviewPanel","ClientProjectsPanel","ClientActivitiesPanel","ClientAgendaPanel","ClientFinancialPanel","ClientFilesPanel","ClientNotesPanel","ClientHistoryPanel"])assert.match(detail,new RegExp(panel))});

test("pesquisa contempla nome, documentos, telefone, WhatsApp e e-mail",async()=>{const filters=await content("app/features/clients/ClientsFilters.tsx");const sql=await content("camilla-studio-etapa-07.sql");assert.match(filters,/Nome, CPF, CNPJ, telefone, WhatsApp ou e-mail/);assert.match(sql,/create or replace function public\.search_clients/i);assert.match(sql,/normalized_phone/);assert.match(sql,/normalized_email/);assert.match(sql,/only_digits\(cpf\)/)});

test("clientes homônimos são permitidos e documentos ativos são únicos",async()=>{const sql=await content("camilla-studio-etapa-07.sql");assert.match(sql,/drop index if exists public\.clients_name_unique_ci/i);assert.match(sql,/clients_cpf_unique_norm/i);assert.match(sql,/clients_cnpj_unique_norm/i)});

test("exclusão preserva vínculos por RESTRICT e função segura",async()=>{const sql=await content("camilla-studio-etapa-07.sql");for(const table of["projects","project_activities","project_files","financial_entries"])assert.match(sql,new RegExp(`alter table public\\.${table}[\\s\\S]{0,220}on delete restrict`,`i`));assert.match(sql,/delete_client_safely/);assert.match(sql,/possui vínculos e não pode ser excluído/i)});

test("financeiro do cliente é somente profissional e exige autorização",async()=>{const sql=await content("camilla-studio-etapa-07.sql");const detail=await content("app/features/clients/ClientDetailPage.tsx");assert.match(sql,/environment='professional'/);assert.match(sql,/finance_professional','view_values/);assert.match(sql,/clients','view_financial/);assert.match(detail,/isFinancialAdministrator/);assert.doesNotMatch(sql,/client_financial_entries_view[\s\S]{0,900}environment='personal'/i)});

test("Agenda mantém colunas anteriores e acrescenta cliente sem duplicar fonte",async()=>{const sql=await content("camilla-studio-etapa-07.sql");assert.match(sql,/create or replace view public\.agenda_items with\(security_invoker=true\)/i);assert.match(sql,/e\.updated_at,\s*coalesce\(e\.client_id/);assert.match(sql,/a\.updated_at,\s*coalesce\(a\.client_id/);assert.match(sql,/d\.updated_at,\s*p\.client_id/)});

test("gatilhos de auditoria evitam acesso polimórfico direto incorreto",async()=>{const sql=await content("camilla-studio-etapa-07.sql");assert.match(sql,/row_value:=case when tg_op='DELETE' then to_jsonb\(old\) else to_jsonb\(new\) end/);assert.doesNotMatch(sql,/coalesce\(new\.id,old\.id\)/i)});

test("migration e SQL consolidado são idênticos",async()=>{const sql=await content("camilla-studio-etapa-07.sql");const migration=await content("supabase/migrations/20260717010000_camilla_stage07_clients_crm.sql");assert.equal(migration,sql)});

test("valores financeiros não são expostos por views diretas",async()=>{const sql=await content("camilla-studio-etapa-07.sql");const service=await content("app/features/clients/clients.service.ts");assert.match(sql,/revoke all on public\.client_financial_entries_view from public,anon,authenticated/i);assert.match(sql,/revoke all on public\.client_financial_summary_view from public,anon,authenticated/i);assert.match(sql,/create or replace function public\.get_client_financial_workspace/i);assert.match(service,/rpc\("get_client_financial_workspace"/);assert.doesNotMatch(service,/from\("client_financial_(?:entries|summary)_view"/)});

test("RLS protege observações financeiras, pagamentos e arquivos do cliente",async()=>{const sql=await content("camilla-studio-etapa-07.sql");assert.match(sql,/client_notes_update_scope[\s\S]{0,700}note_type<>'financial' or public\.can_view_client_financial/i);assert.match(sql,/financial_entry_payments_update_scope[\s\S]{0,700}f\.environment='professional'/i);assert.match(sql,/linked_files_insert_scope[\s\S]{0,1200}client_id is null or public\.can_edit_client\(client_id\)/i);assert.match(sql,/num_nonnulls\(project_id,client_id,activity_id,financial_entry_id\)>0/i)});

test("auditoria usa identificador único por disparo dentro da mesma transação",async()=>{const sql=await content("camilla-studio-etapa-07.sql");const matches=sql.match(/record_value\|\|':'\|\|txid_current\(\)::text\|\|':'\|\|gen_random_uuid\(\)::text/g)??[];assert.ok(matches.length>=2,"históricos de cliente e contatos devem usar sufixo único");assert.doesNotMatch(sql,/record_value\|\|':'\|\|txid_current\(\)::text\s*,jsonb_build_object/)});
