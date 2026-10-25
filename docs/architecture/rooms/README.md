# Efeonce Rooms

**Nombre y subdominio acordados:** Efeonce Rooms · `rooms.efeonce.org`.
**Propósito:** experiencia comercial y conversión de demanda; ayuda al comprador a comprender, evaluar y defender una solución. Sirve a propuestas creativas y SEO/AEO, combinables en una sala. Puede abrir conversaciones mediante muestras o diagnósticos personalizados.
**Estado al 2026-10-25:** foundation y persistencia PostgreSQL local verificadas; TASK-2059 incorpora View Transitions y componentes AXIS, con aceptación visual humana pendiente. Repositorio privado [efeoncepro/efeonce-rooms](https://github.com/efeoncepro/efeonce-rooms) creado; [Demo publicada en Vercel](https://efeonce-rooms.vercel.app/demo), TASK-2061; commit `bd4b802`, deployment `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc`. Autoría V2 local verificada (TASK-2062). Efeonce ID se construye con TASK-1834/2064/2065; invitaciones con correo único enlace+código en TASK-2066/2067. Sin DB cloud ni DNS propio activados.

**Programa:** [EPIC-052 — Efeonce Rooms](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md), `in-progress`: quince unidades de planificación; tasks para foundation, UI, persistencia, autoría versionada, identidad/invitaciones y primer release autorizado, con permisos can y vistas cliente/operador/administrador. La épica es dueña de secuencia, dependencias y cierre; estos documentos conservan los contratos de producto/arquitectura.

**Design system decidido (2026-10-07): La órbita**, gobernado por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md); Bricolage editorial/Poppins funcional en todas las superficies de Rooms. AXIS distribuye sus recursos y contratos. La primera composición local está implementada y su aceptación visual humana sigue pendiente; las piezas conservan su diseño.

## Documentos de decisión y arquitectura

1. [ADR consolidado](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md): decisiones aceptadas y go de primera entrega local, separado del rollout.
2. [Arquitectura de aplicación, medios y operación](EFEONCE_ROOMS_ARCHITECTURE_V1.md).
3. [API, datos y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).
4. [Experiencia completa](EFEONCE_ROOMS_EXPERIENCE_V1.md).
5. [Perfiles creativo y SEO/AEO; continuidad X-ray](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md): bloques, evidencias, sala combinada y aceptación V1.

6. [Política de versiones y baseline técnico](EFEONCE_ROOMS_STACK_BASELINE_V1.md): últimas estables compatibles, hallazgos TS7/ESLint10 y pins ejecutados; build local verificado, hosting pendiente.
7. [Marca de Rooms](EFEONCE_ROOMS_MARK_DECISION_V1.md): «eslabón leve», las dos «o» como órbitas enlazadas con la esfera Growth a la 1:30 de la segunda (nunca en un cruce); aceptada 2026-10-08, 18 SVG `rooms-*` en `axis-brand-assets` 0.4.27 (publicado en el release `v0.4.27` (2026-10-08, readback en GitHub Packages)). Revisión de parecido por web del mismo día (no es asesoría legal): el riesgo real es el nombre, casi genérico en la categoría; firmar siempre Efeonce | Rooms y hacer búsqueda formal de «EFEONCE ROOMS» mixta. Uso: [manual de la marca](../../manual-de-uso/creative/usar-marca-efeonce-rooms.md).

## Contratos de experiencia para revisión

- [Dirección visual y alternativas](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).
- [Wireframes de autoría, sala y presentación](../../ui/wireframes/rooms-v1.md).
- [Flujos, navegación y estados](../../ui/flows/rooms-v1.md).
- [Motion, medios y continuidad](../../ui/motion/rooms-v1.md).

Las decisiones de producto y contratos viven en estos documentos; el nombre final no autoriza infraestructura ni publicación. El logo quedó aceptado el 2026-10-08 en su [ADR de marca](EFEONCE_ROOMS_MARK_DECISION_V1.md). Los contratos V1 conservan el alcance futuro. La primera implementación local de TASK-2059 es candidata para revisión, sin aceptación visual humana.

Antecedentes: [frontera comercial aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md) e [investigación técnica inicial](../../think/creative-proposal-experience-stack-analysis-2026-10-07.md). La solución genérica anterior queda reemplazada por este dossier. Los productos actuales conservan su runtime.

Próximo checkpoint: revisar la sala publicada y continuar editor/medios; Efeonce ID requiere TASK-1834 antes de usuarios reales. [Superficie implementada](../../documentation/rooms/primera-experiencia-local.md), [manual de operación](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) y [QA](../../audits/rooms/2026-10-25-first-local-delivery.md). Identidad real, persistencia cloud y piloto con clientes siguen en EPIC-052; la persistencia local ya tiene commands transaccionales y recuperación probada.

## Verificación documental 2026-10-07

Cierre del dossier inicial: sin advertencias; 59 enlaces locales del dossier y antecedentes verificados, ninguno roto; diff sin errores de whitespace. Índice de ADR, contexto de entrada y referencias históricas actualizados. EPIC-052 añadió continuidad en Handoff e índices. La corrección posterior a La órbita actualizó también changelog, ADR/manuales de marca y skill espejo; 90 enlaces locales del dossier ampliado verificados, sin errores. Runtime e implementación siguen pendientes.

El QA global del worktree también detecta un bloqueo canónico en la propuesta Sika preexistente, fuera de este cambio; no se resolvió ni se presenta como parte del cierre Rooms. QA visual, accesibilidad ejecutada, seguridad runtime, rendimiento y despliegue quedan pendientes de implementación. Este cierre acredita documentación, no producto operativo.
