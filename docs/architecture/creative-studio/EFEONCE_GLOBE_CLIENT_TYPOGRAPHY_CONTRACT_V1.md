# Globe Client Payload — Contrato de Tipografía V1

> **Tipo de documento:** Contrato técnico (SSOT del uso tipográfico del payload cliente de Globe)
> **Version:** 1.1
> **Creado:** 2026-07-29 por Claude (sesión de tipografía del payload · `TASK-1485` / ADR-016)
> **Última actualización:** 2026-07-29 por Claude — §6 pasa de riesgo abierto a **resuelto**: el `bolder` del
> UA está neutralizado en `@layer base` (`403d346`), medido contra el runtime vivo. La categoría de defecto
> (lo que entra por el nombre del elemento es invisible a un gate de `className`) sigue viva y se conserva
> **Ámbito:** `efeonce-globe/apps/studio-client/**` — composer, shell Producer, diálogos, feed, viewer,
> share board y toda superficie futura del payload cliente
> **ADR gobernante:** [ADR-016 — Motor de estilos del payload cliente](EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md)
> **Contrato hermano:** [Contrato de Motion V1](GLOBE_CLIENT_MOTION_CONTRACT_V1.md)
> **Evidencia:** commits `68a2cbe`, `d009871`, `b9112a8` y `403d346` — los cuatro desplegados a
> `globe-studio-internal` (revisión viva `globe-studio-internal-00101-x2d`, verificada con
> `gcloud run services describe`) y revisados en vivo en `https://globe.efeoncepro.com/producer` con sesión
> real el 2026-07-29

---

## Por qué este documento existe, y por qué no es un Delta más en ADR-016

ADR-016 gobierna el **motor**: Tailwind v4, el `@theme` generado desde `tokens.ts`, los namespaces vaciados,
la prohibición del valor arbitrario. Todo eso es una decisión sobre **cómo se declara** un valor de diseño.

Lo que este documento gobierna es distinto en clase: **cómo se usa** un valor ya declarado correctamente. El
defecto que lo motiva no es un valor mal declarado — `--weight-display: 700` es legítimo y siempre lo fue,
porque Poppins carga 700. El defecto vive en la **frontera token↔uso**: ese mismo 700 llega al markup como
`font-bold` y se escribió sobre elementos **Geist**, que no carga 700. Ningún gate de ADR-016 podía verlo,
porque todos validaban la **declaración** y ninguno el **sitio de uso**.

Un Delta habría metido un contrato de uso adentro de una decisión de motor, en un documento que ya lleva tres
Deltas y ~20 KB. La forma elegida es **combinada, y deliberadamente asimétrica**:

| Dónde | Qué va | Por qué ahí |
|---|---|---|
| **Este documento** | el contrato completo de uso: regla dura, vocabulario, gates, frontera, riesgo abierto, decisión de audiencias, tokens nuevos | es un contrato **encima** del motor, con la misma relación que el contrato de motion tiene con ADR-014 — y hay precedente exacto en el directorio |
| **Delta en ADR-016** | el hallazgo de **motor** que la sesión produjo (la frontera token↔uso como clase de defecto que el motor no cubre) + el puntero a este documento | ADR-016 debe registrar el límite de su propio alcance; quien lea sólo el ADR tiene que enterarse de que existe una capa que no está ahí |

El precedente manda: `GLOBE_CLIENT_MOTION_CONTRACT_V1.md` ya resolvió exactamente esta tensión para motion —
contrato de uso separado, ADR gobernante citado en el encabezado. Tipografía es el mismo caso.

> ⚠️ **Nota de nombre.** El hermano de motion se llama `GLOBE_CLIENT_MOTION_CONTRACT_V1.md` (sin prefijo
> `EFEONCE_`). Este archivo lleva el prefijo porque así fue nombrado en el encargo y varios documentos
> vecinos ya lo enlazan por ese nombre; romper los enlaces cuesta más que la inconsistencia. Si alguna vez
> se normaliza el naming del directorio, los dos se mueven juntos.

## Fuente de los valores

**Medidos y verificados en vivo el 2026-07-29**, no estimados ni recordados. Cada afirmación de este
documento tiene su `file:line` en `efeonce-globe` o su medición de browser. Donde algo es una decisión y no
una medición, se dice.

---

## 1 · El contrato base: tres cortes, y nada más

`GLOBE_FONT_FACES` (`apps/studio-client/src/tokens/tokens.ts:682`) carga **exactamente tres archivos**:

| Familia | Peso | Archivo | Utilidad de familia |
|---|---|---|---|
| **Poppins** | 700 | `/assets/fonts/poppins-bold.ttf` | `font-display` |
| **Geist** | 400 | `/assets/fonts/geist-regular.ttf` | `font-body` (heredada) |
| **Geist** | 600 | `/assets/fonts/geist-semibold.ttf` | `font-body` (heredada) |

De ahí salen los tres tokens de peso, y el docblock del SSOT ya lo dice: *no hay token de 500 ni de 800
porque no hay archivo de 500 ni de 800*.

```ts
'--weight-regular': '400',   // → font-regular
'--weight-semibold': '600',  // → font-semibold
'--weight-display': '700',   // → font-bold   ← el alias que produjo el defecto
```

**La familia por defecto del payload es Geist.** Se declara una sola vez, en
`styles/tailwind.css` → `html { font-family: var(--font-body) }`, y por herencia cubre el ~95 % de la
superficie. Poppins sólo aparece donde alguien escribe `font-display` explícitamente.

### El defecto que definió el contrato

**Trece sitios pedían Geist@700.** El navegador no rechaza un peso que la familia no carga: lo **sintetiza**,
cizallando el corte de 600 para simular el 700. El resultado embarra el trazo a tamaño, **renderiza,
shippea, y pasaba todos los gates**.

La distribución importa más que el número: **cinco de los trece eran reglas `.pf__*` en
`styles/tailwind.css`**, no JSX. O sea, la mayoría del defecto vivía en la hoja, en el dialecto
`font-weight: var(--weight-display)` dentro de un bloque que declaraba `font-family: var(--font-body)` dos
líneas más arriba. Los otros incluían los tres KPI de crédito del header y el rótulo del stepper del
composer.

### Por qué ningún gate lo veía

El gate que existía —`never names a font weight no family loads`— colapsaba las tres caras en un solo
conjunto de números:

```ts
const loaded = new Set(GLOBE_FONT_FACES.map(face => String(face.weight)));  // { '700', '400', '600' }
```

**Era ciego a la familia.** `--weight-display: 700` pasa porque *alguna* familia carga 700; Tailwind lo
expone después como `font-bold`, aplicable a cualquier elemento. El gate validaba la declaración y la
declaración estaba bien.

Ese gate **no se retiró**: sigue atrapando el error más barato —un `--weight-800` que ninguna familia
carga—. Lo que se agregó es la otra mitad.

---

## 2 · La regla dura

> **`font-bold` sólo puede escribirse junto a `font-display`.**
> Cualquier peso debe ser cargable por la familia declarada **al lado** de él; un bag o bloque que no
> declara familia se resuelve contra la heredada (Geist).

Es una regla de **co-declaración**, no una predicción de render, y la diferencia es deliberada: la familia
**hereda**, así que la familia real de un elemento puede venir de un ancestro que un escaneo estático no ve.
Exigir que la familia se nombre junto al peso es lo único que hace la pareja auditable. El costo es que un
`font-bold` legítimo bajo un ancestro `font-display` ahora tiene que decir `font-display` sobre sí mismo —
una palabra, a cambio de una regla sin adivinanza adentro.

### Por qué `font-display` sin peso se ve bien, y aun así no es lo correcto

**La síntesis sólo va hacia más pesado, nunca hacia más liviano.** Poppins carga un solo corte (700); el
font-matching de CSS lo elige para cualquier peso pedido y no sintetiza nada. Por eso un
`<h1 className='font-display …'>` sin peso declarado **no es un defecto de render**.

Sí es un defecto de **intención**: se apoya en el matching del navegador en vez de declarar. El gate lo deja
pasar a propósito y lo dice en su propio código — un gate que reporta código correcto se termina apagando, y
ese archivo ya carga esa lección dos veces.

---

## 3 · Las cuatro utilidades que existen — y las dos que no emiten nada

El `@theme` generado hace `--font-weight-*: initial` y después repuebla **sólo** lo que declara el SSOT. La
consecuencia exacta:

| Utilidad | ¿Emite CSS? | Resuelve a |
|---|---|---|
| `font-display` | ✅ | familia Poppins |
| `font-bold` | ✅ | `700` (alias de `--weight-display`) |
| `font-semibold` | ✅ | `600` |
| `font-regular` | ✅ | `400` |
| **`font-normal`** | ❌ **ni un byte** | — |
| **`font-medium`** | ❌ **ni un byte** | — |

`font-normal` y `font-medium` son el vocabulario por defecto de Tailwind, y el theme lo borró. Son **clases
muertas silenciosas**, y ése es el modo de falla más caro del motor —el mismo que ADR-016 documenta para los
namespaces vaciados—: el autor cree que declaró un peso, **no se declara nada**, el elemento hereda, y a
menudo lo heredado coincide por casualidad con lo que quería. Así es como sobreviven a la review.

Un valor equivocado se ve. Éste no deja rastro.

---

## 4 · Los dos gates nuevos, y de dónde sacan su autoridad

Ambos viven en `apps/studio-client/src/gates/design-contract.test.ts` y están **verdes** desde `d009871`.

### 4.1 · `never asks a family for a cut it does not load`

Resuelve la familia **en el sitio de uso** y la aparea contra `GLOBE_FONT_FACES` **agrupado por familia**.

Cubre **los dos dialectos**, porque el defecto apareció en los dos:

| Dialecto | Unidad de escaneo | Cómo se resuelve la familia |
|---|---|---|
| `.tsx` | el **bag de clases** = un string literal (incluye multilínea y cada rama de un ternario, que son dos bags porque nunca caen en el mismo elemento) | la utilidad `font-*` de familia dentro del bag, o la heredada |
| `.css` | el **bloque de regla** (el `{ … }` más interno) | `font-family: var(--font-*)` en el mismo bloque, o la heredada |

**La autoridad se deriva, nunca se lista:**

- las **familias** salen de los tokens `--font-*` del SSOT;
- los **pesos** salen de los tokens `--weight-*` mapeados por **`themeKeyFor`** — la misma función que
  genera el theme, así que el alias `display → bold` se honra en vez de re-derivarse a mano;
- los **cortes cargables** salen de `GLOBE_FONT_FACES`;
- la **familia heredada** se **lee** de `styles/tailwind.css` (`INHERITED_FAMILY_RULE` sobre
  `html { … font-family: var(--font-<x>) }`) en vez de hardcodearse, y el gate **lanza con explicación** si
  esa regla desaparece.

La propiedad que esto compra: **agregar `geist-bold.ttf` al manifiesto haría que el gate deje de quejarse por
ese solo acto.** No hay lista que alguien tenga que acordarse de actualizar.

**Frontera declarada del propio gate:** un bag armado por **concatenación** (`FAMILY_CLASSES + ' font-bold'`)
se lee como dos bags, así que la mitad del peso se juzga contra la familia heredada. Es la dirección
**estricta** —puede pedir un `font-display` que ya está, nunca dejar pasar uno que falta— y hoy ningún call
site se escribe así.

### 4.2 · `never writes a font utility the theme cannot generate`

Cierra el §3: cualquier `font-<x>` que no sea una familia ni un peso del SSOT es una clase muerta. El
conjunto válido **se deriva** de los mismos tokens por el mismo `themeKeyFor` — un token agregado mañana es
utilidad legal acá sin editar el archivo.

### 4.3 · La corrección de `withoutComments` que hacía mentir a los dos

Los gates blanquean comentarios para no reportar un ejemplo documentado como violación. La implementación
anterior los **borraba**, y **borrar un bloque borra sus saltos de línea**: todo `file:line` reportado después
de un comentario venía **corrido**. Además unía el texto de ambos lados, fabricando coincidencias que no
existen en ninguna línea del fuente.

Ahora se sobrescriben con espacios, preservando offsets exactos. Un gate que reporta la línea equivocada no
es un gate a medias: es un gate que envía a la persona a leer código correcto.

---

## 5 · 🔴 La frontera declarada del escaneo — y la descripción honesta de la cobertura

Los gates escanean **`apps/studio-client/src` y nada más**. Eso es la frontera de un **paquete**, y la
responsabilidad que cuidan es más ancha: `apps/studio-web` todavía tiene `producer-ui.ts`, `ui.ts` y
`public-share-ui.ts`, y **ahí viven los 184 hex crudos y las cuatro familias tipográficas literales**. Nada
impide agregar uno más hoy.

**La frontera no se amplía todavía, y el motivo es mecánico, no de gusto:** con los módulos legacy presentes,
un escaneo de `studio-web` **falla por construcción**. Un gate rojo al llegar se termina saltando, y un gate
saltado es peor que uno ausente — se lee como cobertura.

> **La descripción honesta del estado es: el payload nuevo no puede driftear; el legacy no está mirado.**

`TASK-1560` Slice 2 amplía el barrido a `apps/studio-web/src/**` **inmediatamente ANTES** de borrar esos
módulos, en ese orden y nunca al revés. Hacerlo después dejaría una ventana en la que un template de string
nuevo se escribe en un paquete que ningún gate mira — exactamente el agujero que todo este programa existe
para cerrar.

---

## 6 · ✅ Resuelto 2026-07-29: el `bolder` del UA — y la categoría de defecto que sigue viva

**La instancia está cerrada en `@layer base` (`403d346`, desplegado y medido contra el runtime vivo). La
categoría de defecto no, y por eso este bloque se reescribe en vez de borrarse.**

### 6.1 · El diagnóstico — por qué la regla existe

El proyecto **no emite el preflight de Tailwind** — decisión deliberada de ADR-016, porque adoptarlo sería un
segundo reset global aplicado de golpe a superficies que conviven. La consecuencia era que la hoja del
navegador aplicaba sin oposición:

```css
b, strong { font-weight: bolder }
```

`bolder` es **relativo al peso heredado**, no absoluto:

| Contexto del `<strong>` | Computa | Corte de Geist pedido | Resultado |
|---|---|---|---|
| dentro de un contenedor a `400` | **700** | no existe | faux bold |
| dentro de un contenedor a `600` | **900** | no existe | faux bold |

En los dos casos se pedía un corte que Geist no carga, **sin que ninguna clase lo dijera**. El gate escanea
`className` y bloques de regla; un elemento HTML que hereda un peso del UA le era **estructuralmente
invisible** — el peso entraba por el **nombre del elemento**, no por una clase. Era el único defecto
tipográfico de esta superficie que ningún gate podía ver.

**Apareció tres veces el mismo día, en sitios sin relación entre sí:** el riel del composer, el centro del
donut de créditos y la paleta de comandos. Los tres se corrigieron declarando el peso — y el código dejó
escrito el porqué en el sitio (`ProducerComposer.tsx:2252`: *«`font-semibold` es EXPLÍCITO, y no es
redundante con el `<strong>`: esta superficie corre SIN preflight»*). Quedaban al menos seis `<strong>` más
en el payload cayendo en `bolder`, entre ellos `ProducerHeader.tsx:315`, `:333`, `:560`, `:646`,
`ProducerViewer.tsx:179` y `ProducerComposer.tsx:1648`.

### 6.2 · El cierre — `403d346`, la salida 1 de las tres que este bloque describía

`apps/studio-client/src/styles/tailwind.css`, dentro de `@layer base`, justo después del reset de
`box-sizing`:

```css
b,
strong {
  font-weight: var(--weight-semibold);
}
```

Neutralizar `b, strong` con un peso declarado del SSOT era la salida barata y global. No se adoptó preflight
—sigue siendo la decisión de ADR-016 que se toma cuando migre la última superficie— ni se construyó el gate
estructural: **la regla hace innecesario el gate para este caso**, porque ya no hay peso que el UA pueda
inyectar por detrás.

**Por qué 600 y no `inherit`:** `inherit` mata el énfasis y `<strong>` dejaría de significar algo. 600 es un
corte que existe y conserva el contraste contra el 400 heredado.

**Evidencia medida contra el runtime vivo**, no supuesta — `https://globe.efeoncepro.com/producer`, revisión
`globe-studio-internal-00101-x2d` sirviendo `403d346`, consultando `getComputedStyle` sobre los 25 elementos
`<strong>`/`<b>` de la página:

```text
Geist@600   × 24   ← corte real
Poppins@700 ×  1   ← corte real
SINTETIZADOS: []
```

### 6.3 · La consecuencia vigente: el énfasis sobre Geist topa en 600

**Esto es regla, no nota al pie.** Un `<strong>` dentro de un contenedor que ya está en 600 se ve **igual que
su padre** — no hay un escalón más porque **no hay archivo**. Geist carga 400 y 600, y nada más.

Si de verdad hace falta más peso, el camino es **`font-display` (Poppins 700)**, no pedirle a Geist un corte
que no tiene. Pedirlo devuelve el problema original por otra puerta: síntesis silenciosa.

### 6.4 · Lo que NO se cerró: la categoría

La instancia murió; **la clase de defecto sigue siendo verdadera**. Lo que entra por el **nombre del
elemento** —un default del user agent— es invisible a un gate que lee clases. Si un elemento HTML futuro trae
otro default del UA que pida un corte inexistente (`h1`–`h6` y `th` son los candidatos obvios; hoy el reset
del proyecto los cubre por otra vía), **el mismo agujero reaparece con los gates verdes**.

La salida 3 —un gate estructural que escanee elementos con peso implícito del UA y exija peso declarado— es
la única que ataca la clase completa, sigue sin construirse y sigue siendo la más cara. Está en Open
questions como lo que es: una decisión pendiente sobre una categoría, **no un defecto vivo**.

---

## 7 · Las dos audiencias — decisión, no deuda

Globe sirve dos superficies con **costos de error distintos**, y una sola escala para ambas obliga a elegir
cuál se perjudica:

| Superficie | Quién la lee | Cuánto tiempo | Piso tipográfico |
|---|---|---|---|
| **Consola interna** (Producer) | un operador de Efeonce | todo el día, en un equipo conocido | densidad de 9–11 px defendible, **medida y aprobada por el operador en `TASK-1552`** |
| **Client-facing** (share board, entregables) | un cliente | **una vez**, en un dispositivo desconocido, para juzgar trabajo | **14 px supplementary / 16 px body**, sin excepción |

**El gate no puede distinguirlas.** No hay señal estática que separe «rótulo de control en consola interna»
de «texto que un cliente va a leer». Así que la restricción vive donde sí se puede sostener: en los
**docblocks de los tokens** y en la review.

Tres pasos de la escala llevan **prohibición escrita en el SSOT**:

| Token | Valor | Prohibición literal en `tokens.ts` |
|---|---|---|
| `--text-micro` | `0.5625rem` = **9 px** | *«metadata MÍNIMA adosada a un control. **PROHIBIDO en texto de lectura y client-facing**»* |
| `--text-2xs` | `0.625rem` = **10 px** | *«Chips SOBRE el media, y sólo eso. **PROHIBIDO en superficie client-facing y en texto de lectura**»* |
| `--text-meta` | `0.6875rem` = **11 px** | etiqueta/ayuda/disponibilidad **dentro de** un control |

**La medición del composer (2026-07-29):** 76 apariciones de tokens de tamaño, **84 % por debajo de 14 px**,
con `text-meta` (11 px) dominante. Eso **no** es el defecto — es la densidad aprobada de una consola.

**Lo que sí era defecto, y se corrigió:** un token de **rótulo** usado como **prosa**. La distinción es la
que sostiene todo el bloque: 9 px pegado a un control que ya se entiende sin él es *confirmar*; 9 px en una
frase que hay que leer es *castigar al lector*. Los docblocks del SSOT están escritos en esos términos a
propósito, porque son los términos en que la review puede decidir.

---

## 8 · Tokens y primitives que nacieron con este contrato

### 8.1 · `--rail-scrim` — y por qué NO se consolida con `--media-scrim`

`tokens.ts:370` · `linear-gradient(180deg, transparent, rgba(5,13,40,.72) 55%, rgba(5,13,40,.94))`

El riel de gasto es translúcido (`--rail` al 58 % + blur) porque su autor razonó que *«en desktop el panel
está acotado, nada pasa por detrás»*. **Esa premisa se rompió** cuando las acciones del prompt bajaron al
flujo y el contenido pasó a desbordar: un renglón quedaba **cortado por la mitad**, con la mitad de arriba
nítida — el peor síntoma posible, porque parece contenido y no lo es.

Espeja `--media-scrim` (`tokens.ts:178`) y **deliberadamente no se consolida con él**:

| Token | Va sobre | Tiene que |
|---|---|---|
| `--media-scrim` | media de **color desconocido** | **tapar cualquier cosa** |
| `--rail-scrim` | **superficie conocida** | sólo **fundirse** con ella |

Dos requisitos distintos que hoy coinciden en forma. Unificarlos ataría el degradado del riel al peor caso de
una imagen arbitraria, que es más oscuro del que la superficie necesita.

### 8.2 · `format/credits.ts` — `creditReadout`

Formateador de magnitudes de crédito con `Intl.NumberFormat('es-CL')`, anclado al locale del **producto** y
no al del navegador (misma decisión que `date.ts`, y por la misma razón: el separador de miles de `es-CL` es
el punto, y un lector con el navegador en inglés leyendo `500,444` entendería cuatro órdenes de magnitud
menos de los que tiene).

**Dos formas, no una**, porque un panel tiene slots de anchos muy distintos:

- **`formatCredits`** — la exacta, y la que manda. Va en el encabezado del saldo (~244 px), donde la cifra
  exacta **debe** estar, porque es dinero.
- **`creditReadout`** — la del slot angosto. Devuelve el texto a pintar, el exacto para el `title` y el
  `sr-only`, y una bandera para que quien llama sepa si abrevió.

**El valor exacto nunca se pierde:** sigue en el encabezado, en el tooltip y en el lector de pantalla.

**El umbral (`CREDITS_COMPACT_THRESHOLD = 1_000_000`) está medido, no elegido por redondo.** El panel mide
352 px y se acota al viewport; a 320 px queda en 288 px. Descontando padding (32), gaps (16) y borde+padding
por celda (18), a cada columna le quedan **~62 px**. Un dígito tabular de Geist a 14 px avanza ~8,4 px y el
punto ~4,9 px: el peor caso bajo el millón (`999.999`) ocupa ~55 px y entra; el séptimo dígito
(`1.000.000`, ~69 px) ya no.

**Su test afirma un presupuesto de caracteres, no un formato bonito:** barre `0 → 1e12` y falla si alguna
forma pasa de **7 caracteres**. Un test del string exacto se rompe con cada ajuste de locale y no prueba lo
que importa; el presupuesto prueba exactamente la propiedad que evita que el panel se rompa.

---

## Reglas duras

- **NUNCA** escribir `font-bold` sin `font-display` en el mismo bag o bloque. Geist carga 400 y 600; pedirle
  700 lo **sintetiza**, y eso renderiza, shippea y pasaba todos los gates.
- **NUNCA** escribir `font-normal` ni `font-medium`. **No emiten CSS.** El theme borró el vocabulario por
  defecto de Tailwind y el SSOT sólo repuebla `regular` / `semibold` / `bold`.
- **NUNCA** declarar un peso en `.css` sin declarar la familia en el **mismo bloque de regla**. Cinco de los
  trece sitios del defecto original vivían en la hoja, no en JSX.
- **NUNCA** convertir un gate en una lista escrita a mano. La autoridad se deriva de `GLOBE_FONT_FACES`, de
  los tokens del SSOT y de `themeKeyFor` — agregar un `.ttf` al manifiesto tiene que bastar para que el gate
  deje de objetar.
- **NUNCA** describir la cobertura de los gates sin su frontera. La frase correcta es *«el payload nuevo no
  puede driftear; el legacy no está mirado»*, y la ampliación va **antes** del borrado de `studio-web`,
  nunca después.
- **NUNCA** usar `--text-micro` (9 px), `--text-2xs` (10 px) ni `--text-meta` (11 px) en superficie
  client-facing ni en texto de lectura. Son rótulos adosados a un control, y el gate **no** puede
  distinguir la audiencia por ti.
- **NUNCA** consolidar `--rail-scrim` con `--media-scrim`. Coinciden en forma y difieren en requisito: uno
  tapa lo desconocido, el otro se funde con lo conocido.
- **NUNCA** perder el valor exacto de una magnitud de crédito. Abreviar es una decisión de **slot**; el
  exacto vive siempre en encabezado, `title` y `sr-only`.
- **NUNCA** pedir más peso que 600 en un `<strong>`/`<b>` sobre Geist. Desde `403d346` la base los declara en
  `var(--weight-semibold)`, así que **el énfasis topa ahí**: dentro de un contenedor que ya está en 600 se ve
  igual que su padre, porque no existe el archivo. Si hace falta más, el camino es **`font-display`
  (Poppins 700)** — no pedirle a Geist un corte que no carga (§6.3).
- **SIEMPRE** verificar qué peso inyecta el UA antes de introducir un elemento HTML nuevo con default propio.
  Esta superficie corre **sin preflight** por decisión de ADR-016: lo que entra por el **nombre del elemento**
  es invisible a un gate que lee `className`. `b`/`strong` ya están neutralizados en `@layer base`; cualquier
  otro reabre la categoría con los gates verdes (§6.4).
- **SIEMPRE** blanquear comentarios en un gate, nunca borrarlos: borrar un bloque borra sus saltos de línea y
  todo `file:line` posterior queda corrido.

> ⚠️ **Advertencia para quien copie un ejemplo de este documento al repo del payload.** Acá
> (`greenhouse-eo`) es seguro escribir `font-normal` o `text-[#4db8ff]` como ejemplo. **En
> `efeonce-globe/apps/studio-client/**` no lo es:** Tailwind lee los `.ts` como texto plano y **no ignora
> comentarios**, así que un anti-patrón documentado dentro del árbol escaneado **se materializa como clase
> real** y viaja en la hoja servida. Ya pasó una vez, con los ejemplos del propio `design-contract.test.ts`;
> se cerró con `@source not` sobre los tests (`91432ed`). Es un invariante de ADR-016, no una curiosidad.

## Open questions

- **¿Un gate estructural para los defaults del UA (§6.4)?** El `bolder` de `b`/`strong` está cerrado en
  `@layer base`, pero la **categoría** sigue abierta: un elemento HTML con peso implícito del user agent es
  invisible a cualquier gate que lea `className`. La salida 3 —escanear elementos con peso implícito y exigir
  peso declarado— ataca la clase completa y no está construida. Hoy el mecanismo es el reset, que cubre los
  elementos que conocemos, no los que alguien introduzca después.
- **¿Cargar `geist-bold.ttf`?** Resolvería §2 y el techo de 600 de §6.3 de un golpe y el gate dejaría de objetar por ese solo
  acto. El costo es un cuarto archivo de fuente en el payload y una decisión de dirección de arte que no se
  tomó: hoy el 700 es **de Poppins**, y eso es lo que separa display de body. Cargar Geist 700 borra esa
  separación por accidente si nadie la defiende.
- **La escala de dos audiencias (§7).** Hoy es una escala con prohibiciones en docblocks. La alternativa
  —dos escalas nombradas, `console` y `client`, con el gate exigiendo la correcta por superficie— es más
  fuerte y no está diseñada. Se vuelve urgente cuando exista la segunda superficie client-facing; hoy es
  una sola (`/shares/:shareId`).
- **Promoción de `creditReadout` a primitive.** Hoy es un formateador con un consumer. Una primitive con un
  consumer es una hipótesis, no una primitive — la misma regla que se aplicó a las seis del share board.
