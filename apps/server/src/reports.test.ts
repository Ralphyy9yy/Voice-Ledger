import Database from 'better-sqlite3';
import request from 'supertest';
import {beforeEach,afterEach,it,expect} from 'vitest';
import {migrate} from './db/migrate.js';
import {TransactionRepository} from './modules/transactions/transaction.repository.js';
import {TransactionService} from './modules/transactions/transaction.service.js';
import {createApp} from './app.js';
import {config} from './config/index.js';
let db:Database.Database,repo:TransactionRepository,service:TransactionService;
beforeEach(()=>{db=new Database(':memory:');db.pragma('foreign_keys=ON');migrate(db);repo=new TransactionRepository(db);service=new TransactionService(repo)});
afterEach(()=>db.close());
function add(type:'sale'|'expense',amount:number,created:string){const entry=service.create({idempotencyKey:crypto.randomUUID(),type,items:[{name:'Test',quantity:1,unitPriceCentavos:amount}]});db.prepare('UPDATE transactions SET created_at=? WHERE id=?').run(created,entry.id);return entry}
it('uses inclusive Manila dates, excludes voids, and fills empty days',()=>{
 add('sale',100,'2000-01-01T15:59:59.000Z');
 add('sale',10000,'2000-01-01T16:00:00.000Z');
 add('expense',3000,'2000-01-02T10:00:00.000Z');
 const voided=add('sale',90000,'2000-01-02T10:00:00.000Z');service.void(voided.id,'Duplicate');
 const report=repo.report('2000-01-02','2000-01-03');
 expect(report.totals).toEqual({salesCentavos:10000,expensesCentavos:3000,netCentavos:7000,count:2});
 expect(report.days[1]).toEqual({date:'2000-01-03',salesCentavos:0,expensesCentavos:0,netCentavos:0,count:0});
});
it('includes every transaction and latest corrections',()=>{
 for(let i=0;i<205;i++)add('sale',100,'2000-01-02T01:00:00.000Z');
 const expense=add('expense',200,'2000-01-02T02:00:00.000Z');
 service.update(expense.id,{type:'expense',expectedUpdatedAt:expense.updatedAt,reason:'Price correction',items:[{name:'Test',quantity:1,unitPriceCentavos:300}]});
 expect(repo.report('2000-01-02','2000-01-02').totals).toEqual({salesCentavos:20500,expensesCentavos:300,netCentavos:20200,count:206});
});
it('validates dates and exports the selected daily totals',async()=>{
 const app=createApp(db),host=`localhost:${config.port}`;
 for(const query of ['from=2000-02-30&to=2000-03-01','from=2000-02-01&to=2000-01-01','from=2000-01-01&to=2002-01-01','']){
  expect((await request(app).get(`/api/reports?${query}`).set('Host',host)).status).toBe(400);
 }
 add('expense',3000,'2000-01-02T01:00:00.000Z');
 const response=await request(app).get('/api/reports.csv?from=2000-01-02&to=2000-01-02').set('Host',host);
 expect(response.status).toBe(200);expect(response.headers['content-disposition']).toContain('2000-01-02-to-2000-01-02.csv');expect(response.text).toContain('"2000-01-02","0.00","30.00","-30.00"');expect(response.text).toContain('Total');
});
