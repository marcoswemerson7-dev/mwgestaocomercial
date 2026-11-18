export type ReportKind = "todos" | "entradas" | "saidas" | "despesas";
export const reportTitles: Record<ReportKind,string> = {
 todos:"RELATÓRIO FINANCEIRO COMPLETO",
 entradas:"RELATÓRIO DE ENTRADAS",
 saidas:"RELATÓRIO DE SAÍDAS",
 despesas:"RELATÓRIO DE DESPESAS"
};
export function validReportRange(start:string,end:string):boolean{
 const valid=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+"T12:00:00Z"))&&new Date(value+"T12:00:00Z").toISOString().slice(0,10)===value;
 return valid(start)&&valid(end)&&start<=end;
}
export function selectReportRows<T extends {type:"entrada"|"saida";unit:string;date:string}>(rows:T[],kind:ReportKind,unit:string,start:string,end:string):T[]{
 if(!validReportRange(start,end))return [];
 return rows.filter(row=>(unit==="todos"||row.unit===unit)&&row.date>=start&&row.date<=end&&(kind==="todos"||(kind==="entradas"?row.type==="entrada":row.type==="saida")));
}
