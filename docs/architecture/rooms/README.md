# Efeonce Rooms

**Nombre y subdominio acordados:** Efeonce Rooms · `rooms.efeonce.org`.
**Propósito:** experiencia comercial y conversión de demanda; ayuda al comprador a comprender, evaluar y defender una solución. Puede abrir conversaciones mediante muestras o diagnósticos personalizados.
**Estado al 2026-10-07:** diseño para revisión antes del go final. No hay implementación, registro DNS, provisión ni despliegue verificados.

**Programa:** [EPIC-052 — Efeonce Rooms](../../epics/to-do/EPIC-052-efeonce-rooms-sales-enablement-platform.md), `to-do`: quince unidades de planificación, sin tasks hijas registradas ni go de implementación. La épica es dueña de secuencia, dependencias y cierre; estos documentos conservan los contratos de producto/arquitectura.

**Design system decidido (2026-10-07): La órbita**, gobernado por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md); Bricolage editorial/Poppins funcional en todas las superficies de Rooms. AXIS distribuye sus recursos y contratos. La composición renderizada sigue pendiente; las piezas del cliente conservan su diseño.

## Documentos de decisión y arquitectura

1. [ADR consolidado](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md): decisiones previas aceptadas y propuesta pendiente de go, sin confundir ambos estados.
2. [Arquitectura de aplicación, medios y operación](EFEONCE_ROOMS_ARCHITECTURE_V1.md).
3. [API, datos y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).
4. [Experiencia completa](EFEONCE_ROOMS_EXPERIENCE_V1.md).

## Contratos de experiencia para revisión

- [Dirección visual y alternativas](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).
- [Wireframes de autoría, sala y presentación](../../ui/wireframes/rooms-v1.md).
- [Flujos, navegación y estados](../../ui/flows/rooms-v1.md).
- [Motion, medios y continuidad](../../ui/motion/rooms-v1.md).

Las decisiones de producto y contratos viven en estos documentos; el nombre final no autoriza creación de logo, infraestructura o publicación. Los contratos de UI son candidatos documentales, no interfaces renderizadas ni aceptación visual.

Antecedentes: [frontera comercial aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md) e [investigación técnica inicial](../../think/creative-proposal-experience-stack-analysis-2026-10-07.md). La solución genérica anterior queda reemplazada por este dossier. Los productos actuales conservan su runtime.

Próximo checkpoint: revisión del dossier y programa por el operador. Después del go, materializar las unidades de EPIC-052 en tasks, fijar versiones y probar primero una composición real en desktop/móvil; una aprobación documental no acredita esos resultados.

## Verificación documental 2026-10-07

Cierre del dossier inicial: sin advertencias; 59 enlaces locales del dossier y antecedentes verificados, ninguno roto; diff sin errores de whitespace. Índice de ADR, contexto de entrada y referencias históricas actualizados. EPIC-052 añadió continuidad en Handoff e índices. La corrección posterior a La órbita actualizó también changelog, ADR/manuales de marca y skill espejo; 90 enlaces locales del dossier ampliado verificados, sin errores. Runtime e implementación siguen pendientes.

El QA global del worktree también detecta un bloqueo canónico en la propuesta Sika preexistente, fuera de este cambio; no se resolvió ni se presenta como parte del cierre Rooms. QA visual, accesibilidad ejecutada, seguridad runtime, rendimiento y despliegue quedan pendientes de implementación. Este cierre acredita documentación, no producto operativo.
