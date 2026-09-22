# Formatos de pauta: safe zones, cursores y las trampas medidas

> **as-of 2026-09-22** · todo lo de acá está **medido en producción**, no inferido. Caduca 2027-03.
> Hermanos: [evidencia](ad-creative-evidence-2026.md) (qué está medido) ·
> [playbook](paid-visual-attention-playbook.md) (cómo se produce y se mide) ·
> [Tres voces + acción](../../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) (el CTA).

## 1. 🔴 La reserva del comando NO es la safe zone de la plataforma

Son dos cosas distintas y hay que cumplir **las dos**. `foto:prompt` reserva espacio **en la fotografía**
para que quepa el texto; la plataforma reserva espacio **en la pantalla** para su propia interfaz.

| Formato | Reserva que inyecta el comando | Safe zone de plataforma | Dónde arranca el texto en realidad |
|---|---|---|---|
| 4:5 | top 30% libre | — | 7% |
| **9:16** | banda **10–32%** | 🔴 **14% superior** (avatar y nombre de cuenta) · **20% inferior** en Stories, hasta **35%** en Reels · ~6% a cada lado | **16,5%** |
| 16:9 | 42% izquierdo, sujeto en el 55% derecho | — | 10% |

🎯 **En 9:16 obedecer sólo al comando pone el titular debajo del nombre de la cuenta.** La banda del comando
empieza en 10%; la UI ocupa hasta el 14%. **Manda la más restrictiva.**

## 2. La firma al pie es un trade-off declarado, no un descuido

Subir la firma fuera de la safe zone **inferior** la deja sobre el sujeto iluminado, y ahí su contraste cae a
**1,2–1,5:1** — ilegible siempre. Al pie mide **14–20:1**.

**Medición por pieza** *(firma vs fondo, por altura, en tres plates 9:16)*: las posiciones «seguras» daban
1,4 · 3,5 · 1,5, y el pie daba 19,3 · 19,1 · 14,4.

✅ **Decisión: el texto y el CTA respetan la safe zone —son lo crítico— y la firma se queda al pie**,
aceptando que la UI de Stories/Reels pueda solaparla en parte. Una firma parcialmente tapada pesa menos que
una ilegible en todas partes. **Declararlo en el registro de la pieza.**

⚠️ **Y una trampa de medición:** midiendo a mano «firma blanca vs fondo» daban 4,9 · 9,1 · 4,7 — parecía que
pasaba. El compositor mide **la firma real**, que en `variant: auto` elige **navy sobre fondo claro**, y ahí
se desploma. **Medir el elemento que se va a dibujar, no una idealización del mismo.**

## 3. En 16:9 el cursor no cabe

El bloque de texto vive en el 42% izquierdo y es angosto: **cualquier** cursor cae sobre el final del cierre
y lo tacha. Medido con escala 1,6 (tachaba media palabra) y con 0,9 (seguía tocando la última letra).

🔴 **Y no se puede resolver dejando `cursors: []`**: el contrato AXIS responde `cursor-required`.

✅ **La salida: cursor local a 0,9 + cierre corto.** En 16:9 el cierre pasa de la frase completa a
`«Pide el diagnóstico.»`. En display el copy largo no se lee igual, así que no se pierde nada.
⚠️ **`end-top` no es un anchor válido.** Probados y aceptados: **`end-center`** y **`bottom-end`**; cualquier
otro aborta con `cursor-anchor-invalid`.

## 4. La vista del personaje se ignora en silencio si va en la raíz

```jsonc
"objetos": [{"objeto": "gigi", "vista": "megafono"}]   // ✅
"vista": "megafono"                                     // 🔴 se IGNORA, sin aviso
```
Puesta en la raíz de la ficha, el comando resuelve la **pose por defecto** y no dice nada. Iba a generar a
Gigi en pose héroe en lugar de con megáfono, y sólo se habría visto en la salida.
✅ **Verificar la ruta `--image` que imprime el comando antes de gastar.**

## 5. El CTA sólido no reporta su contraste

`componer-cta.mjs` marca `skipContrast` en variante `solid` y **la clave `contraste.cta` nunca se escribe** —
el QA sale limpio porque el dato no existe, no porque haya pasado. El valor teórico sí se computa como
`solidTextContrast` en el `*-cta-evidence.json`, **con otro nombre y en otro archivo**.

⚠️ **Y eso tapa un segundo hueco:** `skipContrast` está bien puesto —medir tinta contra la escena bajo un
relleno opaco da un número sin sentido— pero al saltar el bloque entero se perdió **relleno contra escena**,
que es la medición que decide si el botón se despega del plate. Es justo lo que falla al elegir `solid` sobre
un plate claro.

✅ **Hasta que el script lo emita, medir a mano las dos:** tinta/relleno (teórico basta, el relleno es plano)
y **relleno/escena sobre el píxel con mínimo local**. En `03` dieron **10,81:1** y **10,08:1**.

## 6. 🎯 La metáfora entra POR el objeto del oficio, no al lado de él

Una rueda de prensa con un muñeco capta atención — pero **no dice de qué categoría hablamos**, y sólo el
**19%** de los avisos B2B se recuerda *y* se atribuye bien. **Atención sin atribución es gasto.**

**Por eso el atril no está junto a una pantalla: el atril ES la barra de búsqueda.** Un solo objeto carga la
autoridad usurpada *y* la categoría.

✅ **Prueba:** quítale el objeto del oficio a la escena. **Si sigue funcionando igual, estaba al lado, no
adentro** — y hay que rehacerla.

Es gemela de la regla de luz del registro C: *la luz digital entra por el objeto, nunca por el fondo*.

## 7. Una voz, una función — el CTA no repite el cierre

Al aplicar «Tres voces + acción» sobre piezas que ya tenían el puntero al servicio en el cierre,
**«Pide el diagnóstico» apareció dos veces**. La regla dice que el descriptor no repite el botón; el cierre
tampoco.

```
Entrada    monta la situación
DOMINANTE  el golpe (1-3 palabras, ≥3× la entrada)
Cierre     REMATA el concepto            ← no vende
Beneficio  hace el puente al servicio    ← no acciona
CTA        acciona                       ← no explica
Descriptor identifica la oferta          ← no repite el botón
```
