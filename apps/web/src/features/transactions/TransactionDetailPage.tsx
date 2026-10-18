import {useRef,useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {Link,useNavigate,useParams} from 'react-router-dom';
import {ArrowLeft,Pencil,History,FileText,ChevronDown,ShieldCheck} from 'lucide-react';
import {MoneyDisplay} from '../../components/shared/MoneyDisplay';
import {ErrorState,LoadingState} from '../../components/shared/States';
import {Button} from '../../components/ui/Button';
import {TransactionDraftForm} from '../capture/components/TransactionDraftForm';
import {api} from '../../lib/api-client';

const date=(value:string)=>new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));
export function TransactionDetailPage(){
 const {id}=useParams(),nav=useNavigate(),qc=useQueryClient();
 const repeatId=useRef(crypto.randomUUID());
 const [reason,setReason]=useState(''),[editing,setEditing]=useState(false),[editReason,setEditReason]=useState(''),[editVersion,setEditVersion]=useState('');
 const q=useQuery({queryKey:['transaction',id],queryFn:()=>api<any>(`/transactions/${id}`)});
 const voidM=useMutation({mutationFn:()=>api(`/transactions/${id}/void`,{method:'POST',body:JSON.stringify({reason})}),onSuccess:async()=>{await qc.invalidateQueries();nav('/transactions')}});
 const editM=useMutation({mutationFn:(form:any)=>api(`/transactions/${id}`,{method:'PUT',body:JSON.stringify({...form,reason:editReason,expectedUpdatedAt:editVersion,transcript:q.data.transcript??undefined})}),onSuccess:async()=>{await qc.invalidateQueries();setEditing(false);setEditReason('')}});
 if(q.isLoading)return <LoadingState/>;
 if(q.error)return <div className="p-10"><ErrorState message={q.error.message}/></div>;
 const t=q.data,sale=t.type==='sale';
 const initial={type:t.type,note:t.note??'',items:t.items.map((x:any)=>({name:x.name,quantity:x.quantity,unitPrice:(x.unitPriceCentavos/100).toFixed(2)}))};
 return <div className="page-container page-container-detail">
  <Link to="/transactions" className="mb-3 inline-flex min-h-8 items-center gap-2 text-sm font-semibold text-[#637460] hover:text-[#244532]"><ArrowLeft size={16}/>Transactions</Link>
  <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
   <div><p className="muted mb-2 text-xs">{sale?'Sale':'Expense'} · {t.voidedAt?'Voided':'Recorded'}</p><h1 className="break-words text-3xl font-bold tracking-tight">{t.items.map((x:any)=>x.name).join(', ')}</h1><p className="muted mt-2 text-sm">{date(t.createdAt)} · Manila time</p></div>
   {!t.voidedAt&&!editing&&<div className="flex flex-wrap gap-2"><Link className="btn btn-primary" to={`/transactions/${t.id}/repeat?copy=${repeatId.current}`}>Repeat transaction</Link><button className="btn btn-secondary" onClick={()=>{editM.reset();setEditVersion(t.updatedAt);setEditing(true)}}><Pencil size={15}/>Edit transaction</button></div>}
  </header>
  {editing?<section className="card p-5 md:p-7"><h2 className="mb-2 text-lg font-bold">Edit transaction</h2><p className="muted mb-5 text-sm">Changes keep a record of the original entry and your reason.</p><label><span className="label">Reason for correction</span><input className="field mb-5" maxLength={500} value={editReason} onChange={e=>setEditReason(e.target.value)} required/></label>{editM.error&&<ErrorState message={editM.error.message}/>}<TransactionDraftForm initial={initial} busy={editM.isPending||!editReason.trim()} onConfirm={x=>editM.mutate(x)}/><button className="btn btn-secondary mt-3" disabled={editM.isPending} onClick={()=>setEditing(false)}>Cancel</button></section>:<>
   <section aria-label="Transaction receipt" className="card overflow-hidden">
    <div className="flex items-start justify-between gap-3 border-b border-[#e4e9df] bg-[#f9fbf5] px-5 py-6 md:px-7"><div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#76816e]">Total {sale?'sale':'expense'}</p><MoneyDisplay value={t.totalCentavos} className={`text-4xl font-bold tracking-tight ${t.voidedAt?'text-[#899083] line-through':'text-[#244532]'}`}/></div></div>
    <div className="px-5 py-5 md:px-7">
     {t.voidedAt&&<p className="mb-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">This entry is voided and excluded from summaries.</p>}
     <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-widest text-[#8b9583]"><span>Item / calculation</span><span>Amount</span></div>
     <div className="divide-y divide-[#e8ece3]">{t.items.map((item:any)=><div key={item.id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="break-words font-semibold">{item.name}</p><p className="muted mt-1 text-sm">{item.quantity} × <MoneyDisplay value={item.unitPriceCentavos}/></p></div><MoneyDisplay value={item.lineTotalCentavos} className="shrink-0 font-semibold tabular-nums"/></div>)}</div>
     <div className="flex justify-between border-t border-dashed border-[#cfd8c6] pt-4 text-sm font-bold"><span>Total</span><MoneyDisplay value={t.totalCentavos}/></div>
     {t.note&&<div className="mt-5 border-t border-[#e8ece3] pt-4"><h2 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#7a8570]">Note</h2><p className="whitespace-pre-wrap break-words text-sm leading-6">{t.note}</p></div>}
    </div>
    <div className="flex items-center gap-2 border-t border-[#e8ece3] px-5 py-3 text-[11px] text-[#7b8872] md:px-7"><ShieldCheck size={14}/>Saved locally · Philippine peso</div>
   </section>
   <section aria-label="Transaction records" className="mt-6"><h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#7a8570]">Details &amp; history</h2><div className="card overflow-hidden divide-y divide-[#e8ece3]">
    {t.transcript&&<details className="group"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-semibold"><FileText size={17} className="text-[#7b8872]"/>Reviewed transcript<ChevronDown size={16} className="ml-auto transition-transform group-open:rotate-180"/></summary><p className="whitespace-pre-wrap break-words px-5 pb-5 text-sm leading-7 text-[#65715e]">{t.transcript}</p></details>}
    <details open={t.audit.length>0} className="group"><summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-semibold"><History size={17} className="text-[#7b8872]"/>Transaction history<span className="text-xs font-normal text-[#6d7a62]">{t.audit.length+1}</span><ChevronDown size={16} className="ml-auto transition-transform group-open:rotate-180"/></summary><ol className="space-y-4 px-5 pb-5">{t.audit.map((a:any)=><li key={a.id} className="border-l-2 border-[#d9e5cb] pl-4"><p className="text-sm font-semibold">{a.kind==='corrected'?'Transaction edited':'Transaction voided'}</p><p className="mt-1 break-words text-sm text-[#65715e]">{a.reason}</p><p className="mt-1 text-xs text-[#8b9583]">{date(a.createdAt)}</p></li>)}<li className="border-l-2 border-[#d9e5cb] pl-4"><p className="text-sm font-semibold">Transaction recorded</p><p className="mt-1 text-xs text-[#8b9583]">{date(t.createdAt)}</p></li></ol></details>
   </div></section>
   {!t.voidedAt&&<details className="group mt-6 rounded-xl border border-[#e1e4dc]"><summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 py-3 text-xs font-semibold text-[#7c8275]">More actions<ChevronDown size={15} className="transition-transform group-open:rotate-180"/></summary><div className="border-t border-[#e1e4dc] p-5"><h2 className="font-semibold text-red-800">Void transaction</h2><p className="muted mb-4 mt-1 text-sm leading-6">Remove this entry from totals. The transaction and its history remain in your ledger.</p><label><span className="label">Reason</span><input className="field" maxLength={500} placeholder="Why should this entry be voided?" value={reason} onChange={e=>setReason(e.target.value)}/></label>{voidM.error&&<p role="alert" className="mt-2 text-sm text-red-700">{voidM.error.message}</p>}<Button className="btn-danger mt-3" disabled={!reason.trim()||voidM.isPending} onClick={()=>{if(confirm('Void this transaction? It will be excluded from totals, but its history will be kept.'))voidM.mutate()}}>{voidM.isPending?'Voiding…':'Void transaction'}</Button></div></details>}
  </>}
 </div>;
}
