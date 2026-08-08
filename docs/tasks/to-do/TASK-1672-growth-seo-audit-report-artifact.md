# TASK-1672 — Growth SEO: artefacto de la auditoría técnica (web + print)

## Delta 2026-08-08 — TASK-1309 cerrada

`TASK-1309` (Auditoría del sitio, `/admin/growth/seo/audit`) pasó a `complete`: suite completa en
10377/0, `pnpm build` de producción verde, `ui:quality` PASS 4.63. Lo que esta task da por existente
de 1309 —`groupAuditIssues`, las fichas es-CL de los checks con su drift test, `readSiteAuditReport`
con `run`/`findings`/`totals`/`previous`— **ya está en `develop` y verificado con datos reales de
Grupo Berel**, no es supuesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1672-growth-seo-audit-report-artifact.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui`
- Blocked by: `TASK-1670`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El diagnóstico técnico deja de morir en la pantalla: se convierte en un **documento** con dos
densidades (portada ejecutiva de una plana + detalle completo), renderizable en web e
imprimible, que **operador y cliente** pueden generar. Reusa `ReportArtifactModel` y el par
`web/`+`print/` que TASK-1310 ya construyó para el informe de visibilidad.

## Why This Task Exists

El site audit es **material de conversación de SOW** (arch §11), pero hoy termina en
`/admin/growth/seo/audit`: para llevarlo a una propuesta hay que copiar 91 URLs a mano.

Y el escenario real no es que el cliente arregle: **el cliente reenvía a una agencia** —seamos
nosotros u otra—. Eso define dos lectores con trabajos distintos: quien DECIDE necesita magnitud
y urgencia; quien EJECUTA necesita la lista y el orden. Un documento que sirva a los dos, o dos
que se desincronizan: se elige lo primero, con dos densidades.

Se hace **después de TASK-1670** por una razón dura: un artefacto con nuestro nombre que declara
sano un sitio invisible para los motores de IA es peor que no tener artefacto.

## Goal

- Un documento que **sobrevive fuera de Greenhouse**: se lee tres semanas después, reenviado,
  sin nosotros al lado y sin perder la procedencia de sus datos.
- Un solo modelo con `variant`, no dos documentos.
- Client-safe por construcción, verificado por test de no-fuga.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/ui/wireframes/TASK-1672-growth-seo-audit-report-artifact.md` — el contrato de diseño.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §6 (degradación honesta),
  §10.6 (superficie de auditoría), §11 (el audit como material de pitch).
- `src/components/growth/seo/report-artifact/` (TASK-1310) — el patrón `ReportArtifactModel` +
  `modelFromSeoReport(input, variant)` + adaptadores `web/` y `print/`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- 🔴 **Client-safe por construcción**: el documento NUNCA incluye `provider_cost_usd`, tier ni
  cupo del entitlement, `provider_task_id`, ni los ids de máquina de los checks. Test de no-fuga
  obligatorio, espejando el que 1310 ya tiene.
- 🔴 **La procedencia viaja CON el dato.** En pantalla es contexto; en un PDF reenviado es lo
  único que impide que nos citen mal: qué mide el puntaje (del proveedor), qué es estimación
  nuestra (el esfuerzo) y qué es laboratorio (la carga).
- **NUNCA** emitir un documento cuando no hay diagnóstico: sin crawl o con crawl en curso, el
  artefacto no se genera. Un informe vacío es peor que ninguno.
- **NUNCA** un tercer render para el PDF: la variante imprimible es `?print=1`, como 1310.
- **NUNCA** interacción dentro del documento (filtros, drill). Es de lectura.
- Severidad = icono + palabra + color; tiene que funcionar impreso en blanco y negro.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`
- `docs/ui/wireframes/TASK-1672-growth-seo-audit-report-artifact.md`

## Dependencies & Impact

### Depende de

- `TASK-1670` — hallazgos de sitio (crawlers IA, JSON-LD, sitemap). **Bloqueante**: sin eso el
  documento omite lo más consecuente.
- `TASK-1304` — `readSiteAuditReport` (`complete`).
- `TASK-1309` — `groupAuditIssues` + fichas es-CL de los checks (code complete).
- `TASK-1310` — `ReportArtifactModel` + el par `web/`/`print/` (in-progress).

### Blocks / Impacts

- `TASK-1673` `[por crear]` — compartir y enviar. Sin documento no hay nada que mandar.
- **La 4.ª sección del portal cliente** `[task por crear]` — el cliente ya tiene navegador de
  3 secciones (`Resumen · Evolución · Quadrant`, TASK-1310) y la auditoría entra ahí como cuarta,
  espejando las 4 tabs del operador. **NO** se agrega a TASK-1310: esa task está en su última
  milla de rollout (migración + staging) y meterle una sección nueva le reinicia la verificación.

### Files owned

- `src/components/growth/seo/audit-report/**` — modelo + `web/` + `print/`
- `src/app/(dashboard)/admin/growth/seo/audit/report/page.tsx` — ruta operador
- ruta cliente del artefacto `[definir junto con la task de la 4.ª sección]`
- `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_AUDIT_REPORT`)
- `route-reachability-manifest.ts` (registro de alcanzabilidad de rutas, TASK-982)
- `scripts/frontend/scenarios/growth-seo-audit-report*.scenario.ts`

## Current Repo State

### Already exists

- `src/components/growth/seo/report-artifact/{model,contracts,web,print}` — el patrón a espejar,
  con `variant: 'clientPortal' | 'attachment'` y su test de modelo.
- `readSiteAuditReport` con `run` + `findings` + `totals` + `previous` (TASK-1309).
- `groupAuditIssues` (severidad ▸ alcance × valor ÷ esfuerzo) y `SeoHealthGauge` compartido.
- Gate cliente `growth.seo.report.read_client` scope `own`, ya usado en `/growth/seo`.

### Gap

- No existe artefacto del audit: el diagnóstico sólo vive en la pantalla operador.
- El informe cliente de 1310 **no incluye** la auditoría técnica (verificado): es narrativa de
  visibilidad, otro lector.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/components/growth/seo/audit-report/**` + rutas `(dashboard)`
- Future candidate home: `remain-shared`
- Rationale del candidate home: espeja la ubicación que 1310 eligió para el informe hermano;
  moverlo antes que a su hermano fragmentaría la familia.
- Boundary: consume `readSiteAuditReport` y `groupAuditIssues`; no crea contrato de datos.
- Server/browser split: el modelo es puro; el render web es cliente; la resolución de acceso es
  server en la page.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: dos audiencias, un documento — quien decide y reenvía; quien ejecuta.
- Momento del flujo: fuera de Greenhouse, semanas después, sin contexto.
- Resultado perceptible: entiende la magnitud en una plana y encuentra la lista completa detrás.
- Friccion que reduce: copiar 91 URLs a mano para armar una propuesta.
- No-goals UX: no es plan de ejecución ni cotización; no reemplaza la pantalla operador.

### Surface & system decision

- Surface: `/admin/growth/seo/audit/report` (+ `?print=1`). La entrada del cliente NO es una ruta paralela: el cliente ya tiene su portal SEO (TASK-1310, con navegador de 3 secciones) y la auditoría entra ahí como **cuarta sección**, en task aparte.
- Composition Shell: `aplica` — composición `single`, documento lineal.
- Primitive decision: `reuse` (`ReportArtifactModel`, `web/`+`print/`, `SeoHealthGauge`,
  `GreenhouseChip`) + `new` acotado (`modelFromSeoAuditReport`, portada, hallazgos de sitio).
- Adaptive density / The Seam: `no aplica` — la estructura no cambia en móvil, sólo la densidad.
- Superficies flotantes: ninguna. El documento no abre nada: se lee de arriba abajo.
- Copy source: `GH_GROWTH_SEO_AUDIT_REPORT` + reuso de `GH_GROWTH_SEO_AUDIT`.
- Access impact: `entitlements` — operador `growth.seo.observation.read`; cliente
  `growth.seo.report.read_client` scope `own`.

### State inventory

- Default: documento completo.
- Sin auditoría / crawl en curso: **no se emite documento**.
- Crawl parcial (`degraded`): banner dentro del documento.
- Sitio limpio: "sin hallazgos", que es buena noticia.
- Hallazgo de sitio no verificado: "no pudimos verificarlo: {razón}", jamás "sano".
- Permission denied: lo resuelve la ruta (401/404), no el documento.
- Long content: techo propio de URLs por grupo, con lo omitido declarado.
- Mobile: misma estructura, menor densidad; tabla de URLs pasa a lista.
- Keyboard / focus: único focusable en web es `Imprimir / guardar PDF`; en `?print=1`, ninguno.
- Reduced motion: sin motion que degradar.

### Interaction contract

- Primary interaction: leer. No hay otra.
- Hover / focus / active: sólo el CTA de imprimir.
- Pending / disabled: n/a.
- Escape / click-away: n/a.
- Focus restore: n/a.
- Latency feedback: se renderiza con datos ya materializados.
- Toast / alert behavior: ninguno dentro del documento.

### Motion & microinteractions

- Motion primitive: ninguno.
- Enter / exit, layout morph, stagger: ninguno — es un documento.
- Reduced-motion fallback: no aplica, no hay motion.
- Non-goal motion: cualquier animación. Un informe que se anima al abrirse se lee como marketing.

### Implementation mapping

- Ver `## Implementation Mapping` del wireframe (rutas, primitives, variant, copy, reader,
  capability, client-safe).

### GVC scenario plan

- Ver `## GVC Scenario Plan` del wireframe (scenarios web + print, markers, assertions, 1440+390).

### Design decision log

- Ver `## Design Decision Log` del wireframe (dos densidades en un documento; hallazgos de sitio
  primero; fecha en portada; procedencia obligatoria; sin interacción; estructura estable en
  móvil; PDF por `?print=1`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Modelo + portada + procedencia

- `modelFromSeoAuditReport(input, variant)` sobre `ReportArtifactModel`, espejando 1310.
- Portada: dominio, **fecha del crawl**, salud con su alcance, las tres prioridades.
- Bloque de procedencia (puntaje del proveedor / esfuerzo estimado / carga de laboratorio / as-of).
- Test de no-fuga client-safe.

### Slice 2 — Detalle: hallazgos de sitio + lista + URLs

- Hallazgos de sitio **antes** de la lista, con su estado verificado / no verificado.
- Banda de reparto (estática) + lista priorizada completa reusando `groupAuditIssues`.
- URLs por grupo con techo propio del documento y lo omitido declarado.

### Slice 3 — Rutas, print y acceso

- Ruta operador + `?print=1`; entrada cliente coordinada con 1310, con su gate.
- `route-reachability-manifest` + estados que no emiten documento.

### Slice 4 — GVC + cierre documental

- Scenarios web y print, desktop + 390px; los cuatro gates de UI.

## Out of Scope

- **Compartir y enviar por correo** → `TASK-1673`. Esta task produce el documento; la otra lo mueve.
- Cotizar el trabajo o proponer el *cómo* de cada arreglo: eso es el SOW, no el diagnóstico.
- Cambiar el reader o el scoring.
- Un render propio de PDF (se usa `?print=1`).

## Detailed Spec

El detalle vive en el wireframe. Lo que esta spec fija: **un modelo, un render, la audiencia la
resuelve el `variant`** — exactamente el contrato de `modelFromSeoReport`. Dos documentos
paralelos se desincronizan en la primera iteración, y además obligan a elegir cuál mandar.

Y la decisión que gobierna el orden interno: **los hallazgos de sitio van antes que la lista
priorizada** porque la invalidan. No tiene sentido discutir títulos si el `robots.txt` tiene el
sitio cerrado a los motores de respuesta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 → 4. La ruta (3) no se expone antes de que el documento (1+2) esté completo:
  una ruta viva con un documento a medias es un informe emitido a medias.
- Esta task NO empieza antes de `TASK-1670`: el documento no debe nacer omitiendo los hallazgos
  de sitio.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga de dato interno al cliente (costo, tier, cupo, ids) | entitlements / cliente | medium | Test de no-fuga en el modelo, espejando 1310; `variant` resuelve audiencia | test en CI |
| El documento se cita meses después como vigente | reputación | **high** | Fecha del crawl en portada + bloque de procedencia con as-of | revisión de contenido |
| Se atribuye a nuestro juicio lo que mide el proveedor | reputación | high | Bloque de procedencia obligatorio, con assertion en GVC | GVC |
| Documento enorme (200 URLs × N grupos) impide imprimirlo | UI | medium | Techo propio del documento + lo omitido declarado | GVC print |
| Se emite un informe sin diagnóstico o a medias | data quality | medium | Estados que NO generan documento (sin crawl / en curso) | revisión de código |
| Divergencia visual con el informe hermano de 1310 | UI | medium | Reuso del mismo `ReportArtifactModel` y adaptadores | revisión de código |

### Feature flags / cutover

- Sin flag propio: hereda `GROWTH_SEO_ENABLED` y los gates de capability. La exposición real la
  controla el entitlement per-org, no un flag. Additive: la ruta no existe hasta que se despliega.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (modelo aislado, sin ruta expuesta) | <5 min | si |
| Slice 2 | revert PR | <5 min | si |
| Slice 3 | revert de la ruta + manifest | <5 min | si |
| Slice 4 | sin rollback propio: verifica y documenta, additive y sin impacto de runtime | — | no aplica |

### Production verification sequence

1. Operador genera el informe de Berel y lo mira en web y en `?print=1`.
2. Se verifica que la portada cabe en una plana y que la fecha del crawl se lee de inmediato.
3. Identidad cliente: se comprueba que NO aparece costo, tier, cupo ni ids de máquina.
4. Se imprime a PDF y se lee en blanco y negro: severidades legibles sin color.
5. GVC desktop + 390px, web y print.

### Out-of-band coordination required

- Ninguna que bloquee. La entrada del cliente se resuelve en su propia task (4.ª sección del
  navegador de TASK-1310), después de que este documento exista y su forma esté decidida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout`.
- [ ] Un solo modelo con `variant`; NO existen dos documentos paralelos.
- [ ] La portada cabe en una plana y contiene dominio, **fecha del crawl**, salud con su alcance
      y las tres prioridades.
- [ ] Los hallazgos de sitio se renderizan **antes** de la lista priorizada.
- [ ] Un hallazgo no verificado dice "no pudimos verificarlo" con su razón, nunca "sano".
- [ ] El bloque de procedencia está presente y cubre: puntaje del proveedor, esfuerzo estimado,
      carga de laboratorio y as-of.
- [ ] Test de no-fuga: el documento no contiene `provider_cost_usd`, tier, cupo,
      `provider_task_id` ni ids de máquina de los checks.
- [ ] Sin crawl o con crawl en curso, **no se emite documento**.
- [ ] `?print=1` produce la variante imprimible; no hay un tercer render.
- [ ] Severidad legible impresa en blanco y negro (icono + palabra).
- [ ] El techo de URLs del documento está declarado y lo omitido se dice.
- [ ] Ruta registrada en el manifiesto de alcanzabilidad; gate cliente `growth.seo.report.read_client` `own`.
- [ ] GVC desktop + 390px, web y print, mirado; los cuatro gates de UI en verde.
- [ ] `UI ready` pasa a `yes` sólo cuando `pnpm task:lint --task TASK-1672` queda sin findings.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-seo-audit-report --env=local`
- `pnpm task:lint --task TASK-1672`
- `pnpm ui:wireframe-check --task TASK-1672`
- `pnpm ui:readiness-check --task TASK-1672`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] doc funcional + manual de uso actualizados
- [ ] `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.6 con el artefacto declarado

## Follow-ups

- `TASK-1673` — compartir y enviar (enlace por defecto, adjunto como opción declarada).
- Si el techo de URLs resulta insuficiente para sitios grandes, evaluar un anexo aparte.

## Open Questions

1. **Techo de URLs del documento.** **Techo de URLs del documento.** En pantalla son 200 con scroll interno; impreso, 200 × varios
   grupos es un PDF enorme. Propuesta: 25 por grupo con el resto declarado, y el detalle completo
   sólo en la superficie web.
3. ¿La portada muestra el delta contra el crawl anterior (`previous`, ya disponible)? Suma
   contexto, pero también ruido cuando es el primer crawl. Propuesta: sólo si existe comparación.
