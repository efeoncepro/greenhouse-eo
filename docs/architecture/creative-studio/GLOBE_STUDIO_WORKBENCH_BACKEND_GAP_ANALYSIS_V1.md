# Globe Studio Workbench — Análisis de brecha diseño ↔ backend (V1)

> **Tipo:** análisis de arquitectura (gap analysis) · **Creado:** 2026-07-20 · **Método:** 5 agentes
> paralelos mapearon cada capacidad del diseño contra el código real de `efeonce-globe`, con evidencia
> `file:line`. **Fuente de verdad del intent:** el diseño `Globe Studio Workbench` en Claude Design
> (más actualizado que su task canónica `TASK-1474`, que quedó atrás). **Superficie:** TASK-1474.

## Pregunta

¿El backend que existe hoy alcanza para dar vida a TODO el Globe Studio Workbench? ¿Qué le falta al
backend? ¿Qué le falta al diseño que el backend sí tiene?

## Veredicto

**No alcanza, y la distancia es grande.** De ~32 acciones de negocio del workbench, **7 tienen un
comando/reader real** en el spine (`prepare`, `execute`, `cancel`, `editFrom`/refine, readers
`get`/`status`/`evidence`, `evaluate`); las otras 25 no (11 parciales, 14 sin nada). Y las 7 que
existen están declaradas `ui: policy-blocked` en el coverage manifest
(`packages/domain/src/model-lab.ts:120-129`) — ninguna es despachable desde una UI todavía.

El workbench está diseñado como una **agencia creativa completa** (brief compuesto → dirección →
estimate → aprobación → producción → candidatos/exploración → entrega). El backend hoy es un
**sandbox de laboratorio**: generar un candidato y refinarlo. La tesis de TASK-1474 ("thin client
sobre commands existentes, cero business logic en la UI") **no es alcanzable hoy**.

## Cobertura por paso

| Paso | Cobertura | Síntesis (evidencia en las tablas por zona, abajo) |
|---|---|---|
| 1. Brief | 🔴 casi nulo | Único campo creativo: `prompt?: string` plano (`contracts/src/index.ts:321`). Prompt Studio, Style DNA, Recetas, Formatos: gap. |
| 2. Dirección | 🔴 nulo | Nada interpreta/parafrasea el brief. Sin campo `direction`. |
| 3. Estimate | 🟡 parcial | El número existe pero se calcula DENTRO de `execute` (`model-lab.ts:282`); no hay estimate previewable, ni limitaciones/fallback/readiness. |
| 4. Aprobación | 🔴 nulo | `execute` estima+reserva+corre de un tramo (`model-lab.ts:266-337`); no hay gate humano. `globe.run.approve` es nombre sin handler. → TASK-1469. |
| 5. Producción | 🟡 parcial | `execute` es síncrono in-process; sin streaming, sin multi-intento/fallback loop. |
| 6. Candidatos | 🟡 parcial | Refine/linaje (TASK-1490) sólido. Enumerar candidatos, grafo de hijos, comparar, anotar, seed reproducible: gap. Score "94" es ficción (el harness nunca auto-puntúa: `evaluation.ts:272-273`). |
| 7. Entrega | 🔴 nulo | Delivery/master/manifiesto/revoke: nada. → TASK-1472. |
| *Studio Credits* | 🟡 parcial | Fence de seguridad per-run existe (`spend-fence.ts`); saldo comercial del workspace no → TASK-1468. |

## Las tres categorías

### ① Le falta al backend — con tarea ya planificada (todas `to-do`)

| Capacidad | Tarea | Evidencia del gap |
|---|---|---|
| Studio Credits comercial (saldo/reserva/consumo/refund durables) | `TASK-1468` | fence es seguridad, "NOT the commercial credit ledger" (`spend-fence.ts:6-11`); `CreditLedgerEntry` sketch sin consumidores (`database/index.ts:5-12`) |
| Aprobación humana + run lifecycle + estados recuperables | `TASK-1469` | `RunState` machine es tipo sin handler (`domain/index.ts:15-40`); Lab hace estados terminales (`model-lab.ts:31-32`) |
| Review / anotar / delivery / revoke | `TASK-1472` | 0 soporte de anotaciones (grep `annotat`=0); `globe.delivery.release` es nombre sin handler (`contracts:10`) |
| SDK/MCP certificado + parity | `TASK-1473` | espejo del Lab por `file:vendor/*.tgz`; sin adapters MCP ni reporte de parity |
| Patterns de diseño | `TASK-1485` | — |
| Modo operativo efectivo (managed/co/client) | `TASK-1466` | `OperatingMode` es tipo huérfano, 0 usos (`domain/index.ts:13`) |

### ② Evolucionó en el diseño — SIN tarea NI backend (evolución pura)

| Capacidad | Naturaleza del gap | Tarea propuesta |
|---|---|---|
| **Prompt Studio** — ingredientes tipados (Sujeto/Estilo/Luz/Encuadre/Mood/Paleta) + pesos → prompt compilado | El backend recibe un string opaco; compilar es business logic sin command | `TASK-1493` |
| **Recetas / plantillas curadas** | Sin recipe/preset/template (`GoldenBriefFixtureV1` es fixture de test, no autorable) | `TASK-1493` |
| **Style DNA** — analizar una referencia para extraer paleta/descriptores/composición + igualar paleta/composición + fuerza de estilo | La referencia cruza como hash y se pasa inline sin inspección (`input-resolver.ts:67-72`); motor nuevo | `TASK-1494` |
| **Formatos objetivo** (1:1/4:5/16:9/9:16) caller-driven + **Set de key visuales / de formatos** (varios outputs coordinados) | aspect ratio hardcodeado por ruta, solo video (`vertex-video-adapter.ts:90`); 1:1/4:5 inexistentes; 1 experimento = 1 output | `TASK-1495` |
| **Receta reproducible** (seed/guidance/steps/sampler) + **Variar** (fan-out N variantes) + **Relanzar** reproducible | 0 campos seed/sampler en el contrato (`contracts:316-333`); sin comando variar/relaunch | `TASK-1496` |
| **Retocar zona / inpaint** (edición por máscara/región) | `editFrom` edita el asset COMPLETO; sin canal de máscara | `TASK-1497` |
| **Mapa de exploración** (grafo padre→hijo navegable) + **dock de candidatos** (enumerar por workspace) | readers son por un solo id; `lineage` da ancestros, no hijos; no hay "list by workspace" | `TASK-1498` |
| **Dirección** — "así entendimos tu brief" (interpretación IA) + decisiones de dirección | Nada interpreta el brief | `TASK-1499` |

### ③ El backend lo tiene — el diseño NO lo expone (backend > diseño)

- **Refinar CROSS-MODEL** (elegir OTRO modelo/ruta para el hijo) — el diferenciador de TASK-1490
  (`contracts:288-292`; router `creative-runner/src/index.ts:210-243`); el drawer "Refinar" no deja elegirlo.
- **`editMode` (stateful/reference), `outputsRetained`, `providerRunChainable`** — para gatear cuándo
  un candidato es refinable (por referencia, solo stateful, o no refinable) antes del gasto.
- **Herencia de derechos por la cadena** (`parentRights`, postura `derived-internal`) — un input
  `licensed` restringe a sus descendientes; el panel de derechos es estático por-run.
- **Evaluation harness** completo (golden briefs + rúbricas + checks objetivos + criterios humanos +
  verdict `objective_pass_pending_human`, nunca auto-score) — el workbench solo muestra un "94" fabricado.
- **Comando `cancel`** (`model-lab.ts:339-357`) — cancelar run no-terminal; la producción no lo ofrece.
- **Referencias `audio` y `text`** válidas (`contracts:245`) que el brief no ofrece.
- **Tres números separados** estimado/reservado/gastado (`contracts:415-418`) que la UI colapsa en uno.

## Descomposición en tareas (categoría ②)

Siete capacidades backend genuinamente distintas, todas `backend-data`, dominio creative, EPIC-028,
que desbloquean el workbench de TASK-1474:

- **TASK-1493** — Structured Brief Composition + Recipe Registry (Prompt Studio + recetas).
- **TASK-1494** — Reference Intelligence / Style DNA (análisis de referencias).
- **TASK-1495** — Target Formats + Multi-format Set Generation (aspect ratio + set coordinado).
- **TASK-1496** — Generation Recipe + Reproducible Relaunch + Variation (seed/sampler + variar + relanzar).
- **TASK-1497** — Regional Edit / Inpaint (edición por máscara sobre el seam de edit de TASK-1490).
- **TASK-1498** — Candidate Exploration Readers + Lineage Graph (enumerar + árbol de hijos).
- **TASK-1499** — Brief Direction / Interpretation (el paso "Dirección").

Las de categoría ① ya existen (`TASK-1466/1468/1469/1472/1473/1485`). La categoría ③ es un ajuste de
diseño/UI dentro de TASK-1474 (exponer capacidades ya construidas), no backend nuevo.

## Nota de método

El análisis midió el diseño contra el runtime real con evidencia `file:line`; no contra la task
`TASK-1474` (que el diseño ya superó). Verificado por grep que `OperatingMode`, `RunState`,
`CreditLedgerEntry` y las capabilities `globe.run.approve`/`globe.delivery.release` no tienen
consumidores fuera de su declaración/test. Estado de rollout del runtime: `Handoff.md` de
`efeonce-globe`, no este documento.
