import {useEffect,useMemo,useState} from "react";
import {RefreshCw,Plus,ExternalLink,ShieldCheck,AlertTriangle,ReceiptText,Users,CalendarClock} from "lucide-react";
import {supabase} from "./lib/supabase";
import "./asaas.css";

type Customer={id:string;name:string;cpfCnpj:string;email?:string;phone?:string};
type Subscription={id:string;customer:string;value:number;cycle:string;billingType:string;status:string;nextDueDate:string;description?:string};
type Payment={id:string;customer:string;subscription?:string;value:number;status:string;dueDate:string;invoiceUrl?:string};
type Snapshot={customers:Customer[];subscriptions:Subscription[];payments:Payment[];environment:string};
const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
const statusLabel=(s:string)=>({ACTIVE:"Ativa",INACTIVE:"Inativa",EXPIRED:"Expirada",PENDING:"Pendente",RECEIVED:"Recebida",CONFIRMED:"Confirmada",OVERDUE:"Vencida",REFUNDED:"Estornada",DELETED:"Cancelada"} as Record<string,string>)[s]||s;
export default function AsaasPanel(){
 const [data,setData]=useState<Snapshot|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[form,setForm]=useState(false);
 const [name,setName]=useState(""),[cpf,setCpf]=useState(""),[email,setEmail]=useState(""),[phone,setPhone]=useState("");
 const [amount,setAmount]=useState("120"),[due,setDue]=useState(()=>{const d=new Date();d.setDate(d.getDate()+7);return d.toISOString().slice(0,10)}),[billing,setBilling]=useState("UNDEFINED");
 async function request(action:string,payload:Record<string,unknown>={}){
  if(!supabase)throw new Error("Supabase não configurado.");
  const {data:session}=await supabase.auth.getSession();
  if(!session.session)throw new Error("Sessão expirada. Entre novamente.");
  const {data,error}=await supabase.functions.invoke("asaas-comercial",{body:{action,...payload},headers:{Authorization:"Bearer "+session.session.access_token}});
  if(error)throw new Error("Serviço Asaas indisponível. Confira a implantação da função e as configurações no Supabase.");
  if(!data?.ok)throw new Error(data?.message||"Não foi possível consultar o Asaas.");
  return data;
 }
 async function refresh(){setBusy(true);setMessage("");try{const res=await request("overview");setData(res.snapshot)}catch(e){setMessage(e instanceof Error?e.message:"Erro de conexão");setData(null)}finally{setBusy(false)}}
 useEffect(()=>{void refresh()},[]);
 async function create(e:React.FormEvent){e.preventDefault();if(busy)return;setBusy(true);setMessage("");try{
  const value=Number(amount.replace(",","."));
  if(!Number.isFinite(value)||value<=0)throw new Error("Informe um valor válido.");
  if(cpf.replace(/\D/g,"").length!==11&&cpf.replace(/\D/g,"").length!==14)throw new Error("Informe CPF ou CNPJ válido.");
  await request("createSubscription",{name:name.trim(),cpfCnpj:cpf.replace(/\D/g,""),email:email.trim(),phone:phone.replace(/\D/g,""),value,firstDueDate:due,billingType:billing});
  setForm(false);setName("");setCpf("");setEmail("");setPhone("");setMessage("Assinatura criada. Consulte as cobranças para acompanhar o pagamento.");
  const res=await request("overview");setData(res.snapshot);
 }catch(e){setMessage(e instanceof Error?e.message:"Falha ao criar assinatura")}finally{setBusy(false)}}
 const totals=useMemo(()=>({active:data?.subscriptions.filter(x=>x.status==="ACTIVE").length||0,received:data?.payments.filter(x=>["RECEIVED","CONFIRMED"].includes(x.status)).reduce((s,x)=>s+Number(x.value),0)||0,pending:data?.payments.filter(x=>["PENDING","OVERDUE"].includes(x.status)).reduce((s,x)=>s+Number(x.value),0)||0}),[data]);
 const customerMap=new Map((data?.customers||[]).map(x=>[x.id,x.name]));
 return <div className="asaas-panel">
  <div className="asaas-top"><div><small>MW TECH SISTEMAS LTDA • RECEITAS DO SOFTWARE</small><h1>Assinaturas Asaas</h1><p>Mensalidades do MW Gestão Comercial. Valores separados do caixa do Supermercado e do Açaí Vitória.</p></div><div className="asaas-actions"><button type="button" className="mg-btn secondary" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/> Atualizar</button><button type="button" className="mg-btn primary" onClick={()=>setForm(v=>!v)}><Plus size={17}/> Nova assinatura</button></div></div>
  <div className="asaas-notice"><ShieldCheck size={19}/><span>Integração feita exclusivamente no servidor. Nenhuma chave do Asaas é enviada ao navegador. Ambiente: <b>{data?.environment==="production"?"Produção":data?.environment==="sandbox"?"Sandbox":"Não conectado"}</b>.</span></div>
  {message&&<div className="mg-warning" role="status"><AlertTriangle size={17}/>{message}</div>}
  <div className="asaas-metrics"><div><Users size={19}/><small>Clientes cadastrados</small><strong>{data?.customers.length??"—"}</strong></div><div><CalendarClock size={19}/><small>Assinaturas ativas</small><strong>{data?totals.active:"—"}</strong></div><div><ReceiptText size={19}/><small>Recebido (cobranças consultadas)</small><strong>{data?brl(totals.received):"—"}</strong></div><div><ReceiptText size={19}/><small>Pendente / vencido</small><strong>{data?brl(totals.pending):"—"}</strong></div></div>
  {form&&<form className="asaas-form mg-card" onSubmit={create}><h3>Nova assinatura mensal</h3><p>O Asaas emitirá cobranças recorrentes. Verifique os dados antes de confirmar.</p><div className="asaas-grid"><label>Nome do cliente<input required value={name} maxLength={100} onChange={e=>setName(e.target.value)} placeholder="Nome ou razão social"/></label><label>CPF/CNPJ<input required value={cpf} onChange={e=>setCpf(e.target.value)} placeholder="Somente números"/></label><label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Telefone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Mensalidade (R$)<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>Primeiro vencimento<input required type="date" min={new Date().toISOString().slice(0,10)} value={due} onChange={e=>setDue(e.target.value)}/></label><label>Forma de cobrança<select value={billing} onChange={e=>setBilling(e.target.value)}><option value="UNDEFINED">Pix, boleto ou cartão (cliente escolhe)</option><option value="PIX">Pix</option><option value="BOLETO">Boleto</option><option value="CREDIT_CARD">Cartão de crédito</option></select></label></div><div className="asaas-actions"><button type="button" className="mg-btn secondary" onClick={()=>setForm(false)}>Cancelar</button><button type="submit" disabled={busy} className="mg-btn primary">{busy?"Salvando...":"Criar assinatura no Asaas"}</button></div></form>}
  <section className="mg-card"><div className="mg-card-heading"><div><h3>Assinaturas</h3><p>{busy?"Consultando Asaas...":"Mensalidades cadastradas"}</p></div></div><div className="mg-table-wrap"><table><thead><tr><th>Cliente</th><th>Valor</th><th>Periodicidade</th><th>Próximo vencimento</th><th>Situação</th></tr></thead><tbody>{!data?.subscriptions.length?<tr><td colSpan={5}>Nenhuma assinatura disponível.</td></tr>:data.subscriptions.map(x=><tr key={x.id}><td>{customerMap.get(x.customer)||x.customer}</td><td>{brl(Number(x.value))}</td><td>{x.cycle==="MONTHLY"?"Mensal":x.cycle}</td><td>{x.nextDueDate||"—"}</td><td>{statusLabel(x.status)}</td></tr>)}</tbody></table></div></section>
  <section className="mg-card"><div className="mg-card-heading"><div><h3>Cobranças recentes</h3><p>Pagamento confirmado pelo Asaas, sem registros fictícios.</p></div></div><div className="mg-table-wrap"><table><thead><tr><th>Cliente</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Documento</th></tr></thead><tbody>{!data?.payments.length?<tr><td colSpan={5}>Nenhuma cobrança disponível.</td></tr>:data.payments.map(x=><tr key={x.id}><td>{customerMap.get(x.customer)||x.customer}</td><td>{x.dueDate}</td><td>{brl(Number(x.value))}</td><td>{statusLabel(x.status)}</td><td>{x.invoiceUrl?<a href={x.invoiceUrl} target="_blank" rel="noopener noreferrer">Abrir <ExternalLink size={13}/></a>:"—"}</td></tr>)}</tbody></table></div></section>
 </div>;
}
