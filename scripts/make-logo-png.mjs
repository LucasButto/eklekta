// Rasteriza el isotipo a public/images/logo-512.png (512×512, fondo blanco).
//
// Google pide un logo cuadrado y en PNG/JPG para el Knowledge Panel; el
// SVG no le sirve. Se corre a mano cuando cambia el isotipo — no forma
// parte del build, el PNG resultante se commitea.
//
//   node scripts/make-logo-png.mjs
import { readFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import { chromium } from 'playwright'

const SIZE = 512
// El isotipo ocupa ~60 % del lienzo: el resto es aire, para que Google
// no lo recorte contra el borde al mostrarlo en círculo o cuadrado.
const MARK_WIDTH = Math.round(SIZE * 0.6)
// Mismo violeta de marca que usa el favicon.
const BRAND = '#6D64F1'

const svgUrl = new URL('../src/assets/brand/isotype.svg', import.meta.url)
const outUrl = new URL('../public/images/logo-512.png', import.meta.url)

const svg = (await readFile(svgUrl, 'utf8')).replace(
  '<svg ',
  `<svg style="width:${MARK_WIDTH}px;height:auto;color:${BRAND}" `,
)

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } })
  await page.setContent(
    `<!doctype html><body style="margin:0;width:${SIZE}px;height:${SIZE}px;background:#fff;display:grid;place-items:center">${svg}</body>`,
  )
  await page.screenshot({
    path: fileURLToPath(outUrl),
    clip: { x: 0, y: 0, width: SIZE, height: SIZE },
  })
} finally {
  await browser.close()
}

console.log(`✔ ${fileURLToPath(outUrl)}`)
