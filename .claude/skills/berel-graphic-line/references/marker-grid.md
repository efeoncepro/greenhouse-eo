# Marcador de color y grilla por formato

> **Snapshot del 2026-11-02.** Fuente de verdad: `brands/berel/contracts/berel-recipes.json`
> (`grids`, `components.marker`, `components.titleRule`) y su ejecución en
> `brands/berel/compose/render.mjs` (`placeMarkers`, `composeBerel`) y
> `brands/berel/compose/elements.mjs` (`marker`, `ruledTitle`). Pruebas de regresión:
> `brands/berel/test/compose.test.mjs`. Si un número de aquí difiere del contrato, manda el contrato.

## 1. Qué es el marcador

Rotula el color de pintura del muro: dice al lector qué color está viendo y cómo pedirlo.

**Anatomía** (`elements.mjs → marker`), en fracciones del ancho del formato `W`:

| Parte | Medida | Nota |
|---|---|---|
| Aro vacío | diámetro 0,0355 × W (≈ 3,5 % en blog) | En social se escala × 1,55 (≈ 5,5 %) |
| Trazo del aro y de la guía | 0,0015 × W, mínimo 2 px | |
| Línea guía | 0,021 × W | Sale del aro hacia el texto |
| Punto al final de la guía | radio 0,0028 × W, mínimo 2,5 px | |
| Nombre del color | Gotham Rounded Bold, 0,0170 × W | Tal como en el catálogo |
| Código | Gotham Rounded Book, 0,0142 × W | Debajo del nombre |

**Lado:** en blog el aro va a la izquierda y el texto a la derecha; en social, en espejo (aro a la
derecha, texto alineado a la derecha). El motor prueba también el lado contrario y lo penaliza
(`flipCost` 0,4).

**Tono** (blanco o ink): blanco cuando su contraste WCAG con el muro es **≥ 3:1**; si no, `ink`
`#2D2A26`. El compositor mide la luminancia media bajo la caja del marcador ya colocado.

- **Por qué 3:1 y no 4,5:1:** el nombre es Bold y grande; WCAG acepta 3:1 para texto grande, y Berel
  ya usa blanco sobre tonos medios (N46_SM_POST, sobre Bien y de Buenas).
- **Origen (2026-11-01):** comentario del operador sobre Bien y de Buenas `#B37A75`: «Acá no debería
  ir en blanco??». Medido: blanco 3,5:1, ink 4,0:1. Antes ganaba el de mayor contraste (ink); ahora
  gana el blanco siempre que alcance 3:1, como en las piezas de Berel.
- Un job puede forzar `tone`, pero no es la práctica: el motor decide.

## 2. Evolución: de anclas a grilla

Todas fueron decisiones del operador, en este orden:

1. **Anclado a la foto** con coordenadas `(u, v)` y anclas alternativas `alt` sobre el mismo muro.
   Reemplazado.
2. **Tono por contraste 3:1** (ver §1).
3. **Nunca cortado por el borde.** En la story del registro alto el marcador quedaba cortado: ahora
   debe caber entero o se descarta la celda.
4. **Nunca sobre objetos.** Cita: «Necesitamos reglas para que esto no se ponga sobre objetos así
   porque pierde limpieza y no se lee bien el texto» (casos estudio y lámpara).
5. **Aire.** Cita: «podías subirlo más porque tienes mucho muro, donde no se vea todo apretado sino
   que juegues con el aire con elegancia».
6. **Grilla por formato** (propuesta del operador, aceptada y construida el 2026-11-02): «armar una
   grilla para cada tipo de formato donde delimites espacios y longitud de texto».

Resultado: **el job no lleva coordenadas.** Solo declara qué color va; el motor prueba cada celda
y elige. Ningún agente escribe coordenadas.

## 3. La grilla por formato

| Formato | Margen | Celdas (col × fila) | Objetivo [x, y] | Ancho máx. del marcador | Otras reglas |
|---|---|---|---|---|---|
| blog 1408×768 | 84 px (6 %) | 12 × 12 | [0,5 · 0,24] tercio superior | 34 % del ancho | Nunca toca el borde |
| post 1080×1350 | 72 px | 6 × 20 | [0,5 · 0,42] bajo el titular | 62 % | Titular ≤ 14 palabras, ≤ 3 líneas; zona blanda sobre el titular |
| story 1080×1920 | 72 px | 6 × 24 | [0,5 · 0,40] bajo el titular | 62 % | Titular ≤ 14 palabras, ≤ 3 líneas; zonas seguras 250 arriba / 340 abajo |
| Pinterest 1000×1500 | 96 px | 6 × 20 | [0,5 · 0,25] tercio superior | 62 % | Sin titular |

**Zonas que no se tocan (`keepOut`):** caja real del titular (+10 px a los lados y arriba, +20 abajo,
con el **ancho real** del texto, no el ancho completo), píldora, logo (su caja + 10 px hasta el
borde inferior), tarjetas de paleta, zonas seguras de la story y cada marcador ya colocado (crecido
por el margen de aire). En post y story, además, la franja **sobre** el titular es zona **blanda**
(«la franja de la píldora, sobre el titular»): solo se libera en el segundo nivel.

## 4. Cuándo una celda es válida

Para cada celda, el motor centra el marcador en ella, en el lado de la familia y en el contrario.
La celda vale solo si cumple **todo** (`grids.shared`):

| Criterio | Regla | Por qué |
|---|---|---|
| Cabe entero | La caja queda dentro de los márgenes del formato | Un marcador cortado no se lee (story del registro alto) |
| Ancho | La caja no supera `markerMaxWidth × W` | Presupuesto de texto del formato |
| Separación | A ≥ 2,5 % del ancho (`gap`) de titular, píldora, logo y zonas seguras | Titular y marcador no se apilan |
| Muro de **su** color | ≥ 85 % de los píxeles bajo la caja (+ respiro de 2,5 %) a ΔE(a,b) ≤ 12 y ΔL ≤ 28 del HEX del catálogo, medido en 4 tramos verticales tomando el peor | El rótulo dice un color: debe estar sobre ese color. La luz cambia L, no el tono; por eso L tolera más |
| Sin objetos (`busy`) | Densidad de bordes ≤ 3 bajo la caja + respiro de 2,5 %, en 4 tramos tomando el peor | Un objeto delgado (el brazo de una lámpara) se diluye en el promedio de toda la caja; por tramos no |
| Aire (`air`) | Densidad de bordes en un margen de 6 % alrededor de la caja ≤ 3,5 | Elegancia: el marcador respira, no queda apretado entre objetos |

**Cómo se miden los bordes:** Laplaciano sobre la foto en grises tras un desenfoque σ = 1 (escalado
a 1408 px de ancho). El desenfoque borra el grano del muro (estuco, textura) y deja los bordes de
los objetos.

**Puntaje** entre las celdas válidas (gana el menor):

```text
puntaje = aire + 3 × |Δy al objetivo| + 1 × |Δx al objetivo| + 0,4 si invierte el lado
```

Las distancias van en fracciones del cuadro. El marcador busca el objetivo del formato (tercio
superior, nunca pegado al borde) y solo se aparta por falta de aire o por objetos.

## 5. Calibración (2026-11-02)

Densidad de bordes **con** desenfoque σ = 1 a 1408 px:

| Superficie | Densidad |
|---|---|
| Muro liso | 1,0 |
| Estuco | 1,4–2,2 |
| Lámpara | 5,0 |
| Cuadro | 10,2 |

**Sin desenfoque** el estuco daba 9,7 y se confundía con objetos (caso foto port-3): el umbral de 3
dejaba fuera muros válidos. Por eso la medición de celda siempre desenfoca primero.

El titular social usa otra medición, **sin** desenfoque (ver §8): muro limpio 1,5–4,4; ventanas o
lámpara 8,6–14. No mezcles las dos escalas.

## 6. Segundo nivel (con aviso)

Si ninguna celda pasa el primer nivel, el motor reintenta:

- libera la zona blanda (la franja de la píldora, sobre el titular), y
- acepta celdas apretadas con aire hasta 3,5 × 1,4 = 4,9.

`busy` (≤ 3 bajo el marcador) y el muro de su color **no se relajan**: el segundo nivel nunca pone
un marcador sobre objetos ni sobre otro color.

La pieza sale con `fallback` en el marcador y un aviso en `qa.warnings`:

| `fallback` | Qué significa | Qué hacer |
|---|---|---|
| `la franja de la píldora, sobre el titular` | Bajo el titular no hay muro libre; el marcador subió a la franja de la píldora | Mira la pieza: si se apila con la píldora o el titular, acorta el titular o cambia `photo.focal` |
| `apretado entre objetos (aire X > 3.5)` | El único muro libre está entre objetos | Mira la pieza: acepta el aviso solo si el marcador se lee limpio; si no, cambia el foco o el plate |

Aviso textual: «`«<nombre>» sin celda de primer nivel: <fallback>; revísalo o acorta el titular / cambia el foco`».

Resultado del lote de 40 piezas (10 espacios × 4 formatos, 2026-11-02): 37 en primer nivel; post del
estudio y post de la cocina en la franja de la píldora; story de la cocina apretada bajo la repisa.
Las tres con aviso.

## 7. Cuando no hay celda: el marcador se elimina

Si tampoco el segundo nivel encuentra celda, el marcador **no se dibuja**: se registra en
`qa.droppedMarkers` con su razón y un aviso «`«<nombre>» sin marcador: <razón>`». Nunca se rotula
un color que el muro no muestra.

| Razón (`why`) | Causa |
|---|---|
| el nombre no cabe en el presupuesto de ancho del formato (N %) | Solo fallaron celdas por ancho |
| el muro de ese color sólo aparece detrás o entre objetos, sin aire | Hubo muro del color, pero con objetos o sin aire |
| el muro de ese color no aparece libre en el cuadro | El muro no es de ese color (foto sin corregir, color equivocado o recorte) |
| no queda celda libre de título, logo o zonas seguras | Todo el muro libre está tomado por zonas que no se tocan |

## 8. `sample` y por qué `at`/`alt` fallan cerrado

- **`at`/`alt`** (coordenadas del sistema anterior) lanzan error: «el marcador ya no lleva
  coordenadas (at/alt); la grilla del formato elige la celda». Fallar cerrado evita que un job viejo
  o un agente reintroduzca posiciones a mano y salte las reglas de muro, objetos y aire.
- **`sample: [u, v]`** (0–1 sobre la foto recortada) solo se usa cuando la foto **no** está corregida
  al color del catálogo: el motor promedia un parche de radio ≈ 1 % del ancho en ese punto y mide el
  muro contra ese tono en lugar del HEX. Con un plate ya corregido (ΔE ≤ 3), no declares `sample`:
  el HEX del catálogo es la referencia correcta. Un `sample` fuera de la foto falla.
- El motor valida el par nombre+código contra el catálogo **antes** de buscar celda.

## 9. Titular social (post y story)

- Gotham Rounded Bold, tracking +1,2 %, con regla vertical de 3 px a la izquierda. Líneas
  balanceadas.
- Obligatorio en post y story, **≤ 14 palabras** y **≤ 3 líneas**. Si no cabe en 3 líneas, falla
  cerrado (caso: comedor, que ocupaba 4). Pinterest y blog no llevan titular: un `title` falla.
- **Tono por contraste:** el motor mide el contraste del blanco contra el fondo del bloque del
  titular; ≥ 3:1 → blanco; si no → ink (muros claros: Maíz, pasteles). Queda en `qa.titleTone`
  (`light` = blanco, `dark` = ink). La regla toma el mismo tono.
- **Fondo cargado:** el motor mide la densidad de bordes **sin desenfoque** bajo tres interlíneas del
  titular. Sobre 6 deja en `qa.titleBackground` el valor y el aviso «titular sobre fondo cargado
  (bordes X > 6): reserva el cuadrante superior izquierdo del plate o cambia el foco». Calibrado sobre
  24 piezas: muro limpio 1,5–4,4; ventanas o lámpara bajo el titular 8,6–14.
- Por eso el plate reserva el **cuadrante superior izquierdo** como muro liso (sin ventana, lámpara ni
  espejo): ver `photography.md`.
- El marcador va **bajo** el titular (objetivo 0,42 en post, 0,40 en story), nunca apilado con él.

## 10. Franjas: cada columna es su propia grilla

En `blog.franjas` cada columna busca su muro solo dentro de su franja: una columna, las filas de la
grilla del blog, margen 24 px, objetivo [0,5 · 0,30], lado del texto a la derecha. No se tocan la
banda de etiquetas (hasta 44 + 60 px desde arriba) ni la caja del logo. Un marcador por columna como
máximo, sobre el color de esa columna.

## 11. Errores corregidos en el camino

| Error | Corrección |
|---|---|
| Con filas gruesas (120 px) la cocina no tenía ninguna celda válida | Filas más finas: hoy 12, 20 o 24 según el formato (en blog, 600 px útiles / 12 = 50 px por fila) |
| Con un sesgo genérico «más arriba» todos los marcadores se pegaban al borde superior | Objetivo explícito por formato (tercio superior o bajo el titular), con margen |
| El `keepOut` del titular era de ancho completo y bloqueaba muro libre a la derecha | Usa el ancho real del titular |
| Sin desenfoque el estuco (9,7) se confundía con objetos | Desenfoque σ = 1 antes de medir bordes |
| Marcador cortado por el borde en la story | Debe caber entero en los márgenes o la celda se descarta |

Las pruebas que fijan este comportamiento (`compose.test.mjs`): objetivo en muro liso, rechazo de
`at`, eliminación sin muro del color y uso de `sample`, tono automático, respeto de titular y zonas
seguras en la story, salto de la repisa con objetos y segundo nivel en la franja de la píldora.
