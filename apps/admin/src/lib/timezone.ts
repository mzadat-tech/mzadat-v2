/**
 * Timezone-aware date formatting & parsing for the Mzadat platform.
 *
 * All dates are displayed and edited in Asia/Muscat (UTC+4, no DST).
 * The DB stores timestamptz so the absolute instant is preserved,
 * but we need to show / accept the Muscat wall-clock time in forms.
 *
 * IMPORTANT: Do NOT use `new Date(formString)` to parse form dates —
 * that uses the server's local TZ (which may not be Muscat).
 * Always use `parseMuscatDateTime()` instead.
 */

const TZ = 'Asia/Muscat'
const MUSCAT_OFFSET = '+04:00'  // fixed offset, Oman has no DST

/**
 * Format a Date (or ISO string) as `YYYY-MM-DDTHH:mm` in Asia/Muscat.
 *
 * Replaces the common anti-pattern:
 *   new Date(x).toISOString().slice(0, 16)  // ← always UTC!
 *
 * @example toMuscatDateTimeLocal(new Date('2026-03-05T06:20:00+04:00'))
 *          // → '2026-03-05T06:20'
 */
export function toMuscatDateTimeLocal(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  // Intl.DateTimeFormat gives us locale-independent numeric parts in Muscat TZ
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00'

  // en-CA gives YYYY-MM-DD order; hour may be '24' for midnight → normalise
  const hour = get('hour') === '24' ? '00' : get('hour')

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

/**
 * Extract just the date portion `YYYY-MM-DD` in Asia/Muscat.
 */
export function toMuscatDate(date: Date | string): string {
  return toMuscatDateTimeLocal(date).slice(0, 10)
}

/**
 * Extract just the time portion `HH:mm` in Asia/Muscat.
 */
export function toMuscatTime(date: Date | string): string {
  return toMuscatDateTimeLocal(date).slice(11, 16)
}

/**
 * Parse a form datetime-local string as Muscat time → UTC Date.
 *
 * Form strings look like "2026-03-05T06:20" (no timezone info).
 * We treat them as Muscat wall-clock time and convert to an absolute
 * UTC instant by appending the +04:00 offset before parsing.
 *
 * This is SERVER-TZ-SAFE — works regardless of process.env.TMZN.
 *
 * @example parseMuscatDateTime('2026-03-05T06:20')
 *          // → Date representing 2026-03-05T02:20:00.000Z
 */
export function parseMuscatDateTime(localStr: string): Date {
  // Already has an offset or Z → parse as-is
  if (/[Zz+]/.test(localStr.slice(10)) || localStr.includes('-', 11)) {
    return new Date(localStr)
  }
  // Pad seconds if missing, append Muscat offset
  const withSeconds = localStr.length === 16 ? `${localStr}:00` : localStr
  return new Date(`${withSeconds}${MUSCAT_OFFSET}`)
}

/**
 * Safely parse an optional form datetime string.
 * Returns null if the input is empty/undefined.
 */
export function parseMuscatDateTimeOrNull(localStr: string | undefined | null): Date | null {
  if (!localStr?.trim()) return null
  const d = parseMuscatDateTime(localStr)
  return isNaN(d.getTime()) ? null : d
}
