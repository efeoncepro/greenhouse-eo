# Propuesta a AXIS — escala de superficie, mapeo dark de secondary y familias de acento

> **Tipo:** Propuesta al design system (no es una decisión — la decisión es del equipo de diseño)
> **Estado:** `Proposed` — abierta 2026-07-30
> **Origen:** implementación de [ADR-017](creative-studio/EFEONCE_GLOBE_CLIENT_COLOR_SCHEME_DECISION_V1.md)
> en Efeonce Globe
> **Alcance:** `@efeoncepro/axis-tokens` + el theme de Figma *Design System · AXIS*
> **Consumidores afectados:** Globe (inmediato) · Greenhouse (potencial) · Wave (cuando exista)

---

## Por qué esta propuesta existe

Al llevar el theme de Globe del prototipo al runtime aparecieron **cuatro huecos del sistema**, no de
Globe. Ninguno se puede resolver dentro de un producto sin producir drift: son decisiones de la capa
primitiva o semántica, y bajo el
[ADR de ownership de AXIS](EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md) esa capa es del sistema.

Todo lo que sigue está **medido**, no estimado. Los contrastes son WCAG 2.x sobre color compuesto (con
alpha resuelto contra su fondo real), y los matices en grados HSL.

---

## 1 · La escala de superficie tiene dos planos y hacen falta cuatro

### Lo que hay

| Token | Light | Dark | hue | sat |
|---|---|---|---|---|
| `body-bg` | `#F8F7FA` | `#25293C` | 230 | 24 % |
| `paper` | `#FFFFFF` | `#2F3349` | 231 | 22 % |

**El rango es correcto** — hue 230 / saturación ~23 % es el canon de un dark tintado, y el salto entre
ambos (**1,157:1**) es sano. No se propone tocarlos.

### El hueco

Dos planos alcanzan para un dashboard. Una superficie de producción creativa apila cinco niveles: chasis →
contenedor de contenido → piezas → chrome flotante → campos. Con dos hay que colapsar, y colapsar es
perder jerarquía.

### Propuesta

Extender la progresión en **las dos direcciones**, con el mismo paso:

| Plano | Dark | Light | Salto |
|---|---|---|---|
| **hundido** *(nuevo)* | `#181B28` | `#ECEAF1` | 1,192 ↓ / 1,092 ↓ |
| `body-bg` | `#25293C` | `#F8F7FA` | — |
| `paper` | `#2F3349` | `#FFFFFF` | 1,157 ↑ / 1,059 ↑ |
| **elevado** *(nuevo)* | `#3B405C` | = `paper` + sombra | 1,227 ↑ |

Contraste verificado sobre los planos nuevos, con los tokens de texto del theme:

| | sobre hundido | sobre elevado |
|---|---|---|
| `text-primary` | 10,68:1 | 6,58:1 |
| `text-secondary` | 6,93:1 | **4,68:1** |

⚠️ **Ese 4,68 es el techo del plano elevado**: no puede subir más sin romper `text-secondary`. Conviene
declararlo junto al valor.

**En claro no existe un plano por encima de `paper`** — no hay nada más claro que blanco. Ahí la elevación
la dan las sombras, que el theme ya tiene (`Light/elevation/*`). El plano **hundido sí aplica a los dos
modos**.

### La regla de asignación que lo hace funcionar

Medido con tres variantes de un feed de piezas, separación entre una card y su fondo:

| Variante | Dark | Claro |
|---|---|---|
| card sobre el chasis | 1,157 | 1,067 |
| card baja al plano hundido | 1,192 | 1,118 |
| **card SUBE sobre un contenedor hundido** | **1,379** | **1,193** |

> **El contenedor del contenido se hunde; el contenido sube.**

Es la única de las tres que funciona en ambos modos — su valor en claro supera al de la segunda en oscuro.
La razón es estructural: **en el extremo claro los planos se comprimen**, así que bajar el fondo no
alcanza; hay que subir el contenido a blanco puro.

Bajar el chasis entero (variante 2) además **invierte la elevación de Material**, poniendo el contenido por
debajo del fondo. No se recomienda.

### Pregunta de API que conviene resolver ahora

Los nombres actuales describen **la región** (`body-bg` → el `<body>`). Pero distintos productos asignan
regiones distintas al mismo nivel: en Globe el `<body>` del área de trabajo toma el plano hundido, no
`body-bg`. Con los nombres actuales ese uso legítimo **parece drift**.

Sugerencia: nombrar la escala por **nivel** (`surface-1…4`) y dejar `body-bg`/`paper` como alias
semánticos. No es bloqueante —funciona igual como está— pero es barato ahora y caro después.

---

## 2 · El color secondary no es usable en modo oscuro

Medido sobre `body-bg #25293C`:

| Token | Contraste | Uso admisible |
|---|---|---|
| `secondary-500` `#4A108C` | **1,19:1** | invisible |
| `secondary-400` `#6E40A3` | 2,00:1 | invisible |
| `secondary-300` `#9270BA` | 3,59:1 | sólo componente |
| **`orchid-300` `#A18CBE`** | **4,80:1** | texto |

**Ningún escalón del color secundario de la marca alcanza el piso de texto en dark.** Hoy nada lo impide:
los primitivos son idénticos en ambos modos, así que un consumidor que use `secondary-500` en oscuro
obtiene texto que no se ve, sin que nada falle.

### Propuesta

Declarar el **mapeo semántico por modo**: en dark, el rol `secondary` resuelve a `orchid-300` (o a
`secondary-300` si se acepta uso sólo-componente). Es la misma clase de decisión que ya distingue
`Light/elevation/*` de `Dark/elevation/*`.

**Efecto secundario valioso:** eso reencuadra a `orchid`. Deja de parecer una familia redundante con
`secondary` (están a 2° de matiz) y pasa a ser **su versión operable en oscuro** — un rol legítimo que hoy
no está escrito y que cada consumidor tiene que descubrir por su cuenta.

---

## 3 · Dos pares de acentos son indistinguibles, y falta un tercio del espectro

Las nueve familias ordenadas por matiz:

| Familia | Valor | Matiz |
|---|---|---|
| primary | `#FF6500` | 24° |
| warning | `#EAB308` | 45° |
| *(vacío)* | | **45° → 160°** |
| success | `#10B981` | 160° |
| info | `#3B5ED9` | 227° |
| orchid | `#633F92` | 266° |
| secondary | `#4A108C` | 268° |
| magenta | `#BA1954` | 338° |
| coral | `#EA1351` | 343° |
| error | `#E5333B` | 357° |

Tres observaciones:

- **orchid ↔ secondary: 2° de separación.** Mismo matiz, distinta luminosidad.
- **magenta ↔ coral: 5°.** Idem.
- **coral ↔ error: 14°.** Un coral y un rojo de error se leen igual.
- **115° de espectro vacío** entre warning y success: ni lima, ni teal, ni verde-azulado. La paleta está
  cargada al rojo-rosa y hueca en el medio.

### Propuesta

Depende de **para qué existen** estas familias, que es la pregunta que el equipo de diseño debe responder:

- **Si alimentan series de gráfico o categorías** — colapsar `coral` y `magenta` en una, y usar el
  presupuesto liberado para un acento en el hueco (teal o lima). Dos categorías vecinas a 5° serán
  indistinguibles, que es exactamente el trabajo que se les pide.
- **Si son acentos de ilustración o expresión de marca** — la redundancia importa mucho menos y se puede
  dejar como está, declarando el propósito para que nadie las use como categóricas.

No se propone un valor concreto sin saber el propósito.

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

### Propuesta

Declararlo en el contrato de uso de las sombras. Es una línea de documentación, no un cambio de valor.

---

## Regla transversal que se desprende de todo lo anterior

> Un token de texto se verifica contra el plano de **menor contraste** sobre el que puede aparecer, nunca
> contra el canvas por defecto. En una escala oscura es el **más claro**; en una clara, el **más oscuro**.

Se aplicó dos veces durante este trabajo y **encontró un defecto las dos veces** — uno en la escala oscura
y otro en la clara, el segundo mientras se escribía la corrección del primero. Un solo par medido no es la
escala verificada.

Si AXIS pasa a ser dueño de los valores, esta verificación puede vivir como **test del paquete** y
proteger a los tres consumidores a la vez, en vez de repetirse a mano en cada producto.

---

## Qué NO propone este documento

- **No propone cambiar `body-bg` ni `paper`.** Son correctos y los comparten todos los productos.
- **No propone que Globe tenga una marca distinta.** El naranja y el morado son los del sistema.
- **No decide nada.** Es una propuesta medida para que el equipo de diseño resuelva; la implementación en
  Globe puede avanzar con valores locales y adoptar los del paquete cuando existan.

---

## Version

- **v1.0** — 2026-07-30 — Propuesta inicial derivada de ADR-017 v2.0.
