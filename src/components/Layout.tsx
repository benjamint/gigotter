import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, ChevronDown, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DEMO, auth, resetDemo } from '../lib/api'
import { useSession } from '../lib/session'

export function Logo({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="Gigotter home">
      <img src="/logo-mark.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 transition-transform duration-300 hover:-rotate-6" />
      <span className={`font-display text-[19px] font-semibold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>Gigotter</span>
    </Link>
  )
}

export default function Layout() {
  const { user, profile } = useSession()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f) }, [])
  // the main website menu is the same for everyone; account pages live in the avatar menu
  const links = [
    { to: '/gigs', label: 'Find work' },
    { to: '/brief', label: 'For businesses' },
  ]
  const isAdmin = profile?.role === 'admin'
  const account = [
    { to: '/me', label: 'Dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : [{ to: '/verify', label: 'Verification', icon: BadgeCheck }]),
  ]
  const out = async () => { await auth.signOut(); nav('/') }
  const initials = (profile?.full_name || profile?.email || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="flex min-h-screen flex-col">
      {DEMO && (
        <div className="bg-brand-900 px-4 py-2 text-center text-xs text-white/70">
          Preview mode · data stays in this browser · admin: <span className="font-medium text-white">admin@gigotter.com / gigotteradmin</span>
          <button onClick={resetDemo} className="ml-2 underline underline-offset-2 hover:text-white">Reset</button>
        </div>
      )}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'border-b border-line bg-paper/85 backdrop-blur-xl' : 'border-b border-transparent bg-paper'}`}>
        <div className="container-x flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `relative py-1 text-sm transition ${isActive ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}>
                {({ isActive }) => (<>{l.label}{isActive && <motion.span layoutId="nav-line" className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-ink" />}</>)}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link to={isAdmin ? '/admin' : '/me'} className="btn-primary btn-sm">{isAdmin ? 'Admin' : 'Dashboard'}</Link>
                <AccountMenu initials={initials} name={profile?.full_name || profile?.email || 'Account'} email={profile?.email ?? ''} items={account} onLogout={out} />
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-ink-soft hover:text-ink">Log in</Link>
                <Link to="/signup" className="btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-line bg-paper md:hidden">
              <div className="container-x flex flex-col py-4">
                {links.map((l) => <NavLink key={l.to} to={l.to} className="border-b border-line py-4 text-lg font-medium">{l.label}</NavLink>)}
                {user && <div className="pt-4 text-xs font-medium uppercase tracking-wider text-ink-muted">Your account</div>}
                {user && account.map((l) => <NavLink key={l.to} to={l.to} className="flex items-center gap-3 border-b border-line py-4 text-lg font-medium"><l.icon className="h-5 w-5 text-ink-muted" />{l.label}</NavLink>)}
                {user
                  ? <button onClick={out} className="btn-ghost mt-4" aria-label="Log out">Log out</button>
                  : <div className="mt-4 grid grid-cols-2 gap-2"><Link to="/login" className="btn-ghost">Log in</Link><Link to="/signup" className="btn-primary">Get started</Link></div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="mt-28 bg-brand-900 text-white">
        <div className="container-x grid gap-10 py-16 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">Verified students doing real work for businesses across Africa. Paid to mobile money.</p>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-medium">Students</div>
            <div className="space-y-2.5 text-white/60">
              <Link to="/gigs" className="block hover:text-white">Find work</Link>
              <Link to="/signup" className="block hover:text-white">Get verified</Link>
              <Link to="/me" className="block hover:text-white">Dashboard</Link>
            </div>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-medium">Businesses</div>
            <div className="space-y-2.5 text-white/60">
              <Link to="/brief" className="block hover:text-white">Post a brief</Link>
              <Link to="/brief" className="block hover:text-white">How we verify</Link>
            </div>
          </div>
        </div>
        <div className="container-x flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Gigotter. Accra, Ghana.</span>
          <span className="flex gap-5"><Link to="/privacy" className="hover:text-white">Privacy</Link><Link to="/terms" className="hover:text-white">Terms</Link><span className="hidden sm:inline">ID documents are stored privately and used only for verification.</span></span>
        </div>
      </footer>
    </div>
  )
}

function AccountMenu({ initials, name, email, items, onLogout }: {
  initials: string; name: string; email: string; items: { to: string; label: string; icon: ComponentType<{ className?: string }> }[]; onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" className="flex items-center gap-1.5 rounded-full p-1 pr-2 outline-none hover:bg-sand focus-visible:ring-2 focus-visible:ring-brand-500">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials}</span>
        <ChevronDown className={`h-4 w-4 text-ink-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-64 origin-top-right overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-lift">
            <div className="px-3 py-2.5"><div className="truncate text-sm font-medium">{name}</div><div className="truncate text-xs text-ink-muted">{email}</div></div>
            <div className="my-1 h-px bg-line" />
            {items.map((it) => (
              <Link key={it.to} to={it.to} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-paper"><it.icon className="h-4 w-4 text-ink-muted" />{it.label}</Link>
            ))}
            <div className="my-1 h-px bg-line" />
            <button role="menuitem" onClick={onLogout} aria-label="Log out" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink-soft hover:bg-paper hover:text-ink"><LogOut className="h-4 w-4" />Log out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
