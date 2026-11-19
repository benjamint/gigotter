// gigotter.com/g/<gig id>/image  →  rewritten here by vercel.json.
// Serves a live gig's cover photo from our own domain. Supabase Storage sends every file with
// "X-Robots-Tag: none", and X (Twitter) refuses to show preview images carrying that header.
import { COVER, liveGig } from './_gig.js'

export const config = { runtime: 'edge' }
const MAX = 5 * 1024 * 1024 // X's limit for card images

export default async function handler(req: Request) {
  const u = new URL(req.url)
  const g = await liveGig(u.searchParams.get('id'))
  const fallback = g ? (COVER[g.type] || COVER.other) : '/og-default.jpg'
  const base = process.env.VITE_SUPABASE_URL
  const src = g?.cover_url
  // only proxy our own public storage bucket, never an arbitrary URL
  if (base && src && src.startsWith(`${base}/storage/v1/object/public/`)) {
    try {
      const r = await fetch(src)
      const type = r.headers.get('content-type') || ''
      const len = Number(r.headers.get('content-length') || 0)
      if (r.ok && r.body && /^image\/(jpeg|png|webp|gif)$/.test(type) && len <= MAX) {
        return new Response(r.body, {
          status: 200,
          headers: {
            'content-type': type,
            ...(len ? { 'content-length': String(len) } : {}),
            'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
          },
        })
      }
    } catch { /* fall through to the default photo */ }
  }
  return Response.redirect(new URL(fallback, u.origin), 302)
}
