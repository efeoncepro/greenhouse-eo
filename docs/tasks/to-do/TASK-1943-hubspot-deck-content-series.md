# TASK-1943 — Deck HubSpot de «La órbita»: la serie de contenido equivalente a la de Salesforce

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

La práctica RevOps & CRM vende Salesforce y HubSpot, y «HubSpot-first» es uno de los veredictos de la lámina
«¿Salesforce o HubSpot? El que encaje.». El 2026-09-29 se aprobó la serie completa de láminas de Salesforce (TASK-1942),
pero HubSpot sólo tiene portada de línea y propuesta (`revenue-hubspot`, plate RV1b). Esta task produce la serie de
contenido HubSpot reutilizando las recetas de práctica de Salesforce con datos y assets oficiales de HubSpot, para
aprobación del operador.

## Why This Task Exists

Un cliente que sale del diagnóstico con el veredicto HubSpot-first hoy no tiene un deck equivalente: sólo portada y
propuesta. Las láminas de contenido (una sola operación, agentes con supervisora, identidad y consentimiento,
migración, día a día, adopción, qué medimos) existen únicamente con productos, íconos y ledger de Salesforce. Sin la
serie HubSpot, el equipo comercial improvisa o usa las de Salesforce, lo que contradice la neutralidad que promete
la propia lámina de encaje.

## Goal

- Una serie HubSpot aprobada por el operador en el canvas «La órbita», con las mismas recetas de práctica que la de
  Salesforce donde aplican.
- Assets oficiales de HubSpot (logo, íconos de producto, badge de partner) con procedencia y su propia verificación.
- Las láminas registradas en el catálogo como usos aprobados (`approvedUses`) de las recetas de práctica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 («Deck de práctica Salesforce» y el pendiente HubSpot)
- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (recetas de práctica de TASK-1942)
- `docs/services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md` y `docs/services/revenue-operations-crm/`
- `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md` (fila HubSpot: tier no revalidado)
- Skills `hubspot-solutions-partner`, `hubspot-as-a-service`, `efeonce-graphic-line`, `deck-studio`

Reglas obligatorias:

- Misma práctica, misma voz: eyebrow · pregunta con anillo · respuesta con esfera ≥ 3× · evidencia; acento de la línea
  `revenue-hubspot` leído del token.
- Logos e íconos de HubSpot sólo desde su fuente oficial (registro de logos del repo o kit oficial de HubSpot), con
  procedencia; nunca redibujados ni recoloreados.
- Badge «HubSpot Solutions Partner» sólo con su propio readback vigente (el registro de partnerships dice que el tier no
  está revalidado); respaldo sin badge siempre listo.
- Sin mascota inventada: HubSpot no tiene una mascota aprobada en el sistema y no se crea una.
- Cifras de muestra marcadas, montos `[MONTO]`, fechas de corte en las láminas de temporada.

## Normative Docs

- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`
- `ai-generations/2026-09-29_deck-salesforce/CANON-INVENTARIO.md` (la serie de referencia)
- `docs/services/hubspot-as-a-service/HUBSPOT_FALL_2026_UNBOUND_RELEASES_2026-09-16.md` (ledger de lanzamientos de la temporada)

## Dependencies & Impact

### Depends on

- `TASK-1942` (canonización del deck Salesforce): las recetas de práctica que esta serie reutiliza. Sus plantillas
  (Slice 2 de TASK-1942) son necesarias para componer; el diseño y la aprobación pueden ir antes.
- `TASK-1937` (biblioteca de autorizaciones de terceros): donde se archiva el uso de marca de HubSpot.

### Blocks / Impacts

- `TASK-1932` (Proposal Studio): un deck HubSpot componible desde una propuesta.
- Catálogo del deck: nuevos `approvedUses` en las recetas de práctica; ninguna receta nueva salvo decisión del operador.

### Files owned

- `ai-generations/<fecha>_deck-hubspot/` (script de dirección, láminas, fuentes de assets; binarios fuera de git)
- `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json` (sólo `approvedUses` HubSpot)
- Delta en `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 y en el manual

## Current Repo State

### Already exists

- Variante `revenue-hubspot` de la portada de línea (`cover-brochure-line-revenue`, plate RV1b) y de las propuestas
  `proposal-cinematic-revops` y `proposal-service-revops`.
- Logotipo `public/images/logos/partners/hubspot-logotype.svg` y `src/lib/artifact-composer/catalogs/deck-axis/assets/tools/hubspot-logo-cream.svg`.
- Recetas de práctica de TASK-1942 (12, sin plantilla todavía).

### Gap

- Íconos oficiales de producto de HubSpot (Hubs y agentes) sin descargar ni registrar [verificar la fuente oficial vigente].
- Badge HubSpot Solutions Partner sin archivo en el repo ni readback [verificar el kit en OneDrive `04. Logos & Partnership/`].
- Ninguna lámina de contenido HubSpot diseñada ni aprobada.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `greenhouse-eo/ai-generations` (dirección, fuera de git salvo scripts) y el catálogo del deck en `docs/operations/brand-graphic-line/deck-recipes`
- Future candidate home: `undecided`
- Boundary: catálogo de recetas del deck + plantillas del Artifact Composer; sin runtime nuevo
- Server/browser split: composición server-only (CLI y `artifact-worker`)
- Build impact: `none`
- Extraction blocker: `none`

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

### Slice 1 — Assets oficiales de HubSpot

- Íconos oficiales de producto (Marketing, Sales, Service, Content, Data, Commerce Hub y los agentes, si HubSpot publica
  íconos propios) desde la fuente oficial, con un `FUENTES.txt` como el de Salesforce.
- Badge HubSpot Solutions Partner del kit oficial, con readback en el portal de partners antes de usarlo.

### Slice 2 — La serie en el canvas

- Láminas de dirección con las recetas de práctica y datos HubSpot (tabla del Detailed Spec), publicadas en el canvas
  «La órbita», página Deck, con título «NUEVA · HubSpot · …», para aprobación del operador.

### Slice 3 — Catálogo, norma y manual

- `approvedUses` HubSpot en las recetas de práctica usadas; delta en la norma §4.6 y en el manual; si alguna lámina no
  cabe en su receta, se anota en `fit` y se decide con el operador.

## Out of Scope

- Recetas o plantillas nuevas (las hace TASK-1942 o una task nueva si el operador aprueba una lámina sin receta).
- Mascota o personaje para HubSpot.
- Publicación del badge sin readback.

## Detailed Spec

| Receta de práctica (TASK-1942) | ¿Aplica a HubSpot? | Con qué datos |
|---|---|---|
| `decision-provider-fit` | sí, tal cual | es la misma lámina: HubSpot-first es uno de sus veredictos |
| `content-one-platform` | sí, con datos | Hubs de HubSpot sobre una sola base de clientes; íconos oficiales de HubSpot |
| `content-service-lanes` | sí, con datos | carriles de la oferta HubSpot (`HUBSPOT_OFFER_ARCHITECTURE_V2.md`); sin mascota |
| `method-agent-supervisor` | sí, con datos | agentes de HubSpot con su ficha y supervisión; ícono oficial si existe |
| `method-identity-consent` | sí, con datos | consentimiento y suscripciones de HubSpot |
| `method-migration-reconcile` | sí, con datos | migración a HubSpot; el método no depende del producto |
| `content-day-release-cycle` | sí, con datos | sandbox de HubSpot y sus herramientas |
| `content-day-live-library` | sí, con datos | tutoriales por rol sobre el portal del cliente |
| `content-measure-formulas` | sí, con datos | fuentes de HubSpot |
| `content-season-launches` | sí, con su ledger | lanzamientos de la temporada de HubSpot con fecha de corte (ledger `HUBSPOT_FALL_2026_UNBOUND_RELEASES_2026-09-16.md`); sin mascota |
| `content-live-chat` | sólo si existe el conector de HubSpot para el asistente y se autoriza su marca | [verificar] |
| `decision-platform-coexistence` | no, salvo un caso real | HubSpot no tiene un par de generaciones equivalente a Engagement/Next |

Portada, propuesta y contraportada: `cover-brochure-line-revenue` y las propuestas RevOps ya tienen la variante
`revenue-hubspot` (RV1b); la contraportada de propuesta con `sloganLineWord: Revenue` necesita un plate con luz magenta
o se decide con el operador.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (assets con procedencia) antes del 2; el 3 sólo con la serie aprobada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Badge de partner sin readback en una pieza enviada | Comercial / legal | medium | respaldo sin badge; readback antes de usarlo | deck con badge sin registro de readback |
| Íconos no oficiales o recoloreados | Marca | medium | sólo fuente oficial con `FUENTES.txt` | ícono sin procedencia |
| Lámina que no cabe en su receta | Composer | medium | registrar en `fit` y decidir con el operador | `slot-over-max-chars` en el plan |

### Feature flags / cutover

- Sin flag: repo-only change, catálogo aditivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–3 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

1. Serie aprobada por el operador en el canvas.
2. `pnpm brand:deck-recipes --check` y un plan HubSpot validado con `pnpm brand:deck-plan -- --plan`.

### Out-of-band coordination required

- Aprobación del operador; readback del badge por el owner comercial; autorización de uso de marca de HubSpot.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los íconos y el logo de HubSpot usados tienen procedencia oficial registrada.
- [ ] El badge HubSpot Solutions Partner sólo aparece con readback registrado; existe la variante sin badge.
- [ ] El operador aprobó la serie HubSpot en el canvas «La órbita».
- [ ] Cada lámina aprobada está en `approvedUses` de su receta de práctica, con su `fit`.
- [ ] La norma §4.6 y el manual describen el deck HubSpot y ya no lo listan como pendiente.
- [ ] Ninguna lámina lleva una mascota o personaje de HubSpot.

## Verification

- `pnpm brand:deck-recipes --check`
- `pnpm vitest run src/lib/brand-surfaces`
- `pnpm brand:deck-plan -- --plan <plan del deck HubSpot>`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1942 recibió delta con los usos HubSpot de sus recetas de práctica

## Follow-ups

- Contraportada de propuesta con luz magenta (`revenue-hubspot`) si el operador la pide.

## Open Questions

- ¿El deck HubSpot se entrega como brochure, como propuesta o ambos (misma pregunta abierta que el de Salesforce)?
