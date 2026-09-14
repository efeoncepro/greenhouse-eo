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

## Selección colaborativa: intención → manifest → adapter

Cuando la dirección de arte use bounding box, cursor local o participantes multiplayer, el agente no dibuja la
escena por coordenadas. Declara `AxisCollaborationSelectionIntent` y normaliza desde el repo AXIS:

```bash
pnpm collaboration:resolve -- \
  --input docs/examples/collaboration-selection-intent.json \
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
llama a modelos, no compone el anuncio completo, no publica y no aprueba. Si el motor no tiene adapter, el agente
reporta `unsupported/pending adapter`; no copia `CollaborationSelection.astro`, no inventa campos y no simula la
capacidad con `top`/`left`.

## Invariantes

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
