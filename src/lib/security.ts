/** Small, dependency-free security helpers used across the app. */

/** Only allow redirects to paths on this site (blocks `//evil.com`, `/\evil.com`, `https://…`, `javascript:`). */
export function safeNext(next: string | null | undefined, fallback = '/me'): string {
  if (!next) return fallback
  let n = next
  try { n = decodeURIComponent(next) } catch { return fallback }
  if (!n.startsWith('/') || n.startsWith('//') || n.startsWith('/\\') || /[\u0000-\u001f\\]/.test(n) || /^\/+[a-z][a-z0-9+.-]*:/i.test(n)) return fallback
  return n
}

// ─────────── cooldowns (survive page refresh; server still enforces its own limits) ───────────
const CD_PREFIX = 'gigotter-cooldown:'
export function cooldownLeft(key: string): number {
  try {
    const until = Number(localStorage.getItem(CD_PREFIX + key) || 0)
    return Math.max(0, Math.ceil((until - Date.now()) / 1000))
  } catch { return 0 }
}
export function startCooldown(key: string, seconds: number) {
  try { localStorage.setItem(CD_PREFIX + key, String(Date.now() + seconds * 1000)) } catch { /* storage blocked */ }
}

/** Exponential back-off after failed log-in attempts, per email, in this browser. */
export function loginBackoff(email: string, failed: boolean): number {
  const key = 'login:' + email.trim().toLowerCase()
  try {
    const raw = JSON.parse(localStorage.getItem(CD_PREFIX + key) || '{"n":0}') as { n: number }
    if (!failed) { localStorage.removeItem(CD_PREFIX + key); return 0 }
    const n = raw.n + 1
    const wait = n < 3 ? 0 : Math.min(300, 5 * 2 ** (n - 3)) // 0,0,5,10,20,40… capped at 5 min
    localStorage.setItem(CD_PREFIX + key, JSON.stringify({ n }))
    if (wait) startCooldown('login-wait:' + email.trim().toLowerCase(), wait)
    return wait
  } catch { return 0 }
}

// ─────────── uploads ───────────
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const MAX_UPLOAD_MB = 5
/** Photos straight from a phone can be bigger than this before we shrink them. */
export const MAX_RAW_MB = 30
/** Returns an error message, or null if the file is an acceptable photo. */
export function checkImage(file: File, maxMb = MAX_UPLOAD_MB): string | null {
  const type = (file.type || '').toLowerCase()
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const okType = IMAGE_TYPES.includes(type) || (!type && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext))
  if (!okType) return 'Please upload a photo (JPG, PNG, WEBP or HEIC).'
  if (file.size > maxMb * 1024 * 1024) return `That photo is too large — keep it under ${maxMb} MB.`
  if (file.size < 1024) return 'That file looks empty — try another photo.'
  return null
}
export const safeExt = (file: File) => {
  const t = (file.type || '').toLowerCase()
  return t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : t.startsWith('image/hei') ? 'heic' : 'jpg'
}

/** Neutralise spreadsheet formulas (CSV injection) and quote the cell. */
export function csvCell(v: unknown): string {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s.replace(/"/g, '""')}"`
}

/** Friendlier wording for auth/rate-limit errors coming back from Supabase. */
export function friendlyError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many') || m.includes('only request this after') || m.includes('security purposes'))
    return 'Too many attempts — please wait a minute and try again.'
  if (m.includes('invalid login credentials')) return 'Wrong email or password.'
  if (m.includes('email not confirmed')) return 'Confirm your email first — check your inbox for the link.'
  if (m.includes('captcha')) return 'Please complete the “I’m human” check and try again.'
  if (m.includes('password should be') || m.includes('weak password')) return 'Choose a stronger password — at least 8 characters with letters and numbers.'
  return msg
}

/** Basic password strength: 8+ chars, letters and numbers. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (!/[a-z]/i.test(pw) || !/\d/.test(pw)) return 'Use both letters and numbers.'
  if (pw.length > 72) return 'Keep it under 72 characters.'
  return null
}

/**
 * Turn any phone photo into a standard JPEG (max 1600px, ~200–500 KB) so it previews everywhere,
 * uploads quickly on mobile data and fits the storage limits. Fixes rotation from EXIF too.
 */
export async function normalizePhoto(file: File, max = 1600): Promise<File> {
  const type = (file.type || '').toLowerCase()
  if (file.size > MAX_RAW_MB * 1024 * 1024) throw new Error(`That photo is too large — keep it under ${MAX_RAW_MB} MB.`)
  if (type && !type.startsWith('image/')) throw new Error('Please choose a photo (JPG, PNG or HEIC).')
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions) }
  catch {
    const heic = type.includes('hei') || /\.(heic|heif)$/i.test(file.name)
    throw new Error(heic
      ? 'This phone saved the photo as HEIC, which this browser can’t open. Use “Open camera”, or on iPhone set Settings → Camera → Formats → Most Compatible.'
      : 'We couldn’t read that photo — try taking a new one.')
  }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height) // flatten transparent PNGs
  ctx.drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.()
  const blob: Blob | null = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85))
  if (!blob || blob.size < 1024) throw new Error('That photo came out empty — please try again.')
  return new File([blob], (file.name.replace(/\.[^.]+$/, '') || 'photo') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() })
}
