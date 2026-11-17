import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"authorization, apikey, content-type","access-control-allow-methods":"POST, OPTIONS"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return json({});
 if(req.method!=="POST")return json({ok:false,message:"Método não permitido"},405);
 try{
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return json({ok:false,message:"Autenticação necessária."},401);
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client=createClient(url,anon);
  const {data:{user},error:authError}=await client.auth.getUser(auth.slice(7));
  if(authError||!user)return json({ok:false,message:"Sessão inválida."},401);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const payload=await req.json().catch(()=>({}));
  if(payload?.action!=="myPayments")return json({ok:false,message:"A emissão das cobranças é exclusiva da administração MW TECH."},403);
  const {data:binding,error:bindingError}=await admin.from("asaas_client_accounts").select("asaas_customer_id,installment_count").eq("user_id",user.id).maybeSingle();
  if(bindingError)return json({ok:false,message:"Falha ao verificar o vínculo de pagamento."},500);
  if(!binding)return json({ok:false,message:"Suas mensalidades ainda não foram vinculadas à conta. Solicite à MW TECH o cadastro do seu plano de 6 ou 12 meses."},404);
  const key=Deno.env.get("ASAAS_API_KEY");
  if(!key)return json({ok:false,message:"A integração Asaas ainda não foi ativada pela MW TECH."},503);
  const env=Deno.env.get("ASAAS_ENVIRONMENT")==="production"?"production":"sandbox";
  const base=env==="production"?"https://api.asaas.com/v3":"https://api-sandbox.asaas.com/v3";
  const headers={"access_token":key,"user-agent":"MW-Gestao-Comercial/1.0"};
  async function retrieve(path:string){
   const response=await fetch(base+path,{headers});
   const body=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error("Asaas indisponível ("+response.status+").");
   return body;
  }
  const id=binding.asaas_customer_id;
  const customer=await retrieve("/customers/"+encodeURIComponent(id));
  const all:unknown[]=[];
  for(let offset=0;offset<300;offset+=100){
   const page=await retrieve("/payments?customer="+encodeURIComponent(id)+"&limit=100&offset="+offset);
   all.push(...(page.data||[]));
   if(!page.hasMore)break;
  }
  const payments=all.filter((p:any)=>p.customer===id&&String(p.description||"").includes("MW Gestão Comercial"))
   .map((p:any)=>({id:p.id,value:p.value,status:p.status,dueDate:p.dueDate,invoiceUrl:p.invoiceUrl,bankSlipUrl:p.bankSlipUrl,description:p.description}));
  return json({ok:true,statement:{customerName:customer.name||"Cliente",installmentCount:binding.installment_count,environment:env,payments}});
 }catch(e){return json({ok:false,message:e instanceof Error?e.message:"Erro interno"},500)}
});