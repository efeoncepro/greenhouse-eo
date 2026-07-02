# ISSUE-112 — Form público de AEO shipeado ROTO a prod: gate de aserciones sin verificación visual + parche por-host + cutover live prematuro

## Ambiente

Producción — landing pública `https://efeoncepro.com/aeo-2/`, sección `convers` (WordPress `postId=250265`, tema Ohio). Migración TASK-1298 (bridge HTML → renderer `<greenhouse-form>`).

## Detectado

2026-06-30, por el **operador** (no por CI ni por el agente) — vio el formulario roto en producción tras el cutover.

## Síntoma

El renderer portable, dentro del tema Ohio, quedó visualmente roto: **inputs grises sin borde**, `<select>` con **pared de chevrons** (caret tileado por el CSS de `select` del tema), **botón oscuro** (no el teal de marca). El agente había declarado "verificado en vivo" y movido TASK-1298 a `complete`.

## Causa raíz (3 fallas del agente)

1. **Verificación sin mirar.** El gate `verify-aeo-form-typography` solo asercionaba `letter-spacing`/overflow/font — **no "veía" el render de los controles**. Pasó verde con el form completamente roto. El agente dijo "listo" confiando en el gate, sin mirar el frame real.
2. **Parche por-host sobre lo roto.** El agente peleó el CSS del tema Ohio **desde afuera** (`<style>` scoped + overrides inline) **encima del bundle viejo de prod**, en vez de arreglar el componente. Los overrides no aplicaban de verdad (el botón nunca se puso teal). El operador había pedido explícito "no parches frágiles".
3. **Cutover live prematuro.** Se escribió a WordPress (save) temprano y se intentó arreglar en vivo → el error quedó público.

## Impacto

Formulario de captación de leads de AEO roto en producción hasta la detección + revert (~minutos, mismo día). Sin pérdida de datos (el backend/submit no cambió). Erosión de confianza del operador.

## Solución

**Inmediata (aplicada):** restaurar el backup `_gh_aeo_backup_20260630_task1298_convers_migration` vía `Document::save()` + Kinsta purge → prod volvió al **bridge** (formulario pulido aprobado: inputs con borde, selects con placeholder, botón teal `#39c9bf`, trust inline ✓), `heroans` estable. Verificado mirando el frame real. Revertidos a versión bridge: `verify-aeo-form-typography.ts` y `aeo-landing-elementor.md` §convers. TASK-1298 → `in-progress` (bloqueada).

**De fondo (Codex, en `develop`):** endurecer el **renderer mismo** (`src/growth-forms-renderer/styles.ts`): los controles `.ghf-input/.ghf-select/.ghf-btn` re-declaran fuente/color/borde/caret con selectores scopeados + `!important` tokenizado → inmunes a las reglas genéricas `input/select/button` del host. Nuevos gates que **muestrean píxeles dentro de los bounding boxes** de inputs/selects/CTA (`review-aeo-form-visual-frames`, `verify-aeo-renderer-ohio-fixture`, `verify-aeo-renderer-real-composition-preview`, `verify-aeo-prelive-contract`) — detectan gris/chevron-wall/CTA-no-teal aunque los computed styles engañen. Verificación **en memoria** sobre la página real antes de cualquier save. AEO v5 con placeholders de select. Verificado mirando frames desktop + mobile 390: reproduce el form bueno.

## Verificación

- Prod restaurado: frame real desktop capturado y mirado → form bueno vivo. ✅
- Fix de fondo (Codex): `verify-aeo-renderer-real-composition-preview` (renderer local endurecido inyectado sobre `/aeo-2/` real) → botón `rgb(54,200,191)` teal, inputs con borde, selects con placeholder, sin overflow, desktop + mobile 390. ✅ (pre-live; el cutover live real sigue pendiente: desplegar el renderer endurecido a prod ANTES del save de WordPress + frame final mirado).

## Lección (regla durable)

Para **cualquier** cambio visual:
1. **Mirar el frame real (GVC) antes de decir "listo".** Un gate de aserciones que no "ve" la falla (muestreo de píxeles / diff visual) no cuenta como verificación.
2. **Arreglar el componente/causa raíz, no el síntoma por host.** Host hostil que degrada un componente portable → endurecer el componente (o Shadow DOM), no guerra de CSS por-propiedad desde afuera.
3. **Probar el arreglo REAL** (bundle reconstruido), no overrides sobre el bundle roto.
4. **Mantener pre-live hasta verificar** (memoria/staging/fixture); no usar el cutover live como forma de "probar".
5. Si ya se escribió a prod y algo se ve mal, **restaurar el known-good primero**, luego arreglar con calma.

Memoria de agente: `feedback_verify_visual_root_cause_prelive`.

## Estado

`resolved` (prod restaurado 2026-06-30). El fix de fondo del renderer queda en `develop`; el cutover live de TASK-1298 sigue bloqueado hasta desplegar el renderer endurecido a prod + save WordPress + frame final mirado.

## Relacionado

- Task: `docs/tasks/in-progress/TASK-1298-aeo-greenhouse-form-wordpress-migration.md` (§Revert + avances Codex).
- `feedback_ui_design_skills_gvc_loop`, GVC V1.5 contract (`GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`).
