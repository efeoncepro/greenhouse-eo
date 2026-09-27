# Línea gráfica Efeonce — Lenguaje de movimiento de la órbita V1

> **Tipo de documento:** Norma de marca (movimiento)
> **Versión:** 1.0
> **Creado:** 2026-09-26 por Claude, con la dirección del operador
> **Última actualización:** 2026-09-26 por Claude
> **Estado:** Vigente. Nace de las animaciones del logo V1.1 que aprobó el operador el 2026-09-26.
> **Valores:** tokens `efeonceGraphicLine.motion` en `@efeoncepro/axis-tokens` 0.3.3 (AXIS). Este documento explica
> las reglas; los números viven en el token y el render los lee de ahí.
> **Relacionados:** [manual de la línea gráfica](./EFEONCE_GRAPHIC_LINE_V1.md) ·
> [spec de producción del motion](./EFEONCE_ORBIT_REVEAL_MOTION_V1.md) ·
> [Lab 4.4.2](https://axis.efeonce.org/references/graphic-line/#animaciones)

## Para qué sirve

La órbita se mueve de una manera reconocible: pausa, arranque rápido y llegada con golpe. Este documento convierte esa
manera en reglas, para que cualquier pieza nueva (otra marca de la familia, un cierre de evento, una transición, una
cortinilla) tenga la misma fluidez sin copiar números de un script. Si una pieza no sigue estas reglas, no es el
movimiento de Efeonce aunque use el logo.

## Las siete reglas

### 1. Ritmo lento, rápido, lento

Cada acción empieza con una pausa corta o una anticipación, corre rápido y termina con un golpe. Nada se detiene
suavemente.

- **Anticipación:** antes de lanzarse, lo que se va retrocede un poco. En la apertura la nave retrocede un 3,5 % de su
  recorrido (`pieces.open.pullbackAmount`) antes de salir.
- **Un protagonista a la vez:** los movimientos se relevan: el arco crece, la órbita gira, la nave encaja, la cámara
  se acerca, las letras salen. Nunca dos protagonistas al mismo tiempo.

### 2. Llegar con golpe, no deslizarse

- **Sobrepaso (back-out):** lo que llega se pasa un poco y vuelve. La cantidad depende del papel (`overshoot`):

  | Elemento | Sobrepaso | Por qué |
  |---|---|---|
  | Nave | 0,9 | Es pesada: encaja firme, casi sin rebote |
  | Esfera al nacer | 2 | Es chica y viva: aparece con energía |
  | Letras | 1,6 | Punto medio: se asientan con carácter |
  | Por defecto | 1,2 | Cualquier llegada nueva |

- **Pulso de impacto:** cuando algo encaja, un empujón sube rápido y cae (`pulse`), y lo sigue un eco al 55 %
  (`pulse.echo`). El isotipo crece un 4,5 % con el golpe (`impactScale`).
- **Onda de acento:** en el encaje, la órbita en el color de acento se expande de 1,02 a 1,5 veces y se apaga
  (`wave`). Es la puntuación del golpe; no se usa como adorno fuera de un encaje.
- **Resorte casi crítico** para asentar: sobrepasa como máximo 1,5 % y vuelve una sola vez (`settle`). Nunca tiembla.

### 3. Curvas por papel

Sólo tres curvas, las de AXIS (`axisMotion.ease`), elegidas por lo que hace el elemento (`curves`):

| Papel | Curva | Ejemplos |
|---|---|---|
| Llega | `emphasized` | el arco, la cámara, el eslogan |
| Se transforma | `standard` | el color, el halo |
| Se va | `emphasizedAccelerate` | la nave que sale, las letras que se recogen |

### 4. La velocidad no salta en los relevos

Cuando un movimiento le entrega el paso al siguiente (arco → giro → nave → cámara), la velocidad se mantiene: no frena
en seco ni arranca de golpe. La cámara hace zoom en **escala logarítmica** (`cameraZoom: 'log'`), así el acercamiento
se siente parejo y no acelerado al final.

### 5. Movimiento real

- **Desenfoque de movimiento de verdad**, sólo en los tramos rápidos (`pieces.*.blurMs`): cada cuadro promedia
  subcuadros en un obturador de 180° (`motionBlur`). En los tramos lentos la imagen queda nítida.
- **El color se mezcla en OKLab** (`colorMix`): el paso del teal al blanco no pasa por un gris sucio.

### 6. La marca manda en la geometría

- **Todo sale de los archivos oficiales** (`@efeoncepro/axis-brand-assets`). El cuadro final es el logo oficial y se
  compara píxel a píxel; nada se redibuja a mano.
- **Oclusión coherente:** la parte trasera de la órbita pasa detrás de la nave y del planeta; la delantera corta la
  nave. Los cortes usan el aire medido del isotipo.
- **La esfera es la protagonista:** viaja en la punta del arco, se vuelve el planeta, crece y toma el color del logo.
- **Las letras nacen detrás del isotipo** y salen una tras otra, con 28 ms de escalonamiento y 420 ms cada una
  (`letters`).
- **Jerarquía en el cuadro** (`layout`):

  | Elemento | 16:9 | Cuadrado | Vertical (4:5, 9:16) |
  |---|---|---|---|
  | Anillo héroe (lado corto) | 78 % | 80 % | 84 % |
  | Logo final (lado corto) | 50 % | 56 % | 66 % |
  | Eslogan | 64 % del logo, siempre | | |

### 7. El sonido acompaña el golpe

Sintetizado y determinístico, sin muestras de terceros. Cada impacto visual tiene su golpe sonoro; el paso de la nave
suena paneado con su recorrido. Termina con un acorde abierto y un fundido de 0,45 s (`sound`). Pico en −1 dBFS,
alrededor de −17,5 LUFS, WAV de 48 kHz y 24 bits.

> **Delta 2026-09-26 — identidad sonora recomendada.** Existe una identidad sonora de Efeonce («Tres puntos que se
> vuelven uno»), recomendada por el operador y todavía no canon, que re-sonoriza el reveal, la apertura y el sting sin
> tocar la imagen: la esfera sonora cae con el golpe de encaje. El sonido de los masters V1.1 (`motion/logo/v1.1/`,
> `orbit-sound.mjs`) sigue vigente hasta canonizarla. Ver
> [`EFEONCE_SONIC_IDENTITY_V1.md`](../brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md).

## Las piezas que hoy siguen estas reglas

| Pieza | Duración | Qué hace | Tokens |
|---|---|---|---|
| Reveal | 3,6 s | la línea se vuelve logo | `pieces.reveal` |
| Apertura | 2,4 s | el logo se abre en la línea | `pieces.open` |
| Sting | 1,6 s | el golpe corto: la nave encaja y la cámara salta al logotipo | `pieces.sting` |
| Órbita sola | 2,0 s + 0,5 s | anillo, arco, la esfera asienta, halo; sin logo | `brandClose` (paquete `axis-graphic-line`) |

## Cómo se aplica a una pieza nueva

1. Define el protagonista de cada tramo y ordénalos: nunca dos a la vez.
2. Pon una pausa o una anticipación antes de cada arranque, y un golpe al final (sobrepaso, pulso y, si encaja algo,
   la onda de acento).
3. Elige la curva por papel: llega, se transforma o se va.
4. Revisa los relevos: la velocidad no puede saltar.
5. Agrega desenfoque real sólo donde el movimiento es rápido.
6. Usa los archivos oficiales y compara el cuadro final con el original.
7. Si lleva sonido, un golpe por impacto y cierre con fundido.

Los números salen de `efeonceGraphicLine.motion`. Si una pieza nueva necesita un valor que no existe, se agrega al token
con su razón, no se escribe en el script.

## Qué no hacer

- Generar la animación con un modelo de video: el logo no se sostiene y la oclusión no queda exacta.
- Detener algo suavemente, sin golpe, o mover dos protagonistas a la vez.
- Usar la onda de acento o el pulso como adorno, sin un encaje.
- Escribir tiempos, sobrepasos o proporciones en un script: se leen del token.
- Usar estas animaciones para clientes o para la interfaz de Greenhouse: son marca propia de Efeonce.
- Ponerle esfera o mayúsculas al eslogan.

## Cómo se mantiene

- **Fuente de los valores:** `efeonceGraphicLine.motion` en AXIS (`packages/tokens/src/tokens.ts`), con su prueba en
  `tokens.test.ts` (tramos dentro de cada pieza, curvas por papel, resorte ≤ 1,5 %).
- **Quién los lee:** `scripts/creative/brand-motion/` en greenhouse-eo (`orbit-scene.js`, `render-orbit-motion.mjs`,
  `orbit-sound.mjs`, `encode-orbit-motion.mjs`). El 2026-09-26 se pasaron del script al token y se verificó que los 90
  cuadros clave de las tres piezas y los tres sonidos salen idénticos byte a byte.
- **Cambiar un valor:** se cambia en el token, se publica `axis-tokens`, se fija en Greenhouse y se renderiza el
  storyboard para compararlo con el anterior antes de producir masters. Un cambio que altera una pieza aprobada
  necesita la aprobación del operador.
