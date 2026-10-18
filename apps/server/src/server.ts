import fs from 'node:fs';
import path from 'node:path';
import {config} from './config/index.js';
import {openDatabase} from './db/connection.js';
import {migrate} from './db/migrate.js';
import {createBackup} from './db/backup.js';
import {createApp} from './app.js';

const db=openDatabase();
try{
 if(db.pragma('quick_check',{simple:true})!=='ok')throw new Error('Ledger integrity check failed. Recover from a verified backup before starting.');
 migrate(db);
}catch(error){db.close();throw error}
async function dailyBackup(){
 const dir=path.join(path.dirname(config.databasePath),'backups');
 const prefix=`voiceledger-${new Date().toISOString().slice(0,10)}`;
 if(!fs.existsSync(dir)||!fs.readdirSync(dir).some(name=>name.startsWith(prefix)&&name.endsWith('.db')))await createBackup(db,dir);
}
if(config.isProduction)try{await dailyBackup()}catch(error){db.close();throw error}
const server=createApp(db).listen(config.port,config.host,()=>console.log(`VoiceLedger: http://${config.host==='::1'?'[::1]':config.host}:${config.port}`));
const interval=config.isProduction?setInterval(()=>{void dailyBackup().catch(()=>console.error('Automatic backup failed. Check disk space and directory permissions.'))},60*60*1000):undefined;
interval?.unref();
server.on('error',error=>{clearInterval(interval);db.close();console.error(`VoiceLedger could not start: ${error.message}`);process.exitCode=1});
let closing=false;
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{
 if(closing)return;closing=true;clearInterval(interval);
 server.close(()=>{db.close();process.exitCode=0});
 server.closeIdleConnections();
});
