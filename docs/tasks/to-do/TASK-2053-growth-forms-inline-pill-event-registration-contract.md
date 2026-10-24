# TASK-2053 — Growth Forms: contrato de formulario en línea, reserva por evento y conteo de reservas

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|forms|public-site`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende el contrato de Growth Forms para lo que pide la portada del blog v3: una presentación «en línea» en la que un
botón píldora se transforma en el campo de correo con su botón de envío, una superficie de reserva por evento
(`event_registration`) con cupos y lista de espera, y un endpoint público agregado que entrega el conteo de reservas
(«312 personas ya reservaron su lugar») de forma gobernada. Es la base que consume TASK-2054 (renderer).

## Why This Task Exists

El canvas aprobado pone dos formularios en línea (suscripción a Glitch y reserva del webinar) y muestra un contador de
reservas. Hoy el contrato sólo conoce la presentación estándar y la de diálogo (TASK-2044/2045); el kind
`event_registration` existe (`src/lib/growth/forms/contracts.ts:28`) pero sin política de cupos ni lista de espera
(`GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`), los campos ocultos no se pueden inyectar desde el host
(`src/growth-forms-renderer/renderer.ts`), y las rutas públicas son sólo contrato, catálogo, envío, verificación y
asset (`src/app/api/public/growth/forms/**`): no existe forma gobernada de obtener el conteo.

## Goal

- El contrato declara `presentation: 'inline_pill'` con valores opcionales y retrocompatibles.
- Cada evento tiene su formulario de reserva con identificación estática, cupos y lista de espera.
- Existe `GET` público del conteo de reservas aceptadas, deduplicado, redondeado y con umbral mínimo para mostrarse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- Todo campo nuevo es opcional y tiene default igual al comportamiento actual (formularios vivos sin cambio).
- El conteo nunca expone PII ni identificadores; se calcula en servidor sobre envíos aceptados.
- Errores con `canonicalErrorResponse`; sin prosa en inglés hacia el cliente.

## Normative Docs

- `docs/tasks/in-progress/TASK-2044-growth-forms-cta-design-fidelity-contract.md` (patrón de contrato de fidelidad)
- `scripts/public-website/blog-growth-form/PUBLICATION-CHECKLIST.md`
- `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md`

## Dependencies & Impact

### Depends on

- TASK-2044 (contrato de fidelidad, code complete en develop).

### Blocks / Impacts

- TASK-2054 (renderer en línea) consume este contrato.
- TASK-2051 usa el formulario en línea y el conteo.
- TASK-2050 referencia el formulario de cada evento por `form_key`.

### Files owned

- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/readers.ts`
- `src/lib/growth/forms/policy-compiler.ts`
- `src/app/api/public/growth/forms/[formSlug]/registrations-count/route.ts` [crear]
- `scripts/growth/forms/publish-event-registration-form.ts` [crear]
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (delta)

## Current Repo State

### Already exists

- `presentation` de campo, consentimiento y éxito (TASK-2044); `dialog` en Growth CTA.
- Kind `event_registration` y CTA «Reservar mi lugar» en el copy.
- Rutas públicas `[formSlug]` y `catalog`.

### Gap

- No hay presentación en línea.
- No hay cupos, lista de espera ni identificación estática por evento.
- No hay conteo público de reservas.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/growth/forms/` y `src/app/api/public/growth/forms/` en greenhouse-eo
- Future candidate home: `domain-package`
- Boundary: contrato `growth-forms` (render, envío) y reader `countAcceptedRegistrations(formSlug)` expuesto por la ruta pública
- Server/browser split: validación, conteo y políticas en servidor; el navegador recibe el contrato y un número redondeado
- Build impact: none
- Extraction blocker: transacción de envío y destinos HubSpot viven en el mismo dominio

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: definiciones de formularios Growth y envíos aceptados en PostgreSQL
- Consumidores afectados: renderer (TASK-2054), portada del blog, agentes por REST pública
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `growth-public-forms-runtime-contract.md`, campos de TASK-2044
- Contrato nuevo o modificado: `presentation: 'inline_pill'` + `inlinePill.{openLabel, submitLabel, note, doneLabel, successLabel}`; `capacity` y `waitlist` en formularios `event_registration`; `GET /api/public/growth/forms/[formSlug]/registrations-count`
- Backward compatibility: `compatible`
- Full API parity: el conteo es un reader canónico expuesto por REST; la publicación de formularios por evento es un script gobernado (`publish-event-registration-form.ts`)

### Data model and invariants

- Entidades/tablas/views afectadas: tablas de definiciones y envíos de Growth Forms existentes [verificar nombres en `src/lib/growth/forms/store.ts`]
- Invariantes que no se pueden romper:
  - el conteo cuenta envíos aceptados y deduplicados por correo verificado, nunca intentos
  - el conteo se muestra sólo sobre un umbral (por defecto 25) y redondeado a la decena
  - superado el cupo, el formulario pasa a lista de espera sin perder envíos
- Write-target allowlist: `N/A — sin tablas nuevas`
- Tenant/space boundary: formularios públicos por `formSlug`; sin datos de otros formularios
- Idempotency/concurrency: el conteo es de sólo lectura con caché de 10 min; el cupo se valida en la transacción de envío
- Audit/outbox/history: sin cambio (el envío ya audita)

### Migration, backfill and rollout

- Migration posture: `none` (campos dentro del JSON de definición) [verificar]
- Default state: `inline_pill` sólo para formularios que lo declaren; conteo detrás de la opción `showRegistrationsCount`
- Backfill plan: none
- Rollback path: revert PR; los formularios vuelven a la presentación estándar
- External coordination: release de Greenhouse a `main` (control plane) y del worker si cambia el mapping

### Security and access

- Auth/access gate: ruta pública sin sesión, con CORS de los orígenes del sitio (`cors.ts`)
- Sensitive data posture: sin PII en la respuesta
- Error contract: `canonicalErrorResponse`
- Abuse/rate-limit posture: caché 10 min + rate limit por IP en la ruta pública

### Runtime evidence

- Local checks: `pnpm test src/lib/growth/forms`; pruebas de la ruta nueva
- DB/runtime checks: lectura del conteo contra PostgreSQL vía `pnpm pg:connect`
- Integration checks: envío de prueba a un formulario de evento de staging y conteo actualizado
- Reliability signals/logs: `captureWithDomain` en errores del reader
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done

- [ ] Lógica en `src/lib/growth/forms/**`, no en el renderer.
- [ ] Reader del conteo y script de publicación como caminos programáticos.
- [ ] Un primitive, muchos consumers: renderer, portada, agentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Presentación en línea

- `presentation: 'inline_pill'` con sus etiquetas opcionales; validación y pruebas; delta del ADR.

### Slice 2 — Reserva por evento

- Cupos, lista de espera y valor oculto estático por formulario; `publish-event-registration-form.ts`.

### Slice 3 — Conteo de reservas

- Reader `countAcceptedRegistrations` + ruta pública con umbral, redondeo, caché y rate limit.

## Out of Scope

- El renderer y su animación (TASK-2054).
- Correos de confirmación y recordatorios (siguen en HubSpot).

## Detailed Spec

Los textos por defecto de la presentación en línea vienen del canvas: Glitch «Suscríbete a Glitch» / «Suscribirme» /
«¡Listo!» / «Ya estás suscrito a Glitch»; evento «Reservar mi lugar» / «Reservar» / «¡Lugar reservado!» /
«Te esperamos el 12 de noviembre» (fecha del evento). La respuesta del conteo: `{ count: 310, display: "310", shown: true }`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3; TASK-2054 puede empezar tras el Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un formulario vivo cambia de aspecto | Growth Forms | low | campos opcionales con default actual; prueba de contratos idénticos | diff del contrato |
| El conteo revela poca demanda | marca | medium | umbral mínimo y redondeo | n/a |
| Abuso de la ruta pública | API | low | caché + rate limit | logs de 429 |

### Feature flags / cutover

- Opción por formulario `showRegistrationsCount` (default `false`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–3 | Revert PR + release | 30 min | sí |

### Production verification sequence

1. Pruebas locales y contratos idénticos para los formularios vivos.
2. Release por el control plane.
3. Formulario de evento de prueba en staging: envío y conteo.

### Out-of-band coordination required

- Release de Greenhouse a `main` (requiere aprobación del operador).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los contratos de los formularios vivos quedan idénticos.
- [ ] Un formulario con `inline_pill` valida y entrega sus etiquetas.
- [ ] Un formulario de evento rechaza envíos sobre el cupo o los pasa a lista de espera según su política.
- [ ] La ruta del conteo responde sin PII, redondeado, con umbral, caché y rate limit.

## Verification

- `pnpm test src/lib/growth/forms`
- `pnpm local:check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] delta del ADR de Growth Forms

## Follow-ups

- Marketing Events de HubSpot si el operador lo pide.
