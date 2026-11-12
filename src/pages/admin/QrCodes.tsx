import { Archive, ArchiveRestore, Copy, Download, Plus, QrCode as QrIcon, Smartphone } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Empty, Modal, PageLoader, Spinner, useToast } from '../../components/ui'
import { qr } from '../../lib/api'
import { ago } from '../../lib/format'
import { qrCardPng, qrOnlyPng, saveBlob } from '../../lib/qrImage'
import { useAsync } from '../../lib/session'
import type { QrStat } from '../../lib/types'

const SITE = 'https://gigotter.com'
const TARGETS: [string, string][] = [['/', 'Home page'], ['/gigs', 'Open gigs'], ['/signup', 'Sign-up page'], ['/brief', 'For businesses']]
const linkFor = (code: string) => `${SITE}/s/${code}`
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')

export default function QrCodes() {
  const toast = useToast()
  const data = useAsync(() => qr.stats(), [])
  const [edit, setEdit] = useState<{ code: string; label: string; target: string; isNew: boolean } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  if (data.loading) return <PageLoader />
  const rows = data.data ?? []
  const list = rows.filter((r) => showArchived || !r.archived)
  const total = rows.reduce((a, r) => ({ scans: a.scans + r.scans, people: a.people + r.people, signups: a.signups + r.signups }), { scans: 0, people: 0, signups: 0 })

  const download = async (r: QrStat, kind: 'card' | 'code') => {
    setBusy(r.code + kind)
    try { saveBlob(kind === 'card' ? await qrCardPng(linkFor(r.code), r.label) : await qrOnlyPng(linkFor(r.code)), `gigotter-qr-${r.code}${kind === 'card' ? '-card' : ''}.png`) }
    catch (e: any) { toast(e.message, 'err') } finally { setBusy(null) }
  }
  const archive = async (r: QrStat) => {
    try { await qr.save({ ...r, archived: !r.archived }, false); toast(r.archived ? 'Code restored' : 'Code archived — it still opens the site but stops counting'); data.reload() }
    catch (e: any) { toast(e.message, 'err') }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">QR codes</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">Make a separate code for each place you put one (brochure, posters, a post) to see which brings people in. Scans are anonymous: no names or IP addresses.</p>
        </div>
        <button onClick={() => setEdit({ code: '', label: '', target: '/', isNew: true })} className="btn-primary btn-sm"><Plus className="h-4 w-4" />New QR code</button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {[['Scans', total.scans], ['People', total.people], ['Sign-ups', total.signups]].map(([k, v]) => (
          <div key={k} className="card p-4"><div className="text-xs text-ink-muted">{k} (all codes)</div><div className="figure mt-1 text-3xl">{v}</div></div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {!list.length && <Empty icon={<QrIcon className="h-5 w-5" />} title="No QR codes yet" body="Create one for each brochure, poster or post you share." />}
        {list.map((r) => (
          <div key={r.code} className={`card p-5 ${r.archived ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><h3 className="text-lg font-semibold">{r.label}</h3>{r.archived && <span className="chip bg-sand text-ink-soft">Archived</span>}</div>
                <button onClick={() => { navigator.clipboard?.writeText(linkFor(r.code)); toast('Link copied') }} className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-sm text-brand-700 hover:underline">
                  gigotter.com/s/{r.code}<Copy className="h-3.5 w-3.5" />
                </button>
                <div className="mt-0.5 text-xs text-ink-muted">Opens {TARGETS.find(([t]) => t === r.target)?.[1] ?? r.target} · {r.last_scan ? `last scan ${ago(r.last_scan)}` : 'no scans yet'}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => download(r, 'card')} disabled={!!busy} className="btn-ghost btn-sm">{busy === r.code + 'card' ? <Spinner /> : <Download className="h-4 w-4" />}Print card</button>
                <button onClick={() => download(r, 'code')} disabled={!!busy} className="btn-ghost btn-sm">{busy === r.code + 'code' ? <Spinner /> : <QrIcon className="h-4 w-4" />}Code only</button>
                <button onClick={() => setEdit({ code: r.code, label: r.label, target: r.target, isNew: false })} className="btn-ghost btn-sm">Edit</button>
                <button onClick={() => archive(r)} aria-label={r.archived ? 'Restore' : 'Archive'} className="grid h-9 w-9 place-items-center rounded-full border border-line hover:border-ink/30">{r.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                ['Scans', r.scans, null], ['People', r.people, null], ['Last 7 days', r.scans_7d, null],
                ['On phones', pct(r.mobile, r.scans), <Smartphone key="p" className="h-3 w-3" />],
                ['Sign-ups', r.signups, pct(r.signups, r.people) + ' of people'], ['Verified', r.verified, null],
              ].map(([k, v, sub]) => (
                <div key={k as string} className="rounded-xl bg-paper px-3 py-2.5">
                  <dt className="text-[11px] text-ink-muted">{k}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{v as any}</dd>
                  {typeof sub === 'string' && <div className="text-[11px] text-ink-muted">{sub}</div>}
                </div>
              ))}
            </dl>
          </div>
        ))}
        {rows.some((r) => r.archived) && <button onClick={() => setShowArchived(!showArchived)} className="text-sm text-ink-muted underline underline-offset-2">{showArchived ? 'Hide' : 'Show'} archived codes</button>}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-ink-muted">“People” counts each phone once. “Sign-ups” are accounts created within 30 days of scanning. The original QR code (plain gigotter.com) can’t be counted; use these codes on anything new you print or post.</p>

      <QrForm edit={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); data.reload() }} />
    </div>
  )
}

function QrForm({ edit, onClose, onSaved }: { edit: { code: string; label: string; target: string; isNew: boolean } | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState(edit)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setF(edit) }, [edit]) // load the code being edited each time the form opens
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!f || busy) return
    setBusy(true)
    try { await qr.save(f, f.isNew); toast(f.isNew ? 'QR code created' : 'Saved'); onSaved() } catch (err: any) { toast(err.message, 'err') } finally { setBusy(false) }
  }
  return (
    <Modal open={!!edit} onClose={onClose}>
      {f && (
        <form onSubmit={submit} className="space-y-4">
          <h2 className="text-2xl font-semibold">{f.isNew ? 'New QR code' : 'Edit QR code'}</h2>
          <div><label className="label">Name</label><input className="input" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Legon campus posters" maxLength={80} /></div>
          <div>
            <label className="label">Short code {!f.isNew && <span className="font-normal text-ink-muted">(can’t change once printed)</span>}</label>
            <div className="flex items-center rounded-xl border border-line bg-white pl-4 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
              <span className="shrink-0 text-[15px] text-ink-muted">gigotter.com/s/</span>
              <input className="w-full rounded-xl bg-transparent py-3 pr-4 text-[15px] outline-none disabled:text-ink-muted" value={f.code} disabled={!f.isNew} maxLength={24}
                onChange={(e) => setF({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="legon" />
            </div>
            <p className="mt-1.5 text-xs text-ink-muted">Keep it short: shorter links make simpler, easier-to-scan codes.</p>
          </div>
          <div>
            <label className="label">Where it opens</label>
            <div className="grid grid-cols-2 gap-2">
              {TARGETS.map(([t, l]) => <button type="button" key={t} onClick={() => setF({ ...f, target: t })} className={`rounded-xl border px-3 py-2.5 text-left text-sm ${f.target === t ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-white hover:border-ink/30'}`}>{l}</button>)}
            </div>
          </div>
          <button className="btn-brand w-full" disabled={busy}>{busy ? <Spinner /> : f.isNew ? 'Create QR code' : 'Save'}</button>
        </form>
      )}
    </Modal>
  )
}
