# Manual — Operar los proveedores del Model Lab de Efeonce Globe y comparar motores en una eval

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.1
> **Creado:** 2026-07-19 por Claude (TASK-1486/1487/1488)
> **Ultima actualizacion:** 2026-07-20 por Claude (editar un candidato + servicio interno desplegado)

## Para qué sirve

El **Model Lab** de Efeonce Globe dejó de correr solo con un simulador: ahora tiene **proveedores reales**. Este manual te dice cómo el operador **elige el motor** (`GLOBE_LAB_PROVIDER`), **qué modelo sirve cada capacidad creativa**, y cómo leer la **matriz de recomendación** cuando se corre un mismo golden brief por varios motores para compararlos.

En palabras simples: el Model Lab es el banco de pruebas; los proveedores son los "motores" que puedes enchufar detrás de él; y la eval es cómo comparas esos motores de forma honesta para un mismo caso. Este manual es el **puente desde Greenhouse**: como Globe es una **plataforma hermana** (repo `efeonce-globe`), el flujo real por SDK vive en ese repo; acá queda el mapa, el gobierno y las señales que debes saber leer.

Si todavía no operaste el Lab ni una eval, lee primero los manuales hermanos: [Correr un experimento en el Model Lab](./efeonce-globe-model-lab.md) y [Evaluar un golden brief en el Evaluation Harness](./efeonce-globe-evaluation-harness.md). Este manual asume que ya los entiendes y se enfoca en la capa de **proveedores + comparación de motores**.

## Antes de empezar

- **Dónde vive el código:** repo hermano `efeonce-globe` (por convención local `../efeonce-globe`). NO es parte del build de `greenhouse-eo`; tiene su propio toolchain (Node 24 nativo, `pnpm check` / `pnpm build`).
- **Quién gobierna:** Greenhouse. El trabajo se hace bajo las tasks de Greenhouse (control plane), gobernadas por `EPIC-028`. No se crea un registry de tareas paralelo en Globe.
- **Skill obligatoria:** invoca **`greenhouse-globe`** antes de tocar el repo de Globe. Encapsula el boundary, el flujo de extensión de capabilities y las reglas duras.
- **El kill switch manda sobre el motor.** `GLOBE_LAB_ENABLED` decide si **algún** experimento corre; `GLOBE_LAB_PROVIDER` solo decide **qué proveedor** ejecuta cuando sí corre. Con el Lab apagado, ningún motor corre (responde `policy_blocked`).
- **Fake es gratis; los demás facturan.** El default `fake` es determinista, sin red y sin gasto. `vertex`, `fal` y `composite` hacen llamadas reales facturables — el tope de gasto duro por corrida (`hardCapCredits`) y el tope diario del espacio de trabajo (`GLOBE_LAB_DAILY_CAP_CREDITS`) siguen siendo tu freno.
- **La primera llamada facturable entra solo por el seam.** El camino es siempre `command → adapter → runner`. Ningún SDK de proveedor se llama directo (ni por script, CLI, UI o MCP): el proveedor real se inyecta en el runner.
- **El studio-web ya está desplegado (interno) — pero apagado.** Desde el 2026-07-20 el studio-web con los motores reales (Omni, Veo, Seedance) corre en Cloud Run como servicio **privado/interno** (`globe-studio-internal`). Está **desplegado con `GLOBE_LAB_PROVIDER=fake`**, así que **no gasta por sí solo**: prenderlo es una decisión tuya (flip de `GLOBE_LAB_ENABLED` + `GLOBE_LAB_PROVIDER`), no un efecto del deploy.

## Elegir el motor (`GLOBE_LAB_PROVIDER`)

Se fija por variable de entorno. Valores válidos y qué hace cada uno:

| Valor | Motor | Qué es | Gasto | Credenciales |
| --- | --- | --- | --- | --- |
| `fake` *(default)* | `FakeReferenceAdapter` | Simulador determinista. No toca la red. Es el motor de ensayo. | Cero | Ninguna |
| `vertex` | `VertexCreativeAdapter` | Adaptador Google-native **sin llaves** (ADC/WIF). Sirve imagen y video. | Factura | Keyless (federadas) |
| `fal` | `FalCreativeAdapter` | Adaptador **no-Google**. Sirve las 10 capacidades verificadas en vivo (Seedream, Recraft, Topaz, Seedance, Seed Audio, ElevenLabs, Hyper3D Rodin). | Factura | Key **propia de Globe** (`GLOBE_FAL_API_KEY`) |
| `composite` | `CompositeProviderAdapter` | Combina Vertex + Fal detrás de una sola interfaz y rutea por capacidad. | Factura | Las de ambos hijos |

Reglas de operación:

- **Un valor desconocido cae a `fake`.** Si escribes mal el valor, el Lab no revienta: corre el simulador. Verifica el valor efectivo antes de asumir que estás gastando en un motor real.
- **`fal`/`composite` fallan cerrado sin la key.** El adaptador Fal usa el secreto **propio de Globe** `GLOBE_FAL_API_KEY`, **nunca** la `greenhouse-fal-api-key` de Greenhouse. Si la key falta, la corrida se detiene antes de proceder — no hay fallback silencioso.
- **`vertex` es keyless.** Usa credenciales federadas (ADC/WIF, scope cloud-platform); no hay API key que rotar. El token se obtiene y se usa dentro del proceso, nunca sale de él.

## Qué modelo sirve cada capacidad

Cada capacidad semántica del Lab está mapeada a un modelo verificado. El registro de modelos vive **dentro de cada adaptador**, no en el dominio ni en el contrato.

**Motor `fal` (no-Google, 10 capacidades verificadas en vivo 2026-07-19):**

| Capacidad | Medio | Modelo | Slug Fal | Créditos |
| --- | --- | --- | --- | --- |
| `image-generate` | Imagen | Seedream 5 Pro | `bytedance/seedream/v5/pro/text-to-image` | 10 / salida |
| `image-edit` | Imagen | Seedream 5 Pro (edit) | `bytedance/seedream/v5/pro/edit` | 10 / salida |
| `image-vectorize` | Vector | Recraft v4.1 | `fal-ai/recraft/v4.1/text-to-vector` | 4 / salida |
| `image-upscale` | Imagen | Topaz Upscale | `fal-ai/topaz/upscale/image` | 6 / salida |
| `video-generate` | Video | Seedance 2.0 | `bytedance/seedance-2.0/text-to-video` | 4 / segundo |
| `video-extend` | Video | Seedance 2.0 (image-to-video) | `bytedance/seedance-2.0/mini/image-to-video` | 4 / segundo |
| `video-upscale` | Video | Topaz Upscale | `fal-ai/topaz/upscale/video` | 20 / salida |
| `audio-generate` | Audio | Seed Audio | `fal-ai/seed-audio` | 6 / salida |
| `speech-synthesize` | Voz | ElevenLabs TTS multilingual v2 | `fal-ai/elevenlabs/tts/multilingual-v2` | 4 / salida |
| `model-3d-generate` | 3D | Hyper3D Rodin v2.5 | `fal-ai/hyper3d/rodin/v2.5/text-to-3d` | 16 / salida |

> Detalle útil: Seed Audio toma el texto por el campo `prompt`; ElevenLabs lo toma por `text`. Los créditos son la **unidad estable del Lab** que topa el freno de gasto — no son la facturación comercial (esa vive en el ledger de créditos, capacidad aparte, TASK-1468).

**Motor `vertex` (Google-native, keyless):** sirve un subconjunto — imagen y video — con modelos Google:

| Capacidad | Modelo Google | Región | Nota |
| --- | --- | --- | --- |
| `image-generate` / `image-edit` | Nano Banana (`gemini-2.5-flash-image`) | `global` | PUBLIC_PREVIEW |
| `video-generate` / `video-extend` | Gemini Omni Flash (`gemini-omni-flash-preview`) | `global` | PUBLIC_PREVIEW |

**Motor `composite`:** no inventa modelos; combina los dos anteriores y rutea así:

- Las capacidades que **solo Fal** cubre (vectorize, upscale de imagen y video, audio, voz, 3D) → van a **Fal**, porque es el único hijo que las soporta.
- Las capacidades que **ambos** cubren (imagen y video generación/edición) son un solapamiento y se resuelven con una **política explícita** (`DEFAULT_COMPOSITE_POLICY`), nunca por azar. Hoy esa política enruta imagen y video a **Vertex** (Google-native, keyless, verificado en vivo); Seedream/Seedance quedan alcanzables usando el motor `fal` directo.
- El `poll` (seguimiento de la corrida) vuelve siempre al hijo que la produjo, así un espacio de trabajo que mezcló motores entre intentos se mantiene correcto.

## Editar un candidato ya generado (encadenable)

Ya no solo generas desde cero: puedes **tomar un candidato que el Lab produjo y pedirle un cambio**, por el **mismo flujo gobernado**. El resultado es un **candidato nuevo** (no pisa el original) y, como es otro candidato, lo puedes **volver a editar** — se encadena. Verificado en vivo el 2026-07-20 con video: generar → editar → nuevo video editado.

Pasos:

1. **Genera el candidato con `store`.** Para poder editarlo después, la corrida de generación tiene que **guardar la salida** (flag `store`), no solo devolverla. Sin eso, no hay pieza persistida a la cual apuntar el editar.
2. **Apunta el editar a ese candidato.** El editar entra por el mismo `command → adapter → runner`, tomando como insumo el candidato guardado. No llamas ningún SDK: es el seam de siempre.
3. **Recibe el candidato editado.** La salida es un **candidato nuevo**, encadenable (puedes editar el editado). Igual que en la generación, es un **candidato técnico, nunca una aprobación**.

Notas de operación:

- **Editar corre en la superficie Gemini API de Omni**, con la llave propia de Globe **`globe-gemini-api-key`**. La superficie **keyless de Vertex genera pero no edita**; por eso, cuando quieras un candidato editable, la generación se hace en la superficie Gemini (no en la keyless).
- **Ojo con el costo del editar.** El editar vía Gemini API es **pay-as-you-go: US$0,10 por segundo, sin free tier**. El plan **"Gemini Enterprise" por asiento NO sirve** para esto (esto es facturación por uso de API, no per-seat). El tope de gasto por corrida y el diario siguen siendo tu freno.
- **Alcance de hoy.** El editar encadenable está verificado en **Omni (video)**. Generalizarlo a los demás motores (Seedream, Seedance, Nano-Banana por referencia) y soportar **varias referencias o referencias combinadas** es `TASK-1490`, aún pendiente — no lo asumas disponible en otros motores.

## Correr una eval y leer la matriz de recomendación

La eval se opera por el **Evaluation Harness** (manual [efeonce-globe-evaluation-harness.md](./efeonce-globe-evaluation-harness.md)): corre un **golden brief** por el camino real del Lab y emite un **reporte por intento** con checks objetivos + criterios humanos. La comparación de motores es el uso natural de esa capa: **corres el mismo golden brief (mismo `fixtureId` + `rubricId`) una vez por motor** (cambiando `GLOBE_LAB_PROVIDER`) y pones los reportes lado a lado.

Esa tabla lado-a-lado es la **matriz de recomendación**. Léela por columnas, en este orden:

1. **Costo** — créditos estimados vs reales del manifiesto de cada intento (por ejemplo, `image-generate` cuesta 10 créditos tanto en Seedream/`fal` como en Nano Banana/`vertex`; en otras capacidades sí difieren). Es la primera cota dura.
2. **Latencia** — la duración estimada del modelo (y la real cuando la corrida termina). Sirve para decidir si un motor cabe en el tiempo del flujo.
3. **Objetivo** — los cinco checks deterministas del reporte: output presente, dentro del tope, lineage de inputs intacto, ruta estable, outcome candidato. Todos deben pasar; si uno falla, ese motor se cae para ese caso.
4. **Criterios humanos** — las preguntas de oficio del reporte (`humanCriteria`). **El harness las declara pero NO las responde**: no traen `pass` ni `score`. Esta columna la juzga un humano, y es la que decide la **fidelidad creativa real** — la máquina no la puede auto-puntuar por diseño.

Reglas al comparar:

- **La matriz recomienda, no aprueba.** El mejor verdict posible por intento es `objective_pass_pending_human` ("lo técnico está OK, falta el juicio humano"), nunca un "aprobado creativo". Elegir un motor es una decisión humana informada por costo/latencia/objetivo **más** el juicio de los criterios humanos.
- **Compara peras con peras.** Usa el mismo fixture y la misma rúbrica (misma versión) en todos los motores; cada reporte trae `fixtureVersion` + `rubricVersion` justo para eso.
- **Un modelo no es "mejor" en abstracto.** Es mejor **para un contrato de fidelidad concreto** (still, motion, foley, etc.). La eval siempre compara dentro de un contrato; fixture y rúbrica deben ser del mismo o la respuesta es `invalid_request`.
- **Hoy la eval con `fake` solo mide lo técnico** y lo declara como limitación. Con proveedor real (`vertex`/`fal`/`composite`) la comparación de costo/latencia/objetivo se vuelve significativa entre motores; el juicio de los criterios humanos sigue siendo humano.

## Tips operativos (verificados en vivo)

- **ByteDance en Fal usa el slug SIN prefijo `fal-ai/`.** Los modelos ByteDance (Seedream, Seedance) usan un slug **pelado** — `bytedance/seedream/v5/pro/text-to-image`. Todos los demás (Seed Audio `fal-ai/seed-audio`, Recraft, Topaz, ElevenLabs, Hyper3D Rodin) **sí** llevan el prefijo `fal-ai/`. Poner el prefijo donde no va, o quitarlo donde sí va, apunta a un modelo que no existe.
- **Para verificar si un slug existe:** haz `POST {}` (cuerpo vacío) a `https://fal.run/<slug>`. Un **404** = el modelo/app no existe (slug equivocado); un **422** = el modelo existe (te rechaza por validación del payload, que es lo esperado con cuerpo vacío). Es la forma rápida de confirmar un slug antes de cablearlo.
- **La primera llamada facturable entra solo por el seam.** Ningún modelo se prueba llamando su SDK directo: el primer gasto real pasa por `command → adapter → runner`. Si necesitas verificar un slug crudo, usa el `POST {}` de arriba (que no gasta), no un SDK del proveedor.
- **La key de Fal es propia de Globe y falla cerrado.** `GLOBE_FAL_API_KEY` es el secreto de Globe, nunca la de Greenhouse. Sin ella, `fal`/`composite` no proceden. **Pendiente:** el aprovisionamiento y rotación gobernados de la key propia de Globe (bucket privado + presupuesto + alertas vivas) aún dependen de la infra de `TASK-1464`.
- **Vertex es PUBLIC_PREVIEW y regional.** Reverifica id de modelo, región y precio contra el Vertex model garden antes de comprometer gasto. El video de Omni Flash corre en región **`global` únicamente** (`us-east4`/`us-central1` responden NOT_FOUND).

## Qué no hacer

- **NUNCA** llames a un SDK de proveedor directo (Vertex, Fal, OpenAI, etc.) desde Globe — ni por script, CLI, UI, MCP o test. Todo gasto pasa por `command → adapter → runner`; un `import` de vendor dentro de un handler es un defecto.
- **NUNCA** uses la `greenhouse-fal-api-key` de Greenhouse para el motor `fal` de Globe. Globe usa su **propio** secreto (`GLOBE_FAL_API_KEY`); no compartas llaves entre plataformas.
- **NUNCA** asumas que estás en un motor real solo porque pusiste `GLOBE_LAB_PROVIDER`: un valor inválido cae a `fake`. Confirma el motor efectivo antes de dar por hecho que hubo gasto.
- **NUNCA** trates la matriz de recomendación como una aprobación creativa. Recomienda con costo/latencia/objetivo + criterios humanos; la autorización de una pieza es un paso humano aparte que hoy ni siquiera tiene surface.
- **NUNCA** esperes que el harness responda los `humanCriteria`. Son preguntas para el revisor, por diseño; un `pass` autogenerado en ellas sería un bug.
- **NUNCA** compares motores con fixtures o rúbricas distintas (o de contratos de fidelidad distintos) y llames a eso "comparación". La respuesta correcta a un cruce de contratos es `invalid_request`, no un reporte.
- **NUNCA** enciendas un motor real sin credenciales resueltas (WIF/ADC para Vertex; `GLOBE_FAL_API_KEY` para Fal), bucket privado y alertas de presupuesto vivas.
- **NUNCA** compartas base de datos, sesión, bucket, secreto ni rol admin entre Globe y Greenhouse; **NUNCA** crees un registry/namespace de tareas paralelo en Globe.

## Problemas comunes

- **"Puse `GLOBE_LAB_PROVIDER=vertex` pero no gasta / se comporta como simulador":** probablemente el valor efectivo cayó a `fake` (typo → fallback silencioso) o el Lab está apagado (`GLOBE_LAB_ENABLED` OFF, que manda sobre el motor). Verifica ambos.
- **"El studio-web ya está desplegado, ¿por qué no genera con motor real?":** porque quedó desplegado en `fake` a propósito (servicio interno `globe-studio-internal`, 2026-07-20). El deploy **no** enciende motores; se encienden con el flip gobernado de `GLOBE_LAB_ENABLED` + `GLOBE_LAB_PROVIDER` tras los gates.
- **"Quiero editar un candidato pero dice que no hay insumo":** la generación previa no guardó la salida. Vuelve a generar **con `store`** para que quede una pieza persistida a la cual apuntar el editar; recuerda que el editar corre en la superficie Gemini API (con `globe-gemini-api-key`), no en la keyless de Vertex.
- **`fal`/`composite` no procede:** falta la key propia de Globe (`GLOBE_FAL_API_KEY`). El adaptador falla cerrado a propósito para que una corrida mal aprovisionada no siga.
- **Vertex responde NOT_FOUND en video:** Omni Flash corre solo en región `global`. Cualquier otra región (`us-east4`, `us-central1`) da 404. Revisa la región del modelo, no el prompt.
- **Un slug de Fal "no existe":** confírmalo con `POST {}` a `https://fal.run/<slug>` (404 = no existe, 422 = existe). Si es ByteDance (Seedream/Seedance), revisa que el slug esté **sin** el prefijo `fal-ai/`.
- **La matriz "no recomienda un ganador":** correcto y esperado. La eval entrega costo/latencia/objetivo por motor y **declara** los criterios humanos sin puntuarlos; el ganador lo elige un humano. Ningún reporte declara un modelo "mejor" en abstracto.
- **El reporte dice "proveedor fake / muestra única":** si comparaste con `fake`, solo mediste lo técnico y sobre una sola corrida. Para una comparación significativa entre motores usa `vertex`/`fal`/`composite` (facturan) y corre el mismo brief en cada uno.
- **No valida Globe con `pnpm local:check` de Greenhouse:** correcto, son toolchains distintos. Valida Globe con `pnpm check` / `pnpm build` dentro de `efeonce-globe`.

## Referencias técnicas

- Model Lab (base que estos proveedores enchufan): manual [`efeonce-globe-model-lab.md`](./efeonce-globe-model-lab.md).
- Evaluation Harness (leer un reporte de eval en detalle): manual [`efeonce-globe-evaluation-harness.md`](./efeonce-globe-evaluation-harness.md).
- Runbook operativo (repo hermano): [`docs/operations/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`](../../operations/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) §7-bis (Model Lab) / §7-ter (Evaluation Harness).
- Spec técnica canónica del Model Lab (SPEC-002): [`docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md).
- Documentación funcional (Greenhouse), en lenguaje simple: [`docs/documentation/creative-studio/efeonce-globe-model-lab.md`](../../documentation/creative-studio/efeonce-globe-model-lab.md).
- Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md). Skill: `greenhouse-globe`.
