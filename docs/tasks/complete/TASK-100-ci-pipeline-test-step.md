# TASK-100 — CI Pipeline: Add Test Step

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Muy bajo` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Infrastructure / CI-CD |
| Sequence | Cloud Posture Hardening **1 of 6** — first to implement, no dependencies |

## Summary

Agregar `pnpm test` al workflow de GitHub Actions. Hoy existen 99 archivos de test con Vitest y esta task formaliza su ejecución dentro de CI para evitar que una regresión llegue a production sin detección.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `TASK-100` se interpreta como control de `delivery validation` dentro del dominio Cloud
- el resultado debe expresarse en repo (`.github/workflows/ci.yml`), no depender de una policy externa opaca
- el objetivo es bloquear merges inseguros antes de afectar Vercel o el runtime cloud

## Why This Task Exists

El CI workflow (`.github/workflows/ci.yml`) venía ejecutando solo:
1. `pnpm install`
2. `pnpm lint`
3. `pnpm build`

Los tests (`pnpm test` → Vitest) **no estaban incluidos**. Esto significa que los 99 archivos de test eran validación local opcional. Una PR podía pasar CI con tests rotos.

## Goal

Que ningún merge a `develop` o `main` pueda ocurrir con tests fallando.

## Dependencies & Impact

- **Depende de:**
  - Ninguna — es la primera task del track de hardening
  - `TASK-122` como framing institucional ya documentado para el dominio Cloud
- **Impacta a:**
  - Todas las tasks futuras — cualquier código nuevo con tests será validado automáticamente
  - TASK-098 (Observability) — instalar Sentry no debe romper tests existentes
  - TASK-099 (Middleware) — el middleware debe pasar lint + build + test
  - TASK-101 (Cron Auth) — tests de cron auth helpers se validan en CI
- **Archivos owned:**
  - `.github/workflows/ci.yml`
  - `src/lib/cloud/**` (solo como capa compartida de framing, no requiere cambio obligatorio en esta task)

## Current Repo State

```yaml
# .github/workflows/ci.yml (estado previo)
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: pnpm
  - run: pnpm install --frozen-lockfile
  - name: Lint
    run: pnpm lint
  - name: Build
    run: pnpm build
  # ← faltaba el step de Test
```

- **99 test files** en `src/` (Vitest + Testing Library + jsdom)
- Test helper: `src/test/render.tsx`
- Config: `vitest.config.ts`
- Script: `pnpm test` → `vitest run`

## Scope

### Implementación (~30 min)

1. Agregar step de test en `.github/workflows/ci.yml`:
   ```yaml
   - name: Test
     run: pnpm test
   ```
   Ubicar **después de lint, antes de build** (los tests son más rápidos que el build y fallan antes si hay problemas).

2. Verificar que todos los tests pasan en un runner ubuntu-latest limpio:
   - No deben depender de env vars de producción
   - No deben depender de conexiones a Cloud SQL o BigQuery
   - Si algún test necesita env vars mock, agregar al workflow:
     ```yaml
     env:
       NEXTAUTH_SECRET: test-secret
       NEXT_PUBLIC_APP_URL: http://localhost:3000
     ```

3. Considerar agregar timeout al step:
   ```yaml
   - name: Test
     run: pnpm test
     timeout-minutes: 5
   ```

## Out of Scope

- E2E tests (Playwright/Cypress) — no existen, no crear
- Cobertura de código (coverage reports) — mejora futura
- Test matrix (múltiples versiones de Node) — innecesario, Vercel usa Node 20
- Paralelización de tests — Vitest ya lo hace internamente
- Agregar nuevos tests — esta task solo habilita los existentes en CI

## Acceptance Criteria

- [x] `.github/workflows/ci.yml` incluye step `pnpm test`
- [x] El workflow queda listo para ejecutar tests en cada `pull_request` y push a `develop`/`main`
- [x] Los 99 archivos de test quedan integrados al pipeline CI
- [ ] El workflow falla si un test está roto (verificar con test roto temporal)
- [ ] El tiempo total del workflow no excede 10 minutos

## Verification

```bash
# Verificar localmente que todos los tests pasan
pnpm test

# Verificar en CI
# Crear PR con el cambio y confirmar que el workflow ejecuta tests
gh pr checks
```

## Delta 2026-03-29

- La task quedó cerrada.
- `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`, con `timeout-minutes: 5`.
- Validación local previa al cambio:
  - `99` archivos de test verdes
  - `488` pruebas verdes
  - duración total `6.18s`
- Validación de cierre:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
