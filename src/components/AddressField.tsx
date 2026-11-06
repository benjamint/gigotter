import { Check, Loader2, LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'

export const mapsUrl = (gps?: string, address?: string) =>
  gps ? `https://www.google.com/maps?q=${encodeURIComponent(gps)}`
      : address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null

/** Address box + "Use my current location" (stores a GPS pin alongside the written address). */
export default function AddressField({ value, gps, accuracy, placeholder, required, onChange, onGps }: {
  value: string; gps?: string; accuracy?: string; placeholder: string; required?: boolean
  onChange: (v: string) => void; onGps: (gps: string | undefined, accuracy: string | undefined) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const locate = () => {
    if (!('geolocation' in navigator)) return setErr('Your browser can’t share location — type the address and a landmark instead.')
    setBusy(true); setErr(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setBusy(false)
        onGps(`${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`, String(Math.round(p.coords.accuracy)))
      },
      (e) => {
        setBusy(false)
        setErr(e.code === e.PERMISSION_DENIED ? 'Location is blocked — allow it in your browser settings, or type the address and a landmark.' : 'Couldn’t get your location — try again outside, or type the address and a landmark.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  return (
    <div>
      <textarea className="input min-h-[84px] resize-y" required={required} maxLength={300} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {gps ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
            <Check className="h-3.5 w-3.5" />Location pinned{accuracy ? ` (±${accuracy} m)` : ''}
            <a href={mapsUrl(gps)!} target="_blank" rel="noreferrer" className="underline underline-offset-2">Check on map</a>
            <button type="button" onClick={() => onGps(undefined, undefined)} className="text-ink-muted hover:text-ink" aria-label="Remove location">✕</button>
          </span>
        ) : (
          <button type="button" onClick={locate} disabled={busy} className="btn-ghost btn-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}Use my current location
          </button>
        )}
        {gps && accuracy && Number(accuracy) > 100 && <span className="text-xs text-amber-700">Not very precise — step outside and try again for a better pin.</span>}
      </div>
      {err && <p className="mt-2 flex gap-1.5 text-xs text-red-600"><MapPin className="h-3.5 w-3.5 shrink-0" />{err}</p>}
    </div>
  )
}
