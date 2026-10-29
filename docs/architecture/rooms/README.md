# Efeonce Rooms

**Estado vigente al 2026-10-26:** runtime privado [efeoncepro/efeonce-rooms](https://github.com/efeoncepro/efeonce-rooms),
`main@e4b2e890` ([PR3](https://github.com/efeoncepro/efeonce-rooms/pull/3)), publicado en
[efeonce-rooms.vercel.app](https://efeonce-rooms.vercel.app/demo). `rooms.efeonce.org` sigue siendo el
subdominio acordado; su DNS no se declara activado.

**Continuidad local de integración:** rama `codex/rooms-design-integration` (`2cddc98a`), sin push/deploy:
entorno propio3216/55433/19338 y conectores browser-safe disponibles;250testsPASS y18comprobaciones
API en navegador. Claude Design aún debe conectar/aceptar su UI. [Manual local](../../manual-de-uso/rooms/integrar-claude-design-local.md).

**Seguridad local 28Oct:** [B18](../../audits/rooms/2026-10-28-b18-guest-without-internal-sso.md) PASS: OTP guest sin sesión interna ni SSO, 51 comprobaciones. No cambia el contrato Auth ni acredita la nueva UI.

**B10 local 28Oct:** [Navegador Rooms→MCP con reader real de autoridad](../../audits/rooms/2026-10-28-b10-rooms-mcp-authority.md) PASS: consentimiento read explícito/token sólo read/write con step-up; store y reader PostgreSQL reales, código consumido con versión7. Datos/proyección/contexto son fixtures; sin dispatch gateway, revocación browser de binding ni MFA humana.

**Aislamiento RP local:** [Tres casos de servicios/persistencia](../../audits/rooms/2026-10-28-cross-rp-persistence-focal.md) PASS sin omisiones; sesión/callback con otro clientId y cookie guest crossRP rechazados. No cierra el recorrido integral de dos aplicaciones RP.

**Dos RP locales:** [35 comprobaciones repetidas con fuentes del candidato Auth ca97eecd1](../../audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md) PASS; cookies/callbacks/logout aislados y controles positivos. IssuerQA, no server.ts completo; RP2 es arnés del mismo consumer. Producción/HTTPS y segundo producto completo no acreditados.

**Propósito:** plataforma comercial propia para comprender, evaluar y defender propuestas creativas y
SEO/AEO, combinables en una sala. La implementación actual no acredita todo el alcance de V1/EPIC-052.

| Frente | Implementado y comprobado | Pendiente / límite |
| --- | --- | --- |
| Backend/API/CLI | Salas, borradores y ediciones inmutables V1/V2/V3; autoridad persistida y `can`; revisión/idempotencia, auditoría/outbox; lectores y comandos compartidos | Autoría visual completa, presentación, colaboración, integraciones y MCP del roadmap |
| Identidad e invitación | Canary real conjunto Efeonce ID/Microsoft/MFA, un correo enlace+código, sesión guest, lectura y revocación | Flags humanos OFF; sala del canary archivada/invitación revocada; no repetir correo ni ampliar cohorte |
| Medios | GCS privado, PUT directo, verificación de bytes/generación y dos WebP desde un PNG físico; entrega GET/HEAD/Range/304 reautorizada | Consumidor de la nueva interfaz; PDF/audio/video y originales descargables no pertenecen al corte de imágenes |
| Operación cloud | Ocho migraciones/26 tablas; SA/rol propio worker; Scheduler OIDC cada minuto, sólo arranca Job con demanda; lease10min, timeout240s/retries0 | Entorno local preparado; nueva UI, staging cloud y activación general separados |
| Diseño e interfaz | Scaffold y demo sintética; primitives/logo oficiales AXIS/La órbita | Claude Design posee interfaz; conexión y aceptación visual humana pendientes |
| Auth deploy-control | Corrección preparada en PR263/264 de Greenhouse | Operador exige conservarlas en PR, sin merge main/develop ni deploy; no release262 |

`ROOMS_MEDIA_DISPATCH_ENABLED=true` habilita sólo la máquina. Acceso first-party, invitaciones y medios
web permanecen OFF. Backend234/234 y9pruebas focales PASS; Playwright53PASS/3skip y CI Linux PASS
acreditan verificaciones automáticas, no aceptación humana ni rollout general.

Evidencia: [canary real y cierre OFF](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md),
[disparo automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json),
[DB8 y permisos](../../audits/rooms/2026-10-26-media-dispatch-database.json),
[Auth retenido](../../audits/rooms/2026-10-26-auth-deploy-control.md).

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

- [TASK-2070 — imágenes privadas y procedencia](../../tasks/in-progress/TASK-2070-rooms-private-image-media.md): primer circuito local PNG/JPEG/WebP, procesamiento fuera del request, publicación y entrega autorizada; [ADR](EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md).
- [TASK-2071 — editor y visor](../../tasks/in-progress/TASK-2071-rooms-private-image-authoring-and-viewer.md): cargar, validar, incorporar, previsualizar y publicar; zoom/teclado y retorno al contenido. Una imagen por bloque, varias piezas por sala.

TASK-2070/2072 tienen backend cloud publicado; TASK-2071 conserva la conexión y aceptación de la nueva
interfaz. El canary conjunto ya se completó, con cierre OFF. El disparo automático también se verificó;
ninguno debe volver a listarse como trabajo pendiente. PDF/audio/video, editor completo, presentación,
colaboración y demás unidades de la épica conservan sus entregas propias.

## Contratos de experiencia para revisión

- [Dirección visual y alternativas](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).
- [Wireframes de autoría, sala y presentación](../../ui/wireframes/rooms-v1.md).
- [Flujos, navegación y estados](../../ui/flows/rooms-v1.md).
- [Motion, medios y continuidad](../../ui/motion/rooms-v1.md).

Las decisiones de producto y contratos viven en estos documentos; el nombre final no autoriza infraestructura ni publicación. El logo quedó aceptado el 2026-10-08 en su [ADR de marca](EFEONCE_ROOMS_MARK_DECISION_V1.md). Los contratos V1 conservan el alcance futuro. La primera implementación local de TASK-2059 es candidata para revisión, sin aceptación visual humana.

Antecedentes: [frontera comercial aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md) e [investigación técnica inicial](../../think/creative-proposal-experience-stack-analysis-2026-10-07.md). La solución genérica anterior queda reemplazada por este dossier. Los productos actuales conservan su runtime.

Próximo checkpoint: preparar entorno de integración aislado, conectar el diseño a la API del mismo origen y verificar cargar→procesar→adjuntar→publicar→leer desde esa interfaz. Auth permanece en PR; activar acceso/medios de producción exige una decisión posterior. [Superficie implementada](../../documentation/rooms/primera-experiencia-local.md), [manual de operación](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) y [QA inicial](../../audits/rooms/2026-10-25-first-local-delivery.md) conservan su evidencia histórica; el estado vigente es el indicado arriba, en TASK-2072 y en el ledger de la skill Rooms.

## Verificación documental 2026-10-07

Cierre del dossier inicial: sin advertencias; 59 enlaces locales del dossier y antecedentes verificados, ninguno roto; diff sin errores de whitespace. Índice de ADR, contexto de entrada y referencias históricas actualizados. EPIC-052 añadió continuidad en Handoff e índices. La corrección posterior a La órbita actualizó también changelog, ADR/manuales de marca y skill espejo; 90 enlaces locales del dossier ampliado verificados, sin errores. Runtime e implementación siguen pendientes.

El QA global del worktree también detecta un bloqueo canónico en la propuesta Sika preexistente, fuera de este cambio; no se resolvió ni se presenta como parte del cierre Rooms. QA visual, accesibilidad ejecutada, seguridad runtime, rendimiento y despliegue quedan pendientes de implementación. Este cierre acredita documentación, no producto operativo.
