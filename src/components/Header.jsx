import { useState, useEffect } from 'react'
import { getCurrentTimeInTZ, getCurrentDateInTZ, TIMEZONES } from '../utils/timeUtils'

export default function Header({ displayTz, setDisplayTz, theme, setTheme, role, onLogout }) {
  const [times, setTimes] = useState({ uae: '', israel: '' })
  const [dates, setDates] = useState({ uae: '', israel: '' })

  useEffect(() => {
    const tick = () => {
      setTimes({ uae: getCurrentTimeInTZ(TIMEZONES.UAE), israel: getCurrentTimeInTZ(TIMEZONES.ISRAEL) })
      setDates({ uae: getCurrentDateInTZ(TIMEZONES.UAE),  israel: getCurrentDateInTZ(TIMEZONES.ISRAEL) })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const isLight = theme === 'light'

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4">

        {/* ── Row 1: Logo / Controls (always visible) ── */}
        <div className="flex items-center justify-between h-12 sm:h-14">

          {/* Left: logo + role */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl leading-none">✈️</span>
            <span className="font-bold text-white text-sm tracking-widest uppercase hidden sm:block">
              Flight Ops
            </span>
            <RoleBadge role={role} />
          </div>

          {/* Center: clocks — desktop only */}
          <div className="hidden sm:flex items-center gap-5">
            <FullClock flag="🇦🇪" time={times.uae}    date={dates.uae}    colorClass="text-emerald-400" />
            <div className="w-px h-7 bg-slate-700" />
            <FullClock flag="🇮🇱" time={times.israel} date={dates.israel} colorClass="text-blue-400" />
          </div>

          {/* Right: icon controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(isLight ? 'dark' : 'light')}
              title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-base"
            >
              {isLight ? '🌙' : '☀️'}
            </button>

            {/* TZ toggle — desktop only (mobile goes in row 2) */}
            <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 gap-0.5">
              <TzBtn active={displayTz === 'UAE'}    onClick={() => setDisplayTz('UAE')}    label="🇦🇪 UAE" activeClass="bg-emerald-700 text-white" />
              <TzBtn active={displayTz === 'ISRAEL'} onClick={() => setDisplayTz('ISRAEL')} label="🇮🇱 ISR" activeClass="bg-blue-700 text-white" />
            </div>

            {/* Lock */}
            <button
              onClick={onLogout}
              title="Lock / switch user"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-sm"
            >
              🔒
            </button>
          </div>
        </div>

        {/* ── Row 2: Mobile only — compact clocks + TZ toggle ── */}
        <div className="flex items-center justify-between pb-2.5 sm:hidden border-t border-slate-800/40 pt-2">
          <div className="flex items-center gap-3">
            <MiniClock flag="🇦🇪" time={times.uae}    colorClass="text-emerald-400" />
            <div className="w-px h-4 bg-slate-700" />
            <MiniClock flag="🇮🇱" time={times.israel} colorClass="text-blue-400" />
          </div>
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 gap-0.5">
            <TzBtn active={displayTz === 'UAE'}    onClick={() => setDisplayTz('UAE')}    label="🇦🇪 UAE" activeClass="bg-emerald-700 text-white" compact />
            <TzBtn active={displayTz === 'ISRAEL'} onClick={() => setDisplayTz('ISRAEL')} label="🇮🇱 ISR" activeClass="bg-blue-700 text-white" compact />
          </div>
        </div>

      </div>
    </header>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FullClock({ flag, time, date, colorClass }) {
  return (
    <div className="text-center leading-tight">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{flag}</span>
        <span className={`font-mono font-bold text-base tabular-nums ${colorClass}`}>{time || '--:--:--'}</span>
      </div>
      <div className="text-slate-600 text-xs mt-0.5">{date}</div>
    </div>
  )
}

function MiniClock({ flag, time, colorClass }) {
  // Show HH:MM only on mobile (no seconds, saves space)
  const display = time ? time.slice(0, 5) : '--:--'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{flag}</span>
      <span className={`font-mono font-bold text-sm tabular-nums ${colorClass}`}>{display}</span>
    </div>
  )
}

function TzBtn({ active, onClick, label, activeClass, compact }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md font-semibold transition-all ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
      } ${active ? activeClass : 'text-slate-500 hover:text-slate-300'}`}
    >
      {label}
    </button>
  )
}

function RoleBadge({ role }) {
  if (!role) return null
  return role === 'admin' ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/40 font-semibold">
      👑 Admin
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
      👁 Viewer
    </span>
  )
}
