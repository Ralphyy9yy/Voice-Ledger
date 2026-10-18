import {createHash} from 'node:crypto';
import type Database from 'better-sqlite3';
import {z} from 'zod';
import {TransactionRepository} from './transaction.repository.js';
import {AppError} from '../../lib/errors.js';

export const closingDateSchema=z.string().date().refine(date=>date<=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),'Choose today or an earlier date.');
const money=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const closingInputSchema=z.object({openingCentavos:money,actualCentavos:money,ledgerVersion:z.string().length(64),note:z.string().trim().max(1000).default('')});
export class CashClosingService {
 constructor(private db:Database.Database){}
 view(date:string){
  const day=new TransactionRepository(this.db).report(date,date).days[0]!;
  const rows=this.db.prepare("SELECT id,updated_at,voided_at FROM transactions WHERE date(created_at,'+8 hours')=? ORDER BY id").all(date);
  const ledgerVersion=createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  const closing=this.db.prepare('SELECT opening_centavos AS openingCentavos,actual_centavos AS actualCentavos,expected_centavos AS expectedCentavos,sales_centavos AS salesCentavos,expenses_centavos AS expensesCentavos,transaction_count AS count,ledger_version AS ledgerVersion,note,closed_at AS closedAt FROM cash_closings WHERE date=?').get(date) as {ledgerVersion:string}|undefined;
  return{...day,ledgerVersion,closing:closing??null,changedSinceClosing:!!closing&&closing.ledgerVersion!==ledgerVersion};
 }
 close(date:string,input:z.infer<typeof closingInputSchema>){
  return this.db.transaction(()=>{
   const current=this.view(date);
   if(current.closing)throw new AppError(409,'This date already has a saved closing.','ALREADY_CLOSED');
   if(current.ledgerVersion!==input.ledgerVersion)throw new AppError(409,'Transactions changed. Refresh the closing totals before saving.','STALE_CLOSING');
   const expected=input.openingCentavos+current.salesCentavos-current.expensesCentavos;
   if(!Number.isSafeInteger(expected)||!Number.isSafeInteger(input.actualCentavos-expected))throw new AppError(422,'Cash amounts exceed safe limits.','AMOUNT_LIMIT');
   this.db.prepare('INSERT INTO cash_closings VALUES(?,?,?,?,?,?,?,?,?,?)').run(date,input.openingCentavos,input.actualCentavos,expected,current.salesCentavos,current.expensesCentavos,current.count,current.ledgerVersion,input.note,new Date().toISOString());
   return this.view(date);
  })();
 }
}
