export const priceRecalculationMessages = {
  JOB_STARTED: 'Price recalculation job started',
  JOB_COMPLETED: 'Price recalculation job completed',
  JOB_CANCELLED: 'Price recalculation job cancelled by newer trigger',
  JOB_FAILED: 'Price recalculation job failed',
  JOB_NOT_FOUND: 'Recalculation job not found',
  TRIGGER_SUCCESS: 'Price recalculation triggered successfully',
  ALREADY_RUNNING: 'A recalculation is already running, it will be cancelled and restarted',
  LIST_SUCCESS: 'Recalculation jobs fetched successfully',
  STATUS_SUCCESS: 'Recalculation status fetched successfully',
} as const
