# Efeonce Globe — Proveedores del Model Lab (Vertex + Fal + Composite, 10 capacidades)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-07-19 por Claude (TASK-1486/1487/1488/1459)
> **Ultima actualizacion:** 2026-07-20 por Claude (editar sobre lo generado + publicado interno)
> **Documentacion tecnica:** [`docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md) (§"Realización — VertexCreativeAdapter" y §"Segundo adapter — Fal + Composite")

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce (imagen, video, audio, voz, 3D). Greenhouse **no la hospeda**: la **gobierna**. Greenhouse es dueño de la identidad, el acceso deseado y el control de tareas/EPICs; Globe es dueño de su propio código, runtime, datos, secretos de proveedor y evidencia creativa. Se integran como pares, sin compartir base de datos, sesión, buckets, secretos ni acceso admin.

Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, quiénes son los **proveedores reales** que ya se conectaron al [Model Lab](efeonce-globe-model-lab.md), qué modelos cubren cada capacidad, cómo se elige un proveedor y qué es la **matriz de recomendación**. La spec técnica y esta documentación funcional viven en Greenhouse (control plane documental, EPIC-028); en el repo `efeonce-globe` solo vive el **código** de los adapters (enlaces al final).

## Qué cambió: del ensayo a proveedores reales (en simple)

Cuando nació, el Model Lab corría con un **proveedor de ensayo** (un simulador determinístico que no tocaba la red y no gastaba nada) — servía para probar todo el mecanismo (preparar con tope, ingesta por huella, estimar, frenar, reservar, correr, saldar, dejar evidencia) sin abrir la puerta a un proveedor real.

Ese paso ya se dio. Hoy el Model Lab tiene **proveedores de verdad conectados** y las **10 capacidades quedaron verificadas en vivo** el 2026-07-19. Importante: los proveedores se enchufaron **sin cambiar el mecanismo**. El Lab sigue enrutando por **capacidad semántica** (un verbo como "generar imagen", nunca un nombre de modelo del proveedor), y el modelo real vive **dentro del adapter** — el autor de un experimento nunca elige un modelo por su nombre.

## Los tres proveedores

Un **proveedor** es el adapter que traduce una capacidad semántica ("generar video") a la llamada real del motor y devuelve la evidencia (huellas del resultado, costo real, ruta que corrió). Hay tres, más el simulador de ensayo:

- **Vertex (sin llaves).** El proveedor **Google-native**. Se autentica por identidad federada (ADC/WIF), **sin API key** guardada: la credencial se resuelve del lado del servidor y nunca cruza al dominio ni a la evidencia. Cubre lo que Google hace nativo: **imagen** (Nano Banana) y **video** (Gemini Omni Flash). Para todo lo demás dice explícitamente "no lo cubro", y eso pasa a Fal.
- **Fal (con llave propia de Globe).** El proveedor del **stack no-Google**: reúne los motores especializados (ByteDance, Recraft, Topaz, ElevenLabs, Hyper3D). Usa una API key **propia de Globe** (secreto `GLOBE_FAL_API_KEY`), nunca la del repo de Greenhouse. Cubre vectorizar, upscalear, audio, voz, 3D y también imagen/video con motores alternativos.
- **Composite (los dos juntos).** Combina Vertex + Fal detrás de la **misma interfaz**. Para lo que sólo cubre uno, rutea solo; para lo que **ambos** saben hacer (imagen y video) aplica una **política explícita** — por defecto elige el camino Google-native de Vertex, dejando los motores de Fal alcanzables cuando se piden a propósito.
- **Fake (ensayo).** El simulador determinístico original. **Cero red, cero gasto.** Sigue siendo el **valor por defecto del runtime desplegado**: mientras nadie elija otro, el Lab no gasta.

## Las 10 capacidades y qué modelo cubre cada una

El vocabulario de capacidades creció a **10 verbos semánticos**. Estos son los modelos **verificados en vivo** el 2026-07-19 (la fuente de verdad es lo probado, no un catálogo teórico):

| Capacidad (verbo semántico) | Qué hace, en simple | Modelo verificado en vivo | Proveedor |
| --- | --- | --- | --- |
| Generar imagen | Crea una imagen desde texto | Nano Banana (`gemini-2.5-flash-image`) · Seedream 5 Pro | Vertex · Fal |
| Editar imagen † | Modifica una imagen existente | Nano Banana · Seedream 5 | Vertex · Fal |
| Vectorizar imagen | Convierte a gráfico vectorial | Recraft v4.1 | Fal |
| Upscalear imagen † | Sube la resolución de una imagen | Topaz | Fal |
| Generar video | Crea un video desde texto | Gemini Omni Flash · Seedance 2.0 | Vertex · Fal |
| Extender video † | Alarga un video existente | Gemini Omni Flash · Seedance 2.0 | Vertex · Fal |
| Upscalear video † | Sube la resolución de un video | Topaz | Fal |
| Generar audio | Crea sonido/audio desde texto | Seed Audio | Fal |
| Sintetizar voz | Convierte texto en voz | ElevenLabs | Fal |
| Generar 3D | Crea una malla 3D (GLB) | Hyper3D Rodin v2.5 | Fal |

Las **6 capacidades que parten de texto** (generar imagen, vectorizar, generar audio, sintetizar voz, generar 3D, generar video) se corrieron **de punta a punta** (el proveedor generó la pieza real y el Lab guardó su huella). Las **4 marcadas con †** necesitan un archivo de entrada (editar imagen, upscalear imagen/video, extender video): su ruta ya quedó **verificada**, pero su corrida completa **espera la resolución de huella→bytes** desde el bucket privado — hasta entonces responden "insumo no disponible" en vez de gastar a ciegas.

## Editar sobre lo generado (encadenable)

Además de generar desde cero, el Model Lab ahora permite **tomar un candidato ya generado y pedirle un cambio** ("edítalo") por el **mismo flujo gobernado**. El resultado no pisa al original: es un **nuevo candidato editado**, y como es otro candidato, se puede **volver a editar** — se encadena. Verificado en vivo el 2026-07-20: generar un video (guardándolo con `store`) → editarlo → obtener un **nuevo video editado**.

Detalle de superficie: hoy el editar corre en la **superficie Gemini API** de Omni (con la llave propia de Globe `globe-gemini-api-key`). La superficie **keyless de Vertex genera pero no edita**; por eso, cuando se quiere un candidato editable, se genera en la superficie Gemini. Sigue siendo la misma pieza de siempre — un **candidato técnico, nunca una aprobación** — solo que ahora encadenable.

Lo que **todavía no** cubre: generalizar el editar a los demás motores (Seedream, Seedance, Nano-Banana por referencia) y usar **varias referencias o referencias combinadas** — eso es `TASK-1490`.

## Cómo se elige el proveedor

La elección **no la hace el autor del experimento nombrando un modelo** — eso está prohibido por diseño. El experimento sólo declara la **capacidad semántica** (el "qué"); el "con qué motor" lo decide un interruptor de runtime:

- **`GLOBE_LAB_PROVIDER`** acepta cuatro valores: **`fake`** (default, cero gasto), **`vertex`**, **`fal`** o **`composite`**.
- Con **`fake`** corre el simulador — es el estado del runtime desplegado hoy, y por eso el Lab no gasta salvo que un humano lo cambie a propósito.
- Con **`vertex`** sólo se ofrece lo Google-native (imagen Nano Banana, video Omni Flash).
- Con **`fal`** se ofrece el stack no-Google (Seedream, Recraft, Topaz, Seedance, Seed Audio, ElevenLabs, Hyper3D Rodin).
- Con **`composite`** se ofrecen ambos, con la política de solapamiento arriba descrita.
- El cambio es **reversible al instante**: volver a `fake` (+ redeploy) apaga cualquier gasto sin tocar el dominio ni la evidencia.

En todos los casos, el modelo concreto del vendor vive **dentro del adapter**; el contrato de entrada del experimento nunca lo menciona.

## La matriz de recomendación (comparar motores, decidir humano)

La **matriz de recomendación** responde una pregunta muy concreta: *"para este mismo encargo, ¿qué motor conviene?"*. El Model Lab corre el **mismo caso de prueba** por dos motores distintos y deja su evidencia **lado a lado**, comparando ejes **medibles**:

- **Costo** — en créditos (una unidad interna de gasto, **no dinero**).
- **Latencia** — cuánto tardó en producir el resultado.
- **Objetivo / contrato de fidelidad** — para qué encargo se pedía (un key visual de marca no se juzga igual que un foley).

Ejemplo real (corrida del still golden brief, 2026-07-19): el mismo brief de imagen se corrió por **Vertex Nano Banana (10 créditos, ~7s)** y por **Fal Seedream 5 Pro (10 créditos, ~138s)**. Ambos terminaron **"pendiente de revisión humana"**. Como el costo fue idéntico, el **diferenciador visible fue la latencia**.

La regla que hace honesta a esta matriz: **el sistema nunca elige un ganador solo.** Los dos resultados son **candidatos técnicos**, jamás una aprobación. La matriz ordena lo medible (costo, latencia) para informar la decisión, pero **el juicio creativo — cuál pieza sirve de verdad — lo reserva siempre a una persona**. "Candidato listo" no es "aprobado".

## Publicado (interno)

El **studio-web** del Model Lab, con los **motores reales enchufados** (Omni, Veo, Seedance), quedó **desplegado en Cloud Run** el 2026-07-20 como servicio **privado/interno** (`globe-studio-internal`). No es público ni tiene clientes.

Estar desplegado **no significa estar gastando.** Los motores reales quedaron **apagados por defecto** (`GLOBE_LAB_PROVIDER=fake`): el servicio corre, pero **no dispara ninguna generación con costo por sí solo**. Prenderlos es una **decisión gobernada** — un humano tiene que hacer el flip de `GLOBE_LAB_ENABLED` + `GLOBE_LAB_PROVIDER` (a `vertex`/`fal`/`composite`) tras los gates.

Recordatorio de superficies y facturación: **generar** es keyless en Vertex; **editar** pasa por la Gemini API con llave, que es **pay-as-you-go (US$0,10 por segundo, sin free tier)**. El plan **"Gemini Enterprise" por asiento NO sirve** para este uso — es facturación por uso de API, no per-seat.

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra `TASK-###`, dependencias, lifecycle, hooks, lint, QA, cierre documental y handoff — aunque el código de los adapters viva en `efeonce-globe`. Estos proveedores se implementaron bajo `TASK-1486` (Vertex), `TASK-1487` (Fal + Composite), `TASK-1488` (las 10 capacidades) y `TASK-1459` (still model lab + matriz de recomendación), gobernados por `EPIC-028`.
- **Globe conserva el runtime, los secretos y la evidencia técnica.** Los adapters, las credenciales de proveedor y las huellas de resultado viven en Globe. Greenhouse **nunca** comparte con Globe base de datos, sesión, bucket, secreto de proveedor ni rol admin.
- **Todo es interno.** No hay producción ni clientes; los proveedores nacen detrás de gates humanos y el runtime desplegado corre en `fake` por defecto.
- **Estado:** los tres adapters están **code-complete y verificados en vivo**, con **rollout detrás de gates humanos**. Encender el canary facturable en continuo exige aprobación explícita (habilitar el proveedor en el proyecto, presupuesto/alertas, `GLOBE_LAB_PROVIDER` ≠ `fake` + `GLOBE_LAB_ENABLED=true`).

## Qué NO hace todavía

- **No gasta por defecto.** El runtime desplegado corre en `fake`; ningún proveedor real se activa salvo que un humano lo elija tras los gates.
- **Las 4 capacidades con archivo de entrada** (editar imagen, upscalear imagen/video, extender video) tienen su ruta verificada pero su corrida completa **espera la resolución de huella→bytes** desde el bucket privado.
- **El editar encadenable está verificado solo en Omni (video).** Generalizarlo a los demás motores (Seedream, Seedance, Nano-Banana por referencia) y soportar **varias referencias o referencias combinadas** es `TASK-1490`, aún pendiente.
- **La llave de Fal es provisoria.** El canary Fal se verificó usando temporalmente la key existente del repo de Greenhouse (excepción documentada); Globe debe **provisionar su propia** `GLOBE_FAL_API_KEY` antes de cualquier uso sostenido.
- **No hay registro contable de créditos comerciales.** El freno de gasto de hoy es un **fence de seguridad**, no el ledger durable a prueba de pérdidas — esa es una capacidad aparte, aún pendiente. Desde `TASK-1465` el fence de seguridad ya corre durable en producción (sus topes se guardan en Cloud SQL y sobreviven reinicios y réplicas); en modo de desarrollo/ensayo sigue viviendo en memoria y se reinicia con el proceso.
- **No auto-elige el mejor motor.** La matriz de recomendación compara lo medible; el juicio creativo es siempre un paso humano.

> **Detalle técnico y código (repo hermano `efeonce-globe`):**
>
> - Spec técnica canónica — proveedores, routing tables, keyless/keyed, matriz: [`docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md) (§"Realización — VertexCreativeAdapter", §"Segundo adapter — Fal + Composite").
> - Adapter Vertex (keyless, `VERTEX_ROUTING`): [`apps/creative-runner/src/vertex-adapter.ts`](../../../../efeonce-globe/apps/creative-runner/src/vertex-adapter.ts).
> - Adapter Fal (`FAL_ROUTING`, queue API): [`apps/creative-runner/src/fal-adapter.ts`](../../../../efeonce-globe/apps/creative-runner/src/fal-adapter.ts).
> - Adapter Composite (routing por `supports()` + política): [`apps/creative-runner/src/composite-adapter.ts`](../../../../efeonce-globe/apps/creative-runner/src/composite-adapter.ts).
>
> **Gobierno en Greenhouse:**
>
> - Capacidad que estos proveedores potencian: [`Model Lab`](efeonce-globe-model-lab.md).
> - Capacidad que puntúa las corridas: [`Evaluation Harness`](efeonce-globe-evaluation-harness.md).
> - Infraestructura sin llaves que los habilita: [`Infraestructura como código, despliegue sin llaves`](efeonce-globe-infra-keyless.md).
> - ADR y arquitectura del programa: [`EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [`..._ARCHITECTURE_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · tasks: `docs/tasks/**/TASK-148{6,7,8}-*.md`, `docs/tasks/**/TASK-1459-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
