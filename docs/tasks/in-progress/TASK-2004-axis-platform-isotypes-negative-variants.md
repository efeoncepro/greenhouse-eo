# TASK-2004 — AXIS: isotipos de plataforma en negativo y Facebook, Threads y Microsoft Advertising en `axis-brand-assets`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-05 — isotipo de X en `axis-brand-assets` 0.4.21 (Claude)

- **Hecho:** isotipo de X y su negativo. Procedencia: `@iconify/json` `simple-icons:x` (CC0, Simple Icons 15.21.0),
  `currentColor` fijado en `#000`; el negativo se deriva con `scripts/platform-negatives.mjs` (`#000` → `#FFFFFF`).
  Ambos sellados. `efeonceInsights.statCard.channel.platforms` suma `x` (paridad con `AXIS_PLATFORM_ASSETS`). El Lab
  sirve las copias y cita 0.4.21.
- **Release:** AXIS `3c8a6dd`, `@efeoncepro/axis-brand-assets` 0.4.21 y `@efeoncepro/axis-tokens` 0.5.2 (tag
  `v0.4.21`, workflow «Release UI packages» run `37300257277` verde). El commit se hizo con índice temporal porque
  había trabajo sin commitear de otra sesión en `packages/tokens/src/tokens.ts` y otros archivos; sólo se llevó la línea
  propia. El test de tokens «AI Visibility Report … source hashes» falla en el árbol de trabajo por ese trabajo ajeno,
  no por este cambio.
- **Consumidor:** Marketing Studio (TASK-2002) lo usa desde `6dddbfa` (`platforms.tsx` y catálogo 0.4.21 en
  `pnpm-workspace.yaml`); X caía a la letra inicial y ahora muestra su isotipo. En producción desde el deploy
  `b53xls9w2`.
- **Pendiente (sin cambio):** isotipo de Microsoft Advertising y logotipo de Metricool en negativo.

## Delta 2026-10-04 — publicado en `axis-brand-assets` 0.4.20 (Claude, a pedido del operador)

- **Hecho:** negativos sellados de Instagram, LinkedIn, Meta, ChatGPT, TikTok y Threads, derivados por
  `packages/brand-assets/scripts/platform-negatives.mjs` con la transformación declarada en `provenance`
  (`variant: 'negative'`, vista previa oscura en el catálogo de logos); Facebook (`logos:facebook`, sin transformar) y
  Threads (`simple-icons:threads`, `currentColor` fijado en `#000`) desde `@iconify/json` 2.2.408, CC0.
  `efeonceInsights.statCard.channel.platforms` suma `facebook` y `threads` (paridad con `AXIS_PLATFORM_ASSETS`);
  `axis-tokens` 0.5.1. Los logos de herramientas ya sellados (HubSpot, Metricool, Notion) también se publicaron.
- **Release:** AXIS `e8f1901` + `8adedef`, tag `v0.4.20` (el tag `v0.4.19` falló antes de publicar porque el Lab
  citaba 0.4.18; no se movió). El mismo tag publicó `axis-ui-primitives` 0.5.0 de otra sesión, con el visto bueno del
  operador.
- **Consumidor:** Marketing Studio (TASK-2002) lo usa desde `0856ee0`.
- **Pendiente:** isotipo de Microsoft Advertising (hoy se usa el de Bing) y logotipo de Metricool en negativo.

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `Publicado en axis-brand-assets 0.4.20 (2026-10-04): negativos de Instagram, LinkedIn, Meta, ChatGPT, TikTok y Threads; Facebook y Threads en color. 0.4.21 (2026-10-05): X en color y en negativo. Pendiente: Microsoft Advertising y el logotipo de Metricool en negativo`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `AXIS main en el repo efeoncepro/axis-design-system (contrato del repositorio AXIS); registro y deltas en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Registrar en `@efeoncepro/axis-brand-assets` las variantes en negativo (blanco, para fondo oscuro) de los isotipos de
Instagram, LinkedIn, Meta, ChatGPT, Threads y TikTok y del logotipo de Metricool, más los isotipos de Facebook, Threads y
Microsoft Advertising que hoy no existen en AXIS, cada uno sellado y con procedencia. El calendario de activaciones de Marketing Studio (TASK-2002) los
consume desde AXIS en vez de copias sueltas en un canvas.

## Why This Task Exists

La dirección visual v3 del calendario (canvas «Efeonce Marketing Studio», páginas v3 y v3.1, 2026-10-04) pinta las
plataformas con sus isotipos oficiales: en color en tema claro y en negativo en tema oscuro, porque Instagram, ChatGPT y
Threads son de un solo color oscuro y no se leen sobre el fondo oscuro de AXIS. El operador aprobó usar el negativo en
vez de una baldosa blanca. AXIS sólo trae la versión en color (`platforms/*-isotype.svg`, `variant: 'color' | 'mono'`)
y no tiene Facebook ni Threads, así que el canvas usa derivados hechos fuera del paquete. Sin registrarlos, cada
consumidor (Studio, Insights, el portal) volvería a derivarlos a mano, con riesgo de versiones distintas.

## Goal

- Las cinco variantes en negativo de plataforma y el logotipo de Metricool en negativo viven en `axis-brand-assets`,
  sellados (`sha256`) y con procedencia declarada (`transformed: true` y la transformación exacta).
- Facebook y Threads quedan registrados como isotipos de plataforma en color, copiados sin transformar desde
  `@iconify/json`, con licencia CC0.
- El tipo de activo distingue el color de la variante para fondo oscuro sin ambigüedad, y el catálogo del Lab y sus tests
  cubren los nuevos archivos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/ui-platform/BRAND_LOGO_IMPORT_RUNBOOK.md`
- AXIS: `docs/ARCHITECTURE.md` y `docs/architecture/LOGO_CATALOG_DECISION_V1.md` (repo `axis-design-system`)

Reglas obligatorias:

- Logos de terceros: uso nominativo; se conserva el archivo y sus colores. Un negativo es una transformación declarada
  (sólo el relleno pasa a `#FFFFFF`, forma y recorte intactos), nunca un archivo «oficial» sin procedencia.
- Los sellos (`platform-manifest.ts`, `tool-logo-manifest.ts`) se generan con `scripts/seal.mjs` y
  `scripts/seal-tool-logos.mjs`; nunca se editan a mano.
- Ninguna ruta del Lab sirve un archivo que no esté byte a byte igual al del paquete (test `brand-assets`).

## Normative Docs

- `docs/tasks/to-do/TASK-2002-marketing-studio-activations-calendar-ui.md` (consumidor; Delta 2026-10-04 «dirección visual v3»)
- Canvas de referencia: https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi (páginas v3 y v3.1)

## Dependencies & Impact

### Depends on

- `axis-design-system/packages/brand-assets/src/index.ts` (`AxisPlatformAsset`, `platformEntry`, `fromLogos`, `ICONIFY_LOGOS`)
- `axis-design-system/packages/brand-assets/src/platform-manifest.ts` y `scripts/seal.mjs`
- `axis-design-system/packages/brand-assets/src/tool-logo-manifest.ts` y `scripts/seal-tool-logos.mjs`
- `@iconify/json` 2.2.408 (sets `logos` y `simple-icons` 15.21.0), ya usado por AXIS como fuente CC0

### Blocks / Impacts

- TASK-2002 (calendario de activaciones): consume los isotipos y negativos desde el paquete.
- TASK-1990 / TASK-1996 (isotipos de canal en Insights): pueden adoptar los negativos para superficies oscuras.
- `greenhouse-eo/src/config/insights-channel-isotypes.test.ts` y `src/lib/efeonce-insights/contracts/channels.ts` leen
  `AXIS_PLATFORM_ASSETS`: un id nuevo no debe romper su paridad.

### Files owned

- `axis-design-system/packages/brand-assets/assets/platforms/{instagram,linkedin,meta,chatgpt,threads,tiktok}-isotype-negative.svg`
- `axis-design-system/packages/brand-assets/assets/platforms/{facebook,threads,microsoft-advertising}-isotype.svg`
- `axis-design-system/packages/brand-assets/assets/tools/metricool-logotype-negative.svg`
- `axis-design-system/packages/brand-assets/src/index.ts` (entradas y tipo)
- `axis-design-system/packages/brand-assets/src/logos.ts` (catálogo y superficie de vista previa)
- `axis-design-system/packages/brand-assets/src/platform-manifest.ts`, `src/tool-logo-manifest.ts` (generados)
- `axis-design-system/packages/brand-assets/src/*.test.ts` afectados

## Current Repo State

### Already exists

- Isotipos en color sellados: `instagram-isotype`, `linkedin-isotype`, `meta-isotype`, `chatgpt-isotype`, `google-isotype`,
  `google-ads-isotype` en `assets/platforms/` (`platform-manifest.ts`).
- `google-ai-overview-mono-isotype`: precedente de una segunda variante del mismo `platform` (`variant: 'mono'`).
- Metricool en `assets/tools/` (`metricool-isotype`, `metricool-logotype`, `metricool-on-black`, `metricool-on-neutral`);
  `logos.ts` marca `metricool-isotype` con vista previa oscura.
- Derivados de referencia (no canónicos) usados en el canvas: reemplazar el relleno por `#FFFFFF`; Meta además quita el
  `linearGradient` de `<defs>`.

### Gap

- No hay variantes en negativo de plataforma ni del logotipo de Metricool.
- No existen `facebook-isotype` ni `threads-isotype` en `platforms/` (Threads sólo como PNG blanco de correo,
  `email/email-social-threads-white.png`).
- `AxisPlatformAsset.variant` (`color | mono`) no expresa «para fondo oscuro»; hay que decidir cómo se nombra.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `axis-design-system/packages/brand-assets` (paquete publicado `@efeoncepro/axis-brand-assets`)
- Future candidate home: `remain-shared`
- Boundary: `AXIS_PLATFORM_ASSETS` y el catálogo de logos de AXIS; consumidores autorizados: Lab AXIS, Greenhouse (Insights, portal), Marketing Studio
- Server/browser split: `n/a — activos estáticos SVG sellados, sin runtime`
- Build impact: `none — SVG nuevos de pocos KB; sellos regenerados por script`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Facebook y Threads en color

- Copiar sin transformar `logos:facebook` y `simple-icons:threads` de `@iconify/json` a `assets/platforms/facebook-isotype.svg`
  y `assets/platforms/threads-isotype.svg`; registrar con `fromLogos` (Facebook) y `platformEntry` con procedencia
  `simple-icons` CC0 (Threads, como Wikipedia).
- Regenerar sellos con `scripts/seal.mjs`; tests del paquete en verde.

- Registrar el isotipo de Microsoft Advertising desde una fuente con licencia verificable (Iconify o el kit oficial de
  Microsoft); si no hay fuente válida, documentarlo y mantener Bing (`bing-isotype`) como marca de la plataforma.

### Slice 2 — Variantes en negativo

- Agregar al tipo una forma explícita de la variante para fondo oscuro (decisión en Open Questions; recomendado
  `variant: 'negative'` con `surface: 'dark'`, alineado con los activos propios positive/negative).
- Crear `*-isotype-negative.svg` de Instagram, LinkedIn, Meta, ChatGPT, Threads y TikTok (en TikTok sólo la forma negra
  pasa a blanco; el cian y el rojo se conservan, como su versión oficial para fondo oscuro) y `tools/metricool-logotype-negative.svg`
  derivando del archivo en color: sólo el relleno pasa a `#FFFFFF`; LinkedIn conserva el «in» calado; Meta pierde el
  degradado. Procedencia con `transformed: true` y la transformación literal.
- Google, Google Ads y Facebook no reciben negativo (se leen en color sobre oscuro); dejarlo documentado.
- Regenerar sellos (`seal.mjs`, `seal-tool-logos.mjs`) y actualizar `logos.ts` para que el catálogo muestre los negativos
  con vista previa oscura.

### Slice 3 — Lab, versión y consumidores

- Lab: la ficha de cada plataforma muestra color y negativo; test `brand-assets` byte a byte en verde.
- Publicar versión menor de `@efeoncepro/axis-brand-assets` según el contrato de release de AXIS.
- Delta en TASK-2002 con los ids publicados; verificar que la paridad de Insights en Greenhouse sigue en verde.

## Out of Scope

- Usar los isotipos en el código de Marketing Studio (lo hace TASK-2002).
- Rediseñar o redibujar cualquier logo; sólo copia o cambio de relleno declarado.
- Isotipos de otras plataformas no pedidas (YouTube, TikTok, etc.) y negativos de herramientas distintas de Metricool.
- Cambiar los isotipos en color existentes.

## Detailed Spec

- Transformación del negativo: reemplazar cada `fill` de color por `#FFFFFF`; quitar `<defs>` sólo si únicamente contenían
  degradados que dejan de usarse. ChatGPT usa `fill="var(--fill-0, black)"`; el negativo lo fija a `#FFFFFF`.
- Procedencia esperada por archivo: `source` = id del isotipo en color de AXIS, `method` = «Cambio de relleno a blanco»,
  `transformed: true`, `transformation` = descripción literal, `retrievedOn` = fecha del cambio.
- Threads en color: `simple-icons:threads` usa `currentColor`; decidir en Discovery si se fija a `#000000` (como el PNG
  oficial) o se registra `mono`. Documentar la decisión.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. El negativo de Threads (Slice 2) necesita el color de Threads (Slice 1); la publicación
  (Slice 3) sólo con los sellos y tests de los Slices 1–2 en verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un id nuevo rompe la paridad de isotipos de Insights en Greenhouse | UI | low | correr `insights-channel-isotypes.test.ts` contra la versión nueva antes de subirla | test rojo en CI de Greenhouse |
| El tipo nuevo de variante rompe consumidores que filtran `variant === 'color'` | UI | medium | auditar consumidores de `AXIS_PLATFORM_ASSETS` en AXIS y Greenhouse antes del cambio | `tsc` o tests rojos |
| Negativo presentado como archivo oficial | N/A (marca) | low | procedencia `transformed: true` obligatoria y visible en el Lab | revisión de catálogo |

### Feature flags / cutover

- Sin flag: activos estáticos aditivos; los consumidores los adoptan al subir de versión.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit en AXIS + regenerar sellos | <10 min | si |
| Slice 2 | revert del commit en AXIS + regenerar sellos | <10 min | si |
| Slice 3 | consumidores fijan la versión anterior del paquete | <15 min | si |

### Production verification sequence

1. Tests del paquete y del Lab en verde en AXIS.
2. Publicar versión menor del paquete.
3. Subir la versión en Greenhouse y correr la paridad de Insights.
4. TASK-2002 consume los ids desde el paquete.

### Out-of-band coordination required

- N/A — cambios en el repo AXIS y su publicación; sin sistemas externos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `facebook-isotype` y `threads-isotype` existen en `AXIS_PLATFORM_ASSETS`, sellados, con procedencia `@iconify/json` y licencia CC0.
- [ ] Existen las variantes en negativo de Instagram, LinkedIn, Meta, ChatGPT, Threads y TikTok, cada una con `transformed: true` y su transformación descrita.
- [ ] `metricool-logotype-negative` existe en el catálogo de herramientas, sellado.
- [ ] Microsoft Advertising tiene isotipo registrado con procedencia, o la task documenta por qué se usa `bing-isotype`.
- [ ] Ningún archivo nuevo contiene `<style>`, `<image>`, `foreignObject` ni animación.
- [ ] El tipo distingue la variante para fondo oscuro sin ambigüedad y los consumidores existentes compilan.
- [ ] El Lab muestra cada plataforma en color y en negativo, y el test `brand-assets` byte a byte pasa.
- [ ] La paridad de isotipos de Insights en Greenhouse sigue en verde con la versión nueva.
- [ ] TASK-2002 tiene un Delta con los ids publicados.

## Verification

- AXIS: `pnpm --filter @efeoncepro/axis-brand-assets build && pnpm --filter @efeoncepro/axis-brand-assets test`
- AXIS Lab: test unitario `apps/lab/src/test/unit/brand-assets.test.ts`
- Greenhouse: `pnpm test src/config/insights-channel-isotypes.test.ts src/lib/efeonce-insights/contracts/channels.test.ts`
- Revisión visual en el Lab de cada par color/negativo sobre claro y oscuro

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] la versión publicada de `@efeoncepro/axis-brand-assets` y sus ids quedaron anotados en TASK-2002

## Follow-ups

- Negativos de otras plataformas cuando un consumidor los necesite (YouTube, TikTok, Reddit).
- Reemplazar en el canvas de Marketing Studio los derivados por los archivos del paquete.

## Delta 2026-10-04

- El operador sumó TikTok Ads, ChatGPT Ads, Microsoft Advertising y DOOH a la vista de pauta del canvas: se agregan el
  negativo de TikTok y el isotipo de Microsoft Advertising (hoy el canvas usa `bing-isotype`). DOOH no tiene marca
  propia: usa un ícono de pantalla hasta definir el DSP (fuera de esta task).

## Open Questions

- ¿Cómo se nombra la variante para fondo oscuro: `variant: 'negative'` + `surface: 'dark'` (recomendado, igual que los
  activos propios) o `variant: 'mono'` con una nota? Lo decide quien toma la task en Discovery con el dueño de AXIS.
- ¿Threads en color se fija a negro (`#000000`) o se registra como `mono`?
