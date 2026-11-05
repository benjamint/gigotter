import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, Waves, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DEMO, auth, resetDemo } from '../lib/api'
import { useSession } from '../lib/session'

export function Logo({ className = '', light = false }: { className?: string; light?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="Gigotter home">
      <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${light ? 'bg-white text-brand-900' : 'bg-brand-700 text-white'}`}>
        <Waves className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </span>
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
  const links = [
    { to: '/gigs', label: 'Find work' },
    { to: '/brief', label: 'For businesses' },
    ...(user ? [{ to: '/me', label: 'Dashboard' }] : []),
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
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
                <Link to="/me" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm hover:bg-sand">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials}</span>
                  <span className="max-w-[9rem] truncate font-medium">{profile?.full_name?.split(' ')[0] || 'Account'}</span>
                </Link>
                <button onClick={out} className="grid h-9 w-9 place-items-center rounded-full text-ink-muted hover:bg-sand hover:text-ink" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
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
                {links.map((l) => <NavLink key={l.to} to={l.to} className="border-b border-line py-4 text-lg font-medium last:border-0">{l.label}</NavLink>)}
                {user
                  ? <button onClick={out} className="btn-ghost mt-4">Log out</button>
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
          <span>ID documents are stored privately and used only for verification.</span>
        </div>
      </footer>
    </div>
  )
}
