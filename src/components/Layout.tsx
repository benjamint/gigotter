import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DEMO, auth, resetDemo } from '../lib/api'
import { useSession } from '../lib/session'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`group flex items-center gap-2 font-display text-xl font-extrabold ${className}`}>
      <motion.span whileHover={{ rotate: 90, scale: 1.1 }} className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#FF5C39,#FF3CAC,#7B5CFF)] text-white">
        <ArrowUpRight className="h-5 w-5" strokeWidth={3} />
      </motion.span>
      <span>We<span className="text-gradient">Move</span></span>
    </Link>
  )
}

export default function Layout() {
  const { user, profile } = useSession()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [loc.pathname])
  const links = [
    { to: '/gigs', label: 'Gigs' },
    ...(user ? [{ to: '/me', label: 'My hustle' }] : []),
    { to: '/brief', label: 'Hire students' },
    ...(profile?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]
  const out = async () => { await auth.signOut(); nav('/') }

  return (
    <div className="flex min-h-screen flex-col">
      {DEMO && (
        <div className="bg-ink px-4 py-1.5 text-center text-xs text-white/80">
          Demo mode — data lives in this browser only. Admin login: <b className="text-lime-300">admin@wemove.app / wemoveadmin</b>
          <button onClick={resetDemo} className="ml-2 underline hover:text-white">reset</button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-ink/5 bg-cream/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `relative rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'text-ink' : 'text-ink/60 hover:text-ink'}`}>
                {({ isActive }) => (<>
                  {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-ink/5" />}
                  <span className="relative">{l.label}</span>
                </>)}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                {profile?.kyc_status === 'verified' && <ShieldCheck className="h-5 w-5 text-emerald-600" aria-label="Verified" />}
                <span className="max-w-[10rem] truncate text-sm font-semibold">{profile?.full_name?.split(' ')[0] || 'You'}</span>
                <button onClick={out} className="btn-ghost btn-sm" aria-label="Log out"><LogOut className="h-4 w-4" /></button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-3 text-sm font-semibold text-ink/70 hover:text-ink">Log in</Link>
                <Link to="/signup" className="btn-primary btn-sm">Start earning</Link>
              </>
            )}
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-ink/5 md:hidden">
              <div className="flex flex-col gap-1 px-4 py-4">
                {links.map((l, i) => (
                  <motion.div key={l.to} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <NavLink to={l.to} className="block rounded-2xl px-4 py-3 font-display text-2xl font-bold">{l.label}</NavLink>
                  </motion.div>
                ))}
                {user
                  ? <button onClick={out} className="btn-ghost mt-2">Log out</button>
                  : <div className="mt-2 grid grid-cols-2 gap-2"><Link to="/login" className="btn-ghost">Log in</Link><Link to="/signup" className="btn-primary">Start earning</Link></div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="mt-24 border-t-2 border-ink bg-ink text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
          <div>
            <div className="font-display text-2xl font-extrabold">We<span className="text-gradient">Move</span></div>
            <p className="mt-2 max-w-xs text-sm text-white/60">Verified students on the ground for businesses across Africa. Real gigs, paid to your MoMo.</p>
          </div>
          <div className="text-sm text-white/70">
            <div className="mb-2 font-semibold text-white">Students</div>
            <Link to="/gigs" className="block py-1 hover:text-white">Browse gigs</Link>
            <Link to="/signup" className="block py-1 hover:text-white">Get verified</Link>
            <Link to="/me" className="block py-1 hover:text-white">My earnings</Link>
          </div>
          <div className="text-sm text-white/70">
            <div className="mb-2 font-semibold text-white">Businesses</div>
            <Link to="/brief" className="block py-1 hover:text-white">Post a brief</Link>
            <p className="pt-3 text-xs text-white/40">Your ID & selfie are stored privately and only seen by the WeMove team for verification.</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">© {new Date().getFullYear()} WeMove. Made in Accra for students who move.</div>
      </footer>
    </div>
  )
}
