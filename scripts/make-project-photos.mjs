// Genera las imágenes de Proyectos: WebP + JPG de respaldo en varios anchos,
// a partir de los originales de brand-assets/projects-src/<tipo>/.
//
//   brand-assets/projects-src/<tipo>/<proyecto>-laptop.png
//       → public/images/projects/<tipo>/<prefijo>-laptop-{400,800,1200}.{webp,jpg}
//   brand-assets/projects-src/<tipo>/<proyecto>-celular.png
//       → public/images/projects/<tipo>/<prefijo>-celular-{440,832}.{webp,jpg}
//   brand-assets/projects-src/<tipo>/<proyecto>-<panel>-4x5.png
//       → public/images/projects/<tipo>/<prefijo>-<panel>-{560,840,1122}.{webp,jpg}
//
// <tipo> es la pestaña del filtro (sitios-web, automatizaciones; software y
// crm todavía no tienen imágenes). El <panel> es la tercera imagen, la del
// panel abierto: la identidad de marca en los sitios web, el paso a paso en
// las automatizaciones.
//
// Mismo esquema que las portadas anteriores (ver coverSet.ts): `projects.json`
// guarda solo el prefijo (`/images/projects/sitios-web/proj-1-laptop`) y
// ProjectCard arma el srcset. Los anchos son los de COVER_WIDTHS,
// PHONE_WIDTHS y PANEL_WIDTHS en coverSet.ts: si cambian allá, cambian acá.
//
// Cada pieza se ve en un marco de su propia proporción — la laptop en la
// tapa de la tarjeta ancha, el celular en la angosta, el panel abierto en
// 4:5 — así que no se recorta nada: cada salida conserva la proporción de
// su original, y ningún ancho lo supera (no se agranda). Los originales
// quedan fuera de public/ para que no viajen al deploy.
//
// Se corre a mano cuando cambia una imagen (el resultado se commitea). Usa
// `sharp`, que no está en package.json: `npm install --no-save sharp`.
//
//   node scripts/make-project-photos.mjs
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

let sharp
try {
  ;({ default: sharp } = await import('sharp'))
} catch {
  console.error('Falta `sharp`: corré `npm install --no-save sharp` y repetí.')
  process.exit(1)
}

// Por tipo: el prefijo de salida de cada proyecto → el nombre de sus
// originales, y cómo se llama la tercera imagen.
const GROUPS = [
  {
    folder: 'sitios-web',
    panel: 'identidad',
    projects: {
      'proj-1': 'prosperi',
      'proj-2': 'peisino',
      'proj-3': 'home-steel-home',
      'proj-4': 'amecom',
      'proj-5': 'mapa-de-huertas-pau',
      'proj-6': 'trazzo',
      'proj-7': 'chris-design',
    },
  },
  {
    folder: 'automatizaciones',
    panel: 'flujo',
    projects: {
      'auto-1': 'descarga-de-comisiones',
      'auto-2': 'carga-de-liquidaciones',
      'auto-3': 'ordenes-de-traslado',
      'auto-4': 'captura-de-ensayos',
    },
  },
]

const WEBP = { quality: 80, effort: 6 }
const JPG = { quality: 82, mozjpeg: true }

const kb = async (file) => `${((await stat(file)).size / 1024).toFixed(0)} kB`

for (const group of GROUPS) {
  const SRC = fileURLToPath(new URL(`../brand-assets/projects-src/${group.folder}/`, import.meta.url))
  const OUT = fileURLToPath(new URL(`../public/images/projects/${group.folder}/`, import.meta.url))
  await mkdir(OUT, { recursive: true })

  const pieces = [
    { name: 'laptop', src: 'laptop', widths: [400, 800, 1200] },
    { name: 'celular', src: 'celular', widths: [440, 832] },
    { name: group.panel, src: `${group.panel}-4x5`, widths: [560, 840, 1122] },
  ]

  for (const [prefix, project] of Object.entries(group.projects)) {
    for (const piece of pieces) {
      const file = `${project}-${piece.src}.png`
      const input = path.join(SRC, file)
      const meta = await sharp(input).metadata()
      console.log(`${group.folder}/${file}  ${meta.width}×${meta.height}  ${await kb(input)}`)

      for (const width of piece.widths) {
        const base = sharp(input).rotate().resize({ width, withoutEnlargement: true })
        const stem = `${prefix}-${piece.name}-${width}`
        const webp = path.join(OUT, `${stem}.webp`)
        const jpg = path.join(OUT, `${stem}.jpg`)
        await base.clone().webp(WEBP).toFile(webp)
        await base.clone().jpeg(JPG).toFile(jpg)
        console.log(`  ${width}  webp ${await kb(webp)}  jpg ${await kb(jpg)}`)
      }
    }
  }
}
