# TASK-1990 — Efeonce Insights: contrato de la tarjeta de cifra con canal (plataformas, glifo por métrica y tablero de un canal)

## Delta 2026-10-03 — trabajo en curso detectado en el árbol compartido

- Al crear esta task, el árbol compartido tenía cambios **sin commitear** de otra sesión en
  `src/lib/efeonce-insights/presentation/stat-card.ts` (`StatPlatform`, `statPlatformOf` por `source`/`channelId`,
  `statBoardChannelsOf` con isotipos en el título o por celda), `contracts/web-model.ts`, `sharing/web-model.ts`,
  `render/figure-slots.ts` y `src/lib/copy/insights.ts`. Es parte del alcance de los Slices 2 y 3. Quien tome esta task
  parte de ese trabajo una vez commiteado (o de su dueña, si queda dentro de TASK-1975), no lo reimplementa: verifica
  qué está hecho, tilda lo que la evidencia respalde y completa lo que falte (validación del plan, `metricIcon`,
  vocabulario de 19 plataformas, `channelForDomain`, visitas por asistente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Diseño; tarjetas con isotipo de canal e inventario aprobados por el operador el 2026-10-03`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1974` (su contrato de tarjeta de cifra está en develop sin release; esta task lo extiende y sale en el mismo release o después)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El operador aprobó el 2026-10-03 la tarjeta de cifra con isotipo de canal y su inventario (canvas
<https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>, tableros `Premium-Cifras-Canal`, `Deck-Cifras-Canal`,
`Cifras-Canal-Norma` y `Cifras-Canal-Inventario`), y AXIS ya fijó su contrato `efeonce.insights-stat-card` 0.2.0
(commit local `beb7f25`, sin publicar). Esta task lleva ese contrato al plan y al modelo web de Insights: amplía el
vocabulario de canales a las plataformas del inventario, agrega a cada cifra su canal, su línea de contexto o su glifo
Trazo, decide cuándo el canal va una vez en el título del tablero y suma la regla de tarjetas por asistente de GA4
como alternativa a la dona. Es la fundación que consumen los adaptadores nuevos (TASK-1991, TASK-1992, TASK-1994) y el
render (TASK-1996).

## Why This Task Exists

Hoy la tarjeta de cifra (TASK-1974) sólo conoce un nombre, un hecho y su comparación (`PlanStatItemV1` en
`src/lib/efeonce-insights/contracts/plan.ts`); el ícono de la métrica lo elige el mapper con un mapa fijo de 8
métricas (`METRIC_ICON` en `src/lib/efeonce-insights/render/figure-slots.ts`) y el canal no viaja a la tarjeta. El
vocabulario de canales (`INSIGHT_CHANNEL_IDS` en `src/lib/efeonce-insights/contracts/channels.ts`) tiene 6 valores
(`google`, `google_ai_overview`, `chatgpt`, `gemini`, `claude`, `perplexity`), pero el inventario aprobado necesita
además Search Console, Google Analytics, Google Ads, Bing, YouTube, Reddit, Wikipedia, LinkedIn, Instagram, TikTok,
Meta, Frame.io y Greenhouse. Sin este contrato, cada adaptador nuevo inventaría su propia forma de decir «esta cifra
es de ChatGPT» y el render tendría que deducirlo, contra la regla de que Think y los catálogos sólo dibujan lo que el
plan decide (arquitectura §15, modelo web 1.3).

## Goal

- Cada cifra del plan declara, de forma excluyente, su canal (`channel` + `context`) o su glifo Trazo (`metricIcon`),
  con las mismas reglas que fallan cerradas en AXIS 0.2.0.
- Un tablero cuyas cifras son todas de una plataforma lleva el canal una vez en el título (Search Console en SEO,
  Greenhouse en ICO, Search Console y Google Analytics en las visitas orgánicas), nunca repetido en cada celda.
- El vocabulario de canales cubre las 19 plataformas de `efeonceInsights.statCard.channel.platforms` y mapea dominios
  citados o que rankean (youtube.com, reddit.com, wikipedia.org, linkedin.com) a su plataforma.
- El modelo web sube a 1.5 de forma aditiva; PDF, deck y Think leen la misma resolución (`statItemView`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§6.4 AXIS como casa del sistema de diseño, §14.12, §15)
- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` (§5.1 anatomía, §5.2 norma, §11 propuesta de
  tarjetas con isotipo, que esta task pasa a vigente)
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`
- `.claude/rules/efeonce-insights.md` y la skill `efeonce-insights`
- AXIS (repo hermano `axis-design-system`): `docs/agent-composition/insights.md` §«Tarjeta con isotipo de canal»,
  `packages/contracts/src/insights-stat-card.ts` (0.2.0) y `packages/tokens/src/tokens.ts`
  (`efeonceInsights.statCard.channel`)

Reglas obligatorias:

- El canal sale del hecho sellado: su `channelId` (TASK-1888) o la fuente que declara su `source` (Search Console, GA4,
  motor ICO = Greenhouse); el plan lo copia, nunca lo infiere del nombre ni del texto.
- Isotipo y glifo Trazo son excluyentes en una celda; con canal, la celda se nombra por el canal y la métrica va en
  `context` (códigos AXIS `channel-and-metric-icon`, `channel-label-must-be-name`, `context-without-channel`).
- Si todas las cifras del tablero son de una plataforma, el canal va en el título y no en las celdas
  (`channel-single-platform-belongs-in-title`, `channel-in-title-and-cell`).
- Un canal sin isotipo conocido se queda con su nombre; nunca un isotipo aproximado.
- Notion no es canal: ICO lo mide Greenhouse.
- Contratos browser-safe; ningún valor de diseño (px, color) entra al plan: esos viven en AXIS.

## Normative Docs

- `docs/tasks/in-progress/TASK-1974-efeonce-insights-figure-selection-planner.md`
- `docs/tasks/in-progress/TASK-1975-efeonce-insights-new-figure-pages.md`
- `docs/ui/visual-directions/TASK-1975-efeonce-insights-stat-card-direction.md`

## Dependencies & Impact

### Depends on

- `TASK-1974`: `PlanStatFigureV1`/`PlanStatItemV1`, `statItemView` (`presentation/stat-card.ts`) y modelo web 1.4.
- AXIS local: contrato `efeonce.insights-stat-card` 0.2.0 y tokens 0.3.42 (commit `beb7f25`), isotipos de
  `@efeoncepro/axis-brand-assets` 0.4.15 (`4f6f2db`) y glifos D30 de `@efeoncepro/axis-graphic-line` (`a7d874a`). Esta
  task no necesita los paquetes publicados: replica los códigos de validación en el dominio y nombra las claves; el
  render (TASK-1996) sí los necesita.

### Blocks / Impacts

- `TASK-1991` (AEO por motor), `TASK-1992` (SEO), `TASK-1994` (ICO): emiten hechos con los canales nuevos y usan
  `metricIcon`.
- `TASK-1996`: render de las tarjetas con canal en PDF, deck y Think.
- `TASK-1958`: la jerarquía apta para cliente consume el mismo modelo web; 1.5 es aditivo.

### Files owned

- `src/lib/efeonce-insights/contracts/channels.ts`
- `src/lib/efeonce-insights/contracts/plan.ts` (`PlanStatItemV1`, `PlanStatFigureV1`)
- `src/lib/efeonce-insights/contracts/web-model.ts` (modelo 1.5)
- `src/lib/efeonce-insights/presentation/stat-card.ts`
- `src/lib/efeonce-insights/editorial/criterion-figures.ts` (`statFigureFor`)
- `src/lib/efeonce-insights/editorial/plan-validation.ts`
- `src/lib/efeonce-insights/presentation/metric-icons.ts` (nuevo: métrica → glifo Trazo)
- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` (§11 pasa a vigente)

## Current Repo State

### Already exists

- Vocabulario de canales y mapeo proveedor del Grader → canal (`channelForAeoProvider`) en
  `src/lib/efeonce-insights/contracts/channels.ts`; `SEO_SEARCH_CHANNEL = 'google'`.
- Tarjeta de cifra en el plan (`chapter.stats`, `PlanStatFigureV1` con `title` e `items`) y su resolución única
  `statItemView` para PDF, deck y web (TASK-1974, modelo web 1.4).
- Ícono por métrica fijo en el mapper: `METRIC_ICON` (8 métricas) en `render/figure-slots.ts` y las claves Tabler
  `FIGURE_ICON_KEYS` en `src/lib/artifact-composer/catalogs/insights-shared/editorial-resolvers.ts`.
- Dona de visitas desde IA por asistente de GA4 (`ai_source.<asistente>`, TASK-1962) elegida por
  `compositionChartsFor`.

### Gap

- `PlanStatItemV1` no tiene `channel`, `context` ni `metricIcon`; `PlanStatFigureV1` no tiene canal de tablero.
- El vocabulario no conoce Search Console, Google Analytics, Google Ads, Bing, las plataformas citadas, las redes,
  Frame.io ni Greenhouse; no hay mapeo dominio → plataforma.
- El ícono de la métrica lo decide el render, no el plan, y usa claves Tabler en vez de glifos Trazo de La órbita.
- No hay regla para mostrar las visitas por asistente como tarjetas con canal.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/contracts`, `presentation` y `editorial` (contratos browser-safe y planner server-side del portal)
- Future candidate home: `domain-package`
- Boundary: el plan y el modelo web de Insights son la única fuente de canal y glifo de cada cifra; PDF, deck y Think los consumen vía `statItemView`
- Server/browser split: contratos y `statItemView` son browser-safe, sin I/O; el planner corre server-side sobre el snapshot sellado
- Build impact: `none` — sin dependencia nueva; las claves de AXIS se nombran como strings y se verifican por test contra la lista del contrato
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `plan editorial congelado (chapter.stats) y modelo web de Insights; channelId sellado en EvidenceFactV1`
- Consumidores afectados: `catálogos insights-report e insights-deck, vista web de Think, lanes app/ecosystem y tools MCP de Insights, agente redactor (TASK-1903)`
- Runtime target: `Vercel (generación) + ops-worker (recurrencias) + Job artifact-worker (render) + efeonce-think`

### Contract surface

- Contrato existente a respetar: `PlanStatFigureV1`, `PlanStatItemV1`, `InsightWebStatItemV1` (modelo 1.4), `INSIGHT_CHANNEL_IDS`
- Contrato nuevo o modificado: `PlanStatItemV1.channel?: { channelId, name }`, `context?`, `metricIcon?`; `PlanStatFigureV1.channel?`; `INSIGHT_CHANNEL_IDS` con 19 plataformas; `channelForDomain(domain)`; modelo web 1.5 con esos campos resueltos
- Backward compatibility: `compatible` — campos opcionales; un plan sellado sin ellos compone igual que hoy y el modelo 1.4 sigue válido para ediciones ya emitidas
- Full API parity: `el canal y el glifo los decide el planner y viajan en el plan y el modelo web que exponen los lanes y el MCP; ningún consumer los deduce`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna tabla; plan_json y web model dentro de greenhouse_insights sin cambio de schema`
- Invariantes que no se pueden romper:
  - una celda lleva canal o glifo, nunca los dos;
  - con canal, `label` es el nombre del canal y la métrica va en `context`; sin canal no hay `context`;
  - un tablero de una sola plataforma declara el canal en el título y ninguna celda lo repite;
  - el canal sólo sale del hecho sellado (`channelId` o `source`); un hecho sin plataforma reconocible produce una celda con glifo;
  - `metricIcon` es una clave del set Trazo publicado (lista cerrada en el dominio, verificada por test contra AXIS);
  - una plataforma sin isotipo conocido viaja con su nombre y sin `channelId` (el render dibuja sólo el nombre).
- Write-target allowlist: `N/A — sin escrituras nuevas`
- Tenant/space boundary: `sin cambio: el plan se arma sobre el snapshot de la organización autorizada`
- Idempotency/concurrency: `determinista: mismo snapshot ⇒ mismo plan (request_hash)`
- Audit/outbox/history: `sin eventos nuevos; el plan sellado es el registro`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — aditivo detrás de INSIGHTS_EDITORIAL_V2_ENABLED (ON); sólo afecta ediciones nuevas`
- Backfill plan: `ninguno; las ediciones selladas no se reescriben`
- Rollback path: `revert del commit + redeploy; los campos opcionales dejan de emitirse`
- External coordination: `release de Greenhouse junto o después de TASK-1974; Think (TASK-1996) lee 1.5 cuando exista`

### Security and access

- Auth/access gate: `sin cambio (insights_v1 + capability insights.* + audiencia)`
- Sensitive data posture: `sin datos nuevos; dominios citados ya pasan el gate client-fit de TASK-1957`
- Error contract: `plan-validation rechaza con código propio (channel_*, metric_icon_invalid); captureWithDomain(err, 'insights', …) sin payload`
- Abuse/rate-limit posture: `N/A — sin superficie nueva`

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/efeonce-insights` (contratos, plan-validation, statItemView, criterion-figures)
- DB/runtime checks: `scripts/insights/preview-edition.ts --editorial-v2 --plan-only` sobre Berel y Sky con el resumen de tableros y canales
- Integration checks: `fixture de modelo web 1.5 consumido por TASK-1996 en Think y catálogos`
- Reliability signals/logs: `rechazos de plan con causa en la generación; sin signal nueva`
- Production verification sequence: `ver Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final. Esta task no crea tablas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Vocabulario de plataformas y dominio → plataforma

- `INSIGHT_CHANNEL_IDS` con las 19 plataformas de `efeonceInsights.statCard.channel.platforms` (mismos ids que AXIS:
  `google_search_console`, `google_analytics`, `google_ads`, `bing`, `youtube`, `reddit`, `wikipedia`, `linkedin`,
  `instagram`, `tiktok`, `meta`, `frameio`, `greenhouse` más los 6 actuales).
- `channelForDomain(domain)`: youtube.com, reddit.com, wikipedia.org (cualquier subdominio de idioma), linkedin.com,
  instagram.com, tiktok.com, facebook.com → plataforma; cualquier otro dominio → sin canal.
- Test que cruza la lista con la de AXIS (copiada en un fixture con su versión) para detectar drift.

### Slice 2 — Cifra con canal o glifo y tablero de una plataforma

- `PlanStatItemV1.channel`, `context`, `metricIcon`; `PlanStatFigureV1.channel`.
- `statFigureFor` decide: tablero mezclado ⇒ canal por celda con `context`; tablero de una plataforma ⇒ canal en el
  título y glifo por celda; hecho sin canal ⇒ glifo.
- `presentation/metric-icons.ts`: métrica → glifo Trazo (búsqueda, medición, keyword, competencia, enlace, web,
  buscador, reloj, checklist, automatizacion, assets, calendario, velocidad, pausa, objetivo), lista cerrada.
- `plan-validation.ts` replica los siete códigos de AXIS 0.2.0 como rechazos del plan.

### Slice 3 — Modelo web 1.5 y resolución única

- `statItemView` resuelve `channel {channelId, name}`, `context`, `metricIcon` y el canal del tablero; modelo web 1.5
  aditivo con fixtures nuevos para Think.
- Títulos de tablero con dos fuentes: visitas orgánicas lleva Search Console y Google Analytics, en ese orden (Search
  Console es la fuente de verdad del tráfico orgánico).

### Slice 4 — Visitas por asistente como tarjetas con canal

- Regla del criterio: las visitas desde IA de GA4 (`ai_source.<asistente>`) se muestran como tarjetas con canal (una
  por asistente con isotipo, «Otros asistentes» sin isotipo) o como dona; la elección sigue el criterio (§4) y queda
  documentada en `EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md`. Un mismo hecho nunca en las dos (`duplicated_fact`).
- §11 del criterio pasa de «propuesta» a vigente, con fecha de aprobación y enlace al canvas.

## Out of Scope

- Hechos nuevos por motor, SEO o ICO (TASK-1991, TASK-1992, TASK-1994).
- Dibujar el isotipo o el glifo en PDF, deck o Think, y actualizar los paquetes de AXIS (TASK-1996).
- Publicar AXIS (push y tag): lo autoriza el operador fuera de esta task.
- Canales de redes y pauta con datos reales (TASK-1995 decide las fuentes).

## Detailed Spec

Reglas de colocación (espejo de `efeonceInsights.statCard.channel.placement`):

| Tablero | Canal | Celdas |
|---|---|---|
| Mezcla de canales (motores, AI Overview, un buscador) | ninguno en el título | isotipo por celda; `label` = nombre del canal; métrica en `context` |
| Una plataforma (Search Console en SEO, Greenhouse en ICO, Google Analytics en asistentes cuando todas son de GA4 y no se pide isotipo por asistente) | una vez en el título | glifo Trazo por celda |
| Cifras sin plataforma (keywords nuevas, competidores, enlaces, salud técnica, visibilidad por URL) | ninguno | glifo Trazo por celda |

`context` es copy de dominio en `src/lib/copy/insights.ts` (`GH_INSIGHTS`), validado con `greenhouse-ux-writing`
(«de las respuestas menciona la marca», «citas con enlace al sitio»). El nombre sigue con un máximo de 3 palabras y
24 caracteres.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. Slice 2 no emite canales que Slice 1 no declaró.
- Los adaptadores nuevos (TASK-1991/1992/1994) no emiten canales nuevos antes de que Slice 1 esté en develop.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Plan que viola una regla de AXIS y el render lo rechaza | render / worker | medium | plan-validation replica los códigos de AXIS y rechaza antes de sellar | rechazo de plan con código `channel_*` |
| Drift entre la lista de plataformas del dominio y la de AXIS | contrato | medium | test contra fixture versionado de AXIS | test rojo en CI |
| Modelo 1.5 rompe Think en producción antes de su release | Think | low | campos aditivos; Think 1.4 ignora lo que no conoce | `verify:insights` en Think |
| Dominio mal mapeado a plataforma | data | low | mapeo cerrado por host exacto o sufijo; test por dominio | revisión de la vista previa |

### Feature flags / cutover

- Sin flag propio: aditivo detrás de `INSIGHTS_EDITORIAL_V2_ENABLED` (ON en staging y Production). Ediciones nuevas
  llevan los campos; las selladas no cambian.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit | < 15 min | si |
| Slice 2 | revert; el plan vuelve a tarjetas sin canal | < 15 min | si |
| Slice 3 | revert; modelo web vuelve a 1.4 | < 15 min | si |
| Slice 4 | revert; las visitas por asistente vuelven a dona | < 15 min | si |

### Production verification sequence

1. Local: tests y `preview-edition --editorial-v2 --plan-only` de Berel y Sky con los tableros y canales esperados.
2. Staging: edición interna; el plan sellado trae canal o glifo en cada cifra.
3. Producción por el control plane, junto o después de TASK-1974; edición interna revisada antes de compartir.

### Out-of-band coordination required

- Ninguna para el contrato. El render (TASK-1996) depende de que el operador autorice publicar AXIS.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `INSIGHT_CHANNEL_IDS` contiene las 19 plataformas de AXIS y un test falla si las listas difieren.
- [ ] `channelForDomain` mapea youtube.com, reddit.com, es.wikipedia.org, linkedin.com, instagram.com, tiktok.com y facebook.com a su plataforma y devuelve `undefined` para cualquier otro dominio (test).
- [ ] Un plan con canal y glifo en la misma celda, canal sin `label` igual al nombre, `context` sin canal, canal en título y celda, o todas las celdas de una plataforma sin canal en el título es rechazado por `plan-validation.ts` (test por cada código).
- [ ] El capítulo SEO de Berel sale con Search Console en el título y glifo por celda; un capítulo ICO sale con Greenhouse en el título (vista previa).
- [ ] El modelo web 1.5 trae `channel`, `context` y `metricIcon` resueltos por `statItemView`; un modelo 1.4 sellado sigue validando (test).
- [ ] El criterio de selección documenta la regla de visitas por asistente como tarjetas o dona y su §11 queda vigente con fecha 2026-10-03.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/efeonce-insights`
- `pnpm test` (suite completa al cierre)
- `scripts/insights/preview-edition.ts --editorial-v2 --plan-only` con Berel y Sky
- `pnpm task:lint --task TASK-1990`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada (ledger, contratos, lecciones) y espejada a `.codex/`.
- [ ] Arquitectura de Insights §15 con el modelo web 1.5 y la regla de canal.

## Follow-ups

- Isotipos de plataformas que aparezcan después (por ejemplo, otros motores de respuesta) entran primero a AXIS y
  después a esta lista.

## Open Questions

- Visitas por asistente: ¿qué gana por defecto cuando las dos explican igual? Propuesta: tarjetas con canal cuando hay
  período anterior (la variación por asistente es la noticia) y dona cuando es el primer período medido.
