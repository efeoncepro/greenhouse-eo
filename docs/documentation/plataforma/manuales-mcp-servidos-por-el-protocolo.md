# Manuales MCP servidos por el protocolo

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-02 por Claude (TASK-1804)
> **Ultima actualizacion:** 2026-09-02 por Claude (TASK-1804)
> **Documentacion tecnica:** [GREENHOUSE_MCP_ARCHITECTURE_V1.md §23](../../architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md) · [MCP_TOOL_SURFACE_INVARIANTS.md §8](../../architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md)

## Qué es

Cuando un asistente de IA se conecta al MCP de Greenhouse recibe una lista de herramientas y una
nota corta con lo que puede y no puede hacer. Esa nota viaja en cada mensaje, así que no puede
crecer. Hasta ahora, todo lo que el asistente sabía sobre **cómo** operar bien las herramientas
cabía ahí o dentro de la descripción de cada herramienta.

Desde esta capacidad existe un segundo canal: **manuales de uso** que el asistente carga sólo
cuando los necesita, con la herramienta `get_greenhouse_skill`. Sin nombre devuelve el catálogo
(qué manuales hay y qué herramientas gobierna cada uno); con nombre devuelve el manual completo.

## Los manuales que existen hoy

| Manual | Qué enseña | Cuándo debe cargarlo el asistente |
| --- | --- | --- |
| `seo-spend-discipline` | Qué herramientas comprometen gasto con el proveedor de datos, cuáles lo hacen de forma recurrente, y el protocolo de proponer, confirmar con una persona y leer el resultado por ítem | Antes de seguir keywords, declarar competidores, lanzar un discovery o un diagnóstico de prospecto |
| `seo-visibility-reading` | Las dos lentes (medida y estimada) que nunca se promedian, qué significa cada ausencia de dato, en qué orden se leen las herramientas y cuál es la única que ordena prioridades | Antes de describir cómo está posicionado un cliente |
| `competitor-loop` | El ciclo observar, proponer, confirmar, declarar, cubrir, leer, retirar; y por qué una lista vacía puede ser el resultado correcto | Antes de proponer, declarar o retirar un competidor |

Los manuales son texto estático, igual para todos los consumidores, y viven versionados en el
repositorio. Cambian sólo con un despliegue.

## Quién puede verlos

Los tres manuales son de audiencia interna. Un consumidor conectado con un binding interno los ve
todos. Un consumidor conectado con el binding de un cliente **no ve que existen**: el catálogo le
llega vacío y pedir uno por nombre responde "no encontrado", igual que un manual que no existe.
No hay un "no autorizado" que confirme su existencia.

Conectar un asistente no otorga permisos nuevos: el manual explica cómo usar una herramienta, no
habilita ninguna.

## Cómo llega al asistente

- Por la herramienta `get_greenhouse_skill`, tanto en el MCP interno de Greenhouse como en el
  gateway público de Efeonce.
- Por un recurso MCP con dirección `skill://efeonce/<nombre>/SKILL.md`, en el formato estándar de
  skills para agentes, de modo que el contenido sirva sin cambios cuando el protocolo estandarice
  ese canal.
- Por la API de ecosistema para máquinas, que es la fuente de la que leen los dos anteriores.

El manual que llega por cualquiera de los tres caminos es exactamente el mismo archivo, byte a
byte.

## Reglas que protegen la capacidad

- Publicar un manual es un acto explícito: declararlo sin escribirlo, o escribirlo sin declararlo,
  impide que el servidor arranque.
- Ningún manual puede contener datos internos (identificadores de aplicaciones, secretos, rutas del
  repositorio, identificadores de organizaciones). Lo verifica una prueba automática, no una
  lectura humana.
- Si una herramienta que un manual enseña desaparece o cambia de nombre, el servidor no arranca:
  un manual que enseña un procedimiento muerto es peor que ninguno.

> Detalle técnico: `src/mcp/greenhouse/skill-manifest.ts` (manifiesto), `src/mcp/greenhouse/skill-catalog.ts` (reader canónico), `docs/mcp/skills/**` (contenido), `src/lib/api-platform/resources/ecosystem-mcp-skills.ts` (lane), `efeonce-mcp/src/providers/greenhouse-skills.ts` (gateway).
