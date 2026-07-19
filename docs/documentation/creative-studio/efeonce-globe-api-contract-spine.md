# Efeonce Globe — Contrato de API (Contract Spine)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-19 por Claude (TASK-1481)
> **Ultima actualizacion:** 2026-07-19 por Claude
> **Documentacion tecnica:** [`efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md) (repo hermano)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce (imagen, video, audio). Greenhouse
**no la hospeda**: la **gobierna**. Greenhouse es dueño de la identidad, el acceso deseado y el control de
tareas/EPICs; Globe es dueño de su propio código, runtime, datos y evidencia creativa. Se integran como pares,
sin compartir base de datos, sesión, buckets, secretos de proveedor ni acceso admin.

Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, qué es el "Contract
Spine" que se construyó en `TASK-1481` y por qué importa. El detalle técnico completo, el manual operativo y la
explicación funcional a fondo viven en el repo `efeonce-globe` (enlaces al final): acá damos el mapa y el
gobierno; allá vive la fuente canónica.

## Qué es el Contract Spine (en simple)

La regla de oro del programa Globe (EPIC-028) es: **todo lo que se pueda hacer en Globe —por pantalla, por
agente, por API— pasa por el mismo contrato central**; nadie llama directo al proveedor de IA por un atajo. El
Contract Spine es ese contrato central, construido **antes** de conectar proveedores o gastar dinero.

Lo que garantiza:

- **La identidad no se acepta de quien llama.** El que usa la API solo puede *pedir* operar cierto espacio de
  trabajo; el sistema confirma con el login quién es y a qué tiene acceso. Si pide algo que no le corresponde,
  se rechaza y queda registrado. Esto conecta directo con la identidad que **Greenhouse** emite.
- **Una sola definición por acción.** Cada capacidad vive una vez y la web, el agente y la API la usan igual.
  Es la misma disciplina de *Full API Parity* que Greenhouse aplica a sí mismo.
- **Un mapa honesto de qué está disponible.** Por cada capacidad y canal se declara "disponible", "bloqueado por
  política" o "no aplica". "Falta" es imposible por diseño: si algo no está listo aparece como *bloqueado por
  política* (visible), nunca como un hueco silencioso. Hoy las capacidades creativas reales están bloqueadas
  hasta que su propia tarea las encienda.
- **Prueba de que todos los canales son lo mismo.** Un test confirma que llamar por API y por el SDK dan el
  mismo resultado, el mismo error y la misma trazabilidad, y que no se puede falsificar la identidad metiéndola
  en el pedido.

Todo se probó con una capacidad "inerte" que **no toca ningún proveedor, base de datos ni almacenamiento** — cero
riesgo, cero gasto.

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra `TASK-###`, dependencias, lifecycle, hooks, lint,
  QA, cierre documental y handoff — aunque el código viva en `efeonce-globe`. Esta capacidad se implementó bajo
  `TASK-1481`, gobernada por `EPIC-028`.
- **Globe conserva el runtime y la evidencia técnica.** Greenhouse consume, cuando corresponde, proyecciones,
  eventos o deep links versionados; nunca su base de datos ni sus secretos.
- **Estado:** implementado y verde (verificación `pnpm check` + `pnpm build` en el repo hermano). Desbloquea
  `TASK-1457`, que enciende la primera capacidad creativa real sobre este mismo contrato.

## Qué NO hace todavía

Globe **todavía no genera** imágenes, videos ni audio, y no hay clientes ni proveedores conectados. El Contract
Spine es la base; las capacidades creativas se activan una por una en tareas posteriores (empezando por
`TASK-1457`), siempre sobre este contrato.

> **Detalle técnico y operación (repo hermano `efeonce-globe`):**
>
> - Spec técnica canónica: [`docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md) (SPEC-001).
> - Manual operativo (cómo agregar/llamar/verificar una capability): [`docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md).
> - Documentación funcional a fondo: [`docs/documentation/efeonce-globe-api-contract-spine.md`](../../../../efeonce-globe/docs/documentation/efeonce-globe-api-contract-spine.md).
>
> **Gobierno en Greenhouse:**
>
> - ADR y arquitectura del programa: [`GREENHOUSE ← EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [`..._ARCHITECTURE_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/complete/TASK-1481-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
