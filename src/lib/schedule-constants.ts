import type { ScheduleType } from '@/types/database';

export const TYPE_COLORS: Record<ScheduleType, { bg: string; text: string; dot: string }> = {
  work: { bg: 'bg-[var(--text-secondary)]/20', text: 'text-[var(--text-secondary)]', dot: 'bg-[var(--text-secondary)]' },
  off: { bg: 'bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  vacation: { bg: 'bg-[var(--color-warning)]/20', text: 'text-[var(--color-warning)]', dot: 'bg-[var(--color-warning)]' },
  sick: { bg: 'bg-[var(--color-error)]/20', text: 'text-[var(--color-error)]', dot: 'bg-[var(--color-error)]' },
};

export const TYPE_LABELS: Record<ScheduleType, string> = {
  work: 'schedule.work',
  off: 'schedule.off',
  vacation: 'schedule.vacation',
  sick: 'schedule.sick',
};
