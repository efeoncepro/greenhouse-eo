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

## Qué evita

- titulares pesados por usar ExtraBold como receta automática;
- cursivas o gestos manuscritos demasiado largos;
- fuentes simuladas o sustituidas;
- logos blancos perdidos sobre fotografía clara;
- texto crítico generado dentro de una imagen;
- interletraje/interlínea extremos para hacer caber copy;
- cajas, guías o notas internas visibles en el export;
- tres voces tipográficas compitiendo al mismo tiempo.

## Relación con MCP

La conexión a `mcp.efeonce.org` sigue disponible para las capacidades que el gateway realmente federa. Esta
metodología no se anuncia aún como manual MCP porque no existe una tool creativa asociada. La activación local
de Codex/Claude funciona sin MCP y no depende de un estado de conexión.

Contrato operativo: [Advertising Creative Agent Execution V1](../../operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md).
Manual: [usar reglas publicitarias con agentes](../../manual-de-uso/creative/usar-reglas-publicitarias-con-agentes.md).
