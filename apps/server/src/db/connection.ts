import fs from 'node:fs';import path from 'node:path';import Database from 'better-sqlite3';import {config} from '../config/index.js';
export function openDatabase(filename=config.databasePath){fs.mkdirSync(path.dirname(filename),{recursive:true});const db=new Database(filename);db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');db.pragma('busy_timeout = 5000');return db}
