// Paso posterior a `vite build` (ver "build" en package.json):
//
//   1. Genera dist/sitemap.xml.
//   2. Pre-renderiza la página: la abre en Chromium, toma el HTML que React
//      arma dentro de #root y lo inyecta en dist/index.html. Así el HTML que
//      se sirve ya trae el contenido para Google, LinkedIn, WhatsApp y
//      cualquier bot que no ejecute JS.
//
// Nunca rompe el build: si algo del pre-render falla, avisa y deja el
// index.html como lo dejó Vite (un #root vacío, que es como funcionaba
// el sitio antes). El sitemap se genera siempre, primero.
import { readFile, writeFile } from 'node:fs/promises'
import net from 'node:net'
import { fileURLToPath, URL } from 'node:url'
import { preview } from 'vite'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST = fileURLToPath(new URL('../dist/', import.meta.url))
const INDEX = `${DIST}index.html`

// Dominio canónico: tiene que coincidir con el <link rel="canonical"> de
// index.html y con la redirección www → sin www de public/.htaccess.
const SITE_URL = 'https://eklekta.com.ar/'

// Texto que tiene que estar en el snapshot para darlo por bueno. Si React
// falló a medias o cambió el copy sin que se note, esto lo frena antes de
// publicar un HTML pobre.
const EXPECTED_TEXT = [
  'Nuestros servicios',
  'Contanos qué te está costando',
  'estudio de automatización, CRM y desarrollo web en Argentina',
]

const log = (message) => console.log(`[postbuild] ${message}`)
const warn = (message) => console.warn(`[postbuild] ⚠ ${message}`)

// ---------------------------------------------------------------- sitemap

/** Fecha del build en YYYY-MM-DD, en hora de Argentina (no UTC, que de noche corre un día). */
function buildDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

async function writeSitemap() {
  // El sitio es una sola página: las anclas (#servicios, …) no son URLs
  // distintas para Google, así que no van.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${buildDate()}</lastmod>
  </url>
</urlset>
`
  await writeFile(`${DIST}sitemap.xml`, xml, 'utf8')
  log(`sitemap.xml generado (lastmod ${buildDate()})`)
}

// ------------------------------------------------------------- pre-render

/** Un puerto libre, para no chocar con el `npm run dev` / `preview` que haya abierto. */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

/** Importa Playwright y abre Chromium; si falta alguno de los dos, devuelve null con un aviso claro. */
async function launchChromium() {
  let chromium
  try {
    ;({ chromium } = await import('playwright'))
  } catch {
    warn('Playwright no está instalado: corré `npm install`.')
    return null
  }
  try {
    return await chromium.launch()
  } catch (error) {
    if (/executable doesn't exist|browserType\.launch/i.test(String(error?.message))) {
      warn('Falta el Chromium de Playwright: corré `npx playwright install chromium`.')
    } else {
      warn(`No se pudo abrir Chromium: ${error?.message ?? error}`)
    }
    return null
  }
}

/** Corre en el navegador: deja #root listo para servirse como HTML estático y devuelve su contenido. */
function snapshotRoot() {
  const root = document.getElementById('root')

  // Las imágenes del snapshot no tienen que competir con el preload del
  // hero (index.html), así que todas pasan a lazy y pierden fetchpriority.
  for (const img of root.querySelectorAll('img')) {
    img.setAttribute('loading', 'lazy')
    img.setAttribute('decoding', 'async')
    img.removeAttribute('fetchpriority')
  }

  // <Reveal> arranca cada bloque en "hidden" (opacity 0) y un
  // IntersectionObserver lo pasa a "shown" al llegar al viewport. En el
  // snapshot quedaron "hidden" todos los que estaban fuera de pantalla; en
  // un navegador sin JS nada los mostraría nunca. Se publican como "shown".
  for (const el of root.querySelectorAll('[data-reveal="hidden"]')) {
    el.setAttribute('data-reveal', 'shown')
  }

  return {
    html: root.innerHTML,
    text: (root.textContent ?? '').replace(/\s+/g, ' '),
  }
}

async function prerender() {
  const browser = await launchChromium()
  if (!browser) return false

  // Preview de Vite sobre dist/ — sin cargar vite.config.ts: solo sirve
  // archivos estáticos, no hace falta compilar nada otra vez.
  const port = await freePort()
  const server = await preview({
    root: ROOT,
    configFile: false,
    logLevel: 'error',
    preview: { host: '127.0.0.1', port, strictPort: true, open: false },
  })

  try {
    // Un contexto nuevo arranca con localStorage vacío: tema claro por
    // defecto (ver el script inline de index.html). `reduce` deja los
    // bloques sin estados intermedios de animación.
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      colorScheme: 'light',
      reducedMotion: 'reduce',
      locale: 'es-AR',
    })
    const page = await context.newPage()

    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' })
    await page.waitForSelector('#root h1', { state: 'attached' })
    await page.evaluate(() => document.fonts.ready)

    if (errors.length > 0) {
      warn(`La página lanzó errores al renderizar, no se pre-renderiza:\n  ${errors.join('\n  ')}`)
      return false
    }

    const { html, text } = await page.evaluate(snapshotRoot)

    const missing = EXPECTED_TEXT.filter((expected) => !text.includes(expected))
    if (missing.length > 0) {
      warn(`Al snapshot le falta contenido clave (${missing.map((m) => `«${m}»`).join(', ')}): no se inyecta.`)
      return false
    }

    const source = await readFile(INDEX, 'utf8')
    const empty = '<div id="root"></div>'
    if (!source.includes(empty)) {
      warn('dist/index.html no trae un <div id="root"></div> vacío (¿ya estaba pre-renderizado?): no se inyecta.')
      return false
    }

    // Reemplazo con función: el HTML puede traer `$&`, `$1`… que
    // String.replace interpretaría como patrones.
    const injected = source.replace(empty, () => `<div id="root" data-prerendered>${html}</div>`)
    await writeFile(INDEX, injected, 'utf8')

    const kb = (Buffer.byteLength(injected) / 1024).toFixed(0)
    log(`HTML pre-renderizado en dist/index.html (${kb} kB)`)
    return true
  } finally {
    await browser.close()
    await server.close()
  }
}

// ------------------------------------------------------------------- main

await writeSitemap()

try {
  const done = await prerender()
  if (!done) warn('Build sin pre-render: el HTML se sirve con #root vacío.')
} catch (error) {
  warn(`Falló el pre-render (${error?.message ?? error}). Build sin pre-render.`)
}
