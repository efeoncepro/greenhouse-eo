# Nexa — la ficha del Bible aplicada a producción

> **Qué es esto:** el puente entre el **Character Bible de Nexa Valdés Moreira** y la producción. El
> documento completo, transcrito y legible, vive en
> [`docs/operations/social/NEXA_CHARACTER_BIBLE_V1.md`](../social/NEXA_CHARACTER_BIBLE_V1.md); el original
> es `Nexa_Character_Bible_Efeonce.docx` (OneDrive `Alineación/7. Branding & Diseño/01. Material Marca
> (Axis)/07. Proyecto Nexa/`, febrero 2026).
>
> **Este archivo no transcribe: mapea y mide.** Qué referencia del repo corresponde a cada nombre del Bible,
> qué cumple el material y qué falta.

## Por qué existe

El Bible cierra diciendo: *«Si algo no está aquí, no se asume — se define primero y se agrega al
documento»*. Todo el aparato de generación de Nexa se construyó en septiembre de 2026 —anclas, ángulos,
poses, vestuario, el catálogo de [`build-prompt.mjs`](../../../scripts/foto/build-prompt.mjs), los comandos
`foto:*`— **sin que ese documento participara**. La decisión de cuál de las dos caras era canónica
(2026-09-21) se tomó comparando imágenes entre sí, teniendo una ficha de rostro escrita desde febrero.

La decisión fue correcta y este documento la respalda (ver §Veredicto). El punto es que el árbitro existía y
no se abrió.

## 1. Mapeo — nombre del Bible → referencia del repo

Todo lo de Nexa vive en `ai-generations/_identidad-nexa/`. Se pide por ficha, nunca por ruta a mano:

```bash
pnpm foto:prompt <ficha.json>
```

```json
{ "identidad": [{ "persona": "nexa", "expresion": "the-read" }] }
{ "identidad": [{ "persona": "nexa", "vestuario": "speaker-1" }] }
{ "identidad": [{ "persona": "nexa", "vista": "perfil-izq" }] }
```

Las tres dimensiones ocupan **la misma ranura** —la referencia que se antepone— así que pedir dos aborta.

### Las ocho expresiones canónicas (Bible §6)

| Nombre del Bible | `expresion` | Archivo |
|---|---|---|
| The Spark · **default** | `the-spark` | `3-poses/nexa-pose-the-spark.png` |
| The Breakdown | `the-breakdown` | `3-poses/nexa-pose-the-breakdown.png` |
| The Read | `the-read` | `3-poses/nexa-pose-the-read.png` |
| Deep Work | `deep-work` | `3-poses/nexa-pose-deep-work.png` |
| The Point | `the-point` | `3-poses/nexa-pose-the-point.png` |
| Got It | `got-it` | `3-poses/nexa-pose-got-it.png` |
| The Listen | `the-listen` | `3-poses/nexa-pose-the-listen.png` |
| Mic Drop | `mic-drop` | `3-poses/nexa-pose-mic-drop.png` |

Las ocho son **planos medios**: ninguna es de cuerpo entero.

### Los cinco contextos de vestuario (Bible §5.3)

| Contexto del Bible | `vestuario` | Estado |
|---|---|---|
| Profesional / Presentaciones | `prof-1` … `prof-3` | ✓ 3 · las tres de cuerpo entero |
| Contenido casual / Redes | `casual-1` … `casual-6` | ✓ 6 · `casual-3..6` de cuerpo |
| Tech / Conferencias como speaker | `speaker-1` … `speaker-3` | ✓ 3 · las tres de cuerpo |
| Behind-the-scenes / Home office | `home-1` … `home-5` | ✓ 5 · `home-2` y `home-4` de cuerpo |
| **Lifestyle / Exterior urbano** | — | 🔴 **falta entero** · el material fuente de B **lleva gafas de sol**, así que no había cara que injertar: no fue olvido, el método no aplicaba |
| **Terreno y operación Efeonce** (contexto 6) | — | 🔴 **sin referencias de vestuario**. Decisión del operador 2026-09-21. Hay 6 *plates* de piezas en `2026-09-21_nexa-uniforme-{terreno,documental}/`, que son piezas, no referencias |

Cuáles ya muestran la silueta completa está declarado en `vestuarioDeCuerpo`, verificado mirando las 17 en
hoja de contacto: si la referencia ya es de cuerpo, añadir además el cuerpo frontal mete dos cuerpos sin
rostro cercano y hace derivar la cara.

🔴 **Deuda de acabado:** `2-angulos/`, `3-poses/` y `4-vestuario/` conservan el **acabado sintético** del
maestro anterior (se derivaron de él por injerto de rostro), contra el *«piel que se ve vivida»* de §3.1.
Sirven para gesto, encuadre y outfit; **si la pieza necesita piel creíble en primer plano, la referencia de
rostro tiene que ser un ancla.**

## 2. Auditoría contra el material — 2026-09-21 **[medido]**

**Muestra: 7 imágenes de un universo de ~100.** No es un inventario.

- Identidad **A**: `01-GPT-Image-2-empatica.png`, `Avatar 3,4 v2.png`, `Avatar Cuerpo Completo v2.png` y
  `1-anclas/nexa-ancla-1-rostro-frontal.png`.
- Identidad **B**: `hf_20260409_205637_2285abe3…png`, `Poses y expresiones/The Breakdown/hf_20260409_212045_60104fe1…png`,
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

### Signature elements — el metal estaba invertido

🔴 **Son CUATRO: anillo · reloj · aretes · uñas.** §5.1 lista las uñas con el mismo rango y el mismo
«siempre» que las otras tres, no como grooming aparte. Se anota porque **la auditoría encontró falla en las
cuatro**, y un conteo que se asienta en tres deja la cuarta fuera del checklist.

| §5.1 pide | Observado en la muestra |
|---|---|
| Anillo geométrico plata mate, **índice derecho** | **0 de 5** con manos visibles. `Avatar Cuerpo Completo v2`: anillos finos **dorados** en los **anulares**. The Breakdown: dorado en anular. Contenido casual: cuadrado y plateado —lo más cercano— con piedra azul, y no en el índice |
| Reloj muñeca izquierda, **carátula pequeña y limpia** | **1 de 5**. El único presente tiene carátula **grande y ornamentada** |
| Aretes siempre, **predominantemente plata** | 5 de 5 presentes ✓ · **dorados en 5 de 5** ✗ |
| Uñas de un color, navy o nude | Una pieza con **azul-púrpura y fucsia en la misma mano** ✗ |

*Nota de método: en imágenes generadas no se puede garantizar izquierda/derecha por el espejado. Lo robusto
es el **dedo** (anular en vez de índice) y el **metal**, que no dependen de eso.*

### 🔴 Corrección a esa auditoría: `4-vestuario/` cumple, salvo el dedo

La muestra de arriba miró **anclas y material de OneDrive**. Verificado después sobre las 17 del set,
`4-vestuario/` **cumple el contexto con precisión** —bun alto y lentes de luz azul en `home` (§5.3 contexto 4
exacto), acento naranja y azul eléctrico en `speaker`, blazer navy sobre blanco en `prof`— **y porta los
accesorios en material y estilo**, que es mucho más de lo que hacen las anclas.

Tres candidatas reales para tomar como referencia del anillo, verificadas al 100 % en la franja de manos:

| Candidata | Anillo | Uñas | Dedo |
|---|---|---|---|
| `casual-1` | **plata mate, facetado/sello angular** — el más geométrico del set | navy, un color ✓ | **anular** ✗ |
| `home-2` | plateado con piedra rectangular, con diseño | nude rosado ✓ | **medio** ✗ |
| `home-1` | plata mate, banda ancha lisa | navy, un color ✓ | **medio** ✗ |

`home-1`, `home-2` y `casual-4` llevan además **reloj de correa navy con carátula pequeña**, que es §5.1
literal.

🔴 **Ninguna cumple el DEDO.** Cumplen metal, forma y uñas —tres de los cuatro atributos del anillo— y todas
lo llevan en **medio o anular**, no en el índice. Para tomarlas como referencia sirve igual —son infinitamente
mejores que las anclas, que son **doradas** y en anulares— pero **el dedo hay que corregirlo explícitamente o
el resultado repite el mismo error con mejor metal**.

Las dos señales verificables —**metal** y **dedo**— apuntan en direcciones distintas y ninguna depende del
espejado. **La brecha de accesorios está concentrada en las ANCLAS**, que son justo lo que se antepone
siempre. Hallazgo de la sesión «Poses de Nexa en advertising y design studio».

### Paleta

Un `hf_` del avatar lleva **chaqueta terracota completa**: §5.2 la prohíbe por nombre y ahí no es acento, es
el outfit entero. `Avatar Cuerpo Completo v2` (navy + blanco crudo + stilettos negros) cumple el «look
signature más fuerte».

## 3. Veredicto A/B contra el documento

**La identidad A es la canónica también según el Bible**, no sólo por decisión del operador. Cinco de seis
rasgos de §3.1 la favorecen y ninguno favorece a B. La decisión queda respaldada por la ficha; esto no
reabre nada, le da árbitro escrito para la próxima vez.

## 4. Lo que se corrigió — 2026-09-21

El campo `identity` del bloque `nexa` describía a **cualquiera**: *«long dark wavy hair, fair olive skin,
dark eyes and defined brows»*. No discriminaba entre las dos identidades, y por eso el material derivaba: el
prompt no pedía los rasgos. Hoy lleva los marcadores de §3.1-3.4, y los signature elements de §5.1 viajan
como **bloque aparte**. Bloques verbatim en
[`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md).

🔴 **Una excepción de procedencia, declarada:** el `winged upper lash line` **no está en el Bible**. Sale del
LEEME de `_identidad-nexa/`, donde es el rasgo que separa la identidad canónica de la descartada. Entra como
marcador de continuidad con el material aprobado, **no como cita del documento de marca**.

🔴 **El «incluir en cada prompt» del anillo no es físicamente sostenible**, y el bloque lo dice. La marca se
pierde por el **encuadre**, no por la referencia: medido el 2026-09-21 sobre la misma ficha y las mismas
entradas, la cinta del lanyard a ~12 px de ancho volvió como manchas sin una sola letra y a ~40 px salió
legible. **Un anillo en plano entero tiene menos píxeles que esa cinta fallida.** Por eso el texto pide
renderizarlos *«whenever the relevant body part is in frame AND large enough to resolve»*: se sostiene en la
vista `manos`, en un busto con manos en cuadro y en primeros planos — que es exactamente el **Detail Shot**
de §10, *«donde los signature accessories brillan»*.

## 5. Lo que queda abierto

| Pendiente | Quién decide |
|---|---|
| ~~Ropa corporativa Efeonce~~ — **resuelto 2026-09-21**: es el **contexto 6** de §5.3. Los contextos son situaciones y la prenda la dicta la situación. Falta producir sus referencias de vestuario | ~~Operador~~ → Producción |
| **El cargo**: el carnet del lanyard dice «AI Specialist»; §14 dice «evangelizadora del modelo, voz del ecosistema» | Operador |
| **Reinyectar los signature elements a las ANCLAS** — o bajarlos de §5.1. Salida barata dentro del canon («editar conserva, generar reconstruye»): editar **una sola** imagen, `1-anclas/nexa-ancla-8-manos.png`, que es la vista `manos`. Re-sellar después con `pnpm foto:assets:lock` | Operador |
| Falta **Lifestyle / Exterior urbano**. 🔴 **No se puede injertar**: las 6 de B llevan gafas de sol y §5.3 las pide («cat-eye sutil, sólo en exteriores»), así que el material es correcto en outfit e inservible como referencia de identidad. Hay que **generar desde las anclas**, y conviene al menos una SIN gafas | Producción |
| Deuda de **acabado sintético** en ángulos, poses y vestuario | Operador (ya declarada en el LEEME del set) |
| Desambiguar **terracota** (prohibida en ropa, recetada en labios) en el original | Marca |
| **§13.2 contra §11**: «no finge experiencias humanas» contra una backstory que §11 declara fuente de verdad para referirse a su experiencia. Falta la regla de **cómo** la refiere | Marca |
| Entornos (§8), iluminación (§9) y composiciones (§10) **sin auditar** contra el material | Producción |

## Verificación

```bash
pnpm foto:assets:check   # catálogo y lock coinciden por sha256 · 104 assets
pnpm vitest run scripts/foto/build-prompt.test.ts
```

El sellador cubre las **tres** dimensiones de una persona (`vistas`, `expresiones`, `vestuario`): recorrer
sólo `vistas` habría dejado 25 referencias fuera de todo gate desde el momento de declararlas. **No** vigila
el original en OneDrive.
