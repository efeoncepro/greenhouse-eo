# TASK-1852 — Habilitación de servicios, acceso y canales para Berel y Sky

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `command`
- Epic: `EPIC-046`
- Status real: `code complete local + datos aplicados, apply cliente pendiente de sesión humana. Production sirve 5726ce9d90 con altas OFF. 2026-09-10: mapping comercial declarado para Berel (seo_v2 + ai_visibility_v1) y Sky (creative_hub_globe_v1) por declareCommercialTerms con bundledModules validados; tres personas Berel provisionadas con invitación diferida (sin correo); preview Sky limpio en producción (canApply=true, fingerprint 05d8f4b7…); Berel bloqueado sólo por invitaciones pendientes. Contrato de autoridad humana delegada (app_session | delegated_oauth + token exchange client_services) implementado y probado localmente, sin release ni push; federación gateway/scope Entra fuera del repo. Login humano y canales sin certificar`
- Rank: `1`
- Domain: `platform|identity|delivery`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementa un mecanismo común de habilitación por organización/persona/servicio, reutilizable para clientes sin reglas por nombre de cuenta. Su primera cohorte de conciliación y certificación es Berel (SEO y marketing de contenidos) y Sky (diseño digital) mediante servicios, fuentes, personas, módulos y acciones verificadas. Incluye destinatarios, preferencias y disponibilidad de email/in-app/Teamsbot. Consume el contrato de entrada de TASK-1834 sin implementar otro login.

## Why This Task Exists

El catálogo técnico no demuestra cobertura del servicio; el baseline fechado de EPIC-046 contiene destinos 404 y fuentes/usuarios que necesitan conciliación. La misma persona debe llegar desde un aviso a su contexto autorizado, conservando el acceso vigente durante la convergencia de identidad.

## Goal

- Materializar P01 de EPIC-046 con ownership acotado y evidencia por cuenta.
- Preview tipado por organización/persona/servicio con evidencia, cambios exactos y blockers; apply por commands canónicos e idempotentes. No nuevo resolver de identidad.
- Cerrar con documentación, pruebas, runtime y rollback propios; crear esta task no activa el servicio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md` — decisión aceptada, EPIC-046.
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` y `agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` bajo docs/architecture.
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§7.1/9.1: audiencias, canales y deep links.
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` — identidad no concede módulos.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

Reglas: BFF hoja, productores como SoT, autorización server-side por objeto, no import de stores en browser ni nuevo sender/Pool. No hardcode de cuenta en reglas de producto.

## Normative Docs

- `docs/epics/to-do/EPIC-046-client-services-visibility-and-self-service.md`.
- `docs/context/00_INDEX.md`, `docs/context/10_experiencia-cliente.md` y `docs/context/05_voz-tono-estilo.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md` para entrada/retorno; no adquirir su ownership.
- Skills: greenhouse-task-planner y greenhouse-documentation-governor; al implementar, skill de dominio y greenhouse-qa-release-auditor.

## Dependencies & Impact

### Depends on

TASK-1834 es dependencia de contrato y condicional de rollout: el login nativo espera sus gates, la habilitación con login vigente verificado puede avanzar. TASK-1687 bloquea exponer el destino roto de Sky. TASK-1845/1848 y TASK-690/693 coordinan Insights/canales; no bloquean el inventario. TASK-1012/1839 sólo cuando falte provisión o invitación.

### Blocks / Impacts

TASK-1853/1854/1855/1856; TASK-1834 como consumer de matriz/cohorte y casos de retorno. Ninguna dependencia recíproca bloquea el desarrollo de ambos programas.

### Files owned

- `src/lib/hubspot/list-services-for-company.ts` y `src/lib/services/upsert-service-from-hubspot.ts`: resolver vigente y montos ausentes NULL para materialización canónica.
- `src/lib/entitlements/runtime.ts`: corregir compensación EFEONCE_ADMIN conforme al contrato del portal.
- `src/lib/auth.ts`: preservar procedencia agent en refresh de permisos; fix mínimo descubierto por smoke, sin nuevo login.
- `src/lib/api-platform/core/`: composición atómica y clientId nulo en audit de sesión interna.
- `src/lib/client-portal/commands/`: ajuste mínimo de resolver, concurrencia y composición transaccional; sin invadir TASK-1687.
- `src/lib/client-portal/enablement/`: contrato común implementado de inventario/preview/apply/compensación.
- `scripts/client-portal/`: CLI común HTTP; no reglas por cliente en el primitive.
- Adapters API Platform/MCP y registro Nexa según el [plan aprobado](../plans/TASK-1852-plan.md).
- `docs/operations/`: matriz/runbook de cohorte y readback fechado.
- `src/lib/commercial/sample-sprints/commercial-terms.ts` + `src/lib/api-platform/resources/app-commercial-terms.ts` + `src/app/api/platform/app/commercial/services/[serviceId]/terms/route.ts` + `scripts/commercial/declare-commercial-terms.ts`: mapping servicio → módulos con validación de catálogo y contrato App (2026-09-10).
- `src/lib/sister-platforms/mcp-token-exchange.ts` + `migrations/20260910005222927_task-1852-mcp-client-services-oauth-client.sql`: clase delegada `client_services.enablement.write` y cliente de exchange (2026-09-10).
- `src/lib/client-onboarding/invite-client-portal-user.ts` + rutas `lifecycle/portal-users/{invite,deliver}`: entrega diferida de invitación (2026-09-10; TASK-1839/1012 conservan la convergencia de URL/entrega).
- `src/lib/client-onboarding/teams-connect-store.ts` + `teams-channels-reader.ts` + ruta `lifecycle/teams/chat` + migración `20260910013234351`: destino Teams `chat_group` por Space con verificación read-only (2026-09-10; TASK-1010 conserva el wizard).

## Current Repo State

### Already exists

- `src/lib/client-portal/commands/enable-module.ts`
- `src/lib/client-portal/readers/native/module-resolver.ts`
- `src/lib/client-portal/visibility/client-portal-view-visibility.ts`
- `src/lib/client-portal/guards/resolve-client-portal-organization-id.ts`
- `src/lib/tenant/access.ts`
- `src/lib/notifications/person-recipient-resolver.ts`

### Gap

El catálogo técnico no demuestra cobertura del servicio; el baseline fechado de EPIC-046 contiene destinos 404 y fuentes/usuarios que necesitan conciliación. La misma persona debe llegar desde un aviso a su contexto autorizado, conservando el acceso vigente durante la convergencia de identidad.

Baseline de código y documentos de esta planificación; flags, datos y entrega productiva se verifican al ejecutar, no se infieren del epic.

## Modular Placement Contract

- Topology impact: `api`
- Current home: src/lib/client-portal/commands/ y tooling acotado en scripts/.
- Future candidate home: `remain-shared`
- Boundary: Preview tipado por organización/persona/servicio con evidencia, cambios exactos y blockers; apply por commands canónicos e idempotentes. No nuevo resolver de identidad.
- Server/browser split: DTO tipado browser-safe; stores, policy, secretos y providers sólo server-side.
- Build impact: sin dependencias pesadas previstas; no nuevo runtime ni imports globales. Cualquier dependencia nueva requiere mapping de consumidores.
- Extraction blocker: sesión/autorización y productores compartidos; no crear apps/packages ni repartir transacciones por red.


## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: Commercial/Account 360 para servicio y organización; greenhouse_client_portal.modules, module_assignments y module_assignment_events para acceso; identidad/roles vigentes por primitives existentes.
- Consumidores afectados: UI/API/MCP/Nexa; worker sólo para efectos async autorizados.
- Runtime target: local, staging y production; worker reactivo existente si hay eventos.

### Contract surface

- Contrato existente a respetar: src/lib/client-portal/commands/enable-module.ts y ADR EPIC-046.
- Contrato nuevo o modificado: Preview tipado por organización/persona/servicio con evidencia, cambios exactos y blockers; apply por commands canónicos e idempotentes. No nuevo resolver de identidad.
- Backward compatibility: gated/aditivo; no cambiar el DTO consumido sin versionar o adaptar.
- Full API parity: commands/readers únicos; App/Ecosystem API y MCP son adapters, no implementaciones paralelas.

### Data model and invariants

- Entidades/tablas/views afectadas: Commercial/Account 360 para servicio y organización; greenhouse_client_portal.modules, module_assignments y module_assignment_events para acceso; identidad/roles vigentes por primitives existentes.
- Invariantes que no se pueden romper: aislamiento organización/objeto, contrato distinto de permiso y ausencia distinta de cero; no import inverso desde BFF.
- Write-target allowlist: declarar y justificar toda tabla nueva en boundary test del dominio si existe; read-only no escribe ni habilita módulos.
- Tenant/space boundary: organización y scope desde principal/contexto canónico y target revalidado; rechazar IDs arbitrarios.
- Idempotency/concurrency: reads sin efectos; writes usan key estable y versión esperada/transaction; retry nunca repite efecto externo ya confirmado.
- Audit/outbox/history: writes e intención durable se correlacionan; no evento por simple GET; logs sanitizados.

### Migration, backfill and rollout

- Migration posture: none prevista; reutilizar stores existentes.
- Default state: read-only/disabled para capacidad nueva; acceso existente preservado.
- Backfill plan: no masivo. Si hace falta, preview por allowlist y evidencia/compensación antes de apply.
- Rollback path: deshabilitar nuevo consumer/capacidad, compensar sólo writes propios con commands y preservar audit.
- External coordination: runtime de fuentes, invitaciones/piloto y canales según TASK-1852; no nueva plataforma.

### Security and access

- Auth/access gate: sesión válida + entitlements/acción/scope del primitive; cliente no recibe autoridad por rol, URL o token issuer.
- Sensitive data posture: DTO mínimo sin secretos, costos, datos laborales ni contenido interno; adjuntos privados por objeto.
- Error contract: errores canónicos del dominio, sin raw errors; context_required/denied sin enumeración.
- Abuse/rate-limit posture: paginación/límites por actor/organización; writes con replay guard, sin refresh facturable implícito.

### Runtime evidence

- Local checks: tests focales de autorización, datos y concurrencia; lint/typecheck proporcionales.
- DB/runtime checks: pnpm test:live serializado y readback de filas/audit/reader, sin export global de env.
- Integration checks: API/MCP mismos resultados; provider/worker sólo cuando participen en el efecto.
- Reliability signals/logs: errores/frescura/correlación del dominio; registrar señal nueva antes de afirmar que existe.
- Production verification sequence: la secuencia del Rollout Plan es obligatoria y por cuenta.

### Acceptance criteria additions

- [x] SoT/consumers verificados con schema real y [QA](../../audits/client-portal/TASK-1852_IMPLEMENTATION_QA_2026-09-09.md). Sin tablas nuevas ni allowlist BFF existente; writes limitados a assignments/events/outbox/command store.
- [x] Sin migración; compensación el mismo día, cambios posteriores, atomicidad y negativos de tenant probados en PostgreSQL local real (14 tests). Rollout cliente separado.
- [x] API/MCP/Nexa reutilizan primitives; manifests/docs/manuals actualizados. Paridad de escritura delegada a nivel capability: el lane App acepta `delegated_oauth` (capability `client_services.enablement.write`, exchange RFC 8693 con cliente dedicado sembrado) y registra `receipt.authority`; el binding machine sigue 403 por diseño. Federación en el gateway y scope Entra quedan fuera del repo ([readback](../../audits/client-portal/TASK-1852_MAPPING_PROVISIONING_READBACK_2026-09-10.json)).
- [x] Audit/outbox, retries concurrentes, respuesta perdida/fallida, rollback propio y lectura sin efectos probados en PostgreSQL local; [QA](../../audits/client-portal/TASK-1852_IMPLEMENTATION_QA_2026-09-09.md).


<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Discovery y plan de ejecución — 2026-09-09

- [x] Goal común aprobado; implementación inicial secuencial en `develop`, sin subagentes; hook `--develop` ejecutado.
- [x] [Discovery y matriz inicial](../../audits/client-portal/TASK-1852_SERVICE_ENABLEMENT_DISCOVERY_2026-09-09.md): schema/FK/índices/triggers, cohortes, servicios, fuentes, usuarios y canales consultados read-only; 68 tests baseline passed.
- [x] [Plan de implementación](../plans/TASK-1852-plan.md) aprobado en el checkpoint humano P1 de `TASK_PROCESS.md` §Phase 3 («Vamos», 2026-09-09). Goal y plan aprobados; hook revalidado en develop.
- [x] Código local: reader/preview, apply/rollback, atomic command store, App/Ecosystem/CLI/MCP/Nexa y documentación. 290 tests; certificación de configuración en [readback](../../audits/client-portal/TASK-1852_PREVIEW_READBACK_2026-09-09.json).
- [x] Rollout de staging: SHA `68e18fe0`, deployment READY, siete canaries HTTP; [evidencia y recuperación de workers](../../audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md).
- [x] Rollout técnico Production: PR #231, SHA `5726ce9d90`, manifest `released`, cinco workers Ready y 100 % de tráfico, watchdog sin drift/datos ausentes; siete canaries HTTP. [Readback](../../audits/client-portal/TASK-1852_PRODUCTION_RELEASE_READBACK_2026-09-09.json). Excepción puntual de acceso autorizada y persistida; altas OFF.
- [x] Mapping comercial declarado (términos con `bundled_modules`, audit + outbox) y tres personas Berel provisionadas con invitación diferida; preview Sky limpio en producción y rutas mapeadas de Berel 200 con la persona técnica de la organización. [Readback 2026-09-10](../../audits/client-portal/TASK-1852_MAPPING_PROVISIONING_READBACK_2026-09-10.json).
- [x] Destinos Teams registrados: chats grupales de Berel y Sky como `chat_group` del bot, `ready` con pertenencia verificada por Graph read-only (ruta `lifecycle/teams/chat`, migración `20260910013234351`); `teams_destination_unverified` desapareció en producción. Sin mensajes.
- [ ] Apertura operativa: apply de Sky por sesión humana administrativa con flag ON, entrega de invitaciones Berel (bloqueada por el operador hasta que las interfaces estén listas), login humano de las seis personas, rutas con sesión propia (Sky `cliente.creative_hub` sigue 404, TASK-1687) y preferencias/cadencia por persona. [Blockers con dueño](../../audits/client-portal/TASK-1852_IMPLEMENTATION_QA_2026-09-09.md).
- [x] Consolidación documental para discovery de Claude ejecutada con tres subagentes read-only autorizados por el operador; [dossier vigente](../../audits/client-portal/TASK-1852_CLAUDE_DISCOVERY_2026-09-09.md).

Rollout autorizado el 2026-09-09 con alcance de servicios y equipo confirmado por el operador. Después,
el operador eligió tres destinatarios Berel y confirmó los tres usuarios activos Sky. Detalles comerciales y
PII permanecen en evidencia local privada; [registro técnico](../../audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md).
La selección no materializa usuarios, precios, vigencia contractual, login ni preferencias.

Hallazgos iniciales: el resolver de business lines devolvía `[]` para Sky por unir `module_code` con
`module_id`; la FK real resuelve `globe`. Berel no tenía filas en `services`; el rollout materializó
`SVC-HS-554261764224` desde HubSpot, sin inventar importes ni términos. Las tres personas Berel elegidas
siguen sin usuario Greenhouse. Sky tiene tres usuarios cliente activos con `password_reset_pending`, sin
login registrado. Mantener acceso existente y registrar blockers, sin crear identidad, contrato, preferencia
ni canal por inferencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Matriz de habilitación y entrada

- Entregar matriz versionada de servicios, personas, fuentes, módulos, acciones, usuarios destinatarios y canales. Separar contratado/asignado/operativo. Verificar acceso vigente y registrar carril legacy o nativo por cohorte; incluir 0/1/múltiples contextos y destino tras login.

### Slice 2 — Preview y activación acotada

- Resolver cambios mínimos por los commands existentes, con dry-run, snapshot previo e idempotencia. Verificar catálogo/versionado de TASK-1687 antes de activar Sky. Conservar bundles/grants existentes; asignaciones live sólo dentro del alcance autorizado en ejecución.

### Slice 3 — Certificación y runbook

- Evidencia por cuenta de login, navegación y URL/API propia/ajena; matriz canal/destinatario/cadencia y destino Teamsbot habilitado o excepción explícita. Probar compensación y handoff a Insights/notificaciones; no declarar que configurar equivale a entregar.

## Out of Scope

- Login/OIDC/callback/selector de organización (TASK-1834); provisión de identidades (TASK-1839); migración del catálogo de Sky (TASK-1687); cascada general TASK-828/829; ampliación contractual, envío de mensajes o sustitución de Notion/Drupal.
- Sin commit/push/deploy, cambios live ni envíos como consecuencia de registrar la task. Durante la implementación inicial no se autorizaron subagentes. El 2026-09-09 el operador sí autorizó tres subagentes read-only para consolidar el discovery documental; cambios de rama y worktrees permanecen fuera.

## Detailed Spec

Commercial/Account 360 para servicio y organización; greenhouse_client_portal.modules, module_assignments y module_assignment_events para acceso; identidad/roles vigentes por primitives existentes.

Preview tipado por organización/persona/servicio con evidencia, cambios exactos y blockers; apply por commands canónicos e idempotentes. No nuevo resolver de identidad.

Paths del plan implementados localmente. Discovery verificó API/DDL y ownership; la auditoría distingue contrato probado de rollout pendiente. Esta task es P01 y no adquiere el scope de las dueñas de login, catálogo, productores ni canales.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. Contrato/negativos antes de habilitación; staging/fixture técnico antes de piloto cliente autorizado. Dependencias condicionales se evalúan por superficie, sin bloquear el trabajo independiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Acceso o dato de otra cuenta | identity/portal | medium | Scope de servidor y prueba positiva/negativa por objeto | Denegación y correlación sanitizada; sin payload sensible |
| Estado o entrega anunciado sin evidencia | delivery/UI | medium | Estado canónico, revisión de fuente y readback por canal | Error/degradación explícitos y log del dominio |
| Duplicación durante retry/cutover | commands/notifications | medium | Idempotencia y un owner por efecto; UI no repite writes | Audit de conflicto/duplicado |

### Feature flags / cutover

Rollout por cohorte/módulo existente; no inventar nombres de flags activos. Toda capacidad nueva comienza deshabilitada o sólo lectura hasta evidencias. Si se necesita flag nueva, declararla en ledger antes del apply. TASK-1834 controla de forma independiente login legacy/nativo/recovery.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Retirar contrato nuevo no consumido; conservar baseline y evidencia | Una revisión | sí |
| 2 | Deshabilitar capacidad/cohorte nueva; restaurar consumer anterior. En writes, compensar con command y versión auditada, sin borrar historial | Medir y registrar en ensayo previo | parcial si hubo efecto externo |
| 3 | Pausar expansión y canal/schedule afectado; conservar entregas y evidencia, no reenviar automáticamente | Medir y registrar en ensayo previo | parcial; correo recibido no se revoca |

### Production verification sequence

1. Verificar contratos, dependencias y estado real de cohortes contra runtime; dry-run antes de writes.
2. Local/staging con fixture técnico y todos los negativos; verificar DB/worker cuando cambien.
3. Ensayar recuperación/rollback y registrar su comando exacto antes de mutaciones productivas.
4. Piloto autorizado por cuenta; leer resultado funcional, API y logs/ledger del runtime dueño.
5. Expandir sólo tras evidencia; mantener abierta si rollout, datos o canales siguen pendientes.

### Out-of-band coordination required

Fuentes de Berel/Sky, responsables, consentimiento de piloto y disponibilidad Teamsbot según matriz TASK-1852. No solicitar credenciales nuevas para suplir una integración inexistente. El registro documental no autoriza mensajes, invitaciones o cambios de proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Matriz y manifiesto separan SEO/contenidos Berel y diseño digital Sky; documentan registros/términos ausentes. AEO preservado. [QA y matriz](../../audits/client-portal/TASK-1852_IMPLEMENTATION_QA_2026-09-09.md).
- [x] Consume principal/sesión vigentes y organización explícita; revalida autoridad y vetos por persona. Sin nuevo login/callback/provisión; destinos sólo declarados. Contrato en ADR/runbook; tests de aislamiento y revocación. Retorno 0/1/N operativo pendiente en TASK-1834.
- [ ] Login vigente se prueba para la apertura inicial. Cohorte nativa sólo se habilita tras TASK-1834 y sus gates TASK-1833/1832/1841 aplicables; no se exige su cierre total para inventario/readers.
- [x] Preview/apply concurrente y replay conservan un efecto; preserva asignación ajena y receipt inmutable. Compensación canónica el mismo día y rechazo por cambios posteriores: 14 ensayos PostgreSQL local en QA.
- [ ] Preferencias explícitas, login y entrega por canal pendientes para seis personas elegidas. Las tres de Berel ya existen (invitación diferida, sin correo; entrega bloqueada por el operador hasta tener interfaces) y requieren entrega + activación; las tres de Sky están activas pero sin login observado. Destinos Teams (chats grupales) registrados `ready` en ambas organizaciones; preferencias y cadencia siguen sin declarar. El usuario Berel técnico no es piloto humano. Sin members ficticios ni mensajes. Dueños Identity/Notifications en QA.

## Verification

- Task lint focal: template=1, legacy=0, errors=0, warnings=0 antes de registro.
- Implementación: `pnpm qa:gates --changed`, typecheck/lint y pruebas focales proporcionales; no guardas de forma textual como evidencia de comportamiento.
- SQL/runtime: `pnpm test:live`, serializado; nunca source de .env.local. Probar positivos/negativos e idempotencia cuando hay writes.
- UI/API/MCP comparten autoridad y resultado; evidencias sanitizadas, sin datos cliente usados como fixtures técnicos.
- `pnpm docs:closure-check`; después de toda edición `pnpm docs:context-check:strict` como último gate.

## Closing Protocol

- [x] Status real, Lifecycle y carpeta reflejan evidencia; permanece in-progress con código desplegado y apertura cliente pendiente.
- [x] Criterios locales tildados con evidencia; login/canales/paridad delegada siguen sin tildar.
- [x] Registry/README/EPIC-046 al día; documentación técnica/funcional, manual y recuperación en runbook.
- [x] Handoff/changelog y dossier de discovery al día; gates, promoción, cohortes y límites de paridad registrados. Sin apertura cliente implícita.

## Follow-ups

Las dueñas citadas conservan su scope y epic. No crear tareas por gráfico, cuenta, endpoint o QA. Móvil/push y ampliación comercial quedan fuera de esta cohorte.


## Open Questions

Goal y plan P1 aprobados y ejecutados. Blockers vigentes (QA): apply de Sky exige una sesión humana administrativa (el harness sólo dispone de la persona técnica de diagnóstico, que por contrato no aprueba writes) y el flag ON; Berel exige entregar las invitaciones (mensaje) y que las personas activen su acceso; TASK-1687 conserva el destino `cliente.creative_hub` (404 en producción); Notifications no tiene canal/preferencias en ninguna de las dos organizaciones. El contrato delegado del 2026-09-10 sólo está en local: requiere release, `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS`, scope Entra y federación en `efeonce-mcp`.
