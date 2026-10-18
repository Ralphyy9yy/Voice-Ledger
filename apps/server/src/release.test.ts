import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import Database from 'better-sqlite3';
import request from 'supertest';
import {afterEach,beforeEach,it,expect} from 'vitest';
import {createApp} from './app.js';
import {config} from './config/index.js';
import {migrate} from './db/migrate.js';
import {backupSummary,createBackup,verifyDatabase} from './db/backup.js';
import {TransactionRepository} from './modules/transactions/transaction.repository.js';
import {TransactionService} from './modules/transactions/transaction.service.js';
import {createInferenceGate} from './lib/inference-gate.js';

let db:Database.Database,dir:string;
beforeEach(()=>{dir=fs.mkdtempSync(path.join(os.tmpdir(),'voiceledger-release-'));db=new Database(':memory:');db.pragma('foreign_keys=ON');migrate(db)});
afterEach(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true})});
const entry=()=>({idempotencyKey:crypto.randomUUID(),type:'sale' as const,items:[{name:'Water',quantity:2,unitPriceCentavos:2000}]});
const client=()=>request(createApp(db,{backupDirectory:dir}));
const host=`localhost:${config.port}`;
it('exports all entries beyond the old 200-entry cap',async()=>{
 const service=new TransactionService(new TransactionRepository(db));
 for(let i=0;i<205;i++)service.create(entry());
 const r=await client().get('/api/export.csv').set('Host',host);
 expect(r.status).toBe(200);expect(r.text.split('\r\n')).toHaveLength(206);
});
it('verifies backups with transaction and audit history intact',async()=>{
 const repo=new TransactionRepository(db),service=new TransactionService(repo);
 const original=service.create(entry());service.void(original.id,'Duplicate');
 const name=await createBackup(db,dir);verifyDatabase(path.join(dir,name));
 expect(backupSummary(dir)).toMatchObject({count:1,latest:{file:name}});
 const restored=new Database(path.join(dir,name));
 try{expect(new TransactionRepository(restored).findById(original.id)?.voidedAt).toBeTruthy();expect(new TransactionRepository(restored).audit(original.id)).toHaveLength(1)}finally{restored.close()}
});
it('returns useful errors for malformed JSON and unknown API routes',async()=>{
 const r=await client().post('/api/transactions').set('Host',host).set('x-voiceledger-csrf','1').set('Content-Type','application/json').send('{');
 expect(r.status).toBe(400);expect(r.body.error.code).toBe('INVALID_JSON');
 const missing=await client().get('/api/unknown').set('Host',host);expect(missing.status).toBe(404);expect(missing.body.error.code).toBe('NOT_FOUND');
});
it('rejects oversized uploads with 413 instead of a generic 500',async()=>{
 const r=await client().post('/api/transcriptions').set('Host',host).set('x-voiceledger-csrf','1').attach('audio',Buffer.alloc(config.maxAudioBytes+1),{filename:'test.webm',contentType:'audio/webm'});
 expect(r.status).toBe(413);
});
it('prevents simultaneous AI jobs and frees the slot after failure',async()=>{
 const gate=createInferenceGate();let release!:()=>void;
 const first=gate(()=>new Promise<void>(resolve=>{release=resolve}));
 await expect(gate(async()=>1)).rejects.toMatchObject({status:429});
 release();await first;
 await expect(gate(async()=>{throw new Error('failure')})).rejects.toThrow('failure');
 expect(await gate(async()=>42)).toBe(42);
});
it('rejects reusing a confirmation key with changed values',()=>{
 const service=new TransactionService(new TransactionRepository(db)),data=entry();
 service.create(data);
 expect(()=>service.create({...data,note:'changed'})).toThrow('already saved');
});
it('rejects stale corrections and preserves the original entry',()=>{
 const repo=new TransactionRepository(db),service=new TransactionService(repo),data=entry();
 const original=service.create(data);
 expect(()=>service.update(original.id,{...data,reason:'Correction',expectedUpdatedAt:'2000-01-01T00:00:00.000Z'})).toThrow('another window');
 expect(repo.audit(original.id)).toHaveLength(0);
});
it('serves only a named verified backup for download',async()=>{
 const r=await client().post('/api/backups').set('Host',host).set('x-voiceledger-csrf','1');
 expect(r.status).toBe(201);
 const download=await client().get(`/api/backups/${r.body.file}`).set('Host',host);
 expect(download.status).toBe(200);expect(download.headers['content-disposition']).toContain(r.body.file);
 const invalid=await client().get('/api/backups/not-a-backup.db').set('Host',host);expect(invalid.status).toBe(404);
});
it('recovery creates a verified copy and refuses to overwrite it',async()=>{
 const original=new TransactionService(new TransactionRepository(db)).create(entry());
 const backup=path.join(dir,await createBackup(db,dir)),dest=path.join(dir,'recovered.db');
 execFileSync(process.execPath,[path.join(config.root,'node_modules/tsx/dist/cli.mjs'),path.join(config.root,'scripts/verify-backup.ts'),backup],{cwd:config.root,stdio:'pipe'});
 const args=[path.join(config.root,'node_modules/tsx/dist/cli.mjs'),path.join(config.root,'scripts/restore-backup.ts'),backup,dest];
 execFileSync(process.execPath,args,{cwd:config.root,stdio:'pipe'});
 verifyDatabase(dest);
 const recovered=new Database(dest,{readonly:true});
 try{expect(new TransactionRepository(recovered).findById(original.id)?.totalCentavos).toBe(4000)}finally{recovered.close()}
 expect(()=>execFileSync(process.execPath,args,{cwd:config.root,stdio:'pipe'})).toThrow();
});
