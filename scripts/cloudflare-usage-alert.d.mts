export interface UsageValues {
  workersRequests?: number;
  d1RowsRead?: number;
  d1RowsWritten?: number;
}

export interface UsageAlert {
  metric: string;
  label: string;
  value: number;
  limit: number;
  percentage: number;
  threshold: number;
}

export const THRESHOLDS: number[];
export const FREE_LIMITS: Record<string, { label: string; limit: number }>;
export function evaluateUsage(values: UsageValues): UsageAlert[];
export function parseAnalytics(payload: unknown): Required<UsageValues>;
