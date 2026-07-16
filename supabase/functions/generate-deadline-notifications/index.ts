import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers={"Content-Type":"application/json"};
Deno.serve(async(request)=>{
  const secret=Deno.env.get("CRON_SECRET")||"";
  if(!secret||request.headers.get("x-cron-secret")!==secret)return new Response(JSON.stringify({error:"Não autorizado"}),{status:401,headers});
  const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data,error}=await client.rpc("generate_due_notifications",{p_now:new Date().toISOString()});
  return new Response(JSON.stringify(error?{error:error.message}:{created:data}),{status:error?500:200,headers});
});
