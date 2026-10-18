import fs from 'node:fs';
if(!fs.existsSync(new URL('../apps/server/dist/server.js',import.meta.url))||!fs.existsSync(new URL('../apps/web/dist/index.html',import.meta.url))){
 console.error('Build VoiceLedger first: npm.cmd run build');process.exit(1);
}
process.env.NODE_ENV='production';
await import('../apps/server/dist/server.js');
