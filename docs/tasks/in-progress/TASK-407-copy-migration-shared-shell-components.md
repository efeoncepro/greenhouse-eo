# TASK-407 — Copy Migration: Shared Shell + Components

## Delta 2026-05-02 (tarde) — recalibración pre-ejecución

Pre-execution audit del codebase post cierre TASK-265 (commit `48a166da`). Tres findings que reordenan el scope y el orden de ejecución:

### Finding 1 — Baseline real es ~10× mayor que el declarado en spec

| Pattern | Spec original | Realidad medida (2026-05-02) | Drift |
|---|---|---|---|
| Month arrays | 8+ vistas | **30 archivos** | 3.75× |
| CTAs base hardcoded | 9+ instancias | **179 archivos** distribuidos | ~20× |
| aria-labels (no en spec) | — | **202** instancias (caso dominante) | gap nuevo |
| Status maps inline (no en spec) | — | **59** instancias | gap nuevo |
| Empty states | "distribuidos inline" | **23** instancias | confirmado |
| Secondary props | — | **34** instancias | gap nuevo |

**Total measurable post-rule**: 318 lint warnings + 30 month files + 179 CTA files = **>500 archivos a tocar** (con overlaps). Effort declarado "Alto" sigue siendo correcto pero el **orden de ejecución debe priorizar por densidad real**, no por orden alfabético de slices.

### Finding 2 — Foundation `src/lib/copy/` está completa y lista para consumir

Verificación full del módulo (commit `48a166da`):

- **API pública**: `import { getMicrocopy } from '@/lib/copy'` — server + client compatible.
- **9 namespaces** seed con paridad type-safe es-CL ↔ en-US:
  - `actions` (47 entries) — todos los CTAs base que necesita Slice 2: save, cancel, edit, delete, confirm, back, continue, next, close, etc.
  - `states` (28 entries) — cubre los 59 status maps detectados
  - `loading` (12 entries) — cubre `Cargando…`/`Guardando…`/`Procesando…`/etc.
  - `empty` (10 entries) — cubre `Sin datos`/`Sin resultados`/firstUse/error
  - `months` (short tuple-12 + long tuple-12) — reemplazo directo de los 30 archivos
  - `aria` (25 entries) — cubre los aria-labels más frecuentes
  - `errors`, `feedback`, `time` — disponibles para domain copy genérico
- **Locale fallback**: `getMicrocopy('en-US')` retorna stub es-CL (TASK-266 lo traduce sin tocar consumers).
- **ESLint rule** `greenhouse/no-untokenized-copy` activa en `warn` mode con scope correcto sobre `src/views`/`src/components`/`src/app` y excludes apropiados.

**Conclusión**: TASK-407 está 100% desbloqueada. Cero gaps en la foundation.

### Finding 3 — Trim de `greenhouse-nomenclature.ts` queda heredado por Slice 4

TASK-265 Slice 3 (resolution log línea 72-75) declaró explícitamente "**No migra código de superficies — eso lo hacen las derivadas**". El archivo sigue en **2,733 líneas** sin trim.

Categorización de los 22 top-level exports (auditada hoy):

| Export | Líneas | Categoría real | Acción Slice 4 |
|---|---|---|---|
| `GH_LABELS` | 248-276 | Domain microcopy | Migrar a `src/lib/copy/` |
| `GH_TEAM` | 278-397 | Mixed (algunos labels, algunos microcopy) | Split: nav-related se queda; microcopy migra |
| `GH_MESSAGES` | 415-676 | Domain microcopy (login, dashboards, errores, tooltips) | Migrar la mayoría a `src/lib/copy/`; lo de login queda diferido |
| `GH_INTERNAL_MESSAGES` | 677-1181 | Mixed (nav admin + microcopy) | Split |
| `GH_COMPENSATION` | 1307-1313 | Domain HR microcopy (0 importers) | Eliminar (orphan) o migrar a `src/lib/payroll/copy.ts` |
| `GH_COLORS` | 1182-1305 | Theme tokens (deprecated parcial) | NO scope esta task — vive en theme |
| `GH_NEXA` | 1317-1392 | Product nomenclature ✓ | Mantener |
| `GH_PRICING` | 1623-2326 | Mixed | Auditar entry-by-entry; product-related mantiene, microcopy migra |
| `GH_PIPELINE_COMMERCIAL` | 2327-2408 | Product nomenclature ✓ | Mantener |

**Decisión scope Slice 4**: NO refactorizar `greenhouse-nomenclature.ts` en TASK-407. Razón: trim full toca 26 importers de `GH_MESSAGES`, riesgo alto de regresión, y compite con el trabajo del lint-driven sweep. **Mover el trim a TASK-811** (derivada explícita, ID asignado 2026-05-06; TASK-409 está burned por `payroll-reliquidation-program`), bloqueada por TASK-407 + TASK-408.

### Reordenamiento del Scope (Slices) por densidad real

Se reordena la priorización para atacar el caso dominante primero — **aria-labels** son ~63% del baseline lint (medición 2026-05-06: **328 warnings** totales de `no-untokenized-copy`, alineado con el 318 declarado el 2026-05-02).

#### Slice 0 (NUEVO, BLOQUEANTE) — Extender rule ESLint para cubrir Slices 5/6

**Razón**: el sweep de Slices 5 (month arrays) y 6 (JSX text CTAs) cierra el lint counter pero **NO bloquea regresiones futuras** — la rule actual `no-untokenized-copy` no detecta esos patterns (solo aria-labels, status maps, empty states, secondary props). Sin extender la rule antes del sweep, TASK-408 Closing Protocol no puede promover a `error` con seguridad: la promoción cierra el gate sobre los 4 patterns ya cubiertos pero deja month arrays y CTAs JSX text expuestos a drift silencioso.

- **Target**:
  - **5a** — Detector de month arrays hardcoded: `ArrayExpression` con 12 elementos string que matcheen `Ene|Feb|Mar|...|Dic` (variantes short y long, con/sin tildes). Mensaje accionable: `Use getMicrocopy().months.short[i] o months.long[i]`.
  - **5b** — Detector de JSX text CTAs: `JSXText` cuyo trim() ∈ {`Guardar`, `Cancelar`, `Editar`, `Eliminar`, `Confirmar`, `Volver`, `Continuar`, `Siguiente`, `Cerrar`, `Aceptar`, `Crear`, `Agregar`}. Mensaje: `Use {getMicrocopy().actions.<key>}`.
- **Implementación**: extender [eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs](../../eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs) con dos visitor handlers nuevos (`ArrayExpression` y `JSXText`). Tests en `eslint-plugins/greenhouse/rules/__tests__/no-untokenized-copy.test.mjs` cubriendo positivos + negativos.
- **Modo**: agregar warnings al baseline existente (modo `warn` heredado). El sweep de Slices 5/6 los baja a 0; TASK-408 promueve a `error` cubriendo 6 patterns en lugar de 4.
- **Verificación**: `pnpm lint` post-extensión muestra warnings adicionales para los 30 month arrays + N CTAs JSX text encontrados; el baseline para Slices 5/6 queda mecánicamente medible (no por grep ad-hoc).
- **Bloqueante**: Slices 5 y 6 no inician hasta que Slice 0 mergee. Slices 1-4 pueden ejecutarse en paralelo (no dependen de la extensión).

#### Slice 1 — aria-labels (caso dominante)

- **Target**: ~206 aria-label literales en `src/views`, `src/components`, `src/app` (medición 2026-05-06).
- **Reemplazo**: `getMicrocopy().aria.<key>` para los comunes (close, navigate, sort, paginate, expand, collapse, etc.). Para aria-labels de dominio, ver **Escape Hatch Policy** abajo.
- **Impacto**: 328 → ~120.

#### Slice 2 — status maps inline + helper canónico `buildStatusMap()`

- **Target**: 63 status maps con `{ label: 'Pendiente'/'Activo'/etc }` (medición 2026-05-06).
- **Reemplazo PRIMARIO**: introducir helper `buildStatusMap(definition)` en [src/lib/copy/index.ts](../../src/lib/copy/index.ts) que componga el mapa desde el dictionary `states` con tipado type-safe. Es la primitiva canónica que **previene la regresión** (sin helper, los próximos status maps se vuelven a hardcodear). **Mandatorio, no opcional.**
- **Reemplazo SECUNDARIO**: callsite-by-callsite consume `buildStatusMap` en lugar de `getMicrocopy().states.<key>` directo cuando hay 3+ keys.
- **Impacto**: 120 → 57.

#### Slice 3 — empty states + loading

- **Target**: 22 empty states + 0 loading literales (medición 2026-05-06; rule cubre loading patterns desde TASK-265 pero baseline ya está en 0 — verificar al cierre).
- **Reemplazo**: `getMicrocopy().empty.<key>` y `getMicrocopy().loading.<key>`.
- **Impacto**: 57 → 35.

#### Slice 4 — secondary props (label/placeholder/title)

- **Target**: ~35 secondary prop literales.
- **Reemplazo**: `getMicrocopy()` (microcopy funcional) o `greenhouse-nomenclature.ts` (product nomenclature) según escape hatch policy abajo.
- **Impacto**: 35 → 0.

#### Slice 5 — month arrays (depende de Slice 0)

- **Target**: 30 archivos con `['Ene', ..., 'Dic']` o `['Enero', ..., 'Diciembre']` hardcoded.
- **Reemplazo**: `getMicrocopy().months.short[i]` o `getMicrocopy().months.long[i]`.
- **Detección**: rule extendida en Slice 0 produce warnings deterministas. Baseline post-Slice 0 es mecánicamente medible.

#### Slice 6 — CTAs base hardcoded en JSX text (depende de Slice 0)

- **Target**: ~179 archivos con CTAs literales (`>Guardar<`, etc.).
- **Reemplazo**: `getMicrocopy().actions.<key>`.
- **Detección**: rule extendida en Slice 0 (handler `JSXText`) produce warnings deterministas. Baseline post-Slice 0 es mecánicamente medible.

#### Slice 7 (DEFERIDO a TASK-811) — Trim `greenhouse-nomenclature.ts`

- Originalmente Slice 4 de TASK-407.
- Movido a task derivada nueva **TASK-811** (Copy Migration: greenhouse-nomenclature.ts Domain Microcopy Trim) por ownership claro y scope independiente.
- Bloqueada por TASK-407 + TASK-408 cerradas.
- **Nota crítica**: ID corregido — el Delta original decía TASK-409 pero ese ID está burned por `payroll-reliquidation-program` (complete).

### Defense-in-depth: Escape Hatch Policy

Cuando un string detectado por la rule **no debe migrarse a un namespace shared** (es genuinamente domain-specific o políticamente sensible), el sweep aplica esta policy en orden de preferencia:

1. **Product nomenclature** (Pulse, Spaces, Ciclos, nombres institucionales, copy de marca) → declarar en [src/config/greenhouse-nomenclature.ts](../../src/config/greenhouse-nomenclature.ts) en el namespace correspondiente (`GH_LABELS`, `GH_NEXA`, etc.). Consumer importa desde ahí. La rule no warnsobre imports — solo sobre literales en JSX/sx.
2. **Domain microcopy reusada en 3+ surfaces** → agregar al namespace correspondiente de [src/lib/copy/dictionaries/es-CL/](../../src/lib/copy/dictionaries/es-CL/) (e.g. `aria.ts` para aria-labels nuevos como `closeFinanceDrawer`, `payrollPeriodSelect`). Validación de tono via skill `greenhouse-ux-writing` antes del PR.
3. **Domain microcopy 1-shot** (string usado en exactamente 1 callsite, semánticamente único, sin vocación de reuso) → mantener inline con `// eslint-disable-next-line greenhouse/no-untokenized-copy -- <razón>`. Razón obligatoria, mínimo 10 caracteres, debe describir el dominio (e.g. `dominio: detalle bancario Santander Corp, no aplica reuso`). PRs sin razón documentada se rechazan en review.

**Regla dura**: opciones 1 y 2 son preferidas. Opción 3 es escape, no default. Si en review se detectan >5 disables en un solo PR sin justificación clara de unicidad, el PR se rechaza y se requiere consolidar al namespace.

**Validación operativa**: antes de mergear cualquier slice, `rg "eslint-disable.*no-untokenized-copy" src/ | wc -l` debe documentarse en el PR description con delta vs baseline. Crecimiento acumulado >20 disables sin justificación bloquea promoción a `error` en TASK-408.

### Migration Hygiene: PR Strategy

- **Un PR por slice**, no mega-PR. Razón: blast radius granular, revisable independiente, rollback localizado si emerge regresión visual.
- **Slice 0** (rule extension): PR pequeño, alta confianza (es código de lint rule + tests; no toca surfaces UI).
- **Slices 1, 2, 3, 4**: pueden ir en paralelo (no dependen entre sí). Cada uno es 1 PR.
- **Slices 5, 6**: bloqueados por Slice 0. Cada uno es 1 PR.
- **Tamaño máximo recomendado por PR**: ~50 archivos. Si un slice excede esto (caso probable: Slice 1 con 206 aria-labels, Slice 6 con 179 CTAs), partirlo por subdomain (`finance/`, `hr/`, `agency/`, etc.) — cada subdomain es un PR.
- **Cada PR**: pasa `pnpm lint` (no introduce warnings nuevos), `npx tsc --noEmit`, smoke verification para las surfaces tocadas.

### Acceptance criteria recalibrados (consolidados)

Sustituyen y consolidan los criterios viejos. **No se duplican con el bloque legacy `## Acceptance Criteria` de abajo** — el legacy queda marcado como superseded.

- [ ] **Slice 0 mergeado** y rule extendida cubre month arrays + JSX text CTAs (verificable: `pnpm lint` muestra warnings nuevos en mes de archivos hardcoded).
- [ ] `pnpm lint` warnings de `greenhouse/no-untokenized-copy` bajan de **328 → 0** en el scope cubierto por TASK-407 (aria-labels + status + empty + secondary + months + CTAs JSX text). El residuo no-cubierto pasa a TASK-408.
- [ ] Helper `buildStatusMap()` existe en `src/lib/copy/` con tests unitarios + al menos 5 callsites migrados como referencia.
- [ ] `rg "'Ene'.*'Feb'.*'Mar'" src/views src/components -t tsx -l | wc -l` retorna **0**.
- [ ] Disables de la rule (`eslint-disable.*no-untokenized-copy`) están todos justificados con razón ≥10 chars y total ≤20 (documentado en PR descriptions).
- [ ] Smoke verification ejecutado (ver bloque **Smoke Verification** abajo) — pasa sin regresiones reportadas.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan en cada PR de slice.

### Smoke Verification (reemplaza "no regresiones reportadas tras deploy")

Para cada slice mergeado a `develop` antes de promover a TASK-408 Closing Protocol, ejecutar manualmente en preview/staging:

**Top 10 surfaces shared a verificar visualmente** (cubre las superficies con mayor concentración de aria-labels + CTAs migradas):

1. `/home` — Quick Access Shortcuts dropdown + nav
2. `/finance/cash-out` — drawer de cuenta bancaria + lista movimientos
3. `/finance/reconciliation` — workbench + matching modal
4. `/hr/payroll/[periodId]` — preview liquidación + status chips
5. `/agency/operations` — tabla operativa + filtros
6. `/people` — directorio + tabs de perfil
7. `/admin/team` — tabla con CRUD inline
8. `/admin/operations` — reliability dashboard + signal cards
9. Login flow (verificación que NO se tocó copy de login per Out of Scope)
10. `/admin/notifications` — lista de categorías (referencia para TASK-408)

**Criterio**: cada surface muestra labels/CTAs/aria-labels esperados sin regresiones visuales. Capturas en PR description para los 3 surfaces más afectados por el slice.

**Automatización futura** (opcional, no bloqueante): si emerge necesidad de Playwright snapshot diff durante el sweep, agregarlo como sub-task. Hoy el smoke checklist es suficiente — el riesgo es bajo (refactor puro de strings, sin write paths).

### 4-Pillar Score (post-ajustes)

| Pillar | Score | Justificación |
| --- | --- | --- |
| **Safety** | ✅ | Refactor puro, blast radius bajo, sin write paths. PR-by-slice limita scope de cualquier defecto. |
| **Robustness** | ✅ | Smoke checklist explícito sobre 10 surfaces. `pnpm lint` + `tsc --noEmit` + `test` por PR. Helper `buildStatusMap()` previene la próxima regresión. |
| **Resilience** | ✅ | Rollback granular: 1 PR = 1 slice = revert localizado. Disables documentados auditan escape hatches. |
| **Scalability** | ✅ | Slice 0 extiende la rule para cubrir 100% de los patterns que el sweep ataca. TASK-408 puede promover a `error` con seguridad. Sin Slice 0 este pillar fallaría. |

### Out of scope nuevo

- **Trim de `greenhouse-nomenclature.ts`** → **TASK-811** (derivada nueva, bloqueada por TASK-407 + TASK-408).
- **Promote rule a `error` mode** → TASK-408 Closing Protocol (no esta task).
- **Login** → diferido (sin cambios).
- **Notification categories + emails** → TASK-408 (scope independiente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-265` ✅ cerrada 2026-05-02 commit `48a166da`. Foundation `src/lib/copy/` lista, ESLint rule activa en warn mode.
- Branch: `task/TASK-407-copy-migration-shared-shell-components`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-265` (split-off de Slice 3)

## Summary

Derivada de `TASK-265`. Ejecuta la migración de copy shared en el shell del portal y los componentes reusables: navegación, CTAs base, arrays de meses, empty/error/loading states. No entrega contrato (lo hace `TASK-265`); solo consume la capa dictionary-ready ya inicializada y reduce hardcodes en `src/components/greenhouse/` y `src/views/greenhouse/`.

## Why This Task Exists

La migración masiva no puede ir junto con el diseño del contrato: mezclarlas obliga a revisar un PR gigante que toca 50+ archivos sin poder validar el contrato antes. Esta task espera a que `TASK-265` cierre con el contrato estable, y entonces ejecuta la migración del shell shared de forma aislada y revisable.

El baseline detectado en el codebase:

- **8+ vistas** duplican arrays de meses (`['Ene', 'Feb', ..., 'Dic']`) en analytics, payroll, organization economics.
- **9+ instancias** de CTAs base (`Guardar`, `Guardando...`, `Editar`, `Cancelar`, `Confirmar`, `Volver`) hardcoded en `src/components/greenhouse/` (AboutMeCard, ProfessionalLinksCard y similares).
- Empty states, error states y loading copy distribuidos inline en vistas del portal.

## Goal

- Ejecutar migración completa de copy shared en navigation, shell components y vistas reusables del portal (excluyendo login diferido).
- Dejar 0 arrays de meses y 0 CTAs base hardcoded fuera de la capa canónica.
- Mantener comportamiento runtime idéntico: la task es un refactor puro, no debe introducir cambios visibles al usuario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — consume el contrato canónico que deja `TASK-265`.

Reglas obligatorias:

- No introducir nueva taxonomía ni expandir `greenhouse-nomenclature.ts` — consumir la capa dictionary-ready tal como la definió `TASK-265`.
- No tocar login (diferido explícitamente).
- No migrar copy de dominio específico si no es shared: si un string vive en un solo módulo y no se reusa, puede quedar local.
- Mantener cero regresiones UI — verificar visualmente las vistas migradas en staging.

## Normative Docs

- `docs/tasks/complete/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-265` en estado `complete` (capa dictionary-ready + contrato canónico).
- Layer nueva que `TASK-265` inicialice (p.ej. `src/lib/copy/` o similar).

### Blocks / Impacts

- `TASK-266` Slice 4 — rollout incremental de locales consume directamente el trabajo de esta migración.
- `TASK-116` — labels/subtitles del sidebar deben quedar alineados al nuevo contrato.
- `TASK-408` — Closing Protocol promueve `no-untokenized-copy` a `error`. Depende de Slice 0 de esta task (extensión de la rule a month arrays + JSX text CTAs) para que la promoción cubra los 6 patterns que el sweep ataca, no solo 4.
- `TASK-811` — Trim de `greenhouse-nomenclature.ts` (Slice 7 originalmente). Bloqueada por TASK-407 + TASK-408 cerradas.

### Files owned

- `src/components/greenhouse/**` (solo archivos con CTAs/empty/error/loading shared)
- `src/views/greenhouse/**` (solo strings shared, no dominio local)
- Arrays de meses en cualquier ubicación
- `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` (Slice 0 — extensión a month arrays + JSX text CTAs)
- `eslint-plugins/greenhouse/rules/__tests__/no-untokenized-copy.test.mjs` (Slice 0 — tests)
- `src/lib/copy/index.ts` (Slice 2 — helper `buildStatusMap()`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

> **Superseded by Delta 2026-05-02 + ajustes 2026-05-06**. La sección canónica de slices vive arriba en el bloque `### Reordenamiento del Scope (Slices) por densidad real`. Slices canónicos: **0** (rule extension, bloqueante) → **1** (aria-labels) → **2** (status maps + helper `buildStatusMap`) → **3** (empty/loading) → **4** (secondary props) → **5** (month arrays) → **6** (CTAs JSX text). Slice 7 deferido a **TASK-811**.

## Out of Scope

- Login — diferido.
- Copy de dominio local sin vocación shared (escape hatch policy: ver Delta).
- Traducción a otros locales (eso es `TASK-266` + child tasks).
- Notifications y emails (eso es `TASK-408`).
- Trim de `greenhouse-nomenclature.ts` (es `TASK-811`).

## Acceptance Criteria

> **Superseded by Delta 2026-05-02 + ajustes 2026-05-06**. La sección canónica de criterios vive arriba en el bloque `### Acceptance criteria recalibrados (consolidados)`.

## Verification

- `pnpm lint && npx tsc --noEmit && pnpm build && pnpm test` por cada PR de slice.
- Smoke verification manual sobre las 10 surfaces shared listadas en el Delta (`### Smoke Verification`).
- Cuando se cierra el último slice, baseline `pnpm lint | grep "no-untokenized-copy" | wc -l` retorna **0**.
- `rg "eslint-disable.*no-untokenized-copy" src/ | wc -l` ≤ 20 con razones documentadas.

## Closing Protocol

- [ ] Actualizar `Handoff.md` con resumen de migración y superficies afectadas.
- [ ] Ejecutar chequeo de impacto cruzado sobre `TASK-116`, `TASK-266`, `TASK-408` y `TASK-811`.
- [ ] Verificar que el contador de warnings de `greenhouse/no-untokenized-copy` (rule introducida por TASK-265 Slice 5 + extendida en Slice 0 de esta task) bajó a **0** en el scope cubierto. Si quedan warnings residuales, registrar el delta y categorizar (cubierto por TASK-408 vs out-of-scope).
- [ ] Confirmar que Slice 0 mergeó la extensión de la rule a month arrays + JSX text CTAs y que TASK-408 puede promover a `error` cubriendo 6 patterns.
- [ ] Documentar en el PR description final el conteo de `eslint-disable.*no-untokenized-copy` con razones, y validar que está ≤20.
- [ ] Smoke verification ejecutado en preview/staging sobre las 10 surfaces shared listadas; capturas adjuntas para los 3 surfaces más afectados.

## Open Questions

- ~~¿Conviene agregar un ESLint rule que alerte sobre hardcodes de CTAs base, o basta con la disciplina de code review?~~ — **Resuelto 2026-05-02 vía TASK-265 Slice 5**: la rule `greenhouse/no-untokenized-copy` fue agregada al programa de TASK-265 (gate antes que sweep, mismo patrón TASK-567). Esta task ejecuta el sweep contra ese baseline.
- ~~¿Cómo prevenir regresiones en month arrays + CTAs JSX text si la rule no los detecta?~~ — **Resuelto 2026-05-06 vía Slice 0**: la rule se extiende como prerequisito del sweep de Slices 5/6. Sin Slice 0, TASK-408 no puede promover a `error` con seguridad.
- ~~¿Qué hacer con strings que no encajan en namespaces shared?~~ — **Resuelto 2026-05-06 vía Escape Hatch Policy** (3 niveles: nomenclature → namespace → disable con razón ≥10 chars). Cap de 20 disables totales con auditoría en PR descriptions.
