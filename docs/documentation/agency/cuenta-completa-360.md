> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-07 por Claude (TASK-274)
> **Ultima actualizacion:** 2026-04-07 por Claude (TASK-274)
> **Documentacion tecnica:** [Account Complete 360 Architecture](../../architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md)

# Account Complete 360 — Datos completos de una cuenta u organizacion

## Que es

Account Complete 360 es el sistema que consolida toda la informacion de una organizacion o cuenta en Greenhouse bajo un solo punto de acceso. En lugar de consultar multiples fuentes por separado (datos de la empresa, espacios, equipo, finanzas, delivery), cualquier vista del portal puede pedir exactamente los datos que necesita de una sola vez.

Es el equivalente organizacional de [Person Complete 360](../personas/person-complete-360.md), que hace lo mismo para personas individuales. Ambos comparten la misma infraestructura de cache y el mismo patron de facetas on-demand.

## Para que sirve

| Vista del portal | Antes | Ahora |
|-----------------|-------|-------|
| Admin > Detalle de cuenta | 6+ queries a tablas distintas | 1 llamada: `identity + spaces + team + economics` |
| Ficha de cliente | Queries ad-hoc por dominio | 1 llamada seleccionando facetas |
| Vista de operaciones | Consultas manuales a delivery + equipo | 1 llamada: `delivery + team + services` |

## Facetas disponibles

Cada "faceta" es un bloque de datos independiente que se puede solicitar o no:

| Faceta | Que contiene | Ejemplo de uso |
|--------|-------------|----------------|
| **identity** | Nombre de la organizacion, RUT, tipo, estado, logo | Encabezado de ficha de cliente |
| **spaces** | Espacios activos de la organizacion y su configuracion | Vista de espacios asignados |
| **team** | Personas vinculadas a la organizacion y sus roles | Directorio del equipo en la cuenta |
| **economics** | Resumen financiero: margenes, costos, atribucion de P&L | Dashboard ejecutivo de rentabilidad |
| **delivery** | Metricas ICO, proyectos activos, sprints | Panel de delivery operativo |
| **finance** | Ingresos facturados, gastos registrados, indicadores | Modulo de finanzas por cuenta |
| **crm** | Datos de HubSpot: empresa, deals, actividad comercial | Vista CRM integrada |
| **services** | Modulos de servicio contratados por el cliente | Catalogo de servicios activos |
| **staffAug** | Placements de staff augmentation activos | Gestion de dotacion externa |

## Como se usa

### Consulta individual

```
GET /api/organization/{id}/360?facets=identity,spaces,team
```

El `{id}` puede ser el ID interno de la organizacion o su ID publico. Se pueden pedir una o varias facetas separadas por coma. Si no se especifica, se retorna solo `identity`.

Parametros opcionales:
- `asOf` — consultar datos en una fecha especifica (ej: `?asOf=2026-03-01`)
- `cache=bypass` — forzar datos frescos ignorando cache

### Consulta masiva

```
POST /api/organizations/360
Body: { "organizationIds": ["org-001", "org-002"], "facets": ["identity", "spaces"] }
```

Permite consultar hasta 50 organizaciones en una sola llamada. La autorizacion se aplica individualmente por cada organizacion.

## Autorizacion

El sistema decide automaticamente que facetas mostrar segun el rol y la relacion del usuario con la organizacion:

| Quien consulta | Que puede ver |
|----------------|---------------|
| **Admin (efeonce_admin)** | Todas las facetas, sin restricciones |
| **Operaciones (efeonce_operations)** | Todo excepto `finance` |
| **Finance manager** | identity, spaces, economics, finance |
| **Ejecutivo de cuenta** | identity, spaces, team, delivery, crm, services |
| **Colaborador interno** | identity, spaces |
| **Cliente (misma organizacion)** | identity, spaces, team, delivery, services |
| **Otra organizacion** | Solo identity (con RUT oculto) |

Los campos sensibles se ocultan automaticamente segun el nivel de acceso — no se deniega la faceta entera, solo los campos confidenciales.

## Cache inteligente

Cada faceta tiene su propia duracion de cache:

| Faceta | Duracion |
|--------|----------|
| identity, spaces, finance, crm, services, staffAug | 10 minutos |
| team, economics, delivery | 5 minutos |

Si los datos estan en cache, se retornan instantaneamente. Si estan un poco antiguos ("stale"), se retornan de inmediato y se refrescan en segundo plano.

Cuando ocurre un evento relevante (nueva membresia, cambio de servicio, factura registrada), el cache de las facetas afectadas se invalida automaticamente via el sistema de outbox.

## Relacion con Person 360

Account Complete 360 y [Person Complete 360](../personas/person-complete-360.md) son sistemas gemelos:

- **Person 360** resuelve la identidad de una persona y despliega sus facetas individuales (nomina, leave, costos)
- **Account 360** resuelve la identidad de una organizacion y despliega sus facetas organizacionales (espacios, equipo, finanzas)

Ambos comparten la misma infraestructura de cache en memoria, el mismo patron de autorizacion por faceta, y el mismo formato de metadatos (`_meta`) con timing y estado de cache por faceta.

> Detalle tecnico: ver [GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md](../../architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md) para schemas, tablas fuente, matriz de autorizacion completa, invalidacion de cache por evento, y contrato del API.
