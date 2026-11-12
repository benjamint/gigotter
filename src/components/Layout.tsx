import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ScrollProgress } from './motion'
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
  const [hidden, setHidden] = useState(false)
  const { scrollY } = useScroll()
  // hide the header while reading down the page, bring it back as soon as you scroll up
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setScrolled(y > 8)
    if (y < 160 || y < prev - 4) setHidden(false)
    else if (y > prev + 6) setHidden(true)
  })
  useEffect(() => setScrolled(window.scrollY > 8), [])
  const hide = hidden && !open
  // the main website menu is the same for everyone; account pages live in the avatar menu
  const links = [
    { to: '/gigs', label: 'Find work' },
    { to: '/business', label: 'For businesses' },
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
      <ScrollProgress />
      {/* floating frosted pill header; hides while reading down, returns on scroll up */}
      <header className={`sticky top-0 z-40 pt-3 transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${hide ? '-translate-y-[120%]' : 'translate-y-0'}`}>
        <div className="container-x">
        <div className={`flex h-16 items-center justify-between rounded-full border pl-4 pr-2.5 backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow,border-color] duration-500 ${scrolled || open ? 'border-line bg-white/85 shadow-[0_10px_30px_-20px_rgba(16,41,31,.35)]' : 'border-ink/[.07] bg-white/70'}`}>
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `relative isolate rounded-full px-4 py-2 text-sm transition ${isActive ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}>
                {({ isActive }) => (<>{isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-brand-50" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}{l.label}</>)}
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
                <Link to="/login" className="btn-ghost btn-sm">Log in</Link>
                <Link to="/signup" className="btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>
          <button className="grid h-11 w-11 place-items-center rounded-full border border-ink/10 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="container-x overflow-hidden md:hidden">
              <div className="mt-2 flex flex-col rounded-3xl border border-line bg-white px-5 py-3 shadow-[0_20px_40px_-28px_rgba(16,41,31,.4)]">
                {links.map((l, i) => (
                  <motion.div key={l.to} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
                    <NavLink to={l.to} className="block border-b border-line py-4 text-lg font-medium">{l.label}</NavLink>
                  </motion.div>
                ))}
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
      <footer className="mt-28 border-t border-line bg-white">
        <div className="container-x grid gap-10 py-16 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">Verified students doing real work for real businesses in Ghana. Paid to mobile money.</p>
          </div>
          <div className="text-sm">
            <div className="mb-4 text-ink-muted">Students</div>
            <div className="space-y-3">
              <Link to="/gigs" className="link-u block w-fit">Find work</Link>
              <Link to="/signup" className="link-u block w-fit">Get verified</Link>
              <Link to="/me" className="link-u block w-fit">Dashboard</Link>
            </div>
          </div>
          <div className="text-sm">
            <div className="mb-4 text-ink-muted">Businesses</div>
            <div className="space-y-3">
              <Link to="/business" className="link-u block w-fit">What we do</Link>
              <Link to="/business#pricing" className="link-u block w-fit">Pricing</Link>
              <Link to="/brief" className="link-u block w-fit">Post a brief</Link>
            </div>
          </div>
        </div>
        <div className="container-x flex flex-col gap-2 border-t border-line py-6 text-xs text-ink-muted sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Gigotter. Accra, Ghana.</span>
          <span className="flex gap-5"><Link to="/privacy" className="link-u hover:text-ink">Privacy</Link><Link to="/terms" className="link-u hover:text-ink">Terms</Link><span className="hidden sm:inline">ID documents are stored privately and used only for verification.</span></span>
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
