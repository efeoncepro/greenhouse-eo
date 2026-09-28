# TASK-1930 — Datos reales en los slots del deck «La órbita»: logo, montos, equipo, métricas, casos y testimonios

## Delta 2026-09-27 — TASK-1928 dejó las plantillas

- TASK-1928 dejó **68 de 69** recetas del catálogo con plantilla en `graphic-line-deck` (commits `ab23fdd90`,
  `2c7c67c5d`, `39b9c7006`, `82964f2b4`, `3def01768`, `c3c290e16`, `64be8aa16`; AXIS `v0.3.20`). La única sin plantilla
  es `cover-brochure-cine-lines-selection` (el contrato de AXIS no admite selección en `cover-brochure`). El mapa receta →
  contentType vive en `src/lib/artifact-composer/catalogs/graphic-line-deck/recipe-map.json` y el índice publicado en
  `docs/operations/brand-graphic-line/deck-recipes/README.md` (columna «Plantilla»).
- Composiciones nuevas con su contentType propio: `content-pricing` (`table`, `.stage`, `.live`), `section-cine` (`team`
  por defecto, `.services`, `.about`, `.purpose`), `content-day` (`clock` por defecto, `.tools`, `.live-progress`,
  `.live-results`), `method-staircase.flat`, `method-hybrid-workforce.scene`.
- Contrato que los binders deben respetar: los largos de los `slots.json` son los del catálogo de recetas (paridad por
  test); las cifras entran por `figures` del contrato de AXIS con fuente obligatoria; los montos se imprimen `[MONTO]`;
  los logos de terceros viajan como archivo y el compositor los normaliza (asset `logo`: un tono, mismo peso, excepción
  tonal); las fotos del squad y de los momentos del día son plates con `plateRef` + `alt`; el contacto sale de
  `EFEONCE_CONTACT`, nunca del intent. Los ejemplos de cada receta están en `src/lib/brand-surfaces/examples/`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm|content`
- Blocked by: `TASK-1929`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Las recetas del deck «La órbita» declaran slots de datos —logo del cliente, montos, equipo, métricas, casos,
testimonios, logos de clientes— que hoy se llenan a mano. Esta task los conecta con la verdad de Greenhouse: un binder
por tipo de slot que lee sólo readers canónicos (Account 360 para el logo, la proyección económica congelada de la
propuesta para los montos, el roster real para el equipo, `proposal_evidence` para métricas, casos y testimonios) y
deja en cada slot su rastro (`source`, `evidenceRef`, `asOf`). Si no hay un dato verificable, el slot queda `unbound`
con su motivo y la composición falla cerrada: nunca se inventa un número, una cara ni un logo.

## Why This Task Exists

- **Los datos del deck se copian a mano.** El manual pide «reúne los datos reales» y da reglas (montos `[MONTO]` hasta la
  propuesta, cifras con fuente, logos sólo autorizados, fotos de ejemplo reemplazadas). Cada deck repite la búsqueda y
  cada copia puede quedar desalineada de la fuente.
- **Ya existen las fuentes, pero no el puente.** Account 360 expone el logo y su variante para fondo oscuro
  (`readOrganizationLogoVariants`); el aggregate `Proposal` guarda evidencia inmutable con clasificación y audiencia
  (`proposal_evidence`); los chapter-authors de TASK-1417 y TASK-1418 derivan montos y equipo como hechos con
  `evidenceRef`. Ninguno sabe llenar un slot de una receta de «La órbita».
- **Una segunda derivación sería un bug.** Si esta task calculara montos o equipo por su cuenta, habría dos fuentes
  para la misma cifra de una propuesta. El operador pidió readers canónicos y Full API Parity: el binder reutiliza los
  hechos, no los recalcula.
- **Los pendientes de QA lo exigen.** «Cifras sin fuente visible» y «foto de ejemplo del caso Sky» son exactamente lo
  que un binder fail-closed impide.

## Goal

- Un plan de deck válido (TASK-1929) sale de `bindDeckSlots` con cada slot de datos lleno desde un reader canónico o
  marcado `unbound` con motivo.
- Montos y equipo vienen de los mismos hechos que usan los chapter-authors (TASK-1417, TASK-1418); cero lógica
  paralela.
- Ningún slot `client_facing` se llena con evidencia `internal`, con una cifra sin fuente o con un logo o testimonio
  sin autorización registrada.
- El rastro de cada slot llega al manifest para que la procedencia del asset (TASK-1921, TASK-1932) lo conserve.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (Cliente, Colaborador, Persona)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (aggregate `Proposal`, `proposal_evidence`,
  proyección allowlisted de render, §5-ter hechos con `evidenceRef`)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1.md` (logos de organización y variantes)
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (cotizador y redacción de loaded cost/margen)
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (reglas de slots: `[MONTO]`, fuente de cifras, logos en
  un tono y autorizados)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Nunca un número del LLM.** Montos y métricas se inyectan desde hechos con `evidenceRef`; el texto del LLM (TASK-1929)
  no puede escribir un slot `money` ni `metric`.
- **Nunca una cara generada.** El slot `person` sólo acepta fotos del allowlist `squad-person`; sin foto real, el slot
  queda sin foto, no con una generada.
- **Sin loaded cost ni margen** en ningún slot ni en el rastro: se usa la proyección redactada del cotizador
  (`pricing-output-redaction.ts`), nunca el costeo interno.
- **Audiencia fail-closed:** un deck `client_facing` que usa una evidencia `internal` no compone (misma regla que
  `render-projection.ts`).
- **Logos y testimonios de terceros sólo con autorización registrada** como evidencia `attested` con su documento de
  respaldo; el logo del propio cliente de la propuesta sale de Account 360.
- **Cero lógica paralela:** los hechos de montos y equipo se consumen de los módulos de TASK-1417 y TASK-1418; si no
  existen todavía, el slice correspondiente espera.
- Avatares de personas por `resolveAvatarUrl` cuando aplique, nunca componiendo la URL a mano.

## Normative Docs

- `docs/tasks/to-do/TASK-1417-chapter-author-economico.md` (hechos económicos desde la proyección congelada)
- `docs/tasks/to-do/TASK-1418-chapter-author-squad.md` (hechos del roster y allowlist `squad-person`)
- `docs/tasks/to-do/TASK-1929-deck-plan-recipe-catalog-validator.md` (plan y contrato de slots)
- `docs/manual-de-uso/creative/componer-deck-con-recetas.md`

## Dependencies & Impact

### Depends on

- `TASK-1929`: `DeckPlan` y el catálogo generado con los tipos de slot.
- `TASK-1417` (slice de montos): hechos económicos derivados de la proyección congelada de la propuesta.
- `TASK-1418` (slice de equipo): hechos del roster real y resolver `squad-person`.
- `src/lib/account-360/organization-logo-variants-reader.ts` (`readOrganizationLogoVariants`: `logo_asset_id` y
  `logo_on_dark_asset_id`) y `src/lib/account-360/resolve-organization-logo.ts`.
- `greenhouse_commercial.proposal_evidence` (TASK-1392: fuente única por fila, `classification`
  `measured|illustrative|attested`, `audience` `internal|client_facing`, `as_of`, inmutable) y sus readers en
  `src/lib/commercial/tenders/proposals/`.
- `src/lib/finance/pricing/pricing-output-redaction.ts`.

### Blocks / Impacts

- `TASK-1932`: la salida productiva llena el plan con estos binders antes de encolar el render.
- `TASK-1921`: la procedencia del asset incluye el rastro de binding de cada slot.
- `TASK-1928`: sus `slots.json` son el contrato que los binders respetan.
- `TASK-1417` y `TASK-1418`: sus hechos pasan a tener un segundo consumidor; no deben quedar acoplados a la forma de
  las plantillas de `deck-axis`.

### Files owned

- `src/lib/brand-surfaces/deck-recipes/bindings/index.ts`, `types.ts`, `map.ts` `[nuevos]`
- `src/lib/brand-surfaces/deck-recipes/bindings/binders/client-logo.ts`, `money.ts`, `team.ts`, `metric.ts`,
  `proof.ts` `[nuevos]`
- `src/lib/brand-surfaces/deck-recipes/bindings/__tests__/**` `[nuevos]`
- `scripts/brand-surfaces/deck-plan.ts` (opción `--bind` para una propuesta de staging o un fixture)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (sección de datos reales por slot)
- `docs/manual-de-uso/creative/componer-deck-con-recetas.md` (paso 5 «Llena los slots» con datos reales)
- `docs/documentation/creative/linea-grafica-efeonce.md` (delta funcional)

## Current Repo State

### Already exists

- Logos de organización con variante para fondo oscuro (`readOrganizationLogoVariants`, `resolveOrganizationLogoUrl`),
  escritos sólo por su command.
- Aggregate `Proposal` con `proposal_evidence` inmutable y proyección allowlisted de render
  (`src/lib/commercial/tenders/proposals/render-projection.ts`); acción de Nexa `record_proposal_evidence` (TASK-1399)
  para registrar evidencia.
- Motor de chapter-authors con hechos y `evidenceRef` (`src/lib/commercial/tenders/proposals/authoring/`), incluido
  `credenciales-chapter-author.ts` (autor mínimo de prueba sobre una lista de credenciales).
- Plantillas `deck-axis` que ya resuelven equipo con allowlist `squad-person` (`team-gallery-full`), caso
  (`case-study-split`), testimonios (`testimonials-full`) y credenciales (`credentials-full`).

### Gap

- Ningún binder llena slots de recetas de «La órbita»; los datos se copian a mano.
- No hay un mapa declarado de qué slot de qué receta sale de qué fuente.
- No hay rastro de procedencia por slot en el manifest de «La órbita».
- Fuera de una `Proposal` (brochure, pitch, QBR) no hay regla escrita de qué datos pueden entrar.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/brand-surfaces/deck-recipes/bindings/` (binders server-only que consumen readers de `account-360`, `commercial/tenders/proposals` y los hechos de los chapter-authors)
- Future candidate home: `domain-package`
- Boundary: `bindDeckSlots(plan, context)` es el único contrato; recibe un `DeckPlan` válido y un contexto ya autorizado por el consumer (TASK-1932 o TASK-1921) y devuelve el plan con valores y rastro; los binders sólo llaman readers canónicos
- Server/browser split: sólo server (`server-only`); lee PostgreSQL por readers existentes; nunca llega a un Client Component
- Build impact: sin dependencias nuevas; importa readers de dominio que ya están en el bundle de Vercel y del Job `artifact-worker`
- Extraction blocker: los readers de Proposal y Account 360 comparten el PostgreSQL del portal; el binder no puede extraerse sin esos readers

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_core.organizations` (logos), `greenhouse_commercial.proposal_evidence`, hechos
  económicos y de equipo de TASK-1417/TASK-1418 (sobre la cotización congelada y el roster)
- Consumidores afectados: TASK-1932 (Proposal Studio), TASK-1921 (documento de marca), CLI local
- Runtime target: `local` y `staging` en esta task (lectura); producción cuando lo invoque TASK-1932 detrás de su flag

### Contract surface

- Contrato existente a respetar: `readOrganizationLogoVariants`, readers de `proposal_evidence`, proyección allowlisted
  de render, módulos de hechos de TASK-1417/TASK-1418, contrato de slots del catálogo (TASK-1929)
- Contrato nuevo o modificado: `bindDeckSlots(plan, context)`, `SlotBinding` (`status: bound|unbound`, `source`,
  `evidenceRef?`, `asOf?`, `reason?`), mapa declarado `recipeId.slotName → binder`
- Backward compatibility: `compatible` — lectura pura, sin cambios de schema
- Full API parity: UI futura, Nexa y MCP reciben el plan ya ligado a través del command de TASK-1932; ningún consumer
  resuelve datos por su cuenta

### Data model and invariants

- Entidades/tablas/views afectadas: lectura de `greenhouse_core.organizations`, `greenhouse_commercial.proposal_evidence`
  y las proyecciones que exponen TASK-1417/TASK-1418; ninguna escritura
- Invariantes que no se pueden romper:
  - Un slot `money` o `metric` sólo se llena desde un hecho con `evidenceRef`; nunca desde texto del LLM.
  - Antes de que la propuesta tenga cotización congelada, `money` se imprime `[MONTO]`.
  - Un slot `person` nunca recibe una foto fuera del allowlist `squad-person`.
  - Un deck `client_facing` nunca usa evidencia `internal`.
  - Un logo de tercero o un testimonio sólo entra desde evidencia `attested` con documento de respaldo.
  - Ningún slot ni rastro contiene loaded cost, margen ni datos personales más allá de nombre, rol y dedicación.
- Write-target allowlist: `N/A — no escribe en ninguna tabla`
- Tenant/space boundary: el contexto trae la `Proposal` y su organización ya autorizadas por
  `assertProposalStudioAccessForSubject` (en TASK-1932); fuera de una `Proposal`, sólo la organización de Efeonce
  (`EO-ORG-0007`) y hechos pre-evidenciados que traiga el intent
- Idempotency/concurrency: lectura pura; el mismo plan y el mismo contexto producen el mismo resultado mientras la
  evidencia no cambie (la evidencia es inmutable y se supersede con filas nuevas)
- Audit/outbox/history: sin evento propio; el rastro por slot viaja en el manifest y en la procedencia del asset

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: sólo CLI local y tests; en runtime lo activa TASK-1932 con su flag
- Backfill plan: sin backfill
- Rollback path: `revert PR`
- External coordination: el operador registra la autorización de uso de logos y testimonios como evidencia `attested`
  antes de que esos slots puedan ligarse

### Security and access

- Auth/access gate: sin endpoint; el consumer entrega un contexto ya autorizado; el binder rechaza un contexto sin
  `Proposal` para slots que la exigen
- Sensitive data posture: montos de propuestas (confidenciales, `client_facing` sólo por la proyección), nombres y
  roles del equipo; sin loaded cost, margen, sueldos ni PII adicional
- Error contract: `unbound` con motivo tipado (`no-evidence`, `internal-evidence`, `no-authorization`,
  `no-frozen-quote`, `no-real-photo`, `no-on-dark-logo`); errores de lectura con `captureWithDomain`, nunca crudos
- Abuse/rate-limit posture: lectura acotada por plan (máximo de láminas del documento); sin llamadas a providers externos

### Runtime evidence

- Local checks: tests por binder (bound, cada motivo de unbound), test de audiencia, test anti-leak de loaded cost y
  margen, test de que ningún `money`/`metric` sale de texto
- DB/runtime checks: corrida de `pnpm brand:deck-plan -- --bind` contra una `Proposal` de staging de Efeonce con
  evidencia real, registrada en el cierre
- Integration checks: sin integración externa
- Reliability signals/logs: sin señal nueva; `captureWithDomain` en errores de lectura
- Production verification sequence: la cubre TASK-1932 al encender su flag

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Los binders viven en `src/lib/brand-surfaces/deck-recipes/bindings/`.
- [ ] **Modelada como reader, no como click-handler.**
- [ ] **Read** por readers canónicos existentes; sin escrituras.
- [ ] **Capability + grant en el MISMO PR:** `N/A — sin endpoint propio; el consumer (TASK-1932) aplica `commercial.proposal.*``.
- [ ] **Camino programático declarado:** CLI local + follow-up explícito TASK-1932 (API, Nexa, MCP).
- [ ] **Write apto para `propose → confirm → execute`:** el binding ocurre antes del confirm y su rastro se muestra en el preview.
- [ ] **Un primitive, muchos consumers:** CLI, TASK-1921 y TASK-1932 llaman a `bindDeckSlots`.
- [ ] **Parity check = SÍ** una vez cerrada TASK-1932.

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

### Slice 1 — Contrato y mapa de binding

- `bindDeckSlots(plan, context)` con `SlotBinding` por slot y el mapa declarado `recipeId.slotName → binder` para las
  69 recetas (los slots de texto de voz no tienen binder: los propone TASK-1929 y los confirma una persona).
- Test: todo slot de tipo `logo`, `money`, `metric`, `person` o de prueba de las recetas tiene binder o una exclusión
  con razón escrita.

### Slice 2 — Logo del cliente

- Binder `client-logo` sobre `readOrganizationLogoVariants` de la organización de la `Proposal`: en portadas oscuras
  exige `logo_on_dark_asset_id` y queda `unbound` (`no-on-dark-logo`) si falta; nunca recolorea ni recorta el logo.

### Slice 3 — Métricas con fuente

- Binder `metric` sobre `proposal_evidence` `measured` y `client_facing`: valor, fuente visible (`locator`/`method`) y
  `asOf`; sin evidencia, `unbound` (`no-evidence`).

### Slice 4 — Casos, testimonios y logos de clientes

- Binder `proof` sobre `proposal_evidence` `attested` y `client_facing` con documento de respaldo (`source_asset_id`):
  caso (`decision-case`), testimonio (`decision-testimonial`), logos del muro (`content-clients`, `content-partners`) en
  un tono con la excepción tonal declarada.
- La foto de un caso sólo si es real y está en la evidencia; la foto de ejemplo del caso Sky nunca se liga.

### Slice 5 — Montos (espera TASK-1417)

- Binder `money` que consume los hechos económicos de TASK-1417 (proyección congelada de la propuesta, ya redactada);
  sin cotización congelada imprime `[MONTO]`.

### Slice 6 — Equipo (espera TASK-1418)

- Binder `team` que consume los hechos del roster de TASK-1418 y resuelve fotos por el allowlist `squad-person`.

### Slice 7 — CLI y documentación

- `pnpm brand:deck-plan -- --bind --proposal <id>` (staging) o `--facts <fixture>`; imprime la tabla de slots con
  estado y fuente.
- README del catálogo, manual y doc funcional.

## Out of Scope

- Calcular montos, costear o simular una cotización: es del cotizador y de TASK-1417.
- Decidir el roster: es de TASK-1418 y del squad del deal.
- Crear una biblioteca canónica de casos y testimonios fuera de la `Proposal` (follow-up si el operador la pide).
- Escribir evidencia: se usa la acción existente `record_proposal_evidence`.
- Validar el plan (TASK-1929), componer (TASK-1928) y encolar el render (TASK-1921, TASK-1932).
- Proponer textos de voz con LLM: TASK-1929.

## Detailed Spec

**Mapa de binding (ejemplos; el plan cierra la lista completa):**

| Receta · slot | Binder | Fuente | Sin dato |
|---|---|---|---|
| `cover-proposal-*` · logo del cliente | `client-logo` | `readOrganizationLogoVariants` (variante oscura) | `no-on-dark-logo` |
| `content-pricing*` · montos | `money` | hechos de TASK-1417 | `[MONTO]` (`no-frozen-quote`) |
| `content-team` · personas | `team` | hechos de TASK-1418 + `squad-person` | persona sin foto; nunca foto generada |
| `content-measure`, `decision-chart`, `content-focus` · métrica | `metric` | `proposal_evidence` `measured` | `no-evidence` |
| `decision-case` · caso y foto | `proof` | `proposal_evidence` `attested` + asset | `no-authorization` |
| `decision-testimonial` · cita y persona | `proof` | `proposal_evidence` `attested` | `no-authorization` |
| `content-clients`, `content-partners` · logos | `proof` | `proposal_evidence` `attested` por logo | se omite el logo; si quedan menos del mínimo, `unbound` |

**Fuera de una `Proposal`** (brochure, pitch o QBR de marca propia): sólo el logo de Efeonce (fijo de la receta) y
hechos pre-evidenciados que traiga el intent con `evidenceRef` a un asset; el resto queda `unbound`, que es la señal
correcta para que una persona decida.

**Rastro:** `{ slot, status, source: 'account-360' | 'proposal-evidence' | 'economic-facts' | 'roster-facts' | 'intent',
evidenceRef?, asOf?, reason? }`, incluido en el manifest resuelto.

## Rollout Plan & Risk Matrix

Lectura pura sobre readers existentes, sin escrituras ni endpoint propio: el impacto productivo llega con TASK-1932
detrás de su flag. Aun así, el dominio es comercial y los montos son confidenciales, por eso los guards de audiencia y
anti-leak son parte del alcance y no del rollout.

### Slice ordering hard rule

- Slice 1 → Slices 2, 3 y 4 (en cualquier orden) → Slice 7.
- Slice 5 sólo después de que TASK-1417 exponga sus hechos; Slice 6 sólo después de TASK-1418.
- La task puede cerrar Slices 1–4 y 7 y dejar 5 y 6 abiertos con `Status real` honesto si sus dependencias no cerraron.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un monto o costo interno llega a un slot `client_facing` | finance / cotizador | low | sólo la proyección redactada; test anti-leak de loaded cost y margen | test rojo; revisión del preview en TASK-1932 |
| Evidencia `internal` en un deck para el cliente | Proposal | medium | regla de audiencia fail-closed idéntica a `render-projection.ts` | `internal-evidence` en el rastro |
| Logo o testimonio sin autorización | legal / marca | medium | sólo evidencia `attested` con documento de respaldo | `no-authorization` |
| Segunda derivación de montos o equipo | cotizador / roster | medium | los binders importan los hechos de TASK-1417/1418; revisión de imports | diff con cálculo propio |
| Foto generada en el slot de una persona | marca / legal | low | allowlist `squad-person` sin fallback | test rojo |

### Feature flags / cutover

Sin flag propio: lectura pura sin consumer productivo. El cutover productivo lo gobierna el flag de TASK-1932.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–7 | `git revert` del slice (sin datos ni schema que deshacer) | < 10 min | sí |

### Production verification sequence

1. Local: tests focales de `src/lib/brand-surfaces/deck-recipes/bindings`.
2. Staging: `pnpm brand:deck-plan -- --bind --proposal <id>` sobre una `Proposal` de Efeonce con evidencia
   `measured` y `attested` real; revisar la tabla de slots y que ningún valor venga de texto.
3. Cierre: `pnpm local:check` y `pnpm test` completo; `pnpm build` sólo con autorización del operador.

### Out-of-band coordination required

- El operador (o comercial) registra como evidencia `attested` la autorización de uso de cada logo y testimonio de
  terceros antes de usarlos en un deck.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `bindDeckSlots` existe y devuelve un `SlotBinding` por slot de datos, con `source` y `evidenceRef` o `reason`.
- [ ] Todo slot `logo`, `money`, `metric`, `person` o de prueba de las 69 recetas tiene binder o exclusión con razón (test).
- [ ] El logo del cliente sale de `readOrganizationLogoVariants` y una portada oscura sin variante oscura queda `unbound` (test).
- [ ] Ningún slot `money` o `metric` se llena desde texto del LLM (test).
- [ ] Sin cotización congelada, `money` se imprime `[MONTO]` (test).
- [ ] Un deck `client_facing` con evidencia `internal` no compone y reporta `internal-evidence` (test).
- [ ] Logos de terceros y testimonios sólo se ligan desde evidencia `attested` con documento de respaldo (test).
- [ ] Ningún slot ni rastro contiene loaded cost, margen ni PII fuera de nombre, rol y dedicación (test anti-leak).
- [ ] Los binders de montos y equipo importan los hechos de TASK-1417 y TASK-1418 sin recalcularlos (o el slice queda abierto con `Status real` que lo dice).
- [ ] Hay evidencia de una corrida `--bind` contra una `Proposal` de staging registrada en el cierre.
- [ ] README del catálogo, manual y doc funcional describen qué slot sale de qué fuente.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre; focal `src/lib/brand-surfaces/deck-recipes/bindings`)
- `pnpm brand:deck-plan -- --bind --proposal <id>` contra staging (con `pnpm pg:connect` o el carril vigente)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en TASK-1932 y TASK-1921 con la firma final de `bindDeckSlots` y el formato del rastro

## Follow-ups

- Biblioteca canónica de casos, testimonios y logos autorizados de Efeonce fuera de una `Proposal`, si el operador la
  pide para brochures y pitches.
- Binder de fotos de caso reales desde el banco de plates (TASK-1931) cuando el caso tenga plate aprobado.

## Open Questions

- ¿La autorización de uso de un logo de cliente vale por deck o es permanente hasta revocarse? Hoy se modela por
  `Proposal` (evidencia `attested`); una autorización permanente pediría la biblioteca del follow-up.
- ¿Cuál es el mínimo de logos para que `content-clients` componga sin verse vacío? Lo fija el operador.
