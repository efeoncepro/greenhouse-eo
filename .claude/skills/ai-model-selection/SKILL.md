---
name: ai-model-selection
description: >-
  Skill domain-free para elegir CON QUÉ MODELO producir un medio y para saber qué puede y qué no
  puede cada modelo del portafolio: imagen, video, audio, 3D, voz y LLM. Responde la pregunta
  «¿con qué genero esto?» y sus derivadas: qué entrada acepta, qué resolución y duración REALES
  entrega, si genera audio, cuántas referencias admite, qué controles expone, cuánto cuesta a la
  resolución que vas a pedir, qué filtros de contenido tiene y cuándo NO usarlo. Es el dueño del
  método y del CONTRATO DE MANTENIMIENTO de la flota; el catálogo con las fichas vive en la guía
  canónica y no se duplica acá. Invócala ANTES de gastar en cualquier generación, antes de
  presupuestar un lote y antes de afirmar que un modelo puede o no puede algo. NO produce la
  pieza —eso es de las skills de oficio (design-studio, motion-design-studio, audio-studio,
  social-media-studio, greenhouse-ai-image-generator)— y NO gobierna las rutas de Globe —eso es
  greenhouse-globe-model-fleet—. Triggers: «qué modelo uso», «con qué genero», «cuál es mejor
  para», «cuánto cuesta generar», «cuántas referencias acepta», «llega a 4K», «tiene audio
  nativo», «soporta transparencia», «qué modelos tenemos», «capacidades de», «elegir motor»,
  «presupuesto de generación», «model selection», «qué modelo de video/imagen/audio».
---

# AI Model Selection — qué modelo, con qué evidencia, a qué costo

> **Qué es.** El router de la flota de modelos generativos. Existe porque el conocimiento estaba
> **documentado pero huérfano**: la guía canónica tiene 1.090 líneas con la ficha de cada familia, y
> seis skills de oficio la citaban sin que ninguna la poseyera. Resultado medido: la guía sólo se
> cargaba si el agente **ya sabía que existía**.
>
> **Qué NO es.** No es un segundo catálogo —las fichas viven en la guía y se leen desde acá—, no
> produce piezas, y no gobierna rutas de Globe.

## 1. La fuente de verdad, y por qué no se copia acá

**Catálogo canónico:** [`GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`](../../../docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
— árboles de decisión (§2 imagen, §3 video), matrices comparativas (§4), **fichas por familia** (§5),
recetas por caso (§6), presupuesto (§7), brechas conocidas (§8) y rankings externos (§9).

🔴 **Esta skill NUNCA repite una cifra de la guía.** Un precio, una resolución o un cupo de referencias
copiado acá se desincroniza en silencio y produce lo peor: dos fuentes que se contradicen y ninguna que
avise. Acá vive el **método**; allá, el **dato**. Si necesitas el número, ábrelo.

**Contratos de código (lo que el CLI puede ejecutar de verdad):**
`src/lib/ai/fal-capabilities.ts` · `src/lib/ai/higgsfield-capabilities.ts` · `src/lib/ai/openai-image.ts`

🔴 **Ante conflicto entre la guía y el código, gana el código** — es lo que se ejecuta. Y la
divergencia **es un hallazgo que se arregla**, no una elección de la fuente más conveniente.

## 2. El orden. No saltes al comando

1. **Contrato de fidelidad primero, no precio por clip.** ¿Qué debe quedar IDÉNTICO y qué puede
   reinterpretar el modelo? Eso decide el motor. El canal, el formato y el precio son datos de forma.
2. **Árbol de decisión** por lo que necesitas (§2/§3 de la guía).
3. **Matriz** (§4): confirma entrada, salida máxima **real**, duración, audio y precio **a la
   resolución que vas a pedir** — no a la del titular.
4. **Ficha** (§5): lee «cuándo NO», las trampas y los filtros de contenido.
5. **Estima antes de gastar.** `--estimate` en `pnpm ai:fal` valida e imprime el costo **sin encolar**.
   `--list`, `--balance` y `--status` son gratis. Todo lo demás cobra.
6. **Comando** desde la ficha o la receta.

### Tres trampas que ya costaron dinero

- 🔴 **El precio del registro es el escalón MÁS BARATO, no el de tu resolución.** Sin `--resolution`
  el CLI envía el escalón más barato y lo avisa. Presupuesta por la que vas a pedir.
- 🔴 **Un filtro puede rechazar DESPUÉS de encolar y cobrar igual** (ByteDance con marcas y personas
  reales). Si hay marca en cuadro, o eliges el motor sin filtro, o sondas barato primero.
- 🔴 **«Verificado» no es «verificado a tu resolución».** Una familia puede estar verificada a 480p y
  su 1080p ser reescalado o no estar probado. La ficha lo dice; el titular no.

## 3. Quién decide qué (boundaries)

| Pregunta | Dueño |
|---|---|
| ¿Con qué modelo genero esto? ¿Qué puede? ¿Cuánto cuesta? | **esta skill** + la guía |
| ¿Cómo dirijo la pieza? ¿Qué plano, qué luz, qué copy? | `design-studio` · `motion-design-studio` · `audio-studio` · `social-media-studio` |
| ¿Cómo produzco el asset de UI con el runtime? | `greenhouse-ai-image-generator` |
| ¿Qué `routeId` expone Globe y está promovido? | `greenhouse-globe-model-fleet` |
| ¿Puedo usar comercialmente lo que salió? | `greenhouse-ai-creative-rights-governance` |

**Las skills de oficio son consumidoras.** Si una de ellas trae su propio criterio de selección y
contradice a la guía, eso es drift: se corrige en la guía, no se resuelve eligiendo la que convenga.

## 4. 🔴 Contrato de mantenimiento

> **El problema que este contrato resuelve:** la regla anterior (§11 de la guía) era **prosa** —
> «actualiza en el mismo commit»— y **nada fallaba cuando no se hacía**. Un dato vencido no revienta:
> **miente en silencio**, y el agente presupuesta con un precio que ya no existe o descarta un modelo
> que hoy sí puede.

### 4.1 Quien gasta, verifica

**Toda corrida real es una medición.** Si ejecutas una capacidad y observas algo distinto de lo que
dice la ficha —precio, latencia, resolución entregada, un rechazo, un flag que no existe— **actualizas
la guía en el mismo commit**. No es tarea de un mantenedor futuro: es de quien acaba de pagar por saberlo.

Qué se toca junto, siempre en el mismo commit:
1. el contrato de código (`fal-capabilities.ts` / `higgsfield-capabilities.ts` / `openai-image.ts`),
   con su `verifiedAt`;
2. la guía canónica: árbol, matriz, ficha, costo y brechas;
3. el manual de uso si cambian comandos o flags.

### 4.2 Toda afirmación lleva etiqueta y fecha

`[oficial]` proveedor · `[verificado]` corrida real nuestra · `[tercero]` ranking o benchmark ajeno ·
`[contrato]` lo que declara nuestro código · `[sin dato]`. **`[sin dato]` es una respuesta válida y
obligatoria**: omitir una columna la convierte en un `false` implícito que nadie puso.

### 4.3 Ventanas de vigencia — lo volátil vence antes

| Tipo de dato | Ventana | Por qué |
|---|---|---|
| Precio, ranking, disponibilidad | **90 días** | se mueven por mes |
| Capacidad estructural (cupos, formatos, flags) | **180 días** | cambian con versiones |
| Craft y método | no vence | no depende del proveedor |

### 4.4 El gate, que sí falla

```bash
pnpm models:freshness            # advisory
pnpm models:freshness --strict   # falla (exit 1)
```

Mide **dos cosas que se confunden**:
- **Cobertura** — toda capacidad del contrato de código debe aparecer en la guía. *Si el CLI puede
  gastar en un endpoint que la guía no menciona, la guía no sirve para decidir.*
- **Frescura** — cada `verifiedAt` contra su ventana, más las capacidades **sin fecha**, que son
  peores que las vencidas: nada puede vencerlas.

🔴 **El gate declara su propio alcance y hay que leerlo.** Hoy mide el carril fal; **no** mide el carril
Higgsfield ni los modelos de `pnpm ai:image`. **Un verde suyo no es un verde de toda la flota** — y esa
línea se imprime siempre, a propósito.

**Hallazgo de su primera corrida (2026-09-22):** cinco capacidades ejecutables que la guía no menciona,
entre ellas `seedance20-mini-i2v` — **la que se usó ese mismo día para una sonda pagada**. Y ocho sin
`verifiedAt`. El gate encontró en un minuto lo que la prosa no detectó en meses.

### 4.5 Dónde está cableado, y en qué modo

En **`docs:closure-check`**, que ya corre al cerrar trabajo. **Un gate que no está en el camino de
alguien está apagado**: construirlo no basta, hay que ponerlo donde ya se pasa.

🔴 **Hoy entra en modo ADVISORY, a propósito.** Ponerlo en `--strict` de entrada rompería el cierre de
todos los agentes por hallazgos preexistentes que no causaron. Informa en cada cierre y **pasa a
`--strict` cuando los hallazgos de su primera corrida estén cerrados**: las cinco capacidades sin
mención en la guía y las ocho sin `verifiedAt`. Esa promoción es la tarea que hace al contrato
ejecutable; mientras no ocurra, el gate avisa pero no obliga — y eso hay que decirlo, no dejarlo
implícito.

## 5. Al responder

- **Cita la evidencia y su fecha.** «Seedance 2.5 llega a 1080p» sin `as-of` ni etiqueta no es una
  respuesta, es un recuerdo.
- **Separa lo medido de lo inferido.** Si la ficha dice `[sin dato]`, dilo; no lo completes por simetría.
- **Da el costo a la resolución pedida**, no el del registro.
- **Nombra la alternativa y el «cuándo NO».** Una recomendación sin su contraindicación se aplica mal.
- **Si vas a gastar, estima primero.** `--estimate` no cobra.
