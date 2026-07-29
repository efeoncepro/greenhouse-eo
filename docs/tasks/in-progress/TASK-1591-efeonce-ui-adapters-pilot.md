# TASK-1591 — Efeonce UI Adapters Pilot

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1591-efeonce-ui-adapters-pilot.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Adapters implementados y verificados en fixtures opt-in; promoción productiva sigue pendiente`
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `none`
- Branch: `task/TASK-1591-efeonce-ui-adapters-pilot`
- Legacy ID: `none`
- GitHub Issue: `none`

`TASK-1589` foundation is complete; distribution and registry authentication prerequisites are verified.

## Summary

Probar que un contrato compartido puede tener implementaciones distintas: una primitive
simple y una compleja en Greenhouse/MUI y Globe/Tailwind, con adopción opt-in y rollback.

## Architecture Alignment

- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/EFEONCE_GLOBE_DESIGN_SYSTEM_GOVERNANCE_DECISION_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse `src/components/greenhouse/primitives` y Globe `apps/studio-client/src/primitives`
- Future candidate home: `ui-package`
- Boundary: contract compartido + adapters locales; no cross-import de runtimes
- Server/browser split: browser UI only; commands/data permanecen en cada producto
- Build impact: consumers fijan versión local/privada; no cambio de deploy inicial
- Extraction blocker: APIs actuales y semántica de estados no son equivalentes todavía

## UI/UX Contract

- Primitive decision: `reuse` contract, `extend` adapters; no copy/paste de implementation.
- States: ready, disabled/blocked con razón, loading, error y focus.
- Evidence: desktop/mobile, keyboard, reduced motion, visual diff y screen reader spot check.

## Acceptance Criteria

- [x] Una primitive simple y una compleja comparten contract (`efeonce.status` y `efeonce.progress`).
- [x] Greenhouse no importa el adapter Globe.
- [x] Globe no importa MUI/Vuexy.
- [x] Cada consumer puede rollback por versión (`0.1.3`/`0.1.4` en lockfile y adapter opt-in).
- [x] Evidence y ownership quedan en registry (`greenhouse-ui-platform`, fixtures desktop/mobile/keyboard).

> La foundation y la distribución privada son prerrequisitos completados; estos criterios
> permanecen abiertos hasta implementar y verificar los adapters en ambos consumidores.

## Rollout / Rollback

- Feature opt-in en consumers piloto.
- Rollback a implementation local sin modificar el contrato de runtime.
- Greenhouse: revertir los tres paquetes a `0.1.3` y retirar la ruta `/design-system/axis-adapters`.
- Globe: revertir los tres paquetes a `0.1.3` y retirar la ruta `/_axis-pilot`; las superficies existentes no dependen del adapter.

## Delivery state — 2026-07-28

### Foundation y distribución — completas

- AXIS foundation y Lab publicados y verificados en el repositorio privado
  `efeoncepro/axis-design-system`.
- Paquetes privados publicados en GitHub Packages: `@efeoncepro/axis-tokens`,
  `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry`, versión `0.1.4`.
- `efeoncepro/greenhouse-eo` y `efeoncepro/efeonce-globe` tienen acceso `Read` a los tres
  paquetes desde GitHub Actions.
- El proyecto Vercel `axis-design-system-lab` tiene `NPM_RC` sensible configurado para
  Production y Preview.
- En GCP `efeonce-globe` existe el secreto `axis-packages-read-token`; no se registra su
  valor. El service account de Cloud Build
  (`818083690953-compute@developer.gserviceaccount.com`) tiene
  `roles/secretmanager.secretAccessor` sobre ese secreto.
- Evidencia operativa detallada, incluyendo rotación pendiente de la credencial actual,
  vive en `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.

### Consumer runtime — pendiente

La distribución y el slice de consumer están implementados como canary opt-in en ambos
runtimes. La promoción productiva permanece separada y requiere el gate de release correspondiente:

1. [x] Incorporar las dependencias AXIS `0.1.4` y autenticar el registry privado durante la instalación.
2. [x] Implementar una primitive simple y una compleja por consumer mediante adapters locales:
   MUI/Vuexy en Greenhouse y Tailwind/token classes en Globe, sin imports cruzados.
3. [x] Registrar contract, versión, ownership, estados y evidencia en el registry.
4. [x] Verificar desktop/mobile, teclado, reduced motion, estados de estado y build de cada consumer.
5. [x] Ejecutar canary opt-in en `/design-system/axis-adapters` y `/_axis-pilot`.

## Delivery evidence — 2026-07-29

- AXIS `v0.1.4` publicado por GitHub Actions `30432127754` desde commit `10af569`.
- Greenhouse fija `@efeoncepro/axis-{tokens,ui-contracts,ui-registry}` en `0.1.4` y expone
  `AxisStatus` + `AxisProgress` desde `src/components/greenhouse/primitives`.
- Globe fija los mismos tres paquetes en `apps/studio-client/package.json` y expone
  `AxisStatus` + `AxisProgress` desde `apps/studio-client/src/primitives`.
- Fixtures opt-in: Greenhouse `/design-system/axis-adapters`; Globe `/_axis-pilot`.
- Globe Vite build pasa; design-contract gate pasa 6/6; ESLint de adapters pasa.
- Playwright local: a 1440 px y 390 px `scrollWidth === clientWidth`; 4 status markers, 2 progress
  contracts y 3 ordered steps; Tab enfoca el progress contract; reduced motion computa `0s`.
- Greenhouse TypeScript y ESLint de los archivos modificados pasan. El typecheck global de Globe
  conserva dos errores preexistentes en `ProducerComposer.tsx:1772,1792` sobre `thumbnail`, fuera
  del piloto.
- Autenticación: instalación privada verificada con `gh` token temporal; no se escribió ningún
  token en el repositorio. La credencial operator-owned de GCP requiere reautenticación y conserva
  el riesgo documentado de rotación antes de rollout externo.

La credencial usada para habilitar la distribución es operator-owned y expira el
`2026-08-27`; antes de rollout externo debe reemplazarse por una identidad de máquina
dedicada.
