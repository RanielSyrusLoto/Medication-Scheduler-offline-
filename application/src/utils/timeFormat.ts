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

  return trimmed;
}
