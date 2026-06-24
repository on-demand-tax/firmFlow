export const TIMELOG_HOURS_MIN = 0.25;
export const TIMELOG_HOURS_MAX = 24;
export const TIMELOG_HOURS_STEP = 0.25;
export const TIMELOG_HOURS_RANGE_MESSAGE = `시간은 ${TIMELOG_HOURS_MIN}~${TIMELOG_HOURS_MAX} 사이여야 합니다`;

export function isValidHours(hours: unknown): hours is number {
  return (
    typeof hours === 'number' &&
    hours >= TIMELOG_HOURS_MIN &&
    hours <= TIMELOG_HOURS_MAX
  );
}
