import {createClient} from "npm:@supabase/supabase-js@2";
const origins=["https://mwgestaocomercial.vercel.app","https://comercial.mwtechsistemas.com.br","http://localhost:5173"];
const cors=(o:string)=>({"Content-Type":"application/json","Access-Control-Allow-Origin":origins.includes(o)?o:origins[0],"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS","Vary":"Origin","Cache-Control":"no-store"});
const emailForCpf=(cpf:string)=>cpf+"@login.mwgestaocomercial.com.br";
const modules=["dashboard","caixa","movimentacoes","despesas","fechamento","relatorios","opinioes","usuarios","estabelecimentos"];
const roles=["administrador","gerente","financeiro","caixa","consulta"];
function validCpf(v:string){if(!/^\d{11}$/.test(v)||/^(\d)\1{10}$/.test(v))return false;for(let n=9;n<11;n++){let sum=0;for(let i=0;i<n;i++)sum+=Number(v[i])*(n+1-i);let d=(sum*10)%11;if(d===10)d=0;if(d!==Number(v[n]))return false}return true}
Deno.serve(async req=>{
 const origin=req.headers.get("Origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 const respond=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:cors(origin)});
 if(req.method!=="POST")return respond({error:"Método não permitido"},405);
 if(origin&&!origins.includes(origin))return respond({error:"Origem não autorizada"},403);
 try{
 const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!secret||!anon)return respond({error:"Configuração do servidor incompleta"},503);
 const token=req.headers.get("Authorization")?.replace(/^Bearer\s+/i,"");
 if(!token)return respond({error:"Faça login para continuar"},401);
 const authed=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error:errAuth}=await authed.auth.getUser(token);
 if(errAuth||!user)return respond({error:"Sessão inválida"},401);
 const admin=createClient(url,secret);
 const {data:adminGrants,error:grantError}=await admin.from("usuarios_estabelecimentos").select("estabelecimento_id,perfil").eq("usuario_id",user.id).eq("ativo",true).eq("perfil","administrador");
 if(grantError)return respond({error:"Falha ao validar permissões"},503);
 const adminIds=new Set((adminGrants||[]).map(x=>x.estabelecimento_id));
 if(adminIds.size===0)return respond({error:"Somente administrador pode gerenciar usuários"},403);
 const request=await req.json();
 const action=String(request.action||"list");
 const {data:units,error:unitError}=await admin.from("estabelecimentos").select("id,slug,nome").eq("ativo",true);
 if(unitError||!units)return respond({error:"Falha ao consultar unidades"},503);
 const allowed=units.filter(u=>adminIds.has(u.id));
 if(action==="list"){
  const ids=allowed.map(u=>u.id);
  const {data:grants,error:gErr}=await admin.from("usuarios_estabelecimentos").select("usuario_id,estabelecimento_id,perfil,ativo").in("estabelecimento_id",ids);
  if(gErr)return respond({error:"Não foi possível listar usuários"},503);
  const usersIds=[...new Set((grants||[]).map(p=>p.usuario_id))];
  if(!usersIds.length)return respond({ok:true,users:[]});
  const {data:people,error:pErr}=await admin.from("usuarios_comerciais").select("usuario_id,nome,cpf").in("usuario_id",usersIds);
  if(pErr)return respond({error:"Falha ao ler cadastros"},503);
  const rows=usersIds.map(id=>({id,nome:(people||[]).find(x=>x.usuario_id===id)?.nome||"Conta existente",cpf:(people||[]).find(x=>x.usuario_id===id)?.cpf||null,grants:(grants||[]).filter(x=>x.usuario_id===id).map(x=>({slug:units.find(u=>u.id===x.estabelecimento_id)?.slug,perfil:x.perfil,ativo:x.ativo}))}));
  const {data:ms}=await admin.from("usuarios_modulos").select("usuario_id,estabelecimento_id,modulo,permitido").in("usuario_id",usersIds).in("estabelecimento_id",ids);
  return respond({ok:true,users:rows.map(r=>({...r,modulos:(ms||[]).filter(m=>m.usuario_id===r.id).map(m=>({slug:units.find(u=>u.id===m.estabelecimento_id)?.slug,modulo:m.modulo,permitido:m.permitido}))}))});
 }
 if(!["create","update","reset_password"].includes(action))return respond({error:"Ação inválida"},400);
 const requested=[...new Set(Array.isArray(request.unidades)?request.unidades.map(String):[])];
 const selected=units.filter(u=>requested.includes(u.slug));
 if(action!=="reset_password" && (!requested.length||selected.length!==requested.length||selected.some(u=>!adminIds.has(u.id))))return respond({error:"Escolha unidades que você administra"},403);
 if(action==="reset_password"){
  const target=String(request.user_id||"");
  const pass=String(request.senha||"");
  if(pass.length<10||pass.length>128)return respond({error:"A senha precisa ter de 10 a 128 caracteres"},400);
  const {data:existing}=await admin.from("usuarios_estabelecimentos").select("estabelecimento_id").eq("usuario_id",target).eq("ativo",true);
  if(!existing?.length||existing.some(x=>!adminIds.has(x.estabelecimento_id)))return respond({error:"Sem permissão para trocar esta senha"},403);
  const {error}=await admin.auth.admin.updateUserById(target,{password:pass});
  return error?respond({error:"Não foi possível alterar a senha"},400):respond({ok:true,message:"Senha alterada."});
 }
 const nome=String(request.nome||"").trim(),cpf=String(request.cpf||"").replace(/\D/g,""),perfil=String(request.perfil||"");
 const selectedModules=Array.isArray(request.modulos)?[...new Set(request.modulos.map(String))]:[];
 if(nome.length<3||nome.length>120||!validCpf(cpf)||!roles.includes(perfil)||selectedModules.some(m=>!modules.includes(m)))return respond({error:"Verifique nome, CPF, perfil e permissões"},400);
 let userId="";
 if(action==="create"){
  const pass=String(request.senha||"");
  if(pass.length<10||pass.length>128)return respond({error:"Defina uma senha de 10 a 128 caracteres"},400);
  const {data:person}=await admin.from("usuarios_comerciais").select("usuario_id").eq("cpf",cpf).maybeSingle();
  if(person)return respond({error:"CPF já cadastrado. Edite o usuário existente."},409);
  const {data:created,error:createError}=await admin.auth.admin.createUser({email:emailForCpf(cpf),password:pass,email_confirm:true,user_metadata:{full_name:nome},app_metadata:{commercial_user:true}});
  if(createError||!created.user)return respond({error:"Não foi possível criar o usuário. Verifique se o CPF já está cadastrado."},400);
  userId=created.user.id;
  const {error:personError}=await admin.from("usuarios_comerciais").insert({usuario_id:userId,nome,cpf});
  if(personError){await admin.auth.admin.deleteUser(userId);return respond({error:"Falha ao gravar usuário; cadastro não concluído"},503)}
 } else {
  userId=String(request.user_id||"");
  if(!/^[0-9a-f-]{36}$/i.test(userId)||userId===user.id)return respond({error:"Usuário inválido para edição"},400);
  const {data:allGrants}=await admin.from("usuarios_estabelecimentos").select("estabelecimento_id").eq("usuario_id",userId);
  if(!allGrants?.length||allGrants.some(x=>!adminIds.has(x.estabelecimento_id)))return respond({error:"Você não administra todas as unidades deste usuário"},403);
  const {data:existing}=await admin.from("usuarios_comerciais").select("cpf").eq("usuario_id",userId).maybeSingle();
  if(existing?.cpf!==cpf)return respond({error:"O CPF de login não pode ser alterado por esta tela"},400);
  const {error:pErr}=await admin.from("usuarios_comerciais").update({nome}).eq("usuario_id",userId);
  if(pErr)return respond({error:"Falha ao atualizar nome"},503);
  await admin.auth.admin.updateUserById(userId,{user_metadata:{full_name:nome}});
 }
 const old=await admin.from("usuarios_estabelecimentos").select("estabelecimento_id").eq("usuario_id",userId);
 const gone=(old.data||[]).map(x=>x.estabelecimento_id).filter(id=>!selected.some(u=>u.id===id));
 if(gone.length){const {error}=await admin.from("usuarios_estabelecimentos").delete().eq("usuario_id",userId).in("estabelecimento_id",gone);if(error)return respond({error:"Cadastro criado; falha ao ajustar as unidades removidas"},503)}
 for(const u of selected){
  const {error:gError}=await admin.from("usuarios_estabelecimentos").upsert({usuario_id:userId,estabelecimento_id:u.id,perfil,ativo:true},{onConflict:"usuario_id,estabelecimento_id"});
  if(gError)return respond({error:"Cadastro criado; falha ao conceder acesso à unidade "+u.nome},503);
  const allRows=modules.map(modulo=>({usuario_id:userId,estabelecimento_id:u.id,modulo,permitido:selectedModules.includes(modulo)}));
  const {error:mError}=await admin.from("usuarios_modulos").upsert(allRows,{onConflict:"usuario_id,estabelecimento_id,modulo"});
  if(mError)return respond({error:"Cadastro criado; falha ao salvar módulos da unidade "+u.nome},503);
 }
 return respond({ok:true,user_id:userId,message:action==="create"?"Usuário cadastrado. Já pode acessar com CPF e senha.":"Usuário e acessos atualizados."});
 }catch{return respond({error:"Falha ao processar cadastro de usuário"},500)}
});