import { motion } from 'framer-motion'
import { Search, SearchX } from 'lucide-react'
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
  const all = data ?? []
  const list = useMemo(() => all
    .filter((l) => type === 'all' || l.type === type)
    .filter((l) => showClosed || isOpen(l))
    .filter((l) => !q || `${l.title} ${l.summary} ${l.location} ${l.client_name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => Number(isOpen(b)) - Number(isOpen(a))), [all, type, q, showClosed])
  const types = (['all', ...Object.keys(GIG_TYPES)] as (GigType | 'all')[]).filter((t) => t === 'all' || all.some((l) => l.type === t))

  return (
    <div className="container-x py-14">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="eyebrow">Find work</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tightest md:text-5xl">Open gigs</h1>
        <p className="mt-3 max-w-lg text-lg text-ink-muted">Paid, clearly scoped work from businesses that need people on the ground.</p>
      </motion.div>
      <div className="mt-10 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
          {types.map((t) => (
            <button key={t} onClick={() => setType(t)} className={`relative shrink-0 rounded-full px-4 py-2 text-sm transition ${type === t ? 'font-medium text-white' : 'text-ink-muted hover:text-ink'}`}>
              {type === t && <motion.span layoutId="type-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ duration: 0.3 }} />}
              <span className="relative">{t === 'all' ? 'All' : GIG_TYPES[t].label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input className="input py-2.5 pl-10 text-sm" placeholder="Search location, company…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" /> Show closed
          </label>
        </div>
      </div>
      <div className="mt-8">
        {loading ? <PageLoader /> : list.length ? (
          <>
            <p className="mb-6 text-sm text-ink-muted">{list.length} gig{list.length > 1 ? 's' : ''}</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((l, i) => <GigCard key={l.id} l={l} i={i} />)}</div>
          </>
        ) : <Empty icon={<SearchX className="h-5 w-5" />} title="No gigs match" body="New work is posted every week. Get verified now so you’re ready when it drops." />}
      </div>
    </div>
  )
}
