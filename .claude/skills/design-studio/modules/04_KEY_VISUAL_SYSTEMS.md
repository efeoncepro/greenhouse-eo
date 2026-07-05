# 04 · Key Visual Systems — el visual maestro y sus derivados

> **Qué resuelve este módulo.** Cómo se concibe, se estructura y se escala un **Key Visual
> (KV)**: la imagen-concepto maestra de una campaña de la que derivan todos los assets. No es
> "una imagen linda"; es un **sistema** con un núcleo fijo y bordes que flexan. Si vas a
> **auditar** un KV, salta a `modules/05`. Si vas a **dirigir el arte** desde cero, empieza en
> `modules/06`. Este módulo es la **arquitectura**: qué es, de qué está hecho, y cómo un solo
> visual llena hero, social, banner, print, OOH y email sin romperse.

---

## 1. Qué ES un Key Visual (y qué NO es)

Un **Key Visual** es la **expresión visual maestra de una idea de campaña** — el frame del que
todo lo demás es una traducción. Es a la campaña lo que el logo es a la marca: el ancla de
reconocimiento. Cuando alguien ve tres piezas distintas y "sabe" que son la misma campaña, eso
que reconoce **es el KV**.

| El KV **SÍ es** | El KV **NO es** |
|---|---|
| Un concepto visualizado (idea + forma) | Una foto bonita sin idea detrás |
| El master del que se derivan N formatos | Un asset final de un solo formato |
| Un sistema con reglas de derivación | Una plantilla rígida que se estira |
| Consistente en identidad, flexible en formato | Idéntico en todo (muere en mobile / OOH) |
| Reconocible en 1s, aun croppeado | Legible solo a tamaño de portafolio |
| Deriva de la marca, la extiende para la campaña | Un rebrand encubierto |

> **Prueba de fuego.** Si tapas el logo y la pieza sigue siendo reconocible como "esta campaña",
> tienes KV. Si necesitas el logo para saber de quién es, tienes una imagen decorativa.

---

## 2. Anatomía de un KV — los 6 componentes

Todo KV se descompone en seis capas. Cuando audites o dirijas, nómbralas explícitamente: es lo
que hace el visual **replicable** en vez de irrepetible.

| # | Componente | Qué es | Pregunta de control |
|---|---|---|---|
| 1 | **Concepto** | La idea central que el visual comunica en 3s | ¿Se entiende sin copy? ¿Es una idea o un adorno? |
| 2 | **Sujeto / foco** | El elemento protagónico (persona, producto, objeto, escena) | ¿Hay UN foco claro o compiten tres? |
| 3 | **Sistema de color** | Paleta rectora + rol de cada color (dominante/acento/fondo) | ¿La paleta es de marca o inventada para el KV? (→ `modules/02`) |
| 4 | **Tipografía** | Familia(s), pesos, tratamiento del headline como imagen | ¿El tipo es parte del arte o un caption pegado? (→ `modules/03`) |
| 5 | **Tono / atmósfera** | El "sentir": luz, textura, mood, energía | ¿El tono matchea el mensaje y la marca? (→ `modules/06`) |
| 6 | **Elemento gráfico recurrente** | El "hook" repetible: una forma, gesto, gradiente, patrón, corte | ¿Existe un ADN que viaja a todos los derivados? |

> **El componente 6 es el que la gente olvida y el que más sostiene el sistema.** Un gradiente
> firmante, una diagonal, un halo, un tratamiento de corte, un patrón — algo pequeño y repetible
> que sobrevive al crop. Es lo que da consistencia cuando el sujeto cambia entre piezas.

---

## 3. Master → derivados — el KV escala a formatos

El KV se diseña **una vez** como master (idealmente en un ratio generoso y a alta resolución) y
se **traduce** a cada formato. Traducir ≠ estirar: cada formato tiene su propio foco, safe zone y
jerarquía. Specs finas de cada entregable en `modules/10` + `templates/asset-delivery-spec.md`.

### Tabla KV master → derivados por formato

| Formato | Ratio típico (as-of 2026-07 — reverificar) | Qué se mantiene FIJO | Qué se re-compone | Trampa a evitar |
|---|---|---|---|---|
| **Hero web** | 16:9 / 21:9 / full-bleed | Concepto, color, elemento gráfico | Espacio negativo para copy + CTA sobre-imagen | Texto sobre zona ocupada → ilegible |
| **Social feed** | 4:5 (IG/FB), 1:1 | Sujeto, color, tipo del headline | Recorte vertical al sujeto; headline más grande | Reusar el hero horizontal croppeado a ciegas |
| **Social story / reel** | 9:16 | Color, elemento gráfico, mood | Foco al centro-vertical; safe zones UI arriba/abajo | Sujeto tapado por UI de la app |
| **Banner display** | 300×250, 728×90, 320×50 | Color + logo + 1 mensaje | Reducción brutal: solo hook + CTA | Meter el KV completo → mancha ilegible |
| **Print / afiche** | A3/A4, tabloide | Todo el sistema a alta-res | Sangrado, CMYK, tipografía fina legible impresa | Subir imagen RGB de 72dpi a imprenta |
| **OOH / valla** | 6:1, gigante | Concepto + color + 1 palabra | Legibilidad a 5s / 40 km/h: máximo contraste | Más de ~6 palabras; foco pequeño |
| **Email header** | ~600px ancho, 2:1/3:1 | Color + headline + un foco | Peso liviano, texto real (no solo imagen) | KV como sola imagen → cae si no cargan imágenes |
| **Avatar / perfil** | 1:1 pequeño | Elemento gráfico recurrente | Solo el hook, sin texto | Logo completo ilegible a 48px |

> **Regla de derivación.** Diseña el master pensando en el **peor caso de crop** (banner 320×50,
> avatar 48px). Si el hook sobrevive ahí, sobrevive en todos lados. Diseñar solo el hero y
> "después vemos mobile" es la causa #1 de KV que colapsan.

---

## 4. El sistema visual de campaña — fijo vs flexible

Un KV maduro se entrega como **sistema**, no como archivo. El sistema declara qué es **invariante**
(rompe la marca si cambia) y qué **flexa** (se adapta por formato/pieza/mensaje). Documéntalo en
`templates/campaign-visual-system.md`.

| Capa | ¿Fijo o flexible? | Detalle |
|---|---|---|
| Concepto central | **Fijo** | La idea no cambia entre piezas. Es la campaña. |
| Paleta rectora | **Fijo** (dominante) / flexible (acentos) | El color dominante ancla; los acentos pueden rotar por sub-tema |
| Elemento gráfico recurrente | **Fijo** | El ADN visible que viaja a todo derivado |
| Familia tipográfica + tratamiento del headline | **Fijo** | Pesos y lockup consistentes (→ `modules/03`) |
| Sujeto / foco | **Flexible** | Puede cambiar la persona/producto/escena entre piezas |
| Composición / crop | **Flexible** | Se re-compone por formato y safe zone |
| Copy / headline | **Flexible** | El mensaje rota; el tratamiento visual no |
| Fondo / textura secundaria | **Semi-flexible** | Varía dentro de un rango definido por el sistema |

> **La ecuación.** `Consistencia = componentes fijos reconocibles` · `Adaptación = componentes
> flexibles por contexto`. Demasiado fijo → el sistema se siente repetitivo y muere en formatos
> extremos. Demasiado flexible → deja de leerse como una campaña. El arte del director es **dónde
> pones la línea**.

---

## 5. Consistencia vs adaptación — el balance

- **Sobre-consistencia** (todo idéntico): la pieza de OOH usa la misma composición densa del hero
  y nadie la lee a 40 km/h; el story reusa el horizontal y el sujeto queda cortado. Síntoma:
  "se ve igual pero funciona mal en la mitad de los canales".
- **Sobre-adaptación** (cada pieza su mundo): tres diseñadores tocan tres formatos, cada uno
  "mejora" el color y el tipo, y a la semana la campaña no se reconoce como una sola. Síntoma:
  "cada pieza es linda pero no parecen la misma campaña".
- **El punto justo**: el espectador reconoce la campaña en <1s (por los componentes fijos) **y**
  cada pieza funciona nativa en su formato (por los flexibles). Eso solo se logra si el sistema
  **declara la línea por escrito** antes de producir el primer derivado.

---

## 6. KV flexible / adaptativo — la tendencia 2026

> **Volátil — as-of 2026-07 (reverificar en `SOURCES.md` §tendencias).** El KV rígido de "un
> frame maestro congelado" está cediendo ante **sistemas visuales generativos/adaptativos**.

- **Paletas y sistemas variables** (rima con AXIS + brand SSOT de Efeonce): el KV define un
  **rango** de color/textura/forma, no un valor único; cada pieza instancia el sistema. Es
  identidad como **sistema de reglas**, no como archivo estático.
- **Identidad kinética por defecto**: el KV se concibe **con movimiento** (cómo entra el elemento
  gráfico, cómo respira el gradiente). Lo estático se siente viejo. La dirección conceptual del
  motion vive acá; la **implementación** se delega a `motion-design`.
- **Mixed-media y layering**: foto + ilustración + tipo + textura + grano en una composición; el
  KV plano puro se lee como plantilla. (Craft de imagen → `modules/08`.)
- **Modularidad**: el master no es una imagen sino un **kit** (fondo + sujeto + hook + lockup
  tipográfico) que se recombina. Esto es lo que permite escalar a 30 piezas sin 30 diseños.

> **Guardarraíl.** "Adaptativo" no es excusa para inconsistente. Un sistema flexible necesita
> **más** disciplina de reglas, no menos: define el rango y prohíbe salirse de él.

---

## 7. Relación KV ↔ identidad de marca

El KV **deriva** de la identidad de marca y la **extiende** para una campaña específica. No la
reemplaza ni la contradice.

- **Hereda de la marca**: paleta base, familia tipográfica, logo/isotipo, tono de voz visual,
  ilustraciones propietarias (en Efeonce → `efeonce/EFEONCE_OVERLAY.md`; nunca tratar las
  ilustraciones propietarias como stock).
- **Aporta de la campaña**: el concepto, el elemento gráfico recurrente, el sub-mood, el sujeto.
- **Frontera dura**: un KV **NUNCA** es un rebrand encubierto. Si el KV necesita cambiar el logo,
  la paleta base o la familia tipográfica de la marca, no es un KV — es un problema de identidad y
  pertenece a otra conversación (marca, no campaña).
- **Efeonce ≠ Greenhouse**: no cruces marcas; el `AxisWordmark` es solo interno. Para assets que
  entran a la UI de Greenhouse, la producción del pixel se **delega** a
  `greenhouse-ai-image-generator` (helper canónico + DESIGN.md/AXIS). El KV es intención; a la UI
  se mapea vía tokens, nunca HEX/px crudos.

---

## 8. Cómo construir un KV desde un brief — flujo

> Insumo: brief creativo (cómo leerlo/armarlo → `modules/06` + `templates/key-visual-brief.md`).
> Salida: sistema visual documentado en `templates/campaign-visual-system.md`.

1. **Extrae el mensaje núcleo del brief.** Una frase: ¿qué tiene que sentir/entender el público?
   Si el brief no la tiene, no hay KV — vuelve al brief (`modules/06`).
2. **Traduce mensaje → concepto visual.** ¿Qué imagen-idea dice eso sin explicarlo? Diverge:
   genera 3+ direcciones conceptuales antes de comprometerte (mood board → `modules/06`).
3. **Define los 6 componentes** (§2) para la dirección elegida. Escríbelos; no los dejes en la
   cabeza.
4. **Declara fijo vs flexible** (§4). Esta es la decisión que hace el sistema escalable.
5. **Diseña el master pensando en el peor crop** (§3). Alta-res, ratio generoso, hook que
   sobrevive a 48px y a OOH.
6. **Produce/dirige el master.** Herramienta por tarea (marketing → generadores vía `modules/08`;
   UI → delega a `greenhouse-ai-image-generator`). Handoff humano si el craft final lo pide.
7. **Deriva a los formatos** de la tabla §3, re-componiendo cada uno (no estirando).
8. **Audita el master y ≥2 derivados** con la rúbrica de `modules/05` antes de firmar. Un KV que
   no pasó auditoría no se escala: multiplicas el error por N formatos.
9. **Empaqueta el sistema** en `templates/campaign-visual-system.md` + specs de entrega
   (`modules/10`). Entregas un sistema, no un JPG.

---

## 9. Checklist de cierre de un KV

- [ ] El concepto se entiende en 3s sin copy.
- [ ] Los 6 componentes están escritos y nombrados.
- [ ] Existe un elemento gráfico recurrente que sobrevive al crop.
- [ ] Declarado por escrito qué es fijo y qué flexa.
- [ ] El master se diseñó pensando en el peor caso de crop.
- [ ] ≥3 derivados re-compuestos (no estirados) y probados en su formato real.
- [ ] Deriva de la marca sin reemplazarla (paleta/tipo/logo heredados).
- [ ] Master + ≥2 derivados pasaron la rúbrica de `modules/05`.
- [ ] Sistema documentado en `templates/campaign-visual-system.md` + specs `modules/10`.

> **Cierra con artefacto.** Un KV no se entrega en prosa: se entrega como
> `templates/campaign-visual-system.md` (sistema) + `templates/asset-delivery-spec.md` (formatos).
