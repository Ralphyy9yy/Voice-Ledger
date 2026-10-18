import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {config} from '../config/index.js';

export function verifyDatabase(filename:string){
 const db=new Database(filename,{readonly:true,fileMustExist:true});
 try{
  const rows=db.pragma('integrity_check') as {integrity_check:string}[];
  if(rows.length!==1||rows[0]?.integrity_check!=='ok')throw new Error('Database integrity check failed.');
  if((db.pragma('foreign_key_check') as unknown[]).length)throw new Error('Database foreign key check failed.');
  for(const table of ['transactions','line_items','audit_events','schema_migrations']){
   if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))throw new Error('Not a VoiceLedger backup.');
  }
 }finally{db.close()}
}

export async function createBackup(db:Database.Database,directory=path.join(path.dirname(config.databasePath),'backups')){
 fs.mkdirSync(directory,{recursive:true});
 const name=`voiceledger-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}.db`;
 const dest=path.join(directory,name);
 const pending=`${dest}.pending`;
 try{await db.backup(pending);verifyDatabase(pending);fs.renameSync(pending,dest);return name}
 catch(error){fs.rmSync(pending,{force:true});throw error}
}

export function backupSummary(directory=path.join(path.dirname(config.databasePath),'backups')){
 try{
  const files=fs.readdirSync(directory).filter(name=>/^voiceledger-\d{4}-\d{2}-\d{2}T[\dZ-]+-[0-9a-f]{8}\.db$/.test(name)).map(file=>{const stat=fs.statSync(path.join(directory,file));return{file,createdAt:stat.mtime.toISOString(),sizeBytes:stat.size,isFile:stat.isFile()}}).filter(file=>file.isFile&&file.sizeBytes>0).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const latest=files[0];
  return{count:files.length,latest:latest?{file:latest.file,createdAt:latest.createdAt,sizeBytes:latest.sizeBytes}:null};
 }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return{count:0,latest:null};throw error}
}
