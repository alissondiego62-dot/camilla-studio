import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("..",import.meta.url);
async function content(path){return readFile(new URL(path,root),"utf8")}

test("SQL consolidado contém os oito perfis iniciais",async()=>{
  const sql=await content("camilla-studio-etapa-02.sql");
  for(const code of ["administrator","owner","manager","finance","architect","collaborator","assistant","viewer"])assert.match(sql,new RegExp(`'${code}'`));
});

test("SQL aplica autorização, sessão, RLS e checklists imutáveis",async()=>{
  const sql=await content("camilla-studio-etapa-02.sql");
  for(const token of ["current_user_access_valid","permission_scope","has_permission","protect_last_administrator","apply_stage_checklist_snapshot","enable row level security","user_permission_overrides","security_audit_events"])assert.match(sql,new RegExp(token,"i"));
  assert.doesNotMatch(sql,/using\s*\(\s*true\s*\)/i);
});

test("Edge Functions administrativas não mantêm domínio da Publicolor",async()=>{
  const manage=await content("supabase/functions/admin-manage-user/index.ts");
  const compatibility=await content("supabase/functions/admin-create-user/index.ts");
  const audit=await content("supabase/functions/auth-audit/index.ts");
  for(const source of [manage,compatibility,audit]){
    assert.doesNotMatch(source,/publicolor/i);
    assert.match(source,/ALLOWED_ORIGINS|SITE_URL/);
  }
});

test("Financeiro pessoal e profissional possuem permissões distintas",async()=>{
  const catalog=await content("app/config/permission-catalog.ts");
  const sql=await content("camilla-studio-etapa-02.sql");
  assert.match(catalog,/finance_professional/);assert.match(catalog,/finance_personal/);
  assert.match(sql,/finance_personal/);assert.match(sql,/finance_professional/);
  assert.match(sql,/public\.can_view_finance\(environment\)/);
});


test("SQL protege integrações sensíveis e estruturas financeiras legadas",async()=>{
  const sql=await content("camilla-studio-etapa-02.sql");
  assert.match(sql,/get_google_drive_connection_status/);
  assert.match(sql,/revoke all on public\.google_drive_connections from anon,authenticated/i);
  assert.match(sql,/google_drive_tokens/);
  assert.match(sql,/project_financial_select_scope/);
  assert.match(sql,/revoke execute on function %s from public/i);
  assert.match(sql,/add column if not exists thumbnail_url text/);
});
