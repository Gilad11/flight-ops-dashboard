import { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import FlightCard from './components/FlightCard'
import AddFlightModal from './components/AddFlightModal'
import FilterBar from './components/FilterBar'
import PinScreen from './components/PinScreen'
import { fetchFlights, deleteFlight, updateClearance } from './api/sheets'
import { localToUTC, TIMEZONES } from './utils/timeUtils'

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL

// ── Demo data shown when no backend is configured ─────────────────────────────
function makeDemoFlights() {
  const now = Date.now()
  const h = 3600000
  return [
    {
      id: 'demo-1',
      origin: 'UAE', destination: 'ISRAEL',
      flight_type: 'UAE', aircraft_type: 'Boeing 737-800',
      payload_type: 'PASSENGERS', route: 'SELERY',
      departure_time_utc: new Date(now - 1.5 * h).toISOString(),
      arrival_time_utc:   new Date(now + 3.5 * h).toISOString(),
      return_flight: 'true', unload_time: '1h',
      return_departure_utc: new Date(now + 4.5 * h).toISOString(),
      return_arrival_utc:   new Date(now + 9.5 * h).toISOString(),
      passenger_list_link: 'https://docs.google.com/spreadsheets',
      timezone_origin: 'Asia/Dubai', timezone_destination: 'Asia/Jerusalem',
      notes: '', created_at: new Date(now - 2 * h).toISOString(),
      clearance: 'true',
    },
    {
      id: 'demo-2',
      origin: 'ISRAEL', destination: 'UAE',
      flight_type: 'IL', aircraft_type: 'Airbus A320',
      payload_type: 'CARGO', route: 'CYPRUS',
      departure_time_utc: new Date(now + 2 * h).toISOString(),
      arrival_time_utc:   new Date(now + 8 * h).toISOString(),
      return_flight: 'false', unload_time: '1h',
      return_departure_utc: '', return_arrival_utc: '',
      passenger_list_link: '',
      timezone_origin: 'Asia/Jerusalem', timezone_destination: 'Asia/Dubai',
      notes: 'Priority cargo — fragile', created_at: new Date(now - h).toISOString(),
      clearance: 'false',
    },
    {
      id: 'demo-3',
      origin: 'UAE', destination: 'ISRAEL',
      flight_type: 'UAE', aircraft_type: 'Boeing 767',
      payload_type: 'CARGO', route: 'SELERY',
      departure_time_utc: new Date(now - 7 * h).toISOString(),
      arrival_time_utc:   new Date(now - 2 * h).toISOString(),
      return_flight: 'true', unload_time: '2h',
      return_departure_utc: new Date(now - 0 * h).toISOString(),
      return_arrival_utc:   new Date(now + 5 * h).toISOString(),
      passenger_list_link: '',
      timezone_origin: 'Asia/Dubai', timezone_destination: 'Asia/Jerusalem',
      notes: '', created_at: new Date(now - 8 * h).toISOString(),
      clearance: 'false',
    },
    {
      id: 'demo-4',
      origin: 'ISRAEL', destination: 'UAE',
      flight_type: 'IL', aircraft_type: 'Gulfstream G550',
      payload_type: 'PASSENGERS', route: 'SELERY',
      departure_time_utc: new Date(now + 5 * h).toISOString(),
      arrival_time_utc:   new Date(now + 10 * h).toISOString(),
      return_flight: 'false', unload_time: '1h',
      return_departure_utc: '', return_arrival_utc: '',
      passenger_list_link: 'https://docs.google.com/spreadsheets',
      timezone_origin: 'Asia/Jerusalem', timezone_destination: 'Asia/Dubai',
      notes: 'VIP delegation', created_at: new Date(now - 0.5 * h).toISOString(),
      clearance: 'false',
    },
  ].sort((a, b) => new Date(a.departure_time_utc) - new Date(b.departure_time_utc))
}

export default function App() {
  // ── Auth & theme (persisted) ──────────────────────────────────────────────
  const [role, setRole] = useState(() => sessionStorage.getItem('flight-ops-role') || null)
  const [theme, setTheme] = useState(() => localStorage.getItem('flight-ops-theme') || 'dark')

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('is-light')
    } else {
      document.documentElement.classList.remove('is-light')
    }
    localStorage.setItem('flight-ops-theme', theme)
  }, [theme])

  const handleAuth = newRole => {
    setRole(newRole)
    sessionStorage.setItem('flight-ops-role', newRole)
  }
  const handleLogout = () => {
    setRole(null)
    sessionStorage.removeItem('flight-ops-role')
  }

  // ── Flights state ─────────────────────────────────────────────────────────
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [displayTz, setDisplayTz] = useState('UAE')
  const [showAddModal, setShowAddModal] = useState(false)
  const [filter, setFilter] = useState({ payloadType: '', search: '' })

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadFlights = useCallback(async () => {
    if (!SCRIPT_URL) {
      setFlights(makeDemoFlights())
      setLoading(false)
      return
    }
    try {
      const data = await fetchFlights()
      setFlights(
        [...data].sort(
          (a, b) => new Date(a.departure_time_utc) - new Date(b.departure_time_utc)
        )
      )
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load flights')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFlights()
    if (!SCRIPT_URL) return  // no polling needed in demo mode
    const id = setInterval(loadFlights, 30000)
    return () => clearInterval(id)
  }, [loadFlights])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleFlightAdded = newFlight => {
    setFlights(prev =>
      [...prev, newFlight].sort(
        (a, b) => new Date(a.departure_time_utc) - new Date(b.departure_time_utc)
      )
    )
    setShowAddModal(false)
  }

  const handleTimeUpdated = (id, newDepUTC) => {
    setFlights(prev => prev.map(f => {
      if (f.id !== id) return f
      const durationMs = (f.route === 'CYPRUS' ? 6 : 5) * 3600000
      const arrUTC = new Date(new Date(newDepUTC).getTime() + durationMs).toISOString()
      let retDep = f.return_departure_utc
      let retArr = f.return_arrival_utc
      if (f.return_flight === 'true') {
        const unloadMs = (f.unload_time === '2h' ? 2 : 1) * 3600000
        retDep = new Date(new Date(arrUTC).getTime() + unloadMs).toISOString()
        retArr = new Date(new Date(retDep).getTime() + durationMs).toISOString()
      }
      return { ...f, departure_time_utc: newDepUTC, arrival_time_utc: arrUTC, return_departure_utc: retDep, return_arrival_utc: retArr }
    }).sort((a, b) => new Date(a.departure_time_utc) - new Date(b.departure_time_utc)))
  }

  const handleClearanceToggle = async (id, cleared) => {
    // Optimistic update — feels instant
    setFlights(prev =>
      prev.map(f => f.id === id ? { ...f, clearance: cleared ? 'true' : 'false' } : f)
    )
    if (SCRIPT_URL) {
      try {
        await updateClearance(id, cleared)
      } catch {
        // Revert on failure
        setFlights(prev =>
          prev.map(f => f.id === id ? { ...f, clearance: cleared ? 'false' : 'true' } : f)
        )
      }
    }
  }

  const handleDelete = async id => {
    if (!window.confirm('Delete this flight?')) return
    try {
      await deleteFlight(id)
      setFlights(prev => prev.filter(f => f.id !== id))
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = flights.filter(f => {
    if (filter.payloadType && f.payload_type !== filter.payloadType) return false
    if (filter.search) {
      const q = filter.search.toLowerCase()
      const haystack = `${f.aircraft_type} ${f.origin} ${f.destination} ${f.route} ${f.notes}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!role) return <PinScreen onAuth={handleAuth} />

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header
        displayTz={displayTz}
        setDisplayTz={setDisplayTz}
        theme={theme}
        setTheme={setTheme}
        role={role}
        onLogout={handleLogout}
      />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <>
            {/* Demo mode banner */}
            {!SCRIPT_URL && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 bg-amber-950/50 border border-amber-800/50 rounded-xl px-4 py-3 mb-4 text-xs">
                <span className="text-amber-300 font-medium">⚡ Demo mode — showing example data.</span>
                <span className="text-amber-600">Connect Google Sheets via <code className="text-amber-400">.env</code> to go live.</span>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500 text-sm">
                {loading ? 'Loading…' : `${filtered.length} flight${filtered.length !== 1 ? 's' : ''}`}
              </span>
              {/* Desktop add button */}
              {role === 'admin' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-blue-900/30"
                >
                  <span className="text-base leading-none">+</span>
                  Add Flight
                </button>
              )}
            </div>

            <FilterBar filter={filter} setFilter={setFilter} />

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3 mb-4 text-sm text-red-300">
                <span>⚠️ {error}</span>
                <button onClick={loadFlights} className="ml-auto underline hover:no-underline shrink-0">
                  Retry
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-5xl mb-4 opacity-50">✈️</div>
                <p className="text-slate-400 font-medium mb-1">No flights scheduled</p>
                <p className="text-slate-600 text-sm">
                  {flights.length > 0 ? 'No flights match your filter.' : 'Add your first flight to get started.'}
                </p>
              </div>
            )}

            {/* Flight list */}
            <div className="space-y-3">
              {filtered.map(flight => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  displayTz={displayTz}
                  role={role}
                  onDelete={handleDelete}
                  onClearanceToggle={handleClearanceToggle}
                  onTimeUpdated={handleTimeUpdated}
                />
              ))}
            </div>

            {/* Last updated */}
            {!loading && filtered.length > 0 && (
              <p className="text-slate-700 text-xs text-center mt-6 mb-20 sm:mb-6">
                Auto-refreshes every 30s
              </p>
            )}
        </>
      </main>

      {/* Mobile FAB — admin only, fixed bottom-right */}
      {role === 'admin' && (
        <button
          onClick={() => setShowAddModal(true)}
          className="sm:hidden fixed bottom-5 right-4 z-30 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold pl-4 pr-5 py-3.5 rounded-full shadow-2xl shadow-blue-900/50 transition-all"
        >
          <span className="text-xl leading-none">+</span>
          <span className="text-sm">Add Flight</span>
        </button>
      )}

      {showAddModal && (
        <AddFlightModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleFlightAdded}
        />
      )}
    </div>
  )
}

