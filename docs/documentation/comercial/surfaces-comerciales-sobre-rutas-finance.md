# Surfaces comerciales sobre rutas legacy Finance

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-07 por Codex (TASK-556)
> **Documentacion tecnica:** [GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md), [GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md)

## Que cambio

Greenhouse trata estas vistas como surfaces del dominio **Comercial**, aunque sus URLs sigan usando temporalmente `/finance/...`:

- Cotizaciones: `/finance/quotes`
- Contratos y SOW: `/finance/contracts`
- Acuerdos marco / MSA: `/finance/master-agreements`
- Productos vendibles: `/finance/products`

La URL legacy se conserva para no romper links, bookmarks, deep links, tests ni integraciones existentes. El owner funcional, la navegacion y el access model ya son comerciales.

## Como se autoriza

El access model se separa en tres planos:

- `routeGroups`: el carril operativo es `commercial`; `finance` sigue compatible durante la transicion.
- `views`: las surfaces visibles usan `comercial.cotizaciones`, `comercial.contratos`, `comercial.sow`, `comercial.acuerdos_marco` y `comercial.productos`.
- `entitlements`: las acciones finas usan capabilities `commercial.*`.

Las APIs legacy que sirven estas surfaces usan guard comercial compatible, no guard finance-only. Los permisos finos existentes siguen intactos: costos internos, overrides de costo y administracion de pricing continuan restringidos a roles autorizados.

## SOW

SOW pertenece a Comercial, pero en este corte no tiene una ruta propia. Vive agrupado bajo **Contratos** porque el runtime actual modela el alcance vendido y la cadena documental dentro de `/finance/contracts`.

No se debe inventar `/commercial/sow` ni `/finance/sow` hasta que exista una task de normalizacion de URLs.

## Que no cambio

- No se movieron APIs a `/api/commercial/...`.
- No se renombraron las rutas legacy.
- No se crearon entitlements nuevos.
- No se cambio startup policy.
- Finanzas sigue consumiendo cotizaciones, contratos, MSA y productos cuando necesita aprobaciones, margen, rentabilidad, FX, document chain o quote-to-cash.

## Regla operativa

Cuando una nueva mejora toque cotizaciones, contratos, SOW, MSA o productos vendibles, debe partir desde el dominio `Comercial` aunque el archivo o path todavia viva bajo `finance`.
