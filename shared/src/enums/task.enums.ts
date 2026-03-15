// Task-domain enum constants and their derived union types.

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const ROOM_TYPES = ['single', 'double', 'suite', 'family', 'dormitory'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];
