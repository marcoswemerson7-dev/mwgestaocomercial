import {createClient} from "npm:@supabase/supabase-js@2";
const allowed=["https://mwgestaocomercial.vercel.app"];
const headers=(origin:string)=>({"Content-Type":"application/json","Access-Control-Allow-Origin":allowed.includes(origin)?origin:allowed[0],"Vary":"Origin","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type,apikey,x-client-info,authorization","Cache-Control":"no-store"});
Deno.serve(async(req)=>{
 const origin=req.headers.get("Origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 const respond=(payload:unknown,status=200)=>new Response(JSON.stringify(payload),{status,headers:headers(origin)});
 if(req.method!=="POST")return respond({error:"Método não permitido"},405);
 if(origin&&!allowed.includes(origin))return respond({error:"Origem não autorizada"},403);
 try{
  const raw=await req.text();
  if(raw.length>6500)return respond({error:"Mensagem muito longa"},413);
  const body=JSON.parse(raw);
  const slug=String(body.slug??""),category=String(body.categoria??""),message=String(body.mensagem??"").trim(),name=String(body.nome??"").trim(),contact=String(body.contato??"").trim();
  if(!["supermercado","acai"].includes(slug)||!["sugestao","reclamacao","duvida","elogio"].includes(category)||message.length<10||message.length>2000||name.length>120||contact.length>160)return respond({error:"Confira os campos informados."},400);
  const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const salt=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+"|"+ip));
  const iphash=Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,"0")).join("");
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return respond({error:"Atendimento temporariamente indisponível."},503);
  const admin=createClient(url,key);
  const {data,error}=await admin.rpc("registrar_manifestacao_publica",{p_slug:slug,p_categoria:category,p_mensagem:message,p_nome:name||null,p_contato:contact||null,p_ip_hash:iphash});
  if(error){if(error.message.includes("Limite"))return respond({error:"Você atingiu o limite de mensagens. Tente novamente daqui a uma hora."},429);return respond({error:"Não foi possível registrar a mensagem. Tente novamente."},503)}
  return respond({protocolo:data,ok:true},201);
 }catch{return respond({error:"Não foi possível processar sua mensagem."},400)}
});