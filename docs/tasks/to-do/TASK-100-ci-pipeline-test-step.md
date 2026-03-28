# TASK-100 — CI Pipeline: Add Test Step

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Muy bajo` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Infrastructure / CI-CD |
| Sequence | Cloud Posture Hardening **1 of 6** — first to implement, no dependencies |

## Summary

Agregar `pnpm test` al workflow de GitHub Actions. Hoy existen 86 archivos de test con Vitest que no corren en CI — una regresión puede llegar a production sin detección.

## Why This Task Exists

El CI workflow (`.github/workflows/ci.yml`) solo ejecuta:
1. `pnpm install`
2. `pnpm lint`
3. `pnpm build`

Los tests (`pnpm test` → Vitest) **no están incluidos**. Esto significa que los 86 archivos de test son validación local opcional. Una PR puede pasar CI con tests rotos.

## Goal

Que ningún merge a `develop` o `main` pueda ocurrir con tests fallando.

## Dependencies & Impact

- **Depende de:**
  - Ninguna — es la primera task del track de hardening
- **Impacta a:**
  - Todas las tasks futuras — cualquier código nuevo con tests será validado automáticamente
  - TASK-098 (Observability) — instalar Sentry no debe romper tests existentes
  - TASK-099 (Middleware) — el middleware debe pasar lint + build + test
  - TASK-101 (Cron Auth) — tests de cron auth helpers se validan en CI
- **Archivos owned:**
  - `.github/workflows/ci.yml`

## Current Repo State

```yaml
# .github/workflows/ci.yml (extracto actual)
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
  # ← NO HAY STEP DE TEST
```

- **86 test files** en `src/` (Vitest + Testing Library + jsdom)
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

- [ ] `.github/workflows/ci.yml` incluye step `pnpm test`
- [ ] El workflow pasa en un PR de prueba
- [ ] Los 86 archivos de test ejecutan correctamente en CI
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
