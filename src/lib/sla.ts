/**
 * sla.ts — Saudi business-day SLA calculator (Decision 4).
 * Working week: Sunday–Thursday. Friday (5) and Saturday (6) are skipped.
 */

export type SlaTone = 'ok' | 'warn' | 'late' | 'neutral' | 'frozen';

export interface SlaStatus {
  text: string;
  tone: SlaTone;
  remaining: number;
}

export interface ProjectHoldState {
  status: 'active' | 'on_hold';
  pastHoldDays?: number;
}

/** Count business days between two dates, skipping Friday and Saturday. */
export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cur < endDay) {
    const dow = cur.getDay();
    if (dow !== 5 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/**
 * Returns SlaStatus for a form step.
 *
 * - Returns tone:'neutral' when slaDays is falsy (F-19 permanent tracker).
 * - Returns tone:'frozen' when hold.status === 'on_hold'.
 * - Subtracts pastHoldDays from elapsed business days when a hold has been resumed.
 */
export function slaStatus(
  stepStartedAtIso: string | null | undefined,
  slaDays: number | null | undefined,
  hold?: ProjectHoldState,
): SlaStatus {
  if (!slaDays) return { text: 'بدون SLA', tone: 'neutral', remaining: 0 };
  if (!stepStartedAtIso) return { text: 'بدون SLA', tone: 'neutral', remaining: 0 };

  if (hold?.status === 'on_hold') {
    return { text: 'مجمَّد', tone: 'frozen', remaining: 0 };
  }

  const start = new Date(stepStartedAtIso);
  const now = new Date();
  let elapsed = businessDaysBetween(start, now);

  // Subtract business days spent on hold in previous hold periods
  if (hold?.pastHoldDays) {
    elapsed = Math.max(0, elapsed - hold.pastHoldDays);
  }

  const remaining = slaDays - elapsed;

  if (remaining < 0) return { text: `متأخر ${Math.abs(remaining)} يوم`, tone: 'late', remaining };
  if (remaining === 0) return { text: 'اليوم الأخير', tone: 'warn', remaining };
  if (remaining === 1) return { text: 'يوم واحد متبقّ', tone: 'warn', remaining };
  return { text: `متبقّي ${remaining} يوم`, tone: 'ok', remaining };
}
