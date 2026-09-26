# Iconografía de la línea: íconos de trazo (reposo y respuesta)

> Verificado contra: canvas «Íconos de La órbita» (claude.ai/artifact/Y9mx42L72zYc6iLg4j3Maj, página «Trazo · aprobado»,
> ícono maestro `project/Icono.dc.html`) — 2026-09-26 · greenhouse-eo@1981f4ac4 · decisiones del operador D16 y D17
> ([ledger.md](ledger.md)).
>
> **Estado:** estilo **aprobado por el operador el 2026-09-26**. Todavía **no** vive en AXIS: no hay tokens
> `efeonceGraphicLine.icons` ni archivos en `@efeoncepro/axis-brand-assets`. Hasta que existan, la geometría canónica es la
> de este documento (sección 9), copiada del ícono maestro del canvas. La iconografía **plana** (rellena) está en
> exploración y no se usa (sección 11).

## 1. La idea

Un ícono de la línea tiene **dos estados** del mismo dibujo:

- **Reposo:** trazo limpio, uniforme, sin acento. Es el ícono de todos los días.
- **Respuesta:** una sola **esfera** en el acento de la línea marca el punto donde la acción se resuelve.

La esfera es un **estado**, no parte del dibujo. Es la gramática de la marca aplicada al ícono —«el anillo pregunta, la
esfera responde» ([criteria.md](criteria.md) §1)— sin gastar la esfera en cada ícono: el trazo limpio convive con
cualquier pieza y la respuesta se reserva para lo que importa.

Nació de un híbrido (D16): de tres direcciones exploradas, el trazo limpio (A) quedó como reposo, el punto de respuesta
(B) como respuesta, y la «órbita abierta» (C, cada contorno con un corte) se descartó porque competía con la órbita del
isotipo en vez de acompañarla.

## 2. Construcción

| Parámetro | Valor |
|---|---|
| Grilla | 24 × 24, con **margen de 2** (el dibujo vive en 20 × 20). Es la grilla de Tabler: el set convive con los íconos de la firma de correo |
| Líneas guía | círculo de radio 10, cuadrado de 18, rectángulo apaisado de 20 × 16 |
| Trazo | **1,5** en unidades de la grilla |
| Trazo en tamaños chicos | **1,75** en 20 px o menos (compensación óptica) |
| Trazo en tamaños grandes | **tope de 4 px** sobre 64 px: el trazo deja de escalar para no pesar más que la órbita (2,4–3,8 px en redes) |
| Remates y uniones | redondos (`stroke-linecap` y `stroke-linejoin` `round`) |
| Esfera | círculo **relleno**, radio **1,75** en la grilla, un solo tamaño en todo el set |
| Aire de la esfera | **0,5** como mínimo entre el borde de la esfera y cualquier trazo (medido con el trazo incluido) |
| Respuesta | desde **20 px**; más chico, el ícono va sólo en reposo (la esfera bajaría de ~2,3 px) |

Las cifras de trazo en tamaños chicos y grandes son **ópticas**: se aplican al exportar cada tamaño, no se dibujan dos
geometrías.

## 3. Cómo nace la esfera en cada glifo

Dos maneras, y cada glifo usa una sola:

- **Reemplaza:** una pieza del reposo se vuelve la esfera. La punta de la flecha de Revenue, el tope de la barra más alta
  de Medición, la onda exterior de Medios, el primer punto de la ventana de Web, la cabeza de la segunda persona de
  Talent, la muesca superior de Finance.
- **Completa:** la esfera aparece donde la acción se resuelve. El centro de la lupa de Búsqueda; el punto final que deja
  el lápiz de Contenido.

Un glifo nuevo se dibuja **ya con el lugar de su esfera previsto**, con su aire de 0,5. Si no hay un lugar con sentido
(una punta, un tope, un centro, un punto final), el glifo no tiene respuesta y queda siempre en reposo.

## 4. Color

- **Tinta:** blanco sobre oscuro (`#001a33` en Growth, `#091951` en las demás líneas); navy `#023c70` sobre papel.
- **Acento:** **sólo la esfera**, en el acento de la línea de servicio. Sobre oscuro, el acento oscuro de la línea; sobre
  papel, el claro (valores en `efeonceGraphicLine.lines[]`, ver [package-and-tokens.md](package-and-tokens.md)).
- El acento mide **≥ 3:1** contra su fondo (D1). El teal claro `#36c8bf` nunca sobre papel (1,94:1).
- **Nunca** el ícono entero en el acento, ni el trazo en el acento, ni la esfera en tinta.

## 5. Cuándo responde

| Situación | Estado | Por qué |
|---|---|---|
| El ícono es la pieza (protagonista, sin otra esfera) | **respuesta** | su esfera es la única |
| Una fila o grupo de íconos | **responde uno solo**: el activo (la sección donde vamos, el servicio que se vende) | la esfera marca lo que importa |
| La pieza ya tiene esfera (la de la órbita o la que cierra la respuesta) | **reposo** | el canon ya cierra con esas esferas; el ícono no suma otra |
| Dentro de una órbita (firma de equipo, post con órbita) | **reposo** | la órbita ya responde |
| Satélites del mapa de canales o de familia | **reposo** | los satélites no llevan esfera |
| Listas, tablas, contacto, navegación | **reposo** | la esfera nunca es viñeta |
| 20 px o menos | **reposo** | la esfera no se lee |

Regla corta: **responde el que importa, y sólo si nadie más está respondiendo.**

## 6. Contenedores

| Contenedor | Tamaño de referencia | Estado |
|---|---|---|
| Solo | 24–72 px | reposo, salvo que sea protagonista |
| Sobre disco (`#0b2b4a` oscuro, `#eef3f7` claro) | ícono al 40 % del disco | responde si es protagonista |
| Dentro de la órbita | ícono a 72/208 de la caja (la geometría del retrato, `emailSignature.team.areaMark`) | reposo |
| Satélite | disco de 30–36 px, ícono de 18–20 px | reposo |

El ícono dentro de la órbita respeta las reglas de la órbita: un solo anillo, nada cruza el anillo y el ícono vive
adentro con aire ([criteria.md](criteria.md) §3.1 y §3.7).

## 7. En una pieza

- **Deck:** íconos de 48–56 px sobre las columnas; en una fila, responde sólo la línea activa, con su propio acento.
- **Post con órbita:** el ícono va dentro de la órbita en reposo y con el tope de trazo (a 220 px, el trazo queda en 4 px,
  a la par del arco de 3,8 px). La respuesta con esfera y la esfera de la órbita ya cierran.
- Los íconos nunca se repiten como patrón (la misma regla que la esfera y la órbita, [criteria.md](criteria.md) §2.2).

## 8. No hacer

- Todos los íconos de una fila respondiendo: la esfera se vuelve viñeta.
- Responder junto a otra esfera (órbita o respuesta).
- La esfera fuera de regla: más grande, sin acento (en tinta), hueca o suelta lejos del glifo.
- Volumen, brillo, sombras, degradés o esferas de vidrio.
- El acento oscuro sobre papel.
- El ícono cruzando el anillo de una órbita.
- Mezclar este set con otra familia de íconos en la misma pieza (salvo Tabler en la firma de correo mientras dure la
  migración).
- Dibujar un glifo nuevo a mano en una pieza: primero entra al set con su construcción y su esfera prevista.

## 9. Geometría canónica (set actual)

`viewBox="0 0 24 24"`, `fill="none"`, trazo en tinta, remates redondos. La respuesta dibuja además
`<circle cx cy r="1.75" fill="acento">`.

Constantes:

```text
LENS   = M4 10a6 6 0 1 0 12 0a6 6 0 1 0 -12 0
PENCIL = M4 20h4l10.5 -10.5a2.83 2.83 0 0 0 -4 -4l-10.5 10.5v4
MEGA   = M4 10v4a1 1 0 0 0 1 1h2l5 4v-14l-5 4h-2a1 1 0 0 0 -1 1
WIN    = M4 7a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-10a3 3 0 0 1 -3 -3z
COIN   = M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0
S2     = M14.55 9.5a1.75 1.75 0 0 0 -1.55 -1h-2a1.75 1.75 0 1 0 0 3.5h2a1.75 1.75 0 1 1 0 3.5h-2a1.75 1.75 0 0 1 -1.55 -1
HEAD   = M6 7a3 3 0 1 0 6 0a3 3 0 1 0 -6 0
BODY   = M3 20v-1a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v1
```

| Glifo | Uso | Reposo | Respuesta (trazos) | Esfera (cx, cy) | Modo |
|---|---|---|---|---|---|
| Búsqueda | Engine · SEO | `LENS` · `M20 20l-5.6 -5.6` | igual al reposo | 10, 10 | completa |
| Medición | Growth · datos | `M4 20h16` · `M7 16v-3` · `M12 16v-7` · `M17 16v-11` | `M4 20h16` · `M7 16v-3` · `M12 16v-6` · `M17 16v-6` | 17, 6.5 | reemplaza |
| Contenido | Brand | `PENCIL` · `M13.5 6.5l4 4` | igual al reposo | 18.5, 19.5 | completa |
| Medios | Voice | `MEGA` · `M16 9a4 4 0 0 1 0 6` · `M18.5 6.5a7.5 7.5 0 0 1 0 11` | `MEGA` · `M16 9a4 4 0 0 1 0 6` | 20.35, 12 | reemplaza |
| Revenue | RevOps | `M4 17l5 -5l4 4l7 -7` · `M15 9h5v5` | `M4 17l5 -5l4 4l4.5 -4.5` | 19.75, 9.25 | reemplaza |
| Web | Engine · web | `WIN` · `M4 10h16` · `M7.25 7h.01` · `M10.5 7h.01` | `WIN` · `M4 10h16` · `M10.5 7h.01` | 7.25, 7 | reemplaza |
| Talent | área | `HEAD` · `BODY` · `M16 4.13a3 3 0 0 1 0 5.75` · `M21 20v-1a4 4 0 0 0 -3 -3.85` | `HEAD` · `BODY` · `M21 20v-1a4 4 0 0 0 -3 -3.85` | 17, 7 | reemplaza |
| Finance | área | `COIN` · `S2` · `M12 6.5v2m0 7v2` | `COIN` · `S2` · `M12 15.5v2` | 12, 5.5 | reemplaza |

Aire verificado a mano el 2026-09-26 (≥ 0,5 en todos). Revenue y Medios se corrigieron para cumplirlo: la línea de
Revenue termina en 17,5 / 11,5 y la esfera de Medios va en x 20,35.

## 10. Implementación y pendientes

- **Hoy:** el ícono maestro del canvas es la referencia visual; este documento, la geometría.
- **Pendiente (AXIS):** tokens `efeonceGraphicLine.icons` (grilla, trazo, pisos y topes ópticos, radio y aire de la
  esfera, respuesta mínima) y los SVG del set en `@efeoncepro/axis-brand-assets` (reposo y respuesta por glifo). Hasta
  entonces, nada de esto se transcribe a código de producto.
- **Pendiente (operador):** el inventario del set (qué íconos necesita la marca: líneas, canales, áreas, contacto) y si
  este set reemplaza a los Tabler outline de la firma de correo y de la firma de equipo (`emailSignature.icons`,
  `team.areaMark`). Mientras no se decida, la firma sigue con Tabler.

## 11. Plastilina, la voz blanda (dirección aprobada, especificación en exploración)

El operador pidió un estilo **complementario** con punch y personalidad para el oficio creativo. Tras descartar los
tratamientos dibujados a mano y dos rondas generadas, eligió la dirección E y la llamó **Plastilina** (D19). Vive en la
sección 2 del canvas «Íconos de La órbita» (anatomía E1, post E2, set E3 e ícono maestro vectorial `IconoE.dc.html`).

- **Dos voces, una familia (propuesta):** Trazo para lo que se mide (Growth, Engine, Revenue; decks, informes,
  listas); Plastilina para lo que se crea (Brand/Globe). Comparten la paleta, la esfera (reposo o respuesta), la grilla
  (24 y 48) y los remates redondos. En una pieza con las dos, manda una (Plastilina grande, Trazo chico de apoyo), una
  sola esfera responde y nunca se mezclan en un mismo grupo.
- **Anatomía (E1):** silueta blanda con contorno a mano · proporciones con carácter · actitud (giro) · calados
  redondos · la esfera es la acción (la gota, la luz, la pintura, el punto que cierra la respuesta), un solo tamaño y
  con su aire · gesto en el protagonista (rayos, velocidad, vibración) · tres colores.
- **Color (D18):** consistente dentro de cada línea de servicio y cambia de acento según la línea.
- **Órbita sesgada (D20):** la firma de Plastilina. Elipse inclinada (en el canvas, −16° y un alto de un tercio del
  ancho) que pasa por detrás y por delante del objeto protagonista, con un calado del color del fondo; anillo tenue,
  arco en el acento por el frente y la esfera al final, fuera del objeto. Una por pieza, nunca cruza el texto y nunca
  mide. Lo que mide, enfoca o cierra la marca sigue siendo circular.
- **Origen de la geometría:** la silueta se trazó en vector (potrace) desde la hoja generada E y la esfera se compone
  aparte; los glifos nuevos necesitan un método propio (pendiente).
- **Pendientes:** ver [ledger.md](ledger.md), «Íconos, pendientes de Plastilina».
