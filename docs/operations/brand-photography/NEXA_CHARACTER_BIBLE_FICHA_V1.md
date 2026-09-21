# Nexa — la ficha del Character Bible, y qué cumple el material

> **Qué es esto:** el puente entre el **Character Bible de Nexa Valdés Moreira** —que se declara a sí mismo
> *«source of truth para toda generación de Nexa»*— y el repositorio, que hasta el 2026-09-21 no lo
> mencionaba **ni una sola vez**. Aquí vive la parte **verificable** de ese documento (rasgos, accesorios,
> paleta, expresiones, contextos) y la **medición** de qué cumple el material existente.
>
> **El original manda.** `Nexa_Character_Bible_Efeonce.docx`, febrero 2026, 14 secciones, en OneDrive
> `Alineación/7. Branding & Diseño/01. Material Marca (Axis)/07. Proyecto Nexa/`. No está versionado.
> Este archivo **no lo reemplaza ni lo resume**: extrae lo que un agente necesita para generar y validar.
> Voz, valores, backstory, transparencia y reglas de interacción **sólo** viven en el original.

## Por qué existe este archivo

El Bible cierra diciendo: *«Si algo no está aquí, no se asume — se define primero y se agrega al
documento»*. Todo el aparato de generación de Nexa se construyó en septiembre de 2026 —anclas, ángulos,
poses, vestuario, el catálogo de [`build-prompt.mjs`](../../../scripts/foto/build-prompt.mjs), los comandos
`foto:*`— **sin que ese documento participara**. La decisión de cuál de las dos caras era la canónica
(2026-09-21) se tomó comparando imágenes entre sí, teniendo una ficha de rostro escrita desde febrero.

No es una crítica a esa decisión: **la decisión fue correcta y este documento la respalda** (ver §Veredicto).
Es que el árbitro existía y nadie lo abrió.

## 1. Ficha física verificable — Bible §3

Marcadores para prompt y para QA. Los que deciden identidad van en **negrita**.

| Rasgo | Especificación del Bible |
|---|---|
| Piel | Oliva cálida, **Fitzpatrick IV**. Ni clara ni oscura. Textura real: **un par de lunares sutiles, uno cerca del pómulo izquierdo**. Explícito: *«no piel de porcelana sintética de IA — piel que se ve vivida»* |
| Ojos | Castaño oscuro, casi café negro en luz baja, **ámbar cálido con luz directa**. **Forma almendrada, ligeramente rasgados hacia arriba en las esquinas exteriores** |
| Cejas | **Definidas y expresivas**, naturales, **arco medio**. Cejas que se mueven |
| Nariz | **Recta con bridge sutil, ligeramente respingada en la punta**. Proporcional |
| Labios | **Llenos**, naturales, no exagerados. Color natural rosado-terracota. Sonrisa que llega a los ojos |
| Pómulos y mandíbula | **Pómulos medios-altos**, definidos pero suaves. **Mandíbula suave, mentón ligeramente redondeado** |
| Cabello | Castaño oscuro casi negro, reflejos cálidos naturales (**no highlights artificiales**), **ondulado con onda suelta**, largo hasta debajo de los hombros |
| Complexión | Delgada estilizada con presencia, no frágil. Altura aparente 1,70–1,72 m |
| Maquillaje | Natural-elevado siempre. Cejas definidas, labios terracota/rosado nude/rojo sutil, máscara que abre la mirada. **Nunca pesado ni editorial** |

**Latinidad declarada (§3):** *«latina, inequívocamente latina. No ambiguamente internacional ni étnicamente
neutral»*.

## 2. Signature elements — Bible §5.1

🔴 El Bible dice del anillo que es **«el ancla visual más fuerte — incluir en cada prompt»**. Son las anclas
que la identifican *aunque no se le vea la cara*.

| Elemento | Especificación |
|---|---|
| **Anillo statement** | **Índice de la mano derecha**. **Geométrico, plata mate**. No ostentoso pero con diseño. Aparece en primer plano, medio cuerpo y al gesticular |
| **Reloj** | **Muñeca izquierda**. Correa **navy de cuero o mesh metálica plateada**. **Carátula pequeña y limpia** |
| **Aretes** | **Siempre presentes**, variables por contexto: studs geométricos pequeños (profesional) a aros medianos (casual). **Predominantemente plata o con detalles en azul.** Nunca recargados |
| **Uñas** | Arregladas, cortas-medianas. **Default navy oscuro o nude rosado.** Para contenido bold: naranja o fucsia de la paleta |

## 3. Paleta de wardrobe — Bible §5.2

- **Base dominante (70 %):** navy profundo, negro, blanco crudo, gris antracita. *El navy reemplaza al negro
  como primera opción.*
- **Acentos de energía:** naranja, fucsia/magenta, azul eléctrico. **Uno a la vez**, nunca los tres juntos.
- **Acentos secundarios:** púrpura, verde lima, sólo en accesorios o detalles pequeños.
- 🔴 **Lo que NO usa:** neón, pasteles, estampados llamativos, animal print, logos visibles de marcas, y
  *«colores fuera de la paleta Efeonce (nada de **terracota**, burdeo, verde oliva)»*.

**Ambigüedad del original [pendiente]:** §5.2 prohíbe *terracota* en ropa mientras §3.1 y §3.4 lo prescriben
para labios. Mismo nombre de color prohibido y recetado en el mismo documento — corregir el término en el
original, o el prompt hereda la contradicción.

## 4. Las ocho expresiones canónicas — Bible §6 → `3-poses/`

El Bible pide usar **estos nombres como shorthand de producción**. El set del repo ya los cubre uno a uno;
lo que falta es que el catálogo los conozca.

| Nombre interno | Archivo en `_identidad-nexa/3-poses/` | Descripción facial (Bible) |
|---|---|---|
| The Spark | `nexa-pose-the-spark.png` | Sonrisa con ojos, tilt de cabeza 2-3° derecha, mirada directa. **Expresión default** |
| The Breakdown | `nexa-pose-the-breakdown.png` | Boca abierta a media frase, cejas levantadas, mano explicando |
| The Read | `nexa-pose-the-read.png` | Una ceja más arriba (izquierda), media sonrisa asimétrica. Ironía inteligente |
| Deep Work | `nexa-pose-deep-work.png` | Mirada abajo y a un lado, leve frunce de concentración |
| The Point | `nexa-pose-the-point.png` | Mirada directa, seria pero no dura, sin sonrisa |
| Got It | `nexa-pose-got-it.png` | Mid-laugh, ojos entrecerrados, cabeza atrás o al lado |
| The Listen | `nexa-pose-the-listen.png` | Cabeza inclinada a la izquierda, micro-sonrisa, ojos atentos |
| Mic Drop | `nexa-pose-mic-drop.png` | Mirada directa, ceja levantada, sombra de sonrisa. Confiada, no arrogante |

## 5. Los cinco contextos de vestuario — Bible §5.3 → `4-vestuario/`

| Contexto del Bible | Archivos | Estado |
|---|---|---|
| Profesional / Presentaciones | `nexa-vest-prof-1..3` | ✓ 3 |
| Contenido casual / Redes | `nexa-vest-casual-1..6` | ✓ 6 |
| Tech / Conferencias como speaker | `nexa-vest-speaker-1..3` | ✓ 3 |
| Behind-the-scenes / Home office | `nexa-vest-home-1..5` | ✓ 5 |
| **Lifestyle / Exterior urbano** | — | 🔴 **falta entero** |

**Look signature más fuerte (§5.3):** blazer navy profundo sobre top blanco. `Avatar Cuerpo Completo v2` lo
cumple exacto, con pantalón navy y stilettos negros puntiagudos.

## 6. Entornos e iluminación — Bible §8 y §9 (no auditados)

Seis entornos tipo: **The Studio** · **The Office** · **The Stage** · **The Café** · **Home Base** ·
**Urban**. Tres esquemas de luz canónicos:

- **Nexa Light** (principal): softbox 45° a la izquierda, algo por encima de los ojos; rim suave
  atrás-derecha; **4000-4200 K**; ratio máximo 2:1. Para Studio, Office y Home Base.
- **Golden Nexa** (natural): golden hour, cálida y direccional. Para Café y Urban.
- **Stage Nexa** (dramática): key frontal más dura, backlight visible, spill de color. Para Stage y opinión
  con mood intenso.

§9 advierte que **la iluminación es el segundo factor de consistencia después de los rasgos faciales**.
Estos tres esquemas **no** se contrastaron contra el material en la auditoría de abajo.

## 7. Auditoría contra el material — 2026-09-21 **[medido]**

**Muestra: 7 imágenes de un universo de ~100.** No es un inventario.

- Identidad **A**: `01-GPT-Image-2-empatica.png`, `Avatar 3,4 v2.png`, `Avatar Cuerpo Completo v2.png` y
  `_identidad-nexa/1-anclas/nexa-ancla-1-rostro-frontal.png`.
- Identidad **B**: `hf_20260409_205637_2285abe3…png` (avatar), `Poses y expresiones/The Breakdown/hf_20260409_212045_60104fe1…png`,
  `Vestuario/Contenido casual  Redes/hf_20260401_202852_4031f191…png`.

### Rostro — cumple A, no cumple B

| §3.1 pide | A | B |
|---|---|---|
| Labios llenos | ✓ | ✗ más finos |
| Mandíbula suave, mentón redondeado | ✓ | ✗ óvalo largo, mandíbula marcada |
| Nariz recta con bridge sutil, respingada | ✓ | ✗ más larga, puente alto |
| Ojos almendrados, esquinas hacia arriba | ✓ | ~ |
| Lunares sutiles, piel vivida | ✓ pecas y lunar visibles | ✗ piel más limpia |
| Piel oliva cálida Fitzpatrick IV | ✓ | ~ |

### Signature elements — falla en las dos identidades

| §5.1 pide | Observado en la muestra |
|---|---|
| Anillo geométrico plata mate, **índice derecho** | **0 de 5** con manos visibles. `Avatar Cuerpo Completo v2`: anillos finos **dorados** en los **anulares** de ambas manos. The Breakdown: dorado en anular. Contenido casual: cuadrado y plateado —lo más cercano— con piedra azul, y no en el índice |
| Reloj muñeca izquierda, **carátula pequeña y limpia** | **1 de 5**. El único presente tiene carátula **grande y ornamentada** |
| Aretes siempre, **predominantemente plata** | 5 de 5 presentes ✓ · **dorados en 5 de 5** ✗ |
| Uñas de un color, navy o nude | Una pieza con **azul-púrpura y fucsia en la misma mano** ✗ |

🔴 **El metal está invertido de forma sistemática**: la ficha pide plata, el material entrega oro, en las dos
identidades y en todas las piezas. Eso no es deriva del modelo: **es una instrucción que nunca viajó al
prompt** (ver §Causa raíz).

🔴 **El set canonizado es el que menos cumple.** El anillo geométrico plateado aparece en material de **B**,
que quedó como banco de poses. **A** gana en rostro y no tiene ni anillo correcto ni reloj.

*Nota de método: en imágenes generadas no se puede garantizar izquierda/derecha por el espejado. Lo robusto
es el **dedo** (anular en vez de índice) y el **metal**, que no dependen de eso.*

### Paleta

- Un `hf_` del avatar lleva **chaqueta terracota completa**: §5.2 la prohíbe por nombre, y ahí no es acento,
  es el outfit entero.
- `Avatar Cuerpo Completo v2` (navy + blanco crudo + stilettos negros) y la pieza casual (suéter navy, denim
  oscuro, botines blancos) **cumplen**.

## 8. Veredicto A/B contra el documento

**La identidad A es la canónica también según el Bible**, no sólo por decisión del operador del 2026-09-21.
Cinco de seis rasgos de §3.1 la favorecen y ninguno favorece a B. La decisión queda respaldada por la ficha.

Esto **no** reabre nada: confirma lo decidido y le da árbitro escrito para la próxima vez.

## 9. Causa raíz de la deriva de accesorios **[medido]**

El campo `identity` del bloque `nexa` en [`build-prompt.mjs`](../../../scripts/foto/build-prompt.mjs)
describe hoy a una persona genérica:

> *«a woman in her early thirties with long dark wavy hair, fair olive skin, dark eyes and defined brows»*

Ninguno de los marcadores de §3.1 viaja ahí, y **ninguno de los tres signature elements existe en el
pipeline**. El material no los tiene porque nunca se pidieron. Cualquier corrección que no arregle el
catálogo va a volver a derivar.

## 10. Lo que este documento NO resuelve

| Pendiente | Quién decide |
|---|---|
| 🔴 **Ropa corporativa Efeonce** (hoodie, polo, gorra, softshell, bomber, lanyard): el Bible define cinco contextos con **estilo propio** y **no contempla uniforme**. Son dos sistemas de vestuario para la misma persona sin árbitro | Operador |
| **El cargo**: el carnet del lanyard dice *«AI Specialist»*; el Bible §14 define el rol como *«Evangelizadora del modelo, voz del ecosistema»* | Operador |
| Falta el contexto **Lifestyle / Exterior urbano** (§5) | Producción |
| `2-angulos/`, `3-poses/` y `4-vestuario/` conservan el **acabado sintético** del maestro anterior, contra el *«piel que se ve vivida»* de §3.1 | Operador (deuda ya declarada en el LEEME del set) |
| Reinyectar los signature elements a las **anclas** — o bajarlos de §5.1 | Operador |
| Desambiguar **terracota** en el original | Marca |
| Entornos (§8), iluminación (§9) y composiciones (§10) **sin auditar** contra el material | Producción |

## Verificación

```bash
pnpm foto:assets:check   # catálogo y lock coinciden por sha256
```

Ese comando vigila `_identidad-nexa/`. **No** vigila el original en OneDrive ni los assets declarados por
`assetDeUso`/`usoPorPersona` — pendiente registrado en el LEEME de la corrida de uniforme del 2026-09-21.
