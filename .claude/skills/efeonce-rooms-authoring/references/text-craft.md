# Texto de una sala: voz, huecos y pesos

El comprador lee la sala sin nadie al lado. Cada línea tiene que poder sostenerse sola, con su dato y sin
relleno. La voz es la de Efeonce ([voz, tono y estilo](../../../../docs/context/05_voz-tono-estilo.md)): tú para el
comprador, nosotros para la capacidad, el dato primero y la interpretación después.

## Voz en la sala

- **Frase clave primero, corta.** «Hoy no apareces en 9 de 12 respuestas.» Después, en otra frase, el contexto.
- **Dato con su fuente, no adjetivo.** «Respuesta en 24 h hábiles», no «respuesta ágil». «Dos rondas incluidas»,
  no «revisiones flexibles».
- **Contraste que ilumina, sin superlativos.** Nada de «líder», «integral», «de clase mundial», «experiencia
  360», «soluciones a la medida».
- **Lenguaje del comprador.** Nada de `bloque`, `manifiesto`, `cobertura`, ids, códigos (`scene_*`), nombres de
  archivo ni jerga interna de Efeonce.
- **Ni URLs ni rutas.** Una fuente se nombra («Radiografía AEO, 20 de octubre de 2026»), no se enlaza.
- **Español neutro, tuteo.** Sin voseo (`querés`, `tenés`, `mirá`) ni modismos locales como muletilla.

## Cero marcadores en salas reales

Un marcador entre corchetes (`[PLAZO]`, `[N]`, `[CLIENTE]`, `[MONTO]`) es una pregunta que nadie respondió. En una
sala `real` el comprador lo lee como un dato que no existe. La cobertura de Rooms solo lo bloquea dentro de
escenas (`scene_placeholder`); en títulos, fragmentos editoriales, pruebas, capítulos o el subtítulo **no hay otro
control que tú**. El eval revisa todos los textos con `\[[^\]]+\]`.

Cuando falta un dato:

| En vez de | Escribe |
| --- | --- |
| «Entregamos en [PLAZO].» | Quita la frase, o: «El calendario se define en la reunión de inicio, con tu equipo.» |
| «Mejoramos [N] % la visibilidad.» | No prometas una cifra que no tienes: «Medimos la presencia en las mismas 12 preguntas cada mes.» |
| «Hola [NOMBRE].» | El nombre real del deal, o una apertura sin nombre. |

Las salas `synthetic` (demo, eval, fixtures) pueden mostrar marcadores a propósito: enseñan dónde iría un dato.
Aun así, no los dejes por descuido: si un marcador en una sala sintética no enseña nada, quítalo.

## Afirmaciones y su peso

- `measured` solo con captura y fecha; `illustrative` se dice como ilustración en el propio texto
  («Así se vería una respuesta con el plan en marcha»).
- Una hipótesis se escribe como hipótesis («Creemos que…», «Si la categoría se comporta como en…»), no como
  resultado.
- Una cifra en un texto editorial lleva su relación de evidencia. Si no la puedes conectar a una prueba, la cifra
  sale.

## Bricolage en texto de varias líneas: alternar pesos

Regla del operador (2026-10-31): en Bricolage, un texto de varias líneas **alterna pesos**. La frase clave va
pesada y el resto ligero. Un bloque entero en negrita se ve pesado y no guía la lectura. Caso fuente: el titular de
`/auth/error` de Rooms.

**Fuera del manifiesto** (texto que compones para una superficie con La órbita: una página, un correo, una
lámina, una pieza que diseñas con AXIS):

- Marca la frase clave con el token de peso pesado y el resto con el ligero (`--room-weight-bold` y
  `--room-weight-light` en Rooms; los equivalentes del contrato de AXIS en otras superficies). Nunca valores
  sueltos de `font-weight`.
- Una sola frase pesada por bloque de texto. Si todo es importante, nada lo es.
- La frase pesada es corta: 3 a 8 palabras.

> **Que te encuentren**
> cuando tus clientes le preguntan a una IA qué comprar.

**Dentro del manifiesto** no hay campo de énfasis, y el manifiesto no lleva estilo. Por eso:

- Nada de `**negrita**`, HTML ni marcas: el renderer las mostraría literales.
- Escribe la frase clave **primero y corta**, separada del resto por un punto o en el título, para que el
  renderer (o un futuro campo de énfasis) pueda darle el peso sin reescribir el texto.
- `title` lleva la frase clave; `intro` la explica. No repitas el título en la introducción.

Si una superficie de Rooms todavía muestra un texto de varias líneas con un solo peso, no lo compenses con
marcas en el texto: es un pendiente del renderer (campo de énfasis, follow-up de TASK-2091).

## Límites de cada campo

Los esquemas cortan el texto largo; escribe pensando en el espacio, no en el límite.

| Campo | Máximo | Buen largo |
| --- | --- | --- |
| `title` de bloque o escena | 300 | 3 a 8 palabras |
| `intro` de escena | 400 | 1 o 2 frases |
| Título de capítulo | 120 | 2 a 6 palabras |
| `showcase.contexts.where` | 120 | el lugar concreto |
| `showcase.contexts.caption` / `action` | 240 / 40 | como la marca lo publicaría |
| `showcase.notes.label` / `text` | 40 / 160 | una decisión de construcción |
| `cycle.goals[]` | 80 | un objetivo medible |
| `cycle.terms.response` / `rounds` | 60 | el término real |
| `answers.questions.question` | 200 | como lo preguntaría una persona |
| `answers` respuesta (`text`) | 800 | 2 a 4 frases |
| `team.people.help` / `ask` | 240 / 160 | qué hace por ti / cómo pedirle algo |

## Revisión antes de publicar

- [ ] Ningún `[…]` en la sala real (busca en el manifiesto completo de `rooms authoring`, no solo en escenas).
- [ ] Cada cifra tiene prueba o fuente; cada respuesta de `answers` tiene al menos una fuente.
- [ ] Ninguna URL, ruta, id, código ni nombre de archivo visible.
- [ ] Cada título dice la idea del capítulo; ninguno es «Introducción», «Sección 2» o «Resumen».
- [ ] Leído como comprador en «Ver como»: se entiende sin que nadie lo explique.
