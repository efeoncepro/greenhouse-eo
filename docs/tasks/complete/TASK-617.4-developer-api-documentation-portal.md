# TASK-617.4 — Developer API Documentation Portal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Implementada 2026-04-26`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-617.4-developer-api-documentation-portal`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Evolucionar el primer intento ya existente de `/developers/api` hacia una experiencia pública y developer-facing alineada con la nueva `API platform`. La task debe dejar de usar `integrations/v1` como framing principal y pasar a documentar `ecosystem`, `app`, event control plane, auth, versionado, idempotencia y OpenAPI vigentes.

## Why This Task Exists

Greenhouse ya tiene un primer intento real de portal público para developers:

- `src/app/(blank-layout-pages)/developers/api/page.tsx`

También tiene documentación derivada útil:

- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`

Pero hoy ese primer intento sigue siendo:

- legacy-centric
- enfocado en `integrations/v1`
- incompleto respecto de la `API platform` nueva
- insuficiente para servir a ecosystem consumers, mobile app y futuros developers externos con una historia única

Sin esta task, Greenhouse tendría buena arquitectura interna pero una experiencia pública para developers todavía desalineada.

## Goal

- Convertir `/developers/api` en el entrypoint público principal de la plataforma API para developers.
- Reusar y evolucionar el intento ya existente en vez de abrir otro portal paralelo.
- Dejar docs derivadas y OpenAPI alineadas con las lanes canónicas reales.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- `/developers/api` debe convertirse en la experiencia pública principal para developers; `docs/api/*` siguen siendo artefactos derivados/técnicos.
- La página debe reutilizar la base ya existente en `src/app/(blank-layout-pages)/developers/api/page.tsx`.
- La documentación pública no debe prometer surfaces no endurecidas o no canónicas.
- La documentación debe contemplar explícitamente a la futura app `React Native` como consumer first-party de `api/platform/app/*`.

## Normative Docs

- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-617.1-api-platform-rest-hardening.md`
- `docs/tasks/complete/TASK-617.2-api-platform-first-party-app-surface-foundation.md`
- `docs/tasks/complete/TASK-617.3-api-platform-event-control-plane.md`
- `src/app/(blank-layout-pages)/developers/api/page.tsx`
- `docs/api/**`
- `src/app/api/platform/**`

### Blocks / Impacts

- onboarding de integraciones externas
- consumo developer-facing de la app first-party
- percepción pública de la plataforma API
- futuros SDKs, snippets o examples

### Files owned

- `src/app/(blank-layout-pages)/developers/api/page.tsx`
- `docs/api/**`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `[verificar] public/docs/**`

## Current Repo State

### Already exists

- página pública `/developers/api`
- OpenAPI YAML del carril legacy `integrations/v1`
- quick references en `docs/api/*`
- documentation funcional inicial de `api-platform-ecosystem`

### Gap

- la experiencia pública sigue centrada en `integrations/v1`
- no documenta aún `api/platform/ecosystem/*`
- no contempla la futura lane `app`
- no presenta event control plane como parte de la plataforma
- no actúa todavía como portal canónico para developers

### Discovery delta 2026-04-26

- `TASK-617.1`, `TASK-617.2` y `TASK-617.3` ya estan cerradas y viven en `docs/tasks/complete/`.
- La API Platform runtime actual ya incluye:
  - `api/platform/ecosystem/*`
  - `api/platform/app/*`
  - event control plane bajo `api/platform/ecosystem/*`
- El OpenAPI estable anterior cubre solo el carril legacy/transicional `/api/integrations/v1/*`; esta task agrega un OpenAPI preview para `api/platform/*`.
- `public/docs/greenhouse-integrations-api-v1.*` estaban mas atrasados que `docs/api/*`; deben tratarse como artefactos legacy, no como contrato canonico completo.
- La documentacion publica no debe prometer idempotencia general de writes: todavia no existe helper/runtime transversal de idempotency en `src/lib/api-platform/**`.
- `docs/architecture/schema-snapshot-baseline.sql` esta atrasado respecto de migraciones recientes de API Platform; para este corte la referencia runtime real son las migraciones `20260426021650967_task-617-api-platform-app-foundation.sql`, `20260426023509765_task-617-event-control-plane.sql`, las migraciones sister-platform y `src/types/db.d.ts`.

## Scope

### Slice 1 — Developer portal information architecture

- Rediseñar `/developers/api` como portal público principal de developers.
- Reutilizar la página existente y decidir la taxonomía final:
  - ecosystem API
  - app API
  - event/webhooks
  - auth/versioning/errors

### Slice 2 — Runtime-linked reference surfaces

- Conectar la página pública con las surfaces reales ya estabilizadas.
- Actualizar `docs/api/*` y OpenAPI derivados para que acompañen la nueva historia de plataforma.
- Resolver si la platform API nueva necesita OpenAPI adicional ya en este corte o si queda como follow-up explícito.

### Slice 3 — Examples and consumer guidance

- Documentar auth, headers, versionado, rate limiting, idempotencia y examples de request/response.
- Incluir guidance para ecosystem consumers y para la futura app `React Native` como consumer first-party.
- Incluir guidance de webhooks/event delivery si `TASK-617.3` ya deja surface estable.

### Slice 4 — Canonicalization and cleanup

- Dejar claro qué documento es arquitectura, cuál es funcional y cuál es documentación pública para developers.
- Evitar duplicación o contradicción entre `/developers/api`, `docs/api/*`, `docs/documentation/*` y `docs/architecture/*`.

## Out of Scope

- construir un portal docs multi-producto completo tipo Stripe
- generar SDKs oficiales en esta misma task
- publicar surfaces no endurecidas
- abrir MCP docs públicas en esta fase

## Detailed Spec

La tarea debe partir de un hecho importante:

- Greenhouse ya hizo el primer intento

La meta no es rehacerlo desde cero, sino absorberlo y volverlo canónico.

El orden correcto es:

1. reusar `/developers/api`
2. cambiar el framing desde `integrations/v1` a `api/platform/*`
3. mantener `docs/api/*` como artefactos derivados/técnicos
4. dejar una historia pública coherente para ecosystem, app y event delivery

## Acceptance Criteria

- [x] `/developers/api` existe como portal público developer-facing alineado con la `API platform`.
- [x] La documentación pública principal ya no está centrada en `integrations/v1` como historia canónica.
- [x] La documentación contempla `ecosystem`, `app` y event control plane según el estado real del runtime.
- [x] `docs/api/*`, docs funcionales y arquitectura quedaron alineados sin contradicciones.

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm exec tsc --noEmit --pretty false`
- revision manual de `/developers/api`
- revision manual de links y artefactos descargables

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [x] se verificó manualmente que `/developers/api` no contradice la arquitectura ni los docs derivados descargables

## Follow-ups

- OpenAPI adicional para lanes nuevas si no entra en este corte
- snippets/SDKs oficiales si la demanda de developers lo justifica
