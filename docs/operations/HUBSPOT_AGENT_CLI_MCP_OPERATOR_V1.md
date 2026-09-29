# HubSpot Agent CLI y MCP — selección del carril operativo

> Estado local verificado: 2026-09-29. Este documento registra acceso del operador, no un runtime de Greenhouse ni un entitlement permanente de un portal cliente. Revalidar identidad, scopes y capacidad en cada sesión y antes de cada cambio.

## Carriles

| Necesidad | Carril | Comprobación antes de operar |
| --- | --- | --- |
| Consulta o cambio puntual del CRM durante una conversación | Conector MCP de HubSpot (`hubspot:hubspot` en el router de skills) | Identidad y portal de la conexión activa, tool disponible, permiso efectivo y readback |
| Inventario repetible, búsqueda encadenada, lotes o trabajo programado | HubSpot Agent CLI (`hubspot`) | `hubspot --version`, `hubspot whoami`, help del comando y lectura real en el portal destino |
| CMS/Developer Projects | HubSpot developer CLI (`hs`) y canon de Kortex/CMS | Perfil explícito; sus credenciales no autentican automáticamente la Agent CLI |
| Bridge Greenhouse, webhooks o sincronización | `hubspot-greenhouse-bridge` | Arquitectura y contrato de integración; no sustituirlo por un comando interactivo |

CLI y MCP son rutas alternativas de operación directa cuando la operación está cubierta y autorizada. No comparten necesariamente sesión, portal, permisos ni superficie de comandos. Si una ruta falla o no tiene la capability, diagnosticarla y escoger explícitamente otra ruta con el mismo alcance aprobado; no cambiar de identidad, portal o autoridad por fallback silencioso. La decisión y la verificación viven en el change set, no en la herramienta.

## Estado observado en esta máquina y portal

- Agent CLI oficial instalada en `~/.hubspot/bin/hubspot`; versión `0.15.0` (build 1250). El instalador verificó SHA-256 y agregó el directorio al `PATH` de `~/.zshrc`. Una shell no interactiva puede requerir la ruta absoluta.
- `hubspot whoami` confirmó OAuth del usuario operador en **Kortex/Efeonce, portal `48713323`**, con 68 scopes efectivos, incluidos scopes CRM de escritura. Esto no prueba acceso a ANAM `19893546`. Los perfiles existentes de `hs` (`kortex-dev` y `anam-19893546`) son independientes.
- Lectura live positiva: `objects list` devolvió una empresa; `objects types` enumeró 96 tipos estándar; `schemas list` no encontró esquemas custom; `objects search` devolvió totales para contactos, empresas, deals, tickets y otros tipos; `properties get/list` leyó definiciones; `reports list` informó 86 informes y `segments list` recorrió 24 segmentos. Son observaciones fechadas, no inventario perpetuo ni garantía de acceso a los 96 tipos.
- Límites comprobados: `pipelines list` rechazó OAuth de usuario y pidió service key; la ayuda local indica la misma restricción para `workflows list`. `hubspot query` recibió 403 porque HubSQL no está habilitado en esta cuenta. No usar `HUBSPOT_SKIP_AUTH_CHECK` para esquivar una restricción de autoridad.
- `properties update --dry-run` produjo preview con `executed:false`. La versión `0.15.0` de `properties create` **no expone `--dry-run`**. Lectura y preview no prueban que un create/update real vaya a ser aceptado; verificar el permiso por objeto y hacer readback tras un cambio aprobado.
- El conector MCP de HubSpot está disponible en esta sesión de Codex con tools de lectura y escritura CRM. Su portal y permisos efectivos se comprueban en la conexión, nunca se infieren del OAuth de la CLI.

No guardar en el repo `~/.config/hubspot/auth.json`, service keys, OAuth codes ni salidas con registros personales. No imprimir tokens. La service key en `HUBSPOT_ACCESS_TOKEN` tiene prioridad sobre OAuth y puede carecer de auditoría por usuario: usarla sólo para una operación que la requiera, con scope y entorno controlados; retirarla al terminar. La existencia de la variable o un perfil `hs` no es prueba de que el comando pueda operar.

## Procedimiento por operación

1. Identificar portal, objeto, resultado esperado, cohorte y permisos. En clientes, confirmar que la conexión apunta al portal del cliente; `48713323` es Efeonce/Kortex y no ANAM.
2. Elegir MCP o CLI por cobertura y forma del trabajo. Verificar identidad y una lectura mínima con el carril elegido. Para CLI: `hubspot whoami` y `hubspot <noun> <verb> --help`; para MCP: identidad/portal de la conexión y tool guidance aplicable.
3. Inventariar estado actual y preparar change set (`actual → propuesto`, IDs, impacto, aprobación y recuperación). Usar `--dry-run` **cuando el comando lo soporte**. La ausencia del flag en create de propiedades exige revisión explícita del payload antes de ejecutar; no inventar un preview.
4. Ejecutar sólo el cambio aprobado. Leer de vuelta por la misma identidad/portal y probar el flujo que depende de él. Separar configuración guardada de comportamiento runtime.
5. Registrar comando/tool, portal, versión, IDs y resultado redactado. Para lotes, conservar manifiesto de IDs y resultado por fila sin exponer datos personales en logs o documentos públicos.

### Propiedades

`hubspot properties list/get` permite inventario. `create` define nombre interno, label, tipo, field type y grupo; `update` modifica label o grupo; hay comandos separados para opciones de enumeración. Antes de crear, aplicar el diccionario y el orden de decisión de [`revops-schema.md`](../../.codex/skills/hubspot-as-a-service/references/revops-schema.md). No crear por el nombre de un correo ni cambiar un tipo de dato suponiendo que `update` lo soporta. El primer write real de cada clase de operación requiere readback de la definición y de sus consumidores.

## Fuentes y límites

- [Guía oficial de HubSpot Agent CLI](https://developers.hubspot.com/docs/developer-tooling/local-development/agent-cli/guide) — beta, instalación, OAuth/service key, comandos y permisos; contrastar con `--help` de la versión instalada.
- [Changelog oficial de la beta](https://developers.hubspot.com/changelog/hubspot-agent-cli-available-in-public-beta).
- Método de servicio: [`hubspot-as-a-service`](../../.codex/skills/hubspot-as-a-service/SKILL.md) y [canon técnico](../architecture/kortex/hubspot-as-a-service/README.md).
