import { assertNoError } from "@/app/services/supabase/base-service";
import { supabase } from "@/lib/supabase";
import type { FinanceEnvironment, FinanceFilters, FinanceReportRow } from "./types";
import { filtersToJson } from "./finance.filters";
export async function getFinanceReport(environment:FinanceEnvironment,reportCode:string,filters:FinanceFilters){const result=await supabase.rpc("get_financial_report",{p_environment:environment,p_report_code:reportCode,p_filters:filtersToJson(filters)});assertNoError(result);return(result.data??[]) as FinanceReportRow[]}
