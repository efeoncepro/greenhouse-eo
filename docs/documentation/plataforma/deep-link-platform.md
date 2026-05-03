# Deep Link Platform

> **Dominio:** Plataforma interna
> **Estado:** vigente
> **Última actualización:** 2026-04-30
> **Spec técnica relacionada:** [GREENHOUSE_DEEP_LINK_PLATFORM_V1.md](../../architecture/GREENHOUSE_DEEP_LINK_PLATFORM_V1.md)

## Qué es

Deep Link Platform es la capa compartida que permite que Greenhouse deje de tratar los links internos como strings armados a mano en cada módulo.

En vez de que cada surface construya su propia URL, los callers pueden expresar una referencia semántica, por ejemplo:

- `ops_health`
- `person`
- `quote`
- `income`
- `expense`
- `leave_request`
- `payroll_period`

El runtime la resuelve a:

- `href`
- `absoluteUrl`
- `canonicalPath`
- fallback seguro
- metadata de acceso (`views`, `entitlements`, startup policy o public share)

## Para qué sirve

Esta capability existe para reducir drift entre:

- menú/sidebar
- notificaciones in-app
- emails
- tarjetas de Teams
- API Platform app
- links públicos controlados, como quote share

El beneficio práctico es que Greenhouse puede cambiar o endurecer rutas sin tener que perseguir strings repartidos por todo el repo.

## Qué resuelve hoy

La primera foundation runtime vive en `src/lib/navigation/deep-links/**`.

Definitions activas en este corte:

- `home`
- `ops_health`
- `person`
- `quote`
- `income`
- `expense`
- `leave_request`
- `payroll_period`
- `public_quote_share`

Algunas decisiones importantes del estado actual:

- `home` interno sigue siendo startup-policy-first. No se fuerza un `viewCode` único para toda la surface.
- `person` resuelve a `/people/:memberId`.
- `payroll_period` resuelve a `/hr/payroll/periods/:periodId`.
- `public_quote_share` sigue conviviendo con el carril público de quote share; esta task no lo reemplaza.

## Qué consumers ya lo usan

En este primer slice ya hay adopción real en dos puntos de bajo riesgo:

- `POST /api/admin/teams/test` usa el resolver para construir la URL absoluta de `ops_health` antes de mandarla a Teams.
- `src/lib/webhooks/consumers/notification-mapping.ts` ya resuelve selectivamente algunos `actionUrl` legacy desde referencias semánticas (`person`, `income`, `expense`) sin cambiar el shape visible del payload.

## Cómo convive con el sistema actual

Deep Link Platform no reemplaza todavía todos los links existentes.

Convive con piezas previas que siguen vigentes:

- `VIEW_REGISTRY` como catálogo canónico de surfaces visibles
- `portalHomePath` como contrato de startup/fallback
- `actionUrl` legacy persistido en notificaciones
- builders públicos específicos como `quote-share`

La regla práctica hoy es:

- para links internos nuevos o consumers de bajo riesgo, preferir `resolveGreenhouseDeepLink()`
- para carriles legacy que ya persisten o exponen `actionUrl`, mantener el string derivado mientras termina la convergencia

## Qué no hace todavía

Este slice no hace lo siguiente:

- no reescribe masivamente sidebar o search
- no introduce storage nuevo en base de datos
- no agrega `action_link_json`
- no reemplaza Notification Hub completo
- no migra todo API Platform app
- no reemplaza el sistema público de quote share

## Relación con acceso y permisos

Cada deep link interno debe pensar dos planos cuando aplique:

- `views` / `viewCode` para surfaces visibles, entrypoints, menú y guards
- `entitlements` / capabilities para autorización más fina

En esta primera versión, algunos destinos ya declaran metadata de entitlement real:

- `ops_health` → `platform.health.read`
- `person` → `people.directory`
- `leave_request` → `hr.leave` / `hr.leave_balance` según acción

Otros destinos siguen siendo principalmente `view-first` por ahora:

- `quote`
- `income`
- `expense`
- `payroll_period`

## Qué debería hacer un equipo cuando necesita emitir un link nuevo

Si el destino ya existe en el registry:

1. emitir una referencia semántica
2. resolverla con `resolveGreenhouseDeepLink()`
3. consumir `href` o `absoluteUrl` según audiencia

Si el destino no existe todavía:

1. revisar si realmente corresponde a una surface canónica existente
2. definir explícitamente si vive en plano `views`, `entitlements` o ambos
3. agregar la definition al runtime compartido antes de volver a hardcodear una ruta

## Resumen operativo

Deep Link Platform no es un router nuevo ni un reemplazo de Next.js.

Es una capa de resolución compartida para que Greenhouse pueda:

- linkear por significado y no por string crudo
- mantener coherencia entre surfaces
- producir URLs absolutas por ambiente sin duplicar lógica
- hacer más segura la evolución futura de notificaciones, Teams, Home y API Platform
