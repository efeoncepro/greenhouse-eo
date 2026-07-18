# Overlay Efeonce / Greenhouse — índice (design-studio)

> Aterriza el conocimiento portable de diseño en el ecosistema real de Efeonce.
> Lo genérico vive en `../modules/`; aquí van los mapeos, la marca, las herramientas y los
> boundaries reales. **Reverifica el estado en el repo y en las plataformas** (todo cambia).

## Cuándo usar este overlay

Cuando el diseño toca la marca Efeonce, sus canales/superficies (Think/Glitch/grader, sitio
público, portal) o un cliente Globe. Para diseño genérico basta `../modules/`.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `STUDIO_TOOLING.md` | El pipeline real: qué herramienta para qué (generadores + Figma + handoff humano). |
| `DESIGN_BOUNDARY.md` | La costura completa vs greenhouse-ai-image-generator / brand-asset-designer / product-design-loop / modern-ui / typography / dataviz / social-media-studio / digital-marketing. |
| `CLIENT_DELIVERY.md` | Diseño as-a-service para clientes Globe: multi-marca, KV, aprobaciones. |

Para infografías de artículos, el canon de composición y entrega vive en
`../../content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`. Este overlay dirige el arte;
Content Marketing gobierna argumento, shareability, manifest e integración.

## Marca (dura)

- **Efeonce ≠ Greenhouse.** Greenhouse es el portal operativo interno (los clientes NO lo ven).
  Todo lo público/de marketing es **marca Efeonce** (agencia). SSOT: `src/config/efeonce-brand.ts`
  (arquitectura de marca, eslogan, footer PDF). Importar de ahí, nunca hardcodear.
- **AXIS = Design System interno** (Figma maestro `yyMksCoijfMaIoYplXKZaR`). El color de la **UI**
  sale de `theme.axis.*` / `axis-tokens.ts`, nunca HEX inline. El `AxisWordmark` es **solo del
  design system** — NUNCA en producto, login, emails, PDFs ni portal cliente ni en piezas de marketing.
- **`DESIGN.md`** es el contrato visual agent-facing; leerlo cuando la pieza toque UI.
- **Ilustraciones propietarias** (`characters/greenhouse-*.png`, mascota **Nexa**) = obra del equipo
  creativo de Efeonce, **NO stock ni Vuexy**. Úsalas con criterio de marca; producción nueva → §tooling.

## Ecosistema digital (SSOT: `docs/public-site/decisions/PDR-003`)

Dónde entra el diseño:

- **Think** (blog *Marketing con Manzanitas* → newsletter *Glitch* + tools *AI Visibility Grader*):
  el diseño da los KV, portadas, ilustraciones y hero art que hacen a Think atractivo y compartible.
- **`efeoncepro.com`** (WordPress/Kinsta → Astro): hero/banner/OG de las landings de servicio (ej. `/aeo-2/`).
- **El grader** es la costura top→bottom: un KV que muestra el resultado del grader es pieza social-nativa
  y demuestra expertise. Diseño + `social-media-studio` lo llevan a cada red.

## Coherencia con las skills hermanas

design-studio es **dirección de arte + diseño gráfico**. Encadena con: `greenhouse-ai-image-generator`
(produce el asset UI canónico), `social-media-studio` (lleva el KV a cada red), `digital-marketing`
(estrategia creativa de campaña), `typography-design`/`dataviz-design`/`motion-design` (craft
especializado), `efeonce-public-site-wordpress` (publica el hero/OG), `efeonce-agency` (doctrina de
marca). Detalle en `DESIGN_BOUNDARY.md`.
