# TASK-265 — Greenhouse Nomenclature, Dictionary & Kortex Copy Contract

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
- Blocked by: `none`
- Branch: `task/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract`
- Legacy ID: —
- GitHub Issue: —

## Summary

Greenhouse sí tiene una capa central de microcopy en `src/config/greenhouse-nomenclature.ts`, pero hoy convive con textos hardcodeados en emails, categorías de notificación, vistas y componentes puntuales. Vuexy full-version sí trae un scaffolding de diccionarios/i18n (`getDictionary`, `data/dictionaries/*.json`), pero Greenhouse no adoptó ese contrato como base. Esta task canoniza la capa verbal del portal, separa nomenclatura de producto vs copy reusable, y deja un contrato replicable para Kortex sin tocar el repo hermano en esta lane.

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

El problema actual no es que Greenhouse carezca de una capa de copy, sino que esa capa es incompleta y mezcla propósitos distintos:

- `greenhouse-nomenclature.ts` concentra navegación, labels, mensajes y parte del brand language
- otros textos siguen viviendo fuera de esa capa (`notification-categories.ts`, emails, vistas, helpers puntuales)
- no existe un contrato claro entre nomenclatura de producto, microcopy funcional e i18n futuro
- Kortex no puede heredar la capa verbal institucional sin copiar un archivo demasiado acoplado al producto Greenhouse

La situación es análoga a la del theme: hay una foundation, pero no una sola fuente de verdad defendible ni portable.

## Goal

- Definir una fuente de verdad única para la capa verbal de Greenhouse.
- Separar claramente nomenclatura de producto, microcopy funcional reusable y copy de dominio.
- Reducir strings hardcodeados en superficies shared del portal.
- Ejecutar la convergencia primero en navegación, shared surfaces, categorías y emails; el login queda diferido como excepción temporal.
- Dejar un contrato o adapter que Kortex pueda adoptar para copy institucional sin heredar lenguaje de producto Greenhouse por accidente.

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
- Hay strings hardcodeados fuera de la capa canónica.
- No está suficientemente explicitado qué hardcodes deben migrar ya y cuáles se difieren por surface.
- No existe un adapter o contrato portable para Kortex.
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

### Slice 3 — Shared surface migration

- Mover a la capa canónica los textos shared de navegación, estados vacíos principales, toasts, acciones base, categorías y emails donde aplique.
- Excluir la copy específica del login de la primera ola de implementación.
- Reducir hardcodes en superficies shared de alto impacto.
- Mantener fuera los textos puramente locales del componente si no aportan reuso ni contrato institucional.

### Slice 4 — Kortex copy adapter

- Definir un contrato reutilizable para Kortex con copy institucional reusable.
- Separar explícitamente lo que Kortex puede heredar de lo que es Greenhouse-only:
  - sí: shell copy neutral fuera del login actual, common actions, empty/error/loading shared, categorías y labels institucionales
  - no: metáforas de producto, navegación Greenhouse, labels de módulos y taxonomías exclusivas

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

- [ ] Existe una taxonomía explícita para product nomenclature, shared microcopy, domain copy y residual hardcodes.
- [ ] La capa canónica de copy deja de depender de strings shared dispersos en vistas, categorías y superficies institucionales clave.
- [ ] Queda definido un patrón claro para cuándo usar `greenhouse-nomenclature.ts`, cuándo usar una capa dictionary-ready y cuándo dejar copy local.
- [ ] La task deja explícito qué copy queda fuera temporalmente por pertenecer al login actual y qué copy sí debe migrar en el resto del portal.
- [ ] Existe documentación explícita para que Kortex consuma copy institucional reusable sin copiar lenguaje de producto Greenhouse.
- [ ] La task deja cerrada la relación con `TASK-264` para que theme y copy no evolucionen como contratos incompatibles.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validación manual de navegación, categorías, shared surfaces y emails donde se migren textos
- Verificación manual de alcance: confirmar que login no fue parte del lote

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con la regla canónica de copy system.
- [ ] Ejecutar chequeo de impacto cruzado sobre tasks que referencian `greenhouse-nomenclature.ts`, en especial `TASK-116` y `TASK-264`.
- [ ] Dejar explícito en `Handoff.md` qué parte del contrato verbal queda reusable para Kortex.

## Follow-ups

- TASK-266 — activar i18n/globalization incremental como carril separado una vez estabilizado el copy contract.
- Crear task espejo en Kortex para adoptar el contract/adapter reusable si esta task estabiliza el modelo.
- Evaluar si Greenhouse mantiene `es-only` con dictionary-ready contract o si conviene activar i18n real más adelante.
- Revisar si emails necesitan una sub-lane específica de copy contract una vez cerrado el baseline shared.

## Open Questions

- ¿`greenhouse-nomenclature.ts` debe seguir siendo el archivo principal o conviene evolucionar a namespaces/shared dictionaries más explícitos?
- ¿Qué porción de la capa verbal actual realmente necesita ser reusable para Kortex?
- ¿Vale la pena dejar un adapter `dictionary-like` aunque Greenhouse siga siendo español-only en esta fase?
- ¿Se abre luego una follow-up específica para converger la copy del login una vez estabilizado el contrato verbal del resto del portal?
