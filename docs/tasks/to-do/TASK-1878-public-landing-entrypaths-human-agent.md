# TASK-1878 — Entradas a la oferta humano-agente desde Home, HubSpot y AEO

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: to-do
- Priority: P1
- Impact: Alto
- Effort: Medio
- Type: implementation
- Execution profile: ui-ux
- UI impact: copy
- UI ready: no
- Wireframe: docs/ui/wireframes/TASK-1878-public-landing-entrypaths-human-agent.md
- Flow: docs/ui/flows/TASK-1878-public-landing-entrypaths-human-agent-flow.md
- Motion: docs/ui/motion/TASK-1878-public-landing-entrypaths-human-agent-motion.md
- Backend impact: none
- Epic: EPIC-047
- Status real: Alcance de enlaces y copy registrado; no hay mutación del sitio
- Rank: EPIC-047-H2
- Domain: public-site|growth|content|ui|seo
- Blocked by: TASK-1877 publicada y verificada para activar enlaces; Discovery/copy puede comenzar antes
- Branch: Greenhouse develop; checkout compartido, sin worktrees
- Legacy ID: none
- GitHub Issue: none

## Summary

Corregir tres entradas existentes hacia la nueva oferta: Home no debe usar la tarjeta genérica de
CRM como sinónimo de HubSpot; la landing HubSpot explica cuándo el siguiente paso es transformar
el proceso; AEO puede enlazar el trabajo interno de marketing sin convertir su diagnóstico en
un embudo obligatorio de CRM. Es un follow-on acotado de copy/enlaces a TASK-1877, no un rediseño.

## Why This Task Exists

Home, HubSpot y AEO están publicados (HTTP 200 el 2026-09-19). La tarjeta de CRM de Home
apunta directamente a HubSpot y la oferta neutral no tiene destino público. TASK-1358 y TASK-1352
están cerradas por decisión del operador; no se reabren. La ruta de marketing ahora cruza
visibilidad pública, contexto de campaña y equipos humano-agente, pero el sitio aún no ofrece ese puente.

## Goal

- Dar a la oferta neutral un acceso claro desde Home sin cambiar el hero aprobado.
- Mantener la intención por plataforma de HubSpot y la intención AEO de su landing.
- Diferenciar CTA por job/origen y verificar navegación/atribución cuando TASK-1877 esté live.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md
- docs/strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md
- docs/services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md
- docs/architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md
- docs/architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md
- docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md
- docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md

Reglas: no tocar el hero de Home, no convertir HubSpot en landing genérica, no alterar el
formulario AEO ni su oferta, no prometer beta/ROI/casos sin prueba. El enlace a TASK-1877 sólo se
activa tras 200/canonical/CTA live; una publicación CMS o una respuesta 2xx sin recorrido no basta.

## Normative Docs

- docs/tasks/to-do/TASK-1877-equipos-humano-agente-landing.md
- docs/tasks/complete/TASK-1358-landing-agencia.md
- docs/tasks/complete/TASK-1352-landing-hubspot-agentic-platform.md
- docs/public-site/README.md
- docs/audits/public-site/2026-09-19-efeonce-human-agent-landing-demand.md — exposición de inbound/AEO y medición por entrada.
- .codex/skills/efeonce-public-site-wordpress/references/landing-workflow.md
- .codex/skills/efeonce-public-site-wordpress/references/landing-registry.md
- .codex/skills/efeonce-public-site-wordpress/references/landings/home-claude-design-preview.md
- .codex/skills/efeonce-public-site-wordpress/references/landings/hubspot-services.md
- .codex/skills/efeonce-public-site-wordpress/references/landings/aeo.md
- docs/ui/wireframes/TASK-1878-public-landing-entrypaths-human-agent.md

## Dependencies & Impact

### Depends on

- TASK-1877 live para activar enlaces; se puede preparar copy en draft antes.
- Readback actual de postId/hash/CTA de Home, HubSpot y AEO antes de cada edición.
- Aprobación del operador para cambiar copy público y destinos de navegación.

### Blocks / Impacts

- Home y las landings HubSpot/AEO, atribución UTM y recorrido hasta TASK-1877.
- TASK-1403 y TASK-1812 enlazarán por su cuenta desde sus futuras páginas; no se editan aquí.

### Files owned

- docs/tasks/to-do/TASK-1878-public-landing-entrypaths-human-agent.md
- docs/ui/wireframes/TASK-1878-public-landing-entrypaths-human-agent.md
- Cambios page-scoped en Home 251731, HubSpot 244079 y AEO 250265 sólo tras snapshot/readback.
- Referencias de esas landings en espejo Codex/Claude sólo si cambia su contrato operativo.

## Current Repo State

### Already exists

- Home 251731, HubSpot 244079 y AEO 250265 publicadas; referencia/registry de cada una.
- TASK-1877 define la oferta y ruta neutral propuesta.

### Gap

- No hay enlace verificable a la oferta neutral; Home confunde práctica CRM con HubSpot.
- No hay copy de transición desde AEO hacia marketing humano-agente sin desviar su CTA principal.
- Hay exposición propia para inbound y AEO, pero casi ningún clic en la ventana auditada; el enlace nuevo se
  evaluará por avance cualificado y no por impresiones o clics aislados. La URL inbound queda fuera de esta task.

## Modular Placement Contract

- Topology impact: public
- Current home: WordPress/Ohio/Elementor de efeoncepro.com en las tres páginas existentes.
- Future candidate home: public
- Boundary: copy y enlaces page-scoped; no nuevo form, command ni contrato de datos.
- Server/browser split: links y copy en HTML servido; JS nuevo no requerido.
- Build impact: ninguno; reutilizar módulos existentes.
- Extraction blocker: hashes/postIds y canonical de la nueva ruta deben verificarse antes del cutover.

## UI/UX Contract

### Experience brief

- UI rigor: ui-lite
- Usuario / rol: sponsor de operaciones/revenue o CMO que llega por Home, HubSpot o AEO.
- Momento del flujo: ya entiende un servicio o plataforma y considera rediseñar trabajo con agentes.
- Resultado perceptible esperado: encuentra la oferta adecuada sin perder la intención original.
- Friccion que debe reducir: un CTA que parece vendor-neutral pero lleva a HubSpot.
- No-goals UX: rediseñar páginas, crear menú global o cambiar conversiones existentes.

### Surface & system decision

- Surface: tres páginas publicadas, sólo copy y enlaces dentro de regiones existentes.
- Nav placement: none; no añade destino al menú global. Si se propone uno, nueva decisión de IA/owner.
- Composition Shell: no aplica a WordPress.
- Primitive decision: reuse de cards/links y bloques editoriales existentes.
- Adaptive density / The Seam: no aplica.
- Floating/Sidecar/Dialog decision: ninguno nuevo.
- Copy source: copy local validado con voz Efeonce; estados Growth Forms no se editan.
- Access impact: none (páginas públicas).

### State inventory

- Default: tarjeta/bloque/enlace con destino correcto.
- Loading: none para enlaces HTML.
- Empty: no activar el enlace si TASK-1877 no está live.
- Error: navegación no debe terminar en 404; gate bloquea publicación del cambio.
- Degraded / partial: sin JS, enlaces y copy visibles.
- Permission denied: no aplica a lectura pública.
- Long content: texto sin truncar en 390 px.
- Mobile / compact: bloque no compite con CTA principal.
- Keyboard / focus: enlaces distinguibles y foco visible.
- Reduced motion: sin cambio.

### Interaction contract

- Primary interaction: enlace contextual a oferta neutral; CTAs principales de HubSpot/AEO permanecen.
- Hover / focus / active: estilos nativos de la página.
- Pending / disabled: no mostrar link activo a URL pendiente.
- Escape / click-away: no aplica.
- Focus restore: navegación normal del browser.
- Latency feedback: no aplica a enlace HTML.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: none.
- Enter / exit: none.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: none.
- Reduced-motion fallback: paridad por ausencia de motion nuevo.
- Non-goal motion: animaciones para señalar el enlace.

### Implementation mapping

- Route / surface: Home 251731, HubSpot 244079, AEO 250265.
- Primitive / variant / kind: links/cards/bloques existentes.
- Component candidates: tarjeta CRM de Home y bloques editoriales page-scoped.
- Copy source: ledger aprobado para cada página.
- Data reader / command: ninguno nuevo.
- API parity: no cambia acciones de negocio.
- Access / capability: público.
- States to implement: destino verificado, JS-off, móvil y foco.

### GVC scenario plan

- Scenario file: verificación acotada por página en el rail público.
- Route: /, /servicios-contratar-hubspot/ y /aeo-2/.
- Viewports: 1440 y 390.
- Quality profile: premium para revisión visual proporcional, sin rediseño.
- Required steps: leer bloque, activar enlace, confirmar destino/canonical/CTA.
- Required captures: región editada desktop/mobile y página destino.
- Required data-capture markers: reusar selectores/markers actuales; confirmar en Discovery.
- Assertions: hero Home igual, form AEO intacto, CTA HubSpot intacta, sin 404.
- Scroll-width checks: documentElement.scrollWidth <= clientWidth.
- Reduced-motion / focus evidence: teclado y reduced sin regresión.
- Review dossier: registrar antes/después de cada página.
- Baseline decision / surface ID: postIds y hashes frescos del CMS.

### Design decision log

- Decision: enlaces contextuales page-scoped, sin nuevo menú global.
- Alternatives considered: transformar Home en landing o redirigir la tarjeta a HubSpot.
- Why this pattern: separar intención de plataforma de transformación transversal.
- Reuse / extend / new primitive: reuse.
- Open risks: ambigüedad de etiqueta CRM y saturación de CTA en AEO.

### Visual verification

- GVC scenario: proporcional por página tras CMS save y cache purge.
- Viewports: 1440 y 390.
- Required captures: bloque tocado y destino.
- Required data-capture markers: existentes, por confirmar.
- Scroll-width check: obligatorio.
- Accessibility/focus checks: semántica de enlace y foco.
- Before/after evidence: snapshots y readback actual, no sólo documentos.
- Known visual debt: fuera de alcance; registrar sin expandir la task.
- Visual scorecard: no nace primitive ni dirección nueva; revisión de regresión page-scoped.
- Quality threshold: preservar jerarquía/contraste del runtime aprobado.

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

### Slice 1 — Contrato por página

- Verificar live identidad, copia actual, hash, destinos, CTA y consentimiento; preparar copy ledger.
- Home: desambiguar tarjeta CRM/automatización y añadir acceso a transformación, sin tocar hero.
- HubSpot: bloque corto «cuándo el trabajo ya no es sólo configurar la plataforma» y enlace neutral.
- AEO: puente desde visibilidad pública a workflow interno de marketing sin mover su CTA principal.

### Slice 2 — Mutación controlada

- Con TASK-1877 live y aprobación del operador, snapshot y Document::save page-scoped por página.
- Purge y readback anónimo tras cada página; no aplicar las tres en un solo paso ciego.

### Slice 3 — QA y medición

- Probar destino 200/canonical/CTA, móvil/teclado/JS-off y ausencia de overflow.
- Verificar origen/UTM sin PII, sin equiparar click a lead; registrar rollback y referencias.

## Out of Scope

- Rediseñar Home, reabrir TASK-1358/TASK-1352, migrar HubSpot a /servicios/hubspot/.
- Crear/formar agentes, cambiar el form AEO o alterar oferta/precio HubSpot.
- Activar PAID, publicar casos o modificar el menú global por inferencia.

## Detailed Spec

Cada página conserva su trabajo principal: Home orienta, HubSpot convierte demanda por plataforma,
AEO vende diagnóstico de visibilidad. El puente a TASK-1877 es secundario y contextual. En marketing,
explicar que la información pública que citan motores y el contexto privado del agente de campaña
tienen autoridades distintas. No añadir un segundo CTA equivalente que compita con el existente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Discovery y copy aprobado → TASK-1877 live verificada → Home → HubSpot → AEO, con readback por
página. Si una conversión existente falla, detener y restaurar esa página.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Enlace a 404 | Sitio público | medium | Gate 200/canonical antes de CMS save | HTTP 404 o redirect inesperado |
| Cambio de form/CTA | Growth/HubSpot/AEO | medium | Hash/snapshot y diff page-scoped | Receipt o CTA cambia |
| CTA secundaria compite | Conversión | medium | Jerarquía editorial revisada | Caída cualificada sin causa |

### Feature flags / cutover

Sin flag nuevo: links permanecen inactivos hasta readback de TASK-1877; CMS save por página.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Retirar copy en draft | antes de publicar | sí |
| 2 | Restaurar snapshot Elementor por página y purgar cache | según rail WP | sí |
| 3 | Revertir únicamente enlace/copy que falla y repetir readback | según incidente | sí |

### Production verification sequence

1. Confirmar nueva URL 200/canonical y CTA funcional; aprobar copy y snapshots.
2. Guardar Home, purge, leer público desktop/mobile y probar destino.
3. Repetir en HubSpot y después AEO sin alterar sus CTA/form.
4. Leer atribución y registrar diferencias; stop ante 404, conversión rota o claim sin permiso.

### Out-of-band coordination required

Owner del sitio aprueba cambios a páginas publicadas; marketing valida copy; Growth confirma tracking y
conversión. Este registro no autoriza una mutación CMS automática.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Wireframe declarado existe; UI ready permanece no hasta mapping, GVC plan y decisión visual suficientes.
- [ ] Home conserva hero y corrige la ambigüedad CRM→HubSpot con acceso claro a la oferta neutral.
- [ ] HubSpot conserva intención de plataforma, CTA y form; el enlace transversal es contextual.
- [ ] AEO conserva su oferta y CTA; explica el puente marketing sin mezclar contexto público y privado.
- [ ] Los tres enlaces apuntan a TASK-1877 sólo tras 200/canonical/CTA verificados.
- [ ] Snapshots/hashes previos, Document::save, cache purge y rollback por página están documentados.
- [ ] HTML sin JS, móvil 390, teclado/foco y reduced pasan sin scroll horizontal ni claim nuevo no aprobado.
- [ ] Origen/UTM se mide sin PII y click no se reporta como lead.
- [ ] Landing refs y task/epic/handoff se actualizan con evidencia live de cada página.

## Verification

- pnpm task:lint --task TASK-1878
- pnpm ui:wireframe-check --task TASK-1878
- pnpm ui:flow-check --task TASK-1878
- pnpm ui:motion-check --task TASK-1878
- pnpm ops:lint --changed
- Readback HTTP/head y GVC proporcional en Home, HubSpot, AEO y destino final al ejecutar.

## Closing Protocol

- [ ] Lifecycle/carpeta y criterios reflejan realidad; no se cierra sólo por CMS save.
- [ ] README/registry/EPIC-047 y referencias page-scoped sincronizados.
- [ ] Handoff/changelog actualizados sólo con cambios realmente publicados/verificados.

## Follow-ups

- TASK-1403 y TASK-1812 tienen sus propios enlaces futuros hacia TASK-1877.

## Open Questions

- Copy exacto de Home y de los puentes HubSpot/AEO requiere revisión de voz y runtime en Discovery.
