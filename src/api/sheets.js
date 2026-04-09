const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL || ''

function assertConfigured() {
  if (!SCRIPT_URL) {
    throw new Error('VITE_SCRIPT_URL is not set. See SETUP.md.')
  }
}

// ─── GET all flights ──────────────────────────────────────────────────────────

export async function fetchFlights() {
  assertConfigured()
  const res = await fetch(`${SCRIPT_URL}?action=getFlights`, {
    method: 'GET',
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Server error')
  return json.data
}

// ─── POST add flight ──────────────────────────────────────────────────────────
// Content-Type: text/plain avoids CORS preflight for GAS web apps.

export async function addFlight(flightData) {
  assertConfigured()
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'addFlight', data: flightData }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Failed to add flight')
  return json.data
}

// ─── POST update departure time (admin) ──────────────────────────────────────

export async function updateFlightTime(id, newDepartureUTC) {
  assertConfigured()
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateFlightTime', id, departure_time_utc: newDepartureUTC }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Failed to update time')
  return true
}

// ─── POST update clearance ────────────────────────────────────────────────────

export async function updateClearance(id, cleared) {
  assertConfigured()
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'updateClearance', id, cleared }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Failed to update clearance')
  return true
}

// ─── POST delete flight ───────────────────────────────────────────────────────

export async function deleteFlight(id) {
  assertConfigured()
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'deleteFlight', id }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  if (!json.success) throw new Error(json.error || 'Failed to delete flight')
  return true
}
