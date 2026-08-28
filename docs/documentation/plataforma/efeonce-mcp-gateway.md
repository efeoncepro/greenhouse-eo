# Efeonce MCP Gateway

> **Tipo de documento:** Documentación funcional
> **Estado:** operativo internal-only
> **Documentación técnica:** [ADR de plataforma MCP](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
> **Operación:** [runbook](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md)

## Qué es

Efeonce MCP Gateway es el punto de acceso federado para que un cliente MCP use capacidades de productos Efeonce
mediante una URL estable: `https://mcp.efeonce.org/mcp`. No vive en Greenhouse ni Globe: es un servicio
independiente que autentica al cliente y delega cada lectura al producto dueño.

La primera capacidad activa fue `globe.producer.fleet.list`. Permite consultar las rutas de modelos disponibles de
Globe para el workspace interno autorizado. El gateway no recrea catálogo, routing ni reglas de Globe.

Desde el 6 de agosto de 2026 hay una **segunda capacidad federada**: Search Visibility 360 de Greenhouse. Partió
con tres consultas de solo lectura y creció hasta cubrir **el inventario SEO completo del MCP interno: 22 tools
(17 lecturas + 5 escrituras gobernadas)** — TASK-1658 cerró el drift de federación dejándolo en 21 el 27 de
agosto, y TASK-1696 sumó la lectura 17, `get_seo_provider_spend`. La revisión productiva del gateway
(`efeonce-mcp-gateway-00023-zt2`, desplegada el 27 de agosto) sirve **21**: la tool 22 espera el deploy posterior
al próximo release develop→main de Greenhouse, porque su lane todavía no está en producción. Igual que con Globe, el gateway no recrea
lógica: transporta la pregunta y Greenhouse decide qué se puede ver. El inventario vigente y su estado de
despliegue viven en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-read-only.md) §8; detalle
funcional en [Search Visibility 360 por MCP](../growth/search-visibility-360-por-mcp.md).

## Cómo se comporta

1. El cliente MCP se autentica con OAuth de Microsoft Entra y el resource canónico del gateway.
2. El gateway valida issuer, audience y scope antes de despachar una tool.
3. Para Globe obtiene una identidad de workload y llama el reader canónico de Globe.
4. Globe deriva el workspace desde la identidad de servicio; el cliente no puede escoger otro workspace.
5. La respuesta entrega disponibilidad de rutas y un correlation ID para observabilidad.

El gateway rechaza requests anónimos. Un provider con problemas falla cerrado y devuelve un error sanitizado, sin
filtrar credenciales ni detalles internos.

## Qué está disponible y qué no

Disponible hoy:

- `globe.capabilities.list` para discovery.
- `globe.producer.fleet.list` para disponibilidad de rutas de Globe.
- las tools SEO de Search Visibility 360 de Greenhouse: las lecturas (`get_seo_*`) bajo el permiso base de
  conexión — no configuran mediciones, no disparan capturas ni gastan presupuesto de proveedor — y las cinco
  escrituras gobernadas bajo un permiso de escritura propio (`efeonce.mcp.seo.write`) que NO está cableado al
  cliente público: hoy responden fail-closed. Cada tool queda acotada por el módulo SEO asignado a la
  organización. Inventario exacto en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-read-only.md) §8.

No disponible:

- crear ejecuciones, usar créditos, subir/leer assets, revisar, aprobar, entregar o publicar creatividad;
- costos de proveedor, márgenes, house, provider slug o selección de workspace;
- acceso self-service de clientes o multitenant.

`Bajo`, `Estándar` y `Premium` son orientación pública de consumo; no son costos de proveedor.

## Alcance de acceso

El servicio está operativo sólo para el tenant interno de Entra. La autorización de Globe usa un principal con
una capability de lectura y un binding de workspace exacto. Esto evita que una conexión MCP sea un bypass de
los permisos de Globe.

El gateway maneja cinco permisos: el permiso base de conexión, el permiso de lectura de Globe, el permiso de
escritura interna para el fondeo de créditos, el permiso de escritura SEO (`efeonce.mcp.seo.write`) y el permiso
de lectura de Hiring — cada permiso condicionado sólo se publica cuando su interruptor está encendido (detalle en
el ADR de plataforma MCP).

Antes de entregar acceso a clientes, Efeonce debe implementar entitlements por tenant/capability y demostrar una
identidad que reciba sólo el permiso base cuando no tiene Globe. Al cliente Entra interno actual se le entregan
hoy los dos primeros permisos —el base y el de lectura de Globe— incluso si pide sólo el base; por eso no
representa aún una prueba válida de segmentación comercial. El permiso de escritura tiene su propia autorización
aparte y no forma parte de lo comprobado en ese comportamiento.

## Relación con otros MCP

Este gateway no reemplaza el MCP read-only local/remoto de Greenhouse. Ese MCP sirve al portal Greenhouse y sus
contratos ecosystem; Efeonce MCP Gateway sirve como borde federado para productos hermanos y capacidades futuras.
