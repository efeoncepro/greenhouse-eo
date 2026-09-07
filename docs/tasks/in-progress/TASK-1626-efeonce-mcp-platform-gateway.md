# TASK-1626 — Efeonce MCP Platform Gateway and Globe Federation

## Delta 2026-09-06 — snapshot histórico de runtime: qué quedó abierto

La sección de rollout de abajo quedó congelada el 2026-08-01 y describe un gateway que ya no existe. Medido
contra el runtime hoy:

| Qué | Runtime 2026-09-06 | Lo que decía esta task |
|---|---|---|
| Revisión productiva | `efeonce-mcp-gateway-00044-4kj`, 100% del tráfico | `00009-9c6` / `00029-bwg` |
| Región | `southamerica-west1` | no declarada |
| `maxScale` | **20** | «`maxScale=5` efectivo» |
| Cloud Armor | 600 req / 60 s | coincide |
| `authorization_servers` | **dos**: `auth.efeonce.org` + `mcp.efeonce.org` | uno |
| Scopes anunciados | **seis** (entró `efeonce.mcp.identity.write`) | «auth de tenant único» |
| Superficie | 39 tools, `version` 1.1.0, `surfaceHash` fijado | un reader Globe read-only |

El emisor nativo de `EPIC-044` ya se anuncia en el front door y la lane delegada de `TASK-1837` está federada
(PR #3 de `efeonce-mcp`, mergeado 2026-09-06). Front door verificado el mismo día: `oauth-protected-resource`
200, `POST /mcp` sin token 401, `health` 200.

**Los dos criterios que faltan del smoke live, verificados uno por uno:** protocolo, auth, provider y DNS/cert
están cubiertos por `oauth-canary.mjs`, `greenhouse-seo-canary.mjs` y `greenhouse-hiring-canary.mjs`. Los otros
dos no, y no por falta de evidencia sino de mecanismo:

- **Carga mínima**: `grep -rilE "load.?test|autocannon|k6|artillery"` sobre `scripts/`, `test/` y `.github/`
  de `efeonce-mcp` devuelve **cero**. No hay con qué medir — y el número a validar se movió solo cuando
  `maxScale` pasó de 5 a 20 sin que nadie midiera qué aguanta.
- **Rollback**: documentado en el runbook, **nunca ejercitado**; la línea 646 trae el marcador `**[verificar]**`
  literal, o sea el propio documento declara ese paso sin comprobar.

Ambos pasan a `TASK-1843`, que los ejecuta y devuelve el criterio tildado. Esta task conserva su ownership del
criterio; no se duplica.

**El gate `Capability Definition of Done — Full API Parity` se traspasa a `TASK-1473`**, que es su dueña real:
la paridad amplia de capabilities Globe salió del alcance de esta task hace tiempo y aquí quedaba colgando un
gate que no puede cerrar por sí misma.

Con eso, el estado honesto de esta task es **`code complete, rollout pendiente`**: el gateway opera en
producción, y lo que falta para declararla `complete` es la evidencia de `TASK-1843` más los gates de QA y
documentación de su Closing Protocol.


## Delta 2026-09-03 — EPIC-044 (U00)

La task pasa a `EPIC-044`. Decisión del operador: Efeonce opera su propio authorization server (`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`). El gateway sigue siendo adapter neutral y NO emite tokens; el segundo issuer y el `AuthContext` de seis campos los materializa `TASK-1831`, y la prueba base-only pendiente de esta task la cierra `TASK-1832`.

## Delta 2026-08-02 — Provider de cotización separado

El gateway permanece adapter-neutral. La futura capability de cotización entra como provider read/recommend
separado que consume API Platform + `TASK-609`; no se implementa dentro del gateway ni duplica pricing, policy o
datos. Clientes externos requieren además identidad y entitlements verificables de `TASK-1631`.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `code complete, rollout pendiente. El gateway opera en producción; revisión, SHA, versión, superficie y tráfico vigentes se leen del runtime y surface-baseline, no de este documento. Snapshot 2026-09-07T12:20:25Z: efeonce-mcp-gateway-00046-6n2 Ready/100 %, SHA 171965c99034 igual a origin/main y front door 200/401. Criterios principales 7 de 8. El único abierto —smokes de CARGA MÍNIMA y ROLLBACK— pertenece a TASK-1843: no existe mecanismo de carga en el repo hermano y el rollback está documentado sin ejercitar. Full API Parity pertenece a TASK-1473. La sección Estado de rollout de abajo quedó congelada el 2026-08-01 y el Delta 2026-09-06 es sólo un snapshot histórico.`
- Rank: `TBD`
- Domain: `platform|agentic|integration|cloud|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; MCP main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear `efeoncepro/efeonce-mcp` como gateway MCP neutral, independiente de Greenhouse y Globe, desplegarlo en
Cloud Run bajo `mcp.efeonce.org` y federar primero capacidades read-only de Globe mediante adapters delgados.

## Why This Task Exists

Efeonce necesita una única entrada MCP extensible. Ponerla en Greenhouse obliga releases pesados del portal;
ponerla en Globe entrega ownership de la plataforma al primer provider. El boundary nuevo permite releases,
auth, observabilidad, escalado y rollback independientes sin mover lógica ni datos de los productos.

## Goal

- Publicar un gateway MCP interoperable y fail-closed en `https://mcp.efeonce.org/mcp`.
- Operarlo con OAuth para humanos y service identity keyless para providers.
- Entregar la primera federación Globe read-only sin acceso directo a DB, storage o providers creativos.
- Entregar el primer write interno gobernado, `globe.credits.funding.ensure`, mediante identidad Greenhouse
  atribuida y el command ya operativo; no crear autoridad financiera en el gateway.

## Delta 2026-08-01 — write interno de fondeo autorizado por TASK-1630

El bloqueo B2B/multitenant aplica a clientes externos, no al operador interno Entra ya autenticado. La instrucción
del CEO autoriza completar la paridad MCP antes de volver a TASK-1614. La implementación amplía esta task y
`TASK-1473`; no crea una task adicional.

- Tool: `globe.credits.funding.ensure`; input estricto `{ authorityId }`.
- Scope: `efeonce.mcp.globe.credits.funding.ensure`, separado del reader.
- Identidad: token exchange Entra → Greenhouse con workload identity exacta del gateway; binding exclusivo por
  `(microsoft_tenant_id, microsoft_oid)`, sin fallback por email.
- Downstream: `POST /api/platform/app/globe/credit-funding/ensure`; nunca `/v1/commands` Globe directo.
- Autoridad: one-shot exacta, expirable/revocable, canal `mcp`, actor Greenhouse y workspace binding revalidados.
- Recovery: repetir la misma `authorityId` sólo lee/reanuda la misma ejecución durable; no crea otra operación.
- Rollout: feature flag OFF por defecto; allow/deny, scope, mapping, timeout/readback y canary real antes de ON.
- El gateway no recibe DB, provider, grant, pool, balance ni permiso directo de confirmación.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

Reglas obligatorias:

- El gateway es adapter/router; cada producto conserva source of truth, commands y policy.
- El primer corte es read-only, fail-closed y sin imports/acceso de DB, storage ni provider.
- Identidad humana OAuth y workload identity downstream permanecen separadas.
- No se publica DNS ni se habilita un provider sin canaries allow/deny/scope/redaction.

## Normative Docs

- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/in-progress/TASK-1473-globe-contract-packaging-parity-certification.md`

## Dependencies & Impact

### Depends on

- Foundation del gateway: sin dependencia de runtime de Greenhouse o Globe.
- Provider Globe operativo: `TASK-1473` para contracts/SDK/MCP adapter y certificación de paridad.
- Publicación externa: authorization server y cliente MCP registrados, más control DNS de `efeonce.org`.

### Blocks / Impacts

- Futuras capacidades MCP de Efeonce, Wave, Kortex y demás productos.
- `TASK-1473`, que entrega el provider Globe consumido por este gateway.
- Configuración IAM de la API de Globe para la service account dedicada del gateway.

### Files owned

- `../efeonce-mcp/**`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `.codex/skills/efeonce-mcp-platform/**` + `.claude/skills/efeonce-mcp-platform/**`
- `scripts/skills/validate-mirrored-skills.mjs`
- actualizaciones acotadas de índices/handoff relacionadas con esta task

## Current Repo State

### Already exists

- El SDK oficial de MCP soporta Streamable HTTP y el ecosistema ya tiene arquitectura read-first/downstream.
- GCP `efeonce-group` y el patrón WIF/Cloud Run están operativos.
- Globe tiene API IAM-private, dominio/commands canónicos y reader de flota; su packaging MCP pertenece a
  `TASK-1473`.

### Gap

- El repo, runtime, hostname, resource server OAuth y pipeline están desplegados; el canary OAuth autenticado
  por el hostname público ya invocó el fleet reader real de Globe.
- La identidad dedicada y allowlist cross-project ya están limitadas a la capability de catálogo y al workspace
  interno exacto. Falta la separación B2B de entitlements/emisión de scopes antes de clientes externos y la
  paridad de capacidades Globe que no pertenecen al reader.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `nuevo repo sibling ../efeonce-mcp, autorizado por ADR aceptado`
- Future candidate home: `remain-shared`
- Boundary: `transporte/auth/discovery/routing MCP; adapters llaman APIs/SDK/commands de cada provider`
- Server/browser split: `server-only; tokens, service identity, routing y provider clients nunca llegan al browser`
- Build impact: `container Node 24 independiente, lockfile e imagen propios; SDKs de providers con pins exactos`
- Extraction blocker: `ninguno para foundation; integración Globe requiere contract package + IAM/allowlist cross-project`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `ninguno de dominio; el gateway posee sólo configuración de providers y transporte`
- Consumidores afectados: `clientes MCP, Globe y futuros providers Efeonce`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `MCP 2026-07-28, SDK oficial v2, ADR de esta task, Globe API/SDK contracts`
- Contrato nuevo o modificado: `https://mcp.efeonce.org/mcp`, protected-resource metadata y provider registry`
- Backward compatibility: `gated; no existe consumidor productivo previo`
- Full API parity: `cada tool/resource delega a una capability/reader canónico del provider; cero business logic local`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna en V1; registry por configuración versionada`
- Invariantes que no se pueden romper:
  - `el principal OAuth no confiere acceso downstream fuera de scopes y policy del provider`
  - `ningún adapter accede directamente a DB, storage o API de proveedor creativo`
  - `un provider degradado no abre acceso ni derriba el discovery de providers sanos`
- Tenant/space boundary: `se deriva de token/scopes y se revalida en el provider; nunca se acepta workspace libre del cliente`
- Idempotency/concurrency: `V1 read-only/stateless; request y correlation IDs únicos; límites por principal/tool`
- Audit/outbox/history: `logs estructurados redaccionados; persistencia/audit de dominio permanece en cada provider`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `MCP fail-closed; providers disabled hasta readiness; Globe read-only internal allowlist primero`
- Backfill plan: `none`
- Rollback path: `provider OFF, traffic a revisión Cloud Run previa o servicio fail-closed 503`
- External coordination: `GitHub, GCP/WIF, authorization server, Globe IAM/allowlist, HostGator DNS`

### Security and access

- Auth/access gate: `OAuth access token para cliente; service account + ID token de audience exacta downstream`
- Sensitive data posture: `tokens/secrets sólo server-side; logs y errores redaccionados`
- Error contract: `JSON-RPC/MCP y HTTP estándar; errores downstream sanitizados con correlation ID`
- Abuse/rate-limit posture: `body cap, rate/quota por principal/provider/tool, timeout, concurrency cap y circuit breaker`

### Runtime evidence

- Local checks: `typecheck, lint, unit, contract, auth-negative, conformance y container smoke`
- DB/runtime checks: `N/A — V1 no accede a DB`
- Integration checks: `Cloud Run private canary; OAuth allow/deny/expiry/scope; Globe allow/deny/timeout/redaction`
- Reliability signals/logs: `request count, auth rejects, latency/error por provider/tool, readiness y saturation`
- Production verification sequence: `local -> container -> Cloud Run private -> OAuth client -> Globe internal -> ALB/cert -> DNS -> live smoke`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

> **Traspasado a `TASK-1473` el 2026-09-06.** La paridad amplia de capabilities Globe es suya; esta task
> conserva sólo `globe.producer.fleet.list` como capacidad read-only real. Los tres criterios de abajo se cierran
> allá, no acá — quedan como referencia histórica.

- [ ] Cada tool/resource de Globe mapea a un reader/command canónico y conserva sus errores/policy.
- [ ] Coverage machine-readable distingue `enabled`, `policy-blocked`, `unavailable` y `not-applicable`.
- [ ] El gateway no crea capabilities de negocio ni una ruta especial sólo para un cliente MCP.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Repository and build unit

- Crear repo privado `efeoncepro/efeonce-mcp`, Node 24/TypeScript, pnpm, tests, Dockerfile, CI y ownership docs.
- Asegurar build reproducible, image no-root, health mínimo y configuración validada/fail-closed.

### Slice 2 — Protocol and OAuth resource server

- Implementar Streamable HTTP en `/mcp`, protected-resource metadata, bearer validation y scopes.
- Agregar límites, errores sanitizados, request/correlation IDs, logging y conformance tests.

### Slice 3 — Provider registry and Globe federation

- Implementar registry/adapter contract sin imports de dominio.
- Consumir el provider Globe entregado por `TASK-1473`, primero read-only e internal-only.
- Provisionar service identity y allowlist cross-project mediante IaC de cada dueño.

### Slice 4 — Cloud Run and keyless delivery

- Crear Artifact Registry/service account/Cloud Run/IAM y pipeline GitHub Actions con WIF, sin llaves.
- Ejecutar private canary y ensayar rollback antes del front door.

### Slice 5 — Front door and canonical domain

- Crear global external ALB, serverless NEG, managed certificate e ingress restringido.
- Publicar DNS `mcp.efeonce.org` sólo con auth y smokes verdes; reservar/redirect opcional de `mcp.efeoncepro.com`.

### Slice 6 — Verification and operations

- Ejecutar conformance, auth negative paths, provider fault tests, load smoke y cliente MCP real.
- Publicar runbook, dashboards/alerts, evidence, handoff y estado runtime honesto.

## Out of Scope

- Mover lógica, datos, secretos o providers creativos de Globe al gateway.
- Writes MCP, acceso cliente externo a Globe o promoción comercial de Globe.
- Construir un authorization server propio sin ADR y security review separados.
- Persistencia/session store hasta que un escenario medido lo requiera.
- Dual-host OAuth o múltiples endpoints públicos canónicos.

## Detailed Spec

El gateway carga providers por configuración explícita y los mantiene deshabilitados si su versión, auth o
readiness no coincide. La primera respuesta pública nunca depende de configuración implícita: si OAuth no está
completo, `/mcp` falla cerrado; si Globe no está listo, Globe figura `policy-blocked`/`unavailable` sin exponer
detalles internos. El repo incluye IaC y pipeline propios para que un release no requiera desplegar Greenhouse.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`contracts/tests -> private Cloud Run -> OAuth canary -> ALB/cert -> DNS -> live conformance -> provider canary`.
Un provider no se habilita antes de sus propios allow/deny tests; el gateway base puede salir con ese provider OFF.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Endpoint anónimo por config incompleta | auth | medium | fail-closed + negative smoke pre/post deploy | request sin token ejecuta tool |
| Gateway excede permisos | IAM/Globe | medium | SA dedicada, invoker único, allowlist y cero roles de datos | acceso DB/storage o audience laxa |
| Drift adapter/provider | contracts | medium | SemVer pin, conformance y readiness versionada | schema mismatch / missing capability |
| Provider degradado derriba gateway | reliability | medium | timeout/circuit/aislamiento por provider | health global cae por Globe |
| DNS/cert incompleto | edge | low | publicar DNS al final + readback | cert no ACTIVE / hostname no resuelve |
| Costo o escala sin control | Cloud Run/LB | low | max instances, concurrency y budgets/alerts | saturation o gasto fuera de umbral |

### Feature flags / cutover

- Gateway desplegado con MCP protegido y providers OFF.
- `globe` se habilita sólo para subjects/scopes internos durante canary.
- El hostname canónico se publica después de auth, provider y certificado verdes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Repo/protocol | revert release y redeploy revisión previa | <30 min | sí |
| OAuth | fail-closed / revocar cliente / restaurar issuer previo | <15 min | sí |
| Globe provider | provider OFF + retirar IAM/allowlist | <15 min | sí |
| Cloud Run | traffic rollback a revisión anterior | <15 min | sí |
| Front door/DNS | mantener host con 503 seguro o restaurar record validado | <60 min + TTL | sí, lento |

### Production verification sequence

1. Tests y container local.
2. Cloud Run URL autenticada con servicio sin provider.
3. OAuth: sin token, token expirado, audience incorrecta, scope insuficiente y happy path.
4. Globe: allow, deny, timeout, error sanitizado y correlation.
5. ALB/cert/DNS readback desde red externa.
6. Conformance con al menos un cliente MCP real y observación de logs/alertas.

### Out-of-band coordination required

Registro del recurso/cliente en el authorization server, IAM/allowlist en el proyecto `efeonce-globe` y cambio
DNS en HostGator requieren acceso del operador. No se sustituyen con tokens estáticos ni exposición anónima.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] `efeoncepro/efeonce-mcp` existe como repo privado independiente con CI y container reproducibles.
- [x] `https://mcp.efeonce.org/mcp` sirve Streamable HTTP sobre TLS y discovery OAuth correcto.
- [x] Requests sin token fallan en el hostname público antes de ejecutar tools; los casos de expiración,
      audience y scope se cubren antes del dispatch en la suite del gateway. TASK-1832 cerró la prueba live
      base-only en producción: write oculto y llamada directa `403 insufficient_scope` con challenge para
      `efeonce.mcp.seo.write`, sin dispatch ni ampliación de permisos.
- [x] Runtime usa service account dedicada y WIF; no hay keys persistentes ni roles de datos de Globe.
- [x] Globe aporta `globe.producer.fleet.list` como capacidad read-only real mediante `TASK-1473`, con
      redacción y canary de cliente MCP. La paridad amplia de las demás capabilities sigue en `TASK-1473`.
- [x] Gateway no importa DB/provider/storage de Globe y un fallo de Globe queda aislado.
- [ ] Smokes live cubren protocolo, auth, provider, DNS/cert, carga mínima y rollback.
- [x] Runbook, ADR, registry, handoff, changelog y estado de rollout quedan sincronizados.

### Estado de rollout — 2026-08-01

- DNS externo de `mcp.efeonce.org` está propagado a `34.111.78.237` sin `AAAA` ni `CNAME`.
- El certificado `efeonce-mcp-gateway-cert` y su dominio están `ACTIVE`; el SNI presenta un certificado válido
  para `mcp.efeonce.org`.
- Los smokes públicos aprobaron: health `200`, metadata OAuth `200`, `POST /mcp` sin token `401` con challenge,
  OAuth PKCE autenticado, discovery y `globe.producer.fleet.list` por el hostname canónico.
- Hardening posterior: Cloud Armor quedó adjunto al backend con throttle aproximado de 600 requests/minuto por
  IP; la revisión histórica `efeonce-mcp-gateway-00009-9c6` restringía host/origin a `mcp.efeonce.org`, tenía
  tráfico 100% y `maxScale=5`. El readback live de TASK-1832 del 2026-09-07 verificó `maxScale=20`; ningún valor
  histórico sustituye las cuotas, entitlements ni límites de gasto de los products providers.
- El primer callback localhost venció con un listener de 180 segundos; el canary ahora admite una ventana de 10
  minutos configurable. Su override DNS se usa sólo para diagnóstico, conserva SNI público y no modifica runtime.
- Límite actual: auth de tenant único y un reader Globe read-only. El cliente PKCE interno recibe base + reader
  (`efeonce.mcp.read` y `efeonce.mcp.globe.read`) incluso cuando solicita sólo el base: la exposición a clientes
  exige separación B2B de entitlements/emisión de scopes y una prueba real base-only. El gateway declara un tercer
  scope, el write interno `efeonce.mcp.globe.credits.funding.ensure` gateado por `globeCreditFunding.enabled`; que
  este mismo cliente lo reciba además no está verificado y depende de su propio consentimiento/asignación. Las
  demás tools Globe siguen bajo `TASK-1473`.

## Verification

- `pnpm task:lint --task TASK-1626`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --agent codex`
- `pnpm docs:closure-check`
- `cd ../efeonce-mcp && pnpm check && pnpm test && pnpm build`
- smokes live definidos en `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`

## Closing Protocol

- [ ] Lifecycle/carpeta y registros sincronizados con evidencia.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Estado final declarado como `complete`, `code complete, rollout pendiente` u `operativamente bloqueado`.
- [ ] Ningún pendiente de auth, IAM, DNS, certificado o provider se presenta como runtime completo.

## Follow-ups

- Providers futuros se registran en tasks propias y no amplían esta task por acumulación.
- Writes MCP requieren ADR/task separada por dominio y clase de impacto.
