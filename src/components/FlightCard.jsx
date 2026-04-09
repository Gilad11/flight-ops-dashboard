import { useState } from 'react'
import { getFlightStatus, formatUTCInTimezone, TIMEZONES, minutesUntilDeparture } from '../utils/timeUtils'
import EditTimeModal from './EditTimeModal'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS = {
  PLANNED: { label: 'Planned', dot: 'bg-slate-400',              badge: 'bg-slate-800 text-slate-400 border-slate-700' },
  IN_AIR:  { label: 'In Air',  dot: 'bg-amber-400 animate-pulse', badge: 'bg-amber-500/15 text-amber-300 border-amber-600/40' },
  LANDED:  { label: 'Landed',  dot: 'bg-emerald-400',            badge: 'bg-emerald-900/25 text-emerald-400 border-emerald-700/40' },
}

const ORIGIN = {
  UAE:    { flag: '🇦🇪', text: 'text-emerald-400' },
  ISRAEL: { flag: '🇮🇱', text: 'text-blue-400' },
  OTHER:  { flag: '🌍',  text: 'text-slate-400' },
}

// ─── FlightCard ───────────────────────────────────────────────────────────────

export default function FlightCard({ flight, displayTz, role, onDelete, onClearanceToggle, onTimeUpdated }) {
  const [showEditTime, setShowEditTime] = useState(false)
  const isAdmin = role === 'admin'

  const status     = getFlightStatus(flight.departure_time_utc, flight.arrival_time_utc)
  const sc         = STATUS[status] || STATUS.PLANNED
  const originCfg  = ORIGIN[flight.origin]      || ORIGIN.OTHER
  const destCfg    = ORIGIN[flight.destination] || ORIGIN.OTHER

  const tz       = TIMEZONES[displayTz] || TIMEZONES.UAE
  const tzLabel  = displayTz === 'ISRAEL' ? 'ISR' : 'UAE'
  const depTime  = formatUTCInTimezone(flight.departure_time_utc, tz)
  const arrTime  = formatUTCInTimezone(flight.arrival_time_utc,   tz)

  const hasReturn    = flight.return_flight === 'true'
  const retDepTime   = hasReturn ? formatUTCInTimezone(flight.return_departure_utc, tz) : null
  const retArrTime   = hasReturn ? formatUTCInTimezone(flight.return_arrival_utc,   tz) : null
  const returnStatus = hasReturn ? getFlightStatus(flight.return_departure_utc, flight.return_arrival_utc) : null

  const minsUntil = status === 'PLANNED' ? minutesUntilDeparture(flight.departure_time_utc) : null
  const soonHint  = minsUntil > 0 && minsUntil <= 120
    ? (minsUntil < 60 ? `${minsUntil}m` : `${Math.round(minsUntil / 60)}h ${minsUntil % 60}m`)
    : null

  const cleared = flight.clearance === 'true'

  return (
    <>
      {/* ── Card shell ──────────────────────────────────────────────────── */}
      <div className={`bg-slate-900 border rounded-xl overflow-hidden transition-colors ${
        status === 'IN_AIR'
          ? 'border-amber-700/50 shadow-lg shadow-amber-900/20'
          : 'border-slate-800 hover:border-slate-700'
      }`}>

        {/* ── Main row: content + desktop actions ─────────────────────── */}
        <div className="flex items-start gap-3 p-4">

          {/* LEFT: all content */}
          <div className="flex-1 min-w-0 space-y-2.5">

            {/* Route + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="text-xl leading-none">{originCfg.flag}</span>
                <span className={`text-sm ${originCfg.text}`}>{flight.origin}</span>
                <span className="text-slate-600 mx-0.5">→</span>
                <span className="text-xl leading-none">{destCfg.flag}</span>
                <span className={`text-sm ${destCfg.text}`}>{flight.destination}</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sc.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              {soonHint && (
                <span className="text-xs text-amber-400 font-medium">⏱ Departs in {soonHint}</span>
              )}
            </div>

            {/* Airport codes row */}
            {(flight.origin_airport || flight.destination_airport) && (
              <div className="flex items-center gap-1.5">
                <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded-md border ${
                  flight.origin === 'UAE'
                    ? 'bg-emerald-900/25 border-emerald-700/40 text-emerald-300'
                    : 'bg-blue-900/25 border-blue-700/40 text-blue-300'
                }`}>
                  {flight.origin_airport || '????'}
                </span>
                <span className="text-slate-600 text-xs">✈</span>
                <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded-md border ${
                  flight.destination === 'UAE'
                    ? 'bg-emerald-900/25 border-emerald-700/40 text-emerald-300'
                    : 'bg-blue-900/25 border-blue-700/40 text-blue-300'
                }`}>
                  {flight.destination_airport || '????'}
                </span>
              </div>
            )}

            {/* Aircraft / payload / route */}
            <div className="flex items-center gap-2 flex-wrap">
              {flight.aircraft_type && (
                <span className="text-slate-200 text-sm font-medium">{flight.aircraft_type}</span>
              )}
              <Tag
                label={flight.payload_type === 'CARGO' ? '📦 Cargo' : '👥 Passengers'}
                color={flight.payload_type === 'CARGO'
                  ? 'bg-orange-900/30 text-orange-300 border-orange-700/40'
                  : 'bg-violet-900/30 text-violet-300 border-violet-700/40'}
              />
              <Tag label={`via ${flight.route}`} color="bg-slate-800 text-slate-400 border-slate-700" />
            </div>

            {/* Outbound times */}
            <div className="flex items-center gap-3 flex-wrap">
              <TimeBlock label="Dep" time={depTime} tz={tzLabel} />
              {isAdmin && (
                <button
                  onClick={() => setShowEditTime(true)}
                  title="Edit departure time"
                  className="text-slate-600 hover:text-blue-400 transition-colors text-xs px-1 py-0.5 rounded hover:bg-blue-900/20 leading-none"
                >✏️</button>
              )}
              <span className="text-slate-700 text-sm">─</span>
              <TimeBlock label="Arr" time={arrTime} tz={tzLabel} />
            </div>

            {/* Return leg — clean 2-line structure */}
            {hasReturn && retDepTime && (
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-slate-500 text-xs font-semibold">↩ Return</span>
                  {returnStatus && returnStatus !== 'PLANNED' && (
                    <span className={`text-xs font-semibold ${
                      returnStatus === 'IN_AIR' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      · {STATUS[returnStatus]?.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <TimeBlock label="Dep" time={retDepTime} tz={tzLabel} small />
                  <span className="text-slate-700 text-xs shrink-0">→</span>
                  <TimeBlock label="Arr" time={retArrTime} tz={tzLabel} small />
                </div>
              </div>
            )}

            {/* Notes */}
            {flight.notes && (
              <p className="text-slate-500 text-xs italic">{flight.notes}</p>
            )}
          </div>

          {/* RIGHT: desktop-only action column */}
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
            {isAdmin
              ? <ClearanceButton cleared={cleared} onToggle={() => onClearanceToggle(flight.id, !cleared)} />
              : cleared && <ClearedBadge />
            }
            {hasReturn && <ReturnBadge />}
            {flight.passenger_list_link && <PaxLink href={flight.passenger_list_link} />}
            {isAdmin && <DeleteBtn onDelete={() => onDelete(flight.id)} />}
          </div>

        </div>

        {/* ── Mobile-only action strip ─────────────────────────────────── */}
        <div className="sm:hidden flex items-center gap-2 flex-wrap px-4 py-2.5 bg-slate-800/40 border-t border-slate-800">
          {isAdmin
            ? <ClearanceButton cleared={cleared} onToggle={() => onClearanceToggle(flight.id, !cleared)} />
            : cleared && <ClearedBadge />
          }
          {hasReturn && <ReturnBadge />}
          {flight.passenger_list_link && <PaxLink href={flight.passenger_list_link} />}
          {isAdmin && (
            <button
              onClick={() => onDelete(flight.id)}
              title="Delete flight"
              className="ml-auto text-slate-500 hover:text-red-400 transition-colors text-xs px-2 py-1.5 rounded-lg hover:bg-red-900/20"
            >
              🗑
            </button>
          )}
        </div>

      </div>

      {showEditTime && (
        <EditTimeModal
          flight={flight}
          onClose={() => setShowEditTime(false)}
          onSave={(id, newDepUTC) => { onTimeUpdated(id, newDepUTC); setShowEditTime(false) }}
        />
      )}
    </>
  )
}

// ─── Shared action components ─────────────────────────────────────────────────

function ClearanceButton({ cleared, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={cleared ? 'Clearance granted — click to revoke' : 'Awaiting clearance — click to approve'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 whitespace-nowrap ${
        cleared
          ? 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300 shadow-md shadow-emerald-900/30'
          : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-amber-600/60 hover:text-amber-300 hover:bg-amber-950/30'
      }`}
    >
      {cleared
        ? <><span className="text-base leading-none">✓</span> Cleared</>
        : <><span className="text-base leading-none opacity-60">○</span> Clearance</>
      }
    </button>
  )
}

function ClearedBadge() {
  return (
    <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-900/30 text-emerald-400 border border-emerald-700/40 font-semibold whitespace-nowrap">
      ✓ Cleared
    </span>
  )
}

function ReturnBadge() {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/30 text-indigo-300 border border-indigo-700/40 font-medium whitespace-nowrap">
      ↩ Return
    </span>
  )
}

function PaxLink({ href }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors font-medium whitespace-nowrap"
    >
      📋 Pax List
    </a>
  )
}

function DeleteBtn({ onDelete }) {
  return (
    <button
      onClick={onDelete}
      title="Delete flight"
      className="text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded p-1 transition-colors text-sm leading-none mt-auto"
    >
      ✕
    </button>
  )
}

// ─── Utility components ───────────────────────────────────────────────────────

function TimeBlock({ label, time, tz, small }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-slate-600 text-xs">{label} · {tz}</span>
      <span className={`font-mono font-semibold text-white tabular-nums ${small ? 'text-xs' : 'text-sm'}`}>
        {time || '—'}
      </span>
    </div>
  )
}

function Tag({ label, color }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>{label}</span>
  )
}
