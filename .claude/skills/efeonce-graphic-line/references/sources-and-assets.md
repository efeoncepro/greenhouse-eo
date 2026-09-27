# Dónde está cada cosa

> Verificado contra: axis-design-system@e26bd85 (iconografía y versiones: AXIS `main@5b8ab20`, tag `v0.3.6`) y
> greenhouse-eo@051660d73 — 2026-09-26.

## Fuentes de verdad (por orden de autoridad)

| Qué | Dónde | Quién manda |
|---|---|---|
| Decisiones del operador | `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (ADR + deltas) | el operador |
| Reglas de marca | `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (manual) | el ADR |
| Movimiento | `docs/operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md` (norma) y `EFEONCE_ORBIT_REVEAL_MOTION_V1.md` (producción) | el manual |
| Valores | tokens `efeonceGraphicLine` en AXIS `packages/tokens/src/tokens.ts` | los docs describen; el token manda en números |
| Composición por intención | contratos AXIS `efeonce.graphic-line-orbit`, `efeonce.collaboration-selection`, `efeonce.email-signature` | el token |
| Pintura | paquete `@efeoncepro/axis-graphic-line` (recetas que reproducen las piezas medidas) | el contrato |
| Fotografía | `docs/operations/brand-photography/` (lenguaje fotográfico, reservas, firma en primer plano) | el operador |
| Iconografía (Trazo y Plastilina, D16–D22) | AXIS: valores `efeonceGraphicLine.icons` (`axis-tokens` ≥ 0.3.6), geometría y reglas `@efeoncepro/axis-graphic-line/icons` (≥ 0.4.0), guía `docs/agent-composition/iconography.md`, ADR `docs/architecture/ICONOGRAPHY_DECISION_V1.md`. En Greenhouse sólo el criterio ([iconography.md](iconography.md)) | el token y el paquete; las decisiones, el operador (ledger) |

Si un doc y el código no coinciden, manda el código verificado y se corrige el doc (con fecha).

## Repositorios y superficies

- **AXIS** `efeoncepro/axis-design-system` (`main` despliega `axis.efeonce.org`; etiquetas `v*.*.*` publican
  paquetes en GitHub Packages).
  - Lab: `https://axis.efeonce.org/references/graphic-line/` (fuente `apps/lab/src/pages/references/graphic-line.astro`,
    estilos `apps/lab/src/styles/graphic-line.css`, láminas del canvas en `apps/lab/src/data/graphic-line-elements.json`,
    helpers `apps/lab/src/lib/graphic-line.ts`, pruebas `apps/lab/src/test/{unit,e2e}`).
  - Manuales para agentes: `docs/agent-composition/graphic-line-orbit.md`, `email-signature.md`,
    `collaboration-selection.md`, `iconography.md`; decisiones AXIS `docs/architecture/GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md`
    e `ICONOGRAPHY_DECISION_V1.md`.
  - Iconografía: página `https://axis.efeonce.org/references/iconography/` (para el equipo, con «Copiar SVG») y
    `/references/iconography.json` (para agentes); instrucción copiable en `apps/lab/src/data/iconography.ts`; glifos en
    `packages/graphic-line/src/icons-stroke-data.ts` y `icons-plastilina-data.ts`; comandos `pnpm icons:export | check |
    vectorize` (`scripts/icons.mjs`) desde la raíz de AXIS.
- **Greenhouse** `efeoncepro/greenhouse-eo` (plano de control de la marca: docs, skills y las herramientas de
  producción).
  - Compositor de campañas: `scripts/creative/layout-compiler/` (`graphic-line.mjs` adapter raster-safe,
    `compiler.mjs` capa `graphic_line`, `axis-advertising.mjs`); comandos `pnpm creative:orbit:resolve|render`,
    `pnpm creative:layout`.
  - Compositor de fotos con CTA: `scripts/foto/componer-cta*.mjs` (`marcaEnEscena`); `pnpm foto:componer:cta`,
    `pnpm foto:cta:gate`.
  - Motion del logo: `scripts/creative/brand-motion/`.
  - Fotografía: `pnpm foto:doctor | foto:prompt | foto:validar`, canon en `docs/operations/brand-photography/`.
- **Canvas de exploración** (Design, claude.ai): la fuente visual original de cada lámina; el Lab la reconstruye.

## Archivos y medios

| Qué | Dónde |
|---|---|
| Logos, isotipos, burbujas URL, 48 órbitas estáticas | `@efeoncepro/axis-brand-assets` (nunca copias a mano) |
| Masters del motion del logo | `gs://efeonce-group-axis-public-media/motion/logo/v1.1/…` (público, CORS para el Lab) |
| MP4, GIF y cuadros finales para el equipo | OneDrive `Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/` |
| Versiones web del motion y pósters | Lab `apps/lab/public/media/graphic-line/motion/` |
| Fotos de las láminas (lente, oficina, merch) | Lab `apps/lab/public/media/graphic-line/assets/` (`of-*.webp`, `ia-*.webp`, `L*-*.webp`) |
| Firma de correo (personal y de equipo) | contrato `efeonce.email-signature`; imágenes en `gs://efeonce-group-axis-public-media/email-signature/v3.1/` (`shared/<dark\|light>/`, `people/<persona>-<dark\|light>.png`, `areas/<área>-<dark\|light>.png`); generador vigente `ai-generations/2026-09-26_firma-partners/build4.mjs` (`HOST_BASE=<url>` escribe `hosted/` y los HTML de Outlook; `AREA=<área>` para la de equipo). La exploración de `exploracion-v5/firma/` es histórica (origen del token `portrait`) |
| Kits 3D, prendas, lanyard, SVG oficiales | OneDrive `…/13- Branding/` (ver skill `efeonce-brand-studio`) |
| Íconos de la línea (30 glifos aprobados) | `ICON_CATALOG` de `@efeoncepro/axis-graphic-line/icons`; en archivos, `pnpm icons:export` en AXIS (60 SVG + `manifest.json`). Nunca copias a mano ni SVG dibujados en la pieza |
| Referencia de estilo y prompt de Plastilina (para dar de alta un glifo) | AXIS `docs/agent-composition/iconography/plastilina-style-reference.png` y `plastilina-prompt.txt` (canónicos; reemplazan a los archivos de `ai-generations/2026-09-26_iconos-planos/`, no versionados); ejemplo de glifo de Trazo en `docs/examples/iconography/stroke-glyph-keynote.json` |

## Versiones publicadas (2026-09-26)

`axis-tokens` 0.3.6 (con `efeonceGraphicLine.icons`) · `axis-graphic-line` 0.4.0 (con `/icons`) — tag `v0.3.6` ·
`axis-ui-contracts` 0.3.5 (contrato de la órbita 0.3.1) · `axis-ui-registry` 0.3.1 · `axis-brand-assets` 0.3.1
(los tres, sin cambios en `v0.3.6`). Greenhouse fija tokens y contracts 0.3.5 y registry y brand-assets 0.3.1 en `develop` (no usa
`axis-graphic-line` —su compositor tiene pintor propio raster-safe— y todavía no consume `/icons`: para una pieza, los
SVG salen de `pnpm icons:export` en AXIS o del Lab). Cada paquete nuevo necesita «Manage Actions
access → Read» para cada repositorio consumidor antes de que éste lo agregue.
