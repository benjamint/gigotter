import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight, Clock, MapPin, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ACCENTS, isOpen, maxEarn, money, payLine, spotsLeft, timeLeft } from '../lib/format'
import { GIG_TYPES, type Listing } from '../lib/types'

export default function GigCard({ l, i = 0 }: { l: Listing; i?: number }) {
  const a = ACCENTS[l.accent] ?? ACCENTS.glow
  const t = timeLeft(l.expires_at)
  const left = spotsLeft(l)
  const open = isOpen(l)
  const mx = useMotionValue(0), my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 18 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 18 })

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      transition={{ duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width - 0.5); my.set((e.clientY - r.top) / r.height - 0.5) }}
      onMouseLeave={() => { mx.set(0); my.set(0) }}
      whileHover={{ y: -4 }}
    >
      <Link to={`/gigs/${l.id}`} className={`card group relative flex h-full flex-col overflow-hidden p-5 transition-shadow hover:shadow-brutal-lg ${!open ? 'opacity-70' : ''}`}>
        <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${a.solid} opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-40`} />
        <div className="relative flex items-start justify-between">
          <div className={`grid h-14 w-14 place-items-center rounded-2xl text-3xl ${a.bg}`}>{l.emoji}</div>
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink transition group-hover:rotate-45 group-hover:bg-ink group-hover:text-white">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-1.5">
          <span className="chip bg-ink text-white">{GIG_TYPES[l.type].label}</span>
          <span className={`chip ${t.urgent ? 'bg-red-100 text-red-700' : 'bg-ink/5'}`}><Clock className="h-3 w-3" />{t.label}</span>
          {l.status !== 'live' && <span className="chip bg-ink/10 capitalize">{l.status}</span>}
        </div>
        <h3 className="relative mt-3 text-xl font-bold leading-tight">{l.title}</h3>
        <p className="relative mt-1.5 line-clamp-2 text-sm text-ink/60">{l.summary}</p>
        <div className="relative mt-auto pt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-ink/50">Earn up to</div>
              <div className="font-display text-3xl font-extrabold">{money(maxEarn(l), l.currency)}</div>
              <div className={`text-xs font-semibold ${a.text}`}>{payLine(l)}</div>
            </div>
            <div className="text-right text-xs text-ink/60">
              <div className="flex items-center justify-end gap-1"><Users className="h-3.5 w-3.5" />{left > 0 ? `${left} of ${l.slots} spots` : 'Full'}</div>
              <div className="mt-1 flex items-center justify-end gap-1"><MapPin className="h-3.5 w-3.5" /><span className="max-w-[9rem] truncate">{l.is_remote ? 'Remote' : l.location}</span></div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
