# Advertising Creative Agent Execution V1

## Objetivo

Hacer que Codex y Claude apliquen el sistema tipográfico publicitario de AXIS al crear, corregir o auditar
posts, stories, reels, covers, banners, key visuals, brochure, OOH y motion. El contrato evita que cada agente
improvise pesos, estilos, espaciados, colores, safe areas o estados de aprobación.

## Ownership

- **AXIS** posee valores y reglas portables mediante `axisAdvertising` y el contrato
  `efeonce.advertising-typography`, actualmente `trial`.
- **AXIS** posee además `efeonce.collaboration-selection`, actualmente `candidate`, cuando la pieza usa la
  metáfora de selección activa o presencia multiplayer.
- **El consumidor** traduce esos datos a su motor —Tailwind, CSS, canvas, video o compositor— sin redefinirlos.
- **`efeonce-advertising-creative`** orquesta el encargo y carga el oficio necesario; no contiene un segundo set
  de valores.
- **Typography** decide jerarquía, peso, ejes, tracking, leading, cortes y accesibilidad sobre la composición real.
- **Social, Design, Motion, Image, Copy y Brand** conservan su ownership de canal, producción, lenguaje, derechos
  e identidad.

Canon técnico: [AXIS ownership](../architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md). La
[guía pública interactiva de tipografía creativa](https://axis.efeonce.org/references/creative-typography/)
permite explorar funciones, familias, contraste, espaciado y aplicaciones. Las reglas machine-readable y sus
datos siguen viviendo en `../axis-design-system/docs/creative-applications/advertising-social/DESIGN.md` y en
los paquetes AXIS; la página pública es una superficie didáctica, no un segundo SSOT.

### Recursos AEO componibles para piezas comerciales

Si el brief pide evocar búsqueda con IA, una conversación LLM o citabilidad, consulta el [índice de composición de AXIS](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/README.md) y la [galería pública](https://axis.efeonce.org/references/creative-resources/). Los resolvers locales del repo hermano exportan SVG y manifest para caja de búsqueda (`search:compose`), los cuatro SVG originales con texto (`search:compose-original`), composer aislado de ChatGPT/Gemini (`llm-composer:compose`) y conversación o módulo de turno/respuesta/cita (`aeo:compose`). El [manual operativo](../manual-de-uso/creative/componer-recursos-aeo-con-axis.md) explica cómo elegirlos y ensamblarlos.

Esta biblioteca **no** modifica `axisAdvertising` ni implica que los gráficos estén aprobados o publicados como paquete/adapter/MCP. Cada pieza conserva brief, procedencia, verificación de fuentes, revisión visual y gate comercial. Nunca conviertas una muestra editorial en una supuesta respuesta real ni mezcles controles, citas o logos de proveedores. La lupa de Modo IA de Google no lleva aro arcoíris; la selección de búsqueda de ChatGPT no se añade al texto de la burbuja enviada.

## Activación

Los routers raíz y el manifiesto machine-readable cargan `efeonce-advertising-creative` cuando el pedido menciona
una pieza publicitaria/social con texto, un formato creativo, texto sobre imagen, Bricolage/Poppins/Guttery o una
decisión de contraste tipográfico. La descripción de la skill permite además selección implícita. La invocación
explícita usa `$efeonce-advertising-creative`.

La orquestadora carga sólo lo necesario. En social compone con `social-media-studio`; en video, con
`motion-design-studio`; en generación, con la skill de imagen y derechos; en copy, con `copywriting`. No reinicia
un brief ya resuelto ni delega el ownership del resultado.

## Aplicación paid: imagen, video e híbridos

Para atención visual, cinematic ads y métricas hook/hold, la orquestadora carga el
[playbook de paid visual](../../.codex/skills/efeonce-advertising-creative/references/paid-visual-attention-playbook.md),
espejado en Claude. Separa registro, hipótesis, ejecución y medición; los recursos son candidatos a pruebas,
no lifts prometidos.

Su documento hermano es
[evidencia de creatividad publicitaria](../../.claude/skills/efeonce-advertising-creative/references/ad-creative-evidence-2026.md)
(`as-of 2026-09-21`, caduca **2027-03**; espejado en Codex). **No se duplican: el playbook dice cómo se produce
y cómo se mide; la evidencia dice qué está medido y con qué muestra.** Lo que aporta y no está en ningún otro
lado del repo:

- 🔴 **§5 — las doce cifras que NO se citan.** Doce afirmaciones que circulan como hechos y cuya fuente
  primaria no existe, murió o está mal copiada: entre ellas la regla del 20% de texto de Meta (retirada en
  2020 y todavía citada), el CTR de los Thought Leader Ads (artefacto de medición: el 91% de esos clics nunca
  llega a la landing) y un lift de VidMob mal transcrito en al menos tres sitios. **Consultarla antes de poner
  un número en una lámina, una propuesta o un anuncio.**
- **§2.3 — el riesgo «AI slop»**, con los seis *tells* que la industria reconoce, utilizables como checklist
  de QA propio; y sus antídotos, encabezados por *que la restricción de producción sea la idea*.
- **§2.4 — medición propia:** el motor de imagen resuelve **toda escena imposible en idioma de render**;
  la imperfección hay que pedirla explícitamente o sale CGI con la misma física y el mismo encuadre.
- **§7 — el orden de decisión en dirección de foto**, ordenado por fuerza de evidencia, no por intuición.

⚠️ **Dos límites que esa evidencia declara sobre sí misma, y que esta orquestadora hereda:** los premios
**no** prueban rendimiento paid —un Grand Prix mide juicio de jurado, no CTR—, y **no encontrar** estudio o
premio para un recurso **no lo prohíbe**: lo deja como candidato a validar contra un control. Conserva el ownership AXIS y fotográfico existente; no cambia enums del generador,
autoridad de publicación ni modelo de autonomía. ADR aplicable: ownership AXIS enlazado arriba y
[contexto router-first](../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md); esta ampliación de
conocimiento no introduce una decisión de arquitectura ni una nueva superficie runtime.

## Tres voces + acción — 2026-09-22

[Canon de aplicación aprobado](EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md): tres voces tipográficas con
CTA funcional en Poppins, **texto, contorno o relleno a demanda**.
El grupo de acción conserva jerarquía, espacios y reserva de sujeto/firma; un cursor local hacia CTA cuando
se use selección, colaboradores sólo con significado. La superficie rellena es una excepción funcional acotada,
no permiso para tarjetas HUD o scrims. No cambia ownership, contratos AXIS ni autorización de publicación.

## Piezas con CTA: compositor y gate canónicos — 2026-09-23

Toda pieza con CTA sobre fotografía se compone con `pnpm foto:componer:cta <plan.json>` y se certifica con
`pnpm foto:cta:gate <plan.json>`: cubren la composición, la medición y el gate técnico de los pasos 5–7 del
contrato de abajo (el plate se genera antes). El detalle vive en el
[contrato del compositor](EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) —§3 gate, §16 accesibilidad, §17 variantes,
§18 certificación— y en la skill `efeonce-advertising-creative`. Aquí queda sólo lo que un agente no puede ignorar:

- **Sólo la salida 0 certifica.** `0` certificado · `1` falla (una regla del canon, o huellas que no calzan porque
  el plan, el plate, el PNG o el layout cambiaron después de componer: leer los `✗`) · `2` uso · **`3` no
  certificable**, que no es un pase ni una falla: el gate no puede probar lo que certificaría (QA del formato
  anterior, otra versión del comando, máscara del sujeto de una caché ajena). Se resuelve recomponiendo o con
  `pnpm foto:cta:gate <plan.json> --reproducir`, que recompone en un temporal con el comando vigente y exige PNG y
  layout idénticos byte a byte. Una pieza con gesto manuscrito o tarjeta sale siempre con 3: el gesto quedó fuera de
  alcance (decisión del operador, 2026-09-23). El `PASS` del paso 7 exige 0; un 3 nunca se informa como verde.
- **Plan nuevo que deba pasar el gate:** AXIS es el perfil por defecto; declararlo como
  `safeArea: "axis"` hace explícita la intención. `cta.x: "columna"` se usa sólo con alineación a la izquierda
  —con `align: "center"` el plan se rechaza—. Declara `lead`, `after` y `altText` de la escena sin transcribir
  el copy; `variant: "auto"` lleva `prominencia` explícita. La firma dibujada declara
  `logo: { width: 0.25, x: 0.5, y: "auto" }` en 16:9 nuevo y `width: 0.2` en vertical/cuadrado nuevo.
  La firma externa se reserva al 20 % fijo y no pasa el mínimo horizontal nuevo sin excepción auditada.
- **Umbrales que no se aflojan:** el CTA exige 4,5:1 a cualquier tamaño y, sólo en el CTA, APCA y daltonismo
  bloquean (exceptuables como `cta-perceptual`). Cada voz se mide con WCAG 2.2 AA según su tamaño en un teléfono de
  390 CSS px, sobre el trazo y no sólo sobre la caja. `placement` sólo endurece la medición; nunca la afloja.
- **Excepciones auditadas:** una regla en una pieza, con `aprobadoPor` del registro `scripts/foto/aprobadores.json`,
  `plate` (sha256 del plate aprobado) y `hasta` cuando la regla se mide con un número. `firma: { modo: "sin-firma" }`,
  `conceptoReducido` y las zonas ignoradas del sujeto (`subjectGuard.ignore`) también exigen un `aprobadoPor` del
  registro. **Un agente nunca inventa un aprobador** ni copia el de la suite de pruebas: si falta, pregunta al
  operador.
- **El texto alternativo lo escribe el compositor** (`out/<id>.alt.txt`): la escena más todo el texto visible en
  orden de lectura, con el rol del CTA siempre anunciado («Llamado a la acción: «…»», nunca «Botón»). Se publica
  donde la plataforma lo permita.
- **Lo que el gate no decide:** identidad, anatomía, cierre visual de la firma, la revisión al 100 % y a 390 px y el
  preview del placement. Certifica la pieza, no la campaña, y no autoriza publicar. El esquema vigente rechaza
  `scrimTop` y `scrimBottom`: el contraste se resuelve en el plate.
- **Firma por formato en una pieza nueva:** mínimo 25 % del lado corto en horizontales y 20 % en verticales o
  cuadrados; máximo 35 % en todos. El gate lo exige desde el canon del 2026-09-23. Las piezas aprobadas bajo el
  canon anterior no se regeneran por esta decisión; una recomposición se evalúa con el canon vigente.

## Contrato de ejecución

1. Resolver marca, objetivo, soporte, dimensiones/duración, audiencia, copy literal, CTA, activos, derechos y
   estado solicitado.
2. Leer la versión vigente del contrato AXIS. Usar la guía pública para explorar y comparar recetas, sin
   transcribir sus números a skills o docs operativos.
3. Declarar las funciones tipográficas: una voz dominante, apoyo estructural y gesto opcional.
4. Probar peso, ancho/ejes, tamaño, tracking, leading, cortes y densidad sobre el texto y medio finales.
5. Generar o seleccionar el medio sin texto/logo inventado y componer las capas exactas de forma determinista.
6. Medir contraste local de texto y marca; revisar al tamaño final, en miniatura y en frames críticos.
7. Emitir pieza, fuente/export, ficha tipográfica, provenance, gate `PASS | REWORK | DON’T` y estado honesto.

## Supporting tagline: intención → receta → adapter

Una frase de apoyo que acompaña un lockup usa `axisAdvertising.compositions.supportingTagline`. AXIS posee la
receta base `structureTagline`, la relación con la medida principal, los roles de énfasis y los invariantes de
fitting. El agente aporta copy arbitrario en orden de lectura y marca hasta dos segmentos por intención:
`growth` o `intervention`. El ejemplo del Lab no forma parte del contrato.

El adapter de cada superficie conserva la frase como unidad, usa espacios naturales y escala uniformemente
contra el ancho inline del lockup. Si una sola línea cae bajo el piso de lectura, aplica un salto balanceado de
la oración completa; nunca separa palabras con `space-between`, márgenes independientes ni coordenadas libres.
Contraste, ritmo y ancho se verifican después de componer sobre los píxeles finales.

## Selección colaborativa: intención → manifest → adapter

Cuando la dirección de arte use bounding box, cursor local o participantes multiplayer, el agente no dibuja la
escena por coordenadas. Declara `AxisCollaborationSelectionIntent` y normaliza desde Greenhouse:

```bash
pnpm creative:collaboration:resolve -- \
  --input <campaign-run>/brief/collaboration-selection-intent.json \
  --out /ruta/absoluta/collaboration-selection.manifest.json
```

El manifest resuelto es el único handoff portable. El adapter de la superficie debe:

1. enlazar `target.id` con un texto, objeto o grupo real y medir su contenido pintado;
2. ampliar esos bounds con el aire proporcional resuelto y corregir ópticamente el tracking terminal en texto;
3. pintar el overlay gris de baja opacidad dentro del box y debajo del contenido/controles;
4. ubicar el hotspot del cursor local en el anclaje; `screen-fixed` conserva la silueta noroeste y sólo
   `target-directed` rota hacia el target;
5. mantener el cuerpo de un multiplayer `acting` fuera del box, con su punta sobre la esquina declarada, y
   mantener puntero + placa de nombre separados pero próximos;
6. permitir que un multiplayer `moving` transite junto a su placa por una región semántica sin target ni
   contacto con la selección;
7. validar geometría en el formato más estrecho y el más ancho antes de declarar conformidad.

El texto de la placa acepta una persona, rol o departamento arbitrario; `Devs` y `Designer` son sólo copy de un
caso. La URL Bubble es otro componente canónico y no se reemplaza por un rectángulo con texto. El resolver no
llama a modelos, no compone el anuncio completo, no publica y no aprueba. El adapter Greenhouse liga
`headline|support|hook|lockup` con `text|text|object|group`, respectivamente. Si otro motor no tiene adapter, el
agente reporta `unsupported/pending adapter`; no copia `CollaborationSelection.astro`, no inventa campos y no
simula la capacidad con `top`/`left`.

### Escala y color de campaña: `presentation`

`renderCollaborationSelection` (`scripts/creative/layout-compiler/axis-advertising.mjs`) acepta la opción
`presentation`, que adapta la lectura a la superficie sin tocar la semántica del manifest:

- `collaboratorScale`: multiplica cursor colaborador, etiqueta y separación. Una campaña leída a 390 px necesita > 1
  (el KV «Tu IA no conoce tu negocio» usó 1,9 en 1080 px).
- `localCursorScale`: multiplica el cursor local.
- `participantColors`: color por id de cursor colaborador, en `#rrggbb` (por ejemplo, el color de marca de un partner).
  La tinta de la etiqueta se elige por contraste WCAG y el render falla si no alcanza 4,5:1.

Sin `presentation` el resultado es idéntico al contrato por defecto. Pruebas:
`scripts/creative/layout-compiler/axis-advertising-presentation.test.mjs`. Los controles de selección (trazo
`#a6cdf5`, tiradores blancos) están diseñados para **fondo oscuro**: sobre fondos claros desaparecen, así que la escena
debe darles un fondo oscuro. Caso:
[bitácora del KV](social/2026-09-17-kv-tu-ia-no-conoce-production-method.md).

## Delta 2026-09-19 — jerarquía de 5 voces, texto enriquecido, cursores en movimiento y url-lum exportado

Origen: carrusel «Nivel de búsqueda» (trendjacking GTA VI, 9 láminas 1080×1350 + pieza suelta), aprobado por el
operador tras una pasada explícita contra jerarquías planas. Método y evidencia:
[bitácora del caso](social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md). Corrida:
`ai-generations/2026-09-19_nivel-de-busqueda/` (`componer-v2.mjs`, `brief/slides-v2.json`, `out-v2/qa.json`).

Contrato que se suma al de ejecución:

1. **Jerarquía por voces.** Una lámina con varios tramos declara hasta cinco voces más un gesto opcional: etiqueta
   (Poppins 700 mayúsculas + marcador), entrada (Bricolage `ideaLead`), dominante (Bricolage `ideaImpact`), cierre de
   frase (Bricolage `ideaMedium`) y tarjeta (Poppins 400/700); gesto Guttery, uno por pieza y ≤ 3 palabras. Invariante:
   **dos voces vecinas nunca comparten peso y color a la vez**. Los pesos, tintas y el ancho 78 de Bricolage del caso
   son decisiones declaradas del caso, no presets; la tabla completa vive en la skill `efeonce-advertising-creative`.
2. **Texto enriquecido por palabra.** `**…**` sube al peso superior de la misma familia sin cambiar tinta; `[[…]]`
   cambia a la tinta de acento del nivel (naranja Efeonce en el dominante, blanco en voces de apoyo). Cada acento se
   mide aparte. El naranja sólo va sobre cielo oscurecido; sobre horizonte encendido el énfasis se degrada a peso con
   tinta clara.
3. **Cursores en movimiento.** Un colaborador que sólo transita se declara `state: 'moving'` con `canvasRegion` y sin
   `targetId`. No existe cursor sin selección: el renderer siempre dibuja la caja del target. Con texto alineado a la
   izquierda, colaboradores en `top-end`/`bottom-end`; cursor local en `end-center` si hay frase bajo el dominante.
   Si `evidence.withinCanvas` es `false`, el compositor falla e imprime `cursorEvidence[].labelBounds`.
4. **Firma url-lum por compositor canónico exportado.** `compositeLuminosity` de
   `scripts/creative/layout-compiler/compiler.mjs` quedó exportada (antes privada; el cambio fue sólo la palabra
   `export`, sin tocar su lógica). Un compositor de corrida la importa en vez de duplicar la fusión de luminosidad no
   separable, y exige `evidence.method === 'non-separable-luminosity'`. Si el logo 3D es héroe de la escena, la firma
   es url-lum y no se agrega un segundo logo plano.
5. **QA por nivel.** Contraste p98 por voz y por acento, revisión visual a 390 px registrada cuando se aprueba bajo el
   umbral, tarjeta HUD con vidrio esmerilado real y oscurecimientos graduales declarados por lámina. Gate en
   [brief y QA](../../.claude/skills/efeonce-advertising-creative/references/creative-brief-and-qa.md).

**Compositor de referencia, no módulo compartido.** `componer-v2.mjs` (funciones `shape`, `richBlock`/`parseRich`,
`BRIC`/`POP`, `hud`, `card`, `contrastUnder`, integración con `resolveCollaborationSelectionIntent` +
`renderCollaborationSelection` + `compositeLuminosity`) vive en la carpeta de la corrida y es el patrón a promover.
Follow-up posible, sin task creada: extraer texto enriquecido, medición de contraste por nivel y tarjeta de vidrio a
`scripts/creative/layout-compiler/` o a un adapter del Campaign Layout Compiler cuando aparezca un segundo consumidor
real. Esa receta histórica queda congelada; para nuevos ads con CTA usar `foto:componer:cta` y su gate. No copiarla ni importarla desde
`ai-generations/`.

## Invariantes

- Dos voces tipográficas vecinas no comparten peso y color a la vez; cada acento de color se mide aparte.
- No hay ExtraBold por defecto. Cada tramo debe justificar la masa por longitud, fondo, formato y distancia.
- La cursiva y Guttery son énfasis breves; no sostienen párrafos ni compiten con la tesis.
- Se usan archivos tipográficos reales con `font-synthesis: none`; no se falsifican variantes.
- El contraste se mide sobre el fondo local real. Un logo oficial puede seguir siendo ilegible y quedar como DON’T.
- Safe area no sustituye composición; los textos no se pegan al borde ni a controles de plataforma.
- Ninguna guía, caja de selección, label técnico o nota interna queda dentro del export público.
- Cuando la selección colaborativa es parte deliberada del concepto final, bounding box, cursores, nombres y
  URL Bubble sí son capas editoriales; las marcas de revisión del Lab y sus comentarios siguen siendo internas.
- Un ejemplo aprobado informa, pero no se convierte en preset universal.
- Producido, revisado, aprobado, programado, publicado y medido son estados distintos.

## MCP

`mcp.efeonce.org` no es hoy el canal de distribución de este contrato. `get_greenhouse_skill` sirve manuales que
gobiernan tools MCP declaradas mediante `appliesTo`; la superficie federada no contiene una tool de composición
publicitaria y registrar este manual contra una tool ajena falsearía el manifiesto. Por eso la activación vive en
los bundles locales de Codex/Claude y en los routers del repo.

Cuando exista una capability creativa federada, se podrá añadir un manual MCP escrito para su consumidor,
vinculado a sus tools reales y derivado de este contrato. Eso requerirá manifiesto, artefacto generado, test de
fuga, release Greenhouse y readback del front door; no ocurre por publicar esta skill local.

## Evidencia y cierre

- `pnpm skills:mirrors` prueba paridad de bundles; no prueba criterio visual.
- El validador de skills prueba frontmatter y estructura.
- La revisión de una pieza usa el gate del brief, capturas/tamaño final y contraste medido; si la pieza lleva CTA,
  además `pnpm foto:cta:gate` con salida 0 (ver «Piezas con CTA»).
- La promoción del contrato AXIS de `trial` a `stable` exige segundo consumidor real y comparación visual
  cross-runtime.
- Commit, push, release AXIS, release Greenhouse y publicación de una pieza son actos separados.

Manual diario: [usar reglas publicitarias con agentes](../manual-de-uso/creative/usar-reglas-publicitarias-con-agentes.md).
Descripción funcional: [reglas publicitarias para agentes](../documentation/creative/reglas-publicitarias-para-agentes.md).

## Safe areas y paquete final

Aplicar el canon Tres voces + acción, §Zonas seguras: placement y medio explícitos; texto/CTA/cursor protegidos; firma al pie con límites de UI declarados, sin inflar el lecho. La zona segura de AXIS (feed: 7,5 % a los lados y 6 % arriba y abajo; story: 10 % y 13 %) es el piso que mide el gate; la del placement real se revisa aparte, en su preview. Export limpio más máscara QA separada. Entregar concepto, audiencia, fase de embudo, hipótesis, CTA/destino, KPI, prompts/referencias, editables, comandos/dependencias y hashes. El operador autorizó promover la campaña SEO/AEO ajustada a Finales; conservar Pilotos. Final creativo no equivale a publicación ni a validación live del placement.

## Método completo y compatibilidad verificada

Consultar el [método SEO/AEO](social/2026-09-22-seo-aeo-paid-media-production-method.md) para dirección, registro, referencias, prompts, composición, lecho proporcionado, formatos, embudo y archivo local. El [compositor CTA](EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md) es la ruta de trabajo nuevo; revisar su §7 (auditoría del 22/09) y su §18 (certificación del 23/09) antes de migrar una corrida. Los runners históricos conservan reproducción exacta, no sustituyen el canon. QA vacío o sólo p98 no certifican contraste ni cobertura, y el gate ya lo hace cumplir: una pieza ausente del QA o una voz sin medición falla, un QA del formato anterior sale con 3 y el contraste se mide sobre el trazo, no sólo con el p98 de la caja.

## Brief, assets y continuidad de campaña

Antes de producir, cargar el [registro CMP y templates](EFEONCE_CAMPAIGN_REGISTRY_V1.md#8-contrato-del-brief-ampliado-y-templates).
Ficha por pieza con job, promesa/prueba, copy literal, canal/placement, referencias, receta y QA. El brief
instanciado vive en campaña; export y editables viven en canal, con una fila por archivo en ASSETS. No deducir
aprobación de un nombre FINAL ni pauta de la aprobación creativa. Caso de continuidad:
[CMP-001](social/2026-09-22-cmp-001-campaign-brief-handoff.md).
