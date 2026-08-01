# Propuesta a AXIS — escala de superficie, mapeo dark de secondary y familias de acento

> **Tipo:** Propuesta al design system (no es una decisión — la decisión es del equipo de diseño)
> **Estado:** `Proposed` — abierta 2026-07-30 · actualizada 2026-07-31
> **Origen:** implementación de [ADR-017](creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md)
> en Efeonce Globe, y el trabajo del **modo claro** de Globe (2026-07-31)
> **Alcance:** `@efeoncepro/axis-tokens` + el theme de Figma *Design System · AXIS*
> **Consumidores afectados:** Globe (inmediato) · Greenhouse (potencial) · Wave (cuando exista)

---

## Dónde está cada punto hoy

**Todo lo que era trabajo está hecho. Lo que queda son tres decisiones**, y desde el 2026-07-31 cada una
llega con una recomendación concreta para aprobar o corregir — no para partir de cero.

| # | Punto | Estado |
|---|---|---|
| 0 | Estructura multi-marca del paquete | ✅ **Adoptado** — `axisBrandRamp` / `axisBrandSemantic` |
| 1 | Escala de superficie nombrada por nivel | ✅ **Adoptado** — `axisSurface` (`sunk / base / paper / raised`) |
| 2 | Mapeo de `secondary` por modo | ✅ **Adoptado** — `axisBrandRole` |
| 3 | Coral y magenta nunca llegaron al código | ✅ **Cerrado** — las tres familias están en `axisAccentRamp` desde **`0.2.4`**, publicado y consumido por Globe |
| 4 | **Rol de coral y magenta** (¿para qué existen?) | 🔴 **Decisión** — §3 · *recomendación escrita: orchid mantiene el acento · magenta se declara escenario/medio · coral sin token semántico* |
| 5 | **Scrim y escenario NO son superficie** | 🔴 **Decisión** — §1 · *recomendación escrita: `axisScrim` como grupo plano, sin eje de modo* |
| 6 | Las dos familias de sombra no son intercambiables | 🔴 **Decisión** — §4 · *recomendación escrita: renombrar por rol (`action` / `surface`), no por ingrediente* |

Las tres decisiones son de **significado**, no de implementación: los valores ya están en el paquete. Lo
que falta es declarar qué prometen — y hasta que se declare, cada consumidor nuevo lo deduce por su
cuenta, que es exactamente cómo nacieron los defectos de §1 y §4.

Nota de adopción: publicar no es adoptar. Greenhouse todavía consume `@efeoncepro/axis-tokens` **0.2.1**
—anterior a estos exports, y sin usar `axisAccentRamp` en ningún archivo (verificado 2026-07-31)—;
quien los consume es Globe, en `0.2.4`. Eso no cambia ninguna decisión de este documento, pero conviene
tenerlo presente al hablar de "el sistema ya lo tiene": hoy lo tiene **un** consumidor de dos.

Todo lo que sigue está **medido o leído del archivo**, no estimado. Los contrastes son WCAG 2.x sobre
color compuesto (con alpha resuelto contra su fondo real), y los matices en grados HSL.

---

## 0 · Multi-marca — resuelto

El paquete contenía la paleta de Greenhouse sin namespace de marca, mientras el Figma ya estaba modelado
multi-marca con colecciones `Globe/`, `GreenHouse/`, `Kortex/`, `Wave/` y `Verk/`. El Figma iba adelante
del paquete, y eso hacía **materialmente imposible** que Globe consumiera su marca desde AXIS.

✅ **Adoptado.** El paquete publica `axisBrandRamp` y `axisBrandSemantic` por marca. Greenhouse sigue
leyendo lo que leía.

Lo que esto **no** habilitó, y sigue sin habilitar: que cada producto elija su apariencia. La marca vive
en la capa **semántica** —el rol resuelve a otro primitivo por marca—, nunca rompiendo la capa de
componente. Un botón mide lo mismo en Globe y en Greenhouse; cambia de color, no de anatomía.

---

## 1 · La escala de superficie — resuelta, con un límite que hay que declarar

### Lo adoptado

Dos planos (`body-bg`, `paper`) alcanzan para un dashboard. Una superficie de producción creativa apila
cinco niveles: chasis → contenedor de contenido → piezas → chrome flotante → campos.

✅ **Adoptado** como `axisSurface`, **nombrada por nivel y no por región**:

| Plano | Dark | Light |
|---|---|---|
| `sunk` | `#181B28` | `#ECEAF1` |
| `base` | `#25293C` | `#F8F7FA` |
| `paper` | `#2F3349` | `#FFFFFF` |
| `raised` | `#3B405C` | = `paper` (la elevación la da la sombra) |

Dos cosas que conviene no perder de vista al leer esos valores:

- ⚠️ **`dark.raised` está topado.** `text-secondary` mide **4,68:1** sobre él. No puede aclararse más sin
  romper el piso de texto. El valor viene con esa advertencia escrita al lado, y así debe quedarse.
- **En claro no existe un plano por encima de `paper`** — no hay nada más claro que blanco. Ahí la
  elevación son las sombras (`Light/elevation/*`). El plano hundido sí aplica a los dos modos.

La regla de asignación que hace funcionar la escala, medida con tres variantes de un feed de piezas:

| Variante | Dark | Claro |
|---|---|---|
| card sobre el chasis | 1,157 | 1,067 |
| card baja al plano hundido | 1,192 | 1,118 |
| **card SUBE sobre un contenedor hundido** | **1,379** | **1,193** |

> **El contenedor del contenido se hunde; el contenido sube.**

Es la única de las tres que funciona en ambos modos. La razón es estructural: **en el extremo claro los
planos se comprimen**, así que bajar el fondo no alcanza; hay que subir el contenido a blanco puro.

### 🔴 El hallazgo nuevo: SCRIM ≠ SUPERFICIE (y ESCENARIO tampoco)

Este es el punto más importante de esta actualización, porque **el defecto llegó a producción**.

Un **scrim** (`--stage-scrim-*`, `--media-scrim`, `--media-vignette`) existe para una sola cosa: que el
texto blanco se lea sobre un medio **arbitrario** — una foto clara, un video oscuro, lo que el modelo
devuelva. Como el medio es arbitrario en los dos modos, **el scrim tiene que ser oscuro en los dos**.

Derivarlo de la escala de superficie lo volteó a `#ECEAF1` en modo claro. Un scrim claro deja de ser un
scrim: el título de la pieza destacada quedó **blanco sobre casi blanco**, ilegible, en producción.

El mismo error, en su segunda forma: **el escenario** donde se monta una pieza (el lecho sobre el que se
compone) tampoco es una superficie. Es el escenario, y lleva texto blanco encima vía el scrim. Un
escenario no cambia porque cambie la sala. Voltearlo con el modo le deja al producto **dos identidades**:
quien alterna de modo ve una pieza distinta.

Hay un agravante de método que el equipo debería conocer: **el barrido de contraste no podía ver este
defecto.** Declara los gradientes «no medibles» a propósito, para no inventar fallos, y el bug cayó
exactamente en ese hueco. Un instrumento honesto sobre lo que **no** puede medir sigue dejando una zona
sin cubrir, y esa zona necesita otra defensa.

**Decisión pendiente del equipo de diseño.** Hoy AXIS declara `axisSurface` con variante por modo, pero
**no distingue** entre *superficie de la interfaz* y *scrim / escenario de contenido*. La distinción
existe, es la que faltó, y es candidata a canonizarse en el paquete.

Forma propuesta —a criterio de ustedes—: un **grupo separado que no tenga variante por modo**. Que la
ausencia de `light` / `dark` en su firma sea lo que impida el error, en vez de un comentario que hay que
leer. Globe hoy resuelve el scrim tomando `axisSurface.dark.sunk` en **ambos** modos; eso funciona, pero
deja la regla en el consumidor en vez de en el sistema.

#### Recomendación — aprobar o corregir

**Publicar `axisScrim` como grupo plano, sin eje de modo.** No un valor oscuro dentro del tema claro
—que el próximo lector leerá como un bug y "arreglará"—, sino un grupo cuya firma **no tiene** dónde
poner `light` / `dark`:

```ts
export const axisScrim = {
  stageTop, stageBottom, media, vignette,   // ← sin .light / .dark
} as const
```

Dos razones para preferir esta forma sobre documentarlo:

1. **Hace el error imposible en vez de desaconsejado.** El defecto que llegó a producción no fue por
   ignorar una regla: fue por derivar el scrim de la escala de superficie, que es lo que cualquiera hace
   cuando el grupo ofrece un eje de modo. Si el eje no existe, la derivación equivocada no compila.
2. **Es la única defensa disponible para esta clase.** El barrido de contraste declara los gradientes
   «no medibles» a propósito, y el bug cayó justo en ese hueco. Un defecto que ningún instrumento puede
   ver necesita volverse inexpresable, porque no habrá un test que lo atrape.

Los valores se derivan internamente de `axisSurface.dark.*` —un dueño por dato, sin repetirlos— pero
esa derivación queda dentro del paquete y no se expone. Globe ya opera así; esto mueve la regla del
consumidor al sistema, que es donde protege también a Greenhouse y a Wave.

### Nota de API que ya se cobró su valor

Los nombres originales describían **la región** (`body-bg` → el `<body>`). Distintos productos asignan
regiones distintas al mismo nivel: en Globe el área de trabajo toma el plano hundido, no `base`. Nombrar
por nivel fue lo correcto — un nombre de región condena a todo consumidor cuya composición no coincida
con la del primero, que es la definición de un contrato que no generaliza.

`bodyBg` y `paper` siguen existiendo como alias por compatibilidad, y `axisSurface` **referencia** esos
valores en vez de repetirlos: un dueño por dato.

---

## 2 · El `secondary` en modo oscuro — resuelto

Medido sobre `body-bg #25293C`:

| Token | Contraste | Uso admisible |
|---|---|---|
| `secondary-500` `#4A108C` | **1,19:1** | invisible |
| `secondary-400` `#6E40A3` | 2,00:1 | invisible |
| `secondary-300` `#9270BA` | 3,59:1 | sólo componente |
| **`orchid-300` `#A18CBE`** | **4,80:1** | texto |

Ningún escalón del morado de la marca alcanzaba el piso de texto en dark, y nada lo impedía: los
primitivos son idénticos en ambos modos, así que un consumidor podía usar `secondary-500` en oscuro y
obtener texto invisible **sin que nada fallara**.

✅ **Adoptado** como `axisBrandRole`: el rol resuelve a un escalón distinto por modo, por marca. En Globe,
el `secondary` oscuro resuelve a la rampa **orchid**.

Efecto secundario que sigue siendo valioso: eso reencuadró a `orchid`. Dejó de parecer una familia
redundante con `secondary` (están a 2° de matiz) y pasó a ser **su versión operable en oscuro** — un rol
legítimo, ahora escrito, que antes cada consumidor tenía que descubrir por su cuenta.

---

## 3 · 🔴 Las familias de acento: dos de tres nunca llegaron al código

Este es el hallazgo con costo ya pagado, y el que necesita decisión de ustedes.

### El hecho verificado

En el archivo de Figma **`Design System | AXIS`** (key `yyMksCoijfMaIoYplXKZaR`, nodo `12770:121` y
hermanos), AXIS declara **tres** familias de acento para Globe: **Coral**, **Magenta** y **Orchid**, cada
una con rampa 100–900, opacidades y sombras.

**En `@efeoncepro/axis-tokens` sólo existe `orchid`.** `axisAccentRamp` tiene una sola entrada.

### Lo que costó

Al elegir el color de una superficie se descartó el magenta con el argumento de que *"sólo existe como
color de gráficos"*. Ese argumento era **cierto mirando el código y falso mirando el sistema**. Al
corregirlo hubo que escribir la rampa de magenta **a mano dentro de Globe**, con un comentario que
declara la deuda y la task que la cierra.

Un valor de marca escrito en dos lugares es exactamente cómo `warning` y `danger` driftearon sin que nada
lo notara (Delta 2026-07-29 (a)). La diferencia acá es que la deuda está **declarada y con dueño** en vez
de ser drift silencioso — pero sigue siendo la misma clase de defecto.

La task de portado es **`TASK-1615`** (aditiva, no bloquea, P2).

### Los valores de magenta, leídos del nodo `12770:122` en alta resolución

| Escalón | 100 | 200 | 300 | 400 | 500 (main) | 600 (dark) | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| Magenta | `#f1d1dd` | `#e3a3bb` | `#d67598` | `#c84776` | `#ba1954` | `#a7164c` | `#9e1547` | `#951443` | `#8b133f` |

⚠️ **Los de coral hay que leerlos del archivo, y hay que leerlos en alta resolución.** En una captura de
baja resolución `#f1d1dd` se leyó como `#F101DD` — dos colores completamente distintos. Ese es
exactamente el error que un valor de marca no puede permitirse, y por eso este documento no transcribe la
rampa de coral: sólo se conoce con confianza su escalón principal (`#EA1351`).

### 🔴 La decisión: ¿coral y magenta tienen rol, o sólo existen?

Hoy **orchid tiene rol y las otras dos no**. En Globe, orchid **es** el acento: alimenta `--accent`,
`--accent-ink`, `--accent-wash` y `--accent-line`. Coral y magenta no tienen ningún rol asignado — magenta
se usa como escenario de pieza, coral no se usa.

Las nueve familias ordenadas por matiz:

| Familia | Valor | Matiz | Saturación |
|---|---|---|---|
| primary | `#FF6500` | 24° | |
| warning | `#EAB308` | 45° | |
| *(vacío)* | | **45° → 160°** | |
| success | `#10B981` | 160° | |
| info | `#3B5ED9` | 227° | |
| **orchid** | `#633F92` | 266° | **40 %** |
| secondary | `#4A108C` | 268° | |
| **magenta** | `#BA1954` | 338° | **76 %** |
| **coral** | `#EA1351` | 343° | **85 %** |
| error / danger | `#E5333B` | 357° | |

Lo que esa tabla dice, y que hace falta antes de asignarle rol a coral:

- **Coral queda a 14° del error.** Un coral y un rojo de error se leen igual. En Globe el `danger` está en
  357°: **coral a 14°, magenta a 19°**. Cualquier rol que se le dé a coral compite con el estado de error
  del producto.
- **Orchid es el más desaturado de los tres** (40 % contra 76 % y 85 %). Que haya terminado siendo el
  acento del producto no fue casualidad: es el único de los tres que puede sostener superficie amplia sin
  gritar. Coral y magenta tienen cuerpo de acento puntual, no de superficie.
- **orchid ↔ secondary: 2° de separación.** Mismo matiz, distinta luminosidad — ya resuelto en §2, donde
  esa cercanía dejó de ser redundancia y pasó a ser un rol.
- **magenta ↔ coral: 5°.** Dos categorías vecinas a 5° serán indistinguibles.
- **115° de espectro vacío** entre warning y success: ni lima, ni teal, ni verde-azulado. La paleta está
  cargada al rojo-rosa y hueca en el medio.

**La pregunta que sólo ustedes pueden responder: ¿para qué existen estas tres familias?**

- **Si alimentan series de gráfico o categorías** — colapsar `coral` y `magenta` en una, y usar el
  presupuesto liberado para un acento en el hueco (teal o lima). Dos categorías a 5° de distancia no
  cumplen el trabajo que se les pide, y coral a 14° del error hace que una serie parezca una alarma.
- **Si son acentos de ilustración o expresión de marca** — la redundancia importa mucho menos y se puede
  dejar como está, **declarando el propósito** para que nadie las use como categóricas ni como estado.

Este documento no propone un valor concreto sin saber el propósito. Lo que sí propone, en cualquiera de
los dos escenarios: **portar las tres al paquete** (`TASK-1615`). Que una familia exista en Figma y no en
el código es lo que produjo el descarte equivocado, independientemente del rol que se le termine dando.

#### Recomendación — aprobar o corregir

Conviene separar dos preguntas que se venían tratando como una. Las rampas ya son **primitivas** y ya
están en el paquete desde `0.2.4`. Lo que está en disputa no es si existen, sino **cuáles se ganan un
token semántico** — y un token semántico es una promesa de significado, no un color disponible.

| Familia | Recomendación | Por qué |
|---|---|---|
| **orchid** | **Mantiene su rol de acento.** Sin cambios. | Ya alimenta `--accent`, `--accent-ink`, `--accent-wash`, `--accent-line`. Y es el único de los tres al 40 % de saturación: el único que sostiene superficie amplia sin gritar. |
| **magenta** | **Se le declara rol: familia de escenario/medio.** | No es un rol nuevo — es el que **ya cumple** en Globe (`--media-wash` sale de magenta 300/400/700/800/900). Declararlo convierte un uso accidental en un contrato legible. |
| **coral** | **Ningún token semántico, deliberadamente.** Queda como primitiva disponible, marcada «sin rol asignado». | Está a **14° del `danger`**. Cualquier significado que se le dé compite con el estado de error del producto: una serie, un chip o un badge coral se leerá como alarma. Un segundo acento se justifica sólo con un significado claro, y coral no lo tiene todavía. |

Y esto responde de paso la pregunta abierta arriba —*«¿para qué existen?»*—, con la medición del propio
documento en la mano: **no son categóricas.** Dos familias a 5° entre sí son indistinguibles como
categorías, y una a 14° del error convierte un dato en una alarma. Si en el futuro hacen falta series de
gráfico, el presupuesto correcto está en los **115° de espectro vacío** entre warning y success —un teal
o un lima—, no en subdividir el rojo-rosa.

**Lo que esta recomendación evita explícitamente:** inventarle un trabajo a coral para justificar que
esté. Una familia sin rol en la paleta no cuesta nada; una familia con un rol inventado que colisiona con
`danger` cuesta un incidente de lectura. Si mañana aparece un trabajo real para coral, se le declara el
token entonces — el valor ya está en el paquete esperando.

---

## 4 · Las dos familias de sombra no son intercambiables, y nada lo dice

El theme tiene:

| Familia | Composición | Para qué |
|---|---|---|
| `Dark/elevation/Primary/Globe/*` | teñida de `primary-38` | **acción** |
| `Dark/elevation/gray/*` | `gray-38` neutro | **superficie** |

Elevar un header o una card con la sombra de marca produce un **halo naranja** que se lee como si el
elemento estuviera encendido. Ocurrió al construir el mockup de Globe, eligiendo la familia equivocada
porque el nombre parecía el correcto.

#### Recomendación — aprobar o corregir

**Renombrar por rol, no por ingrediente.** `Primary/Globe` describe **de qué está hecha** la sombra;
`gray` también. Ninguno de los dos dice **para qué sirve**, que es lo único que el consumidor necesita
saber en el momento de elegir:

| Hoy | Propuesto | Trabajo |
|---|---|---|
| `Dark/elevation/Primary/Globe/*` | `Dark/elevation/action/*` | Elevar un elemento **accionable** — el tinte de marca es intencional |
| `Dark/elevation/gray/*` | `Dark/elevation/surface/*` | Elevar una **superficie** — card, header, panel |

Los nombres actuales quedan como alias, igual que `bodyBg` y `paper` en §1: renombrar no puede romper a
un consumidor vigente.

Esto es deliberadamente **más que la línea de documentación** que proponía la versión anterior de este
documento, y la razón es la evidencia del propio incidente: la familia equivocada se eligió **porque el
nombre parecía el correcto**. Quien construyó el mockup no se saltó una regla — leyó el nombre, le
calzó, y obtuvo un halo naranja que se lee como si el elemento estuviera encendido. Un contrato escrito
en otro archivo no habría cambiado esa elección, porque el error ocurre en el instante de leer el
nombre. El nombre es el único lugar donde la corrección llega a tiempo.

Es el mismo criterio que ya se aplicó al resolver §1 y la nota de API: **nombrar por la razón, no por el
caso ni por el material.** Ahí se descartó nombrar por región (`body-bg`) en favor de nombrar por nivel,
porque un nombre de región condena a todo consumidor cuya composición no coincida con la del primero.
Acá pasa lo mismo un escalón más arriba: un nombre de ingrediente condena a todo consumidor que no sepa
de antemano qué hace ese ingrediente.

---

## Reglas transversales que se desprenden de todo lo anterior

### 1 · Un token de texto se verifica contra el plano peor, no contra el canvas

> Un token de texto se verifica contra el plano de **menor contraste** sobre el que puede aparecer, nunca
> contra el canvas por defecto. En una escala oscura es el **más claro**; en una clara, el **más oscuro**.

Se aplicó dos veces durante este trabajo y **encontró un defecto las dos veces** — uno en la escala oscura
y otro en la clara, el segundo mientras se escribía la corrección del primero. Un solo par medido no es la
escala verificada.

### 2 · 🔴 Un número sobre el token no describe el píxel

Esta es la lección de método del modo claro, y vale la pena que quede escrita para el equipo.

Al portar el escenario de pieza al modo claro se mapeó al extremo **pálido** de la rampa
(`magenta[200-400]`), que son tintes lavados por construcción, y se declaró **"presencia equivalente"**
entre modos midiendo el **paso de la rampa contra el canvas**.

Esa medición era del **token, no de lo que renderiza**: ignoraba la composición por alfa. Un magenta
oscuro al 30 % sobre blanco compone a rosa pálido; el número del token decía otra cosa.

Hubo un error previo de la misma clase: la primera versión dejó la base en la escala de **grises** con el
color sólo como brillos a baja alfa. Corregir el tono no autorizaba a bajarle el cuerpo — el prototipo
tenía presencia porque su base también era color saturado.

> **La verificación de un tinte exige mirar el render compuesto.** Medir el token es un proxy, y en
> composición por alfa es un proxy que miente.

### Dónde podría vivir esto

Si AXIS pasa a ser dueño de los valores, la regla 1 puede vivir como **test del paquete** y proteger a los
tres consumidores a la vez, en vez de repetirse a mano en cada producto. La regla 2 no es automatizable
con los instrumentos actuales —es justo el hueco que dejó el barrido de contraste con los gradientes—, así
que por ahora es doctrina de revisión: **mirar el render, en los dos modos.**

---

## Qué NO propone este documento

- **No propone cambiar `base` ni `paper`.** Son correctos y los comparten todos los productos.
- **No propone que Globe tenga una marca distinta.** El naranja y el morado son los del sistema.
- **No propone valores para coral.** Hay que leerlos del archivo en alta resolución; transcribirlos desde
  una captura degradada ya produjo un error de dos colores distintos.
- **No decide nada.** Es una propuesta medida para que el equipo de diseño resuelva.

🔴 **Y NO propone que Globe avance con valores locales como práctica.** Declarar el valor en Globe «por
ahora» es teclearlo dos veces, que es el defecto exacto que el Delta 2026-07-29 (a) documenta. La rampa de
magenta local de Globe fue la excepción que confirmó la regla: existió con **comentario, dueño y task de
retiro** (`TASK-1615`), y se borró el día que el paquete la publicó. Ese día llegó: `0.2.4` trae las tres
familias y `apps/studio-client/src/tokens/tokens.ts` consume `axisAccentRamp.magenta` directamente
(verificado 2026-07-31). La deuda declarada se pagó en el plazo que declaró — que es la diferencia entre
deuda y un design system paralelo con fecha de caducidad optimista.

---

## Version

- **v1.2** — 2026-07-31 — Las tres decisiones abiertas pasan de pregunta a **recomendación concreta**, para
  que el equipo apruebe o corrija en vez de partir de cero: `axisScrim` como grupo plano sin eje de modo
  (§1), el reparto de rol entre orchid / magenta / coral (§3), y el renombre de las sombras por rol en vez
  de por ingrediente (§4). Se cierra el punto 3 de la tabla: coral y magenta **sí** llegaron al código
  (`0.2.4`), y la rampa local de Globe se retiró como estaba comprometido. Verificado contra el paquete y
  contra los dos consumidores: Globe en `0.2.4`, Greenhouse todavía en `0.2.1` y sin usar `axisAccentRamp`.
- **v1.1** — 2026-07-31 — Actualizada tras el modo claro de Globe. §0/§1/§2 pasan a `Adoptado` (publicados
  en `@efeoncepro/axis-tokens` 0.2.2–0.2.3). Nuevo: coral y magenta no llegaron al código (§3, con los
  valores de magenta y la advertencia de lectura de coral), la pregunta de rol para coral y magenta (§3),
  el principio **scrim / escenario ≠ superficie** (§1), y la regla transversal **el token no es el píxel**.
- **v1.0** — 2026-07-30 — Propuesta inicial derivada de ADR-017 v2.0.
