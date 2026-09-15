# TASK-1801 — Contacto multistakeholder con formulario condicional y agenda

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1801-contacto-multistakeholder.md`
- Flow: `docs/ui/flows/TASK-1801-contacto-multistakeholder-flow.md`
- Motion: `docs/ui/motion/TASK-1801-contacto-multistakeholder-motion.md`
- Backend impact: `integration`
- Epic: `EPIC-047`
- Status real: `Cerrada — landing pública construida, verificada y aprobada por el operador el 2026-09-15`
- Rank: `EPIC-047-H1`
- Domain: `public-site|growth|crm|content|ui|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reconstruir `efeoncepro.com/contacto/` como una recepción multistakeholder: potenciales clientes, partners,
clientes actuales, sugerencias, reclamos, empleo y otras consultas comparten una entrada clara, pero reciben
campos, consentimientos, destinos y respuestas adecuados a su motivo. La página ofrece agendamiento independiente
y corrige dirección, teléfonos y cobertura institucional sin duplicar la lógica de Growth Forms o Meetings.

### Decisión de alcance al cierre — 2026-09-15

El operador identificó explícitamente esta unidad como la construcción de la landing de Contacto y aprobó el
runtime público resultante. El cierre acredita la superficie visible, su composición responsive, el formulario
hosted, la bifurcación de Careers, las vías de agenda, los datos institucionales page-scoped y SEO/AEO. No acredita
SLA por motivo, routing no comercial completo, entrega de cada destino ni booking end-to-end: esos objetivos del
brief inicial quedaron fuera del alcance aceptado y requieren un intake operativo independiente si se retoman.
`TASK-1510` conserva la graduación general de Meetings. El footer global conserva una dirección legacy y no se
reescribió desde una corrección page-scoped.

## Why This Task Exists

La página pública actual obliga empresa y teléfono y termina en «Detalles del proyecto» incluso cuando la persona
quiere proponer una alianza, dejar una sugerencia o presentar un reclamo. Además muestra Las Bellotas 199 y un
número anterior, y promete respuesta en menos de 24 horas sin que exista aquí evidencia de ese compromiso.

El repo ya tiene dos capacidades canónicas: Growth Forms gobierna definiciones versionadas, condiciones, validación,
PII, consentimientos y dispatch; Meetings gobierna disponibilidad, booking, CRM, Teams y receipts. El gap es componer
ambas como una experiencia de Contacto, configurar su routing real, publicar por el camino Elementor gobernado y
probar el flujo completo. WordPress no debe convertirse en un segundo motor de formularios ni contener mappings o
secrets.

## Goal

- Una persona puede elegir su motivo y enviar sólo la información necesaria, sin sesgo comercial ni campos ocultos.
- Agendar es una vía independiente y server-confirmed; una falla del scheduler no bloquea el formulario.
- Dirección, teléfonos y mercados coinciden con las fuentes institucionales y distinguen cobertura de oficinas.
- Routing, consentimientos, privacidad, idempotencia y telemetría quedan verificados en runtime antes de publicar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Greenhouse posee form definitions, versions, conditions, validation, submissions, consent, destinations,
  dispatch, retries y meeting bindings. WordPress es un host del renderer.
- No escribir `_elementor_data` directamente; usar `Document::save(elements, settings)` con snapshot, hash y
  guardia de ownership, purgar Kinsta y hacer readback público.
- No llamar HubSpot inline desde submit, no exponer mapping/GUID/secrets al browser y no convertir la API de CRM
  Meetings en booking.
- Éxito de formulario y reunión requiere receipt server-side; click o UI optimista no son conversión.
- PII y texto libre nunca entran en `dataLayer`, logs crudos, URLs, UTMs o métricas.
- Estados Unidos es mercado operativo, no evidencia de oficina o entidad legal; métricas históricas de cuatro países
  no se amplían por inferencia.

## Normative Docs

- `docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md`
- `docs/context/01_quienes-somos.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/ui/visual-directions/TASK-1801-contacto-multistakeholder.md`
- `docs/ui/wireframes/TASK-1801-contacto-multistakeholder.md`
- `docs/ui/flows/TASK-1801-contacto-multistakeholder-flow.md`
- `.codex/skills/efeonce-public-site-wordpress/references/growth-forms-wordpress.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-workflow.md`
- `.codex/skills/efeonce-public-site-wordpress/references/elementor-mutation.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-registry.md`

## Dependencies & Impact

### Depends on

- `TASK-1509` y `TASK-1510`: adapter y experiencia portable de Meetings; se verifica estado vivo y se habilita
  Contacto como superficie propia, no por inferencia desde `/agenda/`.
- `src/lib/growth/forms/**`, `src/growth-forms-renderer/**` y APIs públicas existentes.
- Widget `greenhouse_growth_form` de `eo-elementor-widgets` en el runtime público.
- Owner/destino y SLA aprobados para comercial, partners, clientes, sugerencias, reclamos, empleo y otras consultas.

### Blocks / Impacts

- Todos los CTAs y fallbacks que hoy navegan a `/contacto/`.
- Menú/footer público y la información institucional repetida en superficies activas.
- HubSpot Forms/CRM sólo para motivos allowlisted; reclamos y sugerencias requieren destino no comercial aprobado.
- Medición GTM/GA4 del funnel y reconciliación de submissions/bookings por receipt.

### Files owned

- `docs/tasks/complete/TASK-1801-contacto-multistakeholder-form-agenda.md`
- `docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md`
- `docs/ui/visual-directions/TASK-1801-contacto-multistakeholder.md`
- `docs/ui/wireframes/TASK-1801-contacto-multistakeholder.md`
- `docs/ui/flows/TASK-1801-contacto-multistakeholder-flow.md`
- `scripts/growth/` — configuración/readback reproducible de la definición de Contacto, con nombre final decidido en Discovery.
- `scripts/public-website/` — verificación page-scoped de Contacto, con nombre final decidido en Discovery.
- `.codex/skills/efeonce-public-site-wordpress/references/landings/` y espejo `.claude/` — registrar Contacto antes de la segunda mutación significativa.

## Current Repo State

### Already exists

- `conditional_simple` y `multi_step_light` en `src/lib/growth/forms/contracts.ts` y renderer.
- APIs admin/públicas, PII boundary, Turnstile, rate limit, dispatch async y HubSpot adapter.
- `MeetingSchedulerHost`, `open_meeting_scheduler`, bindings por superficie y piloto `/agenda/`.
- Dirección, teléfonos, correo y mercados en `src/config/efeonce-brand.ts` y la contraportada canónica.
- Página pública `/contacto/`, pero con copy, datos y formulario legacy; page id y hash se verifican antes de escribir.

### Gap

- No existe una definición/contact surface gobernada con los siete motivos y routing aprobado.
- Reclamos/sugerencias no tienen aquí owner, SLA ni receipt de seguimiento declarados.
- Meetings no está graduado para Contacto con evidencia propia.
- La página live sigue publicando dirección/teléfono antiguos y no comunica Estados Unidos como mercado operativo.
- No hay escenario GVC durable ni verificador técnico específico de `/contacto/`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse `src/lib/growth/forms/**` + `src/lib/growth/meetings/**`; host WordPress en runtime público.
- Future candidate home: `remain-shared`
- Boundary: Growth Forms y Meetings son contratos server-side; WordPress/Elementor sólo compone embeds y copy
  público. HubSpot recibe únicamente destinos allowlisted por el dispatcher.
- Server/browser split: servidor compila contrato, valida, persiste, despacha y confirma; browser renderiza campos,
  estado y focus desde el contrato sin conocer secretos o routing interno.
- Build impact: renderer portable y artefacto público existente; no agregar dependencia pesada ni entrypoint global.
- Extraction blocker: configuración, auth, PII y provider lifecycle pertenecen al control plane Greenhouse y sus
  workers; no se duplican en WordPress.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: visitante público — prospecto, partner, cliente, persona con sugerencia/reclamo, postulante u otra consulta.
- Momento del flujo: necesita encontrar el canal correcto, explicar su necesidad y recibir confirmación verificable.
- Resultado perceptible esperado: «Elegí el motivo correcto, envié lo necesario y sé qué ocurrirá después».
- Friccion que debe reducir: formulario comercial obligatorio, campos irrelevantes, agenda escondida, datos obsoletos y promesas sin owner.
- No-goals UX: portal de casos, chatbot, recepción de CV, carga de adjuntos, mapa pesado o directorio por cards.

### Surface & system decision

- Surface: WordPress `/contacto/`, reconstrucción de destino existente.
- Nav placement: `none` — no agrega destino; conserva la ubicación actual en menú/footer.
- Composition Shell: `no aplica` — superficie pública WordPress/Ohio, no portal Greenhouse.
- Primitive decision: `reuse` — `<greenhouse-form>`, `MeetingSchedulerHost`, CTA y módulos Elementor existentes.
- Adaptive density / The Seam: `no aplica` — no es superficie de análisis Greenhouse; usa adaptación del renderer.
- Floating/Sidecar/Dialog decision: Meetings usa su host/diálogo canónico; no se inventa modal.
- Copy source: definición versionada de Growth Forms + copy one-off gobernado en Elementor y brief público.
- Access impact: `none`; superficie pública, con CORS/origin/captcha/rate limit server-side.

### State inventory

- Default: motivo no elegido, agenda visible y CTA de continuación explicado/deshabilitado.
- Loading: host contenido, sin layout shift material.
- Empty: no aplica a formulario; disponibilidad vacía usa estado canónico de Meetings.
- Error: conserva borrador, sanitiza causa y permite reintento.
- Degraded / partial: Forms y Meetings fallan independientemente; canales institucionales verificados permanecen.
- Permission denied: no aplica; abuso/rate limit usa estado seguro y accionable.
- Long content: mensaje/tema largos con límites explícitos y wrapping.
- Mobile / compact: una columna, controles completos ≥44 px, sin tabs o scroll horizontal.
- Keyboard / focus: orden DOM, fieldsets/legends, summary de error, Escape/restauración del diálogo de Meetings.
- Reduced motion: cambios instantáneos; feedback no depende de transición.

### Interaction contract

- Primary interaction: elegir vía, escoger motivo, completar campos condicionales y enviar.
- Hover / focus / active: estados del renderer/CTA existentes con foco visible.
- Pending / disabled: submit bloqueado mientras falta requerido o está pending; doble submit no duplica.
- Escape / click-away: sólo Meetings; no descarta formulario.
- Focus restore: al CTA de agenda; errores enfocan el primer campo inválido.
- Latency feedback: pending textual, receipt al éxito y recovery sin limpiar datos.
- Toast / alert behavior: confirmación inline persistente y live region; no toast efímero como única evidencia.

### Motion & microinteractions

- Motion primitive: `CSS` — únicamente feedback/transiciones del renderer y diálogo existentes
- Enter / exit: sin motion nuevo; se acepta feedback mínimo del renderer existente.
- Layout morph: ninguno requerido; campos condicionales aparecen sin scroll forzado.
- Stagger: none.
- Timing / easing token: no aplica.
- Reduced-motion fallback: equivalencia instantánea.
- Non-goal motion: scroll reveal, parallax, autoavance o celebraciones en reclamos.

### Implementation mapping

- Route / surface: `/contacto/` en WordPress; ID/hash reales por discovery.
- Primitive / variant / kind: `greenhouse_growth_form`, `conditional_simple|multi_step_light`, `open_meeting_scheduler`.
- Component candidates: renderer Growth Forms y MeetingSchedulerHost existentes; módulos Ohio/Elementor.
- Copy source: brief V1 + form version + datos institucionales canónicos.
- Data reader / command: commands/readers de `src/lib/growth/forms/**` y `src/lib/growth/meetings/**`.
- API parity: APIs públicas/admin existentes; sin lógica de negocio en widgets Elementor.
- Access / capability: public origin allowlisted; bindings y flags server-side.
- States to implement: default, conditional, validation, pending, accepted, destination delayed, error, rate limited,
  Meetings loading/unavailable/confirmed y canales degradados.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-site-contacto-task-1801.json` a crear.
- Route: candidato de staging/WordPress y `/contacto/` live sólo tras aprobación.
- Viewports: 1440×1100, 1280×720, 890×1100, 390×844.
- Quality profile: `premium`.
- Required steps: motivos completos, atrás/cambio de motivo, validación, submit, agenda, recovery y teclado.
- Required captures: first fold, reclamo, sugerencia, error/success, agenda abierta/unavailable/confirmed, institucional.
- Required `data-capture` markers: hero, reason, form, agenda, institutional, receipt.
- Assertions: copy/valores exactos, campos ocultos no enviados, foco/live regions, no PII en analytics, receipts.
- Scroll-width checks: `scrollWidth === clientWidth` con inputs/select/listbox y diálogo abiertos.
- Reduced-motion / focus evidence: emulación reduced motion y recorrido keyboard-only.
- Review dossier: `docs/ui/reviews/TASK-1801-contacto-multistakeholder/`.
- Baseline decision / surface ID: baseline live actual como evidencia negativa; surface ID final en Discovery.

### Design decision log

- Decision: recepción editorial, formulario dominante y agenda secundaria independiente.
- Alternatives considered: directorio por stakeholder; split 50/50 comercial/agenda.
- Why this pattern: sirve motivos sensibles sin convertirlos en leads y reduce elección inicial a una pregunta.
- Reuse / extend / new primitive: `reuse`; cualquier gap reusable se separa como plataforma.
- Open risks: owners/SLA, destino no comercial, tratamiento de Careers, binding Meetings y claims públicos.

### Visual verification

- GVC scenario: `public-site-contacto-task-1801`.
- Viewports: 1440, 1280×720, 890 y 390.
- Required captures: definidos en scenario plan.
- Required `data-capture` markers: hero/reason/form/agenda/institutional/receipt.
- Scroll-width check: cero overflow a nivel página.
- Accessibility/focus checks: axe, labels, error summary, keyboard, dialog focus trap/restore.
- Before/after evidence: live legacy vs candidato vs post-publicación.
- Known visual debt: Ohio global fuera de ownership page-scoped se documenta y no se parchea globalmente.
- Visual scorecard: `docs/ui/reviews/TASK-1801-contacto-multistakeholder.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: Growth Forms definitions/versions/destinations y Meetings surface binding existentes.
- Consumidores afectados: WordPress UI, public APIs, ops-worker, HubSpot, Outlook/Teams y operator cockpit.
- Runtime target: `staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/forms/contracts.ts`, Forms APIs, Meetings APIs y PDR-009.
- Contrato nuevo o modificado: nueva definición/version/destinos de Contacto + binding de Meetings; sin endpoint nuevo.
- Backward compatibility: `compatible` — nueva identidad/surface; la URL pública conserva canonical.
- Full API parity: configuración y writes pasan por commands/admin APIs existentes; Elementor no escribe tablas ni llama providers.

### Data model and invariants

- Entidades/tablas/views afectadas: objetos existentes `form_definition`, versiones/submissions/destinations y
  meeting surface binding; nombres físicos exactos se verifican en Discovery antes de cualquier writer.
- Invariantes que no se pueden romper:
  - identidad `form-key` estable y versión publicada inmutable; destino/mapping nunca llega al browser.
  - campos invisibles no se validan ni envían; consentimientos y motivo permanecen explícitos y auditables.
  - receipt de aceptación no equivale a dispatch entregado; booking confirmado requiere provider/readback.
- Write-target allowlist: N/A — no se agregan tablas; se usan primitives y stores existentes.
- Tenant/space boundary: superficie pública `efeoncepro.com`, form/surface/origin allowlisted; sin confiar en tenant client-side.
- Idempotency/concurrency: idempotency key de submission/booking existente; retries del dispatcher, sin reenvío manual de delivered.
- Audit/outbox/history: submission y dispatch history existentes; referencia de reclamo deriva del receipt, no de PII analítica.

### Migration, backfill and rollout

- Migration posture: `seed` — definición/version/destinos/binding aditivos; sin schema ni backfill.
- Default state: definición/binding sin publicación/activación hasta staging y owners aprobados.
- Backfill plan: none; submissions legacy no se reclasifican.
- Rollback path: restaurar snapshot Elementor y versión previa; desactivar binding/destino/flag sin borrar submissions.
- External coordination: owner/SLA, HubSpot form/properties, Meetings scheduler, GTM publish y aprobación WordPress.

### Security and access

- Auth/access gate: APIs admin autenticadas para configuración; API pública con origin/surface, Turnstile y rate limit.
- Sensitive data posture: PII y texto potencialmente sensible en reclamos; minimización, cifrado/masking/reveal audit existentes.
- Error contract: errores canónicos sanitizados; no raw provider/DB errors.
- Abuse/rate-limit posture: honeypot, Turnstile, rate limits y replay/idempotency existentes; verificar por surface.

### Runtime evidence

- Local checks: renderer conditions/validation tests, config dry-run, WordPress technical verifier y task/UI gates.
- DB/runtime checks: readback de definición/version/destinos/binding; submission aceptada y campos ocultos ausentes.
- Integration checks: HubSpot allowlisted, canal no comercial, booking real con CRM/Outlook/Teams y GTM/dataLayer no-PII.
- Reliability signals/logs: `growth.forms.dead_letter_count`, `growth.forms.destination_failure_rate`,
  `growth.forms.submission_rejection_rate`, `growth.forms.hubspot_submit_failed` + señales Meetings vigentes.
- Production verification sequence: staging end-to-end → snapshot/hash → publicación Elementor → purge → public readback →
  submissions controladas por motivo → booking controlado → GTM/GA4 reconciliation → observación.

### Acceptance criteria additions

- Source of truth, contract surface, invariantes, límites de acceso y rollback quedaron documentados en esta task.
- No se agregó schema, tabla, API, command ni reader para construir la landing.
- La entrega por destino, los SLA, los smokes de submission/booking y la inspección de PII en logs no forman parte
  del cierre aceptado; no se infieren desde el render público ni desde una respuesta HTTP verde.

### Capability Definition of Done — Full API Parity gate

- La landing consume Growth Forms y Growth CTA/Meetings existentes; WordPress no incorporó SQL, mapping de
  destinos, secretos, endpoint como click-handler ni una integración Nexa-específica.
- Full API parity de nuevas capabilities no aplica porque el cierre no introduce ninguna capability nueva.

## Hybrid Execution Justification

- Why not split: no se introduce schema, endpoint, command, reader ni adapter reusable; la integración consiste en
  configurar capabilities existentes y verificar su consumo en una única superficie. Separarla dejaría una definición
  pública sin host o un host sin destino verificable.
- Primary execution profile: `ui-ux`.
- Contract boundary: Greenhouse Forms/Meetings poseen estado y providers; WordPress sólo compone los hosts.
- Risk controls: UI no empieza hasta cerrar owners/SLA/destinos; dry-run/readback, flags/bindings OFF, staging E2E,
  snapshot/hash Elementor, rollout por superficie, receipts y rollback independiente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery, ownership y contrato de datos

- Descubrir page id/hash/template/widget actual, links entrantes y datos públicos activos.
- Aprobar matriz `motivo → owner → destino → SLA → confirmación → política de marketing/retención`.
- Confirmar que `conditional_simple|multi_step_light`, destinations y Meetings cubren el flujo sin plataforma nueva.
- Verificar dirección, teléfonos, correo, mercados, atención presencial y cualquier claim antes de copy final.

### Slice 2 — Definición gobernada de Contacto

- Crear por command/admin API una definición/version de Contacto con siete motivos, campos condicionales,
  consentimientos separados, Turnstile/rate limit y success/error copy.
- Configurar destinos allowlisted y motivo como enum; reclamos/sugerencias no entran en secuencia comercial.
- Crear dry-run/readback reproducible; no escribir tablas directamente.

### Slice 3 — Primera pantalla y checkpoint visual

- Materializar sólo first fold del candidato: hero, selector de vía/motivo, agenda visible y surface del form.
- Capturar 1440/390, revisar jerarquía/densidad/identidad y registrar `ACCEPT FIRST FOLD` o `REVISE`.
- No completar secciones inferiores ni rollout antes de aceptar el checkpoint.

### Slice 4 — Página, estados y agenda

- Completar campos/estados, banda institucional y FAQ; conservar Ohio header/footer y CSS page-scoped.
- Activar binding específico de Meetings en staging y probar loading/unavailable/confirmed/recovery.
- Implementar analytics allowlisted sin PII y reconciliación desde receipts.

### Slice 5 — Rollout gobernado y cierre

- Snapshot/hash/ownership guard; `Document::save`; purge; readback; GVC desktop/tablet/mobile/reduced motion.
- Ejecutar submissions controladas para cada routing family y booking real; verificar destinos, CRM, Outlook/Teams,
  signals y no-PII.
- Observar, documentar rollback y corregir referencias activas que sigan usando dirección/lista obsoletas.

## Out of Scope

- Construir un CRM, mesa de ayuda, portal de reclamos o SLA engine.
- Crear schema/API/renderer/primitives nuevos sin task/ADR dependiente.
- Adjuntos, WhatsApp, chatbot, recepción de CV y oficina/entidad legal por país.
- Reescribir header/footer global, landings históricas o métricas de clientes.
- Publicar horarios, atención presencial o mapa sin verificación operativa.

## Detailed Spec

La matriz operativa del Slice 1 es un gate, no una pregunta abierta postergable. Ningún motivo puede publicar con
un destino genérico para “resolver después”. El motivo es un enum de routing y analítica; el contenido libre nunca
sale de su boundary. El formulario y Meetings fallan de manera independiente y cada uno conserva recovery propio.

La dirección y cobertura institucional son copy visible verificable. `EFEONCE_OPERATING_MARKETS` gobierna la lista
de mercados; no se deriva de `120+ empresas en 4 países`. Los teléfonos de la contraportada son teléfono, no WhatsApp.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → `ACCEPT FIRST FOLD` → Slice 4 → Slice 5.
- Ninguna mutación WordPress antes de snapshot/hash/ownership; ninguna publicación sin owners/destinos/SLA.
- Binding Meetings y destinos permanecen disabled/unpublished hasta staging E2E.
- Producción requiere readback de Forms, Meetings, WordPress y destinos; HTTP 200 aislado no basta.

### Risk matrix

| Riesgo                                   | Sistema                  | Probabilidad | Mitigation                                                                | Signal de alerta                                     |
| ---------------------------------------- | ------------------------ | ------------ | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Reclamo termina en nurture comercial     | Forms/HubSpot/privacidad | medium       | destino allowlisted por motivo + consentimiento separado + smoke por enum | submission de reclamo en lista/campaña comercial     |
| Campos ocultos se validan o despachan    | Renderer/Forms           | medium       | tests conditions + payload readback                                       | campo de otro motivo en submission/destination       |
| Booking duplica o confirma sin evento    | Meetings/HubSpot/Outlook | medium       | idempotency + receipt + readback                                          | provider_dispatched ambiguo o falta calendarEventId  |
| Datos institucionales vuelven a divergir | WordPress/docs/decks     | medium       | fuentes canónicas + verifier page-scoped                                  | Las Bellotas/lista de cuatro mercados en HTML activo |
| Elementor pisa WIP o shell global        | WordPress                | low          | snapshot/hash/ownership + `Document::save` + diff de módulos              | hash inesperado o header/footer alterado             |
| PII llega a analytics/logs               | GTM/GA4/runtime          | medium       | allowlist de enums + sentinel                                             | email/teléfono/texto en dataLayer o logs             |

### Feature flags / cutover

No se introduce flag nuevo. Se usan lifecycle unpublished/published de Forms, destinos/bindings existentes y flags
runtime de Forms/Meetings. Cutover: candidato/staging → activación por superficie → WordPress save/purge/readback.
Rollback: desactivar binding/destino, restaurar versión/snapshot y conservar submissions para auditoría.

### Rollback plan per slice

| Slice | Rollback                                                    | Tiempo  | Reversible?                  |
| ----- | ----------------------------------------------------------- | ------- | ---------------------------- |
| 1     | docs/config dry-run; revertir decisión antes de apply       | <15 min | sí                           |
| 2     | deprecar vNext/desactivar destinos; volver a versión previa | <15 min | sí, submissions se conservan |
| 3     | retirar candidato local/noindex                             | <10 min | sí                           |
| 4     | desactivar binding y restaurar snapshot Elementor           | <15 min | sí                           |
| 5     | rollback de versión/snapshot + purge + public readback      | <30 min | sí; no borrar auditoría      |

### Production verification sequence

1. Verificar safe modes/control plane aplicables, runtime status y árbol compartido.
2. Dry-run + apply de definición en staging; readback de version, conditions, policies y destinos.
3. GVC y submits por routing family en staging; verificar no-PII y signals.
4. Booking controlado staging con CRM/Outlook/Teams readback.
5. Snapshot/hash de página, save candidato, purge y public readback.
6. Aplicar en producción sólo tras aprobación de first fold/owners/SLA; repetir readbacks y smokes.
7. Observar Forms/Meetings/GTM y destinos; detener/revertir ante routing, PII o receipt inconsistente.

### Out-of-band coordination required

- Owner y SLA por motivo; canal no comercial de reclamos/sugerencias.
- Form/properties allowlisted en HubSpot sólo donde corresponda.
- Scheduler/persona organizadora y binding de Contacto.
- Publicación GTM y autorización final de WordPress/cutover.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `/contacto/` publica hero, formulario, alternativa de agenda, contacto directo y FAQ bajo el shell Ohio.
- [x] El operador aprobó explícitamente la landing pública el 2026-09-15.
- [x] El formulario presenta seis motivos comprensibles, consentimientos separados y un CTA único de envío.
- [x] `Quiero trabajar en Efeonce` sustituye el formulario por un callout único a Careers y permite volver a otra ruta.
- [x] La agenda es una vía visible e independiente del submit; el cierre no afirma booking ni entrega a providers.
- [x] La página muestra `hola@efeoncepro.com`, los tres teléfonos y la dirección de casa matriz verificada.
- [x] WordPress hospeda widgets/embeds canónicos; no se agregó schema, API, command, reader ni routing en Elementor.
- [x] Hero y banda oscura usan `clb__dark_section`; el footer global permanece presente y fuera del CSS full-bleed.
- [x] Readback público desktop y 390 px confirma `scrollWidth === clientWidth`; el operador aprobó el resultado visual.
- [x] Metadata/OG y el grafo Yoast (`ContactPage`, `Organization`, `FAQPage`) pasan el verificador focal.
- [x] Wireframe, flow y motion existen; la decisión de primitive se mantiene en `reuse`.
- [x] `UI ready` permanece `no`: los artefactos de diseño son anteriores al gate premium vigente; la aprobación
      explícita del runtime por el operador cierra esta entrega sin presentar esos artefactos como certificados.
- [x] Owners/SLA, routing por destino, submission/booking controlados y PII/log reconciliation quedan declarados
      como alcance retirado, no como evidencia inferida de esta task.

## Verification

- `pnpm task:lint --task TASK-1801`
- `pnpm ui:wireframe-check --task TASK-1801`
- `pnpm ui:flow-check --task TASK-1801`
- `pnpm ui:motion-check --task TASK-1801`
- `pnpm ui:readiness-check --task TASK-1801` antes de cambiar `UI ready: yes`
- `pnpm skills:mirrors`
- tests focales de `src/growth-forms-renderer/**` y `src/lib/growth/forms/**`
- dry-run/readback de form definition/destinations y meeting binding
- `pnpm public-website:runtime-status` + verifier TASK-1801 a crear
- GVC premium y smokes de submission/booking/analytics en staging y producción autorizada
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental

## Progress log

- 2026-09-15 — Cierre por alcance aceptado: el operador aprobó la landing construida. Readback público confirmó
  título/estructura, formulario, bifurcación de Careers, agenda, datos institucionales page-scoped, FAQ, footer
  presente y cero overflow a 1710/390 px. `verify-contacto-seo.cjs` pasó. La dirección legacy del footer global,
  owners/SLA/destinos y smokes de submission/booking no se declaran resueltos; quedan fuera de este cierre.

- 2026-09-15 — Candidato responsive preparado sin publicación: el hero móvil ancla el asset de Nexa arriba y elimina
  la costura azul causada por el offset vertical; el intro baja al tercio final con gradiente continuo y el corte de
  390 px preserva el rostro completo. La banda de reuniones pasa a icono + texto y CTA full-width en una segunda fila.
  Preview sobre HTML live: 684/390 px, `overflow=0`, hero 720/680 px y banda 270/273 px. Evidencia y contrato:
  `.captures/2026-09-15_contacto-responsive-composition/` y referencia Contacto de la skill pública. Rollout pendiente:
  `public-website:runtime-status` mantiene `production_deploy_apply` bloqueado; no se hizo write, purge ni publicación.

- 2026-09-15 — Selector premium de país implementado en el renderer como opt-in contractual
  `presentation.control=country_select`: 250 países canónicos con nombres es-CL, banderas SVG, typeahead y semántica
  combobox/listbox. El chevron down→up rota 180° sobre el mismo centro, vuelve por la trayectoria inversa y respeta
  reduced motion; el contrato reutilizable quedó en `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md` y
  espejos de la skill. Preview desktop/390: 0 overflow, 47 px de target, overlay correcto, 250 banderas y selección
  persistente. Rollout no ejecutado: servidor/renderer/flags deben llegar a producción antes de publicar la nueva
  versión del form mediante `scripts/growth/activate-contacto-country-select.ts`.

- 2026-09-15 — La landing pública queda indexable con canonical estable, metadata editorial de contacto,
  Open Graph/Twitter 1200×630 y `og:type=website`. El grafo page-scoped de Yoast conserva `ContactPage`, corrige
  la imagen principal que apuntaba por error al asset de Careers, enriquece la `Organization` existente con casa
  matriz y los tres teléfonos visibles, y describe las cuatro preguntas renderizadas como `FAQPage`. Esto es
  structured data de la página, no un schema de datos Greenhouse ni una capability nueva. Snapshot:
  `_gh_contacto_before_seo_20260915_145610`; verificador:
  `scripts/public-website/verify-contacto-seo.cjs`. La task permanece abierta por owners/SLA/destinos, binding,
  submissions/booking controlados y el resto de su Definition of Done.

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real aprobado.
- [x] El archivo vive en `docs/tasks/complete/`.
- [x] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` quedaron sincronizados con el cierre.
- [x] `Handoff.md` y `changelog.md` registran el cierre y sus límites.
- [x] Se ejecutó chequeo de impacto cruzado sobre `TASK-1510` y el footer global.
- [x] Landing registry y referencias WordPress están sincronizadas en `.codex` y `.claude`.
- [x] La documentación pública refleja el runtime final y no convierte alcance retirado en evidencia.
- [x] Publicación y readback page-scoped quedan documentados; destinos, booking/GTM y smokes no se declaran aplicados.

## Follow-ups

- Task backend separada sólo si Discovery demuestra que falta una capability reusable de routing/case management.
- Portal de seguimiento de reclamos, adjuntos o WhatsApp requieren alcance, privacidad y owners propios.
- Actualizar otras superficies públicas activas con cobertura obsoleta mediante su ownership/rollout, no editando
  snapshots históricos como si ya estuvieran publicados.

## Alcance retirado al cierre

- Owner/canal no comercial y SLA por motivo.
- Routing/receipt por destino, nurture allowlisted y reconciliación de PII/logs.
- Booking controlado con CRM/Outlook/Teams y publicación GTM.
- Corrección de la dirección legacy del footer global y cualquier claim de atención presencial/horario.
