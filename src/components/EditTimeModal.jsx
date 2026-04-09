import { useState } from 'react'
import { localToUTC, utcToLocalInputValue, formatUTCInTimezone, TIMEZONES } from '../utils/timeUtils'
import { updateFlightTime } from '../api/sheets'

const DURATION_H = { SELERY: 5, CYPRUS: 6 }

export default function EditTimeModal({ flight, onClose, onSave }) {
  const originTz = TIMEZONES[flight.origin] || TIMEZONES.UAE
  const destTz   = TIMEZONES[flight.destination] || TIMEZONES.UAE

  const [localVal, setLocalVal] = useState(
    () => utcToLocalInputValue(flight.departure_time_utc, originTz)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Live preview of new arrival time
  const arrivalPreview = (() => {
    if (!localVal) return null
    try {
      const newDepUTC = localToUTC(localVal, originTz)
      const dh = DURATION_H[flight.route] || 5
      const arr = new Date(new Date(newDepUTC).getTime() + dh * 3600000)
      return formatUTCInTimezone(arr.toISOString(), destTz)
    } catch { return null }
  })()

  const handleSave = async () => {
    if (!localVal) { setError('Enter a departure time.'); return }
    setLoading(true)
    setError('')
    try {
      const newDepUTC = localToUTC(localVal, originTz)
      if (import.meta.env.VITE_SCRIPT_URL) {
        await updateFlightTime(flight.id, newDepUTC)
      }
      onSave(flight.id, newDepUTC)
    } catch (err) {
      setError(err.message || 'Failed to update.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-white font-bold text-sm">Edit Departure Time</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {flight.origin === 'UAE' ? '🇦🇪' : '🇮🇱'} {flight.origin}
              {' → '}
              {flight.destination === 'UAE' ? '🇦🇪' : '🇮🇱'} {flight.destination}
              {flight.aircraft_type && ` · ${flight.aircraft_type}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Current */}
          <div>
            <p className="text-slate-500 text-xs uppercase font-semibold tracking-wider mb-1">
              Current departure ({flight.origin})
            </p>
            <p className="text-slate-300 text-sm font-mono">
              {formatUTCInTimezone(flight.departure_time_utc, originTz)}
            </p>
          </div>

          {/* New */}
          <div>
            <label className="block text-slate-500 text-xs uppercase font-semibold tracking-wider mb-2">
              New departure time (local {flight.origin})
            </label>
            <input
              type="datetime-local"
              value={localVal}
              onChange={e => setLocalVal(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-slate-500 [color-scheme:dark]"
            />
            {arrivalPreview && (
              <p className="text-slate-500 text-xs mt-1.5">
                New arrival ({flight.destination}): <span className="text-slate-300">{arrivalPreview}</span>
                {flight.return_flight === 'true' && (
                  <span className="text-slate-600"> · return times will update automatically</span>
                )}
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold transition-colors"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
