# 06 · Art Direction + Mood — del brief al visual

> **Qué resuelve este módulo.** La fase **antes** del pixel: leer/armar un brief creativo, construir
> un mood board, elegir el medio (foto / ilustración / 3D / IA), definir el look & feel y traducir
> un mensaje/emoción a **decisiones visuales concretas**. Es el puente entre "qué queremos decir" y
> "cómo se ve". La estructura del KV que sale de acá vive en `modules/04`; su auditoría en
> `modules/05`; el craft de producción en `modules/08`–`09`.

> **Principio rector.** La dirección de arte **no es decorar**: es **decidir**. Cada elección
> visual (luz, textura, medio, encuadre, color) responde a una intención del brief. Si no puedes
> conectar una decisión visual con el mensaje, no es dirección de arte: es adorno.

---

## 1. El brief creativo — cómo leerlo / armarlo

Sin brief no hay dirección de arte; hay gusto personal. Si el brief no existe o está incompleto,
**tu primer trabajo es completarlo**, no adivinar. Artefacto: `templates/key-visual-brief.md`.

| Campo del brief | Pregunta que responde | Sin esto pasa que… |
|---|---|---|
| **Objetivo** | ¿Qué debe lograr? (awareness, conversión, recordación) | Diseñas bonito sin norte medible |
| **Mensaje núcleo** | Una frase: qué entender/sentir | El KV no tiene concepto (dim 2 muere) |
| **Público** | ¿A quién le habla? (contexto, códigos) | Tono equivocado para la audiencia |
| **Emoción objetivo** | ¿Qué debe sentir? (confianza, urgencia, asombro) | Look & feel arbitrario |
| **Marca / restricciones** | Paleta, tipo, logo, do's & don'ts | Rompes brand-fit (dim 1) |
| **Canales / formatos** | ¿Dónde vive? (hero, social, OOH, print) | Master que no escala (→ `modules/04` §3) |
| **Tono** | Registro visual (serio/lúdico, premium/cercano) | Inconsistencia con la voz de marca |
| **Referencias** | Qué mirar / qué evitar | Divergencia sin brújula |
| **Entregables + specs** | Qué se entrega y en qué formato | Sorpresas en el handoff (→ `modules/10`) |

> **Test del brief.** Si no puedes escribir el **mensaje núcleo en una frase**, el brief no está
> listo — vuelve al cliente/stakeholder antes de abrir cualquier herramienta. En Efeonce, aterriza
> marca/tono con `efeonce/EFEONCE_OVERLAY.md` y, si es cliente Globe, con `CLIENT_DELIVERY.md`.

---

## 2. Mood board — qué es y cómo se construye

Un **mood board** es una colección curada de referencias visuales que **define el look & feel
antes de producir**. No es un collage random: es un **argumento visual** de hacia dónde va el arte.

**Cómo se construye:**
1. **Parte del brief** (§1): emoción objetivo + tono + público mandan la búsqueda.
2. **Recolecta por ejes**, no al azar: color, luz/atmósfera, textura, tipografía, composición,
   sujeto/casting, medio. Un tablero por dirección conceptual.
3. **Diverge primero**: arma **2–3 direcciones distintas** (no una sola "segura"). El valor está
   en el contraste entre opciones.
4. **Cura, no acumules**: 8–15 referencias fuertes por tablero superan a 50 tibias. Cada
   referencia entra por una razón nombrable (qué aporta a qué eje).
5. **Anota la intención** al lado de cada ref: "esta por la luz", "esta por la textura de grano",
   "esta por el encuadre". El board sin notas es indefendible.
6. **Sintetiza**: de las 2–3 direcciones, define cuál persigues (o el híbrido) y por qué.

Artefactos: `templates/art-direction-moodboard.md` (el board + intención) y
`templates/reference-library.md` (biblioteca de referencias reutilizable).

> **Mood board ≠ plagio.** El board **destila un lenguaje** (luz, color, textura, energía), no
> copia una imagen para replicarla. Ver §6 sobre uso ético de referencias.

---

## 3. El medio — foto vs ilustración vs 3D vs IA

Elegir el medio es una decisión de dirección, no de conveniencia. Cada uno dice algo distinto.

| Medio | Comunica / se siente… | Úsalo cuando… | Cuidado / costo |
|---|---|---|---|
| **Fotografía** | Realismo, confianza, "esto es real", humanidad | Producto real, personas, prueba, casos, testimonio | Producción cara (casting, set, luz); derechos |
| **Ilustración** | Concepto, marca propia, calidez, lo intangible/abstracto | Ideas difíciles de fotografiar, diferenciación, sistema propietario | Requiere ilustrador/estilo consistente |
| **3D / render** | Premium, superficie, producto idealizado, futurismo | Producto hero, materialidad, texturas glassy/waxy (tendencia 2026) | Tiempo de render; puede sentirse frío/genérico |
| **IA generativa** | Divergencia rápida, mundos imposibles, exploración barata | Explorar concepto, mood, fondos, escenas surreales; primeras rondas | Craft final desigual; look genérico; disclosure |
| **Mixed-media** | Autenticidad, layering, riqueza (tendencia 2026) | Combinar foto + ilustración + tipo + textura + grano | Requiere criterio de composición fuerte |

> **Regla 2026 (volátil — as-of 2026-07, reverificar).** No te cases con un medio: **elige por
> tarea**. La IA es imbatible para **divergir** (mundos, moods, fondos rápidos y baratos); el
> humano/foto/3D suele ganar en el **craft final** y en la confianza. IA + humano, no IA vs humano
> (→ `modules/09` handoff). Para producción de imagen IA → `modules/08`; para asset de UI de
> Greenhouse, **delega a `greenhouse-ai-image-generator`**.

---

## 4. Definir el look & feel

El **look & feel** es la personalidad visual del proyecto, hecha de decisiones concretas y
nombrables — no de adjetivos sueltos. Traduce cada palabra del brief a una variable visual.

| Variable | Preguntas de dirección | Ejemplos de decisión |
|---|---|---|
| **Luz** | ¿Dura o suave? ¿Dirección? ¿Alto o bajo contraste? | Luz lateral dura = drama; difusa cenital = calma/premium |
| **Atmósfera / mood** | ¿Cálido o frío? ¿Denso o aireado? ¿Energía? | Bruma fría = misterio; alta clave cálida = optimismo |
| **Textura** | ¿Liso o táctil? ¿Grano, papel, xerox, ruido? | Grano fino = autenticidad; glassy = premium/futuro |
| **Color** | ¿Dominante? ¿Saturación? ¿Duotono? (→ `modules/02`) | Duotono de marca = firma; audaz saturado = joven |
| **Encuadre / escala** | ¿Íntimo o épico? ¿Aire o densidad? | Macro = intimidad; wide con aire = escala/aspiración |
| **Ritmo / composición** | ¿Simétrico o dinámico? ¿Grilla? (→ `modules/01`) | Diagonal = movimiento; grilla estricta = orden/confianza |
| **Movimiento** | ¿Cómo respira/entra? (identidad kinética 2026) | Dirige el concepto; implementa con `motion-design` |

> **De adjetivo a decisión.** "Queremos algo premium" no es dirección. **"Premium" = luz difusa
> cenital + baja saturación + textura glassy + mucho aire + tipografía de peso ligero"** sí lo es.
> Tu trabajo es hacer esa traducción, explícita y defendible.

---

## 5. Traducir mensaje/emoción → decisiones visuales

El músculo central de la dirección de arte: convertir una intención en variables visuales. Ejemplos:

| Mensaje / emoción objetivo | Decisiones visuales concretas |
|---|---|
| **Confianza / solidez** | Grilla estricta, simetría medida, paleta sobria, luz difusa pareja, tipo estable |
| **Urgencia / acción** | Alto contraste, color de acento saturado, diagonal, encuadre apretado, tipo pesado |
| **Asombro / escala** | Encuadre wide con aire, luz épica direccional, sujeto pequeño vs entorno, cielo/vacío |
| **Cercanía / humanidad** | Foto real, casting diverso, luz natural cálida, grano sutil, encuadre a la altura del ojo |
| **Innovación / futuro** | 3D/render, glassy/waxy, gradientes, superficie limpia, tipo geométrico, mixed-media |
| **Calma / cuidado** | Alta clave, baja saturación, mucho espacio negativo, textura suave, ritmo lento |

**Proceso:** mensaje núcleo (brief) → emoción objetivo → ejes visuales afectados (§4) → decisiones
por eje → mood board que las evidencia (§2) → concepto del KV (`modules/04` §8).

---

## 6. Referencias — cómo buscarlas y usarlas éticamente

- **Dónde buscar** (as-of 2026-07, reverificar): archivos de dirección de arte, portfolios,
  behance/awards, revistas visuales, cine/fotografía, y bancos propios. Registra lo bueno en
  `templates/reference-library.md` para reusar.
- **Cómo buscar**: por **eje** (busca "luz", "textura", "encuadre", "paleta"), no por "cosas
  lindas". Buscas un **lenguaje**, no una imagen para copiar.
- **Uso ético (frontera dura):**
  - **Referencia ≠ copia.** Destila el principio (la calidad de luz, la lógica de composición), no
    reproduzcas la obra. Copiar una imagen específica es plagio, no dirección.
  - **Nunca pases una referencia como asset final** ni la metas a producción como si fuera propia.
  - **Nunca uses la obra de otro (o de un modelo IA entrenado sobre ella) como sustituto del
    craft** cuando hay derechos o autoría en juego.
  - **Ilustraciones propietarias de Efeonce** no son stock ni referencia libre — trátalas como
    activos de marca (`efeonce/EFEONCE_OVERLAY.md`).
  - **Disclosure**: cuando una imagen IA pueda confundirse con foto real y el contexto lo exija,
    aplica criterio de disclosure (política en `efeonce/EFEONCE_OVERLAY.md` / boundaries del SKILL).
- **Anti-plagio en un board**: si tu board es una sola fuente repetida, no es un mood board — es un
  moodboard de plagio. Mezcla ≥5 fuentes distintas para destilar un lenguaje, no clonar una.

---

## 7. Del brief al visual — flujo integrado

1. **Lee/completa el brief** (§1) → `templates/key-visual-brief.md`. Sin mensaje núcleo en una
   frase, no avances.
2. **Define emoción objetivo** y tradúcela a ejes visuales (§4–§5).
3. **Arma 2–3 mood boards divergentes** (§2) con intención anotada por referencia.
4. **Elige el medio** por tarea (§3) — foto/ilustración/3D/IA/mixed.
5. **Fija el look & feel** en variables concretas (§4), defendibles contra el brief.
6. **Sintetiza el concepto** y pásalo a la construcción del KV (`modules/04` §8).
7. **Produce/dirige** (`modules/08`) o **handoff humano** (`modules/09`) según el craft.
8. **Audita** con la rúbrica de `modules/05` antes de escalar.

---

## 8. Checklist de cierre de dirección de arte

- [ ] Brief con mensaje núcleo en una frase, público, emoción y canales.
- [ ] 2–3 direcciones/mood boards divergentes, no una sola "segura".
- [ ] Cada referencia del board entra por una razón anotada.
- [ ] Medio elegido por tarea (foto/ilustración/3D/IA/mixed) y justificado.
- [ ] Look & feel traducido a variables concretas (luz, textura, color, encuadre…).
- [ ] Cada decisión visual conecta con el mensaje del brief (nada es adorno).
- [ ] Referencias usadas para destilar lenguaje, no para copiar (≥5 fuentes).
- [ ] Disclosure/derechos revisados donde aplique.
- [ ] Concepto listo para pasar a `modules/04` (construcción del KV).

> **Cierra con artefacto.** La dirección de arte se entrega como
> `templates/art-direction-moodboard.md` (board + look & feel + intención) apoyada en
> `templates/reference-library.md`, no en una lista de adjetivos.
