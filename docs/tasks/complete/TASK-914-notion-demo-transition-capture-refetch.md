# TASK-914 — Notion demo status-transition capture vía re-fetch pattern (fix bug #3)

## Zone 0 — Identity & Triage

- **Lifecycle**: complete
- **Owner**: Claude (sesión 2026-05-20)
- **Branch**: develop
- **Tipo**: fix arquitectónico (no parche) — capa de captura del pipeline RpA V2 demo
- **Cross-refs**: TASK-913 (pipeline demo end-to-end), TASK-910 (demo teamspace), TASK-908 (status transition foundation productive), TASK-901 (calculateRpaV2 helper)

## Zone 1 — Problem & Context

El smoke E2E real de TASK-913 (2026-05-20) reveló que `extractDemoTransitions` (handler `notion-tasks-demo`) es **incompatible con el payload real de los webhooks Notion 2026-03-11**:

- Notion manda `data.updated_properties: ["<property_id>"]` — el **ID** de la propiedad, NO el nombre. El handler matchea contra `STATUS_PROPERTY_NAMES = {'Estado','Estado 1'}` (nombres) → nunca matchea.
- El payload **NO incluye** `data.previous.status` ni `data.current.status`. El handler exige ambos (Filter 4).

Consecuencia: el handler extrae **0 transiciones de todo webhook real** → nunca emite `notion.task.status_transitioned` → nunca se computa RpA desde edits vivos. Los 78 tests de TASK-913 pasaron porque mockean un payload sintético (con nombres + previous/current) que **no es lo que Notion realmente envía**.

Verificado en vivo: payload real inspeccionado en `webhook_inbox_events.raw_body_text` — `data` keys = `parent, updated_properties`; sin `previous`/`current`.

**Root cause arquitectónico**: violación del Pillar 1 de `notion-platform` (Anti-pattern #1, Hard rule #2): *NUNCA confiar el payload del webhook como source of truth — siempre RE-FETCH desde la API antes de computar*. El handler intentó derivar la transición del payload en vez de re-fetchear la página.

## Zone 3 — Detailed Spec (canonical design)

**Decisión**: El webhook es un **trigger puro**. La resolución de la transición (`from`/`to`) se mueve al **consumer reactivo** vía re-fetch de la página (source of truth del estado actual) + derivación del estado previo desde PG.

Alternativas rechazadas:
- *Re-fetch en el request path del handler* → viola budget 5s de Notion + rate limit. RECHAZADO.
- *Matchear `previous`/`current` del payload* → Notion no los manda. RECHAZADO (causa del bug).
- *Polling de page state* → más caro, no event-driven. RECHAZADO para V1 (webhook + re-fetch es canónico).

### Arquitectura (outbox + reactive consumer, arch overlay #3)

```text
Notion edit demo → webhook /notion-tasks-demo
  ├─ valida HMAC (resolveSecretByRef, ya fixeado) + echo-loop filter
  ├─ matchea updated_properties (IDs) contra status property ID(s) resueltos del schema (cacheado)
  └─ emite notion.task.page_change_signal.demo { taskSourceId, changedPropertyIds, eventId, occurredAt }
       → capture-demo consumer (ops-worker, async):
            ├─ re-fetch página vía demo Notion client → status actual (= `to`)
            ├─ normalizeTaskStatus(to)
            ├─ deriva `from` = último to_status registrado en task_status_transitions_demo
            ├─ si from === to → no-op (idempotente)
            └─ si from !== to → persiste transición + emite notion.task.transition_captured.demo
                 → compute-demo (intacto) → snapshot → writeback-demo (intacto) → PATCH Notion RpA
```

### Componentes

1. **Status property ID resolver** (`src/lib/notion-metrics/notion-demo-client.ts` o sibling): `resolveDemoStatusPropertyIds(dataSourceId)` — fetch schema del data source, devuelve IDs de propiedades cuyo nombre ∈ `{'Estado','Estado 1'}`. Cache in-memory TTL 10 min. Defensive: si falla el fetch, el handler forwarda igual (no dropear status changes reales por error transitorio del schema fetch).
2. **Page status fetch** (`notion-demo-client.ts`): `fetchDemoPageStatus(pageId)` — GET /pages/{id}, lee la propiedad status, devuelve `{ statusName, lastEditedTime, lastEditedBy } | null` (null si 404/sin status). Notion-Version 2026-03-11.
3. **Handler** (`notion-tasks-demo.ts`): reemplaza `extractDemoTransitions` por detección de cambio de status property (por ID) + emisión de `page_change_signal.demo`. Mantiene HMAC + echo-loop + verification handshake.
4. **Capture consumer** (`notion-status-transition-capture-demo.ts`): trigger pasa de `status_transitioned` a `page_change_signal.demo`. Re-fetch + derive from + persist-if-changed. Emite `transition_captured.demo` (contrato downstream intacto).
5. **Event catalog**: nuevo `notion.task.page_change_signal.demo`.
6. **Reliability signal**: `notion.metrics.transition_capture_refetch_failed_demo` (drift, error si >0) — re-fetch falló en el consumer.

### 4-pillar + ICO 5-pillar scoring

- **Safety**: HMAC + echo-loop + demo isolation (workspace_id='demo', token/secret separados) preservados. Re-fetch usa el token demo (scope solo teamspace demo).
- **Robustness**: re-fetch = source of truth (resiste payload sin valores + coalescing del caso común); idempotente vía UNIQUE source_event_id + compare-to-last; persist+emit atómico en tx.
- **Resilience**: re-fetch 404 → skip+log; 429 → backoff (outbox retry); error → throw → retry → dead_letter (maxRetries). Reliability signal upstream.
- **Scalability**: filtro por status property ID evita re-fetch en cambios irrelevantes; resolver cacheado O(1); productivo usará Cloud Tasks throttling (ya planeado TASK-913). Demo low-volume.
- **Auditability (ICO)**: cada transición traceable a source_event_id; tabla append-only; snapshot reproducible.

## Hard rules (anti-regresión)

- **NUNCA** derivar la transición del payload del webhook. Siempre re-fetch de la página (Notion no manda previous/current).
- **NUNCA** matchear status property por nombre contra `updated_properties` (Notion manda IDs). Resolver el ID del schema.
- **NUNCA** re-fetchear en el request path del handler (budget 5s). El re-fetch vive en el consumer reactivo.
- **NUNCA** persistir transición sin pasar por `normalizeTaskStatus` + compare-to-last (idempotencia).
- **NUNCA** romper el contrato downstream `notion.task.transition_captured.demo` (compute + writeback intactos).
- **SIEMPRE** degradación honesta: página borrada / status ilegible → skip + signal, nunca inventar.

## Open questions (deliberadamente NO decididas)

- **Coalescing de transiciones rápidas**: si el status cambia A→B→C entre dos ticks del consumer, el re-fetch solo ve C → B se pierde → podría subcontar correcciones RpA si la perdida era `Listo para revisión → Cambios solicitados`. Aceptable para comportamiento real del operador (cambios deliberados con minutos/horas de separación). Fidelidad total requeriría Notion page history API (V2). Documentado.
- Productivo (TASK-901 Slice 4+): el cutover replica este patrón con Cloud Tasks throttling. No en scope de TASK-914 (solo demo).

## Verification

- Smoke E2E real: transición demo `Listo para revisión → Cambios solicitados` con espaciado → webhook `processed` → transición persistida → snapshot rpa computado → property `RpA` escrita en Notion.
- Tests anti-regresión: handler emite signal en status change (por ID), no en otras props; consumer re-fetch + derive from + idempotencia.

## Cierre — Verificación E2E (2026-05-20)

✅ **Smoke E2E real cerrado de punta a punta** sobre el teamspace Demo Greenhouse:

1. Webhook real de Notion → handler emite `page_change_signal.demo` (`00:08`, `00:26`)
2. Consumer re-fetchea + deriva from → 3 transiciones capturadas (`Cambios solicitados → Listo para revisión`, `Listo para revisión → Cambios solicitados`)
3. Compute → snapshot `rpa=2 valid`
4. Writeback → **`RpA=2` visible en la propiedad number de Notion** (confirmado `01:10:22Z`)

**5 bugs en cascada detectados + corregidos** (releases `26bfe120` → `cd047724`): HMAC resolveSecret, IAM secret, payload sin previous/current (re-fetch pattern), gate por property ID frágil (forward-all), envelope evento single (normalizeWebhookEvents). Detalle en ADR `GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` Delta 2026-05-20.

**Fix operativo final**: colisión de nombre con la fórmula legacy `RpA` del template demo → renombrada a `RpA (fórmula legacy)`, la propiedad number renombrada a `RpA`. El writeback escribe a la number correctamente.

**Docs canonizados**: arch (Strangler Delta), documentation funcional, manual de uso, ICO skill bug-class-catalog (BUG-CLASS-002).
