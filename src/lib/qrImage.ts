/**
 * Branded QR images drawn in the browser: softly rounded modules and finder eyes, the otter logo in the middle,
 * on a printable card with a caption. Error correction H keeps it scannable with the logo covering the centre.
 */
import QRCode from 'qrcode'

const INK = '#10291F', GREEN = '#245A44', PAPER = '#F7F6F2'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
}

/** Draws just the code (with quiet zone) into a square of `size` px at (ox, oy). */
async function drawCode(c: CanvasRenderingContext2D, url: string, ox: number, oy: number, size: number) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' })
  const n = qr.modules.size, quiet = 4, cell = size / (n + quiet * 2)
  const at = (r: number, col: number) => qr.modules.get(r, col)
  const inFinder = (r: number, col: number) => (r < 7 && col < 7) || (r < 7 && col >= n - 7) || (r >= n - 7 && col < 7)
  // keep the centre clear for the logo (about 18% of the code; error correction H recovers it)
  const hole = Math.ceil(n * 0.18) | 1, h0 = Math.floor((n - hole) / 2), h1 = h0 + hole
  c.fillStyle = '#fff'; roundRect(c, ox, oy, size, size, cell * 3); c.fill()
  c.fillStyle = INK
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) {
    if (!at(r, col) || inFinder(r, col) || (r >= h0 && r < h1 && col >= h0 && col < h1)) continue
    // softly rounded squares: still friendly-looking, but every scanner reads them reliably
    const g = cell * 0.04; roundRect(c, ox + (col + quiet) * cell + g, oy + (r + quiet) * cell + g, cell - g * 2, cell - g * 2, cell * 0.25); c.fill()
  }
  for (const [r, col] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const x = ox + (col + quiet) * cell, y = oy + (r + quiet) * cell
    // finder eyes: only lightly rounded; heavier rounding stops some phone scanners finding them
    c.fillStyle = INK; roundRect(c, x, y, cell * 7, cell * 7, cell * 0.3); c.fill()
    c.fillStyle = '#fff'; roundRect(c, x + cell, y + cell, cell * 5, cell * 5, cell * 0.21); c.fill()
    c.fillStyle = GREEN; roundRect(c, x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 0.15); c.fill()
  }
  const logo = await loadImage('/icon-512.png').catch(() => loadImage('/logo-mark.png'))
  const lw = hole * cell * 0.92, lx = ox + size / 2 - lw / 2, ly = oy + size / 2 - lw / 2
  c.drawImage(logo, lx, ly, lw, lw)
}

/** A print-ready card (1200 × 1500): code, "Scan to start earning", the short link and an optional label. */
export async function qrCardPng(url: string, label?: string): Promise<Blob> {
  await document.fonts?.ready
  const W = 1200, H = 1500, cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const c = cv.getContext('2d')!
  c.fillStyle = PAPER; c.fillRect(0, 0, W, H)
  await drawCode(c, url, 150, 120, 900)
  c.textAlign = 'center'; c.fillStyle = '#15171A'
  c.font = '600 72px "Inter Tight", Inter, system-ui, sans-serif'; c.fillText('Scan to start earning', W / 2, 1150)
  c.fillStyle = GREEN; c.font = '600 40px Inter, system-ui, sans-serif'; c.fillText(url.replace(/^https?:\/\//, ''), W / 2, 1230)
  if (label) { c.fillStyle = '#6B7077'; c.font = '400 32px Inter, system-ui, sans-serif'; c.fillText(label, W / 2, 1300) }
  c.fillStyle = '#6B7077'; c.font = '400 30px Inter, system-ui, sans-serif'; c.fillText('Verified student gigs · paid to mobile money', W / 2, label ? 1400 : 1330)
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Could not draw the QR code'))), 'image/png'))
}

/** Just the code on white (1600 px), for designers to place on their own artwork. */
export async function qrOnlyPng(url: string): Promise<Blob> {
  const S = 1600, cv = document.createElement('canvas'); cv.width = S; cv.height = S
  const c = cv.getContext('2d')!; c.fillStyle = '#fff'; c.fillRect(0, 0, S, S)
  await drawCode(c, url, 0, 0, S)
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('Could not draw the QR code'))), 'image/png'))
}

export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
