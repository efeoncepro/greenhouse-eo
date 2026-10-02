# Dónde está cada cosa

> Verificado contra: axis-design-system@e26bd85 (iconografía y versiones: AXIS `main@5b8ab20`, tag `v0.3.6`) y
> greenhouse-eo@051660d73 — 2026-09-26. Plastilina en volumen (D24): AXIS `main@c18e3d3` — 2026-09-27. Oficio (D25,
> catálogo de 60 y 33 volúmenes): AXIS main@aa66225, 2026-09-27 (tag `v0.5.0`). IA, social y staff (D26, catálogo de
> 79 y 43 volúmenes): AXIS main@cf77452 (2026-09-27) (tag `v0.6.0`). Versiones fijadas y ruta por el Artifact Composer:
> greenhouse-eo@016d0a183 — 2026-09-27 (tag AXIS `v0.3.8`). Versiones vigentes y fila de Glitch: greenhouse-eo@24e4c72ee
> — 2026-09-28 (tag AXIS `v0.3.24`). Efeonce AI Visibility Report: AXIS `main` `26097c5`, tag `v0.3.30` — 2026-09-29.
> Módulos de correo y camino recorrido: AXIS `main` `c92160b`, tag `v0.3.38` — 2026-09-29.

## Fuentes de verdad (por orden de autoridad)

| Qué | Dónde | Quién manda |
|---|---|---|
| Decisiones del operador | `docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md` (ADR + deltas) | el operador |
| Reglas de marca | `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` (manual) | el ADR |
| Movimiento | `docs/operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md` (norma) y `EFEONCE_ORBIT_REVEAL_MOTION_V1.md` (producción) | el manual |
| Valores | tokens `efeonceGraphicLine` en AXIS `packages/tokens/src/tokens.ts` | los docs describen; el token manda en números |
| Composición por intención | contratos AXIS `efeonce.graphic-line-orbit`, `efeonce.collaboration-selection`, `efeonce.email-signature`, `efeonce.email-modules` | el token |
| Composición por superficie | norma `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` + contrato AXIS `efeonce.surface-composition` (tokens `efeonceGraphicLine.surfaces`); en Greenhouse, las plantillas de las recetas aprobadas (catálogos `graphic-line-*`) | el operador aprueba la receta; el token manda en números; la plantilla sigue la lámina aprobada |
| Pintura | paquete `@efeoncepro/axis-graphic-line` (recetas que reproducen las piezas medidas) | el contrato |
| Fotografía | `docs/operations/brand-photography/` (lenguaje fotográfico, reservas, firma en primer plano) | el operador |
| Iconografía (Trazo y Plastilina, D16–D22) | AXIS: valores `efeonceGraphicLine.icons` (`axis-tokens` ≥ 0.3.6), geometría y reglas `@efeoncepro/axis-graphic-line/icons` (≥ 0.4.0), guía `docs/agent-composition/iconography.md`, ADR `docs/architecture/ICONOGRAPHY_DECISION_V1.md`. Plastilina en volumen (D24): `efeonceGraphicLine.icons.volume` (`axis-tokens` 0.3.7) y los PNG de `@efeoncepro/axis-brand-assets` 0.3.2 (ambos publicados con el tag `v0.3.7`). Oficio (D25): catálogo de 60 en `axis-graphic-line` 0.5.0 y 33 PNG en `axis-brand-assets` 0.3.3 (tag `v0.5.0`), guía §«Catálogo aprobado». En Greenhouse sólo el criterio ([iconography.md](iconography.md)) | el token y el paquete; las decisiones, el operador (ledger) |
| Identidad sonora (**recomendada, no canon**, 2026-09-26) | Greenhouse `docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md`; AXIS (PR #4, squash `55486aa`, publicado 2026-09-26): página `https://axis.efeonce.org/references/sonic-brand/`, JSON `/references/sonic-brand.json` (esquema `axis.efeonce-sonic-brand.v1`), guía `docs/agent-composition/sonic-brand.md`, fuentes Lab `apps/lab/src/data/sonic-brand.ts` y `sonic-brand-assets.ts`. Sin tokens hasta canonizar | el operador (ledger); archivos, el kit |
| Sub-línea de Glitch (sólo Glitch, 2026-09-27) | Greenhouse `docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md` (norma) + ADR `docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md`; AXIS (publicado 2026-09-27): `/references/glitch/` (con `#sonido` y `#musica`), `/references/glitch.json` (campos `sound` y `music`), guía `docs/agent-composition/glitch.md`. Token `glitchLine` (`axis-tokens`; desde 0.3.24 con `editions` y las piezas `flash-*` del Glitch Flash), contrato `efeonce.glitch-line` 0.2.0 (`axis-ui-contracts` 0.3.22) y `AXIS_GLITCH_ASSETS` (`axis-brand-assets` 0.3.5); en Greenhouse, catálogos `src/lib/artifact-composer/catalogs/glitch/` (32 plantillas) y `pnpm glitch:compose`. Resumen en [glitch.md](glitch.md) | el operador; los valores, el token `glitchLine` |
| Motion, sonido y música de Glitch (**aprobados**, sólo Glitch, 2026-09-27) | Producción: repo taller `efeoncepro/efeonce-brand-workshop` (`main` = `ed89a0b`), `tools/glitch-motion/` (HyperFrames; `src/sound.mjs` sobre `tools/brand-sound`; `src/music.mjs`), manifiesto por corrida en `corridas/<run>/manifiesto.json` (sha256, verificaciones, entrega; sin rutas de máquina). Música: másteres en `https://storage.googleapis.com/efeonce-group-axis-public-media/glitch/music/v1/` (`index.json`; sha256 fijado en `music.mjs`, falla cerrado si cambia). Sonido: `glitch/sound/v1/` del mismo bucket. Entregas al editor: OneDrive `Alineación/5. Contenidos/09. Glitch/Motion/piloto/` (`v2/` la aprobada, `v2/sin-musica/`, `kit/`, `transiciones/`). Datos AXIS: `apps/lab/src/data/{glitch,glitch-sound,glitch-sound-assets,glitch-music,glitch-music-assets}.ts`. Comandos: norma de Glitch §13.13 y [glitch.md](glitch.md) §12 | el operador aprueba; los archivos del bucket (URL + sha256) mandan sobre cualquier script |
| Marca de producto de Efeonce Insights (canónica 2026-09-28) | criterio [criteria.md](criteria.md) («Insights, marca de producto que acompaña»), decisión [ledger.md](ledger.md) (fila 2026-09-28); archivos `@efeoncepro/axis-brand-assets` ≥ 0.4.0 (`insights-{logo,isotype,lockup}-*`), generador Greenhouse `scripts/brand/build-insights-logo.mjs`; mapa de aplicación [applications.md](applications.md) §B3b; anatomía del informe y la web en la skill `efeonce-insights` → `references/ui-and-brand.md` | el operador; los archivos sellados mandan en la forma |
| Submarcas de producto SEO/AEO (aprobadas 2026-09-29): Efeonce \| SV360, AEO, AEO Assessment, AI Visibility Report | criterio [criteria.md](criteria.md) («Submarcas de producto SEO/AEO»), decisión [ledger.md](ledger.md) (fila 2026-09-29 tarde), norma manual §7.2, naming en el ADR `docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md` §Delta 2026-09-29; archivos `@efeoncepro/axis-brand-assets` 0.4.2 (publicado el 2026-09-29; `sv360-*`, `aeo-*`, `aeo-assessment-*`, `ai-visibility-report-*`), generador Greenhouse `scripts/brand/build-seo-aeo-logos.mjs`; canvas de registro [«Marcas SEO y AEO de Efeonce»](https://claude.ai/artifact/3wPmSbb24fm1pJqAPcv9ac); aplicaciones [applications.md](applications.md) §B3c | el operador; los archivos sellados mandan en la forma |
| Módulos de correo de Efeonce (pie, CTA principal, agenda, bloque de marca; aprobados 2026-09-29; el correo de entrega de Insights es una aplicación) | canvas [«Correo»](https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd) v21 (tableros: enlace en escritorio, en celular y PDF adjunto). AXIS: token `efeonceEmail` (`axis-tokens` 0.3.38), contrato `efeonce.email-modules` 0.1.0 `candidate` (`axis-ui-contracts` 0.3.38), PNG `AXIS_EMAIL_ASSETS` (`axis-brand-assets` 0.4.6), ADR `docs/architecture/EMAIL_MODULES_DECISION_V1.md`, guía `docs/agent-composition/email-modules.md` (+ schema y ejemplos en `docs/examples/email-modules/`), CLI `pnpm email:resolve`. Greenhouse: dirección sellada `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md` + PNG en `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1/`; datos legales de `src/config/efeonce-brand.ts`; aplicación [applications.md](applications.md) §C4 | el operador aprueba; el token manda en números; los datos legales, el SSOT de Greenhouse |
| Efeonce AI Visibility Report (el PDF del AEO Assessment; canónico en AXIS desde `v0.3.30`, 2026-09-29) | AXIS: tokens `efeonceGraphicLine.measureSeverity` y `aiVisibilityReport` (`axis-tokens` 0.3.30), contratos `efeonce.ai-visibility-report` 0.1.0 `candidate` y `efeonce.graphic-line-orbit` 0.4.0 (`axis-ui-contracts` 0.3.30), receta `@efeoncepro/axis-graphic-line/report` (0.12.0); ADR `docs/architecture/AI_VISIBILITY_REPORT_COMPOSITION_DECISION_V1.md`. Greenhouse: dirección sellada `docs/ui/visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita-direction.md` (commit `c76d75711`); criterio [criteria.md](criteria.md) §3.4 («Medida con gravedad»); inventario [package-and-tokens.md](package-and-tokens.md) §2.19, §2.20 y §7.10 | el operador aprueba; el token manda en números; los umbrales, el productor del puntaje |

Si un doc y el código no coinciden, manda el código verificado y se corrige el doc (con fecha).

## Repositorios y superficies

- **AXIS** `efeoncepro/axis-design-system` (`main` despliega `axis.efeonce.org`; etiquetas `v*.*.*` publican
  paquetes en GitHub Packages).
  - Lab: `https://axis.efeonce.org/references/graphic-line/` (fuente `apps/lab/src/pages/references/graphic-line.astro`,
    estilos `apps/lab/src/styles/graphic-line.css`, láminas del canvas en `apps/lab/src/data/graphic-line-elements.json`,
    helpers `apps/lab/src/lib/graphic-line.ts`, pruebas `apps/lab/src/test/{unit,e2e}`).
  - Insights (2026-09-28): página de referencia
    [axis.efeonce.org/references/insights/](https://axis.efeonce.org/references/insights/), **publicada el 2026-09-28**
    (AXIS main `3dfbf0e`; datos para agentes en `/references/insights.json`). Fuente en `main`:
    `apps/lab/src/pages/references/insights.astro`, JSON `insights.json.ts`, guía `docs/agent-composition/insights.md`.
    Sólo datos de muestra, sin componentes. Los archivos de la marca copiados al Lab
    (`apps/lab/public/branding/insights-*.svg`, por `apps/lab/scripts/sync-brand-assets.mjs`) también están en `main`. El
    ejemplo vivo del producto es la muestra `think.efeoncepro.com/insights/muestra`.
  - Submarcas SEO/AEO (2026-09-29): página de referencia `/references/seo-aeo/`, JSON para agentes
    `/references/seo-aeo.json` y guía `docs/agent-composition/seo-aeo.md`, **publicados el 2026-09-29** (verificados: responden 200).
  - Efeonce AI Visibility Report (2026-09-29, `v0.3.30`): página
    [axis.efeonce.org/references/ai-visibility-report/](https://axis.efeonce.org/references/ai-visibility-report/)
    (gravedad en vivo con deslizador, anatomía, las 24 páginas aprobadas en es/en/pt-BR y sección para agentes) y
    `/references/ai-visibility-report.json` (schema `axis.efeonce-ai-visibility-report.v1`); fuente
    `apps/lab/src/pages/references/ai-visibility-report.astro` (+ `.json.ts`, `apps/lab/src/data/ai-visibility-report.ts`).
    Docs: ADR `docs/architecture/AI_VISIBILITY_REPORT_COMPOSITION_DECISION_V1.md`, guía para agentes
    `docs/agent-composition/ai-visibility-report.md`, esquema `docs/agent-composition/ai-visibility-report-intent.schema.json`,
    ejemplos `docs/examples/ai-visibility-report/` (válidos e inválidos) y CLI `pnpm report:resolve`. La guía y el ADR
    de la órbita quedaron actualizados al contrato 0.4.0.
  - Módulos de correo (2026-09-29, `v0.3.38`): página
    [axis.efeonce.org/references/email/](https://axis.efeonce.org/references/email/) y `/references/email.json`;
    fuente `apps/lab/src/pages/references/email.astro` (+ `.json.ts`, `apps/lab/src/data/email.ts`,
    `components/EmailFooter.astro`, `EmailAgenda.astro`, `styles/email.css`). Docs: ADR
    `docs/architecture/EMAIL_MODULES_DECISION_V1.md`, guía `docs/agent-composition/email-modules.md`, esquema
    `docs/agent-composition/email-modules-intent.schema.json`, ejemplos `docs/examples/email-modules/`, CLI
    `pnpm email:resolve` y generador de PNG `pnpm email:assets`. La guía y el ADR de la órbita quedaron al contrato 0.5.0
    (camino recorrido).
  - Manuales para agentes: `docs/agent-composition/graphic-line-orbit.md`, `email-signature.md`, `email-modules.md`,
    `collaboration-selection.md`, `iconography.md`; decisiones AXIS `docs/architecture/GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md`
    e `ICONOGRAPHY_DECISION_V1.md`.
  - Iconografía: página `https://axis.efeonce.org/references/iconography/` (para el equipo, con «Copiar SVG») y
    `/references/iconography.json` (para agentes); instrucción copiable en `apps/lab/src/data/iconography.ts`; glifos en
    `packages/graphic-line/src/icons-stroke-data.ts` y `icons-plastilina-data.ts`; comandos `pnpm icons:export | check |
    vectorize` (`scripts/icons.mjs`) desde la raíz de AXIS.
  - Plastilina en volumen (D24): sección 05 del Lab `https://axis.efeonce.org/references/iconography/#volumen` (set de
    43 con descarga PNG desde D26, spec, dónde va y dónde no, método, avisos revisados); bloque `volume` de
    `/references/iconography.json`; guía `docs/agent-composition/iconography.md` §9; ADR `ICONOGRAPHY_DECISION_V1.md`
    §«Delta 2026-09-27 — Plastilina en volumen (D24)»; comando `pnpm icons:volume -- refs|key|check|publish`
    (`scripts/icons-volume.mjs`).
- **Greenhouse** `efeoncepro/greenhouse-eo` (plano de control de la marca: docs, skills y las herramientas de
  producción).
  - Compositor de campañas: `scripts/creative/layout-compiler/` (`graphic-line.mjs` adapter raster-safe,
    `compiler.mjs` capa `graphic_line`, `axis-advertising.mjs`); comandos `pnpm creative:orbit:resolve|render`,
    `pnpm creative:layout`.
  - Compositor de fotos con CTA: `scripts/foto/componer-cta*.mjs` (`marcaEnEscena`); `pnpm foto:componer:cta`,
    `pnpm foto:cta:gate`.
  - Motion del logo: `scripts/creative/brand-motion/`.
  - Composición por superficie (TASK-1919): catálogos `src/lib/artifact-composer/catalogs/graphic-line-{deck,stills,overlays}/`
    (+ `graphic-line-shared/`), mapper puro `src/lib/brand-surfaces` (ejemplos en `examples/*-intent.json`), CLI
    `scripts/brand-surfaces/` (`pnpm brand:compose`, `pnpm brand:tokens`); líneas base en
    `scripts/frontend/baselines/artifact-composer/templates-graphic-line-*/`.
  - Fotografía: `pnpm foto:doctor | foto:prompt | foto:validar`, canon en `docs/operations/brand-photography/`.
- **Canvas de exploración** (Design, claude.ai): la fuente visual original de cada lámina; el Lab la reconstruye.

## Archivos y medios

| Qué | Dónde |
|---|---|
| Logos, isotipos, burbujas URL, 48 órbitas estáticas | `@efeoncepro/axis-brand-assets` (nunca copias a mano) |
| Marca de Insights (logo, isotipo, lockup) | `@efeoncepro/axis-brand-assets` **0.4.0** (`insights-*`); Greenhouse fija 0.3.5 y no los trae; Think usa copias manuales en `efeonce-think/public/branding/insights/` (5 de los 6 SVG, sin `insights-isotype-positive`; en código sólo los dos lockups) + `og-insights.png`, generada por `efeonce-think/scripts/build-insights-og.mjs` (regenerarla si cambia el lockup) |
| Submarcas SEO/AEO (logo, isotipo de SV360 y AEO, lockup, `sv360-name-lockup`; variantes positive/negative/white) | `@efeoncepro/axis-brand-assets` **0.4.2** (publicado el 2026-09-29; `AXIS_SEO_AEO_BRANDS`; 0.4.3, del mismo día, sólo re-sella las órbitas estáticas con el contrato 0.4.0); Greenhouse fija 0.4.1 y los recibe con TASK-1938. Nunca copias a mano: se regeneran con `scripts/brand/build-seo-aeo-logos.mjs` |
| Masters del motion del logo | `gs://efeonce-group-axis-public-media/motion/logo/v1.1/…` (público, CORS para el Lab) |
| Kit de la identidad sonora (recomendada) | `gs://efeonce-group-axis-public-media/sonic/v1/` → `masters/` (logo, etiqueta con voz, motion WAV+MP4 16:9/9:16, piezas largas, cierre de energía, voz sola) y `web/` (MP3, MP4 720p, pósters WebP); 65 archivos. Producción: `ai-generations/2026-09-26_branding-sonoro/` (`LEEME.md`, `motor/`, `entrega/`, `guia/`; binarios fuera de git: `pnpm ai-gen:pull` si faltan) |
| Sonido de Glitch (sólo Glitch, versión B) | `gs://efeonce-group-axis-public-media/glitch/sound/v1/` (`masters/` + `web/`); lo produce el taller `efeonce-brand-workshop` → `tools/glitch-motion/src/sound.mjs`. Detalle: [glitch.md](glitch.md) §13 |
| Música de Glitch (sólo Glitch: tema B + cama post-punk) | `gs://efeonce-group-axis-public-media/glitch/music/v1/` (17 archivos con `index.json`: URL + sha256; nunca se regeneran); AXIS `/references/glitch/#musica` y `glitch.json → music`; el taller la baja y verifica con `tools/glitch-motion/src/music.mjs` (`--music off` la apaga). Detalle: [glitch.md](glitch.md) §13.7 |
| MP4, GIF y cuadros finales para el equipo | OneDrive `Alineación/5. Contenidos/13- Branding/Motion Órbita Efeonce/v1.1/` |
| Versiones web del motion y pósters | Lab `apps/lab/public/media/graphic-line/motion/` |
| Fotos de las láminas (lente, oficina, merch) | Lab `apps/lab/public/media/graphic-line/assets/` (`of-*.webp`, `ia-*.webp`, `L*-*.webp`) |
| PNG para correo (logo 220, eslogan por línea separado del logo, 4 redes, burbuja horneada) | `@efeoncepro/axis-brand-assets` **0.4.6** (`assets/email/`, `AXIS_EMAIL_ASSETS`, `findEmailAsset`, `emailAssetUrl`); se regeneran con `pnpm email:assets` en AXIS; Greenhouse fija 0.4.5 y todavía no los usa |
| Firma de correo (personal y de equipo) | contrato `efeonce.email-signature`; imágenes en `gs://efeonce-group-axis-public-media/email-signature/v3.1/` (`shared/<dark\|light>/`, `people/<persona>-<dark\|light>.png`, `areas/<área>-<dark\|light>.png`); generador vigente `ai-generations/2026-09-26_firma-partners/build4.mjs` (sin versionar: `pnpm ai-gen:pull` si falta; `HOST_BASE=<url>` escribe `hosted/` y los HTML de Outlook; `AREA=<área>` para la de equipo). La exploración de `exploracion-v5/firma/` es histórica (origen del token `portrait`) |
| Kits 3D, prendas, lanyard, SVG oficiales | OneDrive `…/13- Branding/` (ver skill `efeonce-brand-studio`) |
| Íconos de la línea (79 glifos aprobados: 36 Trazo + 43 Plastilina, desde D26) | `ICON_CATALOG` de `@efeoncepro/axis-graphic-line/icons` (79 desde 0.6.0, tag `v0.6.0`; 60 en 0.5.0; 30 en 0.4.0); en archivos, `pnpm icons:export` en AXIS (SVG por glifo y estado + `manifest.json`). Nunca copias a mano ni SVG dibujados en la pieza |
| Plastilina en volumen (43 PNG desde D26, 1024 px, alfa) | `@efeoncepro/axis-brand-assets` 0.3.4 (publicado con el tag `v0.6.0`; la 0.3.3 trae 33 y la 0.3.2 los 18 de la base): `assets/volume/<glifo>.png`, sellados en `src/volume-manifest.ts`; `volumeIconUrl(glyph)`. Nunca se regenera dentro de una pieza |
| Prompt canónico del volumen | AXIS `docs/agent-composition/iconography/volume-prompt.txt` (copia en el Lab: `/media/iconography/volume-prompt.txt`). No se reescribe: si un detalle falla, se agrega UNA línea |
| Corridas del volumen (no canónicas) | Greenhouse `ai-generations/2026-09-27_plastilina-3d-gpt/` (`ref/`, `crudo/`, `alfa/`, prompts, QA; la vía aprobada) y `ai-generations/2026-09-26_plastilina-volumen/` (intento Blender, rechazado). Canvas «Íconos de La órbita» (claude.ai artifact Y9mx42L72zYc6iLg4j3Maj): lámina Y2 aprobada, Y1 (Blender) descartada |
| Producción del oficio (D25, no canónica) | Greenhouse `ai-generations/2026-09-27_iconos-oficio/` (`trazo/` y `plastilina/`, con `RESUMEN.md`) y el volumen en `ai-generations/2026-09-27_plastilina-3d-gpt/oficio/`. Revisión: canvas «Íconos de La órbita», sección 7. Lo canónico es lo publicado en AXIS |
| Producción de IA, social y staff (D26, no canónica) | Greenhouse `ai-generations/2026-09-27_iconos-ia-social/` (`trazo/` y `plastilina/`) y el volumen en `ai-generations/2026-09-27_plastilina-3d-gpt/ia-social/`. El Trazo `staff-hoodie` **no** entró (no se leía como hoodie). Lo canónico es lo publicado en AXIS |
| Referencia de estilo y prompt de Plastilina (para dar de alta un glifo) | AXIS `docs/agent-composition/iconography/plastilina-style-reference.png` y `plastilina-prompt.txt` (canónicos; reemplazan a los archivos de `ai-generations/2026-09-26_iconos-planos/`, no versionados); ejemplo de glifo de Trazo en `docs/examples/iconography/stroke-glyph-keynote.json` |

## Versiones publicadas (2026-09-26)

`axis-tokens` 0.3.6 (con `efeonceGraphicLine.icons`) · `axis-graphic-line` 0.4.0 (con `/icons`) — tag `v0.3.6` ·
`axis-ui-contracts` 0.3.5 (contrato de la órbita 0.3.1) · `axis-ui-registry` 0.3.1 · `axis-brand-assets` 0.3.1
(los tres, sin cambios en `v0.3.6`). *(Historia: en ese momento Greenhouse fijaba tokens y contracts 0.3.5 y registry
y brand-assets 0.3.1 y no usaba `axis-graphic-line`; el estado vigente está al final de esta sección.)* Cada paquete
nuevo necesita «Manage Actions access → Read» para cada repositorio consumidor antes de que éste lo agregue.

**Publicado el 2026-09-27 (tag `v0.3.7`, AXIS `main@c0020b6`):** `axis-tokens` 0.3.7 (`efeonceGraphicLine.icons.volume`),
`axis-brand-assets` 0.3.2 (`volume/`, `volumeIconUrl`) y `axis-ui-contracts` 0.3.6; `axis-graphic-line` sigue en 0.4.0.
Greenhouse ya fija esas versiones (commit `f3f93c926`, 2026-09-27: tokens 0.3.7, contracts 0.3.6, brand-assets 0.3.2 y
`axis-graphic-line` 0.4.0 como dependencia directa); el PNG también se puede descargar a mano desde el Lab.

**Publicado el 2026-09-27 (tag `v0.5.0`, AXIS main):** `axis-graphic-line` 0.5.0 (catálogo de 60 glifos con el oficio
D25) y `axis-brand-assets` 0.3.3 (33 PNG de volumen); `axis-tokens` sigue en 0.3.7. Greenhouse fijó 0.5.0 y 0.3.3
ese día (con el oficio).

**Publicado el 2026-09-27 (tag `v0.6.0`, AXIS main@cf77452 (2026-09-27)):** `axis-graphic-line` 0.6.0 (catálogo de 79 glifos
con IA, social y staff D26) y `axis-brand-assets` 0.3.4 (43 PNG de volumen); `axis-tokens` iba en 0.3.8 en ese release y no cambió por
D26. Greenhouse fija axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4.

**Publicado el 2026-09-27 (tag `v0.3.8`):** `axis-tokens` 0.3.8 y `axis-ui-contracts` 0.3.7, con el contrato
`efeonce.surface-composition` 0.1.1 (`candidate`, acepta intents 0.1.0; modela el contenido de las láminas aprobadas).

**Vigente en Greenhouse (2026-09-28, `package.json`, tras TASK-1927, TASK-1922, TASK-1928, TASK-1934 y el Glitch
Flash, `53002b352`):** `axis-tokens` **0.3.24** · `axis-ui-contracts` **0.3.22** (tag `v0.3.24`) · `axis-brand-assets` 0.3.5 · `axis-graphic-line` 0.7.0
(dependencia directa) · `axis-ui-registry` 0.3.1. Contrato `efeonce.surface-composition` 0.1.2 con los deltas (b)…(l)
del ADR de AXIS. La serie completa está en [ledger.md](ledger.md).

**Publicado el 2026-09-28 (tag `v0.4.0`, AXIS `25b5ecf` + `4760e3e` en `main`):** `axis-brand-assets` **0.4.0** con la
marca de Insights y el tipo `lockup` (25 SVG sellados). Antes, el mismo día, `v0.9.0` publicó `axis-brand-assets` 0.3.6
(volumen `mano`). Greenhouse sigue en 0.3.5.

**Publicado el 2026-09-29 (tag `v0.3.30`, AXIS `main` `26097c5`, verificado en el registro):** `axis-tokens` 0.3.30,
`axis-ui-contracts` 0.3.30, `axis-graphic-line` 0.12.0, `axis-brand-assets` 0.4.3 y `axis-ui-registry` 0.3.2 (el
Efeonce AI Visibility Report y la medida con gravedad). `develop` de Greenhouse sigue en tokens y contracts 0.3.29,
graphic-line 0.11.0, brand-assets 0.4.1 y registry 0.3.1; la adopción va con TASK-1938.

**Publicado el 2026-09-29 (tag `v0.3.38`, AXIS `main` `c92160b`, verificado en el registro):** `axis-tokens` 0.3.38
(`efeonceEmail`, `trajectory.measure.travelledPath`), `axis-ui-contracts` 0.3.38 (`efeonce.email-modules` 0.1.0 y la
órbita 0.5.0), `axis-graphic-line` 0.13.0, `axis-brand-assets` 0.4.6 y `axis-ui-registry` 0.3.3. Greenhouse fija
todavía `axis-tokens` y `axis-ui-contracts` 0.3.37, `axis-graphic-line` 0.11.0, `axis-brand-assets` 0.4.5 y
`axis-ui-registry` 0.3.1 (`package.json`, 2026-09-29).

**Fuentes de la composición del deck (TASK-1927 y TASK-1928, verificado 2026-09-28):** tasks
`docs/tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md` y
`docs/tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md`; código
`src/lib/brand-surfaces/recipes/` (`deck.ts`, `frame.ts`, `proposal-service.ts`, `method.ts`, `close.ts`, `proof.ts`,
`sections.ts`, `content.ts`, `kit.ts`), `src/lib/brand-surfaces/{index,document,types}.ts`,
`scripts/brand-surfaces/compose.ts` y `src/lib/artifact-composer/catalogs/graphic-line-deck/{index.ts,registry.json,recipe-map.json}`
(+ `graphic-line-shared/{resolvers,rendered-audit}.ts`); ejemplos `src/lib/brand-surfaces/examples/deck-*-intent.json`,
`deck-brochure-document.json` y `deck-proposal-document.json`; deltas del gate en
`scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`; recetas por lámina en
`docs/operations/brand-graphic-line/deck-recipes/`. Siguientes: TASK-1921 (ruta productiva, `in-progress` en otra
sesión), TASK-1926 (plates idempotentes) y TASK-1929…1932 (plan validado, datos reales, banco de plates, Proposal
Studio).

**Archivos que usa el deck compuesto** (los ejemplos de `src/lib/brand-surfaces/examples/deck-*.json` los referencian;
todos existían en disco el 2026-09-28):

| Qué | Dónde | Nota |
|---|---|---|
| Plates de foto (cine y documental) | `ai-generations/<fecha>_<tema>/plates/*.png` — p. ej. `2026-09-27_brochure/plates/BR1b-portada-orbita-isotipo.png`, `BR2b-…`, `BR3-contra-horizonte.png`, `BR4-contra-amanecer.png`; `2026-09-26_deck-nexa/plates/NX6b-nexa-cinco-orbitas-isotipo.png`, `NX5b-…`; `2026-09-26_deck-{creativo,web,revops,aeo,hibrido,triptico-v2,mosaico-documental,web-motion}/plates/`; `2026-09-27_{portadas-lineas,secciones-partidas,quienes-somos}/plates/`; `2026-09-26_web-hero/plates/H1b-estratega-uniforme.png` | sin versionar en git (carpeta de producción local); sin el archivo el CLI falla: `pnpm ai-gen:where` + `pnpm ai-gen:pull`, nunca regenerarlo. `P1-deck-lente-edicion.png` aparece en cuatro ejemplos: es de muestra, no se repite en un deck real. Banco gobernado: TASK-1931 |
| Logo e isotipo de Efeonce, burbujas URL | `graphic-line-deck/assets/` (`efeonce-logo-negative.svg`, `efeonce-isotype-negative.svg`, `url-bubble-baked-{dark,light}.svg`, `url-bubble-source.svg`) | copiados byte a byte desde `@efeoncepro/axis-brand-assets` por `pnpm brand:tokens`; nunca se editan |
| Logos de clientes | `src/lib/artifact-composer/catalogs/deck-axis/assets/clients/*.svg` (`sky.svg`, `sky-on-dark.svg`, `aguas-andinas.svg`, `universidad-temuco.svg`, `carozzi.svg`, `berel.svg`, `anam.svg`…) | sólo de quienes autorizan su uso; el compositor los normaliza (asset `logo`) |
| Logos de partners | `public/images/logos/partners/*` (HubSpot, Salesforce, Google Cloud, AWS, Microsoft, OpenAI, Claude, Adobe, BytePlus) | normalizados al componer |
| Isotipos de herramientas y fotos del squad | `deck-axis/assets/tools/*-isotype.svg`, `deck-axis/assets/squad/squad-*.png`, `deck-axis/assets/product/greenhouse-seo-dashboard.png`, `public/images/greenhouse/SVG/negative-isotipo-green.svg` | leídos del catálogo `deck-axis` como archivo; la lámina de La órbita no los copia |
| Isotipo sobre la ropa en los plates | lo trae la referencia del kit de la prenda en la ficha (`objetos`); `foto:isotipo --acabado` desde `@efeoncepro/axis-brand-assets` sólo si `pnpm foto:emblema` difiere. Varias recetas cine aprobadas llevan el isotipo compuesto plano: sirven como receta de luz y escena, no de bordado (casebook cine, falla 8) | abierto: procedencia sin registrar en algunos plates (`pnpm foto:emblema` antes de publicar) |

El `axis-graphic-line` lo usa sólo `src/lib/brand-surfaces` (`paintGraphicLine`, `resolveIcon`) para los catálogos del
Artifact Composer; las piezas de campaña siguen con el adapter propio raster-safe. Fuera de esa ruta, los SVG de
íconos salen de `pnpm icons:export` en AXIS o del Lab.
