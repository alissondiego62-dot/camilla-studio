import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root=new URL("..",import.meta.url);
async function content(path){return readFile(new URL(path,root),"utf8")}
const required=[
 "app/features/agenda/AgendaWorkspace.tsx","app/features/agenda/AgendaToolbar.tsx","app/features/agenda/AgendaFilters.tsx",
 "app/features/agenda/AgendaItemDrawer.tsx","app/features/agenda/AgendaEventForm.tsx","app/features/agenda/AgendaActivityForm.tsx",
 "app/features/agenda/views/AgendaDayView.tsx","app/features/agenda/views/AgendaWeekView.tsx","app/features/agenda/views/AgendaMonthView.tsx",
 "app/features/agenda/components/AgendaTimeGrid.tsx","app/features/agenda/components/AgendaAllDayLane.tsx","app/features/agenda/components/AgendaMonthCell.tsx",
 "app/features/agenda/useAgendaRealtime.ts","app/features/agenda/useAgendaDragResize.ts","app/styles/agenda.css",
 "supabase/validation/etapa-06-sync-tests.sql","supabase/validation/etapa-06-duplicate-tests.sql"
];

test("Etapa 06 possui Agenda Dia, Semana e Mês",()=>{for(const path of required)assert.equal(existsSync(new URL(path,root)),true,`${path} deve existir`)});

test("workspace usa as três visualizações e a mesma coleção de itens",async()=>{const source=await content("app/features/agenda/AgendaWorkspace.tsx");for(const name of["AgendaDayView","AgendaWeekView","AgendaMonthView"])assert.match(source,new RegExp(name));assert.match(source,/workspace\.items/);assert.doesNotMatch(source,/demo|mock-event|evento-ficticio/i)});

test("SQL usa view unificada sem copiar atividades ou prazos para calendar_events",async()=>{const sql=await content("camilla-studio-etapa-06.sql");assert.match(sql,/create or replace view public\.agenda_items/i);assert.match(sql,/union all[\s\S]*project_activities/i);assert.match(sql,/union all[\s\S]*project_dates/i);assert.doesNotMatch(sql,/insert into public\.calendar_events[\s\S]{0,300}from public\.project_activities/i);assert.doesNotMatch(sql,/insert into public\.calendar_events[\s\S]{0,300}from public\.project_dates/i)});

test("view da Agenda respeita RLS das fontes",async()=>{const sql=await content("camilla-studio-etapa-06.sql");assert.match(sql,/with \(security_invoker=true\)/i);assert.match(sql,/revoke all on public\.agenda_items from anon/i);assert.match(sql,/grant select on public\.agenda_items to authenticated/i)});

test("arraste atualiza a fonte real e possui rollback otimista",async()=>{const hook=await content("app/features/agenda/useAgendaWorkspace.ts");const sql=await content("camilla-studio-etapa-06.sql");assert.match(hook,/updateAgendaItem/);assert.match(hook,/previous/);assert.match(sql,/p_source_type='event'/);assert.match(sql,/p_source_type='activity'/);assert.match(sql,/p_source_type='project_date'/)});

test("redimensionamento impede duração negativa",async()=>{const util=await content("app/features/agenda/agenda-date-utils.ts");const sql=await content("camilla-studio-etapa-06.sql");assert.match(util,/Math\.max\(start \+ minimum/);assert.match(sql,/p_ends_at<p_starts_at/);assert.match(sql,/calendar_events_valid_range/)});

test("atividades sem data não aparecem na Agenda",async()=>{const sql=await content("camilla-studio-etapa-06.sql");assert.match(sql,/coalesce\(a\.starts_at,a\.due_at\) is not null/i)});

test("interface possui criação por data e horário, filtros e dia inteiro",async()=>{const workspace=await content("app/features/agenda/AgendaWorkspace.tsx");const toolbar=await content("app/features/agenda/AgendaToolbar.tsx");const grid=await content("app/features/agenda/components/AgendaTimeGrid.tsx");assert.match(workspace,/AgendaCreateMenu/);assert.match(workspace,/AgendaEventForm/);assert.match(workspace,/AgendaActivityForm/);assert.match(toolbar,/AgendaFilters/);assert.match(grid,/AgendaAllDayLane/)});

test("migration e SQL consolidado são idênticos",async()=>{const sql=await content("camilla-studio-etapa-06.sql");const migration=await content("supabase/migrations/20260716230000_camilla_stage06_calendar_agenda.sql");assert.equal(migration,sql)});
