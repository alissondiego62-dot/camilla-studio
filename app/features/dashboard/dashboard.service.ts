import { supabase } from "@/lib/supabase";
import { ensureSupabase, assertNoError } from "@/app/services/supabase/base-service";
import type { DashboardStats } from "./types";
export async function loadDashboardStats(includeFinancial=false):Promise<DashboardStats>{
 if(!ensureSupabase())return{projects:0,late:0,activities:0,clients:0,income:0,expense:0};
 const result=await supabase.rpc("get_dashboard_summary",{p_include_financial:includeFinancial});assertNoError(result);
 const data=(result.data??{}) as Partial<DashboardStats>;
 return{projects:Number(data.projects??0),late:Number(data.late??0),activities:Number(data.activities??0),clients:Number(data.clients??0),income:Number(data.income??0),expense:Number(data.expense??0)};
}
