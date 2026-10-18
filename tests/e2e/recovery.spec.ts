import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
test('typed transcript survives a closed tab without entering the ledger',async({page,context,request})=>{
 const before=await(await request.get('/api/transactions')).json();
 await page.goto('/add');
 await page.getByLabel('Transaction description').fill('Bought 5 kilos of rice at 55 pesos each.');
 await page.getByRole('button',{name:'Review text'}).click();
 await page.close();
 const reopened=await context.newPage();await reopened.goto('/add');
 await reopened.getByRole('button',{name:'Resume entry'}).click();
 await expect(reopened.getByLabel('Review and correct the transcript')).toHaveValue('Bought 5 kilos of rice at 55 pesos each.');
 const after=await(await request.get('/api/transactions')).json();expect(after.length).toBe(before.length);
});
test('edited draft survives refresh and recovery is removed after confirmation',async({page,request})=>{
 await page.goto('/add');
 await page.getByLabel('Transaction description').fill('Sold 3 coffees');
 await page.getByRole('button',{name:'Review text'}).click();
 await page.getByRole('button',{name:'Enter details manually'}).click();
 await page.getByRole('textbox',{name:'Item',exact:true}).fill('Coffee');
 await page.getByLabel('Quantity').fill('3');
 await page.getByLabel('Unit price',{exact:false}).fill('25');
 await page.reload();
 await page.getByRole('button',{name:'Resume entry'}).click();
 await expect(page.getByLabel('Unit price',{exact:false})).toHaveValue('25');
 await expect(page.getByLabel('Quantity')).toHaveValue('3');
 const saved=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/transactions'&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Confirm and save'}).click();
 const record=await(await saved).json();
 expect((await(await request.get(`/api/transactions/${record.id}`)).json()).totalCentavos).toBe(7500);
 await page.goto('/add');
 await expect(page.getByRole('button',{name:'Resume entry'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Start recording'})).toBeVisible();
});
test('discard removes only the unsaved recovery copy',async({page})=>{
 await page.goto('/add');await page.getByLabel('Transaction description').fill('An unsaved entry');await page.reload();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Discard',exact:true}).click();
 await expect(page.getByLabel('Transaction description')).toHaveValue('');
 await page.reload();await expect(page.getByRole('button',{name:'Resume entry'})).toHaveCount(0);
});
test('resuming after a lost save response does not duplicate the transaction',async({page,request})=>{
 const item=`Recovery check ${randomUUID().slice(0,8)}`,keys:string[]=[];
 await page.route('**/api/transactions',async route=>{
  if(route.request().method()!=='POST'){await route.continue();return}
  keys.push(route.request().postDataJSON().idempotencyKey);
  if(keys.length===1){await route.fetch();await route.abort('failed')}else await route.continue();
 });
 await page.goto('/add');await page.getByLabel('Transaction description').fill('Sold coffee at 25 pesos');
 await page.getByRole('button',{name:'Review text'}).click();await page.getByRole('button',{name:'Enter details manually'}).click();
 await page.getByRole('textbox',{name:'Item',exact:true}).fill(item);await page.getByLabel('Unit price',{exact:false}).fill('25');
 await page.getByRole('button',{name:'Confirm and save'}).click();await expect(page.getByRole('alert')).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Resume entry'}).click();
 await page.getByRole('button',{name:'Confirm and save'}).click();await expect(page.getByText('Transaction saved successfully.')).toBeVisible();
 expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
 const entries=await(await request.get(`/api/transactions?search=${encodeURIComponent(item)}`)).json();expect(entries).toHaveLength(1);
});
