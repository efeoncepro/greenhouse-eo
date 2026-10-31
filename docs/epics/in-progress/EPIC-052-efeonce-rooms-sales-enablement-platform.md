# EPIC-052 — Efeonce Rooms: experiencia comercial inmersiva y sales enablement

## Corte vigente 2026-10-29

El [canary real interno del 26-10](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md) ya está completado y cerrado: una sala sintética, imagen GCS procesada y servida con autorización, un correo enlace+código recibido, sesión guest limitada y revocación. Auth y Rooms volvieron a OFF; no fue aceptación de UI, activación de clientes ni ampliación de cohorte. En el checkout hermano, `main` y `origin/main` apuntan localmente a `e4b2e89` (merge del dispatch automático); ese Git readback no acredita por sí mismo el deployment Vercel activo. La sesión Rooms reportó 35 checks browser/HTTP/PG PASS para dos RP locales contra fuentes Auth; el recibo detallado no está en este checkout y no hay E2E HTTPS/entrypoint completo. La nueva UI de Claude Design sigue sin entregar/integrar. El corte backend local29Oct añade multimedia V4, presentación/notas, colaboración/actividad, MCPstdio y mapping/referencias de integraciones, con pruebas de restore y límites. La certificación Linux/cloud, conectores reales, paridad de la experiencia y rollout siguen abiertos; el detalle vigente está en Status real y el recibo local. Auth conserva su release retenido. [Conciliación Auth](../../audits/rooms/2026-10-29-auth-develop-reconciliation-local.md).

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `2026-10-29: backend local ampliado con colaboración, presentación, X-ray/CRM preparado, multimedia V4 local y MCP stdio; 337tests sin omisiones, lint/types/build PASS sobre base nueva13migraciones/43tablas. Down/up vacío de migraciones9–13, recuperación física PG16/18 y launcher/Chrome18+23checks PASS. Publicación cloud permanece en el corte8 de26Oct con canary cerrado; sin nuevo readback ni cambio de producción. UI Claude Design, certificación multimedia Linux/cloud, puertos externos, federación MCP remota y rollout permanecen separados. Auth retenido en PR.`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Commercial / Product; responsable individual por asignar`
- Branch: `Greenhouse develop para documentación; candidato Rooms codex/rooms-design-integration, sin push; main conserva release anterior`
- GitHub Issue: `n/a; registro local, sin issue remoto`
- Created: `2026-10-07`

Priority, Impact y Effort son inferencias de planificación por alcance multimedia, acceso externo y valor comercial; no asignan fecha, presupuesto ni prioridad relativa frente a otras épicas. El operador pidió explicar el sistema y crear esta épica. Eso autoriza su registro, no equivale al go final de implementación ni acepta por inferencia todos los detalles del ADR Proposed.

## Summary

Coordina la construcción de **Efeonce Rooms**, plataforma propia de sales enablement y experiencia del comprador en `rooms.efeonce.org`. Alcance V1: una sala reutilizable para propuestas creativas y SEO/AEO, combinables. El primer recorrido que se materializa es creativo: propuestas gráficas completas, estáticas, largas, audio y video, acompañadas por sus PDFs originales. SEO/AEO añade oportunidad, muestra editorial/técnica, radiografía, evidencia, linaje, plan y medición; no se reduce a adjuntar un PDF o enlazar X-ray. El champion puede comprender, ensayar, presentar y defender la propuesta ante su comité; el evaluador puede explorar y preguntar con contexto.

La administración vive en Rooms; UI, CLI y MCP consumen el mismo contrato. La documentación permanece en Greenhouse. El repo privado `efeoncepro/efeonce-rooms` existe en GitHub desde 2026-10-25; TASK-2061 posee su primera publicación Vercel de datos sintéticos. La persistencia nació en PostgreSQL local independiente; TASK-2069/2072 ya tienen DBcloud propia con26tablas/8migraciones y GCS privado. El canary de identidad, correo único e imagen se completó y cerró OFF; no hay rollout a clientes externos. El dominio es un destino acordado, no una afirmación de DNS o servicio desplegado.

## Why This Epic Exists

La experiencia exige coordinar identidad, autoría, medios, narrativa, presentación, evaluación, integraciones y operación. Implementarla como una sola task mezclaría contratos de alto riesgo con decisiones visuales y produciría un cierre imposible de verificar.

El PDF conserva su función documental, mientras Rooms permite inspeccionar y experimentar el trabajo. Un recorrido resumido jamás justifica perder páginas o assets del inventario. El champion necesita conducir la conversación sin depender del autor de la propuesta y sin exponer notas privadas.

La frontera aceptada separa Rooms de Think y Greenhouse: Think conserva captación; Greenhouse coordinación/operación; HubSpot CRM; Studio producción/activación. Rooms posee la experiencia comercial y sus ediciones, no reemplaza esos dominios.

## Outcome

- El equipo prepara una sala completa sin escribir componentes particulares por cliente.
- El comprador explora piezas en su formato real y encuentra el método/evidencia vinculados.
- El champion ensaya, presenta, responde abriendo detalle y vuelve al mismo punto del recorrido.
- UI, CLI y MCP ejecutan el ciclo durable con iguales capacidades, límites y permisos.
- Ediciones, acceso, medios y conversaciones tienen identidad y trazabilidad claras.
- Dos propuestas de marcas distintas —una creativa y una SEO/AEO— y un recorrido combinado de una misma marca demuestran reuso, aislamiento y calidad desktop/móvil.
- El piloto autorizado deja evidencia de uso, operación, coste y límites; ninguna métrica afirma causalidad de ventas sin estudio.

## Design System — decisión 2026-10-07

El operador corrigió expresamente la estética y tipografía: **La órbita (`efeonce-graphic-line`) es el design system de Rooms**, también para autoría y consola. Bricolage editorial/Poppins funcional; paleta, componentes, iconografía y motion canónicos. AXIS es su infraestructura de distribución. Esta decisión reemplaza la base Poppins/Geist de los borradores; composición específica, pins y QA local están implementados; aceptación visual humana y alcance V1 restante siguen pendientes. El arte cliente permanece intacto y no se obliga a narrar en preguntas/respuestas.

## Architecture Alignment

- [Dossier Rooms](../../architecture/rooms/README.md): índice canónico del dominio.
- [ADR Rooms](../../architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md): decisiones aceptadas separadas de propuesta técnica/visual.
- [Arquitectura](../../architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md): app modular Next.js/React/TypeScript, PostgreSQL, storage privado y worker multimedia.
- [Baseline técnico y política de versiones](../../architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md): objetivo de últimas estables compatibles; TS7/tooling, plugins ESLint10, Node LTS y gate ejecutable de R01.
- [API y acceso](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md): commands/readers, catálogo por canal, permisos y edición.
- [Perfiles creativo y SEO/AEO](../../architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md): contenido estructurado, evidencia, continuidad X-ray y aceptación conjunta.
- [Experiencia](../../architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md), [dirección visual](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md), [wireframes](../../ui/wireframes/rooms-v1.md), [flujos](../../ui/flows/rooms-v1.md) y [motion](../../ui/motion/rooms-v1.md).
- [Skill La órbita](../../../.codex/skills/efeonce-graphic-line/SKILL.md): autoridad estética y tipográfica; [roles Rooms](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).
- [AXIS portable](../../architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md) y [consumo privado](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md): versiones exactas, adapter nativo, evidencia del consumidor y rollback.
- [Identidad contextual](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md), [gateway MCP](../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) y [API parity](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).
- [Fronteras de build](../../architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md), [placement](../../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md) y [modelo de épicas](../../operations/EPIC_OPERATING_MODEL_V1.md).

## Child Tasks

Corte local29Oct, autorizado para terminar backend sin UI; construcción en `codex/rooms-design-integration`, sin push/deploy:

- [TASK-2074](../../tasks/complete/TASK-2074-rooms-durable-collaboration.md): colaboración, actividad explícita y derechos guest sólo por edición solicitados explícitamente; actor references y receipts sin identidad interna.
- [TASK-2075](../../tasks/complete/TASK-2075-rooms-durable-presentation.md): tours, notas propias, sesión/edición fija, control/secuencia/ACK y reconexión por lectura.
- [TASK-2076](../../tasks/complete/TASK-2076-rooms-source-import-and-crm-handoff.md): mapping X-ray, metadata de cobertura/pérdidas, referencia autorizada y handoff pendiente; puertos externos OFF.
- [TASK-2077](../../tasks/complete/TASK-2077-rooms-local-multimedia-pipeline.md): PDF/audio/video y V4 opt-in local; sin certificación de worker Linux/cloud ni nueva UI.
- [TASK-2078](../../tasks/complete/TASK-2078-rooms-local-stdio-mcp.md): MCP stdio local por sesión existente; sin OAuth/federación remota ni transferencia binaria MCP.
- [TASK-2079](../../tasks/in-progress/TASK-2079-rooms-orbit-foundation.md): base visual La órbita (órbita, halo, cámara, iris, parallax, motion) del canvas aprobado el 2026-10-29; primera pieza de la UI.
- [TASK-2080](../../tasks/in-progress/TASK-2080-rooms-approved-ui-backend-contract.md): contrato backend de todo el canvas aprobado salvo tiempo real; decisiones de privacidad resueltas por el operador el 2026-10-30.
- [TASK-2081](../../tasks/to-do/TASK-2081-rooms-live-room-realtime.md): sala en vivo, ADR de transporte y backend en tiempo real.

[Recibo del corte y límites](../../audits/rooms/2026-10-29-backend-local-completion.md). TASK-2070 y2074–2078 quedan complete por su alcance técnico local verificado. TASK-2071/2072 y la
épica conservan in-progress por interfaz/certificación conjunta/rollout; cerrar el backend local no
certifica el producto completo.


Canary interno real26Oct completado: Microsoft/MFA, una sala sintética, un correo recibido y un PNG físico con GCS/worker/lectura privada; aislamiento y revocación comprobados. El piloto quedó archivado/revocado, first-party/OTP/invitaciones/medios web OFF; OAuth/MCP y login base Auth permanecen activos. [Evidencia](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md). El disparo posterior automático ya pasó: vacío200 sin contenedor, demanda202→JobSUCCESS→ack cercado/libre. [Scheduler](../../audits/rooms/2026-10-26-automatic-media-dispatch.json).

[TASK-2072](../../tasks/in-progress/TASK-2072-rooms-cloud-media-backend.md): backend cloud de imágenes y contrato para Claude Design, main `e4b2e890` por PR2/PR3;8migraciones/26tablas, GCS/IAM/CORS, worker por digest y Scheduler privado comprobados. Codex conserva backend y Claude Design interfaz. Entorno aislado/datos/permisos y SDK preparados/probados; falta consumidor y recorrido mediante la nueva UI same-origin; acceso productivo general permanece separado.

[TASK-2070](../../tasks/complete/TASK-2070-rooms-private-image-media.md): R05A de imágenes estáticas implementado y con canary cloud por2072; V3/procedencia, generaciones y entrega verificada. PDF/audio/video y pipeline multimedia completo quedan en R05B; no se declaran listos por el PNG.

[TASK-2071](../../tasks/in-progress/TASK-2071-rooms-private-image-authoring-and-viewer.md): nuevo editor/visor bajo Claude Design. Scaffold anterior es referencia, `UI ready=no` hasta mapping y gates del nuevo diseño; conexión al backend, GVC y aceptación humana pendientes. No completa R07/R08.

[TASK-2069](../../tasks/in-progress/TASK-2069-rooms-cloud-runtime-controlled-pilot.md): WIF/Cloud SQL, DB y secretos propios, WAF y piloto integrado ya verificados. Restore LOCAL8 PG16/18 certificó26tablas/19objetos/12bindings; candidato local13 certificó43tablas/23objetos/14pins. Recovery cloud/PITR/secretos, coste/observación y activación general mantienen gates.

[TASK-2068](../../tasks/in-progress/TASK-2068-rooms-invitation-and-guest-experience.md): entrada con código, lectura guest y gestión históricas; la lectura V3/imagen privada ya pasó en HTTP real. Nueva UI, BFCache real y aceptación humana pendientes.

[TASK-2065](../../tasks/complete/TASK-2065-rooms-efeonce-id-consumer.md): consumer OIDC interno cerrado localmente; foundation1834/login2064 y canary productivo interno posterior comprobados. [PR263/264 de control Auth](../../audits/rooms/2026-10-26-auth-deploy-control.md) retenidas por el operador aun con CI/VercelPASS, sin merge/deploy ni release262.

[TASK-2066](../../tasks/in-progress/TASK-2066-rooms-tokenized-invitations-email-code.md): correo inicial único enlace+código, proof/sesión guest room-scoped y revocación reales comprobados con OTPissuer2067. No repetir canary ni inferir invitaciones a clientes.

[TASK-2062](../../tasks/complete/TASK-2062-rooms-versioned-content-authoring.md): R03B de autoría programática, manifest versionado y coverage. V1/V2 inmutables, V3 opt-in; un editor completo sigue perteneciendo a R08.

[TASK-2060](../../tasks/complete/TASK-2060-rooms-persistence-and-lifecycle.md): cierre original de persistencia/ciclo local; evolución cloud en2069/2072. [TASK-2059](../../tasks/in-progress/TASK-2059-rooms-first-experience.md) conserva View Transitions/AXIS y QA de la demo previa; no aceptación visual de la nueva dirección.

[TASK-2061](../../tasks/complete/TASK-2061-rooms-github-vercel-release.md): primera demo GitHub/Vercel cerrada por su evidencia. Los SHAs/deployments de su cierre son históricos; el main vigente está indicado arriba. Ningún cierre local, build o captura enciende acceso humano ni registra aceptación de diseño.

**Primeras dos tasks hijas registradas el 2026-10-25:** [TASK-2058](../../tasks/complete/TASK-2058-rooms-foundation-and-permissions.md), foundation/contratos/can (primer corte R01/R04); [TASK-2059](../../tasks/in-progress/TASK-2059-rooms-first-experience.md), primera sala y vistas por rol (primer corte R02). Las dos tienen alcance local acotado; no completan R01/R02/R04 ni el piloto por inferencia.

 Los códigos R01–R15 son unidades de planificación locales a esta épica, no IDs TASK ni promesas de trabajo iniciado. Se materializan con plantilla/addenda vigentes al preparar la implementación; deben declarar esta épica y actualizar esta tabla con el ID real. No se reservan números de tasks especulativos. Cada unidad puede dividirse si su discovery revela contratos independientes.

| Unidad | Entrega prevista | Perfil de futura task / owner funcional | Dependencias | Evidencia de salida |
|---|---|---|---|---|
| R01 | Contratos ejecutables y ficha de runtime: operaciones/schemas, bloques/perfiles/evidencia/edición, mapping X-ray, decisiones de identidad, límites, pins, región, retención y coste | backend-data / Platform | Go de implementación; revisión del ADR | Contratos y manifest/lockfile versionados; matriz de compatibilidad actualizada, decisiones TS7/tooling y ESLint resueltas con instalación/lint/typecheck/build; fixture multicanal y límites publicados; sin provisión implícita |
| R02 | Dirección materializada en composición desktop/móvil y primera transición con material real | ui-ux / Product + Creative + SEO-AEO + AXIS | Go; dossier y fixtures autorizadas | Primer viewport y pieza→detalle creativos, más lectura→radiografía SEO/AEO aceptados por operador; Bricolage/Poppins, paleta/componentes/iconografía La órbita, estados y movimiento reducido medidos |
| R03 | Foundation del runtime y dominio: borrador, bloques tipados, piezas/variantes, evidencia/snapshots/relaciones, planes/escenarios, relato, tours, ediciones, outbox y auditoría | backend-data / Platform | R01 | Commands/readers persistidos, concurrencia y replay; edición inmutable, migración/rollback verificados |
| R04 | Identidad y acceso: relying party, invitaciones/sesiones externas, grants, capabilities y proyecciones privadas | backend-data / Identity + Platform | R01, R03 | Acceso interno/externo, denegación entre tenants, expiración/revocación; notas ausentes del DTO de audiencia |
| R05 | Pipeline multimedia: upload, originales, derivados, jobs, fallos y entrega privada de bytes | backend-data / Media + Platform | R03, R04 | Imagen/PDF/audio/video reales; checksum, dimensiones, ratio, retries, tickets y streaming verificados |
| R06 | Shell de producto, entrada contextual y gestión de salas según autoridad | ui-ux / Product | R02, R03, R04 | Navegación y estados de acceso completos; integración con identidad sin duplicar login; crear/continuar/archivar por API |
| R07 | Exploración creativa y SEO/AEO: narrativa, inventario, variantes, detalle, lectura editorial, radiografía, diagnóstico/plan, linaje y fundamentos | ui-ux / Product + Creative + SEO-AEO | R02, R05, R06 | Ratios y piezas largas legibles; inventario íntegro; fragmento↔evidencia y derivado↔origen; teclado/táctil y retorno estable |
| R08 | Editor: plantillas combinables, importación de archivos/bloques, relaciones, relato, evidencia, planes/escenarios, recorridos, cobertura y preview por rol | ui-ux / Product | R03, R04, R05, R07 | Mismo renderer que comprador; pérdidas/exclusiones visibles; publicación por command, sin lógica privada solo en UI |
| R09 | Contrato de presentación y notas: preparación, sesión fija, proyecciones, control exclusivo y reconexión | backend-data / Platform | R03, R04, R05 | Sesión/edición/tour coherentes; payloads aislados; secuencias/acks y recuperación no filtran notas ni aplican órdenes viejas |
| R10 | Experiencia del champion: notas, ensayo, preflight, consola, audiencia y retorno al tour | ui-ux / Product + Creative + SEO-AEO | R07, R09 | Champion presenta sin asistencia, abre evidencia y vuelve; prueba de sonido, ventana única y pérdida de consola |
| R11 | Preguntas, respuestas, pasos y actividad observable con anclas a edición/bloque/pieza/tiempo | backend-data / Platform + Commercial | R03, R04, R05 | Idempotencia, scope y retención; eventos reales y métricas definidas; lectura con permisos efectivos |
| R12 | Evaluación y seguimiento: paneles contextuales, preguntas, pasos y lectura comercial de actividad | ui-ux / Product + Commercial | R07, R11 | Preguntar desde pieza y retomar; edición visible; actividad no presentada como intención inferida |
| R13 | Adapters CLI/MCP completos y certificación de equivalencia con UI | backend-data / Platform + MCP | Base R03–R05; cierre después de R09/R11 | Ciclo durable real por tres canales, incluida transferencia de bytes, bloques/evidencias/relaciones y readback; catálogo y permisos equivalentes |
| R14 | Puentes comerciales: adapter X-ray, snapshots autorizados de diagnóstico/informes, referencia CRM y procedencia, proyección/handoff acotados | backend-data / Integrations + Commercial | R03, R04, R11 | Mapping X-ray versionado con cobertura/pérdidas visibles; contenido nativo y grants propios; outbox/reconciliación y fallo CRM tolerado; sin tablas ajenas |
| R15 | Certificación y rollout: dos marcas, perfiles creativo y SEO/AEO y tour combinado, champion, accesibilidad, resiliencia, costes, restore, canary y manuales | standard / QA + Ops + Commercial | R01–R14 | Todos los Exit Criteria con evidencia; despliegue/piloto autorizados y readback; handoff operativo |

La exposición HTTP/CLI/MCP acompaña cada contrato desde R03; R13 integra y certifica, no deja la paridad para una reescritura al final. R09 define autoridad y estado durable; coordinación local entre ventanas es adapter de R10. R15 verifica el conjunto: no concentra implementación pendiente de otras unidades.

## Lectura vigente del roadmap — 29Oct

- R01/R03: foundation, permisos, persistencia y autoría programática construidos; conservar los límites de cada task.
- R04: OIDC/OTP y canary interno comprobados, con acceso humano OFF al finalizar; rollout general pendiente.
- R05: R05A imágenes/trigger automático comprobados; R05B V4 mixto local2077 implementado y recuperado. Certificación multimedia Linux/cloud permanece pendiente.
- R02/R06/R07/R08: demo/scaffold históricos disponibles; nuevo diseño, conexión y aceptación bajo Claude Design.
- R09/R10: backend de tours/notas/sesiones/control/ACK local2075; consola/champion visual, playback y coordinación observable conservan sus criterios de experiencia.
- R11/R12: preguntas, pasos y actividad durables implementados local2074, con anclas y permisos; experiencia de evaluación/lectura comercial y certificación integral siguen pendientes.
- R13/R14: HTTP/CLI/SDK y MCPstdio local2078 comparten primitives; mapping X-ray/referencia CRM/handoff2076 construidos con puertos OFF. Conectores reales, federación MCP remota y equivalencia final UI/CLI/MCP siguen abiertos.
- R15: certificación conjunta de dos marcas, perfiles/tour/champion, costes/resiliencia/restore y rollout continúa abierta. El canary único no cierra el epic.

## Sequence and Milestones

```mermaid
flowchart TD
  GO[Go de implementación] --> R01[R01 Contratos]
  GO --> R02[R02 Composición visual]
  R01 --> R03[R03 Dominio]
  R03 --> R04[R04 Identidad y acceso]
  R04 --> R05[R05 Medios]
  R02 --> R06[R06 Shell]
  R04 --> R06
  R05 --> R07[R07 Exploración]
  R06 --> R07
  R07 --> R08[R08 Autoría]
  R05 --> R09[R09 Sesión y notas]
  R07 --> R10[R10 Presentación]
  R09 --> R10
  R05 --> R11[R11 Colaboración y eventos]
  R11 --> R12[R12 Evaluación UI]
  R07 --> R12
  R09 --> R13[R13 Paridad certificada]
  R11 --> R13
  R11 --> R14[R14 Integraciones]
  R08 --> R15[R15 Certificación y rollout]
  R10 --> R15
  R12 --> R15
  R13 --> R15
  R14 --> R15
```

| Hito | Resultado revisable | Condición de avance |
|---|---|---|
| M0 — definición | Dossier y épica coherentes | Completado documentalmente; no es producto construido |
| M1 — dirección y contratos | Primer recorrido creativo + lectura/radiografía SEO/AEO desktop/móvil; contratos de bloques, evidencia y acceso | R01/R02; aprobación visual del operador y decisiones técnicas concretas |
| M2 — sala completa | Importar → editar → publicar → explorar todo el inventario con acceso real | R03–R08; no se entrega una galería de cinco piezas como propuesta completa |
| M3 — champion y evaluación | Preparar → presentar → responder → retomar; preguntas/seguimiento | R09–R12; payload privado separado y flujo observado |
| M4 — certificación multicanal | Operar la misma sala por UI/CLI/MCP y reconciliar integraciones | R13/R14 más evidencia acumulada; cada capability tiene owner y pruebas |
| M5 — piloto y operación | Dos marcas, ambos perfiles y tour combinado, uso del champion y runtime recuperable | R15; gates de salida y autorizaciones de despliegue/participación, sin inferirlos del go técnico |

No se estima plazo o precio antes de R01, selección de equipo y fixtures. Las dependencias son de producto/contrato; no ordenan crear subagentes ni ejecutar tareas simultáneamente.

## Existing Related Work

- [EPIC-029 Proposal Studio](../to-do/EPIC-029-tender-proposal-studio-agentic-authoring.md): expediente/oferta formal y producción documental; se referencia, no se reparentan sus tasks ni se reconstruye la propuesta técnica rechazada.
- [EPIC-049 Marketing Studio](../in-progress/EPIC-049-efeonce-marketing-studio-platform.md): campañas y activación; fuente potencial de versiones autorizadas, no editor Rooms.
- [EPIC-050 Creative Workbench](../to-do/EPIC-050-creative-workbench-campaign-scale-production.md): producción multimarcas; Rooms exhibe material existente sin absorber sus motores.
- [EPIC-045 Insights](../in-progress/EPIC-045-efeonce-insights-multiformat-intelligence.md): referencia de presentación y evidencia; sin migración de informes por esta épica.
- [EPIC-044 Identity/MCP](../in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md): contratos compartidos; su existencia documental no prueba integración Rooms.
- [EPIC-033 UI platform](../complete/EPIC-033-premium-agentic-ui-platform.md): método de calidad; componentes portables AXIS verificados en consumidor, sin importar wrappers privados de Greenhouse.
- [AEO X-ray](../../think/radiografia-aeo-architecture.md): experiencia SEO/AEO que debe conservar lectura, radiografía y linaje mediante adapter; sus muestras y rutas actuales permanecen. La nueva room exige sus propios permisos y edición.
- [Sika/POSIBLE](../../commercial/tenders/sika-mexico-campana-creativa-1164/README.md): posible fixture con archivos existentes y permisos pertinentes. No depende de terminar esa licitación, no se alteran originales ni se envía nada al cliente por crear la épica.

Barrido de dominio/superficie efectuado sobre registries y épicas: no existe dueña previa de Rooms. Los solapamientos anteriores se conservan como related work. Los bloqueos específicos de cierre de Sika no impiden registrar este programa ni se consideran resueltos por él.

## Exit Criteria

Los criterios V1 integrales siguen abiertos; hay implementaciones/evidencia parciales en el corte local29Oct y el canary26Oct. Registrar evidencia junto a cada casilla al cumplirla; no estimar porcentaje de producto usando el número de documentos redactados.

- [ ] Go de implementación registrado; ADR/decisiones concretas y tasks hijas sincronizadas con sus owners, perfiles y dependencias.
- [ ] Baseline R01 certificado: versiones estables/pins, instalación reproducible, resolución TS7/tooling y ESLint/plugins, lint con casos negativos, typecheck, build y primer consumidor AXIS; excepciones temporales con owner/condición de retiro.
- [ ] Dos salas de marcas diferentes, una creativa y una SEO/AEO, más un tour combinado de una misma marca; sin código especial por cliente, inventario de archivos/bloques reconciliado y exclusiones expresas.
- [ ] Perfil SEO/AEO nativo: lectura completa → fragmento/radiografía/evidencia → derivado/origen → plan/medición; adapter X-ray preserva contenido, anclas, fuentes y estado sin ejecutar código importado.
- [ ] Evidencia con entidad/ámbito, fecha, método y cobertura; observación/hipótesis/simulación/propuesta distinguibles; fuente caída o desactualizada, ancla rota y ausencia de baseline resueltas explícitamente, sin cambiar la edición en presentación.
- [ ] Escenario soporta 9:16, 4:5, 1,91:1, 16:9, ratio arbitrario, pieza larga, carrusel, PDF, audio y video sin distorsión/crop silencioso.
- [ ] Método, fundamentos y criterios de evaluación enlazan a piezas/evidencia reales; ausencias explícitas, sin contenido inventado para cubrir huecos.
- [ ] Autoría/preview/exploración/presentación utilizan contrato de render coherente; publicación fija versiones y nunca cambia una sesión activa silenciosamente.
- [ ] Champion que no creó la sala puede preparar, ensayar y presentar; abre evidencia ante una pregunta y retorna a su posición sin asistencia del creador.
- [ ] Consola y audiencia reciben proyecciones distintas; notas privadas ausentes de payloads/canales de audiencia, no solo ocultas por CSS.
- [ ] Crear/subir/importar bloques y evidencias/vincular radiografía y linaje/configurar planes y escenarios/ordenar/anotar/publicar/administrar acceso y consultar actividad funcionan por UI/CLI/MCP con readback y pruebas de denegación equivalentes; exclusiones de gestos locales documentadas.
- [ ] Originales/derivados privados, tipos/bytes comprobados, retry/cancel/concurrencia verificados; revocación de nuevos accesos y TTL efectivo de tickets existentes medidos.
- [ ] Preguntas, respuestas y pasos mantienen autoría, visibilidad y ancla a edición/bloque/pieza/tiempo; retries no duplican acciones.
- [ ] Aislamiento entre organizaciones, roles efectivos, expiración, revocación e invitaciones probados con casos permitidos/denegados; autoridad no deriva del organizationId del cliente.
- [ ] Todas las superficies Rooms cumplen La órbita: Bricolage editorial/Poppins funcional efectivos, colores y componentes canónicos, iconografía oficial y motion correcto; sin fallback silencioso a Geist, sin alterar piezas cliente ni imponer narrativa de preguntas/respuestas.
- [ ] Capturas y pruebas de interacción desktop/tablet/móvil, teclado, foco, texto ampliado, contraste y reduced motion; aceptación visual del operador y estándar premium aplicable cumplidos.
- [ ] Rendimiento p75 LCP ≤2,5 s, INP ≤200 ms e inicio de preview ≤2 s evaluados sobre fixture/red declarados; fallos no se ocultan con promedios ni animaciones.
- [ ] Audio bloqueado, medio fallido, red degradada, pérdida de consola y actualización de edición tienen recuperación observada, sin pérdida de contexto ni ampliación de permisos.
- [ ] Integración CRM/fuentes usa contratos y reconciliación; una caída de HubSpot no interrumpe una edición accesible. Métricas reflejan eventos observados, no comprensión ni intención asumidas.
- [ ] Restore DB + storage probado, alertas/límites/retención definidos, coste medido, rollback y compatibilidad de ediciones verificados; ninguna dependencia en cuentas/personas de desarrollo sin postura operativa.
- [ ] Despliegue autorizado con DNS/TLS/config/readback, canary y piloto consentido documentados; manuales de autor/champion/operador y handoff vigente; tasks obligatorias cerradas con evidencia.

## Non-goals

- Rehacer la propuesta técnica Sika descartada, generar una nueva oferta económica o presentar la licitación.
- Migrar automáticamente los runtimes, rutas o grants de Insights/X-Ray/Think, Proposal Studio, CRM o Studio. Adoptar contenido/experiencia X-ray en Rooms sí es parte de V1; no equivale a trasladar Think.
- Construir crawlers, research o scoring SEO/AEO paralelos; los sistemas dueños producen los datos, Rooms conserva snapshots autorizados para demostrarlos.
- Crear CRM, CPQ, firma, billing SaaS, outreach masivo o un sistema general de gestión de proyectos.
- Generar creatividad o adaptaciones inexistentes al importar; producir nuevos medios es una actividad de sus herramientas dueñas.
- Crear un entorno 3D obligatorio, videollamada, grabación de reunión, sincronización remota entre dispositivos u offline completo en V1.
- Prometer exportación fiel de toda la interacción a PDF: V1 conserva PDFs originales; exportación generada exige contrato posterior.
- Comprar Trumpet, crear marca/logo sin diseño AXIS o comercializar Rooms como SaaS a terceros sin decisión propia.
- Ejecutar código, crear repo/infra, publicar, enviar mensajes, commit/push/deploy como efecto de registrar esta épica.

## Risks and Decisions Before Execution

| Riesgo / decisión | Dueño | Resolución exigida |
|---|---|---|
| Alcance excesivo antes de validar inmersión | Product / Creative | M1 con material real; no construir todas las pantallas antes de aceptar la dirección |
| Procesamiento/egress y carga de video | Platform / Ops | Límites, perfiles, región y coste de fixture; precarga actual/siguiente, no todos los videos |
| Identidad externa y fuga de notas | Identity / Platform | Contrato de invitación/canje, grants, DTOs mínimos y negativos multitenant antes del piloto |
| Disponibilidad de material y permisos | Commercial / Creative | Inventario autorizado; marcas aisladas; fixture alternativa si un caso está incompleto |
| Reducir SEO/AEO a PDFs o una galería creativa | Product / SEO-AEO | Dos perfiles desde R01 y aceptación nativa en R07/R14/R15; radiografía, fuentes y plan demostrables |
| Deriva de paridad | Platform / MCP | Registro de operaciones desde foundation y certificación acumulativa por canal |
| Integraciones que duplican fuentes | Integrations | Mapping y ownership definidos; IDs y eventos, nunca SQL entre productos |
| Dependencias/pins/publicación AXIS | Platform / AXIS | Export real, autenticación de paquetes, adapter y rollback probados en Rooms |

## Delta 2026-10-07

Creada por solicitud explícita del operador después del dossier Rooms. ID verificado en registry y filesystem inmediatamente antes del registro. Sin tasks hijas reservadas ni implementación. Dossier e índices apuntan a esta épica; estado `to-do`, go final pendiente. Próximo paso: revisión del programa y, al autorizar ejecución, materializar las unidades con contratos y gates por task.

Verificación de registro: `pnpm epic:lint --item EPIC-052` → `scanned=1 canonical=1 legacy=0 errors=0 warnings=0`; 35 enlaces locales entre épica e índice Rooms verificados. El lint agregado del worktree detecta diferencias de registry/child-parity en trabajo ajeno; no se corrigen ni se atribuyen a esta épica. Cierre documental no acredita UI, runtime ni rollout.

### Ampliación de alcance 2026-10-07 — creativo y SEO/AEO

Aclaración explícita del operador: Rooms debe servir a ambos servicios. Se actualizan R01/R02/R03/R07/R08/R11/R13/R14/R15 y los Exit Criteria dentro de las quince unidades existentes; no se registran tasks ni se inicia implementación. Creatividad conserva el primer hito de materialización; cerrar solo ese perfil no completa V1. Experiencia funcional especificada en el dossier; manuales operativos y documentación del runtime se materializan con R15 cuando exista una capacidad ejecutable.

## Delta 2026-10-08 — marca aceptada

El operador aceptó la marca de Rooms («eslabón leve»): las dos «o» como órbitas enlazadas, esfera Growth a la 1:30, lockup Efeonce | Rooms por defecto. Decisión, piezas y revisión de parecido en el [ADR de marca](../../architecture/rooms/EFEONCE_ROOMS_MARK_DECISION_V1.md); 18 SVG `rooms-*` en `@efeoncepro/axis-brand-assets` 0.4.27 (release `v0.4.27` en curso: verificar el tag). Cubre la condición «sin diseño AXIS» de Non-goals para el logo. No cambia lifecycle, unidades ni go: las composiciones de la sala siguen sujetas a R02 y a los contratos de UI.

## Delta 2026-10-12 — destino futuro de la interfaz de Commercial (diferido)

El operador aprobó desacoplar Greenhouse por dominios de producto ([decisión](../../architecture/GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md), [`EPIC-054`](../to-do/EPIC-054-greenhouse-product-domain-decoupling.md)). Para Commercial declaró su intención: la API se queda en Greenhouse y la interfaz pasaría a Rooms — Sample Sprints, Cotizaciones, Contratos, Productos, MSA y SOW, y Pipeline. Lo dejó **para después**: sin fecha, sin task y sin go.

- **Esta épica no cambia.** R01–R15, sus dependencias y sus Exit Criteria quedan como están; la interfaz de Commercial no es una unidad de esta épica ni condición del piloto.
- **Cuando llegue su turno** se registra como trabajo propio y exige primero enmendar el ADR de Rooms, que hoy difiere CPQ y deja el pipeline en HubSpot. Detalle en su [addendum del 2026-10-12](../../architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md).
- **Para no cerrarle el camino desde ahora**: R03 y R04 ya separan autoría interna de audiencia externa por contrato; conviene que esa separación no asuma que el único autor interno es quien arma una sala.
- **Cotizador V3** (`EPIC-053`): su interfaz sigue sin hogar decidido, portal o Rooms.
- Del mismo plan, sin efecto en el diseño de Rooms: el motor del Artifact Composer pasa a paquete de AXIS e Insights a dominio propio; R14 los sigue consumiendo por contrato.


## Delta 2026-10-25 — construcción autorizada

Julio confirma la primera entrega local y objetivo: base ejecutable seguida de experiencia desktop/móvil con La órbita, lista para revisión visual. Añade can, jerarquías cliente/operador/administrador y vistas propias desde la base; autoriza subagentes. Repo hermano efeonce-rooms/main, documentación Greenhouse/develop. Sin autorización implícita de push, deploy o acceso a clientes. Estado y evidencia se registran en TASK-2058/2059. Las quince unidades conservan su alcance restante.


### Evidencia de primera entrega local — 2026-10-25

TASK-2058 complete para foundation/can local; TASK-2059 implementada, QA PASS y pendiente aceptación visual humana.17 tests de dominio,25 E2E, GVC4 tamaños/68frames, build optimizado y CLI/API negativos. [Auditoría](../../audits/rooms/2026-10-25-first-local-delivery.md). No se tildan los Exit Criteria V1 que requieren persistencia, identidad, paridad durable o piloto real; las quince unidades conservan su alcance restante.

### 2026-10-25 — Continuidad, persistencia local y primera publicación

Goal explícito, View Transitions/AXIS y publicación autorizados por Julio. TASK-2060 complete: ciclo durable PostgreSQL local, permisos persistidos, idempotencia/concurrencia, auditoría/outbox y restore. TASK-2059 añade motion nativo y componentes AXIS; QA local/remoto PASS, aceptación humana pendiente. TASK-2061 publica [demo Vercel](https://efeonce-rooms.vercel.app/demo) y [repo privado GitHub](https://github.com/efeoncepro/efeonce-rooms), SHA `bd4b802`, deployment `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc`. Efeonce ID no cumple todavía el contrato first-party: TASK-1834 pendiente, API real401. No DB cloud, usuarios reales ni cierre V1 inferidos. [Auditoría del corte](../../audits/rooms/2026-10-25-persistence-motion-release.md).


## Avance 2026-10-25 — autoría V2 y acceso por invitación

TASK-2062 cierra autoría backend/API/CLI local: borradores V2, bloques/relaciones, import preview/apply,
coverage y publicación textual, preservando ediciones V1.66 pruebas PASS sin skip y recovery/rollback
mixto verificados. No cierra R03 completo (escenarios/tours), R05 medios ni R08 editor.

- [TASK-2065](../../tasks/complete/TASK-2065-rooms-efeonce-id-consumer.md): OIDC interno sobre foundation
  Auth1834 y loginV4 del issuer2064. Foundation local completa y verificada, sin activación pública.
- [TASK-2066](../../tasks/in-progress/TASK-2066-rooms-tokenized-invitations-email-code.md): enlace con token y código
  generado en UN correo inicial Resend; cliente pega código EN Rooms. Issuer2067 genera/verifica/envía OTP;
  Rooms conserva invitación/sesión guest limitada, expiry/revoke y permisos. No requiere SSO global ni da acceso
  a otras salas. Backend local implementado y probado con issuer real; pantalla y entrega real pendientes. No mensajes a clientes.

Aceptación visual2059 y resto deR01–R15 siguen abiertos. Demo pública conserva SHA bd4b802; código localnuevo
no implica despliegue. [Evidencia2062](../../audits/rooms/2026-10-25-versioned-content-authoring.md).

TASK-2065 complete local en37c799c:95testsPASS0skip, Chromeissuerreal, contexts/tenants/revoke y down/upclon14tablasPASS. EntradaOFF, UIcontext ycloudpendientes. [Evidencia](../../audits/rooms/2026-10-25-efeonce-id-consumer.md).

TASK-2066 backend local:137testsPASS0skip, integración OTP real con buzónRAM/Chrome y restore19tablasPASS. Continúa in-progress para handoffUI/criterios pendientes; sin correo real ni activación. [Evidencia](../../audits/rooms/2026-10-25-tokenized-invitations.md).
