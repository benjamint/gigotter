import { Check, Copy, Mail, RotateCw, ShieldCheck, UserPlus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { PageLoader, Spinner, useToast } from '../../components/ui'
import { admin } from '../../lib/api'
import { ago } from '../../lib/format'
import { useAsync, useSession } from '../../lib/session'
import type { AdminInvite } from '../../lib/types'

/** Admin › Team: who can run Gigotter, and email invites for new admins. */
export default function Team() {
  const toast = useToast()
  const { user } = useSession()
  const data = useAsync(async () => {
    const [profiles, invites] = await Promise.all([admin.profiles(), admin.invites()])
    return { admins: profiles.filter((p) => p.role === 'admin'), invites }
  }, [])
  const [f, setF] = useState({ email: '', name: '' })
  const [busy, setBusy] = useState<string | null>(null)
  const [demoLink, setDemoLink] = useState<string | null>(null)

  const send = async (email: string, name: string, key: string) => {
    setBusy(key)
    try {
      const link = await admin.inviteAdmin(email, name)
      setDemoLink(link)
      toast(`Invite sent to ${email.trim().toLowerCase()}`)
      data.reload(); return true
    } catch (e: any) { toast(e.message, 'err'); return false } finally { setBusy(null) }
  }
  const submit = async (e: FormEvent) => { e.preventDefault(); if (await send(f.email, f.name, 'new')) setF({ email: '', name: '' }) }
  const cancel = async (i: AdminInvite) => {
    if (!confirm(`Cancel the invite for ${i.email}? The link in their email will stop working.`)) return
    setBusy(i.id)
    try { await admin.revokeInvite(i.id); toast('Invite cancelled'); data.reload() }
    catch (e: any) { toast(e.message, 'err') } finally { setBusy(null) }
  }

  if (data.error) return <div className="card p-6 text-sm text-ink-soft">Admin invites aren’t set up yet: run migration <b>0020_admin_invites.sql</b> in the Supabase SQL editor, then refresh. <span className="text-ink-muted">({data.error})</span></div>
  if (!data.data) return <PageLoader />
  const { admins, invites } = data.data
  const open = invites.filter((i) => !i.accepted_at && !i.revoked_at)
  const expired = (i: AdminInvite) => +new Date(i.expires_at) < Date.now()

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="card space-y-4 self-start p-6">
        <div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700"><UserPlus className="h-5 w-5" /></span>
          <h3 className="mt-3 font-semibold">Invite an admin</h3>
          <p className="mt-1 text-sm text-ink-muted">They get an email with a link. Once they sign up or log in with this email and accept, they can use this dashboard.</p>
        </div>
        <div><label className="label">Email</label><input className="input" type="email" required maxLength={254} autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name@gigotter.com" /></div>
        <div><label className="label">Name <span className="font-normal text-ink-muted">(optional)</span></label><input className="input" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ama Mensah" /><p className="mt-1 text-xs text-ink-muted">Used to greet them in the email.</p></div>
        <p className="rounded-xl bg-paper p-3 text-xs text-ink-soft">Admins can see every student’s details and documents, approve work and record payouts. Only invite people you trust.</p>
        <button className="btn-brand w-full" disabled={busy === 'new'}>{busy === 'new' ? <Spinner /> : <Mail className="h-4 w-4" />}Send invite</button>
        {demoLink && (
          <div className="rounded-xl border border-dashed border-line p-3 text-xs">
            <div className="font-medium">Demo mode: no email is sent. Open this link to accept:</div>
            <div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 truncate">{demoLink}</code>
              <button type="button" className="btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(demoLink); toast('Link copied') }}><Copy className="h-3.5 w-3.5" /></button></div>
          </div>
        )}
      </form>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold">Admins <span className="text-ink-muted">· {admins.length}</span></h2>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {admins.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">{(p.full_name || p.email || '?').trim().charAt(0).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.full_name || 'No name yet'}{p.id === user?.id && <span className="ml-2 chip bg-sand text-ink-soft">You</span>}</div>
                  <div className="truncate text-sm text-ink-muted">{p.email}</div>
                </div>
                <ShieldCheck className="h-4 w-4 shrink-0 text-brand-700" aria-label="Admin" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Invites</h2>
          {invites.length === 0 ? <p className="mt-2 text-sm text-ink-muted">No invites yet. Invites you send show here until they’re accepted.</p> : (
            <div className="mt-4 space-y-3">
              {[...open, ...invites.filter((i) => i.accepted_at || i.revoked_at)].slice(0, 30).map((i) => {
                const state = i.accepted_at ? 'Accepted' : i.revoked_at ? 'Cancelled' : expired(i) ? 'Expired' : 'Waiting'
                const live = !i.accepted_at && !i.revoked_at
                return (
                  <div key={i.id} className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${live ? '' : 'opacity-70'}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{i.email}{i.name && <span className="font-normal text-ink-muted"> · {i.name}</span>}</div>
                      <div className="mt-0.5 text-sm text-ink-muted">
                        <span className={`chip mr-2 ${state === 'Accepted' ? 'bg-brand-50 text-brand-700' : state === 'Waiting' ? 'bg-[#FDF3D3] text-ink' : 'bg-sand text-ink-soft'}`}>{state === 'Accepted' && <Check className="h-3 w-3" />}{state}</span>
                        {i.accepted_at ? `joined ${ago(i.accepted_at)}` : i.revoked_at ? `cancelled ${ago(i.revoked_at)}` : `sent ${ago(i.sent_at)}`}
                      </div>
                    </div>
                    {live && (
                      <div className="flex shrink-0 gap-2">
                        <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => send(i.email, i.name ?? '', i.id)}>{busy === i.id ? <Spinner /> : <RotateCw className="h-3.5 w-3.5" />}{expired(i) ? 'Send new link' : 'Resend'}</button>
                        <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => cancel(i)} aria-label={`Cancel invite for ${i.email}`}><X className="h-3.5 w-3.5" />Cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
