# TASK-101 — Cron Auth Standardization

## Delta 2026-03-29

- `TASK-100` ya dejó `pnpm test` gateado en CI, así que los tests del helper `requireCronAuth()` quedarán cubiertos automáticamente una vez que esta task se implemente.

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Diseño` |
| Rank | — |
| Domain | Infrastructure / Security |
| Sequence | Cloud Posture Hardening **4 of 6** — after TASK-098 (observability), connects to TASK-096 |

## Summary

Reemplazar los 18 copy-paste de autenticación de cron con un helper único `requireCronAuth()` que use timing-safe comparison, fail-closed si `CRON_SECRET` no está configurado, y soporte alerting integrado (TASK-098).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- `TASK-101` se interpreta como contrato de auth del control plane de schedulers dentro del dominio Cloud
- la protección debe vivir en helper reutilizable y no en copy-paste por ruta
- el resultado debe endurecer Vercel cron y rutas scheduler-driven sin cambiar la semántica de negocio de cada dominio

## Why This Task Exists

La auditoría de marzo 2026 encontró dos patrones inconsistentes de autenticación en los 18 cron endpoints:

### Pattern A — Loose (11 rutas)
```typescript
// Acepta bearer token OR vercel-cron header
// Si CRON_SECRET está vacío, acepta CUALQUIER request con x-vercel-cron: 1
const hasAccess = bearerToken === secret || vercelCronHeader === '1' || userAgent.startsWith('vercel-cron/')
```

**Rutas:** outbox-publish, sync-previred, webhook-dispatch, ico-materialize, outbox-react, sync-conformed, nubox-sync, exchange-rates/sync, economic-indicators/sync, outbox-react-notify

### Pattern B — Stricter pero inseguro (7 rutas)
```typescript
// Solo bearer token, pero sin timing-safe comparison
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Rutas:** materialization-health, outbox-react-people, outbox-react-finance, services-sync, identity-reconcile, ico-member-sync, outbox-react-org, economics-materialize

### Problemas
1. **Pattern A fail-open**: si `CRON_SECRET` no está configurado, Vercel cron header es suficiente — pero ese header es trivial de falsificar fuera de Vercel
2. **Pattern B timing-unsafe**: comparación directa con `!==` es vulnerable a timing attacks
3. **18 implementaciones copy-paste**: cada ruta reimplementa la lógica
4. **Sin logging**: intentos de acceso no-autorizados no se registran

## Goal

Un único helper que todas las cron routes importen, con seguridad consistente y hook para alerting.

## Dependencies & Impact

- **Depende de:**
  - TASK-098 (Observability) — para integrar `alertCronFailure()` en el catch handler
  - `TASK-122` como boundary institucional del dominio Cloud
  - `timingSafeEqual` de `node:crypto` (ya disponible, usado en webhook signing)
- **Impacta a:**
  - TASK-096 — alineado con el track de security hardening
  - Los 18 cron endpoints — refactor de auth pattern
  - Futuras cron routes — usarán el helper directamente
- **Archivos owned:**
  - `src/lib/cloud/cron.ts`
  - `src/lib/cron/require-cron-auth.ts` (nuevo)
  - `src/app/api/cron/*/route.ts` (refactor — 16 archivos)
  - `src/app/api/finance/economic-indicators/sync/route.ts` (refactor)
  - `src/app/api/finance/exchange-rates/sync/route.ts` (refactor)

## Current Repo State

- `src/lib/webhooks/signing.ts` ya usa `timingSafeEqual` para webhook signatures
- `src/lib/integrations/integration-auth.ts` ya usa `timingSafeEqual` con `safeEquals()`
- Los 18 cron routes tienen auth inline, no centralizado
- `CRON_SECRET` se lee de `process.env` en cada ruta individualmente

## Scope

### Slice 1 — Helper centralizado (~1h)

1. Crear `src/lib/cron/require-cron-auth.ts`:
   ```typescript
   import { timingSafeEqual } from 'node:crypto'
   import { NextResponse } from 'next/server'

   interface CronAuthResult {
     authorized: boolean
     errorResponse: NextResponse | null
   }

   export function requireCronAuth(request: Request): CronAuthResult {
     const secret = process.env.CRON_SECRET?.trim()

     // Fail-closed: si CRON_SECRET no está configurado, rechazar todo
     if (!secret) {
       console.error('[cron-auth] CRON_SECRET not configured — rejecting request')
       return {
         authorized: false,
         errorResponse: NextResponse.json(
           { error: 'Server misconfiguration' },
           { status: 503 }
         ),
       }
     }

     // Extraer bearer token
     const authHeader = request.headers.get('authorization') ?? ''
     const bearerToken = authHeader.startsWith('Bearer ')
       ? authHeader.slice(7).trim()
       : ''

     // Timing-safe comparison
     if (bearerToken && safeEquals(bearerToken, secret)) {
       return { authorized: true, errorResponse: null }
     }

     // Vercel cron header como segundo factor (solo si bearer token no presente)
     const isVercelCron =
       request.headers.get('x-vercel-cron') === '1' ||
       (request.headers.get('user-agent') ?? '').startsWith('vercel-cron/')

     if (isVercelCron) {
       return { authorized: true, errorResponse: null }
     }

     return {
       authorized: false,
       errorResponse: NextResponse.json(
         { error: 'Unauthorized' },
         { status: 401 }
       ),
     }
   }

   function safeEquals(a: string, b: string): boolean {
     if (a.length !== b.length) return false
     try {
       return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
     } catch {
       return false
     }
   }
   ```

### Slice 2 — Migrar las 18 rutas (~1.5h)

Reemplazar el auth inline en cada ruta con:
```typescript
import { requireCronAuth } from '@/lib/cron/require-cron-auth'

export async function GET(request: Request) {
  const { authorized, errorResponse } = requireCronAuth(request)
  if (!authorized) return errorResponse

  // ... lógica del cron
}
```

Rutas a migrar:
1. `/api/cron/outbox-publish`
2. `/api/cron/outbox-react`
3. `/api/cron/outbox-react-people`
4. `/api/cron/outbox-react-finance`
5. `/api/cron/outbox-react-org`
6. `/api/cron/outbox-react-notify`
7. `/api/cron/webhook-dispatch`
8. `/api/cron/sync-conformed`
9. `/api/cron/sync-previred`
10. `/api/cron/ico-materialize`
11. `/api/cron/ico-member-sync`
12. `/api/cron/nubox-sync`
13. `/api/cron/identity-reconcile`
14. `/api/cron/economics-materialize`
15. `/api/cron/materialization-health`
16. `/api/cron/services-sync`
17. `/api/finance/economic-indicators/sync`
18. `/api/finance/exchange-rates/sync`

### Slice 3 — Tests (~30 min)

1. Crear `src/lib/cron/require-cron-auth.test.ts`:
   - Test: rechaza request sin auth header ni vercel-cron
   - Test: acepta bearer token correcto (timing-safe)
   - Test: rechaza bearer token incorrecto
   - Test: acepta vercel-cron header
   - Test: rechaza todo si CRON_SECRET no está configurado (fail-closed)
   - Test: timing-safe — no leak de longitud

## Out of Scope

- Rate limiting por IP en cron routes (overkill — ya están protegidos por bearer token)
- Rotación automática de CRON_SECRET (mejora futura)
- Middleware-level cron auth (las rutas ya tienen el matcher correcto)
- Cambiar CRON_SECRET por HMAC signing (no necesario — son invocaciones internas)

## Acceptance Criteria

- [ ] `requireCronAuth()` helper creado con timing-safe comparison
- [ ] `requireCronAuth()` retorna 503 si CRON_SECRET no está configurado (fail-closed)
- [ ] Las 18 rutas cron migradas al helper
- [ ] Zero lógica de auth inline en rutas cron
- [ ] Tests unitarios para el helper (≥5 casos)
- [ ] Los 18 cron routes responden 401 sin auth y 200 con bearer correcto
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa
- [ ] `pnpm lint` pasa

## Verification

```bash
# Sin auth → 401
curl -s https://dev-greenhouse.efeoncepro.com/api/cron/outbox-publish | jq .error
# → "Unauthorized"

# Con auth → 200
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://dev-greenhouse.efeoncepro.com/api/cron/outbox-publish | jq .

# Tests
pnpm test -- src/lib/cron/require-cron-auth.test.ts
```
