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
con tres consultas de solo lectura y creció hasta federar **28 tools SEO** (al 2026-08-31). ⚠️ Federado e interno NO son el mismo conjunto por construcción —el gateway resuelve contra rutas HTTP del lane—: `get_seo_work_queue` existe adentro y está excluida con razón, y `get_seo_provider_spend` está federada sin contraparte interna. Desde el 28 de agosto de 2026 esas 27 están **efectivamente
desplegadas** en la revisión productiva del gateway (`efeonce-mcp-gateway-00028-pmx`, desde el 2026-09-02; antes `00026-ctp` del 2026-09-01 y `00024-8b8`), que reemplazó a la del 27
de agosto (servía 21). Ya no queda ninguna tool esperando despliegue. Igual que con Globe, el gateway no recrea
lógica: transporta la pregunta y Greenhouse decide qué se puede ver. El inventario vigente y su estado de
despliegue viven en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-tool-inventory.md) §8; detalle
funcional en [Search Visibility 360 por MCP](../growth/search-visibility-360-por-mcp.md).

Desde el 2 de septiembre de 2026 hay una **tercera capacidad federada**, y no es de dominio: los **manuales de uso**
de la superficie Greenhouse (`TASK-1804`). El provider `greenhouse-skills` expone una sola tool,
`get_greenhouse_skill` (anotada `readOnlyHint: true`; sin `name` devuelve el catálogo, con `name` el manual como
texto), y delega cada llamada a la lane `GET /api/platform/ecosystem/mcp/skills[/{name}]` de Greenhouse. No embebe
contenido: si Greenhouse cambia un manual, el gateway lo sirve sin redeploy. Comparte interruptor e identidad con el
provider SEO (`GREENHOUSE_SEO_PROVIDER_ENABLED`, mismo consumer token) y no agregó permisos en Entra: basta el
permiso base de conexión (`efeonce.mcp.read`). Con eso el gateway federa **36 tools** (28 SEO +
`get_greenhouse_skill` + las nativas del propio gateway). Detalle funcional en
[Manuales MCP servidos por el protocolo](./manuales-mcp-servidos-por-el-protocolo.md).

## Cómo se comporta

1. El cliente MCP obtiene un token para el resource canónico desde un emisor admitido: Entra legado o
   Efeonce ID. En el carril corporativo nativo, Microsoft autentica y Efeonce ID emite el token.
2. El gateway valida issuer, audience, firma, expiración y scopes, y aplica policy por tool. Los tokens
   nativos requieren autoridad vigente del reader; los internos también contexto firmado y ledger `jti`.
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
  conexión — no configuran mediciones, no disparan capturas ni gastan presupuesto de proveedor — y las siete
  escrituras gobernadas bajo un permiso de escritura propio (`efeonce.mcp.seo.write`) que NO está cableado al
  cliente público: hoy responden fail-closed. Estar desplegadas no las vuelve usables por cualquiera: una
  escritura desplegada y fail-closed sigue sin poder ejecutarse hasta que el permiso se cablee. Cada tool queda
  acotada por el módulo SEO asignado a la organización. Además hay cuatro lecturas competitivas
  (`get_seo_provider_spend`, `get_seo_keyword_gap`, `get_seo_serp_top_results`, `get_seo_competitor_candidates`)
  que sólo responden a conexiones internas de Efeonce: una conexión de cliente recibe un "no existe", nunca una
  pista de que el dato está ahí. Inventario exacto en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-tool-inventory.md) §8.
- `get_greenhouse_skill` para leer los manuales de uso de esa superficie (hoy seis, todos internos). Una conexión
  que no sea interna recibe un catálogo vacío y un "no existe" por nombre, nunca un "prohibido".

No disponible:

- crear ejecuciones, usar créditos, subir/leer assets, revisar, aprobar, entregar o publicar creatividad;
- costos de proveedor, márgenes, house, provider slug o selección de workspace;
- acceso self-service de clientes o multitenant.

`Bajo`, `Estándar` y `Premium` son orientación pública de consumo; no son costos de proveedor.

## Alcance de acceso

El servicio conserva Entra legado y tiene un piloto corporativo nativo verificado (TASK-1836/1831). La autorización de Globe usa un principal con
una capability de lectura y un binding de workspace exacto. Esto evita que una conexión MCP sea un bypass de
los permisos de Globe.

El gateway maneja cinco permisos: el permiso base de conexión, el permiso de lectura de Globe, el permiso de
escritura interna para el fondeo de créditos, el permiso de escritura SEO (`efeonce.mcp.seo.write`) y el permiso
de lectura de Hiring — cada permiso condicionado sólo se publica cuando su interruptor está encendido (detalle en
el ADR de plataforma MCP).

Los entitlements por organización/persona ya existen y el gateway multi-issuer está construido. Antes
de entregar acceso general a clientes, falta certificar su matriz real y demostrar una
identidad que reciba sólo el permiso base cuando no tiene Globe. Al cliente Entra interno actual se le entregan
hoy los dos primeros permisos —el base y el de lectura de Globe— incluso si pide sólo el base; por eso no
representa aún una prueba válida de segmentación comercial. El permiso de escritura tiene su propia autorización
aparte y no forma parte de lo comprobado en ese comportamiento.

## Relación con otros MCP

Este gateway no reemplaza el MCP local/remoto de Greenhouse (que no es read-only: registra 7 escrituras). Ese MCP sirve al portal Greenhouse y sus
contratos ecosystem; Efeonce MCP Gateway sirve como borde federado para productos hermanos y capacidades futuras.

Los manuales son el mismo primitive en los dos bordes: el MCP de Greenhouse los sirve como tool y como recurso
`skill://efeonce/{name}/SKILL.md`, el gateway sólo como tool, y ambos leen la misma lane. Un guard del gateway
(`EXPECTED_GREENHOUSE_PLATFORM_TOOLS`) vigila que las tools de plataforma federadas —las que no son SEO— sigan
declaradas con razón, porque el guard de paridad SEO está anclado a ese dominio y no las veía.


## Autoridad nativa y límites del piloto

Compartir `auth.efeonce.org` no convierte clientes en empleados. El binding conserva población
`external | internal`; las tools evalúan población, scopes, capabilities y organización. Los internos requieren
un contexto ligado a cliente/organización y grants personales con vencimiento. `gv` pertenece al binding
seleccionado; refresh no amplía contexto ni rejuvenece autenticación. La revocación de familia se revalida
mediante `jti` antes del dispatch, sin esperar la expiración ni llamar a introspección.

El canary interno probó lectura propia, denegación de organización ajena, refresh y revocación. No certifica
clientes externos, todas las tools ni la matriz multicontexto. La sesión directa desde `/login` tampoco
conecta por sí sola una app. [Mapa de evidencia y pendientes](../../audits/2026-09-06-task-1836-1831-consolidated-evidence.md)
y [contrato interno](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md).
