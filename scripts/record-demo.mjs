import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';

// Uses a fresh temporary ledger, never the user's database or local AI services.
const root=fileURLToPath(new URL('../',import.meta.url));
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'voiceledger-demo-'));
const output=path.join(root,'docs','media');
await fs.mkdir(output,{recursive:true});
const port=String(20000+Math.floor(Math.random()*30000));
const base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['scripts/start-production.mjs'],{cwd:root,env:{...process.env,PORT:port,DATABASE_PATH:path.join(temporary,'demo.db'),NODE_ENV:'production'},stdio:'ignore',windowsHide:true});
let browser;
try{
 let ready=false;
 for(let attempt=0;attempt<100;attempt++){
  if(server.exitCode!==null)throw new Error('Demo server exited before startup.');
  try{if((await fetch(`${base}/api/health`)).ok){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw new Error('Demo server did not start.');
 for(const [type,name,quantity,unitPriceCentavos] of [['sale','Rice',5,5500],['sale','Coffee',8,2500],['expense','Paper cups',1,4500]]){
  const response=await fetch(`${base}/api/transactions`,{method:'POST',headers:{'content-type':'application/json','x-voiceledger-csrf':'1'},body:JSON.stringify({idempotencyKey:crypto.randomUUID(),type,items:[{name,quantity,unitPriceCentavos}],note:'Fictional demo entry'})});
  if(!response.ok)throw new Error('Could not prepare fictional demo entries.');
 }
 browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:temporary,size:{width:1440,height:900}},locale:'en-PH',reducedMotion:'reduce'});
 const page=await context.newPage();
 // Deliberate pauses make each step readable in the finished walkthrough.
 const hold=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
 await page.goto(base);
 await expect(page.getByRole('heading',{name:'Your day, at a glance.'})).toBeVisible();
 await expect(page.getByText('Rice',{exact:true})).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 await hold(2500);
 await page.screenshot({path:path.join(output,'overview.png')});
 await page.goto(`${base}/add`);
 await page.getByLabel('Transaction description').pressSequentially('Sold 3 bottles of water at 20 pesos each.',{delay:35});
 await hold(1200);
 await page.getByRole('button',{name:'Review text',exact:true}).click();
 await hold(1600);
 await page.getByRole('button',{name:'Enter details manually'}).click();
 await page.getByRole('textbox',{name:'Item',exact:true}).fill('Bottled water');
 await page.getByLabel('Quantity',{exact:true}).fill('3');
 await page.getByLabel('Unit price',{exact:false}).fill('20');
 await hold(2800);
 await page.getByRole('button',{name:'Confirm and save'}).click();
 await expect(page.getByText('Transaction saved successfully.')).toBeVisible();
 await hold(2500);
 await page.goto(`${base}/reports`);
 await page.getByLabel('Opening cash (PHP)').fill('500');
 await page.getByLabel('Actual cash counted (PHP)').fill('990');
 await hold(3500);
 await page.goto(`${base}/`);
 await hold(2000);
 const video=page.video();
 await context.close();
 const source=await video.path();
 const ffmpeg=process.env.FFMPEG_PATH??path.join(root,'.local-tools','ffmpeg.exe');
 const convert=args=>{const result=spawnSync(ffmpeg,['-y','-i',source,...args],{windowsHide:true,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr)};
 convert(['-c:v','libx264','-preset','fast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',path.join(output,'voiceledger-demo.mp4')]);
 convert(['-vf','fps=7,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3','-loop','0',path.join(output,'voiceledger-demo.gif')]);
 console.log('Created docs/media/overview.png, voiceledger-demo.mp4, and voiceledger-demo.gif using fictional data.');
}finally{
 await browser?.close();
 server.kill();
}
