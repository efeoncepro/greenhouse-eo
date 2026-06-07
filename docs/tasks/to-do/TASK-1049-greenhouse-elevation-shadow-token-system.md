# TASK-1049 — Greenhouse elevation / shadow token system

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|design-system|accessibility`
- Blocked by: `ADR acceptance: docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md`
- Branch: `task/TASK-1049-greenhouse-elevation-shadow-token-system`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el sistema semantico Greenhouse de elevacion/sombra para que primitives y overlays no dependan de indices MUI (`elevation={6}` / `theme.shadows[n]`) ni de sombras Vuexy escogidas a ojo. El primer consumidor obligatorio es `GreenhouseFloatingSurface`, que debe dejar de usar `Paper elevation={6}` y consumir un token semantico `floating` con evidencia GVC before/after.

## Why This Task Exists

El operador detecto que la sombra actual de la primitive Floating Surface se siente anticuada. El discovery confirmo que el problema no es solo estetico: Greenhouse tiene runtime shadows (`theme.shadows`, `theme.customShadows`) pero no tiene una fuente semantica de elevacion propia. La documentacion actual habla de indices (`boxShadow: 6`) y no de intencion (`floating`, `overlay`, `modal`), lo que deja demasiada libertad interpretativa a agentes y futuros implementadores.

Esta task convierte el hallazgo en un contrato operativo: token runtime, docs, tests y primer cutover visual controlado. No rediseña todas las sombras del portal.

## Goal

- Definir un SoT runtime de elevacion Greenhouse con roles semanticos pequenos y estables.
- Migrar `GreenhouseFloatingSurface` desde `Paper elevation={6}` a `Paper elevation={0}` + token semantico.
- Documentar el contrato en `DESIGN.md`, `GREENHOUSE_DESIGN_TOKENS_V1.md` y UI Platform.
- Verificar con tests + GVC desktop/mobile que Floating Surface se ve enterprise y mantiene a11y/behavior.
- Dejar claro que `theme.shadows[n]` y `customShadows` son infraestructura/compat, no la API semantica para primitives nuevas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md`
- `docs/audits/design-tokens/ELEVATION_SHADOW_TOKEN_AUDIT_2026-06-07.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/STACK.md`
- `DESIGN.md`

Reglas obligatorias:

- Esta task NO puede empezar runtime hasta que el operador acepte o ajuste la ADR `GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1`.
- No modificar `src/@core/theme/shadows.ts` ni `src/@core/theme/customShadows.ts` salvo que el plan aprobado demuestre que es estrictamente necesario. Por defecto son infraestructura heredada.
- No introducir `boxShadow` literal en `GreenhouseFloatingSurface` ni en views de producto.
- No usar `Paper elevation={n}` en primitives Greenhouse nuevas o modificadas; usar token semantico.
- Si el cambio toca UI visible, usar skills UI aplicables y GVC en loop antes de declarar cierre.

## Normative Docs

- `docs/audits/design-tokens/ELEVATION_SHADOW_TOKEN_AUDIT_2026-06-07.md`
- `docs/architecture/DECISIONS_INDEX.md` — cuando la ADR pase de `Proposed` a `Accepted`, sincronizar el estado.
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Aceptacion explicita del operador sobre la ADR propuesta.
- Runtime existente de TASK-1033: `GreenhouseFloatingSurface` + lab `/admin/design-system/floating-surfaces` + scenario GVC `floating-surface-primitives`.
- Contexto de TASK-1034: AXIS palette adoption tiene neutrales/shadows pendientes; esta task debe coordinarse con ese backlog, no duplicarlo.

### Blocks / Impacts

- Polishing visual de `GreenhouseFloatingSurface`.
- Futuras primitives overlay/floating/modal (`commandPreview`, docks, inline editors, validation bubbles).
- Documentacion de tokens de sombra en `DESIGN.md` y `GREENHOUSE_DESIGN_TOKENS_V1.md`.
- Potencial follow-up de lint/gate para no usar `elevation={n}` en primitives Greenhouse.

### Files owned

- `src/components/theme/elevation-tokens.ts` (nuevo SoT esperado)
- `src/components/theme/__tests__/elevation-tokens.test.ts` o ubicacion equivalente
- `src/components/greenhouse/primitives/GreenhouseFloatingSurface.tsx`
- `src/components/greenhouse/primitives/floating-surface-controller.ts`
- `src/components/greenhouse/primitives/__tests__/GreenhouseFloatingSurface.test.tsx`
- `src/views/greenhouse/admin/design-system/floating-surfaces/**` si el lab necesita specimen/legend
- `DESIGN.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `docs/tasks/to-do/TASK-1049-greenhouse-elevation-shadow-token-system.md`
- `Handoff.md` y `changelog.md` al cierre si la implementacion se ejecuta

## Current Repo State

### Already exists

- `src/@core/theme/shadows.ts`: escala MUI 0..24.
- `src/@core/theme/customShadows.ts`: sombras Vuexy `xs/sm/md/lg/xl` + coloreadas.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §6: tabla numerica de sombras.
- `DESIGN.md` §Elevation & Depth: criterio general "flat-to-soft".
- `docs/architecture/ui-platform/STACK.md`: prohibicion de `elevation > 0` en cards internas.
- `GreenhouseFloatingSurface` runtime con six variants oficiales y GVC hooks.
- Lab interno `/admin/design-system/floating-surfaces` y scenario GVC `floating-surface-primitives`.

### Gap

- No existe `GreenhouseElevationLevel` ni token semantico de elevacion.
- `GreenhouseFloatingSurface` usa `Paper elevation={6}`.
- `theme.shadows[n]` esta documentado como token, aunque es infraestructura numerica.
- `customShadows` esta mencionado pero no gobernado como rol semantico.
- No hay drift guard ni specimen vivo especifico para elevation tokens.

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

### Slice 0 — ADR acceptance + runtime recalibration

- Presentar la ADR propuesta al operador y registrar la decision: accepted as-is, accepted with edits, or rejected.
- Si se acepta con cambios, actualizar `GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1.md` antes de tocar runtime.
- Actualizar `docs/architecture/DECISIONS_INDEX.md` si el estado pasa a `Accepted`.
- Revalidar el runtime exacto antes de implementar:
  - `GreenhouseFloatingSurface.tsx`
  - `floating-surface-controller.ts`
  - `src/@core/theme/shadows.ts`
  - `src/@core/theme/customShadows.ts`
  - lab/scenario `floating-surface-primitives`

### Slice 1 — Runtime SoT de elevation tokens

- Crear `src/components/theme/elevation-tokens.ts` o path equivalente aprobado.
- Definir union estable:
  - `none`
  - `raised`
  - `floating`
  - `overlay`
  - `modal`
  - `overflow`
- Cada token debe declarar al menos:
  - `boxShadow`
  - `borderColor` o politica de border cuando aplique
  - `surfaceColor` o politica de background cuando aplique
  - intended usage metadata para docs/tests
- Los valores deben ser light/dark aware.
- Los valores pueden derivar de canales MUI/Vuexy (`theme.palette`, `alpha`, CSS vars de shadow channel), pero el consumidor debe ver el rol semantico, no el indice MUI.
- Agregar tests focales que verifiquen:
  - todos los roles existen;
  - `none.boxShadow === 'none'` o equivalente;
  - `floating` no referencia `theme.shadows[6]` como contrato directo;
  - dark mode tiene valores definidos;
  - metadata de uso no esta vacia.

### Slice 2 — Floating Surface cutover

- Cambiar `GreenhouseFloatingSurface` a `Paper elevation={0}`.
- Aplicar `boxShadow`, `borderColor` y `backgroundColor` desde el token semantico.
- El default de la primitive debe usar `floating`.
- Si alguna variant requiere `overlay` u otro rol, debe quedar declarado en `floating-surface-controller.ts` con test.
- Mantener intactos:
  - API publica;
  - roles/a11y por variant;
  - open controlled/uncontrolled;
  - focus manager;
  - dismiss behavior;
  - GVC data hooks.
- Actualizar tests existentes para cubrir el nuevo contrato.

### Slice 3 — Lab + GVC visual calibration

- Actualizar `/admin/design-system/floating-surfaces` para mostrar que el surface usa elevation semantica.
- Si no existe una seccion de elevation, agregar un specimen minimo dentro del lab actual. No crear una pagina nueva si el alcance se puede mantener compacto.
- Ejecutar GVC:
  - desktop;
  - mobile;
  - near-edge/collision scenario;
  - keyboard open/close si el scenario ya lo cubre.
- Revisar frames PNG manualmente y ajustar hasta que:
  - la sombra se vea sobria/moderna;
  - el borde no se vea pesado;
  - dark mode no pierda separacion;
  - tooltips/action menus no parezcan dialogs.

### Slice 4 — Documentation sync

- `DESIGN.md`:
  - reemplazar criterio generico por regla compacta con roles semanticos;
  - dejar claro que cards internas siguen flat/outlined;
  - declarar que popovers/dialogs/docks usan roles, no numeros.
- `GREENHOUSE_DESIGN_TOKENS_V1.md` §6:
  - mover tabla principal a roles semanticos;
  - conservar `theme.shadows`/`customShadows` como legacy/compat explanation;
  - declarar primer consumidor `GreenhouseFloatingSurface`.
- `ui-platform/PRIMITIVES.md`:
  - actualizar Floating Surface para indicar elevation token.
- `ui-platform/HISTORIAL.md`:
  - agregar delta append-only de la adopcion.
- `DECISIONS_INDEX.md`:
  - reflejar estado final de la ADR.

### Slice 5 — Follow-up audit / guardrail decision

- Hacer `rg` de usos directos de:
  - `elevation={`
  - `theme.shadows[`
  - `boxShadow:`
  - `customShadows`
- No migrar todo automaticamente.
- Clasificar hallazgos:
  - allowed legacy / MUI infra;
  - should migrate to semantic elevation;
  - unrelated one-off;
  - candidate lint rule.
- Si el uso directo en primitives Greenhouse persiste, crear follow-up o extender lint rule con scope `src/components/greenhouse/primitives/**`.

## Out of Scope

- Redisenar todas las sombras del portal.
- Reescribir `src/@core/theme/shadows.ts` o `src/@core/theme/customShadows.ts` como parte obligatoria.
- Migrar todos los `boxShadow` existentes en views/product surfaces.
- Cambiar z-index, collision, focus, portal, placement o behavior de Floating UI.
- Crear variants visuales nuevas de Floating Surface solo por sombra.
- Cambiar la paleta AXIS o neutrales fuera de lo necesario para elevation tokens.
- Cambiar Dialog/Drawer global sin evidencia y scope aprobado.
- Hacer deploy/rollout productivo automatico sin aprobacion humana.

## Detailed Spec

### Token contract

El token debe ser semantico y legible por agentes. Ejemplo de shape aceptable:

```ts
export type GreenhouseElevationLevel =
  | 'none'
  | 'raised'
  | 'floating'
  | 'overlay'
  | 'modal'
  | 'overflow'

export type GreenhouseElevationToken = {
  level: GreenhouseElevationLevel
  boxShadow: string
  borderColor?: string
  surfaceColor?: string
  intendedUse: string
}
```

El shape exacto puede cambiar si el plan lo justifica, pero NO puede perder:

- union tipada de niveles;
- metadata o docs vinculables;
- resolucion light/dark;
- consumo desde Floating Surface sin indices MUI directos.

### Role semantics

| Role | Debe verse como | Uso permitido | Prohibido |
|---|---|---|---|
| `none` | plano, separado por border/spacing | internal cards, table shells, panels | popovers/menus |
| `raised` | lift suave local | hover/selection, tile interactivo | resting state masivo en dashboards |
| `floating` | surface anclada, transitoria, clara pero sobria | `GreenhouseFloatingSurface` default | dialogs/destructive decisions |
| `overlay` | capa superior no modal | command preview, floating dock | drawers full-height |
| `modal` | stack blocking claro | Dialog/temporary Drawer | anchored popovers |
| `overflow` | affordance de scroll/sticky edge | table edge shadows | container depth |

### Floating Surface acceptance detail

La diff esperada en `GreenhouseFloatingSurface` debe cumplir:

- `elevation={6}` desaparece.
- `elevation={0}` queda explicito o se omite si el wrapper no genera sombra MUI.
- `boxShadow` se resuelve desde el token.
- `border` conserva contraste sobrio.
- `surfaceSx` sigue pudiendo extender, pero no debe ser necesario para el chrome base.

### Visual standard

El resultado debe parecer enterprise 2026:

- sombra mas difusa/sutil, sin glow pesado;
- borde fino para separacion en light/dark;
- surface limpia y legible;
- sin efecto "card flotando brillante";
- sin capas de sombras acumuladas cuando el popover vive sobre cards.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 (ADR accepted) -> Slice 1 (SoT tokens) -> Slice 2 (Floating Surface cutover) -> Slice 3 (GVC calibration) -> Slice 4 (docs) -> Slice 5 (follow-up classification).

Slice 2 no puede correr antes de Slice 1. Slice 4 no puede cerrar antes de que Slice 2/3 definan el resultado real. Slice 5 no puede convertirse en repo-wide migration sin nueva aprobacion.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La nueva sombra queda demasiado plana y pierde separacion en tablas densas | UI / accessibility | medium | GVC near-edge + dark/light; combinar border/surface con shadow | revision visual GVC |
| La nueva sombra queda demasiado fuerte y compite con Dialog/Dock | UI / platform | medium | roles `floating` vs `overlay` vs `modal` pequenos y testeados | revision visual GVC |
| Dark mode pierde jerarquia porque la sombra no se percibe | UI / dark mode | medium | token incluye border/surface guidance, no solo shadow | GVC dark mode si disponible |
| Agentes siguen usando `theme.shadows[n]` en primitives nuevas | UI governance | medium | docs + follow-up lint candidate | rg audit / lint future |
| Scope creep a migracion global de sombras | delivery | high | Slice 5 solo clasifica; migraciones nuevas requieren task | task scope review |
| Drift docs/runtime | design system | low | docs + tests + `design:lint` + closure-check | `pnpm design:lint`, docs closure |

### Feature flags / cutover

- Sin feature flag por defecto — cambio visual acotado a primitive compartida con GVC y revert PR.
- Si durante Plan Mode se detecta que `GreenhouseFloatingSurface` ya esta muy desplegada en superficies criticas, el agente puede proponer flag local o variant opt-in, pero debe justificarlo antes de implementar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir modulo de tokens y tests | <5 min | si |
| Slice 2 | revertir diff de `GreenhouseFloatingSurface` a `elevation={6}` | <5 min | si |
| Slice 3 | revertir lab/specimen updates | <5 min | si |
| Slice 4 | revertir docs o marcar ADR superseded/proposed nuevamente | <10 min | si |
| Slice 5 | N/A, solo clasificacion | N/A | si |

### Production verification sequence

1. Local: tests focales de elevation + Floating Surface.
2. Local: `pnpm design:lint`.
3. Local: `pnpm lint` o scope lint equivalente.
4. Local: `pnpm tsc --noEmit`.
5. Local GVC: `pnpm fe:capture floating-surface-primitives --env=local`.
6. Leer frames PNG y dossier; ajustar y recapturar hasta resultado enterprise.
7. Si se mergea a staging, repetir GVC staging cuando el target este disponible.

### Out-of-band coordination required

- Aprobacion visual del operador para el before/after de Floating Surface.
- No requiere GCP/Azure/Vercel secrets ni integraciones externas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR `GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1` aceptada o ajustada por el operador antes de runtime.
- [ ] Existe SoT runtime de elevation tokens con roles `none`, `raised`, `floating`, `overlay`, `modal`, `overflow`.
- [ ] Tests focales cubren existencia, light/dark y uso metadata de tokens.
- [ ] `GreenhouseFloatingSurface` ya no usa `Paper elevation={6}` ni `theme.shadows[n]` directo.
- [ ] Floating Surface consume `floating` semantic elevation por defecto.
- [ ] Lab `/admin/design-system/floating-surfaces` refleja el contrato o specimen vivo.
- [ ] GVC desktop + mobile revisado manualmente; resultado aceptado visualmente.
- [ ] `DESIGN.md`, `GREENHOUSE_DESIGN_TOKENS_V1.md`, `ui-platform/PRIMITIVES.md`, `ui-platform/HISTORIAL.md` sincronizados.
- [ ] `DECISIONS_INDEX.md` refleja estado final de la ADR.
- [ ] Audit de usos directos de sombra queda clasificado sin migracion global implicita.

## Verification

- `pnpm ops:lint --changed`
- `pnpm task:lint --task TASK-1049`
- `pnpm design:lint`
- `pnpm lint`
- `pnpm tsc --noEmit`
- test focal nuevo de elevation tokens
- test focal existente/actualizado de `GreenhouseFloatingSurface`
- `pnpm fe:capture floating-surface-primitives --env=local`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real.
- [ ] Archivo movido a carpeta correcta si pasa a `in-progress` o `complete`.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `docs/architecture/DECISIONS_INDEX.md` sincronizado con estado final de ADR.
- [ ] `Handoff.md` actualizado con evidencia GVC y cualquier deuda residual.
- [ ] `changelog.md` actualizado si hubo runtime visual change.
- [ ] Si queda follow-up lint/migration, crear task o dejar enlace explicito.

## Follow-ups

- Posible lint rule `greenhouse/no-direct-mui-elevation-in-primitives` si el audit Slice 5 encuentra uso directo repetido.
- Posible pagina dedicada `/admin/design-system/elevation` si el sistema crece mas alla del specimen de Floating Surface.
- Posible migracion de Dialog/Drawer/Dock a tokens `modal`/`overlay` cuando exista evidencia.

## Open Questions

- ¿El token `floating` V1 debe derivar internamente de `customShadows.md/lg` o usar una composicion propia con `alpha(theme.palette.common.black, ...)`? Resolver en Plan Mode con GVC.
- ¿Dark mode requiere token separado por surface/border mas que por shadow? Resolver en visual calibration.
- ¿`overflow` entra en V1 runtime o se declara reservado hasta que una sticky/table edge lo consuma? Recomendacion: definir metadata y valor minimo si el costo es bajo; si complica, mantener reservado con test/documentacion.

