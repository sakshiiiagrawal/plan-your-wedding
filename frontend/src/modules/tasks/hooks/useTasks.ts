export const TASK_QUERY_KEYS = {
  all: ['tasks'] as const,
  list: (filters: Record<string, string> = {}) => ['tasks', filters] as const,
  detail: (id: string) => ['tasks', id] as const,
  stats: ['tasks', 'stats'] as const,
  overdue: ['tasks', 'overdue'] as const,
  upcoming: ['tasks', 'upcoming'] as const,
} as const;

export {
  useTasks,
  useTaskStats,
  useOverdueTasks,
  useUpcomingTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
} from '../../../hooks/useApi';

export type { TaskFilters, TaskStats } from '../../../hooks/useApi';
