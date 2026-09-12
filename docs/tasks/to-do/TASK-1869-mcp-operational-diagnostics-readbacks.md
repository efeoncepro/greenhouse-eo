# TASK-1869 — Diagnóstico operativo por MCP: readbacks gobernados para agentes cloud

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
- Epic: `EPIC-044`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un agente que corre en cloud (Claude Code web, Codex cloud) no puede hoy responder una pregunta operativa básica
—«cuántas postulaciones tiene esta vacante y por qué el desk muestra cero»— sin que el operador encienda su
máquina y corra un script. Esta task expone ese diagnóstico como **readbacks agregados read-only** por el lane
ecosystem y las tools MCP que ya existen, sin abrir acceso a Cloud SQL ni exponer PII.

## Why This Task Exists

El canal ya existe y está sano: `mcp.efeonce.org` responde `gateway: ready` con seis providers `enabled`, y el
manifiesto canónico ya federa diez tools de dominio `platform` (`get_platform_health`, `get_context`,
`list_capabilities`, `get_integration_readiness`, `get_greenhouse_skill`, entre otras). Lo que falta no es
infraestructura de acceso: es **superficie de lectura operativa**.

Los providers de dominio vigentes responden preguntas sobre *entidades* —el provider `greenhouse-hiring`
(`TASK-1726`/`TASK-1718`) expone Talent Pool y revisión de candidatos, siempre sobre personas y con DTOs
allowlisted—. Ninguno responde preguntas sobre *el estado del sistema*: cuántas filas hay, en qué etapa, con qué
procedencia, qué intentos fallaron y por qué. Esa asimetría obliga a que todo diagnóstico pase por la máquina del
operador, lo que convierte una laptop en punto único de falla para la operación.

Caso fuente (2026-09-12): la auditoría del pipeline de Hiring —vacantes `EO-OPN-0674` y `EO-OPN-0675` mostrando
cero postulantes— identificó tres familias de causa posibles y **no pudo cerrarse** porque discriminar entre
ellas exigía leer conteos y `hiring_application_intake_events`. El diagnóstico quedó abierto por falta de un
readback, no por falta de análisis.

La alternativa evidente —dar credenciales de Cloud SQL al runtime del agente— está descartada por tres reglas
vigentes del repo: Full API Parity (un agente es un consumer de contratos gobernados, no de SQL crudo), la regla
dura del gateway («a tool delegates only to a provider's canonical API, reader or command; never add direct DB
access»), y el hecho de que exista **una sola instancia Cloud SQL para dev, staging y producción**.

## Goal

- Exponer diagnóstico operativo agregado como readbacks gobernados, consumibles por cualquier agente autorizado
  sin credenciales nuevas y sin depender de la máquina de una persona.
- Mantener la frontera: solo lectura, solo agregados, cero PII, solo bindings `internal` con 404 anti-oracle.
- Cerrar el caso fuente: que la pregunta «por qué el pipeline de esta vacante se ve vacío» se responda por el
  canal, con evidencia.
- No crear scope OAuth nuevo ni tocar Entra: la clase de blast radius (lectura interna) ya está cubierta.

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
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- El gateway es un adapter neutral: una tool delega en el reader canónico del producto y **nunca** accede a DB,
  storage ni lógica de dominio propia.
- El readback es **agregado**. No devuelve filas de personas, ni nombres, ni correos, ni identificadores de
  candidato. Si una pregunta exige PII, la responde el provider dueño de esa entidad, no este.
- Lane `internal`-binding únicamente, con **404 anti-oracle** para cualquier otro binding — mismo contrato que
  `get_seo_provider_spend` y `get_seo_keyword_gap`.
- Sin scope OAuth nuevo: la lectura interna viaja en la base `efeonce.mcp.read` + binding `internal`. Crear un
  scope por capability convertiría a Entra en un espejo a mano del `capabilities_registry`.
- El protocolo de federación arranca en Greenhouse: entrada en `src/mcp/greenhouse/tool-manifest.ts` +
  `pnpm mcp:manifest:generate`. **Nunca** editar `greenhouse-tool-manifest.generated.ts` a mano.
- Toda tool federada declara `annotations` con `readOnlyHint` coherente con su clase.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/mcp/greenhouse/tool-manifest.ts` — manifiesto canónico (47 entradas hoy, 10 de dominio `platform`).
- `src/lib/reliability/queries/` — readers de señales de confiabilidad ya existentes.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` + `scripts/` del auditor de flags (`pnpm flags:audit`).
- `src/lib/hiring/desk.ts` — `getHiringDeskSnapshot` y los agregados `countByOpening` que ya calcula.
- `TASK-1631` (bindings y grants externos, aplicado 2026-09-04) y `TASK-1831` (verificación multi-issuer).

### Blocks / Impacts

- `TASK-1864` (superficie agéntica autosuficiente del MCP): estas tools deben quedar cubiertas por sus
  `instructions` y por el digest de superficie. Recibe Delta.
- `TASK-672` (Platform Health API Contract): comparte el plano de salud de plataforma; este readback es de
  **dominio**, no de salud de runtime. No lo reemplaza.
- `TASK-1432` (Reliability Recovery and Remediation Control): consume las mismas señales; esta task solo las
  expone por el canal, no cambia su semántica ni las «verdea».

### Files owned

- `src/app/api/platform/ecosystem/platform/diagnostics/**`
- `src/lib/platform/diagnostics/**`
- `src/mcp/greenhouse/tool-manifest.ts`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/diagnostico-operativo-por-mcp.md`
- `docs/manual-de-uso/plataforma/consultar-diagnostico-operativo-por-mcp.md`

## Current Repo State

### Already exists

- Gateway productivo `mcp.efeonce.org`, verificado `gateway: ready` con seis providers `enabled`
  (`globe`, `greenhouse-globe-credit-funding`, `greenhouse-seo`, `greenhouse-hiring`, `greenhouse-skills`,
  `greenhouse-client-services`), protocolo `2026-07-28`.
- Manifiesto canónico + gate `pnpm mcp:manifest:check` corriendo dentro de `pnpm local:check`.
- Lane ecosystem `/api/platform/ecosystem/**` con binding por consumer y patrón 404 anti-oracle establecido.
- Emisor nativo `services/auth-server` y verificación multi-issuer (`TASK-1829`/`1830`/`1831`/`1836`/`1844`).
- Readers de señales de confiabilidad y `getHiringDeskSnapshot`, que ya calcula conteos por opening sin límite.

### Gap

- Ningún readback expone estado operativo agregado por dominio: conteos, distribución por etapa, procedencia,
  ni desenlaces del intake público.
- El diagnóstico depende del entorno local del operador (`.env.local` + gcloud + Cloud SQL Connector), por lo que
  un agente cloud queda ciego y el operador queda en el camino crítico de cada revisión.
- `hiring_application_intake_events` registra `captcha_failed` e `invalid` con `opening_public_id` en `NULL`, así
  que hoy un rechazo masivo **no se puede atribuir a una vacante** por ningún camino, ni local ni remoto.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/app/api/platform/ecosystem/platform/diagnostics/**` + `src/lib/platform/diagnostics/**` (portal Vercel)
- Future candidate home: `api`
- Boundary: readers puros en `src/lib/platform/diagnostics/**`; el lane ecosystem y las tools MCP son los únicos
  consumers autorizados. El gateway delega, nunca calcula.
- Server/browser split: readers `server-only`; nada de este contrato llega al browser.
- Build impact: `none` — reusa `runGreenhousePostgresQuery` y los readers de reliability ya presentes.
- Extraction blocker: `none` — lectura sin transacción ni estado compartido.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: readers existentes (`src/lib/reliability/queries/`, `src/lib/hiring/desk.ts`) y las
  tablas que ya consultan; esta task no crea tabla ni migración.
- Consumidores afectados: MCP (agentes cloud), lane ecosystem, operadores vía runbook.
- Runtime target: `staging` y luego `production` (Vercel; el lane vive en el portal, ningún Cloud Run lo lee).

### Contract surface

- Contrato existente a respetar: `/api/platform/ecosystem/**` (binding + `externalScopeType`/`externalScopeId`),
  `src/mcp/greenhouse/tool-manifest.ts`, `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`.
- Contrato nuevo: lane `GET /api/platform/ecosystem/platform/diagnostics/{signals,flags,domain-summary}` y sus
  tools federadas de dominio `platform`.
- Backward compatibility: `compatible` — additive puro, ninguna tool existente cambia de forma.
- Full API parity: los tres readbacks son readers canónicos en `src/lib/platform/diagnostics/**`; el lane y las
  tools son consumers del mismo primitive, sin lógica duplicada.

### Data model and invariants

- Entidades/tablas afectadas (solo lectura): `greenhouse_hiring.hiring_application`,
  `greenhouse_hiring.hiring_opening`, `greenhouse_hiring.hiring_application_intake_events`, y las que ya leen los
  readers de reliability.
- Invariantes que no se pueden romper:
  - El readback devuelve **agregados**; nunca una fila que identifique a una persona.
  - El conteo y la lista deben salir del **mismo predicado**: un total filtrado junto a una lista sin filtrar es
    precisamente el defecto que motivó la task.
  - `data_origin` viaja en el corte, nunca se colapsa: un conteo que mezcla real y sintético miente.
  - Binding `internal` únicamente; cualquier otro binding recibe `404`, nunca `403`.
- Write-target allowlist: `N/A` — esta task no escribe en ninguna tabla.
- Tenant/space boundary: derivado del binding verificado del consumer, nunca de un parámetro libre.
- Idempotency/concurrency: `N/A` — lectura pura, sin efectos.
- Audit/outbox/history: sin evento de dominio. Cada llamada queda en el log del lane con el consumer y el
  correlation id; el readback no muta nada que auditar.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF` (`PLATFORM_DIAGNOSTICS_LANE_ENABLED`, Vercel-only).
- Backfill plan: sin backfill — la task no toca datos existentes.
- Rollback path: flag a `false` + redeploy; el gateway responde el error del provider deshabilitado y ninguna
  otra tool se degrada.
- External coordination: deploy del gateway hermano `efeonce-mcp` (`greenhouse:manifest:sync`, version bump y
  `surface:baseline`). Sin cambios en Entra.

### Security and access

- Auth/access gate: token de consumer del lane ecosystem con binding `internal`; base scope `efeonce.mcp.read`.
- Sensitive data posture: sin PII por construcción. Los readers no seleccionan nombre, correo, teléfono,
  documento ni identificador de candidato; el gate de anti-leak lo prueba.
- Error contract: `canonicalErrorResponse` y `captureWithDomain`; jamás el error crudo del driver.
- Abuse/rate-limit posture: lectura acotada con límites fijos por readback; sin parámetros de consulta libres que
  permitan barrer la base.

### Runtime evidence

- Local checks: `pnpm mcp:manifest:check`, tests focales del reader y del lane, `pnpm local:check`.
- DB/runtime checks: ejercitar el lane contra staging con token real y comparar sus números contra la pantalla
  correspondiente del portal — esa igualdad **es** la prueba de paridad.
- Integration checks: canary del provider en el gateway, incluyendo el deny `404` de un binding no interno.
- Reliability signals/logs: reusa las señales existentes; esta task no declara señal nueva.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de agregación, frontera de binding y ausencia de PII explícitas y probadas.
- [ ] Migration/backfill/rollback posture explícita y proporcional (aquí: sin migración, rollback por flag).
- [ ] Evidencia de runtime listada para el lane y para el provider federado.
- [ ] Errores canónicos y cero fuga de datos crudos.

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

### Slice 1 — Fundación del lane de diagnóstico

- Readers puros en `src/lib/platform/diagnostics/**` con su contrato de tipos.
- Lane `GET /api/platform/ecosystem/platform/diagnostics/signals` detrás de `PLATFORM_DIAGNOSTICS_LANE_ENABLED`.
- Autorización: binding `internal` únicamente; cualquier otro binding recibe `404` anti-oracle.
- Tests del lane: allow, deny `404`, ausencia de token `401`, y flag OFF `404`.

### Slice 2 — Readback de estado de flags por runtime

- Reader que cruza los `*_ENABLED` presentes en código contra el ledger, declarando el runtime de cada uno
  (Vercel / `ops-worker` / Cloud Run) y marcando los que carecen de fila.
- Lane `.../diagnostics/flags`.
- El readback declara explícitamente que el ledger es el SSOT humano y que la verdad viva es `vercel env ls`:
  nunca presenta el ledger como estado confirmado del runtime.

### Slice 3 — Readback agregado por dominio, empezando por Hiring

- Reader `domain-summary` para Hiring: por opening, conteo total y visible, corte por `data_origin`, corte por
  etapa, archivados, y primera/última postulación.
- Corte de `hiring_application_intake_events` por outcome y por día (últimos 30), declarando de forma explícita
  qué proporción no es atribuible a una vacante por el `NULL` conocido en `opening_public_id`.
- Lane `.../diagnostics/domain-summary?domain=hiring`.
- Gate anti-leak: test que falla si la proyección incluye cualquier campo de persona.

### Slice 4 — Federación en el gateway

- Entradas en `src/mcp/greenhouse/tool-manifest.ts` (dominio `platform`, `writes: false`) +
  `pnpm mcp:manifest:generate`.
- En `efeonce-mcp`: `pnpm greenhouse:manifest:sync`, provider/método, `registerTool` con `annotations`, entrada en
  `EXPECTED_GREENHOUSE_PLATFORM_TOOLS` con razón, `pnpm surface:baseline` y bump de `version` (minor: agrega
  tools).
- Canary del provider contra producción: allow, deny `404` de binding no interno, y paridad de números contra la
  pantalla equivalente.
- Reportar el provider en `efeonce.gateway.status` **en el mismo PR** que lo despliega.

## Out of Scope

- **SQL ad-hoc / query runner por MCP.** Viola la regla dura del gateway y Full API Parity. Si un diagnóstico no
  cabe en un readback, se modela un readback nuevo; no se abre una puerta genérica.
- Cualquier escritura, acción o remediación. Este canal es de lectura.
- PII de candidatos, colaboradores o clientes. Eso pertenece a los providers dueños de esas entidades, con sus
  propias capabilities y auditoría.
- Acceso directo a Cloud SQL, réplica de lectura o credencial GCP para el runtime de un agente.
- Bindings de cliente o exposición B2B. Solo `internal`.
- La postura WIF-only de producción: es de `TASK-800`, que ya es su dueña.
- Corregir el bug del pipeline de Hiring que motivó la task. Esta task da la herramienta para diagnosticarlo;
  la corrección es trabajo aparte y su alcance depende de lo que el diagnóstico arroje.

## Detailed Spec

Los tres readbacks comparten forma: un objeto con `contractVersion`, el corte solicitado y una declaración
explícita de lo que el dato **no** prueba. Esa última parte es deliberada: el defecto que originó la task no fue
falta de datos, fue un número presentado sin su predicado, y un readback que repita ese patrón no sirve.

El corte de Hiring debe permitir distinguir, sin ambigüedad, entre tres familias de causa:

1. no existen postulaciones (el intake las rechaza o nadie llegó),
2. existen pero el desk las filtra por procedencia,
3. existen, son reales, y el snapshot las descarta.

Para eso, `total` y `visible` viajan siempre juntos y con el predicado que los produjo declarado en la respuesta.
Un readback que devuelva solo uno de los dos reintroduce exactamente el problema que vino a resolver.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (fundación + autorización) → Slice 2 y Slice 3, que pueden correr en paralelo una vez cerrado Slice 1.
- Slice 4 (federación) va **al final**: federar una tool cuyo lane todavía cambia de forma obliga a un segundo
  bump de superficie y deja al cliente con una descripción inválida en caché.
- El gate anti-leak de Slice 3 debe existir **antes** de que Slice 4 federe el readback de dominio.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El readback se convierte en una puerta genérica a la base | API / data | medium | Sin parámetros de consulta libres: cada corte es un reader con forma fija y límites propios; `Out of Scope` lo declara | revisión de PR + gate de superficie del gateway |
| Fuga de PII en un corte agregado | data / identity | low | Gate anti-leak que falla si la proyección incluye campos de persona; readers que no seleccionan esas columnas | test anti-leak en CI |
| Exposición de estado interno a un binding de cliente | identity | low | Binding `internal` únicamente + 404 anti-oracle; canary que ejercita el deny | canary del provider |
| Drift entre manifiesto y gateway | integration | medium | `pnpm mcp:manifest:check` dentro de `local:check` + artefacto generado con hash verificado | gate de paridad del repo hermano |
| Un número del readback contradice la pantalla | data | medium | Paridad verificada contra la UI como criterio de aceptación, no como nota | comparación en el canary |

### Feature flags / cutover

- `PLATFORM_DIAGNOSTICS_LANE_ENABLED` (Vercel-only, default `false`). Gatea el lane completo; con el flag apagado
  el lane responde `404` y el provider del gateway queda sin respuesta útil, que es el estado seguro.
- Runtime declarado: **solo Vercel**. Ningún Cloud Run lee este flag, y no debe declararse en
  `services/ops-worker/deploy.sh` — agregarlo ahí crearía un interruptor para un runtime que no participa.
- Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR que declara el flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `PLATFORM_DIAGNOSTICS_LANE_ENABLED=false` + redeploy | <5 min | si |
| Slice 2 | mismo flag; el corte de flags desaparece con el lane | <5 min | si |
| Slice 3 | mismo flag | <5 min | si |
| Slice 4 | revert del PR en `efeonce-mcp` + redeploy del gateway a la revisión anterior | <15 min | si |

### Production verification sequence

1. Deploy a staging con el flag apagado; verificar que el lane responde `404` y que ninguna tool existente cambió.
2. Encender el flag en staging; ejercitar los tres readbacks con token real de consumer `internal`.
3. Comparar los números del corte de Hiring contra el desk del portal en staging: deben coincidir exactamente.
4. Ejercitar el deny: binding no interno debe recibir `404`, y sin token `401`.
5. Federar en el gateway y correr el canary contra staging.
6. Repetir 1-5 en producción, en ese orden, y recién entonces retirar el flag de la sección de pendientes del ledger.
7. Cerrar el caso fuente: correr el readback de Hiring contra las vacantes `EO-OPN-0674` y `EO-OPN-0675` y dejar
   la evidencia en el Handoff.

### Out-of-band coordination required

Deploy del repo hermano `efeonce-mcp` (sync del manifiesto, bump de `version`, `surface:baseline` y redeploy de
Cloud Run). Sin cambios en Entra, sin secretos nuevos, sin coordinación con terceros.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los tres readbacks existen como readers puros en `src/lib/platform/diagnostics/**` y el lane los consume sin
      reimplementar lógica.
- [ ] El lane responde `404` con el flag apagado, `401` sin token, `404` anti-oracle para un binding no interno y
      `200` para un binding `internal`.
- [ ] El corte de Hiring devuelve `total` y `visible` juntos, con el predicado que los produjo declarado en la
      respuesta.
- [ ] Existe un test anti-leak que falla si la proyección incluye cualquier campo que identifique a una persona.
- [ ] El readback de flags declara el runtime de cada flag y marca los que no tienen fila en el ledger.
- [ ] Las tools están en `src/mcp/greenhouse/tool-manifest.ts` con `writes: false` y `annotations` coherentes, y
      `pnpm mcp:manifest:check` pasa.
- [ ] El gateway reporta el provider en `efeonce.gateway.status` y su `version` subió en el mismo PR.
- [ ] Los números del readback de Hiring coinciden con el desk del portal para la misma vacante.
- [ ] El flag tiene fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con su runtime declarado.
- [ ] Las tres capas documentales existen: técnica, funcional y manual de uso.

## Verification

- `pnpm local:check`
- `pnpm mcp:manifest:check`
- `pnpm test` (suite completa antes de mover a `complete/`)
- `pnpm build`
- Ejercicio real del lane contra staging y producción con token de consumer, incluyendo los caminos de deny.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1864` recibió Delta indicando que estas tools deben quedar cubiertas por las `instructions` del gateway

## Follow-ups

- Atribuir por vacante los desenlaces `captcha_failed` e `invalid` del intake público: hoy se registran con
  `opening_public_id` en `NULL`, de modo que un rechazo masivo no se puede imputar a una vacante. Es un defecto de
  observabilidad del intake, no de este canal, y merece su propia task en el dominio Hiring.
- Extender `domain-summary` a otros dominios (finance, payroll, delivery) una vez que el contrato pruebe su forma
  con Hiring.

## Open Questions

- ¿El corte de flags debe leer la verdad viva de Vercel (requiere credencial de Vercel en el runtime del portal) o
  quedarse en el cruce código-vs-ledger? La propuesta de esta task es lo segundo, por ser suficiente para
  diagnosticar y no agregar una credencial nueva; confirmar con el operador antes de Slice 2.
