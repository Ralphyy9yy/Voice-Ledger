import {test,expect} from '@playwright/test';
test('typed transaction can be manually reviewed and saved',async({page})=>{
 await page.goto('/add');
 await page.getByLabel('Transaction description').fill('Sold three bottles of water at twenty pesos each.');
 await page.getByRole('button',{name:'Review text'}).click();
 await page.getByRole('button',{name:'Enter details manually'}).click();
 await page.getByRole('textbox',{name:'Item',exact:true}).fill('Bottled water');
 await page.getByLabel('Quantity').fill('3');
 await page.getByLabel('Unit price (₱)').fill('20');
 await expect(page.getByText('₱60.00')).toBeVisible();
 await page.getByRole('button',{name:'Confirm and save'}).click();
 await expect(page.getByText('Transaction saved successfully.')).toBeVisible();
 await expect(page.getByText('Bottled water').first()).toBeVisible();
});
