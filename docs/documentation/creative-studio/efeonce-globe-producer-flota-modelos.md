# Flota de modelos del Producer — disponibilidad por workspace

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-25 por Claude (TASK-1554)
> **Ultima actualizacion:** 2026-07-25 por Claude
> **Documentacion tecnica:** [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md) · [`EFEONCE_GLOBE_CREATIVE_STUDIO_ARCHITECTURE_V1.md`](../../architecture/EFEONCE_GLOBE_CREATIVE_STUDIO_ARCHITECTURE_V1.md)

## Qué resuelve

El Producer de Globe puede correr muchos modelos distintos. Antes de esto, el catálogo respondía
**"qué modelos existen"**, pero nadie respondía la pregunta que importa al usarlo: **"¿cuáles puedo
usar yo, ahora, en este espacio de trabajo?"**

Son preguntas diferentes. Un modelo puede estar integrado y probado y aun así no estar habilitado
para tu workspace. La flota es el dato que responde la segunda.

## Los tres estados

Cada modelo aparece siempre, con uno de tres estados. **Aparecer no es lo mismo que poder usarse**, y
esa distinción es deliberada: esconder un modelo hace que el usuario no sepa que existe, y termine
preguntando "¿por qué en Video no están los de Google?" cuando sí estaban, sólo que invisibles.

| Estado | Qué significa | Qué puede hacer el usuario |
|---|---|---|
| **Disponible** | Promovido y habilitado para este workspace | Elegirlo y ejecutar |
| **Próximamente** | Existe en el catálogo pero no está promovido acá | Verlo. No es ejecutable |
| **Bloqueado** | Una dependencia externa lo impide | Verlo con **la razón escrita** |

"Bloqueado" siempre viene con su motivo. Un modelo que no se puede usar y no dice por qué es
indistinguible de un producto roto.

## Un modelo puede estar disponible y aun así pedirte algo

Hay un caso que confunde y conviene entenderlo: **Veo aparece como "Necesita cuadros"**, no como
bloqueado. El modelo está disponible; lo que pasa es que necesita imágenes de referencia para
trabajar, y todavía no se las diste.

La diferencia importa. "Bloqueado" es *no podés*; "necesita cuadros" es *podés, pero falta un
insumo*. Elegirlo cambia el modo por vos y te deja donde se lo puede dar.

Si en cambio se ofreciera como ejecutable en un modo que sólo acepta prompt, la ejecución
**reservaría crédito y recién después fallaría**. Por eso se muestra con lo que necesita, nunca
como algo que podés lanzar donde no corresponde.

## Por qué agregar un modelo ya no toca la pantalla

Éste es el punto de todo el diseño. La lista de modelos **no está escrita en la interfaz**: la
interfaz pregunta y dibuja lo que recibe.

Entonces, sumar un modelo nuevo es:

1. Declararlo en el catálogo.
2. Promoverlo para el workspace que lo va a usar.

Y aparece solo — en el Producer, en Nexa, en las integraciones. Nadie edita una pantalla por modelo.
Antes, cada modelo nuevo era trabajo de interfaz; ahora es **consecuencia del dato**.

Lo mismo al revés: si se despromueve, desaparece de todos lados a la vez. No queda un botón que
promete algo que ya no existe.

## El "recomendado"

Por cada tipo de tarea hay un modelo recomendado, marcado con **✦**. Es una sugerencia, no una
restricción: siempre podés elegir otro.

Y es **honesto**: si el recomendado no está disponible para tu workspace, se muestra su estado real
en vez de preseleccionarlo. Preseleccionar algo que no se puede ejecutar convierte la recomendación
en una trampa.

## Qué nunca vas a ver

Tres cosas quedan fuera por diseño, no por omisión:

- **El identificador interno del proveedor.** Ves "GPT Image 2", nunca el código con que Globe
  habla con el proveedor por dentro.
- **El costo del proveedor.**
- **El margen.**

Ves el **nombre público del modelo y su versión** — eso alcanza para elegir con criterio, y de hecho
el nombre ya identifica a su creador. Lo que se protege es la mecánica comercial y de integración,
no la identidad del modelo.

## Lo mismo para todos

El Producer, Nexa y las integraciones externas leen **exactamente el mismo dato**. No hay una lista
para la pantalla y otra para el asistente.

La consecuencia práctica: si le preguntás a Nexa qué modelos tenés disponibles, la respuesta coincide
con lo que muestra el Producer, siempre. No pueden divergir, porque no son dos listas.

> **Detalle técnico:** contrato en `efeonce-globe/packages/contracts/src/producer-fleet.ts`;
> proyección en `packages/domain/src/producer-fleet.ts` con sus tests en `producer-fleet.test.ts`.
> El estado por modelo se lleva en
> [`GLOBE_MODEL_FLEET_STATUS.md`](../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md).
> Para operarlo: [manual de flota](../../manual-de-uso/creative-studio/operar-flota-modelos-producer-globe.md).
