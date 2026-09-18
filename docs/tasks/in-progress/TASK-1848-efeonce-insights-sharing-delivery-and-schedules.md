# TASK-1848 — Efeonce Insights: acceso compartido, correo y recurrencia gobernados

## Delta 2026-09-18 — producción

- **Release `bda1cf2cd938`** (PR #238 squash, orquestador `35349506106`, manifest `released` 13:41Z, sin retry; `bypass_preflight_reason` por `db_migrations` ya aplicadas + marker `[release-coupled]` auth_access/cloud_release). Vercel READY, 6 workers Cloud Run en `bda1cf2cd938`, Azure `no_infra_diff`, post-release health verde.
- **Flags en producción OFF** (`INSIGHTS_SHARING/DELIVERY/SCHEDULES_ENABLED`; emisión OFF): el lector de Think (TASK-1875) no existe. Canary de contrato secuencial en producción: crear enlace ⇒ `503 sharing_disabled` (sólo el código nuevo produce ese código), listas de shares/deliveries/schedules ⇒ 200 con las filas sintéticas del canary de staging (instancia única), lector público con token inexistente ⇒ 404, sin token ⇒ 401.
- **Gateway `efeonce-mcp` 1.7.0** (PR #16 `4c9d7c44`, deploy `35351850324`, revisión `00055-gk6` al 100 %, front door 200/200/401).

## Delta 2026-09-15

- **Decisión del operador (ADR delta 2026-09-15):** la vista web compartida se renderiza en `efeonce-think` (`think.efeoncepro.com/insights/r/<token>`, patrón headless del Grader). Esta task expone el resolver público por token (`GET /api/public/insights/shared/[token]` → `InsightWebModelV1`, proyección client-facing versionada del plan + snapshot) y el proxy de descarga con chequeo de revocación; Think resuelve por request, sin pre-render ni cache. Arquitectura §8. El render es **TASK-1875** (bloqueada por esta task): el correo con ShareGrant enlaza a `think.efeoncepro.com/insights/r/<token>`; el contrato de respuesta esperado por 1875 está en su `## Detailed Spec` (200/404/410/429 + `downloads[]` con `available|unavailable`).
- Existe `InsightSharePort` declarado (`ports.ts`, `implemented: false`) y el evento `insights.edition.issued` con `issuedHash`; la proyección por audiencia (`readers/projection.ts`) y `canViewEvidence` ya distinguen emitida/no emitida. El manual servido `efeonce-insights` reserva sus recetas de distribución a esta task. — por TASK-1845
- **Rollout 2026-09-15 (TASK-1845):** el puerto de outputs y el pipeline por fases ya corren **en producción** con `INSIGHTS_GENERATION_ENABLED=true` en staging y producción (emisión e IA OFF); ediciones sintéticas (org sandbox «Greenhouse Demo»; «producción» nombra el runtime, no el dato) `EO-INS-000012/13` (staging) y `EO-INS-000014` (producción) quedaron `ready_for_review`. El gateway `efeonce-mcp` 1.5.0 federa las 4 tools (47 tools, 8 clases de scope) y el scope `efeonce.mcp.insights.write` existe en Entra (sin cliente que lo porte ⇒ `insufficient_scope` al crear). Detalle: arquitectura §14. El resolver público por token y `InsightWebModelV1` de esta task nacen sobre un dominio que ya tiene ediciones persistidas en producción; la proyección client-facing existente (`evidence`/`plan` sólo de emitidas) es la base que no puede relajarse.
- Desbloqueada de TASK-1845 (2026-09-15): la foundation de Efeonce Insights está en producción (release `9c094688309d`, generación ON en Vercel, gateway v1.5.0 federado, scope en Entra); TASK-1845 sigue `in-progress` sólo por dos evidencias de cierre (ensayo `migrate:down` y sesión MCP con token humano) que no condicionan este trabajo. — cerrado por rollout de TASK-1845

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Epic: `EPIC-045`
- Status real: `En producción 2026-09-18 con flags OFF (release bda1cf2cd938) + gateway efeonce-mcp 1.7.0 federado; abierto por criterios de canales in-app/Teams, ruta de portal (TASK-1849), lector público en Think (TASK-1875) y ISSUE-174 (TASK-1876)`
- Rank: `TBD`
- Domain: `platform|identity|ops|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye grants por token para vistas web de ediciones emitidas, múltiples enlaces revocables, descarga controlada, delivery intents por correo centralizado y schedules. API/MCP comparten autoridad e idempotencia; ningún envío nace sólo de generar un reporte.

## Why This Task Exists

El Grader tiene un enlace activo por reporte y estado especializado; no cubre los grants independientes, el output set ni la recurrencia de Insights. Reusar su tabla o su token como OAuth ampliaría privilegios y acoplaría dominios.

## Goal

- Entregar el alcance de esta unidad con evidencia funcional y aislamiento por cliente.
- Conservar fuentes canónicas y paridad UI/API/MCP donde hay capacidades.
- Cerrar con runtime/rollout honesto, sin confundir documento, código y disponibilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`.
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§4, 7–11 (source of truth del contrato de esta unidad).
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

Reglas: métricas en su dueño; un snapshot por edición; acceso por org; ninguna mutación de una edición emitida.
El ADR acepta planificación, no acredita implementación. Rutas/tablas nuevas son propuestas hasta materializarse.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `.codex/skills/efeonce-mcp-platform/SKILL.md`.

## Dependencies & Impact

### Depends on

- TASK-1845, TASK-1846.
- Contratos de EPIC-045 y arquitectura Insights; sources de la sección siguiente.

### Blocks / Impacts

- EPIC-045; consumers posteriores del grafo de la arquitectura §11.
- TASK-1672/1673 conservan auditoría SEO especializada; TASK-1644 conserva VisualProfile.
- Coordinación serial en manifiestos/copy/índices compartidos; no se autoriza multiagente ni cambio de branch.

### Files owned

- `docs/mcp/skills/efeonce-insights/SKILL.md` (nuevo propuesto), sólo recetas de distribución, en coordinación serial con TASK-1845.

- `src/lib/efeonce-insights/{sharing,delivery,schedules}/**` (materializado 2026-09-18)
- `src/app/api/platform/{app,ecosystem}/insights/{shares,deliveries,schedules}/** (propuesto)`
- `src/app/api/public/insights/shared/** (reader público propuesto: `resolveSharedEdition` → `InsightWebModelV1` + `downloadSharedOutput` proxy; sin UI — el render Astro vive en el repo `efeonce-think`, TASK-1849)`
- `src/lib/efeonce-insights/contracts/web-model.ts (InsightWebModelV1 versionado, browser-safe; propuesto)`
- `src/lib/email/{types.ts,templates.ts} (registro/contexto Insights; presentación en TASK-1849)`
- `src/mcp/greenhouse/tool-manifest.ts (entradas sharing/delivery/schedules, serializadas)`
- `migraciones additive de grants/intents/schedules y registro consumer existente; sin cron por cliente`

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/report/short-link.ts`.
- `src/lib/growth/ai-visibility/report/snapshot.ts`.
- `src/lib/email/delivery.ts`.
- `src/lib/email/resend-reconciliation.ts`.
- `src/lib/notifications/notification-service.ts`.

### Gap

El Grader tiene un enlace activo por reporte y estado especializado; no cubre los grants independientes, el output set ni la recurrencia de Insights. Reusar su tabla o su token como OAuth ampliaría privilegios y acoplaría dominios. Evidencia local 2026-09-08; disponibilidad live no verificada en esta planificación.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/efeonce-insights/{sharing,delivery,schedules}/**` (materializado 2026-09-18) dentro del checkout Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Insights y puertos de la arquitectura §3/7; Composer y Email mantienen sus autoridades.
- Server/browser split: DTO y presentación puros en browser; stores, secrets, authz y providers sólo server-side.
- Build impact: render/font/catalog aislados del grafo browser; sin nuevos SDK pesados en rutas web.
- Extraction blocker: contexto de organización, transacciones y release actuales; sin nuevo deployable ni paquetes anticipados.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: ShareGrant, DeliveryIntent e InsightSchedule; referencia email_deliveries existente, no segundo ledger de transporte.
- Consumidores afectados: UI, App API, Ecosystem API/MCP y workers; reader público sólo en TASK-1848.
- Runtime target: staging, production y worker con activación autorizada por lane.

### Contract surface

- Contrato existente a respetar: arquitectura Insights y commands/readers canónicos arriba enlazados.
- Contrato nuevo o modificado: operaciones asignadas a esta task en arquitectura §7.
- Backward compatibility: additive/gated; se preservan Proposal, Grader y API de módulos.
- Full API parity: commands/readers únicos con adapters finos UI/API/MCP y manifest versionado; ninguna lógica en gateway.

### Data model and invariants

- Entidades/tablas/views afectadas: ShareGrant, DeliveryIntent e InsightSchedule; referencia email_deliveries existente, no segundo ledger de transporte.
- Invariantes que no se pueden romper: ownership por org; edición inmutable; ausente distinto de cero; state/event atómicos.
- Write-target allowlist: registrar cada store nuevo en el boundary del dominio en el mismo PR; sin SQL directo desde UI/worker.
- Tenant/space boundary: actor autenticado + org/space permitidos; nunca confiar en org del payload sin autorización.
- Idempotency/concurrency: unique keys por operación/payload; lease/fencing en ejecución; retry no duplica efectos.
- Audit/outbox/history: historial append-only redactado y outbox transaccional; no bearer ni evidencia interna en logs.

### Migration, backfill and rollout

- Migration posture: additive por runner canónico, con readback; no tocar historia de módulos.
- Default state: gates OFF; despliegue de código no habilita el producto.
- Backfill plan: ninguno masivo; fixtures sintéticos identificados y cleanup. Si se descubre necesidad, dry-run y plan antes de apply.
- Rollback path: suspender lane, conservar datos y revert de consumidor compatible; jamás borrar evidencia emitida.
- External coordination: release/env/worker/manifest por dueño; no nuevos remitentes ni ampliación del cliente público OAuth.

### Security and access

- Auth/access gate: views + capability + entitlement por org; token shared únicamente proyección acotada de TASK-1848.
- Sensitive data posture: allowlist client-facing, assets privados, token sólo en canal autorizado; no PII irrelevante.
- Error contract: códigos del dominio por errores canónicos y captureWithDomain; sin raw errors.
- Abuse/rate-limit posture: cuotas por org, rate limit y retry budget, autorización revocable.

### Runtime evidence

- Local checks: pruebas funcionales de contrato y negativos; no tests de forma textual como sustituto.
- DB/runtime checks: migration/readback y `pnpm test:live` serializado cuando aplica; no source .env.local.
- Integration checks: staging y canary sintético de lanes de esta task; ningún cliente como tester técnico.
- Reliability signals/logs: `insights_delivery_ambiguous` propuesta, errores canónicos y métricas por run/org sin secretos.
- Production verification sequence: sección Rollout de esta task; release por control plane y autorización propia.

### Acceptance criteria additions

- [x] Capability/registry/grant en mismo PR, fine-grained auth, API/MCP, auditoría y errores equivalentes verificados. — Verificado: 3 capabilities con seed + catálogo + grants en el mismo commit de cada slice; suite completa 14.569 tests verde (incluye `capability-grant-coverage`).
- [x] Source of truth, tenant boundary, concurrencia, migración/rollback y evidencia live de esta unidad pasan antes del cierre. — Live tests 3/3 contra PG real + canary de staging (org sin módulo 404, claim/dedupe, cascada de retiro).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Plan de ejecución (2026-09-18, discovery Claude greenhouse-eo-91)

**Decisiones del operador (2026-09-18):**

1. **Bearer nunca persistido.** Sólo digest. Fallo definitivo de envío ⇒ revocar ese grant y emitir uno nuevo al
   reintentar; resultado ambiguo ⇒ no se reintenta hasta reconciliar. No se crea primitive de cifrado.
2. **Schedules V1 = borrador + render.** Cada ocurrencia crea la edición y pide el render; queda en revisión humana.
   Autoemisión/autoenvío no existen en V1 (follow-up), por lo que nunca ocurren sin autorización.
3. **PDF adjunto opt-in en V1.** Segundo EmailType no sensible para el adjunto (el modo `token_sensitive` rechaza
   adjuntos); el intent declara la irrevocabilidad y el adjunto nunca viaja con un ShareGrant en el mismo correo.
4. **Frontera: hasta staging.** Push a `develop`, flags en staging (Vercel + `ops-worker`) y canary sintético de dos
   organizaciones. Producción, release y federación en el repo `efeonce-mcp` quedan fuera de esta sesión.

**Hallazgos de discovery que corrigen la spec:** el enlace del Grader guarda el token en claro y sin cabeceras
anti-índice (no es modelo; se usan el token del talent pool y las cabeceras de `hiring/assessment/public-session`);
`sendEmail()` no tiene idempotency key y un timeout previo al id queda `failed` sin `resend_id` ⇒ dedupe en tablas
propias; `email_type_config` falla abierto ⇒ seed `enabled=FALSE`; `durableSensitiveSource` descarta correlación de
tipos no listados; no hay redacción de token en path para Sentry; `downloadPrivateAsset` exige `actorUserId` string;
no existe resolver de período relativo; el resolver Teams sólo resuelve members (cliente ⇒ `unavailable`); la ruta de
portal destino del deep link la construye TASK-1849.

**Rollout staging (2026-09-18, en curso):** push `52562a2f9` a `develop` (CI + 5 deploys de workers verdes);
Vercel staging con `INSIGHTS_SHARING/DELIVERY/SCHEDULES_ENABLED=true` + `INSIGHTS_ISSUANCE_ENABLED=true` (sólo staging,
autorizado para el canary) y redeploy `greenhouse-bki7l2rl9` (target staging); `ops-worker-00695-hrw` con los 4 flags;
Cloud Scheduler `ops-insights-schedules-tick` ENABLED. Canary sintético (org sandbox «Greenhouse Demo», edición
`EO-INS-000015` `insed-3b96d035…`): render `deck_pdf` completed por el dispatcher → issue 200 → share A 201 (token una
vez, URL Think) → reader 200 (`modelVersion 1.0`, sin fugas) + cabeceras reales verificadas con curl + PDF 200 (330 KB) →
share B → revocar A: A 410 lectura y descarga, B 200, revocar otra vez `idempotent:true` → rate limit por grant 60×200 +
4×429 `Retry-After: 60` → negativos (share/delivery sin emitir 409 `not_ready`, org sin módulo 404, `portal_link` 409,
`auto_issue` 400, cliente programa 403, token desconocido/mal formado 404) → schedule create 201 / activate / tick real
`{schedules:1, paused:0, generated:0}` / pause / retire / reactivar 409 → delivery con EmailType apagado: 202 → projection
→ `skipped/email_type_paused`, sin grant, fila de correo correlacionada y redactada. **Hallazgo:** la ráfaga de 64 requests
concurrentes agotó casi las conexiones de la instancia compartida por 5 min ⇒ `ISSUE-174` → `TASK-1876`. Correo real
(buzón autorizado por el operador `jreyes@efeoncepro.com`, EmailTypes encendidos sólo durante el canary con
`pnpm hiring:email-type` y apagados al terminar): `share_link` y `attachment` → ambos `accepted` al primer intento, fila
`sent` con `resend_id`, asunto del enlace redactado, sin bearer persistido, grant `source=delivery` (7 días). Retiro de la
edición: enlace B 200 → 410 y grants vivos (manual + delivery) revocados `edition_withdrawn`. `provider_status`
(entregado) no se pudo leer: el ciclo de vida de Resend no opera (`ISSUE-160`); **el operador confirmó 2026-09-18 que los
dos correos (enlace `idlv-5be5306b…` y adjunto `idlv-0ee709e7…`) llegaron a su bandeja** — evidencia humana, no de
ledger. Federación en `efeonce-mcp` y release a producción: cerrados el mismo día (ver Delta 2026-09-18).

**Slices:** 1 grants + reader público + web model + redacción + proxy · 2 intents/recipients + EmailTypes + projection
+ reconciliación + in-app · 3 schedules + tick `ops-worker` + período relativo · 4 conformance, docs, skill, staging.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Grants y reader público

- Token >=128 bits, sólo digest, muchos grants por edición con expires/revoke/downloadPolicy. Proyección client-facing; validar org/edición/grant en cada lectura/descarga. Headers anti-index/cache/referrer y redacción de token en todas las capas.

### Slice 2 — Entrega durable

- Intent con autoridad ligada a versión/destinatarios/outputs, EmailType y seed disabled, clasificación sensible, sendEmail y tracking de enlaces deshabilitado. Dedupe antes de crear grants; persistencia de bearer sólo cifrada/efímera si necesaria para retry. Reconciliación antes de reenviar un timeout ambiguo.

### Slice 3 — Schedules y paridad

- Schedule con ventana/zona/lateness/catch-up y autorización revocable. Ocurrencia única, generación draft por defecto, autoemit/send sólo por autorización durable explícita; no nuevo cron por cliente. Commands App/Ecosystem/MCP y adapters para TASK-1673.

### Slice 4 — Conformance y rollout

- Matriz acceso dos orgs, revoke/expiry/inflight, descargas, retiradas, rate limit y no-leak. Doble tick/doble envío/fallo provider, prueba sobre inbox sintético autorizado, webhook/reconciliación y rollback por lane.

- Extender el manual efeonce-insights de TASK-1845 con recetas verificadas de grants, revoke/expiry, descargas, envío, retries y schedules; una sola fuente y edición serializada. No enseñar que leer autoriza enviar.

## Out of Scope

- Métricas nuevas o fórmulas duplicadas, refresh facturable automático, PPTX/DOCX, editor libre y migración general del Grader.
- Otras unidades de EPIC-045 y perfiles visuales de TASK-1644; no cambios ajenos ni nuevas ramas/worktrees.

## Detailed Spec

El contrato exigible está en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§4, 7–11. Esta task materializa sólo su ownership.
ShareGrant, DeliveryIntent e InsightSchedule; referencia email_deliveries existente, no segundo ledger de transporte.
Nuevos paths son propuestas explícitas; confirmar los puntos de integración en Discovery y registrar cambios materiales.
La compactación en cinco unidades no elimina pruebas ni autoriza omitir un módulo/formato por conveniencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. No activar el consumer antes de su contrato y pruebas.
Respetar Blocked by; sólo preparación documental puede anteceder dependencias.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token se filtra o reintento envía dos veces | Insights | medium | Digest/redacción/no-store + authorization/dedupe + reconciliación canónica | insights_delivery_ambiguous (propuesta) |
| Fuga entre clientes o evidencia interna | Access | medium | Allowlist, org boundary y pruebas negativas | insights_access_denied (propuesta) |

### Feature flags / cutover

INSIGHTS_SHARING_ENABLED, INSIGHTS_DELIVERY_ENABLED e INSIGHTS_SCHEDULES_ENABLED propuestos default false; EmailType config disabled por separado. Registrar flags/env/DB policy con dueño y consumidores reales; no interpretar NODE_ENV como entorno.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 2 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 3 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 4 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |

### Production verification sequence

1. Local: contratos, fixtures y gates focales antes de gastar CI/cloud.
2. Staging: schema/flags/worker readback cuando aplica; canary sintético dos orgs y fallo parcial.
3. Verificar recovery y rollback; documentar evidencia y activar sólo por release autorizado.
4. Producción: comprobar SHA/config/commands/readers/outputs del lane; no inferir desde documentos.
5. Cohorte cliente consentida sólo después de certificación técnica; actualizar acceptance/status con evidencia real.

### Out-of-band coordination required

Release, activación externa y correo real tienen autorización propia; esta creación documental no los ejecuta.
No solicitar otra cuenta, secreto ni acción del cliente para pruebas técnicas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Arquitectura §9.1: edición emitida genera intención correlacionada para email/in-app/Teamsbot habilitado; cada canal conserva su delivery, dedupe y preferencias. Un fallo parcial no reenvía canales exitosos ni declara entrega global. — **Abierto:** el envío es un intent explícito autorizado por una persona (no se crea al emitir) y no hay in-app/Teams: `NotificationService` no restringe canales (duplicaría el correo) y el resolver Teams sólo resuelve members. Dueños TASK-690–693 / TASK-1849.
- [ ] Deep link normal lleva a la edición autenticada y conserva contexto tras login; valida cuenta/módulo/acción en servidor. ShareGrant es explícito y separado; GET/scanner no ejecuta acciones ni marca leído. — **Abierto:** la ruta de la edición en el portal es de TASK-1849; `portal_link` responde `not_ready` (`INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE=false`). Sí verificado: ShareGrant separado y el GET público sólo lee (access log mínimo, no marca leído).
- [ ] Destinatarios cliente se resuelven por persona/usuario canónico sin exigir member laboral; se revalidan al despachar. Teamsbot sin destino autorizado se registra no disponible; no hay publicación a canales generales como fallback. — **Parcial:** resolución por `session_360` sin exigir member y revalidación al despachar verificadas (`delivery.test.ts`); Teams no implementado (ver primer criterio).
- [ ] Recurrencia/recordatorios respetan cadencia, zona, preferencias, baja aplicable y estado vigente; resueltos/retirados no se recuerdan. Cada flujo conserva correlación hasta consulta/acción sin usar aperturas como prueba humana. — **Parcial:** cadencia/zona/estado vigente y correlación ocurrencia→edición verificados (`schedules.test.ts`, live); recordatorios, preferencias y baja no existen en V1 (sin envío automático).
- [ ] Integración previa al Hub usa la projection reactiva existente y servicios canónicos; cutover por sus dueñas conserva dedupe/preferencias y demuestra cero doble envío. No otro Hub, projection, self-webhook o cron por cuenta. — **Parcial:** usa el framework reactivo existente (projection `insights_delivery_dispatch`, lane notifications) sin cron ni webhook nuevos; «cero doble envío» en runtime queda para el canary de staging.
- [x] La matriz cliente/interno/shared de arquitectura §7.1 se aplica a descargas, grants, correo y schedules: generar no concede distribuir; token no da identidad/biblioteca; correo desde Efeonce conserva capability interna separada. — Verificado: `sharing.test.ts`/`delivery.test.ts`/`schedules.test.ts` (compartir exige capability propia, enviar y programar son internos, token no da identidad).
- [x] Cliente con capability explícita puede gestionar grants propios de ediciones elegibles; interno sólo sobre cuentas autorizadas. Audiencia, módulos, revocación y autoridad de cada ocurrencia se revalidan, también con cambios concurrentes. — Verificado: sólo `client_executive` comparte su org; `client_manager` 403; org ajena 404 (`sharing.test.ts`); cupo y bloqueo de edición en transacción.
- [ ] Manual operativo incluye y prueba aprobación por versión/destinatario, revocación, retry ambiguo, accepted frente a delivered y pausa de schedule; fixtures sanitizados y negativos de permiso/tenant por MCP. — **Parcial:** manual `operar-efeonce-insights-api-mcp.md` v1.5 con las recetas; la prueba por MCP (negativos de permiso/tenant contra el gateway) espera la federación en `efeonce-mcp`.

- [x] Dos grants activos de una edición se revocan individualmente; token desconocido/expirado/revocado no revela identidad ni datos del cliente. — Verificado: `sharing.live.test.ts` (PG real) + reader 404/410 anti-oracle (`sharing.test.ts`).
- [x] Sólo digest persistido; tests de logs/outbox/analytics/referrer/HTML verifican ausencia de bearer fuera de respuesta autorizada y del carril cifrado efímero. — Verificado: fila sin bearer (live), outbox sin token/digest, scrub Sentry de path/breadcrumbs/spans (`sentry-server-event-scrub.test.ts`); el HTML es de Think (TASK-1875).
- [x] Revocación corta siguiente acceso y descarga sin caché/CDN/storage bypass; archivo ya descargado se declara irrevocable. — Verificado en código/tests: gate por request antes de leer bytes, `private, no-store`, sin URL de storage; lo descargado se declara irrevocable. Runtime: canary staging.
- [x] Token no autoriza biblioteca, otra edición, otro tenant, más módulos ni OAuth/MCP; organización suspendida o edición retirada falla cerrada. — Verificado: el grant resuelve una edición; org suspendida, módulo retirado o edición retirada ⇒ 404/410 (`sharing.test.ts`).
- [x] requestDelivery requiere capability interna y aprobación ligada a payload; cliente puede compartir enlace pero no usar Efeonce como relay arbitrario. — Verificado: `insights.delivery.send` sin scope `own`; request_hash ligado a versión+destinatarios+modalidad+asunto; sólo personas activas de la org (`delivery.test.ts`).
- [x] Email usa sendEmail, email_deliveries, type/config y context resolver canónicos; accepted/delivered/bounced/failed son distintos y apertura no identifica persona. — Verificado: `claimTokenSensitiveEmailIntent` + `sendEmail`, EmailTypes sembrados apagados, `transportStatus` desde `email_deliveries` (aceptado ≠ entregado, sin «leído»).
- [x] Dedupe, timeout ambiguo, reintento y webhook duplicado no provocan otro correo sin reconciliación; retiro pausa intents pendientes. — Verificado: dedupe por índice parcial (live), ambiguo sin reenvío + reconciliación por intento exacto, retiro cancela pendientes (`delivery.test.ts`, `commands.test.ts`).
- [x] Schedule resuelve período cerrado/zona/consolidación, doble tick produce una ocurrencia, catch-up acotado y revoke de autoridad lo pausa. — Verificado: `resolveClosedInsightPeriods` (DST/bisiesto/semana ISO), ocurrencia única ante doble tick y claim único (`schedules.live.test.ts`), catch-up acotado y pausa por autoridad revocada (`schedules.test.ts`).
- [x] API/MCP ejercitan mismos permisos y errores; write scopes por consentimiento preciso, sin ampliar cliente base-only. — Verificado 2026-09-18: gateway `efeonce-mcp` 1.7.0 (PR #16, revisión `efeonce-mcp-gateway-00055-gk6`, 58 tools) federa las 7 tools con la misma tabla de errores (503 `*_disabled` ⇒ `policy_blocked`, 429 `quota_exceeded` ⇒ `rate_limited`, 404 anti-oráculo); crear/revocar enlace exigen `efeonce.mcp.insights.write`, que ningún cliente porta (403 challenge; el cliente base-only no se amplió); canary del provider contra producción verde (schedules 1, shares 3, deliveries 3).
- [x] Retención/cleanup y rate limits verificados; rollout por sharing/delivery/schedules con gates OFF, inbox sintético autorizado y rollback ejercitado; integración SEO especializada sigue en TASK-1673. — Verificado en staging 2026-09-18: tick real con `retention` ejecutada, rate limit 60/min por grant con 429 + `Retry-After`, flags por lane (Vercel staging) con default OFF en producción, buzón autorizado por el operador, rollback ejercitado en el kill switch del EmailType (on→off) y en schedules (pause/retire); el rollback por flag de Vercel está documentado pero no se ejercitó.

## Verification

- `pnpm task:lint --task TASK-1848`: template=1, legacy=0, errors=0, warnings=0.
- `pnpm qa:gates --changed` durante implementación; lint/typecheck y tests focales por diff.
- `pnpm test:live` cuando hay SQL/runtime, serializado; allow/deny e idempotencia por API/MCP.
- Verificar runtime por capa; no usar guardas textuales para certificar comportamiento.
- `pnpm docs:closure-check` y, después de toda edición de contexto, `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Lifecycle, carpeta, Status real y acceptance actualizados con evidencia; sin rollout no se declara complete.
- [ ] TASK_ID_REGISTRY, README y EPIC-045 sincronizados; remover blockers obsoletos en dependientes.
- [ ] Arquitectura técnica, documentación funcional y manual/runbook actualizados proporcionalmente.
- [ ] Handoff/changelog y contratos UI/API/MCP reflejan disponibilidad real.
- [ ] Regresiones, señales, rollback y gates documentales pasan; no commit/push/deploy automático.
- [ ] Actualizar la skill viva `efeonce-insights` (`references/program-ledger.md`, `architecture-map.md`, `contracts.md`, `operations.md`, `lessons.md`) y espejar a `.codex/` con `pnpm skills:mirrors` verde — contrato de EPIC-045; sin esto la task no pasa a complete.

## Delta 2026-09-09 — distribución para autogestión y gestión

EPIC-046 integra Insights en el portal cliente; TASK-1848 conserva el único contrato de sharing,
descarga, correo y recurrencia. Cliente autenticado, colaborador autorizado y visitante con token
tienen límites distintos aunque consuman los mismos commands/readers. No se convierte el sender
corporativo en relay cliente, ni se crea un segundo ShareGrant desde el portal. Ver arquitectura §7.1.

## Follow-ups

Integración de canales: TASK-690–693 conserva Hub/preferencias; TASK-303 audiencias, TASK-387 digest y
TASK-694 medición avanzada. EPIC-046/P09 coordina sus slices. TASK-1848 implementa el caso Insights
contra sus contratos; no adquiere ownership de la plataforma completa. TASK-1759 y TASK-1774 conservan
transporte reactivo y baja de correo. Estos enlaces no declaran completadas sus dependencias.

PPTX/DOCX y gráficos adicionales se evalúan por demanda; no crear tasks preventivas. Los gaps dentro de esta
unidad se resuelven en sus slices. TASK-1672/1673 conservan la integración especializada SEO.

## Open Questions

Sin preguntas que bloqueen el registro. Confirmar límites, rutas y mapping propuestos en Discovery contra
código/runtime; no inventar disponibilidad. Antes de implementar, /goal explícito y codex:task-hook.
