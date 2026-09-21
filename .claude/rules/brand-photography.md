---
paths:
  - "scripts/foto/**"
  - "docs/operations/brand-photography/**"
  - "ai-generations/**"
---

# Fotografía de marca Efeonce — invariantes (auto-load por path)

Carga [`design-studio` → lenguaje fotográfico](../skills/design-studio/references/efeonce-photographic-language.md)
y el [índice del canon](../../docs/operations/brand-photography/README.md) **antes de escribir un prompt**. La
sesión que reconstruyó el oficio a pedazos en vez de cargar la skill perdió un día entero y ~USD 5
(`ai-generations/2026-09-20_formatos-catalogo/ESTADO.md`).

## Los tres comandos. NUNCA a mano

```bash
pnpm foto:doctor                    # ¿puede esta máquina generar? seis chequeos, sin costo
pnpm foto:prompt <ficha.json>       # arma el prompt desde la ficha
pnpm foto:validar <plate.png>       # mide las seis reservas sobre el plate limpio
pnpm foto:componer <piezas.json>    # la CAPA GRÁFICA encima: voces, selección AXIS, firma y QA
pnpm foto:emblema <plate.png>       # amplía el bordado para mirarlo al 100% (no decide: quita la excusa)
```

**Dos categorías de pieza, y la diferencia se decide ANTES de generar:**

| | Pieza **muda** | Pieza **con voz** |
|---|---|---|
| Qué lleva | Sólo foto + firma | Titular, copy, cursores, selección |
| Para qué | **Descanso visual**: relaja el feed | Dice algo concreto |
| Reserva | No necesita | **Obligatoria, declarada en la toma** |
| Cómo | `foto:prompt` → `foto:validar` | `foto:prompt` con `reservas` → `foto:validar --zona-texto` → `foto:componer` |
| Estado | **aprobada** | **capa SIN aprobar** (2026-09-19) |

**NUNCA escribas un compositor nuevo.** `foto:componer` es el de «Nivel de búsqueda» con su gramática de voces
intacta; escribir otro ya se intentó y el operador rechazó las piezas enteras.

**NUNCA armes un prompt de foto de marca concatenando bloques a mano.** Es la vía por la que «Vertical 4:5.»
vivió dentro del bloque de realismo compartido sin que nadie lo viera. El comando resuelve desde tablas:

| Campo de la ficha | Qué resuelve |
|---|---|
| `formato` | tamaño, % del lecho y límite de sujetos, de UNA tabla |
| `identidad` | bloques `IDENTITY` + `REFERENCES` verbatim, con **vista por ángulo** (`{ persona, vista }`) |
| `objetos` | kits de marca como **referencia de forma** (logo, mascota, prenda, merch), numerados tras la identidad |
| `palanca` | **una sola** de las **23 de encuadre** → [catálogo de palancas](../../docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md) |
| `atmosfera` | `polvo` · `bruma` · `vapor` · `humo` — aire con materia que hace visible la luz. **Exige haz** |
| `suspendido` | qué está congelado en el aire |
| `lecho` | objeto y **tono declarado** del primer plano desenfocado |

## Reglas duras que el comando ya hace cumplir (no las repitas a mano, no las esquives)

- **Identidad:** el set de Julio es `2026-09-20_identidad-julio-nexa/refs-aprobadas/` (+ 6 ángulos derivados).
  El set viejo de `2026-09-17_equipo-vestuario/` **idealizaba el rostro** y arrastraba deriva.
- 🔴 **Al declarar `objetos` con una PRENDA, carga primero**
  [`garment-reference-kit.md`](../skills/greenhouse-ai-image-generator/references/garment-reference-kit.md):
  tiene la geometría verbatim del emblema (se espeja: 6 de 21 vistas del polo volvieron invertidas), cómo se
  pide un bordado (`satin-stitch`, no tinta plana), que el emblema **no se redimensiona**, y que **vestir a una
  persona real exige una foto de CUERPO ENTERO** además del rostro. Reconstruirlo de memoria costó una jornada
  el 2026-09-20 y el resultado fue un emblema inventado en cinco piezas.
- 🔴 **El emblema bordado NO se genera.** Medido 2026-09-20: tres prendas dieron **tres emblemas distintos y
  ninguno era el de Efeonce** (una espiral, dos barras, otras dos). Es el mismo hecho que gobierna la firma. En
  orden: que **no se lea** (de espaldas, en sombra, pequeño) · **componerlo** después · **editar con máscara**.
  **NUNCA** publicar el emblema tal como sale del generador, y **NUNCA** cerrar sin `pnpm foto:emblema`: el QA
  sobre una hoja de contacto no sirve, a 520 px un bordado no se lee y pasa por bueno.
- **Código de vestuario Efeonce** **[operador, 2026-09-20]**: la prenda dice el REGISTRO de la escena.
  **Polera piqué** = oficina casual · **Chaqueta** = reunión o instancia importante · **Gorra + polo** = terreno ·
  **Hoodie** = terreno · **Lanyard y carnet** = transversales, van en casual y en formal por igual. Se elige por
  el registro de la escena, NUNCA por variedad visual: una reunión importante en hoodie dice lo contrario de lo
  que la foto cuenta.
- **`ignore their clothing` NO alcanza:** con identidad, **declara el vestuario en la escena** o el modelo copia
  la ropa de las referencias. El comando avisa.
- **Editar conserva, generar reconstruye.** Para un ángulo nuevo de una persona, **edita su foto aprobada**;
  generar desde cero redondea el rostro (cuatro iteraciones lo probaron).
- **Marcadores verificables, no magnitudes.** «Gira 45 grados» da una cabeza inclinada; «la oreja lejana no se ve,
  el puente de la nariz corta la mejilla lejana» da el tres cuartos real.
- **Una palanca DE ENCUADRE dominante por pieza.** Combinar dos las diluye: cada una pide el control de la escena.
  Las otras tres familias sí se combinan con ella: **33 palancas en total** —5 siempre activas (bloque de impacto,
  incluido el sistema de color) · 4 atmósferas · 1 acción suspendida · **23 de encuadre**— más las **20 tomas de
  cámara** (ojo de pez, dron, tilt-shift, contrapicado, macro, tele, barrido…), que dicen *con qué* se fotografía
  y **no** son palancas. Índice: [catálogo de palancas](../../docs/operations/brand-photography/EFEONCE_PHOTO_LEVERS_CATALOG_V1.md).
- **La atmósfera exige un haz declarado** (el comando aborta sin él) y **la acción suspendida tiene dosis: 1 de
  cada 4 piezas** (el comando cuenta la tanda y avisa con el número).
- **El acento cálido también tiene dosis: 1 de cada 2** **[auditoría ciega 2026-09-20]**. El azul portador es
  estructura y va en TODAS; el acento es puntuación. Dos evaluadores ciegos lo contaron en 9 y en 12 de 12 y lo
  leyeron como un tic que delata que la serie se armó con una receta.
- **Si la pieza va a llevar titular, copy o cursores, declara `reservas` EN LA TOMA** y valida con
  `pnpm foto:validar <plate> --zona-texto`. Medido: las 12 piezas auditadas reprobaron la banda de texto (mejor
  caso 0,10 del alto contra 0,28 exigido) porque ninguna la declaró. **Reservar después de generar no existe.**
- **El texto de la escena EXISTE y es ilegible por causa física** (pequeño, fuera de foco, cortado, en ángulo),
  **nunca por estar en blanco**: doce piezas sin una sola letra delataron la generación (`bloque-realismo-v3`).
- **La luz con carácter va sobre el SUJETO; la reserva vive en la sombra que esa luz deja, nunca en su camino.**
  Vale también para el **lecho**: medido, 3,16 → 3,93 → **11,55:1** sólo por sacarlo del haz.
- **Nunca un scrim.** Si el contraste no da, se **regenera** el plate; no se oscurece en post.
- **El plate nace sin logo ni texto.** La firma es el SVG oficial compuesto después, **20% del lado corto del lienzo**
  (decisión del operador 2026-09-20), contraste ≥ 4,5:1 medido.
- **Tope de tanda:** más de 6 fichas exige que cada una declare un `piloto` ya generado en disco. La calidad sale
  de generar poco y **mirar cada plate**.
- 🔴 **La `escena` NO puede contradecir al bloque de su palanca** **[medido 2026-09-21]**. Los dos viajan juntos
  en el mismo prompt y **gana la escena**, por más específica: la palanca se anula sin que nada lo delate. Así
  reprobó `ausencia` en la auditoría ciega —bloque «chair pushed back at an angle», escena «the empty chair» dos
  veces— y fue llamada la peor de las doce, «foto de inmobiliaria». No es un defecto de esa palanca sino del
  constructor: el aviso (`auditarContradicciones`) es por palanca. **Los marcadores ya estaban en el bloque**;
  lo que faltaba era impedir que la escena los contradiga.
- **`variantes` exige el campo `eje`: UNO solo.** Pedir tres a la vez producía el doble filo medido —si no se ve
  la diferencia no hay decisión; si se ve de más, dos copias del mismo archivo difieren y delatan la generación—.
- **El lecho se cuenta por FAMILIA, no por objeto** **[medido 2026-09-21]**. Los doce lechos de la serie auditada
  eran literalmente distintos (12/12) y aun así se leyó «el mismo recurso de profundidad siete veces»: lo que se
  repite es la forma —«el borde de una superficie, desenfocado, abajo»— en **7 de 12**. El catálogo tiene **21
  lechos medidos**; el comando avisa cuando una familia pasa de la mitad de la tanda.
- **Nunca ancles la serie en la categoría de un cliente** (pintura = Berel). El comando aborta.

## Los assets viven fuera de git — y el lock los vigila

Los renders de referencia y los kits pesan **640 MB** y están en `.gitignore`. Viven en la máquina y en OneDrive
(`5. Contenidos/13- Branding/` y `14. Mascotas de partners/`). Lo que **sí** está versionado es
`scripts/foto/assets.lock.json`: la huella SHA-256 de los **54** assets que el catálogo declara.

```bash
pnpm foto:assets:check   # ¿el catálogo y el lock coinciden?
pnpm foto:assets:lock    # resella el lock (tras agregar un kit o cambiar un asset a propósito)
```

Para qué sirve:

- **CI verifica el catálogo sin descargar nada.** Si agregas un kit con la ruta mal escrita, falla ahí.
- **Detecta que tu copia local difiere de la aprobada.** `pnpm foto:prompt` avisa antes de generar, y
  `pnpm foto:doctor` lo chequea entre sus pasos. Sin esto, una copia derivada produce una pieza con una
  referencia que el equipo nunca aprobó, y nada lo delata.

**Si agregas un kit o una vista al catálogo, resella el lock y commitéalo**, o el test lo marca como faltante.

## Al cerrar

`pnpm foto:validar` sobre el plate limpio y **mirar la imagen al 100%**: identidad contra la referencia, emblema
letra por letra, y que no haya texto ni marcas de terceros. Un contraste que pasa no prueba que la pieza esté bien.
