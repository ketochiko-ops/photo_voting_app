import { describe, expect, it } from 'vitest';
import { evaluateUsage, parseAnalytics } from '../../scripts/cloudflare-usage-alert.mjs';

describe('Cloudflare usage alerts', () => {
  it('50%, 80%, 90% の到達済み閾値を返す', () => {
    expect(evaluateUsage({ workersRequests: 90_000 }).map(({ threshold }) => threshold)).toEqual([
      50, 80, 90,
    ]);
  });

  it('閾値未満では警告しない', () => {
    expect(evaluateUsage({ d1RowsRead: 2_499_999, d1RowsWritten: 49_999 })).toEqual([]);
  });

  it('GraphQL の複数グループを合算する', () => {
    expect(
      parseAnalytics({
        data: {
          viewer: {
            accounts: [
              {
                workers: [{ sum: { requests: 20 } }, { sum: { requests: 30 } }],
                d1: [
                  { sum: { rowsRead: 100, rowsWritten: 4 } },
                  { sum: { rowsRead: 200, rowsWritten: 6 } },
                ],
              },
            ],
          },
        },
      }),
    ).toEqual({ workersRequests: 50, d1RowsRead: 300, d1RowsWritten: 10 });
  });
});
