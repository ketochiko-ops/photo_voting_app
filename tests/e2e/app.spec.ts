import { test, expect } from '@playwright/test';
test('room creation form is mobile accessible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '写真選定ルームを作成' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('保存期間')).toHaveValue('7');
});
test('room id alone reveals no data', async ({ page }) => {
  await page.goto('/r/guessed-room-id');
  await expect(page.getByText('参加URLまたは管理者URLからアクセスしてください')).toBeVisible();
});
