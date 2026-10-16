# Brochure «Agencia de Medios» — 2026

**Estado:** aprobado por el operador el 2026-10-16. Canon: delta del 2026-10-16 en
[`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).
De este brochure salió la landing pública «Agencia de Medios» (sección [Landing](#landing), delta 2026-10-16 (c) del
mismo canon).

- **Entregable:** `Efeonce-Brochure-Agencia-de-Medios.pdf` (65 páginas, índice con 15 vínculos internos, 12 232 318
  bytes, sha256 `c4697c7ac40275fc9eba…`), copiado a OneDrive `Alineación/4. Comercial/Brochures/2026/Agencia de
  Medios/`. Es la versión vigente: se rehízo y reemplazó en OneDrive con cada cambio de abajo.
- **Canvas:** https://claude.ai/code/artifact/d32a798b-3bb2-493f-85dc-8c46366ee077 (copia en `canvas/project/`:
  `canvas.json` con el orden y las notas, una `.dc.html` por lámina que apunta a su blob).
- **Línea:** Voice (acento `#f83902`, fondo `#001a33`).

## Recorrido

Portada · Índice · El cambio · Plataformas · Creatividad · Programática · Medición · Trabajar juntos · Glosario.
El orden exacto, con número de página, está en `canvas/project/canvas.json`; los destinos del índice, en
`pdf/build-pdf.mjs`.

## Cambios después de la aprobación (2026-10-16)

- **Logotipos oficiales de terceros** (`a0f73b0ae`): en la lámina de Canales, Hulu, ESPN, Forbes, Peacock y DIRECTV
  pasan de estar escritos con la tipografía de Efeonce a su logotipo oficial (Wikimedia Commons) en blanco monocromo,
  en `logos/terceros/`. Un logotipo de tercero nunca se escribe con la tipografía de la marca propia.
- **CNN y Tubi a escala** (`1ac199dde`): 100 px y 118 px, a la escala visual de la grilla.
- **Sin promesa de rebates** (`696248012`): en la lámina 62, «Cómo se cobra» (`CB-cobro`), sale el recuadro que prometía
  declarar rebates («la comisión o rebate es nuestra, es parte de la ganancia», operador) y «Rebates: siempre
  declarados» pasa a «Tus cuentas: siempre a tu nombre». Nunca se promete declarar ni traspasar rebates o comisiones de
  medios. `pdf/pages.json` y `pdf/titles.json` quedan versionados junto a `pdf/build-pdf.mjs`.

## Cómo se produce cada tipo de lámina

| Tipo | Cómo | Dónde |
|---|---|---|
| Láminas de receta (portada, voz con foto) | `pnpm brand:compose -- --intent <json> --out <dir>` (`cover-brochure`, `proposal-cinematic`) | `intents/`, `out/` |
| Láminas nativas (formatos, performance, programática, capítulos, partners, cobro, índice) | `node native/formatos.mjs` → HTML → PNG con `shot.cjs` del deck SEO/AEO | `native/formatos/`, `laminas/` |
| Medición e insights | copiadas del brochure 360 y recoloreadas a Voice | `native/medicion/` |
| Pantallas con anuncios de ejemplo | composición por homografía (`componer-pantallas.mjs`) → acabado `pnpm ai:inpaint` → reponer el aviso exacto (`reponer-pantalla.mjs`) | `marca-ejemplo/`, `acabado/` |
| PDF | `node pdf/build-pdf.mjs` (Playwright, imágenes JPEG q90, índice HTML vivo en la página 2) | `pdf/` |

Las marcas de ejemplo son ficticias: **Nórtica** (`marca-ejemplo/nortica.mjs`) y **Andara** (`marca-ejemplo/ui.mjs`).

## Trampas medidas

- El acabado del modelo reescribe el logo de la marca de ejemplo («NÁRTIKA»): siempre reponer el aviso exacto encima.
- Pantallas fuera de foco: desenfocar dentro de la máscara de cada pantalla; el inpainting dejaba rectángulos claros.
- sharp: `removeAlpha` + `joinChannel` en el mismo pipeline pierde el alfa; `blur` sobre raw de 1 canal devuelve 3
  canales sin `.extractChannel(0)`.
- La receta `decision-case` exige tema claro: el caso se armó nativo.
- `outline: true` de Playwright no generó marcadores: la navegación es el índice.

## Landing

La landing pública salió de este brochure, recompuesta para web (las láminas no se incrustan como imagen). Aprobada y
publicada el 2026-10-16 en <https://efeoncepro.com/servicios/agencia-de-medios/>, línea Voice. Canon de composición:
delta 2026-10-16 (c) de `EFEONCE_SURFACE_COMPOSITION_V1.md`; operación del sitio:
`.claude/skills/efeonce-public-site-wordpress/references/landings/agencia-de-medios.md`.

| Qué | Dónde |
|---|---|
| Diseño (canvas Design «Landing Agencia de Medios») | <https://claude.ai/artifact/Ns3R6Q1eSYrg3KGQwwWyzE>; copia en `landing/` (`canvas.json`, `Main.dc.html`, `assets/` con fotos, loops, logos de canales y de clientes, isotipos) |
| Marca de ejemplo Nórtica | `marca-ejemplo/nortica.mjs`, con dos opciones nuevas: `hs` (escala del titular en formato ancho) y `slashTop` (altura de la barra lima en formato alto, por defecto 0,38) |
| Piezas sueltas para la web (formatos 9:16, 4:5, 1:1, 16:9, Demand Gen 1,91:1 y las nueve del DCO) | `marca-ejemplo/piezas-web.mjs` → `marca-ejemplo/web/` |
| Pantallas animadas (tres creatividades por pantalla medida, loop con ffmpeg; en los formatos de fila, sólo marca y botón) | `marca-ejemplo/pantallas-animadas.mjs` → `marca-ejemplo/animadas/` |
| Hero con aire para la cabeza de la corredora | `pnpm foto:expandir` → `marca-ejemplo/ej-hero-volt-aire.png` (escala 0,72, `--reponer no --fundido 120`; prompt en `ej-hero-volt-aire-prompt.txt`) |
| Compilador y release al sitio | `scripts/public-website/compile-medios-elementor-source.cjs` (16 widgets `greenhouse_medios_*`), `build-`/`deploy-medios-elementor-package`, `publish-medios-elementor-page.php`, `fix-medios-ohio-layout.php`, `configure-medios-seo.php`, `add-medios-menu-item.php`; fuente de la imagen OpenGraph en `scripts/public-website/medios-source/og/og.html` |

**Decisiones del operador que rigen la landing:** sin caso Sky; sin promesa de rebates; Eusari no se publica por ahora;
Basis, DV360, The Trade Desk, IAS y DoubleVerify son tecnología que operamos, no alianzas (HubSpot Gold y Salesforce sí
son partners); «+120 empresas en 4 países» como proof point y cinco países de operación, sin mezclarlos; isotipos donde
se nombra una marca; chips sin relleno en los eyebrows; desplegables premium. La tarjeta del formulario va en papel
porque el renderer de Growth Forms pinta para fondo claro.

**Pendientes de la landing:** primer envío real desde el navegador (HubSpot y `generate_lead` en GA4); la casilla de
novedades no crea suscripción en HubSpot; Rich Results Test y Search Console; listas desplegables en vez de chips si el
operador las pide.

## Pendientes antes de entregar afuera

Ver «Cautelas» en el delta del canon: cifra de Bresler contra su caso publicado, autorización de logos de clientes
(TASK-1937), readback de HubSpot Gold, inventario de Basis por mercado, alcance de DCO/incrementalidad con
Performance, y no mezclar «cinco países de operación» con el proof point «120+ empresas en 4 países».

Los PNG están fuera de git (`/ai-generations/**/*.png`); para recuperarlos, `pnpm ai-gen:where` / `pnpm ai-gen:pull`.
