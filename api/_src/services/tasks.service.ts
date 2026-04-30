import { NotFoundError } from '../shared/errors/HttpError';
import type { TaskInsert } from '@wedding-planner/shared';
import * as repo from '../repositories/tasks.repository';
import type { TaskFilters } from '../repositories/tasks.repository';

export async function listTasks(ownerId: string, filters: TaskFilters) {
  return repo.findAllByOwner(ownerId, filters);
}

export async function getOverdueTasks(ownerId: string) {
  const today = new Date().toISOString().split('T')[0]!;
  return repo.findOverdue(ownerId, today);
}

export async function getUpcomingTasks(ownerId: string) {
  const today = new Date().toISOString().split('T')[0]!;
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
  return repo.findUpcoming(ownerId, today, nextWeek);
}

export async function getTask(id: string, ownerId: string) {
  const task = await repo.findByIdAndOwner(id, ownerId);
  if (!task) throw new NotFoundError('Task not found');
  return task;
}

export async function createTask(payload: Omit<TaskInsert, 'user_id'>, ownerId: string, userId?: string) {
  return repo.insertTask({ ...payload, user_id: ownerId, created_by: userId ?? ownerId });
}

export async function updateTask(id: string, ownerId: string, payload: Partial<TaskInsert>, userId?: string) {
  await getTask(id, ownerId);
  return repo.updateTask(id, ownerId, { ...payload, updated_by: userId ?? ownerId });
}

export async function updateTaskStatus(
  id: string,
  ownerId: string,
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  userId?: string,
) {
  await getTask(id, ownerId);
  const payload: Partial<TaskInsert> = { status, updated_by: userId ?? ownerId };
  if (status === 'completed') {
    // completed_at is not in TaskInsert, update via partial cast
    (payload as Record<string, unknown>)['completed_at'] = new Date().toISOString();
  }
  return repo.updateTask(id, ownerId, payload);
}

export async function deleteTask(id: string, ownerId: string) {
  await getTask(id, ownerId);
  return repo.deleteTask(id, ownerId);
}

export async function getTaskStats(ownerId: string) {
  const tasks = await repo.findStatsByOwner(ownerId);
  const today = new Date().toISOString().split('T')[0]!;

  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    overdue: tasks.filter(
      (t) =>
        t.due_date !== null &&
        t.due_date < today &&
        (t.status === 'pending' || t.status === 'in_progress'),
    ).length,
  };
}
