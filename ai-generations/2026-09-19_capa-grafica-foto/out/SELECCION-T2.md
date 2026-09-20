# Segunda tanda — 20 variantes, 10 conservadas

Pedido del operador: subir el nivel, con **rotación de texto** (sobre todo en Guttery), **tintas de la
paleta Efeonce** en el texto, y lo que sirviera para elevar aunque no lo dijera. Todo en 4:5, 9:16 y
16:9 — ninguna en 1:1.

## Lo que se agregó al motor para esta tanda

| Capacidad | Por qué eleva |
|---|---|
| **Rotación por capa** | Guttery es escritura a mano: rotada deja de ser una tercera línea de texto y pasa a ser una anotación. El motor gira alrededor del centro de la caja de tinta y **recalcula la caja alineada a ejes** para medir sobre los píxeles donde el texto quedó, no donde estaba antes de girar. |
| **Tintas por token de paleta** | El brief nombra `azulCasa`, `teal`, `lima`, `naranja`, `celeste`… y el motor **rechaza un hex suelto**. Ningún valor de diseño entra por la puerta de atrás. |
| **Caja de selección sobre un OBJETO de la foto** | Es el uso que el canon prefiere: enmarcar «la obra en revisión» o «el resultado», no el titular. Las regiones se leyeron sobre una grilla en décimas de cada plate (`scripts/grilla.mjs`), no estimadas. |
| **Medición línea por línea** | Un titular de dos líneas puede cruzar de sombra a luz; la caja completa lo promedia y miente. Ahora manda la peor línea. |
| **Alineación propia por línea** | Permite el apilado de cartel (`Aquí` / `se decide.` sangrado). |

## Las 10 que quedan

| # | Variante | Fmt | Por qué |
|---|---|---|---|
| 1 | `V31-45-caja-objeto-clawd` | 4:5 | La caja enmarca **la herramienta elegida**, no el titular. «Elegimos la herramienta.» con Arte actuando: el propósito más nítido de toda la tanda. 18,17:1 |
| 2 | `V30-45-caja-objeto-aprueba` | 4:5 | La obra en revisión enmarcada y **Cliente en lima** aprobándola —el color es el rol, no decoración— más el gesto rotado «¡listo!». Narrativa completa en una imagen |
| 3 | `V40-916-dos-lineas` | 9:16 | «Aquí / se decide.» apilado con sangría propia. Cartel puro, 142 px, 17,54:1 |
| 4 | `V39-45-escala-extrema` | 4:5 | «Se nota.» a **225 px** (0,156 del alto). Máxima masa tipográfica de la tanda |
| 5 | `V41-169-dos-lineas` | 16:9 | El apilado en horizontal: 176 px al costado izquierdo |
| 6 | `V34-169-caja-objeto` | 16:9 | Caja sobre el objeto del set con placa Efeonce |
| 7 | `V37-45-acento-teal` | 4:5 | El acento de paleta que **sí** funciona: teal claro sobre el set azul, **11,71:1** |
| 8 | `V27-916-guttery-rot12` | 9:16 | Guttery rotado −12°, grande, sobre el campo oscuro: la anotación a mano |
| 9 | `V33-916-caja-objeto` | 9:16 | Caja sobre la obra + cursor **moving**: presencia del equipo sin una segunda selección |
| 10 | `V38-169-acento-y-gesto` | 16:9 | Acento naranja + Guttery rotado en blanco. Dos recursos, un solo acento de color |

## Las 10 descartadas y qué enseñan

**Hallazgo principal, medido:** sobre los plates **cálidos** (la panadería) **ninguna tinta de color
llega a 4,5:1**. Lima 3,27:1, azul claro 4,01:1, naranja 2,49:1. Sobre el **set azul oscuro** del
estudio, en cambio, el teal da 11,71:1 y el naranja 6,43:1. **El acento de color no es una decisión
tipográfica: depende del campo de la foto.** Por eso caen `V26-45-guttery-naranja` (hoy en lima) y
`V35-45-acento-azul`.

- `V43-916-titular-rot4`: la rotación de −4° en el titular no se lee como intención, se lee como error
  de montaje. La rotación sirve en Guttery, no en Bricolage display.
- `V32-45-caja-objeto-masas`: la caja sobre las masas queda ancha y baja; enmarca sin decir nada.
  Enseña que **no todo objeto de la escena es «un objeto con sentido»**.
- `V25`, `V28`: Guttery rotado correcto pero pequeño; `V27` y `V38` hacen lo mismo mejor.
- `V29`: excelente, pero `V30` es la misma con el rol de color y el gesto — se conserva la más rica.
- `V36-916-acento-lima`: pasa (8,87:1) y está bien; queda fuera sólo por cupo frente a piezas de más impacto.
- `V42-45-todo-junto`: pasa y prueba que el sistema aguanta apilar recursos, pero ninguna capa manda.
- `V44-45-titular-vertical`: llamativa y pasa (11,08:1). Queda fuera por criterio: el titular vertical
  compite con el sujeto y no es un registro que el sistema necesite todavía. **Vale la pena mostrarla.**

## Estado

Producidas y medidas. **No aprobadas, no programadas, no publicadas.** El juicio de impacto es mío.
Registro por capa en `out/qa.json`; retícula y decisiones en `brief/matriz.mjs`.
