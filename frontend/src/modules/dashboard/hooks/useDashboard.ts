export const DASHBOARD_QUERY_KEYS = {
  all: ['dashboard'] as const,
  stats: ['dashboard', 'stats'] as const,
  summary: ['dashboard', 'summary'] as const,
  countdown: ['dashboard', 'countdown'] as const,
} as const;

export { useDashboardStats, useDashboardSummary, useCountdown } from '../../../hooks/useApi';

export type { DashboardStats, DashboardSummary, CountdownData } from '../../../hooks/useApi';
