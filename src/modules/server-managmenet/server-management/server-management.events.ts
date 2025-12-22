export const ServerManagementSocketEvents = {
  RUN_STARTED: 'server-management:run-started',
  RUN_OUTPUT: 'server-management:run-output',
  RUN_COMPLETED: 'server-management:run-completed',
  RUN_ERROR: 'server-management:run-error',
} as const

export type ServerManagementSocketEvent =
  typeof ServerManagementSocketEvents[keyof typeof ServerManagementSocketEvents]
