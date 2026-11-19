// gigotter.com/g/<gig id>  →  rewritten here by vercel.json.
// Link-preview bots (LinkedIn, X, Facebook, WhatsApp) read the Open Graph tags; people are sent straight to the gig page.
import { COVER, describe, esc, liveGig, TYPE_LABEL } from './_gig.js'

export const config = { runtime: 'edge' }
const SHARE_TAGS = new Set(['wa', 'x', 'li', 'fb', 'link'])

export default async function handler(req: Request) {
  const u = new URL(req.url), origin = u.origin
  const id = u.searchParams.get('id'), s = u.searchParams.get('s')
  const tag = s && SHARE_TAGS.has(s) ? `?s=${s}` : ''
  const g = await liveGig(id)

  const title = g ? g.title : 'Gigotter: paid gigs in Ghana'
  const desc = g ? describe(g) : 'Verified students and young people doing paid gigs for real businesses in Ghana. Paid to mobile money.'
  // uploaded covers go through /g/<id>/image (our domain, no X-Robots-Tag, which X rejects)
  const cover = g ? (g.cover_url ? `/g/${g.id}/image` : COVER[g.type] || COVER.other) : '/og-default.jpg'
  const image = origin + cover
  const to = g ? `/gigs/${g.id}${tag}` : '/gigs'
  const kind = g ? (TYPE_LABEL[g.type] ?? 'Paid gig') : 'Gigotter'

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)} · Gigotter</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Gigotter">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(origin + (g ? `/g/${g.id}` : '/gigs'))}">
<meta property="og:image" content="${esc(image)}"><meta property="og:image:alt" content="${esc(`${kind}: ${title}`)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0;url=${esc(to)}">
<link rel="canonical" href="${esc(origin + to.split('?')[0])}">
</head><body style="font-family:system-ui,sans-serif;padding:40px;color:#131317">
<p><a href="${esc(to)}">Open ${esc(title)} on Gigotter</a></p></body></html>`

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
  })
}
