// Genera las fotos del equipo para la web: WebP + JPG de respaldo en varios
// anchos, a partir de los originales de brand-assets/team-src/.
//
//   brand-assets/team-src/member-1.jpg  →  public/images/team/member-1-{400,640,880}.{webp,jpg}
//
// Mismo esquema que las portadas de proyectos (ver coverSet.ts): `team.json`
// guarda solo el prefijo (`/images/team/member-1`) y Team.tsx arma el srcset.
// Los originales quedan fuera de public/ para que no viajen al deploy.
//
// Se corre a mano cuando cambia una foto (el resultado se commitea). Usa
// `sharp`, que no está en package.json: `npm install --no-save sharp`.
//
//   node scripts/make-team-photos.mjs
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

// Las tarjetas se ven entre ~165 px (celular, 2 por fila) y ~320 px (5 por
// fila en pantallas grandes). 400/640/880 cubren de 1× a 2,75× sin pasar
// del tamaño de los originales (el más chico mide 896 px de ancho), así
// que ninguna foto se agranda.
const WIDTHS = [400, 640, 880]
// El marco de la tarjeta es 3:4 (aspect-ratio en Team.scss). Todas las
// salidas salen exactamente 3:4 aunque los originales difieran en un par
// de píxeles, así los atributos width/height del <img> son siempre ciertos.
const RATIO = 4 / 3
const WEBP = { quality: 80, effort: 6 }
const JPG = { quality: 82, mozjpeg: true }

const SRC = fileURLToPath(new URL('../brand-assets/team-src/', import.meta.url))
const OUT = fileURLToPath(new URL('../public/images/team/', import.meta.url))
await mkdir(OUT, { recursive: true })

const kb = async (file) => `${((await stat(file)).size / 1024).toFixed(0)} kB`
const sources = (await readdir(SRC)).filter((f) => /^member-\d+\.(jpe?g|png|webp)$/i.test(f)).sort()
if (sources.length === 0) {
  console.error(`No hay originales member-N en ${SRC}`)
  process.exit(1)
}

for (const file of sources) {
  const stem = path.parse(file).name
  const input = path.join(SRC, file)
  const meta = await sharp(input).metadata()
  console.log(`${file}  ${meta.width}×${meta.height}  ${await kb(input)}`)

  for (const width of WIDTHS) {
    const base = sharp(input)
      .rotate() // respeta la orientación EXIF del celular
      .resize({ width, height: Math.round(width * RATIO), fit: 'cover' })
    const webp = path.join(OUT, `${stem}-${width}.webp`)
    const jpg = path.join(OUT, `${stem}-${width}.jpg`)
    await base.clone().webp(WEBP).toFile(webp)
    await base.clone().jpeg(JPG).toFile(jpg)
    console.log(`  ${String(width).padStart(3)} px  webp ${(await kb(webp)).padStart(7)}   jpg ${(await kb(jpg)).padStart(7)}`)
  }
}
