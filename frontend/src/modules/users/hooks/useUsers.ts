export const USER_QUERY_KEYS = {
  all: ['users'] as const,
  list: () => ['users'] as const,
  setupStatus: ['setup-status'] as const,
} as const;

export {
  useUsers,
  useCreateUser,
  useDeleteUser,
  useSetupStatus,
} from '../../../hooks/useApi';

export type { TeamMember } from '../../../hooks/useApi';
