# Efeonce Globe — Evaluation Harness (evidencia repetible por contrato de fidelidad)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-19 por Claude (TASK-1458)
> **Ultima actualizacion:** 2026-07-19 por Claude
> **Documentacion tecnica:** [`docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce (imagen, video, audio). Greenhouse **no la hospeda**: la **gobierna**. Greenhouse es dueño de la identidad, el acceso deseado y el control de tareas/EPICs; Globe es dueño de su propio código, runtime, datos y evidencia creativa. Se integran como pares, sin compartir base de datos, sesión, buckets, secretos de proveedor ni acceso admin.

Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, qué es el **Evaluation Harness** que se construyó en `TASK-1458` y por qué importa. La spec técnica y esta documentación funcional viven en Greenhouse (control plane documental, EPIC-028); en el repo `efeonce-globe` solo vive el **código** que lo implementa (enlaces al final).

## Qué es el Evaluation Harness (en simple)

El Evaluation Harness es la **segunda capacidad de negocio real** montada sobre el Contract Spine de Globe. La primera fue el [Model Lab](efeonce-globe-model-lab.md): un banco de pruebas que corre un intento de generación bajo un tope de gasto y deja evidencia por intento. El Harness **usa** ese Model Lab y le agrega la pregunta que faltaba: *"¿cuán bien sirvió esa ruta para lo que de verdad tenía que resolver?"*.

La clave está en las últimas cuatro palabras. Un modelo no es "mejor" en abstracto — es mejor **para un encargo concreto**: un key visual de redes que ancla la marca no se juzga igual que un foley de "sonido de contacto" ni que un loop de producto. A ese encargo, con sus reglas de juego, lo llamamos **contrato de fidelidad**. El Harness es la capa que convierte un intento del Lab en **evidencia repetible y comparable, siempre atada a su contrato de fidelidad**.

Todo esto sin abrir puertas nuevas: el Harness **no reinventa** cómo se ejecuta un experimento, ni el tope de gasto, ni la ingesta privada de insumos, ni el interruptor de apagado. Corre el caso de prueba por el **mismo camino real** del Model Lab y solo puntúa el resultado.

## Los golden briefs (los casos de prueba, con derechos declarados)

Un **golden brief** es un caso de prueba creativo **versionado**, con sus derechos declarados por adelantado (licencia, consentimiento y uso permitido). Hoy hay tres, uno por medio, todos con insumos internos/sintéticos — cero derechos de terceros, cero riesgo de consentimiento:

| Caso | Medio | Contrato de fidelidad |
| --- | --- | --- |
| Key visual para redes | Imagen (still) | estilo flexible |
| Loop de producto | Video (motion) | estilo flexible |
| Foley de micrófono | Audio | foley (sonido de contacto) |

El foley del micrófono es el caso emblemático: se juzga como un **golpe-y-rebote real** (sonido de contacto), no como un efecto de "tap" genérico. Los golden briefs son **dato**: agregar o versionar uno no toca el motor, y cada versión queda registrada para que las comparaciones sean justas.

## Objetivo vs humano: la separación que importa

El Harness distingue de forma **dura** dos tipos de revisión, y nunca los mezcla:

- **Checks objetivos (automáticos).** Preguntas de sí/no que la máquina puede responder sola, mirando la evidencia del intento: ¿hubo un resultado?, ¿respetó el tope de gasto?, ¿el linaje de los insumos quedó intacto?, ¿la ruta que corrió coincidió con la que se propuso?, ¿el resultado quedó como candidato? Son deterministas y repetibles.
- **Criterios humanos (declarados, nunca auto-respondidos).** Preguntas de oficio que solo una persona puede juzgar: ¿el foley suena de verdad a contacto o a un tap cualquiera?, ¿el key visual funciona como ancla de marca? El Harness **enuncia** estas preguntas para el revisor, pero **jamás las contesta por su cuenta**.

Esta separación es el corazón del diseño: la máquina verifica lo verificable; el juicio creativo queda reservado a un humano, sin excepción.

## Por qué el veredicto nunca aprueba el oficio creativo

El resultado de una evaluación **nunca es un "aprobado creativo"**. Solo existen dos veredictos posibles:

- **Falló un check objetivo** — algo verificable no cumplió (no hubo salida, se pasó del tope, se rompió el linaje, cambió la ruta). Se detiene ahí.
- **Checks objetivos OK, pendiente de humano** — lo verificable pasó y el intento **queda a la espera de una revisión humana obligatoria**. No es una aprobación: es un "pasó lo técnico, ahora falta que una persona lo mire".

En otras palabras: el Harness **nunca declara que un modelo sea globalmente mejor** ni firma la calidad de una pieza. Un reporte es **evidencia técnica**, jamás una autorización de ruta ni de artefacto. La aprobación es siempre un paso humano aparte.

## Los reportes (versionados, acotados y honestos)

Cada evaluación produce un **reporte versionado** que registra la versión exacta del caso y de la rúbrica usadas, los resultados de los checks objetivos, los criterios humanos que quedan pendientes y la evidencia del intento. Dos garantías importan:

- **Cada quién ve solo lo suyo.** Los reportes están acotados al espacio de trabajo; pedir uno ajeno responde "no encontrado", sin revelar si existe en otra parte.
- **Declaran sus propias limitaciones.** Ningún reporte se presenta como más de lo que es. Hoy declaran, entre otras: que corre con un proveedor de ensayo (solo se validan los checks técnicos, no la fidelidad creativa real) y que es una **muestra única** (no una medición estadísticamente significativa).

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra `TASK-###`, dependencias, lifecycle, hooks, lint, QA, cierre documental y handoff — aunque el código viva en `efeonce-globe`. Esta capacidad se implementó bajo `TASK-1458`, gobernada por `EPIC-028`.
- **Globe conserva el runtime y la evidencia técnica.** Los golden briefs, las rúbricas, el motor de checks y los reportes viven en Globe. Greenhouse consume, cuando corresponde, proyecciones/eventos/deep links versionados; nunca su base de datos, su bucket ni sus secretos.
- **Todo es interno.** No hay producción ni clientes; nace apagado y se enciende solo para el piloto interno.
- **Estado:** implementado como *fake canary* sobre el Model Lab (`TASK-1457`) y el Contract Spine (`TASK-1481`). La corrida contra una **ruta de proveedor real** queda pendiente hasta que el canary live del Model Lab la habilite.

## Qué NO hace todavía

- **No genera piezas reales ni juzga fidelidad creativa.** Corre con el **proveedor de ensayo** del Model Lab (determinístico, sin red, sin gasto): por eso solo valida los checks técnicos, y así lo declara cada reporte.
- **No hay flujo de revisión humana todavía.** Los criterios humanos hoy solo se **enuncian**; la pantalla donde un revisor los responde aún no existe. Las superficies `ui` y `mcp` están **declaradas pero apagadas** (`policy-blocked`).
- **No agrega ni compara muchas muestras.** Cada reporte es una muestra única; la agregación estadística es una capacidad aparte, aún pendiente.

> **Detalle técnico y código (repo hermano `efeonce-globe`):**
>
> - Spec técnica canónica (SPEC-003): [`docs/architecture/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md).
> - Motor de evaluación (golden briefs como dato, rúbricas, checks objetivos, comando `evaluate`, readers, store): [`packages/domain/src/evaluation.ts`](../../../../efeonce-globe/packages/domain/src/evaluation.ts).
> - El Model Lab que este Harness **consume** (SPEC-002): [`docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md).
>
> **Gobierno en Greenhouse:**
>
> - Capacidad que este Harness consume: [`Model Lab`](efeonce-globe-model-lab.md).
> - Camino central sobre el que se monta: [`Contrato de API (Contract Spine)`](efeonce-globe-api-contract-spine.md).
> - ADR y arquitectura del programa: [`EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [`..._ARCHITECTURE_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/**/TASK-1458-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
