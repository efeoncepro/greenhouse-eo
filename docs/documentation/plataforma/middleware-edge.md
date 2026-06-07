> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-06 por Claude (Opus 4.8)
> **Ultima actualizacion:** 2026-06-06 por Claude (Opus 4.8)
> **Documentacion tecnica:** `middleware.ts`, `src/config/maintenance.ts`, `project_context.md` (Delta 2026-06-06)

# Middleware Edge de Greenhouse

## Que es

El **middleware** de Next.js es un archivo unico y reservado por el framework
(`middleware.ts` en la raiz) que corre en el **Edge runtime**, **antes** de que un
request llegue a cualquier ruta, pagina o API. Puede reescribir, redirigir, poner
headers/cookies o bloquear el request. Next.js permite **uno solo por proyecto** —
es un singleton del framework.

Es distinto del resto de "middleware" que existe en el repo en el sentido general:
los guards por ruta (`requireServerSession`, `requireAdminTenantContext`, `can()`),
NextAuth, los wrappers de Cloud Run (`wrapCronHandler`) o los consumers reactivos
**no** son middleware de Next.js — corren **dentro** de cada handler, no en el edge
antes del routing. Este `middleware.ts` es la primera (y unica) capa edge-global del
repo.

## Para que se usa hoy

Una sola responsabilidad: el **gate de mantenimiento** (ver
`pagina-mantenimiento.md` y el manual `modo-mantenimiento.md`). Por defecto esta
apagado; cuando se enciende, intercepta todo el trafico y muestra `/maintenance`.

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

## Que NO conviene meterle (limites del edge)

- **Nada de DB/IO por request** (ni PostgreSQL, ni BigQuery, ni llamadas pesadas).
  Corre en cada request → debe ser O(1). Lecturas de datos, sesion completa y
  autorizacion fina siguen en los **guards por ruta**, no aca.
- **Auth/autorizacion de negocio compleja**: el edge hace gating grueso (pasa / no
  pasa), no reglas por rol/tenant. Eso ya vive bien en `requireServerSession`,
  `can()`, etc.
- **Logica de dominio**: cero. Es plomeria de transporte.
- **APIs solo-Node**: corre en Edge runtime (Web APIs); no `fs`, no `crypto` de Node.

## Como se extiende (sin romperlo)

1. **No crear un segundo middleware** — el framework no lo permite. Toda logica
   edge-global nueva se agrega a este mismo archivo.
2. **Una funcion por responsabilidad**, encadenadas, cada una con su config SSOT en
   `src/config/`. Forma esperada:
   ```ts
   export function middleware(req) {
     return runMaintenanceGate(req)
       ?? runGeoRouting(req)
       ?? runSecurityHeaders(req)
       ?? NextResponse.next()
   }
   ```
3. **Default OFF + fail-open**: cada responsabilidad nueva debe poder apagarse y, ante
   cualquier error, degradar a `NextResponse.next()` — nunca tumbar el portal.
4. **Matcher acotado** reutilizable (ya excluye `_next`, estaticos, favicon).

> Detalle tecnico y reglas duras: `project_context.md` → Delta 2026-06-06
> "Maintenance gate + primer middleware del repo".
