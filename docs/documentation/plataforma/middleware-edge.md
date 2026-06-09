> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-06-06 por Claude (Opus 4.8)
> **Ultima actualizacion:** 2026-06-07 por Codex
> **Documentacion tecnica:** `src/proxy.ts`, `src/config/maintenance.ts`, `project_context.md` (Delta 2026-06-07)

# Proxy Global de Greenhouse

## Que es

El **Proxy** de Next.js es un archivo unico y reservado por el framework
(`src/proxy.ts` en Greenhouse) que corre **antes** de que un request llegue a
cualquier ruta, pagina o API. Puede reescribir, redirigir, poner headers/cookies o
bloquear el request. Next.js 16 reemplazo la convencion `middleware.ts` por
`proxy.ts`; Greenhouse usa esa convencion canonica y permite **un solo entrypoint
global por proyecto**.

Es distinto del resto de "middleware" que existe en el repo en el sentido general:
los guards por ruta (`requireServerSession`, `requireAdminTenantContext`, `can()`),
NextAuth, los wrappers de Cloud Run (`wrapCronHandler`) o los consumers reactivos
**no** son Proxy de Next.js — corren **dentro** de cada handler, no en la capa
previa al routing. `src/proxy.ts` es la capa global canonica del repo.

## Para que se usa hoy

Dos responsabilidades transversales, encadenadas en el mismo archivo:

- **Security headers globales**: baseline CSP report-only, HSTS en produccion y
  headers de navegador.
- **Gate de mantenimiento**: ver `pagina-mantenimiento.md` y el manual
  `modo-mantenimiento.md`. Por defecto esta apagado; cuando se enciende,
  intercepta todo el trafico permitido por el matcher y muestra `/maintenance`.

## Para que MAS se puede usar

El archivo es de proposito general. Es el lugar canonico para cualquier logica que
deba correr en **cada request, antes** del routing, y que sea **barata** (O(1)).
Casos que encajan bien:

- **Geo / locale routing**: detectar idioma o pais y redirigir/cookie (complementa el
  `getLocale()` que hoy resuelve por ruta).
- **Rate limiting / escudo anti-abuso** en el edge (con un store edge, no PostgreSQL).
- **A/B testing y rollouts por cookie**: asignar variante antes del render.
- **Bloqueo por bot / IP / pais**, allow/deny lists.
- **Security headers globales** (CSP, HSTS, `X-Frame-Options`) en un solo lugar.
- **Redirects masivos** legacy → URL canonica sin tocar cada pagina.
- **Kill-switches / gates adicionales** siguiendo el mismo patron del mantenimiento.

## Que NO conviene meterle (limites de la capa global)

- **Nada de DB/IO por request** (ni PostgreSQL, ni BigQuery, ni llamadas pesadas).
  Corre en cada request → debe ser O(1). Lecturas de datos, sesion completa y
  autorizacion fina siguen en los **guards por ruta**, no aca.
- **Auth/autorizacion de negocio compleja**: el edge hace gating grueso (pasa / no
  pasa), no reglas por rol/tenant. Eso ya vive bien en `requireServerSession`,
  `can()`, etc.
- **Logica de dominio**: cero. Es plomeria de transporte.
- **Logica dependiente de estado mutable remoto**: aunque Proxy usa runtime Node.js
  por defecto en Next.js 16, esta capa corre para muchisimos requests. Mantenerla
  barata, deterministica y fail-open sigue siendo obligatorio.

## Como se extiende (sin romperlo)

1. **No crear `middleware.ts` ni un segundo proxy** — el framework tiene un solo
   entrypoint global. Toda logica request-global nueva se agrega a `src/proxy.ts`.
2. **Una funcion por responsabilidad**, encadenadas, cada una con su config SSOT en
   `src/config/`. Forma esperada:
   ```ts
   export function proxy(req) {
     const response = runMaintenanceGate(req)
       ?? runGeoRouting(req)
       ?? NextResponse.next()

     return applySecurityHeaders(response)
   }
   ```
3. **Default OFF + fail-open**: cada responsabilidad nueva debe poder apagarse y, ante
   cualquier error, degradar a `NextResponse.next()` — nunca tumbar el portal.
4. **Matcher acotado** reutilizable (ya excluye `_next`, estaticos, favicon,
   sitemap y robots).

> Detalle tecnico y reglas duras: `project_context.md` → Delta 2026-06-07
> "Vercel staging failure por doble entrypoint global".
