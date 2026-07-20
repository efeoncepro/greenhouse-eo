# Efeonce Globe — Model Lab (banco de pruebas de capacidades creativas)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-07-19 por Claude (TASK-1457)
> **Ultima actualizacion:** 2026-07-20 por Claude (TASK-1492 — repatriación canónica)
> **Documentacion tecnica:** [EFEONCE_GLOBE_MODEL_LAB_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce (imagen, video, audio). Greenhouse **no la hospeda**: la **gobierna**. Greenhouse es dueño de la identidad, el acceso deseado y el control de tareas/EPICs; Globe es dueño de su propio código, runtime, datos y evidencia creativa. Se integran como pares, sin compartir base de datos, sesión, buckets, secretos de proveedor ni acceso admin.

Este documento explica, en lenguaje simple y sin código, qué es el **Model Lab** que se construyó en `TASK-1457` y cómo se comporta. Está escrito para una persona de producto u operación que necesita entender la idea, no para quien programa. Desde `TASK-1492`, **esta es la documentación canónica del Model Lab**: la doc gobernante vive acá, en Greenhouse; en el repo `efeonce-globe` solo queda el **código** y la evidencia técnica de runtime.

El Model Lab es la **primera capacidad de negocio real** que se enchufa al camino único de Globe — el "API Contract Spine" que dejó `TASK-1481`. Ver primero, si hace falta, la [documentación funcional del Contract Spine](efeonce-globe-api-contract-spine.md).

## Qué es y para qué sirve

El Model Lab es un **banco de pruebas gobernado**. Sirve para responder una pregunta muy concreta antes de comprometerse con nada: *"¿esta capacidad creativa, por esta ruta, con estos insumos, sirve — y cuánto costaría?"*.

Un **experimento** es una prueba acotada. Se hace en tres momentos:

1. **Preparar** — se declara qué se quiere probar y, sobre todo, **cuánto es lo máximo que se está dispuesto a gastar**.
2. **Ejecutar** — el sistema estima el costo, y **si se pasa del tope, se detiene antes de gastar**. Si no se pasa, reserva el presupuesto, corre la prueba y anota el resultado.
3. **Ver la evidencia** — queda un registro por cada intento: qué ruta se usó, cuánto costó y las huellas de los insumos y del resultado.

La idea de fondo es la misma disciplina que gobierna toda Globe: **nadie llama directo al proveedor de IA por un atajo**. Incluso una simple prueba pasa por el mismo camino central, con los mismos controles de identidad, presupuesto y evidencia.

> **Aclaración importante sobre el estado de hoy:** el Model Lab **ya produce piezas reales** — hay **proveedores reales conectados** (Vertex + Fal + Composite) y las **10 capacidades quedaron verificadas en vivo** el 2026-07-19 por este mismo camino, con gasto real y evidencia. Pero **el servicio interno desplegado sigue configurado con el proveedor "de ensayo"** (un simulador determinístico que no toca la red y no gasta nada): el proveedor real se elige con un interruptor (`GLOBE_LAB_PROVIDER`), y encender los motores facturables en continuo en ese servicio es un paso deliberado, todavía **detrás de gates humanos**. Dicho de otro modo: la capacidad existe y está probada; **prenderla en el servicio es una decisión aparte**. El mecanismo (preparar con tope, ingesta por huella, estimar, frenar, reservar, correr, saldar, dejar evidencia) es el mismo de siempre — los proveedores se enchufaron sin tocarlo. Qué proveedores/modelos hay, cómo se elige uno y qué es la matriz de recomendación: [Proveedores del Model Lab](efeonce-globe-model-lab-providers.md). Para el estado vigente del despliegue, ver el `Handoff.md` del repo hermano `efeonce-globe` (evidencia de runtime).

## Cómo funciona

### 1. Preparar un experimento (declarar la intención y el tope)

Preparar es describir la prueba. En este paso se declara:

- **Qué capacidad creativa se quiere probar.** No un nombre de modelo del proveedor, sino una **capacidad semántica**: "generar imagen", "editar imagen", "vectorizar imagen", "generar video", "extender video", "generar audio" o "sintetizar voz". Esto es deliberado: el Lab razona en términos de *qué se quiere lograr*, no de *qué modelo de qué marca* — así se puede cambiar de proveedor por debajo sin reescribir la lógica.
- **Qué ruta de referencia usar.** Una etiqueta de la ruta a evaluar (por ejemplo, una variante de "still" o de "video corto").
- **Qué insumos autorizados entran.** Y aquí hay una regla clave de privacidad (ver punto 2).
- **El tope de gasto máximo (el "cap duro").** El número más importante del experimento: cuánto es lo máximo que este experimento puede gastar. Es un freno, no una sugerencia.
- Opcionalmente, un **prompt** (una instrucción de texto).

Si algo viene mal formado —una capacidad que no existe, un tope que no es un número positivo, una ruta vacía, un insumo sin huella— la preparación se **rechaza de entrada**. No se prepara un experimento inválido "por si acaso".

Al preparar, el experimento nace en estado **preparado**, con proveedor, modelo y versión todavía "pendientes" (se resuelven recién al ejecutar) y con el gasto en cero.

### 2. Ingesta privada: solo la huella del insumo, nunca el archivo

Esta es una de las protecciones más importantes del Lab y conviene entenderla bien.

Cuando un experimento usa insumos (una imagen de referencia, un audio, un texto), **el archivo crudo nunca cruza el contrato**. Lo único que viaja es:

- un **identificador** del insumo,
- su **huella digital** (un "sha256" — un código único que representa el contenido sin ser el contenido),
- su **tipo** (imagen, video, audio o texto),
- y su **postura de derechos**: "propio de la empresa", "licenciado" o "insumo de prueba".

Es como registrar un paquete por su **número de sellado y su etiqueta de procedencia**, sin abrir el paquete ni mandarlo por el mismo mostrador. El contenido real se maneja de forma privada, del lado del servidor; por el camino de la API solo circula la huella y la declaración de derechos. Cada experimento admite hasta un número acotado de insumos, y todos deben estar bien declarados o el pedido se rechaza.

Esto tiene dos beneficios directos: **no se expone material sensible** al pasar por el contrato, y **queda trazabilidad** — más adelante siempre se puede verificar, comparando huellas, con qué insumos exactos se hizo cada intento.

### 3. Ejecutar: estimar, frenar antes de gastar, correr y saldar

Ejecutar es donde el experimento cobra vida, y el orden de los pasos es lo que lo hace seguro:

1. **Estimar.** Primero se le pregunta a la ruta cuánto costaría: qué proveedor, qué modelo y versión, y cuántos créditos estimados. El experimento pasa a estado **estimado**.
2. **Frenar antes de gastar.** Si la estimación **supera el tope declarado**, el experimento se marca **fallido** con el motivo "excede el tope de la corrida" — y esto ocurre **antes de reservar o gastar un solo crédito**. Este es el corazón de la seguridad: el freno actúa sobre la *estimación*, no después del gasto.
3. **Reservar.** Si la estimación cabe dentro del tope, se **reserva** el presupuesto. Aquí actúa un segundo freno: el **tope diario del espacio de trabajo**. Aunque una corrida individual quepa en su propio tope, si el espacio ya gastó demasiado ese día, la reserva se rechaza con "excede el tope diario". El experimento pasa a **reservado**.
4. **Correr.** Con el presupuesto reservado, el experimento pasa a **en ejecución** y el proveedor (hoy, el simulador) hace el trabajo. Si el proveedor **falla**, se **libera la reserva** (no se cobra lo que no se produjo) y el experimento queda **fallido**.
5. **Saldar.** Si el proveedor responde, se **salda** la cuenta: se ajusta lo reservado al costo real, se guarda el manifiesto del intento y el experimento llega a su estado final: **candidato listo** o **fallido**.

Un detalle de robustez: ejecutar dos veces el mismo experimento no lo corre dos veces. Si ya se ejecutó, se devuelve su estado actual — no se duplica el gasto.

### 4. Los estados de un experimento

El experimento recorre una **secuencia controlada** de estados. No puede saltar de cualquiera a cualquiera; solo se permiten las transiciones válidas:

| Estado | Qué significa |
| --- | --- |
| **Preparado** | Se declaró la prueba (capacidad, ruta, insumos, tope). Todavía no se estimó ni se gastó nada. |
| **Estimado** | Ya se sabe el proveedor, el modelo y el costo estimado de la ruta. |
| **Reservado** | La estimación cupo en el tope y se reservó el presupuesto. |
| **En ejecución** | El proveedor está haciendo el trabajo. |
| **Candidato listo** | El intento produjo un resultado técnico. **Ojo: es un candidato, no una aprobación** (ver más abajo). |
| **Fallido** | Algo lo detuvo: superó el tope, superó el tope diario, o el proveedor falló. Queda anotado el motivo. |
| **Cancelado** | Se canceló a propósito antes de terminar, con una razón registrada. |

"Candidato listo", "fallido" y "cancelado" son **estados finales**: el experimento no se mueve más desde ahí.

### 5. "Candidato listo" no es "aprobado"

Vale la pena insistir en esto porque es fácil de confundir. Cuando un experimento llega a **candidato listo**, significa que la máquina produjo un resultado técnico sin errores. **No significa** que alguien lo revisó, que quedó bien, ni que está autorizado para usarse. Es, literalmente, un **candidato** a la espera de juicio humano. La aprobación es un paso aparte, gobernado por otras reglas — nunca la declara la ejecución sola.

### 6. La evidencia: un manifiesto por cada intento

Cada intento de ejecución deja un **manifiesto inmutable** — un registro que no se reescribe. Ese manifiesto anota, entre otras cosas:

- la **ruta propuesta** y la **ruta realmente usada** (si por algún motivo se usó una ruta distinta a la propuesta, se ven **las dos**, sin borrar la historia),
- el **proveedor, modelo y versión** que respondieron,
- el **costo estimado** y el **costo real**,
- las **huellas de los insumos autorizados** y las **huellas del resultado**,
- la **línea de origen** (lineage) que conecta el intento con su experimento,
- y las **marcas de tiempo** de inicio y fin.

Lo que el manifiesto **nunca** contiene: secretos, archivos crudos, costos confidenciales del proveedor, el margen de Efeonce ni enlaces públicos a las piezas. Es evidencia de auditoría, no un cajón donde se filtra información sensible.

### 7. Los frenos: tope duro, tope diario e interruptor de apagado

El Model Lab tiene **tres frenos** independientes, y conviene verlos juntos:

- **Tope duro por corrida.** Cada experimento declara su gasto máximo. La estimación se compara contra él **antes** de gastar. Si se pasa, se aborta.
- **Tope diario por espacio de trabajo.** Aunque cada corrida quepa en su tope, un espacio no puede exceder un total diario. Este freno protege contra "muchas corridas chicas que suman demasiado".
- **Interruptor de apagado (kill switch), apagado por defecto.** El Model Lab nace **apagado**. Mientras esté apagado, **cualquier** comando de experimento responde "bloqueado por política" — ni siquiera arranca. Se enciende a propósito, para el piloto interno, y se puede apagar en cualquier momento.

Un matiz honesto sobre el presupuesto: hoy los topes viven en memoria del proceso y se reinician si el servicio se reinicia. Eso es aceptable para un Lab interno y acotado; es un **freno de seguridad**, no el registro contable de créditos comerciales (ese registro, durable y a prueba de pérdidas, llega en una tarea posterior). El freno de seguridad y el registro contable son dos cosas distintas a propósito.

### 8. Cada quién ve solo lo suyo

Los experimentos están **acotados al espacio de trabajo** de quien los opera. Si alguien pide un experimento que no le corresponde —de otro espacio, o uno que no existe— el sistema responde "no encontrado", **sin revelar** si ese experimento existe en otra parte. No se dan pistas a quien esté probando.

### 9. Refinar un candidato: seguir trabajando sobre un resultado

Casi nunca el primer resultado es el bueno. **Refinar** es pedir una nueva versión a partir de un candidato que ya se produjo: "esto mismo, pero de noche", "el mismo personaje, con esta cámara".

Lo primero que conviene entender es que **refinar no es un modo especial**. Un refinamiento **es un experimento más**: pasa por el mismo camino central, declara su propio tope de gasto, se frena igual antes de gastar y deja su propia evidencia. No hay una puerta aparte con reglas más blandas.

Para pedirlo, quien opera **solo señala de cuál candidato quiere partir**. No tiene que saber cómo lo resuelve la máquina por debajo, ni nombrar sesiones, ni hablar en el vocabulario de ningún proveedor. Es una **única forma de pedirlo, igual para todo modelo que admita edición**.

**Se puede refinar con un motor distinto al que produjo el original.** Esto es deliberado y es la parte más útil: un candidato generado con un motor puede refinarse con otro (por ejemplo, un resultado de un motor de imagen refinado con otro motor de imagen distinto). Funciona porque en el refinamiento **se vuelve a declarar** qué capacidad, qué ruta y qué tope se quiere usar — no se heredan a la fuerza del original. Si se heredaran, quedarías atado al motor que generó la primera pieza.

Por debajo hay **dos mecanismos** posibles: continuar la conversación que el proveedor guardó (cuando el mismo proveedor la sostiene), o volver a entregarle el resultado anterior como base de trabajo. **Quien opera no elige**: la plataforma decide cuál corresponde y **deja anotado en la evidencia cuál usó**. Nunca es un cambio silencioso. El segundo mecanismo es el que hace posible cambiar de motor, porque no depende de ninguna sesión guardada.

#### Qué se rechaza, y por qué

Un refinamiento imposible se rechaza **al preparar, antes de reservar un solo crédito**. Nunca se descubre a mitad de una corrida ya pagada. Se rechaza cuando:

- **El original es de otro espacio de trabajo, o no existe.** Responde "no encontrado", sin revelar si existe en otra parte. No se refina el candidato de otro.
- **El original nunca llegó a producir un candidato.** Un experimento fallido o cancelado no es material editable.
- **El resultado del original no quedó guardado.** Para volver a entregarle una pieza al motor hay que **conservarla**; si no se conservó y tampoco hay una sesión que se pueda continuar, no queda nada de dónde partir. Es una degradación honesta: se dice que no se puede, no se intenta a medias.
- **El resultado no es un tipo de pieza que sirva de base** (por ejemplo, una malla 3D no es una referencia visual).
- **La cadena de refinamientos se hizo demasiado larga**, o el pedido vino mal formado. Un pedido de refinamiento malformado **nunca** se degrada silenciosamente a una generación nueva.

#### Derivado no es propio, y las referencias no se recortan

Dos reglas de fondo que conviene conocer:

- **Un derivado no se blanquea como material propio.** La pieza que sirve de base viaja marcada como *derivada interna* —una etiqueta que quien pide no puede declarar por su cuenta— y **arrastra la postura de derechos más restrictiva** del original. Si el original usó un insumo licenciado, esa restricción sigue aplicando a todo lo que descienda de él.
- **Si se pasan más referencias de las que la ruta admite, falla.** No se recortan en silencio para que "entre". Recortar devolvería un trabajo que parece correcto y no es el que se pidió.

## Qué significan los estados (resumen operativo)

- **Preparado / Estimado / Reservado / En ejecución** — etapas intermedias de un experimento en curso.
- **Candidato listo** — hay un resultado técnico. **Falta el juicio humano**; no es aprobación.
- **Fallido** — se detuvo por un motivo anotado (tope de corrida, tope diario o falla del proveedor).
- **Cancelado** — se detuvo a propósito, con razón.
- **Bloqueado por política** — el Lab está apagado (o la surface está apagada): el comando ni siquiera corre. Se ve, no es un error escondido.

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra `TASK-###`, dependencias, lifecycle, hooks, lint, QA, cierre documental y handoff — aunque el código viva en `efeonce-globe`. Esta capacidad se implementó bajo `TASK-1457`, gobernada por `EPIC-028`.
- **Globe conserva el runtime y la evidencia técnica.** Los experimentos, los manifiestos por intento, el spend fence y el proveedor viven en Globe. Greenhouse consume, cuando corresponde, proyecciones/eventos/deep links versionados; nunca su base de datos, su bucket ni sus secretos.
- **Todo es interno.** No hay producción ni clientes; el Lab nace apagado y se enciende solo para el piloto interno.
- **Estado:** implementado sobre el Contract Spine de `TASK-1481`. Los **proveedores reales ya existen** — `VertexCreativeAdapter` (`TASK-1486`), `FalCreativeAdapter` + `CompositeProviderAdapter` (`TASK-1487`) y las 10 capacidades (`TASK-1488`) — todos verificados en vivo; el refinamiento cross-model llegó con `TASK-1490`. Todo queda **code-complete con rollout detrás de gates humanos** (el runtime desplegado corre en `fake` por defecto).

## Qué NO hace todavía y qué sigue

Para ser exactos sobre el estado real de hoy:

- El **servicio interno desplegado** sigue configurado con el **proveedor de ensayo** (no toca la red ni gasta), aunque los motores reales ya existen y quedaron verificados en vivo. Prenderlos ahí es un paso de configuración pendiente, detrás de gates humanos.
- Mientras ese servicio no conserve los resultados, **refinar por referencia queda rechazado** ahí: es la degradación honesta descrita en el punto 9, no una falla rara.
- Las 4 capacidades que necesitan un archivo de entrada (editar imagen, upscalear imagen/video, extender video) tienen su ruta verificada, pero su corrida de punta a punta espera la resolución de huella→bytes desde el bucket privado.
- Está **apagado por defecto**; se enciende solo para el piloto interno.
- **No hay clientes ni producción.** Es uso interno, gobernado por Greenhouse (programa EPIC-028).
- El registro contable de créditos comerciales (durable, a prueba de pérdidas) es una capacidad aparte, aún pendiente — el spend fence de hoy es un **freno de seguridad** en memoria, no ese registro.

Lo que **sí** existe y quedó probado es **todo el mecanismo del experimento**: preparar con tope, ingesta privada por huella, estimar, frenar antes de gastar, reservar (con tope diario), correr, saldar y dejar evidencia por intento — todo sobre el mismo contrato central.

A eso se suma, desde `TASK-1490`, el **refinamiento de un candidato** con una sola forma de pedirlo para todo modelo editable, incluido el cambio de motor entre el original y su refinamiento.

**Qué sigue:** la **infraestructura como código (`TASK-1464`)** —que ya quedó aplicada— deja vivos el bucket privado de evidencia del Lab, el despliegue sin llaves y las alertas de presupuesto. Sobre esa base queda **encender los motores reales en el servicio interno** (respetando la política de soberanía de proveedores), junto con conservar los resultados para que el refinamiento por referencia funcione ahí, bajo los mismos frenos que ya operan hoy. La retención y el ciclo de vida de esas piezas guardadas se gobiernan en una tarea posterior.

---

> **Detalle técnico:**
>
> Este documento explica en lenguaje simple; no reemplaza la especificación técnica. La documentación gobernante vive en Greenhouse (este árbol); en `efeonce-globe` solo queda el código. Para el contrato completo (máquina de estados del experimento, contrato de spend fence, manifiesto por intento, política de ingesta privada, seam de proveedor), consultar:
>
> - Especificación de arquitectura canónica: [EFEONCE_GLOBE_MODEL_LAB_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md).
> - Runbook operativo — cómo correr un experimento paso a paso: [EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md](../../operations/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md) **§7-bis (Model Lab)** y **§7-bis-2 (refinar un candidato: flags, permisos y verificación)**.
> - Runbook de infraestructura (bucket privado del Lab, despliegue sin llaves, presupuesto): [EFEONCE_GLOBE_IAC_RUNBOOK_V1.md](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).
> - Camino central donde se enchufa el Lab: [efeonce-globe-api-contract-spine.md](efeonce-globe-api-contract-spine.md) e invariantes de fundación [PLATFORM_FOUNDATION_V1.md](../../architecture/creative-studio/PLATFORM_FOUNDATION_V1.md).
> - Proveedores reales, modelos por capacidad y matriz de recomendación: [Proveedores del Model Lab](efeonce-globe-model-lab-providers.md).
>
> **Gobierno en Greenhouse:**
>
> - ADR y arquitectura del programa: [EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [..._ARCHITECTURE_V1.md](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [EPIC-028](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/**/TASK-1457-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
>
> Código fuente relevante (repo hermano `efeonce-globe`):
>
> - Máquina de estados, comandos/readers, validación de payload e ingesta privada, store en memoria: [`packages/domain/src/model-lab.ts`](../../../../efeonce-globe/packages/domain/src/model-lab.ts).
> - Spend fence (tope por corrida + tope diario, reservar/saldar/liberar): [`packages/domain/src/spend-fence.ts`](../../../../efeonce-globe/packages/domain/src/spend-fence.ts).
> - Proveedor de ensayo determinístico, runner y elección del mecanismo de refinamiento (el único lugar donde se invoca un proveedor): [`apps/creative-runner/src/index.ts`](../../../../efeonce-globe/apps/creative-runner/src/index.ts).
> - Retención de resultados (lo que hace posible refinar por referencia): [`apps/creative-runner/src/output-ingest.ts`](../../../../efeonce-globe/apps/creative-runner/src/output-ingest.ts).
> - Contratos versionados del experimento (capacidad, payloads, manifiesto, proyección): [`packages/contracts/src/index.ts`](../../../../efeonce-globe/packages/contracts/src/index.ts).
