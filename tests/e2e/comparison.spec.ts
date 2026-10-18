import {test,expect} from '@playwright/test';
test('transcript remains visible while correcting an AI amount and saving',async({page,request})=>{
 const transcript='Sold 3 coffees at 25 pesos each.';
 await page.route('**/api/extractions',route=>route.fulfill({json:{type:'sale',items:[{name:'coffee',quantity:3,unitPriceCentavos:2000}],missingFields:[],ambiguities:[],sourceExcerpts:[transcript]}}));
 await page.goto('/add');
 await page.getByLabel('Transaction description').fill(transcript);
 await page.getByRole('button',{name:'Review text'}).click();
 await page.getByRole('button',{name:'Create draft with local AI'}).click();
 const source=page.getByRole('region',{name:'Reviewed transcript',exact:true});
 await expect(source).toBeVisible();
 await expect(source.getByRole('blockquote')).toHaveText(transcript);
 await expect(page.getByRole('region',{name:'Editable transaction draft'})).toBeVisible();
 await expect(page.getByLabel('Unit price',{exact:false})).toHaveValue('20.00');
 await page.getByLabel('Unit price',{exact:false}).fill('25');
 await expect(source.getByRole('blockquote')).toHaveText(transcript);
 const saved=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/transactions'&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Confirm and save'}).click();
 const response=await saved;expect(response.status()).toBe(201);
 const entry=await response.json(),stored=await(await request.get(`/api/transactions/${entry.id}`)).json();
 expect(stored.totalCentavos).toBe(7500);expect(stored.transcript).toBe(transcript);
});

test('transcript correction is used when rebuilding the draft',async({page})=>{
 const inputs:string[]=[];
 await page.route('**/api/extractions',route=>{inputs.push(route.request().postDataJSON().text);return route.fulfill({json:{type:'sale',items:[{name:'coffee',quantity:3,unitPriceCentavos:2500}],missingFields:[],ambiguities:[],sourceExcerpts:[]}})});
 await page.goto('/add');
 await page.getByLabel('Transaction description').fill('Sold 3 coffees at 20 pesos each.');
 await page.getByRole('button',{name:'Review text'}).click();
 await page.getByRole('button',{name:'Create draft with local AI'}).click();
 await page.getByRole('button',{name:'Edit transcript',exact:true}).click();
 await page.getByLabel('Review and correct the transcript').fill('Sold 3 coffees at 25 pesos each.');
 await page.getByRole('button',{name:'Create draft with local AI'}).click();
 await expect(page.getByRole('region',{name:'Reviewed transcript'}).getByRole('blockquote')).toHaveText('Sold 3 coffees at 25 pesos each.');
 expect(inputs).toEqual(['Sold 3 coffees at 20 pesos each.','Sold 3 coffees at 25 pesos each.']);
});
