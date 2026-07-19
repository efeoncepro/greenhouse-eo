# Efeonce Globe — Model Lab (banco de pruebas de capacidades creativas)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-19 por Claude (TASK-1457)
> **Ultima actualizacion:** 2026-07-19 por Claude
> **Documentacion tecnica:** [`efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md) (repo hermano; nombre canónico previsto)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce (imagen, video, audio). Greenhouse **no la hospeda**: la **gobierna**. Greenhouse es dueño de la identidad, el acceso deseado y el control de tareas/EPICs; Globe es dueño de su propio código, runtime, datos y evidencia creativa. Se integran como pares, sin compartir base de datos, sesión, buckets, secretos de proveedor ni acceso admin.

Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, qué es el **Model Lab** que se construyó en `TASK-1457` y por qué importa. El detalle técnico completo, el manual operativo y la explicación funcional a fondo viven en el repo `efeonce-globe` (enlaces al final): acá damos el mapa y el gobierno; allá vive la fuente canónica.

## Qué es el Model Lab (en simple)

El Model Lab es la **primera capacidad de negocio real** montada sobre el Contract Spine (el camino único de Globe que dejó `TASK-1481`). Es un **banco de pruebas gobernado**: permite probar una capacidad creativa —por una ruta y con ciertos insumos— bajo un **tope de gasto duro**, y dejar evidencia por intento. Responde la pregunta *"¿esta ruta sirve y cuánto costaría?"* sin abrir una puerta trasera al proveedor.

Un **experimento** tiene tres momentos:

- **Preparar** — se declara qué capacidad probar (semántica: "generar imagen", "generar video", etc., nunca un nombre de modelo del proveedor), qué ruta de referencia, qué insumos (**solo su huella/hash + derechos, nunca el archivo crudo**) y un **tope de gasto máximo**.
- **Ejecutar** — el sistema **estima el costo; si supera el tope, aborta ANTES de gastar**; si cabe, reserva el presupuesto, corre y registra el resultado.
- **Ver evidencia** — queda un **manifiesto inmutable por intento**: ruta propuesta vs real, costo estimado y real, huellas de insumos y de resultado, y línea de origen.

Lo que garantiza, y por qué conecta con la disciplina de Greenhouse:

- **Ingesta privada.** El insumo cruza el contrato **solo como huella (hash) + postura de derechos** ("propio", "licenciado" o "de prueba"); el archivo real nunca viaja por la API.
- **Frenos de gasto duros.** Un **tope por corrida** (la estimación se compara antes de gastar) y un **tope diario por espacio de trabajo**. Más un **interruptor de apagado, apagado por defecto**: mientras el Lab está apagado, cualquier comando responde "bloqueado por política".
- **"Candidato listo" ≠ "aprobado".** Que un intento produzca un resultado técnico no significa que alguien lo revisó ni lo autorizó. La aprobación es un paso humano aparte.
- **Cada quién ve solo lo suyo.** Los experimentos están acotados al espacio de trabajo; pedir uno ajeno responde "no encontrado", sin revelar si existe en otra parte.

> **Estado real de hoy — importante:** el Model Lab **todavía no genera** imágenes, videos ni audio. Corre con un **proveedor de ensayo** (simulador) que **no toca la red y no gasta nada**. El proveedor real llega después, sobre la infraestructura de `TASK-1464` (ya aplicada) y las tareas que le siguen. Lo que ya funciona y quedó probado es **todo el mecanismo**: preparar con tope, ingesta por huella, estimar, frenar, reservar, correr, saldar y dejar evidencia.

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra `TASK-###`, dependencias, lifecycle, hooks, lint, QA, cierre documental y handoff — aunque el código viva en `efeonce-globe`. Esta capacidad se implementó bajo `TASK-1457`, gobernada por `EPIC-028`.
- **Globe conserva el runtime y la evidencia técnica.** Los experimentos, los manifiestos por intento, el spend fence y el proveedor viven en Globe. Greenhouse consume, cuando corresponde, proyecciones/eventos/deep links versionados; nunca su base de datos, su bucket ni sus secretos.
- **Todo es interno.** No hay producción ni clientes; el Lab nace apagado y se enciende solo para el piloto interno.
- **Estado:** implementado sobre el Contract Spine de `TASK-1481`. El **primer proveedor real** queda pendiente hasta que la infraestructura (`TASK-1464`, ya viva) y la política de soberanía de proveedores habiliten un adapter real.

## Qué NO hace todavía

El Model Lab **no genera** piezas reales: corre con el proveedor de ensayo, apagado por defecto, sin clientes ni producción. El registro contable de créditos comerciales (durable, a prueba de pérdidas) es una capacidad aparte, aún pendiente — el spend fence de hoy es un **freno de seguridad** en memoria, no ese registro.

> **Detalle técnico y operación (repo hermano `efeonce-globe`):**
>
> - Spec técnica canónica (nombre previsto): [`docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md).
> - Runbook operativo — correr un experimento paso a paso: [`docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) **§7-bis (Model Lab)**.
> - Runbook de infraestructura (bucket privado del Lab, despliegue sin llaves, presupuesto): [`docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).
> - Documentación funcional a fondo: [`docs/documentation/efeonce-globe-model-lab.md`](../../../../efeonce-globe/docs/documentation/efeonce-globe-model-lab.md).
>
> **Gobierno en Greenhouse:**
>
> - Camino central sobre el que se monta: [`Contrato de API (Contract Spine)`](efeonce-globe-api-contract-spine.md).
> - ADR y arquitectura del programa: [`EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [`..._ARCHITECTURE_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/**/TASK-1457-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
