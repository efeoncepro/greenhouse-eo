# Palancas corregidas tras la auditoría ciega — corrida 2026-09-21

Ronda de verificación de los puntos 6 a 9 del plan de la
[auditoría ciega](../../docs/operations/brand-photography/EFEONCE_PHOTO_BLIND_AUDIT_2026-09-20.md).
Siete plates, `gpt-image-2.5-sunburst` high 1024×1280, ≈ USD 0,32. **Ninguna aprobada ni publicada.**

Las imágenes están gitignoreadas; lo versionado son las fichas y este índice.

## Qué prueba cada una

| Plate | Palanca | Qué venía a probar | Resultado |
|---|---|---|---|
| `A-ausencia-corregida` | `ausencia` | Que la silla EMPUJADA cambia la lectura que reprobó | ✅ lee «acaban de salir»; la pantalla sigue mostrando paisaje (hallazgo 1, no es este frente) |
| `B-variantes-eje-unico` | `variantes` | Eje único declarado y comparable | ✅ 12 copias, rejilla 4×3, el peso de «más humana» cambia y se puede señalar |
| `C-marcado-primera-corrida` | `marcado` | Primer uso del bloque codificado | ⚠️ marcas naranjas como sujeto ✓, pero **dejó una persona entera al fondo** — su contrato dice que cualquier mano es a lo sumo un fragmento al borde |
| `D-descarte-primera-corrida` | `descarte` | Primer uso del bloque codificado | ✅ pila honda, el pin vacío y el rectángulo de pintura sin descolorar donde colgaba la elegida |
| `E-entre-dos-julio-nexa-polo` | `entre-dos` | Julio + Nexa, registro oficina casual | ✅ palanca e identidad; emblema sobredimensionado |
| `F-quien-sostiene-nexa-terreno` | `quien-sostiene` | Nexa, registro terreno (gorra + polo) | ⚠️ palanca ✓, pero **el polo salió BLANCO** (ver abajo) y el emblema sobredimensionado |
| `G-escucha-julio-chaqueta` | `escucha` | Julio, registro reunión (chaqueta + lanyard) | ✅ palanca ✓; emblema sobredimensionado, lecho reprueba |

## Medición del lecho de la firma **[medido]**

`pnpm foto:validar`. Umbral: mejor logo ≥ 4,5:1 **y** nitidez < 0,004.

| Plate | Blanco | Navy | Nitidez | Veredicto |
|---|---:|---:|---:|---|
| A | 1,30 | 3,65 | 0,0035 | ✗ contraste |
| B | 9,78 | 1,84 | 0,0003 | ✓ |
| C | 1,40 | 3,85 | 0,0034 | ✗ contraste |
| D | 13,03 | 1,84 | 0,0002 | ✓ |
| E | 9,66 | 1,84 | 0,0004 | ✓ |
| F | 1,06 | **5,67** | 0,0046 | ✗ **sólo por la señal de nitidez**, que el propio validador declara no confiable; el contraste pasa |
| G | 1,29 | 1,27 | 0,0031 | ✗ contraste, el más duro |

A y C pidieron superficie «casi blanca» y volvieron en tono medio: es el fallo ya registrado en
[la firma §4.3](../../docs/operations/brand-photography/EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md).

## Tres hallazgos de esta corrida

### 1. El catálogo apunta al polo BLANCO, que es la variante secundaria **[medido]**

`polo-efeonce` resuelve `efeonce-polo-blanco-<V>-…`. El kit tiene las dos variantes y la **principal es la
navy** (15 vistas contra 6), que además es la que el canon declara como referencia del uniforme frente a
cliente. La escena de `F` pedía «deep navy Efeonce pique polo» y **ganó la referencia**: el plate salió blanco.

Misma clase de contradicción que cerramos entre palanca y escena, ahora entre `objetos` y `escena`.
`auditarContradicciones` no cubre ese par.

### 2. El emblema sale sobredimensionado en las tres piezas con prenda **[medido]**

El kit ya trae el ancla —«no más ancho que un tercio del panel del pecho, apenas más ancho que el carnet que
cuelga en la misma toma»— pero **ese marcador no viaja en el bloque que emite el comando**, sólo vive en la doc.

### 3. Mi propia ficha contradijo su palanca, y el modelo resolvió bien

`B-variantes` declaraba el texto «unreadable», pero el eje declarado **era tipográfico**: para comparar el peso
hay que poder leerlo. El modelo ignoró la escena y siguió la palanca. La regla «el texto existe y es ilegible por
causa física» tiene una excepción: **cuando el eje de `variantes` es tipográfico, el texto debe leerse o la
palanca no funciona.**

## Reproducir

```bash
pnpm foto:prompt ai-generations/2026-09-21_palancas-corregidas/fichas/tanda.json   # sin identidad
pnpm foto:generar ai-generations/2026-09-21_palancas-corregidas/fichas/<ficha>.json --out <dir>
pnpm foto:validar <plate>.png
pnpm foto:emblema <plate>.png   # obligatorio en piezas con prenda
```


## Delta 2026-09-21 (tarde) — el lanyard y el carnet no eran los oficiales

**Corrección del operador** sobre `G-escucha-julio-chaqueta`: «refleja perfectamente mi postura, rostro
incluso el uniforme pero el lanyard y el carnet están mal, no son los oficiales, corrígelo para no guardar
referencias equivocadas».

Tenía razón y el comando ya lo había avisado —«el carnet se genera determinísticamente con `arte-carnet.mjs`»—
y el aviso se ignoró. Medido contra el kit (`ai-generations/2026-09-17_lanyard-efeonce/`):

| Pieza | Lo que salió | Lo oficial |
|---|---|---|
| Cinta | isotipos sueltos repetidos, deformes, sin una letra | patrón que **alterna** el logotipo «efeonce» con «Empower your Growth» («Empower your» gris claro, «Growth» blanco) |
| Yoyo | carcasa navy con disco claro | disco **blanco con el isotipo navy** bajo cúpula de resina |
| Carnet | rectángulo **vacío** | CR80 con cabecera navy, retrato circular, «Julio Reyes / Managing & GTM Director» — **ya existía compuesto** en el kit |

### Cómo se corrigió, y por qué en dos pasos distintos

El canon separa las dos cosas y acá se ve por qué: **«lo plano no se genera: el carnet es el arte compuesto»**,
mientras que la cinta es tela curva con pliegues, donde componer encima produce el mismo rechazo que tuvo el
emblema bordado («queda impreso, no bordado»).

1. **Cinta y yoyo → edición con máscara**, pasando como referencia el macro de la cinta oficial y la vista
   puesta del kit. Resultado: el patrón alterna logotipo y eslogan, y el yoyo queda blanco con isotipo navy.
2. **Carnet → composición determinística** del PNG oficial, escalado a los 60×74 px visibles, dentro del marco
   rígido (no encima), atenuado a la luz medida de la zona (135/255) y con un reflejo diagonal de plástico.

Salida: `plates/G2-escucha-julio-lanyard-oficial.png`. La versión anterior se conserva: las dos son evidencia.

### Dos cosas medidas que conviene no olvidar

- **`--mask` NO preserva píxeles.** El delta medio en la zona del rostro dio **88 de 255**: la edición
  recompuso el encuadre entero en vez de tocar sólo la zona enmascarada. Comparados los dos rostros lado a
  lado, la identidad se sostiene —misma estructura, mismos lentes, misma expresión— con micro-deriva en barba
  y pelo, que es la que el canon ya registraba («las caras cambiaron poco pero cambiaron»). **Una edición con
  máscara exige volver a mirar la cara, siempre.**
- **La edición pierde la relación de aspecto si no se declara.** La primera pasada devolvió 1536×1024 sobre un
  plate 4:5. Hay que pasar `--size` explícito también al editar.
