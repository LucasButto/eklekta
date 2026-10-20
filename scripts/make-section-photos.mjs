// Genera las fotos del Manifiesto y del carrusel de About: WebP + JPG de
// respaldo en varios anchos, a partir de los originales en brand-assets/.
//
//   brand-assets/manifesto-src/ultimo-bloque-N.png → public/images/manifesto/ultimo-bloque-N-{480,800,1024}.{webp,jpg}
//   brand-assets/about-src/<paso>.png               → public/images/about/<paso>-{800,1200,1480}.{webp,jpg}
//   brand-assets/about-notebook-src/<paso>.png      → public/images/about/<paso>-notebook-{640,960,1254}.{webp,jpg}
//
// El carrusel de About usa la versión cuadrada (notebook) entre $bp-lg y
// $bp-3xl, y la original apaisada en celular y de 1080p para arriba (ver
// About.tsx).
//
// Mismo esquema que las portadas de proyectos y el equipo: el código guarda
// solo el prefijo (`/images/about/diagnostico`) y arma el srcset. Los
// originales quedan fuera de public/ para que no viajen al deploy. No se
// recorta nada: cada salida conserva la proporción de su original, y
// ningún ancho supera al del original más chico del grupo (no se agranda).
//
// Se corre a mano cuando cambia una foto (el resultado se commitea). Usa
// `sharp`, que no está en package.json: `npm install --no-save sharp`.
//
//   node scripts/make-section-photos.mjs
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

let sharp
try {
  ;({ default: sharp } = await import('sharp'))
} catch {
  console.error('Falta `sharp`: corré `npm install --no-save sharp` y repetí.')
  process.exit(1)
}

const WEBP = { quality: 80, effort: 6 }
const JPG = { quality: 82, mozjpeg: true }

const GROUPS = [
  // Las fotos se ven hasta ~29 rem de ancho en escritorio.
  { src: 'manifesto-src', out: 'manifesto', widths: [480, 800, 1024] },
  // El escenario del carrusel sangra hasta el borde en pantallas anchas.
  { src: 'about-src', out: 'about', widths: [800, 1200, 1480] },
  // La versión cuadrada para notebooks: el original mide 1254 px.
  { src: 'about-notebook-src', out: 'about', suffix: '-notebook', widths: [640, 960, 1254] },
]

const kb = async (file) => `${((await stat(file)).size / 1024).toFixed(0)} kB`

for (const group of GROUPS) {
  const SRC = fileURLToPath(new URL(`../brand-assets/${group.src}/`, import.meta.url))
  const OUT = fileURLToPath(new URL(`../public/images/${group.out}/`, import.meta.url))
  await mkdir(OUT, { recursive: true })

  const sources = (await readdir(SRC)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort()
  if (sources.length === 0) {
    console.error(`No hay originales en ${SRC}`)
    process.exit(1)
  }

  for (const file of sources) {
    const stem = path.parse(file).name + (group.suffix ?? '')
    const input = path.join(SRC, file)
    const meta = await sharp(input).metadata()
    console.log(`${group.out}/${file}  ${meta.width}×${meta.height}  ${await kb(input)}`)

    for (const width of group.widths) {
      const base = sharp(input).rotate().resize({ width, withoutEnlargement: true })
      const webp = path.join(OUT, `${stem}-${width}.webp`)
      const jpg = path.join(OUT, `${stem}-${width}.jpg`)
      await base.clone().webp(WEBP).toFile(webp)
      await base.clone().jpeg(JPG).toFile(jpg)
      console.log(`  ${width}  webp ${await kb(webp)}  jpg ${await kb(jpg)}`)
    }
  }
}
