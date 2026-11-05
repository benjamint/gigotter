import { ImageIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Image with a graceful, on-brand fallback when the file isn't there yet. */
export default function Photo({ src, alt, className = '', tone = 'sand', label }: {
  src?: string | null; alt: string; className?: string; tone?: 'sand' | 'brand' | 'dark'; label?: string
}) {
  const [ok, setOk] = useState<boolean | null>(src ? null : false)
  useEffect(() => { setOk(src ? null : false) }, [src])
  const bg = tone === 'brand' ? 'bg-brand-100' : tone === 'dark' ? 'bg-brand-900' : 'bg-sand'
  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} overflow-hidden ${bg} ${className}`}>
      {src && ok !== false && (
        <img src={src} alt={alt} loading="lazy" onLoad={() => setOk(true)} onError={() => setOk(false)}
          className={`h-full w-full object-cover transition-opacity duration-700 ${ok ? 'opacity-100' : 'opacity-0'}`} />
      )}
      {ok === false && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${tone === 'dark' ? 'text-white/40' : 'text-ink/25'}`}>
          <svg className="absolute inset-0 h-full w-full opacity-[.35]" aria-hidden>
            <defs><pattern id="ph" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="currentColor" strokeWidth=".6" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#ph)" />
          </svg>
          <ImageIcon className="relative h-7 w-7" strokeWidth={1.25} />
          {label && <span className="relative px-4 text-center text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>}
        </div>
      )}
    </div>
  )
}
