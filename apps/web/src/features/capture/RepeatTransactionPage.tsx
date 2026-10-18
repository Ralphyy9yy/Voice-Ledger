import {useEffect,useState} from 'react';
import {Link,useParams,useSearchParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {api} from '../../lib/api-client';
import {ErrorState,LoadingState} from '../../components/shared/States';
import {CapturePage} from './CapturePage';
export type RepeatEntry={id:string;type:'sale'|'expense';note:string|null;voidedAt:string|null;items:{name:string;quantity:number;unitPriceCentavos:number}[]};
export function RepeatTransactionPage(){
 const {id}=useParams();
 const [params,setParams]=useSearchParams(),[fallbackId]=useState(()=>crypto.randomUUID());
 const copy=params.get('copy'),validCopy=copy&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(copy)?copy:null;
 useEffect(()=>{if(!validCopy)setParams({copy:fallbackId},{replace:true})},[validCopy,fallbackId,setParams]);
 const q=useQuery({queryKey:['transaction',id],queryFn:()=>api<RepeatEntry>(`/transactions/${id}`)});
 if(q.isLoading)return <LoadingState/>;
 if(q.error||q.data?.voidedAt)return <div className="page-container"><ErrorState message={q.error?.message??'Voided entries cannot be repeated. Choose an active transaction.'}/><Link className="btn btn-secondary mt-4" to="/transactions">Back to transactions</Link></div>;
 if(!q.data||!validCopy)return null;
 return <CapturePage key={validCopy} repeat={q.data} repeatId={validCopy}/>;
}
