# TASK-1673 — Efeonce Insights: distribución de la edición de auditoría SEO

> Ajuste de alcance autorizado el 2026-10-04. [Spec y deltas anteriores preservados íntegros](../../audits/insights/history/2026-10-04-seo-specialization/README.md). EPIC-045 posee informes/distribución; EPIC-022 conserva el productor SEO. No se implementó esta integración ni se envió correo.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-045`
- Status real: `Diseño reformulado 2026-10-04; infraestructura de compartir/enviar existe en TASK-1848, integración de corrida→edición técnica TASK-1672 pendiente. Falta selección exacta, dedupe y revalidación en el entrypoint, pruebas tenant/expiry/revoke/dispatch y verificación humana. TASK-1848 sigue in-progress por gates propios; no falta construir otro sender/token store.`
- Rank: `TBD`
- Domain: `growth|data`
- Blocked by: `TASK-1672`; TASK-1848 aporta infraestructura disponible, sus pendientes se verifican por lane/caso.
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar la edición inmutable de auditoría técnica de TASK-1672 con los commands existentes de sharing/delivery Insights. El entrypoint selecciona el run correcto y su edición elegible, conserva autorización, frescura y modalidad, y evita efectos duplicados. No crea enlace SEO, token store, reader público, sender, ledger, plantilla ni flag paralelos.

## Why This Task Exists

La auditoría se reenvía a quien ejecuta. El motor general ya comparte y envía ediciones, pero aún no hay una edición técnica ligada al crawl ni un entrypoint que valide esa selección. Un enlace debe servir la versión elegida y declarar fecha/alcance; nunca cambiar al último crawl después de compartirla.

## Goal

- Distribuir la edición audit exacta con permisos y commands Insights.
- Conservar idempotencia de selección y entrega sin recuperar un bearer persistido.
- Verificar revoke/expiry/tenant y revalidación al despacho sobre esa especialización.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§5, 7–10.
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`: ADR existente de dominio y distribución.
- `src/lib/efeonce-insights/sharing/{commands,store,public,token}.ts` y `delivery/{commands,dispatch,store}.ts`.
- `src/lib/email/delivery.ts` y reconciliación: transporte único.
- **Leer/generar no concede compartir ni enviar.** Insights valida módulo, capability, audiencia, estado de edición y org.
- Compartir: ediciones client issued, `insights.share.manage`, TTL 1–90 días/default 30 y cuota vigente de grants. Se permiten varios grants; el token sólo se devuelve una vez y sólo su digest se persiste.
- Enviar: sólo App, persona interna con `insights.delivery.send`, destinatarios canónicos activos autorizados; cliente no envía desde Efeonce. Ecosystem/MCP sólo leen delivery; no se habilita envío por propose/confirm MCP.
- Enlace por defecto (`share_link`); `attachment` exige outputs elegibles y consecuencia irrevocable declarada, como en el contrato existente.
- Accepted, delivered y acceso no son lectura humana. El access log no identifica quién leyó ni prueba contratación.
- Delivery ambiguo se reconcilia; no se reenvía ciegamente. Token perdido se revoca/reemplaza explícitamente, no se reconstruye.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- TASK-1672 y TASK-1848, con evidencia y pendientes por criterio.
- Manual `operar-efeonce-insights-api-mcp.md`: recetas actuales de los commands, no otro flujo de distribución.

## Dependencies & Impact

### Depends on

- TASK-1672: edición especializada, binding exacto y outputs validados; bloqueante.
- TASK-1848: grants/delivery/reader público disponibles. Revalidar canary humano y negativos MCP del carril usado; portal_link depende de TASK-1849, no se usa como fallback a share_link sin elección.
- TASK-1670/1671 y evidencia SEO: hereda gates de 1672, no requiere activar de nuevo un flag ya ON.

### Blocks / Impacts

- Distribución comercial de auditoría técnica, sin bloquear informes generales de desempeño.
- EPIC-045 posee cierre; EPIC-022 permanece dependencia de evidencia y autorización SEO.

### Files owned

- `src/lib/efeonce-insights/**`: adapter/command fino de selección audit→edición, sólo si Discovery demuestra que no basta el command existente.
- Lanes existentes `/api/platform/app/insights/**` y `/api/platform/ecosystem/insights/**` según matriz vigente; no rutas de envío MCP.
- Tests de binding/tenant/dedupe y contratos; el UI de entrypoint queda en consumers de TASK-1849/1672.
- Stores sharing/delivery y Email se reutilizan; no ownership nuevo de transporte ni migración de token store SEO.

## Current Repo State

### Already exists

Inspección local 2026-10-04, no nuevo canary ni envío:

| Cobertura reutilizada | Evidencia | Lo que no certifica |
|---|---|---|
| Grants, digest, TTL/cuota, revocación | `sharing/commands.ts`, `store.ts`, `public.ts`; tests de TASK-1848 | Integración con audit run aún ausente |
| Público client-safe edición exacta + descargas | TASK-1848 y web Think TASK-1875 | Detalle técnico de TASK-1672 |
| Delivery interno, dedupe, destinatarios y reconciliación | `delivery/commands.ts`, `dispatch.ts`, tests | Canary humano pendiente ni envío de este nuevo artefacto |
| Infraestructura desplegada/activada | Auditoría Insights 04/10; sharing/emisión 28/09, delivery/schedules 02/10 | Cierre total de TASK-1848 |

### Gap

- TASK-1672 no implementada: no hay edición técnica que el entrypoint pueda distribuir.
- Mapping exacto run→edición/versión/audiencia; selección y retry del caller no duplican edición/entrega.
- Negativos de corrida/tenant, expiry/revoke y revalidación de autoridad/destinatario en esta integración.
- No falta reconstruir el renderer, bearer, sender o ledger generales.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/efeonce-insights/**` y lanes actuales
- Future candidate home: `remain-shared`
- Rationale del candidate home: extensión de dominio existente, sin otro primitive/store SEO.
- Boundary: SEO produce evidencia; Insights controla edición/grants/intents; Email controla transporte.
- Server/browser split: resolución/autorización/commands server-side; DTOs redactados al consumer.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: edición y binding de TASK-1672; `greenhouse_insights` grants/delivery intents; `email_deliveries` canónico.
- Consumidores afectados: entrypoint App/Insights, lectores de Ecosystem/MCP permitidos y web Think.
- Runtime target: Vercel y dispatcher ops-worker existentes; presentación Think.

### Contract surface

- Contrato existente a respetar: `createInsightShare`, `revokeInsightShare`, `readInsightShares`, `requestInsightDelivery`, readers y reconciliación de TASK-1848.
- Contrato nuevo o modificado: sólo selección/binding audit→edición si los commands actuales no lo cubren; no comandos SEO paralelos de envío.
- Backward compatibility: `compatible`, extensión acotada.
- Full API parity: mismo command y errores por carril permitido. Matriz vigente excluye envío/schedules writes en MCP/Ecosystem.

### Data model and invariants

- Entidades/tablas/views afectadas: bindings de 1672 y stores Insights existentes; ninguna tabla de tokens propuesta.
- Invariantes que no se pueden romper: org/target/run/edición exactos, client-safe, no mutación de edición, digest-only y revalidación antes de efectos externos.
- Tenant/space boundary: binding autorizado en servidor; el grant da acceso sólo a la edición/output seleccionado, no a otro run, biblioteca ni identidad.
- Idempotency/concurrency: selección por organización+run+versión/audiencia/request estable; delivery usa idempotencyKey+request_hash del dominio. Distinto destinatario/modalidad no colapsa en «un envío por run».
- Grants: no imponer «un enlace por audit_run_id devuelve el anterior». El command actual permite varios grants; no puede devolver el bearer anterior. Retries conservan referencias sin reemisión ciega; pérdida de token exige revoke/replacement explícito.
- Audit/outbox/history: eventos actuales Insights y email ledger; no bearer ni destinatario crudo en logs.

### Migration, backfill and rollout

- Migration posture: `none` por defecto; cualquier metadata adicional va con justificación/boundary del dominio, sin grant store propio.
- Default state: gates existentes, sin nuevo flag SEO de compartir.
- Backfill plan: ninguno.
- Rollback path: detener entrypoint/especialización y revocar grants afectados vía commands existentes; no borrar evidencia ni recuperar adjuntos.
- External coordination: release/activación por owners actuales; dominio Think ya decidido.

### Security and access

- Auth/access gate: capabilities/módulo/estado/audiencia Insights más binding productor autorizado; el cliente puede compartir sólo si su capability vigente lo permite.
- Sensitive data posture: allowlist de 1672; destinatarios por identidad canónica, sin relay arbitrario.
- Error contract: errores Insights canónicos (`not_found`, `not_ready`, `idempotency_conflict`, disabled/quota) y adapter vigente; no raw errors. No retry automático sobre revoke/expiry sin acción autorizada.
- Abuse/rate-limit posture: cuotas y rate limits existentes por dominio; no ampliar límites por el entrypoint.

### Runtime evidence

- Local: corrida exacta/dos orgs/dos versiones, request estable vs conflicto, no duplicar delivery/grant en retry incierto.
- Staging: share_link y revocación/expiry; descarga elegible, autoridad retirada y revalidación de destinatario al despachar.
- Correo: sólo ensayo a inbox autorizado dentro del cierre de implementación; este ajuste no autoriza un envío real.
- MCP: negativos permiso/tenant para operaciones permitidas; envío inexistente por contrato.
- Señales: intents/recipient/transport correlacionados, accepted≠delivered y acceso≠lectura.

### Acceptance criteria additions

- [ ] Source of truth, tenant boundary y binding explícito implementados sin store paralelo.
- [ ] Commands/capabilities por carril, idempotencia, errores y revalidación verificados.
- [ ] Postura migration/rollback proporcional y evidencia runtime registrada sin secrets/bearer.

<!-- ZONE 2 — PLAN MODE: Discovery y plan al ejecutar, no implementado en este ajuste. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Selección de edición

- Resolver binding audit exacto y una edición emitida client elegible.
- Reutilizar command/readers de 1672/Insights; idempotencia de request/versión, con conflicto declarado.

### Slice 2 — Compartir con infraestructura existente

- Delegar create/revoke/list y reader público a 1848, conservando TTL/cuota/no-store/anti-oracle.
- No recuperar bearer perdido, crear rutas públicas SEO o afirmar lectura humana a partir de logs.

### Slice 3 — Entrega con infraestructura existente

- Delegar delivery a App interno; share_link default, attachment explícito con output y ack irrevocable.
- Revalidar destinatarios canónicos, autorización y versión; dedupe y reconciliación existentes.

### Slice 4 — Verificación específica

- Matriz dos orgs/runs/versiones, revoke/expiry/download, retry ambiguo y envío cliente rechazado.
- Evidence readback de edition/run/delivery; reutilizar evidencia transversal fechada sin declararla canary de esta integración.

## Out of Scope

- Generación/render de documento: 1672 sobre foundations Insights.
- Token store, short-code SEO, sender, transporte/ledger, plantilla o flag nuevos.
- Envío desde identidad cliente, por MCP/Ecosystem o a email arbitrario no autorizado.
- In-app/Teams/preferencias/Hub general y portal_link sin TASK-1849.
- Firma electrónica, prueba de lectura o actualización en vivo de un crawl sellado.

## Detailed Spec

El enlace sirve una edición congelada, con fecha del crawl y su alcance. Caducidad o revocación afectan acceso futuro, no los bytes ya descargados. El entrypoint pasa referencias autorizadas a los commands actuales; no sustituye políticas de sharing/delivery. Compartir y enviar son acciones distintas y la idempotencia se define por operación/payload, no sólo por run.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1672 elegible → binding/selección → sharing → delivery → verificación. No distribución de una edición técnica incompleta, sin emisión o fuera de audiencia.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Otro run/tenant servido | acceso | medium | Binding sellado y negativos dos orgs/runs | test y readback |
| Retry crea enlace/envío extra | fiabilidad | medium | Contratos existentes y reconcile antes de repetir | intents/grants correlacionados |
| Email arbitrario o MCP ampliado | reputación | medium | App interno, identidad canónica y matriz de carriles | negativos de acceso |
| Adjuntos interpretados como revocables | cliente | medium | Ack vigente y consecuencia visible | revisión de consumer |

### Feature flags / cutover

Gates vigentes `INSIGHTS_SHARING_ENABLED`, `INSIGHTS_DELIVERY_ENABLED`, issuance y gates SEO de 1672; EmailType conservado. No nueva env obligatoria ni reactivación de flags ya ON. Verificar runtime objetivo antes de publicar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–2 | Detener entrypoint y revocar grants específicos por command | medir staging | sí para acceso futuro |
| 3 | Detener nuevos intents/reconciliar pendientes | medir staging | correo/adjuntos enviados no |
| 4 | Corregir evidencia, sin borrar historial | no aplica | no cambia runtime |

### Production verification sequence

1. Local y staging con fixtures identificados: binding/negativos/revoke/expiry/dedupe.
2. Release autorizado: comprobar SHA/gates/readers y edición técnica exacta.
3. Revisión humana y ensayo de distribución sólo a destino autorizado, con readback de ledger.
4. Correlación exacta run→edition→grant/delivery y ausencia de doble efecto.

### Out-of-band coordination required

Cierre de gates humanos de TASK-1848 del carril utilizado y autorización de release/emisión/envío; este cambio documental no los ejecuta.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Entry point selecciona org/target/run/edición/versión exactos de TASK-1672, sin sustituir por último crawl.
- [ ] Idempotencia de selección/request y delivery por payload verificada; grants múltiples y digest-only respetados, sin recuperar bearer anterior.
- [ ] Enlace y descarga sólo sirven esa edición client issued, con fecha/alcance y anti-oracle/no-store actuales.
- [ ] Revoke/expiry/withdraw bloquean siguiente acceso/descarga, verificados en el caso audit; copias descargadas se declaran irrevocables.
- [ ] Cliente no envía; App interno exige capability propia, autoridad y destinatario canónico revalidados al dispatch; MCP/Ecosystem no envían.
- [ ] Share_link default y attachment explícito con output elegible/ack; no fallback silencioso portal_link o destinatario.
- [ ] Rate limits, logs redactados y correlación actuales reutilizados sin nuevo store/sender/ledger; acceso no se presenta como lectura.
- [ ] Retry ambiguo se reconcilia, payload distinto produce conflicto o nuevo intent autorizado y no duplica efectos.
- [ ] Negativos tenant/run/versión/permiso y gates humanos/runtime del carril usado documentados con evidencia fechada.

Todos abiertos: cobertura genérica reutilizada de 1848 no acredita el entrypoint especializado ni cierra sus propios canaries pendientes.

## Verification

- `pnpm task:lint --task TASK-1673`
- Implementación: tests focales binding/sharing/delivery; live y canary autorizados del caso especializado.
- `pnpm docs:closure-check`, `pnpm qa:gates --changed` y strict context gate al final de edición.

## Closing Protocol

- [ ] Lifecycle/carpeta/Status real/acceptance y evidencia sincronizados.
- [ ] EPIC-045/README/registry actualizados; dependencia SEO explícita.
- [ ] Manual/funcional, arquitectura, skill espejo y handoff documentan el caso disponible sin declarar cierre de 1848 por transitividad.
- [ ] Verificación de integración y cierre documental completos; sin push/env/correo automáticos.

## Follow-ups

Medición comercial a partir de accesos sólo con su limitación explícita; no es prueba de lectura ni causalidad. No abrir sender cliente preventivo.

## Open Questions

Mapping final del entrypoint en consumers Insights y política de retry de selección: resolver en Discovery con 1672/1849. Dominio público, TTL y persistencia bearer ya están decididos; no reabrirlos como alternativas.
