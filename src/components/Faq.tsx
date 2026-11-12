import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Reveal, SectionHead } from './ui'

const EASE = [0.22, 1, 0.36, 1] as const

/** Accordion of questions and answers, used on the homepage and the business page. */
export default function FAQ({ items, title = 'Questions, answered.', body = 'Can’t find what you need? Email hello@gigotter.com.', id }: { items: [string, string][]; title?: ReactNode; body?: string; id?: string }) {
  const [o, setO] = useState<number | null>(0)
  return (
    <section id={id} className="container-x grid gap-12 pb-28 md:grid-cols-[.8fr_1.2fr]">
      <Reveal><SectionHead eyebrow="FAQ" title={title} body={body} /></Reveal>
      <div className="border-t border-line">
        {items.map(([q, a], i) => (
          <div key={q} className="border-b border-line">
            <button onClick={() => setO(o === i ? null : i)} aria-expanded={o === i} className="group flex w-full items-center justify-between gap-6 py-6 text-left">
              <span className="text-[17px] font-medium transition-transform duration-300 group-hover:translate-x-1">{q}</span>
              <motion.span animate={{ rotate: o === i ? 135 : 0 }} transition={{ duration: 0.4, ease: EASE }}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${o === i ? 'border-brand-700 bg-brand-700 text-white' : 'border-line text-ink-muted group-hover:border-ink/40'}`}>
                <Plus className="h-4 w-4" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {o === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                  <p className="max-w-xl pb-6 leading-relaxed text-ink-muted">{a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  )
}
