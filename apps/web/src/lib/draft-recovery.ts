import {z} from 'zod';
const prefix='voiceledger.unsaved.';
const valuesSchema=z.object({type:z.enum(['sale','expense','']),note:z.string().max(1000),items:z.array(z.object({name:z.string().max(10000),quantity:z.number().finite().nullable(),unitPrice:z.string().max(1000)})).max(50)});
const schema=z.object({version:z.literal(1),id:z.string().uuid(),updatedAt:z.string().datetime(),step:z.enum(['capture','transcript','draft']),text:z.string().max(10000),draft:valuesSchema.nullable(),ambiguities:z.array(z.string()).max(100),statedTotal:z.number().int().nullable()});
export type RecoveryDraft=z.infer<typeof schema>;
export function recoverableDrafts():RecoveryDraft[]{
 try{
  const drafts:RecoveryDraft[]=[];
  for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;
   try{const parsed=schema.safeParse(JSON.parse(localStorage.getItem(key)??''));if(parsed.success&&key===prefix+parsed.data.id)drafts.push(parsed.data)}catch{}
  }
  return drafts.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 }catch{return []}
}
export function rememberDraft(value:RecoveryDraft){
 try{const parsed=schema.safeParse(JSON.parse(JSON.stringify(value)));if(!parsed.success)return false;localStorage.setItem(prefix+value.id,JSON.stringify(parsed.data));return true}catch{return false}
}
export function forgetDraft(id:string){try{localStorage.removeItem(prefix+id);return true}catch{return false}}
