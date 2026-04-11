# TASK-264 — Greenhouse Theme Canonicalization & Kortex Brand Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Descompuesta en sub-tasks`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: —
- Legacy ID: —
- GitHub Issue: —

## Sub-tasks (programa de ejecución)

| Task | Nombre | Riesgo | Esfuerzo | Depende de | Tipo |
|------|--------|--------|----------|------------|------|
| `TASK-368` | Theme Token Audit & Decision Contract | Cero | Bajo | — | research |
| `TASK-369` | Hardcoded Hex Cleanup | Bajo | Bajo | TASK-368 | implementation |
| `TASK-370` | Semantic Token Absorption into Theme | Medio | Medio | TASK-368 | implementation |
| `TASK-371` | Shell Primary Cutover | **Alto** | Medio | TASK-370 | implementation |
| `TASK-372` | Kortex Visual Preset Documentation | Cero | Bajo | TASK-370 | documentation |

**Secuencia recomendada:** `368` → `369` + `370` (paralelo controlado) → `371` (opcional) + `372`

**Nota:** TASK-371 es explícitamente opcional. Si después de TASK-370 el portal ya se ve coherente, puede diferirse o cancelarse sin afectar el programa.

## Summary

**Umbrella task** — descompuesta en 5 sub-tasks (TASK-368 a TASK-372) para ejecución incremental y reversible.

Greenhouse hoy usa un shell base de Vuexy/MUI pero mantiene una segunda capa de branding y semántica visual hardcodeada fuera del theme principal. Esta task converge esa identidad al sistema canónico de theme, deja un contrato visual único para el portal y produce un preset/patrón reutilizable para Kortex como plataforma paralela integrada, sin copiar componentes a ciegas ni tocar Kortex directamente en esta lane.

## Delta 2026-04-06 — Vuexy sí tiene path oficial para tema nuevo

La investigación contra el upstream y la documentación pública de Vuexy confirma que sí existe una forma oficial de crear un tema/marca nueva, pero es code-driven y en capas, no un wizard separado:

- `src/configs/themeConfig.ts` es la superficie oficial para configurar el template y sus defaults de shell.
- `src/@core/theme/index.ts` compone el theme real de MUI/Vuexy.
- `src/@core/theme/colorSchemes.ts` es el punto natural para paleta y semántica light/dark.
- tipografía, `shape`, sombras y overrides viven en módulos del mismo árbol `src/@core/theme/*`.

Implicación para esta task: Greenhouse no necesita inventar una capa nueva para “crear su tema”; debe reabsorber su identidad institucional dentro de los extension points nativos de Vuexy/MUI y dejar `GH_COLORS` fuera del rol de source of truth global.

## Delta 2026-04-06 — recorte de alcance: login diferido, resto del portal vigente

Se documenta una decisión explícita de alcance para esta iteración:

- el login actual queda fuera del cutover por ahora
- el resto del portal sí debe converger al contrato `theme-first`
- el login sigue siendo evidencia útil del problema actual, pero no es requisito de implementación inmediata en esta lane

Implicación: la task debe perseguir adopción real de tokens Vuexy/MUI en shells internos, vistas enterprise y reusable primitives sin bloquearse por un rediseño o limpieza del login.

## Why This Task Exists

El problema actual no es tener branding propio, sino tenerlo partido en dos fuentes de verdad. El shell global sigue leyendo `src/@core/theme/colorSchemes.ts`, donde el `primary` aún responde al preset Vuexy, mientras que la identidad Greenhouse vive en `GH_COLORS` dentro de `src/config/greenhouse-nomenclature.ts` y se consume directo desde vistas específicas. Ese split:

- impide re-theme global coherente
- dificulta que Kortex herede el look institucional sin copiar lógica ad hoc
- rompe consistencia entre superficies que leen `theme.palette` y superficies que leen `GH_COLORS`
- hace más frágiles dark mode, skins, estados y contraste
- encarece mantenimiento y QA visual

La tarea correcta no es “cambiar unos hex”, sino absorber la semántica Greenhouse en el sistema Vuexy/MUI y formalizar qué parte del contrato visual es compartible hacia Kortex.

## Goal

- Converger la identidad visual Greenhouse a una sola fuente de verdad basada en el theme de Vuexy/MUI.
- Reducir `GH_COLORS` a branding puntual y tokens que no deban vivir en `theme.palette` o `theme.customColors`.
- Reemplazar el shell base todavía demasiado “Vuexy default” por un shell Greenhouse canónico en superficies de alto impacto.
- Ejecutar el cutover primero en superficies internas y reutilizables del portal; el login queda diferido como excepción temporal.
- Dejar documentado y codificado un contrato/preset reutilizable para que Kortex pueda adoptar el estilo Greenhouse sin copiar el producto ni el logo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- Vuexy public docs: `https://demos.pixinvent.com/vuexy-nextjs-admin-template/documentation/docs/guide/settings/theme-configurations`

Reglas obligatorias:

- `src/@core/theme/*` sigue siendo la capa canónica del theme base. No abrir una tercera capa paralela de tokens.
- `src/configs/themeConfig.ts` debe tratarse como capa oficial de configuracion del shell, no como reemplazo de la paleta institucional.
- la marca Greenhouse debe vivir sobre los extension points oficiales de Vuexy/MUI (`themeConfig`, `colorSchemes`, `typography`, `customShadows`, overrides), no por fuera de ellos.
- La semántica institucional (`success`, `warning`, `error`, `info`, `surface`, `border`, `text`, `chart`) debe vivir en el theme cuando aplique globalmente.
- `GH_COLORS` puede retener branding puntual o taxonomías de dominio que no sean parte del shell global, pero no debe seguir definiendo el sistema visual principal.
- Kortex debe tratarse como consumer de contrato visual, no como excusa para acoplar UX o navegación del portal Greenhouse.
- No copiar componentes de `full-version` ni del upstream `pixinvent/vuexy-nextjs-admin-template` sin adaptación explícita al contexto Greenhouse.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-021-typography-variant-adoption.md`
- `full-version/src/configs/themeConfig.ts`
- `full-version/src/@core/theme/index.ts`
- `full-version/src/@core/theme/colorSchemes.ts`

## Dependencies & Impact

### Depends on

- `src/@core/theme/colorSchemes.ts`
- `src/@core/theme/index.ts`
- `src/configs/themeConfig.ts`
- `src/config/greenhouse-nomenclature.ts`
- `src/components/greenhouse/**`
- `src/views/Login.tsx`
- `src/views/login/GreenhouseBrandPanel.tsx`

### Blocks / Impacts

- Kortex visual integration roadmap — podrá consumir un preset Greenhouse en vez de copiar tokens ad hoc.
- TASK-021 — Typography variant adoption; ambas tasks deben converger hacia un solo sistema de theme.
- Futuras vistas de Greenhouse que hoy mezclan `theme.palette` con `GH_COLORS` directos.

### Files owned

- `src/@core/theme/colorSchemes.ts`
- `src/@core/theme/index.ts`
- `src/configs/themeConfig.ts`
- `src/config/greenhouse-nomenclature.ts`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/tasks/to-do/TASK-264-greenhouse-theme-canonicalization-kortex-brand-contract.md`

## Current Repo State

### Already exists

- `src/@core/theme/colorSchemes.ts` define la paleta shell base de Vuexy/MUI y todavía mantiene `primary` de Vuexy.
- `src/configs/themeConfig.ts` ya centraliza layout, skin, navbar, footer y preferencias base del portal.
- Vuexy documenta públicamente `themeConfig.ts` como la vía oficial para personalizar el template rápidamente.
- El upstream ya separa configuración de shell (`themeConfig.ts`) de construcción del theme real (`src/@core/theme/index.ts` + `colorSchemes.ts` + typography/shadows/overrides).
- `src/config/greenhouse-nomenclature.ts` expone `GH_COLORS` con brand colors, semáforos, roles, charts y neutrales fuera del theme principal.
- `src/views/login/GreenhouseBrandPanel.tsx` y `src/views/Login.tsx` ya muestran un “brand moment” fuerte con colores Greenhouse, pero actualmente bypassean parte del theme y quedan diferidos en esta iteración.
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` ya registra `pixinvent/vuexy-nextjs-admin-template` como upstream de referencia y `efeoncepro/kortex` como repo hermano.

### Gap

- El shell global y la identidad Greenhouse no comparten una sola fuente de verdad.
- Componentes distintos leen sistemas distintos (`theme.palette` vs `GH_COLORS`) y eso produce una UI híbrida.
- No estamos explotando todos los tokens de Vuexy/MUI porque una parte del portal sigue resolviendo color/branding por fuera del theme canónico.
- No existe hoy un preset reutilizable para repos hermanos como Kortex.
- No está formalizado qué parte del estilo Greenhouse es shell global y qué parte es branding puntual.
- Dark mode, skins y futuros cambios de identidad no pueden propagarse limpiamente desde un solo contrato.
- Aunque Vuexy sí ofrece extension points oficiales para crear una marca nueva, Greenhouse hoy no los está usando como carril principal de branding institucional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Canonical theme contract

- Auditar los tokens actuales de `colorSchemes.ts`, `themeConfig.ts` y `GH_COLORS` para separar shell global, semántica transversal y branding puntual.
- Mover al theme canónico los tokens que hoy definen semántica global pero viven hardcodeados fuera de `theme.palette` o `theme.customColors`.
- Definir una convención clara para qué permanece en `GH_COLORS` y qué debe leer siempre desde `theme`.

### Slice 2 — Shell Greenhouse cutover

- Reemplazar en el shell base los defaults aún demasiado Vuexy cuando corresponda al contrato Greenhouse aprobado.
- Alinear superficies de alto impacto con el theme canónico: tabs/cards/chips/alerts de referencia, estados semánticos principales y shells internos del portal.
- Excluir login y su brand panel de la primera ola de implementación; tratarlos solo como baseline/evidencia del split actual.
- Evitar un refactor masivo ciego: priorizar superficies institucionales y reusable primitives.

### Slice 3 — Consumer migration rules

- Migrar consumers de alto impacto que hoy leen `GH_COLORS` directamente cuando en realidad deberían leer `theme.palette` o `theme.customColors`.
- Documentar la regla de adopción para nuevos componentes: cuándo usar theme, cuándo usar tokens de dominio y cuándo un brand moment puntual puede escapar al sistema.
- Dejar explícita la interacción con `TASK-021` para no duplicar hardening de tipografía y color en dos lanes separadas.

### Slice 4 — Kortex reusable preset

- Codificar o documentar un preset/contrato reutilizable que Kortex pueda adoptar desde su propio repo sin copiar componentes Greenhouse.
- Formalizar qué hereda Kortex: semántica visual, superficies, densidad, colores institucionales y reglas de uso.
- Formalizar qué NO hereda Kortex: navegación Greenhouse, nomenclatura del portal, assets específicos de producto y logo cuando no corresponda.

## Out of Scope

- Modificar el repo `efeoncepro/kortex` dentro de esta task.
- Cambiar el login actual en esta iteración.
- Rediseñar logo, claims o identidad verbal de marca.
- Hacer un barrido total de todos los componentes del portal en una sola iteración.
- Reabrir `TASK-021` para tipografía; solo coordinar puntos de convergencia.
- Copiar pantallas completas desde `full-version` o desde `pixinvent/vuexy-nextjs-admin-template`.

## Detailed Spec

El resultado esperado es una convergencia institucional del theme, no una colección nueva de helpers. La dirección correcta es:

1. **Theme-first**
   - `src/@core/theme/colorSchemes.ts` y/o sus módulos relacionados pasan a representar la identidad visual principal de Greenhouse.
   - `GH_COLORS` deja de funcionar como sistema paralelo para color semántico global.

2. **Branding puntual vs shell global**
   - Shell global: palette, text, surfaces, borders, semantic states, chart seeds, chips base.
   - Branding puntual: gradientes hero, color story del login, taxonomías muy específicas de roles o servicios cuando no sean genéricas del sistema.
   - En esta iteración, el login puede seguir temporalmente como excepción puntual mientras el resto del portal converge al contrato canónico.

3. **Vuexy-native implementation path**
   - `themeConfig.ts` gobierna defaults de shell: `mode`, `skin`, `semiDark`, layout y layout chrome.
   - `src/@core/theme/colorSchemes.ts` gobierna light/dark palette y semántica global.
   - `src/@core/theme/index.ts` y módulos relacionados gobiernan tipografía, `shape`, sombras y overrides.
   - Los assets de marca y brand moments deben quedar desacoplados del core theme para no mezclar logo/producto con semántica visual global.

4. **Preset para Kortex**
   - El output no necesita ser un package publicado en esta iteración, pero sí debe dejar el contrato suficientemente explícito para que Kortex lo replique o lo consuma con mínimo drift.
   - El contrato debe ser agnóstico de producto: estilo institucional compartido, no UX clonada.

5. **Testing visual mínimo**
   - Validar light mode al menos en una vista dashboard y una vista enterprise con chips/cards/tabs.
   - Validar que el theme no rompa estados semánticos (`success`, `warning`, `error`, `info`) ni contraste básico.
   - Confirmar explícitamente que el login no fue tocado en esta iteración.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una sola fuente de verdad para la semántica visual principal del portal basada en el theme canónico.
- [ ] `GH_COLORS` deja de ser la fuente primaria de shell global y queda acotado a branding puntual o taxonomías de dominio justificadas.
- [ ] El shell Greenhouse deja de depender del `primary` default de Vuexy cuando eso contradice el contrato visual institucional aprobado.
- [ ] La implementación final usa explícitamente las capas oficiales de Vuexy/MUI (`themeConfig.ts` para shell y `src/@core/theme/*` para theme), sin introducir una capa paralela nueva.
- [ ] Al menos una vista dashboard y una vista enterprise interna renderizan el contrato Greenhouse desde el theme sin romper layout ni contraste.
- [ ] El login queda documentado como excepción temporal y no bloquea el cierre de esta task en su primera iteración.
- [ ] Existe documentación explícita para adoptar el mismo contrato visual en Kortex sin copiar componentes Greenhouse.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validación manual en local o staging: una vista dashboard y una vista enterprise con chips/tabs/cards en light mode
- Verificación manual de alcance: confirmar que login no fue parte del lote

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` con la regla canónica `theme-first` y los guardrails de uso de `GH_COLORS`.
- [ ] Ejecutar chequeo de impacto cruzado sobre tasks UI relacionadas, en especial `TASK-021`.
- [ ] Dejar explícito en `Handoff.md` qué parte del contrato queda lista para que Kortex la consuma y qué parte sigue siendo Greenhouse-only.

## Follow-ups

- TASK-265 — canonizar la capa de nomenclatura, microcopy y contrato verbal reusable para Kortex.
- Crear la task espejo en `kortex` para adoptar el preset Greenhouse una vez que el contrato quede estabilizado aquí.
- Revisar si `TASK-021` debe absorber una nota delta para converger typography + color hardening bajo una misma política de theme.
- Considerar un package compartido interno si Greenhouse y Kortex terminan reutilizando el contrato visual sin drift.

## Open Questions

- ¿El `primary` institucional debe converger a `coreBlue`, `greenhouseGreen` o a una combinación shell/semantic distinta?
- ¿Qué taxonomías actuales de `GH_COLORS` deben seguir fuera del theme por ser de dominio y no de shell?
- ¿El primer preset para Kortex vive como módulo reusable en este repo o solo como contrato documentado en esta iteración?
- ¿Conviene modelar el contrato Greenhouse como un solo preset institucional o como una base compartida con variantes `greenhouse` y `kortex` sobre el mismo esqueleto Vuexy?
- ¿Se abre luego una follow-up específica para converger el login al contrato canónico una vez estabilizado el resto del portal?
