# Efeonce Rooms

**Corte coordinado Auth+Rooms 2026-10-29:** [evidencia, pendientes y estado de release](../../audits/rooms/2026-10-29-auth-rooms-program-consolidation.md).
El canary único permanece cerrado OFF. El ref Git local `e4b2e89` no prueba el
deployment activo; Claude Design aún no había entregado la UI nueva. La
sesión Rooms amplía ahora el backend local; ese corte coordinado precede las ampliaciones siguientes.

## Candidato backend local — 2026-10-29

Rama `codex/rooms-design-integration`, sin push/deploy. La nueva UI de Claude Design aún no se ha
entregado. El entorno aislado3216/55433/19338 y el SDK browser-safe ya están preparados; no volver a
listarlos como trabajo pendiente. [Manual de integración](../../manual-de-uso/rooms/integrar-claude-design-local.md),
[operación del backend](../../manual-de-uso/rooms/operar-backend-local.md) y
[recibo del candidato/gates finales](../../audits/rooms/2026-10-29-backend-local-completion.md) y
[barrido completo docs/skills](../../audits/rooms/2026-10-29-docs-skills-full-reconciliation.md).

Código probado `3c7bcb5` (HEAD documental posterior `de38af5` sólo cambia AGENTS):13migraciones/43tablas,337testsPASS0skip,lint/types/build y smoke aislado del
worker de imágenes PASS. Chrome18+23checks; restore físico13 en PG16/18 y downgrade vacío13→8→13
PASS. El entorno13/multimedia opt-in se verificó y quedó detenido. No certifica rollout ni contenedor multimedia Linux.

| Frente nuevo local | Construido | Límite de este corte |
| --- | --- | --- |
| Colaboración2074 | Preguntas/respuestas, próximos pasos y actividad redactada;14pruebas focales(13PG+1schema) | Grants finos y anclas de edición; actividad no demuestra atención/intención comercial |
| Presentación2075 | Tours de edición publicada, notas propias, snapshot de sesión, owner/instance exclusivo, secuencia/ack/reconexión | Notas ajenas ni admin; bloques excluidos rechazados también en replay/lectura; sin adapter visual, playback ni sincronización remota |
| Integraciones2076 | Mapping nativo del contrato Think X-ray, coverage/exclusiones/previewHash y referencias/solicitudes CRM durables | Puertos externos deshabilitados; `pending` no significa entrega o sincronización CRM |
| Multimedia2077 | V4 opt-in local: Imagen+PDF/audio/video en una edición, con codecs reales, sandbox y entrega privada de derivados | Sólo macOS/toolchain fijado; Docker/Linux/cloud bloqueados; sin auto-conversión legacy, HLS ni originales descargables |
| MCP2078 | SDKoficial stdio local sobre HTTP y sesión existente; defaultread, toolsets explícitos, cobertura/exclusiones | Sin OAuth nativo nuevo, federación remota ni transferencia binaria por MCP |
| Invitados/migración13 | Derechos adicionales explícitos sólo en edición inicial; receipts/notas/sesiones/ack referencian sesión/invitación | No crea un principal interno, no amplía invitaciones anteriores ni concede esos derechos adicionales en una edición futura |

HTTP, SDK y comandos CLI comparten primitives, permisos y receipts. La UI sólo consumirá esos contratos.
Los readers están paginados; integraciones acepta máximo25elementos por página. El flujo binario multimedia
local usa HTTP/SDK propio; no atribuir al CLI de imágenes o al MCP un transporte que no implementan.

**Corte cloud documentado26Oct:** runtime privado [efeoncepro/efeonce-rooms](https://github.com/efeoncepro/efeonce-rooms),
publicación [PR3/e4b2e890](https://github.com/efeoncepro/efeonce-rooms/pull/3), GCS privado,8migraciones/26tablas
y worker/dispatch de imágenes comprobados. Ese SHA/ref Git no prueba qué deployment sirve hoy Vercel;
este corte no hizo readback cloud ni cambió flags. `rooms.efeonce.org` sigue como destino acordado,
sin afirmar activación DNS. Canary único cerrado OFF y Auth retenido en PR.

**Seguridad local 28Oct:** [B18](../../audits/rooms/2026-10-28-b18-guest-without-internal-sso.md) PASS: OTP guest sin sesión interna ni SSO, 51 comprobaciones. No cambia el contrato Auth ni acredita la nueva UI.

**B10 local 28Oct:** [Navegador Rooms→MCP con reader real de autoridad](../../audits/rooms/2026-10-28-b10-rooms-mcp-authority.md) PASS: consentimiento read explícito/token sólo read/write con step-up; store y reader PostgreSQL reales, código consumido con versión7. Datos/proyección/contexto son fixtures; sin dispatch gateway, revocación browser de binding ni MFA humana.

**Aislamiento RP local:** [Tres casos de servicios/persistencia](../../audits/rooms/2026-10-28-cross-rp-persistence-focal.md) PASS sin omisiones; sesión/callback con otro clientId y cookie guest crossRP rechazados. No cierra el recorrido integral de dos aplicaciones RP.

**Dos RP locales:** [35 comprobaciones repetidas con fuentes del candidato Auth ca97eecd1](../../audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md) PASS; cookies/callbacks/logout aislados y controles positivos. IssuerQA, no server.ts completo; RP2 es arnés del mismo consumer. Producción/HTTPS y segundo producto completo no acreditados.

**Propósito:** plataforma comercial propia para comprender, evaluar y defender propuestas creativas y
SEO/AEO, combinables en una sala. La implementación actual no acredita todo el alcance de V1/EPIC-052.

La evidencia cloud permanece en sus recibos fechados: [canary real/cierre OFF](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md),
[dispatch automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json),
[DB8/permisos](../../audits/rooms/2026-10-26-media-dispatch-database.json) y
[Auth retenido](../../audits/rooms/2026-10-26-auth-deploy-control.md).
`ROOMS_MEDIA_DISPATCH_ENABLED=true` sólo habilita la máquina en ese corte, no acceso humano.
Las cifras234/234,53PASS/3skip y CI Linux del worker de imágenes son históricas; no certifican el
candidato13/V4 ni aceptación visual. El recibo del29Oct separa los resultados nuevos.

**Programa:** [EPIC-052 — Efeonce Rooms](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md), `in-progress`: quince unidades de planificación; tasks para foundation, UI, persistencia, autoría versionada, identidad/invitaciones y primer release autorizado, con permisos can y vistas cliente/operador/administrador. La épica es dueña de secuencia, dependencias y cierre; estos documentos conservan los contratos de producto/arquitectura.

**Design system decidido (2026-10-07): La órbita**, gobernado por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md); Bricolage editorial/Poppins funcional en todas las superficies de Rooms. AXIS distribuye sus recursos y contratos. La primera composición local está implementada y su aceptación visual humana sigue pendiente; las piezas conservan su diseño.

## Continuidad 2026-10-26 — backend y diseño

El operador hará el diseño con **Claude Design**; Codex retoma exclusivamente backend.
[TASK-2072](../../tasks/in-progress/TASK-2072-rooms-cloud-media-backend.md) implementó storage GCS,
transferencia directa limitada, worker compilado e identidad propia y su disparo automático. La máquina
está habilitada; el acceso humano/medios web y el rollout general permanecen OFF.
[Contrato de API para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md).
La UI rescatada2071 conserva su condición de scaffold y la aceptación visual sigue pendiente.

## Documentos de decisión y arquitectura

1. [ADR consolidado](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md): decisiones aceptadas y go de primera entrega local, separado del rollout.
2. [Arquitectura de aplicación, medios y operación](EFEONCE_ROOMS_ARCHITECTURE_V1.md).
3. [API, datos y acceso](EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md).
4. [Experiencia completa](EFEONCE_ROOMS_EXPERIENCE_V1.md).
5. [Perfiles creativo y SEO/AEO; continuidad X-ray](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md): bloques, evidencias, sala combinada y aceptación V1.

6. [Política de versiones y baseline técnico](EFEONCE_ROOMS_STACK_BASELINE_V1.md): últimas estables compatibles, hallazgos TS7/ESLint10 y pins ejecutados; pins y build ejecutados; hosting Vercel publicado, aceptación visual separada.
7. [Marca de Rooms](EFEONCE_ROOMS_MARK_DECISION_V1.md): «eslabón leve», las dos «o» como órbitas enlazadas con la esfera Growth a la 1:30 de la segunda (nunca en un cruce); aceptada 2026-10-08, 18 SVG `rooms-*` en `axis-brand-assets` 0.4.27 (publicado en el release `v0.4.27` (2026-10-08, readback en GitHub Packages)). Revisión de parecido por web del mismo día (no es asesoría legal): el riesgo real es el nombre, casi genérico en la categoría; firmar siempre Efeonce | Rooms y hacer búsqueda formal de «EFEONCE ROOMS» mixta. Uso: [manual de la marca](../../manual-de-uso/creative/usar-marca-efeonce-rooms.md).

## Construcción actual

- [TASK-2070 — imágenes privadas y procedencia](../../tasks/complete/TASK-2070-rooms-private-image-media.md): primer circuito local PNG/JPEG/WebP, procesamiento fuera del request, publicación y entrega autorizada; [ADR](EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md).
- [TASK-2071 — editor y visor](../../tasks/in-progress/TASK-2071-rooms-private-image-authoring-and-viewer.md): cargar, validar, incorporar, previsualizar y publicar; zoom/teclado y retorno al contenido. Una imagen por bloque, varias piezas por sala.

TASK-2070/2072 tienen backend cloud publicado; TASK-2071 conserva la conexión y aceptación de la nueva
interfaz. El canary conjunto ya se completó, con cierre OFF. El disparo automático también se verificó;
ninguno debe volver a listarse como trabajo pendiente. Las ampliaciones locales2074–2078 se describen
arriba; su despliegue, el editor/visor nuevos y la certificación conjunta siguen separados.

## ADRs de las ampliaciones locales29Oct

- [Colaboración](EFEONCE_ROOMS_COLLABORATION_DECISION_V1.md), [presentación](EFEONCE_ROOMS_DURABLE_PRESENTATION_DECISION_V1.md).
- [Importación X-ray/referencia CRM](EFEONCE_ROOMS_SOURCE_IMPORT_AND_CRM_HANDOFF_DECISION_V1.md).
- [Multimedia local V4](EFEONCE_ROOMS_LOCAL_MULTIMEDIA_DECISION_V1.md), [MCP stdio local](EFEONCE_ROOMS_LOCAL_STDIO_MCP_DECISION_V1.md).

## Contratos de experiencia para revisión

- [Dirección visual y alternativas](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).
- [Wireframes de autoría, sala y presentación](../../ui/wireframes/rooms-v1.md).
- [Flujos, navegación y estados](../../ui/flows/rooms-v1.md).
- [Motion, medios y continuidad](../../ui/motion/rooms-v1.md).

Las decisiones de producto y contratos viven en estos documentos; el nombre final no autoriza infraestructura ni publicación. El logo quedó aceptado el 2026-10-08 en su [ADR de marca](EFEONCE_ROOMS_MARK_DECISION_V1.md). Los contratos V1 conservan el alcance futuro. La primera implementación local de TASK-2059 es candidata para revisión, sin aceptación visual humana.

Antecedentes: [frontera comercial aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md) e [investigación técnica inicial](../../think/creative-proposal-experience-stack-analysis-2026-10-07.md). La solución genérica anterior queda reemplazada por este dossier. Los productos actuales conservan su runtime.

Próximo checkpoint: conectar la entrega de Claude Design a la API del mismo origen; con los gates global/restore ya pasados. Verificar crear→cargar→procesar→adjuntar→publicar→leer desde esa interfaz. El entorno aislado ya está preparado. Auth permanece en PR; activar acceso/medios de producción exige una decisión posterior. [Superficie implementada](../../documentation/rooms/primera-experiencia-local.md), [manual de operación](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) y [QA inicial](../../audits/rooms/2026-10-25-first-local-delivery.md) conservan su evidencia histórica; el estado vigente es el indicado arriba, en TASK-2072 y en el ledger de la skill Rooms.

## Verificación documental 2026-10-07

Cierre del dossier inicial: sin advertencias; 59 enlaces locales del dossier y antecedentes verificados, ninguno roto; diff sin errores de whitespace. Índice de ADR, contexto de entrada y referencias históricas actualizados. EPIC-052 añadió continuidad en Handoff e índices. La corrección posterior a La órbita actualizó también changelog, ADR/manuales de marca y skill espejo; 90 enlaces locales del dossier ampliado verificados, sin errores. Runtime e implementación siguen pendientes.

El QA global del worktree también detecta un bloqueo canónico en la propuesta Sika preexistente, fuera de este cambio; no se resolvió ni se presenta como parte del cierre Rooms. QA visual, accesibilidad ejecutada, seguridad runtime, rendimiento y despliegue quedan pendientes de implementación. Este cierre acredita documentación, no producto operativo.
