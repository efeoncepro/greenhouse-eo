# HubSpot Agent CLI y MCP — selección del carril operativo

> Observaciones locales: 2026-09-29 y 2026-10-06. Este documento registra acceso del operador, no un runtime de Greenhouse ni un entitlement permanente de un portal cliente. Revalidar identidad, scopes y capacidad en cada sesión y antes de cada cambio.

## Carriles

| Necesidad                                                             | Carril                                                             | Comprobación antes de operar                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Consulta o cambio puntual del CRM durante una conversación            | Conector MCP de HubSpot (`hubspot:hubspot` en el router de skills) | Identidad y portal de la conexión activa, tool disponible, permiso efectivo y readback      |
| Inventario repetible, búsqueda encadenada, lotes o trabajo programado | HubSpot Agent CLI (`hubspot`)                                      | `hubspot --version`, `hubspot whoami`, help del comando y lectura real en el portal destino |
| CMS/Developer Projects                                                | HubSpot developer CLI (`hs`) y canon de Kortex/CMS                 | Perfil explícito; sus credenciales no autentican automáticamente la Agent CLI               |
| Bridge Greenhouse, webhooks o sincronización                          | `hubspot-greenhouse-bridge`                                        | Arquitectura y contrato de integración; no sustituirlo por un comando interactivo           |

CLI y MCP son rutas alternativas de operación directa cuando la operación está cubierta y autorizada. No comparten necesariamente sesión, portal, permisos ni superficie de comandos. Si una ruta falla o no tiene la capability, diagnosticarla y escoger explícitamente otra ruta con el mismo alcance aprobado; no cambiar de identidad, portal o autoridad por fallback silencioso. La decisión y la verificación viven en el change set, no en la herramienta.

## Estado observado en esta máquina y portal

### 2026-09-29

- Agent CLI oficial instalada en `~/.hubspot/bin/hubspot`; versión `0.15.0` (build 1250). El instalador verificó SHA-256 y agregó el directorio al `PATH` de `~/.zshrc`. Una shell no interactiva puede requerir la ruta absoluta.
- `hubspot whoami` confirmó OAuth del usuario operador en **Kortex/Efeonce, portal `48713323`**, con 68 scopes efectivos, incluidos scopes CRM de escritura. Esto no prueba acceso a ANAM `19893546`. Los perfiles existentes de `hs` (`kortex-dev` y `anam-19893546`) son independientes.
- Lectura live positiva: `objects list` devolvió una empresa; `objects types` enumeró 96 tipos estándar; `schemas list` no encontró esquemas custom; `objects search` devolvió totales para contactos, empresas, deals, tickets y otros tipos; `properties get/list` leyó definiciones; `reports list` informó 86 informes y `segments list` recorrió 24 segmentos. Son observaciones fechadas, no inventario perpetuo ni garantía de acceso a los 96 tipos.
- Límites comprobados: `pipelines list` rechazó OAuth de usuario y pidió service key; la ayuda local indica la misma restricción para `workflows list`. `hubspot query` recibió 403 porque HubSQL no está habilitado en esta cuenta. No usar `HUBSPOT_SKIP_AUTH_CHECK` para esquivar una restricción de autoridad.
- `properties update --dry-run` produjo preview con `executed:false`. La versión `0.15.0` de `properties create` **no expone `--dry-run`**. Lectura y preview no prueban que un create/update real vaya a ser aceptado; verificar el permiso por objeto y hacer readback tras un cambio aprobado.
- El conector MCP de HubSpot está disponible en esta sesión de Codex con tools de lectura y escritura CRM. Su portal y permisos efectivos se comprueban en la conexión, nunca se infieren del OAuth de la CLI.

No guardar en el repo `~/.config/hubspot/auth.json`, service keys, OAuth codes ni salidas con registros personales. No imprimir tokens. La service key en `HUBSPOT_ACCESS_TOKEN` tiene prioridad sobre OAuth y puede carecer de auditoría por usuario: usarla sólo para una operación que la requiera, con scope y entorno controlados; retirarla al terminar. La existencia de la variable o un perfil `hs` no es prueba de que el comando pueda operar.

### 2026-10-06 — corte inicial con bases estáticas (histórico)

- Agent CLI `0.15.1` (build 1348) en la misma ruta. Portal verificado `48713323`; `segments create` expone
  `--type`, `--filter`, `--list-type ACTIVE|STATIC`, `--file` y `--dry-run`, con scope `crm.lists.write`.
- La CLI creó segmentos activos y leyó sus definiciones. `segments members-list` no admitió el OAuth de usuario;
  la verificación completa de miembros se hizo mediante el conector MCP autenticado y CRM search por `ilsListIds`.
  No cambiar a service key ni despertar Kortex sólo para sortear esa limitación de lectura.
- La expresión de pertenencia nativa es `IN_LIST(list = <id>)`. Una creación con `ilsListIds` tratado como
  propiedad ordinaria devolvió 502; se comprobó que no había creado la lista antes de cambiar la expresión.
  La UI autenticada y el readback de CLI permitieron confirmar la sintaxis soportada.
- Se preservaron 15 segmentos generales (144–158) y se verificaron 18 nuevos limitados a la investigación
  (159–176): siete de empresas y once de contactos. Los derivados usan las cohortes base de empresas 119 y
  contactos 118; los individuales con email añaden la cohorte 140. Cada rama OR conserva ambas restricciones.
- Los 18 conjuntos coincidieron con sus esperados, sin miembros fuera del lote ni contactos ajenos al universo
  individual con email. Los totales son una observación fechada; confirmar de nuevo antes de usar destinatarios.

Caso, alcance y procedimiento: [manual de segmentación](../manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md).
Evidencia agregada: [auditoría de la operación](../audits/commercial/2026-10-06-prospeccion-segmentacion-hubspot.md).

### 2026-10-06 — corrección: propiedades y segmentos activos

- Instrucción del operador: asignar propiedades debe incorporar automáticamente a los segmentos activos.
- Agent CLI `properties batch-create` creó cuatro definiciones (cohorte en Company/Contact y tipo/fit en Contact)
  en grupo `efeonce_prospecting`. `objects update` cargó 80 empresas y 80 contactos; lectura independiente
  verificó todas las filas y el conjunto exacto etiquetado, sin ampliar al CRM histórico.
- `segments update-filters` migró 159–176 en el mismo ID después del backfill. Las reglas leen cohorte y atributos;
  ya no dependen de 118/119/140/122/124. Cada rama OR conserva el límite. Las 15 definiciones globales no cambiaron.
- Los 18 conjuntos completos coinciden: 62 individuales con email, Retail 11, roles 32, fit creativo 50, fit CRM 26.
- OAuth rechazó `members-add` en 118 con 403. Hubo una incorporación UI intermedia en 118 antes de la corrección;
  se conserva ese delta histórico. No se usa esa ruta como incorporación habitual: una regla activa por atributos
  elimina la necesidad de escribir membresías manuales.
- El preview de `update-filters` devolvió `executed:false` sin digest; el comando real y `get` confirmaron escritura.
  Recalcular es asíncrono: verificar miembros efectivos después de guardar, no sólo la definición.

Canon y diccionario: [decisión de segmentos por propiedades](../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).

### Configuración actual de prospección — cierre 2026-10-06

La admisión autorizada Sika amplió la cohorte a 81 empresas/81 contactos. Nuevo ACTIVE 177 Química y materiales:
Company, cohorte AND `industry IN ('BUILDING_MATERIALS', 'CHEMICALS')`. Contacto incorporado automáticamente en
174/176, sin alta manual en bases. Totales 174=63, 176=51, 175=26, 177=1. Nueva lectura de 34 definiciones y
19 membresías completas coincide con el prestate más el delta; 15 globales intactos.

[Modelo funcional](../documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md) ·
[catálogo exacto sin PII](HUBSPOT_PROSPECT_SEGMENTS_CATALOG_2026-10-06.json) ·
[manual con escritura, lectura y diagnóstico](../manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md).
Propiedades existentes, Company/Contact separados; conservar multiselects. Verificar Primary tras automatización
por dominio: un email subdominio puede generar otra Company. Cohorte explícita, fit e intención separados;
no poblar cargo/interés incompatibles para provocar membresía. La evidencia individual se guarda fuera de Git.

## Procedimiento por operación

1. Identificar portal, objeto, resultado esperado, cohorte y permisos. En clientes, confirmar que la conexión apunta al portal del cliente; `48713323` es Efeonce/Kortex y no ANAM.
2. Elegir MCP o CLI por cobertura y forma del trabajo. Verificar identidad y una lectura mínima con el carril elegido. Para CLI: `hubspot whoami` y `hubspot <noun> <verb> --help`; para MCP: identidad/portal de la conexión y tool guidance aplicable.
3. Inventariar estado actual y preparar change set (`actual → propuesto`, IDs, impacto, aprobación y recuperación). Usar `--dry-run` **cuando el comando lo soporte**. La ausencia del flag en create de propiedades exige revisión explícita del payload antes de ejecutar; no inventar un preview.
4. Ejecutar sólo el cambio aprobado. Leer de vuelta por la misma identidad/portal y probar el flujo que depende de él. Separar configuración guardada de comportamiento runtime.
5. Registrar comando/tool, portal, versión, IDs y resultado redactado. Para lotes, conservar manifiesto de IDs y resultado por fila sin exponer datos personales en logs o documentos públicos.

### Propiedades

`hubspot properties list/get` permite inventario. `create` define nombre interno, label, tipo, field type y grupo; `update` modifica label o grupo; hay comandos separados para opciones de enumeración. Antes de crear, aplicar el diccionario y el orden de decisión de [`revops-schema.md`](../../.codex/skills/hubspot-as-a-service/references/revops-schema.md). No crear por el nombre de un correo ni cambiar un tipo de dato suponiendo que `update` lo soporta. El primer write real de cada clase de operación requiere readback de la definición y de sus consumidores.

### Segmentos y origen de la base

Definir primero el universo: toda la base, una investigación o individuos con email de esa investigación.
Los filtros por industria, tamaño y cargo sobre toda la base pueden incorporar datos antiguos. Para una cohorte,
usar una propiedad de cohorte verificada AND atributos compatibles; un filtro por fecha de creación
no sustituye el origen y excluiría cuentas preexistentes investigadas de nuevo.

`segments create --dry-run` comprueba el payload sin crear. Tras una escritura autorizada, `segments get <id>
--format json` debe confirmar tipo ACTIVE y expresión completa. La membresía requiere una lectura independiente
de todos los registros, comparación exacta y negativos de fuga fuera del lote, incluidos los OR. Una cohorte
definida por propiedades incorpora automáticamente registros que reciban los valores requeridos. Una ronda
futura requiere su opción/filtro o un universo combinado autorizado. Conservar los globales cuando se pidan ambos alcances.

Para enriquecimiento y personalización, cargar
[`prospecting-segmentation.md`](../../.codex/skills/hubspot-as-a-service/references/prospecting-segmentation.md).
Fit, solicitud observada, vigencia, identidad y elegibilidad del email tienen evidencias distintas. Preparar
segmentos no autoriza envíos, cambios de suscripciones, contactos de marketing ni activación de secuencias.

## Contexto del carril bridge

Texto de routing preservado desde CLAUDE.md para reducir su presupuesto; este carril no sustituye las altas directas por Agent CLI/MCP ni autoriza despertar Kortex.

Los invariantes operativos del bridge HubSpot — Cloud Run hubspot-greenhouse-integration (write bridge + webhooks), inbound webhook p_services (0-162) auto-sync, service pipeline lifecycle stage sync, webhook events dual-format — viven en **`docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` → §`Invariantes operativos para agentes — HubSpot bridge/intake`** (+ `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` para el Cloud Run). El inbound companies+contacts (TASK-706) y el sample sprint outbound (TASK-837) viven en el companion `agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (ver el pointer "Integraciones/infra cross-runtime" abajo). **Invocar la skill `hubspot-greenhouse-bridge` al tocar rutas del bridge, webhooks HubSpot o secretos.**

## Fuentes y límites

- [Guía oficial de HubSpot Agent CLI](https://developers.hubspot.com/docs/developer-tooling/local-development/agent-cli/guide) — beta, instalación, OAuth/service key, comandos y permisos; contrastar con `--help` de la versión instalada.
- [Changelog oficial de la beta](https://developers.hubspot.com/changelog/hubspot-agent-cli-available-in-public-beta).
- Método de servicio: [`hubspot-as-a-service`](../../.codex/skills/hubspot-as-a-service/SKILL.md) y [canon técnico](../architecture/kortex/hubspot-as-a-service/README.md).
