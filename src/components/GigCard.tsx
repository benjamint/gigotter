import { motion } from 'framer-motion'
import { ArrowUpRight, Clock, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { coverFor, isOpen, maxEarn, money, payLine, spotsLeft, timeLeft } from '../lib/format'
import { GIG_TYPES, type Listing } from '../lib/types'
import Photo from './Photo'
import { audienceOf, isApply } from '../lib/audience'
import { useSpotlight } from './motion'

export default function GigCard({ l, i = 0 }: { l: Listing; i?: number }) {
  const t = timeLeft(l.expires_at)
  const left = spotsLeft(l)
  const open = isOpen(l)
  const spot = useSpotlight('rgba(47,107,82,.08)', 380)
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}>
      <Link to={`/gigs/${l.id}`} {...spot.handlers} className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-white p-2.5 transition duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1.5 hover:border-ink/15 hover:shadow-[0_30px_60px_-36px_rgba(16,41,31,.35)] ${!open ? 'opacity-60' : ''}`}>
        {spot.layer}
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
          <Photo src={coverFor(l)} alt={l.title} label={GIG_TYPES[l.type].label} className="h-full w-full transition duration-700 group-hover:scale-[1.05]" />
          <div className="absolute left-3 top-3 flex gap-1.5">
            <span className="chip bg-white/95 text-ink shadow-sm backdrop-blur">{GIG_TYPES[l.type].label}</span>
            {isApply(l) && <span className="chip bg-brand-600 text-white shadow-sm">Apply</span>}
            {audienceOf(l) !== 'students' && <span className="chip bg-white/95 text-ink shadow-sm backdrop-blur">{audienceOf(l) === 'everyone' ? 'Open to everyone' : 'Non-students'}</span>}
            {l.status !== 'live' && <span className="chip bg-ink/80 capitalize text-white">{l.status}</span>}
          </div>
          <span className="absolute right-3 top-3 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-white text-ink opacity-0 shadow-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <div className="relative z-10 flex flex-1 flex-col px-3 pb-3 pt-4">
          {l.client_name && <div className="text-xs font-medium text-ink-muted">{l.client_name}</div>}
          <h3 className="mt-1 text-[19px] font-semibold leading-snug tracking-[-0.02em]">{l.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{l.summary}</p>
          <div className="mb-5 mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><span className="max-w-[11rem] truncate">{l.is_remote ? 'Remote' : l.location}</span></span>
            <span className={`flex items-center gap-1.5 ${t.urgent && !t.expired ? 'text-clay-600' : ''}`}><Clock className="h-3.5 w-3.5" />{t.label}</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{left > 0 ? `${left} of ${l.slots} spots` : 'Full'}</span>
          </div>
          <div className="mt-auto flex items-end justify-between border-t border-line pt-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-ink-muted">Earn up to</div>
              <div className="font-display text-2xl font-semibold tracking-tight">{money(maxEarn(l), l.currency)}</div>
            </div>
            <div className="text-right text-sm font-medium text-brand-600">{payLine(l)}</div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
