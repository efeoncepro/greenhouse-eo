# TASK-430 — Dictionary Foundation Activation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` — `TASK-265` y `TASK-428` ya estan completas.
- Branch: `task/TASK-430-dictionary-foundation-activation`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-266` (umbrella)

## Summary

Activa el runtime de i18n sobre la capa dictionary-ready que deja `TASK-265` y con la librería i18n elegida por `TASK-428`: `next-intl`. Instala el paquete, configura provider/request loading, conecta el primer locale no-`es-CL` (`en-US`) con el set mínimo de strings shared, y deja el sistema listo para que child tasks de rollout (shell, emails) agreguen superficies incrementales.

## Why This Task Exists

Entre el contrato (`TASK-265`) y los rollouts superficie por superficie hay un paso de runtime obligado:

- Instalar y configurar la librería i18n elegida: `next-intl`.
- Conectar el provider al App Router.
- Implementar middleware de detección (si aplica según `TASK-428`).
- Generar la estructura de archivos de diccionarios con type safety.
- Traducir el primer set mínimo (shell + CTAs base + estados shared) a un locale adicional como prueba del sistema end-to-end.

Sin esto, los child tasks de rollout no tienen dónde conectarse.

## Goal

- Dejar el runtime de i18n operativo y testeable en staging con al menos dos locales (`es-CL` + uno adicional confirmado por `TASK-428`).
- Conectar todos los consumers de la capa dictionary-ready al provider runtime.
- Validar end-to-end que un usuario con `en-US` preference ve el shell en inglés y `es-CL` en español.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md` (creado por `TASK-428`)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- No introducir una librería i18n que contradiga lo decidido en `TASK-428` (`next-intl`).
- No traducir en masa: esta task conecta runtime + primer locale mínimo. El rollout de superficies adicionales es child task posterior.
- Mantener cero regresiones en el locale default (`es-CL`): usuarios actuales no deben ver diferencia.
- Session/tenant locale aún no persiste — usa detection fallback hasta que `TASK-431` cierre.

## Normative Docs

- `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `docs/tasks/complete/TASK-428-i18n-architecture-decision.md`

## Dependencies & Impact

### Depends on

- `TASK-265` en estado `complete`.
- `TASK-428` en estado `complete` con ADR publicado: `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md`.

### Blocks / Impacts

- Rollouts futuros (shell, emails, módulos) consumen este runtime.
- `TASK-431` puede arrancar en paralelo para cerrar la jerarquía de detección con persistencia real.

### Files owned

- `next.config.*` (config de i18n si aplica)
- Middleware de detección
- Provider root del App Router
- `src/lib/copy/` o equivalente — integración con la capa dictionary-ready de `TASK-265`
- `src/dictionaries/` (o estructura que `TASK-428` defina)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Instalación y configuración

- Instalar la librería elegida por `TASK-428`: `next-intl`.
- Configurar el provider en el root layout del App Router.
- Configurar provider/request loading sin prefijar el portal privado; cualquier composición proxy futura debe vivir en `src/proxy.ts`.
- Validar que el default locale (`es-CL`) funciona igual que hoy.

### Slice 2 — Namespaces y type safety

- Implementar la estructura de namespaces decidida en `TASK-428`.
- Generación de tipos a partir de los dictionaries para autocompletado y detección de keys faltantes.
- Integrar con la capa dictionary-ready que dejó `TASK-265`.

### Slice 3 — Primer locale adicional (proof-of-runtime)

- Activar el primer locale no-`es-CL` decidido por `TASK-428`: `en-US`.
- Traducir el set mínimo: shell navigation labels + CTAs base + empty/error/loading shared.
- Validar en staging que el switch funciona end-to-end.

### Slice 4 — Detection fallback

- Sin persistencia todavía (eso es `TASK-431`), implementar fallback a cookie `gh_locale` + `Accept-Language` header.
- Documentar que la jerarquía completa se cierra con `TASK-431`.

## Out of Scope

- Traducir superficies profundas (módulos, Finance, payroll) — rollout en child tasks posteriores.
- Persistencia de locale por usuario o tenant (eso es `TASK-431`).
- Localization de emails (eso es child task futura del umbrella).
- Multi-currency / Finance display strategy.

## Acceptance Criteria

- [ ] Librería i18n instalada y conectada al App Router sin regresiones en `es-CL`.
- [ ] El locale adicional decidido por TASK-428 (`en-US`) renderiza correctamente el shell, CTAs base y shared states en staging.
- [ ] Type safety de dictionaries detecta keys faltantes en build.
- [ ] Middleware de detección funciona con cookie + `Accept-Language` fallback.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan.
- [ ] Verificación manual en staging con bypass SSO: forzar locale vía cookie y confirmar render.

## Verification

- Tests unitarios para el middleware de detección y el provider.
- Test de integración para confirmar que type safety detecta keys faltantes.
- Verificación manual end-to-end en staging.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_UI_PLATFORM_V1.md` con runtime de i18n operativo.
- [ ] Notificar a `TASK-431` y a child tasks futuras que el runtime está listo para consumo.
- [ ] Actualizar `TASK-266` con estado de activación.

## Open Questions

- Resuelta por TASK-428: no crear `middleware.ts`; si se requiere routing/proxy, componer dentro de `src/proxy.ts` preservando security headers. El portal privado no usa locale prefix por defecto.
- Resuelta por TASK-428: emails usan locale explicito/bridge existente y fallback `es-CL` hasta que `TASK-431` exponga preferencia persistida.
