# 05 · Key Visual Audit — la rúbrica de auditoría

> **Qué resuelve este módulo.** El corazón de "auditar un key visual". Una **rúbrica puntuada
> (0–5 × 10 dimensiones)**, un proceso paso a paso, cómo dar feedback accionable (no "no me
> gusta"), un semáforo de decisión y las señales de "diseño IA genérico". Si aún no sabes qué es
> un KV o cómo se estructura, lee `modules/04` primero — no puedes auditar lo que no sabes leer.

> **Regla de oro del auditor.** Auditar es **juicio con evidencia**, no gusto. Cada punto que
> restas tiene una **razón nombrable** y una **acción concreta** para subirlo. Si no puedes
> nombrar por qué bajaste el puntaje, no bajes el puntaje: mira mejor.

---

## 1. Las 10 dimensiones (0–5 cada una)

Cada dimensión se puntúa **0 (roto) → 5 (excelente)**. Total 50. Registra puntaje **+ razón +
acción** en `templates/key-visual-audit-scorecard.md`.

| # | Dimensión | Qué mide | 0 (rojo) | 3 (aceptable) | 5 (excelente) |
|---|---|---|---|---|---|
| 1 | **Brand-fit** | ¿Respeta y extiende la marca? | Contradice paleta/tipo/logo; parece otra marca | Usa la marca pero sin aportar | Extiende la marca con una idea de campaña propia |
| 2 | **Claridad de concepto** | ¿Se entiende la idea en 3s sin copy? | No hay idea, solo decoración | Idea presente pero requiere leer copy | Idea instantánea, memorable, sin texto |
| 3 | **Jerarquía visual** | ¿El ojo va al foco correcto primero? | Todo compite; sin foco | Un foco, pero con ruido | Recorrido guiado 1→2→3 impecable |
| 4 | **Sistema de color** | ¿La paleta tiene roles y funciona? | Colores random / choque | Paleta ok, roles difusos | Dominante/acento/fondo con intención (→ `modules/02`) |
| 5 | **Tipografía / legibilidad** | ¿El tipo funciona como imagen y se lee? | Ilegible / tipo pegado | Legible, tratamiento plano | Tipo integrado al arte, legible en todo tamaño (→ `modules/03`) |
| 6 | **Composición** | ¿Grilla, equilibrio, espacio negativo? | Amontonado / sin estructura | Compuesto, algo genérico | Composición intencional, respira (→ `modules/01`) |
| 7 | **Reproducibilidad / escalabilidad** | ¿Escala a todos los formatos? | Solo funciona a tamaño de portafolio | Funciona en 2–3 formatos | Sobrevive de OOH a avatar 48px (→ `modules/04` §3) |
| 8 | **Accesibilidad / contraste** | ¿Texto-sobre-imagen legible? ¿Contraste? | Texto ilegible sobre foto ruidosa | Contraste ok en general | Cumple contraste; texto legible en todo derivado |
| 9 | **Originalidad** | ¿Evita el cliché / stock-look / "IA genérica"? | Cliché total / look de stock/IA | Competente pero visto mil veces | Fresco, propio, memorable |
| 10 | **Craft / acabado** | ¿Terminación, detalle, pulcritud? | Artefactos, bordes sucios, pixelado | Prolijo, sin brillo | Acabado impecable, detalle cuidado |

> **Ponderación.** Por defecto todas pesan igual. Ajusta según el caso: para **OOH/valla**, 3
> (jerarquía) + 7 (escalabilidad) + 8 (contraste) pesan doble; para un **hero de marca**, 1 + 2 +
> 9 mandan; para **print**, 10 (craft) es no-negociable. Declara la ponderación en el scorecard.

---

## 2. Puntaje total → semáforo de decisión

| Total /50 | Semáforo | Decisión |
|---|---|---|
| **43–50** | 🟢 Aprobar | Firmar y escalar a derivados. Notas menores opcionales. |
| **33–42** | 🟡 Iterar | Buen núcleo, defectos corregibles. Lista de acciones priorizadas → re-auditar. |
| **≤ 32** | 🔴 Rehacer | Problema estructural (concepto o brand-fit). No parchar; volver al brief/mood. |

> **Gate duro no-negociable.** Cualquier dimensión en **0 fuerza 🔴 sin importar el total.** Un KV
> con concepto brillante pero brand-fit=0 no se aprueba: es otra marca. Y un total de 45 con
> contraste=0 sigue siendo rehacer para el formato afectado.

> **Regla de multiplicación.** Nunca escales a N formatos un master que no pasó 🟢/🟡-corregido.
> Un defecto en el master se multiplica por cada derivado.

---

## 3. Proceso de auditoría — paso a paso

1. **Contexto antes que pixel.** Lee el brief y el objetivo: ¿qué debía lograr este KV, para qué
   canales, para qué público? Auditar sin brief es auditar tu gusto (`modules/06`).
2. **Test de los 3 segundos.** Mira el KV 3s, tápalo, escribe qué entendiste. Si no coincide con
   el mensaje del brief → dimensión 2 (concepto) baja. Este test es lo primero, en frío.
3. **Test de crop / miniatura.** Míralo a tamaño de avatar y croppeado a banner. ¿Sobrevive el
   hook? → dimensión 7.
4. **Recorre las 10 dimensiones** (§1) una por una. Puntúa **+ razón + acción** cada una. No
   promedies a ojo: escribe los 10 números.
5. **Test de squint** (entrecerrar los ojos). Difumina la imagen mentalmente: ¿el foco y la
   jerarquía siguen legibles? → dimensiones 3 y 6.
6. **Test de contraste real** en el peor derivado (texto sobre la zona más ruidosa) → dimensión 8.
7. **Caza el "look de IA genérico"** (§5) → dimensiones 9 y 10.
8. **Suma, aplica semáforo** (§2) y los gates duros.
9. **Escribe feedback accionable** (§4), priorizado. No entregues solo el número.
10. **Cierra en el scorecard** (`templates/key-visual-audit-scorecard.md`) con veredicto + top-3
    acciones + qué re-auditar.

---

## 4. Cómo dar feedback accionable (no "no me gusta")

El feedback inútil describe una emoción. El feedback útil nombra **qué + por qué + cómo**.

| ❌ Feedback vago | ✅ Feedback accionable |
|---|---|
| "No me convence" | "El foco compite: el producto y el fondo tienen el mismo peso tonal (dim 3=2). Baja el fondo 20% en valor para que el producto salte." |
| "Le falta algo" | "No hay elemento gráfico recurrente (dim 1/7). Suma el gradiente firmante de la marca en diagonal para que escale a los derivados." |
| "El texto no se ve bien" | "Headline sobre la zona más clara de la foto → contraste ~2:1 (dim 8=1). Mové el headline a la banda superior o pon un scrim al 40%." |
| "Se ve genérico" | "Composición centrada + foto de stock-look (dim 9=2). Rompé la simetría con la grilla de tercios y sustituí por una toma con dirección de luz propia." |
| "Está muy IA" | "Manos/dedos con artefacto y textura plástica uniforme (dim 10=1). Regenerá el sujeto o handoff a retoque; suma grano para matar el look sintético." |

**Estructura de cada nota de feedback:**
`[dimensión afectada] + [observación específica con evidencia] + [acción concreta] + [prioridad]`.

> **Prioriza.** Máximo 3–5 acciones por ronda, ordenadas por impacto. Un diseñador con 20 notas
> no itera: se paraliza. Dale las 3 que mueven el semáforo.

---

## 5. Señales de "diseño IA genérico" (dim 9 + 10)

> **Volátil — as-of 2026-07 (reverificar en `SOURCES.md`).** Los modelos mejoran rápido; estas
> señales cambian. Reverifica antes de afirmar "esto es IA" como veredicto duro.

- **Simetría perfecta + centrado** por defecto (el modelo ama el centro; el diseño humano no).
- **Textura plástica / waxy uniforme**, piel/superficies demasiado lisas, brillo genérico.
- **Iluminación "de todos lados"** sin dirección de luz ni sombra propositiva.
- **Artefactos de manos, dedos, dientes, texto embebido** malformado.
- **Composición de "hero de stock"**: sujeto centrado, fondo bokeh, sin idea.
- **Paleta teal-&-orange / gradiente morado-azul** por defecto, sin relación con la marca.
- **Detalle infinito sin jerarquía**: todo enfocado, nada manda (falta foco → dim 3).
- **Fondos que "casi tienen sentido"**: arquitectura/objetos que se deshacen al mirar de cerca.
- **Cero grano / cero imperfección**: demasiado limpio se lee sintético (rima con tendencia
  imperfección 2026 → `modules/07`).
- **Tipografía inventada por el modelo**: letras casi-legibles, kerning imposible (el tipo real
  se compone aparte → `modules/03`).

> **Cómo se corrige, no solo se detecta.** Muchas de estas se arreglan en dirección/producción
> (`modules/08`: prompt con dirección de luz, grano, romper simetría) o con **handoff humano**
> (`modules/09`) para el craft final. Detectar sin ruta de arreglo no es auditar.

---

## 6. Anti-patrones del auditor

- **Auditar sin brief** → auditas tu gusto, no el objetivo.
- **Dar el número sin las acciones** → el diseñador no sabe qué mover.
- **Bajar puntaje sin razón nombrable** → si no puedes nombrarlo, mira mejor o súbelo.
- **20 notas sin prioridad** → parálisis. Máximo 3–5 por ronda.
- **Aprobar el master sin probar derivados** → multiplicas el error (→ `modules/04` §3).
- **Confundir "no es mi estilo" con "está mal"** → el estilo lo fija el brief y la marca, no tú.
- **Ignorar el gate duro** → un 0 en cualquier dimensión es 🔴 aunque el total sea alto.

---

## 7. Checklist de cierre de auditoría

- [ ] Leí el brief / objetivo antes de mirar el pixel.
- [ ] Corrí test de 3s, crop/miniatura, squint y contraste.
- [ ] Puntué las 10 dimensiones con número + razón + acción.
- [ ] Apliqué el gate duro (cualquier 0 → 🔴).
- [ ] Sumé y asigné semáforo (🟢/🟡/🔴).
- [ ] Escribí top-3 acciones priorizadas por impacto.
- [ ] Verifiqué el master **y** ≥2 derivados, no solo el hero.
- [ ] Cacé señales de IA genérica con ruta de corrección.
- [ ] Cerré en `templates/key-visual-audit-scorecard.md` con veredicto + qué re-auditar.

> **Cierra con artefacto.** La auditoría se entrega como `templates/key-visual-audit-scorecard.md`
> (puntajes + semáforo + acciones), no como un párrafo de impresiones. Para una crítica narrativa
> más amplia (no puntuada), usa `templates/design-critique.md`.
