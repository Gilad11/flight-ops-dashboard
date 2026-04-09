import { useState } from 'react'

const PINS = {
  '2410': 'admin',
  '3674': 'viewer',
}

export default function PinScreen({ onAuth }) {
  const [digits, setDigits] = useState([])
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)

  const push = d => {
    if (error || digits.length >= 4) return
    const next = [...digits, d]
    setDigits(next)

    if (next.length === 4) {
      const pin = next.join('')
      const role = PINS[pin]
      if (role) {
        setTimeout(() => onAuth(role), 200)
      } else {
        setError(true)
        setShaking(true)
        setTimeout(() => {
          setDigits([])
          setError(false)
          setShaking(false)
        }, 700)
      }
    }
  }

  const del = () => {
    if (error) return
    setDigits(prev => prev.slice(0, -1))
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-10 select-none">

      {/* Brand */}
      <div className="text-center">
        <div className="text-5xl mb-3">✈️</div>
        <h1 className="text-white font-bold text-xl tracking-widest uppercase">Flight Ops</h1>
        <p className="text-slate-500 text-sm mt-1">Enter PIN to continue</p>
      </div>

      {/* Dots */}
      <div className={`flex gap-5 ${shaking ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              digits.length > i
                ? error
                  ? 'border-red-400 bg-red-400'
                  : 'border-blue-400 bg-blue-400 scale-110'
                : 'border-slate-600'
            }`}
          />
        ))}
      </div>

      {/* Error hint */}
      <p className={`text-red-400 text-xs -mt-5 transition-opacity ${error ? 'opacity-100' : 'opacity-0'}`}>
        Incorrect PIN
      </p>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <NumKey key={n} label={String(n)} onClick={() => push(String(n))} />
        ))}
        <div />
        <NumKey label="0" onClick={() => push('0')} />
        <NumKey label="⌫" onClick={del} subtle />
      </div>

    </div>
  )
}

function NumKey({ label, onClick, subtle }) {
  return (
    <button
      onClick={onClick}
      className={`w-[72px] h-[72px] rounded-2xl text-xl font-semibold transition-all active:scale-90 ${
        subtle
          ? 'text-slate-500 hover:text-white bg-transparent'
          : 'bg-slate-800 text-white hover:bg-slate-700 active:bg-slate-600 shadow-lg shadow-black/30'
      }`}
    >
      {label}
    </button>
  )
}
