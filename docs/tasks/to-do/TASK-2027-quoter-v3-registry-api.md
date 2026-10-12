# TASK-2027 — Quoter V3 registry API: quotes, versions, lifecycle and numbering

## Delta 2026-10-12

Diseño de esquema cerrado en el Discovery de `TASK-2025` con la sesión consultora, ya incorporado al cuerpo de esta
task:

- **Destinataria en tabla propia** (`quoter_quote_recipients`, sólo agregar). Se asigna al crear o después, se puede
  reasignar mientras la cotización esté en `draft` y queda congelada desde la primera emisión. Operación nueva: 16.
- **El mismo cálculo dos veces.** La huella no es llave única del registro, pero un cálculo vive en una sola
  cotización no retirada: registrarlo de nuevo con otra clave responde 409 `artifact_already_registered`.
- **Sin `dealReference`.** El vínculo con el negocio queda fuera (ver `## Out of Scope`).

Lectura final del diseño de `TASK-2025` (2026-10-12), que cambia lo que estos comandos encuentran en la base. El
almacén ya está escrito y probado en PostgreSQL 16 local; este documento se alinea con él:

- **Un solo serializador para un artefacto**: `JSON.stringify(artefacto, null, 2)` más salto de línea, el de la
  CLI. Donde esta task decía «texto canónico» de un artefacto, es ese texto. `stableJson` queda para los documentos
  fuente y para los datos del documento del cliente, que sí se guardan canónicos.
- **El número lo asigna la base** en la transacción de la primera emisión (disparador, contador por serie, sin
  huecos). El comando no inserta en `quoter_quote_numbers` ni llama a ninguna función de número: lo lee después de
  registrar el cambio de estado. La primera cotización real es `EO-QTE-15001`.
- **`data_origin` no tiene valor por defecto.** El comando lo declara siempre, y lo decide la identidad que crea,
  nunca un campo del pedido.
- **Quién actuó viaja en cada fila**: todo comando pasa al almacén el actor con su `principalId` (el mismo
  `principal_id` de la fila de ejecución del comando, que caduca).
- **Emitir fija versión y documento.** El cambio de estado guarda `version_number`, `artifact_digest`,
  `document_seq` y `document_digest`. Se emite la última versión **o la última emitida**: `revising → issued` con la
  versión que el cliente ya tenía cierra una revisión sin fabricar otra versión.
- **El documento se escribe en `draft` y en `revising`**, también el de una versión ya emitida: para corregirlo se
  vuelve a `revising`, se guarda y se emite de nuevo. Cada emisión conserva el documento que emitió.
- **La regla del piso la comprueba también la base**: la versión guarda `below_floor` (veredicto del motor) y el
  disparador de la emisión exige una aprobación vigente. El comando la comprueba antes para responder su código.
- **Aprobar y revocar.** `quoter_exception_approvals` guarda decisiones `approved | revoked`; rige la última. El
  almacén ofrece `decideException`. Sólo una versión bajo el piso recibe una decisión.
- **Una cotización emitida o retirada no recibe versiones**: el almacén registra `issued → revising` antes de
  insertar la versión nueva.
- **Después de emitir (CEO, 2026-10-12; ADR, decisión 5).** Estados nuevos `accepted` y `rejected`; cada emisión
  fija `validUntil`; «vencida» se deriva (`effectiveState = expired` en los lectores, que lo toman de
  `quoter_quote_current` y no reaplican la regla). **Aceptar una vencida se permite** (CEO, 2026-10-12): los
  lectores devuelven, para una cotización aceptada, `acceptance { acceptedAt, validUntil, afterValidity,
  daysAfterValidity }`, derivado por la base. Un tope de antigüedad sería una regla de catálogo decidida por el CEO;
  hoy no existe. Operaciones nuevas 18 (aceptar), 19 (rechazar) y 20 (reabrir), en los dos carriles, sin persona. Fuera de
  alcance: enviada y vista, ganada y perdida, un proceso que marque vencidas, y que el documento imprima la
  vigencia registrada.
- **Un agente aplica todos los estados.** Ningún par de la matriz tiene compuerta humana. Que la puerta o un
  disparador le nieguen un cambio de estado a un agente es un defecto. Lo único que no puede: decidir una excepción
  bajo el piso y activar el catálogo.
- **Una aprobación se revoca sólo mientras su versión no se haya emitido** (`exception_revocation_locked`).
- **Códigos del almacén** (`src/lib/commercial/quoter/errors.ts`), que este documento traduce: `version_locked`,
  `version_not_issuable`, `state_conflict`, `recipient_required`, `recipient_conflict`, `recipient_locked`,
  `document_required`, `document_conflict`, `document_locked`, `exception_approval_required`,
  `exception_not_applicable`, `exception_decision_unchanged`, `exception_revocation_locked`, `validity_required`,
  `validity_in_the_past`, `not_last_issued_version`, `isolation_not_supported`. Ya no existen `exception_already_approved`,
  `number_already_assigned` ni la columna `supersedes_version_number`.
- **Una sola puerta de escritura.** Todo comando escribe por las funciones de `quote-store.ts` de `TASK-2025`, que
  exigen `command_execution_id`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|finance`
- Blocked by: `TASK-2025, TASK-2026`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fase 4 de EPIC-053. Agrega a la API del cotizador V3 los comandos y lectores con estado: crear una cotización y
agregarle versiones (el servidor recalcula y guarda el artefacto congelado), registrar una cotización hecha en local
(sólo si su huella se reproduce contra las versiones de catálogo que nombra), guardar el documento y entregar sus
datos, mover el ciclo de vida —un agente emite y retira dentro de política; el único acto de persona de esta task es
aprobar una excepción bajo el piso— y numerar en la primera emisión. Detrás de una bandera apagada, sin escribir en
`quotations*` y sin interfaz.

## Why This Task Exists

Una cotización V3 es hoy un archivo en una máquina: no tiene número, versiones gobernadas, aprobación ni emisión, y
nadie más puede leerla. La auditoría del 2026-10-12 mostró que el registro del cotizador actual no sirve para darle
eso (su número no lo produce el motor, sus versiones no congelan y sus puertas de escritura se saltan el control), y
la decisión aceptada ese día ordena un registro propio. `TASK-2025` crea las tablas y sus guardas; nadie puede
usarlas todavía. Sin esta task, la CLI en modo plataforma (`TASK-2028`) no tiene dónde registrar y lo cotizado en
local durante la transición no se puede incorporar.

## Goal

- Comandos de registro con el servidor como único calculador: nunca se guarda un resultado que traiga quien llama.
- Una versión guardada es el artefacto congelado tal cual, verificado por huella al escribir y al leer, y se
  reproduce desde la base con las versiones que nombra.
- Ciclo de vida de la cotización sobre la matriz como dato: un agente crea, registra, emite y retira dentro de
  política sin esperar a nadie, por los dos carriles; aprobar una excepción bajo el piso es acto de persona y va sólo
  por el carril `app`.
- Cada comando lleva clave de idempotencia, huella del pedido, auditoría y evento en una sola transacción, con
  concurrencia optimista.
- Lectores de lista, cotización y versión, incluida la única proyección apta para cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` — puntos 2, 4, 5, 7, 8, 10, 11, 12,
  «Reglas duras» y «Delta 2026-10-12 — decisiones del CEO», que manda sobre lo que esta task decía antes.
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` — fase 4 y su puerta de salida.
- `docs/documentation/finance/cotizador-v3-promocion-canonica.md` — «Contratos locales que la adaptación debe
  conservar»: snapshot, contratos versionados, `runNotices`, lecturas como derivaciones, documento, cuarta regla de
  «asientos, opciones, valor de referencia y salida».
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — comandos, idempotencia, códigos 409 distintos.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` y
  `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (sesión de agente, `authMode`).
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` y
  `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (publicador del outbox).
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md` — identificadores secuenciales, orden y
  paginación por keyset.
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`.

Reglas obligatorias:

- **NUNCA** guardar como versión un resultado calculado por quien llama. Crear y agregar versión recalculan en
  servidor; registrar una cotización local la reproduce y compara huellas.
- **NUNCA** registrar como cotización un cálculo bloqueado, los `runNotices` de la corrida ni una lectura derivada.
- **NUNCA** reproducir una versión guardada con «la vigente»: se usa lo que su artefacto nombra, por huella.
- **NUNCA** recalcular, actualizar ni cambiar de contrato o de motor una versión guardada, ni en un comando ni en
  segundo plano.
- **NUNCA** borrar ni editar una versión, un cambio de estado o una fila de auditoría. Corregir es una versión nueva.
- **NUNCA** aceptar de quien llama el piso, el costo, la organización dueña ni el estado. Un comando nombra una
  transición; no recibe un estado.
- **NUNCA** que un agente apruebe una excepción bajo el piso: una sesión de agente no cuenta como persona, y ese acto
  no tiene ruta en el carril `ecosystem`.
- **NUNCA** una aprobación humana en el flujo normal de un agente: dentro de política, crear, registrar, guardar el
  documento, emitir y retirar no esperan a nadie. Un acto de persona nuevo exige una decisión del CEO.
- **NUNCA** emitir —persona o agente— una versión que el motor marca bajo el piso sin su aprobación de excepción
  registrada.
- **NUNCA** escribir en `greenhouse_commercial.quotations*` ni leer esas tablas para calcular o autorizar.
- **NUNCA** una segunda proyección para el cliente: sale de `clientSafePeriodItems`.
- **NUNCA** fecha de inicio ni duración de contrato; **NUNCA** la nómina como costo.
- **SIEMPRE** clave de idempotencia, huella del pedido, auditoría y evento en la misma transacción que el cambio.
- **SIEMPRE** migraciones que sólo agregan: hay una instancia para desarrollo, staging y producción, y aplicar en
  local ya es un cambio en producción.
- Nombres de la familia única de EPIC-053: tablas `quoter_*` en `greenhouse_commercial`, rutas
  `/api/platform/{app,ecosystem}/quoter/**`, código con estado en `src/lib/commercial/quoter/**`, motor en
  `src/lib/finance/pricing-v3/**` importado y nunca copiado. Lo descrito aquí es una propuesta; nada está
  implementado.

## Normative Docs

- `docs/tasks/in-progress/TASK-2025-quoter-v3-database-foundation.md` — esquema, matriz sembrada, número,
  aprobaciones de excepción, `data_origin`, capacidades. **Manda sobre este documento en todo lo que es estructura
  de datos**: aquí no se repite su matriz ni sus columnas, se referencian.
- `docs/tasks/to-do/TASK-2026-quoter-v3-compute-api.md` — tabla de traducción, forma de `data`/`meta`, versiones.
- `docs/audits/commercial/2026-10-12-cotizador-actual-auditoria.md` — §5 (qué conservar) y §6 (restricciones).
- `docs/documentation/finance/cotizador-v3-contrato-y-validacion.md` — `compose document`, `compose increment`.
- `docs/commercial/templates/cotizacion-a4/README.md` — versión 2 de los datos de la plantilla.
- `docs/tasks/complete/TASK-1845-efeonce-insights-domain-evidence-and-module-adapters.md` y
  `docs/tasks/complete/TASK-1846-efeonce-insights-durable-artifact-rendering.md`.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`,
  `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- Skills a cargar antes de escribir código: `greenhouse-backend`, `greenhouse-postgres`, `efeonce-pricing-operator`.

## Dependencies & Impact

### Depends on

- `TASK-2025` — tablas `quoter_quotes`, `quoter_quote_numbers`, `quoter_quote_versions`, `quoter_state_matrix`,
  `quoter_state_transitions`, `quoter_exception_approvals` y `quoter_version_documents`; vista
  `quoter_quote_current`; función `next_quoter_quote_number()`; almacenes `quote-store.ts` y `storage-postgres.ts`; `state-machine.ts`, `authz.ts`, `errors.ts`, `events.ts` y
  `canonical-text.ts` en `src/lib/commercial/quoter/`; capacidades `commercial.quoter.*` con su permiso otorgado.
- `TASK-2026` — resolución de versiones, `src/lib/api-platform/resources/quoter-errors.ts`, resolvedores de alcance,
  `flags.ts`, funciones de operación del motor que devuelven documento, código de salida y artefacto.
- `TASK-2024` por transitividad (puerto de almacenamiento).
- `src/lib/api-platform/core/app-auth.ts` (`runAppCommandRoute`, `runAppReadRoute`),
  `src/lib/api-platform/core/commands.ts` (`runEcosystemCommandRoute`),
  `src/lib/api-platform/core/atomic-commands.ts` (`executeAtomicApiPlatformCommand`).
- `src/lib/sync/publish-event.ts` (`publishOutboxEvent`) y `src/lib/sync/event-catalog.ts`.
- `src/lib/db.ts` (`getDb`, `withTransaction`).

### Blocks / Impacts

- `TASK-2028` — la CLI en modo plataforma registra, lee, emite y retira por estas rutas (`registry register`, `list`,
  `show`, `versions`, `document`, `issue`, `withdraw`) y lleva el acto humano de aprobar una excepción.
- `TASK-2030` — herramientas MCP de registro; aprobar una excepción nunca se expone, y emitir sólo si la decisión de
  alcance de escritura de esa task lo permite.
- Unidades sin tarea de EPIC-053 (interfaz y retiro del cotizador actual): consumen los lectores, los comandos
  y los eventos de esta task.
- `TASK-2025`: la matriz que siembra es la que consumen estos comandos; esta task no agrega pares.
- `greenhouse_commercial.proposals.quote_id` sigue apuntando a `quotations`: esta task no lo toca y una propuesta de
  licitación no puede enlazar todavía una cotización V3. Queda declarado, no resuelto, y no bloquea nada: el flujo
  que exige una cotización del cotizador actual no se usa (CEO, 2026-10-12).
- No toca `src/app/api/finance/quotes/**`, `src/lib/commercial/submit-quote-from-builder.ts`,
  `src/lib/commercial/quotation-events.ts` ni `src/lib/finance/quote-share/**`.
- No editar los archivos de TASK-2023, TASK-2024, TASK-2025, TASK-2026, TASK-2028, TASK-2029 ni TASK-2030.

### Files owned

- `src/lib/commercial/quoter/commands/**` (nuevo propuesto)
- `src/lib/commercial/quoter/readers/**` (nuevo propuesto, incluye la proyección por audiencia)
- `src/lib/commercial/quoter/human-gate.ts`, `request-hash.ts` (nuevos propuestos)
- `src/lib/commercial/quoter/flags.ts` (agrega `QUOTER_REGISTRY_API_ENABLED`; el archivo nace en TASK-2026)
- `src/lib/commercial/quoter/authz.ts`, `errors.ts`, `events.ts`, `state-machine.ts` — nacen en TASK-2025; esta task
  les agrega necesidades, códigos y tipos de evento, y no crea archivos paralelos
- `src/lib/api-platform/resources/app-quoter.ts`, `ecosystem-quoter.ts` (comandos)
- `src/lib/api-platform/resources/app-quoter-read.ts`, `ecosystem-quoter-read.ts` (agrega lectores del registro)
- `src/lib/api-platform/resources/quoter-errors.ts` (agrega las filas del registro)
- `src/lib/api-platform/core/errors.ts` (tres códigos nuevos de `ApiPlatformErrorCode`)
- `src/app/api/platform/app/quoter/quotes/**`, `src/app/api/platform/ecosystem/quoter/quotes/**`
- `src/lib/sync/event-catalog.ts` (tipo de agregado y tipos de evento)
- `docs/architecture/GREENHOUSE_QUOTER_V3_API_CONTRACT_V1.md` (sección de registro)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`, `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/documentation/finance/cotizador-v3-registro-de-cotizaciones.md` (nuevo propuesto)
- `docs/manual-de-uso/finance/registrar-y-emitir-cotizacion-v3.md` (nuevo propuesto)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila de `QUOTER_REGISTRY_API_ENABLED`)

## Current Repo State

### Already exists

- Verificación por recálculo: `replayResourceComposition` y `runResourceComposition` en
  `src/lib/finance/pricing-v3/adapters/resource-composition.ts`; huella sha256 sobre JSON estable.
- Resumen y veredicto de piso del kernel: `summarizeComposition` en
  `src/lib/finance/pricing-v3/resources/summary.ts` (`marginFloor`, `linesBelowPolicyFloor`).
- Documento: `composeQuoteDocument` y `scaffoldQuoteDocumentBrief` en
  `src/lib/finance/pricing-v3/resources/quote-document.ts`; emite `status: "draft"` y un `source` que no se imprime.
- Frontera hacia el cliente: `clientSafePeriodItems` y `projectCompositionPreview` en
  `src/lib/finance/pricing-v3/resources/readiness.ts`.
- Harness de comandos con idempotencia y auditoría en `greenhouse_core.api_platform_command_executions`.
- Precedente de rechazo de sesión de agente como persona: `src/lib/api-platform/resources/app-commercial-terms.ts`
  y `app-client-service-enablement.ts` (`tenant.authMode === 'agent'`).
- Precedente de persona en una CLI por PKCE en loopback sobre el carril `app`: `scripts/globe-credit-funding.ts` y
  `src/lib/api-platform/resources/app-globe-credit-funding.ts` (`oauthSessionAuthMode`).
- Precedente de comando con huella del pedido: `src/lib/efeonce-insights/commands/create-edition.ts` y
  `src/lib/efeonce-insights/request-hash.ts`.
- Precedente de alcance por carril: `src/lib/api-platform/resources/app-insights-scope.ts` (el cliente deriva su
  organización de la sesión; el interno la declara y sin ella es 400).
- Precedente de sujeto máquina para un binding `internal`:
  `src/lib/api-platform/resources/ecosystem-insights-scope.ts` y `ecosystem-brand-render-scope.ts`
  (`userId: consumer:<publicId>`, `tenantType: 'efeonce_internal'`, un rol real; la puerta le aplica `can()`). La
  plataforma no tiene un permiso por capacidad para un binding.
- Precedente de organización canónica de Efeonce resuelta por `public_id` (`EO-ORG-0007`):
  `resolveBrandOrganizationId()` en `src/lib/brand-surfaces/production/authz.ts`.

### Gap

- No existe ningún comando, lector ni ruta de registro para V3. Nada guarda un artefacto congelado fuera del repo.
- El `calculationId` local no es un identificador de cotización y no hay número público.
- El documento de una cotización V3 es un borrador sin número ni versión.
- No hay forma gobernada de incorporar a la plataforma lo ya cotizado en local.
- No hay registro de quién aprobó una excepción bajo el piso ni de quién emitió.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/commercial/quoter/commands/**` y `src/lib/commercial/quoter/readers/**`, con adaptadores en `src/lib/api-platform/resources/**` y rutas en `src/app/api/platform/{app,ecosystem}/quoter/quotes/**` dentro del portal Next.js en Vercel
- Future candidate home: `remain-shared`
- Boundary: agregado de cotización V3 con sus comandos, lectores y eventos como primitive único; consumidores autorizados son los adaptadores de plataforma de esta task y, después, TASK-2028, TASK-2030 y la interfaz que se decida, siempre por API o eventos y nunca por SQL
- Server/browser split: comandos, lectores, autorización, almacén y eventos sólo en servidor con `server-only`; tipos y contratos de respuesta aptos para browser; ningún import de interfaz, tema ni Next.js en el agregado
- Build impact: sin dependencias nuevas; ninguna ruta alcanza `scripts/**`, `services/**`, `node:fs`, Playwright ni el compositor de artefactos, verificado por `pnpm vercel:reachability-gate`
- Extraction blocker: la transacción única que une reclamo de idempotencia, cambio de estado y evento en el outbox sobre la instancia compartida de PostgreSQL, y el contexto de identidad de los harnesses de plataforma

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_commercial.quoter_quotes`, `quoter_quote_numbers`,
  `quoter_quote_versions`, `quoter_state_transitions`, `quoter_exception_approvals` y `quoter_version_documents`. La
  verdad de una versión es `artifact_text` y su huella; las demás columnas son índices de lectura. El estado es de
  la cotización y es su último cambio de estado; se lee por la vista `quoter_quote_current`.
- Consumidores afectados: CLI en modo plataforma, MCP, interfaz futura, consumidores de eventos. Ninguno existe hoy.
- Runtime target: Vercel (staging primero, después producción). El publicador del outbox ya corre en `ops-worker`;
  esta task no agrega consumidores reactivos, crons ni Jobs.

### Contract surface

- Contrato existente a respetar: funciones del motor citadas arriba; envelope y versión de la API de plataforma;
  tabla de traducción y forma `data`/`meta` de TASK-2026; esquema, guardas, matriz y funciones de número de TASK-2025.
- Contrato nuevo o modificado: los dieciséis comandos y lectores de la tabla de Detailed Spec; contrato
  `quoter-registry.v1` en el OpenAPI; siete tipos de evento; tres códigos nuevos en `ApiPlatformErrorCode`.
- Backward compatibility: aditivo y detrás de bandera. Nada del cotizador actual cambia.
- Full API parity: cada acto es un comando del agregado con adaptadores finos por carril; la interfaz futura, la CLI
  y MCP llaman lo mismo. El único acto humano de esta task, aprobar una excepción, existe sólo en `app`.

### Data model and invariants

- Entidades/tablas/views afectadas: las seis tablas y la vista nombradas arriba, más `quoter_state_matrix` en
  lectura. Sin tablas ni columnas nuevas en esta task.
- Invariantes que no se pueden romper:
  - una versión se guarda sólo si el cálculo terminó `calculated` y su huella, recalculada en servidor, coincide con
    la que se guarda;
  - toda lectura de una versión recalcula la huella del texto guardado y no entrega nada si no coincide;
  - una versión guardada lleva contrato y motor que la calcularon y sus fuentes dentro del artefacto;
  - versiones, cambios de estado, aprobaciones y documentos son de sólo agregar;
  - el número público se asigna una sola vez, en la primera emisión: un borrador no tiene número;
  - una aprobación de excepción sólo la registra una persona identificada; ningún cambio de estado exige persona;
  - la organización dueña de toda cotización es la canónica de Efeonce, y una cotización sin organización
    destinataria no se emite;
  - una versión que el kernel marca bajo el piso se emite únicamente si existe su fila en
    `quoter_exception_approvals` para esa versión y esa huella, la emita una persona o un agente;
  - una identidad ligada a una organización sólo ve la proyección apta para cliente de la versión emitida de
    cotizaciones cuya destinataria vigente (`quoter_quote_recipients`) es la suya.
- Write-target allowlist: si TASK-2025 dejó un boundary test del dominio, cada tabla que esta task escribe queda
  declarada allí en el mismo PR con su justificación; `quotations*` nunca aparece.
- Tenant/space boundary: `owner_organization_id` es siempre la organización canónica de Efeonce, resuelta por el
  servidor por referencia estable y nunca tomada del pedido; el alcance de autorización es la identidad interna con
  su capacidad. La destinataria es contenido validado de la cotización —cliente o potencial cliente—, vive en
  `quoter_quote_recipients`, es opcional en un borrador y obligatoria para emitir, y no concede nada a quien la
  escribe ni a la organización nombrada (ver «Organización»). Un recurso fuera del alcance responde 404.
- Idempotency/concurrency: header `Idempotency-Key` obligatorio en todo comando; reclamo en
  `greenhouse_core.api_platform_command_executions` y `request_hash` en las filas del agregado; reclamo, cambio y
  respuesta en una transacción con `executeAtomicApiPlatformCommand`. Concurrencia optimista con `expectedVersion` y,
  al aprobar una excepción y al emitir, `artifactDigest`. El bloqueo transaccional por cotización lo aporta TASK-2025.
- Audit/outbox/history: fila de ejecución de comando del harness, fila en `quoter_state_transitions` o en
  `quoter_exception_approvals` con actor y motivo, y evento en el outbox con `publishOutboxEvent(event, client)`
  dentro de la misma transacción.

### Migration, backfill and rollout

- Migration posture: none. Tablas, matriz, secuencias y capacidades son de TASK-2025 y esta task no agrega pares,
  tablas ni columnas. Si Discovery demuestra que un comando necesita algo que el esquema no tiene, se detiene y se
  resuelve con un Delta en TASK-2025, no con una migración suelta aquí.
- Default state: flag OFF en todos los entornos; staging primero.
- Backfill plan: ninguno. Lo cotizado en local entra caso por caso por el comando de registro, nunca por carga
  masiva ni por SQL.
- Rollback path: apagar `QUOTER_REGISTRY_API_ENABLED` y redeploy. Las filas ya escritas se conservan: no se borra
  una versión ni un cambio de estado.
- External coordination: alta de la variable en Vercel; confirmación del operador de la regla con que el servidor
  decide que una fila es sintética, antes de escribir en la instancia compartida; sin secretos nuevos. Prefijo y
  arranque del número, roles que emiten y organización dueña quedaron resueltos por el CEO el 2026-10-12.

### Security and access

- Auth/access gate: sesión o bearer en `app`; token de consumidor + binding `internal` en `ecosystem`, modelado como
  sujeto máquina con rol `efeonce_account`; capacidades por necesidad en la puerta única; compuerta humana por tipo
  de sesión, además de la capacidad, sólo al aprobar una excepción.
- Sensitive data posture: el artefacto contiene costo, margen, pisos y proveedores: vista interna. Los eventos y los
  registros llevan identificadores, número, versión, estados y huellas; nunca importes, costos, textos ni nombres.
- Error contract: `ApiPlatformError` vía `quoter-errors.ts`; `captureWithDomain(err, 'commercial', …)`; nunca un
  error crudo ni un valor del pedido.
- Abuse/rate-limit posture: límites del harness; tope de 8 opciones por documento (regla del motor); tope de tamaño
  de cuerpo declarado para el registro de un artefacto local.

### Runtime evidence

- Local checks: pruebas de comandos y lectores contra PostgreSQL real (clúster local o proxy, `pnpm test:live`
  serializado); paridad de la matriz; `capability-grant-coverage.test.ts`.
- DB/runtime checks: lectura posterior de cada comando; `UPDATE`/`DELETE` rechazados por las guardas; par fuera de
  la matriz rechazado por la base; orden y paginación de la lista ejercitados de punta a punta.
- Integration checks: registro de las cotizaciones de ejemplo en staging por los dos carriles como filas sintéticas
  y reproducción desde la base; emisión de una versión sintética dentro de política por un agente; rutas de
  negación (cálculo bloqueado, agente que pide aprobar una excepción, emisión bajo el piso sin aprobación,
  organización ajena).
- Reliability signals/logs: Sentry dominio `commercial` para una huella que no coincide al leer; evento del outbox
  verificado en `greenhouse_sync.outbox_events`. Señal de confiabilidad propia queda como seguimiento.
- Production verification sequence: sección Rollout de esta task.

### Acceptance criteria additions

- [ ] Fuente de verdad, superficie del contrato y consumidores están nombrados con rutas y objetos reales.
- [ ] Invariantes, frontera de organización e idempotencia/concurrencia tienen cada uno su prueba contra PostgreSQL real.
- [ ] Cada tabla escrita queda declarada en el allowlist del dominio si existe; `quotations*` no aparece en ningún
      `INSERT`, `UPDATE` ni `SELECT` del agregado.
- [ ] Postura de migración y rollback comprobada: la task no agregó migraciones, y la bandera apagada devuelve 503
      sin abrir transacción.
- [ ] Evidencia de runtime registrada: cotizaciones de ejemplo, eventos del outbox y rutas de negación en staging.
- [ ] Ningún error, evento ni registro contiene importes, costos, textos del documento ni valores del pedido.

## Capability Definition of Done — Full API Parity gate

- [ ] La regla vive en `src/lib/commercial/quoter/**` y en el motor; ninguna ruta ni adaptador decide un estado.
- [ ] Modelado como agregado con comandos nombrados; ningún manejador acoplado a una pantalla.
- [ ] Lectura por lectores canónicos; escritura por comandos con semántica explícita, autorización fina por
      capacidad, idempotencia, auditoría, outbox, errores saneados y observabilidad.
- [ ] Capacidades y permisos: las siembra y otorga TASK-2025; esta task las usa sin ampliar permisos, y
      `capability-grant-coverage.test.ts` queda en verde. Aprobar una excepción la tiene únicamente `efeonce_admin`.
- [ ] Camino programático declarado: `api/platform/app` y `api/platform/ecosystem` (todo salvo aprobar una
      excepción, que va sólo por `app`); CLI en TASK-2028; MCP en TASK-2030.
- [ ] Escrituras aptas para `propose → confirm → execute`: aprobar una excepción **es** el único acto que el
      cotizador reserva a una persona; emitir dentro de política es un comando que un agente del carril de
      ecosistema ejecuta solo. Si Nexa lo ofrece, lo hace por su loop gobernado de siempre; no se construye
      integración específica para Nexa.
- [ ] Un primitive, muchos consumidores: cero lógica duplicada por carril.
- [ ] Parity check = SÍ a nivel de capacidad.

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

### Slice 1 — Reconciliación con TASK-2025, eventos, bandera y errores

- Leer el esquema materializado de `quoter_*` y la matriz sembrada, y escribir en un Delta de esta task toda
  diferencia con lo descrito aquí. Lo que difiera se resuelve a favor de TASK-2025.
- Agregar a `events.ts` y a `src/lib/sync/event-catalog.ts` el tipo de agregado y los siete tipos de evento.
- `flags.ts`: `isQuoterRegistryApiEnabled()`; fila en el libro de banderas.
- Tres códigos nuevos en `src/lib/api-platform/core/errors.ts`, códigos del agregado en `errors.ts` y sus filas en
  `quoter-errors.ts`.
- `human-gate.ts` y `request-hash.ts` con sus pruebas.

### Slice 2 — Crear cotización y agregar versión

- `commands/create-quote.ts` y `commands/add-version.ts`: resuelven versiones (puntero o huella), ejecutan en
  servidor la función de `compose quote`, rechazan lo que no calculó, guardan por `quote-store.ts` el texto del
  artefacto (el serializador único de la CLI) y su huella, registran el cambio de estado que corresponda (`none → draft` al crear; `issued → revising` al
  agregar sobre una emitida) y el evento.
- La organización dueña la pone el comando llamando a `resolveQuoterOwnerOrganizationId()` (TASK-2025): Efeonce
  siempre, también cuando quien crea es el sujeto máquina de un binding interno. `clientOrganizationId`, si viene,
  se valida como cliente o potencial cliente.
- Rutas `POST /quoter/quotes` y `POST /quoter/quotes/{quoteId}/versions` en ambos carriles.

### Slice 3 — Registrar una cotización hecha en local

- `commands/register-local-quote.ts`: acepta sólo `pricing-v3-resource-composition/1` calculado; carga de la base,
  por huella, las tres fuentes que el artefacto nombra; recalcula con ellas y con la demanda congelada; registra sólo
  si la huella resultante es la del artefacto; guarda la versión con `origin = 'local'`.
- Rutas `POST /quoter/quotes/register` y `POST /quoter/quotes/{quoteId}/versions/register` en ambos carriles.

### Slice 4 — Documento de una versión

- `commands/save-document.ts`: compone el documento contra el artefacto guardado con el brief recibido y guarda en
  `quoter_version_documents` el brief y el documento compuesto; las opciones e incrementos se nombran por
  referencia a otra versión guardada.
- `readers/document.ts`: el documento guardado, sin tocar, más los hechos del registro al lado.
- Rutas en ambos carriles.

### Slice 5 — Excepción, emisión, número y retiro

- `commands/approve-exception.ts` (sólo `app`), con la compuerta humana, la capacidad y la huella esperada.
- `commands/issue-quote.ts` y `commands/withdraw-quote.ts` (ambos carriles), con la capacidad, la huella esperada y
  la comprobación de política; sin compuerta humana. `commands/withdraw-draft.ts` (ambos carriles).
- El número no lo inserta el comando: la base lo asigna en la transacción de la primera emisión, de la serie que
  corresponde al `data_origin` de la cotización, y el comando lo devuelve.
- La ruta de aprobar una excepción existe sólo bajo `src/app/api/platform/app/quoter/quotes/**`. No se crea el
  archivo de ruta equivalente en `ecosystem`. Emitir y retirar tienen ruta en los dos carriles.

### Slice 6 — Lectores, verificación y documentación

- `readers/` de lista, cotización, versión, reproducción, vista previa e historial, con alcance por identidad.
- Corrida del exit gate en staging, rutas de negación, OpenAPI, catálogo de eventos, documentación funcional y
  manual.

## Out of Scope

- Escribir en `greenhouse_commercial.quotations*`, leerlas para calcular, o migrar sus filas.
- Envío a HubSpot, a Nubox o a cualquier CRM; sincronización de negocio, de líneas o de producto.
- Vincular una cotización con un negocio (`dealReference`): la identidad no admite cambios, la cotización suele nacer
  antes que el negocio y la mayoría de los negocios de HubSpot no están en `greenhouse_commercial.deals`. Se diseña
  con la salida a HubSpot, como asignación de sólo agregar.
- Render de PDF o HTML en producción, consumidor del `artifact-worker`, catálogo del compositor. El PDF se sigue
  generando en local con `scripts/documents/render-cotizacion-a4.mjs`.
- Interfaz, pantallas, vistas, herramientas de Nexa y herramientas MCP.
- Recálculo en segundo plano, tarea programada, proyección reactiva o consumidor del outbox.
- Fecha de inicio del servicio y duración del contrato, en el pedido o en el registro.
- Actualizar una versión guardada a un contrato, motor o catálogo más reciente.
- Enlace público, aceptación del cliente, firma, cobro, facturación, contrato y cierre de negocio.
- Otorgar una capacidad del cotizador a un rol de cliente, o abrir los lectores a identidades de cliente en
  producción (el mecanismo de alcance se construye y se prueba; el permiso es otra decisión).
- Cambiar el catálogo o mover el puntero (TASK-2029) y la capa de transporte de la CLI (TASK-2028).
- Vincular una propuesta de licitación con una cotización V3 (`proposals.quote_id`).
- Cambiar la plantilla A4 o su contrato de datos para imprimir número y versión (ver Open Questions).
- Lecturas internas por referencia distintas de reproducir, vista previa y documento (seguimiento).
- Un trabajo que reproduzca todo lo guardado ante un cambio de motor (seguimiento; esta task deja el lector que ese
  trabajo necesita).

## Detailed Spec

### Tabla de operaciones

Todas bajo `/api/platform/<carril>/quoter`. «C» comando (harness de comando, `Idempotency-Key` obligatorio), «L»
lector. «Persona» significa compuerta humana: sólo la fila 7 la lleva. Capacidades y estados son los de TASK-2025.

| # | Operación | Tipo | Método y ruta | Carriles | Capacidad | Efecto |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Crear cotización | C | `POST /quotes` | app, ecosystem | `commercial.quoter.quote:create` | recalcula la demanda; guarda la versión 1 (`origin = platform`); `none → draft`; sin número |
| 2 | Agregar versión | C | `POST /quotes/{quoteId}/versions` | app, ecosystem | `commercial.quoter.quote:create` | recalcula; versión N+1 que reemplaza a N; si la cotización está `issued`, `issued → revising`; en `draft` o `revising` no cambia el estado |
| 3 | Registrar cotización local | C | `POST /quotes/register` | app, ecosystem | `commercial.quoter.quote:create` | reproduce el artefacto contra fuentes por huella; igual que 1, con `origin = local` |
| 4 | Registrar versión local | C | `POST /quotes/{quoteId}/versions/register` | app, ecosystem | `commercial.quoter.quote:create` | igual que 2, con `origin = local` |
| 5 | Guardar documento | C | `POST /quotes/{quoteId}/versions/{n}/document` | app, ecosystem | `commercial.quoter.quote:update` | compone y agrega una fila a `quoter_version_documents`; no cambia el estado |
| 6 | Retirar borrador | C | `POST /quotes/{quoteId}/withdraw-draft` | app, ecosystem | `commercial.quoter.quote:update` | `draft → withdrawn` |
| 7 | Aprobar excepción bajo el piso | C | `POST /quotes/{quoteId}/versions/{n}/exception-approval` | **sólo app**, persona | `commercial.quoter.exception:approve` | agrega una fila a `quoter_exception_approvals`; no cambia el estado |
| 8 | Emitir | C | `POST /quotes/{quoteId}/issue` | app, ecosystem | `commercial.quoter.issue:approve` | `draft → issued` o `revising → issued`; fija `validUntil`; la base asigna el número en la primera emisión; bajo el piso exige la aprobación vigente |
| 9 | Retirar lo emitido | C | `POST /quotes/{quoteId}/withdraw` | app, ecosystem | `commercial.quoter.issue:approve` | `issued → withdrawn` o `revising → withdrawn`; desde `accepted` o `rejected` se abre antes una revisión |
| 10 | Listar cotizaciones | L | `GET /quotes` | app, ecosystem | `commercial.quoter.quote:read` | página por keyset sobre `quoter_quote_current` |
| 11 | Leer cotización | L | `GET /quotes/{quoteId}` | app, ecosystem | `commercial.quoter.quote:read` | identidad, `state`, `effectiveState`, `validUntil`, número si lo tiene y lista de versiones |
| 12 | Leer versión | L | `GET /quotes/{quoteId}/versions/{n}` | app, ecosystem | `commercial.quoter.quote:read`, sólo alcance interno | resumen del kernel; con `include=artifact`, el texto guardado |
| 13 | Reproducir versión | L | `GET /quotes/{quoteId}/versions/{n}/replay` | app, ecosystem | igual que 12 | `verified`, `calculationId`, huella y resumen, como `replay` de la CLI |
| 14 | Vista previa apta para cliente | L | `GET /quotes/{quoteId}/versions/{n}/preview` | app, ecosystem | `commercial.quoter.quote:read` | `projectCompositionPreview` del artefacto guardado |
| 15 | Datos del documento | L | `GET /quotes/{quoteId}/versions/{n}/document` | app, ecosystem | `commercial.quoter.quote:read` | documento guardado + hechos del registro |
| 16 | Asignar destinataria | C | `POST /quotes/{quoteId}/recipient` | app, ecosystem | `commercial.quoter.quote:update` | agrega una fila a `quoter_quote_recipients`; sólo en `draft`; rige la última |
| 17 | Historial | L | `GET /quotes/{quoteId}/history` | app, ecosystem | igual que 12 | cambios de estado y aprobaciones de excepción, con actor y motivo |
| 18 | Aceptar | C | `POST /quotes/{quoteId}/accept` | app, ecosystem | `commercial.quoter.quote:update` | `issued → accepted` o `revising → accepted`, sobre la última versión emitida; permitido aunque haya vencido, y queda legible que fue fuera de vigencia |
| 19 | Rechazar | C | `POST /quotes/{quoteId}/reject` | app, ecosystem | `commercial.quoter.quote:update` | `issued → rejected` o `revising → rejected`, sobre la última versión emitida; permitido aunque haya vencido |
| 20 | Reabrir | C | `POST /quotes/{quoteId}/reopen` | app, ecosystem | `commercial.quoter.quote:update` | `issued`, `accepted` o `rejected` → `revising`, sin versión nueva: para corregir el documento, renovar la vigencia o deshacer una respuesta mal registrada |

### Reglas por comando

**Crear y agregar versión (1, 2).** Cuerpo: `input` (la demanda `pricing-v3-composition-demand/1`), `versions`
opcional con la misma semántica de TASK-2026, `clientOrganizationId` opcional (sólo en 1; ver
«Organización»), `expectedVersion` obligatorio en 2. El servidor resuelve las fuentes, ejecuta la misma función que
la operación 9 de TASK-2026 y:

- si no calculó, responde 422 `quote_not_calculated` y no guarda nada. El detalle de lo que falta no viaja en este
  rechazo: se obtiene simulando la misma demanda con la operación 9 de TASK-2026, que lo devuelve completo. No existe
  `keepBlocked` en el registro; enviarlo se rechaza;
- si calculó, guarda por `quote-store.ts` el texto del artefacto —`JSON.stringify(artefacto, null, 2)` más salto de
  línea, el mismo que escribe la CLI— con su huella, `replay_digest`, `calculation_id`, `below_floor` y
  `origin = 'platform'`; contrato, motor, moneda y fuentes van al índice de lectura, que se reconstruye desde el
  texto. Antes de confirmar recalcula la huella del texto que va a guardar;
- `runNotices` se devuelve en la respuesta y no se guarda;
- en 2, la versión nueva es N+1 y reemplaza a N por su correlativo; no hay columna que lo declare. Ninguna fila
  anterior cambia: una versión no tiene estado propio. Sobre una cotización `withdrawn` responde 409
  `quoter_invalid_transition` (`version_locked`). Sobre una `issued`, el almacén registra primero
  `issued → revising` y después la versión;
- los cambios de estado automáticos (`none → draft`, `issued → revising`) llevan un motivo fijo que escribe el
  comando, porque la columna `reason` es obligatoria.
- Respuesta 201: `{ quoteId, version, artifactDigest, calculationId, state, summary }`, donde `summary` es el
  documento de `compose quote` sin `runNotices.output`. No hay número en la respuesta: un borrador no lo tiene.

**Registrar local (3, 4).** Cuerpo: `artifactText` (el artefacto congelado como texto, exactamente los bytes del
archivo local; el servidor lo guarda tal cual y lo lee de ahí, nunca lo reserializa), `clientOrganizationId`
opcional (sólo en 3), `expectedVersion` en 4. Orden fijo de comprobaciones, la primera que falla corta:

1. forma y familia: sólo `pricing-v3-resource-composition/1`; otra familia → 422 `artifact_family_not_accepted`
   (la columna de TASK-2025 admite las tres familias; este comando admite una);
2. el artefacto se reproduce a sí mismo (`replayResourceComposition`); si no, 422 `REPLAY_MISMATCH`;
3. su cotización está `calculated`; si no, 422 `quote_not_calculated`;
4. la base tiene, por huella, el catálogo, la política y los créditos que el artefacto nombra; si falta alguno, 422
   `source_version_not_held` con `option` del rol. No se importa una fuente desde el artefacto;
5. el servidor recalcula con las fuentes **de la base** y la demanda congelada; la huella resultante debe ser
   idéntica a `artifact.replayDigest`; si no, 422 `REPLAY_MISMATCH`;
6. se guarda `artifactText` tal cual, con `origin = 'local'`; el `calculation_id` es el del artefacto y quién registró queda
   en las columnas `registered_by_*`.

Un artefacto registrado dos veces con la misma clave de idempotencia devuelve la misma versión. Con otra clave, si
ese cálculo todavía vive en una cotización no retirada, responde 409 con el detalle `artifact_already_registered` y la
referencia a la cotización y la versión existentes; si la única cotización que lo tenía está retirada, crea una nueva.
La huella no es una llave única del registro (una restricción dejaría sin salida a quien retira un borrador y vuelve
a registrar): la regla la hace cumplir la función de escritura de TASK-2025, bajo bloqueo. `OUTPUT_EXISTS` nunca
llega al cliente.

**Guardar documento (5).** Cuerpo: `brief` (`pricing-v3-quote-document-brief/1`), `options` como lista ordenada de
`{ flag: "option" | "increment", key, quoteId, version }` (máximo 8, por referencia a versiones guardadas de la
misma organización dueña), `expectedVersion`. El comando compone con `composeQuoteDocument` contra el artefacto
guardado; un rechazo del motor (`QUOTE_DOCUMENT_*`, `SCHEDULE_MILESTONES_INVALID`, `QUOTE_INCREMENT_*`) se traduce
con la tabla de TASK-2026 y no guarda nada. Se guardan los dos textos que pide la tabla: `brief_text` (los textos y
las referencias a opciones, en texto canónico) y `document_text` (los datos que produjo `compose document`), cada uno
con su huella, más `template_data_version`. Corregir es agregar otra fila; rige la última. Un documento se guarda
mientras la cotización está en `draft` o en `revising`; en `issued` o `withdrawn` la base lo rechaza y el comando
responde 409 `quoter_invalid_transition` (`document_locked`). Para corregir el documento de una cotización emitida:
`issued → revising`, guardar, y emitir de nuevo; la emisión anterior sigue nombrando el documento que emitió.

**Retirar borrador (6).** Cuerpo: `reason`, `expectedVersion`. Sólo desde `draft`; no exige persona (un agente puede
descartar su borrador). Desde `issued` o `revising` responde 409 `quoter_invalid_transition`: eso es la operación 9.

**Aprobar excepción (7).** Cuerpo: `artifactDigest`, `reason` (mínimo 10 caracteres, el de la tabla),
`expectedVersion`. Persona con `commercial.quoter.exception:approve`, que TASK-2025 otorga sólo a `efeonce_admin`.

- Sólo si la versión está bajo el piso (`below_floor`, el veredicto del motor guardado con ella); aprobar una
  versión que no lo necesita responde 409 `quoter_invalid_transition` con `details.code = exception_not_applicable`.
  La base lo rechaza igual.
- `n` debe ser la última versión de una cotización en `draft` o `revising`.
- La fila vale para esa versión y esa huella (lo comprueba un disparador): una versión nueva no la hereda.
- La tabla guarda decisiones (`approved | revoked`) y rige la última: repetir la vigente con otra clave de
  idempotencia responde 409 `quoter_invalid_transition` con `details.code = exception_decision_unchanged`. Revocar
  es el mismo acto de persona con la decisión contraria (`decideException` en el almacén); si esta task expone la
  revocación como operación propia o como campo del cuerpo es decisión de su Discovery. Revocar después de emitir no
  deshace la emisión.
- El motivo se guarda en la fila y no viaja en el evento.
- **No existe solicitud ni rechazo de excepción**: TASK-2025 no modela ninguno de los dos y esta task no inventa una
  tabla ni un estado. Quien cotiza no «pide» por la API: la necesidad se lee del artefacto (lector 12 y lector 10).
  Un administrador que no aprueba no registra nada; la cotización sigue en su estado y se corrige con otra versión.

**Emitir (8).** Cuerpo: `version`, `artifactDigest`, `validUntil` (obligatorio, `YYYY-MM-DD`), `reason` opcional,
`expectedVersion`. Condiciones, todas en la transacción:

- `validUntil` no es anterior a hoy en `America/Santiago` (lo decide la base); sin él o mal formado, 422
  `validity_required`; ya pasado, 422 `validity_in_the_past`. Cada re-emisión fija la suya y el número no cambia;

- identidad con `commercial.quoter.issue:approve`: una persona con uno de los tres roles o un agente (ver «Autoridad
  para emitir y retirar»). No exige persona;
- la cotización tiene organización destinataria (asignada en `quoter_quote_recipients`); si no, 422
  `recipient_organization_required`;
- estado `draft` o `revising`, y `version` es la última de la cotización o la última emitida (volver a lo que el
  cliente tenía); otra responde 409 `quoter_invalid_transition` (`version_not_issuable`);
- opcionales `expectedClientOrganizationId` y `expectedDocumentDigest`: lo que quien emite vio. Si la destinataria
  o el documento vigentes son otros, 409 `quoter_version_conflict` (`recipient_conflict`, `document_conflict`);
- la huella guardada coincide con `artifactDigest` y con la recalculada del texto;
- si el kernel marca alguna fila bajo el piso, existe en `quoter_exception_approvals` una fila para esa versión con
  esa huella cuya última decisión es `approved`; si no, 409 `quoter_exception_approval_required`. Lo comprueba el
  almacén y lo vuelve a comprobar la base (`below_floor` y el disparador de la emisión). Vale para cualquiera que
  emita: es lo que hace que «dentro de política» sea una
  comprobación del servidor y no una promesa de quien llama;
- existe un documento guardado para la versión (propuesta: una cotización emitida siempre tiene documento; ver Open
  Questions); si no, 422 `document_required`;
- el cambio de estado se inserta con `version_number`, `artifact_digest`, `document_seq` y `document_digest`, que la
  tabla exige cuando el destino es `issued`: dicen qué versión y qué documento se emitió, con sus huellas;
- **número**: lo asigna la base en esta misma transacción si la cotización todavía no tiene uno, de la serie de su
  `data_origin`. Si ya lo tiene (`revising → issued`), no cambia: el número es el mismo y lo que distingue es la
  versión. Una emisión que no confirma no consume número.
- Respuesta 200: `{ quoteId, quoteNumber, version, artifactDigest, documentSeq, documentDigest, state, issuedAt }`.

**Aceptar y rechazar (18, 19).** Cuerpo: `version` y `artifactDigest` (lo que quien llama cree que el cliente
respondió), `reason` (en un rechazo, el motivo), `expectedVersion`. Identidad con `commercial.quoter.quote:update`,
persona o agente. Desde `issued` o `revising`.

- La respuesta es sobre la **última versión emitida**, con su documento: el almacén la fija por las mismas llaves
  foráneas que la emisión. Si `version` no es esa, 409 `quoter_version_conflict` (`not_last_issued_version`).
- Aceptar o rechazar una cotización vencida se permite. La respuesta y los lectores devuelven `acceptance`, con
  `afterValidity` y `daysAfterValidity` calculados por la base contra la vigencia de la emisión respondida; ningún
  comando ni lector recalcula ese dato. No existe un tope de antigüedad.
- Ninguna de las dos es terminal: una versión nueva (2, 4) o reabrir (20) las devuelve a `revising`. Es también la
  salida de una respuesta registrada por error.
- Respuesta 200: `{ quoteId, quoteNumber, version, artifactDigest, state, effectiveState, acceptance }`.

**Reabrir (20).** Cuerpo: `reason`, `expectedVersion`. Identidad con `commercial.quoter.quote:update`. Registra el
cambio a `revising` sin crear una versión. Lo que el cliente tiene sigue siendo la última versión emitida.

**Retirar lo emitido (9).** Cuerpo: `reason`, `expectedVersion`. Identidad con `commercial.quoter.issue:approve`,
persona o agente: quien puede emitir puede retirar (mismo principio que la emisión; CEO, 2026-10-12). Desde `issued`
o `revising`. `withdrawn` es terminal; el número, si existe, se conserva.

### Máquina de estados

El estado es **de la cotización** y la matriz es la que siembra TASK-2025 en `quoter_state_matrix` (sección
«`quoter_state_matrix` y `quoter_state_transitions`» de ese documento): `none → draft`, `draft → issued`,
`draft → withdrawn`, `issued → revising`, `revising → issued`, `issued → withdrawn`, `revising → withdrawn`,
`issued → accepted`, `issued → rejected`, `revising → accepted`, `revising → rejected`, `accepted → revising`,
`rejected → revising`; ninguno exige compuerta humana y sólo `withdrawn` es terminal. No se repite aquí para que no existan dos copias. Lo que agrega esta task es
qué comando dispara cada par:

| Par | Comando | Persona |
| --- | --- | --- |
| `none → draft` | 1, 3 | no |
| `issued → revising`, `accepted → revising`, `rejected → revising` | 2, 4 sobre una cotización emitida, aceptada o rechazada; 20 | no |
| `issued → accepted`, `revising → accepted` | 18 | no |
| `issued → rejected`, `revising → rejected` | 19 | no |
| `draft → withdrawn` | 6 | no |
| `draft → issued`, `revising → issued` | 8 | no |
| `issued → withdrawn`, `revising → withdrawn` | 9 | no |

- Las versiones no tienen ciclo de vida propio: son filas inmutables y la N+1 reemplaza a la N por su correlativo. «Versión emitida vigente» es la del último cambio de estado a `issued`, que la vista
  `quoter_quote_current` entrega.
- En `revising`, lo que ve un cliente sigue siendo la última versión emitida; la nueva no se muestra hasta emitirse.
- **Vencida no es un estado guardado.** Los lectores devuelven `state` (el guardado) y `effectiveState`, que vale
  `expired` cuando la cotización está `issued` o `revising` y la vigencia de su última emisión pasó. Lo calcula
  `quoter_quote_current`; ningún comando ni lector repite la regla. No hay proceso programado que marque vencidas.
- La aprobación de una excepción **no es un estado**: es una fila de `quoter_exception_approvals` que la emisión
  comprueba. Es el único acto de persona de esta task y por eso no aparece en esta tabla.
- Los comandos no deciden si un par existe ni si exige persona: insertan el cambio y traducen el rechazo de la base.
  La matriz en TypeScript (`state-machine.ts`) y su prueba de paridad son de TASK-2025.
- Qué capacidad exige cada acto lo resuelve la puerta única (`authz.ts`), no la matriz.

### Compuerta humana

El único acto humano de esta task es la operación 7, aprobar una excepción bajo el piso. El otro acto humano del
cotizador, activar el puntero del catálogo, es de TASK-2029 y usa esta misma comprobación. Emitir (8) y retirar (9)
no la llevan. Un acto humano exige, además de la capacidad:

1. carril `app` (no existe la ruta en `ecosystem`);
2. tenant interno con `memberId`;
3. una de dos credenciales:
   - sesión de portal o de primera parte (`authSource` `cookie_session` o `first_party_app`) con
     `tenant.authMode` distinto de `agent`; o
   - bearer delegado de una persona (`authSource = sister_platform_oauth`) emitido por inicio de sesión interactivo,
     cuyo `oauthSessionAuthMode` no es `agent` y cuyo `oauthClientId` es el cliente OAuth de la CLI del cotizador que
     siembra TASK-2028.

Un token de consumidor, una sesión de agente, un bearer delegado nacido de una sesión de agente o de otro cliente
OAuth, y cualquier identidad sin `memberId` reciben 403 `forbidden` con `details.code = human_gate_required`. Ese
código existe sólo para los dos actos humanos. El actor se guarda como `member`; la restricción de la base
(`actor_kind = 'member'` en las aprobaciones) es la segunda barrera. La comprobación vive en un solo lugar,
`human-gate.ts`.

El bearer delegado es el mecanismo aceptado por el CEO el 2026-10-12 (decisión 8): mientras no exista interfaz, una
persona ejerce los dos actos humanos iniciando sesión desde la CLI. Ya no es una pregunta abierta.

### Autoridad para emitir y retirar

Decisión del CEO del 2026-10-12: los agentes operan con autonomía. Emitir una versión que está dentro de política no
espera a ninguna persona, y quien puede emitir puede retirar.

- Personas: roles `efeonce_admin`, `efeonce_account` y `finance_admin`, que TASK-2025 otorga con
  `commercial.quoter.issue:approve`. Por `app`, con sesión o bearer.
- Agente por `ecosystem`: el token de consumidor con binding `internal` se convierte en el sujeto máquina de
  `ecosystem-quoter-scope.ts` (`userId: consumer:<publicId>`, `tenantType: 'efeonce_internal'`, rol
  `efeonce_account`), y la puerta única le aplica `can()` como a cualquier sujeto. Su derecho a emitir es la fila de
  permiso de ese rol; la plataforma no tiene un permiso por capacidad para un binding y esta task no inventa uno
  (TASK-2025, «Identidad de agente»).
- Agente por `app`: una sesión de agente (`tenant.authMode === 'agent'`) emite y retira si su rol tiene la capacidad.
- La puerta no distingue consumidores: todo binding interno activo recibe el mismo sujeto máquina. Quién actuó queda
  en la fila de ejecución del comando (`principal_id`) y el actor del cambio de estado se guarda como `agent`.
- «Dentro de política» lo decide el servidor y vale para todos: pisos, costos y estado salen del catálogo vigente y
  del motor, nunca del pedido, y una versión con filas bajo el piso no se emite sin su aprobación registrada.
- Lo que un agente no puede: aprobar una excepción (operación 7) y activar el puntero (TASK-2029).

### Organización

- **Dueña** (`owner_organization_id`, obligatoria): Efeonce, siempre, la cree una persona o un agente (CEO,
  2026-10-12). La resuelve el servidor en una sola función, `resolveQuoterOwnerOrganizationId()` de TASK-2025, que
  busca la organización canónica por su identificador público estable `EO-ORG-0007` y exige que sea la entidad
  operativa activa; el UUID no se escribe en código. Ninguna ruta acepta `organizationId`, `ownerOrganizationId` ni
  un estado. Con esto queda resuelto el bloqueo del Slice 2: un binding `internal` no trae organización y no la
  necesita. Si la fila no existe o no es la entidad operativa, el comando responde 500 con captura y no escribe.
- **Destinataria** (`quoter_quote_recipients`): contenido de la cotización. Las operaciones 1, 3 y 16 la reciben como
  `clientOrganizationId`; el servidor comprueba que exista en `greenhouse_core.organizations`, que esté activa, que
  no sea la entidad operativa y que su etapa sea `prospect`, `opportunity` o `active_client`; si no, 422
  `recipient_organization_invalid`. No concede ni amplía acceso a quien la escribe ni a la organización nombrada.
  **Opcional en un borrador, obligatoria para emitir** (operación 8). Se puede asignar al crear o después, y
  reasignar mientras la cotización esté en `draft` (operación 16): rige la última asignación. Desde la primera emisión
  queda congelada; asignar entonces responde 409 `recipient_locked`. Un prospecto que todavía no es una organización
  se crea antes por la puerta canónica de organizaciones.
- Alcance de lectura: identidad interna con `commercial.quoter.quote:read` (persona o sujeto máquina) → todas las
  cotizaciones, porque la dueña es siempre Efeonce. Identidad ligada a una organización (sesión cliente o binding de
  organización) → sólo las operaciones 10, 11, 14 y 15, sólo cotizaciones cuya destinataria vigente es la suya y
  sólo la versión emitida vigente; en 10 y 11 recibe número, versión emitida, fecha de emisión, moneda y estado, sin
  versiones internas, huellas ni origen.
- Fuera de alcance, inexistente, o no visible para la audiencia: el mismo 404 `not_found`, con el mismo cuerpo.
- TASK-2025 no otorga ninguna capacidad del cotizador a roles de cliente, así que hoy una identidad ligada a una
  organización recibe 404 en todo: el mecanismo se construye y se prueba con un sujeto de prueba, y abrirlo es otra
  decisión.

### Idempotencia, huella del pedido y concurrencia

- `Idempotency-Key` es obligatorio en todo comando; sin él, 400 `bad_request` con `details.code = MISSING_ARGUMENT`.
- `request_hash` = sha256 del JSON estable de `{ operación, quoteId, versión, cuerpo }`. Misma clave y misma huella
  devuelve la respuesta guardada con `Idempotency-Replayed: true`; misma clave y otra huella, 409
  `idempotency_conflict`.
- `expectedVersion` es el número de la última versión que el llamador conoce; al aprobar una excepción y al emitir
  se envía además `artifactDigest`. Si la cotización avanzó, 409 `quoter_version_conflict`: la acción es recargar.
- El reclamo de idempotencia, las filas del agregado, el cambio de estado o la aprobación, el número y el evento van
  en una transacción. Si el evento no se puede insertar, no hay cambio.

### Eventos

Tipo de agregado `quoter_quote`. Un tipo por acto que existe: `commercial.quoter.quote.created` (1, 3),
`commercial.quoter.quote.version_registered` (2, 4), `commercial.quoter.quote.revision_started` (`issued →
revising`), `commercial.quoter.quote.document_saved` (5), `commercial.quoter.quote.exception_approved` (7),
`commercial.quoter.quote.issued` (8), `commercial.quoter.quote.withdrawn` (6, 9).

Carga útil: `quoteId`, número si existe, versión y la que reemplaza, huella del artefacto, contrato y motor,
`origin`, estado anterior y nuevo, tipo de actor e identificador de persona cuando aplica, organización dueña y
cliente por identificador y `data_origin`. Nunca importes, costos, márgenes, textos, motivo ni nombres. No
colisionan con `commercial.quotation.*` del cotizador actual ni con los dos eventos de catálogo de TASK-2025. No hay
evento de solicitud ni de rechazo de excepción porque esos actos no existen. Esta task no agrega ningún consumidor.

### Traducción de errores (filas que se agregan a la tabla de TASK-2026)

| Causa del registro | HTTP | `errors[0].code` | `details.code` |
| --- | --- | --- | --- |
| Pedido mal formado, opción no admitida, falta `Idempotency-Key` | 400 | `bad_request` | `SCHEMA_INVALID`, `UNKNOWN_OPTION` o `MISSING_ARGUMENT` |
| Recurso inexistente, fuera de alcance o no visible para la audiencia | 404 | `not_found` | — |
| Identidad interna sin la capacidad | 403 | `forbidden` | — |
| Aprobación de una excepción pedida por un agente, una máquina o un bearer no admitido (único acto humano de esta task; el otro, activar el puntero, es de TASK-2029) | 403 | `forbidden` | `human_gate_required` |
| El cálculo no terminó calculado | 422 | `bad_request` | `quote_not_calculated` |
| Familia de artefacto no admitida | 422 | `bad_request` | `artifact_family_not_accepted` |
| La base no tiene una fuente que el artefacto nombra | 422 | `bad_request` | `source_version_not_held` |
| El artefacto no reproduce su huella | 422 | `bad_request` | `REPLAY_MISMATCH` |
| Emisión sin documento guardado | 422 | `bad_request` | `document_required` |
| Emisión sin vigencia, con vigencia mal formada o ya pasada | 422 | `bad_request` | `validity_required` o `validity_in_the_past` |
| Revocar la aprobación de una versión ya emitida | 409 | `quoter_invalid_transition` | `exception_revocation_locked` |
| Emisión de una cotización sin organización destinataria (`recipient_required` en el almacén) | 422 | `bad_request` | `recipient_organization_required` |
| Organización destinataria inexistente, inactiva, que es la entidad operativa o que no es cliente ni potencial cliente | 422 | `bad_request` | `recipient_organization_invalid` |
| El mismo cálculo ya vive en una cotización no retirada | 409 | `quoter_artifact_already_registered` | `artifact_already_registered`, con la cotización y la versión existentes |
| Asignar destinataria a una cotización que ya fue emitida | 409 | `quoter_invalid_transition` | `recipient_locked` |
| La cotización avanzó desde lo que el llamador conoce | 409 | `quoter_version_conflict` | `version_conflict`, `state_conflict`, `recipient_conflict`, `document_conflict` o `not_last_issued_version` |
| El estado no admite el acto | 409 | `quoter_invalid_transition` | `invalid_transition`, `version_locked`, `version_not_issuable`, `document_locked`, `exception_not_applicable` o `exception_decision_unchanged` |
| Fila bajo el piso y no existe aprobación para esa versión y esa huella | 409 | `quoter_exception_approval_required` | `exception_approval_required` |
| Misma clave de idempotencia, otro pedido | 409 | `idempotency_conflict` | — |
| Bandera apagada | 503 | `service_unavailable` | `quoter_registry_disabled` |
| Huella guardada que no coincide al leer | 500 | `internal_error` | — |

Los tres 409 propios tienen acción distinta (recargar; nada que reintentar; conseguir la aprobación) y por eso
reciben código propio en `ApiPlatformErrorCode`, como exige la arquitectura de la API. Los códigos en minúsculas son
del agregado (`src/lib/commercial/quoter/errors.ts`, lista cerrada); los de mayúsculas son del registro del motor,
que no se amplía. Todo rechazo del motor dentro de un comando usa la tabla de TASK-2026 sin cambios.

### Lectores

- Toda lectura de una versión recalcula la huella del texto guardado antes de responder. Si no coincide: 500, captura
  en Sentry y ningún dato.
- Lista por keyset. Reglas del repo que aplican y deben probarse contra PostgreSQL real paginando una corrida
  completa y comparando cantidad y secuencia: no dar a una expresión el alias de la columna por la que se ordena;
  forzar la misma colación en SQL y en JS (`COLLATE "C"` y puntos de código) incluido el índice del keyset; con
  `NULL` en la clave, escribir la comparación del cursor expandida. El número es `NULL` en todo borrador: no se
  ordena ni se pagina por él.
- El lector de documento devuelve `data = { document, registry }`: `document` es `document_text` de la última fila
  de `quoter_version_documents`, sin tocar; `registry` trae `quoteNumber`, `version`, `state`, `issuedAt` y
  `artifactDigest`. Antes de la primera emisión `quoteNumber` e `issuedAt` son `null` y `document.status` sigue
  siendo `draft`. Los datos de la plantilla v2 no tienen claves para número ni versión y la plantilla rechaza claves
  desconocidas: por eso viajan al lado y no dentro.
- La vista previa y el documento salen de `clientSafePeriodItems`; ningún lector de esta task filtra costos por su
  cuenta. `include=artifact` existe sólo en el lector 12 y sólo con alcance interno.
- El lector 12 dice, leyendo el resumen del kernel, si la versión tiene filas bajo el piso y si tiene aprobación:
  es la única forma de saber qué espera una excepción, porque no hay columna ni estado para eso.

### Filas sintéticas en la instancia compartida

Staging y producción comparten base de datos: una cotización de ejemplo registrada desde staging es una fila que
producción ve y que no se puede borrar. TASK-2025 lo resuelve con `data_origin = 'synthetic'` y una serie de número
aparte (su propio contador, `EO-QTE-T-1` en adelante), aprobada por el CEO el 2026-10-12. Regla de esta task: `data_origin` lo decide el servidor
y nunca un campo del pedido. Cómo lo decide es lo único que sigue abierto; la propuesta es derivarlo de la
organización destinataria (una cotización para la organización de pruebas designada es sintética). Toda cotización
del exit gate es sintética; si alguna se emite, toma su número de la serie sintética. Una fila `real` creada por una
prueba, un canario o un exit gate es un incidente; una fila `real` creada por un agente que cotiza un negocio es el
uso normal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6. El Slice 1 cierra con la diferencia contra el esquema
materializado escrita en la task antes de cualquier comando. La regla de la organización dueña quedó resuelta el
2026-10-12 (Efeonce siempre) y ya no condiciona el Slice 2. Ningún comando llega a `develop` sin su prueba contra
PostgreSQL real. Ninguna fila se escribe en la instancia compartida antes de que la regla de filas sintéticas esté
confirmada por el operador. La bandera no se enciende en producción antes de que el exit gate de staging esté
registrado. Nada de esta task empieza antes de que TASK-2025 y TASK-2026 estén completas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Guardar el artefacto altera su huella | Data | medium | Texto canónico en columna `text`; huella recalculada antes de confirmar y en cada lectura; prueba sobre el corpus | 500 con captura en Sentry al leer |
| Se registra un cálculo bloqueado o un resultado calculado fuera | Motor V3 | low | El servidor recalcula siempre; rechazo antes de abrir escritura; `keepBlocked` no existe aquí; `CHECK` de la tabla | prueba de negación del exit gate |
| Un agente aprueba una excepción bajo el piso | Identity | medium | `human-gate.ts` + restricción en la base + ausencia de ruta en `ecosystem` | prueba de negación con sesión de agente y con token de consumidor |
| Cualquier consumidor con binding interno puede emitir, no sólo la CLI | Identity | medium | La puerta no distingue consumidores y la plataforma no tiene un permiso por capacidad para un binding; sólo lo tienen el gateway MCP y, desde TASK-2026, `efeonce-quoter-cli`, y el gateway no ofrece la herramienta sin su clase de escritura (TASK-2030); auditoría por `principal_id` | emisión cuyo `principal_id` no es el consumidor de la CLI ni una persona |
| Una organización ve cotizaciones de otra | Access | medium | Alcance desde la identidad; 404 uniforme; prueba con dos organizaciones y un sujeto ligado a una | prueba de negación |
| Costos llegan a un cliente | Access | low | Identidad ligada a organización sólo en cuatro lectores, todos sobre el único filtro; `include=artifact` sólo interno | prueba de negación |
| Filas de ejemplo de staging aparecen como reales o gastan la numeración | Data | high | `data_origin` decidido en servidor; secuencia sintética; exit gate sólo con filas sintéticas | cotizaciones `real` creadas por una prueba, un canario o un exit gate |
| Dos comandos simultáneos crean la misma versión | Data | medium | Bloqueo por cotización de TASK-2025, `expectedVersion`, llave primaria `(quote_id, version_number)` | 409 `quoter_version_conflict` |
| Un reintento duplica una cotización | Data | medium | `Idempotency-Key` obligatorio + huella del pedido + transacción única | filas duplicadas por clave |
| Evento publicado sin cambio de estado, o al revés | Outbox | low | Evento dentro de la transacción; sin evento no hay confirmación | fila de agregado sin evento hermano |
| La matriz sembrada no trae un par que un comando usa | Data | low | Esta task usa sólo los siete pares de TASK-2025; un par faltante detiene la task y va como Delta a TASK-2025 | rechazo de la base en una transición esperada |
| Emisión bajo el piso sin aprobación, por una persona o por un agente | Finance | medium | El comando lee el veredicto del kernel en el artefacto y exige la fila de `quoter_exception_approvals` para esa versión y huella; pisos y costos salen del catálogo vigente y del motor, nunca del pedido | prueba de negación con persona y con agente |
| Un borrador consume un número, o una cotización recibe dos | Data | low | El número se inserta sólo en la primera emisión; `quote_id` es llave primaria de `quoter_quote_numbers` | fila de número sin cambio de estado a `issued` |
| Una excepción pendiente no la ve nadie | Finance | medium | No hay estado ni tabla de solicitud: el lector 12 expone el veredicto del kernel y si hay aprobación; cola de pendientes queda como seguimiento | sin señal — revisión manual |
| El registro de un artefacto local supera el límite de cuerpo | Vercel | medium | Tope declarado; 413 documentado; el artefacto más grande del repo mide cerca de 2,5 MB | 413 en staging |
| Un consumidor confunde estos eventos con los del cotizador actual | Outbox | low | Prefijo `commercial.quoter.*`; catálogo de eventos al día; cero consumidores nuevos | sin señal — revisión del catálogo |

### Feature flags / cutover

- `QUOTER_REGISTRY_API_ENABLED`, default `false`. **Se lee sólo en Vercel** (rutas de registro en `app` y
  `ecosystem`). Ningún worker la lee: el publicador del outbox de `ops-worker` publica cualquier evento registrado
  sin conocer esta bandera, así que no entra en ningún `services/*/deploy.sh`. Confirmar con
  `grep -rn "QUOTER_REGISTRY_API_ENABLED" src/ services/`.
- Independiente de `QUOTER_COMPUTE_API_ENABLED`; orden de encendido: cálculo primero.
- Apagada: comandos y lectores del registro responden 503 `quoter_registry_disabled` sin abrir transacción.
- Orden: `staging` → redeploy → exit gate → `Production` con autorización del operador → redeploy.
- Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR, con runtime «Vercel».
- No hay cutover de consumidores: nadie usa el registro hasta TASK-2028.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el PR; no hay datos que deshacer | minutos | si |
| Slice 2 | Bandera a `false` + redeploy; las cotizaciones creadas se conservan | menos de 10 min | parcial: lo escrito no se borra |
| Slice 3 | Bandera a `false` + redeploy; las versiones registradas se conservan | menos de 10 min | parcial: lo escrito no se borra |
| Slice 4 | Bandera a `false` + redeploy; los documentos guardados se conservan | menos de 10 min | parcial: lo escrito no se borra |
| Slice 5 | Bandera a `false` + redeploy; una emisión ya hecha se corrige con una versión nueva o un retiro, nunca con SQL | menos de 10 min | no: el cambio de estado, la aprobación y el número asignado son permanentes |
| Slice 6 | Revertir lectores y documentación | minutos | si |

### Production verification sequence

1. Local: pruebas contra PostgreSQL real (`pnpm test:live`, serializado), paridad de la matriz,
   `capability-grant-coverage.test.ts`, `pnpm local:check`.
2. Confirmar por lectura que las tablas, la matriz y las capacidades de TASK-2025 están aplicadas en la instancia
   compartida. Esta task no aplica migraciones.
3. Push a `develop` con la señal del operador; deploy de staging en verde con la bandera apagada: una ruta por
   carril responde 503 `quoter_registry_disabled`.
4. Bandera en `staging` + redeploy. Exit gate por los dos carriles, sólo con filas sintéticas:
   a. crear cotizaciones de ejemplo desde demandas del corpus y registrar artefactos locales del corpus;
   b. reproducir cada una desde la base (`…/replay`) y comparar la huella con la del repo;
   c. una demanda que no calcula responde 422 `quote_not_calculated` y no deja fila;
   d. un agente (token de consumidor por `ecosystem` y sesión de agente por `app`) emite una versión sintética que
      está dentro de política: 200, con número de la serie sintética; pide aprobar una excepción: 403
      `human_gate_required` en `app`, y el carril `ecosystem` no tiene esa ruta; emite una versión bajo el piso sin
      aprobación: 409 `quoter_exception_approval_required`;
   e. una identidad ligada a otra organización pide una cotización existente: 404, igual que un identificador
      inexistente;
   f. cada comando dejó su evento en `greenhouse_sync.outbox_events` y el publicador lo pasó a `published`.
5. Producción: release por el control plane con la bandera apagada; comprobar el 503. Encender con autorización del
   operador y redeploy. Canario de sólo lectura por `ecosystem` (lista, una cotización sintética, reproducción) y
   las mismas negaciones. Ninguna emisión real como prueba.
6. Registrar SHA, valores de bandera leídos, identificadores de las filas sintéticas y resultado en la task y en el
   Handoff.

### Out-of-band coordination required

- Sesión de TASK-2025: cualquier necesidad de esquema que aparezca en Discovery va como Delta a su task; aquí no
  se agrega una migración.
- Operador: confirmar la regla de filas sintéticas y la organización de pruebas antes de escribir en la instancia
  compartida. El bearer delegado de una persona como acto humano quedó aceptado por el CEO el 2026-10-12.
- Operador: alta de `QUOTER_REGISTRY_API_ENABLED` en Vercel por entorno y sus redeploys.
- Sesiones de TASK-2028 y TASK-2030: avisar cuando la tabla de operaciones y la de errores queden fijas.
- Avisar a las sesiones activas antes de registrar filas sintéticas en la instancia compartida.
- Ningún cambio en HubSpot, Nubox, Entra ni el gateway `efeonce-mcp`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las dieciséis operaciones de la tabla existen con su ruta; la de acto humano (7) no tiene archivo de ruta bajo
      `src/app/api/platform/ecosystem/quoter/**`; emitir (8) y retirar (9) existen en los dos carriles.
- [ ] Crear y agregar versión recalculan en servidor desde la demanda con las versiones resueltas; un cuerpo que
      trae un resultado, un artefacto, un piso, un costo, una organización dueña o un estado es rechazado.
- [ ] Una demanda que no calcula responde 422 `quote_not_calculated` y no deja ninguna fila en ninguna tabla
      `quoter_*` ni evento en el outbox.
- [ ] La versión guardada es el texto canónico del artefacto; su huella se comprueba al escribir y en cada lectura;
      una fila alterada a mano en una base de prueba hace que el lector responda 500 sin datos.
- [ ] Registrar un artefacto local lo guarda sólo cuando la huella recalculada con las fuentes de la base coincide
      con la suya; un artefacto con un byte cambiado, uno bloqueado, uno de otra familia y uno que nombra una fuente
      que la base no tiene son rechazados con el código de la tabla. La versión queda con `origin = 'local'`.
- [ ] `runNotices`, las lecturas derivadas y los cálculos bloqueados no aparecen en ninguna columna de `quoter_*`.
- [ ] Guardar documento compone contra el artefacto guardado y guarda `brief_text` y `document_text` con sus
      huellas; un brief con un importe, una moneda, una tasa o una fecha es rechazado; las opciones se nombran por
      referencia y nunca por artefacto subido; para una versión ya emitida la base rechaza una fila nueva.
- [ ] El lector de documento devuelve el documento guardado sin modificar y, al lado, número, versión y estado;
      antes de la primera emisión el número es `null`.
- [ ] El estado es de la cotización y sólo cambia por los siete pares de la matriz de TASK-2025; ningún comando
      decide si un par existe, y ninguna tabla ni respuesta trae un estado por versión.
- [ ] Aprobar una excepción deja una fila en `quoter_exception_approvals` para esa versión y esa huella, y lo logra
      únicamente una persona con rol `efeonce_admin`; otro rol interno recibe 403. No existe ruta, estado ni fila de
      solicitud o de rechazo de excepción.
- [ ] Emitir una versión que el kernel marca bajo el piso sin fila de aprobación para esa versión y esa huella
      responde 409 `quoter_exception_approval_required`, la pida una persona o un agente; con la fila, emite; una
      aprobación de la versión anterior no sirve para la nueva.
- [ ] Una sesión de agente, un token de consumidor y un bearer delegado nacido de una sesión de agente reciben 403
      `human_gate_required` en la operación 7, aun con la capacidad otorgada; una persona con rol `efeonce_admin` la
      completa con sesión de portal y con el bearer delegado del cliente OAuth de la CLI.
- [ ] Un agente —el sujeto máquina de un binding interno por `ecosystem` y una sesión de agente por `app`— emite y
      retira una versión que está dentro de política sin intervención de una persona; el cambio de estado queda con
      actor `agent`. Ninguna respuesta de las operaciones 8 y 9 trae `human_gate_required`.
- [ ] Emitir y retirar lo emitido exigen `commercial.quoter.issue:approve` y la tienen `efeonce_admin`,
      `efeonce_account` y `finance_admin`; un rol interno sin ella recibe 403. Retirar un borrador exige
      `commercial.quoter.quote:update`. Ninguna de las tres exige persona.
- [ ] Emitir una cotización sin organización destinataria responde 422 `recipient_organization_required`; crear con
      una destinataria que no es cliente ni potencial cliente responde 422 `recipient_organization_invalid`.
- [ ] Agregar una versión a una cotización `issued` la deja en `revising`; emitirla la devuelve a `issued` con el
      mismo número, y el cambio de estado guarda la versión y la huella emitidas.
- [ ] **Número:** una cotización en `draft` no tiene fila en `quoter_quote_numbers` ni número en ninguna respuesta;
      la primera emisión inserta una fila, una sola vez; una segunda emisión no inserta otra; una cotización
      sintética toma su número de la serie sintética; `data_origin` no se puede fijar desde el pedido.
- [ ] Todo comando sin `Idempotency-Key` responde 400; repetido con la misma clave y el mismo cuerpo devuelve la
      misma respuesta sin duplicar filas; con la misma clave y otro cuerpo responde 409 `idempotency_conflict`.
- [ ] Dos comandos concurrentes sobre la misma cotización: uno gana y el otro recibe 409 `quoter_version_conflict`.
- [ ] Cada comando deja en la misma transacción su fila de auditoría del harness, su fila del agregado (versión,
      cambio de estado, aprobación, documento o número) y un evento en `greenhouse_sync.outbox_events`; una falla
      inyectada al insertar el evento revierte todo.
- [ ] Los eventos contienen sólo identificadores, número, versión, estados, huellas, origen y `data_origin`.
- [ ] Un sujeto ligado a una organización recibe únicamente la proyección apta para cliente de la versión emitida de
      cotizaciones cuyo cliente es su organización; organización ajena, borrador, versión no emitida e identificador
      inexistente responden el mismo 404; y ningún rol de cliente recibió una capacidad del cotizador en esta task.
- [ ] La organización dueña de toda cotización es la canónica de Efeonce, resuelta en una sola función por
      referencia estable, la cree una persona o un agente; ninguna ruta la lee del pedido.
      `clientOrganizationId` se acepta sólo en las operaciones 1, 3 y 16, se valida contra `greenhouse_core.organizations`
      y no cambia lo que puede ver quien la envía.
- [ ] Ningún `INSERT`, `UPDATE`, `DELETE` ni `SELECT` del agregado toca `greenhouse_commercial.quotations*`.
- [ ] Ningún archivo de esta task agrega una llamada a HubSpot, un render de PDF, una pantalla, una tarea en segundo
      plano, una fecha de inicio ni una duración de contrato.
- [ ] La lista pagina una corrida real completa con la misma cantidad y secuencia que lo guardado.
- [ ] Con `QUOTER_REGISTRY_API_ENABLED` apagada, comandos y lectores responden 503 sin abrir transacción.
- [ ] `pnpm vercel:reachability-gate` en verde con las rutas nuevas.
- [ ] **Exit gate:** en staging, cotizaciones de ejemplo sintéticas creadas desde demandas y registradas desde
      artefactos del corpus se reproducen desde la base con huella idéntica a la del repo; un cálculo bloqueado es
      rechazado como cotización; una identidad de agente es rechazada al aprobar una excepción (activar el puntero, el
      otro acto de persona, se comprueba en TASK-2029), EMITE una versión que está dentro de política y es rechazada
      cuando la versión está bajo el piso sin aprobación; una organización ajena recibe 404. La evidencia está
      enlazada en esta task.

## Verification

- `pnpm task:lint --task TASK-2027`
- `pnpm local:check` (incluye `pnpm vercel:reachability-gate`, lint y `tsc`)
- `pnpm pricing:v3:test`
- `pnpm vitest run src/lib/commercial/quoter src/lib/api-platform/resources`
- `pnpm vitest run src/lib/entitlements/capability-grant-coverage.test.ts`
- `pnpm test:live` serializado para comandos y lectores contra PostgreSQL real
- `pnpm migration-marker-gate`: sin migraciones en esta task; si aparece una, la task se salió de alcance
- `pnpm test` (suite completa) al cierre; `pnpm build` sólo con autorización del operador
- `pnpm flags:audit --strict --no-vercel` y `pnpm docs:closure-check`
- `pnpm qa:gates --changed`, `pnpm ops:lint --changed`, `pnpm docs:context-check:strict`
- `pnpm finance:e2e-gate`: **no dispara**. Su patrón es `src/app/api/finance/**/route.ts` y estas rutas viven en
  `src/app/api/platform/**`, así que el gate no las ve y un tag `[downstream-verified]` no tendría qué respaldar. Lo
  que el gate protege —que un endpoint responda bien mientras su efecto posterior calla— sí aplica a estos comandos
  y se exige aquí como criterio propio: evento en el outbox publicado y versión reproducida desde la base.
- Exit gate en staging con la evidencia adjunta.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Documentación técnica: sección de registro en `docs/architecture/GREENHOUSE_QUOTER_V3_API_CONTRACT_V1.md`
      (operaciones, comandos por par de la matriz, compuerta humana, organización, errores), OpenAPI
      `quoter-registry.v1` y los siete eventos en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.
- [ ] Documentación funcional: `docs/documentation/finance/cotizador-v3-registro-de-cotizaciones.md`.
- [ ] Manual: `docs/manual-de-uso/finance/registrar-y-emitir-cotizacion-v3.md` (crear, registrar lo local, guardar
      el documento, cómo saber que una versión necesita excepción y cómo aprobarla, emitir, retirar, qué significa cada
      estado, qué no hacer).
- [ ] `docs/documentation/finance/cotizador-v3-promocion-canonica.md` recibe una nota fechada; `EPIC-053`, el ítem
      `QUOTE_REGISTRY_IN_GREENHOUSE` de `data/pricing/v3-operating/operational-gaps.json` y la skill
      `efeonce-pricing-operator` (y su espejo) quedan al día con lo que existe y lo que no.
- [ ] Barrido de impacto sobre las tasks que suponen el cotizador actual y dependen de una versión o de una emisión
      (firma por versión, enmiendas, enlace compartido, cierre de negocio): un Delta en cada una que diga qué expone
      ya el registro V3.
- [ ] `Status real` y los criterios tildados reflejan la evidencia; el estado es `code complete, rollout pendiente`
      mientras la bandera no esté encendida y verificada en producción.
- [ ] `Blocked by` de TASK-2028 y TASK-2030 actualizado al cerrar.

## Follow-ups

- Lecturas internas por referencia a una versión guardada (`explain`, `assess`, `split`, `schedule`, `cash`,
  `commitments`, `increment` entre dos versiones): resuelven el límite de tamaño de las lecturas con varios
  artefactos de TASK-2026.
- Reproducción de todo lo guardado ante un cambio de motor, antes de habilitarlo (la frontera de promoción pide
  extender la guarda de artefactos congelados a lo persistido).
- Señal de confiabilidad para huellas que no coinciden al leer.
- Cola de excepciones pendientes y registro de una solicitud o de un rechazo: hoy no existe tabla ni columna para
  eso; si se quiere, es un Delta de esquema en TASK-2025 con su decisión.
- Número y versión impresos en la plantilla A4: versión nueva de sus datos, con su propia decisión.
- Abrir los lectores aptos para cliente a identidades de cliente, con su permiso y su superficie.
- Vínculo de una propuesta de licitación con una cotización V3 (unidad de retiro del cotizador actual en EPIC-053).
- Enlace público y aceptación como capacidades separadas del agregado.

## Open Questions

- **Documento obligatorio para emitir.** Propuesto aquí; la decisión no lo exige de forma expresa.
- **Cómo decide el servidor que una fila es sintética.** Propuesto: por la organización de pruebas designada como
  destinataria. El esquema guarda el resultado (`data_origin`), no la regla. Es lo único abierto de ese frente.
- **Excepción sin aprobar.** No hay registro de una solicitud ni de un rechazo. Confirmar que basta con que la
  necesidad se lea del artefacto y con que no aprobar no deje huella.

Resueltas por el CEO el 2026-10-12 (ya no abiertas):

- **Organización dueña de una identidad sin organización.** Efeonce siempre, por referencia estable; el Slice 2
  queda sin bloqueo.
- **Organización destinataria obligatoria o no.** Cliente o potencial cliente; opcional en un borrador, obligatoria
  para emitir.
- **Bearer delegado como persona.** Aceptado: mientras no haya interfaz, la persona inicia sesión desde la CLI.
- **Roles con capacidad de emitir** y **prefijo del número.** `efeonce_admin`, `efeonce_account` y `finance_admin`,
  además de los agentes dentro de política; `EO-QTE-`, la primera cotización real es `EO-QTE-15001`.
- **Cotizaciones de prueba.** Sintéticas, con numeración aparte.
- **Propuestas de licitación.** El flujo que exige una cotización del cotizador actual no se usa: no bloquea.

Resuelto por TASK-2025 y ya no abierto: el número se asigna en la primera emisión; el estado es de la cotización; la
excepción es un acto registrado y no un estado.
