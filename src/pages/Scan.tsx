import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { logScan } from '../lib/api'

/** gigotter.com/s/<code>: count the QR scan, then continue to the page chosen for that code. */
export default function Scan() {
  const { code = '' } = useParams()
  const nav = useNavigate()
  useEffect(() => {
    let done = false
    // never leave someone waiting: go home after 2.5s even if the network is slow
    const t = setTimeout(() => { if (!done) { done = true; nav('/', { replace: true }) } }, 2500)
    logScan(code).then((to) => { if (!done) { done = true; clearTimeout(t); nav(to, { replace: true }) } })
    return () => clearTimeout(t)
  }, [code, nav])
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <img src="/logo-mark.png" alt="Gigotter" width={64} height={64} className="animate-pulse" />
    </div>
  )
}
