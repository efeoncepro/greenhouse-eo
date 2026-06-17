> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-06-13 por Claude (sesión TASK-1104/1105 + capstone)
> **Ultima actualizacion:** 2026-06-14 por Claude (TASK-1124 — calidad de respuesta de Knowledge)
> **Documentacion tecnica:** [docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md](../../architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md)

# Experiencia Conversacional de Nexa — cómo funciona

## Para qué sirve

La **experiencia conversacional de Nexa** es la forma en que una persona le pregunta algo a Nexa dentro de Greenhouse y recibe una respuesta clara, confiable y con sus fuentes a la vista — sin tener que abrir otra pantalla ni perder el contexto en el que estaba.

La idea de fondo es la misma que viste en buscadores modernos con IA: **primero la respuesta**, no una lista de links. Nexa responde, te dice **por qué podés confiar** en esa respuesta, te deja **ver la evidencia si querés** y te ofrece **seguir conversando** con preguntas sugeridas.

Lo importante: es **una sola experiencia, reutilizable en todo el portal**. Hoy vive primero en Knowledge (la base de conocimiento), pero el mismo formato sirve para Finanzas, Agencia, Personas, Comercial o el Home. Knowledge es el **primer lugar donde se usa**, no el único destino.

## Cómo se ve y cómo fluye (paso a paso)

Cuando preguntás algo, la conversación pasa por una secuencia (una "coreografía") que siempre es la misma, sin importar el área:

1. **Reposo (idle).** Ves la cajita de Nexa con su borde luminoso esperando tu pregunta.
2. **Enviás.** Apenas escribís y mandás, la cajita baja y empieza la secuencia (acá arranca todo).
3. **Pensando.** Aparece tu pregunta como burbuja y Nexa muestra que está "pensando".
4. **Razonando.** Nexa muestra los pasos que va dando (entendiendo la pregunta → leyendo fuentes → redactando), con tics de progreso.
5. **Escribiendo.** La respuesta va apareciendo de a poco, como si Nexa la estuviera tecleando, con un cursor al final. Podés **detener** si querés.
6. **Respondido.** Queda la respuesta completa, con su **sello de confianza** (de qué fuentes salió, qué tan actuales son) y una **barra para opinar**: ¿te sirvió? + copiar / compartir / regenerar.
7. **Evidencia (opcional).** Si querés ver el detalle, abrís el panel de **evidencia**: las fuentes exactas, su frescura y el razonamiento.
8. **Seguir conversando.** Abajo aparecen **preguntas sugeridas** y la cajita para que sigas preguntando.

Si algo sale mal, Nexa es **honesta**: te dice "no pude" o "esto está incompleto" con claridad, en vez de mostrar un cero o un dato falso.

## Las piezas que la componen

Cada pieza visible es un componente reutilizable. No hay un "chat de Finanzas" distinto de un "chat de Knowledge": es **el mismo armazón** con datos distintos.

| Pieza | Qué hace |
|---|---|
| **El armazón (canvas)** | La superficie que ordena todo: la pregunta, la identidad de Nexa, la respuesta, la evidencia y la cajita para seguir. Es la misma para todos los dominios. |
| **El grounding (por qué confiar)** | Un sello de confianza compacto + los pasos de razonamiento + el panel de evidencia bajo demanda. |
| **La barra de la respuesta** | El "¿te sirvió?" + copiar / compartir / regenerar. Es chrome de confianza, distinto de las acciones propias del área. |
| **El texto que se revela** | El efecto de la respuesta apareciendo de a poco con cursor (el "feel" del asistente escribiendo). |
| **El panel de evidencia** | El detalle de las fuentes: título, fragmento citado, qué tan actual es y la confianza. |
| **La cajita de Nexa (composer)** | El input con borde luminoso para preguntar (y para seguir conversando). |
| **La cara / presencia de Nexa** | La identidad visible de Nexa: su cara, su estado ("En línea" / "Pensando…") y su marca por mensaje. |

## El modelo de confianza (lo que hace a Nexa distinta)

Nexa no solo responde: **muestra su trabajo**. Cada respuesta puede traer:

- **Fuentes citadas** dentro del texto (como `[1]`, `[3]`), que podés tocar para ver de dónde salió cada cosa.
- **Frescura**: si una fuente está actual, pendiente de revisión o deprecada — y lo dice abierto.
- **Confianza**: alta / media / baja.
- **Cuántas fuentes se filtraron** por política (por ejemplo, contenido al que no tenés acceso).
- **Tu feedback**: cuando votás "¿me sirvió?", eso ayuda a mejorar.

Esto es a propósito: una respuesta sin fuentes o sin frescura no genera la misma confianza, y Nexa está diseñada para no esconder eso.

## Reglas que la mantienen consistente

- **Una sola experiencia, muchos usos.** Cuando una nueva área quiere su asistente conversacional, **reusa el mismo armazón** con sus datos — no se crea uno nuevo desde cero. Eso garantiza que se vea y se comporte igual en todo el portal.
- **El área entra por datos, no por "skin".** Finanzas no tiene colores ni botones especiales metidos a la fuerza: aporta su **contexto** y sus **fuentes**, y el armazón hace el resto.
- **Honestidad antes que relleno.** Si falta un dato, se dice; no se inventa.
- **Accesible por defecto.** Funciona con teclado, respeta "reducir movimiento" y anuncia los cambios de estado una sola vez (para lectores de pantalla).

## Cómo responde cuando se apoya en la base de conocimiento (mejora 2026-06-14)

Cuando le preguntas algo de proceso, política o "¿qué significa X?", Nexa busca en la base de
conocimiento publicada y **arma una respuesta propia cruzando los documentos** — no te pega un
pedazo de un manual. Lo que cambió:

- **Respuesta sintetizada, no copia.** Si dos guías aportan, las integra en una sola explicación clara.
- **Las fuentes viven en el desplegable, no en el texto.** La respuesta ya no termina con una lista
  cruda de "Fuentes:" ni muestra símbolos de formato sueltos. Las fuentes que la respaldan están en
  el panel desplegable bajo la respuesta (para dar confianza), y solo ahí.
- **La mejor fuente primero.** Internamente reordena la evidencia para que la sección que de verdad
  responde tu pregunta lidere, y para no apoyarse en un solo documento cuando hay más.
- **Voz Efeonce.** Tono claro y directo (te trata de "tú"), datos primero, sin relleno.
- **Honesta cuando no sabe.** Si no hay una guía publicada, te lo dice y no inventa.

## Dónde verla viva

- **En uso real:** la lente de Nexa en **Knowledge** (la base de conocimiento) responde con fuentes reales.
- **Como referencia/laboratorio interno** (solo equipo Efeonce): el Design System tiene "museos" de cada pieza — el grounding, la barra de respuesta y el texto que se revela — en `/admin/design-system` (Nexa provenance, Nexa response toolbar, Nexa streaming text, Nexa chat).

> Detalle técnico: el contrato completo (cómo se compone, los contratos de datos `surfaceContext`/`renderPlan`/evidencia, la coreografía de 11 estados, las reglas duras y cómo agregar un área nueva) vive en [docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md](../../architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md) y en el catálogo de primitives [docs/architecture/ui-platform/PRIMITIVES.md](../../architecture/ui-platform/PRIMITIVES.md). La skill operativa para agentes es `greenhouse-nexa-conversational`.
