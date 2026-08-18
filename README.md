# eklekta — sitio web

Landing de una página para eklekta: automatizaciones, CRM, desarrollo web a
medida, UX/UI y branding.

Stack: **Vite + React 19 + TypeScript + SCSS**. Sin framework de CSS: todo el
sistema visual vive en `src/styles`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build a dist/
npm run lint
```

---

## Estructura

```
public/
  fonts/                 Poppins y Monument Extended en .woff2
  images/                placeholders de proyectos, equipo y editoriales
  Logos/                 archivos de marca originales (no se usan en el build)
  favicon.svg

brand-assets/
  fonts-src/             los .zip originales de las fuentes (fuera del deploy)

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
| `team.json` | Las personas del equipo. |
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

1. **Fotos reales.** Todo `public/images/**` son placeholders gráficos generados
   con la marca. Los tamaños esperados: proyectos 1200×1500 (4:5), equipo
   900×1200 (3:4), editoriales verticales.
2. **Proyectos y equipo reales** en los JSON.
3. **Email de contacto** — hoy dice `hola@eklekta.studio` en `site.json`.
4. **Link de agenda.** El CTA "Date un upgrade" apunta a `#contacto`. Si tenés
   Calendly o similar, va en `site.json → cta.href`.
5. **Formulario de contacto**, si lo querés. Hoy la sección ofrece canales
   directos (email, Instagram, LinkedIn) porque un formulario sin backend no
   envía nada.
6. **Dominio real** en el `canonical` y los `og:` de `index.html`.

`public/Logos/` pesa ~17 MB (`banner linkedin.png` sola son 10 MB) y hoy se
copiaría entera al deploy. El sitio no la usa: los logos que ve el usuario son
los SVG de `src/assets/brand/`. Conviene sacarla de `public/` antes de publicar.
