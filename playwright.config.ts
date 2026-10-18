import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {defineConfig,devices} from '@playwright/test';
const port=process.env.VOICELEDGER_E2E_PORT??String(20000+Math.floor(Math.random()*40000));
process.env.VOICELEDGER_E2E_PORT=port;
const databasePath=process.env.VOICELEDGER_E2E_DATABASE??path.join(fs.mkdtempSync(path.join(os.tmpdir(),'voiceledger-e2e-')),'test.db');
process.env.VOICELEDGER_E2E_DATABASE=databasePath;
export default defineConfig({
 testDir:'tests/e2e',fullyParallel:false,workers:1,
 use:{baseURL:`http://127.0.0.1:${port}`,trace:'retain-on-failure',launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},
 webServer:{command:'node scripts/start-production.mjs',env:{PORT:port,DATABASE_PATH:databasePath,NODE_ENV:'production'},url:`http://127.0.0.1:${port}/api/health`,reuseExistingServer:false,timeout:120000},
 projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'narrow',use:{browserName:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]
});
