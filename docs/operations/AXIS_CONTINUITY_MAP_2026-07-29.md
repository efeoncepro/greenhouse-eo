# AXIS — Mapa de continuidad ejecutable

> **Tipo de documento:** Diagnóstico de continuidad (no es arquitectura ni decisión)
> **Creado:** 2026-07-29 por Claude (Opus 5)
> **Alcance:** AXIS (design system) × Greenhouse (consumidor/integrador) × Globe (producto comercial consumidor)
> **Método:** verificado contra repos, lockfiles, `node_modules`, Vercel y workflows reales — **no contra la documentación**, que en tres puntos resultó stale.
> **Autoridad:** este documento **no** supersede nada. La decisión vive en
> [`EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1`](../architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md);
> el runbook operativo en [`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1`](./AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).

## Fuente aprobada — producto, scheduler y Growth CTA, 2026-10-05

El operador aprobó visualmente la entrega AXIS y autorizó documentación/skills y push.
[Estado y evidencia](../tasks/in-progress/TASK-2007-axis-product-primitives.md) distingue source,
distribución y adopción. Nuevo `/growth-cta`/CSS y product exports siguen **unreleased** en el
inventario de availability; source aprobado no acredita tarball ni instalación privada. Scheduler
ya tuvo push de fuente independiente; su distribución/adopción tampoco se infiere del push.

AXIS posee presentación portable: banners minimal/spotlight, anillo en eyebrow y esfera al cierre,
énfasis exacto Bricolage400/700, agenda dialog/inline. Growth conserva controller/policy/network,
booking y medición. API y QA dueños están en AXIS `packages/primitives/README.md`, decisiones de
Product/Scheduler/Growth CTA y dossiers `docs/quality/`. Antes de adopción: publicar set compatible,
instalar y comprobar exports/CSS/graphic-line, adaptar renderer compartido y verificar cada host.
Sin cambios de pins, theme, flags, campañas ni hosts en esta entrega. Las tablas históricas siguientes
acreditan únicamente sus cortes fechados; no prueban exports posteriores.

## Actualización — 2026-10-04: primitives y formularios

AXIS `df2de61` / tag `v0.7.2`: release `37239150937` SUCCESS y readback de GitHub Packages confirmado.
Publicados tokens `0.5.0`, contracts `0.6.0`, primitives `0.4.0` y registry `0.7.2`.
Instalaciones privadas nuevas sin React y con React 18.3.1/19.2.7 PASS, incluidos HTML/CSS/SSR y capacidades.
Vercel SUCCESS y readback de Field/Select. Formularios 148/148 locales PASS; CI general `37239148653`
confirmado SUCCESS para el mismo corte. Intentos anteriores fallidos/cancelados conservados en el dossier.
La entrega agrega roles/ramps de La órbita, chips/badges y diez familias de formularios, incluido Select
enriquecido con fallback nativo, foco continuo e iconos de apoyo. El Lab consume los mismos packages.
[Estado, verificación y pendientes](../audits/2026-10-04-axis-forms-release.md) y
[consumo/rollback](AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md) son las fuentes operativas.
No se cambian pins ni runtime de Greenhouse, Globe o Marketing Studio; publicación y adopción son pasos separados.

## Actualización — 2026-10-04: descubrimiento y composición

AXIS incorpora entrada para agentes, búsqueda unificada, catálogos de íconos/logos y tipografía editorial compartida.
El [overview](../documentation/creative/axis-packages-y-lab.md), el
[manual](../manual-de-uso/creative/descubrir-y-componer-con-axis.md) y el
[cierre con evidencia](../audits/2026-10-04-axis-documentation-closure.md) distinguen Lab, checkout, packages
publicados y adapters consumidores. `axis-graphic-line@0.17.0` publicado; nueva API `axis-brand-assets/logos`
en source y Lab, con release pendiente. No se cambiaron pins de consumidores. Las secciones siguientes son
registros fechados, no certifican por sí solas el estado actual de credenciales o despliegues.

## Actualización de cierre — 2026-07-30

La migración Axis descrita por este diagnóstico quedó ejecutada y verificada. Esta actualización supersede
los estados parciales que permanecen más abajo como registro histórico:

- `axis-packages-read-token` está activo únicamente en `efeonce-group`; el secreto legacy fue eliminado de
  `efeonce-globe` después de comprobar que no quedaban referencias runtime.
- El PAT legacy fue revocado. El PAT temporal aprobado para la migración permanece activo como medida
  interina para builds internos/producción; la identidad de máquina sigue siendo el trabajo previo al
  rollout externo.
- El release productivo `30502476429` terminó en `success` sobre
  `41fa94846d0ca18a0f83529dc90cdc2da15a632d`; los workers, HubSpot, Vercel y health checks quedaron verdes.
- Los canaries Playwright usan `playwright-core` con `channel: 'chrome'`. El rollback de
  `globe-studio-internal` y `globe-api-internal` fue ejercitado, verificado al 100% y restaurado.

Para el estado operativo vigente, prevalecen el runbook y este bloque de cierre sobre las tablas históricas
de este mapa.

## Actualización — 2026-08-01: guía visual agent-facing de AXIS

El repo `efeoncepro/axis-design-system` publicó `DESIGN.md` en `main` mediante el commit `0e3c4d6`.
El archivo sigue el formato alpha de Google, pero no se convierte en un segundo SSOT: su frontmatter
estándar se genera desde `packages/tokens`, el repo expone `pnpm design:generate` y `pnpm design:check`,
y CI valida que el documento no derive. Las extensiones que Google aún no modela —multi-brand, modos y
resolución de roles— permanecen en los packages y contratos de AXIS.

La distinción operativa queda así: el `DESIGN.md` raíz de Greenhouse describe el producto MUI/Vuexy; el
`DESIGN.md` del repo AXIS describe la especificación visual portable compartida. Ninguno reemplaza al otro.

## Actualización — 2026-09-14: contrato source-only de selección colaborativa

AXIS añadió en su checkout source el contrato `efeonce.collaboration-selection` `0.2.0` (`candidate`), un
normalizador agent-facing y el primer adapter en Lab. El handoff portable es
`axis.collaboration-selection-composition.v1`: los consumidores enlazan su `target.id` con geometría real y no
copian la implementación visual del Lab. La versión privada publicada continúa en `0.1.5`; por tanto no existe
adopción runtime en Greenhouse, Globe o los compositores hasta completar release, adapter y evidencia de cada
consumer. El runbook de consumo conserva la secuencia autorizada y este mapa no autoriza bump ni promoción.

## Actualización — 2026-09-26: iconografía de La órbita publicada en AXIS

El tag `v0.3.6` de AXIS (PR `efeoncepro/axis-design-system#3`, mergeado) publicó la iconografía canónica de la marca
propia Efeonce: `@efeoncepro/axis-tokens` `0.3.6` (`efeonceGraphicLine.icons`) y `@efeoncepro/axis-graphic-line`
`0.4.0` (subpath `/icons`), con página en el Lab (`/references/iconography/`). AXIS es la fuente de verdad; Greenhouse
sólo la documenta (manual de la línea §14). **No hay adopción runtime en Greenhouse:** `develop` fija `axis-tokens` y
`axis-ui-contracts` en `0.3.5` y no depende de `axis-graphic-line`. El acceso de Actions es por paquete y se conserva
entre versiones; un consumidor nuevo necesita su propio `Read` (runbook, Delta 2026-09-26 (d)). Este mapa no autoriza
el bump.

## Actualización — 2026-09-27: `axis-tokens` 0.3.10 y pines vigentes de Greenhouse

El tag `v0.3.10` de AXIS publicó `@efeoncepro/axis-tokens` `0.3.10`: `efeonceTokens.color.info`, `efeonceTokens.motion`
como alias de `axisMotion.duration` (`standard` 200 ms) y un build que falla si `tokens.css` emite una propiedad con
dos valores. Los pines de la actualización anterior quedaron superados: Greenhouse **sí** depende de
`axis-graphic-line` (`0.6.0`, usado por `src/lib/brand-surfaces`) y fija `axis-tokens` `0.3.8`, `axis-ui-contracts`
`0.3.7`, `axis-brand-assets` `0.3.4` y `axis-ui-registry` `0.3.1` (`package.json`, verificado el 2026-09-27). Subir a
`0.3.10` rompe a propósito el drift test de Greenhouse, porque `efeonceTokens.color` gana `info`; el detalle y el
arreglo están en el runbook, Delta 2026-09-27 (c). Este mapa no autoriza el bump.

**Pines vigentes tras TASK-1927 (mismo día, `package.json`):** `axis-tokens` `0.3.14`, `axis-ui-contracts` `0.3.12`,
`axis-graphic-line` `0.7.0`, `axis-brand-assets` `0.3.5` y `axis-ui-registry` `0.3.1`. Los del párrafo anterior quedan
como historia.

## Actualización — 2026-09-28: serie `v0.3.11`…`v0.3.21` consumida por TASK-1927 y TASK-1928

**Pines vigentes** (`package.json` y `node_modules`, 2026-09-28; en `origin/develop`): `axis-tokens` `0.3.21`,
`axis-ui-contracts` `0.3.19`, `axis-graphic-line` `0.7.0`, `axis-brand-assets` `0.3.5` y `axis-ui-registry` `0.3.1`.
Superan a los de la actualización anterior.

La composición por superficie de «La órbita» consumió once tags seguidos de AXIS, cada uno con `axis-tokens` y
`axis-ui-contracts`: `v0.3.11`, `v0.3.13` y `v0.3.14` (TASK-1927: contrato `efeonce.surface-composition` 0.1.2, tokens
del marco y tipografía de las contraportadas), `v0.3.12` (TASK-1922, Glitch) y `v0.3.15` a `v0.3.21` (TASK-1928: una
familia de recetas del deck por tag, más la portada con selección en `v0.3.21`). Con eso las 69 recetas del deck
componen desde el Artifact Composer. Tabla por tag, transitivos, instalación con credencial efímera (`gh auth token`
dentro de un subshell, nunca impreso) y prueba con el overlay local del build de AXIS: runbook, Delta 2026-09-28 (f) y
Delta 2026-09-27 (e). Tras cada bump corren `pnpm brand:tokens` (y `pnpm glitch:tokens` si cambia `glitchLine`). Spec
técnica del consumidor: [`GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md`](../architecture/GREENHOUSE_BRAND_SURFACE_COMPOSITION_V1.md).
Este mapa no autoriza bumps nuevos.

## Actualización — 2026-09-28 (noche): `v0.3.24`, el Glitch Flash

**Pines vigentes** (`package.json`, commit `53002b352`): `axis-tokens` `0.3.24`, `axis-ui-contracts` `0.3.22`,
`axis-graphic-line` `0.7.0`, `axis-brand-assets` `0.3.5` y `axis-ui-registry` `0.3.1`. Superan a los de la actualización
anterior. El tag `v0.3.24` de AXIS (commit `5b3056f`) agrega `glitchLine.editions` (`weekly` y `flash`) y el contrato
`efeonce.glitch-line` 0.2.0. El Artifact Composer de Greenhouse ya compone el Flash (`24e4c72ee`: seis plantillas
`flash-*` y `pnpm glitch:compose`); la ruta productiva (TASK-1921) todavía no.

**Corrige la regla del párrafo anterior:** tras **todo** bump de `axis-tokens` corren `pnpm brand:tokens` **y**
`pnpm glitch:tokens`, con sus `--check`, sin importar qué parte del token cambió. El bump `53002b352` corrió sólo
`glitch:tokens` y el CI falló en `graphic-line-tokens-sync.test.ts`; arreglo en `609353e83`. Detalle: runbook, Delta
2026-09-28 (g). Este mapa no autoriza bumps nuevos.

## Actualización — 2026-09-29: `v0.3.30`, el AI Visibility Report

**Pines vigentes** (`package.json`, 2026-09-29, bump `2c95e60b2`, tag `v0.3.29` de AXIS): `axis-tokens` `0.3.29`,
`axis-ui-contracts` `0.3.29`, `axis-graphic-line` `0.11.0`, `axis-brand-assets` `0.4.1` y `axis-ui-registry` `0.3.1`.
Superan a los de la actualización anterior. Los tags `v0.3.25` a `v0.3.29` no tienen una actualización propia en este
mapa.

El tag `v0.3.30` de AXIS (`main` `26097c5`, registro verificado) publicó:

- `axis-tokens` `0.3.30`: `aiVisibilityReport` y `efeonceGraphicLine.measureSeverity`.
- `axis-ui-contracts` `0.3.30`: contrato nuevo `efeonce.ai-visibility-report` `0.1.0` (`candidate`) y
  `efeonce.graphic-line-orbit` `0.4.0`.
- `axis-graphic-line` `0.12.0`: `/report`, con `aiVisibilityReportOrbitSvg` y `aiVisibilityReportSeverityColor`.
- `axis-brand-assets` `0.4.3`: órbitas estáticas re-selladas, sin cambio de dibujo.
- `axis-ui-registry` `0.3.2`.

**Greenhouse no lo fija todavía.** Lo adopta TASK-1938 (el PDF del AI Visibility Report). El adapter de la órbita
(`scripts/creative/layout-compiler/graphic-line.mjs`) acepta sólo el contrato `0.3.1`, así que ese bump tiene que llevar
el soporte de `0.4.0`. Detalle en el runbook, Delta 2026-09-29 (h). Este mapa no autoriza el bump.

## Actualización — 2026-09-29 (b): `v0.3.38`, módulos de correo y recorrido de la medida

**Pines vigentes** (`package.json`, 2026-09-29, bump `bacd6a4ea`, tag `v0.3.37` de AXIS): `axis-tokens` `0.3.37`,
`axis-ui-contracts` `0.3.37`, `axis-graphic-line` `0.11.0`, `axis-brand-assets` `0.4.5` y `axis-ui-registry` `0.3.1`.
Superan a los de la actualización anterior: los tags `v0.3.31` a `v0.3.37` (deck Salesforce, firma, sub-líneas Glitch y
Manzanitas) se fijaron sin una actualización propia en este mapa.

El tag `v0.3.38` de AXIS (`main` `c92160b`, registro verificado) publicó:

- `axis-tokens` `0.3.38`: export nuevo `efeonceEmail` (módulos de correo) y `efeonceGraphicLine.trajectory.measure.travelledPath`
  (el recorrido de toda medida, también en `aiVisibilityReport.cover.orbit.travelled`).
- `axis-ui-contracts` `0.3.38`: contrato nuevo `efeonce.email-modules` `0.1.0` (`candidate`) y
  `efeonce.graphic-line-orbit` `0.5.0`.
- `axis-graphic-line` `0.13.0`: el pintor y la portada del AI Visibility Report dibujan el recorrido.
- `axis-brand-assets` `0.4.6`: doce PNG @2x para correo con sello SHA-256 y órbitas estáticas re-selladas.
- `axis-ui-registry` `0.3.3`. Lab `/references/email/`.

**Greenhouse no lo fija todavía.** Lo adoptan TASK-1944 (módulos de correo) y TASK-1938 (PDF del AI Visibility Report),
la que llegue primero. **Hallazgo 2026-09-29:** con los pines vigentes el contrato de la órbita ya es `0.4.0` (entró con
`9289cab0c`, `v0.3.31`), y el adapter `scripts/creative/layout-compiler/graphic-line.mjs` sigue en `0.3.1`:
`node --test scripts/creative/layout-compiler/graphic-line.test.mjs` da 0 de 7. La suite no corre en CI. El bump a
`v0.3.38` tiene que llevar el soporte de `0.5.0` en el mismo commit. Detalle en el runbook, Delta 2026-09-29 (i). Este
mapa no autoriza el bump.

---

## 0. Los cuatro actores, y por qué confundirlos es caro

| Actor | Qué es | Qué NO es | Repo dueño |
|---|---|---|---|
| **AXIS** | El **design system comercial de Efeonce**: tokens, contratos y registry, distribuidos como **paquetes privados versionados**. | No es "el design system de Greenhouse renombrado". No es una biblioteca de componentes. | `efeoncepro/axis-design-system` |
| **Greenhouse** | **Consumidor e integrador**, y además el **control plane documental y de tasks** de todo el ecosistema. | No es el dueño de AXIS. Su implementación MUI/Vuexy **no** viaja en los paquetes. | `efeoncepro/greenhouse-eo` |
| **Globe** | **Producto comercial** que consume AXIS con su propio motor (Tailwind v4 + tokens propios). | No hereda la UI de Greenhouse ni importa MUI/Vuexy (ADR-014). | `efeoncepro/efeonce-globe` |
| **El Lab** | **Fuente de primitives y evidencia**: superficie de exploración y verificación visual del design system. | **NO es producto final** ni superficie de cliente. Que algo exista en el Lab no lo hace promovido. | `axis-design-system-lab` (Vercel) |

La regla que cae de esto y que gobierna todo lo demás: **un contrato compartido no obliga a compartir el
motor de estilos** (Regla 2 del ADR). AXIS distribuye *contratos y tokens*; cada producto materializa su
propio adapter.

---

## 1. Qué está TERMINADO

Todo lo de esta sección está verificado contra artefactos, no contra prosa.

### Distribución y publicación — cerrado

| Hecho | Evidencia verificada |
|---|---|
| Tres paquetes en `0.1.4` | `@efeoncepro/axis-tokens`, `axis-ui-contracts`, `axis-ui-registry` |
| **Publicados de verdad** en GitHub Packages | El lockfile de Globe trae **tarball real + integrity** de `npm.pkg.github.com` — prueba de resolución, no de intención |
| El tag dispara la publicación | `release-packages.yml` corre `on: push: tags: v*.*.*` |
| `v0.1.4` está en `origin` y apunta al HEAD | `v0.1.4` == `10af569` == `HEAD`; repo en `main`, árbol limpio |

### Acceso y credenciales — cerrado (con reloj, ver §7)

- Acceso `Read` de GitHub Actions concedido a `greenhouse-eo` y `efeonce-globe` sobre los tres paquetes.
- Secreto `axis-packages-read-token` en Secret Manager de `efeonce-group`; el secreto legacy de
  `efeonce-globe` fue eliminado tras la migración y el PAT legacy fue revocado.
- Vercel `NPM_RC` en `axis-design-system-lab` (Production + Preview).

### Consumo — cerrado como piloto opt-in en LOS DOS runtimes

| | Greenhouse | Globe |
|---|---|---|
| Declara `0.1.4` | `package.json` raíz | `apps/studio-client/package.json` |
| Instalado | ✅ `node_modules/@efeoncepro/*` | ✅ `apps/studio-client/node_modules/@efeoncepro/*` |
| Superficie del piloto | `/design-system/axis-adapters` | `/_axis-pilot` |
| Adapters | MUI/Vuexy | Tailwind + token classes (`AxisStatus`, `AxisProgress`) |
| Auth en CI | ✅ **10 workflows** con `npm.pkg.github.com` | ✅ `ci.yml` materializa `GITHUB_TOKEN` con `trap 'rm -f .npmrc' EXIT` |

### Cloud Build de Globe — **PROBADO EN PRODUCCIÓN, contra lo que dice el runbook**

Esta es la corrección más importante del diagnóstico. El runbook y `TASK-1591` declaran que *«falta ejecutar
una corrida real de CI/Cloud Build»*. **Para Cloud Build ya no falta.**

El primer deploy con paquetes privados **falló** (`ERR_PNPM_FETCH_404`, run 30438182204) porque
`--mount=type=secret` es **por-RUN** y `pnpm deploy --legacy --prod` re-resuelve dependencias en un RUN
posterior sin `.npmrc`. Se corrigió montando el secreto en el segundo RUN, y **el deploy posterior quedó
verde y verificado en Cloud Run**. Desde entonces, **cuatro deploys más** el 2026-07-29 pasaron por ese mismo
Dockerfile (`68a2cbe`, `d009871`, `b9112a8`, `403d346`; revisión viva `00101-x2d`).

> **La lección que quedó y que hay que conservar:** la distribución de paquetes privados **no queda probada al
> publicarlos ni al instalarlos en local — se prueba en la primera imagen de producción que los consume.**

---

## 2. Qué estaba PARCIALMENTE implementado

La tabla siguiente conserva el diagnóstico histórico del 2026-07-29. Los gates P1–P3 fueron cerrados por
el release productivo `30502476429`; no deben tratarse como pendientes actuales.

| # | Qué | Estado real | Por qué no está cerrado |
|---|---|---|---|
| **P1** | Corrida real de **GitHub Actions** con install de AXIS | ✅ **CERRADO** | CI, deep verification y Playwright smoke pasaron como precondiciones del release productivo. |
| **P2** | Verificación de **digest desplegado** | ✅ **CERRADO** | Las revisiones productivas y sus imágenes quedaron verificadas por el release control plane. |
| **P3** | **Rollback probado** | ✅ **CERRADO** | Rollback interno de Studio y API ejercitado al 100% y restaurado correctamente. |
| **P4** | Promoción del **registry a `stable`** | ❌ bloqueado por diseño | El ADR es explícito: *«`TASK-1485` pasa a ser consumer/piloto de la plataforma compartida y **debe actualizarse antes de promover el registry como estable**»*. |
| **P5** | `TASK-1485` (motor de estilos + governance de Globe) | `to-do`, **desbloqueada** | Ver §6: su `Blocked by` está stale. |
| **P6** | `TASK-1552` Slice 3 | `in-progress` | Estados de ejecución y evidencia premium del composer. Consume el motor que gobierna `TASK-1485`. |

---

## 2-bis. Hueco que este mapa NO cubrió, y que apareció después (2026-07-29, `e3f3e667a`)

**Los tres Cloud Run workers de Greenhouse construían con `401 Unauthorized` sobre `@efeoncepro/axis-tokens`.**

Este diagnóstico verificó, para Greenhouse, **GitHub Actions** (10 workflows con wiring) y **Vercel**
(`NPM_RC` en tres entornos) — y **no verificó su Cloud Build**. Greenhouse tiene un tercer carril de build que
no es ninguno de esos dos: `services/{ops-worker,ico-batch,commercial-cost-worker}`, cada uno con su
`Dockerfile` + `deploy.sh`. Ahí faltaba la auth.

> **La lección de método, que vale más que el arreglo:** "el consumidor tiene la auth" no es una respuesta
> hasta que se enumeran **todos** sus carriles de build. Greenhouse tiene tres (Actions, Vercel, Cloud Build);
> comprobar dos y concluir da un verde que no existe.

Corregido aplicando el patrón canónico de Globe —Secret Manager + BuildKit `--mount=type=secret`, sin token en
imagen, logs ni runtime— **en los dos RUN de cada Dockerfile**, que es donde el primer deploy de Globe se
había estrellado (`--mount=type=secret` es por-RUN y `pnpm deploy --prod` re-resuelve después). Incluye
extensión del `worker-build-contract-gate` con su test.

### ⚠️ Acoplamiento cross-proyecto: deliberado, temporal, y con condición de retiro

Para habilitarlo se concedió `roles/secretmanager.secretAccessor` **sobre ese único secreto** al SA de Cloud
Build de Greenhouse:

```
axis-packages-read-token  (histórico: vivía en GCP efeonce-globe; hoy vive en efeonce-group)
  ├── 818083690953-compute@  ← Cloud Build de Globe        (preexistente)
  └── 183008134038-compute@  ← Cloud Build de Greenhouse   (agregado 2026-07-29)
```

**Se decidió NO duplicar el secreto.** Dos copias son dos rotaciones, y con el PAT venciendo el 2026-08-27 la
segunda es la que alguien olvida.

**Pero hay que verlo por lo que es:** `axis-packages-read-token` es una credencial **del ecosistema AXIS**
archivada en el proyecto de un **producto**, porque ese producto la necesitó primero. La consecuencia es que
**los builds de Greenhouse dependen hoy del proyecto GCP de Globe** — lo que invierte la dirección de
gobierno, ya que Greenhouse gobierna a Globe.

🔴 **Condición de retiro — y es una DECISIÓN, no un vencimiento automático.** Al reemplazar el PAT por la
identidad de máquina (requisito previo a rollout externo, §7), el secreto nuevo **debe nacer fuera del
proyecto de un producto**. Si simplemente se recrea en `efeonce-globe`, **el acoplamiento se reinstala en
silencio y nadie lo nota**, porque todo sigue funcionando. Es el único momento en que retirarlo cuesta cero.

---

## 3. Qué falta en GREENHOUSE

| Falta | Archivo / superficie | Nota |
|---|---|---|
| **Actualizar `TASK-1485`** al rol que el ADR le asigna | `docs/tasks/to-do/TASK-1485-*.md` | El ADR lo exige **antes** de promover el registry. Hoy la task no refleja que es consumer de la plataforma compartida. |
| **Corregir el `Blocked by` stale** | misma task | Declara `TASK-1455`, que está **`complete`**. |
| **Sincronizar el runbook** con la realidad | `AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` | Tres puntos stale, ver §7. |
| **Reemplazar el PAT por identidad de máquina** | operación, no código | Es el único ítem con fecha. Ver §7. |

**No falta** (verificado, y el runbook no lo dice): `NPM_RC` **sí existe** en el proyecto Vercel de
`greenhouse-eo`, para `staging`, `Production` y `Preview (develop)`. El runbook solo menciona el proyecto del
Lab.

---

## 4. Qué falta en GLOBE

| Falta | Archivo / superficie | Nota |
|---|---|---|
| **Promoción de los adapters a superficie de producto** | `apps/studio-client/src/primitives/index.tsx` | Hoy `AxisStatus`/`AxisProgress` viven en el piloto opt-in `/_axis-pilot`. Promoverlos es decisión separada del piloto. |
| **Cerrar `TASK-1552` Slice 3** | composer | Único slice abierto de la superficie que más consume el motor. |
| **Higiene del store de paquetes** | `node_modules/.pnpm/` | Conviven `0.1.3` **y** `0.1.4`. No rompe nada hoy, pero un consumer que resuelva la vieja no daría error. |
| **Rama WIP sin cerrar** | `task/TASK-1552-slice0-internalizar-css` | Congelada con partes a revertir según el propio `TASK-1552`. Decidir si se retira o se retoma. |

---

## 5. Dependencias entre los tres

```
AXIS (axis-design-system)
  │  publica @efeoncepro/axis-{tokens,ui-contracts,ui-registry} 0.1.5
  │  ⇩ tag v*.*.* → release-packages.yml → GitHub Packages (privado)
  │
  ├─► GREENHOUSE ── consume vía package.json raíz + adapters MUI/Vuexy
  │     │            auth: GITHUB_TOKEN en Actions · NPM_RC en Vercel
  │     │
  │     └─► gobierna a Globe (tasks, ADRs, doc) ── NO le presta su motor
  │
  └─► GLOBE ─────── consume vía apps/studio-client + adapters Tailwind
        auth: GITHUB_TOKEN en Actions · axis-packages-read-token en Cloud Build
```

**Dependencias duras:**

1. **Promover el registry a `stable`** ⟵ requiere **`TASK-1485` actualizada** (exigencia explícita del ADR).
2. **Rollout externo/comercial** ⟵ requiere **identidad de máquina** en lugar del PAT (§7) **y** `TASK-1480`,
   que hoy tiene conditional-go solo para el primer **Commercial Production Sprint managed**; el
   SaaS/client-runtime externo **sigue gated**.
3. **`TASK-1552` Slice 3** ⟵ consume el motor de estilos cuyo contrato gobierna **`TASK-1485`**. Avanzar el
   composer sin cerrar la governance deja el motor sin dueño formal mientras se le agregan consumers.
4. **Cualquier bump de versión AXIS** ⟵ toca **los dos** consumers a la vez (lockfile + adapters). No hay
   canario que lo pruebe cross-repo hoy.

**Dependencia que NO existe, y conviene decirlo:** Globe **no** depende del build de Greenhouse. Son
toolchains independientes; lo único compartido son los paquetes versionados.

---

## 6. Qué task ejecutar PRIMERO

### 🔴 `TASK-1485` — y el hallazgo es que **ya no está bloqueada**

Su cabecera declara `Blocked by: TASK-1455`, pero **`TASK-1455` está `complete`** (*"shell internal-only live
y verificada en Cloud Run"*). El bloqueo es **stale**: la task es ejecutable hoy.

Por qué va primera, en orden de fuerza del argumento:

1. **El ADR la nombra como precondición.** Promover el registry a `stable` está explícitamente condicionado a
   actualizarla. Nada de la cadena comercial avanza sin eso.
2. **Es dueña del motor de estilos de Globe** (ADR-016, incorporado por el Delta 2026-07-27). Hoy
   `TASK-1552` le está agregando consumers a un motor cuya governance está en `to-do` — se acumula superficie
   sobre un contrato sin cerrar.
3. **Es barata comparada con lo que desbloquea.** Su trabajo es contrato y registry, no runtime.

### Segundo: la identidad de máquina del PAT

Es lo único con **fecha de vencimiento** (2026-08-27, ~4 semanas). No bloquea a `TASK-1485`, así que corren en
paralelo — pero **empeora solo**: cuando el token venza, el build rompe y el mensaje de npm miente (dice *«is
not in the npm registry»*, que es falso).

### Tercero: cerrar P1–P3 (corrida CI + digest + rollback)

Son evidencia de promoción, no capacidad. Se cierran juntos en una pasada.

### Lo que **NO** debe ir primero

- **`TASK-1552` Slice 3** — le agrega consumers al motor antes de cerrar su governance.
- **Promover adapters a producto en Globe** — es exactamente lo que el ADR y `TASK-1591` mantienen separado
  del piloto.
- **Bump de versión AXIS** — sin canario cross-repo, un bump hoy se prueba en producción.

---

## 7. Gates que faltan

### Seguridad / credenciales

| Gate | Estado | Detalle |
|---|---|---|
| PAT → identidad de máquina | 🟠 **pendiente para rollout externo** | El token temporal sigue activo para la operación interina. La identidad de máquina continúa siendo el requisito antes de rollout externo. |
| Credencial AXIS en proyecto neutral | ✅ `efeonce-group` | El secreto legacy de `efeonce-globe` fue eliminado y el PAT legacy fue revocado. |
| Secreto nunca en la imagen | ✅ | BuildKit `--mount=type=secret`, montado en **ambos** RUNs desde el fix del Delta. |
| Token nunca en logs ni lockfile | ✅ | `trap 'rm -f .npmrc' EXIT` en Actions. |
| Paquetes privados, no públicos | ✅ | El runbook lo prohíbe explícitamente como atajo. |

### Paquete privado

| Gate | Estado |
|---|---|
| Versiones fijadas (no rangos) | ✅ `"0.1.5"` exacto en los dos consumers |
| Registry scoped `@efeoncepro` | ✅ en CI; **`.npmrc` deliberadamente NO committeado** (llevaría token) — se materializa efímero |
| Canario cross-repo ante un bump | ❌ **no existe** |

### Vercel

| Gate | Estado |
|---|---|
| `NPM_RC` en el Lab | ✅ Production + Preview |
| `NPM_RC` en `greenhouse-eo` | ✅ staging + Production + Preview — **el runbook no lo dice** |
| Globe en Vercel | n/a — Globe corre en Cloud Run, no Vercel |

### CI

| Gate | Estado |
|---|---|
| Wiring en Greenhouse | ✅ 10 workflows |
| Wiring en Globe (`ci.yml`) | ✅ |
| **Corrida real verde con AXIS** | ✅ verificada en CI y release productivo `30502476429` |

### Runtime

| Gate | Estado |
|---|---|
| Cloud Build de Globe con AXIS | ✅ **probado**: 1 fallo + fix + 5 deploys verdes |
| Canario del piloto | ✅ `axis-pilot-canary.test.mjs`, 16 asertos; su leak de proceso se cerró el 2026-07-29 |
| Digest desplegado verificado | ✅ |
| Rollback ejercido con AXIS | ✅ Studio y API internos, restaurados |

---

## 8. Documentación histórica corregida

1. **Runbook** — *«falta ejecutar una corrida real de CI/Cloud Build»*: para **Cloud Build ya se ejecutó**,
   falló, se corrigió y lleva 5 deploys verdes. CI y el release productivo ya quedaron verificados.
2. El runbook mantiene la distinción entre el Lab, que no necesita credencial de registry, y los consumidores
   que usan el secreto de Secret Manager.
3. **`TASK-1485`** — `Blocked by: TASK-1455`, que está `complete`.

> Las referencias de `TASK-1485` se mantienen fuera de este barrido; el estado operativo de la migración Axis
> queda cerrado en el bloque de cierre y en el runbook.

---

## 9. Handoff — para arrancar sin releer nada

**Estado de partida histórico (2026-07-29):**

- AXIS `0.1.4` publicado y consumido por los dos productos como **piloto opt-in verificado**.
- Globe: `main` limpio, revisión viva `globe-studio-internal-00101-x2d` sirviendo `403d3464e88e`.
- Greenhouse: `develop` pusheado y sincronizado. **El release develop→main ya se completó — no repetirlo.**
- Rama abierta en Globe: `task/TASK-1552-slice0-internalizar-css` (WIP congelado, decidir retiro).

**Siguiente paso recomendado, concreto:**

> Abrir **`TASK-1485`**. Primer movimiento: corregir su `Blocked by` (stale) y actualizarla al rol que el ADR
> le asigna — **consumer/piloto de la plataforma compartida**, dueña del motor de estilos de Globe (ADR-016) y
> **precondición declarada para promover el registry a `stable`**. Recargar la skill
> `greenhouse-task-planner` completa antes de editarla; el cierre exige `pnpm task:lint --task TASK-1485` en
> `errors=0 warnings=0`.

**Verificaciones que ya no están pendientes:**

```bash
gh run list --repo efeoncepro/efeonce-globe  --workflow=ci.yml --limit 5
gh run list --repo efeoncepro/greenhouse-eo  --workflow=ci.yml --limit 5
```

El release `30502476429` dejó CI, smoke, workers, HubSpot, Vercel y health checks en verde.

**Lo que NO hay que hacer todavía:** promover adapters a superficie de producto, bumpear la versión de AXIS,
avanzar `TASK-1552` Slice 3, ni tocar el release develop→main.
