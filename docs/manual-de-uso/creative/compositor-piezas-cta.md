# Compositor de piezas con CTA — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-23 por Claude
> **Ultima actualizacion:** 2026-09-23 por Claude
> **Modulo:** Creative · piezas publicitarias y sociales con CTA sobre fotografía
> **Ruta en portal:** no aplica — son comandos locales del repositorio (`pnpm foto:*`)
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/compositor-piezas-cta.md) · [Contrato técnico](../../operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) · [Tres voces + acción](../../operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) · [Producir una foto de marca](../marketing/fotografia-de-marca-efeonce.md)

## Lo más corto que funciona

```bash
pnpm foto:validar ai-generations/<corrida>/plates/<plate>.png --zona-texto   # 0. ¿el plate sirve? con números
pnpm foto:componer:cta ai-generations/<corrida>/piezas.json                   # 1. compone
pnpm foto:cta:gate ai-generations/<corrida>/piezas.json                       # 2. certifica (✓ = código 0)
pnpm foto:cta:gate ai-generations/<corrida>/piezas.json --reproducir          # 3. certificación que no se falsifica
pnpm foto:accesibilidad ai-generations/<corrida>/piezas.json                  # 4. reporte para mirar (no aprueba)
```

Tres reglas que evitan casi todos los problemas:

1. **Un 3 no es un pase.** `⊘ NO CERTIFICABLE` quiere decir «no puedo probarlo». Se resuelve recomponiendo o con
   `--reproducir`, nunca dándolo por bueno.
2. **Mira la pieza siempre.** El gate mide reglas; no dice si la pieza es buena ni ve todo (ver
   [Lo que el gate no ve](../../documentation/creative/compositor-piezas-cta.md#lo-que-el-gate-no-ve)).
3. **Nunca inventes un aprobador.** Si una regla necesita excepción, pregúntale al operador y usa sólo nombres del
   registro `scripts/foto/aprobadores.json`.

## Para qué sirve

Para producir y certificar piezas publicitarias o sociales **con CTA sobre una fotografía**: posts 4:5 y 1:1, stories
9:16 y piezas 16:9. El compositor escribe cada voz (entrada, titular, cierre, nota, CTA y descriptor), dibuja el CTA
con su selección colaborativa, pone la firma y mide todo sobre el píxel real. El gate revisa lo compuesto y dice si
queda **certificado** (0), si **falla** (1) o si **no se puede certificar** (3).

No sirve para piezas sin texto o sin CTA: para esas está `pnpm foto:componer`. Y nada de esto autoriza a publicar:
**certifica la pieza, no la campaña**.

## Antes de empezar

1. **Un plate limpio y validado.** La foto no lleva texto ni logo (la firma se compone después) y reserva el espacio
   del texto. Se produce con el [manual de foto de marca](../marketing/fotografia-de-marca-efeonce.md) y se valida con
   `pnpm foto:validar <plate> --zona-texto`. Si no pasa, se regenera: no se parcha con un velo ni al componer.
2. **Dependencias instaladas.** Corre `pnpm install` en la raíz del repositorio. Trae lo que el comando necesita para
   dibujar, validar y segmentar. La segmentación del sujeto corre en tu computador, sin costo por uso. La primera
   composición de cada plate tarda más porque segmenta; después la silueta se lee de una caché
   (`node_modules/.cache/foto-sujeto/`).
3. **Fuentes.** Poppins y Bricolage Grotesque vienen en el repositorio (`src/assets/fonts/`): no instalas nada. Guttery
   sólo hace falta para el gesto manuscrito, que no se certifica; el comando la busca en `~/Library/Fonts/Guttery.otf`.
4. **Dónde va el plan.** Cada corrida vive en su carpeta, `ai-generations/<AAAA-MM-DD>_<tema>/`:
   - el plan se llama `piezas.json` o `piezas-<algo>.json` (así la red de regresión lo encuentra y lo protege);
   - los plates van en la misma carpeta (por ejemplo, `plates/`) y el plan los nombra **con rutas relativas al plan**;
   - todo lo que se compone queda en `out/`, dentro de esa carpeta.
5. **Los plates no se versionan.** Git guarda los planes, pero ignora las imágenes de `ai-generations/`. Archiva el
   plate con la entrega: sin él, nadie puede recomponer, certificar por reproducción ni incluir la pieza en la
   regresión.
6. **Tu propia carpeta.** Nunca compongas en la carpeta de otra sesión para probar algo: copia el plan y su plate a
   una carpeta temporal. Puedes tener varios planes en una misma carpeta (cada uno tiene su registro), pero **sin
   repetir ids** entre ellos.
7. **Decide la firma antes de componer:** la dibuja el compositor (`logo`), la pone otra herramienta después
   (`firma` externa) o la pieza no lleva (exige aprobador).
8. **Si prevés una excepción,** confírmala con el operador antes de empezar (ver
   [Cómo pedir y declarar una excepción](#cómo-pedir-y-declarar-una-excepción)).

## Paso a paso

### Paso 1 · Arma el plan

El plan es un JSON con una lista de piezas. Esta es la forma mínima con todo lo que el gate exige. Sale de la pieza
`b2-primero-el-numero-916` de la campaña CMP-001, que la prueba P10 certifica con código 0 después de aplicarle los
campos del canon. Aquí se le sumaron `altText` y `variantReason`, que sólo evitan avisos, y se le quitaron
`subjectProtection` (la segmentación la reemplaza) y los campos de una etiqueta que la pieza no usa. Que **tu** pieza
pase depende de tu foto: la plantilla asegura la forma, no el resultado.

```json
[
  {
    "id": "b2-primero-el-numero-916",
    "plate": "plates/b2-primero-el-numero-916-v2-plate.png",
    "altText": "<la escena en una o dos frases: quién aparece, qué hace, dónde; sin copiar el texto de la pieza>",
    "align": "left",
    "top": 0.165,
    "textWidth": 0.84,
    "safeArea": "axis",
    "lead": "El tablero ya te mostró el problema.",
    "leadFamily": "bricolage",
    "leadFill": "#ffffff",
    "leadSize": 36,
    "leadGap": 0.12,
    "dominant": "Cerrarlo es otra cosa.",
    "dominantSize": 140,
    "dominantMax": 0.76,
    "dominantTracking": -0.02,
    "after": "Eso es lo que **operamos**.",
    "afterFamily": "poppins",
    "afterFill": "#ffffff",
    "afterSize": 34,
    "afterGap": 0.12,
    "note": {
      "text": "Método, no improvisación: los seis motores, cada mes.",
      "size": 34,
      "x": "columna",
      "width": 0.8,
      "gapAfterClosure": 30
    },
    "cta": {
      "text": "Agenda tu discovery",
      "descriptor": "AEO para LatAm · 30 minutos",
      "variant": "outline",
      "variantReason": "<por qué este tratamiento en esta foto>",
      "x": "columna",
      "fontSize": 40,
      "descriptorSize": 28,
      "descriptorGap": 16,
      "paddingX": 24,
      "paddingY": 14,
      "radius": 10,
      "gapAfterNote": 18,
      "cursorScale": 1.1,
      "surfaceToken": "growthOnDark",
      "inkToken": "growthOnDark"
    },
    "logo": { "width": 0.2, "x": 0.5, "y": "auto" }
  }
]
```

**Qué es obligatorio y quién lo exige:**

| Campo | Lo exige | Qué pasa si falta |
|---|---|---|
| `id` | el esquema | El plan no compone. Letras, números, punto, guion y guion bajo; no empieza con punto; es parte del nombre de los archivos. Dos ids que sólo difieren en mayúsculas también se rechazan |
| `plate` | el esquema | No compone. Ruta relativa al plan |
| `dominant`, `dominantSize` | el esquema | No compone |
| `cta.text`, `cta.descriptor`, `cta.variant`, `cta.fontSize`, `cta.descriptorSize`, `cta.paddingX`, `cta.paddingY`, `cta.gapAfterNote` | el esquema | No compone |
| `cta.x` | el esquema | No compone, salvo que el CTA se centre con `cta.align: "center"` |
| `note.gapAfterClosure` o `note.y` | el esquema | Si hay nota, no compone sin uno de los dos |
| `lead` y `after` | el gate | Compone, pero falla «concepto completo» (salvo `conceptoReducido` con aprobador) |
| `logo` o `firma` | el gate | Compone, pero falla «la pieza no declara firma» |
| `safeArea: "axis"` (o una zona propia más estrecha) | el gate, en la práctica | Sin ella, el margen por defecto del compositor (7 %) queda fuera de la zona de AXIS y falla «zona segura» |
| `altText` | recomendado | Aviso: la alternativa no describe la escena |
| `cta.variantReason` (o `variant: "auto"`) | recomendado | Aviso: la variante se eligió sin motivo |

**Campos que conviene conocer:**

| Campo | Para qué | Valores |
|---|---|---|
| `align`, `top`, `textWidth` | Alineación, altura de arranque y ancho de la columna de texto | `left` o `center`; fracciones de 0 a 1 |
| `centerX` | Eje de un bloque centrado | Fracción; a 0,15 o menos del centro (si no, la pieza aborta al componer) |
| `leadFamily`, `afterFamily` | Familia de la entrada y del cierre | `poppins` (por defecto) o `bricolage` |
| `dominantMax` | Ancho máximo del titular; hasta ahí puede crecer en 16:9 y 9:16 | Fracción |
| `dominantTracking` | Interletraje del titular | Entre −0,08 y 0,12 em |
| `label` | Etiqueta opcional sobre el bloque | Texto |
| `cta.variant` | Tratamiento del CTA | `text`, `outline`, `solid` o `auto` |
| `cta.prominencia` | Intención cuando `variant` es `auto` | `discreta`, `delimitada` (por defecto) o `destacada` |
| `cta.x`, `note.x` | Arranque del CTA y de la nota | Fracción del ancho, o `"columna"` (sólo con bloque a la izquierda) |
| `surfaceToken`, `inkToken` | Color del acento y de la tinta del CTA | Tokens AXIS; acentos válidos: `accentSurface`, `growthOnDark`, `accentInkOnLight` |
| `logo` | Firma dibujada por el compositor | `width` (0,2 = 20 % del lado corto), `x`, `y` (`"auto"` o fracción del alto: borde superior), `variant` (`auto`, `negative` blanca o `color` navy) |
| `firma` | Firma externa o pieza sin firma | Ver más abajo |
| `final` | Tamaño entregado `[ancho, alto]` | Cada lado entre 320 y 8192 px, con la proporción del plate |
| `textGrowth` | `false` congela una pieza aprobada a su tamaño declarado | Booleano |
| `protect` | Objetos que el texto no puede tapar | `[{ "box": [x0, y0, x1, y1], "reason": "…" }]`, fracciones del lienzo, razón de 10 caracteres o más |
| `editorialReserve` | Reserva editorial: el texto no pasa de ahí | `{ "maxRight": px, "maxBottom": px }` en px del plate |
| `subjectGuard.ignore` | Falsos positivos de la segmentación | Con razón y aprobador; ver [excepciones](#cómo-pedir-y-declarar-una-excepción) |
| `placement` | Pieza que se publica en otra pantalla | `{ "anchoCssPx": n, "razon": "…" }`; sólo endurece la medición |
| `excepciones` | Excepciones auditadas | Ver [excepciones](#cómo-pedir-y-declarar-una-excepción) |

Dentro del texto: `**negrita**` sube el peso, `[[acento]]` pinta la palabra en naranja y una barra vertical (`|`) fuerza
un salto de línea. Para decir «no hay» se puede escribir `null` (por ejemplo, `"label": null`).

**Si la firma la pone otra herramienta** (como `firmar.mjs` en los sets v03–v07), reemplaza `logo` por:

```json
"firma": { "modo": "externa", "razon": "La firma la pone firmar.mjs después del compositor" }
```

El compositor reserva su caja (20 % del lado corto, centrada, con su centro vertical en 0,935 de la altura) y mide su
contraste como lo hará esa herramienta. Si la firma va en otra altura, declara `"signatureY"` (centro vertical, fracción
del alto): es el campo que lee `firmar.mjs`, así que la caja que se mide es la firma que se dibuja. El ancho es siempre
20 % del lado corto; `firma` no acepta `y` ni `ancho`. Los planes que ya usan `signatureY` quedan declarados como firma
externa.

**Si el bloque va centrado:** `"align": "center"` y `"cta": { "align": "center", … }` sin `cta.x`. No uses `"columna"`
en un bloque centrado, y mantén `centerX` a 0,15 o menos del centro; si el aire libre está a un costado, alinea el
bloque a ese costado.

> Referencia: el esquema completo del plan está en
> [`scripts/foto/cta-esquema.mjs`](../../../scripts/foto/cta-esquema.mjs).

### Paso 2 · (Opcional) Compara los tres tratamientos del CTA

Antes de fijar el tratamiento, puedes verlos lado a lado sobre tu foto:

```bash
pnpm foto:componer:cta ai-generations/<corrida>/piezas.json --variantes
```

Deja en `out/variantes/` cada pieza en sus tres versiones (`<id>--text.png`, `<id>--outline.png`, `<id>--solid.png`) y
una **hoja comparativa** `out/variantes/<id>.png`: los tres a 390 px, cada uno con su tinta, su límite, su APCA, su peor
caso de daltonismo y «✗ WCAG» si no pasa. No toca el registro del plan. Con eso decides y escribes `cta.variant` con su
`cta.variantReason`, o dejas `"variant": "auto"` con la `prominencia` que buscas.

### Paso 3 · Compón

```bash
pnpm foto:componer:cta ai-generations/<corrida>/piezas.json                       # todas las piezas
pnpm foto:componer:cta ai-generations/<corrida>/piezas.json <id-1> <id-2>         # sólo esas piezas
```

Qué vas a ver:

- **Avisos antes de empezar** (`⚠`): campos que el comando no lee, variantes sin motivo, o un id que otro plan de la
  carpeta ya registra. No detienen la composición, pero léelos.
- **Si el plan está mal escrito**, `Error: plan inválido — …` con la pieza y el campo, y no se compone nada.
- **Por cada pieza compuesta**, una línea con su id, su `contraste` y los `gaps` entre voces.
- **Si una pieza aborta**, el comando se detiene ahí con `Error: <id>: …`. Las piezas anteriores quedan compuestas y
  registradas; la que abortó y las siguientes, no. Corrige y vuelve a componer (todo el plan o sólo esas piezas).

Una composición completa empieza con el registro del plan vacío; una parcial (con ids) conserva lo que ya estaba y
actualiza sólo sus piezas. Mientras corre, la carpeta queda tomada (`out/.componer.lock`); si la interrumpes con
Ctrl-C, se libera sola.

### Paso 4 · Mira la pieza

Antes de certificar, abre `out/<id>.png` a tamaño completo y `out/preview-390/<id>.png`, que es como se verá en un
teléfono. Revisa, como mínimo:

- que la idea se lea primero y el titular sea claramente la voz dominante;
- que ninguna persona, mano, cara, producto ni objeto clave quede tapado por texto, CTA o cursor;
- que el CTA se vea completo con su cursor y que el descriptor tenga sentido leído junto al botón («Agenda tu discovery
  · AEO para LatAm · 30 minutos»): nombra lo que recibe quien hace clic, no el nombre interno del servicio;
- que la firma esté y se lea;
- que `out/<id>.alt.txt` describa la escena y transcriba todo el texto.

### Paso 5 · Corre el gate

```bash
pnpm foto:cta:gate ai-generations/<corrida>/piezas.json
```

La **última línea** dice el veredicto:

- `✓ N pieza(s) con CTA certificadas: …` — certificado (código 0);
- `✗ N fallo(s) en M pieza(s) con CTA.` — falla (código 1);
- `⊘ NO CERTIFICABLE — …` seguido de las causas — no certificable (código 3).

Si necesitas el código exacto (por ejemplo, en un script), llama al gate con node y no lo encadenes detrás de un `|`:

```bash
node scripts/foto/componer-cta.gate.mjs ai-generations/<corrida>/piezas.json; echo $?
```

### Paso 6 · Lee el resultado y corrige

El gate imprime tres tipos de línea:

- `✗ <id>: …` bloquea. Cada mensaje dice qué falló y, casi siempre, qué hacer. Busca el mensaje en
  [Problemas comunes](#problemas-comunes).
- `⚠ <id>: …` avisa y no bloquea: una excepción aprobada, un velo que rescata una voz, un texto chico en el teléfono,
  una variante sin margen, la alternativa sin escena. Míralos y decide.
- `⊘` y la lista de causas: el gate no puede probar la pieza. Ve al paso 7 o recompón.

El ciclo es corto: corriges el plan, recompones **sólo esa pieza** (`pnpm foto:componer:cta <plan> <id>`; el gate
imprime el comando exacto cuando la huella no calza), vuelves a mirar la pieza y corres el gate otra vez.

Correcciones típicas, en orden de preferencia: acortar el copy, mover el bloque (`top`, `align`), cambiar la tinta o el
acento, dejar que `variant: "auto"` elija el tratamiento y, si el plate no deja espacio o contraste, regenerar el plate.
No agregues velo para rescatar una voz ni cambies de tratamiento para esquivar la medición.

### Paso 7 · Certifica por reproducción

```bash
pnpm foto:cta:gate ai-generations/<corrida>/piezas.json --reproducir
```

Úsalo:

- **antes de entregar un set**, porque es la certificación que no se puede falsificar;
- cuando el gate dice `⊘ … se compuso con otra versión del comando` (por ejemplo, después de actualizar el
  repositorio);
- cuando la silueta salió de una caché ajena o no dice de dónde salió.

Qué hace: vuelve a componer todo el plan en una carpeta temporal, con el comando vigente y una segmentación nueva, y
compara cada `out/<id>.png` y `out/<id>-layout.json` byte a byte con lo reproducido. No toca tu carpeta `out/`.

- Si todo es idéntico: `✓ lo entregado es idéntico a la reproducción. Veredicto sobre el QA reproducido:` y a
  continuación el veredicto normal (0, 1 o 3).
- Si algo difiere: `✗ lo entregado no es lo que produce el comando vigente: out/<id>.png …`. La pieza cambió con el
  comando nuevo: recompón y **vuelve a mirarla**, porque ya no es la misma imagen.

Necesita el plate en tu máquina y tarda lo que una composición completa desde cero, porque segmenta de nuevo cada
plate. Las piezas con gesto manuscrito o tarjeta siguen saliendo con 3.

### Paso 8 · Genera el reporte de accesibilidad

```bash
pnpm foto:accesibilidad ai-generations/<corrida>/piezas.json
```

Escribe `out/accesibilidad/reporte.md` —una tabla por pieza y por voz con WCAG según el tamaño en el teléfono, APCA, área
bajo el umbral, daltonismo y el texto alternativo— y `out/accesibilidad/<id>-daltonismo.png`, la pieza a 390 px en visión
típica, protanopía, deuteranopía y tritanopía. Termina con `Reporte: … · N piezas · M voces bajo WCAG AA · K avisos`.

**No aprueba nada**: sirve para mirar. El que decide es el gate.

### Paso 9 · Firma externa y entrega

**Si la firma es externa, certifica antes de firmar.** Las herramientas de firma de v03–v07 (`firmar.mjs`) mueven
`out/<id>.png` a `out/<id>-sin-firma.png`, escriben la versión firmada en `out/<id>.png` y borran la copia sin firma.
Desde ese momento el gate ya no reconoce el PNG («no es el PNG que registró la composición») y `--reproducir` tampoco
calza. El orden es: componer → gate (y `--reproducir`) → firmar. Guarda el veredicto antes de firmar, sin tubería para
no perder el código:

```bash
node scripts/foto/componer-cta.gate.mjs ai-generations/<corrida>/piezas.json > ai-generations/<corrida>/gate-certificacion.txt 2>&1; echo $?
```

**Para entregar**, junta: la pieza (`out/<id>.png`, o la versión firmada si la firma es externa), su texto alternativo
(`out/<id>.alt.txt`, para el campo de texto alternativo de la plataforma cuando exista), el plan, el registro
`out/qa-<plan>.json` y el veredicto del gate. El método completo de entrega de una campaña está en el
[método SEO/AEO Paid Media](../../operations/social/2026-09-22-seo-aeo-paid-media-production-method.md).

Certificado no es aprobado ni publicado: la decisión de publicar, programar o pautar es aparte.

## Qué significan los estados

### Códigos de salida

| Comando | Código | Significado |
|---|---|---|
| `pnpm foto:cta:gate` | 0 | ✓ Certificado: huellas del plan, el plate, el PNG, el layout y el comando vigente; todas las reglas del canon |
| | 1 | ✗ Falla: una pieza incumple una regla o algo cambió después de componer |
| | 2 | Uso incorrecto: falta la ruta del plan |
| | 3 | ⊘ No certificable: sin fallas en lo que se pudo verificar, pero el gate no puede probar el resto |
| `pnpm foto:componer:cta` | distinto de 0 | Un `Error:` detuvo la composición (el plan es inválido o una pieza abortó), o faltó la ruta del plan y se imprimió la ayuda |
| `pnpm foto:accesibilidad` | 2 / 1 | Falta el plan / no hay registro: compón primero |
| `pnpm foto:componer:cta:pruebas` | 0 / 1 | Pasan todas / alguna falla (el resumen dice «N de M pasan» y dónde quedó el reporte) |
| `pnpm foto:componer:cta:regresion` | 0 / 1 | Sin diferencias / cualquier diferencia que no sea sólo «🔵», una pieza faltante del manifiesto, cero casos o manifiesto ausente |
| `pnpm foto:componer:cta:mutantes` | 0 / 1 | Todos los mutantes detectados y los canarios bien clasificados / alguno no |

### Símbolos

| Símbolo | Qué significa | Qué haces |
|---|---|---|
| `✓` | Certificado (última línea del gate) | Revisión humana y entrega |
| `✗` | Una regla bloquea o algo no calza | Corregir y volver a componer esa pieza |
| `⚠` | Aviso: no bloquea | Mirarlo y decidir; si es una excepción, confirmar que es la aprobada |
| `⊘ NO CERTIFICABLE` | El gate no puede probarlo | Recomponer o `--reproducir`. Nunca tratarlo como pase |

### Nombres de voz en los mensajes

| En el mensaje | Qué es |
|---|---|
| `etiqueta` | La etiqueta sobre el bloque (`label`) |
| `entrada` | `lead` |
| `dominante` | El titular (`dominant`) |
| `cierre-frase` | El cierre (`after`) |
| `cierre-inferior` | El cierre ubicado al pie (`footer`) |
| `nota` | La nota o beneficio (`note`) |
| `cta` | El texto del CTA |
| `cta-borde` / `cta-relleno` | El borde del contorno / el relleno del sólido, contra la foto |
| `descriptor` | El descriptor bajo el CTA |
| `…-acento-N` | Una palabra marcada con `[[acento]]` dentro de esa voz |

### Lo que conviene leer del registro `out/qa-<plan>.json`

| Clave | Qué te dice |
|---|---|
| `escala` | Cuánto creció el bloque (1 = tamaño declarado) |
| `guardaSujeto`, `mascara.origen`, `mascara.cobertura` | Si hubo silueta, de dónde salió (`fresca`, `cache-canonica`, `cache-externa`) y cuánto de la foto marca |
| `ctaVariante` | Qué tratamiento eligió `auto`, por qué (`motivo`) y si fue sin margen |
| `ratioDominanteEntrada` | Cuántas veces mide el titular a la entrada (mínimo 3) |
| `accesibilidad.voces.<voz>` | WCAG, umbral, tamaño en el teléfono (`cssPx`), trazo (`glifo`), APCA y daltonismo de cada voz |
| `fueraDeZona`, `zonaSegura` | Qué quedó fuera de la zona segura y cuál se verificó |
| `firma` | Tamaño relativo al lado corto, contraste del trazo y, si fue automática, si encontró lugar y en qué banda buscó |
| `lineas` | Cómo quedaron cortadas las líneas de cada voz |
| `huellas` | Las cinco huellas que el gate recalcula |

## Cómo pedir y declarar una excepción

Una excepción exceptúa **una regla en una pieza**. No apaga la medición: el gate la sigue haciendo y muestra la
excepción con su razón y quién la aprobó. Úsala cuando la regla de verdad no aplica a esa pieza, no para esconder un
problema que se arregla acortando el copy o regenerando el plate.

**Paso a paso:**

1. **Confirma que la regla se puede exceptuar** (tabla de abajo). WCAG por voz, el trazo, el CTA o el descriptor bajo
   4,5:1, el relleno bajo 3:1, el borde en el teléfono, las huellas, la falta de silueta, la firma automática sobre el
   contenido y los choques de maquetación **no** se exceptúan.
2. **Saca la huella del plate:**

   ```bash
   shasum -a 256 ai-generations/<corrida>/plates/<plate>.png
   ```

   Son los 64 caracteres del inicio. Si una excepción ya aprobada no nombra el plate, el gate también te dice el
   valor correcto.
3. **Anota la medida.** Si la regla se mide con un número, la excepción necesita `hasta`, y el número casi siempre
   está en el mensaje del gate: «la firma mide 3.9:1», «el dominante mide 2.8× la entrada», «la firma queda sobre el
   sujeto (420 px…)», o en la reserva «el texto baja hasta y=566 y la reserva editorial termina en 560» (6 px). Ojo:
   «la firma mide 14.0 % del lado corto» se declara como fracción, `hasta: 0.14`.
4. **Pide la aprobación al operador** con la pieza, la regla, la medida y la razón. Sólo valen los aprobadores de
   `scripts/foto/aprobadores.json` (hoy, `julio-reyes`); `suite-pruebas` no vale para planes del repositorio. Nunca
   escribas `aprobadoPor` sin esa aprobación.
5. **Declárala en la pieza** y corre el gate. Si el mensaje no traía el número —pasa con `zona-segura`, que sólo nombra
   lo que quedó afuera—, declara la excepción aprobada sin `hasta`: el gate la rechaza y te dice la medida de hoy («no
   declara `hasta` … hoy la medida es N»); confírmale ese número al operador y agrégalo. Si la firma falla en la caja y
   en el trazo, `hasta` tiene que cubrir el menor de los dos. Ejemplo de forma (no es una excepción aprobada):

   ```json
   "excepciones": [
     {
       "regla": "reserva-editorial",
       "razon": "La reserva se midió antes de separar el descriptor del grupo del CTA",
       "aprobadoPor": "julio-reyes",
       "plate": "<sha256 del plate, 64 caracteres>",
       "hasta": 6
     }
   ]
   ```

6. **Lee lo que dice el gate.** Si vale: `⚠ <id>: … — excepción auditada «reserva-editorial» (hasta 6): <razón>
   (aprobó julio-reyes).` Si no vale: `✗ <id>: … — la excepción «…» no vale: <motivo>`, y la regla bloquea.

**Reglas exceptuables y qué va en `hasta`:**

| Regla | ¿Lleva `hasta`? | Unidad de `hasta` | La medida no puede… |
|---|---|---|---|
| `zona-segura` | sí | px del lienzo que se sale el peor elemento | pasar de `hasta` |
| `reserva-editorial` | sí | px fuera de la reserva | pasar de `hasta` |
| `firma-contraste` | sí | razón de contraste (por ejemplo, 4.2) | bajar de `hasta` |
| `firma-tamano` | sí | fracción del lado corto (0.14 = 14 %) | bajar de `hasta` |
| `firma-sobre-sujeto` | sí | px de silueta bajo la firma | pasar de `hasta` |
| `jerarquia` | sí | veces que el titular mide a la entrada (por ejemplo, 2.8) | bajar de `hasta` |
| `dominante-mayor` | sí | titular dividido por la voz mayor (por ejemplo, 0.95) | bajar de `hasta` |
| `acento-cta` | no | — | — |
| `cta-perceptual` | no | — | — |
| `concepto-completo` | no | — | — |
| `legibilidad` | no | Hoy no tiene efecto: el texto bajo 9 px CSS sólo avisa | — |

Si el plate se regenera, la excepción deja de valer hasta que se vuelva a aprobar con la huella nueva.

**Salidas que no se miden y también exigen aprobador del registro:**

```json
"firma": { "modo": "sin-firma", "razon": "<por qué esta pieza no lleva firma>", "aprobadoPor": "julio-reyes" }
```

```json
"conceptoReducido": { "razon": "<por qué esta pieza va sin entrada o sin cierre>", "aprobadoPor": "julio-reyes" }
```

```json
"subjectGuard": {
  "ignore": [
    { "box": [0.62, 0.10, 0.80, 0.30], "reason": "<qué marcó la segmentación que no es sujeto>", "aprobadoPor": "julio-reyes" }
  ]
}
```

`conceptoReducido` es la forma canónica para una pieza sin entrada o sin cierre; la excepción `concepto-completo`
también vale. Las zonas de `subjectGuard.ignore` son para falsos positivos (un afiche del fondo), nunca para tapar a
una persona real: cada zona cubre como máximo el 10 % de la imagen y todas juntas el 15 %. Las cajas van como
`[x0, y0, x1, y1]` en fracciones del lienzo.

Para proteger un objeto que no es el sujeto no hace falta aprobador; basta la razón:

```json
"protect": [{ "box": [0.55, 0.40, 0.95, 0.62], "reason": "<qué objeto se protege>" }]
```

## Decisiones pendientes que te afectan

El operador todavía no decide estos puntos. Mientras tanto, rige lo que dice la columna «Hoy».

| # | Pendiente | Hoy |
|---|---|---|
| 1 | Tamaño de la firma en 16:9 | 20 % del lado corto en todos los formatos: es lo que exige el gate |
| 2 | Margen por defecto del compositor (7 %) frente a AXIS (7,5 % feed, 10 % story) | Declara `safeArea: "axis"` en todo plan nuevo |
| 3 | Firma de las tres stories de v07 en la franja que Reels tapa | El gate las marca fuera de la zona segura; no inventes la excepción ni muevas la firma sin decisión |
| 4 | Velo (`scrimTop`/`scrimBottom`) que rescata una voz: ¿permitido o con aprobación? | Aviso |
| 5 | Variante del CTA elegida sin margen: ¿aviso o bloqueo? | Aviso |
| 6 | Piso de legibilidad por rol | Aviso bajo 9 px CSS en el teléfono |
| 7 | Grosor de los corchetes de AXIS (cerca de 0,69 px CSS en el teléfono) | Aviso; cambiarlo es cambiar el contrato AXIS |

**1 · La firma en 16:9.** Medido en una misma campaña: en 16:9 la firma ocupa entre 7,3 % y 7,9 % del ancho del cuadro,
contra 20 % en 4:5 y 9:16 (18 % en 1:1). En el feed de un teléfono (390 px de ancho) mide 31 px contra 78 px en el 4:5:
dos veces y media más chica. Tiene dos causas. Las piezas 16:9 de CMP-002 y del registro C se hicieron con 13–14 % del
lado corto, bajo el canon: el gate ya lo bloquea y se corrigen al recomponer. Y aun dentro del canon, el 20 % del lado
corto en 16:9 queda en 11 % del ancho y 44 px en el teléfono. La opción recomendada, **a decidir**, es 25 % del lado corto
en formatos horizontales (cerca de 14 % del ancho y 55 px en el teléfono, la misma relación firma/titular del 4:5) y 20 %
en verticales y cuadrados. Si se aprueba, cambian el gate, el compositor y `firma-placement.mjs`.

**2 · El margen por defecto.** El compositor usa 7 % de margen cuando el plan no declara zona; AXIS pide 7,5 % en feed y
10 % en story. La recomendación registrada es mantener el 7 % y exigir `safeArea: "axis"` en los planes nuevos (el
ajuste que hace arrancar el texto dentro de la zona también por arriba ya está aplicado). Cambiar el defecto movería
todas las piezas alineadas a la izquierda al recomponerlas.

**3 · Las stories de v07.** Ponen la firma con su centro en 0,90 de la altura, en la franja inferior que Reels tapa (la
zona de AXIS termina en 0,87), como reconoce el propio LEEME del set. Está por decidir si se aprueba como excepción
`zona-segura` con el nombre del operador o si la firma se sube al recomponer.

## Qué no hacer

- No tomes un 3 como pase.
- No inventes un aprobador ni copies `suite-pruebas` a un plan real: dentro del repositorio no vale.
- No declares una excepción sin `plate` ni, si la regla se mide, sin `hasta`.
- No uses `placement` para aflojar la medición: sólo puede endurecerla.
- No compongas en la carpeta de otra sesión para probar: copia el plan y el plate a una carpeta temporal.
- No copies el compositor a una carpeta de corrida ni escribas uno paralelo: se extiende el canónico.
- No edites el plan, el plate ni el PNG después de componer: rompe las huellas. Recompón.
- No firmes con la herramienta externa antes de certificar.
- No cambies de tratamiento del CTA para esquivar la medición ni apagues el acento: regenera el plate.
- No agregues velo para rescatar una voz: el gate lo muestra como aviso y la solución es mover el texto o regenerar el
  plate.
- No uses `subjectGuard.ignore` para tapar a una persona real ni infles `subjectProtection` para que una pieza pase.
- No repitas ids entre planes de la misma carpeta.
- No encadenes el gate detrás de `| tail` o `| grep` cuando necesitas su veredicto: el código de salida sería el del
  último comando.
- No sumes personas a `scripts/foto/aprobadores.json` sin decisión del operador y su commit.

## Problemas comunes

### Al componer

| Mensaje (fragmento) | Causa | Solución |
|---|---|---|
| `` plan inválido — <id>: falta `cta.fontSize` `` (u otro campo) | Falta un campo obligatorio o su tipo no corresponde | Completa el campo que nombra el mensaje |
| `` `<campo>` debe ser ≥ … `` o `≤ …` | Un valor fuera de rango (por ejemplo `dominantTracking`, o un lado de `final` bajo 320) | Ajusta el valor al rango |
| `` falta `cta.x` (una fracción, "columna", o `cta.align: "center"`) `` | El CTA no dice dónde arranca | `"x": "columna"` con el bloque a la izquierda |
| `«columna» es la columna del texto alineado a la izquierda` | `"columna"` en un bloque centrado | Alinea a la izquierda, o usa una fracción o `cta.align: "center"` |
| `` la nota necesita `note.gapAfterClosure` (encadenada) o `note.y` `` | Nota sin posición | Agrega uno de los dos |
| `ids repetidos` / `ids que sólo difieren en mayúsculas` | Dos piezas escribirían el mismo archivo | Renombra una |
| `no están en el plan: <ids>` | Pediste por comando ids que el plan no tiene | Revisa los ids |
| `no existe el plate` | Ruta mal escrita (es relativa al plan) o el plate no está en esta máquina | Corrige la ruta o trae el plate |
| `` el plate `…` no es una imagen legible `` | Archivo dañado, vacío o no descargado de la nube | Recupera el archivo |
| `usa caracteres que su fuente no tiene (saldrían como cuadros vacíos)` | Emoji u otro alfabeto que la fuente no cubre | Cambia el carácter |
| `trae una entidad que no es un carácter Unicode` | Un `&#…;` inválido en el texto | Corrígelo |
| `` `final` … no tiene la proporción del plate `` | El tamaño entregado recortaría la pieza | Usa la misma proporción del plate |
| `bloque centrado sobre un eje corrido (centerX …)` | Bloque centrado a más de 0,15 del centro | `align: "left"` (y `cta.align: "left"`) sin `centerX` |
| `el texto tapa al sujeto — <caja> (N px)` | Una caja toca la silueta | Sube `top`, acorta el copy o regenera el plate con más reserva |
| `el texto tapa una zona protegida` | Choca con una zona `protect` | Mueve el texto o acota la zona |
| `` el descriptor invade `subjectProtection` `` | La franja declarada a mano lo frena | Ajusta la pieza; no infles el `top`. Si la segmentación corre, la declaración no hace falta |
| `la selección del CTA se sale del lienzo — …` | Un cursor o su etiqueta queda fuera | Otra esquina para el colaborador o acerca el CTA al centro |
| `la maquetación no cumple — …` | Texto, botón, firma o selección se tocan | Cambia la esquina del colaborador, el ancla del cursor o la posición de la firma |
| `otra composición usa <carpeta>/out (proceso N)` | Otra composición corre en esa carpeta | Espera a que termine. Si ese proceso ya no existe, la próxima corrida toma el bloqueo sola |
| `⚠ no se pudo segmentar …` / `la segmentación del sujeto no corrió` | El modelo local no corrió | Revisa `pnpm install` y recompón; sin silueta la pieza no crece y no se certifica |
| `⚠ <ids>: también los registra out/qa-<otro>.json` | Otro plan de la carpeta tiene ese id | Renombra; si sigues, recompón después el otro plan, porque su gate va a fallar |
| `` ⚠ N pieza(s) eligen variante de CTA sin `cta.variantReason` `` | Falta el motivo del tratamiento | Escríbelo, o usa `variant: "auto"` con `prominencia` |
| `⚠ campos que este comando no lee — …` | Un campo mal escrito en la raíz de la pieza | Corrígelo: así se perdió `centerX` en el pasado |
| `` ⚠ … `logo.y: "auto"` no encontró en la banda del pie … `` | No hay una altura legible debajo del texto | Acorta o sube el texto, fija `logo.y` o usa un plate con el lecho más oscuro o más claro |
| `⚠ … la firma queda sobre el sujeto` | La firma cae sobre la silueta | Ajusta `logo.y`/`logo.x`; el gate lo bloquea |
| `⚠ … el dominante mide N× la entrada` | Jerarquía bajo 3× | Sube `dominantSize` o baja `leadSize`, o acorta el titular |
| `` declara `gesture` y la fuente Guttery no está en … `` | Falta la fuente del gesto | Instálala o quita el gesto (el gesto no se certifica) |
| `pieza muda (sin texto)` / `` falta `cta` `` | Pieza sin texto o sin CTA | Usa `pnpm foto:componer` |
| `la tarjeta de vidrio con línea naranja fue puntual del post de GTA VI` | `card` sin `allowGtaCard` | Usa `note` |

### Al certificar

| Mensaje (fragmento) | Causa | Solución |
|---|---|---|
| `uso: pnpm foto:cta:gate <plan.json> [--reproducir]` | Falta la ruta del plan (código 2) | Pásala |
| `no existe …/out/qa-<plan>.json` | Ese plan no se compuso | Compón primero |
| `… es del formato anterior (compartido y sin huellas)` | Registro viejo (`out/qa.json`) | Recompón con el comando vigente |
| `… es anterior al plan` | Registro viejo y el plan cambió después | Recompón y resuelve su error |
| `piezas del plan sin QA (no se compusieron)` | Una composición abortó antes de llegar a ellas | Resuelve el error y recompón |
| `0 piezas evaluadas` | Ninguna pieza del plan está en el registro | Compón ese plan |
| `el plan de la pieza cambió después de componer` | Editaste la pieza en el plan | Recompón esa pieza (el gate imprime el comando) |
| `el plate cambió después de componer` | La foto se regeneró o se reemplazó | Recompón y vuelve a aprobar las excepciones con la huella nueva |
| `` `out/<id>.png` no es el PNG que registró la composición `` | El PNG se modificó o ya se firmó | Recompón; si lo firmó la herramienta externa, certifica antes de firmar |
| `` `out/<id>.png` mide W×H y el plan pide W×H `` | El tamaño entregado cambió | Recompón |
| `el QA no trae la huella del layout` / `no dice cómo se midió` / `no trae la medición del trazo` | Se compuso con una versión anterior del comando | Recompón |
| `` la segmentación del sujeto no corrió (`guardaSujeto: sin-mascara`) `` | La pieza se compuso sin silueta | Recompón cuando la segmentación funcione |
| `CTA X:1 < 4.5:1` / `descriptor X:1 < 4.5:1` | Poco contraste en la caja | Mueve el texto, cambia tinta o acento, prueba `variant: "auto"` o regenera el plate |
| `«<voz>» mide X:1 y necesita Y:1` | Una voz bajo WCAG según su tamaño en el teléfono | Igual que arriba |
| `el 1 % peor del trazo mide …` | Parte de las letras cae sobre una zona que no contrasta | Mueve el texto, protege la zona con `protect` o regenera el plate |
| `en un teléfono el borde del CTA mide … CSS px` | El borde del contorno es muy fino o no contrasta | Recompón con el comando vigente; cambia el acento o el tratamiento |
| `relleno vs escena X:1 < 3:1 — el botón se funde con la foto` | El relleno se parece a la foto | Otro acento, o `variant: "auto"` |
| `el CTA no alcanza el piso perceptual — …` | APCA o daltonismo del CTA bajo su piso | `variant: "auto"`, otra tinta u otro acento |
| `` `surfaceToken: X` no es un acento `` (o `inkToken` en texto) | El portador del acento tiene un color neutro | Usa `accentSurface`, `growthOnDark` o `accentInkOnLight` |
| `fuera de la zona segura <perfil> de AXIS: …` | Algo sale de la zona de AXIS | Declara `safeArea: "axis"`; si ya está, acorta el texto, baja su tamaño o sube el bloque |
| `la pieza no declara firma` | Falta `logo` o `firma` | Declara una |
| `la firma mide N % del lado corto (canon: 20 %)` | Firma chica | `logo.width: 0.2` |
| `la firma mide X:1 contra su fondo` / `el 1 % peor del trazo de la firma …` | La firma no contrasta | Prueba `logo.y: "auto"` |
| `la firma queda sobre el sujeto` / `la firma externa cae sobre el sujeto` | La firma tapa la silueta | Cambia su posición |
| `la firma automática quedó por encima del contenido` | Error del compositor; no se exceptúa | Recompón con el comando vigente y avisa al responsable del comando |
| `falta la entrada` / `falta el cierre que remata` | Concepto incompleto | Agrega la voz, o `conceptoReducido` con aprobador |
| `el dominante mide N× la entrada (regla de las tres veces: ≥ 3×)` | Jerarquía plana | Sube `dominantSize`, baja `leadSize` o acorta el titular |
| `el dominante (N px) no es la voz mayor` | Otra voz es más grande que el titular | Ajusta los tamaños |
| `fuera de la reserva editorial` | El texto pasa la reserva del plan | Acota el texto o corrige la reserva |
| `la excepción «…» no vale: «x» no está en el registro de aprobadores` | Aprobador no registrado | Pide la aprobación a alguien del registro |
| `` … se aprobó para otro plate … declara `plate: "<sha>"` `` | Falta la huella del plate o el plate cambió | Si se re-aprueba, copia la huella que imprime el gate |
| `` no declara `hasta`, el valor que aprueba (hoy la medida es N) `` | Falta el valor aprobado | Pide la aprobación de ese valor y decláralo |
| `la medida (X) va más allá de lo aprobado` | La pieza empeoró respecto de lo aprobado | Corrige la pieza o vuelve a pedir aprobación |
| `pieza SIN firma sin aprobador del registro` / `concepto REDUCIDO sin aprobador …` / `zona del sujeto ignorada … sin aprobador` | Salida sin medir sin aprobador válido | Declara `aprobadoPor` con alguien del registro |
| `⊘ … se compuso con otra versión del comando` | El comando cambió desde la composición | `--reproducir`; si no calza, recompón |
| `⊘ … la máscara del sujeto salió de una caché ajena al repo` | Se compuso con `FOTO_MASCARAS_DIR` | `--reproducir` |
| `⊘ … lleva gesto manuscrito` / `lleva tarjeta` | Elementos que ninguna guarda mide | No se certifica hoy; quita el elemento si necesitas la certificación |

### Al reproducir y en los demás comandos

| Mensaje (fragmento) | Causa | Solución |
|---|---|---|
| `la reproducción no compuso: …` | El comando vigente aborta con esa pieza | Compón normalmente para ver el error completo y resuélvelo |
| `lo entregado no es lo que produce el comando vigente: out/<id>.png …` | La pieza cambia con el comando vigente, o ya se firmó | Recompón y vuelve a mirar la pieza |
| `` no existe … corre `pnpm foto:componer:cta …` primero `` (reporte de accesibilidad) | No hay registro | Compón primero |
| `no existe el manifiesto de cobertura …` (regresión) | Falta `scripts/foto/componer-cta.cobertura.json` | Genéralo con `--actualizar-cobertura` |
| `⛔ Faltan piezas del manifiesto de COBERTURA` (regresión) | Un plan se movió o un plate ya no está en esta máquina | Trae el plate; si el cambio fue a propósito, `--actualizar-cobertura` |
| `⚠ Cambiaron activos que la referencia hermética no cubre` (regresión) | Cambiaron fuentes, logos o paquetes desde la referencia | Compara esas piezas a ojo: la regresión no puede ver esa diferencia |

## Si vas a cambiar el comando

Antes de modificar el compositor, el gate o sus módulos, corre las tres redes:

```bash
pnpm foto:componer:cta:regresion                      # HEAD contra tu árbol de trabajo
pnpm foto:componer:cta:regresion --solo cmp002        # sólo los planes cuya ruta contiene el texto
pnpm foto:componer:cta:regresion --ref <commit>       # contra otra versión
pnpm foto:componer:cta:pruebas                        # las 10 pruebas de punta a punta
pnpm foto:componer:cta:pruebas --solo P01,P10         # algunas
pnpm foto:componer:cta:mutantes                       # puntuación de mutantes
```

- **Regresión:** compone todas las piezas con CTA del repositorio con las dos versiones, así que es una corrida larga.
  Si el cambio no debería alterar nada, tiene que salir sin diferencias de estado, layout, píxeles ni veredicto del
  gate. Si altera algo,
  el reporte dice qué piezas y cuánto, y eso se aprueba mirando las piezas. Categorías: 🔴 estado · 🟠 layout o
  registro · 🟡 sólo píxeles · 🟣 avisos · ⛔ veredicto del gate · ⚪ mensaje de error · 🔵 el registro suma claves
  (informativo). Por defecto borra las piezas iguales al terminar; `--conservar` las guarda todas.
- **Pruebas:** corren en una carpeta temporal y, al terminar, dejan sólo el reporte (`reporte.md` y `reporte.json`, en
  la ruta que imprimen); `--conservar` guarda todo.
- **Mutantes:** rompen a propósito cada guarda y exigen que alguna prueba falle por la razón esperada, comparando contra
  una corrida base sin mutante. Toda guarda nueva lleva su mutante.

## Referencias técnicas

- Documentación funcional: [Compositor de piezas con CTA](../../documentation/creative/compositor-piezas-cta.md).
- Contrato: [EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md](../../operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) (§14
  guarda de sujeto, §15 red de seguridad, §16 accesibilidad, §17 variantes, §18 certificación y tramos).
- Regla creativa: [Tres voces + acción](../../operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md).
- Plate: [reserva de espacio](../../operations/brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) y
  [texto y formatos](../../operations/brand-photography/EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md).
- Código: [`componer-cta.mjs`](../../../scripts/foto/componer-cta.mjs) ·
  [`componer-cta.gate.mjs`](../../../scripts/foto/componer-cta.gate.mjs) ·
  [`cta-esquema.mjs`](../../../scripts/foto/cta-esquema.mjs) · [`accesibilidad.mjs`](../../../scripts/foto/accesibilidad.mjs) ·
  [`cta-variantes.mjs`](../../../scripts/foto/cta-variantes.mjs) · [`cta-integridad.mjs`](../../../scripts/foto/cta-integridad.mjs) ·
  [`aprobadores.json`](../../../scripts/foto/aprobadores.json).
- Skill de agentes: [`efeonce-advertising-creative`](../../../.claude/skills/efeonce-advertising-creative/SKILL.md).
- Manual vecino: [usar reglas publicitarias con Codex y Claude](usar-reglas-publicitarias-con-agentes.md).
