# Efeonce Rooms

> Backend en `main@a87852e` por PR2 (2026-10-26), sin el scaffold visual2071; flagsOFF y cloud media/canary pendientes. [Release](../../audits/rooms/2026-10-26-production-backend-release.json) y [contrato Claude Design](../../documentation/rooms/backend-api-for-claude-design.md).

**Nombre y subdominio acordados:** Efeonce Rooms · `rooms.efeonce.org`.
**Propósito:** experiencia comercial y conversión de demanda; ayuda al comprador a comprender, evaluar y defender una solución. Sirve a propuestas creativas y SEO/AEO, combinables en una sala. Puede abrir conversaciones mediante muestras o diagnósticos personalizados.
**Estado al 2026-10-25:** runtime `20f9fe9` publicado en [Vercel](https://efeonce-rooms.vercel.app/invite), deployment `dpl_7o71umG3uuNgz8RguhPPGksA69ad`; repo privado [efeoncepro/efeonce-rooms](https://github.com/efeoncepro/efeonce-rooms). Autoría V2, lector protegido, invitación por correo único enlace+código y gestión contextual implementados. Suite178/178 PASS; UI integrada129 comprobaciones y15 de privacidad PASS en entorno aislado. PostgreSQL cloud propio con19tablas/5migraciones, WIF/secretos y WAF preparados y verificados; ambos flags de acceso siguen OFF. Readback público: /invite200, /login503 disabled y logout200. Piloto con Efeonce ID y único correo real aún pendientes de coordinación con Auth. Medios privados/editor/presentación/colaboración conservan su alcance pendiente en EPIC-052; aceptación visual humana pendiente. DNS `rooms.efeonce.org` no activado. [Evidencia de seguridad](../../audits/rooms/2026-10-25-invitation-token-hardening.md), [aislamiento SQL](../../audits/rooms/2026-10-25-cloud-isolation.md).

**Programa:** [EPIC-052 — Efeonce Rooms](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md), `in-progress`: quince unidades de planificación; tasks para foundation, UI, persistencia, autoría versionada, identidad/invitaciones y primer release autorizado, con permisos can y vistas cliente/operador/administrador. La épica es dueña de secuencia, dependencias y cierre; estos documentos conservan los contratos de producto/arquitectura.

**Design system decidido (2026-10-07): La órbita**, gobernado por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md); Bricolage editorial/Poppins funcional en todas las superficies de Rooms. AXIS distribuye sus recursos y contratos. La primera composición local está implementada y su aceptación visual humana sigue pendiente; las piezas conservan su diseño.

## Continuidad 2026-10-26 — backend y diseño

El operador hará el diseño con **Claude Design**; Codex retoma exclusivamente backend.
[TASK-2072](../../tasks/in-progress/TASK-2072-rooms-cloud-media-backend.md) agrega storage GCS,
transferencia directa limitada, worker compilado e identidad propia, sin activar producción.
[Contrato de API para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md).
La UI rescatada2071 conserva su condición de scaffold y la aceptación visual sigue pendiente.

## Documentos de decisión y arquitectura

1. [ADR consolidado](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md): decisiones aceptadas y go de primera entrega local, separado del rollout.
2. [Arquitectura de aplicación, medios y operación](EFEONCE_ROOMS_ARCHITECTURE_V1.md).
3. [API, datos y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).
4. [Experiencia completa](EFEONCE_ROOMS_EXPERIENCE_V1.md).
5. [Perfiles creativo y SEO/AEO; continuidad X-ray](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md): bloques, evidencias, sala combinada y aceptación V1.

6. [Política de versiones y baseline técnico](EFEONCE_ROOMS_STACK_BASELINE_V1.md): últimas estables compatibles, hallazgos TS7/ESLint10 y pins ejecutados; build local verificado, hosting pendiente.
7. [Marca de Rooms](EFEONCE_ROOMS_MARK_DECISION_V1.md): «eslabón leve», las dos «o» como órbitas enlazadas con la esfera Growth a la 1:30 de la segunda (nunca en un cruce); aceptada 2026-10-08, 18 SVG `rooms-*` en `axis-brand-assets` 0.4.27 (publicado en el release `v0.4.27` (2026-10-08, readback en GitHub Packages)). Revisión de parecido por web del mismo día (no es asesoría legal): el riesgo real es el nombre, casi genérico en la categoría; firmar siempre Efeonce | Rooms y hacer búsqueda formal de «EFEONCE ROOMS» mixta. Uso: [manual de la marca](../../manual-de-uso/creative/usar-marca-efeonce-rooms.md).

## Construcción actual

- [TASK-2070 — imágenes privadas y procedencia](../../tasks/in-progress/TASK-2070-rooms-private-image-media.md): primer circuito local PNG/JPEG/WebP, procesamiento fuera del request, publicación y entrega autorizada; [ADR](EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md).
- [TASK-2071 — editor y visor](../../tasks/in-progress/TASK-2071-rooms-private-image-authoring-and-viewer.md): cargar, validar, incorporar, previsualizar y publicar; zoom/teclado y retorno al contenido. Una imagen por bloque, varias piezas por sala.

Ambas continúan el goal autorizado, con hooks verificados. El backend de2070/2072 se integró en main a87852e
sin el scaffold UI2071. El canary de identidad sigue separado y pendiente. Recursos/worker/migraciones
de medios cloud, PDF/audio/video, editor completo y presentación conservan entregas pendientes.

## Contratos de experiencia para revisión

- [Dirección visual y alternativas](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).
- [Wireframes de autoría, sala y presentación](../../ui/wireframes/rooms-v1.md).
- [Flujos, navegación y estados](../../ui/flows/rooms-v1.md).
- [Motion, medios y continuidad](../../ui/motion/rooms-v1.md).

Las decisiones de producto y contratos viven en estos documentos; el nombre final no autoriza infraestructura ni publicación. El logo quedó aceptado el 2026-10-08 en su [ADR de marca](EFEONCE_ROOMS_MARK_DECISION_V1.md). Los contratos V1 conservan el alcance futuro. La primera implementación local de TASK-2059 es candidata para revisión, sin aceptación visual humana.

Antecedentes: [frontera comercial aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md) e [investigación técnica inicial](../../think/creative-proposal-experience-stack-analysis-2026-10-07.md). La solución genérica anterior queda reemplazada por este dossier. Los productos actuales conservan su runtime.

Próximo checkpoint: cerrar canary conjunto Auth–Rooms y continuar R05 (medios privados), que desbloquea exploración y autoría visual. [Superficie implementada](../../documentation/rooms/primera-experiencia-local.md), [manual de operación](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) y [QA inicial](../../audits/rooms/2026-10-25-first-local-delivery.md) conservan su evidencia histórica; el estado vigente es el indicado arriba y en las tasks2066/2068/2069.

## Verificación documental 2026-10-07

Cierre del dossier inicial: sin advertencias; 59 enlaces locales del dossier y antecedentes verificados, ninguno roto; diff sin errores de whitespace. Índice de ADR, contexto de entrada y referencias históricas actualizados. EPIC-052 añadió continuidad en Handoff e índices. La corrección posterior a La órbita actualizó también changelog, ADR/manuales de marca y skill espejo; 90 enlaces locales del dossier ampliado verificados, sin errores. Runtime e implementación siguen pendientes.

El QA global del worktree también detecta un bloqueo canónico en la propuesta Sika preexistente, fuera de este cambio; no se resolvió ni se presenta como parte del cierre Rooms. QA visual, accesibilidad ejecutada, seguridad runtime, rendimiento y despliegue quedan pendientes de implementación. Este cierre acredita documentación, no producto operativo.
