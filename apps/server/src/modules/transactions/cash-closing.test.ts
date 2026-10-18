import Database from 'better-sqlite3';
import request from 'supertest';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {migrate} from '../../db/migrate.js';
import {createApp} from '../../app.js';
let db:Database.Database;
beforeEach(()=>{db=new Database(':memory:');db.pragma('foreign_keys=ON');migrate(db)});
afterEach(()=>db.close());
const host='localhost:4310',date='2026-01-01';
function entry(type='sale',amount=5000){db.prepare('INSERT INTO transactions(id,idempotency_key,type,total_centavos,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),crypto.randomUUID(),type,amount,'2025-12-31T16:00:00.000Z','2025-12-31T16:00:00.000Z')}
async function view(){return request(createApp(db)).get(`/api/cash-closings/${date}`).set('Host',host)}
async function close(ledgerVersion:string,extra={}){return request(createApp(db)).post(`/api/cash-closings/${date}`).set('Host',host).set('x-voiceledger-csrf','1').send({openingCentavos:10000,actualCentavos:14500,ledgerVersion,...extra})}
it('uses Manila dates and keeps a permanent snapshot when transactions change',async()=>{
 entry();entry('expense',1000);
 const before=await view();expect(before.body.salesCentavos).toBe(5000);expect(before.body.expensesCentavos).toBe(1000);
 const saved=await close(before.body.ledgerVersion);expect(saved.status).toBe(201);expect(saved.body.closing.expectedCentavos).toBe(14000);expect(saved.body.closing.actualCentavos).toBe(14500);
 entry('sale',2000);const changed=await view();expect(changed.body.changedSinceClosing).toBe(true);expect(changed.body.closing.expectedCentavos).toBe(14000);expect(changed.body.salesCentavos).toBe(7000);
 expect((await close(changed.body.ledgerVersion)).status).toBe(409);
});
it('rejects stale totals and invalid cash amounts',async()=>{
 const original=await view();entry();expect((await close(original.body.ledgerVersion)).status).toBe(409);
 const current=await view();expect((await close(current.body.ledgerVersion,{actualCentavos:-1})).status).toBe(400);
 expect((await close(current.body.ledgerVersion,{openingCentavos:Number.MAX_SAFE_INTEGER})).status).toBe(422);
});
it('excludes voided entries and rejects future and malformed dates',async()=>{
 entry();db.prepare('UPDATE transactions SET voided_at=?').run(new Date().toISOString());expect((await view()).body.count).toBe(0);
 for(const invalid of ['2099-01-01','2026-02-30'])expect((await request(createApp(db)).get(`/api/cash-closings/${invalid}`).set('Host',host)).status).toBe(400);
});
