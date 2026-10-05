import { readFile } from 'node:fs/promises';

const report = JSON.parse(await readFile(process.argv[2], 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!repository || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  if (!response.ok)
    throw new Error(`GitHub API failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

for (const alert of report.alerts) {
  const marker = `cf-usage:${report.date}:${alert.metric}:${alert.threshold}`;
  const search = await github(
    `/search/issues?q=${encodeURIComponent(`repo:${repository} is:issue in:body "${marker}"`)}`,
  );
  if (search.total_count > 0) continue;
  const title = `Cloudflare 無料枠警告: ${alert.label} が ${alert.threshold}% に到達`;
  const body = [
    `<!-- ${marker} -->`,
    '## Cloudflare 無料枠の使用量警告',
    '',
    `- 指標: **${alert.label}**`,
    `- 使用量: **${alert.value.toLocaleString('ja-JP')} / ${alert.limit.toLocaleString('ja-JP')}** (${alert.percentage.toFixed(1)}%)`,
    `- 閾値: **${alert.threshold}%**`,
    `- 集計日: ${report.date} (UTC、日次無料枠は 00:00 UTC にリセット)`,
    `- 確認時刻: ${report.checkedAt}`,
    '',
    'Cloudflare Dashboard で急増の原因を確認し、必要なら rate limit・処理の最適化・プラン変更を検討してください。',
  ].join('\n');
  await github(`/repos/${repository}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
}
