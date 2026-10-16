# eklekta — sitio web

Landing de una página para eklekta: automatizaciones, CRM, desarrollo web a
medida y UX/UI.

Stack: **Vite + React 19 + TypeScript + SCSS**. Sin framework de CSS: todo el
sistema visual vive en `src/styles`.

```bash
npm install
npx playwright install chromium   # una vez: lo usa el pre-render del build
npm run dev      # http://localhost:5173
npm run build    # typecheck + build + sitemap + pre-render, todo a dist/
npm run preview  # sirve dist/ en http://localhost:4173
npm run lint
```

---

## Estructura

```
public/                  se copia tal cual a dist/ (y de ahí a public_html)
  api/
    contact.php          endpoint del formulario (PHP, ver «Formulario (PHP)»)
    lib/PHPMailer/       PHPMailer 7.1.1 (solo 3 archivos + LICENSE)
    lib/.htaccess        «Require all denied»: las librerías no se piden por HTTP
  fonts/                 Poppins y Monument Extended en .woff2
  images/                proyectos, equipo y editoriales, og.jpg, logo-512.png
    team/                fotos del equipo ya generadas: member-N-{400,640,880}.{webp,jpg}
  .htaccess              redirección www → sin www, sin listado de carpetas
  robots.txt
  favicon.svg

scripts/
  postbuild.mjs          sitemap.xml + pre-render del HTML (corre dentro de `npm run build`)
  make-logo-png.mjs      regenera public/images/logo-512.png desde el isotipo (a mano)
  make-team-photos.mjs   genera las fotos del equipo (WebP + JPG, 3 anchos) desde
                         brand-assets/team-src/ (a mano; necesita `npm i --no-save sharp`)

server/
  eklekta-mail-config.example.php   plantilla de la config del mail; NO se publica

brand-assets/
  fonts-src/             los .zip originales de las fuentes (fuera del deploy)
  logos/                 archivos de marca originales (fuera del deploy)
  team-src/              fotos originales del equipo, member-N.jpg (fuera del deploy)

src/
  assets/brand/          wordmark.svg e isotype.svg vectorizados desde el PNG
  components/            un directorio por componente: X.tsx + X.scss
  context/               ThemeProvider + contexto de tema
  data/                  contenido en JSON (ver abajo)
  hooks/                 useTheme, useScrolled, useActiveSection
  styles/                tokens, mixins, tema, fuentes, reset, globals
  types/                 tipos compartidos
```

Cada componente es una carpeta con su `.tsx` y su `.scss`. Los estilos se
importan desde el propio componente, así que borrar la carpeta borra el estilo.

### Orden de secciones

`Navbar → Hero → ProjectsRibbon → About → Services → Projects → Team →
Manifesto → Process → Contact → Footer`

---

## Contenido editable (JSON)

Todo el contenido variable sale de `src/data/`. No hace falta tocar componentes
para actualizarlo.

| Archivo | Qué controla |
| --- | --- |
| `projects.json` | Los proyectos. Alimenta la cinta del hero **y** la grilla de Proyectos. |
| `team.json` | Las personas del equipo. `photo` es el prefijo (`/images/team/member-1`); los archivos reales son `member-1-{400,640,880}.{webp,jpg}`. |
| `services.json` | Los cinco servicios y sus entregables. |
| `process.json` | Las etapas del proceso. |
| `site.json` | Navegación, CTA, email, disponibilidad y redes. |

Los tipos están en `src/types/index.ts`; si cambiás la forma del JSON,
TypeScript avisa en el build.

**Un proyecto:**

```json
{
  "id": "nodo-crm",
  "title": "Nodo",
  "client": "Nodo Logística",
  "year": "2025",
  "categories": ["Automatización", "CRM"],
  "summary": "Una o dos frases sobre qué se resolvió.",
  "metric": { "value": "-72%", "label": "carga manual por semana" },
  "cover": "/images/projects/nodo-crm.jpg",
  "url": "https://…",
  "featured": true
}
```

`url` es el link al que va la tarjeta. Abre en pestaña nueva.

---

## Sistema visual

### Color

El violeta de marca es `#6D64F1` (`$brand` en `_tokens.scss`). Los botones
sólidos usan `#6259EE` (`$brand-deep`): es visualmente idéntico pero llega a
5.0:1 con texto blanco, mientras que el original se queda en 4.4:1 y no pasa
AA en texto normal.

Los colores del tema son **custom properties** definidas en `_theme.scss`:
`:root` para claro y `:root[data-theme="dark"]` para oscuro. Los componentes
leen `var(--brand)`, `var(--bg)`, `var(--text)` — nunca los valores de Sass
directamente, para que el modo oscuro funcione solo.

Los acentos editoriales (`--accent-orange`, `--accent-blue`, `--accent-lime`)
vienen de la fotografía de marca y se usan con cuentagotas.

### Tipografía

- **Display:** Monument Extended (Regular 400 / Ultrabold 800)
- **Texto e interfaz:** Poppins (300–700)

Ambas self-hosted en `.woff2` desde `public/fonts` (Poppins pasó de 155 kB a
50 kB por peso). La escala es fluida con `clamp()`; los mínimos están calculados
para que las palabras largas en español (`proveedores`, `herramientas`) entren
en un viewport de 360 px, porque Monument es muy ancha.

> ⚠️ **Licencia:** la copia de Monument Extended que me pasaste es la versión
> *free for personal use*. Para uso comercial hace falta la licencia paga.
> Está enganchada a la variable `$font-display` en `_tokens.scss`, así que
> cambiarla por una licenciada (u otra grotesca ancha) es una línea.
> Poppins es SIL OFL y no tiene ese problema.

### Modo claro / oscuro

Por defecto **claro**, siempre. No sigue la preferencia del sistema a propósito;
solo recuerda lo que el visitante eligió, en `localStorage`. Un script inline en
`index.html` aplica el tema antes del primer pintado para que no haya flash.

### Layout

`--gutter`, `--container-max` y `--edge` están en `:root`. `--edge` es la
distancia del borde del contenedor al borde del viewport, y es lo que permite
que una imagen se salga a sangre (`@include bleed-start` / `bleed-end`) desde
adentro de una grilla.

---

## Movimiento

- Entrada del hero escalonada al cargar
- `<Reveal>` revela bloques al entrar en viewport (IntersectionObserver, escribe
  el atributo directo al DOM: sin estado, sin re-render)
- Cinta de proyectos en loop continuo, se pausa al pasar el mouse o al enfocar
  con teclado
- Parallax del manifiesto con `animation-timeline: view()` — mejora progresiva,
  donde no está soportado queda el collage estático

**Todo respeta `prefers-reduced-motion: reduce`.**

---

## Qué falta reemplazar

1. **Fotos reales.** Casi todo `public/images/**` son placeholders gráficos
   generados con la marca (las fotos del equipo ya son reales). Los tamaños
   esperados: proyectos 1200×1500 (4:5), editoriales verticales.
2. **Proyectos y equipo reales** en los JSON.
3. **Link de agenda.** El CTA "Date un upgrade" apunta a `#contacto`. Si tenés
   Calendly o similar, va en `site.json → cta.href`.

Resuelto:

- ~~Email de contacto~~ → `contacto@eklekta.com.ar` (`site.json`).
- ~~Formulario de contacto~~ → manda mails reales por `public/api/contact.php`
  (ver «Formulario (PHP)»).
- ~~Dominio real~~ → `https://eklekta.com.ar/` en el `canonical`, los `og:` y el
  JSON-LD de `index.html` (ver «SEO»).
- ~~`public/Logos/` (~17 MB) en el deploy~~ → movida a `brand-assets/logos/`.

---

## Deploy a Hostinger

1. `npm run build`
2. Subir el **contenido** de `dist/` (no la carpeta `dist` en sí) a `public_html`,
   sin olvidar los archivos que empiezan con punto (`.htaccess`) ni la carpeta
   `api/`.
3. Crear `eklekta-mail-config.php` **un nivel arriba de `public_html`** (en la
   carpeta que contiene `public_html`, no dentro) a partir de
   `server/eklekta-mail-config.example.php`, y pegar la contraseña del buzón
   `contacto@eklekta.com.ar`. Ese archivo nunca va dentro de `public_html` ni
   al repo (está en el `.gitignore`).
4. Vaciar el caché del CDN en hPanel, para que no sirva el `index.html` viejo.

Para comprobar que PHP corre, abrir `https://eklekta.com.ar/api/contact.php` en
el navegador: tiene que mostrar `{"ok":false,"error":"method_not_allowed"}`.

---

## SEO

- **Pre-render.** El sitio es una SPA, así que el HTML que sirve Vite trae un
  `#root` vacío. `npm run build` termina con `scripts/postbuild.mjs`, que abre
  la página en Chromium (Playwright), toma el HTML ya armado de `#root` y lo
  inyecta en `dist/index.html` como `<div id="root" data-prerendered>`. Google,
  LinkedIn, WhatsApp y cualquier bot que no ejecute JS leen el contenido sin
  esperar a React. Con JS activo ese markup nunca se ve: se oculta por CSS y
  React lo reemplaza en su primer commit (`src/hooks/useClearPrerenderFlag.ts`);
  sin JS, un `<noscript>` lo muestra. No es hidratación (`hydrateRoot`): el
  estado que depende de `localStorage` y `matchMedia` generaría diferencias.
  Si falta el Chromium de Playwright (`npx playwright install chromium`) el
  build **no se rompe**: avisa, genera igual el sitemap y deja el `#root` vacío.
- **JSON-LD.** Está en el `<head>` de `index.html`: un `@graph` con
  `Organization` + `WebSite`. Es `Organization` y no `LocalBusiness` porque no hay
  dirección pública. El logo es `public/images/logo-512.png`.
- **Sitemap.** `dist/sitemap.xml` se genera solo en cada build, con la URL
  `https://eklekta.com.ar/` y `lastmod` con la fecha del build. No hay que tocarlo.
  `public/robots.txt` lo apunta.
- **Canonical.** `https://eklekta.com.ar/`, sin `www`. El `.htaccess` redirige
  `www.eklekta.com.ar` → `eklekta.com.ar` con un 301. No hay regla http → https a
  propósito: el CDN de Hostinger ya la aplica y duplicarla puede hacer un bucle.
- **Textos.** El `<h1>` lleva un texto real (`sr-only`) además del wordmark SVG,
  y las imágenes de proyectos y equipo tienen `alt` descriptivo.

---

## Formulario (PHP)

`src/components/ContactForm` hace `POST` de un JSON a `/api/contact.php`
(`site.json → contact.formEndpoint`). El endpoint valida, aplica un rate limit y
reenvía por SMTP a `contacto@eklekta.com.ar` con PHPMailer **7.1.1** (copiados
solo `PHPMailer.php`, `SMTP.php`, `Exception.php` y `LICENSE`; sin Composer porque
en el servidor no hay paso de build).

La configuración (SMTP y destino) **no está en el repo ni en `dist/`**: se lee de
`eklekta-mail-config.php`, un nivel arriba de `public_html`. La plantilla está en
`server/eklekta-mail-config.example.php`.

Respuestas (siempre JSON):

| Código | `error` | Cuándo |
| --- | --- | --- |
| 200 | — | Enviado. También cuando el honeypot `empresa` viene con algo (no se envía). |
| 200 | — (`"dry_run": true`) | Config con `dry_run: true`: valida todo, no envía. |
| 400 | `invalid_input` (+ `fields`) | Campo inválido: `nombre` 2–100, `email` válido ≤254, `interes` ≤100 (opcional), `mensaje` 10–5000. Saltos de línea en `nombre`/`email`/`interes` se rechazan. |
| 403 | `forbidden_origin` | `Origin` que no es `eklekta.com.ar` ni `www.eklekta.com.ar`. |
| 405 | `method_not_allowed` | Cualquier método que no sea `POST` (con `Allow: POST`). |
| 413 | `payload_too_large` | Cuerpo de más de 20 KB. |
| 429 | `rate_limited` | Más de 5 envíos cada 10 min por cliente, o más de 60 por hora en total. |
| 500 | `config_missing` / `server_error` | Falta o está mal la config; o no se puede escribir la carpeta del rate limit. El detalle va a `error_log`, nunca a la respuesta. |
| 502 | `send_failed` | El SMTP rechazó o no respondió (detalle en `error_log`). |

- **`dry_run`.** Poné `'dry_run' => true` en `eklekta-mail-config.php` para probar
  en el servidor sin mandar mails: el envío responde `{"ok":true,"dry_run":true}` y
  el resumen queda en el log de PHP. Volver a `false` para producción.
- **Rate limit.** Los contadores viven en `eklekta-mail-data/` (también fuera de
  `public_html`, modo 0700, con `flock`). Para identificar al cliente se usa el
  primer IP de `X-Forwarded-For` y, si no hay, `REMOTE_ADDR`: detrás del CDN de
  Hostinger este último puede ser el del CDN. Ese encabezado lo puede falsear
  quien llame directo, y por eso existe también el tope global por hora.
- **Por qué no funciona con `npm run dev`.** Vite no ejecuta PHP: el `POST` a
  `/api/contact.php` da 404 y el formulario muestra «No pudimos enviarlo. Escribinos
  a contacto@eklekta.com.ar.». Es lo esperado. Para probar el envío hay que correr
  el sitio contra PHP (por ejemplo `php -S 127.0.0.1:8080 -t dist`, con una config
  de prueba con `dry_run: true` en la raíz del repo, dos niveles arriba de
  `dist/api/`; está en el `.gitignore`), o probarlo ya publicado.
