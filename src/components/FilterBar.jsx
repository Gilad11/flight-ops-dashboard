export default function FilterBar({ filter, setFilter }) {
  const set = (key, val) => setFilter(prev => ({ ...prev, [key]: val }))

  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-5">
      {/* Search — full width on mobile */}
      <input
        type="text"
        placeholder="Search aircraft, route…"
        value={filter.search}
        onChange={e => set('search', e.target.value)}
        className="w-full sm:flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-slate-600 transition-colors"
      />

      {/* Payload filter — full width on mobile, auto on desktop */}
      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 gap-0.5">
        {[
          { val: '',            label: 'All' },
          { val: 'CARGO',       label: '📦 Cargo' },
          { val: 'PASSENGERS',  label: '👥 Pax' },
        ].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => set('payloadType', val)}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter.payloadType === val
                ? 'bg-slate-700 text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
