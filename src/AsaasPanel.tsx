import {useEffect,useMemo,useState} from "react";
import {RefreshCw,ExternalLink,ShieldCheck,AlertTriangle,CalendarClock,CheckCircle2,ReceiptText,Wallet} from "lucide-react";
import {supabase} from "./lib/supabase";
import "./asaas.css";

type Payment={id:string;value:number;status:string;dueDate:string;invoiceUrl?:string;bankSlipUrl?:string;description?:string};
type Statement={payments:Payment[];customerName:string;installmentCount:6|12;environment:string};
const brl=(n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
const fmt=(date:string)=>date?date.split("-").reverse().join("/"):"—";
const paid=(s:string)=>["RECEIVED","CONFIRMED","RECEIVED_IN_CASH"].includes(s);
const statusLabel=(s:string)=>paid(s)?"Pago":s==="OVERDUE"?"Vencida":s==="PENDING"?"Aguardando pagamento":s==="REFUNDED"?"Estornada":s==="DELETED"?"Cancelada":s==="AWAITING_RISK_ANALYSIS"?"Em análise":s||"—";
export default function AsaasPanel(){
 const [data,setData]=useState<Statement|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function refresh(){
  setBusy(true);setError("");
  try{
   if(!supabase)throw new Error("Supabase não configurado.");
   const {data:session}=await supabase.auth.getSession();
   if(!session.session)throw new Error("Sua sessão expirou. Entre novamente.");
   const response=await supabase.functions.invoke("asaas-comercial",{body:{action:"myPayments"},headers:{Authorization:"Bearer "+session.session.access_token}});
   if(response.error){
    const details=await response.error.context?.json?.().catch(()=>null);
    throw new Error(details?.message||"Não foi possível consultar as mensalidades. Verifique a configuração da integração.");
   }
   if(!response.data?.ok)throw new Error(response.data?.message||"Falha na consulta.");
   setData(response.data.statement);
  }catch(e){setData(null);setError(e instanceof Error?e.message:"Erro na consulta");}
  finally{setBusy(false)}
 }
 useEffect(()=>{void refresh()},[]);
 const payments=useMemo(()=>[...(data?.payments||[])].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)),[data]);
 const totalPaid=payments.filter(x=>paid(x.status)).reduce((v,x)=>v+Number(x.value),0);
 const totalDue=payments.filter(x=>["PENDING","OVERDUE"].includes(x.status)).reduce((v,x)=>v+Number(x.value),0);
 const next=payments.find(x=>["PENDING","OVERDUE"].includes(x.status));
 return <div className="asaas-panel">
  <div className="asaas-top"><div><small>MW TECH SISTEMAS LTDA • ÁREA DO CLIENTE</small><h1>Minhas mensalidades</h1><p>Acompanhe suas parcelas do MW Gestão Comercial, consulte os vencimentos e pague com segurança pelo Asaas.</p></div><div className="asaas-actions"><button type="button" className="mg-btn secondary" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={16}/> {busy?"Atualizando...":"Atualizar"}</button></div></div>
  <div className="asaas-notice"><ShieldCheck size={19}/><span>As cobranças são emitidas pela MW TECH. Aqui você apenas consulta e paga suas mensalidades. Nenhuma cobrança é criada pelo gerente.</span></div>
  {error&&<div className="mg-warning" role="alert"><AlertTriangle size={17}/>{error}</div>}
  <div className="asaas-metrics"><div><ReceiptText size={19}/><small>Parcelas do plano</small><strong>{data?data.installmentCount:"—"}</strong></div><div><CheckCircle2 size={19}/><small>Parcelas pagas</small><strong>{data?payments.filter(x=>paid(x.status)).length:"—"}</strong></div><div><Wallet size={19}/><small>Total pago</small><strong>{data?brl(totalPaid):"—"}</strong></div><div><CalendarClock size={19}/><small>Valor em aberto</small><strong>{data?brl(totalDue):"—"}</strong></div></div>
  {data&&<section className="mg-card asaas-client-summary"><div><small>CLIENTE</small><h3>{data.customerName}</h3><p>Plano de {data.installmentCount} mensalidades • {data.environment==="sandbox"?"Ambiente de testes":"Ambiente de produção"}</p></div><div><small>PRÓXIMA PARCELA EM ABERTO</small><strong>{next?fmt(next.dueDate):"Nenhuma pendência"}</strong></div></section>}
  <section className="mg-card"><div className="mg-card-heading"><div><h3>Minhas parcelas</h3><p>Selecione “Pagar parcela” para abrir o link seguro do Asaas. Parcelas ainda não emitidas aparecerão quando forem disponibilizadas pela MW TECH.</p></div></div>
   <div className="mg-table-wrap"><table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Pagamento</th></tr></thead><tbody>{!payments.length?<tr><td colSpan={5}>{busy?"Consultando mensalidades...":"Nenhuma parcela emitida para este cliente."}</td></tr>:payments.map((x,i)=><tr key={x.id}><td>{String(i+1).padStart(2,"0")}/{data?.installmentCount||payments.length}</td><td>{fmt(x.dueDate)}</td><td>{brl(Number(x.value))}</td><td><span className={"asaas-status "+(paid(x.status)?"paid":x.status==="OVERDUE"?"overdue":"pending")}>{statusLabel(x.status)}</span></td><td>{paid(x.status)?<span className="asaas-done"><CheckCircle2 size={15}/> Pago</span>:["PENDING","OVERDUE"].includes(x.status)&&x.invoiceUrl?<a className="mg-btn primary asaas-pay" href={x.invoiceUrl} target="_blank" rel="noopener noreferrer">Pagar parcela <ExternalLink size={15}/></a>:"—"}</td></tr>)}</tbody></table></div>
  </section>
 </div>;
}
