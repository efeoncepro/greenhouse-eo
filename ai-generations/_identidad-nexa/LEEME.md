# Nexa — identidad canónica

**Esto es lo vigente. Si vas a generar cualquier cosa con Nexa, sale de aquí.**

No es una carpeta de corrida: las que llevan fecha (`2026-09-17_…`, `2026-09-20_…`, `2026-09-21_…`) son el
histórico de cada sesión y no se tocan, salvo el set de ocho ángulos grises confirmado el 2026-09-24 en
`2026-09-20_identidad-julio-nexa/set-identidad/angulos/`. Ésta conserva las anclas y expresiones; el catálogo de
[`scripts/foto/build-prompt.mjs`](../../scripts/foto/build-prompt.mjs) combina estas referencias con ese set
aprobado de ángulos.

## Cómo se usa (no copies rutas a mano)

```bash
pnpm foto:prompt <ficha.json>   # resuelve las referencias por ti
```

`"identidad": ["nexa"]` toma las referencias base; `"identidad": [{ "persona": "nexa", "vista": "perfil-der" }]`
antepone esa vista. Una vista inexistente aborta y lista las disponibles. **Nunca pases rutas de imagen a mano
a `pnpm ai:image` para una pieza con Nexa**: así fue como durante cinco meses se mezclaron dos caras sin que
nadie lo notara.

## Inventario

| Carpeta | Qué | Resolución | Acabado |
|---|---|---|---|
| `1-anclas/` | 8 · **la identidad** | 2560×3200 · 2304×3456 | **fotográfico** |
| `2-angulos/` | 8 vistas derivadas | 1024×1024 · 1536×2304 | sintético (deuda) |
| `3-poses/` | 8 poses expresivas | 1152×2048 | sintético (deuda) |
| `4-vestuario/` | 17 en 4 contextos | 1152×2048 | sintético (deuda) |
| `5-expresiones/` | 12 registros de rostro | 2048×2560 | **fotográfico** · todas con el **mismo tres cuartos** del ancla: en `foto:prompt` copian sólo el gesto (2026-10-02) |
| `5-expresiones-frente/` | **25 · las expresiones vigentes** (2026-10-03) | — | **fotográfico** · casi de frente, aprobadas; índice abajo |

**Traje biónico (2026-10-01, TASK-1940):** el traje de ficción de Nexa ya no se describe en la ficha: se pide por
catálogo (`traje-bionico-nexa` + `lentes-bionicos-nexa`, sólo con `"registro": "cine"`). Kit y vistas puestas en Nexa A
en [`../2026-10-01_traje-bionico-nexa/`](../2026-10-01_traje-bionico-nexa/LEEME.md).
| `_anterior-no-usar/` | 2 · para reconocer lo que NO es canónico | — | — |

### `1-anclas/` — el núcleo

Rostro **frontal**, **tres cuartos** y **perfil**; **busto**; cuerpo entero **frontal**, **tres cuartos** y
**perfil**; y **manos + rostro**. Las manos están porque son lo segundo que más deriva en generación y no
existía ninguna referencia que las mostrara con detalle.

La referencia base del catálogo son tres de éstas: `ancla-2` (rostro tres cuartos, la más decisiva),
`ancla-5` (cuerpo entero frontal) y `ancla-1` (rostro frontal).

### `2-angulos/` — los ángulos que las frontales no cubren

`45-izq` · `45-der` · `perfil-izq` · `perfil-der` · `135-trasero` · `espalda` · `cuerpo-perfil-izq` ·
`cuerpo-espalda`. **El sufijo dice hacia dónde GIRA ella, no qué lado se ve** — se dedujo de las imágenes de
Julio, no de sus prompts, porque el de perfil se contradice solo y documentarlo leyéndolo lo deja al revés.

| Vista | Ella gira | La cámara ve | Su nariz apunta |
|---|---|---|---|
| `45-izq` / `perfil-izq` | a su izquierda | el lado **derecho** | a la **derecha** del cuadro |
| `45-der` / `perfil-der` | a su derecha | el lado **izquierdo** | a la **izquierda** del cuadro |

### `5-expresiones-frente/` — índice de las 25 expresiones vigentes (2026-10-03)

Se piden con `{ "persona": "nexa", "expresion": "<clave>" }`. El ancla frontal v2 va siempre primero y la expresión
detrás, sólo para el gesto; en un grupo la expresión no viaja y el gesto lo da la escena. La lista de «faltan todavía»
de la sección siguiente quedó cerrada con las 13 nuevas. Las 8 del Character Bible (`the-spark`, `the-read`,
`mic-drop`…, en `3-poses/`, sintéticas) siguen disponibles con la misma clave `expresion`.

| # | Clave para la ficha | Archivo | Uso |
|---|---|---|---|
| 01 | `carcajada` | `nexa-expr-01-carcajada.png` | risa abierta, celebración espontánea |
| 02 | `risa-elegante` | `nexa-expr-02-risa-elegante.png` | risa contenida, social |
| 03 | `sorprendida` | `nexa-expr-03-sorprendida.png` | sorpresa positiva, descubrimiento |
| 04 | `esceptica` | `nexa-expr-04-esceptica.png` | duda ante una promesa o un dato |
| 05 | `pensativa` | `nexa-expr-05-pensativa.png` | reflexión, análisis |
| 06 | `neutra` | `nexa-expr-06-neutra-reposo.png` | reposo; retrato sin gesto marcado |
| 07 | `preocupada` | `nexa-expr-07-preocupada.png` | riesgo, error, algo no anda |
| 08 | `conviccion` | `nexa-expr-08-conviccion.png` | afirmar una idea con seguridad |
| 09 | `escucha-empatica` | `nexa-expr-09-escucha-empatica.png` | escucha a otra persona |
| 10 | `curiosa` | `nexa-expr-10-curiosa.png` | interés, pregunta |
| 11 | `complicidad` | `nexa-expr-11-complicidad.png` | complicidad con quien mira |
| 12 | `mirada-lateral` | `nexa-expr-12-mirada-lateral.png` | mira a la **derecha** del cuadro (hacia algo o alguien) |
| 13 | `euforia` | `nexa-expr-13-euforia.png` | éxito: cabeza atrás, puños arriba |
| 14 | `alivio` | `nexa-expr-14-alivio.png` | éxito: el problema se resolvió |
| 15 | `orgullo-sereno` | `nexa-expr-15-orgullo-sereno.png` | éxito: logro tranquilo |
| 16 | `te-lo-dije` | `nexa-expr-16-te-lo-dije.png` | éxito: el dato le dio la razón |
| 17 | `hartazgo` | `nexa-expr-17-hartazgo.png` | el «antes» del problema; trendjacking (ojos en blanco: `foto:rostro` mide ≈ +0,03, se mira a ojo) |
| 18 | `agobio` | `nexa-expr-18-agobio.png` | el «antes»: sobrecarga |
| 19 | `alarma` | `nexa-expr-19-alarma.png` | el «antes»: sorpresa negativa |
| 20 | `confusion` | `nexa-expr-20-confusion.png` | el «antes»: no se entiende qué pasa |
| 21 | `concentracion` | `nexa-expr-21-concentracion.png` | foco en el trabajo |
| 22 | `determinacion` | `nexa-expr-22-determinacion.png` | foco: decisión tomada |
| 23 | `explicando` | `nexa-expr-23-explicando.png` | foco: explica o presenta |
| 24 | `bienvenida` | `nexa-expr-24-bienvenida.png` | social: recibe, saluda |
| 25 | `mirada-lateral-izq` | `nexa-expr-25-mirada-lateral-izq.png` | mira a la **izquierda** del cuadro |

Grupos de uso: **éxito** (13–16) · **el «antes» del problema** (17–20; con las de éxito arman el «antes/después» de
un anuncio) · **foco** (21–23) · **social** (24, 12 y 25). La columna «Uso» orienta; la escena dirige la pose.

**Proporción.** `PERSONAS.nexa.rostro = { largoAncho: 0.81, tolerancia: 0.02 }`, recalibrado con el medidor final de
`pnpm foto:rostro` (mide desde el contorno del ojo, no la pupila): ancla de cuerpo y portadas aprobadas 0,79–0,82, ancla
frontal vieja 0,836, v2 0,816. No compara caras giradas, con boca abierta ni con ojos cerrados.

**Sumar una expresión (procedimiento C):**

1. Generarla con el método A2: ancla frontal v2 + la **causa** de la expresión (no músculos), cabeza libre de su
   movimiento natural, intensidad cotidiana, piel v3 y la geometría del rostro.
2. Medirla: `pnpm foto:rostro <png> --persona nexa` (sale 1 si una frontal queda fuera del canon).
3. Copiarla a `5-expresiones-frente/nexa-expr-NN-<clave>.png` y agregar la entrada en `expresiones` de
   `PERSONAS.nexa` (`scripts/foto/build-prompt.mjs`).
4. `pnpm foto:assets:lock` → `pnpm creative:assets:publish apply` → `pnpm exec vitest run scripts/foto`.
5. Archivar la exploración con `pnpm ai-gen:archive apply --folder <carpeta>` y sumarla a la tabla de arriba.

### `5-expresiones/` — qué funcionó y qué no **[medido]**

> **Delta 2026-10-03 (b) — expresiones de frente reales y la cara afinada.** El ancla frontal aprobada medía largo/ancho
> 0,85 contra 0,81–0,83 del ancla de cuerpo y las portadas aprobadas (Vision, `pnpm foto:rostro`): puesta primera, afinaba
> la cara de toda la serie. `1-anclas/nexa-ancla-1-rostro-frontal-v2.png` es la misma imagen estirada ×1,037 en horizontal
> (sin modelo) y mide 0,83; es la que usa `foto:prompt`. Las 12 expresiones casi de frente de `5-expresiones-frente/` se
> hicieron desde esa ancla con el método A2: la CAUSA de la expresión en vez de músculos, la cabeza libre de su
> movimiento natural, intensidad cotidiana, piel v3 y la geometría «el ancho entre pómulos ≈ 1,2 × ojos→mentón».
> Aprobadas por el operador («lo veo bien, la verdad»). Después se sumaron 13 (`13-euforia` a `25-mirada-lateral-izq`):
> éxito (euforia, alivio, orgullo sereno, «te lo dije»), el «antes» del problema (hartazgo, agobio, alarma, confusión),
> foco (concentración, determinación, explicando) y social (bienvenida, mirada lateral al otro lado). Son 25, **todas
> aprobadas por el operador el 2026-10-03** («aprobadas todas»). Un intento previo de frente estricto con marcadores musculares
> fue rechazado («se ven muy IA»). Corrida: `2026-10-03_nexa-expresiones-piloto/`.
>
> **Delta 2026-10-03 — la pose repetida.** Las 12 comparten el tres cuartos del ancla desde la que se editaron, y cuando
> una ficha pedía `expresion` la imagen entraba PRIMERA: la serie salía con la cara volteada al mismo lado aunque la
> frase pidiera copiar sólo el gesto. Desde ahora `foto:prompt` pone el ancla frontal primero y la expresión detrás (en
> un grupo no viaja). Validado: con la misma `conviccion`, una escena que pide girar a la derecha gira a la derecha y una
> de frente sale de frente (`2026-10-03_validacion-nexa-pose/`). Se intentó rehacer las 12 de frente y el operador las
> rechazó: «se ven muy IA, rasgos muy ficticios; Nexa debe tener sí o sí rasgos reales». No se rehacen sin un método
> que conserve la piel de las anclas.

Doce registros desde el ancla fotográfica, 2048×2560, `high`, ≈ USD 0,099 cada uno.

**Logradas, distintas entre sí:** `01-carcajada` (risa real, ojos cerrados, cabeza atrás) · `03-sorprendida` ·
`04-esceptica` (ceja arqueada, boca torcida) · `05-pensativa` · `07-preocupada` · `12-mirada-lateral`.

`07-preocupada` merece nota: **es un registro que no existía en toda la biblioteca**. Sin ella no había cómo
ilustrar un riesgo o un error — sólo sonrisas.

🔴 **Seis de las doce convergen al mismo gesto** (`02`, `06`, `08`, `09`, `10`, `11`): media sonrisa cerrada
mirando a cámara, demasiado parecidas para servir como registros distintos. **Causa:** el ancla de referencia
tiene media sonrisa y el modelo la arrastra salvo que se le prohíba explícitamente. **Arreglo:** marcadores
físicos más duros y declarar «boca neutra, NO sonrisa» donde no corresponde sonreír — convicción y escucha
empática no sonríen en la vida real. `02-risa-elegante` además no es una risa: le falta mostrar dientes.

**Faltan todavía:** alivio · determinación · alarma (sorpresa *negativa*; la 03 es positiva y no es lo mismo) ·
hartazgo contenido (el más usado en trendjacking) · mirada lateral al otro lado · orgullo sereno.

## La receta de realismo **[medida, reutilizable para cualquier persona]**

El maestro anterior era **sintético** y se notaba: al 100% su piel no tenía poros sino un patrón de
micro-arrugas **uniforme**, cero vello facial, tono perfectamente parejo, labios con gloss y cejas demasiado
peinadas. Las anclas y las expresiones se hicieron con esta receta, en tres iteraciones:

| Versión | Qué pedía | Resultado |
|---|---|---|
| v1 | poros, vello, tono desigual, rojeces, manchitas, brillo disparejo, líneas de expresión | piel **castigada**: aparentaba 40 años, manchada, cansada — **rechazada** |
| v2 | lo mismo + «treinta y dos, sin flacidez ni pliegues profundos» | mejor, pero seguía envejeciendo |
| **v3** | la textura viene **sólo de poros y vello**; tono **parejo**, piel sana y luminosa; sin rojeces, sin marcas, sin ojeras; frente **lisa en relieve**; luz de ventana **con relleno** | **aprobada** |

🔴 **Realismo no es castigo.** Pedir imperfección produce una persona enferma; lo que hace humana a una cara
son **poros irregulares y vello fino**, no manchas. Y la luz de una sola ventana sin relleno marca las sombras
y suma años: la luz de belleza es grande, suave y **con rebote**.

🔴 **Más resolución no es más fidelidad.** El maestro es 1024×1536; a 2560×3200 el modelo **inventa** el
detalle de poros. Hay que verificar al 100% contra el maestro, no asumir que subir píxeles mejora la
identidad.

**Costo:** `quality: max` a 2560×3200 cuesta **USD 0,565** por imagen — diez veces una de 1024² en `high`.
Las expresiones a 2048×2560 en `high` cuestan **USD 0,099**. Presupuesta antes de lanzar una tanda.

## Las dos identidades, y por qué esta carpeta existe

Desde abril de 2026 convivían **dos rostros distintos** bajo el nombre «Nexa», y el catálogo mezclaba los dos:
dos referencias de una cara y una de la otra. El modelo promediaba. En el KV aprobado ganó la cara correcta
**por mayoría**, no porque la mezcla no existiera — por eso el defecto estuvo latente cinco meses.

| | Identidad **A — canónica** | Identidad **B — no usar como rostro** |
|---|---|---|
| Párpado | **delineado superior con rabillo** | sin delineado |
| Cejas | gruesas, arco definido con cola | más rectas y finas |
| Nariz | corta, punta redondeada | más larga, puente alto |
| Labios | llenos, cupido marcado | más finos |
| Óvalo | más ancho | más largo |

**El iris NO distingue las dos** (ambas castaño oscuro; dentro de una misma cara varía más por luz que entre
identidades: rgb(47,37,27) en sombra contra rgb(95,67,53) iluminado, el mismo ojo). Lo que distingue es la
estructura, y el rasgo más rápido de verificar es el **delineado**.

**El material original de B no es basura: es un banco de poses, vestuario y escenarios.** `3-poses/` y
`4-vestuario/` SON ese material, con la cara de A injertada encima.

### Cómo se hizo el injerto **[medido]**

Se pasa la imagen de B como imagen 1 y el ancla de A como imagen 2, y se pide cambiar **sólo los rasgos de la
cara**, conservando pose, gesto, vestuario, fondo y luz. Funcionó en los casos difíciles: risa con ojos
cerrados, boca abierta, mano ocluyendo el mentón.

🔴 **Trampa medida:** decir «cambia cara **y pelo**» y describir el pelo de A **suelta los recogidos y borra
las gafas**. Las cinco de home office salieron sin moño y sin montura y hubo que rehacerlas declarando que el
peinado y las gafas se conservan de la imagen original.

**No conviertas las 24 poses:** son 8 grupos × 3 variantes de la misma corrida, casi idénticas. Una por grupo
aporta el registro; las otras 16 son duplicados caros. Y de las 23 de vestuario, 6 llevan gafas de sol: ahí no
hay cara que injertar.

## Los cuatro signature elements — y dónde NO están **[2026-09-21]**

El [Character Bible](../../docs/operations/brand-photography/NEXA_CHARACTER_BIBLE_FICHA_V1.md), de febrero
2026 y puenteado al repo recién el 2026-09-21, define en §5.1 **cuatro** elementos que Nexa lleva siempre —
son **cuatro, no tres**: la lista incluye las **uñas** con el mismo rango que las joyas.

| Elemento | Especificación |
|---|---|
| **Anillo** | índice de la mano **derecha**, geométrico, **plata mate**. El Bible lo llama «el ancla visual más fuerte — incluir en cada prompt» |
| **Reloj** | muñeca **izquierda**, correa navy o mesh plateada, carátula pequeña. 🔴 **Es un smartwatch**, no analógico [decisión del operador, 2026-09-21]. Ecosistema de dispositivos en [`NEXA_TECH_PROPS_V1.md`](../../docs/operations/brand-photography/NEXA_TECH_PROPS_V1.md): familias, nunca números de modelo |
| **Aretes** | siempre, de studs geométricos a aros medianos. **Predominantemente plata** |
| **Uñas** | arregladas, cortas-medianas, **un solo color**: navy oscuro o nude rosado |

🔴 **Las `1-anclas/` NO los cumplen.** Se produjeron antes de que el Bible existiera en el repo: llevan aros
**dorados** donde la ficha pide plata, y `nexa-ancla-8-manos` —la única que muestra manos y muñeca— las tiene
**desnudas**: sin anillo, sin reloj y sin esmalte. La estructura facial sí cumple la ficha del Bible
—verificado contra §3.1— pero los accesorios no.

*(Corrección 2026-09-21: una versión anterior de este LEEME decía que las anclas llevaban «anillos finos
dorados en los anulares». Era falso y estaba repetido sin verificar: esos anillos son de `Avatar Cuerpo
Completo v2`, material de OneDrive, no del set. La edición del ancla de manos es **añadir**, no reemplazar.)*

✅ **`4-vestuario/` sí los porta** y además clava los contextos de §5.3 (moño alto y lentes de luz azul en
`home`, acento naranja y azul eléctrico en `speaker`, blazer navy sobre blanco en `prof`). **La brecha está
concentrada en las anclas, no en todo el set.**

**La referencia para esa edición está DENTRO del set, no hay que inventarla** **[verificado 2026-09-21]**.
Revisadas las 17 de `4-vestuario/` al 100% en la franja de manos:

| Candidata | Anillo | Uñas | Dedo |
|---|---|---|---|
| `nexa-vest-casual-1` | **plata mate, facetado/sello angular** — el más «geométrico» | navy, un color ✓ | **anular** ✗ |
| `nexa-vest-home-2` | plateado con piedra rectangular, con diseño | nude rosado ✓ | **medio** ✗ |
| `nexa-vest-home-1` | plata mate, banda ancha lisa | navy, un color ✓ | **medio** ✗ |

Y varias llevan **reloj de correa navy con carátula pequeña** (`home-1`, `home-2`, `casual-4`), que es §5.1
literal.

🔴 **Matiz importante: ninguna cumple el DEDO.** Cumplen metal (plata), forma (geométrica) y uñas (un solo
color), y fallan el índice que pide el Bible — están en medio o anular. Así que sirven como referencia de
**material y estilo**, y el dedo hay que corregirlo en la edición. Decir que `4-vestuario/` «porta los
signature elements» es cierto en 3 de 4 atributos, no en los cuatro.

🔴 **Antes de editar CUALQUIER ancla, lee esto: cambiar el aspect ratio REENCUADRA** **[medido 2026-09-21]**.
Editar con un `--size` de otra proporción no recorta ni rellena: el sujeto **cambia de escala dentro del
cuadro**. Medido al editar `nexa-ancla-8-manos` (2560×3200, **4:5**) pidiendo 1024×1536 (**2:3**): la cabeza
pasó de ~30 % del alto a ~38 % y los hombros de ~45 % a ~55 %. Vuelve con buena pinta y el sujeto adentro es
otro. **Muerde siempre aquí** porque los tamaños del modelo son 1:1, 2:3 y 3:2 — y **4:5 no está entre
ellos**, que es justo el formato de las anclas y de los plates.

Receta que lo cierra: padear el original hasta 2:3 **espejando los bordes** (un pad de color sólido invita al
modelo a rellenarlo con invento), editar declarando en el prompt que esas bandas son padding, y recortar de
vuelta — 2560×3200 → pad 320 → 2560×3840 → editar 1024×1536 → recortar 128 → **1024×1280, que es 4:5 exacto**.
Detalle en `EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`.

*Nota: los encuadres distintos entre `1-anclas/`, `2-angulos/` y el maestro **no** son este efecto: cada uno
se pidió explícitamente en su prompt. El agujero aparece cuando se edita sin querer cambiar el encuadre.*

**Salida propuesta, dentro del canon** («editar conserva, generar reconstruye»): editar **una sola** imagen,
`1-anclas/nexa-ancla-8-manos.png` — es la vista `manos` y la única de las ocho que muestra mano y muñeca.
Una edición en vez de ocho regeneraciones. Si se edita, **re-sellar**: `pnpm foto:assets:lock`.

🔴 **El «incluir en cada prompt» del anillo no es físicamente sostenible en todo encuadre.** Un anillo en
plano medio tiene menos píxeles que la cinta del lanyard que volvió como manchas a ~12 px de ancho. El
prompt puede pedirlo siempre; sólo se resuelve donde la mano tiene tamaño en el cuadro. Ver la regla del
encuadre en `.claude/rules/brand-photography.md`.

## Deuda declarada **[pendiente]**

`2-angulos/`, `3-poses/` y `4-vestuario/` conservan el **acabado sintético** anterior, porque se derivaron del
maestro viejo. Sirven para pose, encuadre y vestuario, pero si una pieza necesita piel creíble en primer plano,
la referencia es un ancla. Regenerarlos con la receta v3 es decisión del operador.

## Verificación

```bash
pnpm foto:assets:check   # catálogo y lock deben coincidir por sha256
```

Si alguien sustituye un archivo declarado, ese comando falla. **Ojo:** hoy sella `refs` y `vistas`, pero **no**
`assetDeUso` ni `usoPorPersona` — ver el `[pendiente]` del canon.

## Estado vigente 2026-09-24 — identidad aprobada por el operador

La identidad confirmada es Nexa **humana fotorrealista**, con rostro real y el set de continuidad de polera gris.
Las ocho imágenes aprobadas están en
`ai-generations/2026-09-20_identidad-julio-nexa/set-identidad/angulos/`: `nexa-45-izq.png`,
`nexa-45-der.png`, `nexa-perfil-izq.png`, `nexa-perfil-der.png`, `nexa-135-trasero.png`, `nexa-espalda.png`,
`nexa-cuerpo-perfil-izq.png` y `nexa-cuerpo-espalda.png`. El catálogo de `foto:prompt` apunta ahora a ese set
y su lock registra las huellas. La camiseta es neutral para las referencias, no una condición de vestuario.

`1-anclas/` y `5-expresiones/` son referencias fotográficas complementarias de esta misma cara. Las etiquetas
históricas de “sintético/deuda” para los ángulos ya cubiertos por este set están **superadas**. Las poses del
Character Bible y del OneDrive son una dimensión de actuación/cuerpo aparte; no reemplazan la referencia facial.
