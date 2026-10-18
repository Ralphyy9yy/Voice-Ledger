import {test,expect} from '@playwright/test';
test('recording language preference persists and is used by the recorder',async({page})=>{
 await page.goto('/settings');
 await page.getByLabel('Default recording language').selectOption('tl');
 await expect(page.getByRole('status').filter({hasText:'Preference saved'})).toBeVisible();
 await page.reload();
 await expect(page.getByLabel('Default recording language')).toHaveValue('tl');
 await page.goto('/add');
 await expect(page.getByLabel('Recording language',{exact:true})).toHaveValue('tl');
});
test('regional language selection persists and explains experimental recognition',async({page})=>{
 await page.goto('/settings');
 await page.getByLabel('Default recording language').selectOption('ceb');
 await page.goto('/add');
 await expect(page.getByLabel('Recording language',{exact:true})).toHaveValue('ceb');
 await expect(page.getByText('Cebuano / Bisaya has no dedicated language setting',{exact:false})).toBeVisible();
});
