# EPIC-035 — Efeonce Embed Runtime

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Dirección portable aceptada; provider selection y ejecución pendientes`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Platform Engineering` (accountable); `Growth/Public Site` (product acceptance); `Security/Cloud` (IAM acceptance)
- Branch: `epic/EPIC-035-efeonce-embed-runtime`
- GitHub Issue: `none`

## Summary

Construye la plataforma portable de distribución para Growth Forms, CTAs y Meetings, consumible por WordPress y
Think/Astro sin depender del release de la aplicación Greenhouse. Greenhouse conserva control, APIs y verdad
transaccional; `assets.efeoncepro.com` es la frontera pública neutral y `TASK-1515` selecciona con evidencia entre
Vercel endurecido y Firebase Hosting en un proyecto GCP dedicado bajo la misma organización/facturación.

## Why This Epic Exists

Los tres renderers comparten el mismo dolor pero hoy tienen dos soluciones incompletas: Forms/CTAs cambian con el `prebuild` de Greenhouse, mientras Meetings tiene un proyecto Vercel independiente cuya promoción todavía es local y cuyo snapshot puede perder el release que un manifest acaba de resolver. CTA, además, conoce URLs de proveedor de sus dependencias.

No cabe en una task. Requiere estabilizar el carril actual, formalizar protocolo y compatibilidad, provisionar infraestructura e identidad keyless, construir fixtures reales en dos repos/hosts, migrar tres productos en orden dependiente, preservar GTM/consentimiento y operar dual-publish/rollback antes de retirar legacy.

## Outcome

- Forms, CTAs y Meetings se publican de forma independiente del deploy de Greenhouse mediante un protocolo común y artefactos inmutables.
- WordPress y Think/Astro consumen `assets.efeoncepro.com` y separan claramente `asset-base-url` de `api-base-url`.
- El delivery plane se elige entre Vercel endurecido y Firebase Hosting en proyecto GCP dedicado mediante un gate
  comparable; no se habilita Firebase en `efeonce-group`.
- CTA resuelve Forms/Meetings mediante registry/manifest, sin URLs Vercel o Greenhouse hardcoded.
- Cada producto tiene promoción exacta, rollback, compatibilidad N/N-1, sintéticos reales, costo y evidencia operativa.
- GTM/CMP permanecen host-owned y los ledgers de Greenhouse conservan la verdad de conversiones.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Child Tasks

- `TASK-1514` — Foundation: race hardening Vercel, protocol V1, fleet retention, receipts y fixtures host.
- `TASK-1515` — Delivery-plane selection y provisioning gateado: Vercel endurecido vs Firebase en proyecto GCP
  dedicado, identidad keyless, dominio neutral y promoción exacta.
- `TASK-1516` — Meetings dual-publish, real-host soak, neutral-domain cutover y rollback.
- `TASK-1517` — Forms independent release, WordPress/Think migration y submission/abuse/legacy verification.
- `TASK-1518` — CTA registry/cutover, composition matrix y cierre de legacy/SLO/costos/runbooks del fleet.

## Existing Related Work

- `TASK-1509` y `TASK-1510` construyen el scheduler nativo, su contrato portable y el primer carril de artefactos independiente.
- `EPIC-023` conserva ownership de producto sobre CTA/CRO; este epic sólo gobierna la plataforma de distribución/composición portable.
- `EPIC-027` gobierna el desacople de build/runtime y prohíbe crear deployables incidentales fuera de unidades formales.
- Growth Forms conserva captura, consentimiento y accepted-submission truth.
- Growth Meetings conserva booking state, idempotencia y confirmed-booking truth.
- WordPress y Think son hosts/consumers; no son fuentes de verdad de los productos Growth.

## Delivery Strategy

Secuencia obligatoria de cutover: estabilizar Vercel/protocolo/fixtures → seleccionar y provisionar delivery plane →
dual-publish Meetings → Forms → CTA → retirement. Forms y CTA pueden preparar release/compatibilidad después de
`TASK-1514`, pero sus cutovers esperan el pilot Meetings; CTA corta al final porque compone ambos.

`TASK-1515` comienza con discovery no mutante y un checkpoint de decisión. Sólo después puede endurecer el Vercel
existente o, si Firebase gana, crear un proyecto GCP dedicado dentro de la organización y billing existentes. No
autoriza Firebase en `efeonce-group`, credenciales persistentes, DNS cutover, consumer cutover ni retiro de Vercel.

## Exit Criteria

- [ ] La carrera manifest/asset de Meetings está eliminada y una prueba demuestra que el release anterior sigue resolviendo durante promoción/rollback.
- [ ] El protocolo V1 valida product/version/source/API range/dependencies/hashes y separa asset/API base URLs.
- [ ] GitHub Actions publica con identidad corta/federada, ambiente protegido exacto, mínimo privilegio y receipt
  trazable; no existen llaves JSON persistentes ni se reutiliza el deployer general de `efeonce-group`.
- [ ] La selección Vercel/Firebase conserva una matriz comparable de seguridad, promoción, rollback, costo y carga
  operativa; si Firebase gana, el before/after inventory cubre el proyecto dedicado, APIs, IAM, SAs, labels y keys.
- [ ] `assets.efeoncepro.com` sirve TLS, headers, channels y releases conforme al contrato sin exponer vendor URLs a hosts.
- [ ] El candidate verificado se promueve como bytes exactos a live y existe rollback probado bajo 15 minutos.
- [ ] Una promoción stale cuyo `baseFleetDigest` difiere del live actual se rechaza y recompone; full-site rollback y
  per-product recomposition se prueban como operaciones distintas.
- [ ] WordPress y Think/Astro pasan la matriz de Forms, CTA, Meetings, CTA→Form y CTA→Meetings que aplique.
- [ ] Cada renderer pasa 2048/1440/820/390 px, `scrollWidth === clientWidth`, teclado, foco visible y reduced motion.
- [ ] GTM/dataLayer y CMP se verifican sin PII; accepted submissions y confirmed bookings reconcilian con ledgers server-side.
- [ ] CTA no contiene URLs hardcoded o derivadas de Vercel/Greenhouse para cargar Forms o Meetings.
- [ ] Host styling usa sólo tokens/parts/slots documentados o mantiene un contrato explícito versionado.
- [ ] Un cambio visual aprobado llega a preview en ≤5 min y a live en ≤10 min después de aprobación, sin build/release
  de la aplicación Greenhouse; receipt y owner permiten medirlo.
- [ ] Costos, transferencia y carga operativa del provider son observables; si Firebase gana, Hosting se mide por
  SKU/transfer/storage en el proyecto dedicado y ningún budget deshabilita billing automáticamente.
- [ ] Legacy shims, compatibilidad N/N-1, retiro y fallback Vercel tienen ventana, owner, señal de uso y rollback.
- [ ] Docs técnicas, funcionales y runbook permiten publicar, promover, diagnosticar y revertir cada producto sin conocimiento tribal.

## Non-goals

- Mover APIs, submissions, bookings, targeting, consent ledgers o PII al delivery provider.
- Usar Cloud Functions, Firestore, Firebase Auth, App Hosting o Cloud Run para servir renderers estáticos.
- Crear un megabundle o una versión única de Forms, CTAs y Meetings.
- Reescribir la UI/product logic de los tres renderers como parte de la migración de delivery.
- Reemplazar GTM/CMP del host o convertir eventos browser en verdad transaccional.
- Retirar Vercel, cambiar DNS o promover producción sin tasks, gates y autorización operacional explícita.

## Delta 2026-07-22

Epic creado tras investigación de mercado, auditoría del runtime existente y revisión arquitectónica. La creación documental no provisiona cloud, no modifica runtime y no ejecuta releases.

## Delta 2026-07-22 — Execution package

El operador aprobó compactar el programa en cinco tasks secuenciales (`TASK-1514`..`TASK-1518`). Los workstreams de
fixtures y retirement se integran respectivamente en foundation y fleet closure; no nacen tasks paraguas adicionales.

## Delta 2026-07-22 — Architecture assurance correction

El ADR V2 conserva el runtime neutral, suspende el supuesto de Firebase dentro de `efeonce-group` y convierte
`TASK-1515` en un gate Vercel-vs-Firebase dedicado con provisioning posterior a la decisión. Se asignan owners por
concern, SLO de lead time, single-writer promotion y matriz visual 2048/1440/820/390. Cero mutaciones cloud/runtime.
