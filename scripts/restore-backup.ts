import fs from 'node:fs';
import path from 'node:path';
import {verifyDatabase} from '../apps/server/src/db/backup.js';

const [sourceArg,destArg]=process.argv.slice(2);
if(!sourceArg||!destArg)throw new Error('Usage: npm.cmd run backup:restore -- <backup.db> <new-recovered.db>');
const source=fs.realpathSync(path.resolve(sourceArg)),destination=path.resolve(destArg);
if(!destination.endsWith('.db'))throw new Error('Recovery destination must end in .db.');
if([destination,`${destination}-wal`,`${destination}-shm`].some(file=>fs.existsSync(file)))throw new Error('Destination already exists. Choose a new file; recovery never overwrites a ledger.');
verifyDatabase(source);
fs.mkdirSync(path.dirname(destination),{recursive:true});
fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);
verifyDatabase(destination);
console.log(`Verified recovery created: ${destination}\nStop VoiceLedger, set DATABASE_PATH in .env to this file, then restart. Original data has not been overwritten.`);
