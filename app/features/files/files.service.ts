import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import type { FileRelations, FileRow } from "./types";

export async function listFiles(): Promise<FileRow[]> {
  if (!ensureSupabase()) return [];
  const result = await supabase.from("project_files").select("*,project:projects(name),client:clients(name),activity:project_activities(title),financial:financial_entries(description)").is("archived_at", null).order("created_at", { ascending: false });
  assertNoError(result);
  const rows=(result.data??[]) as FileRow[]; const ids=[...new Set(rows.map((item)=>item.created_by).filter(Boolean))] as string[];
  const profiles=ids.length?await supabase.from("profiles").select("id,name,email").in("id",ids):{data:[],error:null};
  if(profiles.error)throw new Error(profiles.error.message);const map=new Map((profiles.data??[]).map((item)=>[item.id,item]));
  return rows.map((item)=>({...item,author:item.created_by?map.get(item.created_by)??null:null}));
}

export async function listFileRelations(): Promise<FileRelations> {
  if (!ensureSupabase()) return { projects: [], clients: [], activities: [], financial: [] };
  const [projects, clients, activities, financial] = await Promise.all([
    supabase.from("projects").select("id,code,name").is("archived_at", null).order("name"),
    supabase.from("clients").select("id,name").is("archived_at", null).order("name"),
    supabase.from("project_activities").select("id,title").is("archived_at", null).order("title").limit(500),
    supabase.from("financial_entries").select("id,description").is("archived_at", null).order("created_at", { ascending: false }).limit(500),
  ]);
  for (const result of [projects, clients, activities, financial]) if (result.error && !/permission denied|row-level security/i.test(result.error.message)) throw new Error(result.error.message);
  return {
    projects: (projects.data ?? []).map((item) => ({ id: item.id, label: `${item.code} — ${item.name}` })),
    clients: (clients.data ?? []).map((item) => ({ id: item.id, label: item.name })),
    activities: (activities.data ?? []).map((item) => ({ id: item.id, label: item.title })),
    financial: (financial.data ?? []).map((item) => ({ id: item.id, label: item.description })),
  };
}
