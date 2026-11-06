import React from 'react'
import ReactDOM from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './components/ui'
import './index.css'
import { MISCONFIGURED } from './lib/api'
import { SessionProvider } from './lib/session'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (MISCONFIGURED) {
  // A production build without Supabase settings must never fall back to the demo (which has a public admin login).
  root.render(
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center">
      <div>
        <img src="/logo-mark.png" alt="" width={56} height={56} className="mx-auto" />
        <h1 className="mt-6 text-2xl font-semibold">We’ll be right back</h1>
        <p className="mt-2 text-ink-muted">Gigotter is being updated. Please check back in a few minutes.</p>
      </div>
    </div>,
  )
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <SessionProvider>
          <ToastProvider>
            <MotionConfig reducedMotion="user">
              <App />
            </MotionConfig>
          </ToastProvider>
        </SessionProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}
