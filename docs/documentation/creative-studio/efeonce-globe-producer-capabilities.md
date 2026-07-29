# Efeonce Globe — Nuevas capacidades de video y audio, y el registro de voces

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-22 por Claude (TASK-1504)
> **Ultima actualizacion:** 2026-07-22 por Claude (TASK-1504)
> **Documentacion tecnica:** [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)

## Qué es y para qué sirve

Es la ampliación del **repertorio creativo** de Efeonce Globe: lo que el Producer sabe pedirle a un motor.
El vocabulario pasó de **10 a 14 capacidades**, y las cuatro nuevas son todas de video y audio:

| Capacidad | Qué hace | Motor que la sirve hoy |
|---|---|---|
| `video-frames` | Genera un video **entre una foto inicial y (opcionalmente) una foto final**. Tú pones los extremos, el motor construye el trayecto. | Veo · 2.0 (sin audio) |
| `video-motion-control` | Toma **el movimiento de un video de referencia** y lo transfiere a una generación nueva. | Seedance · 2.0 |
| `audio-change-voice` | Cambia **la voz** de un clip conservando la interpretación (el ritmo, la intención, las pausas). | ElevenLabs · Voice Changer |
| `audio-translate` | **Dobla o localiza** un clip a otro idioma. | ElevenLabs · Dubbing |

Junto con esas cuatro capacidades llegan tres cambios de comportamiento que las hacen confiables: una
verificación más estricta **antes de cobrar**, la corrección de un error que sí llegaba al usuario, y un
**registro de voces** reutilizables.

> Detalle técnico: contrato de capacidades y formas de salida en
> `efeonce-globe/packages/contracts/src/index.ts`; rutas nuevas (`ref/video/frames-v1`,
> `ref/video/motion-v1`, `ref/voice/change-v1`, `ref/voice/translate-v1`) en
> `packages/domain/src/producer-catalog.ts`. Contrato general en
> [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md).

## Verificar antes de gastar (la mitad que faltaba)

Hasta ahora el sistema verificaba **que la ruta ofreciera el modo pedido**: si pides transferencia de
movimiento a una ruta que no la hace, te dice que no. Eso sigue igual.

Lo que se agrega es la otra mitad: verificar **que tú hayas aportado lo que ese modo consume**. Y la
verificación cuenta las referencias **por tipo de medio**, no por total — que es lo único que la hace
significativa.

El ejemplo que lo explica: pides transferencia de movimiento y mandas **dos imágenes y ningún video**.
Tienes referencias de sobra (dos, más que suficientes si solo se contara la cantidad) y aun así la corrida
**no puede ejecutarse**, porque el movimiento tiene que salir de un video. Antes, un caso así llegaba
hasta el motor. Ahora se rechaza antes de reservar crédito.

Lo mismo aplica a los otros modos nuevos:

- **`video-frames`**: si declaras que habrá foto final y no la mandas, se rechaza. Si declaras que no la
  habrá, no se te exige — porque exigir dos fotos a quien pidió una sería negarle una corrida que el
  motor sí puede servir.
- **`audio-change-voice`** y **`audio-translate`**: ambos transforman un clip que ya existe, así que sin
  clip de origen no hay corrida. Ninguno de los dos puede inventarse su propia fuente.
- **`audio-translate`** además valida el **idioma destino** contra los idiomas que la ruta declara servir.
  Un idioma no soportado se rechaza aquí, en vez de descubrirse como un error del proveedor dentro de una
  corrida ya pagada.

> Detalle técnico: validación de modo de entrada en `packages/domain/src/model-lab.ts`
> (`assertInputModeSatisfied`), ejecutada en `prepare`, estrictamente antes de la barrera de gasto.
> Contrato de la barrera en
> [EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md).

## Un error corregido que sí afectaba al usuario

Una ruta de video anunciaba en el catálogo que aceptaba **fotos de referencia y fuente de movimiento**,
pero la capacidad a la que pertenece resuelve a un motor de **solo texto**: un motor sin campo donde
poner una referencia.

El resultado era el peor de los posibles: el sistema validaba la corrida (el catálogo decía que sí),
**cobraba los créditos**, el motor ignoraba las fotos por completo y el usuario recibía un video que **se
veía bien y no tenía ninguna relación con lo que mandó**. No fallaba, no avisaba: entregaba otra cosa.

Ya está corregido. Esos dos modos se movieron a las rutas dedicadas que sí los sirven —`video-frames` y
`video-motion-control`, con motores que honran lo que reciben— y la ruta original conserva solo lo que su
motor de verdad puede hacer.

> Detalle técnico: la ruta corregida es `ref/motion/loop-v1` en
> `packages/domain/src/producer-catalog.ts`; el catálogo es dato versionado, ver
> [Catálogo gobernado de rutas](efeonce-globe-producer-catalog.md).

## Cuando una corrida emite más de una pieza

Una corrida puede entregar **varias piezas a la vez** — por ejemplo un video **más** su pista de audio.

Antes se registraban como una lista plana de piezas, sin decir cuál era cuál, y con **un solo indicador
de "se guardó" para todas**. Eso tenía dos consecuencias visibles:

- Si el depósito aceptaba el video y rechazaba el audio, había que elegir entre **declarar guardado algo
  que no estaba** o **desconocer bytes que sí estaban**. La corrida se pagó igual, en cualquiera de los
  dos casos.
- Al refinar una corrida de video + audio, el sistema tomaba **la primera pieza de la lista**. Pedir
  "mejora el video" podía terminar entregándole al motor **la pista de audio**.

Ahora **cada salida se declara por separado**: su identificador, de qué tipo es (imagen, video, audio,
texto, modelo 3D) y si se guardó o no. Las consecuencias también son visibles:

- Si falla el guardado de **una sola** pieza, las otras **no** quedan marcadas como perdidas.
- Al refinar, el sistema toma **la pieza del tipo correcto**, no "la primera".

El cambio es aditivo: las corridas registradas antes de esto siguen siendo legibles como estaban. No se
reescribe historia.

> Detalle técnico: `LabOutputDescriptorV1` y el campo `outputs` del manifiesto de intento en
> `packages/contracts/src/index.ts`; selección de la pieza a refinar en
> `packages/domain/src/model-lab.ts`.

## El registro de voces

Permite **registrar voces reutilizables** y luego aplicarlas por nombre en las corridas de audio, en vez
de volver a describir una voz en cada una. Hay dos tipos:

- **`catalog`** — apunta a una **voz curada que la plataforma ya ofrece**. Tú eliges una de la carta.
- **`cloned`** — se construye **desde una grabación de una persona real**. Se modela aparte, no como una
  casilla marcada, porque su exigencia de derechos no es opcional y su ciclo de vida nunca será el mismo.

Reglas de cuidado que conviene tener claras:

- **Una voz clonada no se puede registrar sin declarar qué derechos la permiten.** Es la voz de una
  persona: "no dijimos nada" no es un estado aceptable para que exista.
- **La grabación nunca se sube por esta vía.** Viaja como **huella digital del contenido más derechos
  declarados**, igual que cualquier otro insumo que cruza esta API. Bytes, nunca.
- **Las voces de un espacio de trabajo son invisibles para otro.** Pedir una voz ajena responde
  exactamente lo mismo que pedir una inventada: "no existe". Decir algo distinto ya sería una pista.
- **Una voz no se edita: se registra una nueva.** Un nombre de voz que ya usaron corridas pasadas es
  parte de su evidencia; reapuntarlo en silencio reescribiría con qué se hicieron.
- **Registrar dos veces la misma voz no la duplica.** Se devuelve la que ya está en el registro, así que
  un reintento no genera una segunda entrada.
- **Si una voz no se puede resolver, la corrida se rechaza** — no se usa una voz por defecto. Esto es
  deliberado: devolver audio con la voz equivocada es exactamente lo que esta función existe para evitar.
- **Registrar una voz no gasta.** No corre ningún modelo ni reserva crédito. Por eso tiene su propia
  autoridad: poner nombre a una voz no debe implicar poder facturarle a un proveedor.

> Detalle técnico: contrato en `efeonce-globe/packages/contracts/src/voice-presets.ts`; registro,
> resolución y alcance por espacio de trabajo en `packages/domain/src/voice-presets.ts`; métodos SDK de
> registro y consulta en `packages/sdk/src/index.ts`.

## Qué significan los estados

| Respuesta | Qué pasó | Qué hacer |
|---|---|---|
| **Solicitud inválida** | La ruta no ofrece el modo pedido, o falta el insumo que ese modo consume (sin video de origen, sin foto final declarada, sin clip a doblar), o el idioma destino no está entre los que la ruta sirve | Revisar qué insumo exige el modo y volver a enviar. No se cobró nada |
| **No encontrada** | La voz pedida no es de este espacio de trabajo o no existe; o la ruta no existe | Revisar que la voz esté registrada en tu espacio de trabajo |
| **Bloqueado por política** | La capacidad está apagada en ese ambiente | Es una decisión operativa: ver el manual de uso |
| **Corrida rechazada por voz sin resolver** | Se declaró una voz que el registro no pudo resolver | Registrar la voz primero. El sistema no elige una por ti |

## Qué está operativo hoy

Está **disponible por los caminos programáticos internos** (HTTP, SDK, CLI, worker, pruebas E2E). En
**interfaz gráfica** y en **MCP** está declarado pero **apagado**, hasta el gate de la superficie del
Producer (`TASK-1505`) — que es también cuando se le entrega la autoridad a las personas que entran por
la web.

El **gasto real está apagado por defecto**: encender un motor de verdad requiere una **decisión humana
explícita**. Nada de esto se ha usado todavía en producción ni con clientes.

## Quién puede usarla

- Las cuatro capacidades creativas nuevas se ejercen dentro del mismo circuito de corridas del Model Lab,
  con su autoridad de gasto y su barrera de crédito.
- El **registro de voces** requiere la autoridad `globe.voice.preset.manage`, que es **propia y de gasto
  cero**: deliberadamente **no** es la autoridad que permite gastar con proveedores.

## Relacionados

- [Catálogo gobernado de rutas](efeonce-globe-producer-catalog.md) — qué puede hacer cada ruta y con qué límites.
- [Descarga, vista previa y acciones sobre las piezas](efeonce-globe-producer-retrieval-assets.md) — el lado de salida.
- [Model Lab](efeonce-globe-model-lab.md) — dónde se ejecutan las corridas y cómo funciona la barrera de gasto.
- [Adaptadores de proveedor](efeonce-globe-model-lab-providers.md) — quién traduce una capacidad a un motor real.
