# TASK-265 — Greenhouse Nomenclature, Dictionary & Kortex Copy Contract

## Delta 2026-05-02 (tarde) — recalibración de baseline pre-ejecución

Verificación full del codebase reveló drift material vs los números de la spec original (2026-04-06). Recalibración aplicada para que el agente que tome la task no parta de premisas obsoletas:

**Baseline actualizado**:

- `greenhouse-nomenclature.ts`: **2,733 líneas** (la spec decía 1,592 → +71% por shipping orgánico de TASK-469/487 y otras lanes que agregaron a `GH_PRICING`, `GH_NEXA`, etc.)
- Importers: **139 archivos** (la spec decía ~94 → +48%)
- Month arrays duplicados: **26 archivos** (la spec decía 8+ → 3.25× peor)
- `@formatjs/intl-localematcher@0.6.2` ya está en `package.json` deps (preview de TASK-428, no usado todavía en `src/`)

**Supuesto invalidado**:

- La spec dice "Emails (`src/emails/*.tsx`) casi no consumen `greenhouse-nomenclature.ts`; solo `LeaveRequestPendingReviewEmail.tsx` trae un patrón manual bilingüe ad-hoc". **Realidad: 0 emails importan nomenclature**. El patrón bilingüe ad-hoc que la spec describe no existe (quizá nunca shipeó, o fue removido). TASK-408 hereda gap completo: 18 archivos email totales, ninguno conectado al canon.

**Recalibración del Slice 5 (ESLint rule scope)**:

Audit del codebase mostró que `label=`, `placeholder=`, `helperText=`, `title=` en TextField/Drawer/Dialog **ya están mayormente token-referenced** vía `GH_MESSAGES` (alta adopción). Apuntar la rule a esos patrones cubre poca superficie real. Los gaps reales son distintos:

| Pattern | Hardcoded count | Por qué importa |
|---|---|---|
| `aria-label` literal en JSX | **405** | El caso dominante; accesibilidad + tokenización ausentes |
| Status maps inline (`{ pending: { label: 'Pendiente' } }`) | **100** | `'Activo'`/`'Pendiente'`/`'Inactivo'`/`'Aprobado'`/`'Rechazado'` distribuidos en views |
| Loading strings (`'Guardando...'`/`'Cargando...'`/`'Procesando...'`) | **94** | Drawers, dialogs, formularios |
| Empty states (`'Sin datos'`/`'Sin resultados'`) | **31** | Top: FinanceDashboardView (7), HomeView (4) |

**Total ~630 strings residuales** distribuidos así, no en los `label=` originalmente apuntados.

**Reescope del Slice 5a**: la rule `greenhouse/no-untokenized-copy` debe priorizar — en este orden de impacto — `aria-label`, status maps, loading strings, empty states. Los `label`/`placeholder`/`helperText`/`title` siguen siendo cubiertos pero como cobertura secundaria.

**Sin blockers de producto adicionales**: el ADR de paleta (TASK-368) ya está cerrado; la skill `greenhouse-ux-writing` ya define tono/voice. La task es ejecutable directo cuando se tome — partiendo del baseline correcto.

## Delta 2026-05-02 — Slice 5 agregado: gate operativo (ESLint + skill hardening)

Triggered por observación operativa: agentes AI tienden a hardcodear copy en JSX ignorando la skill `greenhouse-ux-writing`. La causa raíz es que la skill es **opt-in** y no hay enforcement mecánico.

**Decisión arquitectónica**: el gate operativo se integra a TASK-265 (no en task separada) porque debe apuntar a la foundation dictionary-ready desde día uno — lo opuesto introduce drift entre contrato y enforcement.

**Patrón heredado de TASK-567** (gate antes que sweep):

- TASK-265 (esta task) + Slice 5 nuevo → entrega foundation + gate en modo `warn`
- TASK-407 + TASK-408 → sweep migra hardcodes a la capa canónica
- Cierre de TASK-408 → promote del gate a modo `error` (CI bloquea regresiones)

**Co-extiende sin duplicar**: la skill `greenhouse-ux-writing` ya existe; la rule la complementa con enforcement mecánico. La rule no reemplaza la skill — fuerza que se invoque cuando el agente intenta escribir copy fuera del registry.

Acceptance criteria + entregables del Slice 5 incorporados abajo. Slices 1-4 sin cambios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `design`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract`
- Legacy ID: —
- GitHub Issue: —
- Splits: `TASK-407` (shared shell migration), `TASK-408` (notifications + emails migration). Esta task entrega el contrato; la ejecución de la migración se hace en las derivadas.

## Summary

Greenhouse sí tiene una capa central de microcopy en `src/config/greenhouse-nomenclature.ts` (1592 líneas, adoptada en ~94 importers), pero hoy convive con textos hardcodeados en emails, categorías de notificación, vistas y componentes puntuales. El problema no es que esa capa sea insuficiente, es que **concentra lo equivocado**: nav + labels institucionales + brand + namespaces específicos (`GH_NEXA`) mientras el microcopy accionable (CTAs, empty states, meses, errores) vive inline duplicado en decenas de vistas. Vuexy full-version sí trae un scaffolding de diccionarios/i18n (`getDictionary`, `data/dictionaries/*.json`), pero Greenhouse no adoptó ese contrato como base. Esta task canoniza la capa verbal del portal, **recorta** `greenhouse-nomenclature.ts` a su alcance defendible (nomenclatura de producto + nav), y abre una capa dictionary-ready para microcopy funcional shared que luego TASK-266 podrá tomar como base para multi-locale.

## Delta 2026-04-06 — recorte de alcance: login diferido, resto del portal vigente

Esta lane adopta el mismo recorte de alcance ya documentado en `TASK-264`:

- el login actual queda fuera de la primera iteración del copy contract
- la copy específica del login no bloquea la convergencia del resto del portal
- el resto del portal sí debe migrar hacia una capa verbal más canónica y reusable

Queda diferido por ahora:

- hero copy del login
- subtítulos y claims del brand panel
- CTAs y labels específicos de la pantalla actual de login
- microcopy local del flujo visual de login mientras esa surface siga fuera de la primera ola

Sí queda en scope para esta task:

- navegación
- labels/shared actions institucionales
- estados vacíos, loading, error y success reutilizables
- categorías de notificación
- copy shared de emails y otras superficies institucionales fuera del login

## Why This Task Exists

El problema actual no es que Greenhouse carezca de una capa de copy, sino que esa capa **está saturada con lo equivocado** y el resto del microcopy vive duplicado inline:

- `greenhouse-nomenclature.ts` concentra navegación, labels, mensajes y parte del brand language — se convirtió en catch-all.
- Otros textos siguen viviendo fuera de esa capa (`notification-categories.ts` español-only, emails con strings inline, vistas con arrays de meses duplicados, componentes con CTAs hardcoded).
- No existe un contrato claro entre nomenclatura de producto, microcopy funcional e i18n futuro.
- Kortex no puede heredar la capa verbal institucional sin copiar un archivo demasiado acoplado al producto Greenhouse.
- **Driver adicional no-trivial:** los clientes de Efeonce están distribuidos por América y el mundo, no solo Chile. Sin una capa dictionary-ready lista para que `TASK-266` le conecte locales, cada semana que pasa acumula más strings hardcoded en `es-CL` que después habrá que recoger uno a uno.

La situación es análoga a la del theme: hay una foundation, pero no una sola fuente de verdad defendible ni portable.

## Goal

- Definir una fuente de verdad única para la capa verbal de Greenhouse con separación de responsabilidades por capa (product / shared / domain).
- Separar claramente nomenclatura de producto, microcopy funcional reusable y copy de dominio.
- **Recortar** `greenhouse-nomenclature.ts` a su alcance defendible (product nomenclature + nav) y extraer microcopy funcional shared a una capa nueva dictionary-ready.
- Reducir strings hardcodeados en superficies shared del portal, con baseline medible (arrays de meses, CTAs base, categorías, emails).
- Ejecutar la convergencia primero en navegación, shared surfaces, categorías y emails; el login queda diferido como excepción temporal.
- Dejar la foundation dictionary-ready que `TASK-266` tomará como base para locales reales sin reescribir la capa verbal otra vez.
- Dejar documentada (no implementada) la separación conceptual para que Kortex pueda heredar copy institucional en una lane futura sin arrastrar lenguaje de producto Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- La capa verbal no debe abrir un tercer sistema paralelo si ya existe `greenhouse-nomenclature.ts`; la convergencia debe partir desde esa base.
- La nomenclatura de producto (`Pulse`, `Spaces`, `Ciclos`, `Torre de control`, etc.) debe distinguirse de la copy funcional reusable.
- No mezclar i18n full-scale con esta lane si el portal sigue siendo `es-only`; el contrato puede quedar listo sin traducir el producto completo.
- El login actual queda fuera de la primera ola de migración de copy; usarlo como baseline de análisis, no como objetivo de implementación inmediata.
- Kortex debe consumir copy institucional reusable, no vocabulario de producto específico de Greenhouse salvo decisión explícita.
- No tocar el repo `efeoncepro/kortex` en esta task.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `src/config/greenhouse-nomenclature.ts`
- `src/config/notification-categories.ts`
- `full-version/src/configs/i18n.ts`
- `full-version/src/utils/getDictionary.ts`
- `docs/tasks/to-do/TASK-116-sidebar-navigation-audit-remediation.md`
- `docs/tasks/to-do/TASK-264-greenhouse-theme-canonicalization-kortex-brand-contract.md`

## Dependencies & Impact

### Depends on

- `src/config/greenhouse-nomenclature.ts`
- `src/config/notification-categories.ts`
- `src/emails/PayrollExportReadyEmail.tsx`
- `src/emails/PayrollReceiptEmail.tsx`
- `full-version/src/data/dictionaries/en.json`

### Blocks / Impacts

- TASK-264 — theme/branding y capa verbal deben converger como dos contratos hermanos.
- TASK-116 — labels/subtitles del sidebar deben quedar alineados al contrato canónico.
- Futuras integraciones con Kortex, especialmente si comparten shell institucional o superficies paralelas.
- Cualquier lane que siga agregando texto a `greenhouse-nomenclature.ts` sin distinguir propósito.

### Files owned

- `src/config/greenhouse-nomenclature.ts`
- `src/config/notification-categories.ts`
- `src/emails/PayrollExportReadyEmail.tsx`
- `src/emails/PayrollReceiptEmail.tsx`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- **Slice 5 ownership**:
  - `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` (nuevo)
  - `eslint-plugins/greenhouse/index.mjs` (registro de la rule)
  - `eslint.config.mjs` (aplicación de la rule + scope excludes)
  - `.claude/skills/greenhouse-ux-writing/SKILL.md` (hardening de description + triggers)
  - `.claude/skills/greenhouse-ui-review/SKILL.md` (checklist row microcopy)
  - `CLAUDE.md` (mención dura en Conventions)
  - `.claude/settings.json` (hook PostToolUse opcional)

## Current Repo State

### Already exists

- `src/config/greenhouse-nomenclature.ts` ya concentra navegación, labels, mensajes, colores y namespaces específicos como `GH_NEXA`.
- `src/config/notification-categories.ts` mantiene otra capa separada de labels funcionales.
- Emails y algunas vistas siguen definiendo copy localmente.
- El login actual también concentra copy local, pero queda explícitamente diferido en esta primera iteración.
- Vuexy full-version sí tiene un sistema de diccionarios con `getDictionary()` y `data/dictionaries/*.json`.
- El repo ya opera efectivamente como portal `es-only`, aunque el upstream tenga scaffolding i18n.

### Gap

- No existe una separación formal entre product nomenclature, microcopy functional y shared institutional copy.
- Hay strings hardcodeados fuera de la capa canónica. Baseline observado:
  - **8+ vistas** duplican arrays de meses (`['Ene', 'Feb', ..., 'Dic']`) en analytics, payroll, organization economics.
  - **9+ instancias** de CTAs base (`Guardar`, `Guardando...`, `Editar`, `Cancelar`) hardcoded en `src/components/greenhouse/` (ej. AboutMeCard, ProfessionalLinksCard).
  - **`src/config/notification-categories.ts`** define 12 categorías con labels y descriptions 100% español inline, sin tocar la capa canónica.
  - Emails (`src/emails/*.tsx`) casi no consumen `greenhouse-nomenclature.ts`; solo `LeaveRequestPendingReviewEmail.tsx` trae un patrón manual bilingüe ad-hoc.
- `greenhouse-nomenclature.ts` está **saturado** (1592 líneas mezclando nav, labels, brand, namespaces tipo `GH_NEXA`); el problema no es que le falte contenido, es que concentra lo equivocado.
- No está suficientemente explicitado qué hardcodes deben migrar ya y cuáles se difieren por surface.
- No existe un adapter o contrato portable para Kortex (esta task sólo lo deja conceptual, ver Slice 4).
- Greenhouse no puede decidir hoy con claridad si una string nueva debe vivir en `greenhouse-nomenclature.ts`, en un diccionario, o inline en el componente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Copy system audit

- Inventariar la capa actual de copy y clasificarla en 4 buckets:
  - nomenclatura de producto
  - microcopy funcional shared
  - copy de dominio
  - copy residual hardcodeada
- Detectar textos shared que hoy están fuera de la fuente canónica.
- Comparar esa taxonomía con el modelo de diccionarios del `full-version` de Vuexy.

### Slice 2 — Canonical copy contract

- Formalizar qué debe permanecer en `greenhouse-nomenclature.ts`.
- Definir qué copy reusable debe vivir en namespaces más limpios o en una capa dictionary-ready.
- Documentar el patrón de consumo para nuevos componentes y vistas.

### Slice 3 — Split-off: migración de superficies

**La migración masiva de superficies ya no vive en esta task.** El riesgo de mezclar diseño del contrato con migración multi-dominio (94+ importers, 8+ vistas con arrays de meses, componentes con CTAs, notifications, emails) era demasiado alto para una sola lane.

Se divide en dos child tasks ejecutables:

- **`TASK-407`** — Copy migration: shared shell + componentes (navigation, common CTAs, arrays de meses, empty/error/loading shared). Blocked by `TASK-265` cerrada.
- **`TASK-408`** — Copy migration: notifications + emails institucionales. Blocked by `TASK-265` cerrada.

Esta task (TASK-265) entrega **únicamente**:

- la taxonomía (Slice 1)
- el contrato canónico y estructura de las capas (Slice 2)
- el patrón de consumo documentado
- la foundation dictionary-ready vacía/semilla, lista para recibir migraciones
- la separación conceptual para Kortex (Slice 4 documental)

No migra código de superficies — eso lo hacen las derivadas, con criterio de aceptación medible por superficie.

### Slice 5 — Gate operativo: ESLint rule + skill hardening + checklist

Este Slice cierra el flanco operativo (agentes ignoran `greenhouse-ux-writing`) que motivó el bump del 2026-05-02. Hereda el patrón gate-antes-que-sweep de TASK-567 (typography contract). Sin esto, las child tasks `TASK-407` y `TASK-408` migrarían superficies pero los agentes seguirían introduciendo hardcodes nuevos en paralelo — el sweep nunca alcanza al influjo.

**Componentes del Slice**:

#### 5a. ESLint rule local `greenhouse/no-untokenized-copy`

- Archivo: `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs`
- Patrón heredado de `no-hardcoded-fontfamily` y `no-raw-table-without-shell` (AST vanilla, `.mjs`, mensajes accionables)
- **Detecta** strings literales en props específicos de UI primitives Greenhouse:
  - `label`, `placeholder`, `helperText` (TextField, Select, Autocomplete)
  - `title`, `subtitle` (CardHeader, Drawer header)
  - `message`, `description` (Alert, Snackbar, EmptyState)
  - `tooltip`, `aria-label` cuando son strings literales
- **Permite** valores que vengan de:
  - `greenhouse-nomenclature.ts` (capa product nomenclature recortada)
  - capa dictionary-ready inicializada en Slice 2 (path final decidido en Slice 2)
  - `// eslint-disable-next-line greenhouse/no-untokenized-copy` con justificación inline
- **Excluidos por scope** (en `eslint.config.mjs`):
  - `src/components/theme/**`, `src/@core/**` (theme files)
  - `src/app/global-error.tsx` (pre-theme)
  - `src/app/public/**` (páginas públicas pre-shell)
  - `src/emails/**` (cubierto por TASK-408)
  - `src/lib/finance/pdf/**` (react-pdf con su propio sistema)
  - `**/*.test.*` (tests)
- **Modo inicial**: `warn` durante TASK-265 + TASK-407/408 (no bloquea CI mientras migra el sweep)
- **Modo final**: `error` post cierre TASK-408 (CI bloquea regresiones)

#### 5b. Hardening de skill `greenhouse-ux-writing`

- Reforzar `description` con triggers explícitos: "labels", "tooltips", "empty states", "error messages", "snackbar", "drawer titles", "form helpers", "copy en español", "microcopy"
- Agregar mención dura en `CLAUDE.md` Conventions: "Antes de escribir cualquier string visible al usuario en JSX (label, placeholder, title, alert, snackbar, empty state, error message), invocar `greenhouse-ux-writing` para validar tono + revisar si existe en `greenhouse-nomenclature.ts` o en la capa dictionary-ready"
- Cross-link explícito skill ↔ `greenhouse-nomenclature.ts` ↔ foundation dictionary-ready (Slice 2)

#### 5c. Checklist row en `greenhouse-ui-review`

Agregar un punto al pre-commit checklist de la skill `greenhouse-ui-review`:

> "**Microcopy**: ¿algún string visible al usuario quedó hardcoded en JSX? Si sí, ¿está justificado con `eslint-disable` o debe migrar a `greenhouse-nomenclature.ts` / capa dictionary-ready? Invocar `greenhouse-ux-writing` para validar tono."

Backstop si la rule (5a) tiene false negatives o si el agente bypassea.

#### 5d. Hook PostToolUse opcional (defense-in-depth)

`.claude/settings.json` hook que detecta edits en archivos `src/views/**`, `src/components/**` y emite recordatorio: "Recordá que strings de UI deben venir de `greenhouse-nomenclature.ts` o de la capa dictionary-ready, no hardcoded. La skill `greenhouse-ux-writing` valida el tono."

Es defensa secundaria — la rule (5a) hace el trabajo principal.

#### Coordinación con TASK-407/408

- TASK-265 cierra con rule en `warn` → CI no bloquea, pero developers/agentes ven warnings al lintar
- TASK-407 ejecuta sweep shared shell (arrays meses, CTAs base, empty/error/loading) → warnings bajan
- TASK-408 ejecuta sweep notifications + emails → warnings bajan
- **Cierre TASK-408** promueve la rule a `error`. CI bloquea cualquier regresión

Mismo flujo verificado y exitoso en TASK-567 (warn → 311 warnings → sweep → 0 → error).

### Slice 4 — Kortex copy adapter (exploratorio, no bloqueante)

Este slice es **exploratorio/documental**, no entregable de código. No hay consumer Kortex ejecutándose que valide el contrato; forzar un adapter completo en esta lane genera over-engineering contra un target hipotético.

Alcance real de este slice:

- Documentar la separación conceptual entre copy institucional reusable vs lenguaje de producto Greenhouse.
- Dejar un namespace o convención de naming que permita, en una lane futura, extraer la capa neutral sin refactor masivo.
- No crear un paquete, submódulo ni adapter ejecutable en este repo mientras Kortex no tenga roadmap confirmado de consumo.

Separación conceptual:

- sí reusable: shell copy neutral fuera del login actual, common actions, empty/error/loading shared, categorías y labels institucionales
- no reusable: metáforas de producto, navegación Greenhouse, labels de módulos y taxonomías exclusivas

## Out of Scope

- Traducir Greenhouse a múltiples idiomas en esta iteración.
- Tocar el repo `efeoncepro/kortex`.
- Cambiar la pantalla actual de login en esta iteración.
- Reescribir todos los textos del producto de una sola vez.
- Resolver branding visual o theme en esta task; eso vive en `TASK-264`.
- Convertir todos los emails del sistema a un framework i18n completo si no es necesario para el contrato base.

## Detailed Spec

La regla objetivo es esta:

1. **Product nomenclature**
   - vive en la capa Greenhouse y conserva lenguaje propio del producto
   - ejemplos: `Pulse`, `Spaces`, `Ciclos`, `Mi Greenhouse`, `Torre de control`

2. **Functional shared microcopy**
   - debe poder vivir en una capa dictionary-ready o namespace shared
   - ejemplos: loading labels, CTA base, empty states compartidos, labels de acciones comunes, toasts y errores reutilizables fuera del login actual

3. **Domain copy**
   - puede seguir cerca del dominio si no tiene vocación shared
   - pero debe respetar el contrato verbal institucional y no inventar taxonomía paralela

4. **Kortex portability**
   - Kortex debe consumir solo la capa reusable/institucional
   - no debe heredar por defecto la nomenclatura específica del producto Greenhouse

5. **Login exception for phase 1**
   - la copy específica del login actual se difiere para evitar mezclar esta task con un ajuste visual/UX de auth
   - eso no impide migrar el resto del contrato verbal del portal
   - si una string hoy vive en login pero su vocación es shared, puede documentarse como candidata futura sin tocar la pantalla en esta iteración

## Acceptance Criteria

### Cualitativos (de esta task — diseño/contrato)

- [ ] Existe una taxonomía explícita para product nomenclature, shared microcopy, domain copy y residual hardcodes.
- [ ] Queda definido un patrón claro para cuándo usar `greenhouse-nomenclature.ts`, cuándo usar la capa dictionary-ready y cuándo dejar copy local.
- [ ] La task deja explícito qué copy queda fuera temporalmente por pertenecer al login actual y qué copy sí debe migrar en las child tasks.
- [ ] Existe documentación conceptual (no código) para que Kortex pueda, en una lane futura, heredar copy institucional reusable sin arrastrar lenguaje de producto Greenhouse.
- [ ] La task deja cerrada la relación con `TASK-264` para que theme y copy no evolucionen como contratos incompatibles.
- [ ] `greenhouse-nomenclature.ts` queda recortado a nomenclatura de producto + navegación; la nueva capa dictionary-ready queda inicializada y lista para recibir migraciones.
- [ ] `TASK-407` y `TASK-408` quedan creadas con scope claro y dependencias registradas.

### Entregables concretos (de esta task)

- [ ] Archivo(s) nuevos para la capa dictionary-ready (p.ej. `src/lib/copy/` o `src/config/dictionaries/`) con estructura semilla por namespace y type-safety.
- [ ] `greenhouse-nomenclature.ts` decremented: removidas las categorías que no son product nomenclature ni navegación (si aplica sin romper runtime; si no, queda el plan de deprecation).
- [ ] Documento en `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con el contrato canónico y ejemplos de código para los 3 casos (product nomenclature / shared microcopy / local domain copy).

### Entregables Slice 5 (gate operativo)

- [ ] `eslint-plugins/greenhouse/rules/no-untokenized-copy.mjs` creada siguiendo patrón AST vanilla de `no-hardcoded-fontfamily` (TASK-567).
- [ ] Rule registrada en `eslint-plugins/greenhouse/index.mjs` y aplicada en `eslint.config.mjs` con scope `src/views/**`, `src/components/**`, `src/app/**` y excludes documentados.
- [ ] Rule activa en modo `warn` al cierre de TASK-265.
- [ ] Skill `greenhouse-ux-writing`: description reforzada con triggers explícitos; bidirectional cross-link con nomenclature.ts y dictionary-ready foundation.
- [ ] `CLAUDE.md` Conventions: mención dura "antes de escribir cualquier string visible, invocar `greenhouse-ux-writing`".
- [ ] Skill `greenhouse-ui-review`: checklist row "Microcopy" agregado.
- [ ] (Opcional) Hook PostToolUse en `.claude/settings.json` que recuerde la regla al editar archivos UI.
- [ ] Test smoke con `RuleTester` para los patterns dominantes (label/placeholder/title con literal vs token reference) — opcional pero recomendado para evitar regresión de la rule misma.

### Coordinación con TASK-407 / TASK-408 (promote a error mode)

- [ ] TASK-407 + TASK-408 documentadas con la dependencia: cuando TASK-408 cierre, su Closing Protocol debe incluir "promover `greenhouse/no-untokenized-copy` a `error` en `eslint.config.mjs` y verificar `pnpm lint` clean".
- [ ] Snapshot inicial de warnings emitidos por la rule registrado en `Handoff.md` al cierre de TASK-265. Las child tasks (407/408) usan ese baseline para medir progreso del sweep.

### Medibles — diferidos a child tasks

Los hard numbers de reducción de hardcodes viven en las derivadas:

- `TASK-407` entrega: 0 arrays de meses + 0 CTAs base hardcoded fuera de la capa canónica.
- `TASK-408` entrega: 100% de categorías en capa canónica + emails institucionales usando dictionary-ready.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validación manual de navegación, categorías, shared surfaces y emails donde se migren textos
- Verificación manual de alcance: confirmar que login no fue parte del lote

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con la regla canónica de copy system.
- [ ] Ejecutar chequeo de impacto cruzado sobre tasks que referencian `greenhouse-nomenclature.ts`, en especial `TASK-116`, `TASK-264`, `TASK-407`, `TASK-408`.
- [ ] Dejar explícito en `Handoff.md` qué parte del contrato verbal queda reusable para Kortex.
- [ ] Documentar en `Handoff.md` el snapshot inicial de warnings emitidos por `greenhouse/no-untokenized-copy` (baseline para TASK-407/408).
- [ ] Verificar que `pnpm lint` corre la rule y emite warnings (no errors) al cierre de TASK-265 — gate establecido pero no bloqueante hasta cierre TASK-408.
- [ ] Actualizar TASK-407 y TASK-408 con la dependencia "Closing Protocol promueve `no-untokenized-copy` a error mode + verifica lint clean".

## Follow-ups

- TASK-266 — activar i18n/globalization incremental como carril separado una vez estabilizado el copy contract.
- Crear task espejo en Kortex para adoptar el contract/adapter reusable si esta task estabiliza el modelo.
- Evaluar si Greenhouse mantiene `es-only` con dictionary-ready contract o si conviene activar i18n real más adelante.
- Revisar si emails necesitan una sub-lane específica de copy contract una vez cerrado el baseline shared.

## Open Questions

- ¿`greenhouse-nomenclature.ts` debe seguir siendo el archivo principal o conviene evolucionar a namespaces/shared dictionaries más explícitos? — la recomendación de esta task es **recortarlo**, no ampliarlo; confirmar criterio al planificar.
- ¿Qué estructura concreta toma la capa dictionary-ready: namespaces por dominio, archivo único, o JSON por surface? Decidir alineado con el scaffolding de `full-version/` para no bloquear `TASK-266`.
- ¿La foundation dictionary-ready debe ya aceptar un `locale` param aunque en fase 1 solo exista `es-CL`, para que `TASK-266` no la reescriba? Recomendado: sí.
- ¿Vale la pena dejar un adapter `dictionary-like` aunque Greenhouse siga siendo español-only en esta fase? — sí, porque `TASK-266` ya está justificada por el footprint LATAM/mundial.
- ¿Se abre luego una follow-up específica para converger la copy del login una vez estabilizado el contrato verbal del resto del portal?
- ¿Kortex necesita un adapter ejecutable o basta la separación conceptual? — dejar conceptual hasta que Kortex confirme consumo (ver Slice 4).
