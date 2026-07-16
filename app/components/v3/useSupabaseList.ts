"use client";
import { useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useModuleData } from "@/app/hooks/useModuleData";
export function useSupabaseList<T>(table:string,select="*",orderBy="created_at") { const loader=useCallback(async()=>{if(!isSupabaseConfigured)return[] as T[];const result=await supabase.from(table).select(select).order(orderBy,{ascending:false});if(result.error)throw new Error(result.error.message);return(result.data??[])as unknown as T[]},[orderBy,select,table]);const state=useModuleData<T[]>(loader,[]);return{items:state.data,setItems:state.setData,loading:state.loading,error:state.error,reload:state.reload}; }
