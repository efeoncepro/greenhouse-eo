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
real. Hasta entonces, una corrida nueva copia y adapta ese archivo declarándolo en su evidencia; no lo importa desde
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
- La revisión de una pieza usa el gate del brief, capturas/tamaño final y contraste medido.
- La promoción del contrato AXIS de `trial` a `stable` exige segundo consumidor real y comparación visual
  cross-runtime.
- Commit, push, release AXIS, release Greenhouse y publicación de una pieza son actos separados.

Manual diario: [usar reglas publicitarias con agentes](../manual-de-uso/creative/usar-reglas-publicitarias-con-agentes.md).
Descripción funcional: [reglas publicitarias para agentes](../documentation/creative/reglas-publicitarias-para-agentes.md).
