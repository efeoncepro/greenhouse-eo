# ADR-025 — Pipelines de producción de video: plan declarativo por toma, ejecutores y compuertas

- **Decision:** ADR-025
- **Status:** Accepted (2026-10-03, decisión del operador: «estoy de acuerdo con todo») — sin runtime todavía; implementación en TASK-1989
- **Date:** 2026-10-03
- **Deciders:** operador de Efeonce (aceptó el 2026-10-03); Claude (propuso, sesión «Clasificación de producción de video con IA»)
- **Tags:** creative-production, video, orchestration, cli, graduation
- **Reversibility:** `two-way` mientras viva en el CLI (plan y ledger en archivos); `two-way-but-slow` al graduar a Globe
- **Confidence:** alta en la forma (reutiliza patrones ya probados en el repo); media en el formato exacto de recetas
  hasta correr la primera pieza de punta a punta
- **Related:** ADR-024 (CLI primero) · ADR-012 / SPEC-012 (Storyboard Studio, `ShotRealizationPlan`) · SPEC-002 / G9
  (ciclo de corrida y tope de gasto) · ADR-019 (recibo durable y outbox) · ADR-010 (promoción ≠ entrega) · SPEC-003
  (veredicto objetivo vs humano) · [taxonomía de video](../GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) ·
  [anexo de producto e interfaces](../GREENHOUSE_AI_VIDEO_PRODUCT_AND_INTERFACE_V1.md) ·
  [método de producción](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) ·
  `motion-design-studio/modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md` · RESEARCH-009
- **Program:** [EPIC-051](../../epics/to-do/EPIC-051-ai-video-production-cli-capabilities.md) — TASK-1989 (runner)

---

## Decisión, en una frase

**Una pieza de video se produce como un plan declarativo —un grafo de pasos por toma— que ejecuta un runner local
determinístico: cada paso es una operación de la taxonomía, la hace un ejecutor (uno de nuestros CLIs, un puente de
proveedor o una persona), produce assets con rol y hash, y sólo avanza por compuertas (detectores automáticos,
aprobación humana y autorización de gasto); los modelos generativos son ejecutores de un paso, nunca el
orquestador.**

## 1. Contexto

- **La consistencia sale de la preproducción, no del modelo end-to-end.** Los casos reales lo muestran: en Glitch la
  falla estaba en el still de entrada y más de veinte tomas no convergieron; en CMP-001 y Fiestas Patrias el resultado
  salió de referencias construidas antes (poses del kit, keyframe aprobado). Un modelo que hace todo esconde dónde
  falló y no permite fijar lo que ya está bien.
- **Cada paso ya tiene forma de producto; el grafo no existe.** El inpainting tiene manifiesto, caché por contenido,
  códigos 0/2/3/1 y tope de costo; el pipeline de fotos encadena ficha → prompt → generación → gate medido con canon
  sellado; `ai:fal` y `ai:omni` retoman jobs sin volver a pagar. Pero ninguna herramienta encadena los pasos de una
  pieza, guarda sus aprobaciones ni sabe qué rehacer cuando algo cambia. SKY V17 se orquestó a mano siguiendo el
  método, y costó más de USD 150 sin ledger conciliado.
- **El método ya define el dominio** (proyecto → versión → solicitud → intento → variante; seis dimensiones de
  aprobación; un `completed` sólo acredita recepción; envío único por solicitud) y **Globe ya define el destino**
  (`ShotRealizationPlan` de origen mixto en ADR-012; `prepared → estimated → reserved → running → candidate_ready` en
  SPEC-002; reserva → liquidación en G9; recibo y outbox en ADR-019; promoción ≠ entrega en ADR-010). Falta el puente
  entre ambos en el carril donde hoy se produce: el CLI (ADR-024).
- **Hay intervención humana en las tres fases**, como ejecutora (rodaje, handoff a After Effects o Blender) y como
  aprobadora (stills, animatic, toma elegida, escucha, versión final). Tiene que ser un paso más del grafo, no una
  conversación.

## 2. Decisión

### D1. La unidad es el plan de una pieza: un grafo de pasos por toma

`Producción → Pieza → Toma → Paso`. El plan es un archivo versionado (`plan.json`) que declara, por toma, su
clasificación de la taxonomía (tipo, subtipo, look, contrato de fidelidad, dificultad) y su **plan de realización de
origen mixto** —qué parte se graba, qué se genera, qué es determinístico, qué se licencia—, el mismo concepto que
`ShotRealizationPlan` de ADR-012. Los pasos son **operaciones de la taxonomía** (`pre.keyframe-still`, `gen.i2v`,
`edit.zone`, `finish.overlay`…): el vocabulario cerrado es el contrato.

### D2. Los assets son inmutables, con rol y dirección por contenido

Cada salida de un paso es un **asset** identificado por su sha256, con:

- **rol** (de la taxonomía §3.7: `primer-cuadro`, `sujeto`, `look`, `movimiento`, `fuente`, `audio-ritmo`…);
- **procedencia** (paso, ejecutor y su revisión, parámetros, `request_id`, costo real);
- **derechos** (persona real, voz, música, marca de terceros);
- **aprobaciones por dimensión** (creativa, gasto, derechos, técnica, escucha, publicación — las seis del método).

Los archivos viven en rutas lógicas de `ai-generations/` y se resuelven con `ai-gen:where`/`ai-gen:pull`; lo que se
sella como canon usa el lock existente. **Nunca se regenera, se sustituye ni se aproxima un asset aprobado porque
falta** (regla de almacenamiento vigente).

### D3. Cuatro clases de ejecutor; ninguna orquesta

| Clase | Qué es | Ejemplos |
|---|---|---|
| `cli` | uno de nuestros comandos, lanzado como proceso; devuelve manifiesto y código 0/2/3/1 | `foto:*`, `ai:image`, `ai:fal`, `ai:omni`, `ai:inpaint`, `ai:track`, `video:finish`, `video:ui` |
| `puente` | la herramienta de un proveedor envuelta con nuestro adaptador (estimación, tope, manifiesto) | CLI de la app de Higgsfield (TASK-1986) |
| `humano` | una tarea con instrucción, entrada y salida esperada por rol | rodar el producto, animar en After Effects, elegir la toma, escuchar la mezcla |
| `local` | cálculo determinístico sin proveedor dentro del runner | validar el plan, sumar estimaciones, comparar hashes |

Regla «propio primero» (taxonomía §1): si una operación tiene ejecutor `cli` con canario, el plan no puede asignarle
un `puente` sin una razón escrita.

### D4. Tres clases de compuerta, separadas como las dimensiones del método

| Compuerta | La decide | Cómo |
|---|---|---|
| **automática** | el detector del paso | código de salida 0 pasa · 2 falla · 3 queda en revisión humana · 1 error |
| **humana** | una persona de la lista de aprobadores | aprobación o rechazo con nombre, fecha, nota y dimensión; **el agente nunca aprueba** su propio gasto ni la creatividad |
| **de gasto** | el operador | autorización de un monto para el plan; cada paso pagado **reserva** contra ese monto y **liquida** con el costo real (ciclo del módulo 13 y de G9) |

Un veredicto automático nunca es aprobación creativa (SPEC-003: `objective_pass_pending_human`). La publicación queda
**fuera** del runner (promoción ≠ entrega).

### D5. Las referencias se aprueban antes de producir (la regla que da consistencia)

**Un paso de producción generativa no se puede ejecutar si alguna de sus entradas de referencia no está aprobada en la
dimensión creativa.** El still de entrada, la hoja de identidad del cast y el inserto de UI pasan por su compuerta
humana antes de que se gaste un crédito de video. Es la forma mecánica de «la consistencia sale de la preproducción».
Lo mismo con el gate de Glitch: el still debe coincidir con el primer cuadro del contrato de fidelidad.

### D6. Runner determinístico, ledger append-only, retome e invalidación

- **Estado:** `plan.json` (revisión con hash) + `ledger.jsonl` (eventos append-only: transiciones, `request_id`,
  estimaciones, reservas, liquidaciones, aprobaciones) + `assets/` + `manifest.json` por paso. Sin base de datos.
- **Retome:** el `request_id` se escribe en el ledger **antes** de esperar; un corte o timeout retoma, nunca reenvía
  (regla del método y de `ai:fal`).
- **Caché:** cada paso tiene huella = hash de sus entradas + ejecutor y revisión + parámetros (patrón del inpainting).
  Misma huella con salida aprobada = no se vuelve a pagar.
- **Invalidación (semántica de build):** si cambia un asset aguas arriba (otro still aprobado), los pasos que lo
  consumieron pasan a `stale` y sus aprobaciones dejan de valer. El runner sólo rehace lo `stale`.
- **Paralelismo acotado:** tomas independientes corren en paralelo hasta el límite de concurrencia del proveedor.

### D7. Máquina de estados del paso

```text
planned ─▶ blocked ─(entradas aprobadas)─▶ ready ─▶ estimated ─▶ awaiting_budget ─▶ reserved ─▶ running ─▶ produced
                                                                                                 │
             ┌───────────────────────────────────────────────────────────────────────────────────┘
             ▼
          checking ─▶ passed ─▶ awaiting_approval ─▶ approved          (cualquier estado ─▶ cancelled)
             │                        └──────────▶ rejected ─▶ (nueva variante o cambio de plan)
             ├─▶ review ─▶ awaiting_approval
             └─▶ failed (liquida a costo real con evidencia si hubo trabajo del proveedor; libera si fue infraestructura)
approved ─(cambia una entrada)─▶ stale ─▶ ready
paso humano: ready ─▶ awaiting_human ─▶ produced ─▶ …
```

Correspondencia con el método: propuesto = `planned`; autorizado = `reserved`; enviado/procesando = `running`;
recibido = `produced`; revisado = `checking`/`review`; aceptado/rechazado = `approved`/`rejected`; integrado = consumido
por un paso aguas abajo; entregado = el paso `deliver.export` aprobado. Con Globe (SPEC-002): `estimated`, `reserved`,
`running` y `produced`/`candidate_ready` coinciden; `failed` sigue la distinción honesta de G9.

### D8. Recetas = datos; el agente puede proponer el plan, nunca saltarse sus compuertas

- Una **receta** es una plantilla de grafo por formato o tipo (feature spotlight, producto con mano, loop de
  atmósfera…) con parámetros. Vive como dato versionado, con un solo motor que la instancia (sin `switch` por receta).
- **Builder → runner** (RESEARCH-009): un agente o una persona arma o adapta el plan desde una receta; el runner lo
  **valida** antes de ejecutar: esquema, vocabulario de la taxonomía y reglas duras (texto y logo nunca en un paso
  generativo; referencias de personas reales nunca a un motor con filtro de personas; 4:5 se genera en 3:4; audio
  apagado si la pieza no admite voz). Cambiar un plan aprobado crea una **revisión** nueva y marca `stale` lo afectado.
- El plan declara el **modo de operación** (Efeonce, cliente o compartido) y quién aprueba cada dimensión
  (`operator_of_record`, RESEARCH-009).

### D9. Dónde vive y cómo se gradúa

| Pieza | Hogar hoy | Al graduar (ADR-024) |
|---|---|---|
| Esquema del plan, validación, orden topológico, huellas, invalidación, máquina de estados, agregación de presupuesto, esquema del ledger | `scripts/ai/video/pipeline/core/**` (puro, sin `@/`, disco ni red) | `@efeoncepro/axis-creative-core` |
| Runner, ejecutores, lectura de manifiestos, ffmpeg | `scripts/ai/video/pipeline/**` | se queda en el CLI; Globe acuña su orquestación sobre su ciclo durable |
| Plan de una pieza | `plan.json` | Narrative Project + `ShotRealizationPlan` (ADR-012) |
| Paso pagado | evento en `ledger.jsonl` | corrida gobernada (SPEC-002) con recibo y outbox (ADR-019) |
| Compuerta de gasto | autorización + reserva/liquidación en el ledger | G9 + libro de créditos (TASK-1468) |
| Compuerta humana | aprobación en el ledger | aprobación del candidato (ADR-010) |
| Veredicto automático | código de salida + detectores | `objectiveChecks` del Evaluation Harness (SPEC-003) |

## 3. Comandos (contrato del CLI)

```bash
pnpm video:plan --recipe feature-spotlight --params piece.json   # instancia y valida; no gasta
pnpm video:plan plan.json --estimate                              # árbol de costo por paso y compuertas pendientes
pnpm video:run plan.json [--until <paso>] [--step <paso>]         # ejecuta lo listo; se detiene en compuertas
pnpm video:approve plan.json <paso> --dimension creativa --by <aprobador> [--note "…"]
pnpm video:reject  plan.json <paso> --by <aprobador> --note "…"
pnpm video:budget  plan.json --authorize <USD> --by <aprobador>   # compuerta de gasto del plan
pnpm video:status  plan.json                                      # grafo con estado, costo estimado y real
pnpm video:recipe  list | show <receta>
```

## 4. Ejemplo: «feature spotlight» de 15 s con nuestro portal

```text
PRE   brief + ficha ───────────────▶ [humana: brief]
      cast (anclas de Nexa o elenco) ▶ [automática: foto:rostro] ▶ [humana: creativa]
      still P2 (foto:generar) ───────▶ [automática: foto:validar] ▶ [humana: creativa]
      guion de interfaz ─────────────▶ inserto P6 (video:ui, 0 créditos) ▶ [automática: legibilidad]
      animatic (video:finish con stills + P6) ▶ [humana: ritmo]
      presupuesto del plan ──────────▶ [gasto: autorización]
PROD  P2 gen.i2v (ai:fal, motor del banco) ◀─ still aprobado ▶ [automática: fidelidad del primer cuadro] ▶ [humana: toma]
      P5 gen.i2v macro del gesto ────▶ [automática] ▶ [humana: toma]
POST  corte en la acción (video:ui sync) ▶ montaje por EDL (video:finish) ▶ overlay y firma (video:finish)
      música y mezcla ───────────────▶ [humana: escucha]
      reencuadre 9:16 y 4:5 (video:finish, franjas medidas) ▶ export con hash ▶ [humana: versión final]
      publicación ── fuera del runner
```

Si se cambia el still P2 después de aprobado: P2 y todo lo que lo consumió pasan a `stale`; P6, el animatic de UI y la
música no se tocan.

## 5. Alternativas consideradas

| Alternativa | Por qué no ahora |
|---|---|
| Modelo end-to-end con un prompt largo | no fija lo que ya está bien ni muestra dónde falló; la consistencia sale de referencias construidas antes |
| Motor de workflows externo (Temporal, Airflow, n8n) | infraestructura nueva para un carril local out-of-band; el destino durable ya es Globe |
| ComfyUI u otro grafo de nodos visual | pensado para difusión local; no modela nuestra mezcla de proveedores, aprobaciones humanas ni gasto |
| Orquestación libre por un agente en tiempo de ejecución | no reproducible ni presupuestable; el agente propone el plan, no lo ejecuta sin compuertas |
| Construirlo directo en Globe | hibernado; ADR-024 fija CLI primero |
| Scripts ad hoc por pieza (estado actual) | sin reutilización, sin ledger, con deriva de costo (SKY) |
| Ledger en PostgreSQL | sin runtime de producto que lo justifique; archivos append-only bastan y se traducen al ciclo durable de Globe |

## 6. Consecuencias

**Positivas.** Una falla queda localizada en un paso; lo aprobado no se vuelve a pagar; cambiar una referencia rehace
sólo lo afectado; el gasto queda reservado y liquidado contra una autorización; las recetas convierten piezas
repetibles (sobre todo producto digital con personas) en datos; cada paso que madura con su canario se puede graduar
por separado.

**Negativas.** Más disciplina antes de generar (aprobar stills y animatic antes de gastar); un formato de plan que hay
que mantener; el runner local depende de la máquina y las sesiones del operador.

**Estructurales.** Las tasks del programa (TASK-1979 a TASK-1988) pasan a ser **ejecutores** del runner: cada una debe
devolver manifiesto y código de salida con la forma del inpainting.

## 7. Cuatro pilares

| Pilar | Cómo se cumple |
|---|---|
| **Safety** | Ningún paso pagado sin autorización del plan y reserva; tope por paso; el agente no aprueba gasto ni creatividad; validación del plan antes de ejecutar (texto y logo nunca generativos, personas reales nunca a motores con filtro, derechos antes de usar referencias reales); publicación fuera del runner |
| **Robustness** | Pasos idempotentes por huella; `request_id` persistido antes de esperar; roles de asset validados; ciclos rechazados; invalidación por hash; ledger append-only (nunca se edita una transición) |
| **Resilience** | Retome desde el ledger tras un corte; fallas del proveedor liquidan con evidencia y fallas de infraestructura liberan (G9); reintentos acotados por clase; detención ante diferencia no explicada entre estimado y real (lección SKY) |
| **Scalability** | Recetas reutilizables; tomas en paralelo con límite de concurrencia; árbol de costo antes de gastar; localización por fan-out determinístico de la UI; el formato admite que la expansión de campañas (EPIC-050) instancie muchos planos desde un brief |

## 8. Reglas duras

- **NUNCA** dejar que un modelo generativo orqueste una pieza: los modelos son ejecutores de un paso.
- **NUNCA** ejecutar un paso de producción generativa con una referencia sin aprobación creativa.
- **NUNCA** reenviar un paso por timeout: se retoma por `request_id`.
- **NUNCA** editar o borrar una línea del ledger; los cambios son eventos nuevos.
- **NUNCA** dejar que un agente apruebe gasto, creatividad o publicación.
- **NUNCA** considerar un veredicto automático como aprobación creativa.
- **SIEMPRE** que cambie una entrada aprobada, marcar `stale` todo lo que la consumió.
- **SIEMPRE** que una operación tenga ejecutor propio con canario, usarlo antes que un puente de proveedor.

## 9. Preguntas abiertas (deliberadamente no decididas)

- Formato exacto de las recetas (parámetros, herencia entre recetas) — se fija con las tres primeras.
- Si la expansión de campañas de Creative Workbench (repo aparte, EPIC-050, hoy sólo imagen) consumirá este formato de
  plan para video, o al revés.
- Dónde vive la lista de aprobadores de video (reutilizar `aprobadores.json` de fotos o una propia).
- Cuándo y cómo se muestra el grafo en una superficie visual (por ahora `video:status` en terminal y la página de la
  taxonomía).

## 10. Roadmap

| Slice | Entrega | Gasto |
|---|---|---|
| 1 | Núcleo: esquema del plan, validación con reglas de la taxonomía, orden topológico, huellas, máquina de estados, estimación agregada | 0 |
| 2 | Runner y ledger con retome; ejecutores `cli` para `foto:*`, `ai:image`, `ai:fal`, `ai:omni`, `ai:inpaint` | 0 (con `--dry-run`) |
| 3 | Compuertas humana y de gasto; invalidación `stale`; `video:status` | 0 |
| 4 | Tres recetas: feature spotlight, producto con mano, loop de atmósfera | 0 |
| 5 | Primera pieza real de punta a punta (el canario C13 corrido como plan) | autorizado aparte |

## 11. Revisit when

- La primera pieza de punta a punta muestre que el grafo por toma no alcanza (por ejemplo, dependencias entre tomas
  más finas que la toma).
- Globe se reactive y decida orquestar sobre su ciclo durable: se gradúa el núcleo y se traduce el plan.
- Creative Workbench extienda su alcance a video.
