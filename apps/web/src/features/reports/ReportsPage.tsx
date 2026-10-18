import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Download,ArrowUpRight,ArrowDownRight,Wallet,ReceiptText} from 'lucide-react';
import {reportQuerySchema,type Report} from '@voiceledger/shared';
import {PageHeader} from '../../components/layout/PageHeader';
import {MoneyDisplay} from '../../components/shared/MoneyDisplay';
import {ErrorState,LoadingState} from '../../components/shared/States';
import {api} from '../../lib/api-client';
import {CashClosing} from './CashClosing';

function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function shifted(date:string,days:number){return new Date(Date.parse(date)+days*86400000).toISOString().slice(0,10)}
const dateLabel=(date:string)=>new Intl.DateTimeFormat('en-PH',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${date}T00:00:00Z`));

export function ReportsPage(){
 const [range,setRange]=useState(()=>({from:today().slice(0,8)+'01',to:today()}));
 const [from,setFrom]=useState(range.from),[to,setTo]=useState(range.to),[error,setError]=useState('');
 const query=new URLSearchParams(range).toString();
 const q=useQuery({queryKey:['reports',range.from,range.to],queryFn:()=>api<Report>(`/reports?${query}`)});
 function apply(next:{from:string;to:string}){
  if(!reportQuerySchema.safeParse(next).success){setError('Choose a start and end date in order, covering no more than 366 days.');return}
  setError('');setFrom(next.from);setTo(next.to);setRange(next);
 }
 const metrics=q.data?[
  {label:'Total sales',value:q.data.totals.salesCentavos,Icon:ArrowUpRight,tone:'bg-[#e7f1e6] text-[#35633e]'},
  {label:'Total expenses',value:q.data.totals.expensesCentavos,Icon:ArrowDownRight,tone:'bg-[#f6ebd9] text-[#98611d]'},
  {label:'Net cash movement',value:q.data.totals.netCentavos,Icon:Wallet,tone:'bg-[#e4eeed] text-[#426b68]'},
  {label:'Transactions',value:q.data.totals.count,Icon:ReceiptText,tone:'bg-[#ecece7] text-[#3f463e]'}
 ]:[];
 return <div className="page-container">
  <PageHeader eyebrow="Your ledger over time" title="Reports" description="Review sales, expenses, and cash movement across days." action={q.data&&!q.isFetching?<a className="btn btn-secondary" href={`/api/reports.csv?${query}`}><Download size={16}/>Export report CSV</a>:undefined}/>
  <CashClosing/>
  <section aria-label="Report date range" className="card mb-5 p-4 md:p-5">
   <div className="mb-4 flex flex-wrap gap-2">{(['Today','Last 7 days','This month'] as const).map(label=>{
    const end=today(),start=label==='Today'?end:label==='Last 7 days'?shifted(end,-6):end.slice(0,8)+'01';
    const active=range.from===start&&range.to===end;
    return <button key={label} type="button" aria-pressed={active} onClick={()=>apply({from:start,to:end})} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${active?'border-[#b9cba6] bg-[#e7efdc] text-[#35633e]':'border-[#e0e5d9] bg-white text-[#687763]'}`}>{label}</button>;
   })}</div>
   <form onSubmit={e=>{e.preventDefault();apply({from,to})}} className="flex flex-wrap items-end gap-3">
    <label className="min-w-0 flex-1 sm:flex-none"><span className="label">From</span><input className="field" type="date" required value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <label className="min-w-0 flex-1 sm:flex-none"><span className="label">To</span><input className="field" type="date" required value={to} onChange={e=>setTo(e.target.value)}/></label>
    <button className="btn btn-primary" type="submit">Apply dates</button>
   </form>
   {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>
  {q.isLoading?<LoadingState/>:q.error?<ErrorState message={q.error.message}/>:q.data&&<>
   <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#758174]"><p>{dateLabel(range.from)} – {dateLabel(range.to)} · Asia/Manila</p><span>{q.data.days.length} {q.data.days.length===1?'day':'days'}</span></div>
   <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(({label,value,Icon,tone})=><section aria-label={label} key={label} className="card p-4 md:p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-xs font-semibold text-[#758174]">{label}</h2><span className={`grid h-8 w-8 place-items-center rounded-lg ${tone}`}><Icon size={16}/></span></div><div className="text-[1.85rem] font-bold tracking-tight">{label==='Transactions'?value:<MoneyDisplay value={value}/>}</div></section>)}</div>
   <p className="muted mb-6 text-xs leading-5">Cash movement is sales minus expenses, not profit. Voided entries are excluded. Reports use each entry’s recorded date and its latest corrected amounts.</p>
   <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-semibold">Daily breakdown</h2><span className="text-xs text-[#758174]">PHP</span></div>
   {q.data.totals.count===0&&<p role="status" className="mb-3 rounded-lg border border-[#dde5d5] bg-[#edf3e7] p-3 text-sm text-[#52664b]">No active transactions in this date range. Try another period or record a transaction.</p>}
   <div className="card overflow-hidden"><div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[600px] text-sm"><caption className="sr-only">Daily report for {range.from} through {range.to}, Manila dates. Voided transactions excluded.</caption><thead className="sticky top-0 bg-[#f5f7f0]"><tr>{['Date','Sales','Expenses','Net movement','Entries'].map((label,i)=><th key={label} scope="col" className={`px-4 py-3 text-xs font-semibold text-[#6a795f] ${i===0?'text-left':'text-right'}`}>{label}</th>)}</tr></thead><tbody className="divide-y divide-[#e8ece3]">{q.data.days.map(day=><tr key={day.date} className="hover:bg-[#fafbf7]"><th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium"><Link className="text-[#35633e] hover:underline" to={`/transactions?from=${day.date}&to=${day.date}`}>{dateLabel(day.date)}</Link></th><td className="px-4 py-3 text-right"><MoneyDisplay value={day.salesCentavos}/></td><td className="px-4 py-3 text-right"><MoneyDisplay value={day.expensesCentavos}/></td><td className={`px-4 py-3 text-right font-semibold ${day.netCentavos<0?'text-[#98611d]':'text-[#35633e]'}`}><MoneyDisplay value={day.netCentavos}/></td><td className="px-4 py-3 text-right tabular-nums">{day.count}</td></tr>)}</tbody><tfoot className="border-t border-[#dfe6d6] bg-[#f5f7f0] font-semibold"><tr><th scope="row" className="px-4 py-3 text-left">Total</th><td className="px-4 py-3 text-right"><MoneyDisplay value={q.data.totals.salesCentavos}/></td><td className="px-4 py-3 text-right"><MoneyDisplay value={q.data.totals.expensesCentavos}/></td><td className="px-4 py-3 text-right"><MoneyDisplay value={q.data.totals.netCentavos}/></td><td className="px-4 py-3 text-right tabular-nums">{q.data.totals.count}</td></tr></tfoot></table></div></div>
  </>}
 </div>;
}
