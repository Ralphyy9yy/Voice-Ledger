import {useEffect,useState} from 'react';
import {useFieldArray,useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Plus,Trash2} from 'lucide-react';
import {Button} from '../../../components/ui/Button';
import {money,toCentavos} from '../../../lib/currency';

const schema=z.object({
 type:z.enum(['sale','expense','']).refine(v=>v!=='','Choose sale or expense'),
 note:z.string().max(1000),
 items:z.array(z.object({name:z.string().trim().min(1,'Item is required').max(160),quantity:z.number().int().positive('Use a positive whole number').max(100000),unitPrice:z.string().refine(x=>toCentavos(x)!==null,'Enter a valid amount')})).min(1).max(50)
});
type Form=z.input<typeof schema>;
export function TransactionDraftForm({initial,onConfirm,busy,ambiguities=[],statedTotalCentavos,onDraftChange}:{initial?:Partial<Form>;onConfirm:(v:any)=>void;busy:boolean;ambiguities?:string[];statedTotalCentavos?:number|null;onDraftChange?:(values:Form)=>void}){
 const [acknowledged,setAcknowledged]=useState(false);
 const {register,control,handleSubmit,watch,formState:{errors}}=useForm<Form,unknown,z.output<typeof schema>>({resolver:zodResolver(schema),defaultValues:{type:initial?.type??'',note:initial?.note??'',items:initial?.items?.length?initial.items:[{name:'',quantity:NaN,unitPrice:''}]}});
 const {fields,append,remove}=useFieldArray({control,name:'items'});
 useEffect(()=>{if(!onDraftChange)return;const subscription=watch(values=>onDraftChange(values as Form));return()=>subscription.unsubscribe()},[watch,onDraftChange]);
 const items=watch('items'),type=watch('type');
 const total=items.reduce((sum,item)=>sum+(Number(item.quantity)||0)*(toCentavos(item.unitPrice)||0),0);
 const validTotal=Number.isSafeInteger(total)&&total>=0;
 const questions=[...(!type?['Was this a sale or an expense?']:[]),...items.flatMap((item,i)=>[...(!item.name.trim()?[`Item ${i+1}: What did you buy or sell?`]:[]),...(!Number.isInteger(item.quantity)||item.quantity<=0||item.quantity>100000?[`Item ${i+1}: How many? Use a whole number from 1 to 100,000.`]:[]),...(toCentavos(item.unitPrice)===null?[`Item ${i+1}: What was the price per item?`]:[])])];
 const mismatch=statedTotalCentavos!=null&&statedTotalCentavos!==total;
 const needsAcknowledgement=ambiguities.length>0||mismatch;
 const highlight=(condition:boolean)=>`field ${condition?'!border-amber-400 !bg-amber-50':''}`;
 return <form onChange={()=>setAcknowledged(false)} onSubmit={handleSubmit(v=>{if(validTotal&&(!needsAcknowledgement||acknowledged))onConfirm({...v,items:v.items.map(i=>({name:i.name,quantity:i.quantity,unitPriceCentavos:toCentavos(i.unitPrice)}))})})}><fieldset disabled={busy} className="space-y-5">
  {(questions.length>0||ambiguities.length>0)&&<section aria-label="Details to review" className="rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold text-amber-900">A few details to check</h3><ul className="mt-2 space-y-2 text-sm text-amber-900">{questions.map(q=><li key={q}>{q}</li>)}{ambiguities.map((a,i)=><li key={i}>{a}</li>)}</ul></section>}
  <fieldset className={!type?'rounded-lg border border-amber-300 bg-amber-50 p-3':''}><legend className="label">Transaction type</legend><div className="flex gap-5"><label><input type="radio" value="sale" {...register('type')}/> Sale</label><label><input type="radio" value="expense" {...register('type')}/> Expense</label></div>{errors.type&&<p role="alert" className="text-xs text-red-700">{errors.type.message}</p>}</fieldset>
  <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">Line items</h2><button type="button" disabled={fields.length>=50||busy} className="btn btn-secondary text-sm disabled:opacity-50" onClick={()=>{setAcknowledged(false);append({name:'',quantity:1,unitPrice:''})}}><Plus size={16}/>Add item</button></div>
   {fields.map((f,i)=><div key={f.id} className="grid gap-3 rounded-lg border border-line p-4 sm:grid-cols-[1fr_100px_150px_44px]">
    <label><span className="label">Item</span><input className={highlight(!items[i]?.name.trim())} {...register(`items.${i}.name`)} aria-invalid={!!errors.items?.[i]?.name}/><span className="text-xs text-red-700">{errors.items?.[i]?.name?.message}</span></label>
    <label><span className="label">Quantity</span><input className={highlight(!Number.isInteger(items[i]?.quantity)||(items[i]?.quantity??0)<=0)} type="number" min="1" max="100000" step="1" {...register(`items.${i}.quantity`,{valueAsNumber:true})} aria-invalid={!!errors.items?.[i]?.quantity}/><span className="text-xs text-red-700">{errors.items?.[i]?.quantity?.message}</span></label>
    <label><span className="label">Unit price (₱)</span><input className={highlight(toCentavos(items[i]?.unitPrice??'')===null)} inputMode="decimal" placeholder="0.00" {...register(`items.${i}.unitPrice`)} aria-invalid={!!errors.items?.[i]?.unitPrice}/><span className="text-xs text-red-700">{errors.items?.[i]?.unitPrice?.message}</span></label>
    <button type="button" className="mt-6 min-h-11 rounded-md text-red-700 hover:bg-red-50 disabled:opacity-40" aria-label={`Remove item ${i+1}`} onClick={()=>{setAcknowledged(false);remove(i)}} disabled={fields.length===1||busy}><Trash2 className="mx-auto" size={18}/></button>
   </div>)}
  </div>
  <label><span className="label">Note (optional)</span><textarea className="field" rows={2} maxLength={1000} {...register('note')}/>{errors.note&&<span className="text-xs text-red-700">{errors.note.message}</span>}</label>
  {mismatch&&<p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">The transcript states {money(statedTotalCentavos!)} but these items total {money(total)}. Correct the quantities or prices, or confirm that the calculated total is the intended amount.</p>}
  {needsAcknowledgement&&<label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={acknowledged} onChange={e=>{e.stopPropagation();setAcknowledged(e.target.checked)}} className="mt-1"/>I checked the unclear details and confirm the amounts shown below.</label>}
  {!validTotal&&<p role="alert" className="text-sm text-red-700">The total is too large. Check quantities and prices.</p>}
  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5"><div><span className="muted text-sm">Calculated total</span><div className="text-2xl font-bold">{validTotal?money(total):'Check amounts'}</div></div><Button disabled={busy||!validTotal||(needsAcknowledgement&&!acknowledged)}>{busy?'Saving…':'Confirm and save'}</Button></div><p className="muted text-xs">Only confirmation saves this transaction and your reviewed transcript. Review all quantities and prices first.</p>
 </fieldset></form>;
}
