# TASK-408 — Copy Migration: Notification Categories + Institutional Emails

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-265` — requiere contrato canónico y capa dictionary-ready.
- Branch: `task/TASK-408-copy-migration-notifications-emails`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-265` (split-off de Slice 3)

## Summary

Derivada de `TASK-265`. Ejecuta la migración de copy shared en dos superficies externas críticas: `src/config/notification-categories.ts` (100% español-only hoy) y los templates de email institucionales en `src/emails/*.tsx`. Separada de `TASK-407` porque tocar emails y notifications tiene blast radius distinto (afecta delivery real a usuarios y tenants) y requiere verificación independiente.

## Why This Task Exists

Las notificaciones y emails son superficies externas de alto impacto:

- `src/config/notification-categories.ts` define 12 categorías con labels + descriptions inline en español. Cualquier cambio de copy aquí se propaga a UI de preferencias, correos de digest y notificaciones in-app.
- Los emails son la superficie externa más visible: llegan a personas fuera del portal (clientes, stakeholders). Un error de migración aquí es más caro que en el shell.
- Hoy solo un email (`LeaveRequestPendingReviewEmail.tsx`) implementa un patrón bilingüe ad-hoc; el resto hardcodea español sin hook a la capa canónica.
- Mezclar esto con `TASK-407` habría generado un PR gigante mezclando refactor puro UI con delivery externo.

## Goal

- Migrar el 100% de `notification-categories.ts` a la capa canónica sin cambios visibles al usuario.
- Migrar strings institucionales shared en emails (subjects estándar, footers, CTAs genéricos) a la capa dictionary-ready.
- Dejar los emails listos para que `TASK-266` pueda conectar locales reales sin un refactor adicional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- Spec de emails institucionales (si existe) en `docs/architecture/`.

Reglas obligatorias:

- Cero regresiones en delivery de emails: los subjects y cuerpos deben renderizar igual después del refactor.
- Mantener la estructura actual de `notification-categories.ts` (code, audience, channels, priority) — solo migrar labels y descriptions.
- No reescribir copy: la migración es mover strings de sitio, no editarlas.
- Copy de dominio específica por email (datos de payroll, detalles de un request) puede quedar local; solo copy institucional shared migra.

## Normative Docs

- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `src/config/notification-categories.ts`
- `src/emails/*.tsx`

## Dependencies & Impact

### Depends on

- `TASK-265` en estado `complete`.
- Namespaces de la capa dictionary-ready definidos (emails + notifications).

### Blocks / Impacts

- `TASK-266` Slice 4 child de emails — consume directamente el trabajo de esta task para localizar templates.
- Cualquier flujo de notificaciones in-app y digest que consume labels de `notification-categories`.

### Files owned

- `src/config/notification-categories.ts`
- `src/emails/*.tsx`
- Helpers/util shared en `src/lib/email/` donde aplique

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Notification categories

- Migrar las 12 categorías de `notification-categories.ts` a la capa canónica.
- Labels y descriptions consumen dictionary-ready; el resto del shape (code, channels, audience, priority) queda en TS.
- Validar que admin-notifications UI, preferencias y digest usan los labels migrados sin cambios visuales.

### Slice 2 — Emails institucionales shared

- Inventariar strings shared en emails: subject prefixes estándar, footers, CTAs genéricos (`Ver en el portal`, `Ir a...`), headers institucionales, disclaimers.
- Migrar al namespace canónico correspondiente.
- Mantener la copy de dominio específica (datos del evento, detalles del request) local al template.

### Slice 3 — Adapter bilingüe deprecation plan

- `LeaveRequestPendingReviewEmail.tsx` tiene un patrón manual bilingüe ad-hoc. Documentar (no implementar) el plan para migrarlo al contrato canónico cuando `TASK-266` habilite locales reales.
- No tocar ese template en esta task salvo para asegurar que no usa helpers que van a desaparecer.

### Slice 4 — Verificación de delivery

- Enviar emails de prueba para cada template migrado y validar que el rendering HTML y subject son idénticos al baseline pre-migración.
- Validar notificaciones in-app renderizan labels correctos en admin-notifications y preferences UI.

## Out of Scope

- Traducción de emails a otros locales (eso es `TASK-266`).
- Rediseño visual de templates.
- Cambios en el delivery pipeline, webhooks o notification outbox.
- Shell, nav, CTAs en componentes UI (eso es `TASK-407`).

## Acceptance Criteria

- [ ] **100%** de las categorías de `notification-categories.ts` consumen la capa canónica (labels + descriptions); el archivo no tiene strings inline para esos campos.
- [ ] Strings institucionales shared de emails en scope están en la capa dictionary-ready; copy de dominio específica permanece local por decisión explícita.
- [ ] Diff visual de emails pre/post migración es **cero** (rendering idéntico).
- [ ] Diff visual de notifications UI (admin + preferences + digest) pre/post migración es cero.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan.
- [ ] Plan de migración del email bilingüe (`LeaveRequestPendingReviewEmail`) queda documentado para `TASK-266`.

## Verification

- `pnpm lint && npx tsc --noEmit && pnpm build && pnpm test`
- Envío de emails de prueba a una inbox de staging, comparación HTML/subject.
- Revisión manual de admin-notifications y preferences UI en staging.

## Closing Protocol

- [ ] Actualizar `Handoff.md` con resumen de migración.
- [ ] Registrar en `TASK-266` que el groundwork de emails está listo para locales reales.

## Open Questions

- ¿Los subjects de emails deben vivir en la capa canónica o son suficientemente específicos por template para quedar locales? Decidir en planning.
- ¿Deprecar el patrón bilingüe manual de `LeaveRequestPendingReviewEmail` o mantenerlo hasta que `TASK-266` entregue alternativa?
