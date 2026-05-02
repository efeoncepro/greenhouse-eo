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

**Decisión scope Slice 4**: NO refactorizar `greenhouse-nomenclature.ts` en TASK-407. Razón: trim full toca 26 importers de `GH_MESSAGES`, riesgo alto de regresión, y compite con el trabajo del lint-driven sweep. **Mover el trim a TASK-409 nueva** (derivada explícita), bloqueada por TASK-407 + TASK-408.

### Reordenamiento del Scope (Slices) por densidad real

Se reordena la priorización para atacar el caso dominante primero — **aria-labels (202)** son 64% del baseline lint:

#### Slice 1 (NUEVO) — aria-labels (caso dominante)

- **Target**: 202 aria-label literales en `src/views`, `src/components`, `src/app`
- **Reemplazo**: `getMicrocopy().aria.<key>` para los más comunes (close, navigate, sort, paginate, etc.); aria-labels específicos de dominio quedan inline pero pasan por skill `greenhouse-ux-writing` para validar tono
- **Impacto**: bajar el lint warning count de 318 → ~116

#### Slice 2 (RENUMERADO) — status maps inline

- **Target**: 59 status maps con `{ label: 'Pendiente'/'Activo'/etc }`
- **Reemplazo**: `getMicrocopy().states.<key>` o un helper `buildStatusMap()` que componga el mapa desde el dictionary
- **Impacto**: 116 → 57

#### Slice 3 (RENUMERADO) — empty states + loading

- **Target**: 23 empty states + 0 loading literales (rule no detectó loading hoy, verificar en sweep)
- **Reemplazo**: `getMicrocopy().empty.<key>` y `getMicrocopy().loading.<key>`
- **Impacto**: 57 → 34

#### Slice 4 (RENUMERADO) — secondary props (label/placeholder/title)

- **Target**: 34 secondary prop literales
- **Reemplazo**: `getMicrocopy()` o `greenhouse-nomenclature.ts` según naturaleza
- **Impacto**: 34 → 0

#### Slice 5 (NUEVO) — month arrays

- **Target**: 30 archivos con `['Ene', ..., 'Dic']` o `['Enero', ..., 'Diciembre']` hardcoded
- **Reemplazo**: `getMicrocopy().months.short[i]` o `getMicrocopy().months.long[i]`
- **Nota**: la rule ESLint actual NO detecta arrays de meses (no es un pattern soportado). Sweep manual + grep verifica baseline 0 al cierre.

#### Slice 6 (NUEVO) — CTAs base hardcoded

- **Target**: 179 archivos con CTAs literales (`>Guardar<`, `label="Cancelar"`, etc.)
- **Reemplazo**: `getMicrocopy().actions.<key>`
- **Nota**: la rule ESLint cubre solo cuando están dentro de `sx`/JSXAttribute label/placeholder/etc; los `>Guardar<` como JSX text NO son detectados (out of scope rule actual). Sweep manual + grep verifica baseline 0 al cierre.

#### Slice 7 (DEFERIDO a TASK-409) — Trim `greenhouse-nomenclature.ts`

- Originalmente Slice 4 de TASK-407
- Movido a task derivada nueva (TASK-409) por ownership claro y scope independiente
- Bloqueada por TASK-407 + TASK-408 cerradas

### Acceptance criteria recalibrados

Los criterios cuantitativos viejos eran "0 month arrays + 0 CTAs base". Los nuevos son:

- [ ] `pnpm lint` warnings de `greenhouse/no-untokenized-copy` bajan de **318 → 0** en el scope cubierto (aria-labels + status + empty + secondary)
- [ ] `rg "'Ene'.*'Feb'.*'Mar'" src/views src/components -t tsx -l | wc -l` retorna **0**
- [ ] `rg ">Guardar<|label=['\"](Guardar|Cancelar|Editar|Eliminar|Confirmar)['\"]" src/views src/components -t tsx -l | wc -l` retorna **0** (o queda documentado el residual con justificación)
- [ ] Sin regresiones visuales en preview/staging

### Out of scope nuevo

- **Trim de `greenhouse-nomenclature.ts`** → TASK-409 (derivada nueva, bloqueada por TASK-407 + TASK-408)
- **Promote rule a `error` mode** → TASK-408 Closing Protocol (no esta task)
- **Login** → diferido (sin cambios)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-265` en estado `complete` (capa dictionary-ready + contrato canónico).
- Layer nueva que `TASK-265` inicialice (p.ej. `src/lib/copy/` o similar).

### Blocks / Impacts

- `TASK-266` Slice 4 — rollout incremental de locales consume directamente el trabajo de esta migración.
- `TASK-116` — labels/subtitles del sidebar deben quedar alineados al nuevo contrato.

### Files owned

- `src/components/greenhouse/**` (solo archivos con CTAs/empty/error/loading shared)
- `src/views/greenhouse/**` (solo strings shared, no dominio local)
- Arrays de meses en cualquier ubicación

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Arrays de meses

- Detectar todos los arrays de meses hardcoded (`['Ene', 'Feb', ..., 'Dic']` y variantes).
- Reemplazar por un helper único que consuma la capa canónica.
- Validar que las vistas afectadas (analytics, payroll, organization economics) siguen renderizando igual.

### Slice 2 — CTAs base en `src/components/greenhouse/`

- Inventariar strings tipo `Guardar`, `Guardando...`, `Editar`, `Cancelar`, `Confirmar`, `Volver`, `Siguiente`, `Cargando...`.
- Migrarlos al namespace correspondiente de la capa dictionary-ready.
- Dejar un ESLint rule o check (si viable) que alerte sobre nuevos hardcodes de estos strings.

### Slice 3 — Empty / error / loading states shared

- Detectar empty states, error messages y loading labels que aparecen en 2+ lugares.
- Migrar al namespace shared correspondiente.
- Mantener copy específica de dominio en su lugar si no tiene vocación de reuso.

### Slice 4 — Navegación y labels de shell

- Validar que toda la nav y labels del shell consumen la capa canónica con la nueva estructura (no queda inline).
- Si `TASK-265` dejó el recorte de `greenhouse-nomenclature.ts` planeado pero no ejecutado, ejecutarlo aquí.

## Out of Scope

- Login — diferido.
- Copy de dominio local sin vocación shared.
- Traducción a otros locales (eso es `TASK-266` + child tasks).
- Notifications y emails (eso es `TASK-408`).

## Acceptance Criteria

- [ ] **0** arrays de meses hardcoded fuera de la capa canónica (validar con grep en `src/views/` y `src/components/`).
- [ ] **0** CTAs base (`Guardar`, `Cancelar`, `Editar`, `Guardando...`, `Cargando...`, `Confirmar`, `Volver`, `Siguiente`) hardcoded en `src/components/greenhouse/` y en componentes shared de `src/views/greenhouse/` fuera del login.
- [ ] Empty / error / loading states shared consumen la capa canónica.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan.
- [ ] Verificación visual en staging: nav, shell, profile cards, analytics con meses, formularios con CTAs base.
- [ ] No hay regresiones reportadas tras deploy a staging.

## Verification

- `pnpm lint && npx tsc --noEmit && pnpm build && pnpm test`
- Deploy a preview/staging y revisión manual de vistas shared clave.
- Grep post-migración confirma baseline cero en los targets medibles.

## Closing Protocol

- [ ] Actualizar `Handoff.md` con resumen de migración y superficies afectadas.
- [ ] Ejecutar chequeo de impacto cruzado sobre `TASK-116`, `TASK-266` y `TASK-408`.
- [ ] Verificar que el contador de warnings de `greenhouse/no-untokenized-copy` (rule introducida por TASK-265 Slice 5) bajó respecto al baseline registrado al cierre de TASK-265. Si quedan 0 warnings en el scope cubierto por esta task (shared shell + componentes), documentar; si no, registrar el delta y dejar el resto a TASK-408.

## Open Questions

- ~~¿Conviene agregar un ESLint rule que alerte sobre hardcodes de CTAs base, o basta con la disciplina de code review?~~ — **Resuelto 2026-05-02 vía TASK-265 Slice 5**: la rule `greenhouse/no-untokenized-copy` fue agregada al programa de TASK-265 (gate antes que sweep, mismo patrón TASK-567). Esta task ejecuta el sweep contra ese baseline.
