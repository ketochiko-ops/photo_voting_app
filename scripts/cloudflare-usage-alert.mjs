const GRAPHQL_ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';
export const THRESHOLDS = [50, 80, 90];

export const FREE_LIMITS = {
  workersRequests: { label: 'Workers リクエスト（日次）', limit: 100_000 },
  d1RowsRead: { label: 'D1 読み取り行数（日次）', limit: 5_000_000 },
  d1RowsWritten: { label: 'D1 書き込み行数（日次）', limit: 100_000 },
};

export function evaluateUsage(values) {
  return Object.entries(FREE_LIMITS).flatMap(([metric, definition]) => {
    const value = Number(values[metric] ?? 0);
    const percentage = (value / definition.limit) * 100;
    return THRESHOLDS.filter((threshold) => percentage >= threshold).map((threshold) => ({
      metric,
      label: definition.label,
      value,
      limit: definition.limit,
      percentage,
      threshold,
    }));
  });
}

export function parseAnalytics(payload) {
  if (payload.errors?.length)
    throw new Error(payload.errors.map(({ message }) => message).join('; '));
  const account = payload.data?.viewer?.accounts?.[0];
  if (!account) throw new Error('Cloudflare Analytics API returned no account data');
  const sum = (groups, field) =>
    (groups ?? []).reduce((total, group) => total + Number(group.sum?.[field] ?? 0), 0);
  return {
    workersRequests: sum(account.workers, 'requests'),
    d1RowsRead: sum(account.d1, 'rowsRead'),
    d1RowsWritten: sum(account.d1, 'rowsWritten'),
  };
}

function utcDayRange(now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return {
    start: start.toISOString(),
    end: now.toISOString(),
    date: start.toISOString().slice(0, 10),
  };
}

const query = `query Usage($accountTag: string!, $start: Time!, $end: Time!, $date: Date!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workers: workersInvocationsAdaptive(limit: 10000, filter: { datetime_geq: $start, datetime_lt: $end }) {
        sum { requests }
      }
      d1: d1AnalyticsAdaptiveGroups(limit: 10000, filter: { date: $date }) {
        sum { rowsRead rowsWritten }
      }
    }
  }
}`;

async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountTag = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountTag)
    throw new Error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required');
  const range = utcDayRange();
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { accountTag, ...range } }),
  });
  if (!response.ok) throw new Error(`Cloudflare Analytics API failed: HTTP ${response.status}`);
  const values = parseAnalytics(await response.json());
  const alerts = evaluateUsage(values);
  const output = { date: range.date, checkedAt: range.end, values, alerts };
  console.log(JSON.stringify(output));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
