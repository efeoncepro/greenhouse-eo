# Formatos de pauta: safe zones, cursores y las trampas medidas

> **as-of 2026-09-22** (zona segura de AXIS y firma del gate, §1 y §2c: **2026-09-23**; horizontal 1,91:1 por expansión, §0c: **2026-10-02**) · evidencia de composición local; separar mediciones, decisiones editoriales y especificaciones de plataforma. Caduca 2027-03.
> Hermanos: [evidencia](ad-creative-evidence-2026.md) (qué está medido) ·
> [playbook](paid-visual-attention-playbook.md) (cómo se produce y se mide) ·
> [Tres voces + acción](../../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) (el CTA) ·
> [compositor de CTA](../../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) (el contrato del gate) ·
> [brief y QA](creative-brief-and-qa.md#gate-del-compositor-de-cta) (qué certifica el gate y qué se mira a ojo).

## 0. 🔴 Un ad nace multiformato: se diseña para el formato más estrecho desde la ficha *(operador, 2026-10-02)*

> «Al producir ads hay que pensar desde el inicio que la pieza de forma nativa pueda servir para todos los formatos
> para evitar esto.» — operador, al cerrar las adaptaciones de CMP-004.

**Qué pasó [medido, CMP-004, 11 piezas × 4 formatos]:** los 4:5 se aprobaron primero y las adaptaciones se
plantearon después. Regenerar cada escena por formato desde su ficha costó ~60 generaciones y aun así:

| Formato | Resultado | Por qué |
|---|---|---|
| 9:16 | 11/11 certificadas | La escena 4:5 (cielo arriba, escena al medio, lecho abajo) traslada casi igual. |
| 1:1 | 9/11 | El bloque completo (pregunta, respuesta, bajada de 2–3 líneas, CTA, descriptor) al tamaño mínimo legible ocupa **~35 % del alto**. El modelo **no respeta las alturas pedidas**: sube cabezas y pantallas hasta el 26–38 % aun pidiéndolas bajo el 56–60 %. Las dos piezas de **Nexa** (cine con identidad) no entraron. |
| 1,91:1 | 0/11 regenerando · **11/11 por expansión (§0c)** | A 390 px de teléfono el piso exige voces de **47 px** y CTA de **58 px** sobre 2048 de ancho: el bloque pide **~46 % del ancho y ~75 % del alto**. Las escenas regeneradas invaden la mitad izquierda aun con límite explícito al 52–56 %. Se resolvió expandiendo la escena 1:1 aprobada y llevando la bajada al titular del anuncio (§0c). |

**La regla:**

1. **Antes de la primera ficha, fija los formatos de la pieza** y el **presupuesto de texto del más estrecho**. El 1:1
   y el horizontal mandan sobre el 4:5, no al revés. Si va a haber horizontal, el copy de la imagen se diseña para
   caber ahí; la bajada larga puede vivir en el titular del anuncio y no en la imagen.
2. **Una escena, una geometría que sirva a todos:** sujeto **compacto** y **bajo** (cabeza bajo el 50 % del alto),
   aire calmo continuo arriba **y** a un costado, lecho oscuro al pie, elementos de luz que no suban. Un grupo de
   cuatro personas o un muro LED de lado a lado no cabe en 1:1 ni en horizontal: se decide en la idea.
3. **El piloto se prueba en los formatos antes de aprobar el 4:5:** componer el piloto también en 1:1 y en el
   horizontal (y pasar `foto:cta:gate`) es más barato que descubrirlo con la pieza aprobada.
4. **Proporciones de pauta verificadas (2026-10-02; Meta Ads Guide y ayuda de LinkedIn):**

| Proporción · tamaño | Ubicaciones |
|---|---|
| 4:5 · 1440×1800 | feed FB/IG, Explorar IG, LinkedIn móvil (LinkedIn no lo muestra en escritorio) |
| 9:16 · 1440×2560 | Stories y Reels FB/IG, Messenger · zona segura **14 % arriba, 35 % abajo, 6 % lados** (40 % abajo con texto legal) |
| 1:1 · 1440×1440 (LinkedIn 1200×1200) | Marketplace, columna derecha FB, **LinkedIn escritorio y móvil** |
| **1,91:1** · LinkedIn 1200×628 | imagen horizontal: columna derecha y búsqueda FB, LinkedIn. **16:9 es sólo la recomendada de video in-stream** |

   LinkedIn: máximo **5 MB** por imagen. Meta genera sola la variante que falte (relleno, expansión o recorte con
   IA): entregar 4:5 + 9:16 + 1:1 cubre la pauta; el horizontal es opcional. Si se entrega, se hace con el método de
   §0c (CMP-004 cerró 44 piezas: 11 conceptos × 4:5, 9:16, 1:1 y 1,91:1).
5. **Tamaño exacto:** `foto:generar` produce el 9:16 a **1024×1792 = 4:7** (1,6 % fuera; Meta tolera 1 %). Recorta el
   plate a **1008×1792** antes de componer y entrega con `final: [1440, 2560]` (el gate certifica al tamaño de
   entrega). 1:1 → `final: [1440, 1440]`; 4:5 → `final: [1440, 1800]`. El 1,91:1 existe en `foto:prompt` desde el
   2026-10-02 (`2048×1072`), pero esa fila es para generar **de cero**, y de cero el modelo centra al sujeto: la
   horizontal de una pieza aprobada se hace **por expansión de la escena 1:1** (§0c).
6. **Herramientas de la corrida** (copiar, no reinventar): `ai-generations/2026-10-02_cmp004-cine-nativo/formatos/`
   — `armar-fichas.py` (reubica la geometría vertical de una ficha aprobada por formato), `probar-variantes.sh` y
   `certificar-variantes.sh` (compone y certifica cada variante de plate y deja la primera que pasa),
   `composicion/armar-plan.py` + `formatos.json` + `ajustes.json` (el layout por formato y los ajustes por pieza a la
   vista).

## 0b. 🔴 Adaptar sin perder la pieza: patrones medidos y método nativo *(operador, 2026-10-02)*

> «Mientras armamos las referencias del casting, piensa si vas a adaptar la misma escena […] tal vez al referenciar
> la misma imagen pierde la épica y calidad de la primera aprobada.» — operador, CMP-004.

**Qué aprobó y qué descartó el operador [medido, CMP-004, 11 piezas × 3 formatos]:**

| Resultado | Casos | Por qué |
|---|---|---|
| ✅ Aprobada aunque cambió la persona | S07 y BF3 (grupos), S02 (de espalda, escena similar), S04, S05 | «No veo defectos anatómicos y estructurales y mantiene la esencia»: la persona es parte del oficio, no el retrato. |
| ⚠️ Aprobada de momento | S06 en 9:16 y 1:1 | Perdió la colorimetría cine del 4:5 (muro frío + una sola pieza cálida): el modelo repartió la luz de otra manera. |
| ❌ Descartada | S03 9:16 · S03 1:1 | La cara ES la pieza (retrato a cámara): sin ancla de identidad envejeció o cambió. La ficha pedía «líneas en los ojos y canas» y el modelo lo exageró. |
| ❌ Descartada | S01 1:1 | Se rompió la relación que dice la idea (cinta sobre el logo de una pantalla + pincelada proyectada): quedó un gesto sobre una pantalla apagada. |
| ❌ No producible | S08 y BF1 en 1:1 (Nexa) · los 1,91:1 regenerados | El texto completo legible no cabe sin achicar o tapar al sujeto. Los 1,91:1 se resolvieron después por expansión (§0c, 11/11 aprobados). |

**Patrones:**

1. **El cambio de personaje sólo reprueba cuando la cara es la protagonista.** En grupo, de espalda o en acción, se
   acepta si la esencia y la anatomía están bien. En retrato a cámara, la identidad es la pieza.
2. **La idea vive en la RELACIÓN entre elementos, no en los elementos sueltos.** Regenerar conserva los objetos y
   pierde su relación (la cinta ya no tapa un logo encendido; la pincelada ya no cae sobre ella).
3. **El 1:1 concentra las fallas** porque el bloque de texto empuja al sujeto: el sujeto se achica, la cara pierde
   píxeles y aparece el estrabismo.
4. **El modelo no respeta alturas con encuadres cerrados:** pedir «cara grande» y «cabeza al 46 %» a la vez da cabeza
   al ~30 % (medido en 8 de 8 pasadas). Pedir «sujeto en la mitad derecha» tampoco se cumple con un sujeto solo.
5. **La colorimetría no viaja sola:** si no se declara la gradación del aprobado, cada formato la reinventa.
6. **Elegir variantes por el gate es insuficiente:** el gate no ve ojos, identidad ni idea.

**Método nativo (aplicado a S01 1:1 y S03 9:16/1:1, certificado):**

1. **Ficha de esencia** antes de adaptar: la idea en una frase y la relación de elementos que la sostiene, escrita
   como obligatoria en la escena; la gradación de color del aprobado, explícita.
2. **Casting de campaña** si una persona protagonista va a reaparecer (otros formatos u otros contextos): set de rostro
   frente y tres cuartos creado por **edición** desde la pieza aprobada (luz neutra, fondo gris, sin escena), declarado
   en `casting` de la ficha y pedido en `identidad` (`foto:prompt`, desde 2026-10-02). La edad sale del casting: nunca
   «líneas» ni «canas» en la escena. Se arma **al hacer el casting de la pieza**, no después de que algo falle.
3. **Escena escrita para el formato**, con la cara a resolución suficiente: un 1:1 con sujeto de cuerpo medio se
   genera a **2048×2048** (`foto:generar --size 2048x2048`) y se compone a 1440.
4. **Si el sujeto quedó alto, zoom out por expansión** en vez de otra pasada: `pnpm foto:expandir <plate> <salida>
   <escala> "<qué hay alrededor>" [abajo]` achica la escena, el modelo SÓLO rellena muro o cielo y el lecho de la firma,
   y los píxeles originales se reponen encima. La persona no se regenera. Medido: cabeza de 0,30 → 0,46 del alto con
   escala 0,72 y `abajo` 0,08, sin costura visible.
5. **QA antes del gate:** caras al 100 % contra el casting (ojos simétricos, misma edad), la idea leída en dos segundos
   y la gradación contra el aprobado. Después, `foto:cta:gate --reproducir`.

## 0c. 🔴 La horizontal 1,91:1 nace de la escena 1:1 aprobada *(operador, 2026-10-02)*

**Qué pasó [medido, CMP-004, 11 piezas: S01–S08, BF1–BF3]:** las 11 horizontales (LinkedIn 1200×628 y Meta
horizontal) quedaron aprobadas por el operador en el canvas y certificadas con
`pnpm foto:cta:gate piezas-191.json --reproducir` (exit 0). Se entregan a **2048×1072** (2,3–2,9 MB, bajo los 5 MB de
LinkedIn).

**Método (canon):** la horizontal **no se genera de cero**: se parte de la escena 1:1 aprobada, apoyada a la derecha al
**80 % del alto** (escala 0,8, lecho abajo 0,04) en un lienzo 2048×1072, y el modelo extiende sólo la columna de
texto a la izquierda:

```bash
pnpm foto:expandir <plate-1x1> <salida> 0.8 "<el mismo fondo continúa oscuro y calmo, el lecho continúa, sin luces ni objetos brillantes ni pantallas>" 0.04 --lienzo 2048x1072 --ancla derecha --fundido 120 --reponer no
```

**Lecciones medidas:**

1. **De cero, el modelo centra al sujeto:** en el intento anterior 10 de 11 chocaban con el texto.
2. **Reponer el original encima de la extensión deja un recuadro visible** (cambio de tono y objetos cortados en el
   borde). Con `--reponer no` la salida del modelo queda sin costura y conserva a la persona (cara de S04 comparada al
   100 % contra la aprobada: misma persona). Por eso **exige revisar caras**.
3. **La pista importa:** con la pista desenfocada del plate el modelo rellenaba más oscuro sin continuar el lecho; con
   la pista que estira los bordes reales (extend `copy` + blur 24) continúa lecho y luz.
4. **80 %, no 86 %:** con la escena al 86 % los elementos del borde (soportes, estelas, muros de piezas) quedaban bajo
   el CTA; al 80 % hay muro limpio. Si el borde de la escena trae luces (BF3, muro de piezas naranjas), pedir
   explícitamente que el muro **termine donde termina la foto** (en BF3 se usó 0,76).
5. **El titular crece hasta llenar la columna:** `dominantMax` se mide contra el ancho del lienzo; en 1,91:1 se fijó
   `dominantMax` **0,42** de base.

**Concepto reducido — la bajada va al titular del anuncio:** con todo el copy al piso legible en teléfono (voces
9 CSS px, CTA 11 CSS px a 390 px de ancho) la bajada no cabe sobre la escena. La horizontal lleva **pregunta, titular,
CTA y descriptor**; la bajada va en el **titular del anuncio** de LinkedIn/Meta. Se declara por pieza
`conceptoReducido: { razon, aprobadoPor: "julio-reyes", plate: <sha256 del plate> }`: el gate exige un aprobador del
registro `scripts/foto/aprobadores.json` y el sha256 del plate. **Requiere la aprobación del operador** (dada el
2026-10-02 para CMP-004); un agente **nunca** la declara por su cuenta.

**Firma — izquierda, alineada a la columna de texto, a altura fija:** el logo se alinea al borde izquierdo de la
columna (x del centro = (178 + ancho/2)/2048 ⇒ **0,1524** con ancho **0,25 del lado corto**) y va a la misma altura en
toda la serie (`logo.y` **0,86** del alto; a 0,8274/0,80/0,85 caía sobre el canto iluminado del lecho en 2–4
piezas). Centrada (canon general) cae en la unión columna/escena, sobre el canto, y el gate la rechaza. Decisión del
operador: izquierda alineada.

**Parámetros base del formato 191** (`formatos.json` del lote): `top` 0,075 · `textWidth` 0,46 · `leadSize` 48 ·
`dominantSize` 146 · `dominantMax` 0,42 · `after` null · CTA 58/48 px con padding 34×16 · `logo { width: 0.25,
x: 0.1524, y: 0.86 }`. Ajustes por pieza: S03 y S05 `dominantSize` 200 (titulares cortos: el CTA competía); S02
`cursorScale` 0,45. Receta en Recursos `2026-10-02-formatos-pauta/{composicion,nativas/horizontal}`.

## 1. 🔴 La reserva del comando NO es la safe zone de la plataforma

Son dos cosas distintas y hay que cumplir **las dos**. `foto:prompt` reserva espacio **en la fotografía**
para que quepa el texto; la plataforma reserva espacio **en la pantalla** para su propia interfaz. Y para que la
pieza pase `pnpm foto:cta:gate` hay una tercera: la **zona segura de AXIS**, que el gate verifica como piso.

| Formato | Reserva que inyecta el comando | Safe zone de plataforma | Zona segura de AXIS (piso del gate) | Dónde arranca el texto en realidad |
|---|---|---|---|---|
| 4:5 | top 30% libre | — | *feed*: 7,5% a los lados · 6% arriba y abajo | 7% |
| **9:16** | banda **10–32%** | 🔴 **14% superior** (avatar y nombre de cuenta) · **20% inferior** en Stories, hasta **35%** en Reels · ~6% a cada lado | *story*: 10% a los lados · 13% arriba y abajo | **16,5%** |
| 16:9 | 42% izquierdo, sujeto en el 55% derecho | — | *feed*: 7,5% · 6% | 10% |

🎯 **En 9:16 obedecer sólo al comando pone el titular debajo del nombre de la cuenta.** La banda del comando
empieza en 10%; la UI ocupa hasta el 14%. **Manda la más restrictiva.**

### La zona de AXIS: el piso que verifica el gate *(2026-09-23)*

`pnpm foto:cta:gate` exige la zona segura de AXIS (`axisAdvertising.safeArea`) como **piso**: perfil *feed* en 4:5,
1:1 y 16:9; perfil *story* en 9:16 (el compositor lo aplica cuando el alto es al menos 1,7 veces el ancho). Texto,
botón, selección y firma que salgan de ella bloquean, salvo excepción `zona-segura` auditada: aprobador del registro,
`plate` y `hasta` (los px de desborde que se aprueban). La firma se mide contra su propia franja (§2c).

- **`safeArea: "axis"`** ubica el texto dentro de la zona y, desde el 2026-09-23, también lo hace **arrancar** dentro
  por arriba: si el `top` del plan cae sobre el borde superior, el texto baja hasta él. Lo declara todo plan nuevo que
  deba pasar el gate.
- **`safeArea: { x0, y0, x1, y1 }`** sólo **estrecha** el piso: el gate verifica su intersección con AXIS. Con un
  objeto el compositor no baja el texto por ti; el `top` del plan tiene que caer dentro.
- 🔴 **El piso no es la safe zone de la plataforma.** En 9:16 AXIS reserva el 13% superior y la UI de cuenta llega al
  14%: con `"axis"` solo, el titular puede quedar debajo del nombre de la cuenta. Para pauta 9:16 declara además un
  `top` o una zona más estrecha, como en la tabla: sigue mandando la más restrictiva.
- **AXIS es el perfil por defecto en una pieza nueva** desde el 2026-09-23. Declarar
  `safeArea: "axis"` conserva la intención en el plan; una zona propia sólo puede estrecharla. El 7 % describe
  el comportamiento histórico de piezas aprobadas bajo el canon anterior.
- Las piezas aprobadas que el canon ahora reprueba **se dejan como están y se corrigen al recomponer** (decisión del
  operador, 2026-09-23).

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
   **1,2:1** sobre la misma banda oscura donde el blanco daba 19,9. *(Hoy el comando canónico mide la tinta donde
   va la firma —antes muestreaba el pie aunque la pieza declarara `logo.y`— y con `logo.y: "auto"` dibuja la que
   pasó la búsqueda. Forzarla sigue siendo válido.)*
4. **`logo.y`** (fracción del alto) ubica la firma y marca su **borde superior**, no su centro. Nació en una copia
   de corrida (`componer-cta-safe.mjs`); hoy vive en el comando canónico junto con `logo.y: "auto"` (§2c).

**Resultado:** texto desde **16,5%**, firma en **82–85%**, y la barra de mensaje de Stories libre.

⚠️ **Limitación declarada:** el guardrail de Meta para ads en **Reels** reserva hasta el **65%**, así que con
caption largo la firma puede solaparse. Subirla ahí rompe la composición, y ese guardrail existe sobre todo
para **elementos críticos** —titular y CTA—, que sí quedan fuera. La firma es identidad, no información
accionable. **Declararlo, no esconderlo.**

⚠️ **Y la trampa de medición que costó dos rondas:** midiendo «firma blanca vs fondo» a mano daban 4,9 · 9,1 ·
4,7 y parecía que pasaba; el compositor mide **la firma real**, que en `auto` es navy. **Medir el elemento que
se va a dibujar, no una idealización — y en el ancho que va a ocupar, no en una franja cualquiera.**

✅ **Con el gate de hoy** la firma de un 9:16 se mide contra la zona *story* de AXIS, que termina en el **87%** —donde
empieza la barra de mensaje de Stories—, estrechada por `signatureSafeArea` si el plan la declara. La receta de arriba
(`logo.y = 0,82`, fin hacia el 85%) queda dentro. `logo.y: "auto"` no busca más abajo de ese borde; si no encuentra
lugar, la firma cae al pie histórico —en 9:16, dentro de la UI— y el gate la reprueba. Contrato por formato: §2c.

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

## 2c. La firma en cada formato: el contrato del gate

*(2026-09-23.)* La firma tiene contrato en `pnpm foto:cta:gate` en todo formato. Los campos del plan están en
`SKILL.md` (§Tres voces + acción); acá va lo que cambia por formato.

| Exige | Cómo se mide | Excepción auditada |
|---|---|---|
| Firma declarada | `logo`, `firma: { modo: "externa", razon }` o `firma: { modo: "sin-firma", razon, aprobadoPor }` | — (`sin-firma` exige aprobador del registro) |
| ≥ **20% del lado corto** | el ancho dibujado, o el de la caja reservada si la firma es externa | `firma-tamano` |
| ≥ **4,5:1** | logo: en la caja **y** en el trazo (el 1% peor de sus píxeles). Externa: el peor píxel de su caja, con la mejor de las dos tintas oficiales | `firma-contraste` |
| Fuera del sujeto | contra la máscara de segmentación | `firma-sobre-sujeto` |
| Dentro de **su** zona | la de AXIS (§1) estrechada por `signatureSafeArea` —la franja que el plan declara para la firma—, **no** la del texto | `zona-segura` |
| La automática, debajo de todo lo compuesto | recalculado sobre el layout | no se exceptúa: es un error del compositor |
| Fuera del **canto** del lecho (piezas nuevas; tramo 16) | pendiente de luz bajo la caja real (`firmaCanto` en el QA, normalizada al lado corto) ≤ 18,5; en las aprobadas, aviso | `firma-canto` |

⚠️ **En horizontales, «lado corto» no es «ancho»: es el alto.** En 4:5, 1:1 y 9:16 el 20% del lado corto es el 20%
del ancho; en 16:9, no (abajo).

**Dos maneras de firmar:**

- **Automática** — `logo: { width: 0.2, x: 0.5, y: "auto" }`. Busca desde el pie hacia arriba, **sólo en la banda del
  pie**: entre lo último compuesto (más una holgura del 2% del lado corto) y el borde inferior de la zona de la firma.
  En cada altura prueba las dos tintas oficiales y toma la primera con ≥ 4,5:1 en la caja y en el trazo que no toque
  al sujeto ni una zona `protect`; `logo.variant: "auto"` dibuja esa tinta. En una pieza nueva descarta, además, las
  alturas sobre un canto del lecho (tramo 16). Si no hay, la firma queda al pie, el
  compositor avisa con la banda que recorrió y el gate la mide ahí. Salidas: acortar o subir el texto para abrir la
  banda, un `logo.y` explícito o un plate con el lecho más oscuro o más claro.
- **Externa** — la pone otra herramienta después del compositor (en v03–v07, `firmar.mjs` → `firma-placement.mjs`).
  El plan la declara con `firma: { modo: "externa", razon }` y, si no va en 0,935, con `signatureY` —que sin `firma`
  también la declara, y es el campo que lee `firmar.mjs`—; el compositor **reserva su caja** con la misma geometría:
  20 % del lado corto, centrada, `signatureY` como **centro** vertical (**0,935** por defecto). `firma` no acepta `y` ni
  `ancho`. Nada cae encima, el crecimiento la respeta y el gate le aplica el
  contrato de la tabla.

🔴 **Ojo con la unidad de la Y:** `logo.y` es el **borde superior**; `signatureY`, el **centro**. Pasar un
valor de un campo al otro corre la firma media altura del logo.

### 16:9: firma horizontal nueva — decisión vigente desde 2026-09-23

Medido en la misma campaña: en 16:9 la firma ocupa el **7,3–7,9% del ancho** del cuadro, contra el **20%** en 4:5 y
9:16 (**18%** en 1:1). En el feed de un teléfono (390 px de ancho) mide **31 px** contra **78 px** en el 4:5: **2,5
veces más chica**. Dos causas:

1. Las piezas 16:9 de CMP-002 y del registro C se hicieron con **13–14% del lado corto**, bajo el canon: el gate ya
   las bloquea (`firma-tamano`) y se corrigen al recomponer.
2. **Aun en el canon el formato la achica:** el 20% del lado corto de un 16:9 es el **11% del ancho** y **44 px** en
   el teléfono.

**Canon aplicado:** en una pieza nueva horizontal el gate exige al menos **25 % del lado corto** (≈ **14 %** del ancho
y **55 px** en ese teléfono); en verticales y cuadrados, **20 %**. El máximo es **35 %** en todos. Las piezas
aprobadas bajo el canon anterior conservan sus píxeles; al recomponer se evalúan con las reglas actuales. La firma
externa tiene una caja fija del 20 %, así que no la presentes como certificable en un horizontal nuevo sin resolver
el tamaño o registrar una excepción auditada.

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
pnpm foto:componer:cta <plan.json>                # compone
pnpm foto:cta:gate     <plan.json>                # verifica los mínimos contra las huellas del QA del plan
pnpm foto:cta:gate     <plan.json> --reproducir   # certifica recomponiendo: la certificación que no se falsifica
```

Qué certifica cada código de salida (0 · 1 · 2 · 3) y qué avisos se miran a ojo:
[brief y QA](creative-brief-and-qa.md#gate-del-compositor-de-cta).

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

El operador rechazó la v05 con firma al 63% por quedar casi al centro. La v06 sigue la referencia visual de Claude: centro al 83,3%, lecho físico y contraste ≥4,5:1. Texto, CTA y cursor conservan ventana interna x=8–88%, y=16–65% *(con el gate de hoy manda también el piso de AXIS: en 9:16 pide 10% a los lados, así que la ventana efectiva es x=10–88%, y=16–65%; al recomponer, declarar una ventana que quepa en las dos)*. La firma editorial se evalúa por separado y queda fuera del guardrail inferior conservador de Reels; declarar el posible solapamiento y verificar el placement antes de pautar. **No elevar la firma al centro para optimizar un gate ni etiquetar toda la pieza como segura para Reels.** Canon y evidencia: [Tres voces + acción](../../../../docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md#zonas-seguras-placement-y-promoción-a-finales--2026-09-22).

## Lecho y compositor: revisión posterior de la misma sesión

Bajar la firma sin reducir un lecho que ocupa casi media foto no corrige la composición: el operador rechazó los verticales v06 por ese motivo. Editar el primer plano físico y recuperar la escena. En la corrección se buscó el quinto inferior, no una nueva reserva obligatoria global.

El comando consolidado es la ruta para trabajo nuevo, pero no todo plan histórico es compatible: `logo.y` significa borde superior, y `centerX` hoy se lee pero un bloque centrado con el eje lejos del centro aborta (así abortan las 03-referencia-916). La [auditoría del 22/09](../../../../docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md#7-auditoría-de-compatibilidad-y-alcance--22092026) encontró un gate que no detectaba QA vacío ni ajeno y medía el fondo con p98; desde la certificación del 2026-09-23 el gate falla con cero piezas o con piezas del plan ausentes del QA, ata el QA al plan, al plate y al PNG por huellas y mide cada voz en la caja **y en el trazo** (§5). [Método integral](../../../../docs/operations/social/2026-09-22-seo-aeo-paid-media-production-method.md). No atribuir a la documentación una corrección de código que no ocurrió.

**Corrección del operador, misma sesión:** además de reducir el lecho, la firma debe estar DENTRO de su materia desenfocada, separada del borde de transición. No trasladar el Y de Claude o de v06 a otra foto. Si el logo queda encima del lecho, es REWORK aunque contraste y bounds den PASS. V07 usa centro 90% después de esa revisión; es caso, no token.

🔴 **Y con el gate de hoy esa firma queda fuera de su zona — decisión PENDIENTE del operador.** Las tres stories de
v07 declaran `signatureSafeArea` de 0,85 a 0,97 y `signatureY: 0.9`: la caja de la firma va de 0,887 a 0,913 del alto
y la zona *story* de AXIS termina en 0,87. Cae en la franja inferior que Reels tapa, como reconoce su propio LEEME.
Falta decidir si se aprueba como excepción `zona-segura` con el nombre del operador (más el `plate` y el `hasta` que
exige toda excepción) o si se sube al recomponer; subirla obliga a revisar también su `signatureSafeArea`, que
cruzada con AXIS le deja a la firma sólo la franja 0,85–0,87. Mientras tanto la pieza se deja como está, y **ningún
agente declara esa excepción ni inventa el aprobador**. v06 (centro 0,833, franja 0,78–0,87) queda dentro.
