---
name: efeonce-rooms-authoring
description: Craft skill for building an Efeonce Rooms room from a deal or a brief, end to end — read the input, choose chapters, author the four «Vive el servicio» scenes (showcase, cycle, answers, team), attach evidence with sources, bring pieces in without URLs, reach zero blocking coverage, review «Ver como» with the buyer's role, publish, invite only the deal's e-mails, notify the person you act for, and revert with the D4 commands. Use it whenever an agent (Claude, Codex or a remote MCP client) creates, edits, publishes or invites in a Rooms room, or writes text that a buyer will read there. It does not cover Rooms state, flags, releases or runtime operations (that is `efeonce-rooms`). Its reference eval (`evals/`) must PASS for the current skill hash before the first real client and after every change to this skill.
---

# Armar una sala de Rooms (oficio)

Esta skill enseña a convertir un deal o un brief en una sala que el comprador vive: capítulos con una idea
dominante, escenas de «Vive el servicio», pruebas con fuente, piezas reales, cobertura limpia, revisión como
cliente, publicación, invitación y aviso. Los agentes publican e invitan **sin aprobación previa**
([ADR del carril de agentes](../../../docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md), D6): el
control de calidad es este oficio y el eval que lo mide.

## Frontera con `efeonce-rooms`

| Esta skill (oficio) | [`efeonce-rooms`](../efeonce-rooms/SKILL.md) (operación) |
| --- | --- |
| Qué poner en la sala, en qué orden, con qué pruebas y con qué texto | Estado del programa, qué está desplegado y dónde |
| Qué comando usar para cada paso y en qué orden | Flags `ROOMS_*`, releases, alias, migraciones, recibos |
| Cuándo publicar, a quién invitar, cómo revertir y avisar | Acceso interno, canary, producción, incidentes |

Si necesitas saber si un comando está habilitado en un entorno, si hay una sala de prueba o qué versión corre,
**lee el [ledger de `efeonce-rooms`](../efeonce-rooms/references/program-ledger.md)**; esta skill no lo repite y
no debe envejecer con él.

## Antes de empezar

1. **Gate del eval.** Con un cliente real, corre `node scripts/skills/rooms-authoring-eval-freshness.mjs` desde
   greenhouse-eo. Si falla, no armes la sala de ese cliente: el oficio vigente no tiene un recibo PASS. Con datos
   sintéticos en local puedes trabajar igual.
2. **Canal.** Operas con la CLI `pnpm rooms` (desde el repo `efeonce-rooms`) o el MCP stdio local, siempre con la
   autoridad de la persona interna en cuyo nombre actúas. Hay dos formas de llevar esa autoridad:
   - **Login de la CLI (camino normal en producción).** La persona corre una vez `pnpm rooms login` (Efeonce ID,
     MFA y consentimiento de las clases de Rooms). Desde ahí tú usas los comandos **sin** `--session-file`: la CLI
     toma el login guardado y lo renueva sola. Antes de trabajar, `pnpm rooms whoami` te dice qué clases tienes
     (`read`, `author`, `release`, `access`); un `403` significa que te falta la clase de esa operación: díselo a la
     persona (vuelve a entrar y la consiente) en vez de buscar otro canal. `read.client` (textos e invitados del
     cliente) no está disponible para la CLI. Un `401` es que su acceso a ese espacio venció o la credencial se
     revocó: se lo dices y esperas. `--organization` elige el espacio en cada comando.
   - **`--session-file`** con la sesión de la persona (archivo privado `0600`). Sigue soportado y es lo habitual
     en un Rooms local; si lo pasas, la CLI usa ese archivo y no el login guardado.

   Declárate como agente: `--agent <cliente>` en la CLI (o `ROOMS_AGENT_CLIENT`); el MCP stdio toma el nombre del
   handshake y reutiliza el login si omites `--session-file`. Nunca uses otra identidad que la de esa persona,
   nunca imprimas ni copies su credencial (`~/.config/efeonce-rooms/credentials.json`) o su cookie, y nunca cierres
   su sesión (`pnpm rooms logout`) sin que te lo pida.
3. **Insumos que necesitas a la vista:** `organizationId`, la persona en cuyo nombre actúas y el deal o brief que
   te entregó una persona. Sin deal ni brief no hay sala: pídelo.

Forma de cada llamada (CLI; el MCP usa los mismos `operation` y `payload`):

```bash
# Con login guardado no hace falta --session-file; en local agrega --session-file S
# Lectores
pnpm rooms authoring  --organization ORG --room ROOM --agent claude-code
pnpm rooms validate   --organization ORG --room ROOM --agent claude-code
pnpm rooms invitation-management --organization ORG --room ROOM --agent claude-code
# Comandos: --input es el payload, sin envoltorio
pnpm rooms execute --organization ORG --operation content.upsertBlock --input bloque.json \
  --idempotency-key ROOM:upsert:escena-equipo:v1 --agent claude-code
```

Clave de idempotencia: `<roomId>:<operación>:<intención>:v<n>`. Ante un timeout repite **la misma** clave. Ante
`409`, vuelve a leer `rooms authoring` y rehace con la revisión nueva **y una clave nueva** (sube el `v<n>`): la clave
vieja quedó atada al payload anterior. No sobrescribas cambios ajenos. La revisión también avanza sola cuando el
worker termina los derivados de una imagen: después de subir o vincular piezas, lee la revisión fresca antes de la
siguiente escritura, y también antes de cada `uploads.complete` cuando subes varias piezas seguidas.

## El recorrido: del deal a la sala publicada

### 1. Leer el insumo y anotar los huecos

Extrae, sin completar nada por tu cuenta:

- **Comprador:** marca, decisor, champion y evaluadores, con sus **correos tal como aparecen** en el deal o brief.
- **Objetivo y plazos** declarados, con su fuente (deal, reunión, brief).
- **Piezas aprobadas:** cuáles existen, en qué formatos y quién las aprobó. Si no hay, no hay escena de pieza.
- **Fuentes:** Radiografía AEO (con su fecha de captura), datos del cliente, benchmarks, casos. Cada cifra que
  vayas a mostrar tiene que salir de aquí.
- **Huecos:** lo que el comprador esperaría ver y nadie declaró (precio, plazo exacto, una métrica). Se quedan
  fuera de la sala o se dicen como pendientes en palabras ([text-craft](references/text-craft.md)); nunca como
  marcador entre corchetes ni como dato inventado.

### 2. Crear la sala con su procedencia

`rooms.create` con un manifiesto `rooms.content.v3` completo: identidad, marca, perfil, procedencia, bloques,
pruebas, relaciones y capítulos. Arma el manifiesto en un archivo local y créalo de una vez; después itera con
comandos acotados.

```json
{ "roomId": "sala-andina-2027", "content": {
  "schemaVersion": "rooms.content.v3", "id": "sala-andina-2027", "organizationId": "ORG",
  "dataOrigin": "real",
  "provenance": { "sourceType": "user-authored", "reference": "Deal HubSpot 123 y brief del 2026-10-28" },
  "title": "Que te encuentren cuando preguntan", "subtitle": "Propuesta SEO/AEO para Andina 2027",
  "brand": { "name": "Andina", "descriptor": "Materiales de construcción", "monogram": "AN" },
  "profiles": ["seo-aeo"], "blocks": [], "evidence": [], "relations": [], "assetRefs": [] } }
```

- `validate-import` solo valida contra una sala que ya existe: no sirve para revisar el manifiesto antes de
  `rooms.create`. Crea y lee la cobertura con `rooms authoring`.
- Crea la sala con `assetRefs: []` aunque ya conozcas las piezas y vincúlalas después con `content.attachAsset`:
  una referencia con versión puesta en `rooms.create` hace que el `attachAsset` posterior responda `conflict`.
- `dataOrigin` es procedencia declarada: `real` si los datos son del cliente; `synthetic` solo para demos y
  fixtures (la sala muestra la insignia). Nunca lo derives del correo, el logo o el formato.
- `provenance.sourceType: fixture` no puede declarar `real`. Una sala real usa `user-authored` y en `reference`
  nombra de dónde salió (deal, brief, reunión), sin URLs.
- `profiles`: `creative` exige al menos un bloque de medio; `seo-aeo` exige un bloque editorial, diagnóstico o
  `answers`. Una sala combinada lleva ambos.

### 3. Capítulos: una idea dominante por capítulo

Cada bloque visible va en **exactamente un** capítulo (`block_without_chapter`, `chapter_block_repeated`). Entre 4
y 7 capítulos es lo habitual; el máximo es 12. Recorridos sugeridos (plantillas editables, no obligatorias):

| Perfil | Orden sugerido |
| --- | --- |
| Creativo | reto → idea → la pieza en el mundo (`showcase`) → cómo trabajamos (`cycle`) → equipo (`team`) → próximos pasos |
| SEO/AEO | oportunidad (`diagnostic` + pruebas) → cuando pregunten (`answers`) → plan y medición (`plan`) → equipo (`team`) → decisión |
| Combinada | oportunidad → la pieza en el mundo → cuando pregunten → cómo trabajamos → equipo → plan |

Agrega o reemplaza bloques con `content.upsertBlock` (reemplaza por `id`, agrega si no existe) y ordena con
`content.arrange`, que exige **todos** los ids de bloques del borrador en `orderedBlockIds`:

```json
{ "roomId": "sala-andina-2027", "expectedRevision": 7,
  "orderedBlockIds": ["oportunidad", "respuestas", "plan", "equipo"],
  "chapters": [
    { "id": "cap-oportunidad", "title": "Lo que vimos", "blockIds": ["oportunidad"] },
    { "id": "cap-respuestas", "title": "Cuando pregunten", "blockIds": ["respuestas"] },
    { "id": "cap-plan", "title": "Qué haremos y cómo lo mediremos", "blockIds": ["plan"] },
    { "id": "cap-equipo", "title": "Quién gira a tu alrededor", "blockIds": ["equipo"] } ] }
```

### 4. Escenas de «Vive el servicio»

Las escenas son contenido de la edición ([ADR de escenas](../../../docs/architecture/rooms/EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md)).
Todas llevan `schemaVersion: 1`, `title`, `intro`, `required` y ids únicos dentro del bloque. **Ningún campo de
estilo:** superficies, efectos y posiciones son vocabularios cerrados; color, fuente, tamaño y duración los pone
el renderer.

| Escena | Úsala cuando | Lo que no puede faltar | Cobertura que bloquea |
| --- | --- | --- | --- |
| `showcase` | Hay una pieza aprobada con formatos reales | `pieceBlockId` de un bloque de medio visible; `contexts[{surface: feed\|story\|ooh\|web, assetRefId, where, caption?, action?}]`, una superficie por contexto; `notes[{assetRefId, x, y, label, text}]` en % del formato | `scene_piece_missing`, `scene_format_missing`, `scene_surface_repeated`, `scene_note_unplaced` |
| `cycle` | Hay una pieza aprobada sobre la que el comprador simula el ciclo | `goals` (2 a 4), `adjustments[{label, effect: light\|tight\|contrast\|warm}]`, `terms{response, rounds}` con los términos reales del servicio | `scene_piece_missing` |
| `answers` | La propuesta toca visibilidad en buscadores o IA | `basis: measured` con `capturedAt` de la Radiografía, o `illustrative` dicho como tal; 3 a 16 preguntas; cada `today` y cada `plan` con al menos una fuente; `plan: null` con `note` que explique por qué el plan no fuerza la marca ahí | `scene_capture_required`, `scene_note_required` |
| `team` | Siempre que el comprador vaya a trabajar con personas concretas | `people[{name, role, help, ask}]` (1 a 6), `week[{day, title, personId}]`, `response` (tiempo real de respuesta), `rhythmNote` | `scene_person_missing` |

Reglas de oficio por escena:

- **`showcase` y `cycle` solo con una pieza aprobada.** Sin pieza no hay escena: no la reemplaces por un mockup
  ni por una imagen generada que nadie aprobó. Pide la pieza (paso 6) y arma el resto.
- **`showcase`:** `where` dice el lugar real («Story de Instagram, viernes 19:00»), con lo que el deal o el brief
  declaran: si no dicen el horario, no lo pongas; las notas de la lente explican
  una decisión de construcción, no elogian la pieza.
- **`cycle`:** `terms` son los del contrato o la propuesta (por ejemplo «Respuesta en 24 h hábiles», «Dos rondas
  incluidas»). Si no están declarados, la escena espera.
- **`answers`:** `measured` solo si tienes la captura (Radiografía AEO con fecha). Sin captura, `illustrative`, y
  el texto no se presenta como resultado. Las preguntas son de la categoría del comprador, no de Efeonce.
- **`team`:** personas reales del equipo que va a atender la cuenta, con su rol vigente. Nunca el elenco ficticio
  de la fotografía de marca en una sala real.

### 5. Pruebas: toda afirmación con su fuente

- Una prueba es un ítem de `evidence` con `claim`, `claimKind` (`hypothesis`, `proposal` o `simulation`) y
  `source` `author-declared` completo: `reference`, `capturedAt`, `scope`, `method`, `coverage` y `limitation`.
  Sin `capturedAt` o con un campo vacío, la cobertura la deja pendiente (`evidence_provenance_required`).
- Cada bloque `diagnostic` (un hallazgo es una afirmación) se conecta a su prueba con `content.linkEvidence`:

```json
{ "roomId": "sala-andina-2027", "expectedRevision": 9, "relation": {
  "id": "rel-oportunidad-captura", "required": true, "kind": "evidence",
  "source": { "blockId": "oportunidad" }, "target": { "kind": "evidence", "evidenceId": "ev-radiografia" } } }
```

- Una cifra dentro de un texto editorial (`%`, «x veces», «puntos») también lleva relación de evidencia, al bloque
  o al fragmento (`source.anchorId`).
- No hay comando para agregar una prueba suelta. Las pruebas entran en el manifiesto de `rooms.create`; para
  sumar una después, lee `rooms authoring` (contenido completo, no proyectado), agrégala y usa
  `content.importManifest` con ese manifiesto entero. **Nunca reenvíes lo que devuelve `draft` o `preview`:** son
  proyecciones y pueden omitir pruebas ocultas.
- `author-declared` significa que Efeonce declara la fuente; no es verificación. No escribas «verificado» ni
  «medido» si la prueba no lo es. Sin fuente, no hay afirmación: se reescribe como propuesta o se quita.

### 6. Piezas: bytes por una vía gobernada, nunca URLs

- Una pieza es un bloque `media` V3 (`schemaVersion: 2`, `title`, `alt`, `caption`, `assetRefIds` con un archivo
  principal y `adaptations[{assetRefId, label}]` para sus formatos).
- Los bytes entran por **`media.importFromSource`** cuando exista (TASK-2090: fuentes en lista blanca, sin URLs
  en tu contexto). Mientras no exista, **pídele la subida a una persona** (interfaz o `pnpm rooms upload-bytes`
  hecho por ella). Cuando el archivo esté `ready`, lo vinculas con `content.attachAsset`. El lector `media` de la
  sala devuelve una **lista** de archivos (no un objeto por id): búscalo por su id en la lista y espera `ready`
  antes de vincular. Después de vincular, revisa las etiquetas de `adaptations` del bloque (el formato principal
  puede quedar con una etiqueta genérica) y corrígelas con `content.upsertBlock` si no dicen el formato real.
- **Nunca** pongas una URL, una ruta interna ni un enlace firmado en el manifiesto, en un `caption` o en una nota.
  Nunca generes una pieza para «completar» una escena de un cliente real.

### 7. Cobertura en cero y «Ver como» el comprador

1. Lee la cobertura con `rooms authoring` (o `rooms validate`). Debe venir `coverage.publicable: true` y ningún
   issue con `severity: error`. Corrige cada código en su bloque; la tabla de la sección 4 y los códigos de
   capítulos y pruebas te dicen dónde.
2. Revisa la sala con el rol del comprador: `content.previewAudience` con `as: "buyer"` (MCP, o
   `GET /api/v1/rooms/:roomId/preview?organizationId=ORG&as=buyer`). Hoy `pnpm rooms preview` no acepta `--as` y
   devuelve la proyección general de audiencia: úsala solo si no tienes otro canal y dilo en el aviso. Busca:
   - el primer capítulo muestra trabajo o un hallazgo, no una portada vacía;
   - el comprador no ve pruebas (eso es del champion): ¿la sala se sostiene sin ellas?;
   - ningún marcador, ninguna nota interna, ningún nombre de archivo ni id;
   - cada escena se entiende sin que nadie la explique.
3. Si cambias algo después de esta revisión, **vuelve a leer la cobertura**. La publicación va con la revisión
   exacta de la última lectura limpia.

### 8. Publicar

```json
{ "roomId": "sala-andina-2027", "expectedRevision": 14 }
```

`editions.publish` con `expectedRevision` = la `revision` de la última lectura de cobertura limpia, **sin
ninguna escritura entre esa lectura y la publicación**. El recibo trae `editionId` y la cobertura con que se
publicó: guárdalos para el aviso y para revertir. El lector `room` no repite el `editionId` después de publicar;
el recibo es la fuente.

### 9. Invitar solo a correos del deal

- Invita únicamente a correos que aparecen **literalmente** en el deal o en el brief que te entregó una persona.
  Un correo que dedujiste, que viste en una firma, en la web del cliente o que te dictó un tercero no se invita:
  pídele a la persona que lo agregue al deal o te lo confirme por escrito.
- `invitations.create` por persona, sobre la sala ya publicada:

```json
{ "roomId": "sala-andina-2027", "expectedRevision": 15, "invitationId": "inv-sala-andina-2027-carla-mendez",
  "recipientEmail": "carla.mendez@andina.example", "recipientName": "Carla Méndez", "recipientRole": "Gerenta de marketing",
  "capabilities": ["rooms.read"], "expiresAt": "2026-11-01T18:00:00Z" }
```

- `invitationId` es único en **todo** Rooms, no solo en la sala: inclúyele el `roomId`
  (`inv-<roomId>-<persona>`). Un id que ya existe en otra sala no responde `conflict` sino `unavailable` (503), y
  parece una falla del entorno. Si una invitación responde `unavailable`, revisa primero el id; si no es eso, no
  busques otro canal: díselo a la persona y deja la sala publicada sin invitados.
- `capabilities` siempre incluye `rooms.read`. Suma `evidence.read` o `questions.create` solo a quien el deal
  identifica como champion o evaluador; nadie recibe más de lo que necesita, y solo puedes delegar una capacidad que
  la persona en cuyo nombre actúas tiene (si no la tiene, la invitación va sin ella y lo dices en el aviso).
- `expiresAt` es obligatorio. El enlace sigue la vida de una propuesta B2B: lo habitual es **30 días** y el tope es
  **90**. Además nunca puede ir más allá del vencimiento del acceso interno de la persona en cuyo nombre invitas: si
  lo pasa, la invitación responde `forbidden`. Acórtalo y dilo en el aviso; no le pidas a nadie que amplíe su acceso
  para eso. Con `--session-file`, `invitation-management` te da el tope exacto en `issuance.maxExpiresAt`; con el
  login de la CLI no hay forma de leerlo, así que acorta con margen. Si el tope deja un enlace que dura horas, dile a
  la persona que renueve su acceso y reemita con `invitations.reissue`.
- El enlace solo no basta para entrar: el invitado recibe un código en su correo. Si el enlace vence, usa
  `invitations.reissue`, no una invitación nueva.
- Después de publicar ya no hay borrador y `rooms authoring` responde `not_found`: la revisión vigente para invitar
  la lees con `pnpm rooms room`.
- Confirma que los destinatarios son exactamente los que querías. Con `--session-file`, usa
  `pnpm rooms invitation-management`, que muestra los correos. Con el login de la CLI ese lector (y `invitations`)
  pide `read.client`, que la CLI no tiene, y responde `not_found`; `pnpm rooms agents-activity` lista cada
  `invitations.create` tuyo con su `invitationId` y su reversa, pero **no el correo**. Ahí la confirmación es cruzar
  cada `invitationId` del recibo con el payload que enviaste, y cada correo de ese payload con el deal.

### 10. Avisar a la persona

Rooms registra cada publicación e invitación de un agente y avisa a la persona en su actividad; además, dile tú
en el mismo hilo en que te pidió el trabajo:

> Publiqué la edición `ed-…` de «Que te encuentren cuando preguntan» (sala `sala-andina-2027`) e invité a Carla
> Méndez, Tomás Ruiz y Andrea Soto con lectura. Cobertura sin pendientes; la revisé como comprador. Quedó fuera
> el precio, porque el deal no lo declara. Para revertir: republicar la edición anterior o revocar cualquiera de
> las tres invitaciones; te dejo los comandos abajo.

Incluye lo que hiciste, sobre qué sala, lo que dejaste fuera y por qué, y la reversa concreta
([reversal-etiquette](references/reversal-etiquette.md)).

## Reglas duras

- **NUNCA** un marcador entre corchetes (`[PLAZO]`, `[N]`, `[CLIENTE]`) en una sala real, en ningún campo. La
  cobertura solo lo bloquea en escenas; en texto editorial, pruebas o títulos el único control eres tú.
- **NUNCA** una afirmación sin fuente, una métrica inventada ni una ilustración presentada como medición.
- **NUNCA** invitar a un correo que no esté en el deal o en el brief entregado por una persona.
- **NUNCA** publicar con cobertura pendiente, sin revisar «Ver como» con el rol del comprador, ni con escrituras
  entre la última lectura de cobertura y la publicación.
- **NUNCA** URLs, rutas internas ni enlaces firmados en el contenido; nunca bytes en tu contexto.
- **NUNCA** color, fuente, tamaño ni duración en el manifiesto.
- **NUNCA** borrar ni editar a mano en la base para deshacer algo: se revierte con los comandos de D4.
- **SIEMPRE** avisar a la persona de cada publicación, invitación o acceso, con la forma de revertirlo.
- **SIEMPRE** correr el eval antes de cambiar esta skill y antes del primer cliente real.

## Referencias

- [`references/reversal-etiquette.md`](references/reversal-etiquette.md): cómo revertir cada acción, avisar y qué
  no hacer.
- [`references/text-craft.md`](references/text-craft.md): voz, cero marcadores, huecos dichos en palabras y la regla
  de pesos de Bricolage.
- [`evals/README.md`](evals/README.md): eval de referencia, cómo correrlo y cómo leer el recibo.
- Contratos del runtime (solo lectura): `efeonce-rooms/src/domain/{scene,content,content-v3,persistence,invitation,agent-lane}-contracts.ts`
  y `src/domain/content-validation.ts`. Contrato HTTP: [backend-api-for-claude-design](../../../docs/documentation/rooms/backend-api-for-claude-design.md).
- Experiencia y perfiles: [experiencia](../../../docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md) ·
  [perfiles creativo y SEO/AEO](../../../docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md) ·
  [procedencia `real | synthetic`](../../../docs/architecture/rooms/EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md).

## Mantenimiento

Byte a byte idéntica entre `.claude/skills/efeonce-rooms-authoring` y `.codex/skills/efeonce-rooms-authoring`
(`pnpm skills:mirrors`). Cualquier cambio en `SKILL.md`, `references/`, `agents/`, `evals/briefs/`,
`evals/expected/`, `evals/cases.json` o `evals/score.mjs` cambia el hash del bundle y exige una corrida nueva del
eval con recibo PASS.
