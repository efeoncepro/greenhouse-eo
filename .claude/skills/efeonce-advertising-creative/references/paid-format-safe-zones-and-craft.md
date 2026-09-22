# Formatos de pauta: safe zones, cursores y las trampas medidas

> **as-of 2026-09-22** · evidencia de composición local; separar mediciones, decisiones editoriales y especificaciones de plataforma. Caduca 2027-03.
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

## 2. 🔴 En 9:16 para pauta, la firma NO va al pie — y el plate tiene que nacer sabiéndolo

**Medido:** la firma al pie cae entre el **75% y el 96%** del alto. Eso está dentro de la zona de UI **en los
tres criterios**, incluido el más permisivo:

| Criterio | La UI empieza en | Firma al pie |
|---|---|---|
| Stories orgánico (~250 px de 1920) | 87% | 🔴 dentro |
| Guardrail de Meta para ads en Stories/Reels | **65%** | 🔴 dentro |
| Reels con disclaimer | 60% | 🔴 dentro |

En Reels esa zona lleva caption, audio y botones: la firma queda tapada.

### El error de planteamiento, y la salida

Durante un rato intenté **mover la firma sobre un plate que no la previó**, y por eso sólo había malas
opciones: al pie se tapa, arriba cae sobre el sujeto iluminado y baja a **1,2–2,0:1**.

🎯 **El plate tiene que nacer con su banda de firma dentro de la zona segura.** El comando reserva un lecho
—reserva 3— pero **lo pone en el 22% inferior**, que es correcto para 4:5 y equivocado para 9:16.

✅ **Receta para 9:16 de pauta** *(tres pasadas, USD 0,15; no afecta a 4:5 ni 16:9)*:

1. **En la ficha**, agregar a la escena una banda de firma explícita:
   > *a horizontal band running the FULL width of the frame between 54% and 66% of the frame height is
   > completely EMPTY, unlit and evenly dark — no object, no edge, no highlight and no part of the subject
   > enters it… Everything sits either ABOVE or BELOW that band.*
2. ⚠️ **No confiar en que el modelo la respete: medirla.** En la primera pasada el monitor y el sujeto la
   cruzaron igual. **Medir el fondo en el ANCHO REAL de la firma** (0,2 del lado menor, centrada) barriendo
   alturas.
   🔴 **Pero NO elegir por contraste solo — el máximo está a media altura y ahí la firma NO es una firma.**
   Rechazado por el operador: con `y = 0,42–0,52` el contraste era el mejor del barrido (17,9–19,9) **y la
   pieza se veía mal**: una firma flotando en el centro de la foto es un objeto suelto, no una firma.
   ✅ **La firma va ABAJO. Se elige la altura MÁS BAJA que aún pase el umbral**, no la de mejor número:
   **`y = 0,82`**, que la hace terminar hacia el **85%** — por encima de la barra de mensaje de Stories (87%).
   Contraste 17,9 · 8,9 · 11,8. *Optimizar la métrica en vez de mirar la pieza es el mismo error que produce
   copy que aprueba el checklist y no detiene a nadie.*
3. **Forzar `logo.variant: "negative"`.** En `auto` el compositor eligió navy y el contraste se desplomó a
   **1,2:1** sobre la misma banda oscura donde el blanco daba 19,9.
4. `componer-cta-safe.mjs` agrega **`logo.y`** (fracción del alto, retrocompatible) para poder ubicarla.

**Resultado:** texto desde **16,5%**, firma en **82–85%**, y la barra de mensaje de Stories libre.

⚠️ **Limitación declarada:** el guardrail de Meta para ads en **Reels** reserva hasta el **65%**, así que con
caption largo la firma puede solaparse. Subirla ahí rompe la composición, y ese guardrail existe sobre todo
para **elementos críticos** —titular y CTA—, que sí quedan fuera. La firma es identidad, no información
accionable. **Declararlo, no esconderlo.**

⚠️ **Y la trampa de medición que costó dos rondas:** midiendo «firma blanca vs fondo» a mano daban 4,9 · 9,1 ·
4,7 y parecía que pasaba; el compositor mide **la firma real**, que en `auto` es navy. **Medir el elemento que
se va a dibujar, no una idealización — y en el ancho que va a ocupar, no en una franja cualquiera.**

## 2b. Apéndice — la versión anterior de esta sección, y por qué estaba mal

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

## 5. ✅ El CTA se compone con el comando canónico *(resuelto 2026-09-22)*

```bash
pnpm foto:componer:cta <plan.json>   # compone
pnpm foto:cta:gate     <plan.json>   # verifica los mínimos — van en pareja y en ese orden
```

🔴 **NO copiar el compositor a la carpeta de corrida.** Vivía duplicado en **cinco** copias ya divergentes, y
dos mejoras reales estaban en copias distintas, así que ninguna corrida las tenía juntas. Canon:
[`EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md`](../../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md).

### Lo que el gate arregló, y por qué era invisible

En variante `solid` el compositor marcaba `skipContrast` y **la clave `contraste.cta` nunca se escribía**:

> **El QA salía limpio porque el dato NO EXISTÍA, no porque hubiera pasado.**

⚠️ `skipContrast` estaba bien puesto —medir la tinta contra la escena bajo un relleno opaco no significa
nada— pero saltar el bloque entero se llevó **la medición que sí hacía falta y nadie hacía: el relleno contra
la escena**, la que decide si el botón se despega del plate.

Ahora `solid` emite **`contraste.cta`** (tinta/relleno, ≥4,5:1) **y**
**`contraste.cta_superficie_vs_escena`** (medido sobre el píxel, ≥3:1). Y **el gate EXIGE la clave**: si
falta, falla. *Un gate que sólo valida lo presente no detecta una ausencia — y la ausencia era el bug.*

## 5b. Un beneficio por pieza — no se reutiliza entre piezas

El grupo `beneficio → CTA → descriptor` **cambia en cada pieza**. Reutilizar el mismo beneficio en dos
ejecuciones distintas diluye el «un CEP por ejecución» de Romaniuk, que es la regla más accionable del B2B:
*«a single, clear message is more easily remembered… focus on one CEP per execution»*.

Caso observado: dos piezas del mismo set llevaban «Descubre qué dice de tu marca» como beneficio. Cada una
ataca un momento de compra distinto, así que el puente al servicio también tiene que ser distinto:
`«Descubre qué dice de tu marca»` · `«Mira con qué te describe»` · `«Mira qué responde por tu categoría»`.

## 5c. Apéndice — cómo se veía el hueco antes de arreglarlo

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

## Aplicación SEO/AEO Codex v06: la firma cierra al pie

El operador rechazó la v05 con firma al 63% por quedar casi al centro. La v06 sigue la referencia visual de Claude: centro al 83,3%, lecho físico y contraste ≥4,5:1. Texto, CTA y cursor conservan ventana interna x=8–88%, y=16–65%. La firma editorial se evalúa por separado y queda fuera del guardrail inferior conservador de Reels; declarar el posible solapamiento y verificar el placement antes de pautar. **No elevar la firma al centro para optimizar un gate ni etiquetar toda la pieza como segura para Reels.** Canon y evidencia: [Tres voces + acción](../../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md#zonas-seguras-placement-y-promoción-a-finales--2026-09-22).

## Lecho y compositor: revisión posterior de la misma sesión

Bajar la firma sin reducir un lecho que ocupa casi media foto no corrige la composición: el operador rechazó los verticales v06 por ese motivo. Editar el primer plano físico y recuperar la escena. En la corrección se buscó el quinto inferior, no una nueva reserva obligatoria global.

El comando consolidado es la ruta para trabajo nuevo, pero no todo plan histórico es compatible: `centerX` se ignora y `logo.y` significa borde superior. Su gate tampoco detecta QA vacío/ajeno/duplicado y su contraste de fondo usa p98. [Auditoría ejecutada](../../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md#7-auditoría-de-compatibilidad-y-alcance--22092026); [método integral](../../../../docs/operations/social/2026-09-22-seo-aeo-paid-media-production-method.md). No atribuir a la documentación una corrección de código que no ocurrió.

**Corrección del operador, misma sesión:** además de reducir el lecho, la firma debe estar DENTRO de su materia desenfocada, separada del borde de transición. No trasladar el Y de Claude o de v06 a otra foto. Si el logo queda encima del lecho, es REWORK aunque contraste y bounds den PASS. V07 usa centro 90% después de esa revisión; es caso, no token.
