import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../src/lib/reports.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {selectReportRows,validReportRange}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const rows=[
 {id:'income',type:'entrada',unit:'supermercado',date:'2026-11-01',amount:1000},
 {id:'expense',type:'saida',unit:'supermercado',date:'2026-11-30',amount:200},
 {id:'other-income',type:'entrada',unit:'acai',date:'2026-11-15',amount:500},
 {id:'other-expense',type:'saida',unit:'acai',date:'2026-11-15',amount:50},
 {id:'outside',type:'saida',unit:'supermercado',date:'2026-10-31',amount:99}
];
const query=(kind,unit='todos',start='2026-11-01',end='2026-11-30')=>selectReportRows(rows,kind,unit,start,end);
assert.deepEqual(query('entradas').map(r=>r.id),['income','other-income']);
assert.deepEqual(query('saidas').map(r=>r.id),['expense','other-expense']);
assert.deepEqual(query('despesas'),query('saidas'),'Expenses are outgoing payments, never an additional deduction');
assert.deepEqual(query('todos','supermercado').map(r=>r.id),['income','expense']);
assert.equal(query('todos').length,4);
assert.equal(query('todos').reduce((sum,r)=>sum+(r.type==='entrada'?r.amount:-r.amount),0),1250,'Combined balance must count each expense once');
assert.deepEqual(query('todos','todos','2026-11-15','2026-11-15').map(r=>r.id),['other-income','other-expense']);
assert.deepEqual(query('todos','todos','2026-11-30','2026-11-01'),[]);
assert.deepEqual(query('todos','todos','','2026-11-30'),[]);
assert.equal(validReportRange('2026-02-30','2026-03-01'),false);
assert.equal(validReportRange('2028-02-29','2028-02-29'),true);
assert.equal(rows.length,5,'Selecting reports must preserve source records');
console.log('Relatórios: quatro modos, filtros por unidade/data, limites inclusivos e saldo sem duplicar despesas validados.');
