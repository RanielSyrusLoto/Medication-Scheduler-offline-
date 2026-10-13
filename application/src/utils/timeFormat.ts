/**
 * Utility functions for formatting time strings and timestamps with AM / PM.
 */

/**
 * Formats a 24-hour time string (e.g. "08:00", "14:30") or timestamp into 12-hour AM/PM format.
 * Examples:
 * - "08:00" -> "08:00 AM"
 * - "14:30" -> "02:30 PM"
 * - "00:15" -> "12:15 AM"
 * - "12:00" -> "12:00 PM"
 * - "2026-10-11 14:30:00" -> "2026-10-11 02:30 PM"
 */
export function formatTimeWithAmPm(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();

  // If already contains AM or PM (case-insensitive)
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // Format: HH:MM or HH:MM:SS
  const timeOnlyMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeOnlyMatch) {
    let hours = parseInt(timeOnlyMatch[1], 10);
    const minutes = timeOnlyMatch[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes} ${ampm}`;
  }

  // Format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD HH:MM
  const fullDateTimeMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (fullDateTimeMatch) {
    const datePart = fullDateTimeMatch[1];
    let hours = parseInt(fullDateTimeMatch[2], 10);
    const minutes = fullDateTimeMatch[3];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${datePart} ${formattedHours}:${minutes} ${ampm}`;
  }

  // Format: Pure integer hours or intervals (e.g. "24", "12", "8", "6", "4", "24 hrs")
  const numericOnlyMatch = trimmed.match(/^(\d{1,2})(?:\s*(?:h|hr|hrs|hours))?$/i);
  if (numericOnlyMatch) {
    const num = parseInt(numericOnlyMatch[1], 10);
    if (num === 24) {
      return '08:00 AM';
    }
    if (num === 0) {
      return '12:00 AM';
    }
    if (num <= 23) {
      const ampm = num >= 12 ? 'PM' : 'AM';
      let hours = num % 12;
      if (hours === 0) hours = 12;
      const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
      return `${formattedHours}:00 ${ampm}`;
    }
  }

  return '08:00 AM';
}

/**
 * Converts any time string ("08:00", "08:00 AM", "2:30 PM", "14:30") into total minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr) return 9999;
  const trimmed = timeStr.trim();
  const lower = trimmed.toLowerCase();

  // If 12-hour AM/PM format
  if (lower.includes('am') || lower.includes('pm')) {
    const isPm = lower.includes('pm');
    const clean = lower.replace(/am|pm/g, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10) || 0;
    const m = parts[1] ? parseInt(parts[1], 10) || 0 : 0;
    if (isPm && h < 12) h += 12;
    if (!isPm && h === 12) h = 0;
    return h * 60 + m;
  }

  // If HH:MM or HH:MM:SS format
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      return h * 60 + m;
    }
  }

  // If single/double digit hours or intervals like "24", "12", "8"
  const numMatch = trimmed.match(/^(\d{1,2})/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num === 24) return 8 * 60; // 08:00 AM
    if (num <= 23) return num * 60;
  }

  return 9999;
}

/**
 * Sorts medication schedules by deadline/intake time:
 * The closest / earliest deadline to take is placed at the very front/top.
 */
export function sortSchedulesByDeadline<T extends {
  time_value?: string;
  start_date?: string | null;
  schedule_date?: string | null;
  schedule_id?: number;
}>(items: T[]): T[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return [...items].sort((a, b) => {
    // 1. Determine effective date string
    const rawDateA = (a.start_date || a.schedule_date || todayStr).trim();
    const rawDateB = (b.start_date || b.schedule_date || todayStr).trim();

    // If schedule date is today or past (active recurring), use todayStr
    const dateA = rawDateA < todayStr ? todayStr : rawDateA;
    const dateB = rawDateB < todayStr ? todayStr : rawDateB;

    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    // 2. Same date: compare time of day in minutes (earliest/closest deadline first)
    const minutesA = parseTimeToMinutes(a.time_value);
    const minutesB = parseTimeToMinutes(b.time_value);

    if (minutesA !== minutesB) {
      return minutesA - minutesB;
    }

    // Tie-break by schedule_id if available
    return (a.schedule_id || 0) - (b.schedule_id || 0);
  });
}

/**
 * Checks if the scheduled dose time has arrived or passed for today.
 * Returns true if it IS time to take (or already past due).
 * Returns false if it is NOT YET time (scheduled for later today, or scheduled for a future date).
 */
export function isScheduleTimeReached(
  timeValue?: string | null,
  scheduleDate?: string | null,
  startDate?: string | null
): boolean {
  if (!timeValue) return true;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // If explicitly scheduled for a future calendar date (e.g. tomorrow or next week)
  const explicitDate = (scheduleDate || '').trim();
  if (explicitDate && explicitDate > todayStr) {
    return false;
  }

  const start = (startDate || '').trim();
  if (start && start > todayStr) {
    return false;
  }

  const targetMinutes = parseTimeToMinutes(timeValue);
  if (targetMinutes === 9999) return true;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // If the scheduled time of day has arrived or passed:
  return currentMinutes >= targetMinutes;
}
