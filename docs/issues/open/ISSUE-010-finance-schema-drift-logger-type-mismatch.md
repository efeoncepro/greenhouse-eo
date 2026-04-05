# ISSUE-010 — Finance schema drift logger receives `unknown` instead of `Error`

## Ambiente

staging + production (TypeScript strict mode, no runtime crash — silently cast)

## Detectado

2026-04-05, durante `tsc --noEmit` en sesión de hardening de identidad

## Síntoma

`npx tsc --noEmit` reporta 4 errores TS2345 en rutas de finance:

```
src/app/api/finance/hes/route.ts(55,36): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Error'.
src/app/api/finance/intelligence/operational-pl/route.ts(33,47): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Error'.
src/app/api/finance/purchase-orders/route.ts(54,48): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Error'.
src/app/api/finance/quotes/route.ts(88,39): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Error'.
```

Todas las rutas pasan el `catch (error)` (tipo `unknown`) directamente a `logFinanceSchemaDrift()` que firma su parámetro como `Error`.

## Causa raíz

`logFinanceSchemaDrift()` declara su segundo parámetro como `Error`, pero los catch blocks en TypeScript 5.9 strict tipan `error` como `unknown`. Las 4 rutas no hacen el cast `error as Error` ni guardia `instanceof Error`.

## Impacto

- **Build**: no bloquea (`pnpm build` usa Next.js que ignora errores TS no fatales en rutas), pero contamina el output de `tsc --noEmit`
- **Runtime**: sin impacto — JavaScript no valida tipos en runtime, `logFinanceSchemaDrift` recibe el error correctamente
- **DX**: 4 errores permanentes en type-check dificultan detectar errores nuevos reales

## Solución

Opción A (preferida): cambiar la firma de `logFinanceSchemaDrift` para aceptar `unknown`:
```typescript
export const logFinanceSchemaDrift = (context: string, error: unknown) => { ... }
```

Opción B: agregar cast en cada call-site:
```typescript
logFinanceSchemaDrift('hes', error instanceof Error ? error : new Error(String(error)))
```

## Verificación

`npx tsc --noEmit 2>&1 | grep TS2345` debe retornar 0 resultados después del fix.

## Estado

open

## Relacionado

- ISSUE-008 — Finance routes mask schema drift as empty success (resuelto, introdujo `logFinanceSchemaDrift`)
- Archivos afectados:
  - `src/app/api/finance/hes/route.ts:55`
  - `src/app/api/finance/intelligence/operational-pl/route.ts:33`
  - `src/app/api/finance/purchase-orders/route.ts:54`
  - `src/app/api/finance/quotes/route.ts:88`
