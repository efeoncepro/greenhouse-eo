# EPIC-046 — Servicios del cliente: visibilidad y autogestión, Berel y Sky

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño aprobado; ADR Accepted para planificación, integración obligatoria con EPIC-045; TASK-1852–1856 registradas y conectadas a TASK-1834; sin implementación`
- Rank: `TBD`
- Domain: `client-portal|commercial|delivery|growth|identity|ui`
- Owner: `Client Experience / Platform; Julio Reyes (producto)`
- Branch: `develop; checkout compartido actual, sin cambio de branch ni worktrees`
- GitHub Issue: `none`

## Summary

Habilitar primero a Berel (SEO y marketing de contenidos) y Sky Airlines (diseño digital) para ver
sus servicios, resultados, trabajo y pendientes en Greenhouse. Después incorporar solicitudes,
briefs y seguimiento, con las herramientas operativas actuales como fuentes y commands gobernados.
La experiencia comparte contratos y componentes; cambia por servicio, no por nombres hardcoded de cuentas.
Efeonce Insights forma parte de esa experiencia: clientes consultan y generan informes autorizados de
sus servicios; colaboradores internos los preparan y gestionan sobre las cuentas que tienen a cargo.

El operador aprobó crear las cinco tasks el 2026-09-09: TASK-1852–1856. P01–P09 se conservan como
aliases del plan; P03/P05/P08/P09 reutilizan dueñas existentes. El registro no inicia implementación.

## Why This Epic Exists

El portal tiene foundation y datos, pero la experiencia está incompleta entre contratación, asignación,
fuentes, páginas y acciones. EPIC-015 conserva la infraestructura de módulos; este programa consume esa
base para entregar valor verificable a dos cuentas y añadir autogestión del servicio.

## Outcome

- Berel comprende el desempeño SEO y el avance mensual de marketing de contenidos desde su cuenta.
- Sky comprende la producción de diseño digital, calidad, puntualidad y pendientes de revisión.
- Ambas cuentas identifican qué contrató su organización, qué espera de ellas y cuál es el próximo paso.
- Las solicitudes del cliente tienen acuse, estado, owner e historial; no cambian contratos ni publican por inferencia.
- Apertura, adopción y autogestión tienen evidencia separada por organización y capacidad.
- Insights comparte biblioteca, ediciones y fuentes entre autogestión cliente y gestión interna, con permisos distintos.
- Insights por correo y avisos in-app/email/Teamsbot crean motivos útiles de retorno, con deep links al informe o pendiente exacto; móvil/push queda para después.

## Architecture Alignment

- [ADR aceptado para planificación](../../architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md).
- [Insights: audiencias y permisos](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md#71-contrato-de-audiencias-autenticadas--integración-epic-046).
- [Client Portal Domain](../../architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md).
- [Organization/Client invariants](../../architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md).
- [Account Complete 360](../../architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md).
- [Source sync](../../architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md).
- [Full API Parity](../../architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).
- [UI platform](../../architecture/ui-platform/README.md) y [premium UI](../../ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md).
- [Experiencia cliente](../../context/10_experiencia-cliente.md) y [skill Berel](../../../.codex/skills/berel-content-production/SKILL.md).

## Verified Baseline

Diagnóstico de esta conversación, `2026-09-09T05:16Z`, contra PostgreSQL compartido `greenhouse_app`
y `https://greenhouse.efeoncepro.com` con actor interno dedicado `agent@greenhouse.efeonce.org`.
Los conteos no son métricas de adopción ni una prueba de login real del cliente.

| Cuenta | Servicio confirmado por operador | Asignación técnica observada | Brecha |
|---|---|---|---|
| Grupo Berel | SEO + marketing de contenidos | `seo_v2`, `ai_visibility_v1`; 1 usuario activo | SEO no expone aún clics/CTR en su reader cliente; falta conciliar la visibilidad del trabajo editorial |
| Sky Airlines | Diseño digital | `creative_hub_globe_v1`, `ai_visibility_v1`; 3 usuarios activos | `/creative-hub` devuelve 404; Analytics no tiene módulo que lo conceda |

El catálogo tiene 14 entradas. La señal canónica `identity.client_portal.menu_gate_divergence` reportó
`warning`: 2 vistas sin módulo que las venda (`cliente.analytics`, `cliente.ciclos`), 0 enlaces negados
por la puerta entre los pares evaluados y 8 usuarios evaluados incluyendo demo. Esa señal no sustituye
la de rutas inexistentes. Se verificó también 404 en `/brand-intelligence`.

Fuentes: `src/lib/client-portal/**`, `src/lib/growth/seo/client/read-seo-client-surface.ts`,
`src/lib/growth/seo/overview/read-overview-kpis.ts`, `GreenhouseDeliveryAnalytics.tsx`,
`GreenhouseReviewQueue.tsx` y las APIs de catálogo/asignaciones. Readback HTTP local conservado en
`.captures/client-portal-readiness-2026-09-09/production-readback.json` (artefacto ignorado, auxiliar).
No se midieron aquí cobertura/frescura completa de las piezas, cupos, SLAs, proveedores de revisión
de Sky ni el login E2E de ambas cuentas: P01 debe resolverlos antes de prometer disponibilidad.

## Child Tasks

Cinco tasks registradas por autorización del operador; todas `to-do`, prioridad P1. Las existentes
conservan su epic. P01 se conecta con TASK-1834 por contrato y rollout nativo condicional.

| Alias | Task | Entrega | Blocked by |
|---|---|---|---|
| P01 | [TASK-1852](../../tasks/to-do/TASK-1852-berel-sky-service-access-and-channel-enablement.md) | Habilitación de servicios, acceso y canales para Berel y Sky | none |
| P02 | [TASK-1853](../../tasks/to-do/TASK-1853-client-service-progress-and-metrics-read-model.md) | Lectura cliente de servicios, avance y métricas | TASK-1852 |
| P04 | [TASK-1854](../../tasks/to-do/TASK-1854-client-home-services-and-cycle-experience.md) | Inicio y Mis servicios: resultados, avance y próximos pasos | TASK-1852, TASK-1853 |
| P06 | [TASK-1855](../../tasks/to-do/TASK-1855-client-service-requests-and-briefs-commands.md) | Solicitudes y briefs del servicio: commands y seguimiento | TASK-1852, TASK-1853 |
| P07 | [TASK-1856](../../tasks/to-do/TASK-1856-client-service-request-and-brief-self-service-ui.md) | Autogestión de solicitudes y briefs del cliente | TASK-1854, TASK-1855 |

## Registered Task Plan

| Unidad | Propuesta | Perfil / ownership | Dependencias y evidencia de salida |
|---|---|---|---|
| P01 / TASK-1852 | **Contrato de habilitación Berel/Sky y conciliación de acceso** — servicios vigentes, personas, fuentes, vistas, acciones y matriz de apertura; cambios acotados de asignación/versionado por los commands existentes | Registrada `backend-data`; Client Portal/Commercial/Identity | Primera unidad. Preview exacto por cuenta, preservar derechos existentes, fuentes resueltas y rollback. Consume TASK-1687 para el enlace roto de Sky; no duplica su migración |
| P02 / TASK-1853 | **Lectura cliente de servicios, avance y métricas de delivery** — DTO permitido por servicio/ciclo, piezas y estados, métricas existentes, cobertura y consumo sólo si el contrato lo define | Registrada `backend-data`; adaptadores sobre Commercial/Delivery/ICO, BFF consumidor | P01. Conciliación de muestras con fuentes; principal/derivado/subtarea sin doble conteo; datos ausentes distintos de cero; API parity y negativos entre cuentas |
| P03 | **Resultados SEO visibles para Berel** — clics, impresiones, CTR, comparación y cobertura independiente de Search Console/rank | Reutilizar TASK-1690, sin task duplicada; Growth | Coordinar con su trabajo en curso. El contrato ya existe; el consumo visible debe quedar explícito en el plan de su dueña. No reimplementar prioridad ni atribuir causalidad al contenido sin evidencia |
| P04 / TASK-1854 | **Inicio y Mis servicios con detalle del ciclo** — resumen, servicios y métricas, piezas/trabajo del período, próximos pasos y enlaces a revisión | Registrada `ui-ux`; consumidor de P02 y P03, composición común para SEO/contenidos/diseño | P01/P02; sección SEO depende de P03. Reusar `/home`, proyectos/campañas/analytics; elegir rutas en diseño, sin duplicar menú ni reconstruir `/reviews`. GVC desktop/390 px y estados completos |
| P05 | **Revisiones: distinguir lo que espera al cliente de lo que espera a Efeonce** | Reutilizar TASK-289; mantener `/reviews` y su API como únicos owners | Fuentes revisadas en P01. No inferir tiempo de respuesta de `updated_at`; no inventar SLA. Enlazar al provider autorizado y comprobar el estado, sin prometer aprobar dentro del portal |
| P06 / TASK-1855 | **Solicitudes y briefs del servicio: commands y seguimiento** — crear/completar/consultar pedido, validarlo contra el alcance y entregarlo al flujo operativo | Registrada `backend-data`; dominio dueño del intake/Delivery y adapters canónicos | P01/P02. El plan identifica o extiende el agregado existente antes de crear schema; idempotencia, adjuntos autorizados, owner, audit/outbox, reconciliación y misma policy UI/API/MCP |
| P07 / TASK-1856 | **Autogestión de solicitudes y briefs** — formulario contextual, pendientes de información, acuse, detalle e historial | Registrada `ui-ux`; consumidor exclusivo de P06 | P04/P06. Cliente distingue enviado/aceptado/planificado/entregado; fallo de sync visible y recuperable. Una solicitud de ampliación no concede el servicio |
| P08 | **Mi cola de revisión** cuando la cohorte tenga revisores y scopes personales verificados | Reutilizar TASK-292; actualización de su contrato legacy antes de ejecutar | P05 + asignación real de revisores. No crear roles ficticios ni revivir grants por rol; URL/API no filtran assets de otra persona/cuenta |
| P09 | **Notificaciones, correo y retorno al portal** — Insights emitido, revisión/brief pendiente y cambios de solicitud; deep links, preferencias y entrega verificable por canal | Reutilizar TASK-1848/1849 para Insights; TASK-690–693 Hub; TASK-303 audiencias; TASK-387 digest; TASK-694 medición avanzada. P06 emite hechos del servicio | Coordinar desde P01; primer email + in-app con destino útil antes de considerar la apertura una entrega cliente completa. Teamsbot por destino habilitado; transición reactiva/Hub sin duplicados, preferencias y aislamiento verificados. No nueva task genérica de notificaciones |

Registro: **cinco tasks nuevas TASK-1852–1856** (P01, P02, P04, P06, P07), **tres existentes** (P03, P05,
P08), más TASK-1687 como dependencia acotada de apertura. P08 puede diferirse si ambas cuentas trabajan
con cola compartida; no se inventa asignación personal para justificar la pantalla.
P09 coordina dueñas existentes, sin una sexta task genérica de notificaciones.

No crear una task por cliente, gráfico, formato, endpoint o QA. Cada task incluye pruebas, rollout,
manual y recuperación de su entrega. IDs verificados contra registry/filesystem y templates UI/backend aplicados.
Las UI TASK-1854/1856 incluyen wireframe/flow/motion y empiezan `UI ready: no`:
dirección comparada, primitives, tokens, wireframe/flow/motion y GVC pertenecen a sus planes.

## Integración obligatoria con Efeonce Insights

EPIC-045 es un programa hermano y proveedor compartido; sus cinco tasks no cambian de epic. La
integración sí es parte del cierre de EPIC-046, con este reparto de ownership:

| Dueña | Aporte a la experiencia integrada |
|---|---|
| P01 | Incluir Insights en la matriz servicio/módulo/persona/acción, diferenciando ver, generar, emitir, descargar y compartir. No concederlo porque el cliente tenga SEO |
| P02 | Exponer contexto/fuentes del servicio desde sus productores; Insights usa esos mismos readers, sin importar el BFF ni duplicar métricas |
| P04 | Accesos contextuales desde Inicio/Mis servicios y métricas con cuenta/período; TASK-1849 posee destino y componentes Insights |
| TASK-1845 | Catálogo elegible por actor, evidencia/ediciones y commands para cliente e interno; redacción por audiencia y aislamiento |
| TASK-1846/1847 | Render durable y tres formatos sobre el snapshot permitido; formatos/catálogos reutilizados por ambas poblaciones |
| TASK-1848 | Sharing, descargas, correo y recurrencia con autoridad separada; el token no abre autogestión |
| TASK-1849 | Biblioteca/builder/visor común con experiencia cliente e interna, progreso e historial y retorno al servicio |

Berel: informe SEO + marketing de contenidos cuando las fuentes/ventanas sean compatibles, conservando
secciones y frescura independientes. Sky: diseño digital/ICO y pendientes del período. AEO no se añade
por defecto al informe por observar una asignación técnica. El cliente podrá iniciar generación de una
plantilla permitida y seguir el resultado; no se limita a recibir enlaces de informes hechos por Efeonce.
El colaborador ve y opera sólo cuentas/acciones autorizadas, no obtiene acceso universal por ser interno.

La solicitud de un informe usa `createEdition` de Insights. P06/P07 conservan pedidos/briefs del servicio:
no añaden otro queue, estado o formulario de creación de informes. Dashboard y edición comparten fuentes,
pero una edición congelada conserva su fecha aunque el dashboard se actualice.

## Existing Related Work

- **Notification Hub TASK-690–693, TASK-303/387/694:** dueñas del routing, preferencias, audiencias,
  digest y medición; P09 coordina sus slices de cliente, sin reconstruir la plataforma. Reconciliar sus
  contratos legacy antes de ejecutar, especialmente persona cliente frente a member laboral y schema.
- **TASK-1759 / EPIC-042 / TASK-1774:** transporte reactivo, presentación/policy y baja de correo.
  No reintroducir self-webhooks ni activar una suscripción opcional sin baja funcional.
- **EPIC-015 / TASK-822–827:** foundation reutilizada, sin reimplementar BFF/resolver/commands.
- **TASK-1687:** dueña del destino inexistente de Creative Hub. Preservar bundle/demás vistas y
  versionado append-only. No construir otra página placeholder ni esconder la señal.
- **TASK-286:** expansión genérica del catálogo; no duplicarla en P01. P01 se limita al contrato
  mínimo de estos servicios; cualquier ampliación general vuelve a esa dueña.
- **TASK-1690 (EPIC-022):** reader/estados SEO. Tiene un movimiento ajeno a `in-progress/` en este
  checkout y `Lifecycle: to-do` todavía en el cuerpo al diagnosticar; coordinar sin sobrescribirlo.
- **TASK-289/292:** colas de revisión. Sus claims de scopes/roles/grants históricos deben reconciliarse
  con el primitive actual antes de ejecutar. P06 no adquiere ownership de aprobaciones de assets.
- **TASK-295:** scorecard standalone de SLA/calidad; P02 sólo adapta métricas existentes y P04 sus
  resúmenes. Si se incorpora un scorecard completo, se extiende esa dueña.
- **TASK-1106:** reader canónico de métricas Account 360, a revalidar antes de consumir; no segundo cálculo.
- **TASK-828/829 (EPIC-015):** cascade de lifecycle, backfill general y health. No son condición para
  activar dos cuentas manualmente con comandos/auditoría; sí para prometer provisión automática a escala.
- **TASK-1012/1839:** invitación/entrega del portal. Dependencia condicional si P01 encuentra un
  bloqueo de entrada o se necesitan usuarios nuevos; sin otro sender o linking por correo.
- **TASK-1834 / EPIC-044 ↔ TASK-1852:** contrato obligatorio de identidad/contexto/retorno profundo.
  P01 puede preparar/habilitar con login vigente probado; activar OIDC nativo espera los gates de 1834
  (1833/1832/1841 aplicables). No bloqueo circular ni asignación de módulos desde callback. TASK-1838
  administra autoridad delegada del emisor, no servicios ni usuarios del portal por inferencia.
- **EPIC-045 / TASK-1845–1849 y TASK-288:** integración obligatoria detallada arriba. Insights posee
  gestión interna y autogestión cliente; reconciliar Reports Center antes de agregar UI, sin otro builder.
- **TASK-1606 (EPIC-038):** feedback sobre capacidad/personas y continuidad. Separada del brief y
  feedback de una pieza; no capturar evaluaciones laborales en el flujo de solicitudes.
- **TASK-299/294:** completar Ciclos/Novedades sólo si se incluyen en una entrega; no prometerlas
  porque ya exista un enlace o una pantalla vacía.

## Delivery Plan

1. **Comenzar por P01**: producir las dos matrices verificables y el plan exacto de habilitación.
   Resolver con TASK-1687 el enlace roto de Sky. Para Berel separar SEO de marketing de contenidos,
   y confirmar qué fuente conecta cada pieza con servicio/período. Incluir destinatarios, canales,
   preferencias, cadencia y disponibilidad real de Teamsbot por cuenta. No asignar bundles por semejanza.
2. **Hito A — visibilidad útil:** P02/P03 alimentan P04 y P05 muestra pendientes accionables. Puede
   habilitarse una cuenta antes que la otra cuando cumpla su matriz. No esperar solicitudes o todos los
   formatos Insights; acompañar la entrega cliente con el primer flujo de email + in-app de Hito N.
3. **Hito B — autogestión:** P06 → P07; P08 cuando tenga asignación personal demostrada. La aprobación
   nativa de assets y el reemplazo del provider requieren una ampliación explícita, no un botón implícito.
4. **Hito I — Insights integrado, obligatorio:** coordinar P01/P02 con TASK-1845 desde el inicio;
   TASK-1846/1847/1848 → TASK-1849 habilitan generar/consultar/descargar en cliente y gestionar en interno.
   Puede llegar después de la primera apertura Hito A, pero no queda fuera del cierre de EPIC-046.
5. **Hito N — comunicación y retorno, obligatorio:** P09 se coordina desde el inicio. Primer flujo:
   hecho real → email/in-app → deep link → sesión y consulta/acción autorizada. Insights añade resumen
   y retorno a la edición emitida cuando Hito I esté listo; solicitudes añaden seguimiento en Hito B.
   Teamsbot entra en esta fase para destinos habilitados, con verificación explícita por cuenta y
   responsable interno. Resúmenes periódicos requieren cadencia/preferencias; no esperar app móvil.
6. **Escalar después:** consumir cascade/health de EPIC-015 y ampliar clientes sólo tras decisión
   de cohorte y evidencia de la cuenta nueva. Insights ya forma parte del programa, no de ese follow-up.

Cada task de implementación en Codex conserva `/goal` explícito y task-hook. Este epic no los reemplaza.
No hay autorización de subagentes, cambio de branch, invitaciones, asignaciones live, publicación o deploy
derivada de este registro documental.

## Exit Criteria

- [ ] Hito N: email e in-app recorren evento real → destinatario permitido → deep link exacto → login/consulta o acción; estado por canal, dedupe/retry y negativos entre cuentas verificados. Sin envío real durante planificación.
- [ ] Berel/Sky y responsables internos tienen matriz Teamsbot de destino/identidad/instalación/permiso con evidencia; los destinos habilitados reciben el aviso y abren el portal. Una excepción requiere aceptación de producto y seguimiento explícito; no se oculta como entrega exitosa.
- [ ] Insights emitido llega por correo con resumen útil, período/corte y CTA a su edición; borradores internos no se anuncian al cliente. Cadencia, preferencias/baja aplicable y límites de recordatorios operativos, sin ruido por pendientes resueltos.
- [ ] Adopción distingue entrega, entrada autenticada, consulta y acción por cuenta/canal/período; scanners/aperturas no se cuentan como uso humano y leer no resuelve una revisión.
- [ ] Hito I: Berel y Sky abren Insights desde el servicio con contexto permitido; cliente genera/consulta/descarga una edición y colaborador autorizado la gestiona sobre la misma identidad/historial. Token sólo lee la edición; negativos por audiencia/cuenta y GVC de ambos recorridos verificados.
- [ ] Dashboard y reporte comparten hechos/fórmulas con cortes explícitos; Berel cubre SEO/contenidos y Sky diseño/ICO, sin segundo cálculo, builder ni acceso implícito a otros módulos.
- [x] ADR aceptado y TASK-1852–1856 registradas con ownership, dependencias y criterios verificables el 2026-09-09; task lint focal template=1/legacy=0/0 errores/0 warnings. No acredita implementación.
- [ ] Berel tiene SEO y marketing de contenidos representados; Sky tiene diseño digital, conforme a servicios conciliados.
- [ ] Cada cuenta completa login, navegación, lectura propia y negativos de URL/API sin fuga entre cuentas.
- [ ] Ningún enlace expuesto en la cohorte termina en 404 o contradice el guard; permisos existentes preservados.
- [ ] Métricas/piezas coinciden con fuente y período, con cobertura/frescura; errores no se muestran como cero.
- [ ] Marketing de contenidos distingue pieza principal/derivados y entregado/publicado; diseño expone sus pendientes y resultados.
- [ ] Hito A certificado en producción por cuenta, con escritorio/390 px, teclado, reduced motion y sin overflow.
- [ ] Hito B completa solicitud/brief → acuse → owner/estado → resolución verificable, con idempotencia y recovery.
- [ ] Revisión de assets conserva herramienta dueña, versiones y scopes; cola personal sólo cuando esté sustentada.
- [ ] Adopción registrada por cuenta: primera lectura útil y primera solicitud resuelta, con ventana y denominador definidos; ningún conteo de usuarios se usa como adopción.
- [ ] Manuales y runbook de apertura/rollback al día; métricas de errores/frescura y responsables operativos identificados.

## Non-goals

- Habilitar todo el catálogo, nuevos clientes, nuevos contratos, cobros o ampliaciones por inferencia.
- Migrar login, abrir MCP externo o activar Efeonce Globe; son programas independientes.
- Sustituir Notion, Drupal o herramientas de revisión, publicar contenido o enviar mensajes durante la planificación.
- Cambiar la cadencia acordada con el cliente, prometer cupos/SLAs no verificados o exponer costos/márgenes/compensaciones.
- Construir un segundo motor de informes, métricas, contratos o autorizaciones.
- Construir app móvil, web push o push nativo en esta fase; se preserva el contrato para un adapter futuro.
- Reparentar o superseder las tasks existentes; el registro no autoriza su ejecución.
