import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const major=Number(process.versions.node.split('.')[0]);
if(![22,24].includes(major)){console.error('Use Node.js 22 or 24.');process.exitCode=1}
else console.log(`OK: Node.js ${process.versions.node}`);
const server=path.join(root,'apps/server/dist/server.js'),web=path.join(root,'apps/web/dist/index.html');
if(!fs.existsSync(server)||!fs.existsSync(web)){console.error('Build files are missing. Run npm.cmd run build first.');process.exit(1)}
console.log('OK: Production build files exist.');
if(!fs.existsSync(path.join(root,'.env')))console.log('Note: No .env found. Defaults apply; local speech paths need configuration.');
try{
 const {config}=await import('../apps/server/dist/config/index.js');
 console.log(`OK: Local-only configuration. App address: http://${config.host==='::1'?'[::1]':config.host}:${config.port}`);
 const {OllamaProvider}=await import('../apps/server/dist/providers/ai/ollama-provider.js');
 const {WhisperProvider}=await import('../apps/server/dist/providers/speech/whisper-provider.js');
 const results=await Promise.all([new OllamaProvider().status(),new WhisperProvider().status()]);
 for(const [index,result] of results.entries())console.log(`${result.available?'OK':'SETUP NEEDED'}: ${index===0?'AI drafts':'Speech'}: ${result.detail}`);
 if(results.some(result=>!result.available))console.log('Manual entry remains available. Check Settings for AI setup guidance.');
 if(fs.existsSync(config.databasePath)){
  const {verifyDatabase}=await import('../apps/server/dist/db/backup.js');
  verifyDatabase(config.databasePath);console.log('OK: Ledger integrity and required tables.');
 }else console.log('Note: The ledger will be created on first startup.');
 console.log('Setup check finished. It does not prove microphone quality or model accuracy.');
}catch(error){console.error(`Setup check failed: ${error.message}`);process.exitCode=1}
