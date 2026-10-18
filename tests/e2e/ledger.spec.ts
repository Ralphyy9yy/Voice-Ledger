import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('saved entry can be corrected and voided with audit history',async({page,request})=>{
 const name=`Release check ${randomUUID().slice(0,8)}`;
 const created=await request.post('/api/transactions',{headers:{'x-voiceledger-csrf':'1'},data:{idempotencyKey:randomUUID(),type:'sale',items:[{name,quantity:2,unitPriceCentavos:1000}]}});
 expect(created.status()).toBe(201);
 const entry=await created.json();
 await page.goto(`/transactions/${entry.id}`);
 await expect(page.getByRole('region',{name:'Transaction receipt'})).toContainText('2 × ₱10.00');
 await expect(page.getByLabel('Reason',{exact:true})).not.toBeVisible();
 await page.getByRole('button',{name:'Edit transaction',exact:true}).click();
 await page.getByLabel('Reason for correction').fill('Correcting the unit price');
 await page.getByLabel('Unit price',{exact:false}).fill('15');
 await page.getByRole('button',{name:'Confirm and save'}).click();
 await expect(page.getByRole('button',{name:'Edit transaction',exact:true})).toBeVisible();
 await expect(page.getByText('Correcting the unit price',{exact:false})).toBeVisible();
 const corrected=await (await request.get(`/api/transactions/${entry.id}`)).json();
 expect(corrected.totalCentavos).toBe(3000);expect(corrected.audit).toHaveLength(1);
 await page.getByText('More actions',{exact:true}).click();
 await page.getByLabel('Reason',{exact:true}).fill('Test entry completed');
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Void transaction'}).click();
 await expect(page).toHaveURL(/\/transactions$/);
 const voided=await (await request.get(`/api/transactions/${entry.id}`)).json();
 expect(voided.voidedAt).toBeTruthy();expect(voided.audit).toHaveLength(2);
});

test('settings creates a downloadable verified backup',async({page})=>{
 await page.goto('/settings');
 await page.getByRole('button',{name:'Create SQLite backup'}).click();
 await expect(page.getByText('Backup created and integrity checked.')).toBeVisible();
 const downloadPromise=page.waitForEvent('download');
 await expect(page.getByRole('link',{name:'Download backup',exact:true})).toHaveCount(1);
 await page.getByRole('link',{name:'Download backup',exact:true}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/^voiceledger-.*\.db$/);
 expect(await download.failure()).toBeNull();
});
