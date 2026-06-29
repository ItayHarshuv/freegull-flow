function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getMostRecentSaturdayCutoff(now = new Date()): Date {
  const day = now.getDay();
  const daysSinceSaturday = (day + 1) % 7;
  const saturday = new Date(now);
  saturday.setDate(saturday.getDate() - daysSinceSaturday);
  saturday.setHours(18, 0, 0, 0);
  if (now < saturday) {
    saturday.setDate(saturday.getDate() - 7);
  }
  return saturday;
}

export function getFollowingWeekRange(cutoffSaturday: Date): { start: Date; end: Date } {
  const start = new Date(cutoffSaturday);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function requiresShiftChangeApproval(shiftDateStr: string, now = new Date()): boolean {
  const shiftDate = parseLocalDate(shiftDateStr);
  const cutoff = getMostRecentSaturdayCutoff(now);
  if (now < cutoff) return false;
  const { start, end } = getFollowingWeekRange(cutoff);
  return shiftDate >= startOfDay(start) && shiftDate <= endOfDay(end);
}
