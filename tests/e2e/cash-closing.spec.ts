import {test,expect} from '@playwright/test';
test('cash closing previews shortage, persists, and survives refresh',async({page},info)=>{
 const date=info.project.name==='desktop'?'2001-01-01':'2001-01-02';
 await page.goto('/reports');
 const region=page.getByRole('region',{name:'Daily cash closing'});
 await region.getByLabel('Closing date').fill(date);
 await region.getByLabel('Opening cash (PHP)').fill('100.25');
 await region.getByLabel('Actual cash counted (PHP)').fill('90');
 await region.getByLabel('Closing note (optional)').fill('Counted twice');
 await expect(region).toContainText('Shortage:');
 await expect(region).toContainText('10.25');
 await region.getByRole('button',{name:'Save cash closing'}).click();
 await expect(region).toContainText('Closed');
 await expect(region.getByRole('button',{name:'Save cash closing'})).toHaveCount(0);
 await page.reload();
 await region.getByLabel('Closing date').fill(date);
 await expect(region).toContainText('Counted twice');
 await expect(region).toContainText('10.25');
});
