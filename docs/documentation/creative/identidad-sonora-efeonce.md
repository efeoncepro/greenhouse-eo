# Identidad sonora de Efeonce — Tres puntos que se vuelven uno

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-09-26 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (Glitch deja de estar pendiente: su sonido propio quedó aprobado, versión B)
> **Estado:** recomendada por el operador, **todavía no canon**. Glitch tiene su diseño sonoro propio, aprobado (B),
> sólo de Glitch
> **Documentacion tecnica:** [Norma de la identidad sonora V1](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md) · [ADR de la identidad sonora](../../architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md)
> **Manual de uso:** [Usar la identidad sonora de Efeonce](../../manual-de-uso/creative/usar-identidad-sonora-efeonce.md)

## Qué es

Es el sonido de la marca propia de Efeonce: un **logo sonoro** de cuatro notas, una **etiqueta con voz** que dice el
eslogan, el sonido de las **animaciones del logo** y dos **piezas largas** para acompañar videos y eventos. Todo nace
de la misma idea y se produjo en casa, sin músico ni compositor: con un motor de síntesis propio y dos herramientas de
IA (una para la voz y otra para darle cuerpo de banda a la versión rock).

El 2026-09-26 el operador aceptó esta versión como la recomendada. Todavía no es canon: faltan confirmar licencias, una
prueba de reconocimiento y la decisión del podcast.

> Detalle técnico: [norma, estado y concepto](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#concepto-y-gramática) · [ADR, decisión](../../architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md#decisión)

## Cómo funciona la idea

La órbita se lee como una conversación: el anillo pregunta y la esfera responde. El sonido dice lo mismo:

| Lo que se ve | Lo que se oye |
|---|---|
| El anillo | un acorde abierto: la pregunta |
| Las tres ventanas de la nave | tres notas cortas e iguales: lo que se piensa |
| La esfera | una nota más alta, con el único golpe: la respuesta |
| El halo | el acorde final que florece y se apaga |

Por eso se llama **«Tres puntos que se vuelven uno»**: suena como unos puntos suspensivos que se resuelven. La melodía
es siempre la misma, con la misma pausa antes de la respuesta. Así se reconoce aunque cambie todo lo demás.

> Detalle técnico: [el motivo](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#el-motivo)

## Dos maneras de sonar

| Registro | Cómo suena | Para qué |
|---|---|---|
| **Fondo** | sereno; la armonía va cambiando por debajo y la esfera siempre responde la misma nota: «el contexto cambia, la respuesta no» | acompañar una voz: webinars, explicativos, videos con locución |
| **Energía** | rock: tres golpes apagados de guitarra y el acorde abierto con batería y bajo, con la misma pausa del logo | lanzamientos, redes con ritmo, eventos |

Una pieza usa uno solo de los dos; nunca cambia de uno a otro a mitad de camino.

> Detalle técnico: [dos registros](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#dos-registros)

## Cada línea de servicio tiene su acento

La melodía no cambia entre líneas de servicio. Cambia sólo el instrumento de la última nota, la esfera:

| Línea | Instrumento de la esfera |
|---|---|
| Growth | campana |
| Brand | marimba |
| Engine | sintetizador FM |
| Voice | eco |
| Revenue (HubSpot y Salesforce) | campana grave |

> Detalle técnico: [acento por línea](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#acento-por-línea-de-servicio)

## La voz

En los cierres, una voz dice el eslogan: **«Empower your Growth.»** (o Brand, Engine, Voice, Revenue). Es la voz
**Brian**, siempre la misma, y el eslogan va siempre en inglés. La última palabra cae justo con la esfera, para que
sonido y palabra lleguen juntos.

> Detalle técnico: [voz y etiqueta](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#voz-la-etiqueta)

## Las animaciones del logo, con sonido nuevo

Las tres animaciones del logo (reveal, apertura y sting) no cambiaron de imagen: se les puso el sonido nuevo de modo
que la esfera suene en el mismo instante en que la nave encaja. El reveal tiene dos versiones, con voz y sin voz. Cada
animación dura un segundo más al final para que se oiga cómo se apaga el acorde. Vienen en horizontal (16:9) y
vertical (9:16).

Los archivos de las animaciones que hoy están publicados con la línea gráfica siguen con su sonido anterior hasta que
esta identidad se vuelva canon.

> Detalle técnico: [sonido del motion](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#sonido-del-motion-del-logo) · [lenguaje de movimiento, regla 7](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md#7-el-sonido-acompaña-el-golpe)

## Qué se usa en cada caso

| Situación | Qué suena |
|---|---|
| Final de un video | el reveal (con la voz si el video no termina con alguien hablando) |
| Inicio de un video | la apertura |
| Reels, cortinillas y cierres muy cortos | el sting |
| Video con locución o webinar | la pieza larga de fondo, bien por debajo de la voz |
| Lanzamiento, redes con ritmo o evento | la pieza de energía o su cierre corto |
| Pieza de una sola línea de servicio | el logo o la etiqueta con el instrumento de esa línea |
| Podcast Glitch | no usa este sonido: Glitch tiene su diseño sonoro propio, aprobado (B), sólo de Glitch (ver abajo) |
| Pantalla de recepción | nada: no lleva sonido |
| Clientes o la interfaz de Greenhouse | no se usa |

> Detalle técnico: [mapa de uso](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#mapa-de-uso)

## Reglas clave

- La melodía y su pausa no se tocan.
- Un solo golpe por pieza: el de la esfera.
- La pieza de energía nunca va debajo de alguien hablando.
- Se usan los archivos del kit; nadie vuelve a generar el logo, la voz ni la esfera.
- Cada archivo se entrega al volumen de su destino (video y redes, o podcast), no «lo más fuerte posible».

> Detalle técnico: [reglas siempre y nunca](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#reglas)

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| La norma, con reproductores | [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/) (se publica cuando se aprueba el cambio en AXIS) |
| Los archivos para descargar | carpeta pública `sonic/v1/` del almacenamiento de AXIS (enlace en la norma) |
| La producción y su historia | `ai-generations/2026-09-26_branding-sonoro/` en el repo |

> Detalle técnico: [dónde vive](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#dónde-vive)

## Estado y pendientes

- **Recomendada, no canon.**
- **Glitch (podcast):** ya no está pendiente. Las dos versiones musicales exploradas (una serena y una rock) no
  convencieron; después se probó diseño sonoro en vez de música y el operador **aprobó la versión B** el 2026-09-27.
  Glitch tiene su **diseño sonoro propio, aprobado (B), sólo de Glitch**: no es parte de la identidad sonora de
  Efeonce, no se usa en piezas de Efeonce y no se mezcla con este kit. Se explica en la
  [línea gráfica de Glitch](./linea-grafica-glitch.md) (detalle en la norma de Glitch §13.11).
- Falta confirmar las licencias de las herramientas de IA usadas, hacer una prueba de reconocimiento sin logo antes de
  pautar y pasar los valores al sistema de diseño (AXIS) cuando se canonice.

> Detalle técnico: [pendientes para canonizar](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md#pendientes-para-canonizar)
