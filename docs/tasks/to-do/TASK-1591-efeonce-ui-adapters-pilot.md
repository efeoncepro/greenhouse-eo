# TASK-1591 — Efeonce UI Adapters Pilot

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1591-efeonce-ui-adapters-pilot.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseño gobernado; adapters piloto pendientes`
- Rank: `TBD`
- Domain: `ui-platform|cross-runtime`
- Blocked by: `TASK-1589`
- Branch: `task/TASK-1591-efeonce-ui-adapters-pilot`
- Legacy ID: `none`
- GitHub Issue: `none`

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

- [ ] Una primitive simple y una compleja comparten contract.
- [ ] Greenhouse no importa el adapter Globe.
- [ ] Globe no importa MUI/Vuexy.
- [ ] Cada consumer puede rollback por versión.
- [ ] Evidence y ownership quedan en registry.

> La foundation y la distribución privada son prerrequisitos completados; estos criterios
> permanecen abiertos hasta implementar y verificar los adapters en ambos consumidores.

## Rollout / Rollback

- Feature opt-in en consumers piloto.
- Rollback a implementation local sin modificar el contrato de runtime.

## Delivery state — 2026-07-28

### Foundation y distribución — completas

- AXIS foundation y Lab publicados y verificados en el repositorio privado
  `efeoncepro/axis-design-system`.
- Paquetes privados publicados en GitHub Packages: `@efeoncepro/axis-tokens`,
  `@efeoncepro/axis-ui-contracts` y `@efeoncepro/axis-ui-registry`, versión `0.1.2`.
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

La distribución está habilitada, pero Greenhouse y Globe todavía no consumen los paquetes
AXIS en su runtime. La task no se puede cerrar como completa hasta ejecutar el siguiente
slice de implementación:

1. Incorporar las dependencias AXIS y la configuración de registro/token en los pipelines
   de Greenhouse y Globe, consumiendo el secreto de GCP sin imprimirlo.
2. Implementar una primitive simple y una compleja por consumer mediante adapters locales:
   MUI/Vuexy en Greenhouse y Tailwind en Globe, sin imports cruzados.
3. Registrar contract, versión, ownership, estados y evidencia en el registry.
4. Verificar desktop/mobile, teclado, reduced motion, estados ready/disabled/loading/error,
   build de cada consumer y rollback por versión.
5. Ejecutar canary opt-in y documentar el resultado antes de cualquier promoción.

La credencial usada para habilitar la distribución es operator-owned y expira el
`2026-08-27`; antes de rollout externo debe reemplazarse por una identidad de máquina
dedicada.
