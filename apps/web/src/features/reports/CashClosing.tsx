import {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {api} from '../../lib/api-client';
import {MoneyDisplay} from '../../components/shared/MoneyDisplay';

type Snapshot={openingCentavos:number;actualCentavos:number;expectedCentavos:number;salesCentavos:number;expensesCentavos:number;count:number;note:string;closedAt:string};
type View={date:string;salesCentavos:number;expensesCentavos:number;count:number;ledgerVersion:string;closing:Snapshot|null;changedSinceClosing:boolean};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function centavos(value:string){
 if(!/^\d+(\.\d{1,2})?$/.test(value))return null;
 const [whole,fraction='']=value.split('.');
 const amount=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 return Number.isSafeInteger(amount)?amount:null;
}
export function CashClosing(){
 const [date,setDate]=useState(today),[opening,setOpening]=useState(''),[actual,setActual]=useState(''),[note,setNote]=useState('');
 const client=useQueryClient();
 const q=useQuery({queryKey:['cash-closing',date],queryFn:()=>api<View>(`/cash-closings/${date}`),enabled:!!date});
 const save=useMutation({mutationFn:()=>api<View>(`/cash-closings/${date}`,{method:'POST',body:JSON.stringify({openingCentavos:centavos(opening),actualCentavos:centavos(actual),note,ledgerVersion:q.data?.ledgerVersion})}),onSuccess:data=>{client.setQueryData(['cash-closing',date],data);setOpening('');setActual('');setNote('')}});
 const openingAmount=centavos(opening),actualAmount=centavos(actual),data=q.data;
 const expected=data&&openingAmount!==null?openingAmount+data.salesCentavos-data.expensesCentavos:null;
 const difference=expected!==null&&actualAmount!==null?actualAmount-expected:null;
 const safe=expected!==null&&Number.isSafeInteger(expected)&&difference!==null&&Number.isSafeInteger(difference);
 const snapshot=data?.closing;
 return <section aria-labelledby="cash-closing-title" className="mb-8 border-b border-[#d8d5ca] pb-6">
  <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 id="cash-closing-title" className="text-lg font-semibold">Daily cash closing</h2><p className="muted mt-1 text-sm">Count your cash and compare it with the ledger. Dates use Asia/Manila.</p></div><label><span className="label">Closing date</span><input className="field" type="date" required max={today()} value={date} disabled={save.isPending} onChange={e=>{setDate(e.target.value);setOpening('');setActual('');setNote('');save.reset()}}/></label></div>
  <p className="muted mb-4 text-sm">Expected cash = opening cash + sales − expenses. This assumes every recorded entry was paid in cash; credit sales, transfers, and withdrawals are not tracked separately.</p>
  {q.isLoading?<p role="status">Loading cash totals…</p>:q.error?<p role="alert">{q.error.message}</p>:data&&<>
   {data.changedSinceClosing&&<p role="alert" className="mb-4 text-sm text-amber-800">Transactions changed after this closing. The saved count below is a historical snapshot; check the current report to reconcile the difference.</p>}
   {snapshot?<div className="space-y-3"><p className="text-sm">Closed {new Date(snapshot.closedAt).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} · {snapshot.count} entries</p><dl className="grid grid-cols-2 gap-4 md:grid-cols-5">{[['Opening cash',snapshot.openingCentavos],['Sales',snapshot.salesCentavos],['Expenses',snapshot.expensesCentavos],['Expected cash',snapshot.expectedCentavos],['Actual cash',snapshot.actualCentavos]].map(([label,value])=><div key={label}><dt className="muted text-sm">{label}</dt><dd className="mt-1 font-semibold"><MoneyDisplay value={Number(value)}/></dd></div>)}</dl><p className="font-semibold">{snapshot.actualCentavos===snapshot.expectedCentavos?'Balanced':snapshot.actualCentavos>snapshot.expectedCentavos?'Overage':'Shortage'}: <MoneyDisplay value={Math.abs(snapshot.actualCentavos-snapshot.expectedCentavos)}/></p>{snapshot.note&&<p className="whitespace-pre-wrap text-sm">{snapshot.note}</p>}</div>:<form onSubmit={e=>{e.preventDefault();if(safe&&!q.isFetching)save.mutate()}}>
    <p className="mb-4 text-sm">{data.count} entries · Sales <MoneyDisplay value={data.salesCentavos}/> · Expenses <MoneyDisplay value={data.expensesCentavos}/></p>
    <fieldset disabled={save.isPending} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label><span className="label">Opening cash (PHP)</span><input className="field" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" placeholder="0.00" value={opening} onChange={e=>setOpening(e.target.value)}/></label><label><span className="label">Actual cash counted (PHP)</span><input className="field" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" placeholder="0.00" value={actual} onChange={e=>setActual(e.target.value)}/></label></div>
    {safe&&<p aria-live="polite">Expected cash: <MoneyDisplay value={expected!}/> · {difference===0?'Balanced':difference!>0?'Overage':'Shortage'}: <MoneyDisplay value={Math.abs(difference!)}/></p>}
    <label className="block"><span className="label">Closing note (optional)</span><textarea className="field" maxLength={1000} rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label>
    <p className="muted text-xs">Saving keeps a permanent snapshot for this date. Check the amounts before closing.</p>
    <button className="btn btn-primary" disabled={!safe||q.isFetching} type="submit">{save.isPending?'Saving…':'Save cash closing'}</button></fieldset>
   </form>}
   {save.error&&<div role="alert" className="mt-3 text-sm text-red-700">{save.error.message} <button type="button" className="underline" onClick={()=>{void q.refetch();save.reset()}}>Refresh closing</button></div>}
  </>}
 </section>;
}
