export const TZ_OPTIONS = [
  { label: 'Eastern Time (ET)', value: 'America/New_York' },
  { label: 'Central Time (CT)', value: 'America/Chicago' },
  { label: 'Mountain Time (MT)', value: 'America/Denver' },
  { label: 'Mountain Time — Arizona (no DST)', value: 'America/Phoenix' },
  { label: 'Pacific Time (PT)', value: 'America/Los_Angeles' },
  { label: 'Alaska Time (AKT)', value: 'America/Anchorage' },
  { label: 'Hawaii Time (HT)', value: 'Pacific/Honolulu' },
]

export function fmtTime(ts: string, tz: string): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz,
  })
}

export function fmtDate(ts: string, tz: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  })
}

export function fmtDateLong(ts: string, tz: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  })
}

// Convert a YYYY-MM-DD date string to the UTC timestamp of midnight in the given timezone
export function localMidnightToUTC(dateStr: string, tz: string): Date {
  const noonUTC = new Date(`${dateStr}T12:00:00Z`)
  // Parse noon-UTC as displayed in tz, treating that displayed value as if it were UTC
  // (works because the server runs UTC, so new Date(localeString) = locale-display-time as UTC)
  const noonDisplayed = new Date(noonUTC.toLocaleString('en-US', { timeZone: tz }))
  const offsetMs = noonUTC.getTime() - noonDisplayed.getTime()
  return new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + offsetMs)
}

export function startOfTodayInTz(tz: string): Date {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz }) // 'YYYY-MM-DD'
  return localMidnightToUTC(todayStr, tz)
}

export function startOfWeekInTz(tz: string): Date {
  const today = startOfTodayInTz(tz)
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz })
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dow = dayMap[dayStr] ?? 0
  const daysToMonday = dow === 0 ? 6 : dow - 1
  return new Date(today.getTime() - daysToMonday * 24 * 60 * 60 * 1000)
}

export function isTodayInTz(ts: string, tz: string): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: tz }) === today
}
