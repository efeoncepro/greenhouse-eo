# TASK-1941 — Sparks: los agentes de Agent Ops como personajes propios de la marca

## Delta 2026-10-01

- **Dirección de diseño elegida por el operador (adelanto de los Slices 1–2):** pidió ángulos aislados de los Sparks
  para componerlos con Nexa y en casting. Ante la tensión con el diseño de la destacada «Agents» (parecido a Astro Bot)
  eligió «Agents refinado» y, entre tres refinamientos (A la marca en la cara, B la órbita, C la nave), **B + las tres
  ventanas de C**: esfera blanca que flota sin piernas, visor navy con dos ojos y sonrisa en arco de LED azul, la chispa
  del Nexa Mark como antena, anillo de órbita inclinado con su esfera y tres ventanas en la panza; sólo blanco, navy
  `#001A33` y azul `#0375DB`.
- **Spark base v01 producido:** dos vistas base y nueve ángulos (frente, tres cuartos izquierda y derecha, perfil,
  espalda, contrapicado, picado, mira arriba, mira abajo) a 1600 px, con fondo de estudio y transparente. Trabajo en
  `ai-generations/2026-10-01_sparks/` (prompts versionados, imágenes fuera de git); entrega en OneDrive
  `5. Contenidos/13- Branding/Sparks/2026-10 Spark base/v01/` con LEEME y manifiesto. Costo ≈ USD 1,3.
- **Lección del recorte:** el blanco del cuerpo en sombra queda del gris del fondo de estudio y el matting lo vuelve
  semitransparente (100–200 mil píxeles en espalda y contrapicado). Se corrigió editando la fuente a fondo gris medio
  `#7F7F7F` antes de recortar (≈ 20 mil píxeles, sólo el borde).
- **Sigue pendiente:** la hoja de modelo formal, el plantel de cinco con accesorio y gesto, expresiones, poses con una
  persona, entrada de catálogo con la guarda contra robots, `SPARKS_V1.md` y la revisión de colisión del nombre. La task
  sigue en `to-do` hasta tomar esos slices.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Status real: `Diseno — dirección B + ventanas de C elegida y Spark base v01 producido (2026-10-01)`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

Los robots que acompañan a Nexa en las fotos cine son texto dentro de fichas y salen distintos en cada imagen, con un
parecido a robots de terceros (Astro Bot, EVE). Esta task los convierte en **Sparks**: un grupo de cinco agentes con
diseño propio derivado de la marca (la chispa del Nexa Mark, la esfera, la órbita y la nave), uno por familia de trabajo
de Agent Ops, con hoja de modelo, giro de vistas, expresiones, biblioteca de poses 3D y entrada en el catálogo de
`foto:prompt`. Personifican el servicio de Agent Ops sin contradecir su oferta. Nombre, plantel y relato aprobados por
el operador el 2026-09-29.

## Why This Task Exists

Agent Ops no tiene cara. Hoy es el rol de Efeonce que diseña, configura, evalúa y opera agentes dentro de la
Transformación humano-agente de RevOps & CRM, y su imagen depende de fichas que describen «robots blancos con ojos LED»
a mano. El resultado:

- deriva entre imágenes (cuerpo de balón, de gato, cara de pantalla, visor) en `NX3`, `NX5b`, `AD2b` y `AD4f`;
- un diseño genérico parecido a personajes ajenos, que la marca no puede registrar ni defender;
- una contradicción con el canon fotográfico, que prohíbe robots («nunca robots, circuitos ni interfaces flotantes»)
  y exige que toda criatura salga de un kit (`copiloto` pide `criatura`).

La oferta pone además límites que la personificación debe respetar (`HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md`): «no
vendemos un organigrama de bots», cada agente tiene ficha de rol y dueño humano, y el agente no tiene accountability
corporativa.

## Goal

- Cinco Sparks con un diseño propio, reconocible y ownable, derivado de la geometría de la marca.
- Un kit por personaje (hoja de modelo, giro, expresiones, poses 3D) y una entrada de catálogo que obliga a usarlos en
  vez de describir robots.
- Canon y oferta alineados: los Sparks trabajan con contexto y siempre con una persona que los supervisa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md` (qué es Agent Ops y sus límites)
- `docs/context/09_marca-agencia.md` (arquitectura de marca, Nexa como personificación del Why)
- `docs/architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`
- `docs/architecture/nexa-intelligence/voice/nexa-identity-canon.md`
- `docs/operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md` y `EFEONCE_PHOTO_LEVERS_CATALOG_V1.md`
- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md`

Reglas obligatorias (decisiones del operador del 2026-09-29):

- **Nombre:** Sparks (singular «un Spark»). Sale de la chispa del Nexa Mark (arco + sparkle).
- **Plantel:** cinco, uno por familia de trabajo de Agent Ops: investigación, contenido, CRM/datos, servicio y reportes.
  Se diferencian por accesorio y gesto; forma y color son los mismos.
- **Diseño propio**, derivado de la marca (esfera, órbita, nave, chispa), nunca un robot genérico ni parecido a
  personajes de terceros. Blanco y navy; el azul #0375DB sólo en ojos y costuras (el acento del traje de Nexa, TASK-1940).
- **Relato:** trabajan con contexto (el reverso de «Tu IA no conoce tu negocio») y siempre con una persona que
  supervisa. Nunca reemplazan personas ni aparecen solos decidiendo. Nexa puede liderarlos en la ficción; las piezas de
  venta de Agent Ops llevan al equipo humano.
- **Escala:** nunca más grandes que la cabeza de la persona; siempre arriba de la cintura.
- **Registro:** cine y puesta en escena; nunca documental. El canon sigue prohibiendo robots salvo los Sparks del kit.
- Cada Spark tiene una ficha de personaje que refleja la ficha de rol de la oferta: qué lee, qué propone y qué ejecuta.

## Normative Docs

- `.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md` (método de biblioteca de poses)
- `docs/operations/social/PARTNER_MASCOT_POSE_LIBRARIES.md` (inventario de mascotas de partners)
- `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`
- `.claude/rules/brand-photography.md`

## Dependencies & Impact

### Depends on

- `TASK-1940` (traje de Nexa): fija el acento azul y la estética de placas que los Sparks comparten. No bloquea, pero
  se recomienda cerrarla primero.
- Referencias actuales de robots (para saber qué NO repetir): fichas `ai-generations/2026-09-26_deck-nexa/fichas/NX3-nexa-bionica.json`,
  `ai-generations/2026-09-27_ads-cine/fichas/AD2-916-revops-mono.json` y `AD4e-45-equipo.json`.
- Kits de la marca: nave 3D (`ai-generations/2026-09-17_efeonce-ship-3d/`), Nexa Mark (`public/images/nexa-mark/`).

### Blocks / Impacts

- `TASK-1926` (registro cine): las fichas que hoy describen robots pasan a declarar Sparks por catálogo.
- `TASK-1931` (banco de plates): las fotos nuevas con Sparks entran con procedencia del kit.
- `TASK-1925` (repo taller): el kit y su entrada de catálogo migran con `foto:*`.
- Deck «La órbita»: `proposal-cinematic-nexa` (`NX5b`) y las propuestas con agentes (RevOps, Salesforce Agentforce)
  quedan como consumidoras; las láminas nuevas que necesiten agentes esperan el kit.
- `TASK-989` (avatar vivo de Nexa): sin solape; los Sparks no son Nexa.

### Files owned

- `ai-generations/<fecha>_sparks/` (dirección, hoja de modelo y un kit por Spark; binarios fuera de git)
- `scripts/foto/build-prompt.mjs` (sólo las entradas de los Sparks y la guarda de robots)
- `scripts/foto/assets.lock.json` (resellado)
- `docs/operations/brand-characters/SPARKS_V1.md` (ficha del grupo y de cada personaje) [verificar carpeta; crearla si no existe]
- Deltas en `EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`, `EFEONCE_PHOTO_REGISTER_CINE_V1.md`,
  `HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md` y `docs/context/09_marca-agencia.md`

## Current Repo State

### Already exists

- Robots descritos a mano en fichas cine (`NX3`, `NX5`, `AD2`, `AD4*`), con resultados distintos en cada foto.
- Método de biblioteca de poses 3D probado con Clawd, Codex y Gigi (16 poses × fondo de estudio y transparente).
- Catálogo `foto:prompt` con criaturas de partner (`clawd`, `codex`, `gigi`) y la palanca `copiloto`, que exige declarar
  la `criatura` desde un kit.
- La oferta con fichas de rol por agente (`HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md`).

### Gap

- No hay personajes propios: ni diseño, ni nombre en el canon, ni kit, ni ficha.
- El catálogo no puede impedir que una escena describa «robots»: nada lo detecta hoy.
- El canon fotográfico no dice qué robots se permiten ni en qué registro.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `greenhouse-eo/scripts/foto` y `ai-generations/` (kits fuera de git, huella en el lock); canon en `docs/operations/`
- Future candidate home: `undecided`
- Boundary: kits de personaje + entradas del catálogo de `foto:prompt` + canon de marca; consumers = operador y agentes que producen piezas
- Server/browser split: `n/a` — CLI local en Node
- Build impact: `none` — no entra al bundle de Next ni a los workers
- Extraction blocker: `none` más allá de los de TASK-1925 (migración de `foto:*` al taller `efeonce-brand-workshop`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tres direcciones de diseño

- Tres direcciones genuinamente distintas, cada una con el plantel de cinco en una sola lámina: la forma sale de la
  chispa, de la esfera con la órbita o de la nave. En `--quality medium`.
- Revisión de parecido contra personajes de terceros (Astro Bot, EVE, BB-8, mascotas de partners) antes de mostrar.
- Publicarlas en el canvas «La órbita» con título «NUEVA · Sparks · …» y pedir que el operador elija una o una mezcla.

### Slice 2 — Hoja de modelo y giro

- Hoja de modelo del diseño elegido: proporciones, paleta, materiales, qué cambia entre los cinco (accesorio y gesto) y
  qué no.
- Giro de vistas por Spark (frente, tres cuartos, perfil y espalda) y hoja de expresiones (atento, trabajando, pide
  revisión, listo). Aprobación del operador.

### Slice 3 — Biblioteca de poses 3D

- Por Spark, poses con el método de `mascot-3d-pose-library.md` (fondo de estudio y transparente), incluidas las poses
  de trabajo con una persona: sobre el hombro, sobre el antebrazo, sobre el escritorio junto a alguien, entregando algo.
- Copia en OneDrive `5. Contenidos/13- Branding/Sparks/`.

### Slice 4 — Catálogo y guarda

- Una entrada por Spark en `scripts/foto/build-prompt.mjs` (tipo criatura, con `instruccion` de copiar la forma exacta,
  escala y la regla de supervisión humana).
- Guarda: si una escena describe robots, droides o bots sin declarar un Spark del catálogo, `foto:prompt` aborta con el
  mensaje de la regla. Sparks fuera del registro cine o de puesta en escena también abortan.
- Resellar `scripts/foto/assets.lock.json`; pruebas del catálogo en verde.

### Slice 5 — Canon, oferta y skills

- `docs/operations/brand-characters/SPARKS_V1.md`: qué son, relato, plantel con ficha de cada Spark, reglas de uso,
  escala y registro, qué no hacer.
- Deltas en el lenguaje fotográfico (los robots siguen prohibidos salvo los Sparks del kit), el registro cine, la
  oferta de Transformación humano-agente (Sparks como cara de Agent Ops, sin cambiar sus límites) y `09_marca-agencia.md`.
- Skills que describen robots o criaturas (`design-studio`, `greenhouse-ai-image-generator`, `efeonce-brand-studio`),
  con espejos `.codex`.

## Out of Scope

- Regenerar fotos ya aprobadas con robots (`NX5b` y derivadas): decisión aparte del operador.
- Animación, avatar vivo o Rive de los Sparks (seguiría la línea de TASK-989 si se pide).
- Uso de los Sparks en el portal Greenhouse o en Nexa conversacional.
- Registro de marca comercial del nombre: la task deja la revisión de colisiones (Adobe Spark, la app Spark) y la
  recomendación; el trámite es de Legal.
- Publicación en AXIS (`axis-brand-assets`): follow-up si el operador lo pide.

## Detailed Spec

- **Plantel y diferencias** (a confirmar en la hoja de modelo):

  | Spark | Familia | Qué hace en la ficha de rol | Accesorio y gesto sugeridos |
  |---|---|---|---|
  | 1 | Investigación | lee y resume fuentes | lente o lupa de luz; mira de cerca |
  | 2 | Contenido | propone borradores | tarjeta con trazo; la ofrece |
  | 3 | CRM/datos | ordena registros | anillo de datos en órbita; lo acomoda |
  | 4 | Servicio | responde y deriva | burbuja de conversación; saluda |
  | 5 | Reportes | mide y reporta | mini gráfico de barras; lo señala |

- **Colisión de nombre:** buscar «Sparks» en software e IA (Adobe Spark, hoy Adobe Express; la app de correo Spark;
  otros «Spark» de IA) y dejar el resultado en `SPARKS_V1.md`. No afirmar que está libre sin esa búsqueda.
- **Costo estimado:** tres direcciones en `medium` + hoja de modelo, giros y expresiones en `high` + unas 60–80 poses:
  del orden de USD 4 a 8. El CLI imprime `usage`: registrar el costo real.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (dirección elegida) antes del 2; el 2 (aprobado) antes del 3; el 4 después del 3; el 5 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El diseño se parece a un personaje de terceros | Marca / legal | medium | revisión de parecido en el Slice 1 antes de mostrar; forma derivada de la geometría propia | parecido señalado por el operador o por la revisión |
| Deriva de forma entre poses | Tooling / marca | high | producir poses editando desde el giro aprobado; revisar lado a lado | poses con proporciones distintas en la hoja |
| La guarda de robots rompe fichas vigentes | Tooling | medium | la guarda sólo mira fichas nuevas o las que describen robots; prueba de regresión | prueba de `build-prompt` roja |
| El relato contradice la oferta (agentes solos, reemplazan personas) | Comercial | medium | reglas en `SPARKS_V1.md` y en la instrucción del catálogo | pieza con Sparks sin persona en una venta de Agent Ops |

### Feature flags / cutover

- Sin flag: repo-only change, tooling local aditivo; la guarda se activa con el catálogo nuevo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–5 | `git revert` del commit del slice; los kits fuera de git se conservan | minutos | sí |

### Production verification sequence

1. Dirección elegida y hoja de modelo aprobadas por el operador en el canvas.
2. Pruebas de `scripts/foto` en verde y `pnpm foto:assets:check` sin faltantes.
3. Una ficha con un Spark compila; una que describe «robots» sin Spark aborta; una con Spark en registro documental aborta.

### Out-of-band coordination required

- Aprobación del operador en los Slices 1 y 2. Copia de los kits en OneDrive. Revisión de nombre con Legal si se
  decide registrar la marca.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El operador eligió una dirección y aprobó la hoja de modelo de los cinco Sparks.
- [ ] Cada Spark tiene giro, expresiones y biblioteca de poses en fondo de estudio y transparente.
- [ ] Ningún Spark tiene un parecido señalado con personajes de terceros en la revisión del Slice 1.
- [ ] `foto:prompt` resuelve los cinco Sparks por catálogo y aborta cuando una escena describe robots sin declarar un Spark.
- [ ] `scripts/foto/assets.lock.json` quedó resellado y `pnpm foto:assets:check` pasa.
- [ ] `SPARKS_V1.md` documenta relato, plantel, reglas, escala, registro y la búsqueda de colisiones del nombre.
- [ ] El lenguaje fotográfico, el registro cine, la oferta de Transformación humano-agente y `09_marca-agencia.md` citan a los Sparks, y las skills tienen sus espejos `.codex`.

## Verification

- `pnpm local:check`
- Pruebas de `scripts/foto` (`build-prompt.test.ts`)
- `pnpm foto:assets:check`
- Revisión visual lado a lado de giros y poses

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1926, TASK-1931 y TASK-1925 quedaron con delta: los agentes se declaran como Sparks por catálogo

## Follow-ups

- Regenerar con Sparks las fotos aprobadas que hoy llevan robots genéricos, si el operador lo decide.
- Publicar los Sparks en `axis-brand-assets` y en el Lab.
- Animación de los Sparks (motion) si el operador la pide.

## Open Questions

- ¿El plantel de cinco familias calza con lo que Agent Ops vende hoy, o conviene ajustar una familia al cerrar la hoja
  de modelo?
