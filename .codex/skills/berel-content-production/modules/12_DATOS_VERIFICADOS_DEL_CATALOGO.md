# 12 · Datos verificados del catálogo (y del costo de pintar)

> **Fuente de verdad:** verificación en vivo del catálogo público de Berel y del payload de su CMS,
> más un reporte de costos de mano de obra en México. Baseline extraído el **2026-08-25**.
> **Corrección acotada 2026-09-03:** §3 y §3.1, con Wiki y ficha técnica de Berelex Semibrillante.
> **Feedback del cliente 2026-09-04:** §1 queda bajo revalidación y §3.2 registra catálogo/pedidos abiertos.
> El resto del baseline no se declara revalidado por esta actualización.

## Por qué existe este módulo

Estos datos **se pagaron con verificación en vivo** y se vuelven a necesitar en **cada pieza del
cluster**: rendimiento, lavabilidad, COV, colores por variante, la regla de cálculo de litros y el
costo de pintar una sala.

🔴 **Sin este módulo, cada artículo nuevo los redescubre o —peor— los estima.** Un dato de producto
estimado es un claim inventado, y el cliente ya marcó esa regla: ningún claim sin ficha técnica
→ [`09_RECOMENDACIONES_DEL_CLIENTE.md`](09_RECOMENDACIONES_DEL_CLIENTE.md).

Este módulo orienta la búsqueda, no reemplaza una ficha vigente. Antes de reutilizar un dato,
confirmar producto, acabado, soporte, condiciones, fuente y fecha en la Wiki y documentación oficial.
Si no se puede verificar, declarar el pendiente concreto; no inventar ni trasladar datos entre variantes.

## 1 · Rendimiento y lavabilidad de las vinílicas de muro

🔴 **Todos estos valores son a dos manos.** Verbatim de la ficha:

| Producto | Rendimiento declarado | Lavabilidad declarada | COV |
|---|---|---|---|
| **Kalos Tone** (Mate) | `6 - 7 m2 /L` | `> 10,000 ciclos` | no reportado |
| **Multitono Pro** | `6 - 7 m2 /L` | `12,000 ciclos mínimo` | no reportado |
| **Berelinte** (Mate, Serie 800) | `8 - 10 m²/L` | `> 60,000 ciclos` | `< 50 g/L` |
| **Insignia** (Semimate) | `10 - 12 m2 /L` | `> 175,000 ciclos` | no reportado |
| **Sellador** (Serie 580) | `3 - 5 m2 /L de la mezcla diluida` | no aplica | no reportado |

⚠️ **Kalos Tone y Multitono Pro:** aunque la tabla conserva el baseline observado el 2026-08-25, el
cliente dejó abierto el rendimiento oficial en m²/L el 2026-09-04. No reutilizar esos dos valores en
una pieza nueva hasta revalidarlos contra la ficha técnica oficial vigente; mantener el pendiente fuera
del cuerpo público.

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

## 3 · Secados: ausencia en el CMS no demuestra ausencia en la ficha

El 2026-08-25 se observaron campos vacíos de repintado/curado en el payload de algunas variantes.
Esa observación no cubría todos los productos ni sus PDF. La prohibición general que se derivó de
ella queda corregida: **sí se puede citar un tiempo explícito de la ficha exacta, con sus condiciones**.

Antes de declarar un bloqueo:
1. Identificar producto y acabado, soporte y uso.
2. Abrir la Wiki, la página pública y el PDF oficial enlazado; registrar revisión/fecha y sección.
3. Separar tacto, intervalo entre manos, curado, manipulación, primer lavado y reocupación.
4. Registrar cada dato como confirmado, contradictorio, no encontrado o fuente inaccesible.
   Un dato confirmado no completa los demás por inferencia.
5. Si sigue faltando, pedir confirmación de ese dato y bloquear sólo la instrucción/pieza dependiente.
   No trasladar el tiempo de otra pintura ni convertir el pendiente en permanente.

Una contradicción bloquea **ese claim**, no todos los datos coincidentes del producto. No escoger
silenciosamente una cifra ni transformar “calidad de X años” en garantía. La petición del cliente
elige el producto, pero no crea prestaciones técnicas.

En diseño, el dato no resuelto conserva el literal
`PENDIENTE DE CONFIRMACIÓN — NO INCLUIR EN ARTE`; ver
[`11_FICHA_DE_PRODUCCION_INFOGRAFIA.md`](11_FICHA_DE_PRODUCCION_INFOGRAFIA.md).

### 3.1 · Caso verificado: Berelex Semibrillante para N29 (2026-09-03)

Fuentes: [Wiki de producto](https://www.notion.so/36c39c2fefe780d79d85c8eceefdd098),
[página pública del producto](https://berel.com/productos/arquitectonico/vinilacrilicas/berelex-semibrillante-2)
y [PDF oficial R0-07/23](https://fs4inq5psfy6zdpxht.berel.com/sites/default/files/2024-07/FT_Berelex%20Semibrillante.pdf).
El PDF es evidencia interna; el enlace público del artículo lleva a la ficha de berel.com.

| Dato | Evidencia y límite de uso |
|---|---|
| Producto/acabado | Resina acrílica, semibrillante. No Berelex Green ni Berelinte Mate/Satinado. |
| Rendimiento | 8–10 m²/L **a dos manos**; puede bajar según color, rugosidad, porosidad y aplicación. |
| Dilución de pintura | Habitualmente 10–20% de agua limpia, según superficie/método; mezclar antes y después. No usar esta proporción para el sellador. |
| Tacto / entre manos | Máximo 1 hora al tacto; **mínimo 2 horas** antes de la segunda mano. Wiki y PDF. |
| Lavabilidad | Más de 100,000 ciclos en página y PDF; la Wiki expresa clasificación normativa, no esa cifra. No convertir ciclos en lavados domésticos garantizados ni copiarlos a redes. |
| Preparación | Superficie limpia, seca y sin grasa/polvo; retirar pintura desprendida; lijar acabados brillantes según ficha. Corregir humedad antes. |
| Aplicación | Ventilar durante aplicación/secado; no aplicar por debajo de 10 °C ni mezclar con otras pinturas. |
| Igualación | Bases Pastel y Tint. Confirmar fórmula de cada tono propuesto; pertenecer al catálogo no confirma disponibilidad en esta variante. |
| No establecidos | Las fuentes consultadas no fijan primer lavado ni momento de volver a cocinar. No deducirlos del tacto, olor o intervalo entre manos. |
| Discrepancia | Página: calidad de 20 años; PDF: 15. En N29 no se añadió promesa de años. Confirmar documentación coincidente antes de usar ese claim. |

No extender el sistema de muros a azulejos, laminados o muebles sin identificar soporte, acabado previo
y sistema específico. La resistencia al crecimiento de hongos no elimina humedad ni hongos existentes;
no atribuir purificación del aire de otra línea.

Cálculo de N29: 30 − 1,6 − 1,5 − 4 = 22,9 m²; a 8 m²/L, unos 2,9 L teóricos a dos manos.
No duplicar litros por las dos manos ya incluidas ni garantizar que 4 L siempre alcancen.
Este caso no prescribe Berelex para todos los tutoriales: volver a verificar la ficha elegida.

### 3.2 · Catálogo y pendientes confirmados por el cliente (2026-09-04)

- Impermeabilización se presenta en **cinco familias**, incluida la familia de poliuretano / **Kover
  Poliuretano**. No omitirla al explicar el portafolio.
- **Malla de Refuerzo Kover** es un complemento, no una familia de impermeabilizante. `Serie 510000`
  queda como referencia interna; no va al cuerpo público.
- Pendientes oficiales: ficha técnica y página pública de Kover Poliuretano; página pública de Malla de
  Refuerzo Kover; rendimientos m²/L vigentes de Kalos Tone y Multitono Pro; tiempo oficial del primer
  lavado de Berelex Semibrillante; teléfonos de soporte técnico si se pretende publicarlos.
- En cocina N29, Berelex Semibrillante fue la selección confirmada para muros y techo. Es un caso
  acotado y no se universaliza a todas las cocinas ni tutoriales.

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

Calcular con el piso es una estimación conservadora, **no garantiza sobrante para retoques**:
porosidad, textura, color y aplicación pueden reducir el rendimiento. Al explicarlo, distinguir una
regla orientativa del dato de la variante y no multiplicar otra vez por manos ya incluidas.

## Cross-links

- Ningún claim sin ficha · series omitidas · "sin plomo" fuera del argumento de venta →
  [`09_RECOMENDACIONES_DEL_CLIENTE.md`](09_RECOMENDACIONES_DEL_CLIENTE.md)
- Cómo se redacta un dato técnico en el cuerpo → [`03_REDACCION_ARTICULO.md`](03_REDACCION_ARTICULO.md)
- El literal `PENDIENTE DE CONFIRMACIÓN — NO INCLUIR EN ARTE` y la regla de no deducir datos →
  [`11_FICHA_DE_PRODUCCION_INFOGRAFIA.md`](11_FICHA_DE_PRODUCCION_INFOGRAFIA.md)
- Datos en piezas sociales (ahí los ciclos de lavado **no se citan**) →
  [`06_DERIVADOS_SOCIALES.md`](06_DERIVADOS_SOCIALES.md)
- Método y fecha de esta verificación → [`../SOURCES.md`](../SOURCES.md)
