// ─── Timezone constants ───────────────────────────────────────────────────────
export const TIMEZONES = {
  UAE: 'Asia/Dubai',
  ISRAEL: 'Asia/Jerusalem',
}

export const TZ_LABELS = {
  UAE: 'UAE',
  ISRAEL: 'ISR',
}

// ─── Clock helpers ────────────────────────────────────────────────────────────

export function getCurrentTimeInTZ(timezone) {
  return new Date().toLocaleString('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function getCurrentDateInTZ(timezone) {
  return new Date().toLocaleString('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

// ─── Timezone offset ──────────────────────────────────────────────────────────

/**
 * Returns the UTC offset in minutes for a given timezone at a given date.
 * Positive = ahead of UTC (e.g. UAE = +240, Israel summer = +180).
 */
function getTimezoneOffsetMinutes(date, timezone) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return (tzDate.getTime() - utcDate.getTime()) / 60000
}

// ─── Conversion ───────────────────────────────────────────────────────────────

/**
 * Convert a local datetime string ("YYYY-MM-DDTHH:mm") interpreted in the
 * given IANA timezone into a UTC ISO 8601 string.
 *
 * Handles DST automatically via the Intl API.
 */
export function localToUTC(localStr, timezone) {
  if (!localStr) return ''
  const [datePart, timePart = '00:00'] = localStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)

  // Treat the input as if it were UTC to get a reference timestamp,
  // then correct for the actual timezone offset at that moment.
  const naiveUTC = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const offsetMinutes = getTimezoneOffsetMinutes(naiveUTC, timezone)

  return new Date(naiveUTC.getTime() - offsetMinutes * 60000).toISOString()
}

// ─── Display formatting ───────────────────────────────────────────────────────

/**
 * Format a UTC ISO string for display in a given IANA timezone.
 * Returns "DD/MM HH:MM" (always includes date for cross-day clarity).
 */
export function formatUTCInTimezone(utcStr, timezone) {
  if (!utcStr) return ''
  try {
    const date = new Date(utcStr)
    if (isNaN(date.getTime())) return ''

    const day = date.toLocaleString('en-GB', { timeZone: timezone, day: '2-digit' })
    const mon = date.toLocaleString('en-GB', { timeZone: timezone, month: '2-digit' })
    const time = date.toLocaleString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return `${day}/${mon}  ${time}`
  } catch {
    return ''
  }
}

/**
 * Format just the time portion (HH:MM) of a UTC string in a given timezone.
 */
export function formatTimeOnly(utcStr, timezone) {
  if (!utcStr) return ''
  try {
    const date = new Date(utcStr)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleString('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return ''
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

/**
 * Returns 'PLANNED' | 'IN_AIR' | 'LANDED'
 */
export function getFlightStatus(departureUTC, arrivalUTC) {
  if (!departureUTC || !arrivalUTC) return 'PLANNED'
  const now = Date.now()
  const dep = new Date(departureUTC).getTime()
  const arr = new Date(arrivalUTC).getTime()
  if (isNaN(dep) || isNaN(arr)) return 'PLANNED'
  if (now < dep) return 'PLANNED'
  if (now >= dep && now <= arr) return 'IN_AIR'
  return 'LANDED'
}

/**
 * Convert a UTC ISO string to a datetime-local input value ("YYYY-MM-DDTHH:mm")
 * expressed in the given IANA timezone. Used to pre-fill edit forms.
 */
export function utcToLocalInputValue(utcStr, timezone) {
  if (!utcStr) return ''
  try {
    const date = new Date(utcStr)
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date)
    const get = type => parts.find(p => p.type === type)?.value ?? '00'
    const h = get('hour')
    return `${get('year')}-${get('month')}-${get('day')}T${h === '24' ? '00' : h}:${get('minute')}`
  } catch {
    return ''
  }
}

/**
 * Returns minutes until departure (negative if past).
 */
export function minutesUntilDeparture(departureUTC) {
  return Math.round((new Date(departureUTC).getTime() - Date.now()) / 60000)
}
