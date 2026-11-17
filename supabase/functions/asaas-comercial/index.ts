import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"authorization, apikey, content-type","access-control-allow-methods":"POST, OPTIONS"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return json({});
 if(req.method!=="POST")return json({ok:false,message:"Método não permitido"},405);
 try{
  const key=Deno.env.get("ASAAS_API_KEY");
  const env=Deno.env.get("ASAAS_ENVIRONMENT")==="production"?"production":"sandbox";
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return json({ok:false,message:"Autenticação necessária."},401);
  const url=Deno.env.get("SUPABASE_URL")!;
  const anon=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client=createClient(url,anon);
  const {data:{user},error:authError}=await client.auth.getUser(auth.slice(7));
  if(authError||!user)return json({ok:false,message:"Sessão inválida."},401);
  const ownerIds=(Deno.env.get("ASAAS_ADMIN_USER_IDS")||"").split(",").map(x=>x.trim()).filter(Boolean);
  if(!ownerIds.includes(user.id))return json({ok:false,message:"Acesso reservado ao responsável pelo faturamento da MW TECH. Configure ASAAS_ADMIN_USER_IDS no Supabase."},403);
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:permissions,error:permissionError}=await admin.from("usuarios_estabelecimentos").select("perfil,ativo").eq("usuario_id",user.id).eq("perfil","administrador").eq("ativo",true).limit(1);
  if(permissionError||!permissions?.length)return json({ok:false,message:"Acesso restrito a administradores."},403);
  if(!key)return json({ok:false,message:"Configure ASAAS_API_KEY nos segredos da função Supabase (preferencialmente Sandbox para testes)."},503);
  const base=env==="production"?"https://api.asaas.com/v3":"https://api-sandbox.asaas.com/v3";
  async function asaas(path:string,method="GET",body?:unknown){
   const response=await fetch(base+path,{method,headers:{"access_token":key!,"content-type":"application/json","user-agent":"MW-Gestao-Comercial/1.0"},body:body?JSON.stringify(body):undefined});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error("Asaas retornou erro ("+response.status+"): "+(result?.errors?.[0]?.description||"confira o cadastro e a situação da conta"));
   return result;
  }
  const payload=await req.json().catch(()=>({}));
  if(payload?.action==="overview"){
   const [customers,subscriptions,payments]=await Promise.all([asaas("/customers?limit=100"),asaas("/subscriptions?limit=100"),asaas("/payments?limit=100")]);
   return json({ok:true,snapshot:{customers:customers.data||[],subscriptions:subscriptions.data||[],payments:payments.data||[],environment:env}});
  }
  if(payload?.action==="createSubscription"){
   const {name,cpfCnpj,email,phone,value,firstDueDate,billingType}=payload;
   const doc=String(cpfCnpj||"").replace(/\D/g,"");
   if(typeof name!=="string"||name.trim().length<3||![11,14].includes(doc.length)||!Number.isFinite(value)||value<=0||value>100000||!/^\d{4}-\d{2}-\d{2}$/.test(String(firstDueDate))||!["UNDEFINED","PIX","BOLETO","CREDIT_CARD"].includes(billingType))return json({ok:false,message:"Dados da assinatura inválidos."},400);
   if(String(firstDueDate)<new Date().toISOString().slice(0,10))return json({ok:false,message:"O vencimento não pode estar no passado."},400);
   const existing=await asaas("/customers?cpfCnpj="+encodeURIComponent(doc)+"&limit=10");
   let customer=existing.data?.find((x:{cpfCnpj?:string})=>x.cpfCnpj?.replace(/\D/g,"")===doc);
   if(!customer)customer=await asaas("/customers","POST",{name:name.trim().slice(0,100),cpfCnpj:doc,...(email?{email:String(email).slice(0,120)}:{}),...(phone?{mobilePhone:String(phone).replace(/\D/g,"").slice(0,13)}:{})});
   const subscription=await asaas("/subscriptions","POST",{customer:customer.id,billingType,value,cycle:"MONTHLY",nextDueDate:firstDueDate,description:"Mensalidade MW Gestão Comercial"});
   return json({ok:true,id:subscription.id});
  }
  return json({ok:false,message:"Ação desconhecida."},400);
 }catch(e){return json({ok:false,message:e instanceof Error?e.message:"Erro interno"},500)}
});