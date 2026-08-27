# Implementación y operación

## Descubrimiento de tenancy

Registra Enterprise account, MIDs, Business Units, regiones, marcas, canales, dominios, usuarios, roles, paquetes instalados, integraciones, límites y separación dev/test/prod disponible. Diseña BU por aislamiento real de datos, consentimiento, marca, país, dominio y ownership; evita copiar el organigrama sin análisis.

## Identidad, datos y consentimiento

- Define Contact Key estable, fuente maestra, resolución de duplicados y relación con CRM IDs.
- Inventaría DEs, sendability, claves, tipos, retención, owners, dependencias y consumidores.
- Modela consentimiento por propósito, canal, marca, jurisdicción, fuente, timestamp y prueba.
- Separa estado operativo, suscripción temática, supresión legal y preferencia.
- Antes de cargas o cambios masivos: muestra, conteos, dry run cuando exista, backup/export, reconciliación y plan de reversa.

## Journey Builder

Define objetivo, entry source, schedule/evento, filtros, re-entry, decisiones, waits, goals, exits, frequency caps, errores, versión y owner. Prueba con contactos controlados y casos negativos. Activar una nueva versión no modifica contactos ya admitidos como si fuera un deploy tradicional; documenta transición y journeys superpuestos.

## Automation Studio

Mapea dependencias de archivos, imports, SQL, extracts, scripts y sends. Usa nombres, carpetas, owners, ventanas, alertas y runbooks. Estima cardinalidad y tiempo; evita joins no acotados. Verifica filas de entrada/salida, errores y efectos en downstream.

## Content Builder

Define taxonomía, permisos, plantillas, bloques, localización, approval, expiración y lineage. Prueba personalización con valores nulos, fallback, caracteres especiales, links, tracking, plain text, móvil y accesibilidad. No publiques ni sobrescribas assets compartidos sin impacto y aprobación.

## APIs y paquetes instalados

- Prefiere server-to-server para integraciones de backend y mínimo privilegio por paquete.
- Mantén secretos fuera de código y outputs; rota según política.
- Respeta endpoints y stack específicos de la tenant, scopes, límites, paginación y expiración.
- Diseña idempotencia, correlation IDs, backoff acotado, dead-letter/reconciliación y observabilidad.
- REST y SOAP tienen coberturas distintas; no asumas paridad.

## Cierre

Entrega inventario, diagrama, matriz RACI, decisiones, runbooks, pruebas, conteos reconciliados, monitoreo, riesgos y evidencia de readback en la org.
