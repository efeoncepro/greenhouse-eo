# TASK-1952 — Creative Workbench: integración backend con Efeonce ID

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `optional`
- Status real: `Diseño registrado por pedido de Julio el 2026-09-30. Autenticación diferida: primero producción de piezas. Depende de la foundation OIDC first-party de TASK-1834, Slices 0–1. Sin implementación, registro de RP, bindings nuevos, activación de IA ni despliegue por esta tarea.`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-1834 (foundation first-party OIDC, Slices 0–1)`
- Branch: `Greenhouse develop para documentación; Creative Workbench según su contrato de ramas y PR vigente; preservar WIP y no modificar las CLI locales de Greenhouse`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar el backend y la entrada CLI de Creative Workbench con Efeonce ID, autoridad humana común de
Efeonce. Workbench conserva su propia audiencia, sesión y autorización; el broker identifica al integrante
sin recibir su token personal de GitHub. La integración queda diferida mientras se valida el flujo productivo.

## Why This Task Exists

El operador pidió reutilizar el AUTH existente de Efeonce, no crear otra cuenta o login. El trabajo previo
sobre Google y GitHub App es una candidata técnica y no decide la identidad definitiva. El discovery del
issuer tampoco prueba por sí solo que el perfil OIDC first-party esté operativo.
TASK-1834 entrega la foundation común; TASK-1947 conserva la entrada de producción IA y sus controles.
Esta unidad cubre la adopción backend específica del Workbench, sin duplicar esos dos alcances.

## Goal

- Autenticar al integrante con el contrato first-party de Efeonce ID y autorizarlo desde la política local.
- Dar al broker una credencial destinada a Workbench, revocable y ligada a una persona admitida.
- Retirar el envío del token personal de GitHub al broker después de probar paridad y revocación.
- Mantener intactos el aislamiento por marca, las reservas de gasto y la composición local admitida.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` (ADR Accepted).
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`.
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`.

La foundation pertenece a EPIC-044/TASK-1834. Esta task es su consumer Workbench standalone.
Efeonce ID autentica; Workbench decide membresía, marca, operación y presupuesto en cada llamada.
No usar cookies de Greenhouse, tokens MCP ni comparación de emails como autoridad del Workbench.
Cambios al contrato común requieren revisión con su dueño y ADR adicional si alteran la decisión Accepted.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md` y `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `.codex/skills/efeonce-creative-workbench/SKILL.md` (espejo Claude obligatorio).
- `.codex/skills/efeonce-creative-workbench/references/state-continuity.md`.
- `.codex/skills/efeonce-creative-workbench/references/architecture.md`.

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md`: Slices 0–1,
  perfil OIDC first-party, registro administrado de RP y conformance; no esperar la migración completa de Greenhouse.
- `docs/tasks/in-progress/TASK-1947-creative-workbench-brand-production-entry.md`: contrato vigente del
  broker, GitHub App, reserva de cupo y rechazo antes de proveedor; revalidar su estado al tomar esta task.
- `docs/tasks/in-progress/TASK-1945-creative-workbench-multibrand-foundation.md`: aislamiento y ejecución neutral.
- `docs/tasks/to-do/TASK-1898-marketing-studio-efeonce-id-login.md`: consumer hermano; reutilizar primitives
  compatibles si ya existen, no bloquear Workbench por el rollout del Studio.

### Blocks / Impacts

- Cierre de autenticación del backend Workbench y admisión operativa del equipo completo.
- Una futura entrada visible o protección del Lab necesita consumer UI separado, dirección y wireframe;
  esta unidad no rediseña páginas, botones, estados ni copy del Lab.
- TASK-1947 conserva producción IA; un login exitoso no satisface sus gates de activación o gasto.

### Files owned

Rutas del repo `efeoncepro/creative-workbench`, verificadas en el checkout de producción; revalidar al iniciar:

- `tools/broker-transport.mjs`, `tools/broker-client.mjs`, `tools/production-authority.mjs`.
- `services/production-broker/server.mjs`, `kernel.mjs`, `github-app-authority.mjs` dentro de ese directorio.
- `services/production-broker/github-app-authority-policy.json`, `budget-policy.json` y sus pruebas focales.
- `docs/architecture/workbench-broker-identity.md` en Workbench; contrato actualizado de sesión/broker.
- Este archivo y referencias de la skill Workbench en Greenhouse, con espejos Codex/Claude.

No escribir en los templates o CLI locales de Greenhouse para incorporar el consumer.
Nuevas rutas de callback, storage o comando se determinan en Discovery y se registran antes de implementar.

## Current Repo State

### Already exists

- ADR first-party Accepted y TASK-1834 con foundation reusable pendiente según su backlog.
- En Workbench existen transporte, autorización y broker; GitHub App admitida por el operador
  `efeonce-workbench-authority`, App ID 5138627, Installation ID 166592362, repo 1395425041.
- El operador autorizó todo el equipo para todas las marcas y topes mensuales de USD 50 por integrante
  y USD 500 por organización, con aumentos por decisión del operador.
- El canary Google/GitHub documentado en TASK-1947 es antecedente fechado; no demuestra sesión Efeonce ID.
- PR15 producción modular y PR16 Lab ya integrados: [estado actual](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md).
  Composición local con cero IA y hooks Git funcionan independientemente de esta integración pendiente.
  No usar la reparación de autor/committer como prueba de login, binding o sesión Efeonce ID.

### Gap

- Falta consumer first-party propio del Workbench, sesión/credencial de broker y admisión Efeonce ID del equipo.
- Los emails disponibles son datos de contacto, no una prueba de vínculo entre identidades.
- Discovery debe verificar código, PRs y runtime actuales; esta planificación no certifica despliegues.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Creative Workbench tools/ y services/production-broker/; issuer Efeonce ID de Greenhouse`
- Future candidate home: `remain-shared`
- Boundary: `consumer OIDC Workbench y contrato de sesión/autoridad del broker; issuer común no duplicado`
- Server/browser split: `validación, canje, sesión, GitHub App, políticas y secrets server-side; CLI recibe sólo credencial destinada al broker`
- Build impact: `verificador OIDC/JWKS fijado por lockfile; sin SDK de proveedor ni private key en el bundle Astro`
- Extraction blocker: `TASK-1834 entrega el contrato first-party y de revocación requerido por este consumer`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Efeonce ID para issuer/subject; política Workbench para membresía y autoridad`
- Consumidores afectados: `CLI, broker de producción y futuros consumers de sesión Workbench`
- Runtime target: `local, staging y production con activación por cohorte`

### Contract surface

- Contrato existente a respetar: `ADR first-party y TASK-1834; tools/broker-transport.mjs y services/production-broker/kernel.mjs de Workbench`
- Contrato nuevo o modificado: `inicio/callback de autenticación, reader de sesión y credencial de broker; nombres/rutas exactos se fijan en Discovery`
- Backward compatibility: `gated; despliegue en oscuro y rechazo cerrado sin credencial válida`
- Full API parity: `un primitive server-side de autoridad consumido por CLI y broker; sin lógica de permiso en el Lab`

### Data model and invariants

- Entidades/tablas/views afectadas: `transacción OIDC, sesión Workbench, binding issuer+sub y miembro; storage exacto por contrato de foundation, sin schema SQL inventado`
- Invariantes que no se pueden romper:
  - Verificar firma, issuer, audiencia, expiración, nonce y state; PKCE S256; code de un solo uso.
  - Identidad no confiere acceso: miembro vigente, marca explícita, operación y presupuesto en cada llamada.
  - Ningún correo, nombre de usuario ni campo producer resuelve o amplía permisos.
  - Ni credenciales de otro producto ni tokens MCP se aceptan como sesión de Workbench.
- Write-target allowlist: `sólo transacciones/sesiones y bindings aprobados; si se requiere tabla nueva, declarar el destino en el boundary test dueño en el mismo PR`
- Tenant/space boundary: `organización y miembro resueltos server-side; catálogo/lock de marca exactos por ejecución; todas las marcas para equipo vigente no elimina el lock`
- Idempotency/concurrency: `callback consumido atómicamente una vez; carreras y replay rechazados; reservas de gasto preservan su idempotencia`
- Audit/outbox/history: `login, vínculo admitido/revocado, sesión y denegación con requestId y códigos sanitizados; sin tokens ni emails en logs`

### Migration, backfill and rollout

- Migration posture: `additive; registro RP y sesiones aisladas; sin merge automático de identidades`
- Default state: `integración inactiva y ejecución IA OFF durante conformance`
- Backfill plan: `inventario y dry-run de miembros; aprobación de cada vínculo estable; no backfill por email ni conversión automática de bindings Google`
- Rollback path: `deshabilitar cohorte, revocar familias emitidas y revertir consumer; broker falla cerrado, nunca vuelve a acceso abierto`
- External coordination: `registro administrado del RP, URLs/audiencias exactas y configuración de runtimes con owner Efeonce ID y operador`

### Security and access

- Auth/access gate: `sesión Efeonce ID validada y autoridad local; credencial de broker distinta de id_token según contrato admitido`
- Sensitive data posture: `secrets sólo server-side; llave GitHub App desde Secret Manager en memoria, nunca descargada a disco`
- Error contract: `401 credencial ausente/inválida; 403 identidad sin permiso; rechazo explícito de cupo agotado sin proveedor; sin raw errors`
- Abuse/rate-limit posture: `TTL, replay guard, límites por miembro/organización y breakers existentes; tasa y freshness definidas al ejecutar`

### Runtime evidence

- Local checks: `tests de OIDC, binding, sesión, transporte, revocación, presupuesto y aislamiento`
- DB/runtime checks: `reader de sesión y política efectiva; ausencia de tokens personales en tráfico del broker; storage y grants reales`
- Integration checks: `RP staging registrado, canary positivo y negativos reales, GitHub App con único repo y revocación`
- Reliability signals/logs: `denegación por causa, replay, revocación y canary; auditoría redactada por requestId`
- Production verification sequence: `foundation conformance -> cohorte staging -> rollback ensayado -> piloto producción IA OFF -> equipo aprobado; gasto se habilita por gate separado`

### Acceptance criteria additions

- [ ] Source of truth, consumers y rutas exactas confirmados en Discovery; sin duplicar la foundation.
- [ ] Invariantes, escritura permitida, boundary y concurrencia verificados con pruebas.
- [ ] Migración/admisión dry-run, rollback y revocación reales documentados.
- [ ] Evidencia de runtime con errores canónicos y auditoría sin secretos.

## Capability Definition of Done — Full API Parity gate

Autenticación y sesión son primitives de identidad, no una nueva acción creativa ni consentimiento MCP.
La autorización del broker se modela como contrato común; no emitir grants implícitos por autenticación.

- [ ] Reader/command de sesión y autoridad operables desde CLI y broker sin duplicación.
- [ ] Toda modificación de capability incluye registry, grant explícito y coverage test en el mismo PR,
  o justifica ausencia de capability nueva; no se amplía la federación MCP por inferencia.
- [ ] Admisión/revocación reintentable con auditoría e idempotencia y camino programático documentado.

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

### Slice 1 — Conformance y registro del consumer

- Verificar TASK-1834 y runtime; fijar RP administrado, audiencias, redirects, assurance y recovery.
- Registrar contrato de sesión y credencial CLI/broker sin crear otro issuer ni OAuth Google propio.

### Slice 2 — Sesión y autoridad backend

- Canje y validación OIDC con PKCE/state/nonce; sesiones propias, rotación, logout y revocación.
- Admission de issuer+sub del equipo por aprobación; conservar GitHub App para permisos GitHub vivos.
- Integrar transporte sin token gh completo; rechazar identidad no admitida antes de proveedor.

### Slice 3 — Pruebas reales y transición

- Conformance local/staging, canary positivo/negativo, rollback, auditoría y retirada del transporte legado.
- Cohorte del operador primero y luego resto del equipo aprobado; IA OFF durante el cierre de identidad.

## Out of Scope

- Construir el issuer o resolver comunes, cambiar métodos upstream o duplicar TASK-1834.
- Rediseñar/proteger la UI del Lab en esta unidad backend; su consumer visual requiere task UI separada.
- Delegación de agentes en segundo plano, nuevas marcas, publicación de paquetes o activación de IA.
- Alterar las CLI locales de Greenhouse o vincular cuentas por email.

## Detailed Spec

El producto conserva entrada y retorno; la autenticación usa la transacción contextual confiable del issuer.
First-party sign-in omite consentimiento delegado sólo para el RP administrado. No comparte cookies,
secrets de sesión ni audiencias con Greenhouse, Studio o MCP. La credencial presentada al broker se diseña
contra el contrato admitido: no tratar el id_token como bearer de producción ni reutilizar access tokens MCP.

Julio aprobó un vínculo Google/GitHub anterior. No extrapolarlo a un subject Efeonce ID distinto: demostrar
continuidad por el resolver canónico o pedir aprobación explícita del binding nuevo. Aplicar lo mismo a cada
integrante. La política del equipo se lee vigente, sin copiar emails como llaves de autorización.

Las reservas conservan USD 50 por integrante y USD 500 por organización/mes, compartidos entre marcas.
El operador puede elevarlos mediante la política gobernada existente; esta task no sube montos ni reinicia cupos.
El aislamiento por marca y los hashes de recetas/paquetes se validan incluso con sesión correcta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-1834 foundation conforme -> Slice 1 -> Slice 2 -> Slice 3. No promover sesiones a producción antes
 de canaries y rollback staging. No habilitar IA como consecuencia de la autenticación.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Confundir token MCP/Google con sesión Efeonce ID | identidad/broker | medium | issuer/audiencia/clase exactos y negativos | rechazo de audiencia/issuer |
| Vincular por email o unir permisos | acceso/equipo | medium | binding estable aprobado y membresía viva | identity-not-admitted |
| Replay/carrera de callback | sesión | medium | consumo atómico, nonce/state/PKCE y TTL | replay-rejected |
| Revocado sigue produciendo o saltan cupos | producción/gasto | medium | autorización por llamada y reservas existentes | canary de revocación y ledger |
| Lock de otra marca aceptado | multimarcas | medium | negative cross-brand antes de ejecución | brand-lock-rejected |
| Transporte legado expone token gh | broker | medium | retiro probado, logs redactados, credencial propia | auditoría de headers sin contenido secreto |

### Feature flags / cutover

Cohorte del consumer por control server-owned, default inactivo; nombre/storage se fijan en Discovery
contra foundation y política existente. No declarar una env futura como ya disponible. Estado de IA independiente
permanece OFF en las pruebas de identidad. El rollback no acepta solicitudes anónimas ni reabre el broker.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Desactivar RP/cohorte; conservar auditoría, retirar configuración candidata | medir en staging | sí |
| 2 | Desactivar consumer y revocar sesiones/familias; broker falla cerrado | medir en staging | sí |
| 3 | Retirar cohorte/promoción y revocar credenciales afectadas; composición local admitida continúa | medir antes de producción | sí |

### Production verification sequence

1. Verificar foundation real, registro RP, audiences y redirects; detener si sólo existe discovery.
2. Deploy staging con cohorte inactiva e IA OFF; verificar ningún proveedor invocado.
3. Activar operador en staging; probar acceso, negativos y revocación; ensayar rollback cerrado.
4. Pilotear producción IA OFF, leer configuración efectiva y permisos App desde runtime.
5. Admitir vínculos aprobados del equipo; verificar positivos/negativos por integrante.
6. Retirar transporte gh legado y probar composición/regresión multimarcas sin gastos.
7. Registrar evidencia redactada y handoff; cualquier activación IA sigue TASK-1947 y su gate propio.

### Out-of-band coordination required

Owner Efeonce ID valida RP y contrato; operador aprueba bindings y cohorte; responsables de Workbench
configuran credenciales/configuración privadas de staging/producción. Nada de esto se ejecuta al crear esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Workbench es RP first-party conforme; issuer, audiencia, redirects y sesión propios verificados live.
- [ ] Entrada backend contextual y canje PKCE/state/nonce correctos; no segunda cuenta ni consentimiento MCP falso.
- [ ] Todo integrante admitido tiene binding estable aprobado; correo coincidente no concede acceso.
- [ ] Broker recibe sólo credencial destinada a Workbench; token gh personal retirado del transporte.
- [ ] Revocación/expiración/logout, miembro eliminado y token de otro producto deniegan producción.
- [ ] Replay, carrera, issuer/firma/audiencia incorrectos, redirect manipulado y binding desconocido fallan cerrados.
- [ ] Marca explícita, operación, lock y permisos vigentes comprobados por llamada; negativos SKY/Berel/Efeonce.
- [ ] Topes 50/500, overrides autorizados, agotamiento, carreras y retries preservados; rechazos con cero proveedores.
- [ ] GitHub App sólo ve creative-workbench; llave nunca escrita a disco ni tokens en artefactos/logs.
- [ ] Cohorte staging y piloto producción IA OFF, rollback ensayado y readback independiente documentados.
- [ ] Composición local SKY y aislamiento de paquetes no presentan regresión por la integración.
- [ ] Docs humanos y skill Codex/Claude reflejan operación, recovery y límites reales; pendiente UI explícito.

## Verification

- `pnpm task:lint --task TASK-1952` en Greenhouse para contrato documental.
- En Workbench: suite focal de sesión/transporte/autoridad, suites privadas y CI público exacto según su AGENTS.
- Canary real positivo y negativo por cohorte con evidencia redactada; ninguna llamada IA pagada para probar login.
- Readback de RP, sesiones, scopes App, flags, presupuesto y despliegue; rollback staging probado antes de promover.
- `git diff --check` y mirrors de skill byte-equivalentes; no tocar CLI locales Greenhouse.

## Closing Protocol

- [ ] Lifecycle, carpeta, README y registro reflejan implementación y runtime real.
- [ ] Handoff registra conformance, cohorte activa, revocación, rollback y pendientes sin afirmar sólo desde docs.
- [ ] Changelog sólo con comportamiento implementado; registrar impacto sobre TASK-1834 y TASK-1947.
- [ ] No declarar cierre por mocks/discovery/env existente; adjuntar canary y readback real.
- [ ] Sesiones de prueba revocadas, secrets ausentes de disco/logs y transporte legado retirado.

## Follow-ups

- Consumer UI separado para entrada/protección del Lab, con dirección de diseño, wireframe, flow y GVC antes de código.
- Delegación de agentes sólo por contrato específico de Efeonce ID; fuera de esta sesión humana.
- Activación/gasto IA bajo TASK-1947 cuando sus gates se cumplan; producción creativa sigue siendo la prioridad actual.
