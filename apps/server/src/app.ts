import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import multer from 'multer';
import {createTransactionSchema,extractRequestSchema,listTransactionQuerySchema,recordingLanguageSchema,reportQuerySchema,updateTransactionSchema,voidTransactionSchema} from '@voiceledger/shared';
import type Database from 'better-sqlite3';
import {config} from './config/index.js';
import {AppError} from './lib/errors.js';
import {createInferenceGate} from './lib/inference-gate.js';
import {backupSummary,createBackup} from './db/backup.js';
import {TransactionRepository} from './modules/transactions/transaction.repository.js';
import {TransactionService} from './modules/transactions/transaction.service.js';
import {CashClosingService,closingDateSchema,closingInputSchema} from './modules/transactions/cash-closing.js';
import {OllamaProvider} from './providers/ai/ollama-provider.js';
import {WhisperProvider} from './providers/speech/whisper-provider.js';
import {transcribeAudio} from './modules/transcription/transcription.service.js';

const allowedHosts=new Set([`localhost:${config.port}`,`127.0.0.1:${config.port}`,`[::1]:${config.port}`]);
const allowedOrigins=new Set([config.webOrigin,...[config.port,...(!config.isProduction?[5173]:[])].flatMap(port=>[`http://localhost:${port}`,`http://127.0.0.1:${port}`,`http://[::1]:${port}`])]);
function csvCell(value:string|number){const s=String(value);const formula=(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))&&!/^-?\d+(?:\.\d+)?$/.test(s);const safe=formula?`'${s}`:s;return `"${safe.replaceAll('"','""')}"`}

export function createApp(db:Database.Database,options:{backupDirectory?:string}={}){
 const app=express(),repo=new TransactionRepository(db),service=new TransactionService(repo),ai=new OllamaProvider(),speech=new WhisperProvider(),infer=createInferenceGate();
 let backupBusy=false;
 app.disable('x-powered-by');
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],connectSrc:["'self'"],upgradeInsecureRequests:null}},strictTransportSecurity:false}));
 app.use((_q,r,next)=>{r.setHeader('X-Request-ID',crypto.randomUUID());next()});
 app.use((q,r,next)=>{if(!allowedHosts.has(q.headers.host??''))return r.status(403).json({error:{code:'INVALID_HOST',message:'Invalid local host'}});next()});
 app.use(cors({origin:(origin,cb)=>cb(null,!origin||allowedOrigins.has(origin)),credentials:false}));
 app.use('/api',(_q,r,next)=>{r.setHeader('Cache-Control','no-store');next()});
 app.use('/api',(q,r,next)=>{
  if(!['GET','HEAD','OPTIONS'].includes(q.method)){
   if(q.headers.origin&&!allowedOrigins.has(q.headers.origin))return r.status(403).json({error:{code:'INVALID_ORIGIN',message:'Origin not allowed'}});
   if(q.headers['x-voiceledger-csrf']!=='1')return r.status(403).json({error:{code:'CSRF',message:'Missing request verification header'}});
  }
  next();
 });
 app.use(express.json({limit:'200kb'}));
 app.get('/api/health',(_q,r)=>{db.prepare('SELECT 1').get();r.json({ok:true})});
 app.get('/api/settings/status',async(_q,r)=>{
  const [ollama,whisper]=await Promise.all([ai.status(),speech.status()]);
  r.json({currency:'PHP',timezone:'Asia/Manila',ollama,whisper,model:config.ollamaModel,automaticBackups:config.isProduction,storage:{databaseName:path.basename(config.databasePath),...backupSummary(options.backupDirectory)},privacy:'Audio is deleted after processing. Confirmed transcripts are stored in the ledger; unfinished text and drafts are kept in browser recovery storage. Local data, recovery copies, and backups are not encrypted at rest.'});
 });
 app.post('/api/extractions',async(q,r)=>{
  const {text}=extractRequestSchema.parse(q.body);
  const abort=new AbortController();
  const cancel=()=>{if(!r.writableEnded)abort.abort()};r.on('close',cancel);
  try{r.json(await infer(()=>ai.extract(text,abort.signal)))}finally{r.off('close',cancel)}
 });
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:config.maxAudioBytes,files:1,fields:1,fieldSize:32,parts:2}});
 app.post('/api/transcriptions',upload.single('audio'),async(q,r)=>{
  if(!q.file)throw new AppError(400,'Audio is required','AUDIO_REQUIRED');
  const language=recordingLanguageSchema.default('auto').parse(q.body.language);
  const abort=new AbortController();
  const cancel=()=>{if(!r.writableEnded)abort.abort()};r.on('close',cancel);
  try{r.json({text:await infer(()=>transcribeAudio(q.file!.buffer,language,abort.signal))})}finally{r.off('close',cancel)}
 });
 app.get('/api/transactions',(q,r)=>r.json(repo.list(listTransactionQuerySchema.parse(q.query))));
 app.get('/api/transactions/:id',(q,r)=>{const item=repo.findById(q.params.id);if(!item)throw new AppError(404,'Transaction not found','NOT_FOUND');r.json({...item,audit:repo.audit(q.params.id)})});
 app.post('/api/transactions',(q,r)=>r.status(201).json(service.create(createTransactionSchema.parse(q.body))));
 app.put('/api/transactions/:id',(q,r)=>r.json(service.update(q.params.id,updateTransactionSchema.parse(q.body))));
 app.post('/api/transactions/:id/void',(q,r)=>r.json(service.void(q.params.id,voidTransactionSchema.parse(q.body).reason)));
 app.get('/api/dashboard',(_q,r)=>r.json(repo.summary()));
 app.get('/api/cash-closings/:date',(q,r)=>r.json(new CashClosingService(db).view(closingDateSchema.parse(q.params.date))));
 app.post('/api/cash-closings/:date',(q,r)=>r.status(201).json(new CashClosingService(db).close(closingDateSchema.parse(q.params.date),closingInputSchema.parse(q.body))));
 app.get('/api/reports',(q,r)=>{const {from,to}=reportQuerySchema.parse(q.query);r.json(repo.report(from,to))});
 app.get('/api/reports.csv',(q,r)=>{
  const {from,to}=reportQuerySchema.parse(q.query),report=repo.report(from,to);
  const lines=[['Date (Asia/Manila)','Sales (PHP)','Expenses (PHP)','Net cash movement (PHP)','Transactions'].map(csvCell).join(',')];
  for(const day of report.days)lines.push([day.date,(day.salesCentavos/100).toFixed(2),(day.expensesCentavos/100).toFixed(2),(day.netCentavos/100).toFixed(2),day.count].map(csvCell).join(','));
  const totals=report.totals;lines.push(['Total',(totals.salesCentavos/100).toFixed(2),(totals.expensesCentavos/100).toFixed(2),(totals.netCentavos/100).toFixed(2),totals.count].map(csvCell).join(','));
  r.type('text/csv').attachment(`voiceledger-report-${from}-to-${to}.csv`).send('\uFEFF'+lines.join('\r\n'));
 });
 app.get('/api/export.csv',(_q,r)=>{
  const lines=[['ID','Date (UTC)','Type','Item','Quantity','Unit price (PHP)','Line total (PHP)','Transaction total (PHP)','Note'].map(csvCell).join(',')];
  for(const t of repo.exportEntries())for(const i of t.items as any[])lines.push([t.id,t.createdAt,t.type,i.name,i.quantity,(i.unitPriceCentavos/100).toFixed(2),(i.lineTotalCentavos/100).toFixed(2),(t.totalCentavos/100).toFixed(2),t.note??''].map(csvCell).join(','));
  r.type('text/csv').attachment(`voiceledger-${new Date().toISOString().slice(0,10)}.csv`).send('\uFEFF'+lines.join('\r\n'));
 });
 app.post('/api/backups',async(_q,r)=>{
  if(backupBusy)throw new AppError(429,'A backup is already running. Please wait.','BACKUP_BUSY');
  backupBusy=true;
  try{r.status(201).json({file:await createBackup(db,options.backupDirectory)})}finally{backupBusy=false}
 });
 app.get('/api/backups/:file',(q,r)=>{
  if(!/^voiceledger-\d{4}-\d{2}-\d{2}T[\dZ-]+-[0-9a-f]{8}\.db$/.test(q.params.file))throw new AppError(404,'Backup not found','NOT_FOUND');
  const file=path.join(options.backupDirectory??path.join(path.dirname(config.databasePath),'backups'),q.params.file);
  if(!fs.existsSync(file))throw new AppError(404,'Backup not found','NOT_FOUND');
  r.download(file,q.params.file);
 });
 app.use('/api',(_q,r)=>r.status(404).json({error:{code:'NOT_FOUND',message:'API endpoint not found'}}));
 if(config.isProduction){const web=path.join(config.root,'apps/web/dist');app.use(express.static(web));app.get('/{*path}',(_q,r)=>r.sendFile(path.join(web,'index.html')))}
 app.use((e:any,_q:express.Request,r:express.Response,_n:express.NextFunction)=>{
  if(r.headersSent)return _n(e);
  if(e?.name==='ZodError')return r.status(400).json({error:{code:'VALIDATION',message:'Please correct the highlighted information',details:typeof e.flatten==='function'?e.flatten():undefined}});
  if(e instanceof multer.MulterError)return r.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({error:{code:e.code,message:e.code==='LIMIT_FILE_SIZE'?'Recording is too large. Use a shorter recording.':'Invalid audio upload.'}});
  if(e?.type==='entity.parse.failed')return r.status(400).json({error:{code:'INVALID_JSON',message:'Request contains invalid JSON.'}});
  if(e?.type==='entity.too.large')return r.status(413).json({error:{code:'REQUEST_TOO_LARGE',message:'Request is too large.'}});
  const status=e instanceof AppError?e.status:500;
  if(status===429)r.setHeader('Retry-After','5');
  if(status===500)console.error(JSON.stringify({event:'request_failed',requestId:r.getHeader('X-Request-ID'),code:e?.code??'INTERNAL'}));
  r.status(status).json({error:{code:e instanceof AppError?e.code:'INTERNAL',message:e instanceof AppError?e.message:'Something went wrong. Try again; if it continues, check the server terminal.'}});
 });
 return app;
}
