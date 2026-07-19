# Manual — Evaluar un golden brief en el Evaluation Harness de Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.0
> **Creado:** 2026-07-19 por Claude (TASK-1458)
> **Ultima actualizacion:** 2026-07-19 por Claude

## Para qué sirve

El **Evaluation Harness** de Efeonce Globe (`TASK-1458`) es la capa que convierte un intento del Model Lab en **evidencia repetible y comparable por contrato de fidelidad**. En palabras simples: toma un **golden brief** (un caso de prueba creativo versionado — por ejemplo, "generar un key visual para redes") lo corre por el Model Lab, y **puntúa el resultado** contra una **rúbrica** también versionada. La salida es un **reporte** que separa lo que una máquina puede verificar de lo que solo un humano puede juzgar.

Sirve para responder una pregunta concreta: *¿esta ruta creativa sigue funcionando bien para este contrato de fidelidad?* No sirve para "aprobar" una pieza ni para declarar que un modelo es "mejor" en abstracto — el harness nunca hace eso.

Este manual es el **puente desde Greenhouse**: te dice quién opera qué, cómo se corre paso a paso y dónde está el runbook detallado. Como Globe es una **plataforma hermana** (repo `efeonce-globe`), el flujo real por SDK vive en ese repo; acá queda el mapa, el gobierno y las señales que debes saber leer.

## Antes de empezar

- **Depende del Model Lab.** El harness **consume** el Model Lab (`TASK-1457`): no reimplementa nada, corre el brief por el mismo camino real del Lab. Antes de operarlo conviene entender el Lab — ver el manual hermano [`efeonce-globe-model-lab.md`](./efeonce-globe-model-lab.md).
- **Dónde vive el código:** repo hermano `efeonce-globe` (por convención local `../efeonce-globe`). NO es parte del build de `greenhouse-eo`; tiene su propio toolchain (Node 24 nativo, `pnpm check` / `pnpm build`).
- **Quién gobierna:** Greenhouse. El trabajo se hace bajo la `TASK-1458` de Greenhouse (control plane), gobernada por `EPIC-028`. No se crea un registry de tareas paralelo en Globe.
- **Skill obligatoria:** invoca **`greenhouse-globe`** antes de tocar el repo de Globe. Encapsula el boundary, el flujo de extensión de capabilities y las reglas duras.
- **La capability:** `globe.lab.evaluation.run`. El caller interno (service principal) ya la tiene. La evaluación necesita que el Model Lab esté encendido: si `GLOBE_LAB_ENABLED` está OFF, la evaluación **falla cerrado** (el experimento no corre).
- **Estado hoy:** el harness corre con un **proveedor de ensayo** (simulador) que no toca la red ni gasta. Por eso hoy cada reporte solo mide lo **técnico** y lo declara como limitación. Las superficies `ui` y `mcp` están `policy-blocked` a propósito (aún no existe el flujo de revisión humana); operas por SDK / CLI / HTTP.

## Paso a paso (resumen — el detalle está en el runbook de Globe)

La operación tiene tres verbos: **listar → evaluar → leer el reporte.**

1. **Habilita el Lab (nace apagado).** El harness depende del interruptor del Model Lab: mientras `GLOBE_LAB_ENABLED` esté OFF, la evaluación no corre. Para el piloto interno se enciende con `GLOBE_LAB_ENABLED=true` (mismo flag y mismo tope diario `GLOBE_LAB_DAILY_CAP_CREDITS` que el Lab).
2. **Lista los golden briefs y las rúbricas disponibles.** Con `client.listGoldenBriefs()` ves los fixtures y rúbricas versionados. Cada fixture declara su **contrato de fidelidad** y sus **derechos** (`license` / `consent` / `permittedUse`). Hoy hay tres:

   | Golden brief (`fixtureId`) | Medio | Contrato de fidelidad |
   | --- | --- | --- |
   | `rrss-key-visual-still` | Imagen (still) | `flexible-style` |
   | `product-motion-loop` | Video (motion) | `flexible-style` |
   | `glitch-microphone-foley` | Audio (foley) | `audio-foley` |

3. **Corre la evaluación.** Con `client.evaluateGoldenBrief({ fixtureId, rubricId })`. Es un **comando** → lleva `idempotencyKey` (correr dos veces con la misma llave no duplica el trabajo). Reglas que debes respetar al elegir el par:
   - El fixture y la rúbrica deben ser del **mismo contrato de fidelidad**. Si mezclas contratos → `invalid_request` (una rúbrica solo evalúa su propio contrato, nunca cruzado).
   - Fixture o rúbrica inexistente → `not_found`.
   - Por debajo, el sistema corre el brief por el Model Lab (`prepare → execute`) con todos sus guardrails (kill switch, tope de gasto, ingesta privada), puntúa el manifiesto resultante y emite un reporte versionado.
4. **Lee el reporte.** Con `client.getEvaluationReport(reportId)`. El reporte está **scopeado a tu workspace**: pedir un reporte de otro espacio de trabajo → `not_found` (no se revela que existe en otra parte). Cómo leerlo, en la sección de estados de abajo.
5. **Cierra en Greenhouse:** lifecycle de la task, docs, handoff (el cierre documental es de Greenhouse).

El **runbook operativo completo** (habilitación con el flag, el flujo real por SDK `listGoldenBriefs` / `evaluateGoldenBrief` / `getEvaluationReport`, los errores en acción y cómo agregar una ruta de proveedor real) está en el repo hermano: [`efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) **§7-ter (Evaluation Harness)**.

## Qué significan los estados y señales

Un reporte separa deliberadamente lo objetivo de lo humano. Léelo en ese orden.

- **`objectiveResults` (checks automáticos):** cinco verificaciones deterministas sobre el manifiesto del intento. Son las que una máquina sí puede responder:
  - **output presente** — ¿hubo un resultado?
  - **dentro del tope** — ¿respetó el cap de gasto?
  - **lineage de inputs intacto** — ¿los insumos autorizados quedaron sin alterar?
  - **ruta estable** — ¿la ruta real coincidió con la propuesta?
  - **outcome candidato** — ¿el intento quedó como candidato técnico?
- **`humanCriteria` (criterios humanos):** las preguntas de oficio para el revisor (por ejemplo, "¿el foley suena a golpe-de-contacto o a un tap genérico?", "¿el key visual funciona como ancla de marca?"). El harness las **declara, nunca las responde**: no traen `pass` ni `score`. Son la parte que un humano debe juzgar aparte.
- **El verdict tiene solo dos valores** — y **ninguno es un "aprobado creativo"**:
  - **`objective_fail`** — algún check objetivo falló. Se detiene ahí.
  - **`objective_pass_pending_human`** — los checks objetivos pasaron y el intento **queda pendiente de revisión humana obligatoria**. NO es una aprobación; es "lo técnico está OK, ahora falta el juicio de oficio".
- **Versionado:** cada reporte trae `fixtureVersion` + `rubricVersion`. Es lo que te permite comparar el mismo brief a lo largo del tiempo de forma honesta (comparar peras con peras).
- **Limitaciones declaradas:** todo reporte dice qué NO es. Hoy declara siempre dos: **proveedor fake** → el reporte solo mide lo técnico, no la fidelidad creativa real; **muestra única** → es una sola corrida, no tiene significancia estadística.
- **Errores de operación:** `invalid_request` (fixture y rúbrica de contratos distintos, o sobre malformado), `not_found` (fixture / rúbrica / reporte inexistente o de otro workspace), y el bloqueo por Lab apagado (la evaluación falla cerrado si `GLOBE_LAB_ENABLED` está OFF). Las superficies `ui` y `mcp` responden `policy-blocked` (declaradas y apagadas a propósito).

## Qué no hacer

- **NUNCA** trates `objective_pass_pending_human` como una aprobación creativa. Es "pasó lo técnico"; la autorización de una pieza es un paso humano aparte que hoy ni siquiera tiene surface (`ui` está `policy-blocked`).
- **NUNCA** esperes que el harness responda los `humanCriteria`. Son preguntas para el revisor, por diseño; si vieras un `pass` autogenerado en ellas, sería un bug.
- **NUNCA** evalúes un fixture con una rúbrica de **otro contrato de fidelidad** esperando que "funcione igual": la respuesta correcta es `invalid_request`, no un reporte.
- **NUNCA** leas un reporte de otro workspace ni asumas que un `not_found` significa "no existe" — puede existir en otro espacio; el scoping es intencional.
- **NUNCA** interpretes un reporte de hoy como medida de **fidelidad creativa real**: con proveedor fake solo mide lo técnico, y el propio reporte lo declara. Tampoco lo trates como estadísticamente significativo (es muestra única).
- **NUNCA** intentes que el harness "declare un modelo mejor" en general. Evalúa **por contrato de fidelidad**, siempre.
- **NUNCA** prendas el proveedor real por tu cuenta: eso depende del canary del Model Lab (infra de `TASK-1464`), y el juicio humano seguirá siendo humano.
- **NUNCA** compartas base de datos, sesión, bucket, secreto ni rol admin entre Globe y Greenhouse; **NUNCA** crees un registry/namespace de tareas paralelo en Globe.

## Problemas comunes

- **La evaluación falla y el Lab parece apagado:** el harness depende del Model Lab. Si `GLOBE_LAB_ENABLED` está OFF, la evaluación **falla cerrado** (el experimento no corre). Enciéndelo con `GLOBE_LAB_ENABLED=true` para el piloto interno.
- **`invalid_request` al evaluar:** el fixture y la rúbrica no son del mismo contrato de fidelidad. Verifica con `listGoldenBriefs()` que ambos apunten al mismo contrato (por ejemplo, `audio-foley` con la rúbrica de `audio-foley`).
- **`not_found` al evaluar o al leer el reporte:** el `fixtureId`, `rubricId` o `reportId` no existe, **o** el reporte pertenece a otro workspace. Confirma los IDs con `listGoldenBriefs()` y que el reporte sea de tu propio espacio.
- **El reporte "no aprueba nada":** correcto y esperado. El mejor resultado posible hoy es `objective_pass_pending_human` — nunca un "aprobado". La aprobación creativa es humana y aún no tiene flujo.
- **El reporte dice "proveedor fake / muestra única":** no es un error, es una **limitación declarada**. Mientras el Lab corra con simulador, el reporte solo mide lo técnico y sobre una sola corrida. Con la ruta de proveedor real (canary del Lab) esa limitación desaparece para lo técnico, pero el juicio de los `humanCriteria` sigue siendo humano.
- **No valida Globe con `pnpm local:check` de Greenhouse:** correcto, son toolchains distintos. Valida Globe con `pnpm check` / `pnpm build` dentro de `efeonce-globe`.

## Referencias técnicas

- Runbook operativo — evaluar un golden brief paso a paso: [`efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../../../efeonce-globe/docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) §7-ter.
- Spec técnica canónica (SPEC-003): [`efeonce-globe/docs/architecture/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md).
- Model Lab que este harness consume (SPEC-002): manual [`efeonce-globe-model-lab.md`](./efeonce-globe-model-lab.md) · spec [`efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../../../efeonce-globe/docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md).
- Documentación funcional (Greenhouse) de este harness, en lenguaje simple: [`docs/documentation/creative-studio/efeonce-globe-evaluation-harness.md`](../../documentation/creative-studio/efeonce-globe-evaluation-harness.md).
- Documentación funcional (Greenhouse) del Model Lab, para contexto de dominio: [`docs/documentation/creative-studio/efeonce-globe-model-lab.md`](../../documentation/creative-studio/efeonce-globe-model-lab.md).
- Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md). Skill: `greenhouse-globe`.
