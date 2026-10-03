# Spot animado 2D de Efeonce — Animación de marca con personajes y assets compuestos

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-03 por Claude
> **Ultima actualizacion:** 2026-10-03 por Claude
> **Estado:** primer caso aprobado por el operador el 2026-10-03 («Sparks × Efeonce AEO», v2); sin publicar
> **Documentacion tecnica:** [Método de producción y posproducción de video](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) · [Workflow de la skill `motion-design-studio`: spot animado 2D con assets de marca compuestos](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md) · [Taxonomía de video con IA](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) · [ADR del pipeline de video](../../architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md)
> **Manual de uso:** [Producir un spot animado 2D](../../manual-de-uso/creative/producir-spot-animado.md)
> **Caso fuente:** [Retrospectiva Sparks × Efeonce AEO](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md)

## Qué es

Un **spot animado 2D** es un video corto de marca propia de Efeonce, en dibujo animado, que cuenta una historia con
personajes para explicar una capacidad o un servicio. El primer caso, «Sparks × Efeonce AEO», muestra a un marketer
que le pregunta a una IA por su categoría, ve que la IA nombra a la competencia y, con los Sparks (los agentes de
Efeonce) trabajando bajo su dirección, logra que la IA tenga con qué nombrar a su marca. Cierra con Efeonce AEO, el
AI Visibility Report y el logo de Efeonce.

Formato del primer caso: 16:9, 1920×1080, 24 fps, 49,6 s, con locución, subtítulos, música y efectos.

> Detalle técnico: [retrospectiva, «Qué se pidió» y «Estado»](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md#estado)

## Qué tipo de animación es

No es una sola técnica: son cuatro capas que se combinan.

| Capa | Qué hace en la pieza | Quién la produce |
|---|---|---|
| **Dibujo animado 2D con sombras planas** (cartoon cel-shaded) | Personajes y fondos con contorno grueso, un solo escalón de degradado y sombras duras | La IA de imagen, guiada por las hojas aprobadas del elenco |
| **Video desde cuadros clave** (image-to-video) | Mueve la escena y la cámara entre un cuadro inicial y uno final aprobados | La IA de video (en el primer caso, MiniMax H3) |
| **Gráficos animados vectoriales** | Pantallas de chat de la IA y placa de cierre, exactas y legibles | Dibujados por código, cuadro a cuadro |
| **Composición y posproducción** | Sparks oficiales, logos, subtítulos, montaje, voz, música y mezcla | Scripts propios |

> Detalle técnico: [método transversal](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) · [workflow de la skill](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md)

## Qué se compone y qué genera la IA

La regla más importante: **lo de marca se compone, nunca se genera.**

| Se compone (exacto, desde el archivo oficial) | Lo genera la IA |
|---|---|
| Los Sparks, desde su dibujo oficial; nunca se espejan | Personajes del elenco 2D y fondos |
| Logos de Efeonce, Efeonce AEO y AI Visibility Report | Luz, volumen y profundidad |
| Pantallas de chat, preguntas, respuestas y marcas en pantalla | El movimiento entre cuadros clave |
| Subtítulos y textos | — |
| Kit sonoro oficial de la marca | Locución (voz de librería) y arreglo musical a partir del material oficial |

Cuando la IA retoca la luz de una imagen que ya tiene un Spark compuesto, se verifica que **no cambió ni un píxel
fuera de la zona** permitida. En el primer caso: 0 píxeles fuera.

El video tampoco escribe texto: el pedido a la IA lo prohíbe, porque si no aparece texto ilegible.

> Detalle técnico: [retrospectiva, hallazgos técnicos](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md#hallazgos-técnicos-de-esta-corrida) · [canon de los Sparks](../../operations/brand-characters/SPARKS_V1.md)

## Quién aparece

- **El elenco 2D** (Tomás, Camila, Renata y Mateo): personajes ficticios dibujados, con un sello sutil de Efeonce (luz
  de borde azul y un objeto azul cada uno; sin órbitas ni esferas). Pueden hacer de cliente en la ficción.
- **Los Sparks**: los agentes de Efeonce. Siempre trabajan con una persona que decide; nunca aparecen solos decidiendo.
- **El elenco fotográfico no se usa como cliente.** Representa al equipo Efeonce. Por eso el primer borrador, que usaba
  a Karo, se cambió por Tomás.

> Detalle técnico: [elenco 2D](../../operations/brand-characters/EFEONCE_2D_CAST_V1.md) · [elenco fotográfico](elenco-y-referencias-de-fotografia.md)

## Etapas y quién aprueba qué

| Etapa | Qué se produce | Quién aprueba |
|---|---|---|
| 1. Preproducción | Historia, guion de locución por escena, música, voz, efectos, plan de tomas, presupuesto | El operador, antes de generar nada |
| 2. Storyboard en canvas | Láminas por escena, línea de tiempo, elenco y cuadros clave | El operador, escena por escena (comenta sobre las láminas) |
| 3. Elenco (si hace falta uno nuevo) | Personajes con hojas de giro y expresiones | El operador; después se canoniza |
| 4. Cuadros clave | Imagen inicial y final de cada toma, con los Sparks compuestos | El operador |
| 5. Piloto | Una toma de prueba con el motor de video | El operador autoriza su gasto y, si sale bien, la producción completa |
| 6. Tomas | Todas las tomas de video | Revisión del agente; se rehacen las fallidas |
| 7. Corte y audio | Montaje, locución, música, efectos, subtítulos, mezcla | El operador escucha y aprueba (el agente no escucha) |
| 8. Entrega y variantes | Versión con y sin subtítulos, SRT; variantes por red | El operador; publicar es otra autorización |

Todo gasto con IA se pide con un **estimado previo** y una autorización explícita.

> Detalle técnico: [retrospectiva, línea de tiempo de rondas](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md#línea-de-tiempo-de-rondas)

## Reglas del contenido

- **El ritmo lo pone la historia**, no la duración pedida. El primer caso pasó de 60 s a 49,6 s porque «iba muy lento».
- **El copy de una capacidad u oferta se escribe con las skills dueñas cargadas** (para AEO: `seo-aeo` y
  `seo-aeo-practice`) y con el canon de personajes. **Nunca se promete** que una marca va a aparecer o ser citada por
  una IA.
- **El logo final respira sin voz.** La frase de cierre va sobre la placa anterior.
- **Las marcas de la competencia son inventadas** y se revisa que no exista una empresa con ese nombre.

> Detalle técnico: [naming de Efeonce AEO](../../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md) · [retrospectiva, decisiones del operador](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md#decisiones-del-operador-citadas-o-parafraseadas-desde-el-inventario)

## Cuánto cuesta (caso fuente)

El primer spot costó **USD 4,78 en fal** (video y música), cuadros clave dentro de un tope autorizado de USD 2,10 (no es gasto medido) y créditos menores de voz, bajo un
tope de referencia de ~USD 8. Es una referencia, no una tarifa: cada pieza se estima antes.

> Detalle técnico: [retrospectiva, costos](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md#costos)

## Límites

- **Cada toma de video dura como máximo 15 s** (límite del motor en fal y en Higgsfield). Por eso la historia se cuenta
  en escenas cortas.
- **El agente no escucha el audio y no hay transcripción automática local.** Que la voz diga lo que dice el guion lo
  confirma la escucha del operador.
- **La IA de video no sostiene la marca:** gira los personajes en 3D, cambia la paleta o inventa texto si no se lo
  impide. Por eso lo exacto se compone y cada toma se revisa.
- El modelo de video no entrega 1080 de forma nativa en la ruta usada: se sube de resolución en posproducción.

## Pendientes

Lo que hoy sigue abierto (estado al 2026-10-03):

- **Licencia comercial de Stable Audio** (el arreglo musical) sin confirmar con legal.
- **Excepción al canon sonoro:** el primer caso usa el registro de energía debajo de la locución, cosa que la
  [identidad sonora](identidad-sonora-efeonce.md) no permite. Fue una excepción aceptada por el operador para esa pieza.
- **Prueba de reconocimiento del elenco 2D** y **derechos del elenco** pendientes.
- **Publicación del elenco 2D en AXIS:** en curso.
- **Variantes de redes, en curso:** portada Instagram 4:5, portada LinkedIn 16:9 y una versión Instagram con
  pantalla negra muda al inicio y la animación de un teléfono genérico que invita a girar la pantalla.
- **Sin publicar.** Aprobar la pieza no autoriza publicarla ni usarla en pauta.

> Detalle técnico: [retrospectiva, pendientes y límites honestos](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md#pendientes-y-límites-honestos)
