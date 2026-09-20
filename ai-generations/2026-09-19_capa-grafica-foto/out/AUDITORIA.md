# Auditoría editorial de las 75 piezas

Protocolo: `typography-design` + overlay Greenhouse + `editorial-typography-brand-audit` §1–§7, con el
contrato `axisAdvertising` leído en vivo. **Medido** = número del instrumento. **Observado** = mi revisión
visual sobre el archivo final y su reducción. **Hipótesis** = criterio mío, pendiente de tu juicio.

Estado global **medido**: 63 de 75 pasan todas sus puertas (contraste por capa, acentos aparte, campo libre
bajo una voz secundaria, colisión de tinta entre capas, separación entre voces vecinas, evidencia del contrato
de selección, canon de Guttery).

---

## 1. El hallazgo transversal: la firma es un segundo foco en las 75

**Medido.** La firma está aislada del bloque de texto en **75 de 75** piezas. Distancia mediana **0.67 del
alto** (rango 0.37–0.74). Ancho **0.15** en todas. El caso de referencia «¿Claude o Codex?» usa **0.26** — un
73 % más grande.

**Observado.** Cada pieza tiene dos focos separados por dos tercios de lienzo vacío: el bloque arriba y un
punto blanco chico abajo. En «¿Claude o Codex?» eso no molesta porque el sujeto está centrado y el logo es
grande: el eje vertical los cose. En las piezas de sujeto descentrado —la panadería, el equipo— la firma queda
suelta y compite en vez de cerrar.

El protocolo §2.3 lo anticipa y descarta la salida fácil: bajar opacidad «no cambia su distancia al bloque ni
su papel compositivo». Las dos salidas reales son **agrupar la firma con el titular** o **subir su escala**
para que cierre un eje que la foto ya tenga. **No lo resolví**: es la decisión abierta más importante.

## 2. Lo que la auditoría confirmó como sano

**Medido.** Alineación óptica: 0 px de desviación en todas las voces que comparten eje de anclaje — el motor
alinea por borde de tinta, no por caja. Donde el número es `n/a` las voces no comparten eje por diseño
(titular centrado + gesto al costado), que el protocolo §3 permite si se declara.

**Medido.** Gaps de tinta entre voces: 0.22×–0.92× el tamaño de la voz que sigue, con un solo caso fuera de
rango (`V10`, 3.07× — y esa pieza ya falla por otra razón). Los gaps negativos de la familia `G` son
intencionales: el gesto comparte línea óptica con la última línea del titular, y el detector de colisión
confirma que **no hay tinta montada**.

**Medido.** Ejes variables: Bricolage `wght 780 · wdth 96 · opsz 88` con tracking −0.035 em y leading 0.9,
dentro de los rangos de campaña para ≥80 px. Una sola desviación declarada frente a la receta: la cita usa
Poppins 500 donde `structureTagline` pide 400 — la misma desviación que trae el caso aprobado, ahora dicha.

---

## 3. Veredicto por familia

### Una sola voz (V01, V09, V16, V23, V24, V39, V41, V40, V52)

| Pieza | Veredicto | Razón |
|---|---|---|
| `V39-45-escala-extrema` | **PASS alto** | «Se nota.» a 225 px. Masa máxima, una idea, cero aparato |
| `V40-916-dos-lineas` | **PASS alto** | Apilado con sangría propia, 142 px |
| `V41-169-dos-lineas` | **PASS alto** | El apilado en horizontal, 176 px |
| `V52-916-enfasis-dos-lineas` | **PASS alto** | El apilado + caja sobre «decide» |
| `V24-45-peso-condensado` | **PASS** | Ancho 78: 139 px contra 108 del mismo copy |
| `V01`, `V09`, `V16` | **PASS bajo** | Correctas y sin defecto medido. Observado: no pasa nada en ellas |
| `V23-45-peso-short` | **DON'T** | ideaShort 740 es indistinguible de ideaImpact 780. 40 puntos no son contraste |
| `V43-916-titular-rot4` | **DON'T** | Observado: −4° no se lee como intención, se lee como error de montaje |
| `V44-45-titular-vertical` | **PASS con reserva** | Pasa 11.08:1 y es llamativa. Observado: compite con el sujeto |

### Caja de énfasis sobre una palabra (V45–V58, V61–V64)

Es la familia que responde a tu directiva y la que mejor funciona en conjunto.

| Pieza | Veredicto | Razón |
|---|---|---|
| `V61-45-brackets` | **PASS alto** | `open-brackets` es la variante correcta para texto: enfatiza sin leerse como UI |
| `V64-169-brackets-moving` | **PASS alto** | Brackets + standalone; el más limpio del horizontal |
| `V63-916-brackets-colab` | **PASS alto** | Brackets + un colaborador |
| `V47-45-enfasis-escala` | **PASS alto** | «Se [nota]» + Nexa entrando por la izquierda |
| `V48-45-enfasis-2colab` | **PASS** | Los dos cursores convergen sobre «obra»: eso es guiar la vista |
| `V58-169-enfasis-doble` | **PASS** | Caja + color en la misma palabra. Observado: suma, no compite |
| `V62-45-four-corners` | **PASS bajo** | Correcto, pero entre brackets y ocho tiradores no aporta un tercer registro |
| `V45`, `V46`, `V50`, `V51`, `V54`, `V55`, `V56` | **PASS** | Sanas; se solapan entre sí en función |

### Caja sobre un objeto de la foto (V29–V34, V42)

| Pieza | Veredicto | Razón |
|---|---|---|
| `V31-45-caja-objeto-clawd` | **PASS alto** | Enmarca la herramienta elegida. El propósito más nítido de las 75 |
| `V34-169-caja-objeto` | **PASS alto** | Mismo principio en horizontal |
| `V30-45-caja-objeto-aprueba` | **PASS** | Cliente en lima aprobando la obra: el color es el rol |
| `V29-45-caja-objeto-obra` | **PASS** | Igual sin el gesto; `V30` la contiene |
| `V33-916-caja-objeto` | **PASS bajo** | Observado: la franja de pruebas es delgada y la caja se lee como un rectángulo |
| `V32-45-caja-objeto-masas` | **DON'T** | Observado: enmarca sin decir nada. No todo objeto es «un objeto con sentido» |
| `V42-45-todo-junto` | **PASS bajo** | Prueba que el sistema aguanta apilar recursos; ninguna capa manda |

### Gesto Guttery (V03, V13, V21, V25–V28, V38, V49, V53, V59, V60, G1–G11)

**Medido.** El principio del hueco es el que funciona: gesto a **0.52–0.55× el titular**, encajado donde la
bandera del titular deja espacio, a la altura óptica de la última línea, con tinta propia.

| Pieza | Veredicto | Razón |
|---|---|---|
| `G6-45-dos-lineas-hueco` | **PASS alto** | El principio, en 4:5 |
| `G9-916-hueco` · `G10-169-hueco` | **PASS alto** | El mismo principio en vertical y horizontal |
| `G11-45-hueco-caja` | **PASS alto** | Hueco + caja de énfasis conviviendo |
| `V59-45-guttery-claro-navy` | **PASS** | Demuestra que la tinta blanca era observación del campo oscuro, no regla |
| `G1-costado-chico` | **DON'T (referencia)** | El error que señalaste, conservado como contraejemplo |
| `V03`, `V13`, `V21`, `V25`, `V27`, `V28`, `V49`, `V53` | **REWORK** | Observado: gesto a 0.22–0.33× y colgado al costado. Son la versión vieja del mismo error |
| `G2`, `G3`, `G4`, `G5` | **DON'T** | Medido: G2 y G3 montan tinta (20 % y 6 %); G4 y G5 caen a 4.40 y 4.42:1 |
| `V26`, `V60` | **DON'T** | Medido: lima 3.27:1 y naranja-sobre-claro 3.92:1. El campo no los sostiene |
| `V38`, `V57` | **REWORK** | Medido: gesto 4.05 y 4.40:1 |

### Fallos estructurales, no ajustables (V10, V12, V14, V20, V35)

| Pieza | Medido | Qué enseña |
|---|---|---|
| `V10-916-tres-voces` | cita: campo debajo 1.24:1 | La cita Poppins **necesita un plate con campo profundo al margen**; ninguno lo tiene |
| `V12-916-caja-2colab` | ninguna de 72 combinaciones de ancla cabe | 9:16 a 1088 de ancho **no aloja dos colaboradores** |
| `V14`, `V20` | titular 2.64 y 2.45:1 | Los plates claros se tomaron para un titular a sangre, no centrado |
| `V35-45-acento-azul` | acento 4.01:1 | Sobre campo cálido, **ninguna tinta de color** llega al piso |

---

## 4. Lo que la auditoría destapó de mi propio instrumento

Dos de las tres métricas nuevas medían mal y se corrigieron **antes** de leer nada: el gap de tinta comparaba
contra la caja unión (un titular de dos líneas incluye el hueco → gaps negativos falsos) y la alineación
óptica suponía anclaje izquierdo en voces centradas → desviaciones de 200–580 px inventadas. Con el
instrumento arreglado esos números desaparecen. Lo dejo escrito porque es el tipo de error que hace parecer
sólida una auditoría que no lo es.

## 5. Lo que queda abierto

1. **La firma como segundo foco** (§1). La decisión es tuya: agruparla con el titular, o subir su escala.
2. **Los plates.** Tres límites medidos vienen de la toma, no de la capa gráfica: campo profundo al margen para
   la cita, ancho para dos colaboradores en 9:16, y campo claro pensado para titular centrado.
3. **El acento de color sobre campo cálido.** Hoy no hay tinta de la paleta que pase ahí. O se acepta que esas
   piezas van sin acento cromático, o el plate se pide con una zona más oscura.

## Estado

Producidas, medidas y auditadas. **No aprobadas, no programadas, no publicadas.**
