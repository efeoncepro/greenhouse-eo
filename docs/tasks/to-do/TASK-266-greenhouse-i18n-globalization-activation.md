# TASK-266 — Greenhouse i18n & Globalization Activation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto` (agregado de child tasks; el umbrella mismo no implementa)
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` — la umbrella coordina; cada child task declara sus propios blockers.
- Branch: `task/TASK-266-greenhouse-i18n-globalization-activation`
- Legacy ID: —
- GitHub Issue: —
- Children:
  - `TASK-428` — i18n architecture decision (library + routing strategy)
  - `TASK-429` — locale-aware formatting utilities (complete 2026-05-06)
  - `TASK-430` — dictionary foundation activation (depende de 265 + 428)
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

- `docs/tasks/to-do/TASK-266-greenhouse-i18n-globalization-activation.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `[child tasks derivadas]`

## Current Repo State

### Already exists

- El portal actual es efectivamente `es-only` en código (0 paquetes i18n instalados: ni `next-intl`, ni `next-i18next`, ni `react-intl`).
- Existe una capa propia de nomenclature/microcopy en `src/config/greenhouse-nomenclature.ts` (1592 líneas, ~94 importers). `TASK-265` está recortándola y abriendo la capa dictionary-ready que esta umbrella va a consumir.
- Vuexy full-version sí trae i18n config + dictionaries listos como referencia (`full-version/src/configs/i18n.ts` con `en/fr/ar` + `langDirection`, `full-version/src/utils/getDictionary.ts`, `full-version/src/data/dictionaries/*.json`).
- **254 instancias** de `Intl.DateTimeFormat` / `toLocaleDateString` / `toLocaleString` scattered por el repo, mayoritariamente fijadas a `'es-CL'` — la globalization de formato es el gap más inmediato y barato de cerrar.
- `@formatjs/intl-localematcher` está presente como dependencia aislada (no integrada).
- `LeaveRequestPendingReviewEmail.tsx` ya implementa un patrón bilingüe manual (`locale: 'es' | 'en'`) — útil como prototipo de patrón pero no escalable.
- El producto ya trabaja con contextos globales donde i18n y globalization son relevantes (Finance multi-currency, payroll, emails, SLAs).

### Gap

- No hay locale strategy formal en el runtime actual.
- No existen diccionarios canónicos del portal Greenhouse (la foundation la abre `TASK-265`).
- Formatos hardcodeados a `es-CL` en 254+ call sites sin utility central — ni siquiera un `formatCurrency(amount, locale)` compartido.
- No hay persistencia de preferencia de idioma por usuario ni por tenant (el modelo de tenant no tiene `default_locale`).
- No existe una política institucional para qué surfaces entran primero en i18n.
- No hay estrategia de routing por locale (prefix `/en/...` vs state-only).
- Los emails no tienen framework de localization — replicar el patrón de `LeaveRequestPendingReviewEmail` en los 20+ templates actuales es insostenible.

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
| `TASK-428` | Architecture decision: librería (probable `next-intl`), routing (prefix vs state), locales first-class, fallback strategy | none | — |
| `TASK-429` | Formatting utilities centrales (`src/lib/format/`) para reemplazar 254+ call sites de `Intl.*` con `es-CL` hardcoded | none | Sí — puede arrancar sin 265 ni 428 |
| `TASK-430` | Dictionary foundation activation: conectar locales reales sobre la capa dictionary-ready | `TASK-265`, `TASK-428` | — |
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
2. Lista confirmada de locales first-class con ops/ventas de Efeonce — no activar "en abstracto". Recomendación base: `es-CL`, `en-US`, `pt-BR`.
3. Decisión tomada sobre librería (probable `next-intl`) y estrategia de routing (prefixed vs state-only).
4. Al menos un tenant piloto identificado como consumer inicial del locale no-`es-CL` para validar el rollout.

Slice 3 (formatting) puede arrancar **sin esperar** Slices 2/4 porque entrega valor independiente y no toca copy.

## Acceptance Criteria

- [ ] Existe una estrategia i18n/globalization explícita para Greenhouse con locales first-class confirmados.
- [ ] La task deja definidas child tasks ejecutables por slices, no una idea abstracta.
- [ ] La relación con `TASK-265` queda clara: copy contract primero, activación i18n incremental después. La dependencia dura está registrada en `Blocked by`.
- [ ] Queda definido cómo Greenhouse pasa de `es-only` a multi-locale sin romper el runtime actual.
- [ ] La separación entre copy (idioma) y globalization (formato) está explícita: Slice 3 puede ejecutarse antes que Slice 2.
- [ ] Las 254+ llamadas a `Intl.*` con `es-CL` hardcoded tienen un target de migración definido vía utility central.
- [ ] El modelo de tenant tiene ruta clara para `default_locale` sin bloquear la umbrella.

## Verification

- Revisión documental contra arquitectura y repo actual
- Consistencia del plan de adopción con `TASK-265`

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con la decisión de estrategia i18n si esta umbrella se formaliza.
- [ ] Derivar child tasks concretas para las primeras superficies a migrar.

## Follow-ups

Child tasks ya creadas (no son follow-ups, son el scope ejecutable):

- `TASK-428` — i18n architecture decision
- `TASK-429` — locale-aware formatting utilities
- `TASK-430` — dictionary foundation activation
- `TASK-431` — tenant + user locale persistence

Follow-ups reales (a derivar cuando corresponda):

- Shared shell rollout por locale
- Emails localization
- SEO + routing deep-links cross-locale
- Finance multi-currency display separado de locale de UI

## Open Questions

- ¿Greenhouse necesita locale-prefixed routes o basta una primera fase sin cambio de URL? — impacto sobre auth, previews Vercel y deep links debe evaluarse en Slice 1.
- ¿Qué mercados/locales son first-class en la primera ola? Recomendación base: `es-CL` (default), `en-US`, `pt-BR`. Confirmar con ops/ventas de Efeonce.
- ¿Qué parte del portal realmente necesita traducción y qué parte solo necesita globalization de formatos? — Slice 3 aislado responde parte de esta pregunta.
- ¿El tenant dicta el locale default o el usuario? ¿Qué pasa con un colaborador interno de Efeonce viendo un tenant cliente en otro locale?
- ¿Se traducen los nombres de módulos/navegación Greenhouse (`Pulse`, `Spaces`, `Ciclos`) o se tratan como brand names no traducibles?
- ¿Finance requiere multi-currency display separado de locale (ej. un usuario en-US viendo un cliente chileno con CLP)? ¿O locale dicta moneda default?
