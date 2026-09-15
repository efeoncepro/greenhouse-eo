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

Recuperar el brief desde el hilo y canon; completar faltantes con supuestos explícitos cuando sean reversibles.
Preguntar sólo por información esencial no inferible y avanzar lo independiente. Reusar el brief existente;
`templates/key-visual-brief.md` sirve si falta estructura, no obliga a duplicar documentación.
Para creatividad social: [módulo 12](../../social-media-studio/modules/12_CREATIVE_REASONING_AND_EMOTIONAL_DESIGN.md),
[playbook](../../social-media-studio/references/social-opportunity-playbook.md),
[heurísticas y pruebas](../../social-media-studio/references/heuristics-biases-and-testing.md) y
[marca física](../../social-media-studio/references/brand-in-scene.md).

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
> suficientemente claro: proponer una interpretación desde contexto; preguntar si la ambigüedad cambia el
> objetivo o entregable. No bloquear investigación/boceto reversible por una frase pendiente. En Efeonce, aterriza
> marca/tono con `efeonce/EFEONCE_OVERLAY.md` y, si es cliente Globe, con `CLIENT_DELIVERY.md`.

---

## 2. Mood board — qué es y cómo se construye

Un **mood board** es una colección curada de referencias visuales que **define el look & feel
antes de producir**. No es un collage random: es un **argumento visual** de hacia dónde va el arte.

**Cómo se construye:**
1. **Parte del brief** (§1): emoción objetivo + tono + público mandan la búsqueda.
2. **Recolecta por ejes**, no al azar: color, luz/atmósfera, textura, tipografía, composición,
   sujeto/casting, medio. Un tablero por dirección conceptual.
3. **Diverge si el concepto está abierto:** comparar 2–3 direcciones por mecanismo o tratamiento. Con
   concepto decidido, mantenerlo; una corrección localizada no exige nuevos boards.
4. **Cura, no acumules:** incluir sólo referencias que resuelvan una decisión. No hay cuota mínima ni
   superioridad garantizada de 8–15 referencias. Registrar qué aporta cada una y retirar redundancias.
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
| **Fotografía** | Registra un sujeto/situación bajo condiciones de producción | Producto real, personas y demostraciones verificables | No prueba veracidad por apariencia; procedencia, edición, derechos y recursos |
| **Ilustración** | Construye forma, síntesis y relaciones no fotográficas | Abstracción, metáfora y sistema gráfico | No implica calidez automática; continuidad de estilo y autoría |
| **3D / render** | Controla geometría, material, luz y cámara | Producto/objeto con identidad y repetibilidad exigentes | Depende de activos, modelado, render y acabado; no significa premium por sí solo |
| **IA generativa** | Propone o transforma imágenes desde instrucciones/referencias | Exploración o edición donde pueda conservar restricciones | Verificar capacidad real, costo/latencia, deriva e identidad; no siempre barata ni diversa |
| **Mixed-media** | Combina registros y capas | Cuando cada medio aporta una función a la idea | No garantiza autenticidad; controlar unidad y jerarquía |

Elegir por operación, restricciones, referencias y defecto pendiente. La IA puede ayudar a explorar, pero
no es «imbatible» ni garantiza diversidad conceptual: muchas variantes pueden conservar la misma fijación.
Foto/3D/composición tampoco ganan siempre el acabado o confianza; comparar resultado observable y procedencia.
No añadir proveedores por demostrar sofisticación. Producción de imagen IA → `modules/08`; para asset de UI
de Greenhouse componer con la skill dueña del dominio y `greenhouse-ai-image-generator`.

---

## 4. Definir el look & feel

El **look & feel** es la personalidad visual del proyecto, hecha de decisiones concretas y
nombrables — no de adjetivos sueltos. Traduce cada palabra del brief a una variable visual.

| Variable | Preguntas de dirección | Ejemplos de decisión |
|---|---|---|
| **Luz** | ¿Dirección, tamaño de fuente, sombras y exposición? | Lateral para describir relieve; difusa para reducir bordes de sombra. Revisar material y lectura |
| **Atmósfera / mood** | ¿Qué escena/contexto apoya la intención? | Elegir interior/exterior, profundidad, clima y densidad; no frío=misterio universal |
| **Textura** | ¿De qué material está hecho y cómo responde? | Grano de papel, foil, tela, vidrio; escala física coherente. Grano no demuestra autenticidad |
| **Color** | ¿Paleta contextual/marca, contraste y proporción? | Definir dominante/acento y función; saturación no define edad ni emoción por sí sola |
| **Encuadre / escala** | ¿Distancia, ángulo y relación sujeto-entorno? | Macro revela superficie; plano abierto muestra relaciones. Especificar qué debe verse |
| **Ritmo / composición** | ¿Foco, agrupación, balance y progresión? | Diagonal conecta acciones; grilla agrupa. No convertir geometría en confianza garantizada |
| **Movimiento** | ¿Qué cambia y por qué? | Acción→consecuencia; cámara sólo si aporta información; implementar con `motion-design` |

**De adjetivo a decisión:** preguntar qué significa «premium» en esta categoría/encargo y recuperar referencias
aprobadas. Después especificar material, luz, tipografía y escala en relación con esa intención. Por ejemplo,
«foil blanco sutil sobre cubierta textil, sombra lateral corta y wordmark legible» es ejecutable; no es receta
universal de premium. Baja saturación, vidrio y tipo fino pueden ser incorrectos para esa marca o superficie.

---

## 5. Traducir mensaje/emoción → decisiones visuales

La emoción es una hipótesis de recepción, no un valor que se codifica automáticamente con color/luz.
Registrar estímulo, interpretación esperada, lectura alternativa y forma de revisión.

| Intención | Opción concreta a comparar | Lectura alternativa que revisar |
|---|---|---|
| Confianza/solidez | Información verificable, material consistente, tipografía legible y relaciones ordenadas | Frialdad o rigidez; simetría no prueba confianza |
| Acción/urgencia real | Consecuencia visible y jerarquía clara de plazo/acción | Presión artificial o ruido; no inventar deadline |
| Asombro/escala | Relación inusual de tamaños con referencia reconocible | Confusión espacial o efecto gratuito |
| Cercanía | Gesto/contexto pertinentes y punto de vista a distancia intencional | Escena estereotipada; foto cálida no garantiza humanidad |
| Innovación | Demostrar un mecanismo o capacidad nueva de forma comprensible | Cliché tecnológico; gradiente/3D no demuestra innovación |
| Calma/cuidado | Reducir competencia de focos y ritmo acorde con acción | Vacío indiferente o falta de información |

Proceso: mensaje y contexto → recepción propuesta → mecanismo creativo → variables observables → referencia
por función → comparación → crítica. En seasonality considerar prácticas locales; en trendjacking conservar
código reconocible. Si la persona interpreta distinto, revisar estímulo/contexto antes de culpar a su sesgo.

---|---|
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
- **Dependencia de referencias:** una fuente dominante puede favorecer fijación; buscar alternativas por
  función cuando hagan falta. Ni cinco fuentes garantizan originalidad ni una referencia única constituye
  automáticamente plagio: registrar alcance, permiso y transformación; no copiar ejecuciones ajenas.

---

## 7. Del brief al visual — flujo integrado

1. **Lee/completa el brief** (§1); reutilizar contexto y resolver sólo faltantes necesarios.
2. **Define emoción objetivo** y tradúcela a ejes visuales (§4–§5).
3. **Compara direcciones cuando están abiertas** (§2), con referencias anotadas. No reabrir concepto fijado.
4. **Elige el medio** por tarea (§3) — foto/ilustración/3D/IA/mixed.
5. **Fija el look & feel** en variables concretas (§4), defendibles contra el brief.
6. **Sintetiza el concepto** y pásalo a la construcción del KV (`modules/04` §8).
7. **Produce/dirige** (`modules/08`) si el encargo incluye producción; si sólo pide conceptos, entregar
   alternativas y recomendación. Handoff humano (`modules/09`) cuando corresponda al alcance.
8. **Audita** con la rúbrica de `modules/05` antes de escalar.

---

## 8. Checklist de cierre de dirección de arte

- [ ] Brief con mensaje núcleo en una frase, público, emoción y canales.
- [ ] Alternativas comparadas si el encargo está abierto; concepto fijado respetado.
- [ ] Cada referencia del board entra por una razón anotada.
- [ ] Medio elegido por tarea (foto/ilustración/3D/IA/mixed) y justificado.
- [ ] Look & feel traducido a variables concretas (luz, textura, color, encuadre…).
- [ ] Cada decisión visual conecta con el mensaje del brief (nada es adorno).
- [ ] Referencias por función y procedencia; sin cuotas ni garantía de originalidad por cantidad.
- [ ] Disclosure/derechos revisados donde aplique.
- [ ] Concepto listo para pasar a `modules/04` (construcción del KV).

> **Cierra con artefacto.** La dirección de arte se entrega como
> `templates/art-direction-moodboard.md` (board + look & feel + intención) apoyada en
> `templates/reference-library.md` cuando corresponda. Si se pidió una pieza, el board no sustituye el
> artefacto final; continuar producción y revisión dentro de la autorización.
