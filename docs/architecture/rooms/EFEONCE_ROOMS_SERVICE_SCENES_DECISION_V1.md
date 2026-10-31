# Rooms — «Vive el servicio»: escenas como contenido de la sala

- Status: **Accepted** (2026-10-31, operador: «Apruebo el ADR»). Autoriza el contrato y el código local en
  `efeonce-rooms` `claude/rooms-approved-ui` (`5e4a73b`, `95d3ac2`). No autoriza push, deploy ni flags: el paso a
  producción sigue el gate de release de Rooms.
- Owner: Product/Commercial para el propósito; Platform para el contrato. EPIC-052; TASK-2068 y TASK-2071.
- Reversibility: two-way-but-slow. Los bloques nuevos solo existen en manifiestos V3/V4; V1/V2 publicados no cambian.

## Contexto

El 2026-10-31 el operador corrigió el propósito de Rooms: no es una herramienta para presentar, es **una demo
inmersiva del servicio**. El potencial cliente tiene que vivir cómo será trabajar con Efeonce, no leer sobre ello.
El canvas aprobado agregó cuatro escenas:

1. **Tu marca, en el mundo**: la pieza viaja por feed, story, vía pública y web; una lente muestra cómo está hecha.
2. **Pide, mira, ajusta, aprueba**: el comprador hace el ciclo brief → propuesta → ajustes → aprobación.
3. **Cuando pregunten, que aparezcas**: preguntas reales de la categoría, hoy y con el plan, con sus fuentes.
4. **Un equipo que gira a tu alrededor**: las personas del equipo, qué hacen, cómo pedirles algo y la semana.

Cada escena cambia de sala en sala: piezas, lugares, objetivos, preguntas y personas. Por eso es contenido de la
edición y no una pantalla fija del producto.

## Decisión

**Cuatro tipos de bloque nuevos en los manifiestos V3/V4: `showcase`, `cycle`, `answers` y `team`
(`schemaVersion: 1`).** Se crean y editan con el comando existente `content.upsertBlock` y se ubican en capítulos
con `content.arrange`, como cualquier bloque. No se crean comandos, tablas ni migraciones.

| Tipo | Qué guarda | Reglas de cobertura (bloquean publicar) |
| --- | --- | --- |
| `showcase` | `pieceBlockId`; `contexts[{surface: feed\|story\|ooh\|web, assetRefId, where, caption?, action?}]`; `notes[{assetRefId, x, y, label, text}]` en % del formato | La pieza existe, es un bloque de medio visible y tiene esos formatos; una superficie por contexto; cada nota sobre un formato mostrado |
| `cycle` | `pieceBlockId`; `goals[2–4]`; `adjustments[{label, effect: light\|tight\|contrast\|warm}]`; `terms{response, rounds}` | La pieza existe y es visible |
| `answers` | `basis: measured\|illustrative`; `capturedAt`; `questions[{question, today, plan\|null, note?}]`, cada respuesta con `sources[{name, kind, cited}]` | `measured` exige `capturedAt`; `plan: null` exige `note` |
| `team` | `people[{name, role, help, ask}]`; `week[{day, title, personId}]`; `response`; `rhythmNote` | Cada día apunta a una persona del equipo |

Comunes a los cuatro tipos:

- Títulos, introducción, ids únicos dentro del bloque.
- En una sala con datos reales, ningún texto puede quedar como marcador entre corchetes (`[PLAZO]`, `[N]`), porque el
  comprador leería un dato que nadie declaró. Las salas sintéticas los muestran a propósito.

**Vocabularios cerrados, nunca estilo.** Superficies, efectos y posiciones son vocabulario del dominio. El renderer los
traduce a La órbita (tokens AXIS, `SERVICE_TIMING`). Nada del manifiesto lleva color, fuente, tamaño ni duración.

**Lectura.**

- El lector de audiencia entrega `kind: 'scene'` con la escena resuelta: cada formato como rendition privada de la
  edición (o del borrador en vista previa), nunca `assetRefId` ni rutas internas.
- La escena pasa por la misma autoridad que su edición.
- Tres rutas a pantalla completa:
  - `/rooms/:roomId/editions/:editionId/vive/:blockId`;
  - `/rooms/:roomId/authoring/vista-previa/vive/:blockId?as=`;
  - la demo `/demo/vive/:blockId`.
- La sala muestra un capítulo de escenas como mosaico de entradas.

**Las escenas no escriben.** Lo que el comprador hace en una escena es una simulación del servicio:

- no crea preguntas ni progreso;
- no deja rastro en la API.

Si en el futuro una escena debe registrar algo (por ejemplo, el ajuste que pidió el comprador), eso será un comando
propio con su autorización, no un efecto lateral de la escena.

**Autoría.** La mesa de autoría lista las escenas junto a las piezas, las crea con valores editables y muestra en el
escenario la escena tal como la verá el comprador mientras se edita. Al guardar, envía el bloque completo con
`content.upsertBlock`. Por paridad Full API, la CLI y el MCP hacen lo mismo con el mismo comando.

## Alternativas descartadas

- **Pantallas fijas del producto con datos por sala en otra tabla.** Separaría las escenas de la edición: no se
  versionarían, no tendrían cobertura y «Qué cambió» no las vería.
- **Un bloque genérico `scene` con JSON libre.** Sin contrato no hay cobertura ni validación, y el renderer tendría que
  adivinar.
- **Que las escenas escriban preguntas o señales.** Mezcla simulación con evidencia; las señales deben salir solo de
  `progress.mark` y de comandos explícitos.

## Consecuencias

- V3/V4 aceptan los cuatro tipos; V1/V2 no cambian. Un manifiesto con escenas no se puede degradar a V2.
- La cobertura gana códigos nuevos `scene_*`, entre ellos `scene_placeholder` para salas reales.
- El perfil SEO/AEO queda cubierto por una escena `answers`.
- La comparación de ediciones trata las escenas como bloques: cambio de título o de contenido.
- Pendiente: certificar en la integración con una sala real y obtener la aceptación humana de la interfaz.

## Evidencia

- `local`: `pnpm verify` 375/375 sin skips + lint + typecheck + build (`5e4a73b`).
- `local`: GVC PASS de `rooms-service-showcase`, `rooms-service-cycle`, `rooms-service-answers` y
  `rooms-service-team` en 1440, 1280 y 390.
- Contrato para la interfaz: [backend-api-for-claude-design.md](../../documentation/rooms/backend-api-for-claude-design.md).
