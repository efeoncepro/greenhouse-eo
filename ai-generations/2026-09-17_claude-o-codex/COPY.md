# Copy — «¿Claude o Codex?» (2026-09-17)

Pieza: `out/claude-o-codex-4x5-v04.png` (4:5, sirve igual para el feed de LinkedIn y el de Instagram).
Marca Metricool: **Julio Reyes** (`5105024`) — LinkedIn personal e Instagram `cesargrowth`.
Estado: **borrador para aprobar**. No está programado.

## Cómo se tomó su voz

Leída de sus publicaciones reales vía Metricool (LinkedIn marzo–septiembre 2026, Instagram septiembre 2025–2026),
no inventada:

- **LinkedIn:** abre con un hecho en primera persona («Llevo más de nueve años…», «Anthropic acaba de lanzar…»),
  aporta datos concretos, lo baja a la conversación con clientes, cierra con una frase corta que pega («Si el proceso
  está roto, la IA no lo arregla, lo escala») y una pregunta en dos tiempos al lector. Dos o tres hashtags.
- **Instagram:** una idea por línea, confesiones («No voy a mentir:», «Así que sí,»), humor con un emoji, puntos
  suspensivos y cierre corto. Casi sin hashtags. El 🍏 aparece en los dos canales.

**El gancho sale de él:** el 10 de junio de 2026 publicó en LinkedIn, sobre Codex, «Soy Claude Lover 100%, pero esto
me dejó encantado». Esta pieza es la continuación natural.

## Hechos que el copy afirma, y dónde se verifican

| Afirmación | Verificación |
|---|---|
| En junio dijo ser «Claude Lover 100%» | Post de LinkedIn del 2026-06-10 (Metricool, marca 5105024) |
| Trabaja con Claude y Codex en el mismo repositorio | `greenhouse-eo`: `CLAUDE.md` + `.claude/skills/` y `AGENTS.md` + `.codex/skills/` |
| Los dos agentes trabajan con las mismas instrucciones | `pnpm skills:mirrors` exige que las skills espejadas sean idénticas |
| Un chequeo no deja subir cambios si dejan de serlo | `.husky/pre-push` corre `pnpm local:check`, que incluye `skills:mirrors` |

El resto es opinión suya y está escrita como tal. El copy **no afirma que la foto sea real** («la foto no miente» se
descartó por eso).

## LinkedIn

> En junio escribí aquí que soy Claude Lover 100%.
>
> Sigo siéndolo. Pero hoy trabajo con Claude y con Codex, los dos, en el mismo repositorio.
>
> Y cada vez que alguien me pregunta cuál es mejor, siento que la pregunta está mal planteada.
>
> En Efeonce los dos agentes trabajan con las mismas instrucciones: cómo operamos, qué no se toca y cómo se
> verifica algo antes de darlo por terminado. Tenemos incluso un chequeo que no deja subir cambios si las
> instrucciones de uno y de otro dejan de ser idénticas.
>
> Haciendo eso me quedó algo muy claro: la diferencia grande no está entre un modelo y otro. Está entre un agente
> con contexto y uno sin él.
>
> Un agente sin contexto, por bueno que sea, trabaja como alguien que llegó ayer a la empresa. Uno que conoce tus
> procesos, tus reglas y tus criterios trabaja como alguien del equipo.
>
> Por eso mi respuesta honesta a “¿Claude o Codex?” es otra pregunta: ¿cuál de los dos conoce mejor tu negocio?
>
> Ninguno lo trae de fábrica. Ese contexto lo construyes tú.
>
> ¿Tú ya elegiste? ¿O también los tienes a los dos hablándote al oído?
>
> #InteligenciaArtificial #Claude #Codex

## Instagram

> Hace unos meses dije que era Claude Lover 100%.
>
> No voy a mentir…
> hoy trabajo con los dos. 😅
>
> Claude y Codex, en el mismo proyecto,
> con las mismas reglas
> y el mismo contexto.
>
> Y cada vez que me preguntan cuál es mejor,
> llego a lo mismo:
>
> la diferencia no está en el modelo.
> Está en cuánto conoce tu negocio.
>
> Ninguno lo trae de fábrica.
> Eso lo construyes tú.
>
> Así que no…
> todavía no sé cuál elegir. 🍏
>
> ¿Tú a cuál le haces caso? 👇

## Texto alternativo (las dos redes)

> Julio Reyes sentado tras una mesa en un estudio oscuro, con las palmas hacia arriba y cara de no saber qué decidir.
> En su hombro derecho, Clawd, una figura naranja hecha de cubos; en el izquierdo, Codex, un robot azul con cabeza de
> nube y el símbolo >_ en la pantalla. Arriba, el título «¿Claude o Codex?» y la frase «No sé cuál elegir»; abajo,
> el logo de Efeonce.

## Al programar

- **Sin la marca de contenido generado por IA** (`isAiGenerated`), por decisión del operador.
- **Coordinación con la campaña:** «¿cuál de los dos conoce mejor tu negocio?» hace eco del KV de Efeonce «Tu IA no
  conoce tu negocio», programado para el lunes 21/09. Publicar esta pieza cerca de esa fecha la convierte en
  amplificación personal de la campaña.
- Programar o publicar requiere autorización explícita del operador.
