# TASK-1688 — Completar datos de contacto en postulaciones Careers

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1688-careers-application-contact-completeness.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diseño confirmado; no implementada`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `absorbe el residual de TASK-354`
- GitHub Issue: `none`

## Summary

El intake de Careers hoy valida teléfono y mensaje en el navegador, pero el command canónico los descarta; tampoco solicita ni persiste país de residencia. Esta task completa el contrato end-to-end para que cada postulación nueva guarde teléfono opcional, país de residencia obligatorio y mensaje por postulación, con paridad entre el submit público directo y Growth Forms.

## Why This Task Exists

La investigación del incidente de Hector Tolmo confirmó que su postulación a Account sí existe y no fue reasignada a Content: el Pipeline abría otra vacante por defecto. La misma revisión encontró una pérdida de datos real y transversal: el formulario acepta teléfono/mensaje, pero `submitPublicHiringApplication` sólo persiste nombre, correo, disponibilidad y enlaces; no hay columna para teléfono, país ni mensaje. Por ello no se puede operar el contacto ni segmentar residencia desde el ATS.

## Goal

- Persistir de manera gobernada teléfono, país de residencia y mensaje sin crear un intake ni un pipeline paralelo.
- Mantener un único parser/command para `POST /api/public/hiring/applications` y la proyección reactiva de Growth Forms.
- Hacer los tres datos legibles sólo por el personal interno autorizado en Application 360, sin exponerlos en payloads públicos, clientes, analítica ni logs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Antes de cualquier migración, determinar y registrar el ADR aplicable: cambia una proyección compartida y el source of truth de datos PII de Hiring. Esta task no presupone que una tabla sea la decisión final.
- El país de residencia es autodeclarado y explícito; el prefijo telefónico sólo sirve para formato/validación y nunca permite inferir residencia, nacionalidad ni derecho a trabajo.
- Los datos de persona reutilizables viven con el `CandidateFacet` person-first; el mensaje es contexto de una `HiringApplication`, no del perfil. La ubicación final debe quedar explícita en el ADR/migración.
- El browser nunca escribe tablas ni contiene reglas de reconciliación. Ambas entradas públicas consumen el mismo parser y `submitPublicHiringApplication` o su sucesor canónico server-side.
- Datos de contacto son PII interna: ningún `PublicOpeningPayload`, cliente, evento de analítica, error, captura o log puede incluir valores crudos. Conservar la respuesta pública genérica anti-enumeración.
- La migración es sólo aditiva y no inventa/backfillea país o teléfono de filas históricas.

## Normative Docs

- `docs/tasks/complete/TASK-1367-careers-apply-intake-service.md`
- `docs/tasks/complete/TASK-1372-growth-forms-application-upload-ats-projection-foundation.md`
- `docs/tasks/complete/TASK-1373-careers-apply-native-growth-form-migration.md`
- `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
- `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-353` — aggregates Hiring y publicación canónica.
- `TASK-1367` — `src/lib/hiring/public-careers/schema.ts` y `submit-application.ts`, command autoritativo de intake público.
- `TASK-1372` y `TASK-1373` — contrato y proyección de `efeonce-careers-application` hacia Hiring.
- `TASK-355` — Application 360 y Hiring Desk internos ya entregados; sólo consume el reader extendido.

### Blocks / Impacts

- Seguimiento real de candidatos por el equipo de Talent/Hiring.
- Campañas y vacantes públicas activas: el formulario debe dejar de aceptar campos que luego se pierden.
- Cierre documental de `TASK-354`, cuyo residual queda absorbido aquí.

### Files owned

- `src/lib/hiring/public-careers/schema.ts`
- `src/lib/hiring/public-careers/submit-application.ts`
- `src/lib/hiring/public-careers/growth-form-contract.ts`
- `src/lib/sync/projections/growth-hiring-application-from-submission.ts`
- migración y tipos/reader de `greenhouse_hiring.candidate_facet` y `greenhouse_hiring.hiring_application` que determine el ADR
- `src/types/hiring.ts`, `src/lib/hiring/store.ts`
- `src/app/(dashboard)/agency/hiring/applications/[applicationId]/page.tsx`
- `src/views/greenhouse/hiring/Application360View.tsx`
- `src/components/greenhouse/careers/CareersApplyClient.tsx`
- `src/components/greenhouse/careers/CareersNativeGrowthFormClient.tsx`
- copy pertinente bajo `src/lib/copy/dictionaries/{es-CL,en-US}/`
- documentación técnica, funcional y manual de Careers/Hiring afectada

## Current Repo State

### Already exists

- Careers público renderiza tanto el formulario estándar como el native Growth Form para la misma vacante.
- El selector de prefijo del teléfono ya mejora formato/validación en la UI, y el schema normaliza `phone` y acepta `message` hasta 4.000 caracteres.
- `submitPublicHiringApplication` reconcilia `identity_profile` → `candidate_facet` → `hiring_application` de forma idempotente; Growth Forms termina en la misma autoridad Hiring.
- Application 360 ya es la lectura interna canónica de una postulación.

### Gap

- No existe campo de país de residencia en el contrato público.
- Teléfono y mensaje llegan al borde de validación pero no se escriben en ninguna tabla de Hiring.
- Los readers internos no pueden mostrar ni operar estos datos porque no existen en el modelo.
- Las filas históricas no tienen datos suficientes para recuperarlos de forma fiable.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/hiring/public-careers/**` y proyección `src/lib/sync/projections/**`, consumidos por Careers público y Application 360.
- Future candidate home: `remain-shared`
- Boundary: parser/command público de Hiring, reader tipado de `HiringApplication` y contrato Growth Forms; los consumidores sólo usan esos contratos.
- Server/browser split: componentes cliente recogen y presentan campos; validación autoritativa, normalización E.164, reconciliación, persistencia y autorización permanecen server-side.
- Build impact: `none`
- Extraction blocker: transacción Person → CandidateFacet → HiringApplication y proyección Growth Forms comparten el mismo schema y command de Hiring.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: candidato público sin sesión; reclutador interno autorizado en Application 360.
- Momento del flujo: completar una postulación y revisar una postulación existente.
- Resultado perceptible esperado: el candidato declara país de residencia claramente, puede entregar teléfono opcional y mensaje sin que se pierdan; el reclutador los encuentra en un bloque de contacto con contexto correcto.
- Fricción que debe reducir: ambigüedad entre prefijo telefónico y país, y pérdida silenciosa de datos que el formulario parecía haber aceptado.
- No-goals UX: no se añade una ruta, paso, modal, navegación ni nuevo primitive; no se pide dirección, nacionalidad, documento de identidad ni autorización laboral.

### Surface & system decision

- Surface: apply público estándar y native Growth Form; lectura en Application 360 existente.
- Nav placement: `none` — no hay destino de navegación nuevo.
- Composition Shell: `no aplica` en la edición del formulario público; Application 360 conserva su shell existente.
- Primitive decision: `reuse` — controles y layout actuales de Careers/Growth Forms y grupos de detalle existentes; no crear selector paralelo ni componente de país basado en banderas.
- Adaptive density / The Seam: `aplica` — mantener el campo de país a ancho completo y el bloque interno legible en desktop y 390 px.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/*`
- Access impact: `entitlements` — los datos aparecen sólo dentro del reader/vista interna ya autorizada; nunca en una surface cliente/pública.

### State inventory

- Default: país de residencia requerido, teléfono marcado opcional, mensaje opcional; el prefijo telefónico conserva su fin de formato sin seleccionar residencia.
- Loading: el catálogo de países tiene estado estable y accesible; si su carga no está disponible, no permitir submit con país inventado y mostrar recuperación clara.
- Empty: datos históricos muestran “No informado”, sin inferencia ni sustitución por el prefijo telefónico.
- Error: país ausente/inválido, teléfono no normalizable o mensaje fuera de límite muestran error inline y no eliminan la entrada del candidato.
- Degraded / partial: si la persistencia falla, respuesta pública genérica y valor del formulario preservado; registrar sólo señal sanitizada.
- Permission denied: Application 360 conserva el gate existente y no serializa estos campos a quien no puede leer la postulación.
- Long content: mensaje se trunca visualmente con acceso a lectura completa siguiendo el patrón interno existente, sin cortar el dato.
- Mobile / compact: orden vertical, labels siempre visibles, sin depender de flags ni tooltips para identificar país.
- Keyboard / focus: selector navegable por teclado, errores anunciados y foco al primer campo inválido.
- Reduced motion: sin motion nueva; respetar la preferencia actual.

### Interaction contract

- Primary interaction: seleccionar país de residencia explícito, introducir teléfono opcional y mensaje; submit mantiene los valores y usa el command canónico.
- Hover / focus / active: reutilizar estados de focus y error actuales; no codificar significado sólo por color.
- Pending / disabled: el submit mantiene el patrón existente; el país requerido se valida al submit/blur sin disabled permanente.
- Escape / click-away: no aplica.
- Focus restore: al fallo de validación, foco al primer error; al error server-side, conservar foco/contexto del formulario.
- Latency feedback: feedback existente de envío; no revelar idempotencia, estado interno ni valores enviados.
- Toast / alert behavior: confirmación/error pública genérica actual; Application 360 no emite toast por lectura.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: reutilizar la transición existente, si la hay.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no hay animación nueva.
- Non-goal motion: no añadir animaciones a campos, errores ni paneles de PII.

### Implementation mapping

- Route / surface: `src/components/greenhouse/careers/CareersApplyClient.tsx`, `CareersNativeGrowthFormClient.tsx` y `Application360View.tsx`; rutas existentes sin navegación nueva.
- Primitive / variant / kind: campos y select canónicos de Careers/Growth Forms; bloque de detalles ya existente en Application 360.
- Component candidates: extender componentes existentes, no crear un formulario alterno.
- Copy source: dictionaries Careers `es-CL` y `en-US`; “País de residencia”, ayuda que separa residencia de prefijo telefónico, errores y “No informado”.
- Data reader / command: parser de `schema.ts` → `submitPublicHiringApplication`; proyección `growth-hiring-application-from-submission.ts` consume el mismo contrato; Application 360 consume reader/store tipado.
- API parity: la UI sólo llama al endpoint/command existente; no hay write en React ni endpoint alterno.
- Access / capability: gate existente de lectura interna de Hiring; verificar que DTOs de Careers, clientes y analítica no reciben PII nueva.
- States to implement: default, required/error, server error preservado, histórico no informado, permiso denegado, contenido largo y mobile.

### GVC scenario plan

- Scenario file: extender `scripts/frontend/scenarios/task354-careers-runtime-audit.scenario.ts` o crear un escenario focal `task1688-careers-contact-completeness` sólo si la extensión reduce claridad.
- Route: una vacante pública publicada y `/agency/hiring/applications/[applicationId]` con sesión interna autorizada.
- Viewports: desktop 1440 y mobile 390.
- Quality profile: `premium`
- Required steps: completar país/teléfono/mensaje; forzar país vacío e input telefónico inválido; enviar un caso permitido en ambiente controlado; abrir Application 360 con la postulación resultante y una histórica sin datos.
- Required captures: idle/error/success genérico del apply y detalle interno desktop/mobile.
- Required `data-capture` markers: campos de contacto, summary interno, error de país y estado “No informado”.
- Assertions: sin overflow, labels/aria correctos, teléfono/prefijo no sustituye país, valores no visibles en una respuesta pública ni consola.
- Scroll-width checks: `scrollWidth === clientWidth` en ambas superficies y viewports.
- Reduced-motion / focus evidence: foco en primer error, lectura por teclado y reduced motion sin regresión.
- Review dossier: captures y resultados GVC de la task, sin PII real en archivos versionados.
- Baseline decision / surface ID: source-led desde `TASK-354-public-careers-landing` y Application 360 actual; no se rediseña la estética.

### Design decision log

- Decision: país de residencia autodeclarado y obligatorio para nuevas postulaciones; teléfono opcional E.164; mensaje application-scoped.
- Alternatives considered: deducir país desde prefijo telefónico; guardar todo en la aplicación; añadir una encuesta posterior; se descartan por inferencia errónea, semántica de persona o aumento de fricción.
- Why this pattern: completa el formulario que ya existe, preserva un solo intake y separa contacto durable de contexto específico de una postulación.
- Reuse / extend / new primitive: `reuse` de surface y primitives; extender contratos y reader existentes; no new primitive.
- Open risks: la ubicación física definitiva requiere ADR; las aplicaciones históricas seguirán incompletas y no deben falsificarse.

### Visual verification

- GVC scenario: el definido arriba, ejecutado contra staging.
- Viewports: 1440 y 390.
- Required captures: apply estándar/native y Application 360, con datos de prueba autorizados y redactados.
- Required `data-capture` markers: contacto/residencia/error/estado histórico.
- Scroll-width check: obligatorio en las dos superficies.
- Accessibility/focus checks: labels, teclado, anuncio de error, foco al primer error y contraste.
- Before/after evidence: comparar con el formulario y Application 360 actuales, sin modificar su dirección visual.
- Known visual debt: ninguno nuevo; cualquier deuda hallada se registra como follow-up, no se cubre con este cambio.
- Visual scorecard: `docs/ui/reviews/TASK-1688-careers-application-contact-completeness.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`, `command`, `reader` y `sync`
- Source of truth afectado: facet de candidato y postulación de `greenhouse_hiring`, parser/command público y proyección Growth Forms.
- Consumidores afectados: Careers estándar, Growth Forms, Application 360 y readers internos autorizados; nunca payloads públicos/clientes.
- Runtime target: `local`, `staging` y `production`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/public-careers/schema.ts`, `submit-application.ts`, `growth-form-contract.ts`, `growth-hiring-application-from-submission.ts`, `src/lib/hiring/store.ts` y DTO de Application 360.
- Contrato nuevo o modificado: campo explícito `residenceCountryCode`, teléfono normalizado para persistencia y `message` application-scoped en el parser/command/proyección/reader; los nombres físicos se aprueban por ADR antes de migrar.
- Backward compatibility: `compatible` — columnas aditivas nullable para legado; el contrato nuevo exige país sólo para nuevas entradas públicas compatibles. Planificar una versión/paridad de Growth Forms antes de hacerlo obligatorio.
- Full API parity: una sola lógica server-side para parsear, normalizar, reconciliar y guardar; UI, endpoint y proyección son consumidores, no implementaciones separadas. N/A — no nace capability nueva, se endurece un command existente.

### Data model and invariants

- Entidades/tablas/views afectadas: ubicación provisional a decidir por ADR: `greenhouse_hiring.candidate_facet.phone_e164`, `greenhouse_hiring.candidate_facet.residence_country_code` y `greenhouse_hiring.hiring_application.candidate_message`.
- Invariantes que no se pueden romper:
  - `phone_e164` es nullable, se persiste únicamente si normaliza a E.164 y no se usa para inferir país; una entrada opcional omitida nunca borra un valor existente de la misma persona por accidente.
  - `residence_country_code` es ISO 3166-1 alpha-2 en mayúsculas, requerido para nuevas postulaciones y nullable sólo para legado/migración; no es dirección, nacionalidad ni prueba de elegibilidad laboral.
  - `candidate_message` pertenece a la postulación, conserva el límite actual de 4.000 caracteres y nunca se copia silenciosamente a otra postulación.
  - Reintentos/dedupe conservan la respuesta pública genérica y no crean aplicaciones duplicadas; la política de update de contact facet y mensaje se prueba explícitamente antes del rollout.
  - Public endpoint y Growth Forms tienen la misma semántica de validación/persistencia; no hay write path alterno.
- Tenant/space boundary: el command deriva el contexto de Hiring existente y mantiene el enlace `identity_profile_id` → `candidate_facet` → `hiring_application`; ningún dato se lee fuera del space autorizado.
- Idempotency/concurrency: conservar fingerprint/dedupe y transacción existentes; probar retry concurrente y definir la actualización sólo cuando el input trae un valor válido, evitando wipe por campos opcionales ausentes.
- Audit/outbox/history: no crear evento con PII. Usar audit/contexto existente si el aggregate ya registra mutación y una señal sanitizada de inconsistencia de persistencia (IDs/contadores, nunca valores crudos).

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: columnas nullable primero; código lector tolera nulos. El país se vuelve requerido sólo cuando Careers estándar y Growth Forms estén desplegados con el contrato compatible.
- Backfill plan: `none` — no inferir ni rellenar filas históricas desde prefijo, CV, correo o IP. Mostrar “No informado” y dejar captura futura explícita como follow-up si se requiere.
- Rollback path: revertir código de escritura/lectura y conservar columnas aditivas vacías o ya escritas; no borrar PII ni ejecutar rollback destructivo. Si se requiriera revertir schema, sólo con ADR y plan de retención aprobado.
- External coordination: validación Legal/Privacy de retención y aviso de privacidad para los tres campos; promoción ordenada de Vercel/worker/proyección con owner de Hiring.

### Security and access

- Auth/access gate: intake público conserva Turnstile/rate-limit/replay guard existentes; lectura sólo bajo el gate interno actual de la postulación y su capability granular.
- Sensitive data posture: `PII` — teléfono, residencia y mensaje son internos; no se exponen en client payloads, `PublicOpeningPayload`, enlaces, analytics, capturas, logs ni errores.
- Error contract: errores de validación por campo sin eco de PII; submit server-side genérico y sanitizado con `captureWithDomain('hiring')`/equivalente.
- Abuse/rate-limit posture: conservar controles de TASK-1367 y aplicar límites de longitud/lista de países en servidor; ningún nuevo endpoint público.

### Runtime evidence

- Local checks: tests focales del parser, command, dedupe/retry, proyección Growth Forms, reader/DTO anti-leak y componentes/copy.
- DB/runtime checks: migración en DB local/staging, consulta read-only que compruebe columnas, valores normalizados y que legacy permanezca nulo.
- Integration checks: envío controlado por Careers estándar y native Growth Form hacia staging, seguido de lectura interna en Application 360.
- Reliability signals/logs: señal sanitizada de fallo de persistencia/paridad y búsqueda de errores de validación sin PII; verificar que no se registran valores sensibles.
- Production verification sequence: tras sign-off de Privacy y despliegue staging, usar sólo un canary autorizado o una postulación real con consentimiento de verificación; leer internamente y no crear candidatos ficticios ni exponer datos en evidencia.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Hybrid Execution Justification

- Why not split: el defecto sólo se resuelve si los controles visibles, el parser compartido, la persistencia y la lectura interna llegan con la misma semántica. Dividirlo dejaría nuevamente un formulario que promete valores que el command/reader no opera; la única UI afectada es una extensión local de superficies existentes.
- Primary execution profile: `backend-data`; el schema/command/proyección se implementan antes de activar campos obligatorios en UI.
- Contract boundary: `submitPublicHiringApplication` y su parser/proyección son el único write; Application 360 consume un reader/DTO interno autorizado.
- Risk controls: ADR previo, migración aditiva nullable, compatibilidad Growth Forms antes de requisito, no backfill/inferencia, anti-leak tests, staging + GVC y rollback de código sin borrar datos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task produce plan.md según TASK_PROCESS.md.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Decisión de arquitectura y contrato de datos

- Ejecutar el gate ADR y decidir/registrar el source of truth físico, retención, autorización de lectura y política de actualización ante reintentos/dedupe.
- Congelar el contrato de país ISO, E.164, mensaje application-scoped y compatibilidad/versionado de Growth Forms antes de tocar producción.

### Slice 1 — Fundación aditiva de persistencia

- Crear migración aditiva y tipos/readers para los campos aprobados; legacy queda nullable y sin backfill.
- Extender el parser y `submitPublicHiringApplication` para validar/normalizar/persistir el contrato dentro de la transacción/idempotencia actual.
- Añadir pruebas negativas de PII y señal sanitizada ante discrepancias inesperadas de write.

### Slice 2 — Paridad de las dos entradas públicas

- Extender `growth-form-contract.ts` y la proyección de submission para que Careers estándar y native Growth Form entreguen el mismo input al command canónico.
- Actualizar el formulario estándar y native Growth Form: país de residencia requerido, teléfono opcional y mensaje conservado; copy es-CL/en-US y a11y completos.

### Slice 3 — Lectura interna y evidencia

- Extender el reader/Application 360 para el bloque interno de contacto y contexto de aplicación, incluyendo estado histórico “No informado”.
- Ejecutar tests, GVC y verificación DB/read-only en local/staging; promover con canary autorizado y evidencia sin PII.
- Actualizar arquitectura, manual de Careers y documentación funcional conforme a la decisión aplicada.

## Out of Scope

- Reasignar candidatos entre vacantes: el incidente confirmó que la selección por defecto del Pipeline no altera la `opening_id` de la postulación.
- Inferir, completar o corregir países históricos desde el teléfono, IP, CV, correo o cualquier proxy.
- Capturar dirección, nacionalidad, documento de identidad, elegibilidad laboral, datos sensibles o datos de clase protegida.
- Rediseñar Careers, Hiring Desk, pipeline o crear una nueva capability/endpoint público.
- Integración CRM, campañas o contacto automatizado al candidato; requiere task/consentimiento propio.

## Detailed Spec

La migración propuesta es intencionalmente provisional hasta el ADR: como punto de partida, `phone_e164` y `residence_country_code` pertenecen al facet person-first y `candidate_message` a la aplicación. La implementación debe validar el contrato una vez y reutilizarlo en las dos rutas de entrada; no duplicar validación ni SQL en componentes, API y proyección.

La residencia se muestra como select accesible con nombre textual del país y código ISO por debajo del contrato; el selector de prefijo telefónico no satisface ese campo ni se presenta como proxy. El mensaje se lee en Application 360 bajo el contexto de esa postulación y nunca se replica a `CandidateFacet`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (ADR/contract) → Slice 1 (migration + command) → Slice 2 (paridad de entradas + UI) → Slice 3 (reader, GVC y promoción).
- La migración aditiva debe estar aplicada antes de código de escritura; Careers estándar y Growth Forms deben aceptar el mismo contrato antes de exigir país en producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Persistir PII en la entidad/contexto equivocado | migration / privacy | medium | ADR previo, migration review y tests de modelo/reader | revisión de schema + test negativo |
| Un formulario persiste y el otro descarta | sync / public UI | medium | parser/command único, pruebas de paridad y staging dual-path | señal sanitizada de discrepancia + tests |
| País inferido erróneamente desde el prefijo | data quality | medium | campo explícito requerido, copy aclaratorio y prohibición de inferencia | revisión de datos y GVC |
| Fuga de PII a cliente, analytics o logs | privacy / UI | medium | DTO allowlist, respuesta genérica, tests anti-leak y redacción de evidencia | búsqueda de logs/capturas + test |
| Corte de postulaciones al hacer país requerido | release | medium | expand/contract, staging de ambas rutas, canary autorizado y revert de código | tasa de validation/server error |
| Datos históricos aparentan estar completos | Hiring Desk | low | nullable + “No informado”, sin backfill | revisión reader contra filas legacy |

### Feature flags / cutover

- No crear flag de producto nuevo: es una corrección contractual de un intake público ya habilitado. El cutover es expand/contract: migración nullable → writers/readers compatibles → ambas entradas con el nuevo contrato → país obligatorio.
- Conserva `HIRING_PUBLIC_APPLICATIONS_ENABLED` como gate general existente. Si staging revela incompatibilidad, revertir código al contrato tolerante sin retirar las columnas aditivas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | Rechazar/ajustar ADR antes de migrar | inmediato | sí |
| 1 | Revertir writers/readers; mantener columnas aditivas y no borrar datos | <10 min de deploy | sí para código; schema permanece |
| 2 | Revertir UI/contrato a modo tolerante y mantener submit existente | <10 min de deploy | sí |
| 3 | Revertir reader/UI interno; conservar evidencia y datos ya consentidos | <10 min de deploy | sí |

### Production verification sequence

1. ADR/Privacy aprueban ubicación, retención y copy; aplicar migración aditiva en staging y verificar schema/readers con consulta read-only.
2. Desplegar writer/reader tolerantes en staging y ejecutar unit/integration tests, incluidas entradas directa y Growth Forms.
3. Habilitar contrato de país requerido en ambas superficies de staging; GVC desktop/390 y Application 360 confirman persistencia/lectura sin PII en captures.
4. Con owner de Hiring, realizar un canary autorizado que no invente un candidato real; verificar DB/read interno, idempotencia y logs sanitizados.
5. Promover el mismo orden a producción, observar tasa de fallos durante el periodo acordado y detener/revertir código ante regresión.

### Out-of-band coordination required

- Revisión de Legal/Privacy para finalidad, consentimiento/aviso de privacidad, retención y acceso de teléfono/residencia/mensaje.
- Confirmación del owner Hiring antes de exigir país en campañas/vacantes activas y antes de cualquier canary productivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se resolvió el gate ADR y su decisión nombra schema, retención, permisos y política de dedupe/update antes de aplicar migración.
- [ ] La migración es aditiva, deja legacy nullable y no realiza backfill ni inferencia de residencia desde teléfono u otros proxies.
- [ ] Nuevas postulaciones persisten teléfono E.164 opcional, país de residencia ISO obligatorio y mensaje application-scoped dentro del command canónico.
- [ ] Careers estándar, native Growth Form y su proyección tienen exactamente la misma validación y persistencia; pruebas de paridad cubren ambos caminos.
- [ ] Reintentos y dedupe no duplican aplicaciones, no revelan estado al público ni borran por accidente un dato de contacto opcional existente.
- [ ] Application 360 muestra los datos sólo a usuarios internos autorizados y muestra “No informado” en histórico; payloads públicos/clientes/analytics no los contienen.
- [ ] El copy reusable es bilingüe es-CL/en-US, explica que residencia no es prefijo telefónico y cumple labels, teclado, foco y mensajes de error accesibles.
- [ ] GVC desktop + mobile 390, `scrollWidth === clientWidth`, preferencia de movimiento reducido y flujo de foco quedan verificados para ambos formularios y Application 360.
- [ ] La evidencia DB/staging/producción está sanitizada: no hay PII en logs, capturas, fixtures versionados ni mensajes de error.
- [ ] Documentación de arquitectura, Careers y operación Hiring queda actualizada con el contrato efectivo y la limitación de legacy.

## Verification

- `pnpm task:lint --task TASK-1688`
- `pnpm ui:wireframe-check --task TASK-1688`
- pruebas focales del parser/command, idempotencia y normalización E.164/ISO.
- pruebas focales de la proyección Growth Forms y de paridad con `POST /api/public/hiring/applications`.
- pruebas de reader/DTO/Application 360 que prueben autorización y anti-leak.
- migración en local/staging + consulta DB read-only de schema, nulos legacy y valores nuevos normalizados.
- `pnpm qa:gates --changed`
- `pnpm ops:lint --changed`
- GVC staging del escenario definido, con revisión manual de desktop 1440 y mobile 390.
- `pnpm docs:closure-check` y, si se edita `Handoff.md` o `changelog.md`, `pnpm docs:context-check:strict` como último gate.

## Closing Protocol

- [ ] `Lifecycle` y carpeta quedan sincronizados con estado real.
- [ ] `docs/tasks/README.md`, registro de IDs y EPIC-011 quedan sincronizados.
- [ ] ADR/arquitectura, documentación funcional y manual de Careers/Hiring reflejan el contrato desplegado.
- [ ] `Handoff.md` y `changelog.md` se actualizan si cambió runtime, evidencia o deuda.
- [ ] se revisó impacto sobre TASK-1367, TASK-1372, TASK-1373, TASK-354 y TASK-355.
- [ ] no queda evidencia versionada que contenga PII de candidatos.

## Follow-ups

- Captura/remediación explícita de datos de contacto para candidatos históricos, sólo si Hiring/Privacy definen finalidad, consentimiento y canal; nunca por inferencia.
- Cualquier automatización CRM o de contacto posterior requiere contrato separado de consentimiento, retención e integración.

## Delta 2026-08-11

- Creada tras auditoría de postulaciones reales: `TASK-354` queda cerrada como Careers UI/rollout histórico y este trabajo absorbe su residual de persistencia de contacto.
