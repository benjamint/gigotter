import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import GigCard from '../components/GigCard'
import { Empty, PageLoader } from '../components/ui'
import { listListings } from '../lib/api'
import { isOpen } from '../lib/format'
import { useAsync } from '../lib/session'
import { GIG_TYPES, type GigType } from '../lib/types'

export default function Gigs() {
  const { data, loading } = useAsync(() => listListings(), [])
  const [type, setType] = useState<GigType | 'all'>('all')
  const [q, setQ] = useState('')
  const [showClosed, setShowClosed] = useState(false)
  const list = useMemo(() => (data ?? [])
    .filter((l) => type === 'all' || l.type === type)
    .filter((l) => showClosed || isOpen(l))
    .filter((l) => !q || `${l.title} ${l.summary} ${l.location}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a))), [data, type, q, showClosed])

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-extrabold md:text-7xl">
        Pick a gig.<br /><span className="text-gradient">Get the bag.</span>
      </motion.h1>
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" />
          <input className="input pl-12" placeholder="Search by area, type, anything…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="h-4 w-4 accent-ink" /> Show closed
        </label>
      </div>
      <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {(['all', ...Object.keys(GIG_TYPES)] as (GigType | 'all')[]).map((t) => (
          <button key={t} onClick={() => setType(t)} className={`relative shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${type === t ? 'border-ink text-white' : 'border-ink/15 bg-white hover:border-ink'}`}>
            {type === t && <motion.span layoutId="type-pill" className="absolute inset-0 rounded-full bg-ink" />}
            <span className="relative">{t === 'all' ? '✨ All' : `${GIG_TYPES[t].emoji} ${GIG_TYPES[t].label}`}</span>
          </button>
        ))}
      </div>
      <div className="mt-8">
        {loading ? <PageLoader /> : list.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map((l, i) => <GigCard key={l.id} l={l} i={i} />)}</div>
        ) : <Empty emoji="🫥" title="Nothing here (yet)" body="New gigs drop every week. Get verified now so you can grab them first." />}
      </div>
    </div>
  )
}
