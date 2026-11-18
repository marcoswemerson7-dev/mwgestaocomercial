import {useEffect,useState} from "react";
import {Download,X} from "lucide-react";
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export default function InstallShortcut(){
 const [install,setInstall]=useState<InstallEvent|null>(null),[help,setHelp]=useState(false);
 const [standalone,setStandalone]=useState(()=>window.matchMedia("(display-mode: standalone)").matches||!!(navigator as Navigator&{standalone?:boolean}).standalone);
 useEffect(()=>{const capture=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent)};const installed=()=>{setStandalone(true);setHelp(false);setInstall(null)};window.addEventListener("beforeinstallprompt",capture);window.addEventListener("appinstalled",installed);return()=>{window.removeEventListener("beforeinstallprompt",capture);window.removeEventListener("appinstalled",installed)}},[]);
 if(standalone)return null;
 return <><button type="button" className="mg-btn secondary mg-install-shortcut" onClick={async()=>{if(!install){setHelp(true);return}await install.prompt();const choice=await install.userChoice;if(choice.outcome==="accepted")setHelp(false);setInstall(null)}}><Download size={16}/> Atalho no celular / tablet</button>{help&&<div className="mg-modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setHelp(false)}}><section className="mg-ticket-modal" role="dialog" aria-modal="true" aria-label="Criar atalho" onKeyDown={e=>{if(e.key==="Escape")setHelp(false)}}><button autoFocus className="mg-close-modal" aria-label="Fechar instruções" onClick={()=>setHelp(false)}><X/></button><h2>Gestão Comercial na tela inicial</h2><p><strong>iPhone ou iPad:</strong> abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”.</p><p><strong>Android:</strong> no menu do Chrome, escolha “Adicionar à tela inicial” ou “Instalar aplicativo”.</p><p>O atalho abre o sistema com o mesmo login. É necessário estar conectado à internet.</p></section></div>}</>;
}
