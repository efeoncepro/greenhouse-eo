# TASK-266 — Greenhouse i18n & Globalization Activation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto` (agregado de child tasks; el umbrella mismo no implementa)
- Type: `umbrella`
- Status real: `Cerrada 2026-05-06`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` — la umbrella coordina; cada child task declara sus propios blockers.
- Branch: `develop` (cerrada administrativamente por TASK-428)
- Legacy ID: —
- GitHub Issue: —
- Children:
  - `TASK-428` — i18n architecture decision (complete 2026-05-06)
  - `TASK-429` — locale-aware formatting utilities (complete 2026-05-06)
  - `TASK-430` — dictionary foundation activation (complete 2026-05-06)
  - `TASK-431` — tenant + user locale persistence model (depende de 428; requiere PG migration)
  - (futuros, derivar cuando corresponda) — shared shell rollout, emails localization, SEO & routing deep-links

## Summary

Efeonce está radicada en Chile pero opera con clientes enterprise distribuidos por toda América y el mundo (aerolíneas, bancos, manufactura). Greenhouse no puede quedarse atado a una capa verbal `es-only` ni a formatos hardcoded en `es-CL`: ese es un techo real para el footprint del negocio, no una feature especulativa. El upstream de Vuexy full-version ya trae un scaffolding real de i18n/dictionaries (`configs/i18n.ts`, `utils/getDictionary.ts`, `data/dictionaries/*.json`), pero el portal actual no lo adoptó y el único caso de multi-locale en el runtime es un email aislado (`LeaveRequestPendingReviewEmail.tsx`) con un patrón manual ad-hoc. Esta task formaliza la activación de internacionalización y globalization de Greenhouse como programa incremental, separada de `TASK-265`, para no mezclar copy contract con routing, locale strategy, formateo, emails y surfaces runtime.

## Why This Task Exists

### Driver de negocio (no especulativo)

Los clientes de Efeonce están distribuidos por América y el mundo — aerolíneas, bancos y empresas de manufactura no son PYMES locales. Eso implica:

- Stakeholders no hispanohablantes (portugués, inglés) que consumen el portal o sus derivables (reports, emails, exports).
- Formatos de moneda, fecha y número que no pueden asumir `es-CL` — un cliente en Brasil no lee montos con separador `.` de miles, uno en US no lee fechas como `dd-mm-yyyy`.
- SLAs, contracts y economics que cruzan monedas (CLP, BRL, USD, MXN) y no pueden seguir hardcodeando el locale de formateo.
- Emails institucionales que hoy se envían en español a todos los tenants por default.

Esto es distinto a una agencia chilena operando para clientes chilenos. i18n aquí no es expansión hipotética: es acompañar el footprint real del negocio.

### Por qué carril propio (no dentro de TASK-265)

Sí, incorporar i18n sirve. Pero no sirve como "detalle" dentro de la task de nomenclature. i18n introduce decisiones de plataforma que van bastante más allá del microcopy:

- estrategia de locales y fallback
- routing con o sin prefijo de locale
- diccionarios y namespaces
- formateo de fechas, moneda y números (crítico para Finance y payroll multi-currency)
- persistencia de preferencia de idioma por usuario o tenant
- emails, notificaciones y surfaces externas
- SEO, caching y testing cross-locale

Si se mezcla eso con `TASK-265`, la lane deja de ser una convergencia de copy contract y se vuelve una migración transversal del portal completo. Esta activación necesita carril propio y secuenciado, pero con dependencia dura sobre `TASK-265` para no reconstruir la capa verbal dos veces.

## Goal

- Formalizar una estrategia i18n/globalization defendible para Greenhouse, anclada al footprint real de clientes de Efeonce (LATAM + mercados hispanohablantes y no hispanohablantes).
- Definir la arquitectura incremental para pasar de `es-only` + `es-CL` hardcoded a multi-locale / multi-currency sin romper el portal actual.
- Reusar el scaffolding válido del upstream Vuexy cuando aporte, sin importar su estructura literalmente.
- **Separar copy (idioma) de globalization (formato)**: muchas superficies sólo necesitan locale-aware formatting (fechas, moneda, números) antes de traducción completa; eso puede entregar valor antes del full i18n.
- Dejar child tasks ejecutables para auth, navigation, shared surfaces, formatting, emails, preferencias de usuario y tenant locale default.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`

Reglas obligatorias:

- No mezclar activación i18n con branding/theme; eso vive en `TASK-264`.
- No mezclar activación i18n con copy contract base; eso vive en `TASK-265`.
- La primera iteración debe ser incremental: dictionary-ready + formatting-safe + shared surfaces primero, no traducción masiva de todo el portal en un solo lote.
- El lenguaje de producto Greenhouse debe seguir siendo controlado por la capa de nomenclature/copy y no por traducciones improvisadas por vista.
- No tocar el repo `efeoncepro/kortex` en esta task umbrella; Kortex es consumer futuro del contrato resultante.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `full-version/src/configs/i18n.ts`
- `full-version/src/utils/getDictionary.ts`
- `full-version/src/data/dictionaries/en.json`
- `full-version/src/data/dictionaries/fr.json`
- `full-version/src/data/dictionaries/ar.json`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `src/config/greenhouse-nomenclature.ts`
- `full-version/src/configs/i18n.ts`
- `full-version/src/utils/getDictionary.ts`

### Blocks / Impacts

- Expansión internacional real del portal Greenhouse.
- Formatos correctos por locale para fechas, moneda, números y labels.
- UX y copy portability hacia Kortex y otras superficies hermanas.
- Emails y notificaciones multi-locale futuras.

### Files owned

- `docs/tasks/complete/TASK-266-greenhouse-i18n-globalization-activation.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `[child tasks derivadas]`

## Current Repo State

### Already exists

- El portal ya tiene `next-intl` instalado y conectado al App Router desde `TASK-430`.
- Existe una capa propia de nomenclature/microcopy ya separada: `src/config/greenhouse-nomenclature.ts` queda para navegación/product nomenclature y `src/lib/copy/*` queda para microcopy functional/domain reusable (`TASK-265`, `TASK-407`, `TASK-408`, `TASK-811`).
- Vuexy full-version sí trae i18n config + dictionaries listos como referencia (`full-version/src/configs/i18n.ts` con `en/fr/ar` + `langDirection`, `full-version/src/utils/getDictionary.ts`, `full-version/src/data/dictionaries/*.json`).
- `TASK-429` cerró la primitive canónica `src/lib/format/` y el baseline `greenhouse/no-raw-locale-formatting` quedó en cero warnings para el portal.
- `@formatjs/intl-localematcher` está presente como dependencia aislada (no integrada).
- `LeaveRequestPendingReviewEmail.tsx` ya implementa un patrón bilingüe manual (`locale: 'es' | 'en'`) — útil como prototipo de patrón pero no escalable.
- El producto ya trabaja con contextos globales donde i18n y globalization son relevantes (Finance multi-currency, payroll, emails, SLAs).

### Gap

- `TASK-428` publica la locale strategy formal en `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md`.
- No hay persistencia canónica de preferencia por usuario/tenant todavía: `TASK-431` la implementa y debe absorber el legacy `client_users.locale`.
- Runtime i18n activo: `TASK-430` instala `next-intl`, activa provider y conecta `en-US` para shell/shared copy sin prefijar rutas privadas.
- `pt-BR` queda planned first-class, no activo hasta tener cobertura de dictionary y validación comercial/piloto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

Esta task es una **umbrella pura**: coordina el programa i18n/globalization, no implementa código. La ejecución vive en child tasks independientes, cada una con su propio scope, blockers y acceptance criteria.

### Responsabilidades de este umbrella

1. Mantener la visión agregada del programa: qué locales, cuándo, con qué dependencias.
2. Declarar y priorizar child tasks a medida que el rollout avanza.
3. Resolver el Locale Activation Gate (ver abajo) antes de que cualquier child task de traducción arranque.
4. Arbitrar decisiones transversales que afecten a más de un child task (p.ej. cambio de librería i18n después de `TASK-428`).
5. Consolidar el impacto en documentación de arquitectura (`GREENHOUSE_UI_PLATFORM_V1.md`).

### Child tasks activas

| ID | Alcance | Blocker | Paralelizable |
|----|---------|---------|---------------|
| `TASK-428` | Architecture decision: `next-intl`, routing híbrido state-only privado + prefixes públicos futuros, locales first-class, fallback strategy | complete | — |
| `TASK-429` | Formatting utilities centrales (`src/lib/format/`) para reemplazar 254+ call sites de `Intl.*` con `es-CL` hardcoded | none | Sí — puede arrancar sin 265 ni 428 |
| `TASK-430` | Dictionary foundation activation: conectar locales reales sobre la capa dictionary-ready | complete | — |
| `TASK-431` | Tenant + user locale persistence (migración PG, Identity V2 coordination) | `TASK-428` | Sí con 429/430 |

### Child tasks futuras (crear cuando corresponda)

- Shared shell rollout por locale (derivar de `TASK-407` cuando dictionary foundation esté lista).
- Emails localization (derivar de `TASK-408` cuando `TASK-430` haya conectado el primer locale no-`es-CL`).
  - Estado 2026-05-06 heredado de `TASK-408`: el namespace `emails` ya existe en la capa `src/lib/copy`, los 17 templates institucionales consumen `getMicrocopy`, y `resolveEmailLocale` declara el contrato que esta umbrella debe activar con lookup PG-backed. Para habilitar `en-US` real no se debe reescribir templates; el siguiente paso canónico es poblar el dictionary y activar la resolución por usuario/tenant.
- SEO, caching y testing cross-locale.
- Módulos de dominio priorizados por footprint cliente (Finance multi-currency display, payroll reports).

## Out of Scope

- Traducir el portal completo en esta umbrella.
- Ejecutar refactor masivo de todas las vistas en una sola iteración.
- Resolver theme/branding (`TASK-264`) o copy contract base (`TASK-265`) dentro de esta task.
- Tocar `efeoncepro/kortex`.

## Locale Activation Gate

La umbrella se activa y los slices se ejecutan cuando se cumplen **todas** estas condiciones:

1. `TASK-265` en estado `complete` (capa dictionary-ready existe y microcopy shared migrado).
2. `TASK-428` en estado `complete` con ADR publicado.
3. `en-US` como primer locale de activación y `pt-BR` como planned first-class gated por cobertura/piloto.
4. Tenant/cohort piloto identificado antes de activar un locale adicional en staging/producción.

Slice 3 (formatting) puede arrancar **sin esperar** Slices 2/4 porque entrega valor independiente y no toca copy.

## Acceptance Criteria

- [x] Existe una estrategia i18n/globalization explícita para Greenhouse con locales first-class confirmados por arquitectura (`es-CL` activo, `en-US` fase 1, `pt-BR` planned gated).
- [x] La task deja definidas child tasks ejecutables por slices, no una idea abstracta.
- [x] La relación con `TASK-265` queda clara: copy contract primero, activación i18n incremental después.
- [x] Queda definido cómo Greenhouse pasa de `es-only` a multi-locale sin romper el runtime actual.
- [x] La separación entre copy (idioma) y globalization (formato) está explícita: `TASK-429` ya cerró `src/lib/format/`.
- [x] Las llamadas a `Intl.*` con `es-CL` hardcoded tienen target cerrado vía utility central (`src/lib/format/`).
- [x] El modelo de tenant/user tiene ruta clara para locale persistence en `TASK-431`.

## Verification

- Revisión documental contra arquitectura y repo actual
- Consistencia del plan de adopción con `TASK-265`

## Closing Protocol

- [x] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con la decisión de estrategia i18n si esta umbrella se formaliza.
- [x] Derivar child tasks concretas para las primeras superficies a migrar.

## Follow-ups

Child tasks ya creadas (no son follow-ups, son el scope ejecutable):

- `TASK-428` — i18n architecture decision (complete; ADR publicado)
- `TASK-429` — locale-aware formatting utilities
- `TASK-430` — dictionary foundation activation
- `TASK-431` — tenant + user locale persistence

Follow-ups reales (a derivar cuando corresponda):

- Shared shell rollout por locale
- Emails localization
- SEO + routing deep-links cross-locale
- Finance multi-currency display separado de locale de UI

## Decisions / Open Questions resolved

- Routing: híbrido conservador; portal privado sin locale-prefixed routes por defecto, prefixes solo para rutas públicas/SEO/localized entrypoints futuros.
- Locales: `es-CL` default activo, `en-US` primera activación, `pt-BR` planned first-class gated por cobertura y piloto.
- Copy vs formatting: `src/lib/copy/*` gobierna idioma/copy; `src/lib/format/*` gobierna valores/formatos.
- Detection hierarchy: user preferred locale → tenant/account default → cookie/manual override → `Accept-Language` → `es-CL`.
- Cross-tenant: gana user preference si existe; si no, tenant/account default.
- Product names: marcas/metáforas estables no se traducen por defecto; se traduce helper text alrededor.
- Finance/multi-currency: moneda no se infiere de locale; se usa `src/lib/format` con currency explícita.
