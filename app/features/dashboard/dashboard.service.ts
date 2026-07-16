import { supabase } from "@/lib/supabase";
import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import type { DashboardStats } from "./types";

export async function loadDashboardStats(includeFinancial=false):Promise<DashboardStats>{
  if(!ensureSupabase())return{projects:0,late:0,activities:0,clients:0,income:0,expense:0};
  const today=new Date().toISOString().slice(0,10);
  const [projects,late,activities,clients]=await Promise.all([
    supabase.from("projects").select("id",{count:"exact",head:true}).neq("stage","completed"),
    supabase.from("projects").select("id",{count:"exact",head:true}).lt("main_deadline",today).neq("stage","completed"),
    supabase.from("project_activities").select("id",{count:"exact",head:true}).neq("status","completed"),
    supabase.from("clients").select("id",{count:"exact",head:true}),
  ]);
  [projects,late,activities,clients].forEach(assertNoError);
  let income=0,expense=0;
  if(includeFinancial){
    const financial=await supabase.from("financial_entries").select("entry_type,amount");
    assertNoError(financial);
    for(const row of (financial.data??[]) as Array<{entry_type:string;amount:number|string}>){if(row.entry_type==="income")income+=Number(row.amount);if(row.entry_type==="expense")expense+=Number(row.amount)}
  }
  return{projects:projects.count??0,late:late.count??0,activities:activities.count??0,clients:clients.count??0,income,expense};
}
