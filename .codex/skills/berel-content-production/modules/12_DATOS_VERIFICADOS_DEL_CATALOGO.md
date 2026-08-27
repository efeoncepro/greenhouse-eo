# 12 · Datos verificados del catálogo (y del costo de pintar)

> **Fuente de verdad:** verificación en vivo del catálogo público de Berel y del payload de su CMS,
> más un reporte de costos de mano de obra en México. Todo extraído el **2026-08-25**.

## Por qué existe este módulo

Estos datos **se pagaron con verificación en vivo** y se vuelven a necesitar en **cada pieza del
cluster**: rendimiento, lavabilidad, COV, colores por variante, la regla de cálculo de litros y el
costo de pintar una sala.

🔴 **Sin este módulo, cada artículo nuevo los redescubre o —peor— los estima.** Un dato de producto
estimado es un claim inventado, y el cliente ya marcó esa regla: ningún claim sin ficha técnica
→ [`09_RECOMENDACIONES_DEL_CLIENTE.md`](09_RECOMENDACIONES_DEL_CLIENTE.md).

Antes de escribir un dato técnico, **búscalo acá primero**. Si no está acá y no puedes abrir la
ficha, el dato **no se publica**.

## 1 · Rendimiento y lavabilidad de las vinílicas de muro

🔴 **Todos estos valores son a dos manos.** Verbatim de la ficha:

| Producto | Rendimiento declarado | Lavabilidad declarada | COV |
|---|---|---|---|
| **Kalos Tone** (Mate) | `6 - 7 m2 /L` | `> 10,000 ciclos` | no reportado |
| **Multitono Pro** | `6 - 7 m2 /L` | `12,000 ciclos mínimo` | no reportado |
| **Berelinte** (Mate, Serie 800) | `8 - 10 m²/L` | `> 60,000 ciclos` | `< 50 g/L` |
| **Insignia** (Semimate) | `10 - 12 m2 /L` | `> 175,000 ciclos` | no reportado |
| **Sellador** (Serie 580) | `3 - 5 m2 /L de la mezcla diluida` | no aplica | no reportado |

⚠️ **La unidad se escribe inconsistente en el propio sitio**: `m²/L` en Berelinte, y `m2 /L` / `m2/L`
en el resto. Está copiada tal cual arriba. Al citarla dentro de un artículo **se normaliza a `m²/L`**,
pero ten claro que **la ficha dice lo que dice** — si alguien la abre y ve otra cosa, no es un error
de transcripción.

⚠️ **El COV de Berelinte se escribe `< 50 g/L`, con símbolo**, no "menor a 50 g/L" en prosa. Si lo
citas entre comillas como cita de ficha, **tiene que ir con el símbolo**.

📌 Recordatorio de nomenclatura: las series (*Serie 800*, *Serie 580*) están arriba porque este
módulo es la ficha técnica. 🔴 **En el cuerpo del artículo al consumidor final se omiten**
→ [`09_RECOMENDACIONES_DEL_CLIENTE.md`](09_RECOMENDACIONES_DEL_CLIENTE.md) §Choque 1.

## 2 · Esmalte Summa por variante — los datos NO son intercambiables

🔴 **"Esmalte Summa" no es un producto con un dato: son cuatro URL con cuatro fichas distintas.**
Tomar el rendimiento de una variante y aplicarlo a otra es un error de dato, no un matiz.

| URL | Acabado | Rendimiento | Colores declarados | Secado libre al tacto | COV |
|---|---|---|---|---|---|
| `/esmalte-summa` | Mate | `10 - 12 m2/L` | `Disponible en 2 colores: Chocolate y Negro` | `30 minutos Max` | `< 450 g/L` |
| `/esmalte-summa-0` | Brillante | `4.5 - 9.5 m2/L` | `Más de 900 colores` | `30 minutos Max` | — |
| `/esmalte-summa-1` | Satinado | `8 - 10 m2/L` | `Disponible en color blanco` | `30 minutos Max` | — |
| `/esmalte-summa-2` | Semimate | `4.5 - 9.5 m2/L` | `Más de 900 colores` | `30 minutos Max` | — |

Fíjate en el salto: el **Mate** rinde `10 - 12 m2/L` y viene en **2 colores**; el **Brillante** rinde
`4.5 - 9.5 m2/L` y viene en **más de 900**. Son el mismo nombre comercial y datos que no se parecen.

**Antes de citar un dato de Summa, decide de qué acabado hablas** y toma la fila correcta.

## 3 · 🔴 El secado entre manos NO EXISTE en ninguna ficha

Verificado en el payload del CMS: el campo `secado_manos` viene **vacío** (`""`) en **Berelinte,
Berelinte-0, Kalos Tone, Esmalte Summa y Esmalte Summa-0**. Igual de vacíos vienen `secado_duro`,
`tiempo_curado` y `para_recubrir`.

🔴 **Ninguna pieza puede publicar un tiempo entre manos como dato de Berel.** No existe fuente.

Lo único citable es el **secado libre al tacto** (`30 minutos Max` en Summa), y al citarlo hay que
decir explícitamente que **libre al tacto no significa listo para la segunda mano**. Son cosas
distintas y el lector las confunde solo.

Este hueco **bloqueó dos artículos de septiembre 2026** (herrería y sala). No es un olvido de quien
escribió: es un **pendiente permanente para asesoría técnica del cliente**. Si vuelve a aparecer,
se declara como pendiente, no se rellena.

Cuando el dato haga falta en una ficha de diseño, se escribe el literal de la ficha de infografía:
`PENDIENTE DE CONFIRMACIÓN — NO INCLUIR EN ARTE`
→ [`11_FICHA_DE_PRODUCCION_INFOGRAFIA.md`](11_FICHA_DE_PRODUCCION_INFOGRAFIA.md).

## 4 · Descripciones de ficha citables (verbatim)

Estas son las descripciones oficiales. **Se citan entre comillas y tal cual**; no se parafrasean para
que suenen mejor, porque parafrasear una ficha es donde nacen los claims inventados.

- **Berelinte:** "Es una pintura de extraordinaria duración con excelente rendimiento, poder cubriente
  y gran resistencia al lavado, su acabado es terso y mate, posee muy buena facilidad de aplicación,
  ofrece mejor resistencia al salpiqueo al aplicarse con rodillo. Esta pintura NO contiene plomo."
- **Kalos Tone:** "Se caracteriza por su excelente poder cubriente, posee muy buena resistencia al
  lavado, giseo y decoloración, además de muy buen rendimiento, brochabilidad y nivelado. Esta pintura
  NO contiene plomo."
  Beneficio declarado: "¡Nueva garantía de 5 años!"
- **Multitono Pro:** "Es una pintura Vinil-Acrílica de acabado mate con excelente rendimiento y
  resistencia tanto al giseo y a la decoloración, además de muy buena resistencia al lavado con buena
  brochabilidad, nivelado y cubrimiento."
- **Insignia:** "Insignia es una pintura formulada con resinas 100% acrílicas. Tiene una alta
  resistencia a la alcalinidad del cemento, excelente resistencia al lavado, manchado, giseo y
  decoloración en aplicaciones a la intemperie, además de excelente rendimiento y facilidad de
  aplicación."
- **Esmalte Summa (Mate):** "Esmalte alquidálico de acabado mate y secado rápido, posee excelente
  adhesión, dureza y gran rendimiento. Este esmalte NO contiene plomo."
- **Sellador (Serie 580):** "Sellador altamente resistente a la alcalinidad y a la humedad, formulado
  a base de resina 100 % acrílica de superior calidad, lo que le imparte alta durabilidad,
  resistencia, excelente adhesión, y gran poder de sellado."
- **Berelinte, beneficios:** "Más lavable, más poder cubriente y más rendimiento" · "Ofrece un acabado
  terso y mate" · "Acabado mate con calidad de 10 años"

⚠️ Varias fichas cierran con "NO contiene plomo". 🔴 **Eso no se convierte en argumento de venta** —
hoy toda la categoría es sin plomo; el diferenciador que sí se destaca es la garantía
→ [`09_RECOMENDACIONES_DEL_CLIENTE.md`](09_RECOMENDACIONES_DEL_CLIENTE.md).

## 5 · Costo de pintar en México — dato con caducidad

🔴 **Estas cifras caducan.** Son de **agosto de 2026** y el propio reporte recomienda **reverificarlas
si la publicación se corre más de 60 días**. 🔴 **Van con su fecha dentro del cuerpo del artículo,
siempre** — no en una nota al pie ni en el brief: en el texto que lee el usuario.

**Base de cálculo:** sala de **4 × 5 m**, altura **2,5 m** → **45 m² brutos** − puerta y ventana →
**~40 m² netos de muro**. El techo, si se pinta, suma **~20 m² aparte**.

| Escenario | Qué incluye | MXN para 40 m² |
|---|---|---|
| Lo hace uno mismo, muro en buen estado | Pintura y herramienta básica | $1,400 a $2,100 |
| Lo hace uno mismo, muro nuevo o resanado | Lo anterior más resanador y sellador | $2,100 a $3,100 |
| Solo mano de obra contratada | El material lo pone el cliente | $1,400 a $2,800 |
| Llave en mano con material | Preparación, resane, sellador y 2-3 manos | $6,000 a $7,200 |

**Tarifas por m² de las que salen esas cuentas:**

- **Mano de obra sola: $35 a $70/m²** — banda de **consenso entre dos fuentes independientes**.
- **Llave en mano: $150 a $180/m²** — **una sola fuente**. 🔴 **No la promedies con nada.**

### ⚠️ Advertencias que van siempre con el dato

- **Dispersión de 10×** entre los extremos de las fuentes para la mano de obra sola. La banda de
  arriba es **la de consenso, no un promedio de todo lo publicado**.
- Las tarifas corresponden a **zona metropolitana**: en ciudades medianas bajan y cerca de la costa
  suben.
- **Fuentes descartadas por antigüedad oculta** —anotadas acá para que nadie las reuse—: un hilo de
  **Habitissimo MX** que rankea primero pero cuyas respuestas tienen **8-9 años**, y una **lista de
  precios en PDF cuyos metadatos dicen 2012**. 🔴 **Ninguna de las dos muestra su año en pantalla**,
  así que parecen vigentes.
- 🔴 **Nunca nombrar marcas de la competencia ni retailers en el cuerpo del artículo.** El dato se
  publica **fechado y sin atribuir a una cadena**.

## 6 · La regla de cálculo "1 L por cada 6 m²"

La regla es **correcta a dos manos**, y es **conservadora a propósito**: coincide con el **piso del
rango de Kalos Tone** (`6 - 7 m²/L` a dos manos), que es el producto de **menor rendimiento** del
cuadro de la §1.

🔴 **Por mano, el rendimiento real declarado es bastante mayor.** Decir *"1 L rinde 6 m² a una mano"*
**subestima el producto a la mitad** y es un error contra la propia ficha.

Calcular con el piso es deliberado: **deja sobrante para retoques**. Al explicarlo en un artículo,
di que es una regla de bolsillo conservadora, no el rendimiento del producto.

## Cross-links

- Ningún claim sin ficha · series omitidas · "sin plomo" fuera del argumento de venta →
  [`09_RECOMENDACIONES_DEL_CLIENTE.md`](09_RECOMENDACIONES_DEL_CLIENTE.md)
- Cómo se redacta un dato técnico en el cuerpo → [`03_REDACCION_ARTICULO.md`](03_REDACCION_ARTICULO.md)
- El literal `PENDIENTE DE CONFIRMACIÓN — NO INCLUIR EN ARTE` y la regla de no deducir datos →
  [`11_FICHA_DE_PRODUCCION_INFOGRAFIA.md`](11_FICHA_DE_PRODUCCION_INFOGRAFIA.md)
- Datos en piezas sociales (ahí los ciclos de lavado **no se citan**) →
  [`06_DERIVADOS_SOCIALES.md`](06_DERIVADOS_SOCIALES.md)
- Método y fecha de esta verificación → [`../SOURCES.md`](../SOURCES.md)
