# TASK-1485 — Globe Design System Governance and Incremental Pattern Registry

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `component`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1485-globe-design-system-pattern-lab.md`
- Flow: `docs/ui/flows/TASK-1485-globe-design-system-pattern-lifecycle-flow.md`
- Motion: `docs/ui/motion/TASK-1485-globe-design-system-motion-governance.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Boundary aprobada por operador; contrato/implementación pendientes`
- Rank: `TBD`
- Domain: `creative|ui-platform|governance|accessibility`
- Blocked by: `TASK-1455`
- Branch: `task/TASK-1485-globe-design-system-governance-pattern-registry`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el Design System propio de Globe como sistema incremental: Greenhouse gobierna decisiones, registry,
lifecycle, QA, evidencia y promoción; Globe posee e implementa tokens seleccionados, patterns, components,
motion y runtime sin heredar el Design System de Greenhouse.

## Why This Task Exists

La shell inicial resolvió identidad, pero los workbenches siguientes necesitan consistencia sin acoplar Globe
a Vuexy/MUI/CompositionShell ni improvisar patterns aislados por pantalla.

## Goal

Entregar un registry versionado y un Pattern Lab Globe donde cada pattern nazca `candidate`, demuestre anatomy,
states, responsive, a11y, motion y evidence, y sólo entonces se promueva para reuso. El registry también fija la
identidad internacional de la suite **Capacity**: la capacidad es la superficie de producto; `credits` es la
unidad operativa, no el nombre de una wallet ni una equivalencia monetaria.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/ui/visual-directions/TASK-1474-globe-studio-workbench-direction.md`
- `docs/ui/visual-directions/TASK-1483-globe-credits-operations-workbench-direction.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` sólo como quality/evidence bar, no inheritance.

## Dependencies & Impact

### Depends on

- `TASK-1455` para shell Orbital Threshold, brand assets y runtime UI verificado.

### Blocks / Impacts

- `TASK-1474` y `TASK-1483` registran/extienden patterns Globe mediante este lifecycle.
- Futuras surfaces Globe deben decidir `reuse | extend | new`, sin copiar patterns Greenhouse por defecto.

### Files owned

- En Greenhouse: decision log, registry metadata, lifecycle, QA/evidence y baseline references de Globe.
- En Globe: `apps/studio-web` Pattern Lab y packages/paths UI propios que Plan Mode defina.

No posee el Design System de Greenhouse ni autoriza dependencias Vuexy/MUI/React.

## Current Repo State

### Already exists

- Globe tiene shell branded HTML/CSS/TS y assets/tokens iniciales de Orbital Threshold.

### Gap

- No hay registry/lifecycle propio, pattern contracts ni ownership formal entre gobierno Greenhouse y runtime Globe.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `governance/evidence Greenhouse; source/runtime Globe`
- Future candidate home: `remain-shared`
- Boundary: `Globe Design System`
- Server/browser split: `pattern metadata build-time; runtime browser-safe sin secrets`
- Build impact: `Globe pattern lab + Greenhouse gates/GVC`
- Extraction blocker: `ninguno`

## UI/UX Contract

- Visual direction: `docs/ui/visual-directions/TASK-1485-globe-design-system-direction.md`
- Wireframe: `docs/ui/wireframes/TASK-1485-globe-design-system-pattern-lab.md`
- Flow: `docs/ui/flows/TASK-1485-globe-design-system-pattern-lifecycle-flow.md`
- Motion: `docs/ui/motion/TASK-1485-globe-design-system-motion-governance.md`
- Ownership: `Greenhouse governs; Globe designs/implements/owns its UI language`.
- Inheritance: `none by default`; selected shared brand colors require explicit token decision/provenance.
- Registry lifecycle: `candidate -> trial -> stable -> deprecated -> retired` con owner/version/evidence.
- Pattern contract: anatomy, slots, variants, states, density, responsive, content, a11y, motion, do/don't.
- Visual evidence: Pattern Lab desktop/mobile, keyboard, reduced motion, contrast y regression baselines.
- Suite identity: `Capacity` / `Capacidad`, `Studio Capacity` / `Capacidad del estudio`, `credits` / `créditos`.
- Cross-locale semantics: la identidad visual no depende del idioma; copy keys, estados y labels tienen fuente
  canónica por locale y conservan el mismo significado operativo.

### Credit identity and semantic contract

Los créditos son las unidades atómicas de capacidad creativa gobernada. No son dinero, saldo, wallet, token
negociable ni una segunda contabilidad. Cada representación visual debe explicar no sólo cuántos créditos existen,
sino qué capacidad está disponible, comprometida, consumiéndose o confirmada, en qué ámbito y con qué nivel de
certeza.

La primitive canónica se compone de tres capas:

1. **Credit Unit** — cantidad, unidad, formato, locale y estado de dato.
2. **Credit Phase** — fase operativa: `estimated`, `reserved`, `consuming`, `settled`, `released`, `blocked`,
   `partial`, `stale` o `unknown`.
3. **Capacity Context** — ámbito y causalidad: workspace, proyecto, pool, grant, run o evento de ledger.

La unidad mínima visible siempre contiene `cantidad + unidad + fase`. En superficies operativas añade el ámbito:

```text
24 credits · Reserved
24 créditos · Reservado
```

```text
24 credits · Reserved · Campaign A · Run 042
24 créditos · Reservado · Campaña A · Run 042
```

Un número desnudo (`24`, `184`, `−12`) no es una representación válida de credits.

#### Fases y comportamiento

| Phase | Meaning | Visual behavior |
|---|---|---|
| `estimated` | cálculo previo, aún no comprometido | azure tenue, marcado como estimate vigente |
| `reserved` | capacidad retenida para una acción | amber tonal, segmento anclado al runway |
| `consuming` | consumo activo del run | pulso azure breve, sin loop permanente |
| `settled` | consumo confirmado por el ledger | estado estable, rastro confirmado |
| `released` | reserva devuelta a capacidad disponible | segmento se reintegra sin dramatización |
| `blocked` | la acción no puede continuar | rojo tonal, causa y recovery visibles |
| `partial` | respuesta incompleta o cobertura parcial | amber y explicación de cobertura |
| `stale` | dato fuera de freshness válida | amber, timestamp y acción de refresh |
| `unknown` | ausencia de dato confiable | `—` y explicación; nunca se presenta como `0` |

#### Visual identity: Horizon + Orbit

La identidad visual de credits es **Horizon + Orbit**. El horizonte representa el límite de capacidad; el orbe
representa la unidad creativa; la órbita representa reservas y asignaciones; el pulso representa consumo activo; la
estela representa consumo confirmado; la banda discontinua representa proyección e incertidumbre.

El `Credit Unit` usa un orbital capacity mark, no una moneda. No utiliza signo monetario, tarjeta, relieve de moneda,
wallet, token crypto ni ticker financiero. La forma puede ser circular por continuidad con Globe, pero nunca debe
parecer una pieza de dinero.

La paleta expresa fase, no valor monetario: azure para capacidad activa, amber para reserva/proyección/atención,
verde tonal para operación confirmada, rojo tonal para bloqueo/error y azul grisáceo para estados liberados o
cerrados. Todo estado combina color con icono, label y texto.

#### Magnitude, phase and authority

Cada componente debe distinguir tres dimensiones:

- **Magnitude:** cuántos créditos.
- **Phase:** qué ocurrió o qué está ocurriendo con ellos.
- **Authority:** qué workspace, proyecto, pool, grant, run o evento los explica.

`Available`, `Budget`, `Consumed` y `Projected usage` no son sinónimos ni comparten el mismo tratamiento visual:

| Concept | Meaning | Canonical treatment |
|---|---|---|
| `Available` | capacidad actualmente utilizable | horizonte abierto / capacidad activa |
| `Budget` | límite autorizado | línea o marco de contención |
| `Consumed` | uso confirmado | segmento o rastro settled |
| `Projected usage` | posible uso futuro | banda de confianza, nunca certeza falsa |

#### Surface hierarchy

La misma primitive adopta cuatro densidades, sin crear identidades distintas:

- **Ambient:** Producer header, feed y context rail; muestra `Credit Pulse`.
- **Decision:** estimate, CTA y budget block; muestra consecuencia y vigencia antes de ejecutar.
- **Operational:** Capacity Workbench, pools y forecast; muestra runway, fases y asignaciones.
- **Evidence:** ledger, manifest e inspector; muestra evento, impacto, actor, ámbito y enlace causal.

El output creativo sigue siendo el héroe en Producer, Feed y Library. Credits sólo gana protagonismo en Capacity y
en los puntos donde una decisión de gasto, reserva o bloqueo requiere comprensión.

#### Motion and data honesty

Motion explica causalidad, no valor. `estimated → reserved` ancla un segmento; `reserved → consuming` activa un pulso
breve; `consuming → settled` deja un rastro estable; `released` devuelve capacidad al horizonte. No hay count-up
celebratorio, ticker, shake, flicker ni animación que sugiera velocidad o dinero.

`null`, `partial`, `stale`, `denied` y `unknown` nunca se normalizan a cero. Toda proyección distingue actual de
posible y toda cifra muestra freshness cuando el contrato lo exige.

#### Locale and copy contract

La identidad visual y el modelo de estados son independientes del idioma. Las copy keys permanecen estables y los
valores se localizan:

| Semantic key | English | Español |
|---|---|---|
| `globe.capacity.nav` | `Capacity` | `Capacidad` |
| `globe.capacity.title` | `Studio Capacity` | `Capacidad del estudio` |
| `globe.capacity.unit` | `credits` | `créditos` |
| `globe.capacity.estimated` | `Estimated` | `Estimado` |
| `globe.capacity.reserved` | `Reserved` | `Reservado` |
| `globe.capacity.settled` | `Settled` | `Liquidado` |
| `globe.capacity.projected` | `Projected usage` | `Consumo proyectado` |
| `globe.capacity.review` | `Review capacity` | `Revisar capacidad` |

La traducción no puede cambiar la jerarquía, la fase, la autoridad ni la diferencia entre estimate, reservation y
settlement.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Ownership, tokens and registry

- ADR/delta load-bearing con boundary Greenhouse-governance/Globe-runtime y no-inheritance.
- Registry machine-readable con IDs `globe.*`, lifecycle, version, owner, consumers y evidence refs.
- Taxonomía de Globe tokens: brand-selected, semantic, surface, type, space, radius, elevation, motion.

### Slice 2 — Pattern Lab and starter contracts

- Implementar Pattern Lab Globe y fixtures multi-state/responsive/audience.
- Registrar la shell vigente y contracts fundacionales, sin crear una biblioteca big-bang.
- Habilitar propuestas de `Creative Desk` y `Runway Control Plane` como candidates independientes.
- Registrar `Capacity Observatory` como composición transversal: `Credit Pulse`, `Runway Plane`, `Risk Rail`,
  `Allocation Navigator`, `Evidence Ledger` y `Governed Command Dock`.

### Slice 3 — Promotion gates

- Lint anti-unregistered-pattern/anti-cross-system-import y decision `reuse | extend | new` por task.
- Gates a11y/GVC/reduced-motion/overflow y proceso de deprecation/migration.

## Out of Scope

- Copiar Greenhouse UI, Vuexy, MUI, CompositionShell, recipes, layouts o motion patterns.
- Diseñar todos los patterns futuros por adelantado.
- Forzar los mismos tokens salvo colores de marca compartidos deliberadamente y documentados.
- Business logic, credits calculations o provider workflows.

## Detailed Spec

Ejecutar con `pnpm codex:task-hook TASK-1485 --develop` tras goal aprobado. La primera decisión de Plan Mode
es el package/path owner dentro de Globe; el registry canónico y su evidencia permanecen gobernados desde
Greenhouse. Cada nueva surface puede crear candidates en su task, pero promueve sólo por este contrato.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigation | Signal |
|---|---|---|
| Globe hereda Greenhouse accidentalmente | lint dependency/import + ADR no-inheritance | import cross-system |
| registry sin runtime truth | conformance Pattern Lab/source/evidence | entry sin consumer/source |
| big-bang design system | candidate on demand + consumers reales | pattern sin use case |
| drift visual/a11y | baseline multi-state + promotion gates | regression/axe/overflow |

- Feature flag: Pattern Lab internal-only.
- Rollback: retirar candidate/consumer, conservar version/evidence; stable usa deprecation, no delete.
- Verification: registry lint -> Pattern Lab -> keyboard/a11y -> GVC desktop/mobile -> consumers pilot.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR/decision declara Greenhouse governance, Globe ownership/runtime y no inheritance automática.
- [ ] Registry machine-readable valida ID/version/lifecycle/owner/consumer/evidence.
- [ ] Cada pattern documenta anatomy, states, responsive, a11y, motion y content contract.
- [ ] `Capacity Observatory` queda registrado como composición transversal con variantes compactas y full-workbench.
- [ ] Credit Unit, Credit Phase y Capacity Context tienen contract, fixtures y variantes por superficie.
- [ ] Las fases, freshness, partial/unknown y la diferencia available/budget/consumed/projected tienen evidencia.
- [ ] Horizon + Orbit se documenta y se prueba sin iconografía de wallet, token o dinero.
- [ ] English y Español conservan las mismas semantic keys, estados, jerarquía y alternativas accesibles.
- [ ] Pattern Lab muestra fixtures desktop/mobile/keyboard/reduced motion y estados honestos.
- [ ] No existen imports/dependencies de UI Greenhouse en Globe salvo contrato explícitamente aprobado.
- [ ] Compartir colores queda token-by-token documentado; no arrastra patterns ni semantics completas.
- [ ] `TASK-1474`/`1483` pueden registrar candidates sin esperar una biblioteca exhaustiva.

## Verification

- `pnpm task:lint --task TASK-1485`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- GVC Pattern Lab desktop/mobile cuando exista runtime.

## Closing Protocol

- [ ] `UI ready: yes` sólo con registry/decision/Pattern Lab/gates/evidence completos.
- [ ] Registry, README, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.

## Follow-ups

- Cada product task conserva ownership de su composition y propone candidates; esta task gobierna promoción.
