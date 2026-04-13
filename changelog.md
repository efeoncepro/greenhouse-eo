# changelog.md

## 2026-04-13

### 2026-04-13 — TASK-400 alinea el contrato canónico de Home y deja base para homes distintas por tipo de usuario

- `/` y `/auth/landing` ya no dependen de `|| '/dashboard'`; ambos consumen el `portalHomePath` resuelto por la misma policy runtime.
- `src/lib/tenant/resolve-portal-home-path.ts` ahora centraliza:
  - aliases legacy (`/dashboard`, `/internal/dashboard`, `/finance/dashboard`, `/hr/leave`, `/my/profile`)
  - policy explícita de home por tipo (`client_default`, `internal_default`, `hr_workspace`, `finance_workspace`, `my_workspace`)
  - una base extensible para soportar homes diferenciadas por tipo de usuario sin reintroducir drift en guards, auth y shell
- provisioning, session auth, agent auth, navegación, shortcuts, notifications y `view-access-catalog` quedaron alineados a `/home` como startup contract canónico.
- `/dashboard` se mantiene como ruta legacy/compatibilidad, pero deja de ser el fallback estructural del portal.
- Se agregó `scripts/backfill-portal-home-contract.ts` para normalizar `default_portal_home_path` en PostgreSQL y BigQuery bajo control explícito.
- Se agregó regresión focalizada para evitar que `/dashboard` vuelva a romper cuando falten quality/delivery signals.

### 2026-04-13 — Se agrega `TASK-400` para gobernar el contrato canónico de Home del portal

- Se creó `docs/tasks/to-do/TASK-400-portal-home-contract-governance-entrypoint-cutover.md`.
- La task formaliza que el problema no es solo un bug de `/dashboard`, sino drift de contrato entre root routing, auth landing, provisioning, session resolution, agent auth, guards y navegación.
- El backlog ahora exige resolver esto como lane enterprise: policy canónica de startup home, compatibilidad legacy gobernada para `/dashboard`, normalización/backfill de valores persistidos y validación de blast radius.

### 2026-04-13 — Dashboard SSR headless deja de arrastrar `react-pdf` en rutas autenticadas

- Se corrigieron los imports compartidos del layout para que `BrandWordmark` no entre por el barrel `@/components/greenhouse`.
- `src/components/greenhouse/index.ts` ya no exporta `CertificatePreviewDialog`, porque `react-pdf/pdfjs` toca `DOMMatrix` al evaluarse en Node SSR.
- El fix protege el render HTML autenticado de requests headless sin cambiar rutas, payloads, auth ni semántica visible del portal.

### 2026-04-13 — Se registra el programa de 7 tasks robustas para Management Accounting

- Se agregaron `TASK-392` a `TASK-398` bajo `docs/tasks/to-do/` para convertir la arquitectura nueva de Management Accounting en backlog ejecutable.
- El programa queda ordenado en 7 lanes robustas: actual foundation, period governance, scope expansion, planning engine, variance/forecast/control tower, financial costs integration y enterprise hardening.
- `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedaron actualizados para reservar los IDs y dejar visible la secuencia de ejecución.

### 2026-04-13 — Management Accounting queda formalizado como capability canonica separada de contabilidad legal

- Se agregó `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`.
- La arquitectura ahora deja explícito que el siguiente módulo financiero a institucionalizar en Greenhouse es `Management Accounting`, no un módulo de contabilidad legal o de partida doble.
- La lectura funcional recomendada queda fijada como `contabilidad de costos`, mientras que la surface product recomendada sigue siendo `Finance > Economia operativa`.
- El documento nuevo también deja formalizado qué falta para que la capability sea enterprise: budget, variance, forecast, fully-loaded labor cost, P&L por BU, cierre gobernado, explainability, overrides, RBAC, observabilidad, data quality, runbooks, testing de negocio, policy map y roadmap de madurez.
- `docs/README.md` y `project_context.md` quedaron alineados para que la decisión ya no viva solo en un archivo aislado.

### 2026-04-13 — Lifecycle de tasks endurecido para evitar cierres a medias

- `docs/tasks/TASK_TEMPLATE.md` ahora deja el cierre como parte explícita de Definition of Done: sincronizar `Lifecycle`, mover el archivo y actualizar `docs/tasks/README.md`.
- `docs/tasks/TASK_PROCESS.md` ahora obliga a tomar ownership moviendo la task a `in-progress/` antes de empezar y prohíbe reportarla como cerrada mientras siga viva allí.
- `AGENTS.md`, `CLAUDE.md` y `docs/tasks/README.md` quedaron alineados con la misma regla dura para que el protocolo no dependa de una sola fuente.

### 2026-04-13 — TASK-039 y TASK-040 quedan rescatadas con roles distintos

- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md` ahora queda explícita como referencia legacy de visión y no como baseline técnica ejecutable.
- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md` ahora queda formalizada como baseline técnica/operativa del Data Node sobre el runtime actual.
- `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedaron alineados para que `039` y `040` ya no compitan como si fueran la misma lane.

### 2026-04-13 — TASK-156 ahora incluye explícitamente SLI además de SLO y SLA

- `docs/tasks/to-do/TASK-156-sla-slo-per-service.md` ahora define la cadena correcta `SLI -> SLO -> SLA` por servicio.
- La lane deja explícito que primero se modela la métrica observable, luego el objetivo operativo y finalmente el compromiso contractual.
- La task ahora exige también CRUD en Admin Center para setear y gobernar esas definiciones por servicio.
- `docs/tasks/TASK_ID_REGISTRY.md` quedó alineado con el título `SLI/SLO/SLA Contractual per Service`.

### 2026-04-13 — TASK-031 queda rebaselined al runtime actual

- `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md` fue reescrita al template canónico vigente.
- La lane deja de asumir BigQuery directo y fija `greenhouse_serving.ico_member_metrics` como source cuantitativa canónica para evaluaciones.
- `TASK-029` pasa a modelarse como integración soft: el módulo puede existir sin goals materializados y degradar a `null` en ese componente del summary.
- `docs/tasks/TASK_ID_REGISTRY.md` quedó alineado con el título canónico `HRIS Performance Evaluations`.

### 2026-04-13 — TASK-025 queda rescatada como policy canónica de FTR para Payroll

- `docs/tasks/to-do/TASK-025-hr-payroll-module-delta-ftr.md` fue reescrita para dejar de ser un brief destructivo de implementación.
- La lane ahora queda formalizada como decisión estratégica de compensación variable: si `FTR` entra a Payroll, debe hacerlo como rollout compatible con el runtime actual y no como rename de `RpA`.
- `docs/tasks/TASK_ID_REGISTRY.md` quedó alineado con el título canónico `Payroll FTR Bonus Policy Decision`.

### 2026-04-13 — TASK-027 queda rebaselined al runtime actual

- `docs/tasks/to-do/TASK-027-hris-document-vault.md` fue reescrita al template canónico vigente.
- La lane deja de asumir bucket propio, `file_url` y signed URLs específicas del dominio; ahora consume explícitamente la foundation shared de `private assets` cerrada en `TASK-173`.
- La task ahora define con más claridad su frontera contra `TASK-313`: `Document Vault` cubre documentos laborales/compliance y no debe duplicar certificaciones profesionales ni evidencia reputacional.
- `docs/tasks/TASK_ID_REGISTRY.md` quedó alineado con el título canónico `HRIS Document Vault`.

### 2026-04-13 — TASK-381 documenta el backlog de hardening enterprise de la Structured Context Layer

- Se creó `docs/tasks/to-do/TASK-381-structured-context-layer-enterprise-hardening.md` como follow-on directo de `TASK-380`.
- La task deja explícito qué falta para que la SCL sea una capability enterprise reusable: registry de `context_kind`, readers con enforcement real, lifecycle de retention/quarantine, observabilidad, segundo piloto y promotion criteria.
- `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron actualizados para reservar `TASK-381` y dejar `TASK-382` como siguiente ID disponible.

### 2026-04-13 — TASK-380 queda materializada también en la base compartida

- La migración `20260413113902271_structured-context-layer-foundation.sql` ya fue aplicada sobre el shared dev DB desde `develop`.
- `src/types/db.d.ts` ahora expone las tablas de `greenhouse_context`.
- Con esto se cierra el gap operativo que quedaba entre foundation en código y materialización real en PostgreSQL.

### 2026-04-13 — TASK-380 materializa la foundation runtime de Structured Context Layer

- Se agregó la migración `20260413113902271_structured-context-layer-foundation.sql` para crear `greenhouse_context` con documentos, versiones, quarantine y guardrails base.
- Se agregó `src/lib/structured-context/` como runtime compartido para tipos, validación, hashing, persistencia y lectura.
- La taxonomía inicial ya incluye validadores reales para `event.replay_context`, `agent.audit_report` y `agent.execution_plan`.
- `src/lib/sync/reactive-run-tracker.ts` ahora queda conectado como primer piloto de escritura/lectura usando `event.replay_context`.
- El piloto está endurecido para no romper el worker reactivo si la capa sidecar falla; registra warning y degrada sin cortar el flujo principal.
- La aplicación de la migración en el shared dev DB quedó pendiente porque esa base ya tiene aplicada una migración de `TASK-379` que esta rama todavía no trae.

### 2026-04-13 — Modelo operativo multi-agent con worktrees formalizado

- Se agregó `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`.
- El repo ahora deja explícito cómo trabajar con varios agentes en paralelo sin cambiar la rama del checkout ocupado por otro agente.
- La convención nueva reserva el workspace actual para el agente owner y manda a los agentes adicionales a worktrees aislados con rama propia.

### 2026-04-13 — Structured Context Layer formalizada como foundation arquitectónica

- Se agregó `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md` para gobernar el uso de JSONB/contexto estructurado en Greenhouse.
- La nueva capa propone `greenhouse_context` como schema sidecar para documentos tipados, versionados y tenant-safe.
- El objetivo es soportar integraciones, replay reactivo, auditoría operativa y memoria de trabajo para agentes sin degradar el modelo relacional como fuente de verdad.
- Se sembró `TASK-380` como lane de implementación para materializar esta foundation.
- La documentación ahora deja una regla explícita para agentes: verdad canónica -> relacional; contexto flexible reusable en PostgreSQL -> `JSONB`; `JSON` solo como excepción cuando importa preservar representación cruda.
- La foundation también quedó endurecida a nivel enterprise en la documentación: clasificación de datos, redacción, retención, access scope, idempotencia, límites de tamaño y quarantine de documentos inválidos.

### 2026-04-13 — HES ahora se registra como documento recibido del cliente

- `Finance > HES` ya no deja una HES nueva presentada como `Borrador` cuando el flujo principal es registrar una hoja recibida.
- Los estados visibles quedan alineados al proceso real: `Recibida`, `Validada` y `Observada`.
- El módulo deja de comunicar acciones outbound como si la HES se enviara al cliente; ahora expresa recepción y validación interna.

### 2026-04-13 — Las OC ya permiten cargar o reemplazar su respaldo después del registro

- `Finance > Purchase Orders` ahora expone una acción por fila para completar o reemplazar el respaldo de una OC ya creada.
- El documento sigue perteneciendo a la OC; las HES vinculadas continúan heredándolo en vez de guardar un PDF propio.
- Cuando una OC no tiene respaldo, `Finance > HES > Registrar HES` ahora lo comunica con copy explícito y dirige operativamente a completar ese documento en la OC.

### 2026-04-13 — HES ahora reutiliza contactos del cliente y hereda respaldo desde la OC vinculada

- `Finance > HES > Registrar HES` ahora carga contactos asociados solo al cliente seleccionado, igual que el flujo de OC.
- El contacto principal se elige desde un selector y el email se completa desde ese vínculo; el fallback manual queda como excepción explícita.
- La HES ya no pide `URL del documento (PDF)` como campo editable.
- Si la HES se vincula a una OC con respaldo cargado, hereda ese documento automáticamente.

### 2026-04-13 — Finance canonical blinda el lookup de client profiles para evitar `client_id` ambiguo

- Se corrigió `src/lib/finance/canonical.ts` para calificar con alias `cp.` los filtros del lookup de `client_profiles` cuando el resolver une `greenhouse_core.spaces`.
- El ajuste evita el error SQL `column reference "client_id" is ambiguous` que estaba rompiendo el registro de órdenes de compra.
- Se agregó regresión en `src/lib/finance/canonical.test.ts` y se revalidó la route de purchase orders.

### 2026-04-13 — Finance OC ahora prioriza contactos asociados al cliente

- `Finance > Purchase Orders > Registrar OC` ahora ofrece un selector de contactos vinculado al cliente elegido.
- El dropdown se nutre primero de memberships de la organización del cliente; si no hay contactos financieros explícitos, cae a miembros de esa misma organización con email.
- Solo si no hay memberships útiles, el flujo reutiliza el snapshot legacy `financeContacts` del cliente.
- El ingreso manual sigue disponible como excepción explícita con `No encuentro el contacto`.

### 2026-04-13 — Nueva lane `MINI-###` para mejoras chicas planificadas

- Se agregó `docs/mini-tasks/` con pipeline `to-do / in-progress / complete`.
- La nueva lane sirve para cambios pequeños y locales que no conviene dejar solo en chat, pero que tampoco justifican una `TASK-###` completa.
- La convención quedó formalizada en `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`.
- Se sembró el primer brief: `MINI-001` para convertir el contacto de OC en selección asociada al cliente.

## 2026-04-11

### 2026-04-11 — Seed operativo para el piloto Kortex sobre sister-platform consumers

- Se agregó `src/lib/sister-platforms/consumers.ts` para provisionar y actualizar credenciales dedicadas de sister platforms con token hasheado y rotación opcional.
- Se agregó `scripts/seed-kortex-sister-platform-pilot.ts` y el comando `pnpm seed:kortex-pilot`.
- El seed deja listo el primer carril operativo Kortex-side en Greenhouse:
  - consumer dedicado `Kortex Operator Console`
  - binding `kortex` con `external_scope_type='portal'`
  - defaults seguros (`binding=draft`, `consumer=active`, `allowed scopes=client,space`)
- El token solo se vuelve a imprimir cuando el consumer se crea o cuando se solicita una rotación explícita.

### 2026-04-11 — Local Next builds pasan a usar output aislado fuera de Vercel/CI

- `pnpm build` ya no reutiliza `.next` por defecto en local; ahora usa `.next-local/build-<timestamp>-<pid>` mediante `scripts/next-dist-dir.mjs`.
- `pnpm start` sigue funcionando sobre el ultimo build exitoso gracias al puntero `.next-build-dir`.
- El puntero del build ya no se escribe antes de compilar; ahora solo se actualiza despues de un build exitoso.
- El cambio reduce locks y corrupciones del output cuando multiples agentes o procesos construyen el mismo repo a la vez.
- Rollback temporal disponible via `GREENHOUSE_FORCE_SHARED_NEXT_DIST=true pnpm build`.

### 2026-04-11 — TASK-376 endurece la surface read-only para sister platforms

- Se agregó la migración `sister-platform-read-surface-hardening` para introducir:
  - `greenhouse_core.sister_platform_consumers`
  - `greenhouse_core.sister_platform_request_logs`
  - la secuencia `EO-SPK-####`
- Se agregó `src/lib/sister-platforms/external-auth.ts` como capa reusable para:
  - auth por consumer token
  - resolución obligatoria de binding activo
  - allowlist de scopes por consumer
  - rate limiting por consumer
  - request logging con `requestId`
- Se agregó el lane read-only endurecido:
  - `GET /api/integrations/v1/sister-platforms/context`
  - `GET /api/integrations/v1/sister-platforms/catalog/capabilities`
  - `GET /api/integrations/v1/sister-platforms/readiness`
- La spec `TASK-376` quedó corregida para apuntar al carril externo real del repo (`/api/integrations/v1/*`) en vez de un namespace inexistente.
- La migración quedó aplicada vía `pnpm pg:connect:migrate` y `src/types/db.d.ts` se regeneró en el mismo lote.

### 2026-04-11 — TASK-375 baja la foundation runtime para sister-platform bindings

- Se agregó la migración `sister-platform-bindings-foundation` para introducir `greenhouse_core.sister_platform_bindings` y la secuencia `EO-SPB-####`.
- Se agregó `src/lib/sister-platforms/bindings.ts` como capa reusable para:
  - listar y leer bindings
  - crear y actualizar lifecycle
  - resolver `external scope -> greenhouse scope`
- El contrato soporta scopes `organization`, `client`, `space` e `internal`, sin hardcodear la semántica a Kortex.
- Se agregaron rutas admin nuevas bajo `/api/admin/integrations/sister-platform-bindings*`.
- `/admin/integrations` ahora muestra una lectura operativa de los bindings sister-platform dentro de la gobernanza existente.
- `pnpm build`, `pnpm lint` y `pnpm pg:connect:migrate` quedaron cerrados; la migración ya está aplicada y `src/types/db.d.ts` regenerado.

### 2026-04-11 — TASK-374 queda cerrada como umbrella de programa, no como runtime

- `TASK-374` se corrigió contra la realidad del repo y quedó cerrada como umbrella documental/programática.
- El audit dejó explícito que hoy la surface externa viva es `/api/integrations/v1/*`, mientras que `API v1` sister-platform-neutral y `MCP` siguen pendientes.
- La continuación correcta del programa queda concentrada en `TASK-375`, `TASK-376` y `TASK-377`.

### 2026-04-11 — Greenhouse formaliza contrato con sister platforms y anexo Kortex

- Se agregó la spec `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` para fijar que Greenhouse y las plataformas hermanas del ecosistema se integran como `peer systems`.
- Se agregó el anexo `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md` para definir el primer bridge concreto con Kortex como consumer de operational intelligence Greenhouse.
- El backlog operativo ahora incluye `TASK-374` a `TASK-377` para bajar el contrato a foundation reusable, read-only surfaces y primer carril Kortex.

### 2026-04-11 — Skill local para auditoría de microinteracciones Greenhouse

- Se agregó la skill de Codex `greenhouse-microinteractions-auditor`.
- La skill centraliza heurísticas para motion, reduced motion, loading, empty states, validation, feedback transitorio y accesibilidad dinámica sobre el stack real del portal.
- El detalle externo y el inventario del repo quedaron comprimidos en `references/microinteraction-playbook.md` para mantener el prompt operativo corto.

### 2026-04-11 — Bloque de implementación creado para `Assigned Team Enterprise Program`

- Se creó el backlog ejecutable `TASK-357` a `TASK-366` para bajar a runtime la arquitectura de `Equipo asignado`.
- El programa quedó separado en:
  - semantic layer y portfolio readers
  - field-level access
  - shared UI primitives/cards
  - main module runtime
  - talent detail drawer
  - capacity/health bridge
  - risk/continuity alerts
  - cross-surface consumers
  - observability/export/hardening
- `docs/tasks/README.md` ahora deja `TASK-367` como siguiente ID disponible.

### 2026-04-11 — Arquitectura canónica para `Equipo asignado` cliente-facing enterprise

- Se agregó la spec `GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md` para formalizar `Equipo asignado` como capability enterprise de visibilidad de talento contratado.
- La nueva arquitectura fija que:
  - la surface debe anclarse a `Organization / Space + assignments`
  - el módulo combina composición, capacidad, capability profile `client-safe` y health signals resumidas
  - no debe absorber `ATS`, `HR`, `Payroll` ni `Staff Augmentation` admin
  - el shape target ya no es un roster simple, sino un `ClientWorkforcePortfolio` con drilldown por `space` y persona
- Deltas breves aplicados a:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
  - `project_context.md`
  - `docs/README.md`

### 2026-04-11 — Nómina proyectada aclara retención SII para honorarios Chile

- `Payroll > Nómina proyectada` ahora deja explícito cuando un colaborador `honorarios` en CLP tiene `Retención SII`, en vez de parecer un descuento fantasma.
- La vista ya no muestra AFP, salud y cesantía en `0` junto a un total negativo para ese caso.
- El cálculo no cambió: la branch de `honorarios` sigue reteniendo según `getSiiRetentionRate(year)`.

### 2026-04-11 — Payroll Deel ahora registra conectividad como haber canónico

- `Payroll > Compensaciones` ya no oculta `Bono conectividad` para contratos `Contractor (Deel)` o `EOR (Deel)`.
- La conectividad Deel vuelve a usar el carril canónico `remoteAllowance` en vez de obligar a modelarla como `bono fijo` libre.
- El motor de cálculo ahora suma esa conectividad al bruto/neto referencial de entries Deel, manteniendo a Deel como owner del pago final y compliance.
- Se centralizó una policy compartida por tipo de contrato para evitar que la UI y el cálculo vuelvan a divergir.

### 2026-04-11 — Arquitectura canónica de Hiring / ATS para demanda y fulfillment de talento

- Se agregó la spec `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` para modelar `Hiring / ATS` como capa canónica de fulfillment de talento en Greenhouse.
- La nueva arquitectura fija que:
  - `TalentDemand` es el objeto raíz de demanda
  - `HiringApplication` es la unidad transaccional del pipeline
  - `HiringHandoff` es el contrato explícito hacia HR, assignments o Staff Aug
  - el dominio debe cubrir demanda interna y de cliente, tanto `on_demand` como `on_going`
  - la landing pública de vacantes debe resolver como lens público del mismo `HiringOpening`, no como módulo separado
- Deltas breves aplicados a:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `Greenhouse_HRIS_Architecture_v1.md`
  - `project_context.md`
  - `docs/README.md`

### 2026-04-11 — TASK-313: Skills y certificaciones — perfil profesional, verificación Efeonce y CRUD

- **3 migraciones aplicadas**: social links en `members` (7 URLs + `about_me`), `visibility` en `member_skills`, tabla `member_certifications` con verificación y FK a assets
- **Servicio de certificaciones**: CRUD + verificación/rechazo + eventos outbox en `src/lib/hr-core/certifications.ts`
- **Skills extendido**: funciones self-service (upsert, remove, verify, unverify sin space), visibility field
- **10 API routes**: self-service (`/api/my/skills`, `/api/my/certifications`, `/api/my/professional-links`) + admin con verificación
- **4 componentes UI**: `SkillsCertificationsTab` (modo self/admin), `CertificatePreviewDialog`, `ProfessionalLinksCard`, `AboutMeCard`
- **Integración**: nueva tab "Skills y certificaciones" en `/my/profile` y `/admin/users/[id]`
- **Assets**: contexto `certification_draft`/`certification` con retención `hr_certification` y access control
- **Nomenclatura**: sección `GH_SKILLS_CERTS` con todos los labels en español
- **Badge**: reutiliza `VerifiedByEfeonceBadge` e iconos `BrandLogo` existentes
- **Política de visibilidad**: `internal` (self+admin) vs `client_visible` (requiere verified)
- **Docs actualizados**: `GREENHOUSE_UI_PLATFORM_V1.md`, `Greenhouse_HRIS_Architecture_v1.md`
- **Cross-impact**: delta notes en 9 tasks downstream (TASK-314 a TASK-320, TASK-332, TASK-334)

### 2026-04-11 — Persona vs entidad legal formalizado para compensación ejecutiva y cuenta accionista

- Se agregó una spec de arquitectura para modelar relaciones explícitas `persona ↔ entidad legal` sin colgarlas de `user`, `member` o `space`.
- La nueva fuente canónica fija que:
  - `identity_profile` sigue siendo la raíz humana
  - `Efeonce Group SpA` debe leerse como contraparte jurídica/económica
  - `Cuenta accionista` y `compensación ejecutiva` son carriles distintos
  - `Payroll` materializa nómina formal, pero no agota la semántica de toda compensación ejecutiva
- Documentos alineados:
  - `GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
  - deltas breves en `360 Object Model`, `Person ↔ Organization`, `Finance` y `HR Payroll`

### 2026-04-11 — Leave vuelve a resolver avatars desde la identidad canónica

- `HR > Permisos` y `My Leave` ya no dependen de un avatar nulo en el store PostgreSQL.
- La lectura de solicitudes ahora reutiliza la misma resolución canónica de persona/avatar que el resto del ecosistema:
  - `greenhouse_serving.person_360`
  - `resolveAvatarUrl()`
  - fallback defensivo a `members.avatar_url` cuando la persona todavía no viene enriquecida por `person_360`
- El detalle de solicitud y la respuesta inmediata tras crear una solicitud también devuelven `memberAvatarUrl` coherente, evitando que la UI caiga a iniciales por un bug del backend.

### 2026-04-11 — Organigrama con lectura por liderazgo y workspace visible en menú

- `HR > Organigrama` ahora puede alternar entre lectura estructural por áreas y una lectura `Líderes y equipos` centrada en personas responsables.
- La lectura por liderazgo reutiliza el mismo scope y foco por persona, pero resume las áreas asociadas como metadata dentro del nodo del líder para no mezclar estructura y supervisoría en un solo grafo.
- `Mi equipo` y `Aprobaciones` quedaron visibles en el menú lateral para perfiles HR/admin con identidad interna vinculada, además del caso supervisor-aware existente.

## 2026-04-10

### 2026-04-10 — Organigrama estructural con contexto heredado

- `HR > Organigrama` ahora resuelve la ubicación visual de cada persona desde estructura de áreas, incluso cuando todavía no existe `department_id`.
- Los responsables de área quedan representados dentro del nodo del departamento y dejan de aparecer duplicados como personas hijas de su propia área.
- La vista ahora explica los casos pendientes como `Contexto heredado` y conserva breadcrumb + contexto de área sin convertir la cadena de supervisoría en aristas del organigrama.

### 2026-04-10 — Hierarchy and org chart audit issues closed

- `HR > Jerarquía` y la ficha HR ya leen la misma supervisoría vigente, evitando que la persona vea un supervisor distinto según la surface.
- El historial auditado vuelve a exponer correctamente `effectiveTo` para líneas cerradas.
- `Cambiar supervisor` y `Reasignar reportes` ahora explican de forma visible cuándo falta la razón obligatoria.
- El reemplazo de delegaciones pasó a ser atómico y la reasignación masiva ya respeta la fecha efectiva elegida.

### 2026-04-10 — Organigrama estructural + sync de departamentos + menú supervisor-aware

- `HR > Organigrama` dejó de dibujar reporting lines como si fueran estructura: ahora materializa áreas padre/hija desde `greenhouse_core.departments` y cuelga a cada persona desde su adscripción vigente.
- El reader del organigrama usa fallback estructural para responsables de área cuando `members.department_id` todavía no refleja el cambio, evitando que el nodo siga apareciendo “sin departamento”.
- `HR > Departamentos` ahora sincroniza `members.department_id` al asignar o cambiar `head_member_id`, para que el responsable del área no quede desacoplado de su adscripción canónica.
- El menú lateral ya deja visible `Organigrama` para supervisoría limitada cuando la persona aterriza en el workspace supervisor, alineando navegación con page/API.

### 2026-04-10 — Hierarchy follow-up hardening for staged changes and org chart data

- `HR > Jerarquía` corrige un bug donde una línea futura abierta podía bloquear o invisibilizar un cambio de supervisor con fecha efectiva hoy.
- `GET /api/hr/core/hierarchy/history` deja de fallar al combinar historial y delegaciones cuando PostgreSQL entrega timestamps como objetos `Date`.
- `HR > Organigrama` ahora puede mostrar el departamento desde el roster enriquecido aunque la snapshot de jerarquía todavía venga sin `departmentName`.
- La UX de delegaciones ahora deja explícito que cada supervisor mantiene solo una delegación primaria activa a la vez.

### 2026-04-10 — Org chart explorer materialized over canonical hierarchy

- Se materializó `HR > Organigrama` en `/hr/org-chart` como explorer visual de lectura sobre la jerarquía canónica.
- Nuevo handler agregado:
  - `GET /api/hr/core/org-chart`
- La capability reutiliza:
  - `greenhouse_core.reporting_lines`
  - `members.reports_to_member_id` como compat snapshot
  - subtree visibility derivada desde supervisor scope
  - enrichments de People para avatar, cargo y contexto del nodo
- Se integró `@xyflow/react` con layout jerárquico `dagre` para resolver zoom, pan, foco por persona y quick actions sin convertir la surface en editor.
- `HR > Jerarquía` sigue siendo la surface administrativa; `Organigrama` queda como vista de lectura broad HR/admin y subtree-aware para supervisors.

### 2026-04-10 — Supervisor workspace and approvals queue materialized

- Se materializó el workspace operativo de supervisor sobre la capability ya cerrada de subtree scope:
  - `/hr` ahora funciona como landing supervisor-aware
  - `/hr/team` expone la vista `Mi equipo`
  - `/hr/approvals` expone la cola operativa de approvals visibles
- Nuevo handler agregado:
  - `GET /api/hr/core/supervisor-workspace`
- La nueva surface reutiliza:
  - `greenhouse_core.reporting_lines`
  - delegaciones `approval_delegate`
  - `greenhouse_hr.workflow_approval_snapshots`
  - People scoped y leave scoped existentes
- HR/admin mantiene su experiencia amplia en `/hr`; el supervisor limitado ya no cae en el limbo entre “ve demasiado” y “no ve nada”.

### 2026-04-10 — Supervisor scope subtree-aware for People and Leave

- Se agregó `src/lib/reporting-hierarchy/access.ts` para derivar supervisor scope desde `greenhouse_core.reporting_lines` y delegaciones `approval_delegate`.
- Greenhouse ya no necesita convertir a un supervisor en `hr_manager` para abrir surfaces limitadas:
  - `/people` puede funcionar en modo supervisor
  - `/hr/leave` puede abrirse sin otorgar `routeGroup: hr`
- El scope derivado recorta:
  - roster de `/api/people`
  - detalle y subroutes relevantes de `/api/people/[memberId]/*`
  - tabs visibles de Person View para supervisoría limitada
- HR/admin mantienen acceso amplio; supervisoría no se modela como role code nuevo.
- Se dejó explícito en arquitectura y documentación funcional que `/hr/approvals` sigue siendo un surface futuro del programa, mientras la capability operativa actual vive en `/hr/leave` + People scoped.

### 2026-04-10 — Approval authority snapshots for HR workflows

- Se agregó la lane compartida `src/lib/approval-authority/*` para resolver autoridad de aprobación por dominio y congelarla por etapa.
- Nueva tabla `greenhouse_hr.workflow_approval_snapshots` para snapshots auditables de:
  - supervisor formal
  - aprobador efectivo por delegación
  - fallback de dominio
  - override administrativo
- `HR > Permisos` ya consume el resolver canónico en submit/review:
  - delegados activos pueden revisar solicitudes pendientes de supervisor
  - top-of-tree escalan a HR por snapshot en vez de heurística inline
  - HR override queda auditado
- Las notificaciones de leave ahora siguen al aprobador efectivo del snapshot y usan los fallback roles de la etapa activa.

### 2026-04-10 — HR hierarchy admin surface completed

- Nuevo módulo `HR > Jerarquía` (`/hr/hierarchy`) para administrar supervisoría formal, delegaciones temporales y auditoría de cambios.
- Nuevos endpoints dedicados:
  - `GET /api/hr/core/hierarchy`
  - `GET /api/hr/core/hierarchy/history`
  - `POST /api/hr/core/hierarchy/reassign`
  - `GET/POST/DELETE /api/hr/core/hierarchy/delegations`
- La jerarquía ya no depende de surfaces prestadas como `Departments`; usa `greenhouse_core.reporting_lines` como source of truth y `operational_responsibilities` para `approval_delegate`.
- Se agregó soporte operativo para:
  - cambio individual de supervisor con motivo
  - reasignación de reportes directos
  - creación y revocación de delegaciones temporales
  - historial auditado visible de `reporting_lines`
- Se endureció el runtime con una migración de grants sobre `greenhouse_core.reporting_lines`, dejando la foundation de `TASK-324` realmente consumible por UI y APIs.

### 2026-04-10 — Shared icon foundation with selective Flaticon support

- Se integró `@flaticon/flaticon-uicons` como fuente complementaria de iconografía, cargada de forma selectiva desde `src/app/layout.tsx`:
  - `brands/all.css`
  - `regular/rounded.css`
- Nuevo primitive compartido:
  - `src/components/greenhouse/GhIcon.tsx`
  - `src/components/greenhouse/gh-icon-registry.ts`
- `BrandLogo` ahora cubre también redes profesionales comunes (`LinkedIn`, `Behance`, `Dribbble`, `X`, `Threads`, `Twitter`) sin obligar a inventar assets nuevos.
- Regla de sistema visible:
  - `Tabler` sigue siendo la iconografía semántica principal del producto
  - `BrandLogo` resuelve logos reales de marca
  - `Flaticon` entra como fuente suplementaria, no como reemplazo indiscriminado del sistema base

### 2026-04-10 — GCP auth hardening: WIF only in real Vercel runtime

- `src/lib/google-credentials.ts` ya no activa `Workload Identity Federation` en local por el mero hecho de encontrar `VERCEL_OIDC_TOKEN` en `process.env`.
- `VERCEL_OIDC_TOKEN` pasa a tratarse explícitamente como token efímero de runtime, no como credencial persistible en `.env.local` o `.env.production.local`.
- Nuevo comando operativo:
  - `pnpm gcp:doctor`
  - detecta drift de `VERCEL_OIDC_TOKEN` en `.env*` y configuraciones inconsistentes de auth GCP antes de que reaparezcan warnings `invalid_grant`
- `/admin`, `/admin/users` y `/admin/roles` quedaron `force-dynamic` para no congelar durante build un overview que depende de credenciales vivas.

### 2026-04-10 — Agency skills matrix and staffing engine completed

- Se implementó la matriz canónica de skills en PostgreSQL con:
  - `greenhouse_core.skill_catalog`
  - `greenhouse_core.member_skills`
  - `greenhouse_core.service_skill_requirements`
- Nuevos endpoints Agency:
  - `GET /api/agency/skills`
  - `GET/PATCH /api/agency/skills/members/[memberId]`
  - `GET/PATCH /api/agency/skills/services/[serviceId]`
  - `GET /api/agency/staffing`
- `Space 360 > Team` ahora muestra cobertura de skills, chips por persona, gaps por servicio y recomendaciones de staffing sobre el equipo asignado al `space_id`.
- Se agregaron eventos de outbox para mutaciones de skills de miembro y requisitos de servicio.

## 2026-04-09

### 2026-04-09 — Claude skill added to create Codex skills

- Se agregó la skill de Claude `codex-skill-creator` en `.claude/skills/codex-skill-creator/skill.md`.
- La skill enseña a crear y actualizar skills de Codex bajo `.codex/skills/` usando la estructura canónica del repo (`SKILL.md`, `agents/openai.yaml`, y supporting files opcionales cuando realmente hacen falta).

### 2026-04-09 — Claude secret hygiene skill closed and Codex skill creation protocol documented

- Se integró al repo la skill de Claude `greenhouse-secret-hygiene` bajo `.claude/skills/greenhouse-secret-hygiene/`.
- El cierre preserva exactamente el trabajo ya creado por Claude en `.claude/skills/greenhouse-secret-hygiene/skill.md`, sin reescribir esa skill.
- `TASK-305` quedó cerrada en el pipeline de tasks.
- También se dejó documentado para Claude cómo crear skills de Codex en `AGENTS.md`, `CLAUDE.md` y `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`.

### 2026-04-09 — Claude skill creator added from official Anthropic docs

- Se agregó la skill local `claude-skill-creator` en `.codex/skills/claude-skill-creator/` para crear y actualizar skills de Claude siguiendo la documentación oficial actual de Anthropic.
- La skill incorpora la convención canónica `.claude/skills/<skill-name>/SKILL.md`, frontmatter soportado, supporting files y guardrails para decidir entre auto-invocación, manual-only y background knowledge.
- También deja explícito el drift actual del repo con ejemplos legacy `skill.md` en minúscula y cómo reconciliarlo sin propagar la convención ambigua.

### 2026-04-09 — Secret hygiene skill added for Codex + follow-on task for Claude

- Se agregó la skill local `greenhouse-secret-hygiene` en `.codex/skills/greenhouse-secret-hygiene/` para auditar y remediar secretos con protocolo safety-first.
- La skill cubre Secret Manager, `*_SECRET_REF`, auth, webhooks, PostgreSQL y provider tokens, y obliga a verificar el consumer real después de una rotación.
- Se creó `TASK-305` para que Claude implemente su skill equivalente bajo `.claude/skills/`; esa task ya quedó cerrada en el mismo bloque operativo.

### 2026-04-09 — ISSUE-032 closed: Secret Manager payload hygiene enforced

- Se cerró un incidente transversal donde secretos runtime críticos podían existir en GCP Secret Manager pero romper consumidores por haber sido publicados con comillas envolventes, `\n` literal o whitespace residual.
- `src/lib/secrets/secret-manager.ts` ahora sanea payloads devueltos por Secret Manager y fallbacks por env antes de entregarlos al runtime.
- Se publicaron nuevas versiones limpias de `greenhouse-google-client-secret-shared`, `greenhouse-nextauth-secret-staging`, `greenhouse-nextauth-secret-production` y `webhook-notifications-secret`.
- Verificación ejecutada en `staging` y `production`: `/api/auth/providers` y `/api/auth/session` respondieron `200`.
- Se formalizó el protocolo operativo anti-contaminación de secretos en `AGENTS.md`, `CLAUDE.md`, `project_context.md` y la documentación canónica de Cloud Governance / Security Posture / Infrastructure.

## 2026-04-08

### 2026-04-08 — Hotfix Nubox DTE downloads and status checks

- Se corrigió un incidente donde `Descargar PDF`, `Descargar XML` y `Actualizar estado` de DTE Nubox respondían `401` desde Nubox y `502` en Greenhouse.
- Causa raíz: los secretos `greenhouse-nubox-bearer-token-staging` y `greenhouse-nubox-bearer-token-production` estaban persistidos con comillas envolventes, por lo que el runtime enviaba un `Authorization` inválido.
- `src/lib/nubox/client.ts` ahora sanea el bearer token antes de usarlo, removiendo comillas envolventes y sufijos literales `\n`.
- Se publicaron nuevas versiones limpias de ambos secretos en GCP Secret Manager.
- Validación compartida en `staging`: `GET /api/finance/income/INC-NB-26639047/dte-status` volvió a `200` y `GET /api/finance/income/INC-NB-26639047/dte-pdf` volvió a entregar `application/pdf`.

### 2026-04-10 — Finance shareholder account canonical traceability completed

- `Finance > Cuenta accionista` deja de depender de IDs manuales para enlazar movimientos con `expenses`, `income`, `income_payments`, `expense_payments` y settlement.
- Nuevo contrato runtime en PostgreSQL:
  - `greenhouse_finance.shareholder_account_movements.source_type`
  - `greenhouse_finance.shareholder_account_movements.source_id`
- Nuevos endpoints / contratos:
  - `GET /api/finance/shareholder-account/lookups/sources`
  - `GET/POST /api/finance/shareholder-account/[id]/movements` ahora devuelve `sourceType`, `sourceId` y `source` enriquecido
- Integración con el ecosistema financiero:
  - backend valida tenant-safe cada origen antes de persistirlo
  - `ExpenseDetailView` e `IncomeDetailView` ya pueden abrir CCA precontextualizada desde el documento real
  - `settlement_group_id` deja de ser un campo libre del flujo principal; se deriva o resuelve desde el origen real
- Validación ejecutada:
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm pg:connect:migrate` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK

### 2026-04-08 — Finance shareholder current account module completed

- Nuevo módulo `Finance > Cuenta accionista` (`/finance/shareholder-account`) para leer y operar la posición bilateral empresa ↔ accionista desde el portal.
- Nuevo schema runtime en PostgreSQL:
  - `greenhouse_finance.shareholder_accounts`
  - `greenhouse_finance.shareholder_account_movements`
  - `greenhouse_finance.accounts.instrument_category` ahora admite `shareholder_account`
- Nuevos endpoints:
  - `GET/POST /api/finance/shareholder-account`
  - `GET /api/finance/shareholder-account/people`
  - `GET /api/finance/shareholder-account/[id]/balance`
  - `GET/POST /api/finance/shareholder-account/[id]/movements`
- Integración con el ecosistema financiero:
  - cada movimiento de CCA crea `settlement_groups` / `settlement_legs` y rematerializa `account_balances`
  - `Banco` y `Cuenta accionista` comparten la misma base instrument-aware de tesorería
  - la creación de cuentas ya busca personas por nombre/email en Identity y respeta el vínculo `profile_id` + `member_id` cuando el accionista también es colaborador interno
- Integración de navegación y permisos:
  - nuevo item `Cuenta accionista` dentro de `Finance > Caja`
  - nuevo `viewCode` `finanzas.cuenta_corriente_accionista`

### 2026-04-08 — Vercel Preview auth drift hardening

- Se resolvió el incidente donde los Preview Deployments de Vercel quedaban en `Error` por `NEXTAUTH_SECRET` faltante durante `page-data collection`.
- `src/lib/auth.ts` pasó a resolver `NextAuthOptions` de forma lazy y los consumers server-side ahora usan `getServerAuthSession()`.
- Si un runtime carece de `NEXTAUTH_SECRET`, el build ya no se cae: el portal degrada a sesión `null` y `/api/auth/[...nextauth]` responde `503` controlado.
- Seguimiento operativo: el baseline genérico de `Preview` en Vercel quedó alineado para ramas nuevas con `NEXTAUTH_*`, Google/Azure auth, PostgreSQL, media buckets y `AGENT_AUTH_*`, evitando depender de overrides por branch como baseline compartido.
- Validación posterior: un preview fresco ya respondió `200 {}` en `/api/auth/session` y `200` en `/api/auth/agent-session`.
- Nuevo protocolo operativo: `Preview` pasa a tratarse explícitamente como baseline genérico para cualquier rama distinta de `develop` y `main`; los overrides por branch quedan solo como excepción temporal y documentada.
- El incidente quedó documentado como `ISSUE-031`.

### 2026-04-08 — Hotfix productivo Banco: materializacion de balances corregida

- Fix post-merge de `Finance > Banco`: `GET /api/finance/bank` en produccion estaba devolviendo `500` por un descalce entre placeholders SQL y parametros enviados durante la materializacion de `account_balances`.
- Causa raiz: `materializeAccountBalance()` enviaba un parametro extra al `INSERT` de `greenhouse_finance.account_balances`.
- Resultado: el endpoint de Banco vuelve a poder recalcular/materializar balances sin romper el overview de tesoreria en runtime.

### 2026-04-08 — Finance bank & treasury module completed

- Nuevo módulo `Finance > Banco` (`/finance/bank`) con lectura ledger-first por instrumento: saldos por cuenta, coverage de asignación, discrepancia contra conciliación, exposición multi-moneda y tarjetas de crédito.
- Restricción de acceso endurecida: `Banco` queda visible solo para `efeonce_admin`, `finance_admin` y `finance_analyst`, tanto en UI como en App Router y APIs.
- Nueva tabla `greenhouse_finance.account_balances` con snapshots diarios por cuenta e indicadores de cierre de período, materializada reactivamente desde eventos de caja, settlement y conciliación.
- Nuevos endpoints:
  - `GET/POST /api/finance/bank`
  - `GET/POST /api/finance/bank/[accountId]`
  - `POST /api/finance/bank/transfer`
- Nueva acción operativa de tesorería: `Transferencia interna`, que registra `settlement_groups` / `settlement_legs` entre cuentas propias y soporta `fx_conversion` cuando cruza monedas.
- Nueva acción `Asignación retroactiva` para vincular cobros/pagos existentes a instrumentos y recuperar coverage de tesorería, caja y conciliación sobre el mismo ledger.
- Integración de navegación y permisos:
  - item `Banco` dentro de `Finance > Caja`
  - nuevo `viewCode` `finanzas.banco`
- Ajuste de acceso importante: drawers de caja y settlement dejaron de depender de `/api/admin/payment-instruments` y ahora consumen `/api/finance/accounts`, evitando el bloqueo para usuarios financieros no-admin.

### 2026-04-08 — Finance reconciliation settlement orchestration completed

- Fix posterior al cierre: el alta de `supplemental settlement legs` ya no se pierde al releer el settlement group. `ensureSettlementForPayment()` ahora preserva legs manuales (`funding`, `internal_transfer`, `fx_conversion`, `fee`) y recalcula `settlement_mode = mixed` cuando existe más de un tramo.
- Fix posterior al cierre: la importación idempotente de cartolas ya usa el predicado correcto del índice parcial de `bank_statement_rows`, por lo que reimportar el mismo extracto del período deja `skipped > 0` en vez de romper con `42P10`.
- Fix posterior al cierre: la recomputación de reconciliación sobre `income_payments` / `expense_payments` dejó de escribir `updated_at` sobre tablas que no tienen esa columna, cerrando el loop real `unmatch -> match` contra el ledger y settlement leg canónico.
- `Finance > Conciliación` quedó cerrada sobre el ledger real de caja: `cash-in`, `cash-out` y `Conciliación` ya hablan el mismo contrato con `matchedPaymentId` y `matchedSettlementLegId`.
- `auto-match`, `match`, `unmatch` y `exclude` dejaron de duplicar eventos de pago en las routes; la transición reconciliado/no reconciliado vive en `postgres-reconciliation`.
- Nuevo endpoint `GET/POST /api/finance/settlements/payment` + drawer `SettlementOrchestrationDrawer` para inspeccionar settlement groups y agregar legs manuales (`internal_transfer`, `funding`, `fx_conversion`, `fee`) desde el portal.
- `RegisterCashOutDrawer` ahora soporta pago directo o vía intermediario (`fundingInstrumentId`, `fee*`, `exchangeRateOverride`) y `RegisterCashInDrawer` soporta fee y FX override.
- `ReconciliationDetailView` ahora muestra snapshots del período (instrumento, proveedor, moneda) y acciones operativas `Marcar conciliado` / `Cerrar período`.
- Eventos y consumers extendidos:
  - catálogo con `finance.internal_transfer.recorded` y `finance.fx_conversion.recorded`
  - `client_economics`, `operational_pl`, `commercial_cost_attribution`, `period_closure_status` y `data-quality` ya reaccionan o auditan el nuevo contrato
- Validación staging final:
  - `statement import -> reimport -> unmatch -> match` validado sobre `santander-clp_2026_03`
  - el cobro `PAY-NUBOX-inc-3699924` vuelve a cambiar `isReconciled` en `cash-in` y en `settlement_legs` al conciliar/desconciliar manualmente
- Impacto operativo: Greenhouse ya puede modelar y conciliar mejor cadenas multi-leg como `Santander -> Global66 -> payout/fee/fx` sin volver a mezclar documento, caja y conciliación.

### 2026-04-08 — Finance cash lane alignment: registered payments now surface in Cobros/Pagos

- `IncomeDetailView` ya registra cobros contra el endpoint canónico `POST /api/finance/income/[id]/payments` en vez del carril legacy singular `/payment`, evitando que un fallback a BigQuery deje el cobro fuera de `greenhouse_finance.income_payments`.
- `CashInListView` quedó alineado a la shape real de `GET /api/finance/cash-in`: ahora mapea `paymentId -> cashInId` e `isReconciled -> reconciled`, por lo que los cobros registrados ya se renderizan correctamente en la tabla.
- `CashOutListView` quedó alineado a la shape real de `GET /api/finance/cash-out`: ahora consume `paymentId`, `expenseId`, `amount`, `currency`, `expenseDescription` e `isReconciled` en lugar de campos legacy inexistentes como `cashOutId`, `amountClp` y `description`.
- Impacto visible: el flujo `detalle documento -> registrar pago -> módulo Cobros/Pagos` vuelve a quedar consistente para pagos nuevos sobre el ledger canónico.

### 2026-04-08 — Finance payment ledger hardening: canonical cash events for UI, sync and remediation

- `POST /api/finance/income/[id]/payment` quedó como wrapper legacy-compatible del ledger canónico y ya no puede caer a BigQuery fallback. Si Postgres falla, la operación falla en cerrado para no dejar documentos “pagados” sin fila real en `income_payments`.
- Nuevo módulo `src/lib/finance/payment-ledger-remediation.ts` con:
  - auditoría de drift `amount_paid` vs `SUM(ledger)`
  - detección de documentos `paid/partial` sin ledger
  - backfill canónico para `income_payments` y `expense_payments`
  - reconciliación de drift en ambos lados
- Nuevos comandos operativos:
  - `pnpm audit:finance:payment-ledgers`
  - `pnpm backfill:finance:payment-ledgers`
- `src/lib/nubox/sync-nubox-to-postgres.ts` ahora registra cobros bancarios vía `recordPayment()`, garantizando que los cobros sincronizados desde Nubox publiquen `finance.income_payment.recorded` y queden visibles para proyecciones reactivas y costos.
- `GET /api/finance/data-quality`, `GET /api/finance/income/summary` y `GET /api/finance/expenses/summary` ahora exponen mejor los gaps `paid without ledger`, reforzando la lectura de caja desde ledgers canónicos.
- Seguimiento operativo posterior al merge a `develop`:
  - nueva migración `20260408084803360_widen-income-payment-source-check.sql` amplía el constraint de `income_payments.payment_source` para aceptar `nubox_bank_sync`
  - se removió `server-only` de los módulos de ledger usados por scripts para que la remediación pueda ejecutarse vía `tsx`
  - el backfill histórico de cobros sobre staging/dev recuperó `21` ingresos en `income_payments`
  - verificación E2E en staging: un pago registrado desde el detalle de `EXP-NB-35568077` quedó visible inmediatamente en `Pagos`, y `Cobros` volvió a mostrar facturas Nubox cobradas tras ampliar el rango de fechas

## 2026-04-07

### 2026-04-07 — Sistema de emails de permisos/ausencias (P2 completado)

- 4 templates transaccionales: `leave_request_submitted`, `leave_request_pending_review`, `leave_request_decision`, `leave_review_confirmation`
- Ciclo completo: solicitud → revision pendiente → aprobacion/rechazo/cancelacion → confirmacion al revisor
- Personalizacion dinamica via event payload: nombre solicitante/revisor, tipo permiso, fechas, dias, motivo, notas
- Hero images clay 3D (Imagen 4) en GCS public bucket, fondo blanco, colores de marca
- Soporte es/en via auto-context hydration
- Delivery via ops-worker Cloud Run (outbox reactivo). Redeploy requerido al modificar templates.
- Skill `/greenhouse-email` creada (repo + global) con workflow completo + aprendizajes operativos
- Verificado end-to-end: 8 emails enviados con 4 tipos de permiso y 4 personas distintas

### 2026-04-07 — Separación labor_cost_clp + consolidación de tipos

- Nueva columna `labor_cost_clp` en `client_economics` — costo laboral (de commercial_cost_attribution) ya no se mezcla con `direct_costs_clp`
- Migración con backfill desde `commercial_cost_attribution.commercial_labor_cost_target`
- `sanitizeSnapshotForPresentation` requiere `laborCostClp` (requerido, no opcional) — TypeScript rechaza callers que no lo pasen
- 360 economics facet expone `laborCostCLP` per client en `byClient`
- Finance tab: nueva columna "Costo laboral" en tabla Rentabilidad por Space
- Economics tab: usa campo real en vez de hardcoded `0`
- Trend chart ordenado cronológicamente (ASC) en vez de DESC
- `OrganizationClientFinance` y `OrganizationFinanceSummary` consolidadas en un solo archivo (`types.ts`), backend re-exporta — eliminados duplicados

### 2026-04-07 — ops-worker: cost attribution materialization endpoint

- Nuevo endpoint `POST /cost-attribution/materialize` en Cloud Run ops-worker (TASK-279 continuación)
- Mueve materialización de `commercial_cost_attribution` a Cloud Run: VIEW con 3 CTEs + LATERAL JOIN + exchange rates timeout en Vercel serverless
- Acepta `{year, month}` para single-period o vacío para bulk. Recomputa `client_economics` snapshots opcionalmente
- Deploy: Cloud Build → revision `ops-worker-00006-qtl` sirviendo 100% tráfico
- Bug fix: `deploy.sh` usaba `--headers` en `gcloud scheduler jobs update` (flag inválido) → corregido a `--update-headers`
- Test fix: mock de projection test actualizado para nuevo return type `{ rows, replaced }`

### 2026-04-07 — TASK-279: Labor Cost Attribution Pipeline

- Cierre de brecha payroll → client_economics: 5 silent `.catch(() => [])` reemplazados por logging estructurado
- Cron `economics-materialize` ahora materializa `commercial_cost_attribution` antes de computar snapshots
- Backfill: `commercial_cost_attribution` (5 rows), `client_economics` Sky Airline (directCosts=$2.5M, margin=63.6%, 3 FTE), `operational_pl_snapshots` (laborCost, headcountFte)
- Enterprise hardening: `atomicReplacePeriod` (transaccional purge+insert), `materializeAllAvailablePeriods`, admin endpoint `POST /api/internal/cost-attribution-materialize`, cron best-effort con fallback graceful
- Causa raiz Vercel: VIEW `client_labor_cost_allocation` timeout en serverless cold-start (3 CTEs + LATERAL JOIN). Arquitectura: Vercel solo lee materializado, Cloud Run/admin materializa
- ISSUE-028: HubSpot Cloud Run Private App Token expirado → rotado en Secret Manager v2 + Cloud Run update
- ISSUE-029: `createIdentityProfile` columnas incorrectas (`source_system` → `primary_source_system`) + `profile_type` NOT NULL faltante

### 2026-04-07 — TASK-274: Account Complete 360 federated serving layer

- Resolver federado `getAccountComplete360()` con 9 facetas independientes
- Scope resolver centralizado: org → spaces → clients ejecutado una vez
- Identifier resolver: acepta organization_id, public_id (EO-ORG-*), hubspot_company_id
- Authorization engine per-facet con 6 niveles de acceso
- In-memory cache per-facet con TTL + stale-while-revalidate
- Cache invalidation via 22 outbox events
- API: GET /api/organization/[id]/360 + POST /api/organizations/360 (bulk)
- Observability: ResolverTrace, X-Resolver-Version, X-Cache-Status, X-Timing-Ms
- Deprecated: getOrganizationExecutiveSnapshot(), getOrganizationEconomics()
- Verificado E2E en staging con Sky Airline (9/9 facetas, $6.9M revenue, 20 members)
- **Consumer migration — Organization Detail tabs migradas al 360**:
  - OverviewTab: economics+delivery+team facets con last-closed-month asOf (fix: KPIs "—" en mes sin datos)
  - EconomicsTab: economics facet con trend chart, byClient table, period selector
  - FinanceTab: parallel legacy+360 — agrega KPIs YTD (revenue, invoices, outstanding)
  - PeopleTab: parallel legacy+360 — agrega KPIs team summary (totalMembers, totalFte)
  - ProjectsTab: delivery facet como source of truth (fix: "Sin proyectos" con 72 proyectos existentes)
  - ICO Tab: se mantiene en endpoint especializado

- **TASK-278: AI Visual Asset Generator + Profile Banners**:
  - Nuevo modulo `src/lib/ai/image-generator.ts` con `generateImage()` (Imagen 4) y `generateAnimation()` (Gemini SVG)
  - Endpoints internos: `POST /api/internal/generate-image` y `POST /api/internal/generate-animation` (admin-only, disabled en production)
  - 7 banners de perfil generados con Imagen 4, uno por categoria: leadership, operations, creative, technology, strategy, support, default
  - Banner resolver `src/lib/person-360/resolve-banner.ts` — mapea roleCodes + departmentName a la categoria correcta
  - MyProfileHeader ahora muestra banner AI-generated segun el rol del colaborador (fallback a gradiente CSS)
  - Skill `/generate-visual-asset` para invocacion directa del agente
  - Modelo configurable via `IMAGEN_MODEL` env var (default: `imagen-4.0-generate-001`)
  - Spec de arquitectura: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`

- **TASK-273: Person Complete 360 — capa de serving federada por facetas**:
  - Nuevo resolver federado `getPersonComplete360(identifier, options)` que consolida toda la data de una persona bajo un solo entry point con facetas on-demand
  - 8 facetas independientes: identity, assignments, organization, leave, payroll, delivery, costs, staffAug — cada una como modulo autonomo en `src/lib/person-360/facets/`
  - Motor de autorizacion per-facet con field-level redaction: self ve todo, collaborator ve 4 facetas, HR manager ve todo menos costs, admin ve todo, client ve identity+assignments+delivery
  - Cache in-memory per-facet con TTL (identity 5min, payroll 1h, leave 2min), stale-while-revalidate, bypass via `?cache=bypass`, preparado para Redis (TASK-276)
  - Invalidacion de cache via outbox events (leave.request.created → invalida leave facet, etc.)
  - Endpoints REST: `GET /api/person/{id}/360` (single) + `POST /api/persons/360` (bulk, max 100)
  - Resolucion flexible de identidad: profile_id, member_id, user_id, eo_id, o "me"
  - Queries temporales via `?asOf=YYYY-MM-DD` para payroll, costs, delivery, leave, assignments
  - Observabilidad: ResolverTrace JSON en logs de Vercel + response headers X-Resolver-Version, X-Timing-Ms, X-Cache-Status
  - `resolveAvatarUrl` centralizado en `src/lib/person-360/resolve-avatar.ts` — elimina 3 copias duplicadas
  - Types completos en `src/types/person-complete-360.ts` (PersonComplete360, 8 facet interfaces, ResolverMeta, authorization types)
  - Spec de arquitectura: `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
  - Documentacion funcional: `docs/documentation/personas/person-complete-360.md`

## 2026-04-06

- **ISSUE-024 fix: Admin Notifications — observabilidad de errores silenciosos**:
  - Los 6 catch blocks de `get-admin-notifications-overview.ts` ahora logean con `console.error` en vez de fallar silenciosamente a cero
  - Nueva propiedad `diagnostics: string[]` en `AdminNotificationsOverview` — expone mensajes descriptivos cuando tablas faltan o queries fallan
  - Banner de diagnóstico en `AdminNotificationsView.tsx` — aparece solo cuando hay problemas detectados
  - `logDispatch()` en `notification-service.ts` ya no tiene catch vacío
  - `test-dispatch` route valida schema con `ensureNotificationSchema()` antes de enviar (503 si falla)
  - `setup-postgres-notifications.sql` corregido: columna `metadata JSONB DEFAULT '{}'` faltante en `notification_log`

- **Repo ecosystem doc: upstream Vuexy registrado**:
  - `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` ahora incluye `pixinvent/vuexy-nextjs-admin-template` como repo upstream de referencia del tema/starter que usa Greenhouse
  - usarlo para contrastar layout base, shell y patrones heredados de Vuexy; no como source of truth funcional del producto

## 2026-04-05

- **TASK-263: Permission Sets — CRUD enterprise para asignacion de vistas por persona y perfil**:
  - Nuevas tablas `greenhouse_core.permission_sets` y `user_permission_set_assignments` con 6 sets de sistema seeded
  - `resolveAuthorizedViewsForUser()` extendido: resolucion ahora es Rol ∪ PermissionSets ∪ UserOverrides (3+1 capas)
  - CRUD API completo: `GET/POST /api/admin/views/sets`, `GET/PUT/DELETE .../sets/:setId`, `GET/POST .../sets/:setId/users`, `DELETE .../users/:userId`
  - Effective views API: `GET /api/admin/team/roles/:userId/effective-views` con source attribution (role, role_fallback, permission_set, user_override)
  - UI: tab "Permission Sets" en Admin Views Governance (crear, editar, asignar usuarios, eliminar sets custom)
  - UI: tab "Accesos" en Admin User Detail (roles, sets, overrides, effective views agrupados por seccion con fuente)
  - Audit log: 5 nuevas acciones (`grant_set`, `revoke_set`, `create_set`, `update_set`, `delete_set`)
  - Eventos outbox: `viewAccessSetAssigned`, `viewAccessSetRevoked`
  - Permission Sets de sistema editables en vistas pero no eliminables; sets custom CRUD completo

- **ISSUE-006 fix: Payroll ya no colapsa fallas de permisos a `daysOnUnpaidLeave = 0`**:
  - `fetchApprovedLeaveForPeriod()` ahora retorna `{ rows, degraded }` y marca degradación explícita cuando PostgreSQL no está disponible o la query falla
  - `fetchAttendanceForAllMembers()` propaga `leaveDataDegraded` y `fetchAttendanceForPayrollPeriod()` lo expone en `attendanceDiagnostics`
  - `buildPayrollPeriodReadiness()` agrega blocker `leave_data_unavailable` cuando los permisos no pueden leerse
  - `calculatePayroll()` falla explícitamente si la data de permisos está degradada, evitando cálculo oficial incorrecto
  - `projectPayrollForPeriod()` mantiene la tolerancia del carril de proyección pero ahora expone `attendanceDiagnostics` para que la API/UI puedan mostrar el estado degradado

- **ISSUE-005 fix: Payroll close route no longer drains global notification backlog**:
  - `dispatchPayrollExportNotifications()` reescrita como función scoped al `periodId` — ya no llama `publishPendingOutboxEvents()` ni `processReactiveEvents()` inline
  - La notificación del período exportado se procesará asincrónicamente por el ops-worker cron (cada ~5 min) a partir del evento `payroll_period.exported` ya emitido transaccionalmente por `closePayrollPeriod()`
  - El endpoint `POST /api/hr/payroll/periods/[periodId]/close` ahora responde con `notificationDispatch: { event, periodId, dispatch: 'async' }` en vez del resultado de drenar consumidores globales
  - Latencia del botón de cierre ya no depende del backlog global del outbox

- **Normalizacion de source systems en person_360 — canonical_source_system()**:
  - Funcion SQL `IMMUTABLE` `greenhouse_core.canonical_source_system()` normaliza `source_system` values: `azure_ad`/`azure-ad` → `microsoft`, `hubspot`/`hubspot_crm` → `hubspot`, sistemas internos → filtrados
  - `person_360.linked_systems` ahora retorna `{hubspot,microsoft,notion}` en vez de `{azure_ad,azure-ad,greenhouse_auth,greenhouse_team,hubspot,hubspot_crm,notion}`
  - Mi Perfil muestra Microsoft como vinculado correctamente (antes aparecia con X porque buscaba `'microsoft'` pero la DB tenia `'azure_ad'`)
  - Migracion: `20260405180048252_canonical-source-system-function-person360.sql`
  - Regla: nuevos source systems se agregan al CASE de la funcion SQL, no al frontend

- **TASK-254 Operational Cron Durable Worker Migration — implementación completa**:
  - 3 cron operativos worker-like (`outbox-react`, `outbox-react-delivery`, `projection-recovery`) migrados de Vercel scheduler a Cloud Run `ops-worker`
  - Nuevo servicio `services/ops-worker/` con 4 endpoints HTTP (health + 3 reactive handlers), Dockerfile esbuild two-stage y deploy script idempotente
  - Nuevo `src/lib/sync/reactive-run-tracker.ts` con run tracking institucional sobre `source_sync_runs` para auditar corridas del worker reactivo
  - `vercel.json` reducido de 16 a 13 cron entries — las rutas API siguen como fallback manual sin schedule
  - `getOperationsOverview()` ahora expone subsistema `Reactive Worker` con `lastRunAt`, `lastRunStatus` y señal de freshness
  - Política de workload placement ampliada: cron con backlog, recovery o semántica de durabilidad deben correr en worker durable aunque no superen 30s
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` actualizado a v1.2 con ops-worker, scheduler jobs y placement matrix
  - Deploy a Cloud Run pendiente (requiere `bash services/ops-worker/deploy.sh` con GCP auth)

- **TASK-254 Cloud Run deploy completado**:
  - Cloud Run revision `ops-worker-00004-pmk` sirviendo 100% tráfico en `us-east4`
  - 3 Cloud Scheduler jobs activos: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15), timezone `America/Santiago`
  - Problema ESM/CJS resuelto: `next-auth` y `bcryptjs` shimmed via esbuild `--alias` (el import chain `server.ts → … → auth.ts` arrastraba next-auth providers, que fallan en ESM bajo Node 22)
  - IAM binding: `greenhouse-portal@` SA con `roles/run.invoker` sobre `ops-worker`
  - deploy.sh actualizado: IAM binding idempotente + health check via `gcloud run services proxy` (no requiere service account impersonation)
  - Invocación manual verificada: scheduler → OIDC → 200, 50 events processed en 758ms

- **ISSUE-014 person_360 VIEW faltaba columnas enriched — resuelto**:
  - Mi Perfil mostraba `hasMemberFacet: true` pero todos los campos enriched eran `null` (avatar, cargo, telefono, departamento)
  - Causa raiz: la VIEW `person_360` en la DB era la version antigua (rollup-based) que no exponia `resolved_avatar_url`, `resolved_job_title`, `resolved_phone`, etc.
  - Los datos estaban correctamente escritos por el Entra sync (TASK-256) pero la VIEW no los surfaceaba
  - Fix: migracion `20260405164846570_person-360-v2-enriched-view.sql` reemplaza la VIEW con version v2 (LATERAL joins + resolved fields)
  - Verificado con query directa: 7/8 usuarios internos con avatar, todos con cargo y member facet
  - Documentado en GREENHOUSE_POSTGRES_CANONICAL_360_V1.md y GREENHOUSE_IDENTITY_ACCESS_V2.md

- **TASK-256 Entra Profile Completeness — implementacion completa**:
  - Entra sync ahora cierra el ciclo completo: match (OID/email/alias) → backfill OID → ensure identity_profile link → sync datos → sync avatar
  - `fetchEntraUserPhoto()` en `graph-client.ts`: fetch foto de Microsoft Graph → upload a GCS → update `client_users.avatar_url`
  - `ensureIdentityProfileLink()` en `profile-sync.ts`: crea identity_profile si no existe, linkea `client_users.identity_profile_id`
  - Match cross-domain via `buildEfeonceEmailAliasCandidates()` (`@efeonce.org` ↔ `@efeoncepro.com`)
  - Resultado: todos los usuarios internos activos tienen identity_profile linkeado, avatar sincronizado, y datos completos en person_360

- **Staging deploy failures — 3 problemas resueltos (ISSUE-013)**:
  - **Proyecto Vercel duplicado eliminado**: existía `prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8` en scope personal con 0 env vars y sin framework, cada push fallaba en paralelo al build real — eliminado via API
  - **Variables Agent Auth agregadas a Vercel**: `AGENT_AUTH_SECRET` y `AGENT_AUTH_EMAIL` no existían en staging/preview — agregadas; endpoint agent-session ahora funciona en staging (HTTP 200)
  - **VERCEL_AUTOMATION_BYPASS_SECRET manual eliminada**: otro agente había creado la variable con un valor incorrecto que sombreaba el secret real del sistema — eliminada; bypass SSO funciona
  - Documentado en AGENTS.md (sección Vercel Deployment Protection + Proyecto único), CLAUDE.md, project_context.md, Handoff.md
  - Regla nueva: NUNCA crear manualmente `VERCEL_AUTOMATION_BYPASS_SECRET` en Vercel — es auto-gestionada por el sistema

- **Agent Auth — endpoint headless para agentes y E2E**:
  - nuevo `POST /api/auth/agent-session` — genera JWT NextAuth válido dado un shared secret + email, sin login interactivo
  - nuevo `scripts/playwright-auth-setup.mjs` — genera `.auth/storageState.json` con la cookie de sesión (modo API o Credentials)
  - nueva función `getTenantAccessRecordForAgent()` en `src/lib/tenant/access.ts` — variante PG-first que no requiere `passwordHash`
  - seguridad: desactivado sin `AGENT_AUTH_SECRET`, bloqueado en production por defecto, timing-safe comparison
  - nuevas variables: `AGENT_AUTH_SECRET`, `AGENT_AUTH_EMAIL`, `AGENT_AUTH_ALLOW_PRODUCTION`
  - documentado en AGENTS.md, CLAUDE.md, GREENHOUSE_IDENTITY_ACCESS_V2.md, proyecto_context.md y docs funcionales
  - verificado localmente: endpoint retorna JWT válido, cookie autentica páginas protegidas

- **TASK-255 Mi Perfil identity chain fix — completo**:
  - `GET /api/my/profile` respondía 422 porque `memberId` no llegaba al JWT de sesión
  - `src/lib/tenant/access.ts`: agregados `cu.member_id` y `cu.identity_profile_id` al SELECT y GROUP BY de BigQuery en `getIdentityAccessRecord()` — arregla credentials, Microsoft SSO y Google SSO
  - `src/lib/auth.ts`: agregados `memberId`, `identityProfileId`, `spaceId`, `organizationId`, `organizationName` al return de credentials `authorize()`
  - `src/app/api/my/profile/route.ts`: cambiado de `requireMyTenantContext` a `requireTenantContext` con fallback a session data
  - nuevos: tipo `PersonProfileSummary`, proyecciones `toPersonProfileSummary()` y `toPersonProfileSummaryFromSession()` en `src/lib/person-360/get-person-profile.ts`
  - validado con tsc, lint, 935 tests passing, y verificación manual en staging

- **ISSUE-012 Reactive cron routes fail closed without CRON_SECRET — resuelto**:
  - `requireCronAuth()` ahora autoriza primero tráfico válido de Vercel Cron (`x-vercel-cron` / `user-agent` `vercel-cron/*`)
  - `CRON_SECRET` queda reservado para invocaciones bearer/manuales fuera de Vercel
  - cuando el secret falta, las requests no-Vercel siguen fallando en cerrado con `503`
  - nueva regresión focalizada en `src/lib/cron/require-cron-auth.test.ts`
  - validado con Vitest focalizado (`8` tests passing) y `tsc --noEmit`

- **ISSUE-009 Reactive event backlog can accumulate without Ops visibility — resuelto**:
  - nuevo reader `src/lib/operations/reactive-backlog.ts` para medir backlog reactivo oculto (`published` sin huella en `outbox_reactive_log`)
  - `getOperationsOverview()` ahora expone `kpis.hiddenReactiveBacklog` + bloque `reactiveBacklog`
  - `/api/internal/projections` ahora devuelve backlog reactivo real y deja de marcar health global como sana si ese backlog existe
  - `AdminOpsHealthView` y `AdminCenterView` ya separan backlog reactivo oculto de `pendingProjections` y `failedHandlers`
  - nueva cobertura focalizada: `reactive-backlog.test.ts` y regresión de `AdminCenterView`
  - validado con Vitest focalizado (`8` tests passing) y `tsc --noEmit`

- **ISSUE-008 Finance routes mask schema drift as empty success — resuelto**:
  - nuevo helper compartido `src/lib/finance/schema-drift.ts`
  - `purchase-orders`, `hes`, `quotes` y `intelligence/operational-pl` ya no responden vacío ambiguo ante `relation/column does not exist`
  - los payloads preservan la shape base pero ahora agregan `degraded: true`, `errorCode` y `message`
  - nueva cobertura focalizada: `purchase-orders/route.test.ts` y `schema-drift-response.test.ts`
  - validado con suite focalizada del fix y suite completa de Finance (`24` files, `102` tests passing, `2` skipped)

- **ISSUE-007 Finance fallback writes can duplicate income and expenses — resuelto**:
  - `POST /api/finance/income` y `POST /api/finance/expenses` ahora reutilizan un ID canónico por request entre el path Postgres-first y el fallback BigQuery
  - si PostgreSQL ya generó el ID, el fallback ya no recalcula una segunda secuencia
  - nueva regresión focalizada: `src/app/api/finance/fallback-id-reuse.test.ts`
  - validado con suite focalizada del fix y suite completa de Finance (`23` files, `99` tests passing, `2` skipped)

- **Issue lifecycle protocol — formalizado**:
  - nuevo documento operativo `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
  - `docs/issues/README.md` ya trata los issues como carril formal separado de tasks
  - una issue ya puede resolverse sin task cuando el fix es localizado, verificable y con cierre documental completo

- **TASK-249 Test Observability MVP — cerrada**:
  - nuevo carril artifacts-first de observabilidad de tests, sin backend admin ni persistence runtime
  - scripts nuevos: `test:inventory`, `test:results`, `test:coverage`, `test:observability:summary`, `test:observability`
  - `scripts/test-inventory.ts` genera inventario del suite por dominio, tipo y entorno en `artifacts/tests/inventory.json` e `inventory.md`
  - `scripts/test-observability-summary.ts` genera `artifacts/tests/summary.md` desde inventario, resultados, coverage y warnings relevantes
  - `vitest.config.ts` ahora publica coverage v8 en `artifacts/coverage/` con reporters `text`, `json-summary` y `html`
  - `.github/workflows/ci.yml` publica inventory, results, coverage, summary y artifacts reutilizables en GitHub Actions
  - `docs/architecture/12-testing-development.md` ya fija CI + artifacts como source of truth operativa del suite

- **TASK-248 Identity & Access Spec Compliance — cerrada**:
  - Audit events: `scope.assigned`, `scope.revoked`, `auth.login.success`, `auth.login.failed` con payloads tipados
  - Login success emitido via NextAuth `events.signIn` (fire-and-forget), login failed inline en `authorize()`
  - Scope assigned emitido en `tenant-member-provisioning.ts` para project scopes
  - People drift formalizado: `efeonce_operations` y `hr_payroll` ahora con `people` en mapping base
  - `canAccessPeopleModule` simplificado sin fallback hardcoded redundante
  - Legacy codes eliminados: `employee` (1 usuario migrado a `collaborator`) y `finance_manager` (0 activos)
  - `ROLE_CODES`, `ROLE_PRIORITY`, `ROLE_ROUTE_GROUPS` limpios — 13 role codes canónicos (sin legacy)
  - Route group `employee` eliminado del type system, 15 archivos actualizados

- **TASK-247 Identity & Platform Block Hardening — cerrada**:
  - 2 race conditions críticas cerradas con `FOR UPDATE` locking (superadmin count, primary demotion)
  - `RoleGuardrailError` class: errores de negocio ahora retornan HTTP 400 (no 500)
  - `administracion.cuentas` viewCode registrado en VIEW_REGISTRY, VerticalMenu actualizado
  - date range validation en responsabilidades operativas (`effectiveFrom < effectiveTo`)
  - `listResponsibilities()` con paginación (LIMIT/OFFSET + count)
  - `AdminAccountsView` con error state visible (Alert + Reintentar)
  - 5 event types en REACTIVE_EVENT_TYPES + 6 payload interfaces
  - input validation en POST responsibilities, test unitario VIEW_REGISTRY
  - fix pre-existing: mock en space-360.test.ts, ownership en Space360View.test.tsx

- **TASK-229 Client View Catalog Deduplication — cerrada**:
  - 5 viewCodes cliente duplicados eliminados de VIEW_REGISTRY
  - validación build-time de unicidad de viewCodes agregada (throw si duplicado)
  - bloque TASK-225→229 completado (5/5 tasks de identidad/platform)

- **TASK-228 Employee Legacy Role Code Convergence — cerrada**:
  - `employee` y `finance_manager` marcados `@deprecated` en role-codes.ts
  - todos los consumers runtime actualizados para aceptar `finance_admin` como canonical (7 archivos)
  - ROLE_ROUTE_GROUPS mantiene aliases backwards-compat para usuarios existentes
  - BigQuery seeds actualizados con descripción legacy

- **TASK-226 Superadministrador Bootstrap & Assignment Policy — cerrada**:
  - `SUPERADMIN_PROFILE_ROLES` + `isSuperadmin()` como constantes canónicas en `role-codes.ts`
  - guardrails en `updateUserRoles()`: solo admin asigna/revoca admin, no revocar último superadmin, efeonce_admin siempre incluye collaborator
  - audit events: `role.assigned` + `role.revoked` emitidos vía outbox con `assigned_by_user_id`
  - invite hardened: auto-agrega collaborator al invitar con efeonce_admin, popula `assigned_by_user_id`
  - `pnpm pg:doctor` reporta superadmin health check (count, users, warning)

- **TASK-230 Portal Animation Library Integration — cerrada**:
  - `src/libs/FramerMotion.tsx` ahora expone también `useInView`, alineando el wrapper con la arquitectura canónica
  - `src/components/greenhouse/AnimatedCounter.tsx` dejó de importar `framer-motion` directo y ya consume el wrapper shared
  - nueva cobertura focalizada: `AnimatedCounter.test.tsx` valida `integer`, `currency`, `percentage` y reduced motion
  - `pnpm build` y `pnpm lint` pasan; el carril de animación también queda cubierto con suite focalizada (`AnimatedCounter`, `EmptyState`, `FinancePeriodClosureDashboardView`)
  - se intentó el preview manual autenticado de `/finance`, pero el dashboard quedó bloqueado por el session flow local; la limitación quedó documentada en la task y el handoff

- **TASK-195 Space Identity Consolidation: Organization-First Admin — cerrada**:
  - nueva surface admin: `/admin/accounts` (lista de organizaciones con 4 KPIs, tabla TanStack, paginación, búsqueda)
  - nueva surface admin: `/admin/accounts/[id]` (detalle de cuenta con sidebar, lista de spaces, readiness chips, create space dialog, links a Space 360)
  - banner legacy en `/admin/tenants/[id]` indicando transición a Cuentas
  - breadcrumbs Space 360 muestran Organization cuando disponible
  - "Cuentas" agregado al sidebar admin (menú Gobierno)
  - nomenclatura: `adminAccounts` en `GH_INTERNAL_NAV`
  - docs: deltas en ARCHITECTURE_V1 y 360_OBJECT_MODEL_V1 formalizando Organization→Space→Space 360

- **TASK-225 Internal Roles & Hierarchies — cerrada**:
  - spec canónica `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` completada (474 líneas, 9 secciones)
  - 4 planos formalizados: Access Role, Reporting Hierarchy, Structural Hierarchy, Operational Responsibility
  - matriz login `rol → routeGroups → vistas` documentada
  - 3 drifts identificados: fallback de gobernanza, catálogo duplicados cliente, employee legacy
  - follow-ons: TASK-226, TASK-227, TASK-228, TASK-229

- **TASK-227 Operational Responsibility Registry — implementada**:
  - migración: `greenhouse_core.operational_responsibilities` con unique primary constraint, scope/member indexes
  - config: `responsibility-codes.ts` con 5 responsibility types y 4 scope types
  - event catalog: `responsibility.assigned`, `responsibility.revoked`, `responsibility.updated`
  - store CRUD + outbox + primary demotion logic
  - readers: `listResponsibilities`, `getScopeOwnership`, `getMemberResponsibilities`
  - API admin: `GET/POST /api/admin/responsibilities`, `PATCH/DELETE /[id]`
  - UI admin: `/admin/responsibilities` con tabla CRUD y diálogo de asignación
  - consumer Agency: Space 360 OverviewTab muestra ownership badges
  - migración aplicada en `greenhouse-pg-dev`, Kysely types regenerados (162 tablas), store/readers en Kysely tipado

## 2026-04-04

- **TASK-238 Agency Workspace & Space 360 Data Storytelling UX**:
  - terminología unificada: "Revenue"→"Ingresos", "360 listo"→"Snapshot activo", finance navigation consolidada a "Ver finanzas"
  - tooltips de contexto en RpA, OTD, FTR, Throughput, Cycle time, Stuck assets (centralizados en GH_AGENCY)
  - breadcrumbs MUI en Space 360 (Agencia > Spaces > nombre), per-service buttons reducidos
  - Space 360 KPIs reducidos de 5→4 con AnimatedCounter, layout 4-columns balanceado
  - Pulse KPIs con AnimatedCounter, ExecutiveMiniStatCard value type widened a ReactNode
  - Finance tab: donut chart ApexCharts para composición de costo (reemplaza lista plana)
  - Team tab: campos null ocultos con grid adaptativo
  - animated EmptyState en 5 puntos de Agency
  - TASK-146 reference limpiada de ServicesTab

- **TASK-234 Codex animation skill sync closed**:
  - las 5 skills de Codex (`greenhouse-agent`, `greenhouse-portal-ui-implementer`, `greenhouse-ui-orchestrator`, `greenhouse-vuexy-ui-expert`, `greenhouse-ux-content-accessibility`) ya quedaron alineadas con la arquitectura de animación de `TASK-230`
  - ahora conocen:
    - wrappers `@/libs/Lottie` y `@/libs/FramerMotion`
    - `useReducedMotion` como guardrail obligatorio
    - `AnimatedCounter` para KPIs
    - `EmptyState.animatedIcon` con fallback estático
    - reglas de assets `public/animations/`, `kebab-case`, `< 50 KB`
  - la guidance también deja explícito que no se debe propagar el drift local de imports directos de `framer-motion`

- **Payroll PDF download backend fix**:
  - se corrigió un incidente real en `HR > Nómina > Descargar PDF` donde el endpoint respondía `500` con `Unable to generate payroll PDF report.`
  - la causa raíz no era el render del PDF ni la UI: `src/lib/payroll/payroll-export-packages-store.ts` ejecutaba DDL runtime (`CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS`) sobre `greenhouse_payroll.payroll_export_packages`
  - como la tabla ya existe y su owner canónico es `greenhouse_ops`, el usuario runtime fallaba con `must be owner of table payroll_export_packages`
  - el store ahora asume el schema migrado y ya no intenta bootstrap DDL en requests
  - el flujo compartido se mantiene intacto para:
    - descarga PDF
    - descarga CSV
    - `sendPayrollExportReadyNotification()` con PDF y CSV adjuntos
  - issue documentado: `#26`

- **TASK-237 Agency ICO Engine Tab UX Redesign**:
  - KPIs reducidos de 6 a 4 con AnimatedCounter y trust metadata como tooltip
  - Charts: paletas diferenciadas CSC vs RPA trend, tooltips en labels truncados, Pipeline Velocity gauge eliminado
  - Scorecard migrado a TanStack React Table con sticky headers, sorting aria-sort, tooltips en zone dots
  - Performance report en 3 Accordions colapsables con chips de estado
  - Patrón progressive disclosure documentado en `GREENHOUSE_UI_PLATFORM_V1.md`

- **TASK-236 Agency Resilience & Feedback Patterns**:
  - toda vista Agency muestra error con "Reintentar" cuando un fetch falla (nunca más spinner infinito)
  - StaffAugmentationListView y ServicesListView usan EmptyState centralizado para tablas vacías
  - onboarding item update y placement create muestran toast de confirmación/error
  - loading states con texto contextual en español ("Cargando servicios...", "Cargando placements...")
  - AgencyWorkspace lazy tabs con retry en error states
  - patrón documentado en `GREENHOUSE_UI_PLATFORM_V1.md` § Error Handling & Feedback Patterns

- **Notion Delivery per-space orchestration fix**:
  - se corrigió un incidente backend real donde `Notion Delivery Data Quality` marcaba `Sky Airline` como roto aunque el raw ya estaba fresco
  - la causa raíz era de orquestación: el gate de frescura bloqueaba globalmente `sync-conformed` cuando un solo `space` seguía stale
  - el runtime ahora converge por `space`
  - remediación verificada: `Sky Airline` volvió a `healthy`, `Efeonce` quedó `broken` por raw stale real

- **TASK-232 ICO LLM async lane implemented end-to-end**:
  - `ICO` ya tiene carril LLM async sobre `ico.ai_signals.materialized`, desacoplado del request path principal
  - provider/runtime efectivo: `Vertex AI` + `@google/genai` + `Gemini` con baseline `google/gemini-2.5-flash@default`
  - nuevo storage complementario para explanations + run audit:
    - BQ: `ico_engine.ai_signal_enrichments`, `ico_engine.ai_enrichment_runs`
    - PG serving: `greenhouse_serving.ico_ai_signal_enrichments`, `greenhouse_serving.ico_ai_enrichment_runs`
  - nuevo worker/provider/readers:
    - `src/lib/ico-engine/ai/llm-provider.ts`
    - `src/lib/ico-engine/ai/llm-enrichment-worker.ts`
    - `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
    - `src/lib/sync/projections/ico-llm-enrichments.ts`
  - `Agency > ICO Engine` ahora expone `aiLlm`, `Operations Overview` agrega `AI LLM Enrichment` y `Nexa > get_otd` incorpora resumen breve de enriquecimientos recientes
  - migración aplicada: `20260404123559856_task-232-ico-llm-enrichments`
  - verificado con `pnpm lint`, `pnpm clean && pnpm build`, `pnpm test` y `pnpm migrate:up`

- **TASK-230 Portal Animation Library Integration (pilot)**:
  - instaladas `lottie-react` y `framer-motion` como stack de animación del portal
  - creados wrappers `src/libs/Lottie.tsx` y `src/libs/FramerMotion.tsx` siguiendo patrón ApexCharts
  - nuevo hook `useReducedMotion` para cumplir `prefers-reduced-motion` en toda animación
  - `EmptyState` ahora acepta `animatedIcon` (Lottie JSON) sin romper los 37 consumers existentes
  - nuevo componente `AnimatedCounter` para transiciones numéricas en KPIs (currency, percentage, integer)
  - `HorizontalWithSubtitle.stats` ampliado a `string | ReactNode` para soportar AnimatedCounter inline
  - piloto Finance: DSO, DPO, Payroll Ratio con AnimatedCounter + 2 EmptyState animados en Period Closure

- **TASK-118 AI Core foundation formally closed**:
  - la task queda cerrada sobre la foundation deterministic-first ya implementada: `ai_signals`, `ai_prediction_log`, `ico.ai_signals.materialized`, `greenhouse_serving.ico_ai_signals` y consumers base
  - el carril LLM async deja de quedar como deuda implícita y pasa explícitamente a `TASK-232`
  - `TASK-152`, `TASK-155` y `TASK-159` quedaron ajustadas para consumir esta foundation sin duplicar detector base ni confundir pipeline generativo con tooling/chat

- **TASK-231 Codex task planner skill closed**:
  - el repo ya versiona la skill `greenhouse-task-planner` en `.codex/skills/greenhouse-task-planner/`
  - la misma skill quedó instalada a nivel global en `/Users/jreye/.codex/skills/greenhouse-task-planner/`
  - ambas instalaciones validaron con el `quick_validate.py` canónico de `skill-creator`
  - `TASK-232` quedó creada como follow-on para la lane LLM async del `ICO Engine`

- **TASK-118 AI Core foundation backend/pipeline activated**:
  - `ICO` ahora materializa `ai_signals` y `ai_prediction_log` como capas analíticas aditivas sobre el snapshot mensual canónico
  - `materialize.ts` publica el nuevo evento reactivo `ico.ai_signals.materialized` y la proyección `ico-ai-signals` sincroniza las señales a `greenhouse_serving.ico_ai_signals`
  - se aplicó la migración `20260404113502039_task-118-ico-ai-signals` y se regeneró `src/types/db.d.ts` en el mismo lote
  - `/api/ico-engine/metrics/agency` ahora expone `aiCore`, `Ops Health` suma el subsystem `AI Core` y `Nexa` puede adjuntar señales AI recientes al tool `get_otd`
  - verificado con `pnpm pg:doctor --profile=runtime`, `pnpm pg:doctor --profile=migrator`, `MIGRATE_PROFILE=migrator pnpm migrate:up`, `pnpm exec vitest run src/lib/ico-engine/ai/ai-signals.test.ts src/lib/sync/event-catalog.test.ts`, `pnpm build` y `pnpm lint`

- **TASK-213 umbrella trust convergence closed on real runtime**:
  - `TASK-213` ya quedó cerrada como umbrella de rebaseline y convergencia sobre el runtime real
  - `People > Person Intelligence` ahora muestra estado de confianza y soporte para KPIs delivery reutilizando el reader ICO trust-aware, sin abrir schema nuevo
  - `Agency > ICO Engine` ahora expone una lectura compacta del `metricTrust` del `Performance Report` mensual
  - `Creative Hub` ya preserva la metadata trust de `throughput` al componer `Revenue Enabled`, evitando que el summary pierda `qualityGateStatus` y `confidenceLevel`
  - verificado con `pnpm exec vitest run src/views/greenhouse/people/tabs/PersonIntelligenceTab.test.tsx src/lib/capability-queries/creative-cvr.test.ts src/lib/ico-engine/creative-velocity-review.test.ts`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint`, `pnpm build` y `rg -n "new Pool\\(" src`

- **TASK-223 Methodological accelerators runtime baseline implemented**:
  - `ICO` ya tiene un contrato runtime inicial para `Design System` y `Brand Voice para AI` en `src/lib/ico-engine/methodological-accelerators.ts`
  - `Creative Velocity Review` ahora compone también esa lane metodológica, sin abrir una surface paralela a `Creative Hub`
  - `Design System` queda formalizado como acelerador `proxy` apoyado en outcomes canónicos (`FTR`, `RpA`, `Cycle Time`, `Throughput`, `Iteration Velocity`)
  - `Brand Voice para AI` ahora puede leer `brand_consistency_score` auditado desde `ico_engine.ai_metric_scores` cuando exista data real
  - `Creative Hub` agrega la card `Methodological accelerators` y deja de reconstruir `Brand Consistency` con heurísticas locales cuando falta score auditado

- **TASK-222 Creative Velocity Review runtime contract implemented**:
  - `ICO` ya tiene un contrato runtime inicial de `CVR` en `src/lib/ico-engine/creative-velocity-review.ts`
  - el contrato compone `TTM`, `Iteration Velocity`, `Revenue Enabled`, estructura del review, matriz `Basic / Pro / Enterprise` y guardrails de narrativa
  - `Creative Hub` ahora hidrata ese contrato en su surface client-facing con `CVR structure`, `Tier visibility` y `Narrative guardrails`
  - la hero narrative del módulo deja de ser solo operacional y ahora explicita la separación entre drivers, métricas puente y `Revenue Enabled`
  - no se creó migración nueva:
    - la matriz por tier sigue siendo editorial
    - todavía no existe entitlement runtime persistido para `Basic`, `Pro` o `Enterprise`
  - verificado con `pnpm exec vitest run src/lib/capability-queries/creative-cvr.test.ts src/lib/ico-engine/creative-velocity-review.test.ts`, `pnpm exec tsc --noEmit --pretty false`, `pnpm lint` y `pnpm build`

- **TASK-221 Revenue Enabled measurement model implemented**:
  - `ICO` ya tiene un helper canónico inicial para `Revenue Enabled` en `src/lib/ico-engine/revenue-enabled.ts`
  - el contrato compone las palancas sobre foundations reales (`TTM`, `Iteration Velocity`, `throughput`) y ya distingue `observed`, `range`, `estimated` y `unavailable`
  - `Creative Hub` dejó de inferir `Revenue Enabled` desde heurísticas locales de `OTD`, `RpA` y benchmarks de industria como si fueran revenue observado
  - la surface ahora comunica límites explícitos de atribución por palanca y una policy visible en vez de vender una cifra heroica sin linkage defendible
  - se actualizaron `Contrato_Metricas_ICO_v1.md` y `Greenhouse_ICO_Engine_v1.md` para fijar la policy inicial y dejar explícito que `throughput_count` todavía no equivale a iniciativas incrementales atribuibles

- **TASK-220 Brief Clarity Score contract implemented**:
  - `ICO` ya tiene un helper canónico inicial para `BCS` en `src/lib/ico-engine/brief-clarity.ts`
  - el contrato lee el último `brief_clarity_score` disponible en `ico_engine.ai_metric_scores` y lo combina con `governance` de Notion por `space`
  - `src/app/api/projects/[id]/ico/route.ts` ahora expone `briefClarityScore`
  - `src/lib/campaigns/campaign-metrics.ts` ahora puede usar `brief efectivo` observado para el start-side de `TTM`; si no hay score válido, degrada a proxy
  - se actualizaron `Contrato_Metricas_ICO_v1.md` y `Greenhouse_ICO_Engine_v1.md` para dejar explícito que `BCS` ya tiene contrato runtime inicial y que el inicio de `TTM` ya no es siempre proxy
  - verificado con `pnpm exec vitest run src/lib/ico-engine/brief-clarity.test.ts src/lib/ico-engine/time-to-market.test.ts`, `pnpm exec tsc --noEmit --pretty false`, `rg -n "new Pool\\(" src`, `pnpm lint` y `pnpm build`

- **TASK-219 Iteration Velocity evidence contract implemented**:
  - `ICO` ya tiene un helper canónico inicial para `Iteration Velocity` en `src/lib/ico-engine/iteration-velocity.ts`
  - el contrato mide iteraciones útiles cerradas en ventana de `30d`, distinguiendo `available`, `degraded` y `unavailable`, además de `confidenceLevel`, `evidenceMode` y `qualityGateReasons`
  - `src/app/api/projects/[id]/ico/route.ts` ahora expone `iterationVelocity` y además refuerza tenant isolation con filtro por `space_id`
  - `Creative Hub` dejó de derivar `Iteration Velocity` desde `RpA` y ahora consume el contrato canónico con descripción honesta de evidencia proxy
  - se actualizaron `Contrato_Metricas_ICO_v1.md` y `Greenhouse_ICO_Engine_v1.md` para dejar explícito que `pipeline_velocity` no equivale a `Iteration Velocity` y que la lane sigue en proxy operativo mientras no haya evidencia observada de mercado

- **TASK-218 Time-to-Market evidence contract implemented**:
  - `ICO` ya tiene un helper canónico inicial para `TTM` en `src/lib/ico-engine/time-to-market.ts`
  - el contrato distingue `available`, `degraded` y `unavailable`, además de `confidenceLevel` y `qualityGateReasons`
  - `src/lib/campaigns/campaign-metrics.ts` ahora publica `timeToMarket` en el payload de campaña con source policy explícita y filtro por `space_id`
  - `Campaign Detail` ya expone `TTM`, evidencia de inicio/activación y estado de confianza como primer consumer visible
  - se actualizaron además `Contrato_Metricas_ICO_v1.md` y `Greenhouse_ICO_Engine_v1.md` para dejar explícito que el inicio sigue siendo proxy hasta cerrar `TASK-220`
  - verificado con `pnpm exec vitest run src/lib/ico-engine/time-to-market.test.ts`, `pnpm exec tsc --noEmit --pretty false`, `rg -n "new Pool\\(" src`, `pnpm lint` y `pnpm build`

- **TASK-217 Agency trust propagation closed end-to-end**:
  - `Agency > Pulse`, `Agency > Delivery` y `Agency > ICO Engine` ya consumen trust metadata del `ICO Engine` sin recalcular fórmulas ni reinterpretar KPIs localmente
  - `src/lib/agency/agency-queries.ts` ahora publica `rpaMetric`, `otdMetric` y `ftrMetric` con `benchmarkType`, `qualityGateStatus`, `confidenceLevel`, `dataStatus` y evidencia resumida
  - se creó `src/components/agency/metric-trust.tsx` como helper shared para estados `Dato confiable`, `Dato degradado` y `Sin dato confiable`
  - `Agency > Delivery` y `Agency > Pulse` ya dejaron de depender de semáforos hardcodeados para `OTD` y `RpA`
  - además se corrigió un bug semántico en los aggregates Agency-level:
    - `OTD` ya no se promedia por `space` cuando corresponde agregar counts
    - `RpA` mensual ahora pondera por `rpa_eligible_task_count`
    - `FTR` mensual ahora pondera por `completed_tasks`
  - `TASK-160` quedó actualizada para tratar esta lane como foundation downstream cerrada, no como gap pendiente
  - verificado con `pnpm exec vitest run src/lib/agency/agency-queries.test.ts src/lib/agency/space-360.test.ts`, `pnpm exec eslint ...`, `pnpm exec tsc --noEmit --pretty false`, `rg -n "new Pool\\(" src`, `pnpm lint` y `pnpm build`

## 2026-04-03

- **TASK-216 ICO trust model implemented end-to-end**:
  - `ICO Engine` ahora publica metadata genérica de trust por métrica: `benchmarkType`, `qualityGateStatus`, `confidenceLevel` y evidencia reusable
  - `metric-registry.ts` ya distingue benchmarks `external`, `analog`, `adapted` e `internal` sin reabrir fórmulas base
  - `read-metrics.ts` propaga trust metadata para `RpA`, `OTD`, `FTR`, `cycle time`, `throughput`, `pipeline velocity` y métricas de stuck
  - `greenhouse_serving.ico_member_metrics` y `greenhouse_serving.agency_performance_reports` ya persisten `metric_trust_json`
  - `People` y `Agency Performance Report` leen trust desde serving con fallback runtime para filas legacy
  - verificado con `pnpm pg:doctor --profile=migrator`, `pnpm migrate:up`, `pnpm exec vitest run src/lib/ico-engine/*.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/person-360/get-person-ico-profile.test.ts`, `pnpm lint` y `pnpm build`

- **TASK-215 ICO RpA reliability policy implemented**:
  - `ICO Engine` ahora publica `RpA` con evidencia de coverage (`rpa_eligible_task_count`, `rpa_missing_task_count`, `rpa_non_positive_task_count`)
  - `read-metrics` clasifica `RpA` como `valid`, `low_confidence`, `suppressed` o `unavailable` y propaga esa metadata junto al valor saneado
  - `Payroll` ya consume el snapshot con `rpaDataStatus`, `rpaConfidenceLevel`, `rpaSuppressionReason` y `rpaEvidence`, evitando reinterpretaciones locales de `0` o `null`
  - la task quedó cerrada en `docs/tasks/complete/TASK-215-ico-rpa-reliability-source-policy-fallbacks.md`

- **TASK-215 RpA reliability policy documented and aligned**:
  - se formalizó la policy runtime de `RpA` como contrato auditable con estados `valid`, `low_confidence`, `suppressed` y `unavailable`
  - el engine debe propagar además evidencia mínima de coverage para no dejar que los consumers reinterpreten `0` o `null` por su cuenta
  - se alinearon las tasks vecinas de Agency, Space Health y TTM para que no contradigan esta disciplina de confidence
  - esta actualización es documental; la verificación runtime queda para la lane de implementación

- **TASK-214 ICO completion semantics and serving parity closed**:
  - `ICO` ya comparte una sola regla de completitud para `OTD`, `FTR`, `RpA`, `throughput` y `cycle time`: `completed_at` solo vale con estado terminal real
  - `delivery_signal` y los buckets abiertos (`overdue`, `carry_over`, `overdue_carried_forward`) quedaron endurecidos para no mezclar filas cerradas o inconsistentes
  - `greenhouse_serving.ico_member_metrics` ya quedó a par con `metrics_by_member` y ahora incluye `on_time_count`, `late_drop_count`, `overdue_count` y `overdue_carried_forward_count`
  - `Person 360` ya expone `overdue_carried_forward` en el contexto member-level
  - verificado con migración aplicada, tests puntuales de `ICO` + `Payroll`, `pnpm lint` y `pnpm build`

- **Internal roles and hierarchies architecture formalized**:
  - se creó la spec canónica `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
  - el contrato ahora separa explícitamente:
    - roles de acceso
    - supervisoría (`reports_to_member_id`)
    - estructura departamental (`departments`)
    - ownership operativo por cuenta/space/proyecto
  - se deja explícito que `departments` no debe funcionar como jerarquía universal para approvals y ownership comercial
  - el rol visible más amplio del sistema queda nombrado como `Superadministrador`, manteniendo `efeonce_admin` como código técnico actual
  - el mapping runtime de `efeonce_admin` ya quedó alineado para heredar todos los `routeGroups` del portal, incluyendo `client`, `finance`, `hr`, `people`, `my`, `ai_tooling`, `internal` y `admin`
  - además se formaliza una jerarquía visible de personas separada de RBAC: `Superadministrador`, `Responsable de Área`, `Supervisor`, `Colaborador`
  - se abrió `TASK-225` para cerrar la convergencia de naming, jerarquías y responsabilidades operativas scoped

- **Backlog ICO consumers aligned to the metric contract**:
  - se actualizaron tasks de `Agency`, `Nexa`, `HR`, `Frame.io`, `AI core`, `SLA`, `Scope`, `Temporal contract` e `Integrations` para que no contradigan `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - las tasks afectadas ahora dejan explícito que no deben:
    - redefinir localmente métricas `ICO`
    - reutilizar thresholds legacy como si fueran contrato vigente
    - exponer `Revenue Enabled`, `TTM`, `Iteration Velocity` o métricas afines como maduras si todavía dependen de lanes abiertas
  - esto reduce el riesgo de que el backlog vuelva a introducir semánticas paralelas para `OTD`, `FTR`, `RpA` y consumers futuros

- **Contrato de métricas ICO alineado a thresholds benchmark-informed**:
  - `docs/architecture/Contrato_Metricas_ICO_v1.md` ya no usa la tabla legacy de tres bandas para `OTD`, `FTR` y `RpA`
  - el contrato ahora adopta explícitamente las bandas benchmark-informed documentadas en `Greenhouse_ICO_Engine_v1.md`
  - además separa `Cycle Time`, `Cycle Time Variance` y `BCS` como métricas de calibración interna, evitando presentarlas con el mismo nivel de respaldo externo que `OTD`, `FTR` y `RpA`

- **ICO Engine external benchmarks documented**:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md` ahora incluye una sección específica de benchmarks externos y estándar recomendado para Greenhouse (`A.5.5`)
  - el documento distingue qué métricas sí tienen benchmark externo portable (`OTD`), cuáles solo tienen análogo razonable (`FTR`), cuáles tienen benchmark parcial creativo (`RpA`, `cycle time`) y cuáles deben seguir tratándose como policy interna (`throughput`, `pipeline velocity`, `stuck assets`, `carry-over`, `overdue carried forward`)
  - se documentaron referencias externas explícitas a `SCOR`, `APQC`, `IndustryWeek` y `visualloop` para evitar que los thresholds del engine se presenten como “estándares de industria” cuando en realidad son políticas internas o adaptaciones al contexto creativo

- **ICO Engine metrics architecture inventory consolidated**:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md` ahora consolida en una sola sección el inventario canónico de señales y métricas del engine
  - incorpora además las categorías funcionales de métricas ICO para ordenar hardening, lectura de negocio y diseño de readers
  - separa explícitamente qué señales ya llegan calculadas, qué derivados construye `v_tasks_enriched`, qué KPIs calcula `buildMetricSelectSQL()`, qué buckets/contexto expone y qué rollups adicionales viven en `performance_report_monthly`
  - la misma sección ya documenta también, por métrica, en qué consiste el cálculo y qué pregunta de negocio responde
  - esto deja una referencia única para alinear arquitectura, `metric-registry.ts`, `shared.ts` y `schema.ts`

- **ICO completed-status hardening for delivery KPIs**:
  - el engine ICO ya no considera una tarea como completada solo por `completed_at`
  - `OTD`, `RpA`, `FTR`, `cycle time` y `throughput` ahora requieren además estado terminal real (`Listo`, `Done`, `Finalizado`, `Completado`, `Aprobado`)
  - esto evita que filas incoherentes como `Sin empezar` o `Listo para revisión` con `completed_at` poblado contaminen los KPIs visibles en `Agency > Delivery` y otros consumers del engine

- **Agency Delivery current-month live KPI correction**:
  - `Agency > Delivery` vuelve a leer `OTD` / `RpA` del mes en curso, no del último período cerrado
  - los readers `/api/agency/pulse` y `/api/agency/spaces` ya no dependen de `ico_engine.metric_snapshots_monthly` para esos KPIs
  - ahora calculan live contra `ico_engine.v_tasks_enriched` con el filtro canónico del período actual en `America/Santiago`
  - esto preserva la semántica operativa de la vista (`mes en curso`) sin heredar snapshots mensuales abiertos e inestables
  - la cobertura de `agency-queries.test.ts` ahora fija explícitamente `periodYear` / `periodMonth` como contrato temporal

- **Deel contractors KPI bonus hotfix**:
  - `Payroll` y `Projected Payroll` ya no fuerzan `bonusOtdAmount` y `bonusRpaAmount` a `0` para `payroll_via = 'deel'`
  - los colaboradores `contractor` / `eor` vía Deel ahora calculan payout automático de `OTD` y `RpA` con la policy vigente de `payroll_bonus_config`
  - se preserva el contrato de Deel sin descuentos previsionales locales ni cálculo de compliance Chile dentro de Greenhouse
  - la UI de compensación y el detalle de payroll dejan de decir que los bonos KPI de Deel son discrecionales por defecto
  - se agregó cobertura en `src/lib/payroll/project-payroll.test.ts` para asegurar que un contractor Deel con KPIs válidos proyecte bonos reales

- **TASK-204 Carry-Over & Overdue Carried Forward Semantic Split**:
  - se implementó el split semántico canónico entre `Carry-Over` (carga creada en el período con entrega futura) y `Overdue Carried Forward` (deuda vencida de períodos previos aún abierta)
  - `OTD` ya no incluye carry-over ni OCF en el denominador: `OTD = On-Time / (On-Time + Late Drop + Overdue)`
  - `buildPeriodFilterSQL()` ahora incluye 3 universos de tareas: due_date en período + carry-over + OCF
  - `overdue_carried_forward_count` materializado en todas las tablas BQ (7 tablas) y PG serving (2 tablas)
  - migración PG: `greenhouse_serving.agency_performance_reports` + `greenhouse_serving.ico_member_metrics`
  - UI: card "Overdue Carried Forward" en Agency ICO y línea en IcoTab
  - publicación Notion: bullet + property para OCF
  - docs actualizados: ICO Engine, Performance Report Parity, Data Model Master, Operating Model

- **TASK-206 Delivery Operational Attribution Model**:
  - se formalizó el modelo canónico de atribución operativa como spec standalone: `docs/architecture/GREENHOUSE_OPERATIONAL_ATTRIBUTION_MODEL_V1.md`
  - el modelo separa explícitamente 4 capas: source identity → identity profile → operational actor → attribution role
  - documenta contrato de campos para `tasks` y `projects`, política `primary_owner_first_assignee`, actor type taxonomy, reglas de borde y guía prescriptiva para nuevos consumers
  - se actualizaron cross-references en `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_DATA_MODEL_MASTER_V1.md` y `GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
  - no hay cambios de runtime — formaliza decisiones ya implementadas por TASK-199

- **Admin integrations health semantics clarified**:
  - `Health & Freshness` ya separa estado actual de incidentes recientes en `/admin/integrations`
  - el badge `Health` ahora refleja la ultima senal valida y su frescura, en vez de degradarse automaticamente por cualquier fallo dentro de 24h
  - los incidentes recientes siguen visibles como contexto operativo separado bajo el badge, para no ocultar recuperaciones reales ni perder trazabilidad
  - se agrego regresion en `src/lib/integrations/health.test.ts` para cubrir integraciones recuperadas con fallos historicos recientes y senales realmente stale

- **TASK-209 conformed writer staged swap + freshness gate**:
  - `sync-notion-conformed` deja de hacer reemplazos secuenciales directos sobre `greenhouse_conformed.delivery_*`
  - ahora stagea en tablas efímeras y aplica un swap transaccional para `delivery_projects`, `delivery_tasks` y `delivery_sprints`
  - se agregó una gate de frescura por tabla para evitar reescrituras cuando `greenhouse_conformed` ya está al día respecto de `notion_ops`
  - esto corrige el failure mode observado en production donde `delivery_projects` podía avanzar sola y dejar `delivery_tasks` / `delivery_sprints` atrás cuando BigQuery devolvía `too many table update operations for this table`

- **Production GCP auth fallback switch**:
  - se agregó `GCP_AUTH_PREFERENCE` como override explícito para seleccionar la fuente de credenciales GCP en runtime (`auto`, `wif`, `service_account_key`, `ambient_adc`)
  - el default sigue prefiriendo `WIF`; el override solo se activa cuando el entorno lo fija
  - esto habilita un fallback controlado para Cloud SQL Connector, BigQuery y Secret Manager en Vercel production sin desmontar la postura WIF del resto de entornos

- **TASK-209 Notion sync orchestration closure**:
  - se agregó la tabla `greenhouse_sync.notion_sync_orchestration_runs` como control plane tenant-scoped para el cierre `raw -> conformed` por `space`
  - `GET /api/cron/sync-conformed` ahora registra explícitamente `waiting_for_raw` y deja de depender de reruns manuales para recuperar paridad después del refresh raw
  - se agregó `GET /api/cron/sync-conformed-recovery` como carril de retry auditado para converger automáticamente dentro de la ventana diaria
  - `/admin/integrations` y `TenantNotionPanel` ahora muestran estado de orquestación junto al monitor de data quality para distinguir `esperando raw`, `retry`, `completed` y `failed`
  - `vercel.json` queda alineado al scheduler upstream real de `../notion-bigquery`: conformed principal a `20 6 * * *`, recovery cada `30` minutos y monitor de data quality después de la ventana de recuperación

- **TASK-130 login auth flow UX**:
  - botón de credenciales ahora usa `LoadingButton` de MUI Lab con spinner integrado durante submit
  - botones SSO (Microsoft, Google) muestran `CircularProgress` individual + texto "Redirigiendo a {provider}..." y se deshabilitan mutuamente con `isAnyLoading`
  - `LinearProgress` indeterminado aparece en el top del card durante cualquier loading
  - pantalla de transición post-auth con logo + spinner + "Preparando tu espacio de trabajo..." reemplaza el formulario tras auth exitosa
  - nuevo `loading.tsx` en `auth/landing` muestra skeleton durante resolución de sesión server-side (elimina pantalla blanca)
  - errores categorizados: credentials, account disabled, session expired, network, provider unavailable — con `Alert` severity diferenciada (error/warning) y botón de cerrar
  - 8 nuevos textos en `GH_MESSAGES` para loading states y errores categorizados
  - todo el formulario (inputs, botones, links) se deshabilita durante cualquier operación de auth

- **Notion Delivery data quality null-param fix**:
  - el monitor de `TASK-208` ya no envía `assigneeSourceId: null` a BigQuery cuando el sweep corre sin filtro por responsable
  - se corrigió el helper `src/lib/space-notion/notion-parity-audit.ts` para omitir ese parámetro opcional y evitar el crash runtime `Parameter types must be provided for null values`
  - se agregó la regresión `src/lib/space-notion/notion-parity-audit-query.test.ts` para cubrir el contrato de params sin assignee
  - esto ataca el `degraded` falso-negativo en staging, donde el cron fallaba antes de persistir `integration_data_quality_runs`
  - seguimiento adicional del mismo incidente:
    - tras rerun de `sync-conformed`, el estado real pasó de `broken` a `degraded`
    - el residual provenía de otro falso positivo: el auditor estaba leyendo `tarea_principal_ids` / `subtareas_ids` del raw pero forzando arrays vacíos en `greenhouse_conformed.delivery_tasks`
    - el helper ahora lee la jerarquía persistida real cuando esas columnas existen en conformed, evitando degradar por `hierarchy_gap_candidate` cuando el writer ya preservó la relación task/subtask

- **TASK-109 projected payroll runtime hardening**:
  - `projected-payroll-store.ts` ya no ejecuta `CREATE TABLE IF NOT EXISTS` en runtime; reemplazado por `verifyInfrastructure()` con fail-fast y error accionable si la tabla no existe
  - los cuatro eventos `payroll.projected_*` quedan formalizados como audit-only en el Event Catalog; `payroll.projected_snapshot.refreshed` marcado como deprecated (definido pero sin publisher activo)
  - se documentaron señales de health específicas de `projected_payroll` en el Reactive Projections Playbook
  - se actualizó el contrato de Projected Payroll en `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` con la nota de DDL eliminado
  - tests actualizados: fail-fast, no-DDL verification, null deductions normalization

- **Admin Cloud & Integrations route fix**:
  - la navegación principal de `Cloud & Integrations` ahora apunta a la surface canónica `/admin/integrations`
  - `/admin/cloud-integrations` queda como alias compatible con redirect server-side para evitar clicks muertos o drift entre menú, cards y governance surface
  - `Admin Center`, `Ops Health`, el menú vertical y el catálogo de vistas quedaron alineados al mismo destino

- **TASK-208 delivery notion data quality monitor**:
  - se agregaron las tablas `greenhouse_sync.integration_data_quality_runs` y `greenhouse_sync.integration_data_quality_checks` para persistir scoring y findings históricos del pipeline `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
  - se agregó el helper `src/lib/integrations/notion-delivery-data-quality.ts` para ejecutar el auditor por `space`, clasificar `healthy / degraded / broken`, persistir evidencia y alertar por Slack en estados degradados o rotos
  - `GET /api/cron/notion-delivery-data-quality` corre el monitor en forma recurrente y `GET /api/cron/sync-conformed` ahora dispara un sweep post-sync sin bloquear el writer canónico si el monitor falla
  - `/admin/integrations`, `/admin/ops-health` y `TenantNotionPanel` ya exponen el estado operativo, findings recientes e historial corto del monitor
  - `TASK-208` queda cerrada como capa continua de observabilidad y data quality sobre los contratos ya definidos por `TASK-205` y `TASK-207`

- **TASK-207 delivery notion sync pipeline hardening**:
  - `sync-conformed` ahora exige readiness con frescura real de `notion_ops.tareas` y `notion_ops.proyectos`
  - el writer canónico `src/lib/sync/sync-notion-conformed.ts` ahora salta runs stale con trazabilidad explícita en `greenhouse_sync.source_sync_runs`
  - `greenhouse_conformed.delivery_tasks` y `greenhouse_delivery.tasks` ahora preservan jerarquía con `tarea_principal_ids` y `subtareas_ids`
  - se agregó validación persisted raw→conformed por `space_id` para totales, status, cobertura de assignee, due date y jerarquía
  - el script legacy `scripts/sync-source-runtime-projections.ts` mantiene la proyección/manual seed, pero deja el overwrite de conformed detrás del guardrail `GREENHOUSE_ENABLE_LEGACY_CONFORMED_OVERWRITE=true`
  - se agregaron pruebas unitarias para los gates de frescura Notion y la validación de paridad de tareas
  - el lane quedó alineado al control plane existente (`/api/cron/sync-conformed`, `/api/admin/integrations/[integrationKey]/sync`, `integration_registry`, `source_sync_runs`) sin crear una surface paralela

- **TASK-205 delivery notion origin parity audit**:
  - `TASK-205` queda cerrada como lane de auditoría reusable para comparar `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
  - se agregó el helper `src/lib/space-notion/notion-parity-audit.ts`, la route admin `GET /api/admin/tenants/[id]/notion-parity-audit` y el script `pnpm audit:notion-delivery-parity`
  - la verificación real de abril 2026 quedó reproducible:
    - `Daniela / due_date`: `Sky 56 -> 50`, `Efeonce 24 -> 23`
    - `Andrés / due_date`: total `13 -> 10`
    - `Andrés / created_at`: total `9 -> 1`
  - los buckets reusable ya confirman `missing_in_conformed`, `status_mismatch`, `due_date_mismatch`, `fresh_raw_after_conformed_sync` y `hierarchy_gap_candidate`
  - el hardening estructural del pipeline y las freshness gates siguen asignados a `TASK-207`

- **Delivery carry-over semantic correction**:
  - `Carry-Over` deja de interpretarse como tarea vencida de períodos anteriores aún abierta
  - la definición canónica pasa a ser: tarea creada dentro del período con `due_date` posterior al cierre del período
  - se incorpora `Overdue Carried Forward` como métrica separada para deuda vencida que cruza de mes
  - `OTD` queda explícitamente separado de ambas métricas complementarias
  - se abrió `TASK-204` para implementar el split semántico en el engine y las materializaciones

- **Delivery performance metric audit follow-on**:
  - `readAgencyPerformanceReport()` ahora prioriza `ico_engine.performance_report_monthly` antes que `greenhouse_serving.agency_performance_reports`
  - `greenhouse_serving` queda explícitamente como cache/fallback y no como fuente preferida del cálculo
  - se agregó la prueba `src/lib/ico-engine/performance-report.test.ts` para cubrir el orden `materialized-first`
  - la auditoría task-level confirmó que `Marzo 2026` sigue consistente entre snapshot congelado y serving bajo el contrato actual
  - también dejó explícito que `carry-over` sigue siendo una decisión semántica separada y no un bug de lectura de fuente

## 2026-04-02

- **TASK-201 delivery performance historical materialization reconciliation**:
  - `sync-notion-conformed` se reejecutó y confirmó que `Sky` sí tenía status operativo en origen; el contrato ahora acepta `Estado 1` como alias de `task_status`
  - `ICO` ahora soporta snapshots congelados por tarea en `ico_engine.delivery_task_monthly_snapshots`
  - se agregó `pnpm freeze:delivery-performance-period <year> <month>` para congelar un período, rematerializar `ICO` y refrescar `agency_performance_reports`
  - `pnpm reconcile:delivery-performance-history 2026 3` ahora congela el período antes de reconciliarlo contra Notion
  - verificación real de marzo 2026:
    - `294` filas `locked` en el snapshot task-level
    - `293` tareas clasificadas en `performance_report_monthly`
    - scorecard Greenhouse congelado: `84.3% OT`, `247 on-time`, `25 late drops`, `21 overdue`
  - conclusión operativa:
    - marzo 2026 queda calibrado pero no con paridad exacta retroactiva
    - el residual se documenta como historia mutable en Notion posterior al cierre
    - abril 2026 en adelante debe operar con freeze mensual y no recalcularse desde el estado vivo del workspace

- **TASK-200 delivery performance metric semantic contract**:
  - el contrato mensual del `Performance Report` queda fijado sobre `due_date in period`
  - la fecha de corte canónica pasa a ser `period_end + 1 day`
  - `OTD` del scorecard mensual deja de usar `on_time / (on_time + late_drop)` y pasa a `on_time / total_classified_tasks`
  - `Top Performer` ya usa `OTD` canónico y volumen total de tareas del período como elegibilidad/desempate
  - `shared.ts`, `materialize.ts`, `performance-report.ts` y `metric-registry.ts` quedaron alineados a ese contrato

- **TASK-199 delivery performance owner attribution contract**:
  - `ICO` member-level deja de acreditar tareas por `UNNEST(assignee_member_ids)` y pasa a acreditar solo al owner principal miembro
  - `v_tasks_enriched` ahora expone aliases explícitos `primary_owner_source_id`, `primary_owner_member_id`, `primary_owner_type` y `has_co_assignees`
  - la dimensión `member` de `ICO` ya apunta a `primary_owner_member_id`
  - `Person ICO` quedó alineado al mismo contrato y ya no usa co-crédito
  - `Top Performer` ahora publica explícitamente que co-asignados y owners cliente no reciben member credit
  - verificación de negocio marzo 2026:
    - `Daniela` pasa de `104` tareas por co-crédito a `98` por owner principal
    - `multi_member_tasks`: `4`
    - `Sky` conserva `39` tareas con owner primario no-miembro sin credit a `member`

- **TASK-198 delivery notion assignee identity coverage**:
  - `discovery-notion.ts` ya excluye IDs Notion enlazados tanto en BigQuery como en PostgreSQL y dejó de depender solo de `greenhouse.team_members`
  - `reconciliation-service.ts` ahora prioriza `greenhouse_core.members` como fuente canónica de candidates y usa BigQuery solo como fallback
  - `apply-link.ts` ahora persiste también `identity_profile_source_links` en PostgreSQL y puede completar `client_users.member_id` cuando el perfil ya tiene principal
  - `delivery-coverage.ts` ahora distingue cobertura raw vs cobertura colaborador y clasifica responsables Delivery como `member`, `client_user`, `external_contact`, `linked_profile_only` o `unclassified`
  - se agregó `scripts/backfill-delivery-notion-client-assignee-links.ts` para sembrar source links de responsables cliente en BigQuery y PostgreSQL
  - `Constanza Rojas` y `Adriana Velarde` quedaron resueltas explícitamente como diseñadoras in-house de `Sky`, modeladas como `client_user + identity_profile` y no como `member`
  - verificación real marzo 2026:
    - `Efeonce`: `116/116` tareas con `assignee_member_id`
    - `Sky`: `42` tareas clasificadas como contactos cliente (`Constanza` `29`, `Adriana` `13`)
    - `Sky collaborator coverage`: `145/145 = 100%`
  - residual explícito: `Sin asignar` y la semántica final de owner principal/co-asignados quedan abiertos para `TASK-199`

- **TASK-197 delivery source sync assignee/project parity**:
  - `greenhouse_conformed.delivery_tasks` ahora preserva `project_source_ids` además de `project_source_id`
  - `sync-notion-conformed.ts` ahora valida cobertura de responsables por `space_id`, evitando que un space sano masque otro roto
  - `sync-notion-conformed.ts` dejó de perder `Sky` cuando `responsables_ids = []` y `responsable_ids` sí trae owner; ahora prioriza arrays no vacíos
  - `scripts/sync-source-runtime-projections.ts` ya normaliza `responsables_ids` y `responsable_ids`, y proyecta `assignee_source_id`, `assignee_member_ids` y `project_source_ids` a `greenhouse_delivery.tasks`
  - `scripts/sync-source-runtime-projections.ts` ahora también fuerza arrays no nulos para PostgreSQL y resuelve `client_id` desde `space_notion_sources -> spaces`
  - `team-queries` ya soporta spaces que usen `responsable_ids`
  - `Project Detail` ya considera `proyecto_ids` además del proyecto primario
  - se aplicó la migración `20260402222438783_delivery-runtime-space-fk-canonicalization.sql` para mover `greenhouse_delivery.{projects,sprints,tasks}.space_id` a FK canónica sobre `greenhouse_core.spaces(space_id)` con backfill de IDs legacy a `spc-*`
  - `scripts/setup-postgres-source-sync.sql` quedó alineado con esa FK canónica
  - quedó versionada la migración `20260402220356569_delivery-source-sync-assignee-project-parity.sql`
  - verificación real en `greenhouse_conformed` para marzo 2026:
    - `Sky`: `190/190` con `project_source_ids`
    - `Sky`: `187/190` con `assignee_source_id`
    - `Sky`: `151/190` con `assignee_member_ids`
    - `Efeonce`: `116/116` con `assignee_source_id`
  - validación ejecutada: targeted `eslint`, `pnpm lint`, `pnpm migrate:up`, `rg -n "new Pool\\(" src scripts`
  - seguimiento abierto: el reseed completo de `scripts/sync-source-runtime-projections.ts` sigue corriendo lento y la paridad total de marzo en PostgreSQL runtime todavía no debe considerarse cerrada

- **TASK-187 notion governance formalization**:
  - nueva governance lane tenant-scoped para Notion sobre `space_notion_sources`, con snapshots, drift y KPI readiness persistidos en `greenhouse_sync.notion_space_*`
  - nuevas APIs admin: `GET /api/admin/tenants/[id]/notion-governance` y `POST /api/admin/tenants/[id]/notion-governance/refresh`
  - `TenantNotionPanel` ahora muestra readiness por `space`, snapshots por base, drift abierto y CTA admin para refrescar schema governance
  - `POST /api/integrations/notion/register` ahora intenta refrescar governance best-effort y su `nextStep` quedó alineado con el control plane real `POST /api/admin/integrations/notion/sync`
  - `scripts/notion-schema-discovery.ts` quedó reconciliado con el binding canónico actual `greenhouse_core.space_notion_sources`
  - `.env.example` y `project_context.md` ahora documentan `NOTION_PIPELINE_URL` y el uso server-side de `NOTION_TOKEN` para el refresh administrativo de schema
  - validación ejecutada: `pnpm migrate:up`, `pnpm lint`, `pnpm build`, `rg -n "new Pool\\(" src`

- **Finance Clients financial contacts org-first UI follow-on**:
  - `Finance > Clients > Contactos` ya permite agregar contactos financieros desde la propia ficha del cliente cuando existe `organization_id`
  - la vista reutiliza `AddMembershipDrawer` del dominio `Organization` restringido a memberships `billing` / `contact`, en vez de abrir otro flujo paralelo
  - `GET /api/finance/clients/[id]` ahora prioriza `person_memberships` de la organización canónica para poblar contactos; `finance_contacts` queda como fallback legacy
  - validación ejecutada: targeted `vitest`, `pnpm lint`, `pnpm build`

- **TASK-193 person-organization synergy activation**:
  - `Efeonce` quedó regularizada como operating entity real en `greenhouse_core.organizations` con razón social, RUT y dirección legal canónicos
  - se aplicó la migración `20260402094316652_task-193-operating-entity-session-canonical-person.sql`, incluyendo backfill de `person_memberships(team_member)` para los `members` activos y regeneración de `src/types/db.d.ts`
  - `session_360` ahora resuelve `organization_id` para usuarios internos vía operating entity y mantiene fallback de primary membership para carriles client
  - `person_360` ahora publica org primaria, aliases `eo_id`/`member_id`/`user_id` y `is_efeonce_collaborator`, lo que habilita a `CanonicalPersonRecord` a consumir contexto organizacional canónico
  - `organization_360` enriqueció el aggregate `people` con `memberId`, `assignedFte`, `assignmentType`, `jobLevel` y `employmentType` para memberships `team_member`
  - `Organization > People` y el reader `/api/organizations/[id]/memberships` ya hacen visible la distinción `internal` vs `staff_augmentation` como contexto operativo del vínculo cliente, sin crear un `membership_type` nuevo
  - `People > Finance` ya acepta `organizationId` opcional y fuerza tenant isolation para usuarios `client`
  - `People > Delivery`, `People > ICO Profile`, `People > ICO` y el aggregate `GET /api/people/[memberId]` ya consumen `organizationId` cuando el request viene org-scoped desde tenant `client`
  - `HR` e `intelligence` quedan declarados como surfaces internas; para tenant `client` responden `403` y dejan de considerarse deuda client-facing de esta lane
  - `Organization memberships` ahora también puede sembrar contactos mínimos ad hoc con nombre + email, y `finance/suppliers` create/update intenta persistir `organization contact memberships` cuando el supplier ya tiene `organization_id`
  - `Finance Suppliers` detail/list ya consume esos contactos org-first cuando existen, exponiendo `organizationContacts`, `contactSummary` y `organizationContactsCount` sin romper el fallback legacy `primary_contact_*`
  - validación ejecutada: `GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false pnpm migrate:up`, targeted `vitest`, `pnpm lint`, `pnpm build`, `rg -n "new Pool\\(" src`

- **TASK-192 finance org-first materialized serving cutover**:
  - `cost_allocations`, `client_economics` y `commercial_cost_attribution` ahora persisten contexto `organization_id` y, donde aplica, `space_id`, manteniendo `client_id` solo como bridge explícito de compatibilidad
  - `operational_pl` quedó reconciliado para propagar organización desde ingresos, allocations, expenses y commercial attribution sin depender solo del bridge legacy `client -> space`
  - `allocations` y `client_economics` ya pueden leer serving org-first incluso cuando no exista `clientId` legacy materializado para el request
  - `Agency` y `Organization 360` quedaron alineados al scope material correcto: space-first para Agency y organization-first para economics
  - se aplicó la migración `20260402085449701_finance-org-first-materialized-serving-keys.sql` con backfill compatible y regeneración de `src/types/db.d.ts`
  - validación ejecutada en este tramo: `pnpm migrate:up` por Cloud SQL Proxy, targeted `vitest`, `pnpm lint` y `pnpm build`

- **TASK-191 finance organization-first downstream consumers cutover**:
  - `purchase-orders` y `hes` quedaron alineados para aceptar contexto org-first además de `clientId`, manteniendo `client_id` solo como bridge legacy donde el storage todavía lo necesita
  - `expenses`, `expenses/bulk`, `cost allocations` y `client_economics` pasaron a resolver scope downstream desde un helper compartido, reduciendo la dependencia de que la UI empuje `clientId` manualmente
  - los drawers de Finance se documentaron para operar con selección org-first y mostrar el bridge legado solo cuando exista
  - residual legacy visible:
    - `client_id` sigue siendo la llave materializada en varias tablas y readers financieros
    - `cost_allocations` y parte del serving analítico todavía no migran físicamente a `organization_id`
  - validación ejecutada en este tramo: `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/purchase-orders/route.test.ts src/app/api/finance/intelligence/allocations/route.test.ts`, `pnpm lint` y `pnpm build`
  - queda pendiente solo el smoke manual de OC/HES/expenses/allocations con cliente org-first

## 2026-04-01

- **TASK-181 finance clients canonical source cutover**:
  - `Finance Clients` deja de anclarse en `greenhouse_core.clients` y pasa a leer/escribir org-first sobre `greenhouse_core.organizations WHERE organization_type IN ('client', 'both')`
  - `client_profiles.organization_id` queda como FK fuerte del dominio; `client_id` se preserva como bridge operativo para módulos y projections legacy
  - `resolveFinanceClientContext()` ya soporta `organizationId` como anchor canónico además de `clientId`, `clientProfileId` y `hubspotCompanyId`
  - readers downstream de `Organization 360` y `client_economics` quedaron reconciliados para no perder snapshots cuando el contexto financiero venga identificado por organización
  - se aplicó backfill real de dos legacy clients huérfanos (`nubox-client-76438378-8`, `nubox-client-91947000-3`) para poblar `client_profiles.organization_id`

- **TASK-189 rolling rematerialization hardening**:
  - `/api/cron/ico-materialize` ahora rematerializa por defecto una ventana rolling de `3` meses (`monthsBack`, configurable hasta `6`)
  - la proyección `ico_member_metrics` ahora refresca el período explícito informado por el payload de materialización, evitando asumir siempre el mes actual
  - `schema-snapshot-baseline.sql` quedó reconciliado con `carry_over_count` en `greenhouse_serving.ico_member_metrics`

## 2026-04-01

- **TASK-189 hardening de member metrics materialized-first**:
  - `readMemberMetrics()` y `readMemberMetricsBatch()` ahora hacen fallback live por miembro si `metrics_by_member` trae buckets/contexto críticos en `null` con `total_tasks > 0`
  - esto evita que consumers como `People` o `Payroll` sigan mostrando snapshots legacy incompletos tras el cambio de semántica por `due_date`
  - `People > Activity` ahora muestra `Sin cierres` en KPIs de calidad cuando el período está abierto y todavía no existen completaciones reales

## 2026-04-01

- **TASK-188: Native Integrations Layer — Platform Governance**:
  - nueva tabla `greenhouse_sync.integration_registry` como Layer 1 del registry central de integraciones nativas
  - seeded con 4 integraciones: Notion (hybrid), HubSpot (system_upstream), Nubox (api_connector), Frame.io (event_provider)
  - taxonomia formal: `system_upstream`, `event_provider`, `batch_file`, `api_connector`, `hybrid`
  - shared types en `src/types/integrations.ts` para registry, health y readiness
  - helpers Kysely en `src/lib/integrations/registry.ts` y health aggregation en `src/lib/integrations/health.ts`
  - API admin: `GET /api/admin/integrations`, `GET /api/admin/integrations/[key]/health`
  - se extendió el control plane del registry con `sync_endpoint`, `paused_at`, `paused_reason` y `last_health_check_at`
  - nuevas acciones admin: `pause`, `resume` y `sync on-demand` por integración
  - nueva API v1 shared: `GET /api/integrations/v1/readiness` y `POST /api/integrations/v1/register`
  - admin governance page en `/admin/integrations` con registry table, health/freshness bars, consumer domain map y sección `Control plane`
  - architecture docs actualizados: GREENHOUSE_ARCHITECTURE_V1, SOURCE_SYNC_PIPELINES, DATA_MODEL_MASTER

## 2026-04-01

- **ICO period hardening + Delivery metrics trust MVP**:
  - `ICO` ahora ancla el período operativo en `due_date` con fallback a `created_at` / `synced_at`, dejando atrás el criterio exclusivo por `completed_at`
  - se agregó `carry_over_count` al contrato canónico del engine y a las materializaciones BigQuery principales (`metric_snapshots_monthly`, `metrics_by_member`, `metrics_by_project`, `metrics_by_sprint`, `metrics_by_organization`, `metrics_by_business_unit`)
  - el engine ahora también materializa buckets canónicos aditivos (`on_time_count`, `late_drop_count`, `overdue_count`) y los expone como contexto de snapshot sin redefinir los KPIs existentes
  - se cerró la semántica canónica actual: `on_time` / `late_drop` prefieren `performance_indicator_code` con fallback por fechas; `overdue` / `carry-over` siguen siendo período-relativos; `FTR` ahora usa una señal compuesta sobre `RpA`, rounds cliente/workflow y cierre real de revisión/comentarios
  - `readMemberMetrics()` ya no pierde `CSC distribution` en el path materializado y el `PersonActivityTab` ahora muestra `carry-over` + banner cuando aún no hay cierres en el período
  - `Space 360 > ICO` ahora deja visibles esos buckets para auditoría operativa del snapshot
  - Agency `ICO Engine` ahora muestra un `Performance Report` mensual MVP con comparativo vs mes anterior y `Top Performer`
  - ese `Performance Report` ya no vive solo como helper de lectura: ahora también se materializa en `ico_engine.performance_report_monthly`, construido desde `metric_snapshots_monthly` + `metrics_by_member` con fallback seguro al cálculo previo si el snapshot todavía no existe
  - el reporte mensual ahora también entrega mezcla por segmento (`taskMix`), `Alerta` y `Resumen Ejecutivo` determinísticos sobre el snapshot materializado
  - el scorecard ahora expone segmentación explícita `Tareas Efeonce` y `Tareas Sky`, manteniendo `taskMix` para segmentos adicionales
  - se agregó `greenhouse_serving.agency_performance_reports` como cache OLTP del scorecard mensual, alimentado por la proyección reactiva `agency_performance_reports`
  - `scripts/materialize-member-metrics.ts` quedó alineado como wrapper del motor canónico para evitar deriva semántica
  - arquitectura viva actualizada en `Greenhouse_ICO_Engine_v1.md` y `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## 2026-04-01

- **Native Integrations Layer architecture**:
  - se agregó `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md` como fuente canónica para la capability shared de integraciones enterprise; `TASK-188` queda como lane operativa y `Notion` como primera implementación fuerte del modelo

## 2026-04-01

- **PostgreSQL runtime grant reconciliation**:
  - staging recuperó acceso real a `greenhouse_notifications` y a tablas serving como `member_capacity_economics` e `ico_member_metrics`; además se alinearon los scripts de setup y `pg:doctor` para que el drift no reaparezca en futuros bootstrap

- **People + Notifications staging fallback**:
  - `/people` ya no cae si el overlay `member_capacity_economics` no tiene permisos en staging, y el contador de notificaciones ahora degrada a `0` si `greenhouse_notifications` no es accesible

- **Vitest tooling coverage**:
  - `pnpm test` ya descubre también tests unitarios versionados en `scripts/**`, cerrando el hueco que dejaba fuera el carril de tooling/CLI

## 2026-04-01

- **TASK-026 HRIS contract canonicalization**:
  - `greenhouse_core.members` pasó a ser el canon de `contract_type`, `pay_regime`, `payroll_via` y `deel_contract_id`
  - `greenhouse_payroll.compensation_versions` conserva el snapshot historico del contrato para payroll, pero ya no es la fuente de verdad del colaborador
  - `greenhouse_payroll.payroll_entries` ahora guarda `payroll_via`, `deel_contract_id`, `sii_retention_rate` y `sii_retention_amount`
  - `member_360`, `member_payroll_360` y `person_hr_360` quedaron alineadas para exponer canon + aliases de snapshot sin duplicar semantica
  - `daily_required` sigue siendo el flag canónico; `schedule_required` queda solo como alias semantico de lectura
  - la migración aplicada quedó versionada como `20260402001100000_hris-contract-types.sql`
  - validacion cerrada del branch: `pnpm migrate:up` ✅, `pnpm db:generate-types` ✅, `pnpm lint` ✅, `pnpm build` ✅
  - nota operativa: la corrida de migracion detecto `ETIMEDOUT` contra la IP publica de Cloud SQL hasta levantar Cloud SQL Proxy local; luego aparecio un conflicto de orden por timestamps anteriores a migraciones ya aplicadas, y finalmente el DDL cross-schema solo pudo ejecutar con `greenhouse_ops` como owner efectivo

## 2026-04-01

- **HR Departments Postgres runtime cutover** (`TASK-180`):
  - `HR > Departments` deja de leer/escribir `greenhouse.departments` en BigQuery y pasa a operar sobre `greenhouse_core.departments` en PostgreSQL
  - nuevo store `src/lib/hr-core/postgres-departments-store.ts` para list/detail/create/update y para alinear la asignación `members.department_id`
  - `getMemberHrProfile()` ya resuelve `departmentId`/`departmentName` desde PostgreSQL y el update de perfil HR deja de mutar `team_members.department_id` en BigQuery
  - se agregó backfill idempotente `scripts/backfill-hr-departments-to-postgres.ts` para otros entornos aunque `dev` no tenía drift real (`0` departamentos en BigQuery y Postgres)
  - nueva migración `20260402001000000_hr-departments-head-member-fk.sql` para endurecer FK `head_member_id -> greenhouse_core.members(member_id)` e índices de apoyo
  - validación cerrada end-to-end: `vitest`, `lint`, `build`, `tsc`, `pg:doctor` (`runtime` y `migrator`), `pnpm migrate:up` y `pnpm db:generate-types`
  - el bloqueo inicial de `ETIMEDOUT` se resolvió usando Cloud SQL Auth Proxy en `127.0.0.1:15432` como ya exigía `AGENTS.md`

- **Database Tooling Foundation** (TASK-184 + TASK-185):
  - Instalado `node-pg-migrate` para migraciones SQL versionadas — wrapper TypeScript en `scripts/migrate.ts`, migraciones en `migrations/`
  - Creado `src/lib/db.ts` como conexión centralizada: re-exporta `postgres/client.ts` + agrega Kysely lazy via `getDb()`
  - Instalado `kysely` + `kysely-codegen` — tipos generados desde DB live: 140 tablas, 3042 líneas en `src/types/db.d.ts`
  - `pnpm migrate:up` ahora auto-regenera tipos Kysely después de aplicar migraciones (saltar con `MIGRATE_SKIP_TYPES=true`)
  - Baseline migration aplicada en `greenhouse-pg-dev`
  - CI check de migraciones agregado a `.github/workflows/ci.yml`
- **Ownership consolidation** — 122 tablas, 11 schemas, 17 views consolidados bajo `greenhouse_ops`:
  - Antes: 5 owners distintos (`greenhouse_migrator` 41, `greenhouse_migrator_user` 39, `postgres` 32, `greenhouse_app` 9, `greenhouse_ops` 1)
  - Después: `greenhouse_ops` 122/122
  - Default privileges configurados para grants automáticos en objetos futuros
  - Password de `greenhouse_ops` almacenada en Secret Manager (`greenhouse-pg-dev-ops-password`)
  - `pg_dump` ahora funciona correctamente — schema snapshot baseline generado (8636 líneas)
- **Documentación**:
  - Creado `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — spec completa de tooling
  - Actualizado `CLAUDE.md`, `AGENTS.md`, `project_context.md`, `Handoff.md`
  - Actualizado 3 docs de arquitectura existentes (Architecture, Cloud Infrastructure, Data Platform)
  - Actualizado Access Model con delta de ownership consolidation
  - Delta notes en TASK-172, TASK-174, TASK-180

## 2026-03-31

- `Finance > Egresos` ya materializa correctamente las nóminas exportadas atrasadas de febrero/marzo:
  - se corrigió starvation en el consumer reactivo para que el dominio `finance` pueda saltarse eventos `published` ya terminales para todos sus handlers
  - se corrigió el `INSERT` canónico de `createFinanceExpenseInPostgres()` que podía fallar por desalineación entre columnas y `VALUES`
  - se agregó `scripts/backfill-payroll-expenses-reactive.ts` y se ejecutó backfill real en `greenhouse-pg-dev`
  - resultado materializado:
    - `2026-02` → `2` expenses `payroll`
    - `2026-03` → `4` expenses `payroll` + `1` `social_security`
  - gaps operativos detectados en el mismo carril:
    - `greenhouse_serving.provider_tooling_snapshots` y `provider_tooling_360` no existen aún en `staging`
    - `commercial_cost_attribution` existe pero sigue con `permission denied` para el reactor de Finance
    - Vercel sigue scheduleando solo `/api/cron/outbox-react`, no las domain routes documentadas
- `TASK-182` y `TASK-183` quedaron documentadas en conjunto con su contrato final de Finance Expenses:
  - el drawer ahora usa la taxonomía visible `Operacional / Tooling / Impuesto / Otro`
  - el ledger quedó endurecido con `space_id`, `source_type`, `payment_provider` y `payment_rail`
  - `payroll_period.exported` quedó formalizado como trigger reactivo para materializar expenses de `payroll` y `social_security`
  - `Finance` sigue como owner del ledger y `Cost Intelligence` como consumer/attributor
  - la validación runtime no se re-ejecutó en este turno documental; el cierre se apoya en la implementación ya validada en la lane anterior
- `Finance > Suppliers` ya no deja huérfano el estado `Sin vínculo canónico`:
  - el detalle del supplier ahora permite `Crear vínculo canónico`
  - el tab `Provider 360` también ofrece ese CTA en el empty state
  - se agregó soporte server-side para `autoLinkProvider` en `PUT /api/finance/suppliers/[id]`
  - se agregó backfill batch `POST /api/finance/suppliers/backfill-provider-links`
  - el listado ahora muestra cuántos proveedores siguen sin vínculo canónico y permite correr `Backfill Provider 360` desde UI
- `HR > Departments` ya no falla al crear departamentos raíz por parámetros `null` en el write path legacy de BigQuery:
  - `runHrCoreQuery()` ahora acepta `types` explícitos para queries tipadas
  - create/update de departamentos declaran `STRING` en campos opcionales como `description`, `parentDepartmentId` y `headMemberId`
  - se agregó regresión para el caso de creación de departamento sin padre
  - esto es un hotfix transicional; el cutover estructural del módulo quedó abierto en `TASK-180`
- `TASK-173` quedó cerrada formalmente:
  - movida a `docs/tasks/complete/`
  - índice de tasks reconciliado
  - el pendiente residual de smoke autenticado ya no aplica después de validar `leave` end-to-end en la surface HR real
- `HR > Permisos` ahora muestra el respaldo adjunto dentro del modal `Revisar solicitud`:
  - el backend ya guardaba `attachment_asset_id`, pero la UI no lo exponía
  - se agregó CTA `Abrir respaldo` directo en la revisión HR
  - queda cubierta con test de vista para evitar regresiones
- Se endureció la foundation shared de adjuntos para evitar fallos al adjuntar respaldos de `leave` después de un upload exitoso:
  - `ownerClientId`, `ownerSpaceId` y `ownerMemberId` ahora se normalizan en la capa shared antes de tocar FKs
  - esto corrige el caso de usuarios internos cuyo `tenant.clientId` llega como cadena vacía `''`
  - el hardening aplica a:
    - `createPrivatePendingAsset`
    - `attachAssetToAggregate`
    - `upsertSystemGeneratedAsset`
  - se agregó test unitario de regresión para ownership scope vacío
- Se provisionó la topología definitiva de buckets GCP para assets compartidos:
  - `efeonce-group-greenhouse-public-media-dev`
  - `efeonce-group-greenhouse-public-media-staging`
  - `efeonce-group-greenhouse-public-media-prod`
  - `efeonce-group-greenhouse-private-assets-dev`
  - `efeonce-group-greenhouse-private-assets-staging`
  - `efeonce-group-greenhouse-private-assets-prod`
  - todos en `US-CENTRAL1`, `STANDARD`, con `uniform bucket-level access`
  - los buckets privados quedaron con `publicAccessPrevention=enforced`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` recibió `roles/storage.objectAdmin` bucket-level
  - los buckets públicos quedaron legibles anónimamente vía `roles/storage.objectViewer` para `allUsers`
- Se alineó el runtime de storage en Vercel para evitar drift entre código y cloud real:
  - `development` ahora apunta a `public-media-dev` / `private-assets-dev`
  - `staging` ahora apunta a `public-media-staging` / `private-assets-staging`
  - `production` ahora apunta a `public-media-prod` / `private-assets-prod`
  - `preview (develop)` ahora apunta a `public-media-staging` / `private-assets-staging`
  - además se fijó `GREENHOUSE_MEDIA_BUCKET` a los buckets públicos dedicados como carril legacy de compatibilidad
  - `src/lib/storage/greenhouse-media.ts` ya prioriza `GREENHOUSE_PUBLIC_MEDIA_BUCKET` sobre `GREENHOUSE_MEDIA_BUCKET`
- `TASK-173` ya cerró el pendiente remoto en Cloud SQL:
  - `pnpm setup:postgres:shared-assets` quedó aplicado realmente en `greenhouse-pg-dev / greenhouse_app`
  - se validó `shared-assets-platform-v1` en `greenhouse_sync.schema_migrations`
  - quedaron materializadas las columnas/FKs/índices shared en `leave`, `purchase orders`, `payroll receipts` y `payroll export packages`
  - el ownership drift histórico de `purchase_orders`, `payroll_receipts` y `payroll_export_packages` se corrigió a `greenhouse_migrator`
  - `greenhouse_migrator_user` ya puede reejecutar el setup canónico sin depender de `postgres`
- Se documentó explícitamente un carril break-glass de PostgreSQL:
  - `greenhouse_ops` existe para saneamiento excepcional de ownership cuando la mezcla legacy entre `greenhouse_app`, `greenhouse_migrator_user` y `postgres` bloquea un bootstrap
  - no reemplaza el modelo canónico `runtime / migrator / admin`
- Se formalizó la decisión arquitectónica para adjuntos/archivos compartidos del portal:
  - nueva lane `TASK-173` para foundation shared de assets/attachments
  - `leave`, `Document Vault` y `Expense Reports` quedan alineadas como consumers de esa capability
  - topología aprobada en GCP: `public media` por entorno + `private assets` por entorno
  - `public media` queda reservado para logos/avatars/assets no sensibles
  - todo adjunto documental u operativo cae en `private assets` y se sirve bajo control de acceso Greenhouse
- `TASK-173` pasó de decisión a implementación de repo:
  - registry shared `greenhouse_core.assets`
  - audit trail `greenhouse_core.asset_access_log`
  - helper `src/lib/storage/greenhouse-assets.ts`
  - uploader reusable `GreenhouseFileUploader`
  - upload/download autenticado para assets privados
  - cutover inicial en `leave`, `purchase orders`, `payroll receipts` y `payroll export packages`
- Limitación operativa actualizada:
  - la lane ya no depende de GCP/DDL
  - queda pendiente solo smoke manual autenticado en `staging` para cerrar `TASK-173`
- `People > HR profile` ahora permite editar `Fecha de ingreso` desde la propia card de información laboral:
  - usa el endpoint existente `PATCH /api/hr/core/members/[memberId]/profile`
  - el valor se refleja de inmediato en la UI sin esperar otro refresh de contexto
  - esto cierra la brecha operativa que dejaba a `leave`/vacaciones con `hire_date` técnicamente soportado pero no mantenible desde pantalla
  - queda documentado además que este campo sigue siendo `BigQuery-first` para edición (`greenhouse.team_members.hire_date`) mientras `HR profile` no haga cutover formal a PostgreSQL
  - la acción visible quedó finalmente en la surface real `People > [colaborador] > Perfil > Datos laborales`; ya no depende de un componente no montado
  - se corrigió además el write path para que cambiar solo `hireDate` no ejecute un `MERGE` innecesario sobre `greenhouse.member_profiles`, eliminando el `500` observado al guardar
- Arquitectura HR/Leave ahora documenta explícitamente las reglas runtime del módulo:
  - cálculo de días hábiles desde calendario operativo
  - overlap, attachments y balance
  - anticipación mínima, continuidad mínima y máximos consecutivos
  - carry-over, progresivos y matrix seed de policies por tipo
  - aclaración de que saldo disponible no evita rechazos por policy
- `TASK-170` se reconcilió contra el runtime real de HR Leave:
  - la task deja de asumir un módulo “nuevo” y se alinea al baseline existente en PostgreSQL, serving views, APIs y UI
  - `leave` ya calcula días hábiles desde el calendario operativo canónico + feriados Chile
  - se agrega `leave_policies` y semántica de balances con progressive extra days, adjustments y carry-over
  - el setup real quedó aplicado en `greenhouse-pg-dev / greenhouse_app` y el runtime volvió a validarse por connector con `leave_policies=10`, `leave_types=10`, `leave_balances=4`
- `HR Leave` gana wiring operativo y cross-module real:
  - nuevos eventos `leave_request.created`, `leave_request.escalated_to_hr`, `leave_request.approved`, `leave_request.rejected`, `leave_request.cancelled`, `leave_request.payroll_impact_detected`
  - notificaciones para supervisor/HR, solicitante y payroll/finance según el estado del período impactado
  - nueva proyección `leave_payroll_recalculation` para recalcular nómina oficial cuando un permiso aprobado toca un período no exportado
  - `staff_augmentation` vuelve a materializar snapshots tras `accounting.commercial_cost_attribution.materialized`
- `Permisos` ahora expone calendario real en ambas surfaces:
  - nueva route `GET /api/hr/core/leave/calendar`
  - `/api/my/leave` devuelve historial + calendario
  - `/hr/leave` suma tab calendario
  - `/my/leave` pasa a vista self-service con historial, calendario y solicitud compartida

- Staff Aug `Crear placement` vuelve a experiencia tipo drawer:
  - `/agency/staff-augmentation/create` ya no muestra una página-card separada
  - ahora reutiliza el listado con un drawer route-driven abierto sobre la misma vista
  - se mantiene soporte para deep-link con `assignmentId` y para la ruta legacy `?create=1`
  - el shell de apertura pasa de `Dialog` a `Drawer`
- Se reparó en GCP el baseline faltante de PostgreSQL para Staff Aug en el entorno de `develop`:
  - `GET /api/agency/staff-augmentation/placements` estaba cayendo con `500` porque no existían las tablas `staff_aug_*` en `greenhouse-pg-dev / greenhouse_app`
  - se aplicó el setup canónico `pnpm setup:postgres:staff-augmentation` vía Cloud SQL Connector con perfil `migrator`
  - quedaron materializadas:
    - `greenhouse_delivery.staff_aug_placements`
    - `greenhouse_delivery.staff_aug_onboarding_items`
    - `greenhouse_delivery.staff_aug_events`
    - `greenhouse_serving.staff_aug_placement_snapshots`
- Staff Aug `Crear placement` ya no se monta dentro del listado:
  - `Agency > Staff Augmentation` ahora navega a `/agency/staff-augmentation/create`
  - el bridge desde `People` también usa la ruta dedicada con `assignmentId`
  - `?create=1` se redirige server-side a esa nueva página
  - el cambio se tomó después de reproducir el freeze real autenticado al hacer click en `Crear placement` sobre el listado
- Staff Aug `Crear placement` se replanteó otra vez para salir del carril que seguía congelando Chrome:
  - el formulario ya no se abre en `Dialog`
  - `Agency > Staff Augmentation` ahora lo renderiza inline dentro de la misma vista
  - se mantiene la búsqueda incremental remota y la preselección por `assignmentId`
  - el objetivo explícito fue sacar del flujo crítico el shell `MUI Dialog` después de que el fix anterior no resolviera el freeze real reportado en `dev-greenhouse`
- Staff Aug `Crear placement` deja de usar un patrón propenso a congelar la UI:
  - el modal ya no carga/renderiza todas las asignaciones elegibles como `select`
  - ahora usa búsqueda incremental remota con límite
  - `GET /api/agency/staff-augmentation/placement-options` acepta `search`, `assignmentId` y `limit`
  - el query base en Postgres ya filtra y pagina el universo elegible antes de responder
- Staff Aug bridge endurecido sin cambiar el modelo canónico:
  - `Create placement` ya no depende de `/api/team/capacity-breakdown`
  - nueva route liviana `GET /api/agency/staff-augmentation/placement-options`
  - el modal ahora muestra contexto de Payroll (`contractType`, `payRegime`, costo base) y acepta preselección por `assignmentId`
- `People 360` ya ve señales reales de Staff Aug por assignment:
  - `assignmentType`
  - `placementId`
  - `placementStatus`
  - desde `Organizaciones` ahora puede abrir placement existente o saltar a crear uno cuando el assignment ya existe
- Nueva lane documental activa:
  - `TASK-169` consolida el bridge `People -> assignment context -> placement`
  - `TASK-038` y `TASK-041` quedan absorbidas como framing histórico/addendum ya reconciliado con el runtime real
- Cierre administrativo adicional:
  - `TASK-038` y `TASK-041` pasan a `complete` como referencia histórica absorbida
  - la próxima definición enterprise de Staff Aug quedará como task nueva, complementaria al roadmap HRIS

## 2026-03-30 (session 12)

- `TASK-142` quedó cerrada como `Agency Space 360` operativa:
  - `/agency/spaces/[id]` ya no redirige a Admin
  - nueva store `src/lib/agency/space-360.ts`
  - nueva route `GET /api/agency/spaces/[id]`
  - nueva surface `src/views/greenhouse/agency/space-360/*`
- La 360 compone el baseline real del repo:
  - resolución `clientId -> space_id`
  - `operational_pl_snapshots` y `agency-finance-metrics`
  - assignments + `member_capacity_economics`
  - `services`
  - `staff_aug_placements`
  - `greenhouse_sync.outbox_events`
  - métricas ICO, project metrics y stuck assets
- Cobertura nueva:
  - `src/lib/agency/space-360.test.ts`
  - `src/app/api/agency/spaces/[id]/route.test.ts`
  - `src/views/greenhouse/agency/space-360/Space360View.test.tsx`
- Impacto cruzado documentado:
  - `TASK-146`, `TASK-150`, `TASK-151`, `TASK-158` y `TASK-159` ya no deben asumir que `Space 360` sigue pendiente como shell

## 2026-03-30 (session 11)

- `TASK-019` quedó cerrada como baseline real de `Staff Augmentation`:
  - setup Postgres dedicado para placements, onboarding, event log y serving snapshots
  - store/runtime en `src/lib/staff-augmentation/*`
  - eventos `staff_aug.*` y proyección reactiva `staff_augmentation_placements`
  - rutas `Agency > Staff Augmentation` con listado, creación y detalle `Placement 360`
- Sinergias conectadas:
  - `Agency > Team` ahora expone estado de placement por assignment y CTA al placement
  - snapshots económicos combinan Finance, Payroll, cost attribution, direct expenses y provider tooling
  - drilldowns desde placement hacia `Agency Team`, `Payroll` y `AI Tooling`
- Cobertura nueva:
  - tests de projection/event catalog para `staff_aug.*`
  - test del route contract de `capacity-breakdown` con `assignment_type`/placement metadata
  - tests UI de listado y detalle de `Staff Augmentation`
- Documentación reconciliada:
  - `TASK-019` movida a `complete`
  - deltas agregados a `TASK-038` y `TASK-041`
  - `project_context`, `Handoff` y `Greenhouse_HRIS_Architecture_v1.md` actualizados

## 2026-03-30 (session 10)

- `TASK-059` quedó cerrada también en navegación y pruebas:
  - `Provider 360` ahora abre drilldowns hacia `Finance Expenses`, `AI Tooling` y `Payroll`
  - `AI Tooling` ya acepta `providerId` + `tab` por query string para sostener el recorrido desde Finanzas
- Cobertura nueva:
  - test de contrato para `/api/finance/suppliers/[id]`
  - test del tab `SupplierProviderToolingTab`
  - test directo del helper `getLatestProviderToolingSnapshot()`

## 2026-03-30 (session 9)

- `TASK-059` aterrizó también en la UI correcta de Finanzas:
  - `Finance > Suppliers` ahora muestra cobertura `Provider 360` en el listado
  - el detalle de supplier incorpora un tab `Provider 360` con KPIs de tooling, composición de costo y proveniencia del snapshot
- `/api/finance/suppliers/[id]` ahora devuelve `providerTooling` cuando existe vínculo canónico `supplier -> provider`
- `provider-tooling-snapshots` suma helper de lectura puntual para servir el último snapshot del provider en surfaces de Finanzas

## 2026-03-30 (session 8)

- `TASK-059` quedó cerrada y reconciliada al runtime real:
  - se descarta la identidad paralela `tool_providers`
  - `greenhouse_core.providers` queda reafirmado como ancla canónica única para tooling/vendor/provider cross-module
- Nuevo carril reactivo provider-centric:
  - `provider.upserted`
  - `finance.supplier.created`
  - `finance.supplier.updated`
  - proyección `provider_tooling`
  - snapshot mensual `greenhouse_serving.provider_tooling_snapshots`
  - vista latest-state `greenhouse_serving.provider_tooling_360`
  - evento saliente `provider.tooling_snapshot.materialized`
- Consumer absorbido:
  - `/api/finance/analytics/trends?type=tools` ya no agrega por labels legacy y ahora consume la capa provider-centric

## 2026-03-30 (session 4)

- Verificación rápida de `staging` completada:
  - `/finance/income/[id]` carga como `Ingreso — Greenhouse`
  - `/finance/clients` carga como `Clientes — Greenhouse`
  - los errores vistos en consola quedaron limitados a `vercel.live`/CSP embed, sin evidencia de fallo funcional del runtime
- `TASK-164` quedó reconciliada documentalmente con el estado real del repo:
  - Purchase Orders y HES ya no se leen como spec pendiente
  - el documento ahora deja claro que el módulo ya fue absorbido por runtime y UI

## 2026-03-30 (session 5)

- Smoke visual en `staging` completado para:
  - `/finance/purchase-orders`
  - `/finance/hes`
  - `/finance/intelligence`
- Resultado:
  - las tres surfaces cargan y renderizan
  - `GET /api/cost-intelligence/periods?limit=12` respondió `200`
  - `GET /api/notifications/unread-count` respondió `200`
  - en `finance/intelligence` quedó observación no bloqueante de `OPTIONS /dashboard -> 400` durante prefetch, sin impacto visible en el módulo

## 2026-03-30 (session 6)

- Hardening del `proxy` del portal:
  - las page routes ahora responden `204` a `OPTIONS`
  - el cambio apunta a eliminar `400` espurios vistos durante prefetch de `/dashboard`
  - `/api/**` conserva su comportamiento normal y no queda short-circuiteado por este fix

## 2026-03-30 (session 7)

- Ajuste final de CSP report-only para entornos no productivos:
  - `preview/staging` permiten `https://vercel.live` en `frame-src`
  - `production` se mantiene más estricta y no incorpora esa fuente
- Con esto, el ruido de consola asociado a Vercel Live deja de contaminar la verificación manual de `staging`.

## 2026-03-30 (session 3)

- Se reconciliaron documentos rezagados de Finance/Nubox para que la documentación no siga describiendo un estado anterior al runtime real:
  - `FINANCE_DUAL_STORE_CUTOVER_V1.md` quedó explícitamente marcado como historial de migración y no como estado operativo vigente
  - `TASK-163` quedó alineada al estado implementado de separación documental DTE
  - `TASK-165` quedó alineada al enrichment Nubox ya absorbido por runtime y UI/detail
- Con esto, la lectura canónica del estado actual de Finance vuelve a concentrarse en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`, `TASK-166` y `TASK-050`.

## 2026-03-30 (session 2)

- Finance DTE download hardening:
  - el detalle de ingreso ahora reutiliza `nuboxPdfUrl` / `nuboxXmlUrl` directos cuando existen, en vez de forzar siempre el proxy server-side
  - `src/lib/nubox/client.ts` normaliza config Nubox con `trim()` y manda `Accept` explícito para descargas PDF/XML
  - se mitigó el incidente de `Nubox PDF download failed with 401` observado en `staging`
- Finance aggregates hardening:
  - `client_economics` y `operational_pl` ya no agrupan revenue con `COALESCE(client_id, client_profile_id)`
  - los incomes legacy `profile-only` ahora se traducen vía `greenhouse_finance.client_profiles` para resolver `client_id` canónico antes de agregar
  - se evita tratar `client_profile_id` como si fuera el ID comercial del cliente en snapshots financieros
- Finance residual consumers hardening:
  - `Finance Clients` ya calcula receivables e invoices por `client_id` canónico también en el fallback legacy
  - `CampaignFinancials` ya no usa `COALESCE(client_id, client_profile_id)` para revenue
  - con esto ya no quedan consumers obvios del carril financiero tratando `client_profile_id` como sustituto directo de `client_id`
- Finance read identity drift hardening:
  - `GET /api/finance/income` y `GET /api/finance/expenses` ahora resuelven filtros de cliente por contexto canónico antes de consultar Postgres/BQ
  - `income` ya no depende de la equivalencia ad hoc `clientProfileId -> hubspot_company_id` en SQL
  - se mantiene compatibilidad transicional para callers legacy que seguían usando `clientProfileId` como alias de HubSpot en lecturas de income
- `TASK-165` (Nubox Full Data Enrichment) cerrada: 16 nuevas columnas en income, 16 en expenses, tabla `income_line_items`, mappers conformed enriquecidos con todos los campos Nubox, sync migrado de DELETE-all a upsert selectivo, cron `nubox-balance-sync` cada 4h, 2 nuevos event types (SII claim + balance divergence), 2 nuevos data quality checks, filtro de annulled en PnL, PDF/XML links + SII chips en UI.
- `TASK-164` (Purchase Orders & HES) implementada: tablas `purchase_orders` y `service_entry_sheets`, CRUD completo con reconciliación de saldo y lifecycle (draft→submitted→approved/rejected), 9 API routes, 7 event types nuevos, 4 notification mappings, `PurchaseOrdersListView` con progress bars de consumo, `HesListView` con status chips.
- `ISSUE-002` (Nubox sync data integrity) cerrada: Fix 1 (annulled handling), Fix 2 (identity resolution GROUP BY), Fix 3 (upsert selectivo en conformed).
- DDL ejecutado en Cloud SQL (`greenhouse_app`): `setup-nubox-enrichment.sql` y `setup-postgres-purchase-orders.sql`. GRANTs corregidos a `greenhouse_runtime`.

## 2026-03-30

- `TASK-166` cerró el lifecycle real de `FINANCE_BIGQUERY_WRITE_ENABLED`:
  - `income`, `expenses`, `expenses/bulk`, `accounts`, `exchange-rates` y `suppliers` ya pueden fallar cerrado con `FINANCE_BQ_WRITE_DISABLED` cuando PostgreSQL falla y el flag está apagado
  - `suppliers` pasó a write path Postgres-first; BigQuery queda solo como fallback transicional
- `TASK-166` se expandió después del cierre inicial:
  - `income/[id]`, `expenses/[id]`, `income/[id]/payment`, `clients`, `reconciliation/**` y los sync helpers principales ya respetan el mismo guard fail-closed
  - `clients` dejó de ser solo fail-closed: `create/update/sync` ya corre Postgres-first y conserva fallback BigQuery explícito solo mientras el flag legacy siga activo
- `Finance Clients` dejó de depender de BigQuery también en lectura principal: `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ahora nacen desde PostgreSQL (`greenhouse_core`, `greenhouse_finance`, `greenhouse_crm`, `v_client_active_modules`) y solo usan BigQuery como fallback transicional.
- `resolveFinanceClientContext()` quedó endurecido: ya no cae a BigQuery por cualquier excepción de PostgreSQL, sino solo para errores clasificados como fallback permitido.
- `TASK-166` arrancó el cutover real del write fallback legacy de Finance:
  - nuevo helper `src/lib/finance/bigquery-write-flag.ts`
  - `POST /api/finance/income` y `POST /api/finance/expenses` ya respetan `FINANCE_BIGQUERY_WRITE_ENABLED`
  - con el flag apagado y fallo Postgres, esas rutas ahora fallan cerrado en vez de mutar `fin_*` por compatibilidad implícita
- `TASK-138` quedó reconciliada con el estado real del repo:
  - `FinanceDashboardView` ya consume `dso`, `dpo` y `payrollToRevenueRatio`
  - `PersonHrProfileTab` ya consume `finance-impact`
  - Agency ya expone `getSpaceFinanceMetrics()` por endpoint dedicado
- `TASK-139` cerró el remanente técnico más importante:
  - la cola `dte_emission_queue` ya preserva `dte_type_code`
  - `/api/cron/dte-emission-retry` ya reintenta vía `emitDte()` real
  - las rutas de emisión ahora encolan fallos retryable para recuperación posterior
- `TASK-162` quedó formalmente cerrada:
  - `commercial_cost_attribution` ya es truth layer materializada con projection reactiva, health y explain
  - `Person Finance` dejó de leer `client_labor_cost_allocation` y ahora explica costo desde la capa canónica
  - `computeClientLaborCosts()` dejó de resumir el bridge legacy directo y ahora reutiliza el reader shared
  - el bridge `client_labor_cost_allocation` queda acotado al materializer/provenance interna, no a consumers runtime nuevos
- Se consolidó en arquitectura canónica el estado actual de `TASK-162`:
  - `commercial_cost_attribution` quedó documentada como truth layer materializada
  - Finance, Cost Intelligence y el modelo maestro ya explicitan la matriz de cutover por consumer
  - `client_labor_cost_allocation` queda reafirmado como bridge/input histórico, no como contrato directo para lanes nuevas
- `TASK-134` quedó formalmente cerrada:
  - Notifications institucionaliza `person-first` para recipient resolution
  - webhook consumers y projections ya comparten el mismo shape de recipient
  - `userId` se preserva explícitamente como llave operativa para inbox, preferencias, auditoría y dedupe por recipient key efectiva
- `TASK-134` ya tiene primer slice real de implementación:
  - `Notifications` ahora comparte resolución role-based `person-first` entre projections y webhook consumers
  - nuevo helper shared `getRoleCodeNotificationRecipients(roleCodes)` en `src/lib/notifications/person-recipient-resolver.ts`
  - el cambio elimina drift de mapping desde `session_360` sin tocar `buildNotificationRecipientKey()`, inbox, preferencias ni dedupe `userId`-scoped
- `TASK-140` quedó formalmente cerrada:
  - `/admin/views` ya se interpreta y se opera como consumer persona-first
  - el selector/preview usa persona canónica cuando existe `identityProfileId`
  - `userId` se preserva solo como llave operativa para overrides, auditoría y `authorizedViews`
- Se endureció `src/lib/postgres/client.ts` ante incidentes TLS/SSL transitorios:
  - normaliza `GREENHOUSE_POSTGRES_SSL` y numerics con `trim()`
  - evita cachear un `Pool` fallido de forma indefinida
  - resetea pool/connector cuando `pg` emite errores de conexión
  - reintenta una vez queries y transacciones ante fallos retryable como `ssl alert bad certificate`
- `TASK-140` salió de diseño y ya tiene `Slice 1` implementado en `/admin/views`:
  - nuevo helper shared `src/lib/admin/admin-preview-persons.ts`
  - el selector de preview ahora agrupa por persona canónica cuando existe `identityProfileId`
  - el consumer sigue preservando `userId` como llave operativa para overrides, auditoría y `authorizedViews`
  - la UI distingue mejor entre persona, faceta operativa y principal portal compatible
  - el panel además ya explica con alertas el estado `active`, `inactive`, `missing_principal` y `degraded_link`, y el roadmap del módulo quedó alineado al remanente real de `TASK-140`
- `TASK-141` quedó formalmente cerrada como lane institucional:
  - el contrato canónico persona/member/client_user ya no queda abierto como diseño
  - la implementación mínima reusable quedó activa con `src/lib/identity/canonical-person.ts`
  - el remanente operativo se distribuye explícitamente a `TASK-140`, `TASK-134` y `TASK-162`
- `TASK-141` avanzó de contrato endurecido a primer slice runtime conservador:
  - nueva fuente canónica `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
  - nuevo resolver shared `src/lib/identity/canonical-person.ts`
  - contrato runtime explícito para `identityProfileId`, `memberId`, `userId`, `portalAccessState` y `resolutionSource`
  - primera adopción visible en `/admin/views` sin romper overrides `userId`-scoped ni auditoría de acceso
- La arquitectura de identidad quedó más precisa para los follow-ons:
  - `TASK-140` ya no necesita inventar el bridge persona/member/user, sino mover el preview a persona previewable real
  - `TASK-134` ya puede consumir el contrato shared en vez de rediscutir persona/member/user
  - `TASK-162` queda reafirmada como lane posterior a `TASK-141`, preservando `member_id` como llave operativa de costo, payroll, capacity e ICO

- Se documentó formalmente la decisión de una capa canónica de `commercial cost attribution`:
  - no reemplaza a Finance ni a Cost Intelligence
  - consolida una sola verdad de costo comercial por encima de Payroll, Team Capacity y Finance base
  - alimenta primero a Finance y Cost Intelligence
  - y desde ahí a Agency, Organization 360, People, Home, Nexa y futuros consumers financieros
  - `TASK-162` queda abierta como lane institucional para implementarla

- Se corrigió una desviación semántica importante entre Team Capacity y Cost Intelligence:
  - assignments internos de `Efeonce` (`space-efeonce`, `efeonce_internal`, `client_internal`) ya no compiten como clientes comerciales en la atribución de costo laboral
  - la regla ahora es shared entre `Agency > Team`, `member_capacity_economics`, `auto-allocation-rules`, `client_labor_cost_allocation` y `computeOperationalPl()`
  - Cost Intelligence puede además purgar snapshots obsoletos por período/revisión antes de upsert, evitando que queden filas stale de clientes internos después de un recompute

- La validación visual real de `TASK-070` encontró y corrigió un bug de display en `/finance/intelligence`:
  - `lastBusinessDayOfTargetMonth` ya venía correctamente calculado desde el calendario operativo
  - la UI lo mostraba corrido por parsear `YYYY-MM-DD` con `new Date(...)`
  - `FinancePeriodClosureDashboardView` ahora usa parseo seguro para fechas de solo fecha
- El flujo principal de `TASK-070` quedó además validado con datos reales:
  - tabla de períodos
  - expandible inline de P&L
  - diálogo de cierre

- Se consolidó la documentación viva de Cost Intelligence a nivel arquitectura, índice de docs, pipeline de tasks y contexto operativo.
- El módulo ya queda descrito como sistema operativo distribuido:
  - foundation (`TASK-067`)
  - period closure (`TASK-068`)
  - operational P&L (`TASK-069`)
  - Finance UI (`TASK-070`)
  - consumers en Agency, Organization 360, People 360, Home y Nexa (`TASK-071`)
- Finance queda reafirmado como owner del motor financiero central; Cost Intelligence queda formalizado como layer de management accounting y serving distribuido.

- `TASK-071` ya tiene su primer cutover real de consumers distribuidos:
  - Agency ahora resuelve `SpaceCard` desde `greenhouse_serving.operational_pl_snapshots` en vez de recomputar con `income` / `expenses`
  - Organization 360 (`Rentabilidad`) ya es serving-first con fallback al compute legacy
  - People 360 ahora expone `latestCostSnapshot` y muestra closure awareness en `PersonFinanceTab`
  - `FinanceImpactCard` también muestra período + estado de cierre
  - Home ya reemplaza placeholders por un resumen financiero real del período para roles internos/finance
- `TASK-071` sigue abierta:
  - falta validación visual real
  - el resumen ya también entra a Nexa `lightContext`; el remanente es de validación y cierre formal
- Nexa ahora recibe el mismo `financeStatus` resumido del Home snapshot y lo incorpora al prompt de contexto para responder mejor sobre cierre de período y margen operativo.
- Validación técnica del slice:
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec eslint ...` del slice
- `pnpm build` quedó inestable por artifacts/locks de `.next` en esta sesión de trabajo; no se observó error de tipado posterior a `tsc`.

- `TASK-069` quedó formalmente cerrada:
  - `operational_pl` ya se considera baseline implementada del módulo de Cost Intelligence
  - snapshots materializados por `client`, `space` y `organization`
  - APIs estables de lectura
  - smoke reactivo E2E ya validado
- La arquitectura de Cost Intelligence quedó endurecida para reflejar el estado real del módulo:
  - foundation `067`, cierre `068`, P&L `069` y UI principal `070`
  - serving canónico
  - invariantes de revenue/costo/closure
  - authorization actual
  - consumers pendientes vía `TASK-071`
- `TASK-070` ya sustituyó la portada de `/finance/intelligence` por una surface real de Cost Intelligence:
  - `FinancePeriodClosureDashboardView`
  - hero + KPIs de cierre
  - tabla de 12 períodos con semáforos por nómina, ingresos, gastos y FX
  - P&L inline expandible por cliente
  - diálogo de cierre y reapertura con control por rol
- La UI de cierre de período ya respeta el contrato operativo:
  - cierre para `finance_manager` y `efeonce_admin`
  - reapertura solo para `efeonce_admin`
- Validación técnica del slice:
  - `pnpm exec eslint 'src/app/(dashboard)/finance/intelligence/page.tsx' 'src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx'`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
- `TASK-070` sigue abierta solo por validación visual pendiente y por la decisión posterior sobre el destino del dashboard legacy `ClientEconomicsView`.

- `TASK-069` ya tiene smoke reactivo E2E reusable:
  - `pnpm smoke:cost-intelligence:operational-pl`
  - el carril valida `outbox -> operational_pl -> operational_pl_snapshots -> accounting.pl_snapshot.materialized`
- Evidencia real del smoke:
  - `periodId=2026-03`
  - `eventsProcessed=5`
  - `eventsFailed=0`
  - `projectionsTriggered=6`
  - `snapshotCount=3`
- `TASK-069` deja de estar en diseño puro:
  - nuevo engine `computeOperationalPl()` para materializar `greenhouse_serving.operational_pl_snapshots`
  - scopes soportados: `client`, `space`, `organization`
  - APIs nuevas:
    - `GET /api/cost-intelligence/pl`
    - `GET /api/cost-intelligence/pl/[scopeType]/[scopeId]`
- El carril `operational_pl` ya nace amarrado al contrato financiero canónico:
  - revenue por cliente como net revenue (`total_amount_clp - partner_share`)
  - costo laboral desde `client_labor_cost_allocation`
  - overhead desde `member_capacity_economics`
  - `period_closed` / `snapshot_revision` desde `period_closure_status`
  - exclusión de `expenses.payroll_entry_id` para evitar doble conteo de payroll
- `notification_dispatch` ya consume `accounting.margin_alert.triggered`.
- `materialization-health` ya observa `greenhouse_serving.operational_pl_snapshots`.
- `TASK-067` dejó aplicada la fundación técnica de Cost Intelligence: schema `greenhouse_cost_intelligence`, tablas base de cierre de período y P&L operativo, script `setup:postgres:cost-intelligence`, eventos `accounting.*`, domain `cost_intelligence` soportado por el projection registry y route `/api/cron/outbox-react-cost-intelligence`.
- El remanente local de `TASK-067` quedó resuelto: `src/lib/google-credentials.ts` ahora normaliza PEMs colapsados para `google-auth-library`, y el smoke autenticado de `/api/cron/outbox-react-cost-intelligence` ya responde `200`.
- Cost Intelligence queda además amarrado a la arquitectura canónica de Finance: `TASK-068` y `TASK-069` deben respetar el contrato del P&L financiero central y no redefinir semántica paralela para revenue, payroll multi-moneda ni anti-doble-conteo.
- `TASK-068` ya tiene su primer slice real: readiness mensual por período, serving/materialización de `period_closure_status`, mutations `close/reopen` y APIs bajo `/api/cost-intelligence/periods/**`, todo consistente con la semántica de Finance (`invoice_date`, `COALESCE(document_date, payment_date)`, `rate_date`, `payroll_periods.status`).
- `TASK-068` ya conversa también con el calendario operativo compartido: `checkPeriodReadiness()` expone timezone/jurisdicción, ventana operativa y último día hábil del mes objetivo, y el listing de períodos garantiza incluir el mes operativo actual.
- `TASK-068` ya tiene además smoke reactivo end-to-end reusable: `pnpm smoke:cost-intelligence:period-closure` inserta un evento sintético, procesa el domain `cost_intelligence` y verifica serving + reactive log sin arrastrar backlog ajeno.
- `TASK-068` queda cerrada y deja desbloqueadas `TASK-069`, `TASK-070` y `TASK-071` del lado `period closure`; el único blocker estructural restante para esa ola ya es el P&L materializado de `TASK-069`.
- Se endureció documentalmente `TASK-141` para que la futura institucionalización `person-first` preserve los carriles reactivos: notificaciones, outbox, webhook dispatch, projections de finance, ICO y person intelligence.
- La arquitectura ya deja explícito que `identity_profile` es la raíz humana, pero `member_id` y `user_id` siguen siendo claves operativas que no deben romperse en recipients, inbox/preferencias, overrides, serving por colaborador ni envelopes reactivos.
- `TASK-136` quedó formalmente cerrada y movida a `docs/tasks/complete/`, ya que la gobernanza por vistas alcanzó el baseline operativo comprometido del portal actual.
- `TASK-136` agrega `cliente.modulos` al catálogo de views gobernables y endurece `/capabilities/[moduleId]` para requerir tanto el access point broad del carril como el permiso específico del módulo.
- `/admin/views` suma acciones masivas por rol sobre el set filtrado actual, permitiendo conceder, revocar o restablecer bloques completos de vistas sin editar celda por celda.
- Se documentó además la excepción arquitectónica de `/home`: sigue fuera del modelo de `view_code` y se mantiene como landing transversal interna vía `portalHomePath`.
- La arquitectura canónica ya documenta el modelo de gobernanza de vistas: `routeGroups` como capa broad y `view_code` / `authorizedViews` como capa fina, con `/admin/views` como superficie operativa oficial.
- `TASK-136` amplió el catálogo de vistas client-facing con `cliente.campanas` y `cliente.notificaciones`, y esas superficies ya quedaron protegidas por layout en `/campanas/**`, `/campaigns/**` y `/notifications/**`.
- `/admin/views` mejoró su operabilidad real: la matrix ahora expone cambios pendientes vs persistido, foco sobre fallback heredado y el preview ya separa baseline, grants extra, revokes efectivos e impacto visible por usuario.
- `TASK-136` ahora emite un evento reactivo cuando un override por usuario cambia el acceso efectivo; además limpia overrides expirados, registra `expire_user` y el carril `notifications` ya avisa al usuario afectado con un resumen de vistas concedidas/revocadas.
- `TASK-136` cerró el primer enforcement page-level por `view_code` usando `authorizedViews` en runtime con fallback controlado a `routeGroups`.
- Rutas clave del portal ya bloquean acceso a nivel de página o nested layout para `dashboard`, `settings`, `proyectos`, `sprints`, Agency, People, Payroll, Finance, Admin Center, AI tools y `Mi Ficha`.
- `TASK-136` amplió además el enforcement a layouts amplios de `Admin`, `Finance`, `HR` y `My`, y cubrió páginas vecinas como `hr/leave`, `admin/cloud-integrations`, `admin/email-delivery`, `admin/notifications`, `admin/operational-calendar`, `admin/team`, `finance/intelligence` y `finance/cost-allocations`.
- `TASK-136` empezó además a cerrar el gap de modelo: `view_registry` ya incluye nuevas superficies explícitas en `Admin + Finance`, y el resolver ahora hace fallback por vista faltante cuando existen assignments persistidos parciales para un rol.
- `TASK-136` extendió ese mismo modelo a `Agency`, `HR` y `My`, con nuevos `view_code` explícitos y guards/sidebar alineados a esas superficies visibles.
- `TASK-136` alineó además el portal cliente y access points secundarios con nuevos `view_code` (`cliente.equipo`, `cliente.analytics`, `cliente.revisiones`, `cliente.actualizaciones`, `gestion.capacidad`) y el menú cliente ya filtra también por `authorizedViews`.
- `TASK-136` activó además overrides por usuario iniciales en `/admin/views`, con persistencia en `user_view_overrides`, resolución runtime sobre `authorizedViews` y una primera UI de `inherit/grant/revoke` en el tab `Preview`.
- `TASK-136` ya suma expiración opcional por batch de overrides y auditoría visible en `Preview`, dejando el módulo bastante más operable para admins.
- `TASK-136` avanzó de baseline visual a persistencia inicial real en `Admin Center > Vistas y acceso`.
- Nuevo contrato backend:
  - `POST /api/admin/views/assignments`
- Nueva base PostgreSQL en `greenhouse_core`:
  - `view_registry`
  - `role_view_assignments`
  - `user_view_overrides`
  - `view_access_log`
- `/admin/views` ahora permite editar y guardar la matriz role × view con fallback seguro al baseline hardcoded mientras el cutover completo de sesión sigue pendiente.
- La sesión ahora propaga `authorizedViews` y el sidebar ya filtra navegación principal con esa capa cuando existe configuración persistida.

## Regla

- Registrar solo cambios con impacto real en comportamiento, estructura, flujo de trabajo o despliegue.
- Usar entradas cortas, fechadas y accionables.

## 2026-03-30

### UI/UX skill stack modernized for Greenhouse

- Se agregó `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` como baseline moderna para jerarquía visual, UX writing, estados y accessibility.
- Las skills locales de Greenhouse UI ahora leen explícitamente esta baseline y dejan de depender solo de heurísticas heredadas de Vuexy.
- Se creó la skill `greenhouse-ux-content-accessibility` para revisar y mejorar copy, empty states, errores, formularios y accesibilidad con criterio de producto.

### Sentry incident reader hardened for Ops Health

- `src/lib/cloud/observability.ts` ya soporta un token dedicado `SENTRY_INCIDENTS_AUTH_TOKEN` / `_SECRET_REF` para leer incidentes, sin asumir que `SENTRY_AUTH_TOKEN` también tiene permisos de issues.
- Cuando Sentry responde `401/403`, `Ops Health` mantiene el fallback fail-soft pero ahora muestra un mensaje accionable de permisos en lugar de un warning genérico.

## 2026-03-29

### Notifications moved to a person-first recipient model

- `NotificationService` y los helpers compartidos ya resuelven destinatarios desde identidad canónica de persona, no desde `client_user` como raíz.
- El nuevo resolver soporta `identityProfileId`, `memberId`, `userId` y fallback `email-only`, manteniendo compatibilidad con inbox/preferences portal.
- `TASK-117` quedó revalidada con notificaciones reales sobre este patrón, y la deuda transversal restante se formalizó en `TASK-134`.

### TASK-117 payroll auto-calculation baseline closed

- Payroll ya formaliza el cálculo del período oficial el último día hábil del mes operativo, sin alterar el lifecycle `draft -> calculated -> approved -> exported`.
- La utilidad de calendario ahora expone `getLastBusinessDayOfMonth()` / `isLastBusinessDayOfMonth()`, y Payroll separa `calculation readiness` de `approval readiness`.
- El repo ya incluye `runPayrollAutoCalculation()`, `GET /api/cron/payroll-auto-calculate`, auto-creación del período faltante y notificación reactiva `payroll_ops` al emitirse `payroll_period.calculated`.

### TASK-133 Sentry incidents surfaced into Ops Health

- `Ops Health` y `Cloud & Integrations` ya consumen un snapshot canónico fail-soft de incidentes Sentry abiertos/relevantes.
- `src/lib/cloud/observability.ts` ahora separa postura de observability vs incidentes activos, y `GET /api/internal/health` expone también `sentryIncidents`.
- La UI muestra contexto operativo por release, environment y última ocurrencia sin cambiar la semántica del health runtime base.

### TASK-129 promoted to production

- `develop` fue promovida a `main` y `production` ya absorbió el carril `notification-dispatch`.
- `POST /api/internal/webhooks/notification-dispatch` quedó validado también en `production` con delivery firmada real y notificación persistida en `greenhouse_notifications.notifications`.
- Evidencia productiva confirmada:
  - `eventId=evt-prod-final-1774830739019`
  - `user_id=user-efeonce-admin-julio-reyes`
  - `category=assignment_change`
  - `status=unread`

### TASK-129 staging hardening completed with Secret Manager-only

- `staging` dejó de depender de `WEBHOOK_NOTIFICATIONS_SECRET` crudo; el fallback legacy fue retirado de Vercel.
- Después del redeploy del entorno `Staging`, el consumer `notification-dispatch` siguió validando firmas y enviando notificaciones usando `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`.
- `src/lib/secrets/secret-manager.ts` ahora sanitiza secuencias literales `\n` y `\r` en `*_SECRET_REF`, endureciendo el contrato frente a drift de export/import de env vars.

### TASK-129 webhook notifications consumer started

- Se inició `TASK-129` como un consumer institucional nuevo sobre el bus outbound, sin reemplazar el carril reactivo legacy.
- El repo ahora soporta:
  - `POST /api/internal/webhooks/notification-dispatch`
  - `POST /api/admin/ops/webhooks/seed-notifications`
  - contrato de secretos `WEBHOOK_NOTIFICATIONS_SECRET` + `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
- El target del subscriber de notificaciones soporta bypass opcional de `Deployment Protection`, alineado al patrón ya validado por el canary.

### TASK-129 hardening + Vercel secret-ref rollout

- El consumer de notificaciones ahora exige firma cuando existe secreto resuelto y ya no queda `fail-open` ante deliveries sin `x-greenhouse-signature`.
- La deduplicación cubre también dispatches `email-only` usando metadata persistida en `notification_log`, no solo filas visibles en `notifications`.
- Vercel ya tiene `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret` en `staging` y `production`.
- Los seed routes de webhooks ahora persisten aliases estables del request en vez de `VERCEL_URL` efímero, y los bypass secrets se sanitizan removiendo también `\n`/`\r` literales.
- `wh-sub-notifications` quedó corregida en `staging` para apuntar al alias `dev-greenhouse.efeoncepro.com` sin `%5Cn` contaminando el target.
- Validación E2E cerrada en `staging`:
  - `assignment.created` visible en campanita para un usuario real
  - `payroll_period.exported` creó 4 notificaciones `payroll_ready` para recipients del período `2026-03`
- Durante la validación se detectó y corrigió un gap de identidad en `staging`: `client_users` internos activos sin `member_id`, lo que impedía resolver recipients.

### TASK-133 created for Sentry surfacing in Ops Health

- Se creó `TASK-133` para traer incidentes abiertos/relevantes de Sentry a `Operations Health`.
- El trigger real de esta task fue un error de producción detectado en Sentry fuera del tablero de health actual.

### TASK-131 closed with runtime-vs-tooling secret posture separation

- `src/lib/cloud/secrets.ts` ahora clasifica secretos tracked entre `runtime` y `tooling`.
- `src/lib/cloud/health.ts` evalúa `postureChecks.secrets` solo con secretos runtime-críticos y conserva el detalle de tooling por separado.
- Esto evita degradar `overallStatus` solo porque `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` o `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` no vivan en el runtime del portal.
- `postgresAccessProfiles` sigue exponiendo `runtime`, `migrator` y `admin` para operaciones.

### TASK-125 webhook activation closed in staging

- El canary outbound ya quedó validado end-to-end en `staging` con `HTTP 200` real.
- Vercel ya tenía `Protection Bypass for Automation` habilitado; el portal ahora lo consume vía `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET`.
- La canary subscription quedó alineada a `finance.income.nubox_synced` y el dispatcher ya prioriza eventos `published` más recientes para evitar starvation de subscriptions nuevas.

### TASK-125 canary target now supports optional Vercel protection bypass

- La seed route del canary ya puede construir el target con `x-vercel-protection-bypass` de forma opcional.
- Se soporta una env dedicada (`WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET`) con fallback a `VERCEL_AUTOMATION_BYPASS_SECRET`.
- El repo ya no necesita más cambios para atravesar `Deployment Protection`; el remanente quedó concentrado en habilitar y cargar ese secreto en Vercel.

### TASK-125 reduced to Vercel deployment-protection bypass

- La capa de webhooks ya quedó alineada a Secret Manager refs y el schema de webhooks fue provisionado en la base usada por `staging`.
- `wh-sub-canary` ya pudo generar deliveries reales desde `webhook-dispatch`; el bus outbound dejó de estar idle.
- El bloqueo restante es externo al repo: `dev-greenhouse.efeoncepro.com` responde `401 Authentication Required` al self-loop del canary por `Vercel Deployment Protection`.

### TASK-125 webhook canary now supports Secret Manager refs

- La capa de webhooks quedó alineada al helper canónico de secretos.
- `inbound`, `outbound` y el canary interno ya soportan `WEBHOOK_CANARY_SECRET_SECRET_REF` además del env legacy.
- Esto permite activar `TASK-125` en Vercel sin exponer el secreto crudo cuando ya existe en Secret Manager.

### TASK-127 created for Cloud architecture consolidation

- Se creó `TASK-127` como follow-on explícito para consolidar la lectura de arquitectura Cloud después del baseline ya implementado.
- El objetivo de esta lane no es reabrir hardening ya cerrado, sino sintetizar el estado real por dominio, reducir drift documental y ordenar la siguiente ola de mejoras.

### TASK-102 closed after restore verification

- Se completó el restore test end-to-end de Cloud SQL con el clone efímero `greenhouse-pg-restore-test-20260329d`.
- La verificación SQL confirmó datos en tablas críticas y schemata esperados (`greenhouse_core`, `greenhouse_payroll`, `greenhouse_sync`).
- El clone se eliminó después del check y no quedaron instancias temporales vivas.
- `TASK-102` queda cerrada: PITR, WAL retention, slow query logging, pool runtime `15` y restore confidence ya tienen evidencia operativa completa.

### TASK-102 external validation narrowed the remaining gap

- Se confirmó en GCP la postura activa de `greenhouse-pg-dev`: `PITR`, WAL retention, `log_min_duration_statement=1000`, `log_statement=ddl` y `sslMode=ENCRYPTED_ONLY`.
- `staging` y `production` respondieron por `vercel curl /api/internal/health` con `postgres.status=ok`, `usesConnector=true`, `sslEnabled=true` y `maxConnections=15`.
- Cloud Logging ya mostró una slow query real con `duration: 1203.206 ms` para `SELECT pg_sleep(1.2)`.
- `TASK-102` sigue abierta solo por el restore test end-to-end; los clones efímeros intentados en esta sesión se limpiaron para no dejar infraestructura temporal viva.

### TASK-099 closed with CSP report-only baseline

- `src/proxy.ts` ahora suma `Content-Security-Policy-Report-Only` sobre la baseline previa de security headers.
- `pnpm exec vitest run src/proxy.test.ts`, `eslint`, `tsc --noEmit` y `pnpm build` pasaron con el nuevo header.
- `TASK-099` queda cerrada para el alcance seguro de hardening cross-cutting; el endurecimiento futuro de `CSP` ya no bloquea esta lane.

### TASK-099 scope aligned with the validated proxy baseline

- `TASK-099` se re-acotó documentalmente para reflejar el estado real del repo.
- El baseline ya validado incluye solo `src/proxy.ts`, headers estáticos, matcher conservador y `HSTS` en `production`.
- `Content-Security-Policy` queda explícitamente como follow-on pendiente, no como criterio ya cumplido del slice actual.

### TASK-096 closed after WIF + Cloud SQL hardening

- `TASK-096` queda cerrada para el alcance declarado:
  - baseline WIF-aware en repo
  - rollout WIF validado en `preview`, `staging` y `production`
  - hardening externo de Cloud SQL aplicado
- La Fase 3 de secretos críticos quedó absorbida posteriormente por `TASK-124`.

### TASK-098 observability MVP closed in production

- `main` absorbió `develop` en `bcbd0c3` y `production` quedó validada con `observability=ok`.
- `GET /api/internal/health` ya reporta en producción:
  - `Sentry runtime + source maps listos`
  - `Slack alerts configuradas`
- `GET /api/auth/session` respondió `{}` en el deployment productivo validado.
- `TASK-098` queda cerrada para el alcance MVP declarado.

### TASK-098 observability validated end-to-end in staging

- `staging` ya quedó con `Sentry` y `Slack alerts` operativas, no solo configuradas.
- `GET /api/internal/health` reporta `observability` en estado `ok`.
- Se validó ingestión real en Sentry con un evento de smoke visible en el dashboard del proyecto `javascript-nextjs`.
- Se validó entrega real a Slack con respuesta `HTTP 200` usando el webhook resuelto desde Secret Manager.
- El remanente real de `TASK-098` ya quedó concentrado en replicar el rollout a `production`.

### TASK-098 Slack alerts Secret Manager-ready

- `SLACK_ALERTS_WEBHOOK_URL` ahora soporta `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF` con fallback controlado a env var.
- `src/lib/alerts/slack-notify.ts` consume el helper canónico y ya no depende solo del env directo.
- `GET /api/internal/health` y `src/lib/cloud/secrets.ts` reflejan también la postura de `slack_alerts_webhook`.
- Se mantuvo deliberadamente fuera de este slice:
  - `CRON_SECRET`, por su path síncrono transversal
  - `SENTRY_AUTH_TOKEN`, por su path build-time en `next.config.ts`

### TASK-098 Sentry minimal runtime baseline

- Se instaló `@sentry/nextjs` y quedó cableado el wiring mínimo para App Router en `next.config.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts` y `sentry.edge.config.ts`.
- El runtime queda fail-open: si no existe `SENTRY_DSN` ni `NEXT_PUBLIC_SENTRY_DSN`, Sentry no inicializa.
- La postura de observabilidad ahora distingue DSN runtime, DSN público, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` y readiness de source maps.
- `pnpm build` ya pasa con esta base y `develop/staging` quedó validado en `ac11287`.
- Ese estado inicial ya fue superado: `staging` terminó con observabilidad externa operativa; el rollout pendiente ya es solo `production`.

### TASK-099 security headers proxy baseline

- Se creó `src/proxy.ts` con headers estáticos (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-DNS-Prefetch-Control`) para todo el runtime salvo `_next/*` y assets estáticos.
- `Strict-Transport-Security` se aplica solo en `production`.
- El `Content-Security-Policy` real queda diferido a una segunda iteración por riesgo de romper MUI/Emotion, OAuth y assets.

### TASK-098 observability posture baseline

- `GET /api/internal/health` ahora expone también `observability`, con un contrato mínimo para saber si Sentry y Slack alerts están configurados en runtime.
- Se creó `src/lib/cloud/observability.ts` y su test unitario como capa canónica de postura para `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` y `SLACK_ALERTS_WEBHOOK_URL`.
- El health interno ahora separa `runtimeChecks` de `postureChecks`, mantiene `503` solo para fallos reales de Postgres/BigQuery y agrega `overallStatus` + `summary` para lectura operativa.
- El payload ahora suma `postgresAccessProfiles` para visibilidad separada de credenciales `runtime`, `migrator` y `admin`, sin mezclar tooling privilegiado con la postura runtime del portal.
- `.env.example` quedó alineado con esas tres variables para preparar el rollout posterior de observabilidad externa.
- El repo hoy ya tiene además Sentry mínimo y adapter base de Slack; el remanente de `TASK-098` pasó a ser rollout/configuración externa.

### TASK-124 validada de forma segura en staging

- `develop` absorbió los tres slices de `TASK-124` en `497cb19` mediante una integración mínima desde `origin/develop`, sin arrastrar el resto de la branch auxiliar.
- Validación real en `staging`:
  - `dev-greenhouse.efeoncepro.com/api/internal/health` confirmó `GREENHOUSE_POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` y `NUBOX_BEARER_TOKEN` vía Secret Manager
- El último salto de Postgres runtime no requirió código nuevo:
  - `greenhouse-pg-dev-app-password` necesitaba `roles/secretmanager.secretAccessor` para `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
- El remanente ya no es de código en `staging`, sino de rollout/control:
  - mantener o retirar env vars legacy
  - decidir si `migrator` y `admin` deben mostrarse también en el posture runtime
  - validar `production` después de promover a `main`

### TASK-124 slice 1 de Secret Manager

- Se agregó `src/lib/secrets/secret-manager.ts` como helper canónico para secretos críticos con `@google-cloud/secret-manager`, cache corta, fallback a env var y convención `<ENV_VAR>_SECRET_REF`.
- `GET /api/internal/health` ahora expone postura de secretos críticos sin devolver valores, distinguiendo `secret_manager`, `env` y `unconfigured`.
- `src/lib/nubox/client.ts` quedó como primer consumer migrado al patrón nuevo: `NUBOX_BEARER_TOKEN` ya puede resolverse desde Secret Manager con fallback controlado al env legacy.
- `src/lib/postgres/client.ts` ya acepta `GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF`, y `scripts/lib/load-greenhouse-tool-env.ts` ya alinea también perfiles `runtime`, `migrator` y `admin` al mismo patrón.
- `src/lib/auth-secrets.ts` ahora centraliza `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` y `GOOGLE_CLIENT_SECRET` sobre el mismo helper, manteniendo Microsoft SSO y Google SSO operativos.
- `pnpm pg:doctor --profile=runtime` quedó validado con el path nuevo.
- Se agregaron tests unitarios para helper, postura cloud de secretos, consumer de Nubox, resolución Postgres runtime/tooling y auth secrets.

### TASK-096 baseline WIF-aware sin bigbang

- `src/lib/google-credentials.ts` ahora resuelve autenticación GCP con prioridad `WIF/OIDC -> SA key fallback -> ambient ADC`, manteniendo compatibilidad con el runtime actual.
- `src/lib/bigquery.ts`, `src/lib/postgres/client.ts`, `src/lib/storage/greenhouse-media.ts` y `src/lib/ai/google-genai.ts` quedaron alineados al helper canónico.
- Se migraron scripts operativos que todavía parseaban `GOOGLE_APPLICATION_CREDENTIALS_JSON` manualmente, reduciendo drift para el rollout transicional de WIF.
- El helper ahora también obtiene el token OIDC desde runtime Vercel con `@vercel/oidc`, habilitando WIF real sin depender solo de `process.env`.
- El rollout externo quedó parcialmente materializado: pool/provider WIF en GCP, env vars en Vercel y smoke exitoso de BigQuery + Cloud SQL Connector sin SA key.
- El preview real de `feature/codex-task-096-wif-baseline` quedó validado con health `200 OK`, `auth.mode=wif` y Cloud SQL reachable vía connector.
- Las variables activas del rollout WIF/conector ya fueron saneadas en Vercel.
- `dev-greenhouse.efeoncepro.com` quedó confirmado como `target=staging`; tras redeploy ya usa connector pero todavía corre el baseline previo de `develop` (`auth.mode=mixed`).
- Cloud SQL sigue sin endurecimiento externo final porque primero hay que llevar este baseline a `develop/staging` por el flujo normal y solo después cerrar red + SSL obligatoria.

### Nexa chat visual redesign — Enterprise AI 2025

- User messages: burbuja azul solida reemplazada por fondo sutil `action.hover` con texto oscuro legible y border-radius refinado (12px).
- Assistant messages: bubble eliminada — ahora es prosa abierta sin borde ni fondo, con avatar circular y label "Nexa".
- ActionBar: iconos sueltos reemplazados por barra contenida con fondo `action.hover` y border-radius.
- ThinkingIndicator: 3 dots bouncing reemplazados por shimmer skeleton (3 lineas animadas con MUI Skeleton wave).
- Suggestions: chips outlined reemplazados por mini-cards con borde, icono sparkles y hover interactivo.
- Composer: TextField WhatsApp-style reemplazado por input premium con sombra sutil, focus ring purple, border-top separator.
- Header: barra plana reemplazada por header frosted glass sticky con backdrop-filter blur.

### CI incorpora tests de Vitest

- El workflow `CI` ahora ejecuta `pnpm test` entre `Lint` y `Build`, con timeout explícito de `5` minutos.
- La suite actual entra limpia al pipeline con `99` archivos y `488` pruebas verdes en validación local previa.
- El control queda institucionalizado en repo dentro de `.github/workflows/ci.yml`, alineado con el dominio Cloud como guardrail de delivery validation.

### Cron auth centralizada para rutas scheduler-driven

- Se creó `src/lib/cron/require-cron-auth.ts` como helper canónico con `timingSafeEqual`, fail-closed cuando falta `CRON_SECRET` y soporte reusable para requests de Vercel cron.
- `src/lib/cloud/cron.ts` ahora expone helpers compartidos para postura del secret y detección del origen scheduler.
- Se migraron `19` rutas scheduler-driven, incluyendo `email-delivery-retry` y los sync endpoints de Finance, eliminando la auth inline inconsistente.
- El lote quedó validado con `pnpm lint`, `pnpm test` y `pnpm build`.

### Cloud SQL resilience baseline started

- `greenhouse-pg-dev` ahora expone PITR con `7` días de WAL retention y flags `log_min_duration_statement=1000` + `log_statement=ddl`.
- `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` quedó aplicado en `Production`, `staging` y `Preview (develop)`, y el fallback del repo se alineó al mismo valor.
- `TASK-102` sigue abierta solo por el restore clone de verificación, que quedó lanzado como `greenhouse-pg-restore-test-20260329`.

### Cloud layer reforzada para el track 096–103

- La capa institucional `src/lib/cloud/*` ahora incluye postura GCP (`gcp-auth.ts`) y postura Cloud SQL (`postgres.ts`) además de health, cron y cost guards.
- Se creó `GET /api/internal/health` como endpoint canónico de runtime health para Postgres y BigQuery, incluyendo versión, entorno y postura base de auth/runtime.
- `getOperationsOverview()` ahora refleja también la postura de auth GCP y la postura de Cloud SQL dentro del dominio Cloud.
- Se agregó `src/lib/alerts/slack-notify.ts` y hooks de alerting a crons críticos del control plane (`outbox-publish`, `webhook-dispatch`, `sync-conformed`, `ico-materialize`, `nubox-sync`).

### Nexa UI completion (TASK-115)

- Edit inline de mensajes user con ComposerPrimitive (pencil hover → EditComposer → Guardar/Cancelar).
- Follow-up suggestions como chips clicables + feedback thumbs 👍/👎 fire-and-forget.
- Nexa flotante portal-wide: FAB sparkles → panel 400×550 en desktop, Drawer bottom en mobile, oculto en `/home`.
- Thread history sidebar con lista agrupada por fecha, selección y creación de threads.
- `NexaPanel.tsx` legacy eliminado.

### Cloud governance operating model established

- `Cloud` quedó institucionalizado como dominio interno de platform governance con operating model canónico en `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`.
- Se dejó explícito el boundary entre `Admin Center`, `Cloud & Integrations`, `Ops Health`, contracts de código y runbooks/config.
- Se agregó una baseline mínima real en `src/lib/cloud/*` para health compartido, cost guards de BigQuery y postura base de cron.
- `TASK-100`, `TASK-101`, `TASK-102` y `TASK-103` ahora se leen como slices del dominio Cloud y ya no como hardening suelto.
- La UI de `Admin Center`, `Cloud & Integrations` y `Ops Health` ahora consume ese dominio vía `getOperationsOverview().cloud`, conectando runtime health, cron posture y BigQuery guards con surfaces reales.

### Admin Center hardening (TASK-121)

- Sorting por columna en tabla de spaces (TableSortLabel en las 5 columnas).
- Loading skeleton (`/admin/loading.tsx`) para hero, KPIs, tabla y domain cards.
- Domain cards de Cloud & Integrations y Ops Health muestran health real desde `getOperationsOverview`.
- Deep-link a filtros: `/admin?filter=attention&q=empresa`.
- Bloque "Requiere atencion" consolidado cross-dominio — solo visible cuando hay senales activas.
- Cierre final con tests UI dedicados para deep-link, sorting y loading; además se corrigió un loop de re-render en `AdminCenterView` memoizando el armado de domain cards.

### Admin Center absorbe Control Tower (v2)

- `/admin` es ahora la landing unificada de governance: Hero → 4 ExecutiveMiniStatCards → tabla limpia "Torre de control" (5 cols MUI, sin scroll horizontal) → mapa de dominios (outlined cards ricos).
- Nuevo `AdminCenterSpacesTable`: MUI Table size='small', filter chips, search, export CSV, paginación 8 filas, click-to-navigate.
- `/internal/dashboard` redirige a `/admin`; item "Torre de control" removido del sidebar.
- Patrón visual alineado con Cloud & Integrations y Ops Health.

### Home landing cutover baseline

- Los usuarios internos/admin ahora caen por defecto en `/home` cuando no tienen un `portalHomePath` explícito más específico; `hr`, `finance` y `my` conservan sus landings funcionales.
- La navegación interna ya separa `Home` del shell heredado de `Control Tower`: `Home` queda como entrada principal y el patrón operativo queda absorbido por `Admin Center`.
- Las sesiones legadas de internos que todavía traían `'/internal/dashboard'` como home histórico ahora se normalizan en runtime a `'/home'`.

### Nexa backend persistence and suggestions

- Nexa ahora persiste threads, mensajes y feedback en PostgreSQL bajo `greenhouse_ai`, con migración canónica y validación runtime no mutante del schema requerido.
- `/api/home/nexa` retorna `threadId`, guarda el par `user + assistant` y genera `suggestions` dinámicas para follow-ups.
- Se agregaron `POST /api/home/nexa/feedback`, `GET /api/home/nexa/threads` y `GET /api/home/nexa/threads/[threadId]` para destrabar `TASK-115`.

### Task lifecycle cleanup

- `TASK-009` quedó cerrada como baseline principal de `Home + Nexa v2`; lo pendiente se derivó a `TASK-119` y `TASK-110`.
- `TASK-108` quedó cerrada como baseline del shell de `Admin Center`; `TASK-120` quedó absorbida por la unificación posterior con `Control Tower`.
- `TASK-114`, `TASK-119` y `TASK-120` quedaron cerradas y el índice de tasks se alineó al estado real del repo.
- Se alinearon `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` para reflejar el estado real de `TASK-074`, `TASK-110`, `TASK-111`, `TASK-112` y `TASK-113`.

### Release channels operating model documented

- Greenhouse formalizo una policy operativa para lanzar capacidades en `alpha`, `beta`, `stable` y `deprecated`, con foco principal por modulo o feature visible y disponibilidad separada por cohort (`internal`, `pilot`, `selected_tenants`, `general`).
- La fuente canonica quedo en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`, con referencias cortas añadidas en `AGENTS.md`, `docs/README.md`, `project_context.md` y `GREENHOUSE_ARCHITECTURE_V1.md`.
- Se creo `docs/changelog/CLIENT_CHANGELOG.md` como changelog client-facing separado del `changelog.md` tecnico-operativo del repo.
- La policy ahora deja explicito el esquema hibrido: `CalVer + canal` para modulos/producto visible y `SemVer` reservado para APIs o contratos tecnicos versionados.
- La misma policy ahora define namespaces de Git tags para releases: `platform/...`, `<module>/...` y `api/<slug>/...`.
- Se agrego una baseline inicial de modulos/versiones/tags sugeridos y se dejo explicito que los tags reales deben crearse solo sobre un commit limpio.

## 2026-03-28

### Nexa model switch aligned to Vertex model IDs

- `/home` ahora permite seleccionar el modelo de Nexa con IDs reales de Vertex entre `google/gemini-2.5-flash@default`, `google/gemini-2.5-pro@default`, `google/gemini-3-flash-preview@default`, `google/gemini-3-pro-preview@default` y `google/gemini-3.1-pro-preview@default`.
- El backend valida el model ID con una allowlist compartida y cae de forma segura al default si recibe un valor inválido.
- El runtime sigue siendo Gemini-only; Claude on Vertex no se conectó en este slice porque requiere una integración distinta al flujo actual de `@google/genai`.

### Nexa tool calling runtime connected on Home

- `/api/home/nexa` ahora soporta function calling con Gemini y devuelve `toolInvocations` reales para `check_payroll`, `get_otd`, `check_emails`, `get_capacity` y `pending_invoices`.
- `HomeView` traduce esas invocaciones a `tool-call` parts del runtime de `@assistant-ui/react`, y `/home` renderiza resultados operativos inline con un renderer mínimo sin rehacer `NexaThread`.
- El comportamiento nuevo deja a Nexa grounded en datos reales del portal y separa la lógica backend de la futura Lane B visual.

### Admin Center staging hardening and payroll alert split

- `Cloud & Integrations` y `Ops Health` quedaron sanas en `staging` después de corregir el cruce Server/Client de sus views y fijar `America/Santiago` para estabilizar la hidratación de timestamps.
- `Cloud & Integrations` ahora absorbe la nota estructural de attendance lineage (`attendance_daily + leave_requests` como fuente actual y `Microsoft Teams` como target), para que Payroll muestre solo el impacto funcional sobre readiness.
- `PayrollPeriodTab` dejó de renderizar esas notas de integración en la pila de alertas; se mantienen warnings y blockers de negocio como compensación, attendance signal, KPI y UF/UTM.

### Nexa staging fallback added after Vertex AI permission failure

- Se diagnostico en runtime que el 500 de `/api/home/nexa` no venia del prompt ni del payload, sino de Vertex AI: `PERMISSION_DENIED` sobre `aiplatform.endpoints.predict` para `gemini-2.5-flash` en `efeonce-group`.
- `NexaService` ahora usa `systemInstruction` de forma nativa con `@google/genai` y degrada con una respuesta util cuando el entorno no tiene permiso de inferencia, en vez de romper Home con un 500 visible.
- Queda pendiente el fix de infraestructura: otorgar al service account de Vercel staging el rol/permisos de Vertex AI necesarios para restaurar la respuesta real del modelo.

### TASK-063 reclassified as complete with hardening follow-up

- `TASK-063` se movió a `complete` al alinear su estado documental con el runtime real ya implementado de `Projected Payroll` (API, UI, snapshots y promoción a oficial).
- Se creó `TASK-109` para la deuda remanente de robustez: eliminar DDL en runtime, reforzar observabilidad de la proyección reactiva y cerrar el contrato downstream de `payroll.projected_*`.
- El índice y el registry de tasks quedaron actualizados con el nuevo estado y el siguiente ID disponible.

### TASK-095 centralized email delivery layer completed

- Se implementó la capa unificada `sendEmail()` sobre Resend con template registry, resolver de suscripciones y persistencia en `greenhouse_notifications.email_deliveries`.
- Auth, NotificationService y Payroll ya migraron al contrato central, incluyendo el template `NotificationEmail` para dejar atrás el plain text del canal de notificaciones.
- La task quedó movida a `complete/` y el catálogo de emails, el registry de tasks y el contexto del proyecto quedaron alineados al runtime nuevo.
- El cron `email-delivery-retry` quedó agregado para reprocesar `failed` deliveries usando el `delivery_payload` persistido, con límite de 3 intentos en una ventana de 1 hora.

### Payroll email resend staging env clarified

- Se documentó que `dev-greenhouse.efeoncepro.com` sirve el deployment `staging` de Vercel, por lo que `RESEND_API_KEY` y `EMAIL_FROM` deben existir en ese entorno para que `Reenviar correo` funcione realmente.
- El aprendizaje operativo quedó reflejado en `TASK-095`, `project_context.md` y `Handoff.md` para evitar que futuros agentes confundan `Preview (develop)` con el runtime que atiende el alias compartido.
- El contrato futuro de la capa de delivery debería distinguir `sent`, `failed` y `skipped`; un envío sin provider activo no debe presentarse como éxito.

### Payroll export package auto-bootstrap added

- La capa de `payroll_export_packages` ahora materializa su propia tabla e índices si faltan en el entorno de preview antes de leer o persistir artefactos.
- Esto destraba `Reenviar correo` en deployments que todavía no tenían aplicada la migración del paquete documental de exportación.
- La migración canónica sigue viva en `scripts/migrations/add-payroll-export-packages.sql`; el bootstrap runtime solo evita que la UI quede bloqueada por un schema ausente.

### Payroll export actions made more discoverable

- `PayrollPeriodTab` ahora deja envolver el bloque de acciones exportadas para que `Reenviar correo` no quede recortado en la cabecera cuando hay varias acciones en pantalla.
- La descarga de PDF dejó de depender de `window.open` y ahora baja como archivo real vía `fetch -> blob -> anchor`, con copy explícito de descarga en la UI.
- El contrato de negocio no cambia: solo los períodos `exported` exponen reenvío de correo y descargas de artefactos.

### TASK-097 export package persistence completed

- Payroll persistió el paquete documental de exportación en GCS y ahora reutiliza ese artefacto para descargas PDF/CSV y reenvíos de correo sin recerrar el período.
- Se agregó `greenhouse_payroll.payroll_export_packages`, la ruta `POST /api/hr/payroll/periods/[periodId]/resend-export-ready` y la UI de `PayrollPeriodTab` para `Reenviar correo`.
- La arquitectura de Payroll, el catálogo de emails y el playbook reactivo quedaron alineados con el nuevo contrato.

### TASK-097 export package persistence implementation started

- Se implementó la capa base para persistir PDF/CSV de exportación Payroll en GCS con metadata transaccional en `greenhouse_payroll.payroll_export_packages`.
- Las rutas de descarga de PDF/CSV y el nuevo `POST /api/hr/payroll/periods/[periodId]/resend-export-ready` ya consumen ese paquete persistido.
- El cierre canónico sigue siendo `payroll_period.exported`; el paquete documental es derivado y reutilizable para reenvío o descarga posterior.

### TASK-097 payroll export artifact persistence and resend documented

- Se registró una lane nueva para persistir PDF/CSV de cierre de Payroll en GCS y habilitar reenvío del correo sin volver a cerrar el período.
- El brief deja claro que el cierre canónico sigue siendo `payroll_period.exported`, mientras que el bucket se usa para descargas posteriores y reenvíos.
- La task se apoya en el patrón de recibos ya persistidos, pero queda separada de `TASK-094` y de la capa transversal de delivery `TASK-095`.

### Payroll close now flushes notifications immediately after export

- El route `POST /api/hr/payroll/periods/[periodId]/close` ahora intenta publicar el outbox pendiente y procesar el dominio `notifications` en caliente justo después de marcar el período como `exported`.
- El cron de outbox/reactive sigue existiendo como safety net; el flush inmediato solo reduce la dependencia del scheduler en staging y en el flujo interactivo.
- El dispatch evita reenvíos sobre períodos ya exportados.

### TASK-095 centralized email delivery layer documented

- Se registró una lane paralela para centralizar el delivery de emails sobre Resend, compartiendo contrato con el sistema de notificaciones.
- El brief deja claro que Payroll, Finance, Delivery, Permissions y Auth deben consumir una capa única de envío y no helpers ad hoc.
- La task queda como backlog separado para no desviar la iteración activa de Payroll.

### TASK-094 completed with explicit Payroll close flow

- Payroll now separates the canonical close mutation from CSV download: `POST /api/hr/payroll/periods/[periodId]/close` marks `exported`, while `GET /api/hr/payroll/periods/[periodId]/csv` serves the artifact.
- Finance/HR notification is emitted from `payroll_period.exported` through a Resend-backed projection, with PDF and CSV attachments.
- The architecture, event catalog, email catalog, and task registry were aligned to the new contract.

### TASK-094 architecture context expanded for payroll close vs CSV download

- La task nueva de Payroll ahora explicita que `exported` es el cierre canónico y que la descarga del CSV es un artefacto opcional, no el mecanismo de cierre.
- La arquitectura de Payroll quedó alineada para que cualquier correo downstream a Finance/HR salga de `payroll_period.exported`.
- `GREENHOUSE_EMAIL_CATALOG_V1.md` ahora documenta `payroll_export_ready` como notificación downstream de cierre/exportación canónica.

### TASK-094 payroll close and CSV download separation added

- Se documentó una lane nueva para separar el cierre/exportación de un periodo de Payroll de la descarga opcional del CSV.
- El brief deja explícito que el estado `exported` debe surgir de una mutación de negocio, no de la entrega del archivo.
- Se corrigió el registry de tasks para reflejar que `TASK-093` ya estaba cerrada.

### TASK-092 payroll operational current period semantics completed

- `current-payroll-period` ahora resuelve el período actual por mes operativo vigente, usando la utility compartida de calendario operativo.
- `PayrollHistoryTab` deja de contar `approved` como cierre final y lo muestra como `aprobado en cierre`, separado de `cerrado/exportado`.
- La task quedó cerrada con tests de helper, tests de historial y build validado.

### TASK-092 operational current period semantics started

- `current-payroll-period` ya resuelve el período vigente por mes operativo y no solo por el último período no exportado.
- `PayrollHistoryTab` distingue ahora períodos cerrados/exportados de períodos aprobados que siguen en cierre, evitando presentar `approved` como cierre final.
- La arquitectura de Payroll quedó alineada para que la selección de período actual use la utility compartida de calendario operativo.

### Payroll operational calendar consumers mapped

- Se dejó explícito que la utilidad de calendario operativo hoy solo tiene consumidores directos dentro de Payroll: helpers de período actual, readiness, routes de approve/readiness y las vistas operativas del módulo.
- Se documentó también que Finance y Cost Intelligence solo consumen derivados de nómina, no la policy temporal.
- Se agregaron candidatos futuros de adopción transversal: ICO, Finance, Campaigns y Cost Intelligence, condicionados a que formalicen ciclos de cierre mensuales o ventanas operativas reales.

### TASK-091 operational calendar utility implemented

- Se implementó la utilidad canónica de calendario operativo en `src/lib/calendar/operational-calendar.ts`.
- La hidratación pública de feriados quedó separada en `src/lib/calendar/nager-date-holidays.ts` con `Nager.Date` como fuente recomendada.
- La tarea se cerró con tests de business days, close window, rollover mensual y normalización del loader externo.

### Payroll holiday source set to Nager.Date

- Se decidió documentar `Nager.Date` como la fuente pública de mercado recomendada para feriados nacionales del calendario operativo.
- El timezone/DST sigue resolviéndose con IANA en el runtime, mientras que los overrides corporativos o jurisdiccionales pueden persistirse en Greenhouse sobre esa fuente.

### Payroll operational calendar made timezone-aware in architecture

- Se documentó que el calendario operativo de Payroll debe ser timezone-aware y calcularse sobre `America/Santiago` como base de la casa matriz.
- La nueva regla separa `timezone`, `country/jurisdiction` y `holiday calendar` para soportar operaciones multi-país sin depender de la zona horaria del servidor ni del país de residencia del colaborador.
- `TASK-091` quedó alineada para nacer como utilidad pura de dominio y no como projection reactiva.

### Payroll operational calendar and current-period semantics split into separate lanes

- Se reservaron `TASK-091` y `TASK-092` para separar la utilidad canónica de calendario operativo de la semántica de período actual en Payroll.
- No hubo cambio de runtime en esta vuelta; el ajuste quedó explícitamente como backlog y documentación viva.

### TASK-089 Payroll UX semantics and feedback hardened

- El dashboard de Payroll separa ahora período activo e histórico seleccionado, evitando que un clic en historial reemplace el contexto del período abierto.
- `Payroll History`, `Payroll Period`, `Mi Nómina`, `People > Nómina` y `Payroll Proyectada` ganaron affordances, copy y estados de error/retry más explícitos.
- La descarga de recibos y los icon buttons críticos ahora exponen labels accesibles y feedback visible, reduciendo dependencias de `console.error` o affordances implícitas.

### TASK-088 reactive projections and delivery hardened

- La cola reactiva de Payroll ahora cierra su ciclo con `pending -> completed/failed`, conserva dedupe por `event_id + handler` y mantiene el queue completion como paso best-effort posterior al ledger reactivo.
- El fallback BigQuery de export ya no publica `payroll_period.exported` si la mutación no actualiza ninguna fila, evitando eventos duplicados y receipts repetidos.
- La arquitectura quedó alineada para tratar `projected_payroll_snapshots` como serving cache interno y no como source of truth transaccional.

### TASK-087 lifecycle invariants and readiness gate hardened

- El contrato de nómina oficial ahora valida transiciones en el store: `calculated`, `approved` y `exported` solo avanzan desde estados permitidos.
- `POST /api/hr/payroll/periods/[periodId]/approve` ahora consume el readiness canónico y rechaza blockers antes de aprobar.
- La edición de entries de períodos `approved` reabre explícitamente el período a `calculated` antes de mutar datos.
- `pgUpdatePayrollPeriod()` vuelve a `draft` cuando un cambio de metadatos exige recalcular, evitando que quede un `approved` mentiroso tras reset de entries.

### Payroll hardening backlog and architecture alignment documented

- Se documentaron tres lanes nuevas para endurecer Payroll sin mezclar objetivos: lifecycle/readiness, reactivo/delivery y UX/feedback.
- La arquitectura de Payroll ahora declara la ventana operativa de cierre, `/hr/payroll/projected` como surface derivada y `payroll_receipts_delivery` como downstream de `payroll_period.exported`.
- `TASK-063` recibió un delta de alineación para dejar claro que los nuevos eventos proyectados ya no son el contrato principal y que el cierre actual vive en hardening.

### TASK-086 current period selector + receipt download implemented

- `PayrollDashboard` ahora usa un helper puro para seleccionar el período actual sin retroceder a rezagos exportados.
- `PayrollPeriodTab` muestra empty state operativo con CTA de creación del siguiente período.
- La descarga de recibos PDF dejó de depender de `window.open` y ahora usa `fetch -> blob -> anchor` con nombre legible para HR y Mi Nómina.
- Se añadió `@testing-library/dom` como devDependency explícita para estabilizar la suite de tests de componentes que usa Testing Library.

### TASK-086 payroll cut-off rule clarified

- `TASK-086` quedó ajustada para reflejar la regla operativa real de Efeonce: la nómina se imputa al mes cerrado y se calcula/cierra al final del mes o dentro de los primeros 5 días hábiles del mes siguiente.
- El brief ahora separa "período actual" de simple cambio de calendario y ancla el selector a la ventana de cierre operativo.
- Se dejó explícito que `approved` puede seguir siendo el período actual solo mientras siga dentro de la ventana de cierre; fuera de ese corte debe dejar de mostrarse como vigente.
- La misma task ahora absorbe también el flujo de descarga del recibo PDF, porque el botón no estaba cerrando una experiencia confiable y el filename seguía saliendo del `receiptId` técnico.

### Reverse payroll engine + compensation líquido-first (TASK-079 → TASK-085)

- Motor `computeGrossFromNet()`: binary search sobre forward engine, ±$1 CLP, piso IMM, AFP desde Previred
- Regla Chile: líquido deseado = neto con 7% salud legal; excedente Isapre como deducción voluntaria visible
- API `POST /api/hr/payroll/compensation/reverse-quote` con resolución de UF, UTM, IMM, tax brackets
- `desired_net_clp` persistido en `compensation_versions` (migration `add-compensation-desired-net-clp.sql`)
- CompensationDrawer: Chile siempre en modo reverse (sin switch), preview enterprise con secciones semánticas, accordion previsional, $ InputAdornment, skeleton loading, error visible sobre botón
- Internacional: sin cambios (salary base directo)
- Validado contra liquidación real Valentina Hoyos (Feb 2026)
- Sección 24 en `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`

### Payroll receipt smoke completed

- `TASK-077` quedó cerrada end-to-end: el período de marzo 2026 se reemitió a `approved`, se publicó el outbox, `payroll_receipts_delivery` materializó 4 recibos y se enviaron 4 correos.
- Los recibos quedaron persistidos en GCS bajo `gs://efeonce-group-greenhouse-media/payroll-receipts/2026-03/...`.
- Esto cierra el último smoke operativo pendiente de receipts sobre staging.

### Reactive receipts projection log fixed

- `greenhouse_sync.outbox_reactive_log` ahora está keyed por `(event_id, handler)` para que un handler exitoso no bloquee al resto de proyecciones del mismo outbox event.
- `greenhouse_sync.projection_refresh_queue` recuperó su dedup canónica con `UNIQUE (projection_name, entity_type, entity_id)`, de modo que `enqueueRefresh()` ya puede persistir refresh intents sin caer en un `ON CONFLICT` inválido.
- Esto corrige el último bloqueo estructural que impedía a `payroll_receipts_delivery` materializar recibos cuando otro consumer ya había procesado el mismo `payroll_period.exported`.

### Reactive receipts infrastructure preprovisioned

- `greenhouse_sync.outbox_reactive_log` y `greenhouse_sync.projection_refresh_queue` quedaron provisionadas por setup compartido.
- El runtime reactivo dejó de intentar DDL en `greenhouse_sync`; ahora solo verifica existencia y usa la infraestructura ya creada.
- Eso habilita la proyección `payroll_receipts_delivery` para materializar el batch de recibos después de `payroll_period.exported`.

### Payroll receipt routes tolerate registry lookup failures

- Los routes de recibo individual ya no dependen de que `greenhouse_payroll.payroll_receipts` esté disponible para responder.
- Si el lookup del registry falla, la API cae al render on-demand del PDF y mantiene la descarga operativa.
- Esto evita que `TASK-077` quede bloqueada por una fila de registry no materializada aunque la exportación y el período oficial ya estén correctos.

### Payroll approval guard aligned to new bonus policy

- El guard de `POST /api/hr/payroll/periods/[periodId]/approve` ya no bloquea por pisos mínimos legacy (`bonusOtdMin` / `bonusRpaMin`) cuando la liquidación calculada cae dentro del máximo permitido y cumple elegibilidad.
- El criterio de aprobación quedó alineado con la policy recalibrada de bonos variables, que prorratea sobre el máximo y preserva `bonusOtdMin` / `bonusRpaMin` solo como metadata histórica.
- Este ajuste desbloquea el smoke de exportación y recibos de `TASK-077`, que dependía de poder llevar marzo 2026 desde `calculated` a `approved` y luego a `exported`.

### Payroll projected AFP helper aligned to staging schema

- `Payroll Proyectada` seguía fallando con `column "worker_rate" does not exist`.
- Se inspeccionó la tabla real `greenhouse_payroll.chile_afp_rates` en Cloud SQL y se confirmó que solo expone `total_rate`.
- El helper previsional de AFP ahora toma `total_rate` como fuente de cotización cuando el split explícito no existe, evitando que la proyección dependa de una columna ausente en staging.

### Payroll projected core schema readiness split

- `Payroll Proyectada` ya no debe depender de `greenhouse_payroll.payroll_receipts` para renderizar la proyección.
- Se separó la verificación de schema en dos niveles:
  - core payroll: compensaciones, períodos, entries y bonus config
  - receipts payroll: schema adicional para generación/consulta de recibos
- Con esto, la vista proyectada deja de caer por una tabla de recibos ausente aunque el resto del core payroll esté sano.

### Payroll projected route access aligned to HR

- `Payroll Proyectada` estaba quedando en vacío porque su API principal usaba `requireAdminTenantContext`, a diferencia del resto del módulo `Payroll` que opera con `requireHrTenantContext`.
- El endpoint `/api/hr/payroll/projected` quedó alineado al mismo guard que `compensation`, `periods` y `receipts`, así que la vista ya no depende de un rol admin estricto para leer la proyección.
- La causa raíz ya no es la falta de datos en la compensación vigente: en la BD sí existen compensaciones activas para marzo 2026; el problema era el guard de acceso del route.

### Payroll projected staging schema gap

- `dev-greenhouse` sigue mostrando `Payroll Proyectada` vacía/500; la revisión del código apunta a un schema de PostgreSQL de staging que todavía no tiene aplicadas todas las migrations de Payroll Chile (`gratificacion_legal_mode`, `colacion_amount`, `movilizacion_amount`, split AFP, etc.).
- `TASK-078` sigue completa en código y docs, pero queda una deuda operativa explícita: alinear la BD del ambiente compartido con el schema que la vista proyectada ya espera.

### Payroll receipt email template branded

- El batch de recibos de nómina ya usa un template React Email dedicado (`src/emails/PayrollReceiptEmail.tsx`) con branding Greenhouse/Efeonce, resumen por período y CTA al portal.
- `generatePayrollReceiptsForPeriod()` sigue enviando el PDF adjunto y conserva fallback de texto para deliverability.
- Se agregó test unitario del template para Chile e internacional, dejando el último gap visible de `TASK-077` en la parte de email/branding cerrado.

### Payroll receipt access surfaces wired

- `My Nómina` ya expone descarga directa del recibo por período usando `GET /api/my/payroll/entries/[entryId]/receipt`.
- `People > Person > Nómina` ya expone descarga directa del recibo por entry para HR, reutilizando el route que prioriza el PDF almacenado.
- La task de recibos queda con la base delivery completa; lo pendiente ya es el pulido visual final y el smoke end-to-end de entrega.

### Payroll receipts delivery foundation

- `Payroll` ya tiene la base de recibos persistidos: registry en `greenhouse_payroll.payroll_receipts`, upload a GCS, batch generator `generatePayrollReceiptsForPeriod()` y proyección reactiva `payroll_receipts_delivery`.
- La descarga por HR ahora prioriza el PDF almacenado y solo cae al render on-demand como fallback, evitando regenerar el documento en cada consulta.
- El flujo sale por `payroll_period.exported` y no como cron separado, manteniendo la propagación sobre el outbox/reactive projection pipeline ya existente.

### Payroll Chile foundation closure and receipt lane open

- `TASK-078` quedó formalmente cerrada como `complete`: la base previsional canónica, el sync Gael Cloud y el forward cutover ya están estabilizados en runtime y docs.
- `TASK-077` quedó abierta como siguiente lane operativa para recibos PDF/email/GCS/Mi Nómina, siguiendo el orden definido para Payroll Chile.

### Organization legal identity canonical

- La identidad legal canónica de la organización operativa propietaria de Greenhouse quedó documentada de forma transversal para Payroll, Finance y surfaces comerciales: `Efeonce Group SpA`, RUT `77.357.182-1`, dirección `Dr. Manuel Barros Borgoño 71 of 05, Providencia, Chile`.
- La referencia canónica se asentó en la arquitectura de Account 360 / organización y en el contexto vivo del repo para evitar duplicación por módulo.

### Chile employer cost base

- `Payroll Chile` ahora calcula y persiste un breakdown de costos empleador (`SIS`, cesantía empleador y mutual estimado) junto a cada `payroll_entry`.
- La proyección canónica `member_capacity_economics` absorbe ese breakdown para que `total_labor_cost_target` refleje el costo laboral cargado real sin crear otra capa de cálculo.
- La propagación sigue usando los eventos existentes de `compensation_version.created/updated` y `payroll_entry.upserted`.

### Chile AFP breakdown

- `Payroll Chile` ahora separa `AFP` en `cotización` y `comisión` dentro de la compensación versionada, `payroll_entries` y los exports/recibos, manteniendo el total agregado como compatibilidad histórica.
- Se agregó migration para expandir el esquema de PostgreSQL y backfillear el split en datos existentes.
- El cálculo forward no cambió semánticamente: sigue usando el total AFP para imponibles y neto, pero la trazabilidad legal quedó más explícita.

### Chile payroll non-imponible allowances

- `Payroll Chile` ahora modela `colación` y `movilización` como haberes canónicos en la compensación versionada y en `payroll_entries`.
- El cálculo mensual incorpora esos montos al total devengado y al neto, manteniendo su carácter no imponible en la liquidación.
- Se agregó migration de PostgreSQL para expandir `compensation_versions` y `payroll_entries` con las columnas necesarias.
- La propagación del cambio sigue usando los eventos canónicos existentes `compensation_version.created/updated` y `payroll_entry.upserted`.

## 2026-03-27

### Valentina February 2026 payroll smoke

- Se validó contra la liquidación real de febrero 2026 de Valentina Hoyos el núcleo legal del cálculo Chile de Greenhouse.
- Se sembró IMM `539000` en `greenhouse_finance.economic_indicators` para habilitar la gratificación legal de febrero.
- Resultado validado del motor:
  - `baseSalary = 539000`
  - `gratificacionLegal = 134750`
  - `grossTotal = 673750`
  - `chileAfpAmount = 70474.25`
  - `chileHealthAmount = 161947.86`
  - `chileUnemploymentAmount = 4042.5`
  - `netTotal = 437285.39`
- Gap restante para igualar el PDF completo:
  - `colación`
  - `movilización`
- No se agregó un evento nuevo; la propagación sigue por `compensation_version.created/updated` y `payroll_entry.upserted`.

### Projected Payroll -> Official promotion flow

- `Projected Payroll` ahora puede promoverse explícitamente a borrador/recalculo oficial vía `POST /api/hr/payroll/projected/promote`, reutilizando el motor oficial con `projectionContext` (`actual_to_date` o `projected_month_end` + `asOfDate`).
- Se agregó audit trail en PostgreSQL con `greenhouse_payroll.projected_payroll_promotions`, incluyendo `promotionId`, corte proyectado, actor, status (`started/completed/failed`) y cantidad de entries promovidas.
- `/api/hr/payroll/projected` ya compara contra `greenhouse_payroll.*` en vez del schema legacy `greenhouse_hr.*`, y expone la última promoción completada del período/modo.
- `Projected Payroll` ahora incluye CTA para crear o recalcular el borrador oficial desde la propia vista.
- Guardrail nuevo: al recalcular un período oficial se eliminan `payroll_entries` sobrantes cuyo `member_id` ya no pertenece al universo vigente del cálculo.

### Payroll variable bonus policy recalibration

- `Payroll` ahora usa una policy de payout más flexible para bonos variables:
  - `OTD` paga `100%` desde `89%` y prorratea linealmente desde `70%`
  - `RpA` paga `100%` hasta `1.7`, cae suavemente hasta `80%` en `2.0`, y luego desciende hasta `0` al llegar a `3.0`
- Se amplió `greenhouse_payroll.payroll_bonus_config` para versionar explícitamente la banda suave de `RpA` con:
  - `rpa_full_payout_threshold`
  - `rpa_soft_band_end`
  - `rpa_soft_band_floor_factor`
- El cutover se aplicó al runtime canónico de:
  - cálculo oficial de nómina
  - projected payroll
  - recálculo manual por entry
- Se agregaron tests de prorrateo y de flujo de compensación para asegurar compatibilidad con projected payroll y exportables.

### ICO assignee attribution remediation

- Se detectó y remediò un incidente sistémico donde tareas con `responsables_ids` en `notion_ops.tareas` no estaban quedando atribuidas en `greenhouse_conformed.delivery_tasks`, dejando `ICO` sin KPI por persona y `Payroll` con bonos variables en cero.
- Se ejecutó un rerun operativo de `syncNotionToConformed()` y `materializeMonthlySnapshots(2026, 3)`, recuperando atribución en `delivery_tasks` y filas reales en `ico_engine.metrics_by_member`.
- Resultado validado con datos reales:
  - `delivery_tasks` volvió a persistir assignees (`with_assignee_source = 1063`, `with_assignee_member = 714`, `with_assignee_member_ids = 792`)
  - `andres-carlosama` recuperó KPI marzo 2026 en `ICO`
- Se endureció el runtime de `Payroll projected`:
  - `fetchKpisForPeriod()` ahora ignora `memberId` nulos o vacíos sin romper todo el batch
  - `projectPayrollForPeriod()` ahora filtra miembros activos sin compensación vigente real antes de calcular proyecciones
- Se agregó cobertura de tests para evitar que un miembro sin compensación o con `memberId` inválido vuelva a dejar a todo el período sin KPI.

### Payroll recurring fixed bonus support

- `Payroll` ahora soporta un bono fijo recurrente canónico en la compensación versionada mediante `fixedBonusLabel` y `fixedBonusAmount`.
- El bono fijo se congela también en `payroll_entries` junto con `adjustedFixedBonusAmount`, para conservar snapshot histórico y prorrateo por inasistencia/licencia no remunerada.
- El cálculo mensual lo incorpora al `grossTotal`, al imponible Chile y al `netTotalCalculated`, evitando depender de `bonusOtherAmount` manual para haberes fijos.
- `CompensationDrawer`, tabla de compensaciones, tabla de entries, recibos, PDF, CSV, Excel e historial por colaborador ahora lo muestran de forma consistente.
- Se agregó cobertura de tests para el cálculo del bono fijo y se extendió la suite del módulo `Payroll` sin regresiones (`80/80` tests del slice).

### Payroll leave type clarification

- Se confirmó que `Payroll` ya diferencia permisos remunerados vs no remunerados: solo `daysAbsent` y `daysOnUnpaidLeave` descuentan pago; `daysOnLeave` remunerado no descuenta.
- Se normalizó el catálogo operativo de permisos:
  - `personal` ahora es no remunerado
  - `medical` ahora representa `permiso médico / cita médica` remunerado
  - `personal_unpaid` queda como alias legacy inactivo para no romper requests históricos
- Ejecutada la migration `scripts/migrations/normalize-leave-type-paid-policy.sql` y verificado el estado final del catálogo en PostgreSQL.
- Se amplió el catálogo con una baseline internacional de permisos:
  - remunerados por defecto: `floating_holiday`, `bereavement`, `civic_duty`
  - no remunerados por defecto: `parental`, `study`
- Ejecutada la migration `scripts/migrations/expand-leave-types-international-baseline.sql` y verificado el catálogo final en PostgreSQL.

### Payroll go-live hardening

- `Payroll` ya no consolida períodos mixtos `CLP/USD` bajo una sola moneda en dashboard ni en `Personnel Expense`; ahora separa subtotales por moneda y evita visualizaciones engañosas.
- La exportación de nómina en PostgreSQL publica el evento canónico `payroll_period.exported`, incorporado al catálogo reactivo y consumido por projections downstream (`member_capacity_economics`, `person_intelligence`, `client_economics`).
- `person_intelligence` pasó a refresco real por `finance_period`, por lo que los eventos `payroll_period.*` y `payroll_entry.upserted` ya no quedan como no-op.
- El cálculo Chile ahora bloquea si falta `taxTableVersion` o si no se puede resolver la `UTM` histórica del período; dejó de ser posible degradar silenciosamente el impuesto a `0`.
- La creación de período de nómina ahora también puede capturar `taxTableVersion`, mientras la `UF` sigue autohidratándose.
- Hallazgo funcional documentado: el módulo sí calcula con salario base, conectividad y bonos variables (`OTD`, `RpA`, `bonusOtherAmount`) y descuenta ausencias/licencias no pagadas, pero todavía no modela un catálogo genérico de bonos fijos recurrentes aparte de `remoteAllowance`.

### Economic indicators migration + historical backfill

- Ejecutada la migration `scripts/migrations/add-economic-indicators.sql` para materializar `greenhouse_finance.economic_indicators`.
- Se agregó el script reusable `scripts/backfill-economic-indicators.ts` para poblar indicadores desde `mindicador` usando perfil `migrator`.
- Backfill ejecutado para `2026-01-01 -> 2026-03-27`:
  - `UF`: 86 filas
  - `USD_CLP`: 61 filas
  - `UTM`: 3 filas
- `IPC`: 0 filas disponibles en la serie 2026 consultada
- El backfill también dejó sincronizado `greenhouse_finance.exchange_rates` para `USD/CLP` y `CLP/USD` en el mismo rango histórico compatible.

### Payroll UF auto-sync

- `Payroll` deja de pedir `UF` manual como flujo normal al crear o editar períodos.
- El backend ahora resuelve y persiste `uf_value` automáticamente según el `year/month` imputable usando la capa común de indicadores económicos.
- La UI de períodos de nómina pasó de input manual a estado informativo sobre sincronización automática de `UF`.

### Production release (PR #20 → main)

- Mergeado `develop → main` con ~150 commits acumulados
- Incluye: TASK-056 (capacity semantics), TASK-057 (direct overhead), assignment→membership sync, TanStack migration, login redesign, Finance Postgres migration, ICO expansion, y más
- Migration de overhead columns y backfills ya ejecutados en la BD compartida

## 2026-03-26

### Assignment → Membership sync projection

- Nueva proyección `assignment_membership_sync`: cuando se crea/actualiza un `client_team_assignment`, se asegura automáticamente que el miembro tenga su `person_membership` correspondiente en la organización del cliente, vía el bridge `spaces`
- Bridge chain: `assignment.client_id → spaces.client_id → spaces.organization_id → person_memberships`
- En `assignment.removed`: desactiva el membership solo si el miembro no tiene otros assignments activos a la misma org
- Backfill ejecutado: 4 memberships sincronizados (incluyendo Melkin → Sky Airline que faltaba)
- Fix: query de assignments y shared overhead en `member-capacity-economics` ahora hace JOIN a `clients` para resolver `client_name` (antes fallaba por columna inexistente)

### TASK-057 — cierre: taxonomía + Finance expenses + resiliencia

- Completada la taxonomía canónica de overhead directo: `DIRECT_OVERHEAD_SCOPES` (none, member_direct, shared) + `DIRECT_OVERHEAD_KINDS` (tool_license, tool_usage, equipment, reimbursement, other)
- `tool-cost-reader` ahora lee 3 fuentes con degradación independiente: AI licenses, AI credits, Finance member_direct expenses
- Guardia de deduplicación: `tool_license` y `tool_usage` solo se leen desde AI tooling; `equipment`, `reimbursement`, `other` desde Finance
- Migration script para BD existentes: `scripts/migrations/add-expense-direct-overhead-columns.sql`
- Expense CRUD soporta los 3 campos nuevos (`directOverheadScope`, `directOverheadKind`, `directOverheadMemberId`)
- Proyección resiliente: si las tablas de AI o las columnas de Finance no existen, degrada a overhead 0 sin romper el batch
- Fix: arreglado destructuring faltante en `createFinanceExpenseInPostgres` y campos faltantes en expense route

### TASK-057 — direct overhead canónico desde AI tooling

- `member_capacity_economics` ya no deja `directOverheadTarget = 0` por defecto cuando un miembro tiene licencias activas o consumo de créditos AI en el período.
- Se agregó una capa pura nueva para el cálculo de overhead directo por persona:
  - `src/lib/team-capacity/tool-cost-attribution.ts`
  - `src/lib/team-capacity/tool-cost-reader.ts`
- La fuente canónica inicial del slice quedó acotada a datos defendibles:
  - `greenhouse_ai.member_tool_licenses` + `greenhouse_ai.tool_catalog`
  - `greenhouse_ai.credit_ledger`
- Se decidió explícitamente no sumar todavía `greenhouse_finance.expenses` genéricos a `directOverheadTarget`, para evitar doble conteo y falsos positivos hasta que exista taxonomía madura de overhead directo por persona.
- `src/lib/ai-tools/postgres-store.ts` ahora publica:
  - `finance.license_cost.updated` en mutaciones de licencias
  - `finance.license_cost.updated` fanout cuando cambia el costo de un tool con licencias activas
  - `finance.tooling_cost.updated` cuando el credit ledger debita costo member-linked
- La arquitectura de Team Capacity ya documenta esta baseline y deja la regla explícita de no abrir un segundo path para overhead directo por miembro.

### TASK-056 — People/My alineados al snapshot canónico y overhead sobre cohort billable

- `GET /api/people/[memberId]/intelligence` y `GET /api/my/performance` ahora resuelven el período actual usando `America/Santiago`, evitando drift por mes UTC implícito.
- `Person Intelligence` ya no presenta compensación fuente en `CLP` cuando la fuente real es `USD`; la UI preserva la moneda original para salario base y compensación mensual.
- `person_intelligence` dejó de fabricar `costPerHour` y `costPerAsset` desde derivaciones locales cuando falta el snapshot canónico; ahora cae a `null` en vez de inventar precisión.
- `member_capacity_economics` cambió el reparto de `sharedOverheadTarget`: ahora usa solo el cohort billable externo del período y no todos los miembros activos.
- Se agregaron/ajustaron tests Vitest para:
  - `person_intelligence` projection
  - `PersonIntelligenceTab`
  - `My Assignments` route
  - snapshot de `member_capacity_economics`

### TASK-056 — overhead compartido y pricing base ya alimentan `member_capacity_economics`

- `member_capacity_economics` dejó de persistir `sharedOverheadTarget = 0` por defecto: ahora toma overhead compartido desde `greenhouse_finance.expenses` no asignados a cliente, limitado en esta iteración a `cost_category IN ('operational', 'infrastructure', 'tax_social')`.
- El prorrateo inicial del overhead compartido quedó canonizado por `contracted_hours`, evitando cargar el costo a partir de ruido operativo.
- `directOverheadTarget` se mantiene en `0` por ahora: no se infiere overhead por miembro desde `expenses.member_id` ni desde tooling no canonizado.
- `suggestedBillRateTarget` dejó de usar `markupMultiplier: 1.35` inline; ahora usa una policy base centralizada en `team-capacity/pricing` con `targetMarginPct: 0.35`, alineada a la semántica de margen ya documentada para Staff Aug.
- La proyección reactiva `member_capacity_economics` ahora refresca también ante `finance.expense.created` y `finance.expense.updated`.

### TASK-056 — People y My ya escalan desde `member_capacity_economics`

- `GET /api/people/[memberId]/intelligence` ahora hace overlay de capacidad/costo desde `member_capacity_economics` para alinear `Person Intelligence` con la misma semántica de `Agency > Team`.
- `My > Assignments` ahora consume el resumen del snapshot para:
  - horas asignadas
  - disponible comercial
  - uso operativo
- Se agregaron pruebas Vitest para el overlay de `Person Intelligence` y para el resumen canónico de `My Assignments`.

### Arquitectura — team capacity canónica

- Se agregó `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md` como fuente canónica de:
  - helpers puros de capacidad/economía
  - snapshot reactivo `member_capacity_economics`
  - reglas de consumer y de escalamiento
- Se enlazó esta arquitectura desde:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
  - `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
  - `docs/README.md`
  - `project_context.md`

### TASK-056 — `Agency > Team` ya consume el contrato nuevo de capacidad

- `Agency > Team` ahora lee `member_capacity_economics` para el período actual en vez de mezclar joins y fórmulas híbridas on-read.
- La card/columna `Usadas` fue reemplazada por `Uso operativo`:
  - muestra horas solo si la fuente existe
  - muestra porcentaje/índice cuando la señal operativa proviene de ICO
  - cae a `—` cuando no hay una fuente defendible
- Se corrigió un bug en la capa económica: cuando faltaba FX y la compensación estaba en otra moneda, el snapshot podía tratar el costo como si ya estuviera en moneda objetivo.
- Validación del slice:
  - `Vitest`: `8 files passed`, `39 tests passed`
  - `TypeScript`: sin errores
  - `Next build`: exitoso

### TASK-056 — snapshot reactivo `member_capacity_economics` implementado

- Se agregó la nueva proyección reactiva `member_capacity_economics` con tabla de serving `greenhouse_serving.member_capacity_economics`.
- El snapshot persiste por `member_id + period_year + period_month` e integra:
  - asignaciones comerciales filtrando carga interna
  - uso operativo derivado de ICO
  - compensación de payroll / versión vigente
  - conversión FX a `CLP` con contexto de período
- Se añadió el wiring mínimo al projection registry y al event catalog para:
  - `compensation_version.updated`
  - `finance.exchange_rate.upserted`
  - eventos reactivos futuros de overhead/licencias/tooling
- Se agregaron tests Vitest para:
  - parsing de período y scope
  - cálculo del snapshot
  - refresh reactivo y registro en el registry
- El slice no tocó `src/lib/team-capacity/*.ts`, routes UI ni views.

### TASK-056 — helpers puros de capacidad y economía ya están disponibles

- Se agregaron cuatro módulos puros en `src/lib/team-capacity/`:
  - `units.ts`
  - `economics.ts`
  - `overhead.ts`
  - `pricing.ts`
- Cada módulo tiene su suite Vitest asociada en `src/lib/team-capacity/*.test.ts`.
- La nueva capa cubre:
  - conversiones `FTE <-> horas` y envelopes de capacidad
  - cuantificación de compensación, costo horario y snapshot laboral
  - prorrateo de overhead directo y compartido
  - referencia sugerida de venta sobre costo cargado
- No se tocaron routes, views ni proyecciones; el cambio quedó acotado a helpers puros y tests.

### Agency Team — contrato de capacidad documentado como lane separada

- Se creó `TASK-056 - Agency Team Capacity Semantics` para formalizar la semántica pendiente de `Agency > Team` antes de seguir iterando backend/UI.
- La task separa explícitamente:
  - capacidad contractual
  - carga comercial comprometida
  - uso operativo
  - disponibilidad
- También deja propuesta una capa reusable de conversiones `FTE <-> horas` sin meter lógica de negocio en el helper.
- La misma lane ahora incluye una segunda capa reusable de economía de capacidad para convertir compensación del período en:
  - `costPerHour`
  - costo hundido interno
  - `suggestedBillRate` como referencia de venta, sin confundirlo con pricing comercial final.
- La spec quedó alineada además con la integración FX existente del repo:
  - `mindicador` como fuente primaria de `USD/CLP`
  - `greenhouse_finance.exchange_rates` como persistencia
  - estrategia sugerida para capacidad/pricing: último día hábil del período
- `TASK-056` ahora incluye también:
  - inventario de consumers del repo que usan o usarán esta semántica
  - recomendación explícita de arquitectura híbrida:
    - helpers puros para fórmulas
    - proyección reactiva `member_capacity_economics` para snapshot mensual por persona
- La misma task ahora deja también el contrato exacto propuesto de:
  - módulos `units`, `economics`, `overhead`, `pricing`
  - snapshot `member_capacity_economics`
  - payload futuro de `GET /api/team/capacity-breakdown`
- `TASK-008` recibió un delta para dejar explícito que la identidad canónica ya está cerrada, pero la semántica de capacidad sigue abierta y ahora tiene lane propia.

### Agency Team — capacidad cliente efectiva corregida

- `Agency > Team` dejó de sumar `Efeonce Internal` como carga cliente comprometida.
- La capacidad ahora se calcula por miembro con un sobre contractual máximo de `1.0 FTE`, evitando casos falsos de `2.0 FTE / 320h` para una sola persona.
- También se corrigió la sobrecuenta de `contracted_hours_month`: ya no se suma por assignment como si cada fila representara horas nuevas.
- La UI ahora deja explícito que, cuando faltan métricas operativas, la carga comprometida excluye `Efeonce interno` y no reemplaza producción efectiva.
- La ruta `GET /api/team/capacity-breakdown` y el fetch client-side quedaron con `no-store` para evitar que `staging` siga mostrando respuestas previas al deploy correcto.
- `Agency > Team` ahora degrada de forma segura ante lentitud de Postgres: la API usa timeout + fallback de query y el cliente aborta el fetch tras 8s en vez de dejar la pantalla colgada.
- La vista dejó de depender de `greenhouse_serving.person_operational_metrics` vacía y ahora usa la última señal disponible de `ico_member_metrics` para calcular `Usadas` desde throughput real.
- La selección de miembros quedó alineada al runtime real: solo se muestran miembros con assignment cliente externo y señal operacional materializada; en el estado actual eso reduce la vista operativa a Sky (`Andres`, `Daniela`, `Melkin`).

### Home / Nexa — rollout retirado del camino crítico de ingreso

- Se desactivó temporalmente `Home/Nexa` como landing por defecto para clientes.
- `/home` volvió a redirigir a `/dashboard` y el fallback de `portalHomePath` para clientes dejó de resolver `/home`.
- Motivo: mitigación rápida de un freeze reportado al ingresar a `dev-greenhouse`, mientras se aísla la causa raíz del rollout.

### Home / Nexa — MVP client-first implementado

- `/home` dejó de redirigir automáticamente a `/dashboard`; ahora renderiza `HomeView` como nueva superficie de entrada client-first.
- `portalHomePath` para clientes quedó alineado a `/home`.
- Se agregaron:
  - `GET /api/home/snapshot`
  - `POST /api/home/nexa`
  - `getHomeSnapshot()` como orquestador server-side
  - `NexaService` sobre Google GenAI
- La nueva UI de Home incluye greeting dinámico, grid de módulos por capacidades, shortlist de pendientes y panel conversacional `Nexa`.
- `TASK-009` quedó materialmente implementada como MVP y movida a `docs/tasks/complete/`.

### Greenhouse Home Nexa v2 — TASK-009 implementation

- **Orchestration**: Implemented `getHomeSnapshot.ts` to aggregate user context, capability-based modules, and pending task counts.
- **Nexa AI Assistant**: Deployed `nexa-service.ts` using Google GenAI (Gemini) with a persona-driven system prompt and operational context.
- **UI Components**: Built a suite of premium components (`GreetingCard`, `NexaPanel`, `ModuleGrid`, `TaskShortlist`) adapting Vuexy advanced widgets.
- **API Surface**: Created `/api/home/snapshot` and `/api/home/nexa` for state management and conversational streams.
- **Rollout**: Updated `portalHomePath` in `src/lib/tenant/access.ts` to default client users to the new `/home` experience.
- **Verification**: Fixed all lint errors in the new components and verified type safety.

### Finance Intelligence — marzo 2026 materializado correctamente

- `2026-03` dejó de quedar en estado parcial para `Sky Airline`: el período de payroll quedó `approved` y el snapshot de `greenhouse_finance.client_economics` se rematerializó con costos laborales canonizados.
- Resultado operativo validado:
  - `directCostsClp = 1,119,441.76`
  - `grossMarginPercent = netMarginPercent = 0.9189`
  - `headcountFte = 3`
  - `notes = march-payroll-materialization`
- La sanitización de presentación ya no oculta marzo: `sanitizeSnapshotForPresentation()` devuelve `hasCompleteCostCoverage = true` para ese snapshot.
- `dev-greenhouse.efeoncepro.com` quedó apuntando al deployment `staging` `greenhouse-fi5qtnqhf-efeonce-7670142f.vercel.app`; si todavía se ve el warning viejo en navegador, corresponde a un estado previo al recompute y no al backend actual.

### Finance Intelligence — febrero trazable sin mezclar monedas

- `computeClientEconomicsSnapshots()` dejó de romperse en meses cortos: el fin de mes ya no se hardcodea como `31`, sino que se deriva con un helper de rango mensual real cubierto por `Vitest`.
- `greenhouse_serving.client_labor_cost_allocation` dejó de asumir que `gross_total` de Payroll ya está en CLP. Ahora la view preserva `payroll_currency`, montos fuente (`gross_total_source`, `allocated_labor_source`) y solo llena `allocated_labor_clp` cuando la entry ya viene en CLP o existe `USD/CLP` histórico no posterior al cierre del período.
- Se aplicó un backfill quirúrgico para febrero 2026 sobre la asignación billable de `Sky Airline` para Daniela, Andrés y Melkin, sin tocar la asignación interna de `Efeonce`.
- `fetchUsdToClpFromProviders()` ahora retrocede automáticamente hasta encontrar el último día hábil con dato cuando se pide una fecha histórica a `mindicador`. Para febrero 2026 resolvió `2026-02-27` con `USD/CLP = 861.19`.
- Resultado operativo final: febrero 2026 ya quedó materializado en CLP para `Sky Airline` con `directCostsClp = 1,485,552.75`, `headcountFte = 2` y `grossMarginPercent = netMarginPercent = 0.8924`.
- Se agregó helper reusable de tasas en `finance/shared` y se corrigió la precisión del par inverso: `CLP_USD_2026-02-27` ahora persiste como `0.001161` en vez de `0`.
- `sanitizeSnapshotForPresentation()` salió a una utilidad reusable y `organization-store.ts` ya no pondera márgenes incompletos como si fueran `0`.
- `organization-economics.ts` dejó de doble-contar costo laboral sobre `client_economics.direct_costs_clp`; Organization ahora trata nómina como desglose y no como costo adicional.

### Account Operational Metrics — TASK-014 implementation

- **BigQuery to Postgres**: Se agregó `metrics_by_organization` al engine ICO e incluyó a `getOrganizationOperationalServing.ts` para extraer KPIs (RpA, throughput, delivery health) a nivel de cuenta (Organization).
- **Reactive Projection**: Se agregó `ico_organization_metrics` como tabla de Postgres y `icoOrganizationProjection` / `organizationOperationalProjection` al projection registry para mantener los datos de BQ cacheados mediante eventos outbox al finalizar el cron job.
- **Organization Store APIs**: `organization-store.ts` exporta ahora `getOrganizationOperationalMetrics` que será provisto al frontend en el executive dashboard.
- **Setup script**: Se agregó `scripts/setup-postgres-organization-operational-serving.sql` con el DDL necesario en Postgres.

### ICO Engine Expansion — Person Operational Intelligence

- **Metric Registry**: Extended with `MetricScope`, `composite` MetricKind. 6 new person-scoped derived metrics.
- **Metrics**: `utilization_pct`, `allocation_variance`, `cost_per_asset`, `cost_per_hour`, `quality_index`, `dedication_index`
- **Storage**: `person_operational_360` table (9 ICO + 6 derived + capacity + cost, 12-month retention)
- **Enterprise**: `metric_threshold_overrides` table for per-organization threshold configuration
- **Reactive**: `personIntelligenceProjection` replaces old person_operational projection. Unified refresh from Postgres only.
- **API**: `GET /api/people/:memberId/intelligence?trend=6`
- **Tests**: 15 unit tests for compute functions
- **TASK-055**: Frontend integration + event publishing wiring pendiente

### Finance Intelligence — proyección reactiva por período afectado

- `client_economics` dejó de recomputarse ciegamente sobre el mes actual cuando el outbox procesa eventos reactivos.
- La proyección ahora escucha eventos relevantes de `finance` y `payroll`, deriva `year/month` desde payloads reales (`invoiceDate`, `documentDate`, `paymentDate`, `periodId`, `periodYear/periodMonth`) y recomputa el período afectado.
- `greenhouse_finance.cost_allocations` empezó a publicar eventos outbox canónicos al crear/eliminar allocations, y Payroll ahora publica cambios de período (`updated`, `calculated`, `approved`) con `year/month`.
- Se agregaron tests `Vitest` para la proyección reactiva de `client_economics`, cubriendo trigger coverage, derivación de período y recompute determinístico.

### Finance Intelligence — bridge laboral histórico corregido

- `greenhouse_serving.client_labor_cost_allocation` dejó de resolver assignments con `CURRENT_DATE`; ahora cruza `payroll_entries` con assignments que se solapan con la ventana real del `payroll_period`.
- La materialización `scripts/setup-postgres-finance-intelligence-p2.sql` quedó reaplicada en Postgres con la nueva semántica temporal.
- Se agregó test `Vitest` para `computeClientLaborCosts()`.
- La verificación runtime confirmó que el view sigue vacío en este entorno porque `2026-03` está en `draft`, no porque el bridge temporal siga roto.

### Payroll backfill — credencial de servicio restaurada

- `scripts/backfill-postgres-payroll.ts` pasó a usar `GOOGLE_APPLICATION_CREDENTIALS_JSON` vía `getGoogleCredentials()`, evitando fallos `invalid_rapt` por refresh token OAuth local.
- Con la autenticación corregida, el backfill confirmó que la fuente BigQuery actual no tiene filas de `payroll_periods`, `payroll_entries` ni `compensation_versions`; el gap de febrero está en la fuente, no en el import a PostgreSQL.

### Finance Intelligence — márgenes ocultos cuando el snapshot está incompleto

- `Finance > Intelligence` dejó de mostrar márgenes `100% / Óptimo` cuando el snapshot mensual tiene ingresos pero cobertura insuficiente de costos.
- El route de `client-economics` ahora marca snapshots incompletos y oculta `grossMarginPercent` / `netMarginPercent` cuando detecta costos faltantes o placeholder de backfill.
- `ClientEconomicsView` muestra `—`, subtítulo `costos incompletos` y un warning explícito en vez de semáforos engañosos.
- La ruta de tendencia quedó alineada con la misma sanitización, evitando charts optimistas construidos sobre snapshots incompletos.
- Se agregaron tests `Vitest` para el route y la vista de rentabilidad.

### Agency Team — datos corregidos y fallback honesto

- `Agency > Team` dejó de contar assignments activos como si fueran personas: la API ahora agrega por `member_id`, eliminando duplicados en headcount y tabla.
- `Disponibles` cambió a semántica de capacidad libre contractual (`contratadas - asignadas`), evitando casos donde alguien aparecía 100% asignado y aun así “disponible”.
- Cuando faltan métricas operativas (`greenhouse_serving.person_operational_metrics`), la vista ya no muestra `0h usadas` como dato real: muestra `—` y un aviso explícito de ausencia de source.
- Se agregaron tests `Vitest` para la capa shared, el route handler y la vista de Agency Team.

### TanStack React Table Mass Migration — 22 of 48 tables

- **Agency views:** Team, Campaigns, Economics, Delivery, Operations (5 tables) — all with Vuexy tableStyles + sorting
- **Finance lists:** Income, Expenses, Suppliers, Clients, ClientEconomics, Reconciliation (2 tables), CostAllocations — search + sort + pagination
- **Organization:** OrgList (server-side pagination + sort), OrgPeopleTab (search + sort)
- **Admin:** Tenants (search + sort + pagination), Roles (sort-only matrix)
- **Client-facing:** DeliveryAnalytics (project metrics sort), ReviewQueue (2 tables: queue + history)
- **Services:** ServicesListView (sort + server-side pagination)
- **Brand icons:** Notion SVG fixed (was invisible on white bg), HubSpot SVG replaced with 24x24 sprocket
- **Operations health:** `not_configured` status for missing Postgres tables (was showing false "down")
- **Tasks created:** TASK-053 (25 remaining low-impact), TASK-054 (4 remaining high-impact)

## 2026-03-25

### React Table migration — build/test compatibility restored

- `postcss.config.mjs` quedó ajustado a sintaxis compatible con `Next.js 16 / Turbopack` y `Vitest`, evitando que la migración a `@tanstack/react-table` rompa `staging` o la suite unitaria.
- `staging` había quedado sirviendo un deployment viejo porque los deploys recientes fallaban en build; con este ajuste el repo vuelve a pasar `pnpm build`.
- Se confirmó además la deuda remanente de migración: `42` archivos `.tsx` de Greenhouse todavía usan tablas legacy y deben converger al patrón React Table de Vuexy `full-version`.

### Agency Campaigns — contract fix + explicit Postgres bootstrap

- `Agency > Campaigns` dejó de depender de un `spaceId` obligatorio para usuarios internos; `GET /api/campaigns` ahora puede listar campañas cross-space con `campaignScopes` aplicados.
- `AgencyCampaignsView` ya no oculta respuestas `400/500` como si fueran `0` campañas; muestra estado de error explícito cuando la carga falla.
- Campaign 360 ya tiene bootstrap explícito `pnpm setup:postgres:campaigns` con perfil `migrator`, y el runtime dejó de crear tablas/columnas request-time.
- Se validó el dominio en Cloud SQL dev: `greenhouse_core.campaigns`, `greenhouse_core.campaign_project_links` y `greenhouse_core.campaigns_eo_id_seq` existen, pero siguen con `0` filas; el siguiente gap real es seed/canonización de campañas, no schema.
- Se agregaron tests `Vitest` para el route handler, la vista Agency y el store de campañas para detectar regresiones de contrato, UX y bootstrap.

### Campaign 360 — initial canonical seed

- Se agregó `pnpm backfill:postgres:campaigns` con heurística conservadora sobre `greenhouse_delivery.projects`, mapeando `space_id` legado de `notion_workspaces` al `space_id` canónico de `greenhouse_core.spaces`.
- Se sumó además un seed manual curado para `Sky Airlines Kick-Off` para cubrir el caso de campaña singleton válida.
- El backfill quedó aplicado en dev: `7` campañas canónicas y `24` links proyecto-campaña.
- Se agregó cobertura `Vitest` para la heurística de seed y se corrigió `postcss.config.mjs` para destrabar tests de componentes que cargan CSS modules.

### Agency Spaces — RpA/OTD cutover a ICO

- `Agency > Spaces` dejó de leer `RpA` desde `notion_ops.tareas.rpa` y `OTD` desde `notion_ops.proyectos`.
- `getAgencySpacesHealth()` y `getAgencyPulseKpis()` ahora toman ambos KPIs desde el snapshot ICO más reciente por `space_id` en `ico_engine.metric_snapshots_monthly`, agregando luego por cliente visible en Agency.
- Se agregó test de regresión para impedir que la vista vuelva a calcular o leer `RpA` desde la capa legacy.

### Agency Operator Layer Redesign — Fase 1

- **Architecture**: Tab monolítico → 9 rutas independientes bajo `/agency/`.
- **Navigation**: Gestión expandida de 3 a 9 items (Agencia, Spaces, Economía, Equipo, Delivery, Campañas, Servicios, Operaciones, Organizaciones).
- **Economics** (`/agency/economics`): P&L KPIs (revenue, costs, margin, EBITDA) + expense trend chart + top clients by revenue table.
- **Team** (`/agency/team`): 4-type capacity model (contracted/assigned/used/available) + health distribution + overcommitted alerts + member table.
- **Campaigns** (`/agency/campaigns`): Cross-space campaign overview con KPIs + campaign table completa.
- **Backend**: `listAllCampaigns()` sin filtro spaceId, `getServicesExpiringBefore(days)` para renewal risk.
- Delivery y Operations como stubs listos para implementación.

### Client Organization Identity Bridge

- Migration backfill `identity_profile_id` + create `person_memberships` para client_users.
- `ensureClientMembership()` auto-link en login.
- APIs `/api/my/organization` + `/api/my/organization/members` para directorio de colegas.
- Vista `MyOrganizationView` con KPIs y tabla de miembros.

### Collaborator Portal — Full Implementation

- **Session Bridge**: `memberId` + `identityProfileId` propagated through JWT, Session, TenantContext.
- **requireMyTenantContext()**: Auth guard for self-service — resolves memberId from JWT, enforces efeonce_internal.
- **7 Self-Service APIs**: `/api/my/dashboard`, `/api/my/profile`, `/api/my/assignments`, `/api/my/performance`, `/api/my/payroll`, `/api/my/leave`, `/api/my/delivery`.
- **7 View Components**: MyDashboardView (hero+KPIs+notifs), MyProfileView (identity+professional+linked systems), MyAssignmentsView (table+capacity), MyPerformanceView (ICO+trend+operational), MyPayrollView (compensation+history), MyLeaveView (balances), MyDeliveryView (projects+tasks+CRM).
- **Sidebar Navigation**: `MI FICHA` section added for collaborator role with 7 nav items.
- **GH_MY_NAV** nomenclature constants added.
- **Portal Views Doc** updated — all collaborator views marked as Implemented.

## 2026-03-24

### TASK-042/043/044 — Person + Organization Serving Consolidation

- **Person Operational Serving**: `person_operational_metrics` table + Postgres-first store + reactive projection.
- **Person 360 Runtime**: Consolidated `getPersonRuntimeSnapshot()` reads from 3 serving views instead of 8+ stores.
- **Organization Executive Snapshot**: `getOrganizationExecutiveSnapshot()` consolidates economics + delivery + trend. API: `GET /api/organizations/{id}/executive`.

### TASK-046/047/048/049 — Delivery Runtime Fixes

- **TASK-046**: Fixed false RPA — 3 calculations in team-queries.ts changed from `AVG(frame_versions)` to `AVG(rpa)`.
- **TASK-047**: Project scope count now uses authorized scope length, not activity-dependent items.length.
- **TASK-048**: Sprint store + 3 API routes (list, detail with ICO, burndown). Sprints no longer depend on dashboard data.
- **TASK-049**: `GET /api/projects/[id]/full` consolidates detail + tasks + ICO in 1 call.

### TASK-050/051/052 — Finance + Payroll Postgres Alignment

- Finance client resolver Postgres-first, payroll schema corrected, finance_manager access to People.

### Client-Facing Delivery Views — Full Implementation

- **Review Queue** (`/reviews`): Tabla de items pendientes de aprobación con banners de urgencia (48h/96h), filtros por estado, historial de reviews recientes. API: `GET /api/reviews/queue`.
- **Client Campaigns** (`/campanas`): Lista de campañas del cliente con cards + detalle con KPIs (completion, RPA, OTD%), tabs Resumen/Proyectos/Equipo. Sin financials para clientes.
- **Project Detail**: Columna "Asignado" agregada a tabla de tasks (JOIN a team_members). API: `GET /api/projects/[id]/ico` para métricas ICO por proyecto.
- **Mi Equipo** (`/equipo`): Cards de miembros del equipo con FTE, rol, contacto, "trabajando en" con breakdown de proyectos.
- **Delivery Analytics** (`/analytics`): Trend charts (RPA, OTD%, throughput, cycle time) + tabla comparativa por proyecto con métricas color-coded. API: `GET /api/analytics/delivery`.

### Delivery Layer — 5 Gaps Closed

- Multi-assignee ICO view robustificado, sprint materialization, cycle_time/fase_csc/is_stuck en project detail, legacy dual-read eliminado, materialization health check.

### Module Integration — 5 Gaps Closed

- FK en expenses.allocated_client_id, economics materialization cron, identity reconciliation cron, organization context en PersonFinanceTab.

### TASK-045 Reactive Projection Refresh + Scalability Hardening

- Projection Registry declarativo (4 proyecciones), consumer reescrito con retry/dead-letter, domain partitioning (4 crons paralelos), refresh queue persistente, observabilidad per-projection.

### TASK-017 Campaign 360 — Full Implementation

- DDL + store + 9 API endpoints + budget/margin + roster derivado + UI (list + detail con 4 tabs).

### HR and Finance runtime gaps document and derived tasks added

- Se agregó `docs/roadmap/GREENHOUSE_HR_FINANCE_RUNTIME_GAPS_V1.md` como fuente canónica de brechas runtime de HR + Finance verificadas contra el codebase y el modelo actual.
- Se derivaron 3 tasks nuevas para cerrar esas brechas: `TASK-050` Finance Client Canonical Runtime Cutover, `TASK-051` Finance Payroll Bridge Postgres Alignment y `TASK-052` Person 360 Finance Access Alignment.
- El gap de imputación incorrecta de permisos que cruzan períodos quedó documentado como ya owned por `TASK-001` y `TASK-005`, evitando duplicar lanes.
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `docs/README.md` quedaron alineados con los nuevos IDs y el nuevo documento de brechas.

### Reactive Projection Refresh — Scalability Hardening

- **Domain partitioning**: 4 dedicated cron routes (`outbox-react-org`, `outbox-react-people`, `outbox-react-finance`, `outbox-react-notify`) run in parallel instead of one sequential batch. Each only processes events for its domain.
- **Targeted entity refresh**: `ico_member_metrics` now pulls specific member data from BigQuery → Postgres on event. `client_economics` recomputes current month snapshots reactively. No more "flag and wait for nightly batch".
- **Persistent refresh queue**: `projection_refresh_queue` table with dedup by (projection, entity_type, entity_id), priority ordering, atomic claim via `FOR UPDATE SKIP LOCKED`, and automatic retry with configurable max attempts.
- **Backpressure resilience**: Outbox event window widened from 1h to 6h. Queue persists intents independently of outbox — survives event expiration.
- **Observability**: `/api/internal/projections` now includes queue stats (pending, processing, completed, failed) alongside per-projection 24h metrics.

### Delivery client runtime gaps document and derived tasks added

- Se agregó `docs/roadmap/GREENHOUSE_DELIVERY_CLIENT_RUNTIME_GAPS_V1.md` como fuente canónica de brechas del runtime client-facing de Delivery verificadas contra el codebase real.
- Se derivaron 4 tasks nuevas para cerrar esas brechas: `TASK-046` Delivery Performance Metrics ICO Cutover, `TASK-047` Delivery Project Scope Visibility Correction, `TASK-048` Delivery Sprint Runtime Completion y `TASK-049` Delivery Client Runtime Consolidation.
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `docs/README.md` quedaron alineados con los nuevos IDs y el nuevo documento de brechas Delivery.

### Runtime synergy gaps document and derived tasks added

- Se agregó `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md` como fuente canónica de brechas runtime cross-module verificadas contra el codebase.
- Se derivaron 4 tasks nuevas para cerrar esas brechas reales: `TASK-042` Person Operational Serving Cutover, `TASK-043` Person 360 Runtime Consolidation, `TASK-044` Organization Executive Snapshot y `TASK-045` Reactive Projection Refresh.
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `docs/README.md` quedaron alineados con los nuevos IDs y el nuevo documento de brechas.

### TASK-017 Campaign 360 completed (full implementation)

- **Budget/Margin**: `budget_clp` and `currency` columns added to campaigns. `getCampaignFinancials()` computes revenue, labor cost, direct costs, margin, and budget utilization per campaign via client economics.
- **Derived Roster**: `getCampaignRoster()` resolves team members from BigQuery delivery_tasks assignees across linked projects. No separate roster table — team is always derived from actual work.
- **Campaign 360 API**: `GET /api/campaigns/{id}/360` returns campaign + metrics + financials + team in a single call. Plus individual endpoints for `/financials`, `/roster`.
- **UI List View**: `/campaigns` page with status/type filters, campaign cards grid, create dialog with budget field.
- **UI Detail View**: `/campaigns/[id]` with 6 KPI cards, 4 tabs (Resumen with budget bar, Proyectos, Equipo with roster table, Finanzas with margin KPIs).

### TASK-017 Campaign 360 — Fase 1 MVP (backend)

- DDL: `greenhouse_core.campaigns` + `greenhouse_core.campaign_project_links` with space boundary, EO-ID sequence, and unique constraint (1 project per campaign per space).
- Store: `campaign-store.ts` with CRUD (create, list, get, update) + project link management (add, remove, list). Auto-provisioning schema singleton.
- API: 6 endpoints unified under `/api/campaigns` — list/create, get/patch by ID, project links CRUD, metrics. Guards: internal for write, any auth for read with campaign_subset enforcement.
- Metrics: `campaign-metrics.ts` resolves ICO metrics (RPA, OTD%, FTR%, cycle time, throughput, stuck assets) by aggregating BigQuery tasks across linked projects. No engine fork needed.
- Corrections applied: project_source_id = notion_page_id (not separate system), unified API routes with differentiated guards (no separate /api/client/campaigns).

### TASK-023 Notification System implemented (core infrastructure)

- PostgreSQL DDL: `greenhouse_notifications` schema with `notifications`, `notification_preferences`, `notification_log` tables.
- Category catalog: 10 notification categories (delivery_update, sprint_milestone, feedback_requested, report_ready, leave_status, payroll_ready, assignment_change, ico_alert, capacity_warning, system_event).
- `NotificationService` with dispatch(), resolveChannels(), markAsRead(), getUnreadCount(), preferences CRUD. Email via Resend.
- API: GET/PATCH notifications, mark-all-read, unread-count, GET/PUT preferences.

### TASK-011 ICO Person 360 Integration implemented

- PostgreSQL table `greenhouse_serving.ico_member_metrics` — projection from BigQuery `ico_engine.metrics_by_member`.
- Backfill script: `scripts/backfill-ico-member-metrics.ts`.
- Store: `getPersonIcoProfile(memberId, trendMonths)` returns current metrics, 6-month trend, health score.
- API: `GET /api/people/[memberId]/ico-profile?trend=6`.
- Cron: `/api/cron/ico-member-sync` syncs last 3 months from BigQuery to Postgres.

### TASK-015 Financial Intelligence Layer v2 implemented (reduced scope)

- **Slice 1**: Expense Trends API — `GET /api/finance/analytics/trends?type=expenses|payroll|tools&months=12`. Monthly evolution by cost_category, payroll cost+headcount trend, top software/infrastructure providers.
- **Slice 2**: LTV/CAC extension — `computeClientEconomicsSnapshots()` now computes `acquisitionCostClp` (from expenses with `cost_category = 'client_acquisition'`) and `ltvToCacRatio` (lifetime gross margin / CAC). Only populated when CAC > 0.
- **Slice 3**: Cost Allocations UI — `/finance/cost-allocations` page with period selectors, summary cards, full CRUD table with create dialog. Consumes existing `/api/finance/intelligence/allocations`.

### TASK-022 Services Runtime Closure implemented

- HubSpot services inbound sync: `service-sync.ts` store, `POST /api/integrations/hubspot/services/sync`, cron `/api/cron/services-sync`.
- Legacy UNION cutover: `loadServiceModules()` reads only from `v_client_active_modules`, legacy `client_service_modules` leg removed.
- ETL script: `scripts/etl-services-to-bigquery.ts` for nightly sync to `greenhouse_conformed.services`.

### TASK-014 Projects Account 360 Bridge implemented

- `organization-projects.ts` store resolves Organization → Spaces → SpaceNotionSources → Projects chain.
- API: `GET /api/organizations/{id}/projects` returns projects grouped by space with health scores.
- Tab "Proyectos" added to organization detail view with KPIs (total projects, tasks, RPA, health) and tables grouped by space.

### TASK-004 Finance Dashboard Calculation Correction implemented

- Income/expense summary APIs migrated to Postgres-first with BigQuery fallback.
- Dual KPI cards: "Facturación del mes" shows accrual + cobrado subtitle; "Costos del mes" always includes payroll.
- Real cash flow from payment_date via cashflow endpoint replaces fake accrual-minus-accrual.
- Bar chart uses consistent accrual base for all months (no more single-month P&L patch).
- P&L shows completeness indicator, cobrado del período, cuentas por cobrar.

### TASK-003 Invoice Payment Ledger Correction implemented

- `reconcileIncomeFromBankMovement()` now creates proper `income_payments` records with deduplication by Nubox reference.
- `income.amount_paid` derived from `SUM(income_payments.amount)` — single source of truth.
- Backfill script for historical payments: `scripts/backfill-income-payments-from-nubox.ts`.

### TASK-010 Organization Economics Dashboard implemented

- **Slice 1**: `organization-economics.ts` store con 4 funciones: `getOrganizationEconomics()` (revenue + labor cost + adjusted margin), `getOrganizationEconomicsTrend()` (6 meses), `getOrganizationProfitabilityBreakdown()` (per-client), `getOrganizationIcoSummary()` (ICO on-read from BigQuery).
- **Slice 2**: ICO bridge compute-on-read via dynamic import de ICO engine. Agrega avg RPA, OTD%, FTR% al response.
- **Slice 3**: Tab "Rentabilidad" en vista de organizacion con 6 KPI cards, trend chart Recharts (6 meses), tabla de breakdown por Space con margen color-coded.
- API: `GET /api/organizations/{id}/economics?year=&month=&trend=6`

### TASK-006 Webhook Infrastructure MVP implemented

- **Slice 1**: 5 PostgreSQL tables in `greenhouse_sync`: `webhook_endpoints`, `webhook_inbox_events`, `webhook_subscriptions`, `webhook_deliveries`, `webhook_delivery_attempts` + indexes + grants.
- **Slice 2**: Shared library `src/lib/webhooks/`: HMAC-SHA256 signing/verification, canonical envelope builder (v1), retry policy (5 attempts, exponential backoff), database store, inbound handler registry, outbound filter matching + delivery execution.
- **Slice 3**: Generic inbound gateway at `POST /api/webhooks/[endpointKey]` with auth, idempotency, handler dispatch. Teams attendance migrated as first adopter.
- **Slice 4**: Outbound dispatcher at `/api/cron/webhook-dispatch` (every 2 min). Matches outbox events to active subscriptions, delivers signed HTTP requests, retries or dead-letters.
- **Slice 5**: Finance event family seeded as first outbound subscription (inactive by default).
- **Slice 6**: Internal observability at `/api/internal/webhooks/{inbox,deliveries,failures}`.
- Vercel crons added for `outbox-react` (5 min) and `webhook-dispatch` (2 min).
- `pnpm lint` y `tsc --noEmit` pasan limpio.

### Login page redesigned with Greenhouse brand identity

- Two-panel layout: left (60%) brand moment with Midnight Navy bg, Greenhouse logo, hero copy, value proposition cards with glassmorphism, gradient accent line; right (40%) auth form with Microsoft/Google SSO + credentials.
- Official multicolor Microsoft and Google brand icons from Iconify.
- Efeonce logo inline in subtitle. Responsive: left panel hidden below 1024px with mobile logo fallback.
- All copy updated to UX Writing approved Spanish text via `GH_MESSAGES`.
- Dark mode polish deferred to TASK-032.

### Sidebar and favicon rebranded to Greenhouse

- Sidebar expanded: `negative-sin-claim.svg`, collapsed: `negative-isotipo.svg`.
- Favicon: `favicon-blue-negative.svg`.
- All Greenhouse SVG assets added to `public/images/greenhouse/SVG/`.

### CODEX_TASK files migrated to TASK-### naming convention

- 38 files renamed from `CODEX_TASK_*` to `TASK-###-kebab-case.md` (TASK-001 through TASK-041).
- `README.md` and `TASK_ID_REGISTRY.md` updated. Next available: TASK-042.

### TASK-012 Outbox Event Expansion implemented

- **Slice 1**: `publishOutboxEvent()` helper in `src/lib/sync/publish-event.ts` — reutilizable, soporta modo transaccional y standalone. Event catalog en `src/lib/sync/event-catalog.ts` con tipos y constantes.
- **Slice 2**: Publicacion de eventos agregada en 4 stores: Account 360 (organization.updated, membership CRUD), HR Core/Team Admin (member CRUD, assignment CRUD), Identity (reconciliation approved/rejected, profile linked), Services (service CRUD).
- **Slice 3**: Consumer reactivo en `src/lib/sync/reactive-consumer.ts` — procesa eventos de assignment y membership para invalidar cache de organization_360. Cron en `/api/cron/outbox-react`. Tabla de tracking `outbox_reactive_log` auto-provisionada.
- **Slice 4**: Catalogo documentado en `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` con 30+ event types.
- `pnpm lint` y `tsc --noEmit` pasan limpio.

### Task system normalized around stable TASK-### IDs

- Las tasks nuevas pasan a nacer con IDs estables `TASK-###` en vez de abrirse como convención nueva bajo `CODEX_TASK_*`.
- Se agregó `docs/tasks/TASK_TEMPLATE.md` como plantilla canónica para que humanos y agentes creen e interpreten tasks con la misma estructura mínima.
- `docs/tasks/README.md`, `docs/README.md` y `AGENTS.md` quedaron alineados para convivir con tasks legacy mientras ocurre la migración gradual.

### GitHub Project operating model and task issue template added

- Se agregó `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md` para fijar pipeline, campos, vistas, automatizaciones y convención `[TASK-###] ...` en GitHub Project.
- Se agregó `.github/ISSUE_TEMPLATE/task_execution.yml` para abrir issues de ejecución alineados a `TASK-###`.
- `PULL_REQUEST_TEMPLATE.md` ahora pide `Task ID`, `GitHub Issue` y `Task Doc` para reforzar trazabilidad entre markdown, issue y PR.

### Bootstrap registry for TASK-001 to TASK-010 added

- Se agregó `docs/tasks/TASK_ID_REGISTRY.md` para reservar el primer bloque estable `TASK-001..010` sobre la lane activa y el backlog abierto más prioritario.
- `docs/tasks/README.md` ahora refleja esos IDs bootstrap y deja `TASK-093` como siguiente ID disponible.

### GitHub Project and bootstrap issues created

- Se creó el Project `Greenhouse Delivery` en GitHub para `efeoncepro`: `https://github.com/orgs/efeoncepro/projects/2`.
- Se agregaron los campos custom del modelo operativo (`Pipeline`, `Task ID`, `Rank`, `Priority`, `Domain`, `Blocked`, `Task Doc`, `Legacy ID`, `Impact`, `Effort`, etc.).
- Se crearon y agregaron al Project las issues bootstrap `#9` a `#18`, una por cada `TASK-001..010` del registro inicial.
- La fase operativa fina quedó modelada en el campo custom `Pipeline`; el `Status` built-in de GitHub se mantiene como estado coarse.

### Lint baseline recovered and TASK-007 closed

- `pnpm lint` vuelve a pasar limpio despues de ejecutar `CODEX_TASK_Lint_Debt_Burn_Down_v1` con autofix masivo controlado y cleanup manual del remanente.
- El burn-down toco `scripts/*`, `src/app/api/*`, `src/lib/*`, `src/views/*`, `src/components/*`, `src/types/*` y `src/test/*` sin introducir desactivaciones globales de reglas.
- La lane quedo validada con `pnpm lint`, `pnpm test` (`179/179`) y `pnpm build`.

### Release promoted from develop to production

- `develop` y `main` quedaron alineados en `ac63e62` despues de promover el release validado en staging.
- Staging quedo validado sobre `dev-greenhouse.efeoncepro.com` con smoke exitoso de `/api/auth/session` y `/login`.
- Production quedo validada sobre `greenhouse.efeoncepro.com` y sobre el deployment `https://greenhouse-e0rixnral-efeonce-7670142f.vercel.app`, ambos con smoke exitoso de auth.

## 2026-03-22

### Lint debt burn-down lane documented

- Se agrego `docs/tasks/to-do/CODEX_TASK_Lint_Debt_Burn_Down_v1.md` para cerrar la deuda actual de `eslint` en una lane dedicada y no seguir mezclando higiene mecanica con cambios funcionales.
- La task fija el baseline actual (`399` errores, `11` warnings), el orden recomendado de burn-down por carpetas y la estrategia de ejecucion en slices con autofix controlado y cleanup manual.

### Custom typography variants for scalable font system

- 3 custom MUI typography variants added to `mergedTheme.ts`: `monoId` (monospace IDs), `monoAmount` (monospace currency), `kpiValue` (hero KPI numbers)
- Full TypeScript support via module augmentation in `types.ts` — `<Typography variant="monoId">` works with type checking
- Enables gradual migration of 56+ hardcoded `fontWeight`/`fontFamily` overrides across 37 files
- `CODEX_TASK_Typography_Hierarchy_Fix` cerrada: core hierarchy (DM Sans default, Poppins headings) already implemented

### Webhook architecture and MVP implementation lane canonized

- Se agrego `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` como contrato canonico para inbound/outbound webhooks sobre `greenhouse_sync` y `outbox_events`.
- Se agrego `docs/tasks/to-do/CODEX_TASK_Webhook_Infrastructure_MVP_v1.md` como lane de implementacion para gateway inbound, dispatcher outbound, firmas, retries y dead letters.

### Repo ecosystem map canonized for multi-repo work

- Se agregó `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` como fuente canónica para saber qué repos hermanos consultar antes de tocar pipelines, notificaciones o tooling externo a `greenhouse-eo`.
- Quedaron documentados como repos hermanos operativos: `notion-bigquery`, `hubspot-bigquery`, `notion-teams`, `notion-frame-io` y `kortex`.

### People 360 identity tab and cross-module CTAs (CODEX_TASK cerrada)

- Nuevo tab "Identidad" en People detail con 4 cards read-only:
  - **Identidad**: EO-ID, email canónico, sistema primario, modo de autenticación, facetas member/user/CRM, sistemas vinculados
  - **Acceso al portal**: estado activo/inactivo, roles, grupos de rutas, último acceso, CTA a admin de usuario (solo admin/ops)
  - **Perfil laboral**: departamento, nivel de cargo, tipo empleo/contrato, fecha ingreso, supervisor, régimen de pago (consume HR Core vía `hrContext`)
  - **Actividad operativa**: 4 KPIs (proyectos activos, tareas activas, completadas 30d, vencidas), RpA, OTD, empresas y deals CRM (consume delivery context)
- Tab visible para `efeonce_admin`, `efeonce_operations`, `hr_payroll`
- Empty state cuando el colaborador no tiene ningún contexto Person 360
- CTAs cross-module: "Ver en módulo de nómina" en PersonPayrollTab y "Ver en módulo de finanzas" en PersonFinanceTab
- Meta endpoint declara `identity` en `supportedTabs`; 0 endpoints nuevos — todo consume datos ya cargados en `getPersonDetail()`

### Admin Team now Postgres-first with BigQuery fallback

- `mutate-team.ts` migrado: todas las reads (members, assignments, clients) y mutations (create/update/deactivate member, create/update/delete assignment) ahora escriben y leen desde PostgreSQL como fuente primaria
- Dual-write invertido: `syncAssignmentToPostgres` eliminado, reemplazado por `syncToBigQuery` fire-and-forget
- `syncIdentitySourceLinksForMember` ahora hace UPSERT en Postgres como primario
- `team-queries.ts`: roster y identity source links ahora Postgres-first; queries `notion_ops` se mantienen en BigQuery
- Column mapping: `primary_email AS email` en todo SELECT Postgres

### Payroll now exposes period readiness and entry-level calculation detail

- `Payroll` ahora puede exponer un `readiness` explícito por período antes de calcular, indicando quién entra al cálculo, quién queda fuera por falta de compensación y qué bloquea realmente el período, como `UF` faltante para casos Chile/Isapre.
- La tab `Período actual` ya muestra esos bloqueos/warnings y deshabilita `Calcular` solo cuando hay bloqueantes reales del runtime.
- Cada `payroll_entry` ahora tiene un detalle de cálculo auditable vía endpoint dedicado y diálogo UI: período, compensación aplicada, KPI usados, asistencia, base/teletrabajo efectivos, bonos, bruto, descuentos, neto y banderas manuales.
- El detalle también comunica una limitación todavía abierta del modelo actual: el snapshot conserva `kpi_data_source = ico`, pero aún no persiste si ese KPI vino de lectura `materialized` o `live`.
- La asistencia quedó modelada explícitamente como `non-blocking` en el readiness actual y ahora expone `attendanceDiagnostics`, declarando la fuente runtime vigente (`legacy_attendance_daily_plus_hr_leave`) y el target de integración futura (`microsoft_teams`).

### People consumers now Postgres-first with BigQuery fallback

- `People list` y `Person detail` ya no leen primero de BigQuery. La fuente primaria es PostgreSQL (`greenhouse_core.members`, `client_team_assignments`, `compensation_versions`, `identity_profile_source_links`).
- BigQuery queda como fallback automático para errores transitorios de infraestructura (connection refused, timeout, Cloud SQL, relation not found) via `shouldFallbackToLegacy()`.
- Person detail tiene fallback independiente por sub-query: member, assignments e identity links pueden caer a BigQuery de forma aislada sin afectar a los otros.
- Se eliminó column introspection dinámica (`getPeopleTableColumns`) del path Postgres — schema fijo y conocido.
- `org_role_name` y `profession_name` son null en path Postgres (catálogos solo en BigQuery); `role_title` y `role_category` disponibles directamente en `members`.
- Script `backfill-orphan-member-profiles.ts` creado para reconciliar members sin `identity_profile_id` (pendiente ejecución en staging/production).
- 22 tests unitarios agregados cubriendo Postgres path, BigQuery fallback y error propagation.

## 2026-03-21

### People HR profile now reads from 360 context first and ICO for operational KPIs

- `People > Perfil HR` ya no depende de que `member_profiles` esté completo para renderizar información útil del colaborador.
- La tab ahora usa `detail.hrContext` como fuente primaria para información laboral, compensación resumida y ausencias, y consulta ICO vía `/api/people/[memberId]/ico` para KPI operativos (`volumen`, `throughput`, `OTD`, `RpA`).
- `HR Core` queda como enriquecimiento opcional para datos personales, skills, links y notas; si esos datos faltan, la vista lo comunica sin dejar toda la tab vacía.
- Se agregaron tests unitarios para blindar la precedence de fuentes, el passthrough desde `PersonTabs` y el render del tab cuando `hrContext` existe pero `member_profiles` viene vacío.

### Payroll architecture now has a dedicated canonical module doc

- Se consolidó el contrato completo de `Payroll` en `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`.
- La documentación ahora fija en un solo lugar la semántica de compensación versionada, período imputable, lifecycle, fuente KPI desde ICO, exports y consumers aguas abajo.

### Payroll period correction now commits the renamed period atomically

- `Editar período` ya no falla con `Unable to read updated payroll period.` cuando se corrige el mes/año imputable de una nómina no exportada.
- Causa raíz corregida: `pgUpdatePayrollPeriod()` releía el período corregido fuera de la transacción que acababa de cambiar `period_id`; ahora la relectura final ocurre dentro de la misma transacción y el `PATCH` devuelve el período actualizado de forma consistente.
- Se agregó un test unitario de regresión para blindar el caso real `2026-03 -> 2026-02`.

### Payroll KPI source now comes from ICO member metrics

- `Payroll` ya no calcula `On-Time` y `RpA` mensual leyendo directo desde `notion_ops.tareas`. El cálculo del período ahora consulta `ICO` por `member_id`.
- La estrategia es `materialized-first`: primero intenta leer `ico_engine.metrics_by_member` para el mes y, si faltan colaboradores, cae a cálculo live por miembro como fallback.
- Las `payroll_entries` nuevas ya guardan `kpi_data_source = 'ico'`; el runtime sigue tolerando valores legacy `notion_ops` para períodos históricos ya calculados.
- Se agregaron tests unitarios para blindar el fetch híbrido `materialized + live fallback` y evitar que Payroll vuelva a depender de Notion como source of truth de KPI mensual.

### Payroll compensation editing now respects the versioned model

- `Payroll` y la ficha de `People` ya no fuerzan crear una nueva compensación cuando solo se quiere corregir la versión vigente con la misma fecha efectiva.
- Si se mantiene la fecha `Vigente desde`, el sistema actualiza la versión actual; si se cambia la fecha, crea una nueva versión y conserva el histórico.
- La UI del drawer ahora hace explícito ese comportamiento con copy y CTA distintos (`Guardar cambios` vs `Crear nueva versión`).
- La regla backend se afinó: si la versión solo fue usada en períodos `draft`, `calculated` o `approved`, todavía puede corregirse in-place; el bloqueo con nueva vigencia aplica recién cuando esa versión ya participó en períodos `exported`.
- Se agregaron tests unitarios/componentes para blindar el modo de guardado de compensación y evitar que esta UX vuelva a parecer mensual.

### Payroll period lifecycle now treats export as the final lock

- `Payroll` ya no trata `approved` como estado final. Ahora una nómina aprobada todavía puede recalcularse y sus entries siguen editables hasta que se exporta/cierra.
- `exported` pasa a ser el candado real del período: los períodos exportados ya no pueden recalcularse ni aceptar cambios manuales en entries o compensaciones reutilizadas.
- Si un período `approved` se recalcula o se edita una entry, el sistema lo devuelve automáticamente a `calculated` para exigir una nueva aprobación antes de exportar.
- La UI del período ahora explica esta regla al aprobar, muestra `Recalcular` también para `approved`, y mantiene `CSV/PDF/Excel` como acciones de salida cuando el período está listo o ya exportado.

### Payroll periods can now correct the imputed month before export

- `Editar período` ya no sirve solo para `UF` y notas: ahora permite corregir `año` y `mes` imputable en cualquier período no exportado.
- Si el cambio altera la base de cálculo (`year`, `month`, `ufValue` o `taxTableVersion`), el sistema elimina las `payroll_entries` existentes y devuelve el período a `draft` para forzar un recálculo limpio con el mes correcto.
- Esto evita arrastrar KPI, asistencia y compensaciones aplicables desde un mes mal creado, por ejemplo cuando una nómina de febrero se creó por error como `2026-03`.

### People detail overflow — local regression fix in tab strip

- `/people/[memberId]` vuelve a envolver el `CustomTabList` pill y el panel en filas `Grid`, restaurando el buffer estructural que absorbía los márgenes negativos del tabstrip.
- Se agregó un test unitario de regresión para `PersonTabs`, de modo que futuras refactorizaciones no vuelvan a “aplanar” esa estructura sin detectar el riesgo de overflow.
- Causa raíz confirmada: el `aria-live` oculto de `PersonTabs` usaba `sx={{ width: 1, height: 1 }}`; en MUI eso renderiza `100%`, no `1px`. Se corrigió a un visually-hidden real (`1px`, `clip`, `clipPath`) y desapareció el overflow horizontal del documento.
- Se saneó el duplicado equivalente en `OrganizationTabs` y la regla quedó documentada en `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md` y `project_context.md` para evitar futuras regresiones del mismo tipo.
- El patrón seguro quedó extraído a `src/components/greenhouse/accessibility.ts` como fuente compartida para live regions visualmente ocultas, y ahora lo usan `People`, `Organizations` y `AgencyWorkspace`.

## 2026-03-20

### Cron hardening before production — BigQuery schema self-heal + load-job writes

- `ICO Engine` ya no depende de que `metrics_by_project` y `metrics_by_member` tengan exactamente el schema esperado desde un setup previo. El runtime ahora aplica `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para columnas críticas como `pipeline_velocity`, `stuck_asset_pct` y `active_tasks` antes de materializar.
- `sync-conformed` deja de reemplazar `greenhouse_conformed.delivery_*` con `DELETE + insertAll(streaming)` y pasa a `BigQuery load jobs` con `WRITE_TRUNCATE`, evitando el error `streaming buffer` al intentar borrar tablas que fueron escritas por streaming.
- Se agregó también autocorrección de `delivery_tasks.created_at` en el runtime del sync para no depender solo del script de setup.

### HR Payroll — contraste arquitectónico, backfill ejecutado y tasks cerradas

- Se contrastaron `CODEX_TASK_HR_Payroll_Module_v3` y `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1` contra la arquitectura real (`GREENHOUSE_360_OBJECT_MODEL_V1`, `GREENHOUSE_POSTGRES_CANONICAL_360_V1`).
- Resultado: ambas tasks están **100% implementadas** a nivel de código — schema, store, 11 rutas Postgres-first, frontend completo con 13 vistas/componentes.
- Backfill `BQ → PostgreSQL` ejecutado: payroll (0 rows transaccionales, 1 bonus_config) + leave (4 tipos de permiso).
- BigQuery no tenía datos transaccionales de payroll — el módulo nunca fue usado en producción con datos reales.
- `isPayrollPostgresEnabled()` delega a `isGreenhousePostgresConfigured()` — no requiere env var separada.
- Tab `payroll` confirmado en `PersonTabs.tsx:147` con `PersonPayrollTab` component.
- Ambas tasks movidas a `docs/tasks/complete/`.
- `docs/tasks/README.md` actualizado: backlog renumerado (20 items, antes 22).

### Sidebar navigation — reestructuración de idioma, jerarquía y consistencia

- Labels en inglés eliminados del sidebar: `Updates` → `Novedades`, `Control Tower` → `Torre de control`, `Admin` → `Administración`, `AI Tooling` → `Herramientas IA`.
- Sección `HR` eliminada como SubMenu independiente; sus 4 items se fusionaron en la sección `Equipo` junto con `Personas`, con lógica condicional por permisos.
- Sección `Operacion` eliminada (tenía 1 solo hijo); `Torre de control` queda como flat item.
- Sección `Agencia` renombrada a `Gestión` para resolver colisión con el item `Agencia` dentro de ella.
- Sección `Servicios` renombrada a `Módulos` para capability modules de cliente.
- Todos los hijos de SubMenu (Finanzas, Administración) ahora usan `NavLabel` con subtítulo, igualando la consistencia visual del resto del menú.
- Items HR promovidos a sección ahora tienen iconos propios (`tabler-receipt`, `tabler-sitemap`, `tabler-calendar-event`, `tabler-clock-check`).
- `DefaultSuggestions.tsx` (barra de búsqueda): corregidas rutas obsoletas (`/dashboards` → `/dashboard`, `/finance/clients` → `/finance/suppliers`), sección `People` → `Equipo`, `Control Tower` → `Torre de control`.
- Archivos tocados: `greenhouse-nomenclature.ts`, `VerticalMenu.tsx`, `DefaultSuggestions.tsx`.
- Commit: `62f6abd`.

### Organization finance snapshots auto-compute on cache miss

- `Agency > Organizations > Finanzas` ya no queda vacío solo porque falte el snapshot mensual en `greenhouse_finance.client_economics`. Si la organización no encuentra datos para el período, el backend intenta calcular ese mes y vuelve a consultar.
- El cálculo mensual de `client_economics` quedó centralizado en un helper reutilizable para evitar duplicar lógica entre `Finance Intelligence` y `Organization Finance`.

### Finance supplier payment history restored in Postgres path

- `Finance > Proveedores > Historial de pagos` ya no queda vacío en runtime Postgres por devolver `paymentHistory: []` hardcodeado. El endpoint del proveedor ahora consulta los egresos asociados y expone hasta 20 registros recientes.
- La tabla de historial del proveedor ahora tolera fechas, documentos y métodos nulos sin renderizar valores inválidos; cuando falta `payment_date`, usa fallback de `document_date` o `due_date`.

### Finance DTE staging rollout + visual clarification

- `staging` / `dev-greenhouse.efeoncepro.com` ahora sí tiene `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN` y `NUBOX_X_API_KEY`; antes de eso el detalle de ingresos podía descargar mal por falta de env vars en ese ambiente.
- Se redeployó `staging` y el dominio quedó re-apuntado al deployment sano con runtime Nubox habilitado.
- `Finance > Ingresos > detalle` ya no induce a leer “factura 33”: la vista separa `Tipo de documento`, `Código SII 33` y `Folio DTE 114`.
- Se verificó contra la fuente real de Nubox que el documento `26639047` corresponde a `TipoDTE 33` y `Folio 114`; no había cruce de data.

### Finance income detail — fechas DTE visibles y descargas Nubox corregidas

- `Finance > Ingresos > detalle` ya no pierde fechas de emisión/vencimiento cuando Postgres devuelve `Date` objects; el normalizador compartido ahora soporta `Date` además de `string`.
- La descarga XML del DTE ahora decodifica correctamente la respuesta real de Nubox, que llega como JSON con el XML en base64.
- La descarga PDF/XML desde el detalle de ingreso ahora usa el filename del header y retrasa el `revokeObjectURL`, evitando cancelaciones tempranas del navegador.

## 2026-03-19

### Nubox DTE Integration — data seeding and task brief

- API de Nubox verificada: base URL `api.pyme.nubox.com/nbxpymapi-environment-pyme/v1`, auth con Bearer + x-api-key.
- Endpoints descubiertos: `/v1/sales` (ventas), `/v1/purchases` (compras proveedores), `/v1/expenses` (egresos bancarios), `/v1/incomes` (cobros).
- Credenciales almacenadas en `.env.local`: `NUBOX_API_BASE_URL`, `NUBOX_BEARER_TOKEN`, `NUBOX_X_API_KEY`.
- **Organizaciones**: 4 actualizadas con RUT + legal_name + industry desde Nubox (Corp Aldea, DDSoft, Gob RM, Sky Airline). 2 creadas (SGI, Sika).
- **Proveedores**: 17 creados + 1 actualizado en `greenhouse_finance.suppliers` con RUT, categoría y moneda. 19 proveedores totales.
- **Ingresos**: 78 registros importados en `greenhouse_finance.income` desde 15 meses de ventas Nubox. $163.8M CLP total. 0 huérfanos.
- Task brief creado: `docs/tasks/to-do/CODEX_TASK_Nubox_DTE_Integration.md` — 8 fases: infra, schema, emisión, sync ventas, sync compras, sync pagos, cron, UI.
- Script discovery: `scripts/nubox-extractor.py` (credenciales via env vars, no hardcodeadas).

### Advanced tasks split into complete foundations + focused follow-ups

- `CODEX_TASK_Source_Sync_Runtime_Projections_v1.md` se movió a `docs/tasks/complete/` al verificarse que ya cumplió su alcance fundacional: control plane, raw, conformed y proyecciones runtime con datos reales.
- `CODEX_TASK_Person_360_Profile_Unification_v1.md` se movió a `docs/tasks/complete/`; el trabajo pendiente quedó reducido a `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`.
- `CODEX_TASK_People_Unified_View_v3.md` se movió a `docs/tasks/complete/`; el trabajo pendiente quedó reducido a `CODEX_TASK_People_360_Enrichments_v1.md`.
- `docs/tasks/README.md` quedó ajustado para que `to-do` refleje solo el remanente real y no tasks fundacionales ya absorbidas por el runtime.

### To-do task index synced to real implementation status

- `docs/tasks/README.md` ahora no solo ordena el backlog por prioridad, impacto y esfuerzo; también agrega `Estado real` para distinguir lanes `Avanzadas`, `Parciales`, `Diseño` y briefs de `Referencia`.
- Se reordenó el `P0` para reflejar mejor el repo vivo: `Source Sync`, `Tenant Notion Mapping`, `Person 360`, `Identity & Access`, `Finance PG migration` y `HR Payroll PG migration`.
- Se incorporó `CODEX_TASK_Financial_Intelligence_Layer.md` al índice, ya que estaba en `docs/tasks/to-do/` pero fuera del panel operativo.

### To-do backlog prioritized in task index

- `docs/tasks/README.md` ahora ordena el backlog `to-do` por `Prioridad`, `Impacto` y `Esfuerzo`, separando foundations `P0`, cierres de modulo `P1`, expansión estratégica `P2` y polish `P3`.
- También distingue explícitamente los briefs históricos u originales que deben leerse solo como contexto de producto y no ejecutarse antes de sus versiones `v2`.
- `Supporting Specs` queda marcado como input arquitectónico, no como backlog de ejecución autónoma.

### Transactional Email System — complete

- Sistema completo en producción: forgot-password, reset-password, invite, verify-email.
- Stack: Resend + React Email + PostgreSQL auth_tokens + BigQuery email_logs.
- DNS configurado: SPF combinado (Outlook + HubSpot + Amazon SES), DKIM, DMARC.
- Microsoft 365 whitelisting: `amazonses.com` en anti-spam policies para recibir emails de Resend.
- Rutas movidas de `/api/auth/*` a `/api/account/*` para evitar colisión con NextAuth catch-all.
- Domain alias expansion: `efeoncepro.com` ↔ `efeonce.org` en lookup de usuario.
- Email se envía a la dirección que el usuario escribió (no la almacenada), resolviendo el caso de dominios sin MX.
- Templates rediseñados: header gradient (Midnight Navy → Core Blue), logo PNG, `lang="es"`, copy en español con first-name greeting, fallback URL en texto plano, accesibilidad (color-scheme, alt descriptivo, contraste 7.5:1).
- Limpieza: endpoint temporal `fix-email` y script `fix-user-email.ts` eliminados.
- Task movida a `docs/tasks/complete/`.

### In-progress tasks audit completed

- Se auditó todo el panel `docs/tasks/in-progress/` contra el estado real del repo y el alcance declarado de cada brief.
- `CODEX_TASK_AI_Tooling_Credit_System_v2.md` y `CODEX_TASK_HR_Core_Module_v2.md` se movieron a `docs/tasks/complete/` por considerarse cerradas para el alcance que declaran.
- Las demás lanes parcialmente implementadas o con gaps explícitos se reubicaron en `docs/tasks/to-do/` para dejar de tratarlas como trabajo activo.
- `docs/tasks/README.md` quedó alineado con esta nueva clasificación y la carpeta `in-progress/` quedó vacía tras la auditoría.

### Greenhouse Email Catalog task added

- Se agregó `docs/tasks/to-do/CODEX_TASK_Greenhouse_Email_Catalog_v1.md` para separar el catalogo de emails de producto de la task puramente tecnica de `Transactional Email`.
- La nueva task ordena los emails en cuatro familias: `Access & Identity`, `Security`, `Executive Digests & Decision Support` y `Domain Notifications`.
- También deja priorizados los siguientes slices `P0`: `welcome_account_activated`, `invite_reminder`, `password_changed`, `review_ready`, `daily_executive_digest` y `delivery_risk_alert`.

### Frame.io Analytics Pipeline v2 added as implementation baseline

- Se agregó `docs/tasks/to-do/CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline_v2.md` para conservar el objetivo real de enriquecer `Creative Hub` e `ICO` con data de Frame.io, pero reescribir la base técnica sobre el contrato vivo de `delivery_tasks` + `ico_engine.v_tasks_enriched`.
- `CODEX_TASK_FrameIO_BigQuery_Analytics_Pipeline.md` ahora tiene guardrails de lectura para evitar implementar literalmente una nueva vista `greenhouse_conformed.tasks_enriched`, el control plane primario en BigQuery, o el modelado `UUID` / `spaces(id)` en el binding por `space`.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para esta lane de Frame.io.

### Business Units v2 added as implementation baseline

- Se agregó `docs/tasks/to-do/CODEX_TASK_Business_Units_Canonical_v2.md` para conservar la necesidad de normalizar `Business Units`, pero reescribirla sin competir con el catálogo canónico ya existente de `service_modules`.
- `CODEX_TASK_Business_Units_Canonical.md` ahora tiene guardrails de lectura para evitar implementar literalmente una segunda identidad canónica de catálogo, `lead_person_id UUID` sobre `persons(id)` legacy o una semántica única que mezcle BU comercial y operativa.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para Business Units.
- La `v2` ahora deja explícito el objetivo analítico: `commercial_business_unit` para Finance/Services y `operating_business_unit` para ICO/delivery, evitando mezclar ambas bajo una sola granularidad ambigua.

### Home Nexa v2 added as implementation baseline

- Se agregó `docs/tasks/to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md` para conservar la visión de producto de `Home + Nexa`, pero reescribir su base técnica sobre `portalHomePath`, los route groups reales del repo y la superficie actual de `dashboard` / `internal/dashboard`.
- `CODEX_TASK_Greenhouse_Home_Nexa.md` ahora tiene guardrails de lectura para evitar implementar literalmente `/home` como redirect universal, el modelo de acceso `client|operator|admin`, o una estructura App Router que no coincide con el workspace actual.
- La decisión operativa queda explícita: `client -> /home` como entrada principal deseada; perfiles internos y funcionales mantienen por ahora sus homes especializados.

### Staff Augmentation v2 added as implementation baseline

- Se agregó `docs/tasks/to-do/CODEX_TASK_Staff_Augmentation_Module_v2.md` para conservar la intención del módulo de placements, pero reescribir su base técnica sobre `Postgres-first`, `client_team_assignments` como anchor y la convención viva de IDs/FKs del core.
- `CODEX_TASK_Staff_Augmentation_Module.md` ahora tiene guardrails de lectura para evitar implementar literalmente `UUID` como convención principal, `service_id UUID`, o `ICO by placement` como dimensión cerrada sin un bridge real de atribución.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para Staff Augmentation.

### SCIM v2 added as implementation baseline

- Se agregó `docs/tasks/to-do/CODEX_TASK_SCIM_User_Provisioning_v2.md` para conservar la intención del provisioning SCIM con Entra pero reescribir la base técnica sobre `Identity & Access V2`, `Postgres-first` y el grafo de identidad actual.
- `CODEX_TASK_SCIM_User_Provisioning.md` ahora tiene guardrails de lectura para evitar reintroducir BigQuery como write path principal o el modelo viejo de auth.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación de SCIM.

### Data Node v2 added as implementation baseline

- Se agregó `docs/tasks/to-do/Greenhouse_Data_Node_Architecture_v2.md` para conservar la visión de producto de `Data Node` pero reescribir su base técnica sobre `Postgres-first`, auth por helpers explícitos y el runtime actual del portal.
- `Greenhouse_Data_Node_Architecture_v1.md` ahora tiene guardrails de lectura para evitar ejecutar literalmente su control plane en BigQuery, su dependencia en `middleware.ts` o la apertura prematura de servicios/repos adicionales.
- `docs/tasks/README.md` ya lista la `v2` como baseline canónica de implementación para Data Node.

### Resend helper added for transactional email runtime

- Se agregó `src/lib/resend.ts` como wrapper `server-only` para `Resend`, con inicialización lazy, `EMAIL_FROM` canónico y helpers `isResendConfigured()`, `getResendApiKey()` y `getResendClient()`.
- `package.json` y `pnpm-lock.yaml` ahora incluyen la dependencia oficial `resend`.
- La validación local del helper quedó bloqueada por la `RESEND_API_KEY` actual en `.env.local`: el valor presente no coincide con el formato esperado por Resend y la API respondió `400 API key is invalid`.

### Transactional email env placeholders added to local and example configs

- `.env.example` y `.env.local.example` ahora incluyen `RESEND_API_KEY` y `EMAIL_FROM` para el futuro sistema de emails transaccionales.
- `.env.local` local tambien quedo preparado con esos placeholders, sin escribir la clave real.
- `project_context.md` se actualizo para documentar ambas variables como parte del set esperado cuando se habilite el flujo de emails transaccionales.

### Transactional Email task normalized against live auth architecture

- `docs/tasks/to-do/CODEX_TASK_Transactional_Email_System.md` ya no trata `middleware.ts` como boundary de auth y ahora reconoce el patrón vigente de guardas por layout y validación explícita en API routes.
- La spec también se alineó al patrón real de PostgreSQL del repo: setup dedicado por dominio (`setup-postgres-transactional-email.*`) y reutilización de la capa compartida `src/lib/postgres/client.ts` / helpers de auth en vez de un `setup-postgres.sql` monolítico o un `db.ts` genérico implícito.
- Se mantuvo el alcance funcional del task: Resend + PostgreSQL para tokens/mutaciones + BigQuery solo para logging y auditoría.

### Unit testing baseline formalized with Vitest + Testing Library

- El repo ya no depende solo de `Vitest` para funciones puras: ahora tambien tiene soporte formal para tests de componentes React con `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` y `jsdom`.
- `vitest.config.ts` ahora reconoce `*.test.tsx` y `*.spec.tsx`, y usa `node` como entorno por defecto para mantener el foco de unit tests sobre logica pura y permitir `jsdom` solo donde haga falta.
- Se agrego `src/test/render.tsx` como helper canonico de render con `ThemeProvider` de MUI para evitar que cada test de UI reconstruya su propio wrapper.
- `src/components/greenhouse/EmptyState.test.tsx` deja un ejemplo real de test de componente sobre la capa UI compartida.
- `AGENTS.md` ahora documenta `pnpm test` como ruta valida de verificacion y fija `Vitest + Testing Library` como baseline operativo de unit testing del repo.
- Validacion ejecutada: `pnpm test` con `3` archivos y `33` tests pasando.

### Person Activity tab — ICO Engine merge + KPI layout + sidebar FTE alignment

- **Activity tab reescrito**: `PersonActivityTab` ahora hace fetch a `/api/ico-engine/context?dimension=member` en vez de depender de `PersonOperationalMetrics`. Props cambiaron a `{ memberId: string }`. Muestra 6 KPIs (RpA, OTD%, FTR%, Throughput, Ciclo, Stuck), donut CSC, radar de salud, gauge de velocidad. Selectores de mes/año.
- **Tab ICO eliminado**: `PersonIcoTab.tsx` borrado, referencia removida de `PersonTabs`, `helpers.ts`, y `PersonTab` type.
- **KPI cards overflow fix**: Grid anidado reemplazado por flex con `overflowX: auto` y `minWidth: 160px` por card. Los iconos ya no se recortan en el borde del contenedor.
- **Sidebar FTE alineado con Organizaciones**: `get-person-detail.ts` ahora deriva `totalFte`, `totalHoursMonth` y `activeAssignments` solo de assignments que tienen membresía en Postgres (`person_memberships`), no de todos los `client_team_assignments` en BigQuery. Ejemplo: Andrés tenía 2.0 FTE (Efeonce + Sky en BQ) pero solo 1 membresía (Sky) — ahora muestra 1.0 FTE.
- **v_tasks_enriched fix**: COALESCE con empty arrays corregido a `IF(ARRAY_LENGTH > 0)` en `schema.ts`.

## 2026-03-18

### Identity Reconciliation Service — scalable source-agnostic identity matching

- **Nuevo módulo**: `src/lib/identity/reconciliation/` — pipeline completo de descubrimiento, matching, propuesta y auto-link de identidades de source systems a team members.
- **Postgres DDL**: `greenhouse_sync.identity_reconciliation_proposals` con partial unique index, status CHECK, y admin queue index.
- **Matching engine**: señales `email_exact` (0.90), `name_exact` (0.70), `name_fuzzy` (0.45), `name_first_token` (0.30), `existing_cross_link` (0.15). Auto-link ≥ 0.85, review ≥ 0.40.
- **Discovery enriquecido**: cuando Notion devuelve UUIDs como nombres (usuarios externos/invitados), extrae nombres reales de `responsable_texto` por posición.
- **Admin API**: GET proposals con filtros, POST trigger manual con dry-run, resolve (approve/reject/dismiss/reassign), stats por source system.
- **Pipeline integration**: tail step no-blocking en `sync-notion-conformed` — corre automáticamente con el cron diario.
- **Primer run**: 13 IDs no vinculados descubiertos (todos ex-colaboradores externos). 1 rechazado (Daniela Infante, match incorrecto). 12 descartados. 0 auto-links (no había miembros activos sin vincular excepto Humberly, que no aparece en tareas).

### Documentation normalization — task index and canonical-reading guardrails

- `docs/tasks/README.md` ahora vuelve a reflejar los briefs vivos recientes (`Campaign 360`, `Tenant Notion Mapping`, `Transactional Email`) y agrega una seccion `Supporting Specs` para las specs grandes que hoy funcionan como referencia de diseno.
- `CODEX_TASK_ETL_ICO_Pipeline_Hardening.md` se reclasifico a `docs/tasks/complete/` porque el propio brief ya marcaba su estado como implementado y la arquitectura viva absorbio ese trabajo.
- `Greenhouse_ICO_Engine_v1.md` y `CODEX_TASK_Tenant_Notion_Mapping.md` ahora incluyen un bloque de estado 2026-03-18 para dejar explicito que, ante conflicto, prevalecen `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_DATA_MODEL_MASTER_V1.md`, `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` y `GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`.
- Se agrego `docs/tasks/to-do/CODEX_TASK_Campaign_360_v2.md` como baseline canonica de implementacion para `Campaign`, manteniendo la task original como framing de producto y agregando guardrails para evitar implementar su version tecnica historica tal cual.

## 2026-03-16

### Payroll systematization — bonus proration, attendance, PDF/Excel, personnel expense

- **Motor de prorrateo gradual**: OTD 3 niveles (>=94% full, 70-94% lineal, <70% cero), RpA escala inversa con umbral 3. Reemplaza lógica binaria previa. Thresholds configurables desde `payroll_bonus_config.otd_floor`.
- **Integración asistencia/licencias**: `fetchAttendanceForAllMembers()` combina BigQuery `attendance_daily` + Postgres `leave_requests`. Días deducibles (`absent + unpaid_leave`) reducen base y teletrabajo proporcionalmente. 9 campos nuevos en `payroll_entries`.
- **Generación PDF/Excel**: Excel 3 hojas con exceljs (Resumen, Detalle, Asistencia & Bonos). PDF con @react-pdf/renderer — reporte período landscape + recibo individual con haberes, asistencia, descuentos legales, neto.
- **3 endpoints nuevos**: `GET /api/hr/payroll/periods/:id/pdf`, `/excel`, `GET /entries/:id/receipt`. Validan período aprobado/exportado.
- **UI actualizada**: semáforo OTD 3 colores, columna asistencia con ratio y chip ausencias, tooltips base/teletrabajo ajustado, botón recibo por entry, botones PDF/Excel/CSV en período, card prorrateo expandible.
- **Gasto de personal**: módulo `personnel-expense.ts` + endpoint + tab en dashboard. KPI cards, gráfico evolución bruto/neto, donut Chile vs Internacional, tabla detalle por período. Filtro por rango de fechas.
- **Arquitectura**: Postgres-first — nuevos campos solo en Cloud SQL, BigQuery devuelve `CAST(NULL)`. BigQuery MERGE sin cambios.
- **Pendiente**: ejecutar DDL migration en Cloud SQL (`ALTER TABLE ADD COLUMN IF NOT EXISTS`), seed `payroll_bonus_config` con nuevos thresholds, unit tests para `bonus-proration.ts`.

### Person 360 runtime contract aligned to enriched v2 setup

- Se detectó un desalineamiento entre código y base: `Admin > Users > detail` ya esperaba el contrato enriquecido de `greenhouse_serving.person_360`, pero Cloud SQL seguía con la versión base.
- Se corrigió el comando canónico `pnpm setup:postgres:person-360` para que apunte a `scripts/setup-postgres-person-360-v2.ts`.
- También se alineó `scripts/setup-postgres-person-360-serving.ts` a la misma versión para no volver a degradar el serving por accidente.
- `person_360 v2` quedó aplicado en Cloud SQL.
- Resultado:
  - `EO-ID`, `serial_number`, `resolved_*` y facetas extendidas ya están disponibles para `resolve-eo-id`, `get-person-profile` y `get-admin-user-detail`.

### Identity & Access V2 — Role homologation across TypeScript + frontend (Claude)

- `TenantRouteGroup` type expandido: +`my`, `people`, `ai_tooling` (10 valores total).
- `rolePriority` expandido a 15 roles (6 V2: collaborator, hr_manager, finance_analyst, finance_admin, people_viewer, ai_tooling_admin).
- `deriveRouteGroups()` fallback BigQuery cubre los 6 roles V2.
- `canAccessPeopleModule` ahora acepta route group `'people'` (para `people_viewer`).
- `requireAiToolingTenantContext` guard nuevo para AI Tooling.
- People permissions: `people_viewer` (read-only assignments/activity), `hr_manager` (compensation/payroll).
- VerticalMenu: People y AI Tooling visibles por route group, no solo por role code hardcoded.
- Admin helpers: iconos y colores para roles V2.
- Backward compatible: usuarios existentes con `finance_manager`, `hr_payroll`, `employee` sin cambios.

### Identity & Access V2 — PostgreSQL RBAC model + session resolution wiring (Claude)

- DDL: `setup-postgres-identity-v2.sql` — ALTER client_users (12 cols SSO/auth/session), scope tables (project, campaign, client), audit_events, client_feature_flags, role seed V2 (6 new roles), session_360 + user_360 views.
- Backfill: `backfill-postgres-identity-v2.ts` — 6-step migration BigQuery → Postgres (SSO columns, member_id links, role assignments, scopes, feature flags).
- Identity Store: `src/lib/tenant/identity-store.ts` — readiness check con TTL 60s, 4 session lookups vía session_360, internal users list, SSO link + last login writes.
- Wiring: `src/lib/tenant/access.ts` ahora usa Postgres-first con BigQuery fallback para todos los lookups de sesión y dual-write para SSO linking + last login.
- Scripts y DDL aún NO ejecutados en Cloud SQL.

## 2026-03-15

### Person 360 serving baseline materialized in PostgreSQL

- Se creó `greenhouse_serving.person_360` como primera vista unificada de persona sobre `identity_profiles`, `members`, `client_users` y `crm_contacts`.
- Se agregó el comando `pnpm audit:person-360` para medir cobertura real de unificación entre facetas.
- Estado validado:
  - `profiles_total = 38`
  - `profiles_with_member = 7`
  - `profiles_with_user = 37`
  - `profiles_with_contact = 29`
  - `profiles_with_member_and_user = 7`
  - `profiles_with_user_and_contact = 29`
  - `profiles_with_all_three = 0`
- Principales gaps detectados:
  - `users_without_profile = 2`
  - `contacts_without_profile = 34`
  - `internal_users_without_member = 1`

### Person 360 formalized as the canonical human profile strategy

- Se fijó en arquitectura que Greenhouse debe tratar `identity_profile` como ancla canónica de persona.
- `member`, `client_user` y `crm_contact` quedan formalizados como facetas del mismo perfil, no como raíces paralelas.
- `People` y `Users` pasan a definirse como vistas contextuales del mismo `Person 360`.
- La lane fundacional quedó absorbida por `CODEX_TASK_Person_360_Profile_Unification_v1.md`; el follow-up vivo pasa a ser `CODEX_TASK_Person_360_Coverage_Consumer_Cutover_v1.md`.

### AI Tooling runtime migrated to PostgreSQL

- `AI Tooling` ya no depende primariamente del bootstrap runtime de BigQuery para responder catálogo, licencias, wallets y metadata admin.
- Se creó `greenhouse_ai` en Cloud SQL con:
  - `tool_catalog`
  - `member_tool_licenses`
  - `credit_wallets`
  - `credit_ledger`
- `src/lib/ai-tools/service.ts` ahora usa `Postgres first` con fallback controlado al store legacy.
- `setup-postgres-ai-tooling.ts` ya no solo crea schema: también siembra catálogo mínimo y providers requeridos para que el módulo no arranque vacío.
- Estado validado tras setup:
  - `tool_catalog = 9`
  - `licenses = 0`
  - `wallets = 0`
  - `ledger = 0`
  - providers activos visibles = `10`, incluyendo `Microsoft` y `Notion`

### Project detail now exposes source performance indicators and RpA semaphore

- `Project Detail > tasks` ya expone directamente desde fuente:
  - `semáforo_rpa`
  - `indicador_de_performance`
  - `cumplimiento`
  - `completitud`
  - `días_de_retraso`
  - `días_reprogramados`
  - `reprogramada`
  - `client_change_round`
  - `client_change_round_final`
  - `workflow_change_round`
  - tiempos de ejecución, revisión y cambios
- También se agregó `rpaSemaphoreDerived` para compatibilidad con la lógica actual del portal.
- `Source Sync Runtime Projections` quedó extendido para llevar ese mismo set al modelo canónico `delivery_*`, aunque el apply de BigQuery sigue temporalmente bloqueado por `table update quota exceeded`.

### Finance clients consumers now read canonical CRM first with live fallback

- `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ya no dependen solo de `hubspot_crm.*` live.
- Ambos consumers ahora priorizan:
  - `greenhouse_conformed.crm_companies`
  - `greenhouse_conformed.crm_deals`
  - `greenhouse.client_service_modules`
- Se mantuvo fallback a `hubspot_crm.companies` y `hubspot_crm.deals` cuando la proyección todavía no alcanzó el evento live.
- Esto evita romper el flujo donde HubSpot promociona una empresa a cliente y Greenhouse la crea en tiempo real antes de que corra el sync.

### Admin project scope naming now prefers delivery projections

- `Admin > tenant detail` y `Admin > user detail` ya priorizan `greenhouse_conformed.delivery_projects.project_name` para resolver nombres de proyecto en scopes.
- `notion_ops.proyectos` queda temporalmente como fallback y para `page_url`, mientras ese campo no viva en la proyección canónica.

### Projects metadata now prefers delivery projections

- `Projects Overview` y `Project Detail` ya priorizan `greenhouse_conformed.delivery_projects` y `greenhouse_conformed.delivery_sprints` para nombre, estado y fechas.
- `notion_ops.tareas` se mantiene para métricas finas de tarea (`rpa`, reviews, blockers, frame comments).
- `notion_ops.proyectos` y `notion_ops.sprints` quedan temporalmente para `page_url`, `summary` y fallback.

### HubSpot contacts + owners now project into the canonical runtime graph

- `Source Sync Runtime Projections` ya materializa:
  - `greenhouse_conformed.crm_contacts`
  - `greenhouse_crm.contacts`
- El slice respeta la frontera Greenhouse:
  - solo entran contactos asociados a compañías que ya pertenecen al universo de clientes Greenhouse
  - no se auto-provisionan nuevos `client_users` desde el sync
  - la integración/admin live sigue siendo la capa de provisioning de accesos
- Reconciliación activa:
  - `HubSpot Contact -> client_user`
  - `HubSpot Contact -> identity_profile`
  - `HubSpot Owner -> member/user`
- `HubSpot Owner` ahora también se sincroniza como source link reusable en `greenhouse_core`:
  - `member <- hubspot owner = 6`
  - `user <- hubspot owner = 1`
  - `identity_profile <- hubspot owner = 6`
- Estado validado tras rerun:
  - `crm_contacts = 63`
  - `linked_user_id = 29`
  - `linked_identity_profile_id = 29`
  - `owner_member_id = 63`
  - `owner_user_id = 61`
  - `identity_profile_source_links` HubSpot contact = `29`
  - `entity_source_links` HubSpot contact -> user = `29`
  - runtime owners:
    - companies `owner_member_id = 9`, `owner_user_id = 9`
    - deals `owner_member_id = 21`, `owner_user_id = 21`

### Canonical `Space` model added to the 360 backbone

- Se agregó `greenhouse_core.spaces` y `greenhouse_core.space_source_bindings` como nuevo boundary operativo para Agency, delivery e ICO metrics.
- `Efeonce` ya quedó modelado como `internal_space` con `client_id = null`, en vez de depender solo del pseudo-cliente legacy `space-efeonce`.
- Se agregó `greenhouse_serving.space_360`.
- `Source Sync Runtime Projections` ya publica `space_id` en:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.tasks`
  - `greenhouse_delivery.sprints`
- Seed validado:
  - PostgreSQL `spaces = 11` (`10 client_space`, `1 internal_space`)
  - Delivery con `space_id` en PostgreSQL: projects `57/59`, tasks `961/1173`, sprints `11/13`
  - Delivery con `space_id` en BigQuery conformed: projects `57/59`, tasks `961/1173`, sprints `11/13`
- Se endureció además la capa de acceso PostgreSQL para el backbone:
  - `setup-postgres-canonical-360.sql` ya otorga grants a `greenhouse_runtime` y `greenhouse_migrator`
  - `setup-postgres-access.sql` intenta normalizar ownership de `greenhouse_core`, `greenhouse_serving` y `greenhouse_sync` hacia `greenhouse_migrator` sin bloquearse por objetos legacy aislados

### Finance Slice 2 PostgreSQL wiring — Income, Expenses, Payments (Claude)

- Creado `src/lib/finance/postgres-store-slice2.ts` — repository layer completo para Slice 2 con readiness check independiente, CRUD de income/expenses/income_payments, sequence ID generator, y publicación de outbox events.
- 7 rutas API wired a Postgres-first con BigQuery fallback:
  - GET/POST `/api/finance/income`
  - GET `/api/finance/income/[id]`
  - POST `/api/finance/income/[id]/payment`
  - GET/POST `/api/finance/expenses`
  - GET `/api/finance/expenses/[id]`
- Income payments normalizados: Postgres usa tabla `income_payments` con FK; BigQuery fallback mantiene JSON `payments_received`.
- Payment creation transaccional con `FOR UPDATE` lock sobre income row.
- PUT income/expenses y reconciliation runtime quedan pendientes para Slice 3.

### HR Payroll & Leave backfill scripts + serving view (Claude)

- `scripts/backfill-postgres-payroll.ts` — backfill BigQuery → PostgreSQL para compensation_versions, payroll_periods, payroll_entries, payroll_bonus_config.
- `scripts/backfill-postgres-hr-leave.ts` — backfill BigQuery → PostgreSQL para leave_types, leave_balances, leave_requests, leave_request_actions.
- `greenhouse_serving.member_leave_360` — serving view con member + vacation balance + pending/approved requests del año actual.
- Scripts escritos, NO ejecutados aún.
- Fix TS en `sync-source-runtime-projections.ts:571` para desbloquear build.

### Data model master and first real source-sync seed

- Se agregó `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` y su operating model para agentes como fuente de verdad del modelo de datos Greenhouse.
- Se ejecutó el primer seed real de `Source Sync Runtime Projections`: `delivery` quedó proyectado completo a PostgreSQL y `greenhouse_crm` quedó filtrado al universo real de clientes Greenhouse.

### PostgreSQL access model and `pg:doctor` tooling

- Se agregó `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` para formalizar la separación de acceso `runtime / migrator / admin`.
- `AGENTS.md` ahora documenta cómo acceder a PostgreSQL, qué perfil usar según el tipo de trabajo y qué comandos correr antes de tocar un dominio nuevo.
- Se agregaron los comandos:
  - `pnpm setup:postgres:access`
  - `pnpm pg:doctor`
- Se agregó un loader reutilizable de env local para tooling PostgreSQL y un runner compartido para scripts SQL.
- `setup-postgres-finance.sql`, `setup-postgres-hr-leave.sql` y `setup-postgres-payroll.sql` ahora otorgan acceso a:
  - `greenhouse_runtime`
  - `greenhouse_migrator`
    en vez de atarse a `greenhouse_app`.
- Se validó en Cloud SQL que:
  - `greenhouse_app` hereda `greenhouse_runtime`
  - `greenhouse_migrator_user` hereda `greenhouse_migrator`
  - `HR`, `Payroll` y `Finance` ya exponen grants consumibles por ambos roles

### Finance PostgreSQL first slice and canonical provider bridge

- `Finance` ya tiene materializado su primer slice operacional en PostgreSQL:
  - `greenhouse_finance.accounts`
  - `greenhouse_finance.suppliers`
  - `greenhouse_finance.exchange_rates`
  - `greenhouse_serving.provider_finance_360`
- Se agregó `src/lib/finance/postgres-store.ts` para el repository `Postgres first`.
- `accounts` y `exchange-rates` ya prefieren PostgreSQL en runtime, con fallback controlado a BigQuery durante rollout.
- `GET /api/finance/expenses/meta` ya toma la lista de cuentas desde PostgreSQL cuando el slice está listo.
- Se ejecutó backfill inicial desde BigQuery:
  - `accounts`: `1`
  - `suppliers`: `2`
  - `exchange_rates`: `0`
- El bridge `Supplier -> Provider` ahora también materializa providers canónicos `financial_vendor` en PostgreSQL y expone la relación vía `provider_finance_360`.
- Se corrigió además el setup estructural de permisos en Cloud SQL:
  - `greenhouse_app` ya tiene `REFERENCES` sobre `greenhouse_core`
  - `greenhouse_app` ya puede publicar en `greenhouse_sync`
  - el script `setup-postgres-finance.sql` ahora incorpora grants para que un ambiente nuevo no dependa de intervención manual

### Parallel Postgres migration lanes documented for agent work

- Se agregaron tres tasks nuevas para ejecutar en paralelo la siguiente etapa de plataforma:
  - `CODEX_TASK_HR_Payroll_Postgres_Runtime_Migration_v1.md`
  - `CODEX_TASK_Finance_Postgres_Runtime_Migration_v1.md`
  - `CODEX_TASK_Source_Sync_Runtime_Projections_v1.md`
- Cada brief deja explicitados:
  - boundaries de archivos
  - alcance y no scope
  - dependencias
  - criterios de aceptacion
  - handoff sugerido para Claude u otro agente
- `docs/tasks/README.md` ya refleja estas lanes como `in-progress`.

### HR leave avatars now use real/fallback profile image data

- `HR > Permisos` ya no fuerza iniciales en la tabla de solicitudes y en el modal de revisión.
- `HrLeaveRequest` ahora devuelve `memberAvatarUrl`.
- En BigQuery se usa `team_members.avatar_url` cuando existe.
- En PostgreSQL se usa el resolver compartido de avatar por nombre/email hasta que `avatar_url` viva de forma canónica en `greenhouse_core`.

### Source sync foundation materialized in PostgreSQL and BigQuery

- Se agregaron los scripts:
  - `pnpm setup:postgres:source-sync`
  - `pnpm setup:bigquery:source-sync`
- En PostgreSQL se materializaron:
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_sync.source_sync_watermarks`
  - `greenhouse_sync.source_sync_failures`
  - `greenhouse_crm.companies`
  - `greenhouse_crm.deals`
  - `greenhouse_delivery.projects`
  - `greenhouse_delivery.sprints`
  - `greenhouse_delivery.tasks`
- En BigQuery se materializaron:
  - datasets `greenhouse_raw`, `greenhouse_conformed`, `greenhouse_marts`
  - raw snapshots iniciales de Notion y HubSpot
  - conformed tables iniciales de `delivery_*` y `crm_*`
- El runner `setup-bigquery-source-sync.ts` quedó desacoplado de `server-only` para poder ejecutarse como tooling externo.

### HR leave request creation type fix in PostgreSQL

- Se corrigió la creación de solicitudes en `HR > Permisos` sobre PostgreSQL.
- El write de `leave_balances` usaba el parámetro `year` como `text` dentro del `INSERT ... SELECT`, lo que rompía `POST /api/hr/core/leave/requests`.
- `src/lib/hr-core/postgres-leave-store.ts` ahora fuerza el placeholder como entero en el `balance_id` y en la columna `year`, evitando el error `column "year" is of type integer but expression is of type text`.

### External source sync architecture for Notion and HubSpot

- Se agregó `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` para definir el blueprint de ingestión, backup, normalización y serving de datos externos.
- Greenhouse formaliza que:
  - `Notion` y `HubSpot` siguen siendo `source systems`
  - `BigQuery raw` guarda snapshots inmutables y replayables
  - `BigQuery conformed` expone entidades externas estables
  - `PostgreSQL` recibe solo proyecciones runtime-críticas para cálculo y pantallas operativas
- Se definieron como objetos mínimos de control:
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_sync.source_sync_watermarks`
  - `greenhouse_sync.source_sync_failures`
- Se definieron como primeras tablas conformed objetivo:
  - `delivery_projects`
  - `delivery_tasks`
  - `delivery_sprints`
  - `crm_companies`
  - `crm_deals`

### HR leave rollout hardening for Preview

- `HR > Permisos` ya no cae completo en `Preview` si el conector a Cloud SQL falla durante el rollout a PostgreSQL.
- `src/lib/hr-core/service.ts` ahora hace fallback controlado a BigQuery para metadata, balances, requests, creación y revisión de solicitudes cuando detecta:
  - falta de permisos Cloud SQL
  - schema Postgres no listo
  - errores transitorios de conectividad
- Se corrigió además la infraestructura de `Preview` otorgando `roles/cloudsql.client` al service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`, que era el origen real del error `cloudsql.instances.get`.

### PostgreSQL canonical 360 backbone and initial BigQuery backfill

- Se agregó `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` para formalizar el modelo canónico 360 en PostgreSQL.
- Se materializaron en `greenhouse-pg-dev` los esquemas:
  - `greenhouse_core`
  - `greenhouse_serving`
  - `greenhouse_sync`
- Se agregaron vistas 360 iniciales:
  - `client_360`
  - `member_360`
  - `provider_360`
  - `user_360`
  - `client_capability_360`
- Se agregó `greenhouse_sync.outbox_events` como foundation de publicación `Postgres -> BigQuery`.
- Se agregaron scripts operativos:
  - `pnpm setup:postgres:canonical-360`
  - `pnpm backfill:postgres:canonical-360`
- Se ejecutó backfill inicial desde BigQuery hacia Postgres:
  - `clients`: `11`
  - `identity_profiles`: `9`
  - `identity_profile_source_links`: `29`
  - `client_users`: `39`
  - `members`: `7`
  - `providers`: `8` canónicos sobre `11` filas origen, por deduplicación de `provider_id`
  - `service_modules`: `9`
  - `client_service_modules`: `30`
  - `roles`: `8`
  - `user_role_assignments`: `40`

### Data platform architecture and Cloud SQL operational foundation

- Se formalizó la arquitectura objetivo `OLTP + OLAP` en `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`.
- Greenhouse deja explícitamente definido que `PostgreSQL` será la base operacional para workflows mutables y `BigQuery` quedará como warehouse analítico.
- Se provisionó la primera instancia administrada de PostgreSQL en Google Cloud:
  - instancia: `greenhouse-pg-dev`
  - proyecto: `efeonce-group`
  - región: `us-east4`
  - motor: `POSTGRES_16`
  - base creada: `greenhouse_app`
  - usuario creado: `greenhouse_app`
- Se crearon los secretos operativos iniciales en Secret Manager:
  - `greenhouse-pg-dev-postgres-password`
  - `greenhouse-pg-dev-app-password`
- Este cambio deja lista la fundación de infraestructura para empezar la migración fuera de BigQuery, pero todavía no conecta el runtime del portal a Postgres.

### HR Payroll admin team surface and compensation overview resilience

- `Payroll` ya no depende de una ruta inexistente para indicar dónde habilitar o gestionar colaboradores.
- Se agregó la ruta runtime `/admin/team`, reutilizando la vista de `People`, y el menú `Admin` ahora expone `Equipo`.
- `GH_INTERNAL_NAV` ahora incluye la entrada canónica `adminTeam`.
- `getCompensationOverview()` ahora es resiliente a fallos parciales:
  - si falla la carga de compensaciones actuales, mantiene el roster
  - si falla la carga enriquecida de miembros, cae al roster base de `greenhouse.team_members`
- `Payroll` ahora apunta a `Admin > Equipo` como surface real para habilitación del equipo y primera compensación.

### HR Payroll period creation and compensation onboarding hardening

- `HR Payroll` ya no depende de inferencia implícita de tipos para params `null` en BigQuery al crear períodos, crear compensaciones o persistir entries.
- Se agregaron tipos explícitos en los writes de:
  - `payroll_periods`
  - `compensation_versions`
  - `payroll_entries`
- El dashboard de nómina ahora deja de silenciar fallos de carga en `/api/hr/payroll/periods` y `/api/hr/payroll/compensation`.
- `Compensaciones` ahora explica mejor el onboarding:
  - CTA visible para configurar la primera compensación
  - mensaje explícito si faltan colaboradores activos
  - mensaje explícito cuando todos ya tienen compensación vigente y la edición se hace desde la fila
- En `Preview` se confirmó que sí existe relación canónica entre colaboradores y `Payroll`: hoy hay `7` `team_members` activos y `0` compensaciones vigentes.

### Supplier to Provider canonical bridge for AI Tooling

- `Finance Suppliers` y `AI Tooling` ahora comparten mejor la identidad canónica de vendor/plataforma a través de `greenhouse.providers`.
- Se agregó `src/lib/providers/canonical.ts` para sincronizar suppliers financieros activos hacia `greenhouse.providers`.
- `fin_suppliers` ahora puede persistir `provider_id` y las rutas de suppliers ya devuelven ese vínculo.
- `AI Tooling` ahora sincroniza providers desde Finance antes de poblar metadata o validar `providerId`.
- El diálogo `Nueva herramienta` ya no depende de una sola lista vacía y muestra estado explícito si todavía no hay providers disponibles.

### Finance exchange-rate visibility and HR leave request drawer hardening

- `Finance Dashboard` ahora muestra warning si `/api/finance/exchange-rates/latest` no devuelve snapshot o responde con error HTTP.
- `HR Core` ahora evita que `Solicitar permiso` quede con dropdown vacío y silencioso:
  - deshabilita el CTA cuando no hay tipos activos
  - muestra estado explícito en el select
  - preselecciona el primer tipo activo al abrir
  - expone error si falla `GET /api/hr/core/meta`

### Cross-module QA sweep for Finance, HR Core, HR Payroll and AI Tooling

- Se ejecutó una pasada de QA funcional/contractual sobre los módulos `Finance`, `HR Core`, `HR Payroll` y `AI Tooling`, contrastando pantallas activas con sus rutas API reales.
- `Finance Dashboard` ahora usa `currentBalance` en vez de `openingBalance` para `Saldo total` y muestra mejor contexto del snapshot de tipo de cambio.
- `HR Core` ahora expone desde UI la cancelación de solicitudes de permiso pendientes, alineándose con el backend que ya soportaba `action = cancel`.
- `HR Payroll` ahora reinicia correctamente el formulario de compensación al abrir una nueva alta o una nueva versión para otro colaborador, evitando arrastre de estado previo.
- `AI Tooling` quedó verificado en esta pasada como operativo en sus flujos admin principales sobre catálogo, licencias, wallets y consumo.
- Las tasks vivas de esos módulos quedaron actualizadas con flujos mapeados, fix aplicado y estado post-QA.

### Finance exchange-rate daily sync

- `Finance` ahora puede hidratar y persistir automáticamente el tipo de cambio `USD/CLP` desde APIs abiertas antes de calcular ingresos o egresos en USD.
- Se agregó `src/lib/finance/exchange-rates.ts` como capa server-only de sincronización:
  - fuente primaria: `mindicador.cl`
  - fallback: `open.er-api.com`
- Se agregó `GET/POST /api/finance/exchange-rates/sync` para sincronización diaria/manual y `vercel.json` con cron diario hacia esa ruta.
- `GET /api/finance/exchange-rates/latest` ahora intenta hidratar el snapshot si todavía no existe en `fin_exchange_rates`.
- `resolveExchangeRateToClp()` ahora puede auto-sincronizar `USD/CLP` / `CLP/USD` antes de devolver error, reduciendo dependencia de carga manual previa.

### HR Payroll compensation-current backend hardening

- `HR-Payroll` backend ya no depende ciegamente de `compensation_versions.is_current` para resolver la compensación vigente.
- `src/lib/payroll/get-compensation.ts` ahora deriva la vigencia real por `effective_from` / `effective_to`, evitando que compensaciones futuras dejen stale la compensación “actual”.
- `src/lib/payroll/get-payroll-members.ts` ahora usa el mismo criterio temporal para `hasCurrentCompensation`, manteniendo consistente `eligibleMembers` y el overview de compensaciones.

### Finance backend re-QA closure

- Se ejecutó un re-QA backend de `Finance` después de la segunda tanda y se corrigieron los bugs server-side que seguían abiertos.
- `GET /api/finance/dashboard/aging` ya no mezcla monedas nativas cuando frontend espera CLP; ahora devuelve aging en CLP proporcional.
- `GET /api/finance/clients` y `GET /api/finance/clients/[id]` ya no calculan `totalReceivable` en moneda nativa; ahora lo devuelven consistente en CLP.
- `GET /api/finance/dashboard/by-service-line` ahora separa `cash` y `accrual`, manteniendo compatibilidad legacy en `income` / `expenses` / `net`.
- Con este re-QA, `Finance` backend queda suficientemente estable para ceder el siguiente foco operativo a `HR-Payroll`.

### Finance reconciliation backend hardening

- `Finance` recibió una primera tanda backend de endurecimiento sobre conciliación bancaria.
- La importación de extractos ya no reutiliza la secuencia de `row_id` al reimportar dentro del mismo período y `statement_row_count` ahora representa el total acumulado real del período.
- `match`, `unmatch`, `exclude` y `auto-match` ahora bloquean mutaciones sobre períodos `reconciled` o `closed`.
- `PUT /api/finance/reconciliation/[id]` ahora valida cierre operativo real antes de permitir `reconciled` o `closed`:
  - exige extracto importado
  - exige cero filas `unmatched` o `suggested`
  - exige `difference = 0`
  - impide cerrar un período que aún no fue reconciliado
- La selección temporal para ingresos en conciliación ahora usa el último `payments_received` cuando existe, con fallback a `invoice_date`.
- Se documentó en la task financiera el handoff explícito `Codex -> Claude` para separar trabajo backend crítico de ajustes UI/UX.

## 2026-03-14

### Portal surface consolidation task

- Se agregó una task `to-do` específica para consolidación UX y arquitectura de vistas del portal:
  - `docs/tasks/to-do/CODEX_TASK_Portal_View_Surface_Consolidation.md`
- La task documenta:
  - qué surfaces hoy sí se sienten troncales
  - qué surfaces compiten por la misma intención
  - qué vistas conviene unificar, enriquecer o depriorizar
- No hay cambios runtime en esta entrada; solo se deja el brief rector para una futura fase de implementación.

### People and team capacity backend complements

- `People v3` y `Team Identity & Capacity v2` recibieron complementos backend para dejar contratos más estables antes del frontend.
- `GET /api/people/meta` ahora expone:
  - `visibleTabs`
  - `supportedTabs`
  - `availableEnrichments`
  - `canManageTeam`
- `GET /api/people` ahora también devuelve `filters` para `roleCategories`, `countries` y `payRegimes`.
- `GET /api/people/[memberId]` ahora puede devolver:
  - `capacity`
  - `financeSummary`
- `GET /api/team/capacity` ahora devuelve semántica explícita de capacidad:
  - por miembro: `assignedHoursMonth`, `expectedMonthlyThroughput`, `utilizationPercent`, `capacityHealth`
  - por payload: `healthBuckets` y `roleBreakdown`
- Se agregó `src/lib/team-capacity/shared.ts` para centralizar benchmarks y reglas server-side de salud de capacity.

### Team Identity and People task reclassification

- `Team Identity & Capacity` y `People Unified View v2` fueron contrastadas explícitamente contra arquitectura y runtime actual.
- Resultado:
  - `People` sí está implementado y alineado como capa read-first del colaborador
  - `People v2` quedó como brief histórico porque el runtime ya avanzó más allá de su contexto original
  - `Team Identity & Capacity` sí dejó cerrada la base canónica de identidad, pero no debe tratarse como task completa en capacity
- Se reclasificaron las tasks:
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` queda como referencia histórica
  - `docs/tasks/complete/CODEX_TASK_People_Unified_View_v3.md` queda como cierre fundacional de la surface
  - `docs/tasks/to-do/CODEX_TASK_People_360_Enrichments_v1.md` pasa a ser la task activa para los enrichments 360 pendientes
  - `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` queda como referencia histórica/fundacional
  - `docs/tasks/to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md` pasa a ser la task activa para formalización de capacity
  - `docs/tasks/README.md`, `project_context.md` y `Handoff.md` quedaron alineados con este cambio

### Creative Hub backend runtime closure

- `Creative Hub v2` dejó de depender solo del snapshot agregado de `Capabilities` y ahora tiene una capa backend específica para cierre real del módulo.
- Se endureció la activación runtime:
  - `resolveCapabilityModules()` ahora exige match de `business line` y `service module` cuando ambos están definidos
  - `Creative Hub` ya no se activa solo por `globe`; requiere además uno de:
    - `agencia_creativa`
    - `produccion_audiovisual`
    - `social_media_content`
- Se agregó `src/lib/capability-queries/creative-hub-runtime.ts` para construir snapshot task-level de la capability:
  - usa `fase_csc` cuando existe
  - la deriva server-side cuando todavía no existe en `notion_ops.tareas`
  - calcula aging real, FTR y RpA cuando la data existe
- `GET /api/capabilities/creative-hub/data` ahora devuelve:
  - capa `Brand Intelligence`
  - pipeline CSC basado en fases reales/derivadas
  - stuck assets por tarea y fase, no por proyecto agregado

### Creative Hub task reclassified to runtime v2

- `Creative Hub` fue contrastado contra arquitectura y contra el runtime real del repo:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- El resultado confirmó que el módulo sí está bien ubicado como `capability surface`, pero no está completo respecto del brief original.
- Se reclasificó la task:
  - `docs/tasks/complete/CODEX_TASK_Creative_Hub_Module.md` queda como brief histórico
  - `docs/tasks/to-do/CODEX_TASK_Creative_Hub_Module_v2.md` pasa a ser el brief activo orientado a cierre runtime
- Gaps documentados en la `v2`:
  - activación demasiado amplia del módulo
  - ausencia real de la capa `Brand Intelligence`
  - `CSC Pipeline Tracker` todavía heurístico

### HR core backend foundation and task v2

- `HR Core Module` dejó de tratarse como brief pendiente únicamente greenfield:
  - `docs/tasks/complete/CODEX_TASK_HR_Core_Module.md` queda como referencia histórica
  - `docs/tasks/complete/CODEX_TASK_HR_Core_Module_v2.md` pasa a ser la task activa orientada a runtime/backend
- La task fue contrastada antes de implementar contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- Se implementó la primera foundation backend real del dominio:
  - `ensureHrCoreInfrastructure()` extiende `team_members` y crea `departments`, `member_profiles`, `leave_types`, `leave_balances`, `leave_requests`, `leave_request_actions` y `attendance_daily`
  - `scripts/setup-hr-core-tables.sql` queda como referencia SQL versionada
  - se seedó el rol `employee` con route group `employee`
- Se agregó la superficie backend operativa:
  - `GET /api/hr/core/meta`
  - `GET/POST /api/hr/core/departments`
  - `GET/PATCH /api/hr/core/departments/[departmentId]`
  - `GET/PATCH /api/hr/core/members/[memberId]/profile`
  - `GET /api/hr/core/leave/balances`
  - `GET/POST /api/hr/core/leave/requests`
  - `GET /api/hr/core/leave/requests/[requestId]`
  - `POST /api/hr/core/leave/requests/[requestId]/review`
  - `GET /api/hr/core/attendance`
  - `POST /api/hr/core/attendance/webhook/teams`
- Se documentó la nueva variable:
  - `HR_CORE_TEAMS_WEBHOOK_SECRET`
  - agregada en `.env.example` y `.env.local.example`

### AI tooling backend foundation and task v2

- `AI Tooling & Credit System` dejó de tratarse como brief pendiente puramente greenfield:
  - `docs/tasks/complete/CODEX_TASK_AI_Tooling_Credit_System.md` queda como referencia histórica
  - `docs/tasks/complete/CODEX_TASK_AI_Tooling_Credit_System_v2.md` pasa a ser la task activa orientada a runtime/backend
- La task fue contrastada antes de implementar contra:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `FINANCE_CANONICAL_360_V1.md`
- Se implementó la primera foundation backend real del dominio:
  - `ensureAiToolingInfrastructure()` para bootstrap on-demand de `providers`, `ai_tool_catalog`, `member_tool_licenses`, `ai_credit_wallets` y `ai_credit_ledger`
  - `scripts/setup-ai-tooling-tables.sql` como referencia SQL versionada del mismo modelo
  - registro runtime inicial de `greenhouse.providers.provider_id`
- Se agregó la superficie backend operativa:
  - `GET /api/ai-tools/catalog`
  - `GET /api/ai-tools/licenses`
  - `GET /api/ai-credits/wallets`
  - `GET /api/ai-credits/ledger`
  - `GET /api/ai-credits/summary`
  - `POST /api/ai-credits/consume`
  - `POST /api/ai-credits/reload`
  - `GET /api/admin/ai-tools/meta`
  - `GET/POST /api/admin/ai-tools/catalog`
  - `GET/PATCH /api/admin/ai-tools/catalog/[toolId]`
  - `GET/POST /api/admin/ai-tools/licenses`
  - `GET/PATCH /api/admin/ai-tools/licenses/[licenseId]`
  - `GET/POST /api/admin/ai-tools/wallets`
  - `GET/PATCH /api/admin/ai-tools/wallets/[walletId]`
- `FINANCE_CANONICAL_360_V1.md` quedó alineado con la nueva realidad runtime:
  - `greenhouse.providers` ya no es solo un objeto futuro de arquitectura
  - `fin_suppliers` se mantiene como extensión financiera del provider, no como identidad universal del vendor

### Admin team backend complement freeze

- `Admin Team Module v2` fue contrastado contra arquitectura antes de extender backend:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
  - `GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- El resultado confirmó que el módulo sigue alineado:
  - `Admin Team` owning roster/assignment writes
  - `People` conservado como read-first
  - `team_members.member_id` mantenido como ancla canónica
- Se agregaron superficies backend propias de Admin Team para no depender solo de `People`:
  - `GET /api/admin/team/members` ahora devuelve metadata + `members` + `summary`
  - `GET /api/admin/team/members/[memberId]`
  - `GET /api/admin/team/assignments`
  - `GET /api/admin/team/assignments/[assignmentId]`
- Se endureció la alineación con identidad:
  - cuando el colaborador ya tiene `identity_profile_id`, `Admin Team` ahora sincroniza best-effort `azureOid`, `notionUserId` y `hubspotOwnerId` hacia `greenhouse.identity_profile_source_links`

### HR payroll v3 backend complement freeze

- `HR Payroll v3` fue contrastada contra arquitectura antes de tocar backend:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `GREENHOUSE_IDENTITY_ACCESS_V1.md`
- El resultado confirmó que la task sigue alineada con el modelo canónico:
  - `Payroll` mantiene ownership de compensaciones, períodos y entries
  - el colaborador sigue anclado a `greenhouse.team_members.member_id`
- Se cerraron complementos backend para que frontend pueda avanzar sin inventar contratos:
  - `GET /api/hr/payroll/compensation` ahora devuelve `compensations`, `eligibleMembers`, `members` y `summary`
  - `GET /api/hr/payroll/compensation/eligible-members`
  - `GET /api/hr/payroll/periods` ahora devuelve `periods` + `summary`
  - `GET /api/hr/payroll/periods/[periodId]/entries` ahora devuelve `entries` + `summary`
  - `GET /api/hr/payroll/members/[memberId]/history` ahora incluye `member` y devuelve `404` si el colaborador no existe
- Se agregó `src/lib/payroll/get-payroll-members.ts` como capa server-side para:
  - summary canónico de colaborador
  - discovery de colaboradores activos y elegibilidad de compensación vigente

### Finance backend runtime closure and task v2

- `Financial Module` dejó de tratarse como brief greenfield activo:
  - `docs/tasks/complete/CODEX_TASK_Financial_Module.md` queda como referencia histórica
  - `docs/tasks/to-do/CODEX_TASK_Financial_Module_v2.md` pasa a ser el brief vigente para cierre runtime/backend y handoff con frontend
- Se agregó backend operativo para cerrar conciliación y egresos especializados:
  - `GET /api/finance/reconciliation/[id]/candidates`
  - `POST /api/finance/reconciliation/[id]/exclude`
  - `GET /api/finance/expenses/meta`
  - `GET /api/finance/expenses/payroll-candidates`
- Se endureció la consistencia de conciliación:
  - `auto-match` ahora también marca `fin_income` / `fin_expenses` como reconciliados cuando aplica
  - `match`, `unmatch` y `exclude` sincronizan el estado entre `fin_bank_statement_rows` y la transacción financiera target
  - `GET /api/finance/reconciliation/[id]` ahora devuelve `matchStatus` normalizado y `rawMatchStatus`
- `POST /api/finance/expenses` ahora también acepta los campos especializados que ya existían en schema:
  - previsión
  - impuestos
  - categoría de varios
- `project_context.md` y `docs/architecture/FINANCE_CANONICAL_360_V1.md` quedaron actualizados para reflejar esta capa backend nueva.

### HR payroll brief split: baseline vs runtime gaps

- `CODEX_TASK_HR_Payroll_Module_v2.md` dejó de tratarse como brief vigente greenfield y quedó marcado como referencia histórica de la implementación base.
- Se creó `docs/tasks/to-do/CODEX_TASK_HR_Payroll_Module_v3.md` como brief activo para cerrar los gaps reales del módulo actual:
  - alta inicial de compensación desde UI
  - edición visible de metadata del período en `draft`
  - fallback manual de KPI y override de entry en la vista de nómina
  - ficha de colaborador útil aun sin payroll cerrado
- `docs/tasks/README.md` quedó alineado para que `HR Payroll` vuelva a figurar como trabajo `in-progress` en vez de task cerrada por completo.

### Codex task board operational panels

- `docs/tasks/` dejó de funcionar como carpeta plana y ahora se organiza como tablero operativo con paneles:
  - `docs/tasks/in-progress/`
  - `docs/tasks/to-do/`
  - `docs/tasks/complete/`
- `docs/tasks/README.md` quedó como vista maestra del board y la referencia obligatoria para saber qué task está activa, pendiente o ya absorbida/histórica.
- La clasificación inicial se hizo contrastando repo real + `project_context.md` + `Handoff.md` + `changelog.md`, para no mover briefs solo por intuición.
- Se corrigió `.gitignore` para que los `CODEX_TASK_*` bajo `docs/tasks/**` vuelvan a quedar versionables; el patrón ignorado ahora aplica solo a scratch files en raíz.
- `README.md`, `AGENTS.md` y `project_context.md` quedaron alineados a esta convención nueva.

### Provider canonical object alignment

- La arquitectura 360 ahora reconoce `Provider` como objeto canónico objetivo para vendors/plataformas reutilizables entre AI Tooling, Finance, Identity y Admin.
- Se documentó la relación recomendada:
  - ancla objetivo `greenhouse.providers.provider_id`
  - `fin_suppliers` como extensión financiera del Provider, no como identidad global del vendor
  - `vendor` libre permitido solo como snapshot/display label, no como relación primaria reusable
- Se alineó la task `AI Tooling & Credit System` para que el catálogo de herramientas guarde `provider_id` y no nazca acoplado a vendors en texto libre.
- `docs/architecture/FINANCE_CANONICAL_360_V1.md` ahora también deja explícita la distinción operativa entre `Supplier` y `Provider` para que Finance no siga funcionando como identidad vendor global por omisión.

### Codex task architecture gate

- La gobernanza de `CODEX_TASK_*` quedó endurecida:
  - toda task nueva, reactivada o retomada debe revisarse obligatoriamente contra la arquitectura antes de implementarse
  - mínimo obligatorio: `GREENHOUSE_ARCHITECTURE_V1.md` y `GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - además, cada task debe contrastarse con la arquitectura especializada aplicable
- La regla quedó documentada en:
  - `AGENTS.md`
  - `docs/tasks/README.md`
  - `docs/README.md`

### Greenhouse 360 object model

- Se formalizó una regla transversal de arquitectura para todo el portal en `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`:
  - Greenhouse debe evolucionar sobre objetos canónicos enriquecidos, no sobre módulos con identidades paralelas por silo
  - se definieron los anclajes y reglas base para `Client`, `Collaborator`, `Product/Capability`, `Quote`, `Project` y `Sprint`
  - `Finance` queda explícitamente tratado como una especialización de este modelo, no como una excepción local
- Se alinearon docs existentes de arquitectura para evitar contradicciones con ese modelo, especialmente en:
  - `GREENHOUSE_ARCHITECTURE_V1.md`
  - `MULTITENANT_ARCHITECTURE.md`
  - `GREENHOUSE_SERVICE_MODULES_V1.md`
  - `Greenhouse_Capabilities_Architecture_v1.md`
- Se alinearon también las tasks con mayor riesgo de deriva para que futuros desarrollos no reintroduzcan silos:
  - `Financial Module`
  - `AI Tooling & Credit System`
  - `Creative Hub`
  - `HR Payroll v2`
  - `People Unified View v2`
  - `Team Identity & Capacity`
  - `Agency Operator Layer`
  - `Admin Team v2`

### Finance staging runtime stabilization

- Se endureció el bootstrap runtime de `Finance` para no agotar cuota de BigQuery en lecturas:
  - `ensureFinanceInfrastructure()` ya no ejecuta `ALTER`/`UPDATE`/`MERGE` de forma ciega en cada request
  - ahora inspecciona `INFORMATION_SCHEMA` y solo crea tablas o columnas faltantes
  - el seed de `finance_manager` pasa a `INSERT` solo si el rol no existe
- `GET /api/finance/clients` dejó de depender de subqueries correlacionadas no soportadas por BigQuery:
  - receivables y cantidad de facturas activas ahora salen de un rollup por `JOIN`
  - con esto se corrige el `500` que dejaba `/finance/clients` sin clientes en `develop`/`Staging`
- Se volvió a endurecer el directorio de clientes para evitar fallas silenciosas:
  - la lista ahora se apoya primero en `greenhouse.clients` y trata HubSpot + `fin_income` como enriquecimientos opcionales
  - si falla `hubspot_crm.companies`, el endpoint cae a modo degradado y sigue devolviendo clientes base
  - si falla el rollup de receivables, la vista sigue cargando clientes con KPIs financieros en `0`
  - `ClientsListView` ya no interpreta errores backend como “no hay clientes”; ahora muestra un `Alert` explícito cuando `/api/finance/clients` responde no-`ok`
- El modal `Registrar ingreso` quedó alineado con esa misma fuente:
  - vuelve a cargar `/api/finance/clients` con `cache: 'no-store'` cada vez que se abre
  - deja visible el error real si el dropdown no puede hidratar clientes
  - envía también `clientId` y `clientProfileId` del cliente seleccionado al crear el ingreso, evitando perder la referencia canónica cuando falta `hubspotCompanyId`

### Finance canonical backend phase

- El backend de `Finance` avanzó desde referencias parciales a llaves canónicas sin romper contratos existentes:
  - `clients` ahora prioriza `greenhouse.clients.client_id` como anclaje principal y conserva fallback por `client_profile_id` / `hubspot_company_id`
  - `POST /api/finance/clients` y `/api/finance/clients/sync` ya rellenan `client_id` en `fin_client_profiles` cuando el tenant es resoluble
  - `income` y `expenses` ya pasan por resolución canónica de cliente antes de persistir
  - los egresos también validan y resuelven relación `memberId` / `payrollEntryId` antes de escribir
  - inconsistencias explícitas entre referencias financieras ahora responden `409`
  - referencias canónicas inexistentes (`clientId`, `clientProfileId`, `hubspotCompanyId`, `memberId`) ya no se aceptan silenciosamente
  - `GET /api/finance/clients` corrigió un bug en los filtros `requiresPo` / `requiresHes`
- Se agregó una nueva lectura financiera de colaborador:
  - `GET /api/people/[memberId]/finance`
  - devuelve summary, assignments, identities, payroll history y expenses asociados al colaborador
  - el endpoint fuerza bootstrap de infraestructura financiera antes de consultar `fin_expenses`
- Validación ejecutada:
  - `pnpm exec eslint` sobre los archivos tocados: correcto
  - `git diff --check`: correcto
  - `pnpm exec tsc --noEmit --pretty false`: siguen presentes errores globales preexistentes de `.next-local/.next` y rutas SCIM faltantes

### Finance module backend hardening

- Se corrigieron varios desalineamientos críticos del módulo `Finance` en `feature/finance-module`:
  - `GET /api/finance/income/[id]` y `GET /api/finance/expenses/[id]` ya existen para detalle real
  - `POST /api/finance/income/[id]/payment` quedó implementado para registrar pagos parciales o totales y persistir `payments_received`
  - `POST /api/finance/expenses/bulk` quedó implementado para creación masiva de egresos
  - los `POST` de ingresos y egresos ahora generan IDs secuenciales `INC-YYYYMM-###` / `EXP-YYYYMM-###`
  - las transacciones en USD ya no aceptan `exchangeRateToClp = 0`; resuelven el snapshot desde `fin_exchange_rates` o fallan con error explícito
- La conciliación automática también quedó endurecida:
  - matching por monto + fecha con ventana de `±3 días`
  - resolución ambigua bloqueada cuando hay más de un candidato con la misma confianza
  - mejor uso de referencia + descripción para detectar coincidencias
- Se alinearon contratos de entrada del frontend con el backend:
  - drawers de clientes y proveedores ahora usan solo monedas `CLP/USD`
  - tax ID types y categorías de proveedores quedaron sincronizados con los enums server-side
  - `clients` y `suppliers` validan `paymentCurrency` / `taxIdType` en backend en vez de aceptar valores drifted
  - `finance_contacts` de clientes ya se escribe como JSON real con `PARSE_JSON(...)`
- La capa de clientes quedó más cerca del brief financiero:
  - `GET /api/finance/clients` ahora usa `greenhouse.clients` como base activa y enriquece con `hubspot_crm.companies` + `fin_client_profiles`
  - la lista expone nombre comercial HubSpot, dominio, país, línea de servicio, módulos, saldo por cobrar y cantidad de facturas activas
  - `GET /api/finance/clients/[id]` ahora devuelve company context, summary de cuentas por cobrar y deals read-only de HubSpot cuando el schema disponible los soporta
  - el enriquecimiento HubSpot se construye con introspección de columnas (`INFORMATION_SCHEMA`) para no asumir rígidamente nombres de campos en `companies`/`deals`
- Validación ejecutada:
  - `pnpm exec eslint` sobre los archivos tocados: correcto
  - `git diff --check`: correcto
  - `pnpm exec tsc --noEmit --pretty false`: sigue fallando por errores globales preexistentes en `.next` / SCIM, no por los cambios de Finance

### Admin team promoted to develop

- `feature/admin-team-crud` fue integrado en `develop` mediante el merge commit `ee2355b` para abrir la fase de validación compartida en `Staging`.
- La integración arrastra:
  - backend `Admin Team` bajo `/api/admin/team/*`
  - drawers admin dentro de `People`
  - endurecimiento de previews para evitar fallos por `NEXTAUTH_SECRET` y otras env vars faltantes
- Validación local post-merge: `eslint`, `tsc --noEmit` y `git diff --check` correctos.
- Se corrigieron tres detalles menores de frontend detectados en esa pasada:
  - grouping de imports en `src/views/greenhouse/people/PeopleList.tsx`
  - import no usado en `src/views/greenhouse/people/PersonLeftSidebar.tsx`
  - grouping de imports en `src/views/greenhouse/people/PersonView.tsx`

### Vercel ops skill hardening

- La skill local [vercel-operations](/Users/jreye/Documents/greenhouse-eo/.codex/skills/vercel-operations/SKILL.md) ahora deja explícito el patrón operativo que venía rompiendo previews en este repo:
  - verificar env vars branch-scoped antes de confiar en un Preview
  - tratar `next-auth NO_SECRET` como problema de infraestructura/env
  - no mover `pre-greenhouse` sin smoke previo de `/api/auth/session`
  - usar un playbook corto para errores de preview antes del login
- El objetivo es evitar repetir ciclos donde un deployment parece `Ready` pero se cae en runtime por `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GCP_PROJECT` o credenciales Google faltantes.

### Admin team preview promotion

- La rama `feature/admin-team-crud` ya quedó publicada en GitHub:
  - commit `f894eba`
  - PR: `https://github.com/efeoncepro/greenhouse-eo/pull/new/feature/admin-team-crud`
- Preview oficial de la rama confirmado en Vercel:
  - `https://greenhouse-2z503i2bu-efeonce-7670142f.vercel.app`
  - alias de rama: `https://greenhouse-eo-git-feature-admin-team-crud-efeonce-7670142f.vercel.app`
- `pre-greenhouse.efeoncepro.com` fue repuntado a ese deployment para QA compartido del módulo `Admin Team`.

### Admin team preview hardening

- El backend de `Admin Team` quedó endurecido para desplegar en preview sin depender de `GCP_PROJECT` durante `module evaluation`.
- Se movió a lazy resolution el acceso a `getBigQueryProjectId()` en la capa nueva de admin y también en los helpers que todavía podían romper previews al colectar page data:
  - `src/lib/team-admin/mutate-team.ts`
  - `src/lib/payroll/*` relevantes para export, periods, compensation, entries, calculate, KPI fetch y persist
  - `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`
  - `src/lib/people/get-people-list.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/people/get-person-operational-metrics.ts`
- También se corrigieron dos regressions de frontend que estaban tumbando `next build` en preview:
  - `src/components/Providers.tsx` ya no pasa `direction` a `AppReactToastify`
  - `src/views/greenhouse/people/drawers/EditProfileDrawer.tsx` normaliza `roleCategory` localmente
- Preview funcional confirmado:
  - `https://greenhouse-enzxjzyg9-efeonce-7670142f.vercel.app`
- Smoke sin sesión del módulo admin:
  - `GET /api/admin/team/meta`: `401 Unauthorized`
  - `GET /api/admin/team/members`: `401 Unauthorized`
- El primer deploy listo de la rama seguía devolviendo `500` por `next-auth NO_SECRET`; se resolvió para este deployment puntual inyectando runtime envs en el comando de deploy.

### Admin team backend foundation

- Se inició `Admin Team Module v2` en la rama `feature/admin-team-crud` con la primera capa backend de mutaciones.
- Nuevas rutas admin bajo `/api/admin/team/*`:
  - `GET /api/admin/team/meta`
  - `GET/POST /api/admin/team/members`
  - `PATCH /api/admin/team/members/[memberId]`
  - `POST /api/admin/team/members/[memberId]/deactivate`
  - `POST /api/admin/team/assignments`
  - `PATCH/DELETE /api/admin/team/assignments/[assignmentId]`
- Se agregó `src/lib/team-admin/mutate-team.ts` como helper server-side para:
  - crear y editar personas
  - desactivar personas y cerrar sus assignments activos
  - crear, reactivar, editar y desasignar assignments
  - registrar `audit_events` cuando la tabla existe
- `src/types/team.ts` ahora también exporta los contratos de mutación y records admin:
  - `CreateMemberInput`
  - `UpdateMemberInput`
  - `CreateAssignmentInput`
  - `UpdateAssignmentInput`
  - `TeamAdminMemberRecord`
  - `TeamAdminAssignmentRecord`
- El backend ya expone metadata estable para frontend admin:
  - `GET /api/admin/team/meta`
  - `GET /api/admin/team/members` como handshake compatible con la task
  - ambas respuestas incluyen `roleCategories`, `contactChannels` y `activeClients`
- Las validaciones de mutación se endurecieron desde el inicio:
  - duplicados de email se revisan contra `team_members` y `client_users`
  - no se crean assignments sobre tenants inactivos
  - si existe un assignment histórico para la misma combinación `clientId + memberId`, el backend lo reactiva en vez de duplicar la relación

### First production release

- `main` fue promovida por fast-forward desde `develop` y Greenhouse queda lanzado formalmente en producción.
- Deployment productivo validado:
  - commit release: `361d36e`
  - deployment: `dpl_7LZ3GcuYRp5oKubke42u8mvJuF2E`
  - URL: `https://greenhouse-ld2p73cqt-efeonce-7670142f.vercel.app`
  - dominio final: `https://greenhouse.efeoncepro.com`
- Smoke real en producción:
  - `/login`: correcto
  - `/api/people` sin sesión: `Unauthorized`
  - login real con `humberly.henriquez@efeonce.org`: correcto
  - `/api/auth/session`: correcto
  - `/api/people`: correcto
  - `/api/hr/payroll/periods`: `200 OK`

### People unified frontend

- Se implemento el frontend completo de `People Unified View v2` con 18 archivos nuevos.
- Lista `/people`: stats row (4 cards), filtros (rol, pais, estado, busqueda), tabla TanStack con avatar, cargo, pais, FTE, estado.
- Ficha `/people/[memberId]`: layout 2 columnas, sidebar izquierdo (avatar, contacto, metricas, integraciones), tabs dinamicos por rol.
- Tabs implementados: Asignaciones (read-only), Actividad (KPIs + breakdown), Compensacion (desglose vigente), Nomina (chart + tabla).
- Sidebar navigation: seccion "Equipo > Personas" visible por `roleCodes` (`efeonce_admin`, `efeonce_operations`, `hr_payroll`).
- Ghost slot en tab Asignaciones preparado para futuro Admin Team CRUD.

### People unified backend foundation

- Se implemento la primera capa backend read-only de `People Unified View v2` con dos rutas nuevas:
  - `GET /api/people`
  - `GET /api/people/[memberId]`
- Se agrego `src/types/people.ts` como contrato base para lista y ficha de persona.
- El contrato de detalle ya incluye metadata util para frontend sin recalculo cliente:
  - `access.visibleTabs`
  - `access.canViewAssignments`
  - `access.canViewActivity`
  - `access.canViewCompensation`
  - `access.canViewPayroll`
  - `summary.activeAssignments`
  - `summary.totalFte`
  - `summary.totalHoursMonth`
- Se agrego `src/lib/people/permissions.ts` como helper reusable para calcular visibilidad real de tabs segun roles.
- La nueva capa `src/lib/people/*` consolida:
  - roster y assignments desde `team_members` + `client_team_assignments`
  - integraciones desde `identity_profile_source_links`
  - actividad operativa desde `notion_ops.tareas`
  - compensacion y nomina desde payroll
- El match operativo del detalle de persona quedo endurecido:
  - sigue priorizando `notion_user_id`
  - ahora tambien reutiliza señales canonicas desde `identity_profile_source_links` para mejorar el fallback de actividad cuando falta o cambia el enlace principal
- `src/lib/tenant/authorization.ts` ahora expone `requirePeopleTenantContext()` y fija el acceso real del modulo a:
  - `efeonce_admin`
  - `efeonce_operations`
  - `hr_payroll`
- Queda ratificada la regla de arquitectura para evitar retrabajo:
  - `People` es lectura consolidada
  - el futuro CRUD de equipo no debe vivir bajo `/api/people/*`, sino bajo `/api/admin/team/*`

### People unified module integration

- El frontend y backend de `People` ya quedaron integrados y el modulo completo compila dentro del repo:
  - `/people`
  - `/people/[memberId]`
  - `/api/people`
  - `/api/people/[memberId]`
- La UI de detalle ya no recalcula permisos ni resumen localmente cuando el backend ya entrega esos datos:
  - `PersonTabs` usa `detail.access.visibleTabs`
  - `PersonLeftSidebar` usa `detail.summary`
- La navegacion interna ya expone `Personas` en el sidebar mediante `GH_PEOPLE_NAV`.
- El modulo ya fue publicado en preview desde `feature/hr-payroll`:
  - commit `a52c682`
  - preview `Ready`: `https://greenhouse-79pl7kuct-efeonce-7670142f.vercel.app`
  - branch alias: `https://greenhouse-eo-git-feature-hr-payroll-efeonce-7670142f.vercel.app`
- Smoke de preview sin sesion:
  - `/login` responde correctamente
  - `/api/people` y `/api/people/[memberId]` devuelven `Unauthorized`
  - `/people` redirige a `/login`
- QA autenticado real ya ejecutado por rol:
  - `efeonce_operations`: login correcto y acceso correcto a `/api/people` y `/api/people/[memberId]`
  - `efeonce_account`: login correcto pero `/api/people` responde `403 Forbidden`
  - `hr_payroll`: `Humberly Henriquez` fue provisionada con el rol y el preview ya la reconoce con `routeGroups ['hr','internal']`
  - `GET /api/hr/payroll/periods` con sesión `hr_payroll`: `200 OK`
- `pre-greenhouse.efeoncepro.com` fue re-asignado al deployment vigente de `feature/hr-payroll` (`greenhouse-79pl7kuct-efeonce-7670142f.vercel.app`) para QA compartido del modulo `People`.
- El módulo ya quedó integrado en `develop` y validado en `staging`:
  - merge `ad63aa5`
  - `dev-greenhouse.efeoncepro.com` ya apunta al deployment `dpl_EJqoBLEUZhqZiyWjpyJrh9PRWpHq`
  - smoke autenticado en `staging`: correcto para `People` y `HR Payroll`

### People unified view task alignment

- Se agrego `docs/tasks/complete/CODEX_TASK_People_Unified_View_v2.md` como brief corregido y ejecutable para `People`, alineado al runtime real del repo.
- La nueva version elimina supuestos incorrectos del brief anterior:
  - no depende de `/admin/team` ni de `/api/admin/team/*`
  - no introduce un route group `people` inexistente
  - mapea permisos al auth real (`efeonce_admin`, `efeonce_operations`, `hr_payroll`)
  - reutiliza `location_country` en lugar de proponer una columna redundante `country`
- `docs/tasks/README.md` ya indexa la nueva task como referencia operativa.

### HR payroll backend hardening

- El backend de `HR Payroll` ya quedó operativo y validado con `pnpm build`, incluyendo las rutas `/api/hr/payroll/**` dentro del artefacto de producción.
- Se endureció la capa server-side de payroll para evitar estados inconsistentes:
  - validación estricta de números y fechas en compensaciones, períodos y edición de entries
  - bloqueo de actualización de `payroll_periods` cuando el período ya no está en `draft`
  - validación final de reglas de bono antes de aprobar una nómina
- `compensation_versions` ahora inserta nuevas versiones sin solapes de vigencia y mantiene `is_current` coherente cuando existe una versión futura programada, reduciendo riesgo de cálculos históricos o programados inconsistentes.
- La auditoría de creación de compensaciones ya prioriza el email de sesión y no solo el `userId` interno cuando el actor está autenticado.
- El smoke runtime contra BigQuery real ya quedó ejecutado:
  - `notion_ops.tareas` confirmó los campos productivos usados por payroll (`responsables_ids`, `rpa`, `estado`, `last_edited_time`, `fecha_de_completado`, `fecha_límite`)
  - el bootstrap `greenhouse_hr_payroll_v1.sql` ya fue aplicado en `efeonce-group.greenhouse`
  - existen en BigQuery real las tablas `compensation_versions`, `payroll_periods`, `payroll_entries`, `payroll_bonus_config` y el rol `hr_payroll`
- `fetch-kpis-for-period.ts` quedó corregido para soportar columnas acentuadas reales del dataset y el DDL de payroll se ajustó para no depender de `DEFAULT` literales incompatibles en este bootstrap de BigQuery.
- Se agregó el runbook [docs/operations/HR_PAYROLL_BRANCH_RESCUE_RUNBOOK_V1.md](docs/operations/HR_PAYROLL_BRANCH_RESCUE_RUNBOOK_V1.md) para rescatar y reubicar trabajo no committeado de payroll en una rama propia sin usar un flujo riesgoso de `stash -> develop -> apply`.

### GitHub collaboration hygiene

- El repo ahora incorpora `.github/` con una capa minima de colaboracion y mantenimiento:
  - `workflows/ci.yml`
  - `PULL_REQUEST_TEMPLATE.md`
  - `ISSUE_TEMPLATE/*`
  - `dependabot.yml`
  - `CODEOWNERS`
- Se agregaron `.github/SECURITY.md` y `.github/SUPPORT.md` para separar reporte de vulnerabilidades del soporte operativo normal.
- `README.md` y `CONTRIBUTING.md` ahora explicitan el flujo GitHub real del proyecto: PRs, CI, templates y soporte.
- `.gitignore` ya no marca `full-version/` como ignorado, evitando contradiccion con el hecho de que hoy esa referencia si esta versionada en el workspace.
- Se elimino la copia accidental `scripts/mint-local-admin-jwt (1).js` para limpiar higiene del repo.

### Markdown documentation reorganization

- La raiz del repo ahora queda reservada para onboarding GitHub y continuidad operativa: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md` y `changelog.md`.
- Se movieron specs, roadmap, guides y `CODEX_TASK_*` a `docs/` bajo una taxonomia estable:
  - `docs/architecture/`
  - `docs/api/`
  - `docs/ui/`
  - `docs/roadmap/`
  - `docs/operations/`
  - `docs/tasks/`
- Se agregaron `docs/README.md` y `docs/tasks/README.md` como indices navegables.
- `README.md`, `AGENTS.md` y `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` ahora explicitan el layout documental nuevo.

### Agency spaces data hydration and avatars

- `src/lib/agency/agency-queries.ts` dejo de filtrar `greenhouse.clients` por una columna inexistente (`tenant_type`) y ahora arma el inventario agency desde clientes activos reales.
- La salud de spaces ahora combina proyectos Notion, scopes de usuario y staffing Greenhouse para que `/agency/spaces` y la tabla de `/agency` no queden casi vacias cuando un space tiene poca senal operativa en `notion_ops`.
- `SpaceCard` y `SpaceHealthTable` ahora muestran contexto complementario por space: proyectos, personas asignadas, FTE y usuarios, manteniendo los KPI operativos visibles sin inventar datos.
- `getAgencyCapacity()` ahora trae `avatar_url`, `role_category` y breakdown por space desde `greenhouse.team_members` + `greenhouse.client_team_assignments`.
- `/agency/capacity` ya reutiliza `TeamAvatar`, por lo que el equipo Efeonce vuelve a mostrar fotos reales en lugar de solo iniciales.
- Validacion cerrada:
  - `pnpm exec eslint src/lib/agency/agency-queries.ts src/components/agency/CapacityOverview.tsx src/components/agency/SpaceCard.tsx src/components/agency/SpaceHealthTable.tsx`
  - `pnpm build`
  - consulta runtime real a BigQuery: `space-efeonce` vuelve con `57` proyectos, `7` personas y `7` FTE; capacidad devuelve `avatarUrl` reales para el roster.

## 2026-03-13

### Agency operator layer

- Se integro la primera capa agency sobre `develop` con rutas autenticadas para lectura global interna:
  - `/agency`
  - `/agency/spaces`
  - `/agency/capacity`
- Se agregaron endpoints dedicados:
  - `GET /api/agency/pulse`
  - `GET /api/agency/spaces`
  - `GET /api/agency/capacity`
- `VerticalMenu` ahora muestra una seccion `Agencia` para usuarios con acceso `internal/admin`, sin afectar login, settings ni Google SSO.
- `src/lib/agency/agency-queries.ts` ya resuelve KPIs, salud de spaces y capacidad global desde BigQuery reutilizando `greenhouse.clients`, `greenhouse.client_service_modules`, `greenhouse.team_members`, `greenhouse.client_team_assignments` y `notion_ops`.
- La integracion sobre `develop` se valido con `pnpm exec eslint` y `pnpm build` despues de corregir errores menores de estilo que venian en la rama original.

### Pulse team view correction

- `Pulse` dejo de usar la lectura de `team/capacity` como base de la card principal y ahora renderiza la Vista 1 del task desde roster asignado (`getTeamMembers`).
- `src/components/greenhouse/TeamCapacitySection.tsx` se rehizo como `Tu equipo asignado`: lista compacta de personas con avatar, nombre, cargo, canal de contacto, FTE y ghost slot final.
- La zona derecha del bloque ahora muestra solo resumen contractual visible: FTE total, horas mensuales, linea de servicio y modalidad.
- El dashboard cliente y el `view-as` admin hidratan esta seccion server-side, eliminando el error de `Pulse` cuando la vista no podia resolver carga operativa desde un fetch cliente.
- Validacion ejecutada: `pnpm lint` y `pnpm build`.

### Team capacity views closeout

- Se ejecuto `docs/tasks/complete/CODEX_TASK_Fix_Team_Capacity_Views.md` en la rama paralela `fix/team-capacity-views-vuexy`, priorizando composicion con primitives activas de Vuexy/MUI ya presentes en el repo.
- `src/components/greenhouse/TeamCapacitySection.tsx` ahora distingue entre capacidad contractual y metricas operativas reales: si BigQuery no trae columnas operativas, ya no inventa breakdowns por persona ni chips de actividad.
- `Pulse` gano un resumen lateral mas ejecutivo con `HorizontalWithSubtitle`, barra de utilizacion contextual y una lectura contractual mas clara para cada miembro.
- Se agrego `TeamExpansionGhostCard` como primitive reusable para el CTA de ampliacion del equipo y se reutilizo tanto en `Pulse` como en `Mi Greenhouse`.
- La iteracion visual siguiente compacto `Pulse` aun mas hacia el layout del task: lista vertical densa por persona, ghost slot tipo fila, columna derecha sin estiramiento artificial y CTA de capacidad menos agresivo.
- La ronda quedo validada con `pnpm lint` y `pnpm build`.

### Google SSO foundation

- El login ahora soporta Google OAuth (`next-auth/providers/google`) ademas de Microsoft y credenciales, manteniendo `greenhouse.client_users` como principal canonico del portal.
- `src/lib/tenant/access.ts` ahora puede resolver y enlazar identidad Google (`google_sub`, `google_email`) y reusa el mismo criterio de elegibilidad SSO para cuentas `active` o `invited`.
- `/login` ahora muestra un CTA secundario `Entrar con Google` y `/settings` expone el estado de vinculacion de Microsoft y Google desde la misma card de identidad.
- `scripts/setup-bigquery.sql`, `.env.example`, `.env.local.example` y `README.md` ya documentan las columnas nuevas y las variables `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- El delta ya fue aplicado en infraestructura real:
  - BigQuery: `greenhouse.client_users` ahora tiene `google_sub` y `google_email`
  - GCP: existe el OAuth client `greenhouse-portal`
  - Vercel: `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` quedaron cargados en `Development`, `staging`, `Production`, `Preview (develop)` y `Preview (feature/google-sso)`
  - Preview validado del branch: `greenhouse-eo-git-feature-google-sso-efeonce-7670142f.vercel.app`
- Regla operativa ratificada: `allowed_email_domains` no auto-crea principals durante Google SSO; solo sirve como pista operativa de provisioning cuando no existe un `client_user` explicito.

### Google SSO safe develop preview

- Se preparo una rama merge-safe sobre la punta real de `develop`: `fix/google-sso-develop-safe`.
- El delta seguro contra `develop` se limito a auth/login/settings, setup SQL, env examples y documentacion; no entra ningun archivo del rediseño de team.
- Vercel ya tiene un bloque dedicado `Preview (fix/google-sso-develop-safe)` con `GCP_PROJECT`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.
- `pre-greenhouse.efeoncepro.com` se re-apunto al deployment `greenhouse-eo-git-fix-google-sso-develop-safe-efeonce-7670142f.vercel.app`.
- Validacion remota cerrada:
  - `/api/auth/providers` en el branch safe y en `pre-greenhouse` devuelve `azure-ad`, `google` y `credentials`
  - `/login` en `pre-greenhouse` ya renderiza `Entrar con Google`

### Promote and deploy closeout

- La rama `fix/internal-nav-nomenclature-hydration` ya fue promovida a `develop` y luego a `main`.
- `pre-greenhouse.efeoncepro.com` fue re-apuntado manualmente al preview nuevo del branch despues de corregir el bloqueo de Preview por archivos duplicados `* (1).ts(x)`.
- `dev-greenhouse.efeoncepro.com` quedo actualizado sobre el deployment de `staging` generado desde `develop`.
- `greenhouse.efeoncepro.com` quedo actualizado sobre el deployment productivo generado desde `main`.

### Canonical team identity hardening

- `greenhouse.team_members` ahora queda enlazada a una identidad Greenhouse canonica via `identity_profile_id`, con `email_aliases` para resolver casos multi-dominio como `@efeonce.org` y `@efeoncepro.com`.
- `scripts/setup-team-tables.sql` ya no solo siembra roster y assignments: ahora tambien reconcilia perfiles y source links en `greenhouse.identity_profiles` e `identity_profile_source_links`.
- Julio dejo de quedar partido en dos perfiles activos: el perfil HubSpot legado se archiva y el roster apunta a un solo perfil canonico con links a `greenhouse_auth`, `azure_ad`, `hubspot_crm`, `notion` y `greenhouse_team`.
- El runtime de `src/lib/team-queries.ts` ya trata `greenhouse_auth` como principal interno y no como provider Microsoft; el resumen de providers queda listo para crecer a `Google`, `Deel` u otras fuentes futuras.
- Las 4 vistas live del task (`Mi Greenhouse`, `Pulse`, `Proyectos/[id]`, `Sprints/[id]`) tuvieron una pasada visual adicional para usar mejor `ExecutiveCardShell`, resumenes KPI y badges de identidad.

### Team profile taxonomy

- `greenhouse.team_members` ahora soporta una capa de perfil mas rica con nombre estructurado, taxonomia interna de rol/profesion, contacto laboral, ubicacion, trayectoria y bio profesional.
- Se agregaron `greenhouse.team_role_catalog` y `greenhouse.team_profession_catalog` como catalogos base para matching de talento y staffing por oficio, no solo por cargo visible.
- El seed actual ya asigna `org_role_id`, `profession_id`, `seniority_level`, `employment_type`, bio profesional e idiomas para el roster inicial sin inventar edad, telefono o ubicacion cuando no estaban confirmados.
- `/api/team/members` y el dossier visual ahora exponen y usan datos derivados como `ageYears`, `tenureEfeonceMonths`, `tenureClientMonths` y `profileCompletenessPercent`.
- El modelo canonico ya queda listo para enlazar mas adelante providers adicionales como `Frame.io` o `Adobe` via `identity_profile_source_links`, sin meterlos aun al runtime visible.

### Team identity and capacity runtime

- Se agregaron APIs dedicadas para equipo y capacidad en `/api/team/members`, `/api/team/capacity`, `/api/team/by-project/[projectId]` y `/api/team/by-sprint/[sprintId]`.
- `Mi Greenhouse`, `Pulse`, `Proyectos/[id]` y la nueva ruta `/sprints/[id]` ya consumen superficies dedicadas de equipo/capacidad en lugar de depender solo del override legacy del dashboard.
- `scripts/setup-team-tables.sql` ya no es solo DDL base: quedo como bootstrap idempotente via `MERGE` para `greenhouse.team_members` y `greenhouse.client_team_assignments`.
- El bootstrap ya fue aplicado en BigQuery real con `7` team members y `10` assignments seed para `space-efeonce` y `hubspot-company-30825221458`.
- La implementacion se alineo al schema real de `notion_ops.tareas` detectado en BigQuery: `responsables`, `responsables_ids`, `responsables_names` y `responsable_texto`, no a columnas ficticias `responsable_*`.
- La validacion final del repo para esta ronda ya quedo corrida con `pnpm lint` y `pnpm build`.

### Team identity task closeout

- La Vista 1 del task dejo de mostrar FTE individual dentro de cada card de persona para respetar el contrato del dossier.
- La Vista 3 se rehizo al patron pedido por el task: `AvatarGroup` compacto arriba y detalle expandible tabular por persona debajo.
- Se agregaron primitives visuales nuevas `TeamSignalChip` y `TeamProgressBar` para que los semaforos del modulo usen `GH_COLORS.semaphore` en vez de depender solo de los colores genericos de MUI.
- Los textos visibles que seguian hardcodeados en las 4 vistas del modulo se movieron a `GH_TEAM` / `GH_MESSAGES`.
- El documento `docs/tasks/complete/CODEX_TASK_Team_Identity_Capacity_System.md` se alineo al contrato real de BigQuery y al repo correcto del pipeline (`notion-bigquery`).

### Tenant and user identity media

- Los placeholders de logo/foto en admin e internal ahora ya pueden persistir imagen real para spaces y usuarios.
- Se agregaron uploads autenticados server-side para:
  - `POST /api/admin/tenants/[id]/logo`
  - `POST /api/admin/users/[id]/avatar`
- Se agregaron proxies autenticados de lectura para no exponer buckets publicos:
  - `GET /api/media/tenants/[id]/logo`
  - `GET /api/media/users/[id]/avatar`
- La persistencia queda repartida entre:
  - `greenhouse.clients.logo_url` para logos de space/tenant
  - `greenhouse.client_users.avatar_url` para fotos de usuario
- El runtime ya refleja esas imagenes en detalle de tenant, detalle de usuario, listados admin, tabla interna de control tower, tabla de usuarios por tenant y dropdown de sesion.
- `tsconfig.json` ahora excluye archivos duplicados `* (1).ts(x)` para que previews de Vercel no queden bloqueadas por copias accidentales del workspace.

### Branding SVG rollout

- El shell autenticado y el favicon ahora consumen isotipos/wordmarks SVG oficiales de Efeonce en lugar del `avatar.png` heredado.
- Las business lines visibles del producto (`Globe`, `Reach`, `Wave`) ya pueden renderizar logos oficiales desde una capa reusable en `src/components/greenhouse/brand-assets.ts`.
- Los wordmarks de `Globe`, `Reach`, `Wave` y `Efeonce` ahora tambien viven en hero cliente, footers, tablas/capabilities internas y pantallas admin donde antes solo aparecia texto plano.

### Nomenclature boundary correction

- `src/config/greenhouse-nomenclature.ts` ya no mezcla la navegacion cliente del documento con labels de `internal/admin`; ahora separa `GH_CLIENT_NAV` y `GH_INTERNAL_NAV`.
- `VerticalMenu` ahora respeta la distribucion del documento para cliente: `Pulse`, `Proyectos`, `Ciclos`, `Mi Greenhouse` en ese orden y sin secciones artificiales intermedias.
- Las superficies `internal/admin` conservan su propia nomenclatura operativa (`Dashboard`, `Admin Tenants`, `Admin Users`, `Roles & Permissions`) sin sobrerrepresentarse como parte del contrato de `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`.

### Preview auth hardening

- `src/lib/bigquery.ts` ahora soporta `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` como fallback para Preview, ademas de tolerar mas shapes serializados del JSON crudo antes de abortar el login server-side.
- Queda ratificado que una Preview con login roto debe validarse contra alias actual y secretos serializados del branch, no solo contra `GOOGLE_APPLICATION_CREDENTIALS_JSON` plano.

### Vercel operations skill

- El repo ahora versiona `.codex/skills/vercel-operations/` como skill local para operar Vercel con criterio consistente.
- La skill documenta el uso de CLI para `link`, `logs`, `inspect`, `env`, `promote`, `rollback`, dominios protegidos y bypass de deployment protection.
- Tambien deja trazado el mapa operativo propio de Greenhouse en Vercel: `main` -> `Production`, `develop` -> `Staging`, ramas `feature/*`/`fix/*`/`hotfix/*` -> `Preview`, y el rol especial de `pre-greenhouse.efeoncepro.com`.

### Internal/admin branding lock and nav hydration

- El shell autenticado ahora recibe la sesion inicial en `SessionProvider`, evitando que `/internal/**` y `/admin/**` arranquen con el menu cliente y luego muten a labels legacy al hidratar.
- `VerticalMenu` y `UserDropdown` ya no hardcodean labels legacy, pero la nomenclatura cliente e internal/admin queda separada en contratos distintos dentro de `src/config/greenhouse-nomenclature.ts`.
- El runtime de settings ya no respeta `primaryColor`, `skin` ni `semiDark` legacy guardados en cookie cuando contradicen el branding Greenhouse; se preservan solo preferencias seguras como `mode`, `layout` y widths.
- `getSettingsFromCookie()` ahora sanea cookies invalidas o viejas antes de renderizar, reduciendo escapes de color/skin basicos de Vuexy entre SSR e hidratacion.

### Greenhouse nomenclature portal v3 rollout

- Se agrego `src/config/greenhouse-nomenclature.ts` como fuente unica de copy y tokens visibles del portal cliente, consolidando `GH_CLIENT_NAV`, `GH_LABELS`, `GH_TEAM`, `GH_MESSAGES` y `GH_COLORS`.
- La navegacion cliente ahora expone `Pulse`, `Proyectos`, `Ciclos` y `Mi Greenhouse`, incluyendo subtitulos en el sidebar vertical cuando el nav no esta colapsado.
- `/login`, `/dashboard`, `/proyectos`, `/sprints`, `/settings`, footers y dropdown de usuario ya consumen la nueva nomenclatura centralizada en lugar de labels legacy repartidos.
- Se saco una primera capa de hex hardcodeados de la UI cliente, especialmente en helpers del dashboard y en el modulo de equipo/capacidad.
- Quedo explicitado el boundary de theming: Greenhouse mantiene el sistema de tema oficial de Vuexy y no debe reemplazarlo con un theme custom paralelo.
- El branding del documento ya quedo conectado al runtime real del starter kit:
  - `primaryColorConfig` ahora usa `efeonce-core`
  - `mergedTheme.ts` ya inyecta la paleta Efeonce y la tipografia `DM Sans` + `Poppins`
  - `src/app/layout.tsx` ya carga esas fonts y `src/styles/greenhouse-sidebar.css`
- El sidebar vertical ahora usa fondo `Midnight Navy`, logo negativo y estados activos/hover alineados a la paleta Efeonce sin tocar `src/@core/**`.
- La capa cliente activa ya no deja el dashboard a medio camino de la nomenclatura:
  - `GreenhouseDashboard` movio subtitulos, empty states y chart copy a `GH_MESSAGES`
  - `ClientPortfolioHealthAccordion`, `ClientAttentionProjectsAccordion` y `ClientEcosystemSection` dejaron de hardcodear copy visible
  - `chart-options.ts` ya usa labels/totals/goals centralizados y colores Greenhouse para la donut cliente

### Creative Hub capability consolidation

- `Creative Hub` ya funciona como el primer modulo enriquecido del runtime declarativo de capabilities, agregando `Review pipeline` y `Review hotspots` sobre la misma snapshot cacheada de BigQuery.
- `CapabilityModuleData` ahora expone `cardData` keyed por `card.id`, y `src/components/capabilities/CapabilityCard.tsx` renderiza cada card desde su propio payload en lugar de depender de arrays globales del modulo.
- El card catalog activo del runtime se amplio con `metric-list` y `chart-bar`, manteniendo compatibilidad con `metric`, `project-list`, `tooling-list` y `quality-list`.
- La iteracion visual siguiente ya quedo aplicada sobre `Creative Hub` usando patrones Vuexy concretos de `full-version`: hero tipo `WebsiteAnalyticsSlider`, KPI cards con `HorizontalWithSubtitle`, quality card tipo `SupportTracker` y listas ejecutivas mas cercanas a `SourceVisits`.

### Capabilities declarative card layer

- `/capabilities/[moduleId]` ya renderiza sus bloques desde `data.module.cards` y no desde una composicion fija en la vista.
- Se agregaron `src/components/capabilities/CapabilityCard.tsx` y `src/components/capabilities/ModuleLayout.tsx` para despachar los card types activos del registry actual.
- `src/views/greenhouse/GreenhouseCapabilityModule.tsx` quedo reducido al hero y al layout declarativo del modulo.

### Capabilities dedicated query builders

- `GET /api/capabilities/[moduleId]/data` ya no depende del payload completo de `/dashboard`; ahora resuelve cada modulo via `src/lib/capability-queries/*` con una snapshot BigQuery mas chica y cacheada por tenant.
- Se agregaron query builders dedicados para `creative-hub`, `crm-command-center`, `onboarding-center` y `web-delivery-lab`, manteniendo la UI actual pero separando la lectura ejecutiva por lens de capability.
- Se agrego `verifyCapabilityModuleAccess()` para centralizar el guard reusable de modulo y devolver `403` cuando un cliente intenta forzar un module existente pero no contratado.
- `scripts/mint-local-admin-jwt.js` ahora puede resolver `NEXTAUTH_SECRET` desde `.env.local` o `.env.production.local`, dejando el smoke de preview mas autonomo.

### Capabilities admin preview and smoke

- Se agrego `/admin/tenants/[id]/capability-preview/[moduleId]` como superficie de validacion autenticada para revisar cada capability con contexto real de tenant desde una sesion admin.
- `src/views/greenhouse/GreenhouseAdminTenantDashboardPreview.tsx` ahora expone accesos directos a los modules resueltos para el tenant y `get-capability-module-data` soporta fallback al registry solo para esta preview admin.
- Se extrajo el contenido editorial de capabilities a `src/lib/capabilities/module-content-builders.ts` para separar registry/data resolution de la narrativa visual por modulo.
- Se agregaron `scripts/mint-local-admin-jwt.js` y `scripts/run-capability-preview-smoke.ps1`; el smoke real ya valido dashboard preview y `creative-hub` con respuesta `200` y screenshots en local.
- `tsconfig.json` dejo de incluir validators historicos de `.next-local/build-*`, estabilizando `npx tsc -p tsconfig.json --noEmit` frente a caches viejos de Next.

### Capabilities runtime foundation

- Se ejecuto la primera version funcional de `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md` sobre el runtime vigente del portal, sin reintroducir el modelo legacy de resolver capabilities desde `greenhouse.clients`.
- Se agregaron `src/config/capability-registry.ts`, `src/lib/capabilities/resolve-capabilities.ts` y `src/lib/capabilities/get-capability-module-data.ts` para resolver modules a partir de `businessLines` y `serviceModules` ya presentes en la sesion.
- Se agregaron:
  - `GET /api/capabilities/resolve`
  - `GET /api/capabilities/[moduleId]/data`
  - `/capabilities/[moduleId]`
- El sidebar vertical ahora muestra una seccion dinamica `Servicios` con modules activos del tenant:
  - `Creative Hub`
  - `CRM Command`
  - `Onboarding Center`
  - `Web Delivery`
- La data inicial de cada capability module reutiliza el contrato server-side del dashboard actual para exponer hero, metric cards, projects in focus, tooling y quality signal mientras los query builders dedicados quedan para una iteracion posterior.

## 2026-03-12

### Microsoft SSO foundation

- El login ahora soporta Microsoft Entra ID (`azure-ad`) y credenciales en paralelo sobre `greenhouse.client_users`, manteniendo el payload rico de roles, scopes y route groups del runtime actual.
- `src/lib/tenant/access.ts` ahora puede resolver y enlazar identidad Microsoft (`microsoft_oid`, `microsoft_tenant_id`, `microsoft_email`) y registra `last_login_provider` junto con `last_login_at`.
- `/login` prioriza Microsoft como CTA principal, `/auth/access-denied` cubre el rechazo de cuentas no autorizadas y `/settings` muestra el estado de vinculacion de la cuenta Microsoft.
- Se agregaron `bigquery/greenhouse_microsoft_sso_v1.sql` y `scripts/setup-bigquery.sql`; la migracion aditiva de columnas SSO ya fue aplicada en BigQuery real sobre `greenhouse.client_users`.

### Internal control tower redesign

- `/internal/dashboard` ahora funciona como una landing operativa real para Efeonce: header compacto, copy en espanol, acciones rapidas y una tabla de control con filtros, busqueda, paginacion y row actions.
- La vista ahora deriva automaticamente estados `Activo`, `Onboarding`, `Requiere atencion` e `Inactivo` usando `createdAt`, `lastLoginAt`, `scopedProjects`, `pendingResetUsers` y `avgOnTimePct`.
- Se agregaron `loading.tsx` y helpers locales para el control tower interno, y el contrato server-side ahora expone senales adicionales por cliente para priorizacion y OTD global.
- `Crear space`, `Editar` y `Desactivar` quedaron visibles pero sin mutacion real porque el repo aun no implementa ese workflow admin.

### Client dashboard redesign

- `/dashboard` y `/admin/tenants/[id]/view-as/dashboard` ahora usan una lectura cliente en 3 zonas: hero + 4 KPI cards, grid de 4 charts y detalle operativo abajo del fold.
- Se retiraron de la vista cliente los bloques de cocina operativa mas internos, incluyendo la lectura previa de `capacity`, el inventario declarativo de tooling por modulo y varias cards redundantes de calidad/entrega.
- El dashboard ahora agrega `loading.tsx`, `EmptyState`, `SectionErrorBoundary`, cadencia semanal de entregas y `RpA` por proyecto desde el mismo contrato server-side de BigQuery.
- El CTA de ampliacion del equipo y de ecosistema quedo como modal de solicitud copiable; aun no existe en el repo una mutacion real para notificar a un owner o webhook.

### Admin tenant detail redesign

- `/admin/tenants/[id]` dejo de ser un scroll lineal y ahora usa un header compacto con KPIs, acciones rapidas y tabs de `Capabilities`, `Usuarios`, `CRM`, `Proyectos` y `Configuracion`.
- La vista admin del tenant ahora reutiliza patrones Vuexy de header, tabs y tablas paginadas sobre la data real de Greenhouse, sin tocar la logica de governance ni los endpoints existentes.
- Se agregaron empty states, error boundary local y `loading.tsx` para que la superficie admin no exponga errores crudos ni flashes vacios durante la carga.

### Agent operations cleanup

- `Handoff.md` se compactó para dejar solo estado operativo vigente y el historial detallado quedó archivado en `Handoff.archive.md`.
- `project_context.md` se depuró para eliminar estado transaccional de ramas y smokes puntuales, y para dejar consistente el inventario de librerías visuales activas.
- `AGENTS.md`, `README.md` y `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` ahora explicitan la separación entre snapshot operativo y archivo histórico.

### Internal identity foundation

- Se agrego `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md` para separar `auth principal` de `canonical identity` en usuarios internos Efeonce.
- Se versiono `bigquery/greenhouse_internal_identity_v1.sql` con:
  - `greenhouse.identity_profiles`
  - `greenhouse.identity_profile_source_links`
  - `greenhouse.client_users.identity_profile_id`
- Se agrego `scripts/backfill-internal-identity-profiles.ts` y se ejecuto sobre BigQuery real:
  - `2` auth principals internos Greenhouse enlazados a perfil canonico
  - `6` HubSpot owners internos sembrados como perfiles canonicos
  - `8` perfiles `EO-ID-*` creados
- `src/lib/ids/greenhouse-ids.ts` ahora deriva `EO-ID-*` para perfiles canonicos internos sin romper `EO-USR-*` para el principal de acceso.
- `/admin/users/[id]` ahora puede mostrar el `EO-ID` cuando el usuario tenga `identity_profile_id` enlazado.

### UI orchestration

- Se agrego `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md` como contrato canonico para seleccionar y promover patrones Vuexy/MUI en Greenhouse.
- Se agrego `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md` como primer catalogo curado de referencias `full-version` y primitives locales reutilizables.
- Se agrego `docs/ui/GREENHOUSE_UI_REQUEST_BRIEF_TEMPLATE.md` para normalizar solicitudes de UI que vengan de personas, Claude, Codex u otros agentes antes de implementar.
- Se dejo un skill local base en `C:/Users/jreye/.codex/skills/greenhouse-ui-orchestrator` para reutilizar este flujo fuera de la memoria del repo.
- El repo ahora versiona una copia del skill en `.codex/skills/greenhouse-ui-orchestrator/` para que tambien quede disponible en GitHub.

### Build and deploy hygiene

- `starter-kit` ahora excluye `full-version/` y `demo-configs/` del scope de TypeScript, ESLint y Vercel deploy para que el runtime productivo no arrastre codigo de referencia ni demos.

## 2026-03-11

### Admin

- `/admin/tenants/[id]` ya no se queda solo en lectura live de contactos CRM: ahora permite provisionar en lote los contactos HubSpot faltantes hacia `greenhouse.client_users`.
- El provisioning de contactos ahora es rerunnable y de reconciliacion:
  - crea usuarios `invited` nuevos cuando no existen
  - repara rol `client_executive` y scopes base cuando el usuario del mismo tenant ya existia por `user_id` o por `email`
  - detecta duplicados ambiguos dentro del mismo tenant y los devuelve como conflicto en lugar de dejarlos pasar como `already_exists`
- La tabla de contactos CRM ahora distingue `Ya existe`, `Falta provisionar` y `Sin email`, y expone feedback del resultado de la corrida admin.
- El smoke real sobre `hubspot-company-30825221458` detecto y corrigio un bug de BigQuery en el alta de usuarios nuevos:
  - `upsertClientUser` ahora envia `types` explicitos para parametros `STRING` cuando `jobTitle` u otros campos llegan como `null`
  - despues del fix, el contacto `136893943450` (`valeria.gutierrez@skyairline.com`) quedo provisionado con `status=invited`, `auth_mode=password_reset_pending`, rol `client_executive` y `1` scope base
  - una segunda corrida sobre el mismo contacto devolvio `reconciled`, confirmando idempotencia funcional
- El tenant de Sky (`hubspot-company-30825221458`) ya quedo completamente provisionado en produccion:
  - `tenantUserCount = 16`
  - `liveContactCount = 16`
  - `missingCount = 0`
  - la corrida bulk creo o reconcilio el resto de contactos CRM con email
- Se valido tambien la experiencia cliente productiva con la cuenta demo `client.portal@efeonce.com`: login correcto, sesion `client_executive` y `/dashboard` respondiendo `200`.
- Se implemento una via escalable para el provisioning admin:
  - la pantalla admin usa un snapshot firmado de los contactos live leidos al cargar el tenant
  - el backend limita cada request a `4` contactos para evitar corridas largas atadas a una sola conexion HTTP
  - la UI ejecuta batches secuenciales y agrega progreso y feedback consolidado
  - si el snapshot firmado no existe o expira, el backend conserva fallback a lectura live directa desde la Cloud Run
- Este cambio busca mantener el boundary por tenant y la frescura del source CRM, pero bajar el riesgo operacional de timeouts en corridas bulk.
- Smoke del modelo escalable:
  - `ANAM` (`hubspot-company-27776076692`) tenia `5` contactos pendientes
  - una request de `5` IDs devolvio `400` por sobrepasar el limite del endpoint
  - dos requests secuenciales (`4 + 1`) con snapshot firmado devolvieron `created`
  - verificacion final: `missingCount = 0`

### Integrations

- Se auditaron todas las ramas activas y de respaldo; el unico trabajo funcional no absorbido quedo fijado en `reconcile/merge-hubspot-provisioning` y el rescate documental cross-repo en `reconcile/docs-cross-repo-contract`.
- Se verifico que `greenhouse-eo` ya consume la integracion creada en `hubspot-bigquery` mediante el servicio `hubspot-greenhouse-integration`, incluyendo `GET /contract` y `GET /companies/{hubspotCompanyId}/contacts`.
- Se agrego `src/lib/integrations/hubspot-greenhouse-service.ts` como cliente server-side para el servicio dedicado `hubspot-greenhouse-integration`.
- `/admin/tenants/[id]` ahora muestra contexto CRM live desde HubSpot para `company profile` y `owner`, con `fetch` `no-store` y timeout defensivo.
- `/admin/tenants/[id]` ahora tambien consume `GET /companies/{hubspotCompanyId}/contacts` para mostrar los contactos CRM asociados al space y compararlos con los usuarios ya provisionados en Greenhouse.
- El modelo de latencia quedo documentado: `company` y `owner` pueden reflejar cambios de HubSpot con baja latencia al consultar bajo demanda; `capabilities` siguen siendo sync-based hasta incorporar eventos o webhooks.
- Se agrego `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` a `.env.example` y a la documentacion viva como override del endpoint de Cloud Run.

### Dashboard

- El hero ejecutivo del dashboard se simplifico para bajar densidad arriba del fold: menos copy, dos highlights clave, summary rectangular y badges condensados.
- Las mini cards derechas del top fold dejaron de heredar altura artificial del hero y ahora se apilan en una columna proporcionada en desktop.
- `CapacityOverviewCard` ahora soporta variantes `default` y `compact`, manteniendo la version completa como principal y dejando listo el patron multi-formato.
- Se mejoro el UX writing del top fold y de `Capacity` para hacer la lectura mas corta, directa y consistente.
- Se agregaron mejoras de accesibilidad en hero y capacity: landmarks, ids accesibles, listas semanticas y labels explicitos para barras de allocation.

### Validacion

- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Smoke local autenticado en `http://localhost:3100` con cuenta admin real: correcto
- `GET /admin/tenants/hubspot-company-30825221458`: `200`
- `POST /api/admin/tenants/hubspot-company-30825221458/contacts/provision`:
  - primer intento: detecto bug real de tipado `null` en BigQuery
  - segundo intento despues del fix: `created: 1`
  - tercer intento sobre el mismo contacto: `reconciled: 1`
- Produccion verificada despues de promover `develop` a `main`:
  - deployment productivo activo y aliases correctos
  - login admin productivo correcto
  - `GET /admin/tenants/hubspot-company-30825221458`: `200`
  - endpoint productivo de provisioning confirmado
  - corrida bulk productiva completada para Sky, con caveat de cierre prematuro de la conexion HTTP en corridas largas
- Smoke cliente productivo con `client.portal@efeonce.com`: correcto
- `lint` y chequeo de tipos del modelo escalable por batches: correctos
- `build` del worktree largo de Windows: bloqueado por limite de path/Turbopack fuera del alcance funcional del cambio
- Validacion visual local con login admin + `view-as` sobre `space-efeonce`: correcta
- Documento operativo `docs/ui/GREENHOUSE_DASHBOARD_UX_GAPS_V1.md` quedo reescrito con matriz de brechas, soluciones, seleccion y ejecucion final

## 2026-03-10

### Dashboard

- Se agrego `snapshot mode` para dashboards con historico corto, reemplazando charts grandes y vacios por una lectura ejecutiva compacta.
- Se extrajo `CapacityOverviewCard` como componente reusable y escalable para capacity/equipo asignado.
- Se agrego `layoutMode = snapshot | standard | rich` en el orquestador del dashboard para que la composicion se adapte a la densidad de datos del space.
- `CapacityOverviewCard` paso a una sola superficie con summary strip, roster responsive e insights compactos al pie.
- Los grids de KPI, focus, delivery, quality y tooling migraron a patrones mas fluidos con `minmax` para responder mejor al espacio disponible.

### Spaces

- Se definio el label visible `space` para superficies admin relacionadas con clientes, manteniendo `tenant` solo como termino interno.
- Se versiono `bigquery/greenhouse_efeonce_space_v1.sql` para sembrar `space-efeonce` como benchmark interno sobre el portfolio propio de Efeonce.
- El seed real aplicado en BigQuery deja a `space-efeonce` con 57 proyectos base y todos los business lines / service modules activos para validacion del MVP ejecutivo.

## 2026-03-09

### Infraestructura

- Se inicializo `starter-kit` como repositorio Git independiente y se publico en `https://github.com/efeoncepro/greenhouse-eo.git`.
- Se confirmo que `full-version` queda fuera del repo y no debe subirse.

### Deploy

- Se diagnostico un `404 NOT_FOUND` en Vercel.
- La causa fue configuracion incorrecta del proyecto en Vercel: `Framework Preset` estaba en `Other`.
- El despliegue quedo operativo al cambiar `Framework Preset` a `Next.js` y redeployar.
- Se conecto Vercel CLI al proyecto `greenhouse-eo`.
- Se confirmo el `Custom Environment` `staging` asociado a `develop`.
- Se cargaron `GCP_PROJECT` y `GOOGLE_APPLICATION_CREDENTIALS_JSON` en `Development`, `staging` y `Production`.

### Proyecto

- Se valido que el build local funciona con `npx pnpm build`.
- Se redefinio el shell principal del producto con rutas `/dashboard`, `/proyectos`, `/sprints`, `/settings` y `/login`.
- La ruta `/` ahora redirige a `/dashboard`.
- `/home` y `/about` quedaron como redirects de compatibilidad.
- Se reemplazaron menu, branding base, footer, logo, login y dropdown para reflejar Greenhouse en lugar de la demo de Vuexy.
- Se agrego `next-auth` con `CredentialsProvider`, proteccion base del dashboard, redirect de guest/authenticated y logout real.
- Se integraron assets reales de marca en la navegacion y se configuro el avatar temporal como favicon.
- Se agrego `@google-cloud/bigquery` al repo.
- Se implemento `src/lib/bigquery.ts` para acceso server-side a BigQuery.
- Se implemento `src/app/api/dashboard/kpis/route.ts` como primer endpoint real del portal.
- El dashboard principal ya consume datos reales de BigQuery para KPIs, estado de cartera y proyectos bajo observacion.
- El scope actual del tenant demo se controla con `DEMO_CLIENT_PROJECT_IDS` mientras se define la fuente multi-tenant real.
- Se creo el dataset `efeonce-group.greenhouse`.
- Se creo la tabla `greenhouse.clients` como base del modelo multi-tenant.
- Se cargo un tenant bootstrap `greenhouse-demo-client`.
- Se versiono el DDL en `bigquery/greenhouse_clients.sql`.
- Se agregaron `docs/architecture/MULTITENANT_ARCHITECTURE.md` y `docs/roadmap/BACKLOG.md` para dejar la arquitectura objetivo y el plan de avance.
- `next-auth` ya consulta `greenhouse.clients` para resolver el tenant por email.
- Se agrego `bcryptjs` para soportar `password_hash` reales cuando se carguen en la tabla.
- Se agrego actualizacion de `last_login_at` y helper reusable de tenant en runtime.
- Se implemento `src/app/api/projects/route.ts` como listado real de proyectos por tenant.
- La vista `/proyectos` ya consume datos reales de BigQuery con estados de carga y error.

### Documentacion Operativa

- Se agregaron `AGENTS.md`, `Handoff.md`, `changelog.md` y `project_context.md` para coordinacion multi-agente.
- Se definio la logica operativa de ramas, promotion flow y uso de ambientes `Development`, `Preview` y `Production` con Vercel.
- Se normalizo el encoding de `../Greenhouse_Portal_Spec_v1.md` para dejar la especificacion legible en UTF-8.
- Se alineo la documentacion interna del repo con la especificacion funcional del portal Greenhouse.
- Se reemplazo el `README.md` generico por documentacion real del proyecto Greenhouse.
- Se creo la rama `develop` y se dejo documentado el flujo `Preview -> Staging -> Production`.
- Se agrego `CONTRIBUTING.md` con el flujo de colaboracion y se reforzo `.gitignore` para secretos locales.

### Calidad de Repositorio

- Se agrego `.gitattributes` para fijar finales de linea `LF` en archivos de texto y reducir warnings recurrentes de `LF/CRLF` en Windows.
- Se verifico el staging de Git sin warnings de conversion despues de ajustar la politica local de `EOL`.
- Se reemplazaron scripts Unix `rm -rf` por utilidades cross-platform con Node.
- En local fuera de Vercel/CI, `build` paso a usar un `distDir` dinamico bajo `.next-local/` para evitar bloqueos recurrentes sobre `.next` y colisiones entre procesos.
- Se dejo explicitada la regla de no correr `git add/commit/push` en paralelo para evitar `index.lock`.

## 2026-03-10

### Proyecto

- Se implementaron `/api/projects/[id]` y `/api/projects/[id]/tasks` con autorizacion por tenant usando `getTenantContext()`.
- Se agrego `/proyectos/[id]` con header de KPIs, tabla de tareas, review pressure y sprint context si existe.
- La vista `/proyectos` ahora navega al detalle interno del portal en lugar de usar el CTA temporal al workspace fuente.
- Se agrego `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` como documento maestro de arquitectura, roadmap, roles, rutas, datos y trabajo paralelo multi-agente.
- Se agrego `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md` como diseno tecnico detallado de Fase 1 para usuarios, roles, scopes, session payload y migracion auth.
- Se versiono `bigquery/greenhouse_identity_access_v1.sql` con el schema propuesto para `client_users`, roles, role assignments y scopes.
- Se aplico en BigQuery el schema de identidad y acceso V1 y se seeded `client_users`, `roles`, `user_role_assignments` y `user_project_scopes`.
- `next-auth` ahora prioriza `greenhouse.client_users` con fallback a `greenhouse.clients` para no romper el runtime durante la migracion.
- La sesion JWT ahora expone `userId`, `tenantType`, `roleCodes`, `primaryRoleCode`, `projectScopes`, `campaignScopes` y mantiene alias legacy de compatibilidad.
- Se agrego `bigquery/greenhouse_hubspot_customer_bootstrap_v1.sql` para bootstrap real de tenants y usuarios cliente desde HubSpot.
- Se importaron 9 companias cliente con al menos un `closedwon` como tenants Greenhouse y se creo 1 contacto cliente invitado por empresa.
- Se agrego `src/lib/tenant/authorization.ts` y las APIs cliente ahora validan `tenantType`, `routeGroups` y acceso a proyecto antes de consultar datos.
- Se creo el usuario admin interno `julio.reyes@efeonce.org` en `greenhouse.client_users` con rol activo `efeonce_admin` y auth `credentials`.
- Se retiro el fallback operativo a `greenhouse.clients`; el runtime auth ahora depende solo de `greenhouse.client_users` y tablas de role/scope.
- Se migro el demo client a `credentials` con `password_hash` bcrypt y se elimino la dependencia normal de `env_demo`.
- Se agregaron `/auth/landing`, `/internal/dashboard`, `/admin` y `/admin/users` con guards server-side por route group.
- Se versiono `bigquery/greenhouse_project_scope_bootstrap_v1.sql` y se aplicaron scopes bootstrap para DDSoft, SSilva y Sky Airline.
- Se reordeno `docs/roadmap/BACKLOG.md` por fases y streams paralelos alineados al nuevo plan maestro.
- Se actualizaron `README.md`, `project_context.md`, `docs/architecture/MULTITENANT_ARCHITECTURE.md` y `Handoff.md` para tomar el nuevo plan como referencia.
- Se desactivo el usuario demo `client.portal@efeonce.com` y se dejo el login sin bloque demo.
- Se creo y activo el admin interno `julio.reyes@efeonce.org` con rol `efeonce_admin` y home `/internal/dashboard`.
- El login ahora muestra un error de UI amigable y ya no expone mensajes internos como `tenant registry`.
- Se corrigio un fallo real de `Preview` donde Vercel entregaba `GOOGLE_APPLICATION_CREDENTIALS_JSON` en formatos distintos; `src/lib/bigquery.ts` ahora soporta JSON minified y JSON legacy escapado.
- Se agregaron logs minimos en `src/lib/auth.ts` para distinguir lookup, estado de usuario y mismatch de password cuando falle auth en runtime.
- Se confirmo que `pre-greenhouse.efeoncepro.com` debe validarse siempre contra el deployment aliasado actual antes de diagnosticar login o UI vieja.
- Se implemento el primer slice real de Fase 2: `/dashboard` ahora es una vista ejecutiva con charts estilo Vuexy sobre throughput, salud on-time, mix operativo, mix de esfuerzo y proyectos bajo atencion.
- Se agregaron `/api/dashboard/summary`, `/api/dashboard/charts` y `/api/dashboard/risks` como contratos iniciales del dashboard ejecutivo.
- Se incorporo `apexcharts@3.49.0` y `react-apexcharts@1.4.1` para alinear el dashboard con el stack de charts de `full-version`.
- Se agregaron `src/libs/ApexCharts.tsx` y `src/libs/styles/AppReactApexCharts.tsx` siguiendo el wrapper visual de Vuexy para tooltips, tipografia y estilos MUI.
- `src/lib/dashboard/get-dashboard-overview.ts` ahora entrega KPIs ejecutivos, series de throughput, mixes operativos y ranking de proyectos bajo atencion a partir de BigQuery.
- Se detecto y corrigio un bug de agregacion en portfolio health donde `healthy_projects` y `projects_at_risk` se multiplicaban por el join con tareas.
- Se dejo documentado en el repo el orden correcto de referencia Vuexy: `full-version` primero y documentacion oficial despues, especialmente para `ApexCharts` y `AppReactApexCharts`.
- Se dejo documentada la distincion entre el JWT/ACL generico de Vuexy y el modelo real de seguridad de Greenhouse: JWT como transporte de sesion y autorizacion multi-tenant resuelta server-side con roles y scopes desde BigQuery.
- Se dejo documentada la estrategia para reutilizar `User Management` y `Roles & Permissions` de Vuexy en `/admin`, incluyendo el uso futuro de `overview`, `security` y `billing-plans` como base para `/admin/users/[id]` e invoices del cliente.
- Se implemento `/admin/users/[id]` sobre BigQuery reutilizando la estructura de `user/view/*` de Vuexy con tabs `overview`, `security` y `billing` reinterpretados para contexto, acceso y futuro billing real.
- `/admin/users` ahora enlaza al detalle del usuario por `userId`.
- Se confirmo y documento el uso de la documentacion oficial de Vuexy como segunda fuente despues de `full-version`: `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/`.
- Se definio `service modules` como nuevo eje formal de arquitectura para condicionar navegacion, charts y vistas por servicios contratados del cliente.
- Se valido sobre BigQuery que `hubspot_crm.deals.linea_de_servicio` y `hubspot_crm.deals.servicios_especificos` ya contienen la base comercial necesaria para ese modelo.
- Se agregaron `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md` y `bigquery/greenhouse_service_modules_v1.sql` como contrato y DDL inicial de esta capacidad.
- Se agrego `bigquery/greenhouse_service_module_bootstrap_v1.sql` y se aplico bootstrap inicial de modulos sobre clientes HubSpot cerrados.
- `greenhouse.service_modules` quedo con 9 registros y `greenhouse.client_service_modules` con 22 asignaciones activas.
- `next-auth`, `TenantAccessRecord` y `getTenantContext()` ahora exponen `businessLines` y `serviceModules` para composicion actual del dashboard y futura extension a navegacion y billing.
- Se agrego `docs/roadmap/PHASE_TASK_MATRIX.md` como resumen operativo de tareas pendientes por fase.
- `/dashboard` ahora usa `businessLines` y `serviceModules` en runtime para componer hero, cards de foco y copy segun el servicio contratado del tenant.
- La vista del dashboard se extrajo a una capa reusable propia en `src/views/greenhouse/dashboard/*` para reutilizar cards, badges, headings y configuracion de charts en futuras vistas Greenhouse.
- Se creo `src/components/greenhouse/*` como capa compartida del producto para headings, stat cards, chip groups y listas metricas reutilizables mas alla del dashboard.

### Calidad

- `npx pnpm lint`: correcto
- `npx pnpm build`: correcto
- Se promovio `feature/tenant-auth-bq` a `develop` y luego `develop` a `main`.
- `dev-greenhouse.efeoncepro.com` y `greenhouse.efeoncepro.com` quedaron actualizados al runtime de Fase 1.
- Se detecto que `staging` y `Production` tenian `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `NEXTAUTH_SECRET` mal cargados en Vercel.
- Se reescribieron esas variables en ambos ambientes y se redeployaron los deployments activos.
- Validacion final en `Production`:
  - `/login`: 200
  - `/api/auth/csrf`: 200
  - `POST /api/auth/callback/credentials` con `julio.reyes@efeonce.org`: 200
  - `/internal/dashboard`: correcto
  - `/admin/users`: correcto
- Smoke BigQuery de Fase 2:
  - scope bootstrap cliente `hubspot-company-30825221458`: correcto
  - helper `get-dashboard-overview` devolviendo KPIs, charts y proyectos bajo atencion: correcto

### Documentacion Operativa

- Se alinearon `README.md`, `docs/roadmap/BACKLOG.md` y `project_context.md` con el estado real de `feature/executive-dashboard-phase2`.
- Se retiro de esos artefactos el lenguaje que aun trataba auth y dashboard como trabajo futuro cuando ya existen en runtime.
- Se dejo explicitado que la siguiente promocion valida depende de revisar `Preview` antes de mergear a `develop`.
- Se verifico la alias de Preview de `feature/executive-dashboard-phase2` con `vercel inspect` y `vercel curl` sobre `/login`, `/api/auth/csrf`, `/dashboard` y `/admin/users`.
- Se agrego `/admin/tenants` y `/admin/tenants/[id]` como nuevo slice de governance y se actualizaron los artefactos vivos para reflejarlo.
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` y `docs/architecture/MULTITENANT_ARCHITECTURE.md` ahora explicitan que `tenant = client = company`, y que los usuarios son una relacion separada `1 tenant -> N users`.
- Se recupero la autenticacion local de GCP con `gcloud auth login --update-adc` para volver a validar BigQuery sin depender de secretos parseados a mano.
- Se documento `docs/ui/SKY_TENANT_EXECUTIVE_SLICE_V1.md` como iniciativa formal para Sky Airline.
- Quedo alineado en README, backlog, matriz, contexto, arquitectura y handoff que:
  - `on-time` mensual, tenure y entregables o ajustes por mes son factibles ahora para Sky
  - RpA mensual y `First-Time Right` siguen bloqueados por calidad de dato
  - equipo asignado, capacity, herramientas y AI tools requieren modelo nuevo antes de exponerse
- Se implemento el primer slice seguro de Sky en `/dashboard`.
- El dashboard ahora expone:
  - tenure de relacion desde primera actividad visible
  - `on-time` mensual agrupado por fecha de creacion
  - entregables visibles y ajustes cliente por mes
- Se mantuvo fuera de runtime:
  - RpA mensual
  - `First-Time Right`
  - equipo asignado
  - capacity
  - herramientas tecnologicas y AI tools
- Se hizo reusable y escalable el slice de Sky dentro del dashboard existente.
  - `getDashboardOverview()` ahora expone `accountTeam`, `tooling`, `qualitySignals`, `relationship` y `monthlyDelivery`.
  - Se agrego `src/lib/dashboard/tenant-dashboard-overrides.ts` para mezclar:
    - señal real de BigQuery
    - señales derivadas desde Notion
    - defaults por `serviceModules`
    - overrides controlados por tenant
  - Se crearon secciones reusables:
    - `DeliverySignalsSection`
    - `QualitySignalsSection`
    - `AccountTeamSection`
    - `ToolingSection`
  - Sky ya puede ver:
    - `on-time` mensual
    - tenure
    - entregables y ajustes por mes
    - account team y capacity inicial
    - herramientas tecnologicas
    - herramientas AI
    - `RpA` mensual y `First-Time Right` con origen explicito (`measured`, `seeded`, `unavailable`)
  - Validado con `npx pnpm lint` y `npx pnpm build`
- Se agrego la primera version de `Ver como cliente` para cuentas admin.
  - Nuevo CTA `Ver como cliente` en `GreenhouseAdminTenantDetail`.
  - Nueva ruta ` /admin/tenants/[id]/view-as/dashboard`.
  - La vista renderiza el dashboard real del tenant dentro de un preview admin con banner y retorno al detalle del tenant.
  - Validado con `npx pnpm lint` y `npx pnpm build`.
- Se agrego `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md` para fijar el sistema visual ejecutivo reusable del producto.
- Quedo alineado en README, arquitectura, backlog, matriz, contexto y handoff que el siguiente trabajo prioritario del dashboard es migrarlo a ese sistema reusable.
- Se fijo como regla que Vuexy analytics es referencia de jerarquia y composicion, no fuente para copiar branding, paleta ni semantica demo.
- `/dashboard` fue refactorizado hacia un layout ejecutivo Vuexy-aligned con hero reutilizable, mini stat cards, throughput overview, portfolio health y tabla compacta de proyectos bajo atencion.
- Se agrego `src/views/greenhouse/dashboard/orchestrator.ts` como capa deterministica para decidir el mix de bloques ejecutivos segun `serviceModules`, calidad de dato y capacidades disponibles.
- Se agregaron `ExecutiveCardShell`, `ExecutiveHeroCard` y `ExecutiveMiniStatCard` a `src/components/greenhouse/*` como primitives reusables para futuras superficies Greenhouse.
- Se fortalecio el skill local `greenhouse-vuexy-portal` para futuras decisiones UI/UX: ahora incluye una guia de seleccion de componentes Vuexy/MUI para avatars, card-statistics, theming, OptionMenu y orquestacion de dashboards.
- Se activaron `simple-icons` y `@iconify-json/logos` en `starter-kit` para reutilizar logos de marcas y herramientas sin depender de descargas manuales.
- Se agrego `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` para reducir duplicacion documental usando una fuente canonica por tema y deltas cortos en los documentos vivos.
- Se agrego `BrandLogo` como primitive reusable para tooling cards y se ampliaron los icon bundles de Vuexy con logos de marca curados.
- Se hizo operativo el switch de tema estilo Vuexy en Greenhouse: mejor integracion en navbar, labels localizados y reaccion en vivo al modo `system`.
- Se instalo en `starter-kit` la paridad de librerias UI de `full-version` para charts, calendars, tables, forms, editor, media, maps, toasts y drag/drop.

### 2026-03-11 - Capability governance and visual validation method

- Added `docs/ui/GREENHOUSE_VISUAL_VALIDATION_METHOD_V1.md` to formalize the local visual QA workflow used for authenticated dashboard checks and `view-as` tenant reviews.
- Extended the tenant admin detail flow so `getAdminTenantDetail()` returns the capability catalog/state for each tenant.
- Added `src/lib/admin/tenant-capability-types.ts` and `src/lib/admin/tenant-capabilities.ts` as the canonical contract and server layer for:
  - reading tenant capability state
  - manual admin assignments
  - HubSpot-derived capability sync
  - generic source-based capability sync
- Added admin routes:
  - `GET /api/admin/tenants/[id]/capabilities`
  - `PUT /api/admin/tenants/[id]/capabilities`
  - `POST /api/admin/tenants/[id]/capabilities/sync`
- Added `TenantCapabilityManager` into `/admin/tenants/[id]` so admin users can assign or sync business lines and service modules directly from the tenant screen.
- Confirmed the current service-modules initiative is structurally viable because the existing BigQuery model already separates:
  - canonical capability metadata in `greenhouse.service_modules`
  - tenant assignments in `greenhouse.client_service_modules`
  - external commercial source signals in HubSpot deals
- Quality checks:
  - `npx pnpm lint`
  - `npx pnpm build`

### 2026-03-11 - Public identifier strategy

- Added `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md` to define the separation between internal keys and product-facing public IDs.
- Added `src/lib/ids/greenhouse-ids.ts` with deterministic public ID builders for:
  - tenants/spaces
  - collaborators/users
  - business lines
  - service modules
  - capability assignments
  - role assignments
  - feature flag assignments
- Extended admin tenant and user data contracts so the UI can expose readable IDs without leaking raw `hubspot-company-*` or `user-hubspot-contact-*` prefixes.
- Updated admin tenant detail, user detail, tenant preview, and capability governance UI to surface the new public IDs and service IDs.
- Added `bigquery/greenhouse_public_ids_v1.sql` as the versioned migration to add and backfill nullable `public_id` columns in the core governance tables.

### 2026-03-11 - Capability governance UX and source correction

- Reworked `TenantCapabilityManager` so the governance surface is now a full-width admin section with compact summary tiles, shorter Spanish copy, stronger text hierarchy, and a manual-first interaction model.
- Rebalanced `/admin/tenants/[id]` so tenant identity, validation CTA, and governance appear in a clearer order instead of pushing the editor into a narrow left rail.
- Removed automatic capability derivation from HubSpot `closedwon` deals in `POST /api/admin/tenants/[id]/capabilities/sync`.
- The sync route now requires explicit `businessLines` or `serviceModules` in the payload and treats the source as company-level or external metadata only.

# 2026-03-25

- fix: `Agency > Campaigns` dejó de depender de un `spaceId` obligatorio para usuarios internos; `GET /api/campaigns` ahora expone listado cross-space para Agency y preserva `campaignScopes` cuando aplica.
- fix: `AgencyCampaignsView` ya no oculta fallas de carga como si fueran `0` campañas; ahora comunica error explícito cuando la API responde `non-OK`.
- test: se agregaron suites `Vitest` para `src/app/api/campaigns/route.ts` y `src/views/agency/AgencyCampaignsView.tsx`, además del lote combinado con `agency-queries`, para detectar temprano regresiones de contrato y de UI.

### 2026-03-11 - Generic integrations API

- Added `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` as the contract for external connectors.
- Added token-based integration auth via `GREENHOUSE_INTEGRATION_API_TOKEN`.
- Added generic routes under `/api/integrations/v1/*` so HubSpot, Notion, or any other connector can use the same surface:
  - `GET /api/integrations/v1/catalog/capabilities`
  - `GET /api/integrations/v1/tenants`
  - `POST /api/integrations/v1/tenants/capabilities/sync`
- The API is intentionally provider-neutral and resolves tenants by:
  - `clientId`
  - `publicId`
  - `sourceSystem` + `sourceObjectType` + `sourceObjectId`
- Current first-class source mapping is HubSpot company resolution through `hubspot_company_id`, but the contract is ready for additional systems.

### 2026-03-11 - Integrations API tenant listing fix

- Fixed `GET /api/integrations/v1/tenants` so BigQuery no longer receives untyped `NULL` params for `targetClientId` and `updatedSince`.
- The route now sends empty-string sentinels plus explicit BigQuery param types, avoiding the production `500` raised by `Parameter types must be provided for null values`.
- Validation:
  - `npx pnpm lint src/lib/integrations/greenhouse-integration.ts src/app/api/integrations/v1/tenants/route.ts`
  - `npx pnpm build`
- Deployed the fix to Production as `https://greenhouse-rd6xgomq7-efeonce-7670142f.vercel.app`.
- Post-deploy smoke outcome:
  - the `500` path is no longer the active failure mode
  - the production integration token currently configured for connectors still returns `401 Unauthorized` on `/api/integrations/v1/catalog/capabilities` and `/api/integrations/v1/tenants`
  - the remaining blocker is token/auth configuration, not the BigQuery null-parameter bug
- Rotated `GREENHOUSE_INTEGRATION_API_TOKEN` in Vercel Production and redeployed to `https://greenhouse-ojlumllrz-efeonce-7670142f.vercel.app`.
- Fixed the integration sync mutation path by adding explicit BigQuery param types in `src/lib/admin/tenant-capabilities.ts` for nullable merge params.
- Production verification after token rotation and redeploy:
  - `GET /api/integrations/v1/catalog/capabilities`: `200`
  - `GET /api/integrations/v1/tenants?limit=3`: `200`
  - `GET /api/integrations/v1/tenants?sourceSystem=hubspot_crm&sourceObjectType=company&sourceObjectId=30825221458`: `200`
  - `POST /api/integrations/v1/tenants/capabilities/sync`: no longer the active `500` blocker for the HubSpot bridge rollout

# 2026-03-13

- feat: se inicio la alineacion integral del portal a `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` con una capa canonica ampliada de copy en `src/config/greenhouse-nomenclature.ts` para cliente e `internal/admin`.
- feat: se agrego la ruta cliente `/updates` y su presencia en navegacion, footers y accesos secundarios del shell.
- feat: `Mi Greenhouse` ahora incorpora `Tu equipo de cuenta` como dossier relacional reutilizable y `Pulse` deja `Capacidad del equipo` como modulo operativo separado.
- feat: `Proyectos/[id]` y `Ciclos` fueron reescritos con microcopy Greenhouse, breadcrumbs cliente, estados vacios explicativos y modulos base del documento.
- feat: se extendio la canonizacion de copy operativa a `Control Tower`, tablas de usuarios, usuarios del space y detalle de usuario en `internal/admin`.
- feat: `admin/tenants/[id]`, `view-as/dashboard`, governance de capabilities y tabla de service modules ahora consumen copy operativa desde `GH_INTERNAL_MESSAGES` en lugar de labels dispersos.

# 2026-03-14

- chore: `pre-greenhouse.efeoncepro.com` fue re-asignado al preview `feature/hr-payroll` (`greenhouse-hpw9s8fkp-efeonce-7670142f.vercel.app`) para validar backend + UI del modulo HR Payroll en el dominio compartido de Preview.
- fix: el preview `feature/hr-payroll` dejo de romper el login por `credentials` antes de validar password; se corrigieron `GCP_PROJECT` y `NEXTAUTH_URL` en `Preview (feature/hr-payroll)`, se redeployo a `greenhouse-lc737eg28-efeonce-7670142f.vercel.app` y `pre-greenhouse` fue reasignado a ese deployment corregido.
- feat: se provisionaron 6 nuevos usuarios internos Efeonce en `greenhouse.client_users`, enlazados a `team_members` / `identity_profiles`, con roles `efeonce_account` o `efeonce_operations`, aliases internos `@efeonce.org` y smoke de login exitoso en `pre-greenhouse`.

# 2026-03-15

- fix: `HR > Permisos` ahora usa PostgreSQL como store operativo (`greenhouse_hr`) para metadata, saldos, solicitudes y revisión, enlazado a `greenhouse_core.client_users` y `greenhouse_core.members`.
- fix: `HR Core` dejó de ejecutar bootstraps `DDL` en request-time; `ensureHrCoreInfrastructure()` queda como bootstrap explícito y el runtime usa validación no mutante contra BigQuery.
- chore: se bootstrappeó una sola vez `HR Core` en BigQuery y se agregaron env vars de PostgreSQL al Preview de `fix/codex-operational-finance`.
- fix: `FinanceDashboardView` ya no presenta saldo total engañoso cuando no existen cuentas activas y ahora muestra movimientos recientes reales combinando ingresos y egresos.
- fix: `ReconciliationView` ahora expone movimientos pendientes por conciliar aunque no existan períodos abiertos y comunica explícitamente cuando el bloqueo operativo es ausencia de cuentas activas o de períodos.

# 2026-03-15

- Fix: corrected the AI Tooling bootstrap seed so `ensureAiToolingInfrastructure()` no longer fails when a seeded tool omits optional params like `subscriptionAmount`, restoring the admin catalog/licenses/wallets/meta routes in preview.

# 2026-03-31

- fix: `Finance > Expenses > Registrar egreso` ahora carga el selector de `Proveedor` desde el mismo source of truth Postgres-first que `Finance > Suppliers`; se elimina el drift donde el drawer seguía leyendo `greenhouse.fin_suppliers` en BigQuery y mostraba un catálogo distinto al del directorio principal.
- fix: `HR > Permisos` en staging dejó de caerse por schema drift después de `TASK-173`; se aplicó en Cloud SQL la foundation shared mínima para `leave` (`greenhouse_core.assets`, `greenhouse_core.asset_access_log` y `greenhouse_hr.leave_requests.attachment_asset_id`), restaurando la carga de solicitudes en `dev-greenhouse.efeoncepro.com/hr/leave`.
- fix: `src/lib/hr-core/service.ts` ahora considera `undefined_column` / `relation does not exist` (`42703` / `42P01`) como fallback recuperable a BigQuery para que `leave requests` no derribe toda la vista si un deploy llega antes que el bootstrap de Postgres.
- fix: `purchase orders` y `payroll receipts` ya conviven con schemas legacy durante el rollout de `TASK-173`; ambos stores detectan si existen `attachment_asset_id` / `asset_id` antes de escribir, evitando que staging dependa de cerrar el DDL remoto sobre tablas todavía owned por `postgres`.
- Staff Aug `Crear placement` recibió una segunda mitigación conservadora: el modal ya no depende de `MUI Autocomplete` dentro del `Dialog`; ahora usa búsqueda incremental con input controlado y lista inline de resultados elegibles para reducir el riesgo de freeze al abrir.
- Staff Aug `Crear placement` ahora además monta el modal solo al abrirlo y desactiva el focus management más agresivo de `MUI Dialog`, para reducir el riesgo de cuelgue del navegador en el click inicial.

# 2026-03-28

- Admin Center: `/admin` dejó de ser un redirect ciego y ahora renderiza una landing institucional de governance con KPIs, mapa de dominios y entrypoints hacia Spaces, Identity & Access, Delivery, AI Governance, Cloud & Integrations y Ops Health.
- Navegación admin: el submenu histórico `Administración` pasó a `Admin Center`, incorpora la landing `/admin` como entrypoint explícito y reordena las rutas administrativas activas bajo una taxonomía más clara.
- Admin Center observability: se agregaron las nuevas surfaces `/admin/cloud-integrations` y `/admin/ops-health`, alimentadas por una capa compartida `getOperationsOverview()` que reutiliza señales reales de outbox, proyecciones, notifications, syncs y webhooks.
- Admin Center runbooks: `Cloud & Integrations` y `Ops Health` ahora exponen acciones manuales con auth admin para `dispatch webhooks`, `services sync`, `replay reactive` y `retry failed emails`, todas montadas sobre helpers existentes del runtime.

- Projected payroll promotion: `POST /api/hr/payroll/projected/promote` quedó validado end-to-end en PostgreSQL para marzo 2026; el flujo ya promueve 4 personas a borrador oficial, y la causa raíz del bloqueo era una combinación de `payroll_entries` con columnas faltantes y un `ensurePayrollInfrastructure()` que seguía tocando BigQuery aun estando en runtime Postgres.
- Payroll projected promotion: `greenhouse_serving.projected_payroll_snapshots` recibió grants explícitos para `greenhouse_app`, `greenhouse_runtime` y `greenhouse_migrator`, resolviendo el `permission denied` que bloqueaba `POST /api/hr/payroll/projected/promote` sin mover la materialización fuera de `greenhouse_serving`.
- `Payroll Chile` ya expone `colación` y `movilización` en staging para la nómina proyectada de Valentina Hoyos, con el neto subiendo de `CLP 437.077` a `CLP 596.257` al incorporar los haberes no imponibles.
- La compensación vigente `valentina-hoyos_v1` quedó actualizada en staging con los valores del PDF de febrero para `baseSalary`, `gratificacionLegalMode`, `AFP`, `Isapre`, `colación` y `movilización`.
- El smoke se validó sobre el deployment de staging `greenhouse-mk7eglbat-efeonce-7670142f.vercel.app`, alias `dev-greenhouse.efeoncepro.com`.
- TASK-105 (lint hardening): 124 lint issues → 0; se limpiaron imports/blank lines/unused vars y dependencias de hooks en agency/greenhouse, scripts y helpers. `pnpm lint`, `pnpm test -- --runInBand` y `pnpm build` verdes.

# 2026-03-27

- Se agregó una capa común de indicadores económicos Chile para `USD_CLP`, `UF`, `UTM` e `IPC`, con nuevas rutas `GET /api/finance/economic-indicators/latest` y `GET/POST /api/finance/economic-indicators/sync`.
- `AI Tooling` dejó de leer `USD/CLP` con query propia y fallback aislado; ahora consume el helper común.
- `Payroll` ahora puede resolver `UF` histórica para Isapre y `UTM` histórica para impuesto Chile durante cálculo/readiness/recálculo de entries.
- `Finance Dashboard` pasó de una card única de tipo de cambio a exponer `Dólar observado`, `UF` y `UTM`.
- Se agregó storage SQL para `greenhouse_finance.economic_indicators` y migration `scripts/migrations/add-economic-indicators.sql`.

# 2026-03-27

- Finance dashboard: hardened `economic-indicators` fallback so a missing BigQuery table `greenhouse.fin_economic_indicators` no longer crashes `/api/finance/economic-indicators/latest` with `500`; indicators can continue resolving from PostgreSQL and direct sync paths.
- Finance infrastructure: provisioned `greenhouse.fin_economic_indicators` in BigQuery using the repo’s canonical `ensureFinanceInfrastructure()` path, aligning analytical fallback with the new economic indicators runtime layer.
- Architecture/docs: registered `finance.economic_indicator.upserted` in the canonical event catalog and left `TASK-063` explicitly audited for dependencies plus incoming/outgoing reactive event design.

- Payroll Chile task planning: split the old mixed `TASK-078` into a clean foundation lane (`TASK-078`), legal parity (`TASK-076`), receipts (`TASK-077`) and reverse payroll (`TASK-079`), then updated `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md` and the task docs to match the new order.
- Payroll Chile foundation: provisioned `chile_previred_indicators` and `chile_afp_rates`, wired async Chile previsional helpers into payroll calculations/projections/recalculations, and executed the additive migration in PostgreSQL with runtime grants so the forward engine can resolve IMM/SIS/topes/AFP data from a canonical period source once synced/seeded.
- Payroll Chile sync: aligned the previsional sync to the public Gael Cloud API (`previred` + `impunico`), fixed `ImpUnico` conversion to UTM using the period UTM from `previred`, added the protected cron `GET /api/cron/sync-previred`, and executed the historical backfill successfully for `2026-01 -> 2026-03`.
- Payroll Chile liquidation parity: added `gratificacionLegalMode` to compensation versions and `chileGratificacionLegalAmount` to payroll entries so the forward engine now computes legal gratification over IMM when applicable; the slice reuses the existing `compensation_version.created/updated` and `payroll_entry.upserted` outbox events so projections refresh without introducing a new reactive contract.
- Payroll Chile migration: applied `scripts/migrations/add-gratificacion-legal-mode.sql` with the `admin` profile because the existing tables are owned by `postgres`; runtime now sees `gratificacion_legal_mode` and `chile_gratificacion_legal` in `greenhouse_payroll`.
- Payroll Chile smoke validation: `dev-greenhouse.efeoncepro.com` remained protected by Vercel auth during staging smoke, so manual validation was recorded as blocked by access protection rather than as an application regression.
- `TASK-162` pasó de framing a implementación inicial: se agregó la fuente canónica `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md` y el helper shared `src/lib/commercial-cost-attribution/assignment-classification.ts` para versionar la clasificación de assignments comerciales vs internos sin hacer big bang sobre Finance o Cost Intelligence.
- `TASK-162` avanzó con un segundo slice runtime: `src/lib/commercial-cost-attribution/member-period-attribution.ts` ya consolida labor + overhead por `member_id` y `computeOperationalPl()` empezó el cutover a esa capa intermedia en vez de mezclar queries legacy por separado.
- `TASK-162` alineó también `client_economics` y `organization-economics` al mismo reader canónico intermedio, reduciendo el uso directo de `client_labor_cost_allocation` a insumo interno del dominio.
- `TASK-162` agregó la materialización inicial `greenhouse_serving.commercial_cost_attribution`; la capa de attribution ya es serving-first con fallback a recompute y `materializeOperationalPl()` la rematerializa antes del snapshot de P&L.
- `TASK-162` sumó wiring reactivo dedicado: nueva projection `commercial_cost_attribution`, registro en el projection registry y evento `accounting.commercial_cost_attribution.materialized` para desacoplar la capa del refresh exclusivo de `operational_pl`.
- `TASK-162` agregó health semántico y explain surface mínima para commercial cost attribution, con APIs dedicadas y chequeo de freshness en `/api/cron/materialization-health`.

# 2026-03-31

- Infra/runtime de assets privados:
  - `staging` y `production` fijaron `GREENHOUSE_PRIVATE_ASSETS_BUCKET=efeonce-group-greenhouse-media` en Vercel
  - esto corrige el runtime de upload mientras los buckets privados dedicados por entorno siguen pendientes de provisioning real
- Hotfix en `leave` para uploads de respaldo:
  - `LeaveRequestDialog` ahora propaga el `memberId` efectivo al draft upload y a la creación de la solicitud
  - `/api/hr/core/meta` devuelve `currentMemberId` resuelto para superficies HR/My
  - `/api/assets/private` hace fallback server-side para `leave_request_draft` cuando la sesión no expone `tenant.memberId`
  - Esto corrige el error visible `ownerMemberId is required for leave drafts.` en `greenhouse.efeoncepro.com/hr/leave`

# 2026-04-02

- Delivery performance parity lane cerrada end-to-end: `TASK-202` implementó el cutover outbound `Greenhouse -> Notion` con target formal `Performance Reports`, integración `notion_delivery_performance_reports`, route cron `GET /api/cron/notion-delivery-performance-publish`, writer Notion real y ledger `greenhouse_sync.notion_publication_runs`.
- Se agregó configuración canónica de destino en `greenhouse_core.space_notion_publication_targets`, seeded para `space-efeonce` hacia la base Notion `Performance Reports`.
- La validación funcional quedó cubierta con `dryRun` real para `Marzo 2026`, resolviendo el target page existente sin sobrescribir el contenido histórico durante la verificación.

# Changelog

## 2026-04-13

- Nubox sync hardening: el raw sync ya no depende solo de la ventana reciente; ahora combina hot window configurable con historical sweep rotativo persistido, para que documentos tardíos o rectificaciones históricas no queden fuera indefinidamente.
- Nubox conformed: las tablas `greenhouse_conformed.nubox_*` pasan a operar como snapshots append-only; los readers de balances, ledger remediation y proyección a PostgreSQL resuelven siempre el último snapshot por ID, evitando fallos por streaming buffer de BigQuery durante backfills.
- Nubox freshness: `nubox_last_synced_at` en `income`, `expenses` y `quotes` ahora refleja el `ingested_at` real del raw snapshot fuente, no el timestamp artificial de cualquier proyección.
- Finance Ops: se ejecutó backfill raw histórico `2023-01 -> 2026-04` y luego una corrida `conformed -> postgres` exitosa; staging terminó con `postgres_projection` exitosa (`1 income` creado, `2 expenses` creados, `2 incomes` reconciliados).
- Architecture / backlog: `GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1` y `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1` ya formalizan el patrón runtime reusable para integraciones source-led, y se abrió `TASK-399` para institucionalizar adapters resilientes, control plane por etapa y replay governance.
- Task backlog: `docs/tasks/README.md` ahora deja explícita la prioridad operativa vigente del backlog `to-do` separando `impacto cliente` e `impacto agencia`, para que los agentes no infieran el orden solo desde el ID o el título.

## 2026-04-10

- HR / Identity: `TASK-330` formalizó la gobernanza de supervisoría entre Greenhouse y Entra; `greenhouse_core.reporting_lines` sigue siendo la fuente formal canónica y `greenhouse_sync.reporting_hierarchy_drift_proposals` registra drift auditable con evidencia, severidad y resolución humana.
- Entra sync: `src/lib/entra/graph-client.ts` ahora resuelve `manager` por Microsoft Graph, y tanto `GET /api/cron/entra-profile-sync` como `POST /api/webhooks/entra-user-change` disparan también el escaneo de drift de jerarquía usando el mismo snapshot de usuarios.
- HR > Jerarquía: se agregaron `GET /api/hr/core/hierarchy/governance`, `POST /api/hr/core/hierarchy/governance/run` y `POST /api/hr/core/hierarchy/governance/proposals/[proposalId]/resolve`, además del panel visual en `/hr/hierarchy` para correr la gobernanza y aprobar/rechazar/descartar propuestas.
- Identity/HR foundation: `TASK-324` introdujo `greenhouse_core.reporting_lines` como source of truth historizable para supervisoría formal, manteniendo `greenhouse_core.members.reports_to_member_id` como snapshot actual y capa de compatibilidad para consumers legacy.
- Reporting hierarchy: se agregaron readers canónicos para supervisor actual/efectivo, reportes directos, subárbol, cadena ascendente y miembros sin supervisor en `src/lib/reporting-hierarchy/*`.
- HR Core: `updateMemberHrProfile()` ya no muta `reports_to_member_id` de forma aislada; ahora escribe la relación formal vía reporting hierarchy y publica `reporting_hierarchy.updated`.
- Operational responsibility: `approval_delegate` ya puede scoped por `member`, permitiendo que la delegación temporal del supervisor efectivo reutilice el registry canónico en vez de abrir storage paralelo.

## 2026-04-03

- Finance: se corrigió la semántica visible de `income` / `expenses` para dejar explícito que los documentos sincronizados desde Nubox son ledgers de venta/compra y devengo, no equivalentes directos a cobros/pagos. La navegación, títulos y copy de Finance ahora distinguen mejor documento vs caja.
## 2026-04-08

- Finance UX: `Cobros` y `Pagos` ya no muestran `Pendiente` para movimientos de caja ya ejecutados solo porque aun no estan conciliados. La tabla ahora separa `Estado` (`Cobrado` / `Pagado`) de `Conciliacion` (`Conciliado` / `Por conciliar`).
