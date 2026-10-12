# TASK-2023 — Contención del cotizador actual: puertas de escritura cerradas

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
- Backend impact: `api`
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `EPIC-053-00 (independiente del resto del programa)`
- Domain: `finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El cotizador del portal (motor V2, `greenhouse_commercial.quotations*`) no se usa para cotizar, pero sigue abierto:
acepta precios, pisos y costos de quien llama, deja marcar una cotización como emitida sin compuerta y publica
borradores en HubSpot como cotizaciones vigentes. Esta task lo deja de **sólo lectura para autoría**: sus rutas de
escritura rechazan con el contrato canónico de errores y la salida a HubSpot se detiene, mientras las copias de
HubSpot y Nubox siguen entrando y toda lectura (lista, detalle, PDF, página pública) sigue funcionando.

## Why This Task Exists

La [auditoría del 2026-10-12](../../audits/commercial/2026-10-12-cotizador-actual-auditoria.md) verificó en código
(hallazgos G-02, G-03, I-01, M-03): tres puertas escriben precios además del comando gobernado y dos de ellas aceptan
de quien llama el precio unitario, el costo y su desglose; `PUT /api/finance/quotes/[id]` escribe cualquiera de seis
estados (incluido `issued`) sin compuerta, sin fecha de emisión, sin auditoría y sin evento; quien cotiza fija su
propio piso y objetivo de margen; un documento emitido se edita en sitio; y la proyección de salida crea la cotización
en HubSpot con publicación inmediata al crear o actualizar un borrador. Ningún flag controla nada de eso.

El CEO aprobó el 2026-10-12 cerrar esas puertas ahora, como contención inmediata e independiente del resto del
programa (decisión 13 de `GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md`). El retiro definitivo del
cotizador actual es la última fase del programa y tiene su propia decisión: aquí no se borra ni se migra nada.

## Goal

- Ninguna ruta, acción de Nexa ni worker puede crear, editar, recalcular, versionar, aprobar, emitir, compartir ni
  aceptar una cotización del cotizador actual mientras el flag de contención esté en su valor por defecto.
- La salida a HubSpot de cotizaciones canónicas queda detenida por un flag propio.
- Las copias entrantes de HubSpot y Nubox, el barrido de vencimiento, el cierre a factura y todas las lecturas siguen
  igual que hoy, con evidencia.
- Reabrir es una sola acción reversible (el flag), documentada por runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` (Accepted; decisión 13 y reglas duras).
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` (§5 D10, §6 «Qué puede hacerse en paralelo»,
  §9 decisión 2).
- `docs/audits/commercial/2026-10-12-cotizador-actual-auditoria.md` y su
  [Anexo A](../../audits/commercial/2026-10-12-cotizador-actual-anexo-a-dominio-api.md) §1.3, §1.5, §1.6 y §4.
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` (modelo del cotizador actual).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (la regla vive en el primitive, no en la pantalla).
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (frontera con HubSpot).

Reglas obligatorias:

- La contención vive en el dominio (`src/lib/commercial/**`) y las rutas sólo la traducen: una acción de Nexa, un
  worker o una ruta futura que llame al mismo primitive también queda cerrada.
- Respuesta de rechazo por `canonicalErrorResponse(code)` (`src/lib/api/canonical-error-response.ts`); nunca
  `NextResponse.json({ error: '...' })` a mano ni prosa en inglés.
- El rechazo ocurre **después** de autenticar y autorizar: quien no tiene sesión sigue recibiendo 401 y quien no
  tiene la capacidad sigue recibiendo 403.
- Sin DDL: esta task no agrega disparadores, `CHECK` ni columnas a `quotations*`. Un disparador de sólo lectura en esas
  tablas rompería las copias de HubSpot y Nubox y el cierre a factura, que escriben las mismas filas.
- No se toca el registro nuevo de V3 ni `src/lib/finance/pricing-v3/**`.
- Flag nuevo registrado en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo cambio, con el runtime donde
  se lee.

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (inventario y runbook multi-runtime).
- `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`.
- `docs/documentation/finance/cotizador.md` y `docs/documentation/finance/cotizaciones-gobernanza.md`.
- `docs/manual-de-uso/comercial/operar-quote-to-cash-comercial.md`.
- CLAUDE.md §«Finance write-path E2E gate» y §«Canonical API error response contract».

## Dependencies & Impact

### Depends on

- Decisión aceptada `GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md`. No depende de ninguna otra task de
  `EPIC-053`: puede ejecutarse antes, durante o después de TASK-2024 y TASK-2025.
- Rutas y primitives existentes (verificados el 2026-10-12): ver la tabla de puertas en `## Detailed Spec`.

### Blocks / Impacts

- Impacta el constructor (`/finance/quotes/new`, `/finance/quotes/[id]/edit`) y el detalle (`/finance/quotes/[id]`):
  sus botones de guardar, emitir, aprobar, versionar y compartir responderán el mensaje de rechazo. No se cambia la
  interfaz en esta task.
- Impacta la acción gobernada de Nexa `author_quote` (`src/lib/nexa/actions/author-quote.ts`), hoy apagada por
  `NEXA_QUOTE_AUTHOR_ACTION_ENABLED`: queda cerrada también por la contención.
- Impacta el re-precio masivo del `commercial-cost-worker` (`src/lib/commercial-cost-worker/quote-reprice-bulk.ts`).
- Impacta `EPIC-029` (Proposal Studio): el vínculo `proposals.quote_id` exige una fila de `quotations`. Con la autoría
  cerrada no nacen cotizaciones nuevas del portal para vincular; las existentes se siguen leyendo. Ver
  `## Open Questions`.
- Tasks abiertas que suponen autoría V2 y quedan sin camino de escritura mientras dure la contención: `TASK-497`,
  `TASK-499`, `TASK-564`, `TASK-620.4`, `TASK-576`, `TASK-627.1`. No se editan desde esta task; la épica las lista.
- No bloquea `TASK-1206`, `TASK-1222` ni `TASK-1223`: operan sobre copias de HubSpot y sobre el cierre a factura.

### Files owned

- `src/lib/commercial/legacy-quoter-containment.ts` y `src/lib/commercial/legacy-quoter-containment.test.ts` (nuevos).
- `src/lib/api/canonical-error-response.ts` (un código nuevo).
- `src/lib/copy/finance.ts` (mensaje es-CL del rechazo, si el contrato de errores lo toma de la capa de textos).
- Rutas de la tabla «Puertas que se cierran» bajo `src/app/api/finance/quotes/**` y
  `src/app/api/public/quote/[quotationId]/[versionNumber]/[token]/accept/route.ts` (sólo la guarda).
- `src/lib/commercial/submit-quote-from-builder.ts`, `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`,
  `src/lib/commercial/governance/versions-store.ts`, `src/lib/commercial/quotation-issue-command.ts` (sólo la guarda).
- `src/lib/hubspot/push-canonical-quote.ts` y `src/lib/sync/projections/quotation-hubspot-outbound.ts`.
- `services/commercial-cost-worker/server.ts` (respuesta honesta del re-precio).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, `docs/documentation/finance/cotizador.md`,
  `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`,
  `docs/manual-de-uso/finance/cotizador-actual-solo-lectura.md` (nuevo).

## Current Repo State

### Already exists

- Comando gobernado `submitQuoteFromBuilder` (`src/lib/commercial/submit-quote-from-builder.ts:917`), llamado por
  `src/app/api/finance/quotes/author/route.ts:58` y por `src/lib/nexa/actions/author-quote.ts:87`.
- Etapa de persistencia `persistQuotationPricing` (`src/lib/finance/pricing/quotation-pricing-orchestrator.ts:432`),
  con cinco sitios de llamada: `src/app/api/finance/quotes/route.ts:525`, `src/app/api/finance/quotes/[id]/lines/route.ts:226`,
  `submit-quote-from-builder.ts:462` y `:799`, y el recálculo en el propio orquestador (`:957`).
- `recalculateQuotationPricing` (`quotation-pricing-orchestrator.ts:738`), llamado por
  `src/app/api/finance/quotes/[id]/route.ts:493`, `src/app/api/finance/quotes/[id]/recalculate/route.ts:48` y
  `src/lib/commercial-cost-worker/quote-reprice-bulk.ts:264`.
- `createNewVersion` (`src/lib/commercial/governance/versions-store.ts:152`) y `requestQuotationIssue`
  (`src/lib/commercial/quotation-issue-command.ts:91`).
- Proyección de salida `quotation_hubspot_outbound` (`src/lib/sync/projections/quotation-hubspot-outbound.ts:22-30`):
  se dispara con `commercial.quotation.created | updated | issued | sent | approved | rejected | version_created` y
  llama a `pushCanonicalQuoteToHubSpot` (`src/lib/hubspot/push-canonical-quote.ts:67`), que crea la cotización en
  HubSpot con `publishImmediately: true`.
- Copias entrantes: `syncCanonicalFinanceQuote` (`src/lib/finance/quotation-canonical-store.ts:963`),
  `sync-hubspot-quotes.ts`, `sync-hubspot-line-items.ts` y las rutas del ops-worker `/hubspot/quotes-sync` y
  `/nubox/quotes-hot-sync`. Emiten `commercial.quotation.synced`, que **no** está entre los disparadores de la salida.
- Contrato canónico de errores con precedentes de puerta cerrada en 409 (`seo_module_disabled`, `aeo_run_disabled`).

### Gap

- Ningún flag ni guarda cubre las puertas de escritura ni la salida a HubSpot (Anexo A §4).
- No existe un inventario mecánico de las rutas que mutan una cotización: una ruta nueva nacería abierta.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/commercial/legacy-quoter-containment.ts`, consumido por rutas en `src/app/api/finance/quotes/` y por dos workers
- Future candidate home: `remain-shared`
- Boundary: `assertLegacyQuoterWriteOpen(door)` e `isLegacyQuoteHubSpotOutboundOpen()`; consumidores autorizados: rutas del cotizador actual, sus comandos de dominio, la proyección de salida y el re-precio del worker
- Server/browser split: módulo `server-only`; la interfaz sólo recibe el cuerpo canónico de error
- Build impact: none; sin dependencias nuevas ni lectura de archivos
- Extraction blocker: la guarda se lee en tres runtimes (Vercel, ops-worker, commercial-cost-worker) y cada uno resuelve su propio entorno

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_commercial.quotations*` (no cambia su forma; cambia quién puede escribirla)
- Consumidores afectados: interfaz del cotizador actual, acción de Nexa `author_quote`, `commercial-cost-worker`,
  proyección de salida a HubSpot
- Runtime target: `staging`, `production`, `ops-worker`, `commercial-cost-worker`

### Contract surface

- Contrato existente a respetar: `canonicalErrorResponse` y `CanonicalErrorCode`
  (`src/lib/api/canonical-error-response.ts`); forma de respuesta de cada ruta cuando la puerta está abierta.
- Contrato nuevo: código `legacy_quoter_read_only` (HTTP 409, `actionable: false`), helper de contención, razón
  `legacy_quoter_contained` en el resultado `skipped` de `pushCanonicalQuoteToHubSpot`.
- Backward compatibility: `gated` — con el flag en `true` cada ruta responde byte a byte como hoy.
- Full API parity: la regla es un primitive de dominio; rutas, Nexa y workers son clientes del mismo helper.

### Data model and invariants

- Entidades afectadas: ninguna cambia de forma. Sin tablas nuevas.
- Invariantes que no se pueden romper:
  - Con la contención activa ninguna fila de `quotations`, `quotation_line_items`, `quotation_versions`,
    `approval_steps` ni `quote_short_links` nace o cambia por una puerta de autoría.
  - Las copias de HubSpot y Nubox siguen escribiendo esas tablas sin pasar por la guarda.
  - El cierre a factura y el barrido de vencimiento siguen escribiendo `status` como hoy.
  - Las lecturas no consultan el flag.
- Write-target allowlist: no aplica; la task no agrega destinos de escritura, los cierra.
- Tenant/space boundary: sin cambios; la guarda corre después de `requireCommercialTenantContext()` y del `can()` de
  cada ruta.
- Idempotency/concurrency: el rechazo no escribe nada y es repetible.
- Audit/outbox/history: el rechazo no emite evento de negocio. Cada rechazo se registra con
  `captureWithDomain` en nivel informativo (dominio `commercial`, etiqueta `legacy_quoter_door`) para medir si alguien
  sigue intentando escribir.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: puertas cerradas con el flag ausente (`COMMERCIAL_LEGACY_QUOTER_WRITES_ENABLED` distinto de `true`);
  salida a HubSpot detenida con `COMMERCIAL_LEGACY_QUOTE_HUBSPOT_OUTBOUND_ENABLED` distinto de `true`.
- Backfill plan: ninguno. No se limpian las cotizaciones de prueba ni lo ya publicado en HubSpot (pregunta abierta 5
  de la auditoría, fuera de alcance).
- Rollback path: poner el flag en `true` en el runtime que se quiera reabrir y redeployar; ver
  `### Rollback plan per slice`.
- External coordination: aviso al operador antes del release (cambia un comportamiento visible del portal).

### Security and access

- Auth/access gate: sin cambios; se agrega una negación posterior a la autorización.
- Sensitive data posture: el cuerpo del rechazo no lleva identificadores, montos ni el nombre de la puerta interna.
- Error contract: `canonicalErrorResponse('legacy_quoter_read_only')`; en el carril público de aceptación, el mismo
  código sin revelar si el enlace existe.
- Abuse/rate-limit posture: el rechazo es más barato que la escritura que reemplaza; no se agrega límite.

### Runtime evidence

- Local checks: test del helper, test por ruta (cerrada y reabierta), test de inventario de rutas.
- DB/runtime checks: conteo de filas `source_system = 'manual'` y de `quotation_versions` antes y después de ejercer
  cada puerta en staging: sin cambio.
- Integration checks: una corrida de `/hubspot/quotes-sync` y de `/nubox/quotes-hot-sync` en staging termina sin
  error y refresca filas; ninguna llamada de creación o actualización de cotización sale hacia HubSpot.
- Reliability signals/logs: eventos `commercial.quotation.pushed_to_hubspot` con `result = skipped` y razón
  `legacy_quoter_contained`; cero `commercial.quotation.hubspot_sync_failed` nuevos atribuibles a la contención.
- Production verification sequence: ver `### Production verification sequence`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Esta task no crea tablas; el allowlist de destinos de escritura del dominio no cambia.
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

### Slice 1 — Helper de contención, código de error e inventario mecánico

- `src/lib/commercial/legacy-quoter-containment.ts` (`server-only`): `isLegacyQuoterWriteOpen()`,
  `assertLegacyQuoterWriteOpen(door)` (lanza `LegacyQuoterReadOnlyError`), `isLegacyQuoteHubSpotOutboundOpen()` y la
  lista cerrada `LEGACY_QUOTER_DOORS` con las puertas de la tabla de `## Detailed Spec`. Cada flag se lee con el
  literal `process.env.<FLAG> === 'true'` para que el auditor de flags lo detecte.
- Código `legacy_quoter_read_only` en `CanonicalErrorCode` y `CANONICAL_ERRORS` (409, `actionable: false`), con el
  mensaje es-CL validado con la skill `greenhouse-ux-writing`.
- Test de inventario: recorre `src/app/api/finance/quotes/**/route.ts`, `src/app/api/commercial/quotations/**/route.ts`
  y `src/app/api/public/quote/**/route.ts`, detecta cada export `POST | PUT | PATCH | DELETE` y falla si alguno no
  está en `LEGACY_QUOTER_DOORS` (y su archivo invoca la guarda) o en la lista explícita de puertas que quedan abiertas,
  con su razón. Una ruta de escritura nueva no puede nacer sin clasificarse.
- Fila de cada flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

### Slice 2 — Guarda en los comandos de dominio

- Primera sentencia de `submitQuoteFromBuilder`, `persistQuotationPricing`, `recalculateQuotationPricing`,
  `createNewVersion` y `requestQuotationIssue`: `assertLegacyQuoterWriteOpen(<door>)`.
- Antes de editar, confirmar con búsqueda que ningún camino de copia entrante ni de cierre a factura llama a esos
  cinco comandos (al 2026-10-12 no lo hacen; ver `### Already exists`). Si aparece uno, detenerse y reportar: la
  guarda no puede cortar una copia entrante.
- `services/commercial-cost-worker/server.ts`: el endpoint que llama a `runQuoteRepriceBulk` responde un resultado
  `skipped` con razón `legacy_quoter_read_only` cuando la puerta está cerrada, en vez de registrar una falla por
  cotización.

### Slice 3 — Guarda en las rutas

- En cada ruta de «Puertas que se cierran», después del contexto de tenant y del `can()` existentes:
  si la puerta está cerrada, `return canonicalErrorResponse('legacy_quoter_read_only')`.
- La guarda de ruta es obligatoria aunque el comando ya esté guardado: `PUT /api/finance/quotes/[id]` escribe la
  cabecera con SQL propio antes de recalcular, y `POST /api/finance/quotes` inserta la cabecera antes de persistir.
- `LegacyQuoterReadOnlyError` que escape de un comando se traduce al mismo código en el manejador de cada ruta y en el
  confirm de la acción de Nexa (no un 500).

### Slice 4 — Salida a HubSpot

- `pushCanonicalQuoteToHubSpot`: si `isLegacyQuoteHubSpotOutboundOpen()` es falso, retorna
  `{ result: 'skipped', hubspotQuoteId: null, reason: 'legacy_quoter_contained' }` sin llamar a HubSpot y sin lanzar
  (el consumidor reactivo no reintenta ni manda el evento a la cola de fallidos). Publica el mismo evento
  `pushed_to_hubspot` con `result = skipped` que ya usan los otros dos casos de omisión.
- La guarda vive en el primitive, no sólo en la proyección: cualquier otro llamador queda cubierto.

### Slice 5 — Verificación en runtime y documentación

- Ejercer cada puerta en staging (ver `## Verification`), confirmar copias entrantes y lecturas, y registrar la
  evidencia en la task.
- Triple documentación: delta en `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`, sección «Estado: sólo lectura»
  en `docs/documentation/finance/cotizador.md`, manual `docs/manual-de-uso/finance/cotizador-actual-solo-lectura.md`
  (qué responde cada acción, cómo se cotiza mientras tanto —`docs/manual-de-uso/finance/cotizar-v3-por-cli.md`— y cómo
  se reabre).

## Out of Scope

- Cambiar, ocultar o deshabilitar botones del constructor o del detalle (`UI impact: none`). Ocultar los controles es
  parte de la unidad de interfaz de `EPIC-053`.
- Retirar el cotizador actual, borrar tablas, rutas, pantallas o cotizaciones de prueba (última fase del programa).
- Disparadores, `CHECK` o cambios de permisos en `greenhouse_commercial.quotations*`.
- Corregir los defectos de cálculo o de control de la auditoría (C-01…C-09, G-01, G-04…G-07): no se arregla lo que se
  cierra.
- Limpiar lo ya publicado en HubSpot o los tres ingresos de prueba del libro financiero.
- Las copias entrantes de HubSpot y Nubox, y la pregunta de por qué el espejo dejó de crear filas canónicas (I-02).
- Las superficies de simulación V2 (rutas de producto, carriles de plataforma, herramientas de Nexa y MCP): siguen
  sirviendo hasta el retiro.
- Cualquier tabla, ruta o capacidad del registro de V3 (`TASK-2025` en adelante).

## Detailed Spec

### Flags

| Flag | Valor por defecto | Efecto con el valor por defecto | Runtimes donde se lee |
| --- | --- | --- | --- |
| `COMMERCIAL_LEGACY_QUOTER_WRITES_ENABLED` | ausente = cerrado | Las puertas de la tabla siguiente rechazan con `legacy_quoter_read_only` | Vercel (rutas y confirm de Nexa), `commercial-cost-worker` (re-precio) |
| `COMMERCIAL_LEGACY_QUOTE_HUBSPOT_OUTBOUND_ENABLED` | ausente = cerrado | `pushCanonicalQuoteToHubSpot` omite la llamada | El runtime que ejecuta el consumidor reactivo: `ops-worker` y las rutas `src/app/api/cron/outbox-react*` de Vercel |

Son dos flags y no uno porque viven en runtimes distintos y se revierten por separado: reabrir la autoría para
diagnosticar algo no debe volver a publicar borradores en el CRM. Con las puertas cerradas dejan de nacer los eventos
que disparan la salida; el segundo flag cubre los eventos ya encolados, los reintentos y la reapertura parcial.

Como cerrado es la ausencia del flag, ningún `deploy.sh` necesita cambiar para cerrar. Para **reabrir** en Cloud Run
sí: declarar el flag en `services/<worker>/deploy.sh` además de aplicarlo en vivo (el `--set-env-vars` de los
`deploy.sh` borra lo agregado fuera de banda).

### Puertas que se cierran

| # | Ruta | Método | Archivo (línea verificada el 2026-10-12) | Qué hace hoy |
| --- | --- | --- | --- | --- |
| 1 | `/api/finance/quotes` | POST | `src/app/api/finance/quotes/route.ts:226` (persistencia `:525`, número dado por quien llama `:386`) | Creación legada: cabecera propia y líneas con precio del que llama |
| 2 | `/api/finance/quotes/author` | POST | `src/app/api/finance/quotes/author/route.ts:58` | Comando gobernado `submitQuoteFromBuilder` (crear, editar, emitir) |
| 3 | `/api/finance/quotes/[id]` | PUT | `src/app/api/finance/quotes/[id]/route.ts` (estados `:216-222`, número `:293`, estado `:295-301`, piso y objetivo `:313-314`, recálculo `:493`) | Edita cabecera, estado, número, piso y objetivo; recalcula |
| 4 | `/api/finance/quotes/[id]/lines` | POST | `src/app/api/finance/quotes/[id]/lines/route.ts:226` | Reemplaza líneas con precio, costo manual y desglose del que llama |
| 5 | `/api/finance/quotes/[id]/recalculate` | POST | `src/app/api/finance/quotes/[id]/recalculate/route.ts:48` | Recalcula y regraba |
| 6 | `/api/finance/quotes/[id]/versions` | POST | `src/app/api/finance/quotes/[id]/versions/route.ts:71` | Crea versión clonando líneas |
| 7 | `/api/finance/quotes/[id]/issue` | POST | `src/app/api/finance/quotes/[id]/issue/route.ts:65` | Emite o pide aprobación |
| 8 | `/api/finance/quotes/[id]/send` | POST | `src/app/api/finance/quotes/[id]/send/route.ts:49` | Alias de emisión |
| 9 | `/api/finance/quotes/[id]/approve` | POST | `src/app/api/finance/quotes/[id]/approve/route.ts` | Pide o decide un paso de aprobación |
| 10 | `/api/finance/quotes/[id]/terms` | PUT | `src/app/api/finance/quotes/[id]/terms/route.ts` | Cambia los términos de la cotización |
| 11 | `/api/finance/quotes/[id]/save-as-template` | POST | `src/app/api/finance/quotes/[id]/save-as-template/route.ts` | Guarda una plantilla desde la cotización |
| 12 | `/api/finance/quotes/[id]/lines/[lineItemId]/cost-override` | POST | `src/app/api/finance/quotes/[id]/lines/[lineItemId]/cost-override/route.ts:69` | Ajuste manual de costo |
| 13 | `/api/finance/quotes/[id]/share` | POST | `src/app/api/finance/quotes/[id]/share/route.ts` | Crea un enlace público |
| 14 | `/api/finance/quotes/[id]/share/[shortCode]/send-email` | POST | `src/app/api/finance/quotes/[id]/share/[shortCode]/send-email/route.ts` | Envía la cotización por correo al cliente |
| 15 | `/api/finance/quotes/[id]/share/[shortCode]/resend-email` | POST | `src/app/api/finance/quotes/[id]/share/[shortCode]/resend-email/route.ts` | Reenvía el correo |
| 16 | `/api/public/quote/[quotationId]/[versionNumber]/[token]/accept` | POST | `src/app/api/public/quote/[quotationId]/[versionNumber]/[token]/accept/route.ts` | Registra una aceptación del cliente |

Las puertas 13 a 16 no escriben precios; se cierran porque ponen frente a un cliente un documento del cotizador que
la auditoría declaró no confiable, y la aprobación fue «queda de sólo lectura». Hoy existen cero enlaces, cero vistas
y cero aceptaciones: no se corta ningún uso real.

Llamadores que no son ruta y quedan cerrados por la guarda de dominio: la acción de Nexa `author_quote`
(`src/lib/nexa/actions/author-quote.ts:87`) y el re-precio masivo (`quote-reprice-bulk.ts:264`).

### Puertas que NO se tocan, y por qué

| Ruta o proceso | Razón |
| --- | --- |
| Todos los `GET` de `src/app/api/finance/quotes/**`, incluidos `/pdf`, `/share` (lista), `/audit`, `/document-chain`, `/fx-snapshot`, `/health`, `/share/dashboard` | Lecturas |
| Página pública `src/app/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx` | Lectura |
| `DELETE /api/finance/quotes/[id]/share/[shortCode]` | Revocar un enlace reduce exposición; cerrarlo sería lo contrario de contener |
| `POST /api/finance/quotes/[id]/convert-to-invoice` y `POST /api/commercial/quotations/[id]/convert-to-cash` | Cierre a factura: dueño `TASK-1206`; opera sobre cotizaciones emitidas, incluidas copias de HubSpot |
| `POST /api/finance/quotes/pricing/simulate`, `POST /api/finance/quotes/from-service`, `GET /api/finance/quotes/pricing/lookup`, carriles `/api/platform/{app,ecosystem}/quotation/**`, herramientas `quote_price` y `search_services` | No persisten; las superficies de simulación V2 siguen sirviendo hasta el retiro |
| `PUT /api/finance/quotes/pricing/config`, `/api/finance/quotation-governance/**`, `/api/admin/pricing-catalog/**` | Configuración y catálogo V2; no crean ni alteran una cotización y el catálogo alimenta la materialización de productos hacia HubSpot |
| `POST /api/finance/quotes/hubspot` | Ya responde 410 |
| Copias entrantes (`syncCanonicalFinanceQuote`, `sync-hubspot-quotes.ts`, `sync-hubspot-line-items.ts`, `/hubspot/quotes-sync`, `/nubox/quotes-hot-sync`) | Deben seguir entrando |
| Barrido de vencimiento `runQuotationLifecycleSweep` | Mantenimiento de estado, también sobre copias |
| `src/lib/commercial/tenders/proposals/quote-gate.ts` y `src/app/api/commercial/proposals/[proposalId]/quote/route.ts` | Leen `quotations` y escriben `proposals`; no son autoría del cotizador |
| Proyecciones `quotation-pipeline`, `quotation-profitability`, `deal-pipeline`, `quote-to-cash-autopromoter` | Lecturas derivadas |

### Scripts

No se modifican ni se borran.

| Script | Qué le pasa |
| --- | --- |
| `scripts/smoke-task-348.ts` | Llama a `createNewVersion`: con la puerta cerrada falla con `LegacyQuoterReadOnlyError`. Correrlo exige exportar el flag en `true` en esa shell, a propósito |
| `scripts/commercial/task-1206-q2c-close-smoke.ts` | Inserta cotizaciones emitidas por SQL directo: la contención es de aplicación y no lo alcanza. Sigue funcionando; escribe en la única base compartida y no se corre sin el visto bueno del operador |
| `scripts/finance/backfill-quotation-status-from-finance.ts` | SQL directo de reconciliación de estado: no lo alcanza la guarda; mismo cuidado |
| `scripts/audit-legacy-quotes.ts`, `scripts/hubspot/reconcile-quotes-dryrun.ts` | Lecturas; sin cambio |

El manual nuevo deja escrito que un script con SQL directo es la única forma que queda de escribir esas tablas y que
no es un camino de autoría.

### Mensaje

Texto propuesto (validar con `greenhouse-ux-writing` antes de fijarlo):
«El cotizador del portal está en modo de sólo lectura. Las cotizaciones nuevas se preparan con el cotizador V3.»
Sin botón de reintento (`actionable: false`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slice 3 no se entrega sin Slice 2: una ruta guardada sobre un comando abierto deja a Nexa y al worker sin cubrir.
- Slice 4 puede entregarse en paralelo con Slice 2 y 3 una vez cerrado Slice 1.
- Slice 5 exige las cuatro anteriores desplegadas en staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| La guarda corta una copia entrante de HubSpot o Nubox | sync / finance | low | Verificación por búsqueda de llamadores antes de editar; corrida real de ambas copias en staging como criterio de aceptación | Corrida de `/hubspot/quotes-sync` o `/nubox/quotes-hot-sync` con error; filas sin refrescar |
| Una persona necesita emitir desde el portal y encuentra la puerta cerrada | finance / UI | low (uso medido: cero cotizaciones reales) | Aviso previo al operador; manual con el camino alternativo; reapertura por flag en minutos | Registro informativo `legacy_quoter_door` con actor humano |
| Proposal Studio no puede vincular una cotización nueva | commercial | medium | Declarado en Open Questions; las licitaciones se cotizan hoy con la CLI y la plantilla A4 | `proposal_quote_gate_failed` nuevo tras el release |
| El consumidor reactivo reintenta eventos de salida hasta agotarlos | outbox | low | La guarda retorna `skipped`, no lanza | Crecimiento de fallidos de `quotation_hubspot_outbound` |
| Tests existentes de rutas y comandos fallan por el valor por defecto | CI | high | Cada test que ejerce una puerta fija el flag de forma explícita; se agrega el caso cerrado | Suite roja en `pnpm test` |
| El flag se reabre sólo en vivo en Cloud Run y un deploy posterior lo borra | commercial-cost-worker / ops-worker | medium | Reapertura declarada en `deploy.sh` además de en vivo; el fallo es hacia cerrado, que es el estado seguro | El comportamiento vuelve a cerrado tras un deploy |
| El cierre a factura queda cortado por error | finance | low | Las dos rutas de cierre están en la lista de puertas abiertas y el test de inventario lo fija | `convert-to-invoice` responde 409 |

### Feature flags / cutover

- `COMMERCIAL_LEGACY_QUOTER_WRITES_ENABLED` (ausente = cerrado). El cutover es el release: al desplegar, las puertas
  quedan cerradas en todos los runtimes sin tocar variables.
- `COMMERCIAL_LEGACY_QUOTE_HUBSPOT_OUTBOUND_ENABLED` (ausente = cerrado). Igual.
- Ambos con fila en el ledger, sección de inventario, indicando runtime y que el valor por defecto es el estado
  deseado (no son flags «pendientes de prender»).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | Revert del cambio; el helper no tiene efecto sin llamadores | menos de 10 min | si |
| Slice 2 | `COMMERCIAL_LEGACY_QUOTER_WRITES_ENABLED=true` en Vercel + redeploy; en `commercial-cost-worker`, declarar en `deploy.sh` y `gcloud run services update --update-env-vars` | menos de 10 min por runtime | si |
| Slice 3 | Mismo flag que Slice 2 | menos de 10 min | si |
| Slice 4 | `COMMERCIAL_LEGACY_QUOTE_HUBSPOT_OUTBOUND_ENABLED=true` en el runtime del consumidor reactivo (declarado en `services/ops-worker/deploy.sh` y aplicado en vivo; en Vercel con redeploy) | menos de 10 min | si; los eventos omitidos mientras estuvo cerrado no se reenvían solos |
| Slice 5 | Revert documental | menos de 10 min | si |

### Production verification sequence

1. Staging con el release desplegado y sin flags: ejercer las 16 puertas con una persona de pruebas autorizada y
   confirmar 409 `legacy_quoter_read_only`; confirmar que sin sesión siguen respondiendo 401.
2. Staging: lista, detalle, PDF y página pública de una cotización existente responden como antes.
3. Staging: una corrida de cada copia entrante; conteos de filas `hubspot` y `nubox` iguales o mayores, sin error.
4. Staging: el re-precio del worker responde `skipped`; ningún evento de creación o actualización sale a HubSpot.
5. Staging: reabrir con el flag, confirmar que una puerta vuelve a responder como antes, y volver a cerrar.
6. Producción: aviso al operador, release por el control plane, repetir los pasos 1 a 4 sólo con lecturas y con un
   intento de escritura que no cree datos (el rechazo no escribe).
7. Siete días de observación del registro `legacy_quoter_door` antes de cerrar la task.

### Out-of-band coordination required

- Aviso al operador (CEO) y a quien tenga acceso comercial o de finanzas antes del release a producción: el portal
  dejará de aceptar cotizaciones nuevas y dirá por qué.
- Ninguna configuración en HubSpot, Nubox, GCP ni Azure.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con ambos flags ausentes, cada una de las 16 puertas de la tabla responde HTTP 409 con
      `code = legacy_quoter_read_only`, `actionable = false` y mensaje es-CL; ninguna crea ni cambia filas.
- [ ] Con sesión ausente, las mismas rutas siguen respondiendo 401; con sesión sin la capacidad, 403.
- [ ] Con `COMMERCIAL_LEGACY_QUOTER_WRITES_ENABLED=true`, las rutas responden como antes del cambio (tests existentes
      verdes con el flag fijado).
- [ ] `submitQuoteFromBuilder`, `persistQuotationPricing`, `recalculateQuotationPricing`, `createNewVersion` y
      `requestQuotationIssue` lanzan `LegacyQuoterReadOnlyError` con la puerta cerrada, y la acción de Nexa
      `author_quote` lo traduce a un rechazo tipado (no a un error interno).
- [ ] El re-precio del `commercial-cost-worker` responde `skipped` con la puerta cerrada y no registra una falla por
      cotización.
- [ ] `pushCanonicalQuoteToHubSpot` retorna `skipped` con razón `legacy_quoter_contained`, no llama al servicio de
      HubSpot y no lanza, con el flag de salida ausente.
- [ ] El test de inventario falla si se agrega un export `POST | PUT | PATCH | DELETE` bajo las tres carpetas de rutas
      sin clasificarlo como cerrado o como abierto con razón.
- [ ] Una corrida real de la copia de HubSpot y otra de la de Nubox en staging terminan sin error con la contención
      activa (evidencia registrada en la task).
- [ ] Lista, detalle, PDF y página pública de una cotización existente responden igual que antes en staging.
- [ ] `convert-to-invoice` y `convert-to-cash` no consultan la guarda.
- [ ] Los dos flags tienen fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime, y
      `pnpm flags:audit --strict --no-vercel` no reporta ninguno sin registrar.
- [ ] El último commit lleva `[downstream-verified: legacy-quoter-containment]` con lo verificado, y
      `pnpm finance:e2e-gate --strict` pasa.
- [ ] Arquitectura, documentación funcional y manual actualizados; ninguno dice que el cotizador fue retirado.

## Verification

- `pnpm vitest run src/lib/commercial/legacy-quoter-containment.test.ts`
- `pnpm vitest run src/app/api/finance/quotes src/lib/commercial src/lib/hubspot src/lib/nexa/actions`
- `pnpm local:check`
- `pnpm finance:e2e-gate --strict`
- `pnpm flags:audit --strict --no-vercel`
- `pnpm test` (suite completa) al cierre; `pnpm build` sólo con autorización del operador.
- Staging: `pnpm staging:request POST /api/finance/quotes '{}'` y equivalentes por puerta; `pnpm staging:request
  /api/finance/quotes` para la lectura.
- `pnpm playwright test tests/e2e/smoke/finance-quotes.spec.ts --project=chromium` (las dos lecturas siguen verdes).
- `pnpm docs:closure-check` y `pnpm qa:gates --changed`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `EPIC-053` refleja el estado real de esta task y la evidencia de staging y producción
- [ ] las tasks que suponen autoría V2 (`TASK-497`, `TASK-499`, `TASK-564`, `TASK-620.4`, `TASK-576`, `TASK-627.1`)
      recibieron su `## Delta` con la contención, sin cambiarles el lifecycle

## Follow-ups

- Ocultar o reemplazar los controles de escritura del constructor y del detalle: unidad de interfaz de `EPIC-053`.
- Retiro del cotizador actual: unidad final de `EPIC-053`, con decisión y plan de reversa propios.
- Limpieza de cotizaciones de prueba publicadas en HubSpot (pregunta abierta 5 de la auditoría).

## Open Questions

- Proposal Studio (`EPIC-029`) exige una cotización de `quotations` vinculada para pasar su compuerta de GO. Con la
  autoría cerrada no nacen filas nuevas del portal. El plan del programa mantiene ese vínculo hasta la fase de retiro
  y dice que las licitaciones se cotizan con la CLI. Falta confirmar con el operador si alguna licitación en curso
  necesita vincular una cotización nueva antes de que exista el registro de V3; si la hay, la salida es reabrir por
  flag durante esa operación, no agregar una excepción al código.
- Las rutas de configuración V2 (`quotation-governance`, `pricing/config`, `pricing-catalog`) quedan abiertas en esta
  task. Si el operador quiere también congelar el catálogo V2, es una decisión aparte: ese catálogo alimenta los
  productos que se envían a HubSpot.
