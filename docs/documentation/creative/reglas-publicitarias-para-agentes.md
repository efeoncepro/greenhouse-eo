# Reglas publicitarias para agentes

## Qué hace esta capacidad

Permite pedir a Codex o Claude una pieza publicitaria o social y obtener una composición que aplica el mismo
contrato tipográfico de AXIS. El agente identifica el formato, asigna una función a cada familia, prueba contraste
y espaciado, produce con assets oficiales y deja evidencia de su revisión.

La capacidad cubre posts, stories, reels, covers, banners, key visuals, portadas de brochure, OOH y motion. No
decide estrategia de medios, no publica por sí sola y no convierte una aprobación creativa en autorización de
distribución.

## Cómo funciona

La skill `efeonce-advertising-creative` es el punto de entrada común para Codex y Claude. Los routers la activan
ante solicitudes de piezas publicitarias/sociales con texto y ella compone las especialidades necesarias:

- AXIS aporta el contrato y los valores portables.
- Typography resuelve legibilidad, jerarquía y contraste.
- Social Media Studio resuelve formato y operación del canal social.
- Motion, Image, Copy y Brand intervienen sólo si el encargo los necesita.

La salida incluye la pieza o corrección solicitada, su ficha tipográfica y un gate por jerarquía, contraste,
marca, formato, movimiento y derechos. El agente distingue siempre una prueba revisada de una pieza aprobada,
programada o publicada.

La [guía pública Creative Typography Workbench de AXIS](https://axis.efeonce.org/references/creative-typography/)
expone estas decisiones como una experiencia interactiva para diseñadores y agentes: explica el papel de cada
familia, permite construir una receta por soporte, longitud e intención, y reúne comparaciones DO/DON'T. Es una
proyección didáctica del contrato `trial`; AXIS conserva el SSOT y cada pieza conserva su revisión propia.

La misma entrada puede orquestar `efeonce.collaboration-selection` cuando el concepto muestra selección activa o
presencia multiplayer. El agente describe relaciones —qué texto/objeto/grupo está seleccionado, qué cursor actúa
en qué anclaje y quién sólo se mueve por el canvas— y AXIS las normaliza en un manifest independiente del motor.
Cada superficie necesita un adapter que mida el objeto real. AXIS Lab proyecta el espécimen y el Campaign Layout
Compiler de Greenhouse ya pinta `headline`, `support`, `hook` o `lockup` desde el intent portable. Esta adopción
no significa que Globe u otro compositor ya tenga adapter.

Para frases de apoyo, `axisAdvertising.compositions.supportingTagline` aporta una receta portable separada del
espécimen: Poppins estructural, una oración continua, fitting uniforme contra el lockup principal, espacios
naturales y hasta dos énfasis semánticos. El agente puede sustituir todo el copy y asignar `growth` o
`intervention` a otros fragmentos sin copiar el HTML/CSS del Lab. Cada adapter conserva la medición y el QA de
su propio motor.

La firma web usa el asset fijo de Artifact Composer `assets/url-lum.svg`, no una placa textual. Greenhouse lo
compone contra el fondo final con el blend no separable `luminosity` y opacidad `0.72`; su QA comprueba hash,
geometría vectorial y diferencia raster visible. Por eso un SVG declarado pero invisible no cuenta como entrega.

## Qué evita

- titulares pesados por usar ExtraBold como receta automática;
- cursivas o gestos manuscritos demasiado largos;
- fuentes simuladas o sustituidas;
- logos blancos perdidos sobre fotografía clara;
- texto crítico generado dentro de una imagen;
- interletraje/interlínea extremos para hacer caber copy;
- cajas, guías o notas internas visibles en el export;
- tres voces tipográficas compitiendo al mismo tiempo.
- cursores decorativos separados de su identidad o que no señalan semánticamente al objeto seleccionado;
- bounding boxes fijos que cambian el aire al variar el copy o el formato.
- taglines partidos en fragmentos independientes, con palabras pegadas o huecos creados para llenar el ancho;

## Relación con MCP

La conexión a `mcp.efeonce.org` sigue disponible para las capacidades que el gateway realmente federa. Esta
metodología no se anuncia aún como manual MCP porque no existe una tool creativa asociada. La activación local
de Codex/Claude funciona sin MCP y no depende de un estado de conexión.

Contrato operativo: [Advertising Creative Agent Execution V1](../../operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md).
Manual: [usar reglas publicitarias con agentes](../../manual-de-uso/creative/usar-reglas-publicitarias-con-agentes.md).
