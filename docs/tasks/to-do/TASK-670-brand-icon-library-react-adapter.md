# TASK-670 — Brand Icon Library React Adapter

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`, `ui`
- Blocked by: `none`
- Branch: `task/TASK-670-brand-icon-library-react-adapter`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear una capa canónica de logos de marca para React en Greenhouse. La decisión
base es reutilizar el stack ya presente de Iconify/Simple Icons y agregar un
adapter interno `BrandIcon` con allowlist, fallback, sizing consistente y
metadata exportable para futuras surfaces API/MCP.

## Why This Task Exists

Greenhouse ya usa iconos CSS generados desde Iconify y tiene dependencias de
`simple-icons`, `@iconify/json` y `@iconify-json/logos`, pero no existe un
contrato React canónico para renderizar logos de marcas como HubSpot, Notion,
Microsoft Teams, OpenAI, Vercel, GitHub o futuras integraciones. Si cada módulo
elige una librería o import distinto, aparecen drift visual, bundle churn y
riesgo legal/trademark sin registro.

## Goal

- Instalar o habilitar el wrapper React correcto para Iconify si hace falta.
- Crear un adapter `BrandIcon` reutilizable por componentes Greenhouse.
- Definir un registry allowlist de marcas soportadas, aliases e icon IDs.
- Alinear el patrón con el CSS bundling existente de Iconify.
- Dejar metadata lista para exponerse por API/MCP más adelante sin acoplar UI a
  rutas internas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
- `docs/tasks/to-do/TASK-660-api-platform-openapi-stable-contract.md`

Reglas obligatorias:

- No reemplazar los iconos UI canónicos existentes (`tabler-*`, Vuexy/Iconify
  CSS) para navegación o acciones generales.
- Brand logos deben pasar por registry/allowlist; no imports sueltos desde cada
  módulo.
- Preferir `logos:*` para logos oficiales a color cuando exista y
  `simple-icons:*` para marcas monocromas o fallback.
- Documentar que el uso de logos queda sujeto a trademarks/licencias de cada
  marca, aunque la librería sea open source.
- El adapter debe ser SSR-safe y compatible con Next.js App Router.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `package.json`
- `src/assets/iconify-icons/bundle-icons-css.ts`
- `src/assets/iconify-icons/generated-icons.css`
- `src/components/greenhouse/**`
- `src/lib/api-platform/**`

### Blocks / Impacts

- UI de integraciones, Admin Center, API Platform docs y future MCP metadata.
- Consistencia visual para marcas de sistemas externos.
- Futuras cards de readiness/capabilities que necesiten logos.

### Files owned

- `package.json`
- `pnpm-lock.yaml`
- `src/components/greenhouse/BrandIcon.tsx`
- `src/lib/brand-icons/registry.ts`
- `src/lib/brand-icons/types.ts`
- `src/assets/iconify-icons/bundle-icons-css.ts`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`

## Current Repo State

### Already exists

- `simple-icons` dependency in `package.json`.
- `@iconify-json/logos`, `@iconify/json`, `@iconify/tools`,
  `@iconify/types` and `@iconify/utils` in `devDependencies`.
- Iconify CSS bundling via `src/assets/iconify-icons/bundle-icons-css.ts`.
- Existing bundled brand IDs: `logos:figma`, `logos:framer`,
  `logos:github-icon`, `logos:github-copilot`, `logos:google-gemini`,
  `logos:hubspot`, `logos:looker-icon`, `logos:miro-icon`,
  `logos:notion-icon`, `logos:openai-icon`, `logos:vercel-icon`.
- Existing UI convention uses `<i className='tabler-*' />` for general UI
  icons.

### Gap

- No React component exists for brand logos.
- No allowlist/alias registry exists for brand logos.
- No fallback policy exists when a brand logo is missing.
- No metadata shape exists for later API/MCP exposure.
- `@iconify/react` is not currently installed.

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

### Slice 1 — Dependency and registry decision

- Confirmar si se instala `@iconify/react` o si el adapter consume solo CSS
  classes generadas.
- Definir `BrandIconKey` y registry allowlist con aliases.
- Seed inicial sugerido: `hubspot`, `notion`, `microsoft`, `teams`,
  `github`, `github-copilot`, `openai`, `gemini`, `vercel`, `figma`,
  `framer`, `miro`, `looker`, `nubox`.

### Slice 2 — React adapter

- Crear `BrandIcon` con props estables:
  - `brand`
  - `size`
  - `title`
  - `decorative`
  - `variant` (`color` / `mono` cuando aplique)
- Agregar fallback visual consistente cuando la marca no exista.
- Mantener sizing/layout estable para chips, avatars, cards y tablas.

### Slice 3 — Consumers piloto

- Aplicar el adapter en 1-2 surfaces de bajo riesgo, por ejemplo docs/API
  Platform developer-facing o cards de integraciones.
- No migrar masivamente todos los iconos existentes.

### Slice 4 — API/MCP readiness

- Exponer una función pura de registry (`listBrandIcons` /
  `resolveBrandIcon`) que pueda ser usada por API Platform o MCP en el futuro
  sin depender de React.
- Documentar qué fields son seguros para exponer: key, label, iconId,
  provider, colorMode, trademark note.

## Out of Scope

- Reemplazar Tabler/Lucide/UI action icons.
- Crear logos propios o modificar marcas oficiales.
- Descargar assets raster externos.
- Exponer una API pública de iconos en este corte.
- Meter todo `react-icons` o Font Awesome si Iconify/Simple Icons cubre el caso.

## Detailed Spec

Decision preliminar:

- Opción recomendada: `@iconify/react` + registry Greenhouse.
- Alternativa compatible: CSS classes generadas por
  `bundle-icons-css.ts` para marcas estáticas y adapter que renderiza `<i />`.
- `react-icons` queda como fallback de mercado, no como primera opción, porque
  el repo ya tiene Iconify/Simple Icons y el bundle actual ya curó varios logos.

Registry example:

```ts
export type BrandIconKey =
  | 'hubspot'
  | 'notion'
  | 'microsoft-teams'
  | 'openai'
  | 'vercel'

export type BrandIconDefinition = {
  key: BrandIconKey
  label: string
  iconId: string
  source: 'iconify-logos' | 'simple-icons' | 'custom'
  trademarkNotice?: string
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe registry canónico de brand icons con allowlist y aliases.
- [ ] Existe componente `BrandIcon` reusable, SSR-safe y accesible.
- [ ] Hay fallback consistente para marcas no soportadas.
- [ ] Al menos una surface piloto usa el adapter.
- [ ] La implementación no rompe el sistema actual de Iconify CSS/Tabler icons.
- [ ] El registry puede ser consumido por API/MCP sin importar React.

## Verification

- `pnpm lint`
- `pnpm build`
- test focal si se agrega helper de registry.
- revisión visual de la surface piloto.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Si se instala `@iconify/react`, `package.json` y `pnpm-lock.yaml` quedan commiteados juntos.

## Follow-ups

- API Platform icon metadata endpoint si `TASK-650` lo necesita.
- MCP tool/resource de brand catalog si `TASK-647` lo necesita.
- Extensión para logos custom no presentes en Iconify/Simple Icons.

## Open Questions

- Confirmar si `nubox` existe en `logos:*` o `simple-icons:*`; si no existe,
  definir fallback o asset custom con revisión de trademark.
