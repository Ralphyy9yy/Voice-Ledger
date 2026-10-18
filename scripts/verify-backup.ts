import path from 'node:path';
import {verifyDatabase} from '../apps/server/src/db/backup.js';
const source=process.argv[2];
if(!source)throw new Error('Usage: npm.cmd run backup:verify -- <backup.db>');
const filename=path.resolve(source);
verifyDatabase(filename);
console.log(`Backup integrity verified: ${filename}\nTo rehearse recovery, use backup:restore with a NEW destination file. No ledger was replaced.`);
