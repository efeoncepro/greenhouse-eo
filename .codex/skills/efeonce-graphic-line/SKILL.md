---
name: efeonce-graphic-line
description: The Efeonce graphic line «La órbita» end to end (living skill) — everything available in AXIS (tokens efeonceGraphicLine, contracts efeonce.graphic-line-orbit / collaboration-selection / email-signature, the @efeoncepro/axis-graphic-line package with its recipes, brand assets and the Lab), how to compose every piece (orbit, measure/trajectory, progress/deck, lens, spotlight, family map, state, voice question+answer, logo inline, slogan per service line, signature and URL bubble, email signature, merch, office, video), the motion language (the orbit alone and the three approved logo animations reveal/apertura/sting, values in efeonceGraphicLine.motion) and its convergence with the Efeonce photographic language, which stays in force. It routes composition BY SURFACE (web, DOOH, pDOOH, motion, audiovisual video, deck: contract efeonce.surface-composition 0.1.0 candidate, tokens efeonceGraphicLine.surfaces, pnpm surface:resolve in AXIS, the approved deck recipes proposal-cinematic and method-staircase, and the cinema register proposal-cinematic allows). It also owns the line's canonical iconography (two voices: Trazo for what is measured, Plastilina for what is created; the sphere as a rest/response state; the skewed orbit; @efeoncepro/axis-graphic-line/icons with resolveIcon, auditIconGroup, skewedOrbitHeroSvg and pnpm icons:export|check|vectorize in AXIS). Use for ANY piece, surface, code or doc that uses the orbit, the lens, the spotlight, the sphere as a full stop, the «Empower your …» slogan, the Efeonce signature, the logo animations or the axis-graphic-line package; for any icon or icon row in an Efeonce-brand piece (deck, report, social post, sticker, cover) and for creating a new glyph; before composing with AXIS or the Greenhouse compilers (creative:orbit, creative:layout graphic_line, foto:componer:cta marcaEnEscena, brand-motion); and when a human asks what is available or how something is built. Every session that changes the line, its tokens, contracts, package, Lab, motion or its photographic convergence MUST update this skill (see Skill Maintenance Contract).
---

# Efeonce «La órbita» — línea gráfica (skill viva)

La órbita es la forma propia de Efeonce: **anillo fino + arco con la esfera en la punta + halo**, nacida del isotipo.
Hace tres trabajos: **rodea** (una palabra, una lente, un objeto), **mide** (el arco es un dato real con fuente) y
**enfoca** (la lente y el foco, «Te hacemos visible»). Convive con el **lenguaje fotográfico de Efeonce**, que sigue
vigente: la foto muestra el oficio, la órbita señala lo que importa, y cada uno hace mejor al otro.

Esta skill sabe todo lo disponible y cómo componerlo. Los tokens guardan los números; **el criterio** —cuándo y cómo
usar cada elemento, con qué y por qué— está en [criteria.md](references/criteria.md), y pesa tanto como la API.
**Nunca inventes una API, un valor o una regla:** si no está en estas referencias o en el código, no existe; dilo y
propón agregarlo.

## Alcance

- **Sí:** marca propia Efeonce y su familia (Globe, Wave, Reach, RevOps, Greenhouse como marca), piezas sociales,
  deck, informes, firma de correo, merch, oficina, eventos, video de marca.
- **No:** trabajo de clientes, la interfaz del producto Greenhouse, piezas de otra marca. La órbita no es un adorno
  genérico.

## Por dónde empezar (carga selectiva)

| Necesitas… | Lee |
|---|---|
| **Una pieza para una superficie concreta** — hero web, DOOH (caminero, paleta), pDOOH (LED, mupi, spot, variantes), gráfica animada con foto, video (cartela, zócalo, super, subtítulos) o lámina de deck (incluida la propuesta de cine `proposal-cinematic`): recetas aprobadas, opciones, pendientes, rechazos, firma por soporte y cómo se compone con AXIS | [norma de composición por superficie](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) + [applications.md §L](references/applications.md) + guías AXIS `docs/agent-composition/surfaces/` (en `main` de AXIS; [Lab](https://axis.efeonce.org/references/surfaces/)) + la página de la superficie en el [canvas](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7) (empieza por su lámina «Guía · cómo componer …») |
| **El criterio**: qué significa cada elemento (anillo, arco, esfera, halo, lente, foco, voces, eslogan, firma), cuándo usar la órbita y cuándo no, con qué se combina y qué delata que no se entendió la línea — **léelo primero** | [references/criteria.md](references/criteria.md) |
| Saber qué existe: tokens, contratos, funciones del paquete, assets, comandos, versiones, el mapa del Lab | [references/package-and-tokens.md](references/package-and-tokens.md) |
| **Una aplicación concreta**: post, story, banner de LinkedIn, ads, deck, informe, firma de correo (personal y de equipo), oficina y uso del espacio, objetos, merch, vestir, credenciales, papelería, eventos, video — qué elementos van, dónde y cómo se produce | [references/applications.md](references/applications.md) |
| Decidir qué forma o receta usar y componer la pieza, con ejemplos completos | [references/composition.md](references/composition.md) |
| Una pieza con foto, o briefear una foto que llevará la órbita | [references/photography-convergence.md](references/photography-convergence.md) |
| Animar (la órbita sola o las animaciones del logo) | [references/motion.md](references/motion.md) |
| **Sonido de la marca**: logo sonoro, motion con sonido y etiqueta con voz (identidad **recomendada**, no canon; Glitch pendiente) | [references/motion.md](references/motion.md) §Sonido · [canon](../../../docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md) · skill `audio-studio` · AXIS `/references/sonic-brand.json` |
| Dónde está cada doc, archivo, medio y repositorio | [references/sources-and-assets.md](references/sources-and-assets.md) |
| **Íconos**: las dos voces canónicas (Trazo y Plastilina), la esfera como estado, cuándo responde, la órbita sesgada y cómo dar de alta un glifo nuevo. **Fuente de verdad en AXIS**: `efeonceGraphicLine.icons` + `@efeoncepro/axis-graphic-line/icons` (`resolveIcon`, `auditIconGroup`) y `pnpm icons:*` | [references/iconography.md](references/iconography.md) |
| Revisar antes de entregar | [references/qa-checklist.md](references/qa-checklist.md) |
| Qué decidió el operador, qué está pendiente, qué versiones hay | [references/ledger.md](references/ledger.md) |
| Trampas que ya costaron tiempo | [references/lessons.md](references/lessons.md) |

## Reglas duras (las más caras de romper)

1. **Ningún texto cruza la órbita.** Una órbita o una lente por pieza, nunca patrón.
2. **El arco mide un dato real con fuente** o no existe. Un dato es la posición de la esfera (parte a las 12, sentido
   horario, valor × 360°) con estela corta: la órbita **recorre**, nunca se llena como un loader. Al 100 % la esfera
   se queda.
3. **Un solo anillo alrededor del contenido**; las órbitas interiores sólo en una órbita vacía (el contrato lo rechaza:
   `inner-orbits-never-around-content`).
4. **La lente lleva arco y esfera** (nunca un disco suelto). **El foco siempre lleva su anillo**, concéntrico con la luz.
5. **Las piezas de formato fijo se reproducen, no se derivan**: `efeonceGraphicLine.pieces` y `portrait` guardan cada
   pieza medida del canvas; las recetas del paquete las pintan tal cual.
6. **La esfera que cierra el texto es parte del texto**: guías, marcas de corte, selección y cursores la incluyen.
7. **Efeonce firma todo**: logo centrado abajo; la burbuja `efeoncepro.com` sólo reemplaza al logo si el logo ya
   aparece en la imagen, y nunca va como texto. **El logo va dentro de la órbita sólo en cierres de marca** (cierre del
   deck, cierre de video, muro de recepción), con su resguardo X fuera del anillo; en todo lo demás, nunca.
8. **La línea de servicio decide el acento y la palabra del eslogan** («Empower your Growth | Brand | Engine | Voice |
   Revenue»). El eslogan sólo cierra, sin esfera ni mayúsculas. **El acento mide ≥ 3:1 contra su fondo** en gráfico y en
   texto ≥ 24 px, y **nunca va en texto de menos de 24 px** (ahí navy sobre claro, blanco sobre oscuro).
9. **La órbita no sustituye la composición fotográfica**: se declara a propósito y nunca cubre sujeto, reservas, lecho
   ni firma (chequeo `orbit-never-over-subject-or-reserves`).
10. **Valores sólo desde tokens** (`efeonceGraphicLine`, `axisMotion`): nunca HEX, px, grados o tiempos transcritos
    de un doc, el canvas o un comentario. Archivos de marca sólo desde `@efeoncepro/axis-brand-assets`.
11. **Movimiento:** la órbita sola sale del paquete; las animaciones del logo (reveal, apertura, sting) siguen el
    lenguaje de movimiento y sus valores de `efeonceGraphicLine.motion`. Nunca se generan con un modelo de video.
12. **Íconos sólo del catálogo de AXIS** (canónicos, D16–D22): **nunca dibujes un ícono a mano dentro de una pieza**;
    se pinta con `resolveIcon` (`@efeoncepro/axis-graphic-line/icons`), con la voz de la línea de la pieza, en reposo por
    defecto; responde **uno solo** y sólo si la pieza no tiene otra esfera, y el grupo pasa `auditIconGroup` antes de
    entregar. Un glifo nuevo se da de alta en AXIS con `pnpm icons:check` (Plastilina, antes `icons:vectorize`) **y** la
    aprobación del operador: el control mide el peso, no el carácter.
13. **Se compone por superficie** (2026-09-27): fuera de social, 1:1 y firma (que siguen en el contrato de la órbita),
    la pieza se declara con superficie, formato, papel y receta en `efeonce.surface-composition` y se resuelve con
    `pnpm surface:resolve` en AXIS; los `delegates` del manifest van a los compositores de Greenhouse. **Nunca
    coordenadas ni canal elegidos a mano.** El registro cine sólo con Nexa protagonista o en `proposal-cinematic`.
14. **Estado honesto:** la órbita es un sistema consistente, **no** un activo distintivo demostrado; la prueba sin
    logo va antes de cualquier pauta con la órbita. «Te hacemos visible» no sale a pauta sin revisión legal.

## Cómo se trabaja

1. Lee el pedido y decide con `criteria.md` si la órbita corresponde (¿rodea, mide o enfoca algo concreto?). Si no, la
   pieza va sin órbita: la fotografía y la tipografía bastan.
2. Elige la forma o la receta con el árbol de `composition.md`. Si la pieza vive en una superficie (web, DOOH, pDOOH,
   motion, video, deck), parte de la norma de composición por superficie y de su página del canvas. Si hay foto, aplica
   `photography-convergence.md` antes de componer.
3. Compón **por intención** (contrato) o con la **receta** del paquete; en Greenhouse, con los compiladores
   (`pnpm creative:orbit:render`, `pnpm creative:layout`, `pnpm foto:componer:cta`). Los íconos, con
   `@efeoncepro/axis-graphic-line/icons` (o `pnpm icons:export` en AXIS: Greenhouse todavía no consume `/icons`).
4. Corre los chequeos del adapter y el QA de `qa-checklist.md` sobre los píxeles finales.
5. Si aprendiste algo, actualiza esta skill (abajo).

## Skills vecinas

- `efeonce-brand-studio` — estrategia y gobierno de marca; decide el papel de la marca en la pieza.
- `design-studio` — dirección de arte, fotografía generada y QA de imagen; dueña del lenguaje fotográfico operativo.
- `efeonce-advertising-creative` — piezas con texto, CTA y selección colaborativa.
- `motion-design-studio` — oficio de video; para la marca Efeonce carga la norma de movimiento.
- `axis-design-system` — releases, paquetes y consumo privado de AXIS.
- `deck-studio`, `report-studio`, `social-media-studio` — formatos; esta skill les dice cómo entra la órbita.

## Skill Maintenance Contract (documento vivo, obligatorio)

Esta skill es la memoria operativa de la línea. **Un cambio a la línea no está terminado hasta que la skill lo
refleja**, en el mismo commit o en el inmediato siguiente. Aplica a Claude, Codex y cualquier agente, y a toda sesión
que toque: tokens `efeonceGraphicLine` (incluido `efeonceGraphicLine.icons`) o `axisMotion`; contratos
`graphic-line-orbit`, `collaboration-selection` o `email-signature`; el paquete `axis-graphic-line` (incluido `/icons`)
o `axis-brand-assets`; el Lab de la línea; los compiladores o el motion
de Greenhouse; el manual, el ADR, la norma de movimiento o el lenguaje fotográfico.

**Qué se actualiza y dónde:**

0. `references/criteria.md` — todo criterio nuevo o corregido del operador (qué significa un elemento, cuándo va y
   cuándo no, qué combina, qué error delata), con el ejemplo y la razón. Las correcciones del operador son la fuente más
   valiosa: se registran en el momento, con fecha.
1. `references/package-and-tokens.md` — todo token, campo de contrato, código de error, chequeo, función, atributo,
   comando o versión que aparezca, cambie o se retire.
1b. `references/applications.md` — toda aplicación nueva o regla de uso del espacio, con su tarjeta completa.
2. `references/composition.md` — toda forma, receta o regla de composición nueva, con un ejemplo real.
3. `references/photography-convergence.md` — todo cambio del lenguaje fotográfico o de la línea que afecte cómo
   conviven (y la sección recíproca de ambos docs canónicos).
4. `references/motion.md` — piezas, tiempos, entregables, comandos o destinos de medios.
4b. `references/iconography.md` — voces, glifos del catálogo, reglas de respuesta, órbita sesgada, comandos de alta y
   pendientes de la iconografía (el detalle vive en AXIS; aquí el criterio y la historia).
5. `references/qa-checklist.md` — todo chequeo nuevo o umbral medido.
6. `references/ledger.md` — **toda** decisión del operador (con fecha) y toda versión publicada; mover a «vigentes» un
   pendiente que el operador decida.
7. `references/lessons.md` — toda trampa que costó más de 15 minutos: fecha, síntoma, causa y regla. Se escribe en el
   momento, no al cierre.
8. `SKILL.md` — la descripción si cambió la superficie de disparo; una regla dura sólo si nació un invariante
   verificado en código o decidido por el operador.
9. Actualizar el sello «Verificado contra: repo@sha — fecha» de cada referencia que tocaste.

**Cómo se verifica:**

- AXIS: `pnpm build && pnpm test && pnpm typecheck && pnpm lint && pnpm design:check`; Lab
  `pnpm --filter @efeonce/axis-design-system-lab build && … test:e2e`.
- Greenhouse: `pnpm creative:layout:test`; motion: storyboard antes/después comparado byte a byte si se tocó el motor.
- Skill: espejo `.claude/skills/efeonce-graphic-line/` → `.codex/skills/efeonce-graphic-line/`
  (`rsync -a --delete .claude/skills/efeonce-graphic-line/ .codex/skills/efeonce-graphic-line/`) y `pnpm skills:mirrors`.
  Se edita `.claude/` y se espeja; nunca al revés.
- Docs: `pnpm docs:context-check` y, si cambió algo de marca, el manual y el ADR con su delta.

**Frescura:** si una referencia tiene un sello de más de 30 días o el código no coincide con lo que dice, se revisa
contra el código antes de usarla, y se corrige la referencia.
