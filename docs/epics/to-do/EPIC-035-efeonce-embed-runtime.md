# EPIC-035 — Efeonce Embed Runtime

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Arquitectura aceptada; TASK-1514..1518 registradas, ejecución pendiente`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-035-efeonce-embed-runtime`
- GitHub Issue: `none`

## Summary

Construye la plataforma portable de distribución para Growth Forms, CTAs y Meetings, consumible por WordPress y
Think/Astro sin depender del release de la aplicación Greenhouse. Greenhouse conserva control, APIs y verdad
transaccional; un Hosting site secundario dedicado dentro del proyecto compartido `efeonce-group` es el delivery plane
objetivo detrás de `assets.efeoncepro.com`, con Vercel como carril de migración y fallback.

## Why This Epic Exists

Los tres renderers comparten el mismo dolor pero hoy tienen dos soluciones incompletas: Forms/CTAs cambian con el `prebuild` de Greenhouse, mientras Meetings tiene un proyecto Vercel independiente cuya promoción todavía es local y cuyo snapshot puede perder el release que un manifest acaba de resolver. CTA, además, conoce URLs de proveedor de sus dependencias.

No cabe en una task. Requiere estabilizar el carril actual, formalizar protocolo y compatibilidad, provisionar infraestructura e identidad keyless, construir fixtures reales en dos repos/hosts, migrar tres productos en orden dependiente, preservar GTM/consentimiento y operar dual-publish/rollback antes de retirar legacy.

## Outcome

- Forms, CTAs y Meetings se publican de forma independiente del deploy de Greenhouse mediante un protocolo común y artefactos inmutables.
- WordPress y Think/Astro consumen `assets.efeoncepro.com` y separan claramente `asset-base-url` de `api-base-url`.
- Firebase Hosting pasa a ser delivery plane sólo después de un spike con go/no-go y dual-publish verificable; Vercel sigue siendo fallback reversible.
- CTA resuelve Forms/Meetings mediante registry/manifest, sin URLs Vercel o Greenhouse hardcoded.
- Cada producto tiene promoción exacta, rollback, compatibilidad N/N-1, sintéticos reales, costo y evidencia operativa.
- GTM/CMP permanecen host-owned y los ledgers de Greenhouse conservan la verdad de conversiones.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V1.md`
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
- `TASK-1515` — Firebase Hosting delivery plane en `efeonce-group`: site/billing/IAM, dominio neutral y promoción
  keyless exacta.
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

Secuencia obligatoria: estabilizar Vercel → protocolo/fixtures → spike Firebase → dual-publish Meetings → Forms → CTA → retirement. CTA migra después de Forms y Meetings porque compone ambos. Un fallo del spike no bloquea el objetivo funcional: el protocolo continúa sobre Vercel y la decisión se reabre con evidencia.

`TASK-1515` reutiliza el proyecto GCP aprobado `efeonce-group` y crea/configura un Hosting site dedicado. No autoriza
un proyecto paralelo, credenciales persistentes ni ampliaciones IAM no justificadas. No hay release, DNS cutover ni
retiro de Vercel implícito por crear este epic.

EPIC-035 acepta explícitamente que habilitar Firebase en `efeonce-group` es una mutación de infraestructura no
completamente reversible. El cutover del renderer sigue siendo reversible; borrar el proyecto o el Hosting site nunca
es rollback. IAM, billing y quotas continúan compartidos y se compensan con secondary site, publisher dedicado,
custom role, WIF exact-subject y promoción concurrency-safe.

## Exit Criteria

- [ ] La carrera manifest/asset de Meetings está eliminada y una prueba demuestra que el release anterior sigue resolviendo durante promoción/rollback.
- [ ] El protocolo V1 valida product/version/source/API range/dependencies/hashes y separa asset/API base URLs.
- [ ] GitHub Actions publica con OIDC/WIF, ambiente protegido, mínimo privilegio y receipt trazable; no existen llaves JSON persistentes.
- [ ] Before/after inventory registra APIs, IAM, service accounts, labels y API keys/restricciones del Firebase
  enablement; el deployer general de `efeonce-group` no se reutiliza.
- [ ] `assets.efeoncepro.com` sirve TLS, headers, channels y releases conforme al contrato sin exponer vendor URLs a hosts.
- [ ] Preview verificado se clona exactamente a live y existe rollback probado bajo 15 minutos.
- [ ] Una promoción stale cuyo `baseFleetDigest` difiere del live actual se rechaza y recompone; full-site rollback y
  per-product recomposition se prueban como operaciones distintas.
- [ ] WordPress y Think/Astro pasan la matriz de Forms, CTA, Meetings, CTA→Form y CTA→Meetings que aplique.
- [ ] Cada renderer pasa 390 px/desktop, `scrollWidth === clientWidth`, teclado, foco visible y reduced motion.
- [ ] GTM/dataLayer y CMP se verifican sin PII; accepted submissions y confirmed bookings reconcilian con ledgers server-side.
- [ ] CTA no contiene URLs hardcoded o derivadas de Vercel/Greenhouse para cargar Forms o Meetings.
- [ ] Host styling usa sólo tokens/parts/slots documentados o mantiene un contrato explícito versionado.
- [ ] Costos y transferencia son observables; Blaze y alertas iniciales están configurados y documentados.
- [ ] Costos Hosting son observables por SKU/transfer/storage; las alertas del proyecto compartido no se presentan como
  budget aislado del site ni deshabilitan billing automáticamente.
- [ ] Legacy shims, compatibilidad N/N-1, retiro y fallback Vercel tienen ventana, owner, señal de uso y rollback.
- [ ] Docs técnicas, funcionales y runbook permiten publicar, promover, diagnosticar y revertir cada producto sin conocimiento tribal.

## Non-goals

- Mover APIs, submissions, bookings, targeting, consent ledgers o PII a Firebase.
- Usar Cloud Functions, Firestore, Firebase Auth o Cloud Run para servir renderers estáticos.
- Crear un megabundle o una versión única de Forms, CTAs y Meetings.
- Reescribir la UI/product logic de los tres renderers como parte de la migración de delivery.
- Reemplazar GTM/CMP del host o convertir eventos browser en verdad transaccional.
- Retirar Vercel, cambiar DNS o promover producción sin tasks, gates y autorización operacional explícita.

## Delta 2026-07-22

Epic creado tras investigación de mercado, auditoría del runtime existente y revisión arquitectónica. Formaliza Firebase Hosting como target condicionado a spike y mantiene Vercel como carril reversible. La creación documental no provisiona cloud, no modifica runtime y no ejecuta releases.

## Delta 2026-07-22 — Execution package

El operador aprobó compactar el programa en cinco tasks secuenciales (`TASK-1514`..`TASK-1518`). Los workstreams de
fixtures y retirement se integran respectivamente en foundation y fleet closure; no nacen tasks paraguas adicionales.
