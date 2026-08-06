# TASK-1647 — MCP Gateway: Federación del Provider Greenhouse-SEO (`mcp.efeonce.org`)

## Delta 2026-08-05 — code complete; enable pendiente del release prod

**Entregado (repo `efeonce-mcp`, commits `a53b77f`+`4870e90` en main):** provider `greenhouse-seo`
(adapter delgado, fail-closed `policy-blocked`, gated por `GREENHOUSE_SEO_PROVIDER_ENABLED` default OFF) +
3 tools bajo scope base `efeonce.mcp.read` + 6 tests canary + canary e2e committeado. **Greenhouse:** consumer
`EO-SPK-0004` + binding internal `EO-SPB-0004` (activos) provisionados con
`scripts/api-platform/provision-mcp-gateway-seo-consumer.ts`; token en Secret Manager
(`efeonce-mcp-gateway-greenhouse-token`, jamás impreso). `GROWTH_SEO_ENABLED=true` en Vercel **staging**
(redeploy aplicado — autorizado por el operador).

**Canary e2e verificado (2026-08-05, provider real → lane staging por HTTPS):** Efeonce entitlement
`contracted 8/$50` ✓ + `no_seo_data` honesto ✓ · **Berel `domainQuadrant=riesgo`, 50 keywords, AEO 44.5** ✓
(Berel provisionada Fase 0: `cpma-berel-seo-contracted` + `seot-berel-fase0`) · deny anti-oracle 404 ✓.

**Por qué NO complete:** los tools aún no son alcanzables por `mcp.efeonce.org` — habilitar el provider en el
gateway público requiere que greenhouse PROD tenga el lane (release develop→main pendiente). Secuencia de
cierre: (1) release prod de greenhouse (control plane), (2) `GROWTH_SEO_ENABLED=true` en Vercel prod,
(3) env del gateway en Cloud Run (`GREENHOUSE_SEO_PROVIDER_ENABLED=true` + `GREENHOUSE_ECOSYSTEM_API_URL=
https://greenhouse.efeoncepro.com` + secret ref del token) + deploy dispatch, (4) smoke final por
`https://mcp.efeonce.org/mcp`.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `CODE COMPLETE 2026-08-05 — provider + tools + canary e2e verificados; enable en el gateway público pendiente del release prod de greenhouse (cutover)`
- Rank: `TBD`
- Domain: `mcp|platform|growth`
- Blocked by: `none` (TASK-1645 code-complete entrega los tools; gateway público verificado en TASK-1626)
- Branch: `task/TASK-1647-mcp-gateway-greenhouse-seo-provider-federation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Registra **Greenhouse-SEO como provider federado del gateway `mcp.efeonce.org`** (TASK-1626), exponiendo los 3 tools de TASK-1645 (`get_seo_keyword_opportunities`, `get_seo_visibility_360`, `get_seo_entitlement`) a clientes MCP del gateway bajo scope read. Es el segundo salto del mandato MCP-first del operador (2026-08-05): TASK-1645 puso los tools en el server MCP de Greenhouse; esta task los hace alcanzables por `mcp.efeonce.org`. El adapter del gateway es DELGADO (transporte + auth + routing): delega en el lane ecosystem de Greenhouse (`/api/platform/ecosystem/growth/seo/*`), que ya aplica entitlement per-org, anti-oracle y resolución de org por binding. Cumple el acceptance criterion de TASK-1645 ("disponibilidad en mcp.efeonce.org con dueño").

## Why This Task Exists

Sin federación, los tools SEO viven en el server MCP de Greenhouse pero no son alcanzables desde el front door `mcp.efeonce.org` — el hueco exacto que el criterio de TASK-1645 prohíbe dejar sin task. El gateway está live (TASK-1626: gateway público + fleet reader Globe verificados) y su regla es que ningún provider se habilita sin canaries allow/deny/scope/redaction; esta task ejecuta ese protocolo para Greenhouse-SEO. La skill dueña del control plane es `efeonce-mcp-platform` (invocarla al implementar).

## Goal

- Provider Greenhouse-SEO registrado en el provider registry del gateway con adapter delgado hacia el lane ecosystem SEO (auth de servicio keyless, timeouts explícitos, pins).
- Los 3 tools alcanzables vía `https://mcp.efeonce.org/mcp` bajo scope base `efeonce.mcp.read`.
- Canaries del gateway (allow/deny/scope/redaction) verdes para el provider ANTES de habilitar DNS/discovery.
- Smoke e2e documentado: cliente MCP real → gateway → lane → reader, con org entitled (data) y org no entitled (deny anti-oracle).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `.claude/skills/efeonce-mcp-platform/SKILL.md` — control plane router del gateway (clasificar gateway-only vs provider-only vs cross-runtime; el gateway NUNCA recibe lógica de dominio, DB ni storage).
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md` — contrato del gateway (Cloud Run, OAuth humanos + service identity keyless para providers, 3 scopes, provider registry).
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7/§9/§17 — primitives, entitlements y seam Wave (el provider del gateway apuntará al runtime de Wave tras la extracción, sin cambio para los clientes MCP).
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lane ecosystem (el downstream del adapter).

Reglas obligatorias:

- **El adapter del gateway es transporte, NUNCA dominio.** Cero lógica SEO, cero DB, cero secretos de dominio en el gateway; delega en el lane ecosystem con la service identity del gateway.
- **Ningún provider se habilita sin canaries** allow/deny/scope/redaction verdes (regla TASK-1626).
- **La autorización de datos vive en Greenhouse** (entitlement per-org + anti-oracle del lane); el gateway solo autentica el caller y aplica scopes MCP.
- **Read-only.** Sin tools de write en esta federación.

## Normative Docs

- `docs/tasks/in-progress/TASK-1645-growth-seo-ecosystem-lane-mcp-tools.md` — los tools + el lane que este provider federa [al cierre de 1645 la ruta cambia a `complete/`].
- `src/app/api/platform/ecosystem/growth/seo/**` — el downstream real del adapter.
- Registro/adapter del provider Globe en el gateway — patrón de federación existente [verificar en el repo/servicio del gateway].

## Dependencies & Impact

### Depends on

- `TASK-1645` — tools + lane ecosystem SEO (code-complete 2026-08-05).
- `TASK-1626` — gateway `mcp.efeonce.org` live con provider registry [verificar estado de discovery/scopes al tomar la task].
- Binding sister-platform para la service identity del gateway hacia el lane ecosystem de Greenhouse [verificar si el consumer del gateway ya existe en `sister_platform` o hay que provisionarlo].

### Blocks / Impacts

- Cierra el criterio "disponibilidad en `mcp.efeonce.org`" del exit criterion parity+MCP de `EPIC-022`.
- Patrón replicable para federar los tools futuros (rank/audit/backlinks — TASK-1303/1304) sin task nueva: el provider ya federado los recoge al registrarse en el server de Greenhouse [verificar mecánica de discovery de tools del gateway].

### Files owned

- Provider registry/adapter del gateway (repo/servicio del gateway — cross-runtime) [verificar path exacto].
- `docs/manual-de-uso/plataforma/**` (manual MCP: tools SEO vía gateway) [extendido].
- Sin archivos nuevos en `src/**` de greenhouse-eo salvo ajustes menores de config si el binding lo requiere.

## Current Repo State

### Already exists

- Tools + lane ecosystem SEO (TASK-1645): entitlement per-org, anti-oracle, degradación honesta, 17 tests + smoke live.
- Gateway `mcp.efeonce.org` live con federación Globe read-only (TASK-1626).

### Gap

- El provider registry del gateway no conoce a Greenhouse-SEO; los 3 tools solo son alcanzables por el server MCP de Greenhouse, no por el front door.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: adapter en el servicio del gateway (Cloud Run `mcp.efeonce.org`); downstream = lane ecosystem de greenhouse-eo (sin cambios de placement).
- Future candidate home: `remain-shared`
- Boundary: el gateway posee transporte/auth/discovery/routing; Greenhouse posee el lane, el entitlement y los readers. Nota Wave: tras la extracción de SV360, el adapter re-apunta al runtime de Wave sin cambio para los clientes MCP (arch doc SEO §17).
- Server/browser split: 100% server-side (gateway Cloud Run + lane machine-authed); nada llega a un browser.
- Build impact: imagen/deploy del gateway (repo propio, lockfile propio); cero impacto en el build de greenhouse-eo.
- Extraction blocker: ninguno; no se autoriza crear deployables nuevos — se reusa el gateway existente.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: ninguno de dominio — el gateway solo agrega configuración de provider/routing.
- Consumidores afectados: clientes MCP del gateway (`mcp.efeonce.org`).
- Runtime target: `production` (el gateway es un runtime único con gating por scopes)

### Contract surface

- Contrato existente a respetar: protocolo de providers del gateway (adapter delgado, service identity keyless, timeouts, canaries) + el contrato del lane ecosystem SEO (shapes de TASK-1645, sin re-mapear).
- Contrato nuevo o modificado: entrada del provider Greenhouse-SEO en el registry + mapeo de los 3 tools bajo scope `efeonce.mcp.read`.
- Backward compatibility: `full` (aditivo; ningún provider/tool existente cambia).
- Full API parity: cierre del tercer consumer real (cliente MCP externo vía gateway) sobre los mismos primitives.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna en Greenhouse; registry de providers del gateway (config, no dominio).
- Invariantes que no se pueden romper:
  - El gateway NUNCA accede a DB/storage/secretos de dominio de Greenhouse; solo llama el lane con su service identity.
  - La autorización de datos (entitlement per-org + anti-oracle) queda ÍNTEGRA en el lane; el gateway no la re-implementa ni la relaja.
  - Scope read del gateway para los 3 tools; cero writes.
  - Shapes passthrough (las degradaciones honestas del lane llegan intactas al cliente MCP).
- Tenant/space boundary: doble capa — scopes MCP del gateway (caller) + binding/entitlement del lane (datos).
- Idempotency/concurrency: N/A (reads).
- Audit/outbox/history: telemetría/audit del gateway existente + audit del lane (ya emitido por `runEcosystemReadRoute`).

### Migration, backfill and rollout

- Migration posture: `none` en Greenhouse; config/deploy del gateway.
- Default state: provider registrado pero gated hasta canaries verdes (regla TASK-1626).
- Backfill plan: N/A.
- Rollback path: retirar la entrada del provider del registry + redeploy del gateway (<15 min, sin efecto en Greenhouse).
- External coordination: deploy del gateway (repo/servicio propio) + provisión del binding/service identity si falta [verificar].

### Security and access

- Auth/access gate: OAuth humano/scopes del gateway (caller) + service identity keyless gateway→lane + entitlement per-org del lane (datos). Validar issuer/audience/expiry (regla skill MCP).
- Sensitive data posture: métricas SEO/AEO no-PII; redaction canary del gateway igualmente obligatoria.
- Error contract: errores del lane passthrough (codes estables); el gateway no inventa mensajes.
- Abuse/rate-limit posture: límites del gateway + el lane no gasta provider en reads (snapshots materializados).

### Runtime evidence

- Local checks: tests del adapter en el repo del gateway (según su convención).
- DB/runtime checks: N/A en Greenhouse.
- Integration checks: canaries allow/deny/scope/redaction del provider + smoke e2e cliente MCP → gateway → lane (org entitled y no entitled).
- Reliability signals/logs: telemetría del gateway; sin signal nueva en Greenhouse.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

No introduce capabilities: federa consumers sobre los primitives gobernados existentes (TASK-1301/1302/1305/1645). El gate queda satisfecho cuando un cliente MCP del gateway opera los mismos contratos que UI/Nexa/lane sin lógica duplicada, con la doble capa de autorización (scopes del gateway + entitlement del lane) verificada por canaries + smoke.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Provider registration + adapter

- Registrar Greenhouse-SEO en el provider registry del gateway; adapter delgado (3 tools → lane ecosystem) con service identity keyless, timeouts y pins según el protocolo del gateway; provisionar/verificar el binding del gateway hacia Greenhouse.

### Slice 2 — Canaries + smoke e2e + docs

- Canaries allow/deny/scope/redaction verdes; smoke e2e documentado (org entitled → data real; org no entitled → deny); habilitar discovery; manual MCP actualizado con los 3 tools vía gateway.

## Out of Scope

- Tools nuevos (rank/audit/backlinks llegan con TASK-1303/1304 bajo su criterio MCP-tool-mismo-PR).
- Writes vía MCP (governed action loop, follow-up del programa).
- Cambios al lane/readers de Greenhouse (TASK-1645 los dejó cerrados).
- Acceso externo B2B/multitenant del gateway (sigue gated por TASK-1626).

## Detailed Spec

Seguir el protocolo de providers de la skill `efeonce-mcp-platform`: clasificar el trabajo como provider-only + config de gateway; adapter que delega en el canonical API (el lane), nunca en DB; validar issuer/audience/expiry del token de servicio; canaries antes de discovery. El mapeo de tools conserva nombres y shapes de TASK-1645 (los summaries/description ya enseñan la degradación honesta al agente).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (registro+adapter, gated) → Slice 2 (canaries → smoke → discovery). NUNCA habilitar discovery antes de canaries verdes (regla dura TASK-1626).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Adapter con lógica de dominio o acceso directo a datos | mcp/platform | low | regla dura del gateway + review skill efeonce-mcp-platform | code review |
| Provider habilitado sin canaries → exposición prematura | mcp/platform | medium | orden duro Slice 1→2; discovery gated | canaries del gateway |
| Service identity mal scoped → el lane rechaza o sobre-expone | platform | medium | binding con scope correcto + smoke deny/allow en ambos sentidos | smoke e2e |
| Doble autorización relajada (gateway confía y lane confía) | seguridad | low | el lane NUNCA relaja entitlement por venir del gateway (test existente de 1645 lo cubre) | tests 1645 + canary scope |

### Feature flags / cutover

- El gating es el propio provider registry + discovery del gateway (no hay flag `*_ENABLED` nuevo en Greenhouse). `GROWTH_SEO_ENABLED` sigue gobernando el módulo aguas abajo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | retirar provider del registry + redeploy gateway | <15 min | si |
| Slice 2 | deshabilitar discovery del provider | <5 min | si |

### Production verification sequence

1. Canaries allow/deny/scope/redaction del provider verdes en el gateway.
2. Cliente MCP real contra `https://mcp.efeonce.org/mcp`: `get_seo_entitlement` de una org entitled → data; org no entitled → deny anti-oracle passthrough.
3. `get_seo_visibility_360` de la org piloto → quadrant real (mismo resultado que el smoke del lane de TASK-1645).
4. Documentar la invocación e2e (comando + respuesta) en el cierre + manual MCP.

### Out-of-band coordination required

- Deploy del gateway (repo/servicio propio, TASK-1626 lane) + provisión del binding/service identity del gateway hacia el lane ecosystem de Greenhouse si no existe [verificar].

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Provider Greenhouse-SEO registrado en el gateway con adapter delgado (cero lógica de dominio) delegando en el lane ecosystem.
- [x] Los 3 tools de TASK-1645 alcanzables vía `mcp.efeonce.org` bajo scope read; nombres y shapes passthrough sin re-mapear.
- [x] Canaries allow/deny/scope/redaction verdes ANTES de discovery.
- [x] Smoke e2e documentado: org entitled → data real; org no entitled → deny anti-oracle; cross-org denegado.
- [x] La autorización de datos queda íntegra en el lane (el gateway no la re-implementa ni la relaja).
- [x] Manual MCP actualizado (tools SEO vía gateway) + referencia en el cierre de TASK-1645/EPIC-022.

## Evidencia del cutover a producción — 2026-08-06

Secuencia ejecutada (cada capa verificada antes de habilitar la siguiente):

1. **Release `develop→main`** — SHA `70e912056273d0a30e2aa8dacc2f4e62076e3b44`,
   `release_id=70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`, run `31058032196`,
   manifest `released`, watchdog `drift_count=0`.
2. **`GROWTH_SEO_ENABLED=true` en Vercel Production** + redeploy
   `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9` (Vercel congela env vars al crear el build).
3. **Canary del provider contra producción** — `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`
   `node scripts/greenhouse-seo-canary.mjs org-2df565fb-… org-32333527-…`:

   ```text
   ✓ entitlement(org-2df565fb-…): {"hasModule":true,"tier":"contracted","audits":8,"budgetUsd":50}
   ✓ visibility-360(org-2df565fb-…): degradación honesta → {"ok":false,"errorCode":"no_seo_data","status":null}
   ✓ entitlement(org-32333527-…): {"hasModule":true,"tier":"contracted","audits":8,"budgetUsd":50}
   ✓ visibility-360(org-32333527-…): domainQuadrant=riesgo keywords=50 aeo=44.5
   ✓ deny anti-oracle (org inexistente): status=404 greenhouse_seo_lane_404
   ```

4. **Enable del provider en el gateway** — `efeonce-mcp` `76cb121`, workflow `31059346243`,
   revisión Cloud Run `efeonce-mcp-gateway-00012-dkj` `Ready=True` con
   `GREENHOUSE_SEO_PROVIDER_ENABLED=true`, `GREENHOUSE_ECOSYSTEM_API_URL=https://greenhouse.efeoncepro.com`
   y `GREENHOUSE_ECOSYSTEM_TOKEN` como **secret ref** (`efeonce-mcp-gateway-greenhouse-token:latest`,
   nunca valor plano). El SA `efeonce-mcp-gateway@efeonce-group` recibió `secretAccessor` scoped
   sobre ese secreto (el secreto se había creado sin ninguna binding: el deploy habría fallado).
5. **Front door público** — `GET /health` `200`; `GET /.well-known/oauth-protected-resource` `200`
   declarando los 3 scopes; `POST /mcp` anónimo `401` con
   `WWW-Authenticate: Bearer resource_metadata=… scope="efeonce.mcp.read"`. Fail-closed correcto.
6. **Smoke MCP autenticado por `mcp.efeonce.org` — VERDE.** El canary OAuth
   (`scripts/oauth-canary.mjs`) quedó extendido en este cierre con las tools SEO
   (`MCP_CANARY_SEO_ORGANIZATION_ID` + `MCP_CANARY_SEO_DENY_ORGANIZATION_ID`).
   Flujo real Entra authorization-code + PKCE (login humano), token con
   `aud=c5363215-b9a6-4bf1-bb1c-e61963b37dac` y `scp` incluyendo `efeonce.mcp.read`:

   ```bash
   MCP_CANARY_SEO_ORGANIZATION_ID=org-32333527-02a8-487b-819e-6f76a761777d \
   MCP_CANARY_SEO_DENY_ORGANIZATION_ID=org-00000000-0000-0000-0000-000000000000 \
   node scripts/oauth-canary.mjs
   ```

   ```json
   {
     "oauth": "passed",
     "initializeStatus": 200,
     "initializeContentType": "text/event-stream",
     "globeCapabilitiesStatus": 200,
     "globeFleetStatus": 200,
     "seoEntitlementStatus": 200,
     "seoVisibility360Status": 200,
     "seoDomainQuadrant": "riesgo",
     "seoDenyFailedClosed": true
   }
   ```

   **`seoDomainQuadrant=riesgo` es el quadrant real de Berel devuelto por el front door
   público**, con token Entra real, sobre el scope base `efeonce.mcp.read`: la cadena
   Entra → gateway → provider → lane ecosystem → readers → PG está cerrada end-to-end.
   El deny anti-oracle también falla cerrado por esta ruta. Requiere login interactivo,
   así que es un smoke asistido por humano, no automatizable en CI.

## Verification

- Canaries del gateway + smoke e2e cliente MCP real (documentado).
- Tests del adapter según convención del repo del gateway.
- Re-verificación de que los tests del lane (TASK-1645) siguen verdes en Greenhouse.

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (EPIC-022 exit criterion parity+MCP; TASK-1645 referencia cerrada; TASK-1626 registry de providers)
- [x] manual MCP + doc del gateway actualizados

## Follow-ups

- Federar los tools futuros (rank/audit/backlinks) al aterrizar TASK-1303/1304 — verificar si el discovery del gateway los recoge solo o requiere config por tool.
- Acceso externo B2B/multitenant del gateway (gated por TASK-1626).

## Open Questions

1. ¿El consumer/binding del gateway hacia el lane ecosystem de Greenhouse ya existe (lo usa Globe fleet reader) o hay que provisionarlo para Greenhouse como downstream? Verificar en Discovery contra el registry de `sister_platform`.
2. ¿El discovery de tools del gateway es por-provider (recoge tools nuevos del server de Greenhouse automáticamente) o por-tool (config explícita)? Define el costo de federar rank/audit después.
