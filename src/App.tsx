import { AnimatePresence, motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Admin from './pages/admin/Admin'
import AuthPage from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import Brief from './pages/Brief'
import GigDetail from './pages/GigDetail'
import Gigs from './pages/Gigs'
import Landing from './pages/Landing'
import Me from './pages/Me'
import MyGig from './pages/MyGig'
import Verify from './pages/Verify'
import { Privacy, Terms } from './pages/Legal'
import { Empty } from './components/ui'
import { Link } from 'react-router-dom'

const Page = ({ children }: { children: React.ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>{children}</motion.div>
)

export default function App() {
  const loc = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={loc} key={loc.pathname}>
        <Route element={<Layout />}>
          <Route index element={<Page><Landing /></Page>} />
          <Route path="gigs" element={<Page><Gigs /></Page>} />
          <Route path="gigs/:id" element={<Page><GigDetail /></Page>} />
          <Route path="signup" element={<Page><AuthPage mode="signup" /></Page>} />
          <Route path="login" element={<Page><AuthPage mode="login" /></Page>} />
          <Route path="reset-password" element={<Page><ResetPassword /></Page>} />
          <Route path="verify" element={<Page><Verify /></Page>} />
          <Route path="me" element={<Page><Me /></Page>} />
          <Route path="me/gig/:claimId" element={<Page><MyGig /></Page>} />
          <Route path="brief" element={<Page><Brief /></Page>} />
          <Route path="admin" element={<Page><Admin /></Page>} />
          <Route path="privacy" element={<Page><Privacy /></Page>} />
          <Route path="terms" element={<Page><Terms /></Page>} />
          <Route path="*" element={<div className="mx-auto max-w-lg px-4 py-24"><Empty title="Page not found" body="The page you’re looking for doesn’t exist or has moved." action={<Link to="/" className="btn-primary">Go home</Link>} /></div>} />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}
