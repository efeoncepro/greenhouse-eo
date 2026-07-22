# TASK-1516 — Meetings Dual-Publish and Neutral-Domain Cutover

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-035`
- Status real: `Diseño; bloqueada por foundation y Firebase spike`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1514, TASK-1515`
- Branch: `task/TASK-1516-meetings-dual-publish-neutral-domain-cutover`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Publica el mismo release de Meetings en Vercel y Firebase, compara bytes y comportamiento en hosts reales, y mueve el
loader canónico a `assets.efeoncepro.com` sólo después de soak y rollback drill. Vercel y el loader anterior permanecen
como fallback durante la ventana compatible.

## Why This Task Exists

Meetings es el adopter más maduro y el único con carril independiente live. Es el candidato seguro para demostrar que
el nuevo delivery plane no cambia `/agenda/`, GTM ni la API Greenhouse. Un big-bang con los tres productos impediría
aislar fallas de CDN, protocolo o host.

## Goal

- Probar dual-publish byte-equivalente y comportamiento equivalente en WordPress/Think fixture.
- Cortar el origen neutral con evidencia visual, telemetry y API compatibility.
- Probar rollback primario a un fleet snapshot neutral previo sin release de Greenhouse; Vercel queda como disaster
  fallback con RTO separado, no como promesa de rollback DNS bajo 15 minutos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Mismo releaseId/hashes/SRI en ambos providers; no builds separados.
- Greenhouse sigue como API y ledger; Firebase sólo sirve artifacts.
- GTM/CMP son host-owned y no contienen PII, slot exacto ni Teams URL.
- Ningún cambio visual intencional; toda diferencia GVC es blocker.

## Normative Docs

- `docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md`
- `docs/tasks/in-progress/TASK-1510-native-meeting-scheduler-portable-experience.md`

## Dependencies & Impact

### Depends on

- `TASK-1514` protocol/race hardening.
- `TASK-1515` Hosting/WIF/rollback verified.
- Release Meetings vigente y `/agenda/` WordPress.

### Blocks / Impacts

- Bloquea `TASK-1517` y `TASK-1518` como precedente de cutover.
- Afecta loader/host config; no booking contract.

### Files owned

- `scripts/release-growth-meeting-renderer-site.mjs`
- `.github/workflows/embed-runtime-release.yml`
- `src/growth-cta-renderer/meeting-action.ts` sólo si el adapter resuelve el loader neutral
- `../efeonce-public-site-runtime/` adapter de `/agenda/` `[verificar en Discovery]`
- fixtures/synthetics de `scripts/embed-runtime/`

## Current Repo State

### Already exists

- `/agenda/` live con loader Vercel estable y release inmutable.
- Renderer validado a 2048/1440/820/390, teclado y reduced motion.
- API/booking/telemetry separadas del artifact origin.

### Gap

- Firebase no tiene un Meetings release productivo comparado.
- Embed sigue apuntando a Vercel provider URL.
- No existe soak, rollback live ni measurement evidence del dominio neutral.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `meeting renderer release tooling + WordPress host adapter`
- Future candidate home: `public`
- Boundary: `meetings loader protocol; API Greenhouse permanece separada`
- Server/browser split: `artifacts browser-safe; release/DNS/receipts server-side tooling`
- Build impact: `dual target consume un único fleet artifact; sin nuevo runtime dependency`
- Extraction blocker: `host cutover y release evidence coordinan repos/runtime externos`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Meetings stable channel y host loader origin`
- Consumidores afectados: `WordPress /agenda, CTA meeting action, Think fixture`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `meetings-renderer.v1 + Greenhouse meeting API`
- Contrato nuevo o modificado: `stable asset origin bajo assets.efeoncepro.com`
- Backward compatibility: `gated; legacy loader permanece`
- Full API parity: `N/A — no cambia capability de booking`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB`
- Invariantes que no se pueden romper:
  - `mismo release en ambos providers`
  - `confirmed booking sigue siendo truth server-side`
  - `host page funciona si loader falla`
- Tenant/space boundary: `origin allowlist vigente; sin tenant en artifacts`
- Idempotency/concurrency: `promotion serializada por channel; booking idempotency intacta`
- Audit/outbox/history: `release/cutover/rollback receipts`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `shadow` dual-publish sin consumer Firebase
- Backfill plan: `N/A`
- Rollback path: `loader Vercel/previous release + DNS/config revert`
- External coordination: `WordPress, DNS, GTM observation y release approval`

### Security and access

- Auth/access gate: `protected release environment + host origin policy`
- Sensitive data posture: `no sensitive data en artifacts/telemetry`
- Error contract: `loader fail-contained; API errors canónicos intactos`
- Abuse/rate-limit posture: `booking API guards existentes`

### Runtime evidence

- Local checks: `meeting tests + site verify`
- DB/runtime checks: `read-only reconciliation de booking ledger cuando se ejecute booking aprobado`
- Integration checks: `hash parity, WordPress/Think, GTM/dataLayer, /g/collect cuando consentido`
- Reliability signals/logs: `loader/manifest/asset/API/first-render + rollback age`
- Production verification sequence: `dual-publish → soak → neutral cutover → rollback drill → restore`

### Acceptance criteria additions

- [ ] Cutover y rollback conservan API/ledger truth y host availability.
- [ ] Evidencia real no contiene PII.
- [ ] No hay diferencia visual intencional.

<!-- ZONE 2 — PLAN MODE -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Dual-publish and parity

- Publicar el mismo artifact/fleet digest en Vercel y Firebase.
- Comparar bytes, headers, manifest, SRI, registration y API behavior.

### Slice 2 — Real-host soak

- Ejecutar `/agenda/` y Think fixture en 2048/1440/820/390, teclado, reduced motion, overflow y failure states.
- Verificar dataLayer/CMP y ausencia de PII.

### Slice 3 — Cutover and rollback

- Mover el host al dominio neutral tras aprobación y soak.
- Ejecutar rollback primario por `hosting:clone` del snapshot neutral verificado dentro de 15 minutos y restaurar la
  release elegida. Ensayar Vercel por separado como fallback de desastre sujeto a TTL/configuración del host.

## Out of Scope

- Cambiar diseño o booking flow.
- Migrar Forms/CTA.
- Publicar GTM workspace sin confirmación humana separada.

## Detailed Spec

Dual-publish consume un único directorio firmado por el fleet digest; no recompila por provider. La comparación cubre
bytes, headers y browser behavior. El cutover modifica únicamente la resolución del loader/asset origin: el API base,
scheduler key, host surface y contratos de booking permanecen iguales.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Dual-publish → soak → cutover → rollback drill. No se omite el rollback por tener hashes iguales.

### Risk matrix

| Riesgo                       | Sistema   | Probabilidad | Mitigation                 | Signal de alerta        |
| ---------------------------- | --------- | ------------ | -------------------------- | ----------------------- |
| CDN difiere en headers/cache | public    | medium       | parity gate                | manifest/asset mismatch |
| Host rompe por CSP/CORS      | WordPress | medium       | shadow + CSP fixture       | loader blocked          |
| GTM pierde eventos           | analytics | low          | dataLayer + collect checks | event absent            |

### Feature flags / cutover

Channel/host config es el switch. Legacy Vercel loader se conserva durante la ventana compatible.

### Rollback plan per slice

| Slice | Rollback                                   | Tiempo                      | Reversible? |
| ----- | ------------------------------------------ | --------------------------- | ----------- |
| 1     | detener Firebase publish; Vercel untouched | <15 min                     | sí          |
| 2     | retirar host shadow config                 | <15 min                     | sí          |
| 3     | clone previous neutral fleet snapshot      | <15 min                     | sí          |

El fallback a Vercel tiene un RTO separado que incluye host config/DNS TTL y no satisface por sí solo el SLO de
rollback primario.

### Production verification sequence

1. Hash/SRI/fleet digest parity.
2. Real-host GVC y telemetry/CMP.
3. Cutover neutral con health verde.
4. Rollback drill y restore.
5. Soak monitor y receipt final.

### Out-of-band coordination required

- Aprobación release/cutover, sesión WordPress y DNS si aplica.
- Booking real y publish GTM requieren autorización separada.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Un único build produce artifacts byte-equivalentes en Vercel/Firebase.
- [ ] `/agenda/` y Think fixture pasan matriz visual/a11y/failure sin regresiones.
- [ ] `dataLayer` y medición consent-aware sobreviven el cambio de CDN sin PII.
- [ ] Neutral-domain cutover queda verificado en live.
- [ ] Rollback real completa bajo 15 minutos.
- [ ] Legacy loader permanece operativo y observado durante su ventana.

## Verification

- Suites `src/growth-meeting-renderer/__tests__` y site verify.
- GVC 2048/1440/820/390, teclado, reduced motion, overflow=0.
- `pnpm local:check`, `pnpm task:lint --task TASK-1516`, `pnpm docs:closure-check`.

## Closing Protocol

- [ ] Lifecycle/carpeta e índices sincronizados.
- [ ] Release/cutover/rollback receipts y runbook enlazados.
- [ ] TASK-1510 recibe sólo un delta de relación, sin cambiar epic primario.
- [ ] QA release auditor y documentation governor revisan cierre.

## Follow-ups

- `TASK-1517` — Forms migration.
