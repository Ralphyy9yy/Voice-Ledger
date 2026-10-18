import {test,expect} from '@playwright/test';

test('incomplete AI draft requires explicit type and price without inventing them',async({page})=>{
 await page.route('**/api/extractions',route=>route.fulfill({json:{type:null,items:[{name:'rice',quantity:55,unitPriceCentavos:null}],missingFields:['type','unitPrice'],ambiguities:['Clarify minus 10.'],sourceExcerpts:[]}}));
 await page.goto('/add');
 await page.getByLabel('Transaction description').fill('Rice, 55 kilos, minus 10');
 await page.getByRole('button',{name:'Review text'}).click();
 await page.getByRole('button',{name:'Create draft with local AI'}).click();
 await expect(page.getByText('Was this a sale or an expense?')).toBeVisible();
 await expect(page.getByLabel('Sale',{exact:true})).not.toBeChecked();
 await expect(page.getByLabel('Unit price',{exact:false})).toHaveValue('');
 await expect(page.getByRole('button',{name:'Confirm and save'})).toBeDisabled();
 await page.getByLabel('Expense',{exact:true}).check();
 await page.getByLabel('Unit price',{exact:false}).fill('50');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Confirm and save'}).click();
 await expect(page.getByText('Transaction saved successfully.')).toBeVisible();
});

test('recording shows microphone input, then transcript review',async({page})=>{
 await page.route('**/api/transcriptions',route=>route.fulfill({json:{text:'Sold 3 coffees at 25 pesos each.'}}));
 await page.goto('/add');
 await page.getByRole('button',{name:'Start recording'}).click();
 await expect(page.getByRole('meter',{name:'Microphone input level'})).toBeVisible();
 await expect(page.getByText('Listening…')).toBeVisible();
 await page.waitForTimeout(1100);
 await page.getByRole('button',{name:'Stop recording'}).click();
 await expect(page.getByLabel('Review and correct the transcript')).toHaveValue('Sold 3 coffees at 25 pesos each.');
 await page.getByRole('button',{name:'Record again'}).click();
 await expect(page.getByRole('button',{name:'Start recording'})).toBeEnabled();
});

test('AI failure preserves editable transcript and manual entry',async({page})=>{
 await page.route('**/api/extractions',route=>route.fulfill({status:503,json:{error:{code:'AI_UNAVAILABLE',message:'Ollama is not running.'}}}));
 await page.goto('/add');
 await page.getByLabel('Transaction description').fill('Sold one coffee');
 await page.getByRole('button',{name:'Review text'}).click();
 await page.getByRole('button',{name:'Create draft with local AI'}).click();
 await expect(page.getByRole('alert')).toContainText('Ollama is not running.');
 await expect(page.getByLabel('Review and correct the transcript')).toHaveValue('Sold one coffee');
 await page.getByRole('button',{name:'Enter details manually'}).click();
 await expect(page.getByLabel('Unit price',{exact:false})).toBeVisible();
});
