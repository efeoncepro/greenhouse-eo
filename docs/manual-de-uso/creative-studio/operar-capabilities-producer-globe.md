# Manual — Operar las capacidades nuevas del Creative Producer en Efeonce Globe (video, voz y salidas múltiples)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-07-22 por Claude (TASK-1504)
> **Ultima actualizacion:** 2026-07-22 por Claude (TASK-1504)
> **Doc funcional:** [efeonce-globe-producer-capabilities.md](../../documentation/creative-studio/efeonce-globe-producer-capabilities.md)
> **Doc tecnica:** [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)
> **Task:** `docs/tasks/in-progress/TASK-1504-globe-producer-capability-expansion.md`
> **Manuales hermanos:** [Model Lab](./efeonce-globe-model-lab.md) · [Proveedores del Model Lab](./efeonce-globe-model-lab-providers.md) · [Catálogo de rutas](./efeonce-globe-producer-catalog.md) · [Descarga y acciones de piezas](./operar-retrieval-assets-globe.md)

## Estado actual (2026-07-22)

**Código completo, rollout pendiente.** Las cuatro capacidades, el registro de voces y el registro de
salidas múltiples están implementados y verificados localmente en el repo hermano `efeonce-globe`
(suite completa verde), pero **todavía no se desplegaron al runtime interno** `globe-api-internal`.
Mientras ese deploy no ocurra, nada de lo que sigue responde en el servicio: la superficie no existe
ahí todavía.

Además, aun después del deploy, **el Lab nace apagado**: con el interruptor en OFF toda esta
superficie responde **bloqueado por política**, que es un estado deliberado, no una falla.

Quién puede usarla cuando esté desplegada: **el principal de servicio** por el modo `api`
(HTTP/SDK/CLI/worker/E2E). Una persona en el shell web todavía **no**: el broker no le otorga las
capacidades y las superficies `ui` y `mcp` siguen bloqueadas por política hasta el gate de
`TASK-1505`.

**El canario facturable no se ha ejecutado.** Ninguna de las cuatro capacidades ha corrido todavía
contra un motor real con gasto. Eso es un gate humano explícito, no trabajo de código pendiente.

Lo que sigue abajo es el procedimiento de operación: sirve para el rollout, para verificar y para
diagnosticar.

## Para qué sirve

Operar las capacidades creativas nuevas del Creative Producer:

| Capacidad | Qué hace en palabras simples |
|---|---|
| `video-frames` | Genera un video entre una foto inicial y (opcionalmente) una foto final |
| `video-motion-control` | Transfiere el movimiento de un video de referencia a una pieza nueva |
| `audio-change-voice` | Cambia la voz de un clip de audio ya existente, conservando la interpretación |
| `audio-translate` | Dobla un clip de audio a otro idioma |

Y las dos piezas de soporte que las acompañan:

- **Registro de voces reutilizables** — registras una voz una vez y la reusas por su identificador en
  cada corrida de audio, en lugar de re-describirla cada vez.
- **Registro de salidas múltiples por corrida** — una corrida que emite más de una pieza (por ejemplo
  video + audio) declara **cada** salida por separado, con su huella, su tipo de medio y si quedó
  guardada. Antes se colapsaba todo a una lista plana y podía perderse una salida en silencio.

## Antes de empezar

### Precondiciones reales

1. **El interruptor del Lab está APAGADO hoy** (`GLOBE_LAB_ENABLED` en OFF por defecto). Con el Lab
   apagado, cualquier comando de corrida y también el registro de voces responden **bloqueado por
   política**. Eso no es "roto": es la postura de nacimiento.

2. **El motor por defecto es de ensayo.** `GLOBE_LAB_PROVIDER` viene en `fake`: hermético, cero red,
   cero gasto. Encender un motor real (`vertex` / `fal` / `composite`) es una **decisión de entorno
   explícita** del operador, nunca un efecto del deploy. Detalle en el manual
   [Proveedores del Model Lab](./efeonce-globe-model-lab-providers.md).

3. **Estas capacidades se operan por el modo `api`** (principal de servicio). Una persona en el shell
   web **no las alcanza todavía**: el broker no le otorga la capacidad y la interfaz sigue bloqueada
   por política hasta `TASK-1505`.

4. **El registro de voces tiene su propia autoridad.** Necesita la capacidad
   `globe.voice.preset.manage`, que es **separada** de la del Lab (`globe.lab.experiment.run`).
   La razón es directa: registrar una voz no gasta ni un crédito, así que nombrar una voz no debe
   implicar la autoridad de facturarle a un proveedor.

### Variables que gobiernan la operación

| Variable | Qué es | Default | Efecto |
|---|---|---|---|
| `GLOBE_LAB_ENABLED` | Interruptor de apagado del Lab | `false` | En OFF, corridas y registro de voces responden `policy_blocked` |
| `GLOBE_LAB_PROVIDER` | Qué motor ejecuta cuando sí corre | `fake` | `fake` no toca red ni gasta. Cualquier otro valor **factura** |
| `GLOBE_LAB_DAILY_CAP_CREDITS` | Tope diario de créditos por espacio de trabajo | `500` | Corta el gasto acumulado del día |

Además, **cada corrida declara su propio tope** (`hardCapCredits`). El tope diario y el tope por
corrida son controles distintos y se aplican los dos.

> ⚠️ Un valor inválido de `GLOBE_LAB_PROVIDER` **cae a `fake` en silencio**. No asumas que estás en
> un motor real solo porque escribiste el nombre: confirma el motor efectivo antes de dar por hecho
> que hubo gasto.

### Rutas disponibles (catálogo versión `1.1.0`, 8 rutas)

Las cuatro rutas que estas capacidades agregan al catálogo:

| Ruta | Capacidad | Motor | Forma que admite |
|---|---|---|---|
| `ref/video/frames-v1` | `video-frames` | Veo 2.0 | 720p · 5-8 s · 16:9 o 9:16 · **solo silencioso** |
| `ref/video/motion-v1` | `video-motion-control` | Seedance 2.0 | 480p/720p/1080p · 4-15 s · 16:9 o 9:16 · con o sin audio |
| `ref/voice/change-v1` | `audio-change-voice` | ElevenLabs Voice Changer | mp3 · 44.1 kHz |
| `ref/voice/translate-v1` | `audio-translate` | ElevenLabs Dubbing | mp3 · 44.1 kHz · idiomas `es`, `en`, `pt`, `fr`, `de`, `it` |

Dos cosas honestas sobre esa tabla:

- **`ref/video/frames-v1` no emite pista de audio.** Declarar "con audio" ahí sería anunciar una forma
  que el motor no puede producir, así que la ruta solo admite silencioso.
- **Las rutas de audio no ajustan velocidad, volumen ni tono hoy.** El catálogo las declara fijas en
  `1` a propósito: prefiere no anunciar como regulable algo que el motor todavía no regula.

> **Cambio de comportamiento a tener presente:** la ruta `ref/motion/loop-v1` **ya no acepta**
> keyframes ni fuente de movimiento. Antes los declaraba, pero su motor no tenía dónde recibirlos y
> **los descartaba en silencio después de haber cobrado** — devolvía un video plausible que no era lo
> que se pidió. Si venías declarando keyframes sobre esa ruta, ahora tienes que usar las rutas
> dedicadas de arriba.

## Paso a paso

### 1. Registrar una voz reutilizable

Se hace por el SDK con `registerVoicePreset`. Hay dos tipos y **cada uno exige algo distinto**:

- **Voz de catálogo** (`kind: 'catalog'`) — apunta a una voz curada que la plataforma ya ofrece.
  Exige el nombre visible y la clave de la voz curada.
- **Voz clonada** (`kind: 'cloned'`) — se construye desde una grabación de una persona real. Exige el
  nombre visible **y la fuente declarada por huella + derechos** (`internal-owned`, `licensed` o
  `test-fixture`). Los derechos **no son opcionales**.

La grabación fuente nunca cruza como bytes por la interfaz: viaja como huella (`sha256`) más su
postura de derechos, y se resuelve del lado servidor.

**El registro es idempotente:** volver a registrar la misma voz en el mismo espacio de trabajo
devuelve **el preset que ya estaba**, con su identificador original. Reintentar no crea duplicados.

**El registro es append-only:** una voz nunca se edita en su lugar. Si la voz cambia, se registra una
**nueva**. La razón es que el identificador de un preset ya usado forma parte de la evidencia de las
corridas pasadas; repuntarlo en silencio reescribiría con qué se hicieron.

Para consultar: `listVoicePresets` (todas las del espacio de trabajo) y `getVoicePreset` (una, por su
identificador).

### 2. Declarar y correr una capacidad

El flujo es el del Lab de siempre, en dos pasos: **`prepareExperiment` → `executeExperiment`**. En el
primer paso declaras la capacidad, la ruta, las referencias autorizadas, la forma de salida y el tope
de créditos; en el segundo se ejecuta.

Lo que cada modo **exige** en las referencias autorizadas, y que se valida **antes** de reservar
crédito:

| Capacidad | Referencias que exige |
|---|---|
| `video-frames` | **1 imagen** (la foto inicial); **2 imágenes** si declaras que hay foto final |
| `video-motion-control` | **al menos 1 video** (la fuente del movimiento) |
| `audio-change-voice` | **al menos 1 audio** (el clip a re-vocalizar) |
| `audio-translate` | **al menos 1 audio** + un idioma destino dentro de los que sirve la ruta |

La cuenta es **por tipo de medio**, no por total. Eso importa: una transferencia de movimiento con dos
imágenes y ningún video tiene referencias de sobra y aun así no puede correr, y el sistema lo dice
antes de cobrar.

Toda referencia cruza como huella + derechos, nunca como bytes por la interfaz.

Si la corrida de audio usa una voz registrada, se declara el identificador del preset en la forma de
salida. El sistema lo resuelve a la voz curada del lado servidor; el identificador del proveedor
nunca sale del adaptador.

### 3. Verificar el resultado

Lee la evidencia de la corrida (`getExperimentEvidence`) y mira las **salidas declaradas**. Cada
salida trae:

- su **huella** (`sha256`),
- su **tipo de medio** (`image` / `video` / `audio` / `text` / `model-3d`),
- su **tipo de archivo**,
- y si **quedó guardada** (`retained`).

Una corrida que emite video + audio debe mostrar **dos** salidas, cada una con su tipo de medio y su
propio estado de guardado. Si ves una sola donde esperabas dos, eso es un hallazgo, no un detalle.

Para descargar o previsualizar una de esas piezas, el procedimiento vive en el manual hermano
[Descarga y acciones de piezas](./operar-retrieval-assets-globe.md).

## Qué significan los estados y señales

| Señal | Significado | Acción |
|---|---|---|
| `policy_blocked` | El Lab está apagado, o estás en una superficie bloqueada a propósito (`ui`/`mcp`) | Decisión operativa, no un fallo. Encender es un flip gobernado |
| `invalid_request` **antes de reservar crédito** | Te faltó la referencia que ese modo consume, o el idioma destino no está en la ruta, o la forma de salida cae fuera de lo que la ruta admite | Corregir la declaración. **No gastaste nada** |
| `not_found` | El experimento o el preset no existe **o es de otro espacio de trabajo** | Ver la nota de abajo |
| `retained: false` en una salida | La pieza **se generó y se pagó**, pero no se pudo guardar | Ver la nota de abajo |
| Corrida rechazada por preset de voz | El preset declarado no resuelve a ninguna voz del proveedor | Ver "Problemas comunes" |

**Sobre `retained: false`:** la pieza existe y se cobró, pero sus bytes no quedaron en el depósito, así
que **no se puede reusar como referencia** más adelante ni descargar. Lo importante: es **por salida**.
Si una corrida emitió video + audio y solo falló el guardado del audio, el video **sigue guardado y
utilizable**. Antes esto se colapsaba en un único indicador y una falla parcial hacía parecer que se
había perdido todo.

**Sobre "no existe" (`not_found`):** puede significar que el preset o el experimento no existe, **o que
pertenece a otro espacio de trabajo**. La respuesta es deliberadamente indistinguible entre ambos
casos: distinguirlos permitiría sondear el registro de otro inquilino, un identificador a la vez.
**No es un error a investigar** — es el diseño funcionando.

## Qué NO hacer

- **NUNCA reintentes una corrida que gasta después de un timeout del CLIENTE.** El tiempo se agotó de
  tu lado; en el servidor la corrida puede haber terminado bien. Reintentar vuelve a gastar. **Primero
  lee el estado** del experimento y recién ahí decide.
- **NUNCA registres una voz clonada sin declarar sus derechos.** El sistema lo rechaza, y con razón:
  es la voz de una persona real. "No lo dijimos" no es un estado aceptable para que ese registro
  exista.
- **NUNCA asumas que un preset de voz resuelve.** Hoy el mapa de voces del adaptador está **vacío a
  propósito**: se puebla cuando el operador defina las voces curadas reales. Hasta entonces, **todo
  preset de tipo catálogo falla cerrado**. Eso es correcto: es preferible fallar a usar en silencio
  una voz por defecto que nadie pidió.
- **NUNCA enciendas un motor real ni corras el canario facturable sin decisión explícita del
  operador.** El gasto real es un gate humano, no un paso de despliegue.
- **NUNCA pases bytes de una referencia por la interfaz.** Keyframes, video fuente, clip de audio y la
  grabación de una voz clonada cruzan como huella + derechos. Siempre.
- **NUNCA declares keyframes o fuente de movimiento sobre la ruta de loop** esperando que los use.
  Ya no los acepta, y antes los descartaba después de cobrar. Usa las rutas dedicadas.
- **NUNCA supongas que un preset de otro espacio de trabajo "se ve pero no se usa".** No se ve: es
  `not_found`, y punto.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Todo responde bloqueado por política | El Lab está apagado, o estás llamando desde `ui`/`mcp` | Confirmar el interruptor en la revisión **activa** del servicio; `ui`/`mcp` están bloqueadas a propósito hasta `TASK-1505` |
| La corrida se rechaza sin gastar y no entiendes por qué | Falta la referencia que ese modo consume, o el idioma destino no lo sirve esa ruta | Revisar la tabla de referencias exigidas y los idiomas de `ref/voice/translate-v1`. El rechazo ocurre **antes** de reservar crédito: no perdiste nada |
| Declaraste foto inicial y final pero se rechaza | La cuenta es por tipo de medio: con foto final declarada exige **2 imágenes** | Declarar ambas imágenes como referencias autorizadas |
| El preset de voz no resuelve y la corrida falla | El mapa de voces curadas está vacío hasta que el operador defina las voces reales | Es el estado esperado hoy. Correr sin preset, o definir primero las voces curadas |
| Pediste una voz que registraste y responde "no existe" | O no existe, o es de otro espacio de trabajo | Verificar el espacio de trabajo del llamador. La respuesta no distingue entre ambos casos a propósito |
| Una salida aparece con `retained: false` | El guardado de **esa** pieza falló; se generó y se pagó igual | Revisar el depósito y los permisos de la cuenta de ejecución. Las demás salidas de la misma corrida **no** están afectadas |
| Pusiste un motor real y aun así no gasta | El valor de `GLOBE_LAB_PROVIDER` cayó a `fake` (error de escritura → respaldo silencioso), o el Lab está apagado | Verificar los dos: el interruptor manda sobre el motor |
| La interfaz gráfica no muestra nada de esto | No hay superficie todavía: `ui` y `mcp` están bloqueadas por política | Es el gate de `TASK-1505`, no un pendiente de este manual |

## Pendientes declarados

- [ ] **Deploy a `globe-api-internal`** y verificación de que las **14 capacidades** existen y de que el
      registro de voces responde bloqueado por política en `ui`/`mcp`.
- [ ] **Canario facturable por capacidad** (`video-frames`, `video-motion-control`,
      `audio-change-voice`, `audio-translate` y una corrida de salidas múltiples): **una** corrida real
      por capacidad, bajo el tope de gasto, registrando ruta efectiva, créditos y las salidas con su
      huella. **Requiere decisión explícita del operador** porque gasta dinero real. Hoy no se ha
      hecho.
- [ ] **Definir las voces curadas reales** para poblar el mapa de voces. Hasta entonces, todo preset de
      tipo catálogo falla cerrado.

Mientras esto siga abierto, el estado correcto es **`code complete, rollout pendiente`**, no
`complete`.

## Rollback

Inmediato y sin estado que revertir:

- Apagar el interruptor del Lab (`GLOBE_LAB_ENABLED` en OFF) detiene toda ejecución.
- Volver `GLOBE_LAB_PROVIDER` a `fake` detiene todo gasto sin apagar la capacidad.
- Revertir el cambio quita las capacidades del vocabulario: quedan sin adaptador y fallan cerradas.

No hay datos persistidos que limpiar: el registro de voces vive en memoria hasta que aterrice la
persistencia durable (`TASK-1465`), y el campo de salidas del manifiesto es aditivo — lo escrito antes
sigue leyéndose por el camino anterior y nada reescribe historia.

## Referencias técnicas

- Vocabulario de capacidades + descriptor de salida por pieza: `efeonce-globe/packages/contracts/src/index.ts`
- Contrato del registro de voces: `efeonce-globe/packages/contracts/src/voice-presets.ts`
- Autorización, comandos y lectores del registro de voces: `efeonce-globe/packages/domain/src/voice-presets.ts`
- Validación de referencias antes del gasto + selección de salida por medio: `efeonce-globe/packages/domain/src/model-lab.ts`
- Catálogo de rutas (versión y constraints): `efeonce-globe/packages/domain/src/producer-catalog.ts`
- Adaptadores de proveedor (identificadores confinados): `efeonce-globe/apps/creative-runner/src/{fal-adapter.ts,vertex-video-adapter.ts}`
- Ingesta y declaración de salidas múltiples: `efeonce-globe/apps/creative-runner/src/index.ts`
- Métodos del SDK: `efeonce-globe/packages/sdk/src/index.ts`
