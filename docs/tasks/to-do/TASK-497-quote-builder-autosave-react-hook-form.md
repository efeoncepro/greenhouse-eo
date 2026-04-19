# TASK-497 — Quote Builder Autosave + react-hook-form Migration (Sprint 2)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation` + `refactor`
- Status real: `Backlog`
- Rank: `Post-TASK-496`
- Domain: `ui` + `finance`
- Blocked by: `none`
- Branch: `task/TASK-497-quote-builder-autosave-rhf`

## Summary

Sprint 2 del programa de polish del Quote Builder. Introduce **autosave silencioso** (cada 30s + backup en localStorage) y migra el form state del shell (15+ `useState`) a **react-hook-form + Controller + valibotResolver** para habilitar validation declarativa, dirty tracking, error propagation consistente, y single source of truth.

## Why This Task Exists

El Quote Builder actual tiene excelente UX visual (Sprint 1 + TASK-487/488) pero **pierde trabajo** si el browser crashea o si el usuario se va sin guardar. Ademas, el form state son 15+ `useState` dispersos con validacion custom en `validate()` que no propaga errores a UI por-chip. Enterprise SaaS 2024-2026 (Linear, Stripe, Ramp, Notion) resuelven esto con **autosave + form library**.

Este sprint:
1. **Autosave**: guarda el draft automaticamente cada 30s de inactividad, backup a localStorage en cada cambio, recovery dialog si el browser se recupera con datos sin persistir.
2. **react-hook-form**: refactor del shell para que el form state viva en `useForm`. Cada ContextChip/field se conecta via `Controller`. Validacion declarativa con `valibot` + `valibotResolver`. Errors propagan automaticamente a cada chip (status='invalid' + errorMessage).
3. **Crear otra** post-save: toast con CTA "Crear otra cotizacion similar" que duplica context (org+modelo+etc) en nueva quote.

## Goal

- Autosave cada 30s + localStorage backup en cada keystroke
- Recovery dialog "Hay cambios sin guardar de tu sesion anterior. ¿Restaurar?" al abrir `/new` con localStorage no vacio
- `useForm({ resolver: valibotResolver(quoteBuilderSchema) })` reemplaza `useState` individuales
- Cada ContextChip muestra `errorMessage` desde `fieldState.error` automaticamente
- Toast post-save con CTA "Crear otra" que navega a `/new` con query params de contexto
- Gates: tsc/lint/test/build verdes; smoke staging

## Acceptance Criteria

- [ ] Autosave cada 30s de idle (debounce) en mode=create y mode=edit
- [ ] localStorage key `greenhouse:quote-draft:{orgId|new}` guarda el draft en cada onChange
- [ ] Recovery dialog aparece al mount si localStorage no vacio y lineas > 0
- [ ] Shell usa `useForm` con `valibotResolver(schema)`
- [ ] Cada ContextChip recibe `fieldState.error?.message` via Controller
- [ ] Toast success tras save incluye boton "Crear otra" que redirige a `/new?copy=ID`
- [ ] Submit usa `handleSubmit` de react-hook-form, no `handleSubmit` custom
- [ ] tsc/lint/test/build verdes

## Scope

### Slice 1 — Autosave infrastructure

- Hook `useQuoteDraftAutosave({ formValues, quoteId, mode })`
- Debounce 30s
- localStorage read/write
- Recovery dialog primitive

### Slice 2 — react-hook-form migration

- Schema `quoteBuilderSchema` con valibot (org required, contact optional, description required, lines[].quantity > 0, etc.)
- Refactor shell: `useForm({ defaultValues, resolver })`
- Refactor QuoteContextStrip: cada chip como `<Controller render={({ field, fieldState }) => <ContextChip value={field.value} onSelectChange={field.onChange} errorMessage={fieldState.error?.message} />} />`
- Refactor line items editor: el draft sigue viviendo en el editor (ref-based) pero expone el estado al form del shell
- `handleSubmit(onSubmit)` replaces manual `validate() + handleSubmit`

### Slice 3 — "Crear otra" flow

- Toast post-save con action "Crear otra"
- Query params `?copy=quoteId` → nueva quote con context pre-poblado

### Slice 4 — Verification

- Smoke staging: flujo crear → perder foco → verificar autosave → refresh → recovery dialog
- Smoke edit: editar → autosave cada 30s → verify PUT
- Smoke error: borrar campos required → verify error message por chip

## Out of Scope

- Multi-user concurrent edit conflicts (requiere versionado en backend, task separada)
- Offline mode (Service Worker) — futuro
- Diff/merge de drafts múltiples — futuro

## Follow-ups

- Integracion con versionado de quotes (historial)
- TASK-498 Sprint 3 platform primitives
- TASK-499 resto del audit backlog
