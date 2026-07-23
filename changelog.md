# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-07-23 — Agenda pública aclara la duración de la reunión

- `/agenda/` reemplaza la etiqueta redundante `Efeonce · conversación inicial` por `Reunión de 30 minutos`.
  La mutación quedó respaldada en Elementor, purgada en Kinsta y verificada live en escritorio y 390 px sin
  errores ni desbordes; el scheduler, booking y GTM no cambiaron.

## 2026-07-23 — Globe Producer genera las tres modalidades y cierra dos causas raíz

- El Producer internal-only generó y recuperó Image, Video y Audio reales desde la UI; cinco runs terminaron,
  el feed hidrató nueve outputs y el viewer sirvió/reprodujo media desde GCS privado por grants gobernados.
- El catálogo publica 10 rutas, pero sólo Seedream 5 Pro, Seedance 2.0 y ElevenLabs Multilingual v2 están
  promovidas durablemente. Las otras siete conservan su gate de evidencia/revisión/binding/canario.
- Se corrigieron hidratación/selección/render del viewer, modalidad multimedia y recuperación de sesión/CSRF.
  Una sesión realmente expirada muestra CTA de reautenticación y vuelve al feed sin repetir gasto.
- Asset Governance dejó de tratar media válida sin manifest C2PA como outage y ahora recupera proyecciones
  terminales sin perder rights. El Job desplegado aplicó 3 trabajos, promovió 1 y falló 0.
- El worker supersedió seis reconciliaciones terminales mediante primitive gobernada, queue age quedó en cero
  sobre trabajo reclamable y las alertas quedaron `failure=ERROR`, `queue age=WARNING`.
- La auditoría de promoción confirmó que 0/7 rutas pendientes cumplen hoy todos los gates. El tooling separa
  `stage|promote|activate|rollback`; `TASK-1527…1529` poseen operación durable, derivados/Range y lifecycle/GC.
  Clientes externos siguen cerrados.

## 2026-07-23 — Globe Producer promovido hasta sus gates reales internal-only

- `TASK-1519` quedó completa: el bridge humano browser → BFF same-origin → API IAM-private tiene IAM/env/secrets,
  grants, CSRF, spoofing/workspace denial y revocación verificados en vivo sin exponer credenciales.
- Migraciones `0001…0023`, Producer Worker y Asset Governance Job quedaron desplegados por workflows keyless con
  imágenes inmutables; governance procesó una cola vacía en verde y ambos schedulers permanecen cerrados/pausados.
- Tenancy avanzó a `shadow` y registró drift del broker, por lo que `enforced` no se habilitó. Library writes y
  bulk sí avanzaron con smoke durable/partial-failure; export y purge permanecen OFF.
- La superficie Producer está desplegada y su dry-run vivo estimó 32 créditos, pero no ejecutó proveedores:
  readiness no tiene attestations y tenancy efectiva negó acceso. Provenance, Style DNA, review/share positivo y
  la contención cross-réplica siguen bloqueados sin inputs reales o autorización; cero gasto en esta etapa.
- Globe `main` y Greenhouse `develop` pasan suites/build, CI y OpenTofu `No changes`; Production y clientes
  externos permanecen explícitamente fuera de alcance.

## 2026-07-22 — Globe Style DNA desplegado internal-only

- TASK-1494 completa el carril local de Reference Intelligence: identidad tenant-safe desde provenance,
  resolución privada content-addressed, paleta determinística versionada y análisis semántico Vertex por el
  mismo `CreativeProviderAdapter`, detrás de spend fence y kill switch.
- La versión de análisis queda fijada por contrato para impedir cache-busting; command/reader, perfiles,
  conditioning, estilos versionados y auto-route conservan Full API Parity, derechos y errores saneados.
- Suites, build, CI, migración y despliegues canónicos pasan en `a5e128935577`; API/Studio sirven el 100% y los
  negativos live validan `not_found`, `invalid_request` y aislamiento cross-workspace. El canary positivo queda
  bloqueado honestamente porque el workspace no tiene assets gobernados elegibles; no se eluden ingesta,
  readiness ni rights para fabricar uno.

## 2026-07-22 — Globe Producer aprobado implementado localmente sin recortar el diseño

- `efeonce-globe/apps/studio-web` materializa el baseline completo de TASK-1505: composer cross-modal,
  referencias privadas, rutas/shapes/estimate/hard cap, Style DNA, library editorial, viewer/compare,
  recreate/inpaint, bulk, créditos, review/comments/share, estados honestos, command palette y onboarding.
- La revisión source-led restauró paleta, jerarquía, superficies, Tabler self-hosted, wordmark/isotype Globe,
  logo Efeonce oficial, hero/masonry, motion y microinteracciones. Evidencia desktop/390/reduced-motion y score
  enterprise 4.72/5: `docs/ui/reviews/TASK-1505/`.
- El composer ahora exige estimate vigente antes de generar, conserva conditioning, incorpora seed
  lock/input/reroll y negative prompt, y mantiene seis modos asset-dependent fail-closed mediante el reader de
  provenance del workspace.
- La UI no oculta deuda con un botón decorativo: referencias image/video usan rutas genuinas separadas, policy
  count/media pre-spend, handles autorizados, resolución de bytes server-side y lineage por hash. Compare quedó
  alineado al reader `globe.lab.experiment.get`; el input de cantidad oculto salió del recorrido de foco.
- El runtime local completo pasa `pnpm check` y `pnpm build` (Studio Web 185/185 dentro del full check).
  TASK-1504 queda reconocida como code-complete local; TASK-1519/1520/1522 y
  TASK-1505 mantienen lifecycle `in-progress` porque rollout no está aplicado.
- Estado operativo honesto: faltan migrations `0010…0016`, secrets, buckets/IAM, grants, flags,
  scheduler/worker, acceso de proveedores y canarios internal. No hubo deploy, provider spend ni promoción
  comercial; TASK-1521 sigue siendo el gate externo.

## 2026-07-22 — Globe Producer rebaselined al diseño aprobado completo

- El HTML aprobado de Claude Design quedó versionado como baseline source-led ejecutable bajo
  `docs/ui/visual-sources/TASK-1505/`, con procedencia y hashes. `TASK-1505`, wireframe, flow, motion y dirección
  visual preservan el producto completo: composer Image/Video/Audio, library/viewer, collections/batch,
  budgets, provenance/lineage, review/share y operator UX. `UI ready` continúa `no` hasta runtime, scenario,
  dossier, baseline promovido y evidencia premium desktop/390 px.
- `ADR-005`, la arquitectura del Creative Producer y `EPIC-028` separan el target aprobado del estado runtime:
  `TASK-1500…1503` están disponibles, `TASK-1504` sigue local/in-progress y no desplegada; el browser aún no
  tiene bridge ni capabilities humanas. Se adopta browser → same-origin `studio-web` BFF → API IAM-private,
  delegación server-derived, surface enforcement fail-closed y jobs/outbox durables para gasto.
- El backlog distribuye el gap sin duplicar ownership: `TASK-1519` human bridge/enforcement, `TASK-1520`
  library/collections/bulk y `TASK-1521` runtime comercial; se reespecifican `1467/1469/1472/1493/1494/1496/
  1497/1498` para ingest/provenance, jobs, collaboration, recipes, styles, recreate, inpaint y feed/lineage.
- No se implementó ni desplegó runtime en este ajuste. La secuencia recomendada quedó canónica en `EPIC-028` y
  la arquitectura del Producer.

## 2026-07-22 — Skill de arquitectura gobernada y evaluable

- `software-architect-2026` conserva su identificador por compatibilidad, pero adopta un método year-neutral y
  progresivamente revelado: concerns, quality scenarios, vistas, contratos distribuidos, fitness functions,
  operabilidad y assurance de sistemas agentic.
- Se reemplazan defaults volátiles por resolución basada en evidencia, catálogo de fuentes con fechas de revisión,
  validator local y un harness externo de 16 escenarios/64 criterios para regresión ciega. La skill de Claude no
  se modifica y mantiene governance independiente.
- Canon: [`GREENHOUSE_SOFTWARE_ARCHITECT_SKILL_GOVERNANCE_V1.md`](docs/architecture/GREENHOUSE_SOFTWARE_ARCHITECT_SKILL_GOVERNANCE_V1.md).

## 2026-07-22 — Efeonce Embed Runtime formalizado como programa portable (EPIC-035)

- Assurance arquitectónica posterior supersede la ubicación cloud de V1 sin abandonar el runtime: el ADR V2 obliga a
  endurecer primero Vercel y hace que `TASK-1515` compare Vercel endurecido con Firebase Hosting en un proyecto GCP
  dedicado bajo la misma organización/billing. Firebase en `efeonce-group` queda no autorizado; dedicated project no
  significa otra cuenta ni otro control plane.
- El epic/tasks agregan owner por concern, checkpoint humano antes de provisioning, identidad exacta de workflow,
  single-writer con relectura live, sintaxis Firebase correcta, provenance, SLO visual-to-preview/live, synthetics
  externos y matriz 2048/1440/820/390. `TASK-1517` sube a esfuerzo Alto por el coupling de deep selectors.
- Forms, CTAs y Meetings dejan de tratarse como tres problemas de publicación separados: el ADR y la arquitectura
  nuevos definen un protocolo común, releases independientes, `assets.efeoncepro.com` como origen neutral y
  Greenhouse como control/API/data plane. El provider seleccionado no recibe PII, bookings, submissions ni lógica
  server-side.
- La decisión no afirma un cutover: primero corrige la carrera manifest→asset del carril Vercel de Meetings, luego
  exige scorecard/provider checkpoint, promoción exacta, rollback y costo, seguido por dual-publish. Vercel permanece
  como current/fallback rail hasta que la evidencia determine otra cosa y los legacy URLs conservan shims.
- `EPIC-035` ordena la ejecución en cinco tasks registradas: `TASK-1514` foundation, `1515` provider gate/keyless, `1516`
  Meetings, `1517` Forms y `1518` CTA/fleet closure; incluyen fixtures WordPress + Think/Astro, GTM/CMP, teclado,
  reduced motion, overflow y verdad server-side. No se provisionó cloud, cambió DNS ni ejecutó release.
- Canon: [`GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`](docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md),
  [`GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`](docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md) y
  [`EPIC-035`](docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md).

## 2026-07-22 — Globe ya deja sacar lo que produce, y la puerta la pone el dominio (TASK-1503, live)

- El Creative Producer estrena su **output side**: un reader gobernado devuelve una ficha de la pieza más un
  pase HMAC efímero (**nunca bytes en el JSON**), y `GET /v1/outputs/:sha256` canjea ese pase para streamear
  los bytes con `Content-Type`/`Content-Disposition`. Además `favorite` (idempotente por estado deseado) y
  `copyAsReference` (certifica `derived-internal` con los derechos del padre heredados, cero bytes y cero
  gasto), bajo la capability propia `globe.producer.assets.operate` — deliberadamente **no** la del Model Lab,
  que es de gasto.
- La parte que importa: el depósito es **content-addressed y tenant-blind**, y guarda piezas producidas **y**
  bytes de referencias de entrada de todos los workspaces mezclados. Así que la autorización no puede vivir
  ahí: vive en `authorizeOwnedOutput`, que gatea contra los `outputHashes` retenidos que el workspace posee y
  **nunca** contra `authorizedInputHashes`. Todo rechazo colapsa a `not_found` — cualquier respuesta más fina
  sería un oráculo para sondear un bucket compartido. La ruta de serving reusa ese mismo helper en vez de
  copiar la política.
- Delta al spec: las anotaciones quedaron **durables** (migración `0003`) en vez de in-memory. El spec las
  difería a `TASK-1465`, que ya shipeó sin cubrirlas, y con los servicios en 3 réplicas un store en memoria no
  es "volátil" sino no determinista: una estrella escrita en una réplica es invisible en otra.
- **Desplegado y ACTIVO el mismo día** en `globe-api-internal` (rev `00016-8dr`): secreto HMAC creado
  out-of-band, migración `0003` aplicada, env y kill switch gobernados en Terraform — el flag vive en el
  default de la variable, en git, y no en un `terraform.tfvars` gitignoreado (probado planeando sin él).
  Canario 14/14 con bytes reales servidos, más el negativo private-ingest en su forma precisa: un hash que
  **sí** está en el bucket y que el workspace declaró como *input* responde `not_found`, mientras el output
  propio de esa misma corrida sí se sirve. La impersonación necesaria para el canario se otorgó y revocó en
  dos ventanas acotadas, con el corte verificado.
- Lo que **no** cambió: `ui`/`mcp` siguen `policy-blocked` (bridge/enforcement en `TASK-1519`, integración UI en `TASK-1505`) y el uso comercial/externo
  sigue siendo un programa aparte (`TASK-1480` ← 1477/1478/1479/1482). Hallazgo del rollout: ampliar
  `GLOBE_ENVIRONMENT` más allá de `internal_smoke` era un bloqueo duro en código sin dueño; ahora lo posee `TASK-1521`.
- Spec: [`docs/tasks/complete/TASK-1503-globe-governed-output-retrieval-asset-actions.md`](docs/tasks/complete/TASK-1503-globe-governed-output-retrieval-asset-actions.md).

## 2026-07-21 — Cloud Run de Globe bajo Terraform y un cap de 1 instancia que nadie sabía que existía (TASK-1508)

- Los dos servicios Cloud Run de Globe entraron a Terraform por import brownfield (cero destroy/replace) y
  `deploy-internal.yml` quedó reducido a desplegar sólo la imagen: se acabó el doble escritor sobre ingress, runtime SA,
  env, secretos y escala. Anti-drift probado en dos ciclos de deploy, uno por servicio, con `tofu plan` en `No changes`.
- Adoptarlos destapó que ambos estaban capados a **1 instancia efectiva**: Cloud Run aplica el menor entre el ceiling a
  nivel servicio y el de revisión, y `--max-instances` escribe uno u otro según el subcomando de `gcloud`. Corregido a
  3/3 y ambos campos bajo IaC. Consecuencia registrada: el spend fence cross-réplica de `TASK-1465` nunca se ejercitó.
- Spec: [`docs/tasks/complete/TASK-1508-globe-cloud-run-iac-deploy-ownership.md`](docs/tasks/complete/TASK-1508-globe-cloud-run-iac-deploy-ownership.md).

## 2026-07-21 — Globe estrena front door internal-only en globe.efeoncepro.com (TASK-1507)

- El shell interno de Globe pasa a servirse por `https://globe.efeoncepro.com` detrás de un Global External ALB +
  serverless NEG (`southamerica-west1`), con certificado administrado activo y 301 HTTP→HTTPS; el ingress del web
  quedó en `internal-and-cloud-load-balancing`, así que el hostname `*.run.app` dejó de ser alcanzable por browser y
  sólo persiste en el allowlist OAuth como camino de rollback. El plan Terraform fue aditivo puro, sin tocar los
  servicios Cloud Run ni `maxScale`, y `globe-api-internal` sigue sin custom domain, IAM-private y con audience
  derivada de `run.app`. Sigue siendo internal-only: no habilita Production ni clientes externos.
- Greenhouse ganó la primitive aditiva `updateSisterPlatformOAuthRedirectUris` en el broker de sister platforms + el
  CLI `pnpm sister-platform:redirect`, que amplía el allowlist de redirect URIs en una transacción sin rotar el
  client secret ni reemplazar el array. Fuente canónica:
  [`docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md`](docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md)
  y continuidad de runtime en
  [`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

## 2026-07-21 — Globe materializa modos operativos y accountability versionada (TASK-1466)

- Globe incorporó SPEC-008: assignments append-only por workspace/run para `client-operated`, `co-operated` y
  `efeonce-managed`, ocho responsabilidades explícitas, contexto comercial sin pricing, commands/readers Full API
  Parity, replay idempotente, optimistic concurrency y audit atómico. `pnpm check && pnpm build` pasó en
  `efeonce-globe`; migración `0002` aplicada en Cloud SQL, deploys internos Ready y smoke autenticado confirmaron
  assign/replay/conflict/change/readers, tenant denial y dos auditorías durables. Los grants temporales fueron revocados;
  no se habilitaron UI, MCP, clientes externos ni producción comercial.

## 2026-07-21 — Scheduler completa foundation runtime y Temporal Operations Desk (TASK-1509/1510)

- Growth CTA incorpora la acción aditiva `open_meeting_scheduler` sin alterar `book_meeting`: autoridad `surface + scheduler key`
  validada server-side, proyección browser-safe, lazy load consent-aware con Save-Data/2G, task surface dialog/full-screen,
  foco/scroll/escape gobernados, recuperación nativa y continuidad del mismo scheduler al cerrar/reabrir. El cockpit puede
  autorarla. GVC `.captures/2026-07-21T11-22-29_growth-cta-native-meeting` pasó desktop/mobile, 10 frames,
  teclado/reduced-motion y continuidad al reabrir; ese checkpoint precedió el rollout nativo documentado más abajo.
- La UI evolucionó a **Temporal Operations Desk**: dossier compacto, grilla mensual continua con gramática de
  hoy/selección/densidad, inspector de horarios y booking brief sin card-on-card. Se agregó foco roving y teclado
  de calendario, se eliminó el flash de 400 ms causado por la animación phase-wide y se unificó iconografía en el
  subset Tabler sin SVG inline. GVC premium `2026-07-21T10-31-38_native-meeting-scheduler`: 36 frames command/split/guided,
  exit 0 y score enterprise 4.66/5; baseline/rollout continúan sujetos a aprobación humana.
- El carril amplio dejó de dibujar la órbita decorativa recortada: conserva sólo un resplandor tonal estático, amplía
  el espacio para mantener `Conversemos` completo y usa la marca monocroma gobernada de Microsoft Teams en turquesa,
  sin el disco morado de las variantes contenidas. La evidencia
  GVC `.captures/2026-07-22T00-40-24_native-meeting-scheduler` pasó 45 frames en 1440/820/390; el suplemento
  `.captures/manual/TASK-1510-scheduler-rail/reference-2048-v2.png` cubre 2048×1135. Teclado, reduced motion y overflow están verdes;
- El renderer público quedó desacoplado del release de Greenhouse. El proyecto estático dedicado
  `efeonce-public-renderers` publica JS+CSS content-addressed con hashes/SRI, cache inmutable, puntero estable revalidado,
  promoción por alias y rollback directo. `/agenda/` consume el loader estable y mantiene Greenhouse sólo como API;
  un `prebuild` o deploy no relacionado ya no puede cambiar su estética. Release live inicial `2fbea2b39b555c5762e6`,
  backup Elementor `_gh_backup_before_agenda_public_renderer_20260722T075004Z`.
- El scheduler dejó de imponer `America/Santiago`: detecta la zona IANA del visitante y la propaga de forma
  consistente por config, availability y booking de HubSpot. Santiago queda como fallback de surface. Se agregó
  canonicalización de aliases, rechazo pre-provider de zonas inválidas, validación de `bookingTimezone` y cobertura
  de DST/date-only. Los campos usan ahora un subset portable Iconify/Tabler generado en build, sin SVG manual;
  70 pruebas focales, typecheck, lint y build productivo verdes.
- El formulario heredó la política anti-correo-personal/desechable de Growth Forms sin duplicar listas: feedback
  debounced y accesible en cliente, endpoint gobernado por surface/origin + rate limit y revalidación autoritativa
  dentro del booking antes de CAPTCHA, disponibilidad, ledger o HubSpot. El correo no entra a URL ni telemetría.
- La validación del formulario ahora es progresiva y reactiva: campos vírgenes neutrales, error accionable al blur,
  recuperación inmediata mientras se corrige, consentimiento on-change y correo en fases sintaxis→verificación
  corporativa. El carril estable de estado combina copy, ARIA live y Tabler success/error/pending sin depender de color
  ni mover el layout. GVC `2026-07-21T11-37-07_native-meeting-scheduler` pasó 39 frames en 1440/820/390.
- La confirmación dejó de ser una alerta dentro del calendario: un receipt server-confirmed recompone todo el shell,
  muestra rango horario/zona/duración/Teams y próximos pasos sin PII ni IDs internos. La primera pasada de header oscuro
  + card fue descartada por feedback visual; la dirección final usa una superficie luminosa continua, banda temporal
  abierta y motion espacial/reduced-motion. GVC `2026-07-21T12-01-53_native-meeting-scheduler`: 45 frames, exit 0.
- Una auditoría final de copy, UX writing, CRO y criterio comercial centralizó también los textos dinámicos y reemplazó
  jerga interna por acciones y expectativas verificables: conversación de 30 min por Teams, zona horaria local, correo
  de empresa, recuperación accionable y `Reservar horario`. La revisión GTM mantuvo identidad semántica independiente
  del copy, cero PII/slot exacto y `generate_lead` sólo desde recibo server-confirmed; workspace 6 sigue sin publicar.
  GVC final `2026-07-21T12-18-17_native-meeting-scheduler`: 45 frames en 1440/820/390, exit 0.

- La migración dev quedó aplicada y leída de vuelta; un race live de PostgreSQL probó un único claim, conflicto
  semántico, replay único y cero residuo. Se provisionó el secreto HMAC dedicado con acceso del runtime y se verificó
  el resolver canónico; HubSpot Scheduler continúa online sobre Office 365 con disponibilidad real.
- El runtime del scheduler fue promovido y activado en staging y producción: ambos flags están ON y el binding piloto
  `fhsf-efeonce-lead-gen-web`/`discovery` quedó activo. Configuración y disponibilidad reales respondieron desde el
  origen público permitido y respetaron la zona del visitante (`America/New_York` en la verificación). La landing
  pública conservaba entonces el embed/link HubSpot mientras se completaba la mutación WordPress; el corte native-only
  posterior se documenta más abajo. No se publicó GTM ni se creó una reserva durante esa activación.
- El piloto público aislado quedó disponible en `/agenda/` (WordPress `251583`, `noindex`): montó inicialmente el scheduler
  con disponibilidad real, Turnstile y un enlace de respaldo que fue retirado en el corte native-only posterior. El host usa el template normal de Ohio
  —no Canvas— y una corrección page-scoped para el margen del root Elementor; Playwright confirmó desktop y 390 px sin
  overflow ni errores de consola. No se promovió a Contacto/RRSS, no se publicó GTM ni se creó una reserva.
- El host de `/agenda/` se refinó como focused booking canvas conservando la navegación y el footer global completo del sitio: un H1, sin title/breadcrumb/sidebar heredados y sin prefooter. Se retiraron 35 reglas locales que alteraban el footer. La captura final `.captures/2026-07-21T23-44-01-104Z_agenda-focused-booking-canvas` validó 1440/820/390, `scrollWidth===clientWidth`, teclado, reduced motion y cero errores; no hubo booking, GTM publish, release ni commit.
- La navegación mensual ya no colapsa el calendario cuando HubSpot devuelve un mes sin slots: conserva el mes solicitado,
  la grilla semántica completa, los controles de recuperación y un estado vacío específico. La regresión julio→agosto
  quedó cubierta con 31 días no disponibles, restauración de foco y revisión visual desktop/390 sin overflow. PR #162
  fue liberado en producción (`ddd3094538e7`, run `29848667096`); el smoke en la sesión Chrome autenticada del operador
  confirmó agosto completo en `https://efeoncepro.com/agenda/`, sin crear una reserva ni publicar GTM.
- El scheduler pasa a una experiencia **native-only** en todos sus tamaños y activaciones: se eliminaron el enlace hijo y el
  respaldo visible de `/agenda/`, y tanto el renderer portable como Growth CTA resuelven fallas mediante `Reintentar`, sin abrir
  la UI de HubSpot. Elementor se guardó vía `Document::save()` con backup
  `_gh_backup_before_agenda_native_only_20260721T170615Z`; el readback confirmó un host y cero enlaces HubSpot. HubSpot continúa
  como provider invisible de disponibilidad/reserva. Las 75 pruebas focales, typecheck, lint, build y GVC premium
  `.captures/2026-07-21T17-02-42_native-meeting-scheduler` quedaron verdes. PR #163 fue liberado en producción
  (`fbe8a9c76a74`, run `29854833210`, manifest `released`); el smoke Chrome post-release confirmó cero enlaces/copy
  HubSpot, la grilla completa de agosto y `overflow=0`, sin crear una reserva.
- La UI elevó el calendario a `Calendar Command Center`: densidad por fecha, agenda agrupada por período, resumen
  vivo, formulario desktop de dos columnas, mobile compacto y motion causal/reduced-motion. GVC premium
  `2026-07-21T09-02-04_native-meeting-scheduler`: 24 frames, exit 0, runtime/enterprise/a11y/layout/performance verdes.
- GTM workspace descartable ID 6 quedó compilado y sincronizado en preview con 10 DLVs allowlisted,
  `gh_meeting_step_reached` y `generate_lead` receipt-gated. No se creó versión ni se publicó; los flags y el binding
  del piloto están ON, de forma independiente al estado de publicación de GTM.
- El cierre documental crea la skill dueña `greenhouse-growth-meetings` y alinea arquitectura/PDR, CTA, GTM, WordPress,
  release, documentación funcional, manuales, tasks e índices con el contrato native-only y sus gates pendientes.

## 2026-07-21 — Scheduler adopta recipes adaptativas y atribución por intención (TASK-1510)

- El renderer separó estado de booking, modo de activación y layout. Resuelve `guided|split|command` desde su propio
  contenedor con hysteresis; cambios de `activation-mode`/`max-recipe` conservan nodos, selección e intent.
- La receta `guided` presenta calendario y agenda como planos progresivos con retorno/foco semántico. Se eliminó el
  `date_selected` automático y los eventos incorporan `presentation_variant` + `activation_mode` allowlisted.
- Los datos del asistente usan ahora controles icon-led de 56 px, estados focus/error integrados y consentimientos
  modernos con hit area real de 44 px; el CTA guiado dejó de cubrir el resumen en móvil.
- GVC premium local `2026-07-21T09-35-05_native-meeting-scheduler` pasó 22 frames desktop/mobile con targets de
  44 px, teclado, reduced motion, layout, a11y, performance y enterprise rubric verdes.
- GTM workspace descartable ID 6 fue actualizado a 10 DLVs y ambos tags; readback/quick preview quedaron verdes.
  Continúa sin versión ni publicación. `book_meeting` permanece navigation-only; el adapter CTA nativo será un kind nuevo.

## 2026-07-21 — Scheduler nativo adopta calendario mensual (TASK-1510)

- El prototipo portable reemplaza la dirección abstracta “Time Horizon” por un calendario mensual semántico,
  agenda diaria y resumen inline; el GVC premium local pasó 24 frames en 1440 px y 390 px, teclado, foco, contraste,
  reduced motion, enterprise rubric y cero errores runtime/overflow.
- El funnel emite eventos allowlisted sin PII y reserva `gh_meeting_booking_confirmed` para un recibo confirmado
  server-side. La activación pública sigue pendiente del dossier staging/full-state, preview/read-back de GTM,
  runtime real de TASK-1509 y piloto gobernado; los flags permanecen apagados.

## 2026-07-21 — HubSpot Scheduler equivalence conditional pass (TASK-1366)

- El spike de booking nativo probó en runtime calendario Office 365, Teams, contacto/reunión CRM y links
  nativos de cancelación/reprogramación mediante Scheduler `2026-03`; el harness fail-closed mantiene PII/IDs
  redacted y no otorga consentimiento de marketing opcional.
- `HubSpotMeetingEmbed` sigue como fallback: no hubo cambio de landing/GTM. La productización posterior debe
  cubrir adapter server-side, idempotencia/abuso, atribución consentida, observabilidad y QA del inbox invitado.
  Canon: `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md` + `PDR-009`.

## 2026-07-20 — Globe: edit/refine cross-model generalizado (TASK-1490)

- Refinar un candidato del Model Lab pasó a ser **una sola semántica** para todo modelo editable
  (`editFrom = { experimentId }`); el paradigma nativo — stateful por sesión vs. reference-based — lo resuelve el
  seam según qué proveedor ejecuta, y el cambio queda registrado en el manifest, nunca en silencio. Habilita
  **edit cross-model** (refinar un candidato de un motor con otro). Task:
  `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md`.
- Se descubrió y cerró el prerrequisito que la task daba por hecho: los outputs del proveedor **nunca se
  persistían**, así que el paradigma reference-based fallaba en runtime. Ahora se retienen content-addressed.
- Skill `greenhouse-globe` (Claude + Codex) actualizada con el patrón de edit generalizado, sus reglas duras y la
  lección de método: un campo de evidencia que nace debe verificarse **hasta el manifest**, no sólo en el adapter.
- Implementación en el repo hermano `efeonce-globe` (verificada en vivo por el seam); rollout del servicio
  desplegado pendiente — ver `Handoff.md`.

## 2026-07-19 — EPIC-028 · Globe Still Model Lab — recommendation matrix en vivo (TASK-1459)

- `TASK-1459` COMPLETE. El golden brief still (`rrss-key-visual-still`, contrato `flexible-style`) se corrió **por el harness de evaluación real** (`globe.lab.evaluation.evaluate` vía el seam) contra **dos motores reales** con generación facturable: **Vertex Nano Banana** (`gemini-2.5-flash-image`, 10cr, **7s**, objective pass) vs **Fal Seedream 5 Pro** (10cr, **138s**, objective pass) — ambos `objective_pass_pending_human`. Recommendation matrix: candidatos válidos al mismo costo; diferenciador objetivo = latencia (Nano Banana ~20× más rápido); craft (`brand-anchor`/`exploration-breadth`) queda a revisión humana (el harness nunca auto-elige ganador creativo).
- **Bug encontrado por la corrida:** el `route_stable` del `FalCreativeAdapter` fallaba porque devolvía el slug del modelo como `actualRoute` en vez del route del contrato de fidelidad (el slug va en `model`). Corregido → `actualRoute=request.route` (como Vertex). Motion/audio (TASK-1460/1461) esperan la resolución hash→bytes (sus briefs parten de una imagen/referencia). `pnpm check` verde.

## 2026-07-19 — EPIC-028 · Globe Fal adapter model expansion + canary en vivo (TASK-1488)

- `TASK-1488` COMPLETE en `../efeonce-globe`. Expande el `FalCreativeAdapter` (TASK-1487): `CREATIVE_CAPABILITIES` +3 (`image-upscale`, `video-upscale`, `model-3d-generate`) y `FAL_ROUTING` con modelos verificados **contra las skills** (fuente tested): Seedream 5 Pro/Lite (image), Recraft v4.1 `text-to-vector`, Topaz upscale (imagen/video), Hyper3D Rodin v2.5 `text-to-3d`, Seed Audio (audio, reverify), ElevenLabs (speech), Seedance 2.0 (video).
- **Bug de slug descubierto y corregido en vivo:** los modelos **ByteDance** en Fal usan slug **SIN** prefijo `fal-ai/` (`bytedance/seedream/v5/pro/text-to-image`); con el prefijo el submit pasa (200) pero el result da 404. La skill `greenhouse-ai-image-generator` lo tenía bien; el catálogo doc (`GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`) lo tenía mal — se corrigió el prefijo + se agregó la regla dura.
- **Canary Fal verificado EN VIVO** por el seam con la key Fal existente del repo (excepción temporal documentada; retiro = Globe provisiona su propia key): `image-generate` → Seedream 5 Pro, `candidate_ready`, `provider=fal`, `actualRoute=bytedance/seedream/v5/pro/text-to-image`, `estimated==actual==10`, `sha256:f9d9a216…`, fence liquidó. `pnpm check` verde (30 tests creative-runner con las 10 caps).
- **Los 10 modelos verificados en vivo (ninguno sin verificar):** 6 text-driven generados end-to-end con hash real (Seedream 5 Pro, Recraft v4.1, Seed Audio, ElevenLabs TTS, Hyper3D Rodin v2.5, Seedance 2.0) + 4 input-requiring con slug 422 (Seedream edit, Topaz image/video, Seedance i2v). Fixes: Seed Audio vive en `fal-ai/seed-audio` (usa `prompt`); poll budget 450s (3D/video tardan minutos); 422 en el result → `provider_failed` (content-policy del audio nativo de Seedance).

## 2026-07-19 — EPIC-028 · Globe Fal provider adapter + Composite router (TASK-1487)

- `TASK-1487` COMPLETE (code-complete, rollout gated) local-first en `../efeonce-globe`. Segundo `CreativeProviderAdapter` real: `FalCreativeAdapter` conecta el stack **no-Google** vía la queue API de Fal — **Seedream 5** (`image-generate`/`image-edit`), **Recraft** (`image-vectorize`), **Seedance 2.0** (`video-generate`/`video-extend`) y **ElevenLabs** (`audio-generate`/`speech-synthesize`) — las 7 capabilities. Secreto propio de Globe (`GLOBE_FAL_API_KEY`, nunca `greenhouse-fal-api-key`), inyectado; queue con el gotcha `status_url`/`response_url` (nunca reconstruir desde el slug); output descargado server-side → `sha256` (nunca URL pública); error mapping sanitizado.
- `CompositeProviderAdapter` combina Vertex + Fal: capabilities Fal-only (vector/audio/voz) por `supports()`; overlap image/video por **política explícita** (`DEFAULT_COMPOSITE_POLICY`: default Vertex Google-native; Seedream/Seedance vía `GLOBE_LAB_PROVIDER=fal`); `poll` vuelve al hijo que emitió el run. Provider-selection `GLOBE_LAB_PROVIDER` = `fake|vertex|fal|composite` (default `fake`).
- 29 tests de `creative-runner` (Vertex + Fal + Composite) con transportes mockeados (cero red, cero gasto); `pnpm check` + `pnpm build` verdes; el fake sigue default. Desbloquea **audio** (TASK-1461, corrige el Delta de 1486) + motores alternativos still/motion (TASK-1459/1460). Canary Fal billable en vivo gated por el secreto Fal de Globe. Inputs que requieren bytes (edit/vectorize/i2v) → `inputs_unavailable` hasta la resolución hash→bytes (follow-up).

## 2026-07-19 — EPIC-028 · Globe Model Lab real Vertex provider adapter (TASK-1486)

- `TASK-1486` COMPLETE (**code-complete, rollout gated**) local-first en `../efeonce-globe` (sin push; en greenhouse-eo sólo lifecycle/doc). Primer `CreativeProviderAdapter` real: `VertexCreativeAdapter` (`apps/creative-runner/src/vertex-adapter.ts`) reemplaza el `FakeReferenceAdapter` detrás del `LabRunner` sin tocar dominio ni contrato.
- Routing capability→modelo **dentro del adapter** (`image-generate`→`gemini-2.5-flash-image`; `video-generate`/`video-extend`→`gemini-omni-flash-preview` región `global`); `supports()`=false para `image-vectorize`/`audio-generate`/`speech-synthesize` (boundary Google-native explícito). Keyless (ADC/WIF, `getAccessToken` inyectado + `google-auth-library` lazy); `estimate` sin red, `submit` única facturable, `poll` → hashes (nunca URL pública); error mapping sanitizado (404/429/403 → reason tipada).
- Provider-selection `GLOBE_LAB_PROVIDER` (default **`fake`**, reversible al instante); 15 tests del adapter con transporte mockeado (cero red, cero gasto); `pnpm check` + `pnpm build` verdes; el path fake sigue default (model-lab.test.ts pasa). El **canary billable en vivo** queda gated por humano (go-live checklist: Vertex enablement en `efeonce-globe` + SA `aiplatform.user` + budget + flags). Desbloquea el carril still/motion de TASK-1459/1460; audio (1461) sigue pendiente de adapter no-Google.

## 2026-07-19 — EPIC-028 · Globe Golden Briefs & Evaluation Harness (TASK-1458)

- `TASK-1458` COMPLETE local-first en el repo hermano `../efeonce-globe` (sin push; en greenhouse-eo sólo lifecycle/doc). Segunda capability de negocio sobre el spine: `globe.lab.evaluation.run` (SPEC-003) — **consume** el Model Lab (TASK-1457) para volver un intento en evidencia repetible y comparable **por contrato de fidelidad**.
- Fixtures still/motion/audio versionados con derechos declarados (licencia/consentimiento/uso); rúbricas que separan checks objetivos automáticos de criterios humanos declarados (nunca auto-puntúa craft). El comando `evaluate` corre el golden brief por `runModelLabExperiment` (reusa el camino real del Lab, sus guardrails y el provider seam) y puntúa el manifest.
- El verdict nunca es un "passed" creativo: sólo `objective_fail` u `objective_pass_pending_human` (revisión humana obligatoria); no declara un modelo globalmente mejor. Reportes versionados, workspace-scoped y con limitaciones declaradas (proveedor fake, muestra única). `pnpm check` + `pnpm build` verdes (11 tests de evaluación + suites del monorepo sin fallos). Fake canary: cero gasto, cero infra; `ui`/`mcp` `policy-blocked`.

## 2026-07-19 — Surface Recipes adopta planos de lectura sin degradar CTA

- `SurfaceRecipe` convierte los recipes oficiales en composición ejecutable sobre `CompositionShell`; el canvas gris queda como gutter y la lectura sostenida vive en work planes equilibrados.
- `/growth/ctas` consume el recipe conservando sus paneles maduros como benchmark de no regresión; se redujo card-on-card, se tokenizaron títulos/sombras/colores y Growth usa un icono semántico.
- El Lab de recipes y sus contratos técnico, funcional y operativo declaran el antipatrón de texto flotando sobre `background.default`. El baseline visual anterior no se promovió automáticamente: requiere aprobación humana de la nueva dirección.
- La segunda pasada corrige accesibilidad en sus dueños compartidos: navegación con botones nativos y Escape, Search/Notifications con microcopy ARIA canónico, Settings con `listbox→option`, footer interno correcto para Growth y contraste tokenizado en CTA. El shell desktop/mobile queda verificado; authoring profundo y nuevos baselines siguen como checkpoint pendiente.

## 2026-07-19 — EPIC-028 completa credits operations y Design System propio de Globe

- `TASK-1468` queda como kernel append-only; `TASK-1482` administra pools, grants, project budgets, policies
  y forecast sin crear un segundo saldo ni un pre-check fuera de la reserva transaccional.
- `TASK-1483` define el Runway Control Plane y separa credits operations del workbench creativo `TASK-1474`.
- `TASK-1480` debe emitir un decision record firmado; `TASK-1484` implementa después
  packages/pricing/billing/tax/revenue/payments y permanece bloqueada sin habilitar cobros/clientes.
- `TASK-1485` formaliza Design System Globe: Greenhouse gobierna decisions/registry/lifecycle/QA/evidence;
  Globe posee tokens seleccionados, patterns, components, motion y runtime sin heredar Greenhouse UI.

## 2026-07-19 — Worker builds adoptan inputs determinísticos y toolchain único

- Los cuatro workers Cloud Run copian `vendor/` antes de cada instalación, y sus workflows observan package,
  lockfile, Docker/Cloud Build ignores y `vendor/**`; `ico-batch` deja de omitir esos cambios.
- `pnpm worker:build-contract-gate` verifica pnpm SoT, existencia/Git/SHA-512 de dependencias `file:`, orden
  Docker, contextos y triggers. El runtime-deps gate cubre ahora también Artifact Worker y detectó/corrigió su
  import directo de `playwright` que dependía accidentalmente de un transitive.
- El registry privado definitivo permanece gobernado por `TASK-1473`; no se improvisaron tokens ni se saltaron
  sus blockers. El vendoring temporal queda reproducible y con condición explícita de retiro.

## 2026-07-19 — EPIC-028 adopta ejecución paralela bajo el harness de Greenhouse

- Model Lab/craft, plataforma gobernada y validación comercial avanzan en paralelo; probar una ruta bajo sandbox
  ya no espera al ledger/workbench completo, mientras su promoción a UI/MCP conserva un gate enterprise aparte.
- Greenhouse registra `TASK-1456…1485` y conserva tasks, hooks, lint, QA, planes, lifecycle, handoff y cierre
  cross-repo. Globe posee código/runtime/evidencia y mantiene un execution plan referencial, no un backlog paralelo.
- La primera wave prepara gobierno, sandbox/fixtures e IaC simultáneamente; el primer motion comercial es un
  Sample Sprint Efeonce-managed, no Studio Access ni créditos comerciales.
- Full API Parity queda convertida en gate de nacimiento, no follow-up de UI/MCP: `TASK-1481` crea el API
  Contract Spine/trusted context/conformance antes del primer provider call; `TASK-1457` prueba el primer
  canary por API/SDK→command→adapter→runner y `TASK-1473` queda como packaging/certificación sin business logic.

## 2026-07-19 — Globe ya existe como producto interno visible

- TASK-1455 convirtió el callback técnico de Globe en una shell branded live: raíz anónima, OAuth Greenhouse,
  callback `303 /studio`, sesión/revalidación, logout y recovery/revocación sin exponer tokens al browser.
- El runtime `globe-studio-internal-00006-445` sirve 100% del tráfico no productivo desde Node 24, min 0/max 1;
  build `fd79b83e-eafc-4fb1-93c9-ddf6309c4c17`, digest `sha256:7b213f7d…c8f4a`.
- Dirección `Orbital Threshold` usa los SVG/font assets canónicos con proveniencia. GVC premium live pasó
  1440×1000 y 390×844, teclado, reduced motion, axe, layout, runtime, performance y rubric enterprise;
  scorecard 4,73/5, floor 4,5 y cero overflow.
- Continúa internal-only y sin Production, clientes, projects, runs, providers, DB ni asset bucket. El siguiente
  slice funcional debe especificar el workbench real sin reabrir identidad o brand foundation.

## 2026-07-19 — Creative Studio formaliza el primer Business Model del repo

- Nace `docs/business-models/` con índice, lifecycle, fronteras y template canónico; Strategy conserva
  doctrina, Services el alcance operable, Commercial las transacciones y Finance/CPQ los precios por cliente.
- Creative Studio separa tres ejes que antes estaban mezclados: modelo de delivery (`Managed Squad`, `Staff
  Augmentation`, `Studio Access`), forma de engagement (`On-Going`, `On-Demand`, `Sample Sprint`) y modo
  operativo por run (`efeonce-managed`, `co-operated`, `client-operated`).
- Studio Credits quedan definidos como operaciones generativas gobernadas, no horas, piezas, tokens, moneda ni
  derechos. El modelo está aprobado para shadow ledger/pilotos; pricing público, checkout, top-ups, impuestos y
  acceso externo siguen bloqueados por Finance/Legal/EPIC-028.
- Provider-neutral deja explícitamente de significar provider-oculto: estimate, approval e historial muestran
  provider/modelo/version, readiness y fallbacks reales; siguen privados costo vendor, margen, keys y prompt/IP.
- El modelo se propagó a 20 skills en ambos runtimes: doctrina comercial/agencia; diseño, imagen, social,
  contenido, copy, decks y Digital Marketing; motion, audio y HyperFrames; Finance, Legal/IP, Talent, Tenders, GTM y Research.
  Nuevos módulos operativos cubren lifecycle, retries/refunds, derechos, ejemplos por pieza y finishing
  determinístico a cero credits sin convertirlo en costo cero. La matriz `EFEONCE_CREATIVE_STUDIO_SKILL_ADOPTION_V1.md`
  registra ownership, cobertura, validación y skills auditadas sin cambio.

## 2026-07-19 — Routing HubSpot de email y secuencias por API canonizado

- Las skills `hubspot-as-a-service` y `hubspot-solutions-partner`, espejadas para Codex/Claude, distinguen
  marketing directo, automatización legítima por formulario, email de ventas 1:1 y enrollment de secuencias.
  Marketing Starter no obtiene Single-Send; Sales Hub Professional sí puede inscribir contactos vía API bajo
  seat, inbox, permisos, scopes, consentimiento y límites de envío verificados.

## 2026-07-19 — Changelog interno adopta ventana activa e historia verificable

- `changelog.md` deja de ser un monolito append-only de 11.256 líneas y conserva hasta 60 entradas recientes;
  el estado completo previo al corte quedó preservado byte-for-byte con manifest SHA-256 bajo
  `docs/changelog/internal/legacy/`.
- `pnpm docs:context-rotate --apply` rota Handoff y changelog de forma independiente, mueve entradas completas
  a shards mensuales con hash, actualiza sus índices y aborta la reescritura ante edición concurrente.
- `pnpm docs:context-check:strict` y el workflow de governance ahora aplican budget, formato, orden, pointers e
  integridad; el prompt operativo de Codex y `implement-task` de Claude declaran explícitamente la ventana,
  archivo, rotación y gate del changelog, y CI verifica esos pointers. `docs/changelog/CLIENT_CHANGELOG.md`,
  `CLAUDE.md` y su CI permanecen fuera de este cambio.

## 2026-07-19 — Creative Studio: portfolio enterprise y routing agentic gobernado

- Una flota auditó documentación oficial de Google Cloud, Fal y la arquitectura de control para definir un
  portafolio profesional de imagen, video, audio, localización, post, capas y 3D. Google nativo queda directo
  por GCP; Fal sólo cubre rutas no-Google exactas; OpenAI se mantiene directo.
- Se añadieron el portfolio enterprise y un registry JSON de research para agentes. Separan capability estable,
  route candidate, tier, lifecycle y readiness; ninguna ruta ejecuta hasta `production_approved`.
- La skill `design-studio` en Codex/Claude incorpora routing enterprise, tres carriles Gemini Image, endpoints
  Seedream/FLUX/Ideogram/Kling/PixVerse/ElevenLabs/Bria exactos, Seedance 2.5 bloqueado y workbenches externos
  en `watch`.
- Se endurecieron los contratos de costo, privacidad, derechos, aprobación single-use, no-double-spend,
  observabilidad, DR y agent permissions. No se creó runtime, adapter, credencial ni gasto; EPIC-028 sigue siendo
  la frontera de implementación.

## 2026-07-19 — Efeonce Globe inicia construcción como Creative Studio hermano

- Se fijó **Efeonce Globe** como nombre canónico interno del Creative Studio y EPIC-028 pasó a `in-progress`.
- Se creó el repositorio privado `efeoncepro/efeonce-globe` y el único proyecto GCP inicial `efeonce-globe`,
  aislado de Greenhouse, con billing y APIs base pero sin workloads, datos, buckets, secretos ni gasto de providers.
- El monorepo foundation en Node 24 incorpora contratos UI/MCP, dominio de runs, provider boundary, media QC,
  runner async, CI y gobernanza. CI remota verde; IAM/WIF, budgets, IaC y primer vertical slice siguen pendientes.

## 2026-07-19 — Globe queda alcanzable desde Greenhouse como piloto interno

- TASK-1454 generalizó el broker OAuth de sister platforms mediante policy validada por client, preservó Kortex y
  registró Globe con audiencia `efeonce_internal`, capability namespaced y claims mínimos sin roles Greenhouse.
- Se aplicó la migración aditiva aprobada, se desplegaron callback web y API privada en Cloud Run y se verificaron
  PKCE/replay, acceso humano interno, denegación de tenant cliente, revocación convergente, correlación y audience
  exacto/incorrecto. El bridge Vercel OIDC → WIF → Google ID token opera sin service-account keys.
- Globe permanece activo sólo como piloto interno no productivo. No se habilitaron clientes externos, Production,
  providers creativos, DB ni buckets. La UI/branding con logo canónico continúa en una task `ui-ux` separada.

## 2026-07-19 — Contexto de agentes migra a router con preservación verificable

- `AGENTS.md`, `project_context.md` y `Handoff.md` dejan de operar como monolitos append-only: ahora separan
  reglas transversales, estado vigente y continuidad activa con carga por dominio.
- Los cuatro archivos anteriores al corte quedaron preservados byte-for-byte con manifest SHA-256 bajo
  `docs/operations/agent-context-history/2026-07-19/`; `Handoff.archive.md` pasa a ser índice.
- `pnpm docs:context-check:strict` aplica budgets, máximo 20 sesiones, targets y hashes; la rotación futura usa
  `pnpm docs:context-rotate --apply`, conserva por fecha, indexa shards con hash y aborta ante ediciones
  concurrentes; un workflow CI independiente evita reacreción.
- `CLAUDE.md` y su CI no fueron modificados; su pointer existente abre el operating model y los entrypoints
  `.claude/commands/implement-task.md` + documentation governor aplican el nuevo protocolo, verificado por CI.

## 2026-07-19 — Campaign Layout Compiler V1 ejecutable

- Se añadió `pnpm creative:layout` con modos `plan|compile|check` para convertir contratos YAML/JSON en fuentes
  SVG editables, underlays, masters, manifests/hashes, contact sheet y QA, sin llamadas a modelos.
- El compiler bloquea inputs faltantes y checkpoints de anchor/layout/finish; el release humano sigue separado.
  Paths relativos y SHA-256 hacen portable el relevo, y un baseline MAE opcional protege migraciones de masters.
- High Frequency se recompiló en `16:9`, `4:5` y `9:16` sin nueva inferencia: QA `3/3`, desviación normalizada
  `0,001096–0,001155` contra los masters previos, bajo el gate `0,002`.
- Sus 84 binarios (`148861636` bytes) se archivaron en el bucket privado canónico de GCP; Git conserva el
  manifiesto remoto con tamaño/SHA-256, contratos, QA, scripts y SVG editables, sin sumar esos assets a Vercel.
- Se sincronizaron contrato técnico, documentación funcional, manual y skills Codex/Claude. Es tooling
  out-of-band: no cambia runtime, IAM, secretos, despliegue ni activación en medios.

## 2026-07-19 — Layout Design & Finishing canonizado para producción estática premium

- El método `anchor → layout contract → clean plate por ratio → bounded finish → composición determinística
→ mastering → QA` se incorporó al canon multimodal, con documentación funcional y manual operativo.
- `design-studio` suma el módulo 13 y un contrato YAML reusable; `greenhouse-ai-image-generator` adopta el
  mismo routing. Codex y Claude quedaron espejados.
- Regla dura: Seedream Pro termina material/luz/color/atmósfera; GPT Image 2 corrige geometría/safe zones o
  regiones protegidas; copy, logo, CTA, legal y locale nunca se devuelven al modelo después de componerlos.
- El piloto High Frequency produjo `16:9`, `4:5` y `9:16`, pasó QA `3/3`, obtuvo `47/50` y registró costo
  incremental estimado de `USD 0,27`. Es benchmark observado, no SLA. No cambia runtime, IAM ni despliegue.

## 2026-07-18 — Worked example E2E de campaña visual multimodal

- Se produjo y versionó `ai-generations/2026-07-18_high-frequency-campaign-e2e/`: brief, fuentes,
  prompts, scripts, contratos de relevo, lineage, costo, QA, review board y paquete final.
- El routing validado usa Seedream 5 Lite para divergencia, Seedream 5 Pro para el mundo visual,
  GPT Image 2 para plates directos y Gemini Omni Flash para clean motion; Sharp/fontkit/FFmpeg resuelven
  copy, marca, end cards y exports. La topología es estrella, sin derivados en cadena.
- Se entregaron 18 stills (digital, A2 y OOH), 2 heroes motion de 15 s, 2 masters de 10 s y 2 bumpers
  de 6 s. Los heroes combinan el clean shot aprobado con claims exactos, una pared de formatos reales
  y end card determinísticos; agregarlos no requirió nueva inferencia. El clip Omni inicial de 3 s queda
  como technical probe y no como asset. QA `18/18 + 6/6`, audio de heroes medido en `-16.3/-16.4 LUFS`
  y true peak `-2.0/-2.2 dBFS`, score `47.4/50`, ZIP V3 reproducible y costo generativo release estimado
  de `USD 2.9650`. La auditoría endurecida mide los seis MP4 y deja masters/bumpers explícitamente pendientes
  de normalización por destino; Seedance 2.0 queda como fallback sólo para una nueva toma, ángulo o continuidad
  física ausente. La entrega
  queda aprobada como creative release; media activation sigue fuera de alcance hasta definir
  audience, offer, landing, tracking, presupuesto, legal, escucha humana y experimento.

## 2026-07-18 — Secondary Tidal Teal tokenizado y validado

- Se reemplazó el secondary lime/green por una familia Tidal Teal propia: ramp `100→900`
  `#DDF9F5→#083F3D`, anchor `500 #12AFA2`, opacidades derivadas y aliases semánticos por modo.
  Light usa `700 #0B726C` + blanco (5.77:1); dark usa `400 #3BCBBD` + Midnight (7.25:1).
- `mergedTheme` resuelve secondary por modo; Colors, Buttons, Chips, nomenclatura/chart secondary y
  Careers consumen el SoT. La antigua cláusula verde de TASK-1053 queda supersedida por
  `GREENHOUSE_SECONDARY_TEAL_COLOR_DECISION_V1.md`; AXIS Figma requiere reconciliación upstream.
- El Colors Lab ahora expone el mapping funcional, corrige 142 atributos ARIA inválidos y 53
  contrast findings preexistentes. Nuevo GVC `design-system-colors` desktop/mobile con accessibility,
  layout y runtime gates; baseline durable de cuatro frames, rerun con drift `0.00%`. Buttons y Chips
  también pasaron sus escenarios desktop/mobile y fueron inspeccionados.
- `ui:code-lint` permite HEX sólo en fuentes canónicas de color y fixtures de drift, manteniendo el
  bloqueo en consumers. El kill-switch canónico es `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED=false`;
  unset/default = Tidal Teal. El flag lime anterior queda retirado.

## 2026-07-18 — Método híbrido Seedream 5 ↔ GPT Image 2 para campañas still

- `design-studio` y `greenhouse-ai-image-generator` ahora diseñan una secuencia de manos:
  Seedream Lite para divergencia, Seedream Pro para materialidad/atmósfera, GPT Image 2 para
  estructura/reparación/adaptación y composición determinista para copy/logo/legal.
- Se agregaron módulo de producción, referencia técnica y contrato YAML de relevo, espejados para
  Codex/Claude. El flujo usa anchors aprobados, topología estrella, gates representativos por lote y
  un executor destino explícito; evita cadenas de derivados y comparaciones uno-a-uno sin operación.
- Dos pruebas reales validaron ambos sentidos. Los assets permanecen en `.captures` (gitignored);
  no se cambió runtime, IAM, secretos ni deploy. El puente GPT local → Fal usa upload temporal
  `fal-cdn-v3`, sin bucket público ni expansión de permisos GCP.

## 2026-07-18 — TASK-1453: Premium Agentic UI Platform

- Se cerró la causa sistémica de la UI genérica: nuevas interfaces `ui-standard`/`ui-platform` parten de Visual Direction + surface recipe + Composition Shell, no de un grid MUI. MUI/Vuexy quedan como foundation accesible, no como autor visual.
- Se incorporaron seis recipes y ocho primitives compuestas, Lab `/design-system/surface-recipes`, semántica `data-ui-surface`, presupuesto de máximo tres superficies `contained` en el first fold y blockers explícitos para card-on-card, mobile serializado y ausencia de impacto visual.
- Cuatro gates separan contrato, código, evidencia y calidad. GVC premium revisa desktop/390 px, enterprise rubric y dossier de catorce dimensiones; aceptación: media ≥4.5/5, piso ≥4 y cinco dimensiones críticas ≥4.5. ADR y reglas de Codex/Claude sincronizados.
- Hardening posterior al repro cross-agent: `ui:code-lint` reconoce `customShadows` como
  compatibilidad Vuexy sólo fuera de primitives, exime tamaños ópticos de glyphs Tabler
  y preserva números de línea reales en `--changed`; sombras literales y tipografía
  inline siguen bloqueadas.

## 2026-07-18 — TASK-1430: cockpit operator de CTAs (autoría gobernada + métricas + kill switches) — code complete

- `/growth/ctas` evoluciona a cockpit master-detail (CompositionShell `split` con nueva prop
  `splitTemplateColumns`): inventario con filtros/teclado + detalle con lifecycle completo, kill
  switches global/surface operables (reason auditado), preview del renderer canónico, superficies,
  supresión y versiones. Autoridad visual: proyecto Claude Design «Cockpit de CTAs» (instrucción
  del operador), traducido a tokens del theme.
- Autoría gobernada de 8 pasos en drawer (intención→…→revisión) consumiendo la metadata del Action
  Registry TASK-1431 (cero enum paralelo); preview harness con scrubber de density (umbrales reales
  560/400), claro/oscuro, hosts Think/WordPress y matriz pairwise; el mount degradado bloquea la
  revisión. Dirty-close con confirmación; submit server-confirmed.
- Métricas de marketing pedidas por el operador, resueltas SERVER-side: `getCtaMarketingMetrics`
  (impresiones Tier B viewed, clics, conversiones solo `server_confirmed`, CTR/tasa + deltas
  ventana-a-ventana, guard `impressions_undercounted` que evita % imposibles) wired a
  `CtaDetailVm.metrics`; `authorDraftCta` acepta `suppressionPolicy`. SQL vivo verificado (gate
  TASK-893). GETs admin + POST author des-gateados de `GROWTH_CTA_ENGINE_ENABLED` (el flag gobierna
  exposición pública). GVC desktop+mobile mirados. Arch §28 + skill actualizada (ambos espejos).
  Rollout pendiente: push + smoke staging.

## 2026-07-18 — ISSUE-123: staging access resuelve el deployment vigente (alias env-staging des-pinneado)

- Causa raíz identificada del bug class recurrente (3 veces en 2 días): un `vercel alias set` manual
  FIJA el alias `greenhouse-eo-env-staging-….vercel.app` y cada deploy posterior lo deja rezagado —
  los agentes validaban staging contra código viejo en silencio. El "fix" manual era la causa.
- Tooling resiliente: `resolveStagingAccess()` ahora resuelve el **último deployment staging READY
  vía Vercel API** (alias solo como fallback con warning); nuevo `pnpm staging:url` para componer
  (`STAGING_URL=$(pnpm --silent staging:url) pnpm fe:capture … --env=staging`); GVC con
  `STAGING_URL` + storageState por host (cookies no cruzan subdominios). Picker unit-testeado con
  el shape real de la API v6 (`customEnvironment.slug === 'staging'`, `target: null`).
- Alias des-pinneado (`vercel alias rm`, autorizado por el operador). Regla anti-recurrencia en la
  spec: NUNCA re-apuntar con `alias set`. ISSUE-123 queda open hasta verificar el re-atado
  automático en 2 deploys. Specs: `GREENHOUSE_STAGING_ACCESS_V1.md` §10 + ISSUE-123.

## 2026-07-18 — EPIC-032: Notion Work Management Control Plane planificado

- Se registraron `EPIC-032` y cuatro tasks compactas (`TASK-1449…1452`) para convertir la delegación y consulta
  de trabajo Notion en una capability multi-space por commands/readers y CLI: registry+Enhanced Markdown,
  jerarquía recursiva, estado/resultados/historia observada y rollout de agentes.
- El plan exige reconciliar `TASK-880` y `TASK-577` antes de implementar para conservar un solo cliente seam y
  un solo write bridge. Cambio sólo documental: no habilita runtime, flags, migrations ni writes Notion.

## 2026-07-18 — TASK-1431: Growth CTA Action Registry + navegación gobernada (code complete, rollout pendiente)

- El action router monomórfico del motor de CTAs se reemplazó por un **Action Registry tipado**
  (`src/lib/growth/ctas/action-registry.ts`, server-only): un entry por kind con policy schema,
  resolver y proyección browser-safe; `resolveCtaAction` queda como fachada estable y publish/render
  fallan closed ante kinds sin entry. Metadata read-only browser-safe por kind
  (`CTA_ACTION_KIND_METADATA`) para cockpit (TASK-1430)/preview/tests sin server-only. Taxonomía
  canónica de fallo `action_policy_invalid|action_kind_unsupported|action_destination_invalid|action_destination_unavailable`.
- Nuevas acciones de **navegación gobernada**: `link_url` (root-relative o https; anti open-redirect,
  sin credenciales ni protocol-relative), `open_think_tool` (path sobre hub Think gobernado + campaign
  context UTM-allowlisted strict) y `book_meeting` (hosts `meetings*.hubspot.com` + env
  `GROWTH_CTA_BOOKING_URL_HOSTS`; navegación-only, cero write CRM). `open_growth_form` sin cambios.
- Renderer `1.2.0`: executor por familia `growth_form|navigate` — navigate renderiza **`<a href>` real**
  (middle-click/historial/copy-link/a11y de link; `rel='noopener noreferrer'` externo, `target=_blank`
  opt-in + affordance sr-only), telemetría `clicked` ANTES de navegar (ingest keepalive), pending
  single-dispatch accesible con recovery 4s, fail-closed ante kind desconocido. Sin migración; SoT de
  telemetría intacta (`action_kind` porta 4 valores). Evidencia: 9728 tests verdes + build prod +
  GVC `task-1431-growth-cta-actions` 1440/390 mirado. Docs: arch §27, funcional 1.6, manual 1.3,
  TRACKING-PLAN §CTAs, skill `greenhouse-growth-ctas` (2 espejos). **Rollout pendiente**: push/release +
  bundle 1.2.0 en hosts antes de publicar cualquier CTA con action nueva + smoke staging.

## 2026-07-18 — notion-platform V1.1: delegación y seguimiento gobernados

- Se versionó la skill `notion-platform` para Codex y Claude con gramática canónica de Notion Enhanced Markdown, renderer/linter determinista y templates de proyecto, tarea, subtarea recursiva, cierre y snapshot de estado.
- Se añadió el contrato multi-space `alias → space_id → data sources/token ref/property IDs/schema fingerprint`; los proyectos permanecen planos y las subtareas son una relación autorreferencial sin límite de profundidad de dominio, con ciclos y límites operativos controlados.
- Se canonizaron consultas live de vencimiento/progreso/resultado, ledger observado para historial y cierre incompleto cuando falta resultado o evidencia. También se retiró la inferencia insegura por prefijo de ID y se actualizó el inventario MCP/async.

## 2026-07-18 — RELEASE: TASK-1428 + TASK-1429 en producción + enforcement ON (d5db8b568)

- Release develop→main (PR #159 + fix CI #160; orquestador `29651461496`, manifest `released`):
  suppression/Tier B/kill switches (TASK-1428) y slide_in/Experience System (TASK-1429) LIVE en
  producción. `GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` ON en staging y Production —
  verificado E2E post-release con visitante sintético (dismiss → exclusión; fresco → ve).
- Incidente cazado y cerrado de raíz durante el release: los timeouts del CI (Test 8 min /
  Coverage 10 min) mataban runs SANOS exactamente en el techo — la suite creció a ~9.8k tests.
  Subidos a 14/17 (job deep 25) y validados en el mismo release. Dos releases previos ya habían
  rozado el mismo patrón.
- Ambas tasks movidas a `complete/`. Ventana de monitoreo 7d de `growth.cta.*` hasta 2026-07-25.
  La primera campaña interruptiva real (superficie/mensaje/momento) queda como decisión de negocio.

## 2026-07-18 — EPIC-030: Greenhouse Link Hub Control Plane

- Se aceptó la dirección arquitectónica para una capacidad link-in-bio multi-marca controlada íntegramente desde Greenhouse: aggregate/versiones/dominios/audit como SSOT y renderer público limitado a una proyección allowlisted.
- El MVP parte con `links.efeoncepro.com/efeonce` para Instagram y TikTok; luego extiende `links.efeoncepro.com/<slug>` y custom domains opcionales de clientes sobre el mismo `link_page_id`. Comprar un dominio corto no es precondición.
- Se crearon `EPIC-030` y las tasks `TASK-1433…1439` para foundation/API, renderer, cockpit, dominios, medición, piloto Efeonce y productización cliente. Cambio sólo documental: no modifica runtime, DNS, Vercel ni perfiles sociales.

## 2026-07-18 — TASK-1429: slide_in interruptivo + CTA Experience System del renderer (code complete)

- Primer placement interruptivo oficial del motor CTA: `slide_in` no modal (`role=complementary`,
  sin focus trap), trigger gobernado del bundle (8s en página o 35% de scroll), apertura pasiva sin
  robar foco, Escape + focus return, dismiss persistido antes de la salida visual (mecánica
  `@starting-style` + `allow-discrete`, cero dependencia de animationend). Density
  `full|condensed|peek` derivada del contenedor propio; appearances `default|spotlight|minimal`
  tokenizadas con fallback seguro.
- El renderer ahora envía la identidad pseudónima del visitante (session siempre; visitor durable
  solo con `consent-state="granted"`) — activa el loop real de suppression de TASK-1428 — y
  `greenhouse_cta_viewed` pasa a visibility-gated (corte de semántica registrado en TRACKING-PLAN).
- Tokens del bundle al piso 2026 (`light-dark()`, `color-mix(in oklch)`, `linear()`) con fallbacks
  `@supports` y nombres `--gh-cta-*` intactos. Preview `/growth/ctas` con matriz de density + demo
  vivo del overlay. GVC desktop+mobile mirado; 90 tests verdes. Sin campaña interruptiva publicada
  aún (decisión del operador).

## 2026-07-18 — TASK-1428: suppression + Tier B + kill switches del motor CTA (code complete, shadow)

- Migración aditiva `greenhouse_growth`: `cta_visitor_state` (estado pseudónimo por sujeto visitor/session,
  hash-only, consent-aware), `cta_exposure_rollup` (Tier B agregado por hora — la exposición jamás entra al
  ledger OLTP de conversión) y `cta_kill_switch_event` (append-only). Aplicada a la instancia; tablas dormidas
  hasta el deploy del código.
- Suppression/frequency capping server-side con taxonomía estable de razones y policy por versión
  (`suppression_policy_json`, defaults conservadores, fail-closed): dismiss cooldown, conversión verificada
  contra Growth Forms, caps per-CTA y global interruptivo con claim atómico multi-tab. Integrado al arbiter en
  **shadow** (`GROWTH_CTA_SUPPRESSION_ENFORCEMENT_ENABLED` default OFF; registrado en el ledger de flags).
- Kill switches global/per-surface operables **sin redeploy** (estado en DB, capability `growth.cta.pause`,
  API `GET/POST /api/admin/growth/ctas/kill-switch`, outbox `growth.cta.kill_switch_changed`, respuesta pública
  `engineState ok|killed`). Signals nuevos: `growth.cta.kill_switch_active`, `growth.cta.priority_collision`,
  `growth.cta.event_ingest_backpressure`.
- Evidencia: full suite 9684 tests verdes + build prod + SQL vivo contra PG real. Rollout pendiente
  (push → shadow-compare staging → enforcement → prod gradual); la task sigue `in-progress` por diseño.

## 2026-07-18 — EPIC-023: CTA Experience System incorporado al plan V1

- El renderer portable se gobierna como una sola primitive con ejes ortogonales: placement, experience kind,
  appearance (`style_variant`), density `full|condensed|peek` derivada por container query y `variant_id`
  reservado para experimentación futura. Se canonizaron anatomía contextual, evidencia visual real, estados,
  motion, reduced motion, asset failure, long content, overflow/CLS y paridad preview↔Think↔WordPress.
- `TASK-1429` ahora entrega el sistema de presentación y un único interruptivo `slide_in`; `TASK-1431` define el
  contrato perceptible por action kind sin action-driven skins; `TASK-1430` incorpora authoring secuencial y
  preview con el renderer real, sin WYSIWYG/page builder; `TASK-1428` explicita dismiss/re-entry/caps/kill
  semantics y `TASK-1427` conserva el baseline productivo.
- El ADR aclara que `slide_in` es no modal: no usa `aria-modal` ni focus trap; sí exige Escape, dismiss accesible,
  focus return tras interacción, suppression y safe-area. No hubo cambio de código, runtime, flags ni lifecycle.

## 2026-07-18 — Pillar Web agéntica publicado y enlazado bidireccionalmente

- Publicado el post WordPress `249387`, cuyo título final es `El fin de la web “solo para humanos”: cómo preparar tu sitio para los agentes de IA`, en
  `https://efeoncepro.com/aeo/web-agentica-agentes-ia/`: 99 bloques gobernados, 14 H2 + 6 H3,
  TOC de 20 destinos y siete infografías SVG art-directed light/dark y desktop/mobile.
- La portada `WAG-V01-C15` quedó integrada como featured `251553` y OG/Twitter `251554`; schema, canonical,
  robots, sitemap, archive card, media y caché fueron verificados en vivo.
- La relación pillar–servicio quedó bidireccional: tres enlaces del artículo a `/desarrollo-sitios-web/` y un
  enlace contextual de la landing hacia el artículo. QA Playwright en 1440 y 390 px confirma visibilidad,
  recuentos exactos y ausencia de overflow. No se inventó tracking `gh_cta_clicked`; su gobernanza sigue pendiente.
- Riesgo residual ajeno: Related Posts aún solicita una variante inexistente de la portada de Surround Discovery.
  El body y la portada de este artículo no tienen recursos rotos. Cierre durable:
  `docs/audits/public-site/2026-07-18-web-agentica-pillar-publication.md`.
- El H1 se amplió post-publicación para conservar la tesis original y sumar una promesa práctica explícita. El
  slug `web-agentica-agentes-ia` y el SEO title específico de Yoast permanecen estables; `og:title` y schema
  heredan el nuevo título editorial. Yoast 28 no imprime `twitter:title`, por lo que X/Twitter usa el OG fallback
  correcto y no se dejó metadata inerte. Snapshot: `/tmp/gh-post-249387-before-title-v2-20260718.json`.
- AEO (`156`) fue promovida de hija de Loop Marketing a categoría raíz por `wp_update_term()`. Yoast SEO Premium
  gestiona cuatro 301 explícitos —tres posts y el archive—; canonical, breadcrumbs, cards y sitemaps ya usan
  `/aeo/`. El enlace recíproco de la landing fue actualizado al canonical mediante `Elementor\Document::save()`.
- El cierre de canonización distribuyó y consolidó los aprendizajes en las skills espejo de WordPress, Content,
  Design e Image Generator, el runbook agentic, los operating models visuales y `PDR-015`. El manifest general
  ahora deriva WAG-V01 del submanifest C15 y no puede reintroducir la portada anterior; el template reusable
  incorpora los arquetipos v7 y separa `indexed_observed` del estado de entrega. Los dos enlaces internos del
  post que todavía dependían de 301 fueron reconciliados a sus canonicals, con snapshot, purge y nueva inspección
  final `post-deep-inspection-249387-2026-07-18T11-37-13+00-00.json`.

## 2026-07-18 — Método de portadas editoriales Efeonce y piloto Web Agéntica

- La portada del pillar privado `El fin de la web “solo para humanos”` llegó a su candidato seleccionado
  `WAG-V01-C15`: composición humano–interfaz–agente producida con `gpt-image-2`, calidad `high`, master
  `2048×1152` y un degradado continuo blanco cálido → azul luminoso → azul nave que reemplaza los planos
  triangulares. La topología de la mano robótica fue validada con referencia anatómica explícita para asegurar
  que el gesto corresponde al índice y no al dedo medio o meñique.
- Se generaron derivados featured `1600×900`, Open Graph `1440×756` y card cuadrada `1152×1152`, con score
  editorial `49/50`, hashes y provenance reproducible. Posteriormente se integraron y verificaron en vivo como
  media `251553` y `251554` del post WordPress `249387`.
- El aprendizaje quedó canonizado en `EDITORIAL_COVER_KEY_VISUAL_OPERATING_MODEL_V1.md` y enlazado desde las
  skills espejo de Content Marketing, Design Studio y AI Image Generator: metáfora editorial, roles de
  referencia, modelo exacto, iteración de una variable, gradientes narrativos, anatomía/cultura, scorecard,
  derivados, metadata y frontera de publicación. La metodología es estable; el lenguaje visual de la serie
  seguirá provisional hasta validarlo en dos portadas adicionales.

## 2026-07-18 — Artículo Agent Skills publicado

- Publicado `«I Know Kung Fu»: el momento Matrix de los Agent Skills` en el sitio público, preservando la voz de
  Julio Reyes y la tesis sobre convertir criterio organizacional en capacidades reutilizables.
- La pieza incluye tres infografías editoriales (dos con variantes desktop/mobile), featured/OG `1200×630`,
  metadescripción Yoast, focus keyphrase, metadata Open Graph/Twitter, canonical propio, robots indexables y
  disclosure editorial. El cierre live confirmó `200`, schema Article/Person, sitemap, archivos multimedia,
  fuentes y ausencia de duplicado WordPress/Think.
- Compatibilidad móvil: la variante KFU-V02 usa un fallback PNG `1000×1500` bajo `600px` después de detectar que
  un navegador móvil/in-app no interpretaba el SVG trazado. El SVG editable y la variante desktop permanecen;
  el render live quedó verificado por `currentSrc`, dimensiones naturales, captura y ausencia de overflow.
- La portada inicial fue reemplazada por la pieza aprobada `HI-YAAH!`: lluvia binaria, figura marcial y golpe de
  energía en formato `1200×630`. WordPress media `251552` quedó sincronizado como featured, Open Graph, Twitter
  y `primaryImage` del schema; caché purgada y readback público verificado.

## 2026-07-18 — Sistema editorial de infografías Efeonce y entrega SVG directa

- `content-marketing-studio` incorpora un canon Efeonce basado en siete precedentes SVG propios y benchmark
  Semrush: shell de marca estable, arquetipo variable por relación, paleta auditada, shareability y sello
  `efeoncepro.com` consumido desde Artifact Composer. La regla está espejada en Codex/Claude y enlazada desde
  `design-studio` y el carril Gutenberg/WordPress.
- El pillar privado `El fin de la web “solo para humanos”` aplica el sistema en siete infografías y 28 variantes
  SVG: la firma completa —fuente/fecha, wordmark oficial y URL— vive en el footer, nunca en el header. El draft
  `249387` quedó integrado con art direction light/dark y desktop/mobile, sin cambiar su estado a publicado.
- El pipeline deja de imponer PNG/WebP: separa source SVG de delivery SVG saneado y rasteriza solo por contenido,
  destino, seguridad o comparación de peso. Se agregaron contrato reusable, preset JSON y auditor CLI. En la
  muestra histórica, el SVG comprimido resultó ~2.1×–5.6× más liviano que WebP 1200 comparable. Comando canónico:
  `pnpm content:editorial-svg:audit -- <delivery.svg...>`.
- Se promovió el aprendizaje a un operating model reusable, documentación funcional y manual; las skills
  Content Marketing, Design Studio, SEO/AEO y Public Site WordPress ahora comparten footer-only, source/delivery,
  SEO de SVG, alternativas largas, legibilidad CSS, CLS, shareability por canal y raster social-safe.
- Una auditoría posterior corrigió el estado v7: el PASS existente cubre archivo/seguridad, pero no demuestra
  todavía legibilidad al ancho CSS, geometría del delivery trazado ni CLS/currentSrc. El draft sigue privado y
  queda `contextual_v7_qa_pending`; no se declara listo para publicación.

## 2026-07-18 — TASK-1340: Growth CTA Portable Renderer + capa GTM + gobernanza en Growth (code complete, shadow)

- Renderer portable `<greenhouse-cta>` (`src/growth-cta-renderer/**`, vanilla TS 22,6KB, hermano del
  forms-renderer): light DOM + ElementInternals, espejo del contrato v1 con parity test, capa visual
  rica y versátil (tokens `--gh-cta-*` re-tematizables, 3 style variants por dato
  default/spotlight/minimal, slot visual, dark/bare, container queries, skeleton anti-CLS,
  reduced-motion), action `open_growth_form` montando el `<greenhouse-form>` gobernado (carga lazy +
  join submission), fail-closed en público. Build esbuild → `public/growth-cta/renderer-<canal>.js`
  (prebuild). El loop GVC atrapó un drift real de paridad preview↔público → selectores unificados
  `:is(greenhouse-cta, .ghc-scope)` (paridad por construcción).
- **Capa GTM** (nota del operador): familia `greenhouse_cta_*` → dataLayer del host con allowlist
  dura sin PII (SoT server + espejo renderer + parity test), fila TRACKING-PLAN §CTAs con spec
  turnkey de tags GA4 para el flip y deslinde del rail legacy `gh_cta_clicked`; publish al container
  SOLO gobernado (workspace→preview→confirmación humana).
- **Gobernanza en el menú Growth** (nota del operador): `/growth/ctas` (viewCode
  `gestion.growth_ctas` + seed aplicada; roles operador growth) con inventario + lifecycle
  (publish/pause/resume, estado honesto con flag OFF) + surfaces + preview de variantes; GVC
  desktop/mobile mirado. Island Think `GrowthCtaDock.astro` commiteada en rama local de
  `efeonce-think` (PR a señal); embed WP documentado. Master flow EPIC-023 creado. Flag
  `GROWTH_CTA_ENGINE_ENABLED` sigue OFF: flip turnkey documentado en el ledger.

## 2026-07-18 — Contrato operativo GSC API, Platform Properties e indexación

- `seo-aeo` documenta capacidades/scopes reales de Search Console API, el retiro del sitemap ping, el límite de
  Indexing API y el canary obligatorio antes de asumir paridad API para Platform Properties.
- El runbook y las skills espejo del sitio público separan el gate de publicación (URL rastreable + sitemap con
  `lastmod` honesto) del seguimiento asíncrono de indexación. `TASK-1426` conserva la implementación pendiente.

## 2026-07-18 — Pillar privada de web agéntica preparada para revisión

- El post WordPress `249387`, `El fin de la web “solo para humanos”`, quedó actualizado como pillar de 4.448 palabras para soportar la landing de desarrollo web: definición citable, cuatro tipos de sitio, arquitectura compartida, matriz WebMCP/MCP/API, estado real de Chrome/WebMCP y del mercado, evals por capas, cadena de autoridad, doce pruebas de readiness, reconstrucción y FAQ.
- Content Factory pasa con 99 bloques semánticos, TOC de 20 destinos, featured/OG separados y siete diagramas de cuerpo. WAG-V04 agrega identidad, representación, alcance, confirmación y evidencia a WAG-V02/V03; el gate automático de geometría y la QA SVG light/dark desktop/mobile pasan sin texto fuera de superficie, imágenes rotas ni overflow. El artículo sigue en `draft`; publicación, enlace recíproco, purge y QA live requieren autorización humana separada.

## 2026-07-17 — TASK-1339: Growth CTA & Popup Engine — foundation `growth.cta` (code complete, shadow)

- Fundación server-side de la primera rebanada vertical de EPIC-023: schema `greenhouse_growth.cta_*`
  (definition/version con state machine + published inmutable por trigger; surface bindings con embed key;
  conversion ledger Tier A append-only con `trust_level`/`consent_source` + rechazos sin PII), primitive
  canónico `src/lib/growth/ctas/` (contracts `greenhouse-growth-cta-popup.v1`, arbiter server-side 0–1
  interruptivo, render-contract compiler browser-safe, action router SOLO `open_growth_form` vía el reader
  de Growth Forms sin duplicar schema/validación/consent, ingest forjable-hardened con cross-check
  `cta_version↔surface` + rate-limit + idempotencia), API pública render/events (CORS data-driven) y
  admin list/author/lifecycle/surfaces (capability fina por acción).
- Capabilities `growth.cta.{read,author,publish,pause}` (catalog + registry + grants espejo growth.forms +
  coverage verde; `pause` separada = freno de emergencia sin autoridad de publish). 4 reliability signals
  `growth.cta.*` cableadas al overview. Outbox `growth.cta.version_lifecycle_changed` + `surface_registered`
  v1 in-tx (EVENT_CATALOG delta). Primer CTA real `ai-visibility-report-followup` publicado con bindings
  `wordpress` + `think`; smoke e2e verde contra PG dev (render sin leak de policy, ingest idempotente,
  forja rechazada y persistida). Flag `GROWTH_CTA_ENGINE_ENABLED` default OFF (ledger); flip coordinado
  con TASK-1340 (renderer), que queda desbloqueada por el contrato publicado.

## 2026-07-17 — TASK-1276: AEO Operator View (Growth + Account 360) — code complete local

- Vista operador del programa AEO (nodos S8-S12 del EPIC-020), implementada desde el mockup aprobado de
  Claude Design "AEO Operator View": cockpit `/growth/aeo` (KPIs + tabla score/tier/último run + filter
  pills por motion + targets de cross-sell), detalle `/growth/aeo/[organizationId]` (banda de cliente +
  reuso del workbench masterDetail de TASK-1248 vía extensiones aditivas `chrome`/`plan`), control de
  estado del Plan AEO (5 estados TASK-1275, reason obligatorio en blocked/dismissed, a11y completo),
  picker de run operador agrupado por motion (TASK-1277), composer de envío + Lead HubSpot con consent
  gate (TASK-1279, flag OFF) y facet "AEO" en el Organization Workspace (Account 360).
- viewCode `gestion.growth_aeo` + seed migration (roles operador; NUNCA client\_\*) + nav Growth; el facet
  reusa la capability `report.read_operator` (sin capability nueva). Bugfix raíz en el store del grader
  (timestamptz llegaba como `Date` bajo cast `as string` → 500 con data real; normalizado a ISO — también
  cubría a `/aeo` cliente). GVC desktop+mobile mirado con data real (Sky Airlines/Grupo Berel), scroll
  horizontal 0. Estado: code complete, rollout pendiente (push/staging/prod por instrucción del operador).

## 2026-07-17 — Cierre de aprendizaje editorial del Customer Agent ANAM

- El runbook agentic de blogposts incorpora un scan de lenguaje de lifecycle, clasificación explícita del alcance
  de cada claim, gate problem-aware del primer viewport y el estado honesto del tooling de publicación/QA todavía
  acotado por caso.
- El manifest y el sistema visual del artículo quedaron sincronizados con los assets v2 y la publicación live.
  `content-marketing-studio` añade `explanatoryDelta` como gate ejecutable para evitar infografías decorativas o
  redundantes; la regla se sincronizó para Codex/Claude sin convertir la estética HubSpot en default.
