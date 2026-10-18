import {test,expect} from '@playwright/test';
test('reports navigation, date filtering, export, and daily drill-down work',async({page})=>{
 await page.route('**/api/reports?*',route=>{
  const query=new URL(route.request().url()).searchParams,from=query.get('from')!,to=query.get('to')!;
  return route.fulfill({json:{from,to,totals:{salesCentavos:10000,expensesCentavos:3000,netCentavos:7000,count:2},days:[{date:from,salesCentavos:10000,expensesCentavos:3000,netCentavos:7000,count:2}]}});
 });
 await page.goto('/');
 await page.getByRole('link',{name:'Reports',exact:true}).filter({visible:true}).click();
 await expect(page.getByRole('heading',{name:'Reports',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Total sales'})).toContainText('₱100.00');
 await expect(page.getByRole('region',{name:'Net cash movement'})).toContainText('₱70.00');
 await page.getByLabel('From',{exact:true}).fill('2000-01-02');
 await page.getByLabel('To',{exact:true}).fill('2000-01-03');
 await page.getByRole('button',{name:'Apply dates'}).click();
 await expect(page.getByRole('link',{name:'Export report CSV'})).toHaveAttribute('href','/api/reports.csv?from=2000-01-02&to=2000-01-03');
 await page.getByRole('link',{name:'Jan 2, 2000',exact:true}).click();
 await expect(page).toHaveURL(/\/transactions\?from=2000-01-02&to=2000-01-02/);
 await expect(page.getByLabel('From',{exact:true})).toHaveValue('2000-01-02');
});
test('reports explains empty ranges and rejects reversed dates',async({page})=>{
 await page.route('**/api/reports?*',route=>route.fulfill({json:{from:'2000-01-01',to:'2000-01-01',totals:{salesCentavos:0,expensesCentavos:0,netCentavos:0,count:0},days:[]}}));
 await page.goto('/reports');
 await expect(page.getByText('No active transactions in this date range.',{exact:false})).toBeVisible();
 await page.getByLabel('From',{exact:true}).fill('2000-02-01');
 await page.getByLabel('To',{exact:true}).fill('2000-01-01');
 await page.getByRole('button',{name:'Apply dates'}).click();
 await expect(page.getByRole('alert')).toContainText('in order');
});
