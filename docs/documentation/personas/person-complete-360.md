> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-07 por Claude (TASK-273)
> **Ultima actualizacion:** 2026-04-07
> **Documentacion tecnica:** [GREENHOUSE_PERSON_COMPLETE_360_V1.md](../../architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md)

# Person Complete 360 — Datos completos de una persona

## Que es

Person Complete 360 es el sistema que consolida toda la informacion de una persona en Greenhouse bajo un solo punto de acceso. En lugar de consultar multiples fuentes por separado (identidad, equipos, permisos, nomina, delivery), cualquier vista del portal puede pedir exactamente los datos que necesita de una sola vez.

## Para que sirve

| Vista del portal | Antes | Ahora |
|-----------------|-------|-------|
| Mi Perfil | 4 llamadas separadas (perfil, asignaciones, leave, colegas) | 1 llamada: `identity + assignments + leave + organization` |
| Admin > Detalle de usuario | 6+ queries manuales a tablas distintas | 1 llamada con todas las facetas |
| People > Detalle de persona | Queries ad-hoc por dominio | 1 llamada seleccionando facetas |

## Facetas disponibles

Cada "faceta" es un bloque de datos independiente que se puede solicitar o no:

| Faceta | Que contiene | Quien puede verla |
|--------|-------------|-------------------|
| **identity** | Nombre, email, avatar, cargo, departamento, sistemas vinculados | Cualquier usuario autenticado |
| **assignments** | Clientes asignados, FTE, horario, equipo de cada espacio | Misma organizacion o admin |
| **organization** | Membresias organizacionales, organizacion primaria | Cualquier usuario autenticado |
| **leave** | Saldos de vacaciones, solicitudes recientes, resumen | Solo el propio usuario, HR o admin |
| **payroll** | Compensacion actual, ultimo recibo, historial salarial | Solo el propio usuario o admin |
| **delivery** | Metricas ICO, proyectos, tareas activas, CRM | Misma organizacion o admin |
| **costs** | Costo cargado, overhead, asignaciones por cliente | Solo admin o finanzas |
| **staffAug** | Placements de staff augmentation | Solo admin |

## Como funciona la autorizacion

El sistema decide automaticamente que facetas mostrar segun:

1. **Si es tu propio perfil** — ves todo
2. **Si eres admin** — ves todo de cualquier persona
3. **Si eres colega de la misma organizacion** — ves identidad, asignaciones, organizacion y delivery
4. **Si eres HR manager** — ves todo excepto costos
5. **Si eres de otra organizacion** — solo ves identidad (con telefono oculto)
6. **Si eres cliente** — solo ves identidad, asignaciones y delivery de los miembros asignados

Los campos sensibles (como salario base) se ocultan automaticamente cuando no tienes permiso — no se deniega la faceta entera, solo los campos confidenciales.

## Cache inteligente

Cada faceta tiene su propia duracion de cache:

- **Identity** — 5 minutos (cambia poco)
- **Leave** — 2 minutos (las solicitudes pueden cambiar rapido)
- **Payroll** — 1 hora (cambia mensualmente)
- **Delivery** — 5 minutos (metricas actualizadas frecuentemente)

Si los datos estan en cache, se retornan instantaneamente. Si estan un poco antiguos ("stale"), se retornan inmediatamente y se refrescan en segundo plano.

Cuando ocurre un evento relevante (nueva solicitud de permiso, cambio de asignacion), el cache se invalida automaticamente.

## Consultas historicas

Algunas facetas permiten consultar datos de un periodo especifico:

- **Nomina de marzo** — `?asOf=2026-03-15&facets=payroll`
- **Costos del mes pasado** — `?asOf=2026-03-01&facets=costs`
- **Asignaciones activas en una fecha** — `?asOf=2026-02-15&facets=assignments`

## Endpoint

```
GET /api/person/{id}/360?facets=identity,assignments,leave
```

El `{id}` puede ser:
- El ID de perfil (`identity-...`)
- El ID de miembro (`julio-reyes`)
- El ID de usuario (`user-efeonce-...`)
- El EO-ID (`EO-ID0001`)
- La palabra `me` (para tu propio perfil)

> Detalle tecnico: ver [GREENHOUSE_PERSON_COMPLETE_360_V1.md](../../architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md) para schemas, tablas fuente, autorizacion detallada, y contrato del API.
