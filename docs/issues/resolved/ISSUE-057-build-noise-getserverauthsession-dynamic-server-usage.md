# ISSUE-057 — Build noise: `[DashboardLayout] getServerAuthSession failed: Dynamic server usage`

## Ambiente

`development` (build local) + `preview` Vercel + cualquier ambiente que ejecute `pnpm build`. **No afecta runtime** — el portal funciona correctamente en todos los ambientes.

## Detectado

2026-04-26 — durante validación de gates al cerrar TASK-526 (auto-animate list motion). El output de `pnpm build` mostraba ~10 entradas idénticas tipo:

```
[DashboardLayout] getServerAuthSession failed: Error: Dynamic server usage:
Route /admin/responsibilities couldn't be rendered statically because it
used `headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
```

Una entrada por cada ruta bajo `(dashboard)` (admin/responsibilities, admin/tenants, admin/views, agency/capacity, agency/spaces, finance/economics, settings, sprints, updates, etc.).

## Síntoma

`pnpm build` emite múltiples warnings con prefijo `[DashboardLayout] getServerAuthSession failed:` aunque el build termina con `✓ Compiled successfully`. Los warnings se ven como errores de auth pero no lo son. El portal funciona normalmente en runtime.

## Causa raíz

**No era un error real — era un antipatrón en el handling del `Dynamic server usage` que Next.js 16 emite durante prerender.**

Secuencia técnica:

1. Next.js 16 en build phase intenta **pre-renderizar estáticamente** cada ruta (SSG por default).
2. Llega a `(dashboard)/layout.tsx` y ejecuta el server component.
3. El layout llamaba `getServerAuthSession()` que internamente invoca `headers()` de Next para leer cookies.
4. Next detecta el uso de API dinámica durante prerender → lanza `Dynamic server usage` con `error.digest === 'DYNAMIC_SERVER_USAGE'`.
5. El `try/catch` en el layout intercepta ese error y lo loggea como `console.error('[DashboardLayout] getServerAuthSession failed:', error)`.

El `DYNAMIC_SERVER_USAGE` **NO es error de auth** — es la señal del framework "esta ruta debe ser dynamic, no la prerendericés". El layout debía re-lanzarlo para que Next lo maneje (marcar ruta como dynamic), no tratarlo como error de auth.

Antipatrón presente en 4 server components: `(dashboard)/layout.tsx`, `app/page.tsx`, `auth/landing/page.tsx`, `(blank-layout-pages)/login/page.tsx`. Cada uno con su propia variante de `try/catch + console.error + redirect('/login')`.

## Impacto

- **Build logs ruidosos** — devs y agentes leyendo el output pierden tiempo distinguiendo señal de ruido.
- **Errores reales enmascarados** — si en runtime falla `NEXTAUTH_SECRET` o el provider, el error queda enterrado entre warnings cosméticos del build.
- **Patrón duplicado** — cada layout/page reinventaba try/catch + redirect; ninguna convención canónica.
- **`redirect('/login')` invocado durante build phase** — Next lo ignora silenciosamente (no hay request real), pero acumula confusión sobre qué pasó realmente.
- **CERO impacto en runtime** — el portal siempre funcionó. Solo era ruido de build.

## Solución

Solución robusta y escalable, no patch puntual. 3 capas:

### Capa 1 — Helper canónico nuevo

Archivo: [`src/lib/auth/require-server-session.ts`](../../../src/lib/auth/require-server-session.ts).

- `isDynamicServerUsageError(error)` (interno): detecta el error del framework por `error.digest === 'DYNAMIC_SERVER_USAGE'` o por mensaje. Si lo es, **re-lanza** para que Next lo maneje correctamente.
- `resolveServerSession()` (interno): wrapper que aplica el detector + loggea solo errores reales con prefijo `[auth]`.
- `requireServerSession(redirectTo = '/login')` (export): para layouts/pages que **requieren** auth. Devuelve `Session` non-null o redirige.
- `getOptionalServerSession()` (export): para pages que opcionalmente quieren saber si hay sesión (login, landing). Devuelve `Session | null` sin redirigir.

### Capa 2 — `export const dynamic = 'force-dynamic'` en cada server component que consuma sesión

Le dice a Next "no intentes prerender esta ruta — siempre serverside on-demand". Sin esto, Next intenta prerender en build phase y choca con APIs dinámicas. Aplicado en los 4 archivos migrados.

### Capa 3 — Migración de los 4 server components al patrón canónico

| Archivo | Antes | Después |
| --- | --- | --- |
| `src/app/(dashboard)/layout.tsx` | `getServerAuthSession + try/catch + redirect` | `requireServerSession()` + `force-dynamic` |
| `src/app/page.tsx` | `getServerAuthSession` directo | `getOptionalServerSession()` + `force-dynamic` |
| `src/app/auth/landing/page.tsx` | `getServerAuthSession` directo | `getOptionalServerSession()` + `force-dynamic` |
| `src/app/(blank-layout-pages)/login/page.tsx` | `getServerAuthSession` directo | `getOptionalServerSession()` + `force-dynamic` |

### Capa 4 — Convención canónica documentada

- `CLAUDE.md` actualizado con sección "Auth en server components / layouts / pages — patrón canónico" que prohíbe explícitamente el antipatrón viejo y exige los helpers canónicos.
- Doc de arquitectura nuevo: [`GREENHOUSE_AUTH_SERVER_SESSION_V1.md`](../../architecture/GREENHOUSE_AUTH_SERVER_SESSION_V1.md) — 13 secciones cubriendo principios, patrón canónico, antipatrón prohibido, sinergias, guía de extensión, validación.
- API routes (`route.ts`) explícitamente excluidas del scope — siguen usando `getServerAuthSession` directo (son siempre dynamic + 401 JSON, no redirect).

## Verificación

Comparativa antes/después de `pnpm build`:

| Métrica | Antes | Después |
| --- | --- | --- |
| `[DashboardLayout] getServerAuthSession failed:` warnings | ~10 | **0** |
| `Dynamic server usage` warnings en cualquier contexto | ~10 | **0** |
| `[auth] requireServerSession failed:` (errores reales) | n/a | **0** (no hay errores reales) |
| Build status | ✓ Compiled successfully | ✓ Compiled successfully |
| Build duration | 18.0s | 18.0s |
| `npx tsc --noEmit` errors | 0 | 0 |
| `pnpm lint` errors | 0 | 0 |
| `pnpm test --run` | 2177 passed, 2 skipped | 2177 passed, 2 skipped |

Comandos de validación canónicos (también documentados en `GREENHOUSE_AUTH_SERVER_SESSION_V1.md` sección 10):

```bash
# 1. Buscar antipatrones residuales en server components/pages/layouts
grep -rln "getServerAuthSession" src/app --include="*.tsx" | xargs grep -l "try {" 2>/dev/null
# Debe devolver vacío.

# 2. Buscar layouts/pages que consumen session sin force-dynamic
grep -rln "requireServerSession\|getOptionalServerSession" src/app --include="*.tsx" \
  | xargs grep -L "force-dynamic" 2>/dev/null
# Debe devolver vacío.

# 3. Validar que pnpm build no emite warnings de DYNAMIC_SERVER_USAGE en auth context
pnpm build 2>&1 | grep -c "DashboardLayout.*getServerAuthSession failed"
# Debe devolver 0.
```

Los 3 comandos devuelven el resultado esperado en `develop` post-resolución.

## Estado

`resolved`

Resuelto el 2026-04-26 con commit `9b74f109` en `develop`. Push a origin/develop confirmado.

## Relacionado

- Detectado durante el cierre de [TASK-526](../../tasks/complete/TASK-526-auto-animate-list-motion.md) (Slice 2 de TASK-642 Motion Polish Program).
- Doc de arquitectura: [GREENHOUSE_AUTH_SERVER_SESSION_V1.md](../../architecture/GREENHOUSE_AUTH_SERVER_SESSION_V1.md).
- Convención en CLAUDE.md sección "Auth en server components / layouts / pages — patrón canónico".
- Sinergia con [TASK-516](../../tasks/to-do/TASK-516-nextauth-v4-to-authjs-v5.md) (NextAuth v4 → Auth.js v5): el helper canónico aísla los call sites; cuando se ejecute v5 migration, cambiar la API es 1 archivo (`require-server-session.ts`) en lugar de N.
- Sinergia con [TASK-525](../../tasks/complete/TASK-525-view-transitions-api-rollout.md) y [TASK-525.1](../../tasks/to-do/TASK-525.1-view-transitions-tier-1-expansion.md): coexisten sin interferir.
