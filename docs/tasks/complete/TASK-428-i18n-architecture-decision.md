# TASK-428 — i18n Architecture Decision (Library + Routing + Locales)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `design`
- Status real: `Cerrada 2026-05-06`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `develop` (por instruccion explicita del usuario; no se crea branch task)
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-266` (umbrella)

## Summary

Primera child task de la umbrella `TASK-266`. Entrega un ADR consolidado con las decisiones de plataforma que todas las demás child tasks de i18n consumen: librería i18n (`next-intl`), estrategia de routing (prefijo por locale vs state-only), lista first-class de locales, estrategia de detección y fallback, y namespaces de diccionarios. No implementa código — deja el contrato que `TASK-429`, `TASK-430` y `TASK-431` obedecen.

## Why This Task Exists

Cada una de las decisiones siguientes tiene blast radius de plataforma:

- La elección de librería (`next-intl` vs `next-international` vs `react-intl`) dicta cómo server components cargan diccionarios, cómo funciona el middleware y cómo se hidrata la cliente.
- La estrategia de routing (`/en/...` prefix vs state-only con cookie/session) afecta auth routes, previews Vercel, deep links existentes y SEO.
- Los locales first-class determinan qué child tasks priorizar y qué tenants pueden activar el feature.
- La jerarquía de detección (user → tenant → browser → fallback) necesita alinearse con Identity V2 y con `TASK-431`.

Si estas decisiones se toman dentro de cada child task, terminan contradiciéndose. Esta task las consolida arriba.

## Goal

- Entregar un ADR (architecture decision record) checkable, no un "a ver qué hacemos".
- Validar los locales first-class con ops/ventas de Efeonce antes de cerrar la task.
- Dejar el contrato runtime que `TASK-429`, `TASK-430`, `TASK-431` implementan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- La decisión de librería debe validarse contra Next.js 16 App Router (server components + middleware) explícitamente; descartar cualquier lib que no los soporte nativamente.
- La decisión de routing debe considerar: auth routes (NextAuth callbacks), preview URLs de Vercel (con SSO bypass), deep links existentes en emails y notifications, SEO.
- `America/Santiago` sigue siendo canónico para payroll y cierre operativo — locale de UI no afecta timezone operativa.
- Identity V2 dicta la sesión — `TASK-431` implementa persistencia pero la jerarquía se decide aquí.

## Normative Docs

- `docs/tasks/complete/TASK-266-greenhouse-i18n-globalization-activation.md`
- `full-version/src/configs/i18n.ts`
- `full-version/src/utils/getDictionary.ts`

## Dependencies & Impact

### Depends on

- Ninguna task previa; pero requiere input de ops/ventas de Efeonce para confirmar locales first-class.

### Blocks / Impacts

- `TASK-430` — dictionary foundation depende de la lib + namespaces decididos aquí.
- `TASK-431` — persistencia depende de la jerarquía de detección decidida aquí.
- Rollouts futuros (shell, emails, SEO) — todos heredan routing strategy.

### Files owned

- `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md` (nuevo, a crear)
- Sección i18n de `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Locales first-class

- Validar con ops/ventas de Efeonce qué locales son first-class en la fase 1.
- Recomendación base: `es-CL` (default), `en-US`, `pt-BR`. Confirmar o ajustar.
- Documentar criterios de adición de nuevos locales en el futuro.

### Slice 2 — Library decision

- Evaluar: `next-intl`, `next-international`, `react-intl`.
- Criterios: App Router compatibility, server components, middleware, tree-shaking, type safety, community momentum.
- Elegir y justificar.

### Slice 3 — Routing strategy

- Elegir entre: prefijo por locale (`/en/...`), state-only con cookie/session sin cambio de URL, o híbrido.
- Evaluar impacto sobre: auth routes, previews Vercel, deep links, SEO, cacheo.
- Definir cómo se comportan URLs ya compartidas en emails/notificaciones existentes.

### Slice 4 — Detection hierarchy

- Jerarquía propuesta: user preference > tenant default > browser `Accept-Language` > system default.
- Definir qué componente del stack resuelve el locale efectivo (middleware, route handler, server component).
- Especificar fallback cuando una key no existe en el locale activo.

### Slice 5 — Namespaces y diccionarios

- Definir namespaces canónicos de diccionarios alineados con la taxonomía de `TASK-265`.
- Estructura de archivos y ownership de copy por namespace.
- Contrato de type safety (generación de tipos a partir de dictionaries).

## Out of Scope

- Implementar la librería i18n elegida: `next-intl`.
- Migrar superficies (eso es `TASK-430` y sus children).
- Crear utilities de formatting (eso es `TASK-429`).
- Persistir locale en PG (eso es `TASK-431`).

## Acceptance Criteria

- [x] ADR publicado en `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md` con:
  - Locales first-class validados
  - Librería elegida con justificación
  - Routing strategy con análisis de impacto
  - Detection hierarchy con puntos de resolución
  - Namespaces y contrato de type safety
- [x] `GREENHOUSE_UI_PLATFORM_V1.md` linkea al ADR.
- [x] `TASK-430` y `TASK-431` pueden arrancar sin ambigüedad tras cerrar esta task.

## Verification

- Revisión documental contra `GREENHOUSE_IDENTITY_ACCESS_V2.md` para consistencia con sesión.
- Validación explícita con ops/ventas sobre locales.

## Closing Protocol

- [x] Publicar ADR.
- [x] Notificar a `TASK-430` y `TASK-431` que pueden arrancar.
- [x] Actualizar `TASK-266` con decisiones tomadas.

## Open Questions

- ¿`next-intl` soporta emails SSR fuera del App Router? Validar para no pintar `TASK-408`/emails localization en una esquina.
- ¿El prefijo de routing afecta el acceso programático de agentes (`staging-request.mjs`)?

## Decisions resolved before implementation

- `next-intl` se elige como libreria del portal App Router. Para emails SSR/background jobs no se dependera del provider de App Router; se usaran dictionaries/core APIs y el bridge existente `src/lib/email/locale-resolver.ts`.
- La estrategia de routing es hibrida conservadora: el portal privado mantiene URLs sin prefijo de locale; los prefixes quedan reservados para rutas publicas/SEO/localized entrypoints futuros.
- `staging-request.mjs`, `/api/*`, auth callbacks y rutas privadas actuales no deben recibir prefijo de locale.
- Locales: `es-CL` activo/default, `en-US` como primer locale de activacion en TASK-430, `pt-BR` planned first-class gated por cobertura de dictionary y validacion comercial.
- `client_users.locale` existe como legacy (`es`/`en`); TASK-431 debe normalizar/absorberlo antes de crear preferencia canonica sobre `identity_profiles.preferred_locale`.
