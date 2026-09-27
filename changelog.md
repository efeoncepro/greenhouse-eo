# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-27 — AXIS `axis-tokens` 0.3.10: `color.info`, motion de un solo valor y tokens CSS que existen

AXIS corrigió el Lab, que usaba `var(--efeonce-spacing-5)` y `-7`: no existen (la escala publicada es `1/2/3/4/6/8`), y
un `var()` de un token inexistente no avisa, porque la declaración entera vuelve a su valor inicial (`main@ed97c0b`).
También reemplazó `color-error` por `color-danger` y `color-border-strong` por `color-border`, y quitó `shadow-sm`; un
test nuevo del Lab (`design-tokens.test.ts`) falla si reaparece un token inexistente (`main@0a6da3b`). Publicó
`@efeoncepro/axis-tokens` `0.3.10` (tag `v0.3.10`, `main@aa1a638`, run `36324516573` en verde; los demás paquetes no
cambian): `--efeonce-color-info` (#1f6fd4), `efeonceTokens.motion` como alias de `axisMotion.duration` (`standard` pasa de
220 a 200 ms en TS; el CSS ya emitía 200) y un build que falla si una propiedad sale con dos valores. Greenhouse sigue
fijando `axis-tokens` 0.3.8: al subir a ≥ 0.3.10, `axis-package-drift.test.ts` falla hasta agregar
`info: axisSemanticHex.info` a `COMPATIBILITY_ROLES`. Documentado en el runbook de consumo AXIS (Delta 2026-09-27 c), el
mapa de continuidad, TASK-1927 (nota de dependencia), el registro cine, TASK-1926 y la skill `axis-design-system`
(+espejo `.claude`), que ahora trae la regla de tokens CSS y corrige los pines de Greenhouse. Sin cambios de código en
Greenhouse.

## 2026-09-27 — Registro cine con documento propio, pruebas publicitarias, repo taller y AXIS 0.3.9

El operador pidió documentar «con altísimo nivel de detalle» el estilo cinematográfico: nace
[`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (cámara,
luz de la línea como fenómeno, color por línea, vestuario, emblema compuesto, robots agentes, reservas, ficha comentada,
trampas, barra de juicio y evidencia), con punteros en el canon, la regla auto-load y diez skills (+espejo `.codex`).
Primera tanda publicitaria 9:16 y 4:5 en prueba: la firma caía sobre el sujeto con el contraste pasando hasta usar un
primer plano oscuro como lecho. Se creó el repo taller `efeoncepro/efeonce-brand-workshop` (ADR
`EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1`, TASK-1925) para sacar la producción de marca de Greenhouse sin reactivar
Globe. AXIS publicó `v0.3.9`: `efeonce.surface-composition` 0.1.2 (uso propuesta/brochure, portada y cierre, layouts de
`proposal-cinematic`, documento brochure).

## 2026-09-27 — Iconografía: IA, social y staff (D26)

El operador aprobó 19 íconos nuevos de la línea gráfica («Subelos todos a excepción del hoodie de trazo que no parece
un hoodie»): 9 de Trazo (ia, composer, buscador, influencer, prensa, social, multimedia, assets, staff-gorra) y 10 de
Plastilina con su volumen (chispa, prompt, barra-busqueda, aro-de-luz, television, like, galeria, biblioteca, hoodie,
gorra). El Trazo `staff-hoodie` no entró. El set queda en 36 Trazo + 43 Plastilina = 79 glifos y 43 volúmenes, publicados
en AXIS con el tag `v0.6.0` (`axis-graphic-line` 0.6.0, `axis-brand-assets` 0.3.4); Greenhouse fija axis-graphic-line
0.6.0 y axis-brand-assets 0.3.4. Documentado en el ADR (delta D26), el manual §14, la doc funcional 1.11, el manual de
uso 1.9 y las skills `efeonce-graphic-line` y `axis-design-system`.

## 2026-09-27 — «La órbita» por superficie en el Artifact Composer (TASK-1919) y `foto:isotipo` (TASK-1920)

Las 20 recetas aprobadas de la línea gráfica por superficie son plantillas del Artifact Composer en tres catálogos
nuevos: `graphic-line-deck` (PDF 16:9, seis láminas), `graphic-line-stills` (heros web, el teléfono por ancho, caminero,
último cuadro del loop y storyboard de motion) y `graphic-line-overlays` (capas de video en PNG con alfa). Una pieza sale
entera de un intent con `pnpm brand:compose` (mapper puro `src/lib/brand-surfaces`: exige receta aprobada y valida con el
contrato AXIS); opciones y pendientes fallan con `recipe-not-approved` y el video queda en motion
(`recipe-outside-composer`). Motor domain-free: fondo transparente por plantilla, gate de tinta ponderado por alfa y fix
de slots anidados; pintores de selección y CTA inyectados. `pnpm brand:tokens [--check]` y gate propio
`pnpm composer:visual-gate --catalog=graphic-line` (22 frames a 0 px; la deriva global de 60 frames es previa,
ISSUE-122). Greenhouse fija AXIS `v0.3.8` (`efeonce.surface-composition` 0.1.1) y depende de `axis-graphic-line`.
`pnpm foto:isotipo` compone el isotipo oficial sobre la prenda cuando `foto:emblema` muestra otro (TASK-1920). Local en
`develop`, sin push; ruta productiva en TASK-1921. Docs: ADR del composer, runbook del gate, norma por superficie §2.1,
índice de la línea, runbook AXIS, doc funcional 1.10, manual de uso 1.1 y skills `efeonce-graphic-line`, `deck-studio`,
`motion-design-studio` y `efeonce-advertising-creative`.

## 2026-09-27 — Iconografía: 30 íconos de oficio (D25)

El operador aprobó 30 glifos nuevos, producidos con el método de alta de cada voz y revisados en el canvas «Íconos de
La órbita» (sección 7): 15 de Trazo (correo, `llamada`, calendario, reunión, objetivo, presentación, contrato, checklist,
código, base de datos, nube, integración, seguridad, ubicación, reloj) y 15 de Plastilina (lápiz a estrella), éstos
también en volumen. El set queda en 27 Trazo + 33 Plastilina = 60 glifos y 33 PNG de volumen, publicados en AXIS con el
tag v0.5.0 (`axis-graphic-line` 0.5.0, `axis-brand-assets` 0.3.3; `axis-tokens` sigue en 0.3.7); el Lab muestra el
catálogo completo. Reglas nuevas: claves únicas entre voces y Trazo sin arcos elípticos. Documentado en la skill
`efeonce-graphic-line` (iconography §13, ledger, lecciones), manual §14, ADR, doc funcional 1.9 y manual de uso 1.8;
Greenhouse ya fija `axis-graphic-line` 0.5.0 y `axis-brand-assets` 0.3.3.

## 2026-09-27 — Línea gráfica de Glitch: sub-línea de «La órbita», sólo para Glitch

Nace la norma [`GLITCH_GRAPHIC_LINE_V1.md`](docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) y su
ADR [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md). Aplica **sólo a
Glitch**, el magazine semanal: hereda de La órbita la gramática, la esfera única, el fondo, Bricolage + Poppins, la firma
de Efeonce y los íconos, y agrega lo exclusivo de Glitch (manzana, verde `#6ec207`, falla en bytes, Guttery, cabecera
«EDICIÓN #N»), que nunca va en piezas de Efeonce. El operador aprobó el sistema de portada A/B/C con regla de rotación,
la lámina interior con su variante de noticia 1 y la contraportada; lente, blog, vlog, reel y tarjetas finales quedan en
propuesta. El flujo de composición (valores en AXIS, catálogo `glitch-edition` del Artifact Composer, overlays
HyperFrames con alfa) queda `Proposed`, sin tasks. Doc funcional y manual de uso nuevos; remisión en el manual de La
órbita §7. AXIS en rama `feat/glitch-line`, sin publicar; sin cambios de código en Greenhouse.

## 2026-09-27 — Iconografía: Plastilina en volumen canónica (D24) y el Trazo sin rasgo propio (D23)

El operador canonizó la tercera capa de la iconografía: **Plastilina en volumen**, cada glifo de Plastilina en arcilla
mate inflada, generado desde su vector aprobado (GPT Image 2.5 Sunburst editando el ícono plano) y entregado como PNG
con alfa. Complementa al plano: sólo en momentos protagonistas, uno por pieza, desde 160 px; nunca en listas, contenido
de deck, dashboards ni UI. En AXIS `main` (c18e3d3): tokens `efeonceGraphicLine.icons.volume` (axis-tokens 0.3.7),
los 18 PNG sellados en `@efeoncepro/axis-brand-assets` 0.3.2 (`volumeIconUrl`), `pnpm icons:volume -- refs|key|check|publish`
y la sección `#volumen` del Lab con su bloque en `/references/iconography.json`; publicados con el tag v0.3.7 (tokens 0.3.7, brand-assets 0.3.2).
Lecciones: el extruido en Blender quedó plano y se rechazó; `ai:image:rmbg` rellena los calados, así que el alfa se saca
por color contra el fondo liso; el QA compara silueta, calados y piezas con el plano y avisa sin rechazar. D23: «El corte»
en el Trazo se descartó; el Trazo queda funcional y la distinción la carga Plastilina. Skill `efeonce-graphic-line`,
skills vecinas, manual, ADR, doc funcional y manual de uso al día. Corrida: `ai-generations/2026-09-27_plastilina-3d-gpt/`.

## 2026-09-27 — La órbita se compone por superficie

Nace la norma [`EFEONCE_SURFACE_COMPOSITION_V1.md`](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md):
recetas aprobadas, opciones, rechazos, firma y reglas para web, DOOH, pDOOH, motion, producción audiovisual y deck, más
la tabla de contradicciones del inventario y cómo quedaron. El operador aprobó las recetas de deck `proposal-cinematic`
(servicios creativos, web, carrera de Nexa, RevOps, AEO y líneas de servicio con Nexa, cuyas cinco esferas son luz de
la foto) y `method-staircase` (BeX), amplió el registro cine a `proposal-cinematic` con personas del equipo en su
uniforme por registro, dejó el acento fuera del texto menor de 24 px y aprobó el 1:1 ajustado en el canvas (su salida
de `sinValidar` va con TASK-1918). El canvas del equipo se separó en una página por superficie, cada una con su lámina
guía. Manual de la línea §10.0, lenguaje fotográfico v1.6, doc funcional 1.7, manual de uso nuevo y skills
`efeonce-graphic-line`, `deck-studio`, `motion-design-studio`, `efeonce-advertising-creative` y `design-studio` al día.
El contrato AXIS `efeonce.surface-composition` 0.1.0 (`candidate`, `pnpm surface:resolve`, tokens
`efeonceGraphicLine.surfaces`) está en `main` de AXIS (Lab `/references/surfaces/` publicado; paquetes sin publicar en npm); sin cambios de
código en Greenhouse.

## 2026-09-27 — Glitch: diseño sonoro aprobado (versión B), sólo Glitch (AXIS /references/glitch/#sonido)

El operador aprobó la versión B: «La b me encanta más. Sus sonidos están aprobados». Es **sólo de Glitch**: no forma
parte de la identidad sonora de Efeonce ni se mezcla con su kit. Idea: «el sonido de Efeonce, con un bug». El motivo
Mi · Mi · Mi → La hace fallar la tercera nota, que se rompe en bytes y se rearma como la manzana, el único golpe grave. Es
diseño sonoro, no música, amarrado cuadro a cuadro al piloto de motion. Incluye un WAV por cada `.mov` del kit (lower
third y transición «manzana en bytes» incluidos) y una pista por transición entre escenas, calculada desde la misma
programación de celdas que la imagen: una lluvia de clics, nunca un whoosh. Motor determinístico
que ya vive en el taller (`tools/glitch-motion/src/sound.mjs` + `tools/brand-sound`, `2d411b8`): cada render deja su WAV
junto al `.mov`. Publicado en AXIS (PR efeoncepro/axis-design-system#8): sección `#sonido`, campo `sound` en
`glitch.json` y 38 archivos en el bucket `glitch/sound/v1`. La página de sonic brand saca a Glitch de su kit. Canon:
norma de Glitch §13.11, Delta del ADR, doc funcional, manual de edición, reglas y skills `efeonce-graphic-line`,
`audio-studio` y `motion-design-studio`.

## 2026-09-26 — Identidad sonora de Efeonce recomendada: «Tres puntos que se vuelven uno» (AXIS /references/sonic-brand/)

El operador aprobó como recomendada (no canon) la identidad sonora de la marca: el logo sonoro Mi · Mi · Mi → La traduce
la gramática de La órbita (el anillo pregunta, tres notas piensan, la esfera responde con el único golpe), con dos
registros del mismo ADN —fondo (96 BPM, síntesis propia) y energía (120 BPM, rock: maqueta propia re-grabada con Stable
Audio 2.5 y la esfera propia encima)—, el timbre de la esfera por línea de servicio (Growth campana, Brand marimba, Engine
FM, Voice eco, Revenue campana grave) y la etiqueta «Empower your <Línea>» con la voz de Brian (ElevenLabs v3). Re-sonoriza
reveal, apertura y sting V1.1 sin tocar la imagen, en 16:9 y 9:16. Publicado en AXIS (PR efeoncepro/axis-design-system#4):
página `/references/sonic-brand/`, JSON para agentes con URL y SHA-256 por archivo y guía `docs/agent-composition/sonic-brand.md`;
65 archivos en el bucket público `sonic/v1`. Valores fuera de `axis-tokens` hasta canonizar. Pendiente: licencias,
prueba de reconocimiento sin logo y reemplazo del sonido de los masters V1.1 (Glitch tiene su sonido propio: entrada del 27/09). Canon
[`EFEONCE_SONIC_IDENTITY_V1.md`](docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md), ADR Proposed, doc funcional,
manual, regla `.claude/rules/brand-sonic.md` y skills `audio-studio`, `efeonce-graphic-line`, `axis-design-system`,
`motion-design-studio` y `efeonce-brand-studio`. Producción: `ai-generations/2026-09-26_branding-sonoro/`.

## 2026-09-26 — Iconografía de La órbita canónica: Trazo y Plastilina (AXIS v0.3.6)

El operador canonizó la iconografía de la línea (D16–D22) en dos voces de una familia: **Trazo** (lo que se mide;
Growth, Engine, Revenue) y **Plastilina** (lo que se crea; Brand), con la esfera como estado (reposo o respuesta, en el
acento de la línea de la pieza), fondo `#001a33` en todas las líneas y la órbita sesgada como firma de Plastilina.
AXIS publicó con el tag `v0.3.6` los tokens `efeonceGraphicLine.icons` (`axis-tokens` 0.3.6) y
`@efeoncepro/axis-graphic-line` 0.4.0 con el subpath `/icons` (30 glifos; `resolveIcon`, `auditIconGroup`,
`skewedOrbitHeroSvg`), los comandos `pnpm icons:export|check|vectorize` para dar de alta glifos nuevos y la página
`/references/iconography/` del Lab (PR efeoncepro/axis-design-system#3). Dos pruebas a ciegas con agentes sin contexto
validaron la documentación; lo que tuvieron que adivinar se corrigió (gesto en tinta, medición real en `icons:check`).
Greenhouse todavía no consume `/icons`. Skill `efeonce-graphic-line`, ADR delta (f), manual §14 y las skills y docs
vecinas al día. Pendientes del operador: voz de Voice, aire del Trazo a 20 px, opacidad del anillo sesgado y el
reemplazo de Tabler en las firmas.

## 2026-09-26 — Línea gráfica: decisiones del operador sobre contraste, halo, logo y fotografía (AXIS 0.3.5)

El operador aprobó las recomendaciones pendientes de la línea «La órbita». El acento pide 3:1 contra su fondo como
gráfico o en texto de 24 px o más y nunca va en texto menor (Engine y Voice conservan su color); el magenta de
Revenue-HubSpot queda aprobado; la burbuja URL pide 4,5:1; el halo sobre papel va a la mitad; el anillo propio de la
esfera significa «en vivo»; el logo va dentro de la órbita sólo en los cierres de marca; «Growth» va en el acento en
el cierre del deck. AXIS publicó el juego `v0.3.5` (tokens y contracts 0.3.5 con el contrato de la órbita 0.3.1,
registry y brand-assets 0.3.1, graphic-line 0.3.2) y el Lab reproduce el banner, la story y el fondo de Teams con un
solo anillo y el reverso de la tarjeta con el logo solo. Se aprobaron las 12 reglas de sinergia con la fotografía y se
resolvieron sus 9 conflictos; lo que necesita código quedó en TASK-1918. Manual v1.8, ADR delta (e), lenguaje
fotográfico v1.4 y la skill `efeonce-graphic-line` al día.

## 2026-09-26 — Skill viva `efeonce-graphic-line` y la órbita junto a la foto

Nace la skill dueña de la línea gráfica «La órbita» (Claude y Codex, espejo byte-idéntico): el criterio de cada elemento
(anillo, arco, esfera, halo, lente, foco, voces, eslogan, firma), todo lo que existe en AXIS (tokens, contratos y
recetas de `axis-graphic-line`), cada aplicación (post, story, banner de LinkedIn, deck, informe, firma de correo,
oficina, merch, eventos, video), el motion del logo, la convergencia con el lenguaje fotográfico, el QA, un registro de
decisiones y pendientes del operador, y un contrato de mantenimiento. El manual de la línea suma §9.1 (la foto en la
línea) y fija «Revenue» como palabra del eslogan de RevOps; el lenguaje fotográfico suma §11 (la línea en la foto). El
router de CLAUDE.md y AGENTS.md apunta a la skill nueva.

## 2026-09-26 — Marketing Studio: capa de estrategia y operación híbrida con agentes (ADR aceptados)

Quedaron aceptadas tres decisiones de EPIC-049. Studio + un bucket GCP son la fuente única de los archivos de campaña, con
ingesta por CLI, MCP y agentes sobre un solo command. La capa de estrategia suma catálogo de canales, referencia al ICP
de la organización, plan de campaña, plan SEO/AEO sobre Search Visibility 360, IA con procedencia y medición de solo
lectura, todo operable por agentes con niveles de riesgo (T0 lectura, T1 borradores reversibles, T2 aprobar/publicar/
gastar con confirmación humana). La operación híbrida reparte cada campaña en work items asignables a personas o a roles
de agente (planificador de medios, SEO/AEO, copywriter, QA creativo, analista), con un despachador en Studio y
adaptadores Claude y OpenAI detrás de flags. Tasks TASK-1905–1916 en to-do; sin cambios de runtime todavía.

## 2026-09-26 — Firma de correo v3.1 aprobada: zona de partners y contrato `efeonce.email-signature`

El operador aprobó la firma de correo en sus dos versiones (A sobre papel, B tarjeta navy). La línea que termina en la
esfera va una vez; los partners (HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y BytePlus)
abren su propia zona con una regla fina sin esfera, en logos oficiales de un solo tono y el mismo peso óptico. Sin
«Quedo atento» y todo el texto que no es el nombre en Poppins. AXIS `c7717ef`: tokens
`efeonceGraphicLine.emailSignature`, contrato `efeonce.email-signature` 0.3.0 (`stable`) con `pnpm signature:resolve`,
guía para agentes y lámina 4.5 del Lab. Greenhouse: manual §10.2, ADR, documentación funcional, manual de uso y las
skills `efeonce-brand-studio` y `axis-design-system`. Después: paquetes AXIS publicados (0.3.2 y 0.3.4), imágenes en
el bucket público `email-signature/v3.1/`, HTML listo para Outlook y **firma de equipo** aprobada (Talent, Finance,
Commercial: sin foto, la órbita rodea el ícono del área; variante `team`). Pendiente: instalar en Outlook.

## 2026-09-26 — Línea gráfica «La órbita»: AXIS 0.3, recetas fieles al canvas y motion V1.1

AXIS publicó 0.3.0 (tokens, contratos, registro y assets) y el paquete nuevo `@efeoncepro/axis-graphic-line` 0.3.1,
que pinta la órbita y sus recetas. Cada pieza de formato fijo (lente, foco, deck, firma de correo) quedó medida en el
canvas y la receta la reproduce; la órbita genérica usa las medidas del canvas (arco centrado, 200°–250°). Reglas nuevas
de contrato: la lente lleva arco y esfera, el foco siempre su anillo, un solo anillo alrededor del contenido y la esfera
final es parte del texto (también en la selección colaborativa 0.3.0). Greenhouse adoptó 0.3.0 en develop: el
compositor de campañas pinta la lente y el deck según el contrato nuevo (suite completa en verde). El motion del logo
V1.1 (reveal 3,6 s, apertura 2,4 s, sting 1,6 s) quedó aprobado y documentado; sus masters se sirven desde el bucket
público `gs://efeonce-group-axis-public-media` y el Lab muestra versiones web con su ficha, junto a la animación de la
órbita sola. El lenguaje de movimiento quedó como norma (`EFEONCE_ORBIT_MOTION_LANGUAGE_V1`) y sus valores en los tokens
`efeonceGraphicLine.motion` (`axis-tokens` 0.3.3), que el render lee: los 90 cuadros clave y los tres sonidos salen
idénticos byte a byte. Rollback: fijar de nuevo los paquetes en 0.2.7.

## 2026-09-26 — Marketing Studio: originales en GCS, worker de medios y restauración probada (TASK-1893, TASK-1896)

Studio guarda en GCS una copia verificada (sha256 + crc32c, deduplicada) de los finales aprobados: 30 versiones por
ambiente; las 24 imágenes de CMP-002 siguen en OneDrive porque el catálogo no trae su huella. Un worker de Cloud Run
genera miniatura, preview, portada de video y recortes al llegar cada original, repara faltantes con un barrido horario
y lee de Metricool la evidencia real de publicación. Un cliente autorizado descarga un original por URL firmada de
10 min, auditada, con su estado de derechos (`STUDIO_ORIGINAL_DOWNLOADS_ENABLED` sólo en production). Studio además
tiene Sentry propio, uptime check con email, health profundo, registro de corridas y una restauración lógica ensayada
contra producción (job 49 s) con ensayo mensual programado; Greenhouse lo observa con la señal
`platform.marketing_studio.health` y avisa a Teams «EO - Admin» en `error`. Release Greenhouse `92002873ced9` (PR #243).
Pendientes en los Follow-ups de cada task. Rollback: flags a `false` + redeploy, pausar schedulers, `media:ingest
--revert-provider`.

## 2026-09-26 — Efeonce Insights: diseño premium en producción (TASK-1889)

Los informes A4 y los decks de Insights salen con el diseño premium aprobado por el operador: portada blanca o navy
con el logo del cliente, índice, «Lo esencial», capítulos, páginas de gráfico por familia, tabla de respaldo, límites y
contraportada; el diseño anterior se retiró del código. Las variaciones muestran la dirección del valor con el triángulo
y, con el tono, si el cambio es mejor o peor para esa métrica (posición y RpA: menor es mejor). Código en los releases
`0e87c7a443a2` y `f9257b9c94af`. Verificado en producción con las primeras ediciones internas de Berel (A4 16 páginas +
deck 15 láminas) y Sky (A4 12 + deck 10), los cuatro PDF al primer intento. Emisión y compartir siguen OFF en
producción. Rollback: revert del código de catálogos y release.

## 2026-09-26 — Efeonce Insights: contrato editorial v2 encendido en producción (TASK-1888)

Los informes nuevos de Insights salen con el contrato v2: lectura por figura (cifra principal, conclusión, próximo
paso), «Lo esencial» sólo con hallazgos, líneas de alcance, tabla «<módulo>: todas las cifras» y portada sellada por
organización (`auto`/navy/blanca; navy sólo con logo apto para fondo oscuro). Superlativos sólo con máximo único (con
empate se dice el empate). Código en los releases `0e87c7a443a2` y `f9257b9c94af`; gateway efeonce-mcp v1.9.0 con
`get/set_insight_cover_preference`; `INSIGHTS_EDITORIAL_V2_ENABLED` ON en Vercel staging/Production y en el
`ops-worker`. Verificado con un canary sintético en producción que sella el plan v2. Emisión, sharing y correo siguen
OFF en producción. Rollback: flag OFF en los dos runtimes.

## 2026-09-26 — La órbita 0.2.0: firma por regla, assets oficiales y la oficina en foto

Regla del operador: una pieza gráfica firma con el logo de Efeonce centrado; la burbuja URL lo reemplaza sólo si el
logo ya está en la imagen (centrada, fusión de luminosidad, lecho muy oscuro). La órbita se usa en casos puntuales y no
sustituye la composición fotográfica. AXIS 0.2.7: contrato `efeonce.graphic-line-orbit` 0.2.0 (`signature`, `slogan`,
`state`, `brand-close`; checks de firma y de sujeto), tokens nuevos y paquete `@efeoncepro/axis-brand-assets` (19 SVG
sellados); el Lab sincroniza los archivos, suma la sección 4.9 «Oficina en foto» y el banco de tipografía firma con el
logo. Greenhouse pinnea 0.2.7: `creative:orbit:render` pinta y mide la firma; `creative:layout` acepta la capa
`graphic_line` y `brand.signature`; `foto:componer:cta` tramo 17 (`marcaEnEscena`, gate `firma-burbuja`, P11, 3
mutantes) sólo en piezas nuevas, sin recertificar las aprobadas (el gate las muestra 3 hasta recomponer; ningún CI lo
corre). La oficina de 4.3 se fotografió con IA (9 fotos, 4 corregidas por edición); canvas 40 láminas, PDF 56 hojas.
Pendiente: umbral de contraste de la burbuja (4,5:1 hoy, al límite) y la atribución sin logo.

## 2026-09-26 — Marketing Studio por MCP en producción (release 0e87c7a443a2)

Release develop→main PR #240 (run `36222331450`, released): canje RFC 8693 `efeonce-mcp-marketing-studio`, capability `marketing_studio.campaign.read`, manual MCP `marketing-studio` servido por el lane de skills (canary 200) y contrato editorial v2 de Insights con flag OFF (canary `cover-preference` 200). Gateway `efeonce-mcp` `958c9de30` con el provider `marketing-studio` encendido (`00061-sbc`). TASK-1890 y TASK-1891 complete: una sesión MCP real devolvió datos de producción, tras la migración correctiva `20260926071321910` (política del cliente de canje) y el fix `efeonce-mcp#20` (montaje del secreto). [Ledger de tiempos](docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md).

## 2026-09-25 — La órbita se compone por intención (AXIS 0.2.6)

Contrato candidate `efeonce.graphic-line-orbit` 0.1.0 en `@efeoncepro/axis-ui-contracts` 0.2.6: un agente declara órbita, medida (con fuente o sin arco), progreso de deck, lente, foco, mapa de familia, burbuja de URL, voz o logo en frase, y AXIS valida las reglas y resuelve cada valor desde los tokens. Adapter de Greenhouse: `pnpm creative:orbit:resolve` y `pnpm creative:orbit:render` (SVG, PNG y `qa.json`; falla si un texto cruza el anillo). Pines AXIS a 0.2.6. [Manual](docs/manual-de-uso/creative/usar-linea-grafica-efeonce.md) · [skill](.claude/skills/efeonce-brand-studio/references/graphic-line-orbit.md).

## 2026-09-25 — Línea gráfica «La órbita»: banco de fotos y canon en AXIS

Banco propio de 8 fotos para la lente, hecho con el lenguaje fotográfico (`pnpm foto:generar`, 11 generaciones, ~USD 0,55; tres rehechas por el lenguaje). Reemplaza a las tres fotos repetidas con emblema en canvas, estímulos de la prueba sin logo, PDF y AXIS. ADR de canonización y tokens `efeonceGraphicLine` pasados a `canonical` en AXIS. [ADR](docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [manual](docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md). Atribución sin logo sin medir.

## 2026-09-25 — Insights: el diseño aprobado llega al informe y al deck (TASK-1889)

Los catálogos `insights-report` (A4) e `insights-deck` (16:9) componen sólo con el canvas aprobado el mismo día: portada navy o blanca con el logo privado del cliente (sellado como referencia, bytes autorizados por el worker), índice, «Lo esencial» con el folio real de su evidencia, aperturas de capítulo, una página de figura por familia (comparación de períodos, columnas por canal, metas con banda del registro ICO, tendencia), tabla, límites y contraportada desde el SSOT de marca. Se retiraron la página analítica y la lámina de evidencia v1. Fidelidad al canvas 20/21 ≤ 1 % (Deck-Agrupadas con excepción aprobada); gate visual de Insights a 0 px; ediciones reales de Berel y Sky compuestas en local, que revelaron y corrigieron cinco defectos. Code complete en develop, sin push; rollout pendiente. [Dossier](docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/README.md).

## 2026-09-25 — Marketing Studio listo para agentes y federado en el gateway (TASK-1890/1891)

Studio publica un registro único de operaciones del que se derivan su OpenAPI (1.1.0) y el manifiesto `studio-tool-manifest.v1` (12 tools de lectura `studio.*` + 5 exclusiones con razón, `manifestHash`, leak test y paridad con los route handlers). La API acepta bearer de `api_client` con organizaciones permitidas (`organizationId` nunca amplía), las campañas usan el id canónico de organización de Greenhouse y hay detalle y preview por pieza. Imágenes por enlace firmado sin consulta a la base (incidente de conexiones del mismo día). En Greenhouse: capability `marketing_studio.campaign.read` y manual MCP `marketing-studio` (manuales con `provider` externo). Toolchain de Studio al día (TypeScript 7, React 19.3, catálogo único de versiones). [Arquitectura §4.1](docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md). Gateway `efeonce-mcp` 1.8.0 con provider `marketing-studio` (12 tools, canje RFC 8693 por persona en Greenhouse, guard de manifiesto) desplegado con el flag OFF hasta el release de Greenhouse. Skill `efeonce-marketing-studio`.

## 2026-09-25 — Efeonce Marketing Studio: fundación en producción

Nuevo producto `studio.efeonce.org` (EPIC-049 / TASK-1887). Repo `efeoncepro/efeonce-marketing-studio`, solo código, con docs en este repo. Next.js en Vercel con `/api/v1` (OpenAPI 3.1, 12 rutas) y dominio sin framework. Bases `marketing_studio` y `marketing_studio_staging` en `greenhouse-pg-dev`, con roles propios. Renditions WebP en buckets privados servidas por la API. UI aprobada en claro y oscuro con tema generado desde `@efeoncepro/axis-tokens`. Import idempotente de CMP-001 a CMP-005 aplicado en prod. Acceso abierto de solo lectura; el login es task aparte y el CNAME del dominio está pendiente. [Arquitectura](docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) · [runbook](docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md).

## 2026-09-25 — CTA: política cromática por campaña

Política optativa con archivo/hash, paleta AXIS y tratamientos explícitos; compositor y gate validan la decisión y conservan contraste/guardas. Legacy mantiene comportamiento: 13 piezas idénticas frente a HEAD. 39 tests, 14 verificaciones de integración y cuatro candidatas CMP-004 reproducidas; aprobación creativa pendiente. [Contrato](docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md#20-política-cromática-por-campaña-optativa) · [ADR](docs/architecture/EFEONCE_ADVERTISING_CAMPAIGN_COLOR_POLICY_DECISION_V1.md) · [evidencia](docs/audits/social/2026-09-25-cmp004-typography-grouping-review.md). Sin modificación del motor tipográfico/espacial, commit o publicación.

## 2026-09-24 — ANAM: foto oficial de Emma, avatar de chat y cargo comercial

La landing pública sirve `kortex-cms-react/30` con el retrato PNG enviado por María Paz y el cargo `Ejecutivo comercial ANAM`. El avatar derivado con fondo menta se guardó en la identidad de Customer Agent y en el chatflow `96601133`; el widget público mostró la nueva imagen sin enviar mensajes. Se actualizaron el [caso ANAM](docs/architecture/kortex/hubspot-cms/anam-chat-landing.md), la documentación funcional, el manual y las referencias espejo de `hubspot-as-a-service`. La QA completa móvil y conversacional del build #30 no se repitió.

## 2026-09-24 — Insights: renderer local de familias de gráficos

Los catálogos `insights-deck` e `insights-report` componen line, pie, donut y scatter desde `ChartSpec`; las suites dirigidas pasan (114/114) y un PDF sintético A4 de 30 páginas valida fuentes embebidas, pie/folio 30/30 y lectura en grises. Evidencia y gates pendientes en [TASK-1847](docs/tasks/in-progress/TASK-1847-efeonce-insights-analytical-charts-and-editorial-catalogs.md); sin deploy ni release.

## 2026-09-24 — SKY: producción, correcciones y método de video

Profundización con tres subagentes: [método completo](docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md), companions de preproducción/cámaras/piezas, posproducción/sonido y 13 aciertos/20 fallas; dos plantillas. Incluye preparación con Claude, corrige reglas universales de planos/tramos y límites estimados, y conecta skills espejo Motion/Audio. Motion/Audio incorporados al gate de espejos. Sin nuevos renders ni gasto.

[CDR-008](docs/campaigns/decisions/CDR-008-cmp003-cartelas-postproduccion-y-audio-separado.md) registra aprobación de punch-v3 y su alcance: cartelas/cierre, película generativa. Fuentes y hashes congelados; guion/cámaras/audio/costos en el plan V10 de OneDrive. Skills motion/audio espejadas incorporan alpha, URL Luminosidad, música instrumental limpia y controles actuales de ElevenLabs/Omni. [Método y evidencia](docs/operations/social/2026-09-24-sky-generative-film-title-overlay-method.md). Tras autorización condicionada, un piloto Omni de 9,5 s fue rechazado por discontinuidad (228 cuadros revisados, ~USD 1,54 estimados desde uso). Master sin integrar; audio posterior al cierre de imagen. No se encadenaron intentos. V11 posterior: un intento completo 1080p rechazado tras 713 cuadros; costo individual confirmado USD34,162558 excedió USD25 autorizados. Informe en CDR-008. V12 posterior rescata fuentes existentes y compone cartelas/cierre: 30 s/1080p/720 cuadros, música/SFX originales sincronizados, USD0 adicionales. V13 corrige portal, URL, morado y recupera música V7; export y QA en CDR-008. Escucha y aprobación final pendientes. V14 integra Omni localizado y Heroic Ascent Music2.5 elegido por el operador, tras rechazar el puente local genera Heroic Ascent Finale con referencia nativa, sin empalmes, y mezcla cinco SFXv2; master30s/1080p revisable, escucha pendiente. Costos y errores en CDR-008. V15 adopta el rock aportado por el operador; V16 reemplaza el acento de marca y restaura metraje con Topaz, luego recompone capas aprobadas. Entregas30s/4K restaurado y1080p verificadas; coste de restauraciónUSD5,59944 dentro deUSD5,60. V17 posterior, autorizado: reduce lectura0,5s y corrige la flecha del logo blanco; entregas29,5s/4K restaurado y1080p revisadas, música sin empalmes, USD0. Escucha/aprobación pendientes; evidencia en CDR-008. [Retrospectiva integral](docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md): historia, fuentes finales, errores, aciertos, herramientas y límites de costos.

## 2026-09-24 — Gemini Omni 1.1 en la CLI local de video

`pnpm ai:omni` conecta Cloud Interactions API con ADC y GCS privado para generar desde texto, imagen, cuadros o referencias, editar y extender video. Los seis modos completaron canaries reales a 360p/16:9; se verificaron MP4 y tests locales. La operación requiere confirmación de gasto, estima el componente de salida y permite retomar por ID/estado local. [ADR](docs/architecture/GREENHOUSE_GEMINI_OMNI_CLI_DECISION_V1.md) · [manual y evidencia](docs/manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md). Sin cambios en Globe ni despliegue. Resoluciones/ratios superiores y política de ciclo de vida GCS siguen pendientes.

## 2026-09-23 — Compositor de piezas con CTA: tramo 16 y corte de la novena auditoría

`pnpm foto:componer:cta` y `pnpm foto:cta:gate`, auditados nueve veces por pares de subagentes adversariales (diseño y
arquitectura) y robustecidos sin cambiar ninguna pieza aprobada (regresión: 132 de 132 idénticas):

- el gate distingue falla (1) de **no certificable (3)** y certifica por reproducción (`--reproducir`);
- contraste sobre el trazo; CTA a 4,5:1 siempre, con APCA y daltonismo bloqueantes; `placement` sólo endurece;
  el dominante es la voz mayor;
- excepciones con aprobador del registro (`scripts/foto/aprobadores.json`), sha256 del plate y tope (`hasta`);
- firma automática sólo en la banda del pie; firma externa declarada y leída de `signatureY` (v03–v07 la declaran);
- entradas con errores que nombran pieza y campo; texto alternativo con el rol del CTA siempre;
- proceso: bloqueo sin carreras, regresión que compara el veredicto del gate, mutantes contra corrida base y canarios.

Docs: [contrato §18–§19](docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md), funcional y manual en `creative/`,
skill `efeonce-advertising-creative`. La novena auditoría no emitió informes por límite semanal de Claude; no habrá
más rondas por instrucción del operador. La segunda corrida completa de 175 mutantes se detuvo con 81 detecciones
registradas, sin puntuación final. Persiste la intermitencia de P10; decisiones y cobertura faltante en §19.10.
CMP001-04 se reemplazó en la carpeta local sincronizada de OneDrive con respaldo y hash de lectura posterior;
sin readback del servidor, publicación ni pauta.

## 2026-09-22 — ISSUE-177 resuelto: ninguna función de Vercel vuelve a cargar el motor de PDF

Tres deploys de staging cayeron en tres semanas por funciones de Vercel de más de 250 MB (397, 434 y 441 MB),
siempre con el gate local en verde. Desde ahora:

- la entrada liviana `@/lib/artifact-composer/pure` y la regla ESLint `greenhouse/no-worker-only-module-in-vercel-code`
  impiden importar como valor el motor de composición (Playwright, pdf-lib, catálogos) desde `src/`;
- `pnpm vercel:reachability-gate` (pre-push y CI, ~2 s, sin build) recorre el grafo de imports de las 1.519 entradas
  del App Router y falla ante la denylist o una ruta de runtime variable nueva;
- `pnpm vercel:function-size-gate` mide el tamaño trazado de cada función tras el build de CI (falla sobre 200 MB);
- las rutas de lectura de Insights ya no cargan comandos ni render.

Reglas en `OPS_RELIABILITY_AGENT_INVARIANTS.md` §Tamaño de las funciones de Vercel.

## 2026-09-22 — Efeonce Insights: informe A4 y deck nuevo en staging, probados con datos reales

TASK-1847 en staging (`develop` hasta `21c991999`), sin producción. El canary con Berel (SEO+AEO) y Sky (ICO), en
ediciones internas y sin emitir y con `insights_v1` asignado a ambas orgs, encontró y cerró:

- el validador de cifras rechazaba toda edición SEO real (fecha partida, cifras de la etiqueta del hecho);
- OTD nunca llegaba a un informe (`otd` frente a `otd_pct`);
- límites y metodología mostraban identificadores internos;
- las figuras del A4 tenían formato propio, recortes y la barra destacada invisible;
- el deck sobre `deck-axis` recortaba y callaba métricas, así que `deck_pdf` pasa a `insights-deck`.

Vista previa con datos reales en `scripts/insights/preview-edition.ts`. Se abre ISSUE-177: no hay gate que mida el
tamaño de las funciones de Vercel.

## 2026-09-22 — «Tu IA no conoce tu negocio»: el carril HubSpot

[CDR-004](docs/campaigns/decisions/CDR-004-tu-ia-no-conoce-carril-hubspot.md) (`Proposed`) resuelve cómo se vende
HubSpot dentro de una narrativa que declara no ser una campaña de HubSpot: el carril es provider-specific, no una
campaña paralela, y rige la regla de sujeto —el problema del comprador es el qué, HubSpot es el cómo—. La unidad de
producción pasa a ser el dolor del mapa del pillar, no el Hub ni la familia; tres registros de mención con gate
propio; mitigación del riesgo «HubSpot no sirve» moviendo la pregunta en vez de atacar la herramienta; herencia de la
regla del vacío. Tres gates medidos el mismo día: destino (pillar y caso ANAM `200`, otras cuatro `404`), partner
(tier declarado, no revalidado) y prueba (un solo caso publicado). El cruce deja dos huecos declarados, no rellenados:
Revenue Lifecycle/CFO sin capítulo y el capítulo 5 sin dolor en el mapa. Brief ejecutable de las siete fichas en
[RUTA_HUBSPOT.md](docs/commercial/campaigns/2026-q4-tu-ia-no-conoce-tu-negocio/RUTA_HUBSPOT.md). Los capítulos 1 y 2
quedan con brief por primera vez. Sin producir, publicar, pautar ni declarar tier de partner.

## 2026-09-22 — «Tu IA no conoce tu negocio»: del output a la pieza

[CDR-003](docs/campaigns/decisions/CDR-003-tu-ia-no-conoce-del-output-a-la-pieza.md) acepta la extensión 5B del
capítulo 5: entrada «A nosotros tampoco nos gusta el AI Slop», tesis durable «El output fue generado. La pieza fue
diseñada» y Design Context de seis capas. El ajuste aprobado mantiene a **Efeonce como única marca a posicionar**:
«Del output a la pieza» es territorio creativo, la metodología se comunica sin nombre comercial propio, Design
Context es el artefacto que construye y Behind the Build es un formato demostrativo. También documenta su aplicación
a cualquier disciplina de diseño, con contratos propios por oficio; gráfico, UI, UX, web, 3D y motion son ejemplos,
no una lista cerrada. La tesis empresarial distingue
acceso PYME de diferenciación/gobierno a escala en mid-market y enterprise: el fallo más costoso puede ser que todo
se vea intercambiable. El
[contrato interno](docs/operations/EFEONCE_AI_ASSISTED_DESIGN_METHOD_V1.md), la narrativa y el brief incorporan la
distinción, el build completo, Behind the Build, límites de prueba y medición. Sin producir, publicar, pautar, fusionar
ofertas ni crear SKU.

## 2026-09-22 — Campañas CMP: brief y continuidad entre agentes

[Contrato ampliado](docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md): templates de brief, índice de exports y ficha
por pieza, versionados Claude/Codex y sincronizados con OneDrive. Skills de estrategia, producción y medición
rutean al mismo brief, con JTBD/evidencia, estados separados y receta reproducible. CMP-001 consolida SEO/AEO y
Content, 25 exports por ruta; historial preservado. Corrección del lecho para nuevas adaptaciones documentada;
sin regenerar finales, modificar runtime ni publicar/pautar.

Reconciliación: CDR-002 registra el set de seis pilotos; BRIEF asigna roles vigentes. Template y guía separan recursos, contrato y motor; comprobar archivo adjunto/hash además del checker, que tolera ausentes en CI. Sin generación nueva.

Entrega CMP-001 unificada para humanos/agentes: manifiesto único, catálogo visual y CSV generado; 28 exports por tipo/ratio, recetas históricas en Recursos con mapa de rutas.

Manifiesto v2: copy externo, audiencias, UTM y presupuesto propuesto; handoff MCP íntegro generado con checksum, deduplicación y readback. Contrato transversal y template reusable sincronizados en skills Claude/Codex y OneDrive. Sin publicación.

## 2026-09-22 — Ads: Tres voces + acción

[Regla aprobada](docs/operations/EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md): CTA Poppins en texto, contorno o
relleno a demanda, complemento de las tres voces. Define jerarquía, gaps de tinta,
protección de sujeto/firma, cursor semántico y editables. Publicidad, Design y Growth/CRO sincronizados en
Codex/Claude; excepción acotada al relleno CTA sobre foto, sin scrims. Color a demanda según composición,
tinta/borde/relleno medidos por separado. v04 completa16 pilotos:4conceptos×4:5/1:1/9:16/16:9,
composición/contraste16/16 y firma≥5,52:1; arnés fotográfico genérico con límites explícitos.
Prompts, editables, matriz y evidencia en OneDrive; cobertura de cuatro ratios documentada en skills espejo.
v05 recompuso los cuatro verticales; el operador rechazó la firma alta. v06 la baja al pie según Claude,
con texto/CTA protegidos y posible solapamiento de firma en Reels declarado; QA separado.
16 finales autorizados en OneDrive, con conceptos/embudo, prompts, editables y reproducción; sin publicación.
v07 reduce el lecho y ancla la firma dentro de su materia. Método completo y ocho skills actualizados;
auditoría del compositor CTA: p98, cobertura del gate y campos no compatibles documentados, sin cambiar código.
Sin cambios runtime.

## 2026-09-21 — Paid visual: palancas, cinematic ads y medición por formato

Skills de publicidad, Design, Motion, Digital Marketing y Growth/CRO conectadas al
[playbook de atención visual](.codex/skills/efeonce-advertising-creative/references/paid-visual-attention-playbook.md),
con investigación primaria en tres frentes, doce palancas, recetas de estático/video/híbrido y definiciones
por plataforma. Se distingue hipótesis de rendimiento, CTR de atención y palanca publicitaria de ficha foto;
registro C sigue en construcción. Contenido sincronizado Codex/Claude; sin generación ni publicación.

## 2026-09-20 — Fotografía Efeonce: comparación visual obligatoria antes del prompt

El pipeline y las skills espejo de Design Studio y publicidad ahora exigen abrir los finales aprobados comparables,
registrar los portadores visibles del azul activo y del acento de historia, y medirlos de nuevo en el plate. Se corrigió
la firma vigente al **20 %** según la decisión del operador; el default histórico del compositor sigue en 15 % y se
debe pasar `LOGO=0.20` explícitamente. La [prueba con Julio y Nexa](ai-generations/2026-09-20_prueba-motor-integrado-julio-nexa/README.md)
documenta el fallo que motivó la guarda.

## 2026-09-20 — Fotografía de marca: tres comandos, seis reservas y el umbral de calma en L*

El prompt de una toma ya no se concatena a mano: `pnpm foto:prompt` lo arma desde una ficha y resuelve formato, % del
lecho y límite de sujetos desde **una sola tabla** — armarlo a mano fue la vía por la que «Vertical 4:5.» vivió dentro
del bloque de realismo compartido sin que nadie lo viera. `pnpm foto:validar` evalúa las seis reservas sobre el plate
limpio (zona de texto y objeto opt-in, en fracciones) y `pnpm foto:doctor` dice si la máquina puede generar, con seis
chequeos que ejercitan la cadena hasta la clave, sin costo y sin imprimirla; 27 tests cubren las guardas, incluida la de
materia de la superficie. Las reservas pasaron de cuatro a seis, con lecho por formato **[medido]** (4:5 18% · 9:16 22%
· 16:9 16% · 1:1 18% sin validar) y campo profundo al margen.

El piloto de 3 plates (USD 0,142) midió las dos nuevas: la banda del margen llega a **0,60** del alto cuando se pide, y
el recuadro de selección tiene punto dulce de padding (0,02 → 3,29:1; 0,00 y 0,04 fallan), no monotonía. El umbral de
calma se corrigió a **L\***: en luminancia lineal premiaba la oscuridad y la «losa» rechazada pasaba con 12× de margen;
`CALMA_MAX` mide calma y **no** detecta la losa —una losa es calma—, que se ataca en la entrada con la guarda de materia.
Se retiró §3.8.3 **[refutado]**: el prompt que supuestamente no la llevaba nunca se versionó y las dos franjas miden
igual; lo que separaba los números era el formato. **[decisión del operador]** el tono nunca fue el problema —una reserva
oscura está perfecta si la superficie existe de verdad y tiene nombre; lo prohibido es la reserva sin materia, en
cualquier tono—. La capa de composición gráfica sobre la foto sigue **sin aprobar**.
[Bitácora](docs/operations/social/2026-09-19-efeonce-photographic-language-production-method.md).

## 2026-09-19 — Berel: QA visual de comentarios en Frame.io

Los comentarios del share de octubre se clasificaron entre errores comprobables, ajustes visuales,
preferencias con motivo, observaciones incompletas y aprobaciones. La skill Berel en ambos espejos y el
Playbook/Aprendizajes de Notion incorporan gates de color, producto, legibilidad, función editorial y canal.
Sin masters editables, no se modificaron artes, versiones, estados ni publicación.

## 2026-09-19 — ISSUE-175: recuperado keyword discovery de DataForSEO

Restaurado el login ausente del worker compartido sin cambiar imagen ni otras env vars. Canary real
por scheduler: 10 candidatos, USD 0.0132, gasto reconciliado. TASK-1341 añade localmente guard de
configuración antes de build y readback de revisiones con tráfico, incluso si CI salta el deploy;
discovery distingue configuración ausente y no cuenta requests que no salieron. Cierre: guard y check
post-deploy corrieron en `ops-worker-deploy` (revisión `ops-worker-00699-6rf`) y el smoke AIO drenado por el
worker dio 6/6 `succeeded` (EO-GRUN-00055, USD 0,024). TASK-1341 complete.

## 2026-09-19 — Oferta transversal de transformación humano-agente

Se añadió investigación primaria, ficha de servicio y modelo de negocio para pasar de readiness de agentes a
equipos humano-agente con roles, autonomía, handoffs, adopción, calidad y economics. Las ofertas HubSpot/Salesforce,
la ruta RevOps & CRM y las skills espejo remiten al método. Estado `Approved for validation`: sin activación runtime,
precio, margen ni ROI aprobado.

## 2026-09-19 — Ajuste editorial y GTM para la oferta humano-agente

El operador confirmó que la oferta de transformación humano-agente está aprobada comercialmente y probada como
servicio. Se actualizó «Tu IA no conoce tu negocio» con una serie transversal en las franquicias existentes:
operaciones y ruta CMO (AEO público → contexto de campaña → equipo humano-agente), sin CRM obligatorio ni nueva SKU.
Quedaron buyer, piezas, roles por canal, Blueprint/operación y gates de prueba, paid y claims. Los Pilares JTBD de
Notion siguen separados de capítulos y taxonomía pública; posible nuevo pilar requiere readback y aprobación. Sin
cambios en Notion, sitio público ni publicación.

## 2026-09-19 — Trendjacking «Nivel de búsqueda» (GTA VI): jerarquía de 5 voces y compositor reutilizable

Carrusel de 9 láminas + pieza suelta para Efeonce, programado en Instagram (22-sep) y LinkedIn (25-sep, documento).
Método: estudio visual del trend con fuentes antes de dirigir, escenas de realismo ilustrado con GPT Image 2.5
(Flare/Sunburst) y activos de marca en escena (Nexa, logo 3D, nave, Clawd y Codex), jerarquía tipográfica de 5 voces
con texto enriquecido por palabra, selección AXIS con cursores fijos y en movimiento, y readback de Metricool por
firma de imagen. `compositeLuminosity` quedó exportada en `scripts/creative/layout-compiler/compiler.mjs` para
reutilizar la firma url-lum. Skills `social-media-studio`, `efeonce-advertising-creative`, `copywriting` y
`greenhouse-ai-image-generator` (espejos) y docs de ejecución social/publicitaria actualizados.
[Bitácora](docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md).

## 2026-09-19 — Revisión de cierre del último día de UNBOUND

La revisión de la agenda completa del 18/09 añadió al ledger Smart CRM Universal Record Page como private beta,
el laboratorio de Customer Agent como enablement de clientes, la denominación ChatGPT Lead Gen Ads y el cierre
técnico de Developer Platform 2026.09: Projects y Conversations API GA, 44 APIs actualizadas y nuevas betas públicas.
Se mantuvieron los gates: demo/private beta no equivale a GA, pricing, entitlement ni runtime; no se activó ningún
portal, write, conexión o campaña.

## 2026-09-18 — TASK-1832 retira la corrida canary y apaga sus gates

Se revocó la authority del canary sintético, el cleanup sujeto-específico borró todo el grafo run-owned
y preservó el cliente compartido de ChatGPT/Codex y los artefactos de otros sujetos. El apply ahora usa el
perfil PostgreSQL `ops`. Las dos puertas canary quedaron en `false` en todos sus runtimes, con lectura en la
revisión servida: auth-server `00076-t2t`, Vercel Production y gateway `00056-kgs`. Runbook, manual, matriz,
manifiesto, ledger y skill `efeonce-mcp-platform` (espejo) quedaron actualizados. Además se documentó el diagnóstico —buen canary,
retiro mal diseñado— y las reglas para la próxima corrida: clientes OAuth compartidos clasificados desde el día 0,
señales y muestras por sujeto sin huecos, dry-run con el perfil del apply y gates inventariados al abrir.

## 2026-09-18 — Efeonce Insights: enlaces, correo y recurrencia en producción con flags OFF (TASK-1848)

Release `bda1cf2cd938` (PR #238) lleva a producción compartir por enlace, envío por correo y recurrencia de Insights
con `INSIGHTS_SHARING/DELIVERY/SCHEDULES_ENABLED` y la emisión **apagados** hasta que exista el lector de Think
(TASK-1875, ya desbloqueada). Canary de contrato: crear enlace ⇒ 503 `sharing_disabled`, token inexistente ⇒ 404.
Staging queda encendido; el operador confirmó la llegada de los dos correos del canary. Gateway `efeonce-mcp` 1.7.0
(revisión `00055-gk6`, 58 tools): 5 lecturas con el scope base y crear/revocar enlace con `efeonce.mcp.insights.write`
(fail-closed); enviar y programar no existen por MCP. `ISSUE-174` → `TASK-1876` sigue abierto.

## 2026-09-18 — Efeonce Insights: compartir por enlace, envío por correo y recurrencia (TASK-1848, code complete)

Una edición emitida ya puede compartirse por enlace personal que vence (se guarda sólo el hash del token; revocable
uno a uno; el lector público responde 404/410/429 y nunca cachea), enviarse por correo desde Efeonce a personas
activas de la organización (enlace compartido o PDF adjunto opt-in, dedupe por persona y versión, un resultado
ambiguo se reconcilia antes de reenviar) y programarse (semanal/mensual, zona y consolidación; cada ocurrencia deja
un borrador en revisión, nunca emite ni envía). Migraciones aplicadas en la base compartida; los tres flags nuevos
nacen apagados en producción y los EmailTypes apagados. Verificado en staging con canary sintético completo (incluye un
correo real al buzón autorizado del operador); la prueba destapó `ISSUE-174` → `TASK-1876`. Producción y gateway pendientes.

## 2026-09-18 — Corte ampliado de Dreamforce 2026 y UNBOUND 2026

Se actualizaron los ledgers, docs de oferta, narrativa estratégica y skills espejo `.codex`/`.claude` con la
investigación oficial ampliada al 18/09. Salesforce queda separado por AIforce, Koa, Missionforce, Agentforce,
interoperabilidad y Marketing Cloud Next, con estados por capacidad y sin nuevos lanzamientos identificados el
17–18/09 en el media hub. HubSpot incorpora Smart CRM self-updating, Growth Context, Context Home, Breeze, Marketing
Studio, Microsoft Advertising, Prospecting Agent, ChatGPT Ads y las superficies mostradas en UNBOUND; Customer Agent
Voice, HubSpot Work y Agent CLI quedan marcadas como first look/demo hasta verificar GA, pricing y runtime. No se
activaron entitlements, betas, campañas ni conexiones.

## 2026-09-17 — Higgsfield documentado como proveedor gobernado de Creative Studio

La revisión de los nueve repositorios oficiales de Higgsfield quedó documentada en arquitectura, auditoría,
documentación funcional, manual de uso, runbook, fleet ledger y skills espejo. API/SDK/CLI, skills agentic y MCP
local para After Effects/Blender quedan como superficies preparadas; Higgsfield permanece
`provider-supported / no Globe route` hasta contar con route card, adapter, secreto, coste, derechos, canary,
Asset Governance y readback. No se instaló, generó, compró crédito ni publicó nada.

## 2026-09-17 — Aplicar el logo 3D en escenas con IA generativa

El kit 3D del logo ya no se compone a mano sobre la escena: se pega el render exacto y el modelo repinta sólo un halo
alrededor con máscara, así aporta sombra de contacto, reflejo y rebote sin poder re-dibujar el logo. Con el logo grande
en cuadro basta la pasada directa con el render como referencia. Medido en dos casos reales (avenida de Nueva York y
escritorio): zona protegida 4,4/255 de diferencia y halo 39,6. La composición determinística queda como respaldo.

## 2026-09-17 — Logo de Efeonce en 3D como kit de referencia para agentes

Quedó en `13- Branding/Logo Efeonce 3D` el logo completo en 3D renderizado en Blender desde el SVG oficial, en navy y
blanco, en cuatro escalas (monumental, grande, mediana, pequeña) con 33 cámaras y luz izquierda/derecha, sin
superficies. Cada escala trae un manifiesto de cámara y usos para que un agente elija el render que coincide con la
escena y se lo pase al modelo como imagen 1, sin dejar que el modelo dibuje las letras.

## 2026-09-17 — `pnpm ai:image:rmbg --key-background` para huecos opacos

El recorte de fondo suma una opción opt-in para el caso de objeto claro sobre fondo oscuro: vacía los huecos pasantes
(ventanas, cortes) que el matting dejaba opacos mostrando el fondo de estudio, con borde suave y sin halo. Reemplaza el
script de corrida de la nave de Efeonce 3D y reproduce el mismo alfa en sus finales aprobados.

## 2026-09-17 — LicitaLAB: CLI `pnpm licitalab` y flujo agéntico de licitaciones públicas

Nuevo cliente canónico `src/lib/commercial/tenders/licitalab/client.ts` sobre el MCP de LicitaLAB y CLI con tres
credenciales: API key en Secret Manager (`documents`, `ask-docs`, `support`), sesión OAuth de usuario de 7 días
automatizada con Playwright (`opportunity`, `provider`; la key responde `unsupported`) y el radar web existente,
ahora con `--headless/--no-login`, detrás de `search [--match] [--enrich]`. Verificado en vivo (20 recomendadas
enriquecidas; 175 del listado completo). Receta 0 en la skill de licitaciones y manual
`revisar-licitaciones-licitalab-con-cli.md`. El agente nunca ingresa la contraseña: renovar sesiones es del operador.

## 2026-09-17 — Nave de Efeonce en 3D, navy y blanco

Quedó en `13- Branding/Nave Efeonce 3D` la biblioteca del isotipo en 3D: 16 ángulos de cámara por color (con versiones
transparentes) y 8 escenas. El blanco se obtuvo recoloreando los renders navy aprobados, porque generarlo aparte salió
plano; los ángulos extremos usaron una guía de perspectiva proyectada desde la silueta oficial.

## 2026-09-17 — Sprocket de HubSpot en 3D (uso interno) y mascotas en carpeta propia

Las bibliotecas de mascotas pasaron a `14. Mascotas de partners` en la raíz de la carpeta de contenidos, por
indicación del operador, y se sumó el sprocket de HubSpot en 3D: 8 ángulos y 8 escenas desde el SVG oficial. Como es
marca registrada y HubSpot exige aprobación previa para usarlo, la biblioteca queda como uso interno hasta obtenerla.
El relleno de huecos de `pnpm ai:image:rmbg` ahora reconoce el fondo en sombra visto a través de un agujero del objeto.

## 2026-09-17 — Bibliotecas de poses 3D de Clawd y Codex, y recorte sin huecos

Quedaron en la carpeta de contenidos de Marketing dos bibliotecas de mascotas de partners: Clawd (Claude) y Codex
(OpenAI), cada una con 8 ángulos de cámara y 8 poses con accesorios ligados a servicios de Efeonce, en fondo de estudio y
transparente, más su fuente oficial (sprite del binario de Claude Code y atlas del app de ChatGPT). `pnpm ai:image:rmbg`
ahora rellena por defecto los huecos internos que el recorte automático deja en el sujeto (ojos, visores, glifos) y
conserva los huecos reales de fondo. El método quedó documentado para repetirlo con Nexa; inventario en
`docs/operations/social/PARTNER_MASCOT_POSE_LIBRARIES.md`.

## 2026-09-17 — Narrativa «Tu IA no conoce tu negocio» y su key visual

Quedó definida la narrativa go-to-market de Efeonce para Q4 2026 – Q3 2027: cinco capítulos de contexto (lo que la IA
no sabe, datos, lo que la IA dice de ti, equipo agéntico y marca) más una capa de resultados, conectados con todas las
líneas de negocio (`docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md`). Su key visual —Nexa con hoodie
Efeonce y Clawd en 3D en el hombro, con una selección AXIS sobre «tu negocio.»— quedó programado para el 21/09 en
LinkedIn e Instagram. Anthropic y OpenAI figuran como partners aceptados. El adapter de selección colaborativa AXIS
suma una opción de presentación (escala y color por participante, con contraste verificado) y las skills aprenden que
cambiar el fondo detrás de una persona o mascota se resuelve regenerando la escena, no recortando. Bitácora en
`docs/operations/social/2026-09-17-kv-tu-ia-no-conoce-production-method.md`.
