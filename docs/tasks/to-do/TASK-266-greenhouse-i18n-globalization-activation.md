# TASK-266 — Greenhouse i18n & Globalization Activation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-266-greenhouse-i18n-globalization-activation`
- Legacy ID: —
- GitHub Issue: —

## Summary

Greenhouse opera globalmente y no debería quedarse atado a una capa verbal `es-only` indefinida. El upstream de Vuexy full-version ya trae un scaffolding real de i18n/dictionaries, pero el portal actual no lo adoptó. Esta task formaliza la activación de internacionalización y globalization de Greenhouse como programa incremental, separada de `TASK-265`, para no mezclar copy contract con routing, locale strategy, formateo, emails y surfaces runtime.

## Why This Task Exists

Sí, incorporar i18n sirve. Pero no sirve como “detalle” dentro de la task de nomenclature. i18n introduce decisiones de plataforma que van bastante más allá del microcopy:

- estrategia de locales y fallback
- routing con o sin prefijo de locale
- diccionarios y namespaces
- formateo de fechas, moneda y números
- persistencia de preferencia de idioma por usuario o tenant
- emails, notificaciones y surfaces externas
- SEO, caching y testing cross-locale

Si se mezcla eso con `TASK-265`, la lane deja de ser una convergencia de copy contract y se vuelve una migración transversal del portal completo. Esta activación necesita carril propio y secuenciado.

## Goal

- Formalizar una estrategia i18n/globalization defendible para Greenhouse.
- Definir la arquitectura incremental para pasar de `es-only` a multi-locale sin romper el portal actual.
- Reusar el scaffolding válido del upstream Vuexy cuando aporte, sin importar su estructura literalmente.
- Dejar child tasks ejecutables para auth, navigation, shared surfaces, formatting, emails y preferencias de usuario.

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

- El portal actual es efectivamente `es-only`.
- Existe una capa propia de nomenclature/microcopy en `src/config/greenhouse-nomenclature.ts`.
- Vuexy full-version sí trae i18n config + dictionaries listos como referencia.
- El producto ya trabaja con contextos globales donde i18n y globalization son relevantes.

### Gap

- No hay locale strategy formal en el runtime actual.
- No existen diccionarios canónicos del portal Greenhouse.
- Formatos y copy siguen asumiendo español por defecto.
- No existe una política institucional para qué surfaces entran primero en i18n.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — i18n architecture decision

- Definir locales target, fallback locale y estrategia de routing.
- Decidir si Greenhouse usará locale-prefixed routes o locale state sin cambiar URLs en la primera iteración.
- Formalizar namespaces de diccionarios y ownership de copy.

### Slice 2 — Dictionary foundation

- Crear la foundation dictionary-ready del portal Greenhouse.
- Alinearla con el resultado de `TASK-265` para no duplicar la capa verbal.
- Dejar safe adapters para shared surfaces sin reescribir todo el producto.

### Slice 3 — Formatting & locale semantics

- Definir reglas para fechas, moneda, separadores numéricos, timezone y pluralización.
- Establecer cómo conviven locale global, timezone operativa y formatos por tenant/usuario.

### Slice 4 — Incremental surface rollout

- Identificar y derivar child tasks para auth, navigation, shared empty/error states, notifications/emails y settings de usuario.
- Priorizar shared surfaces antes de módulos profundos del dominio.

## Out of Scope

- Traducir el portal completo en esta umbrella.
- Ejecutar refactor masivo de todas las vistas en una sola iteración.
- Resolver theme/branding (`TASK-264`) o copy contract base (`TASK-265`) dentro de esta task.
- Tocar `efeoncepro/kortex`.

## Acceptance Criteria

- [ ] Existe una estrategia i18n/globalization explícita para Greenhouse.
- [ ] La task deja definidas child tasks ejecutables por slices, no una idea abstracta.
- [ ] La relación con `TASK-265` queda clara: copy contract primero, activación i18n incremental después.
- [ ] Queda definido cómo Greenhouse pasa de `es-only` a multi-locale sin romper el runtime actual.

## Verification

- Revisión documental contra arquitectura y repo actual
- Consistencia del plan de adopción con `TASK-265`

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con la decisión de estrategia i18n si esta umbrella se formaliza.
- [ ] Derivar child tasks concretas para las primeras superficies a migrar.

## Follow-ups

- Child task: auth + shared shell dictionary foundation
- Child task: locale-aware formatting utilities
- Child task: user/tenant locale preference model
- Child task: email + notification localization

## Open Questions

- ¿Greenhouse necesita locale-prefixed routes o basta una primera fase sin cambio de URL?
- ¿Qué mercados/locales son first-class en la primera ola?
- ¿Qué parte del portal realmente necesita traducción y qué parte solo necesita globalization de formatos?
