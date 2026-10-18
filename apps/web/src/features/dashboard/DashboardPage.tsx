import {Link,useSearchParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {ArrowDownRight,ArrowUpRight,CalendarDays,Plus,ReceiptText,Wallet} from 'lucide-react';
import {PageHeader} from '../../components/layout/PageHeader';
import {Button} from '../../components/ui/Button';
import {EmptyState,ErrorState,LoadingState} from '../../components/shared/States';
import {MoneyDisplay} from '../../components/shared/MoneyDisplay';
import {TransactionList} from '../transactions/TransactionList';
import {api} from '../../lib/api-client';

function StatCard({label,value,icon:Icon,tone='green',count=false}:{label:string;value:number;icon:typeof Wallet;tone?:'green'|'amber'|'ink'|'blue';count?:boolean}) {
  const tones={green:'bg-[#e7f1e6] text-[#35633e]',amber:'bg-[#f6ebd9] text-[#98611d]',ink:'bg-[#ecece7] text-[#3f463e]',blue:'bg-[#e4eeed] text-[#426b68]'};
  return <div className="card p-5"><div className="mb-5 flex items-center justify-between"><span className="text-xs font-semibold text-[#758174]">{label}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}><Icon size={17}/></span></div><div className="text-[1.85rem] font-bold tracking-[-.05em]">{count?value:<MoneyDisplay value={value}/>}</div><p className="mt-2 text-[11px] text-[#8a9387]">{count?'Confirmed entries today':'Recorded today · PHP'}</p></div>;
}

export function DashboardPage(){
  const [params]=useSearchParams();
  const q=useQuery({queryKey:['dashboard'],queryFn:()=>api<any>('/dashboard')});
  const dateLabel=new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',weekday:'long',month:'long',day:'numeric'}).format(new Date());
  return <div className="page-container">
    {params.get('saved')&&<div role="status" className="mb-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-900">Transaction saved successfully.</div>}
    <PageHeader eyebrow={dateLabel} title="Your day, at a glance." description="A little clarity for every peso in and out." action={<Link to="/add"><Button><Plus size={17}/>New transaction</Button></Link>}/>
    {q.isLoading?<LoadingState/>:q.error?<ErrorState message={q.error.message}/>:<>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><StatCard label="Total sales" value={q.data.salesCentavos} icon={ArrowUpRight}/><StatCard label="Total expenses" value={q.data.expensesCentavos} icon={ArrowDownRight} tone="amber"/><StatCard label="Net cash movement" value={q.data.netCentavos} icon={Wallet} tone="blue"/><StatCard label="Transactions" value={q.data.count} icon={ReceiptText} tone="ink" count/></div>
      <div className="mb-9 flex items-start gap-2.5 px-1 text-xs leading-5 text-[#778172]"><CalendarDays className="mt-0.5 shrink-0" size={15}/><p>Sales minus expenses recorded here. This is cash movement, not profit.</p></div>
      <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-bold tracking-tight">Recent activity</h2><p className="mt-1 text-xs text-[#7b8577]">Every entry, right where you need it.</p></div><Link className="text-xs font-semibold text-[#35633e] hover:underline" to="/transactions">View all transactions &rarr;</Link></div>
      {q.data.recent.length?<div className="card overflow-hidden"><TransactionList items={q.data.recent}/></div>:<EmptyState title="A fresh page for your business" body="Your next sale or expense starts your story. Record your first transaction above."/>}
    </>}
  </div>;
}
