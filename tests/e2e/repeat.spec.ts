import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
for(const type of ['sale','expense'] as const)test(`repeat ${type} opens an editable copy and preserves the original`,async({page,request})=>{
 const name=`Repeat ${randomUUID().slice(0,8)}`;
 const source=await(await request.post('/api/transactions',{headers:{'x-voiceledger-csrf':'1'},data:{idempotencyKey:randomUUID(),type,note:'Regular order',transcript:'An old recording',items:[{name,quantity:2,unitPriceCentavos:2500}]}})).json();
 await page.goto(`/transactions/${source.id}`);
 await page.getByRole('link',{name:'Repeat transaction',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Item',exact:true})).toHaveValue(name);
 await expect(page.getByLabel('Quantity')).toHaveValue('2');
 await expect(page.getByLabel('Unit price',{exact:false})).toHaveValue('25.00');
 await expect(page.getByLabel(type==='sale'?'Sale':'Expense',{exact:true})).toBeChecked();
 await expect(page.getByLabel('Note (optional)')).toHaveValue('Regular order');
 expect(await(await request.get(`/api/transactions?search=${encodeURIComponent(name)}`)).json()).toHaveLength(1);
 await page.getByLabel('Quantity').fill('3');
 await page.reload();
 await expect(page.getByLabel('Quantity')).toHaveValue('3');
 const saved=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/transactions'&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Confirm and save'}).click();
 const copied=await(await saved).json();
 expect(copied.id).not.toBe(source.id);expect(copied.idempotencyKey).not.toBe(source.idempotencyKey);expect(copied.totalCentavos).toBe(7500);expect(copied.transcript).not.toBe(source.transcript);
 const unchanged=await(await request.get(`/api/transactions/${source.id}`)).json();
 expect(unchanged.totalCentavos).toBe(5000);expect(unchanged.audit).toHaveLength(0);
 expect(await(await request.get(`/api/transactions?search=${encodeURIComponent(name)}`)).json()).toHaveLength(2);
});

test('repeat does not overwrite a different unfinished draft',async({page,request})=>{
 await page.goto('/add');await page.getByLabel('Transaction description').fill('Keep my unfinished description');
 const source=await(await request.post('/api/transactions',{headers:{'x-voiceledger-csrf':'1'},data:{idempotencyKey:randomUUID(),type:'sale',items:[{name:'Repeat example',quantity:1,unitPriceCentavos:100}]}})).json();
 await page.goto(`/transactions/${source.id}/repeat`);
 await expect(page.getByLabel('Quantity')).toHaveValue('1');
 await page.goto('/add');
 await expect(page.getByText('Keep my unfinished description',{exact:true})).toBeVisible();
});
