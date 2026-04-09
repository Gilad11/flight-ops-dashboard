import { useState } from 'react'
import { addFlight } from '../api/sheets'
import { localToUTC, TIMEZONES } from '../utils/timeUtils'

// ─── Airport data ─────────────────────────────────────────────────────────────

const AIRPORTS = {
  UAE: [
    { code: 'OMAA', name: 'Abu Dhabi Intl' },
    { code: 'OMDB', name: 'Dubai Intl' },
    { code: 'OMAL', name: 'Al Ain Intl' },
    { code: 'OMAD', name: 'Al Bateen Exec' },
  ],
  ISRAEL: [
    { code: 'LLBG', name: 'Ben Gurion' },
    { code: 'LLNV', name: 'Nevatim AB' },
  ],
}

const INITIAL = {
  origin: '',
  origin_airport: '',
  destination_airport: '',
  aircraft_type: '',
  payload_type: 'CARGO',
  route: 'SELERY',
  departure_time_local: '',
  return_flight: false,
  unload_time: '1h',
  passenger_list_link: '',
  notes: '',
}

export default function AddFlightModal({ onClose, onAdd }) {
  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const destination = form.origin === 'UAE' ? 'ISRAEL' : form.origin === 'ISRAEL' ? 'UAE' : ''
  const originAirports = form.origin ? AIRPORTS[form.origin] : []
  const destAirports   = destination ? AIRPORTS[destination] : []

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Reset airports when origin changes
  const setOrigin = (val) => setForm(prev => ({
    ...prev,
    origin: val,
    origin_airport: '',
    destination_airport: '',
  }))

  const durationH = form.route === 'CYPRUS' ? 6 : 5
  const arrivalPreview = (() => {
    if (!form.departure_time_local || !form.origin) return null
    try {
      const depUTC = localToUTC(form.departure_time_local, TIMEZONES[form.origin])
      const arr = new Date(new Date(depUTC).getTime() + durationH * 3600000)
      const destTz = TIMEZONES[destination] || TIMEZONES.UAE
      return arr.toLocaleString('en-GB', {
        timeZone: destTz,
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false,
      })
    } catch { return null }
  })()

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.origin)               { setError('Please select an origin.'); return }
    if (!form.origin_airport)       { setError('Please select a departure airport.'); return }
    if (!form.destination_airport)  { setError('Please select an arrival airport.'); return }
    if (!form.departure_time_local) { setError('Please enter a departure time.'); return }

    setLoading(true)
    setError('')
    try {
      const depUTC = localToUTC(form.departure_time_local, TIMEZONES[form.origin])
      const payload = {
        origin: form.origin,
        destination,
        origin_airport: form.origin_airport,
        destination_airport: form.destination_airport,
        aircraft_type: form.aircraft_type.trim(),
        payload_type: form.payload_type,
        route: form.route,
        departure_time_utc: depUTC,
        return_flight: form.return_flight,
        unload_time: form.unload_time,
        passenger_list_link: form.passenger_list_link.trim(),
        notes: form.notes.trim(),
      }
      const newFlight = await addFlight(payload)
      onAdd(newFlight)
    } catch (err) {
      setError(err.message || 'Failed to add flight. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-bold text-base tracking-tight">New Flight</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

          {/* ── Origin country ── */}
          <Section label="Origin">
            <div className="grid grid-cols-2 gap-3">
              <OriginBtn
                active={form.origin === 'UAE'}
                onClick={() => setOrigin('UAE')}
                flag="🇦🇪" label="UAE"
                activeClass="bg-emerald-800 border-emerald-500 text-white"
                hoverClass="hover:border-emerald-700"
              />
              <OriginBtn
                active={form.origin === 'ISRAEL'}
                onClick={() => setOrigin('ISRAEL')}
                flag="🇮🇱" label="Israel"
                activeClass="bg-blue-800 border-blue-500 text-white"
                hoverClass="hover:border-blue-700"
              />
            </div>
          </Section>

          {/* ── Departure airport ── */}
          {form.origin && (
            <Section label="Departure Airport">
              <div className="grid grid-cols-2 gap-2">
                {originAirports.map(ap => (
                  <AirportBtn
                    key={ap.code}
                    code={ap.code}
                    name={ap.name}
                    active={form.origin_airport === ap.code}
                    onClick={() => set('origin_airport', ap.code)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ── Arrival airport ── */}
          {destination && (
            <Section label={
              <>Arrival Airport <span className="text-slate-600 font-normal normal-case text-xs">
                ({destination === 'UAE' ? '🇦🇪 UAE' : '🇮🇱 Israel'})
              </span></>
            }>
              <div className="grid grid-cols-2 gap-2">
                {destAirports.map(ap => (
                  <AirportBtn
                    key={ap.code}
                    code={ap.code}
                    name={ap.name}
                    active={form.destination_airport === ap.code}
                    onClick={() => set('destination_airport', ap.code)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ── Aircraft type ── */}
          <Section label="Aircraft Type">
            <input
              type="text"
              value={form.aircraft_type}
              onChange={e => set('aircraft_type', e.target.value)}
              placeholder="e.g. Boeing 737, Airbus A320…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 transition-colors"
            />
          </Section>

          {/* ── Payload ── */}
          <Section label="Payload">
            <div className="grid grid-cols-2 gap-3">
              <ToggleBtn active={form.payload_type === 'CARGO'} onClick={() => set('payload_type', 'CARGO')} label="📦 Cargo" />
              <ToggleBtn active={form.payload_type === 'PASSENGERS'} onClick={() => set('payload_type', 'PASSENGERS')} label="👥 Passengers" />
            </div>
          </Section>

          {/* ── Route ── */}
          <Section label={<>Route <span className="text-slate-600 font-normal normal-case text-xs">(affects duration)</span></>}>
            <div className="grid grid-cols-2 gap-3">
              <ToggleBtn active={form.route === 'SELERY'} onClick={() => set('route', 'SELERY')} label="Selery — 5h" />
              <ToggleBtn active={form.route === 'CYPRUS'} onClick={() => set('route', 'CYPRUS')} label="🇨🇾 Cyprus — 6h" />
            </div>
          </Section>

          {/* ── Departure time ── */}
          <Section label={
            <>
              Departure Time
              {form.origin && (
                <span className="text-slate-600 font-normal normal-case text-xs ml-1">
                  (local {form.origin} time)
                </span>
              )}
            </>
          }>
            <input
              type="datetime-local"
              value={form.departure_time_local}
              onChange={e => set('departure_time_local', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-slate-500 transition-colors [color-scheme:dark]"
            />
            {arrivalPreview && (
              <p className="text-slate-500 text-xs mt-1.5">
                Estimated arrival ({destination}): <span className="text-slate-300">{arrivalPreview}</span>
              </p>
            )}
          </Section>

          {/* ── Return flight ── */}
          <Section label="Return Flight">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Enable return leg</span>
              <Toggle on={form.return_flight} onClick={() => set('return_flight', !form.return_flight)} />
            </div>
            {form.return_flight && (
              <div className="mt-3 pt-3 border-t border-slate-800">
                <p className="text-slate-500 text-xs mb-2 uppercase tracking-wider font-semibold">Unload time at destination</p>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleBtn active={form.unload_time === '1h'} onClick={() => set('unload_time', '1h')} label="1 hour" />
                  <ToggleBtn active={form.unload_time === '2h'} onClick={() => set('unload_time', '2h')} label="2 hours" />
                </div>
              </div>
            )}
          </Section>

          {/* ── Passenger list link ── */}
          <Section label={<>Passenger List Link <span className="text-slate-600 font-normal text-xs">(optional)</span></>}>
            <input
              type="url"
              value={form.passenger_list_link}
              onChange={e => set('passenger_list_link', e.target.value)}
              placeholder="https://docs.google.com/…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 transition-colors"
            />
          </Section>

          {/* ── Notes ── */}
          <Section label={<>Notes <span className="text-slate-600 font-normal text-xs">(optional)</span></>}>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional info…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-slate-500 transition-colors"
            />
          </Section>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-lg px-3 py-2.5">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition-colors text-sm tracking-wide"
          >
            {loading ? 'Saving…' : '✈️  Add Flight'}
          </button>

        </form>
      </div>
    </div>
  )
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div>
      <label className="block text-slate-500 text-xs font-semibold uppercase tracking-widest mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

function AirportBtn({ code, name, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all ${
        active
          ? 'bg-slate-700 border-slate-400 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
      }`}
    >
      <span className="font-mono font-bold text-sm">{code}</span>
      <span className="text-xs opacity-60 truncate w-full">{name}</span>
    </button>
  )
}

function OriginBtn({ active, onClick, flag, label, activeClass, hoverClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
        active
          ? activeClass
          : `bg-slate-800 border-slate-700 text-slate-400 ${hoverClass}`
      }`}
    >
      <span className="text-2xl leading-none">{flag}</span>
      {label}
    </button>
  )
}

function ToggleBtn({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
        active
          ? 'bg-slate-700 border-slate-500 text-white'
          : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  )
}

function Toggle({ on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-slate-700'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
