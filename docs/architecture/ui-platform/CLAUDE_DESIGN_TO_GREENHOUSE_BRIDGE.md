# Claude Design (.dc.html) → Greenhouse — puente de implementación

> **Tipo de documento:** Contrato agent-facing (traducción mock → runtime)
> **Version:** 1.0
> **Creado:** 2026-07-18 por Claude (TASK-1430, post-mortem del "wireframe look")
> **Documentación técnica:** `ui-platform/PRIMITIVES.md` · `GREENHOUSE_DESIGN_TOKENS_V1.md` · overlay `.claude/skills/modern-ui/SKILL.md`

## Por qué existe

**Caso fuente (TASK-1430):** con un mock rico de Claude Design como referencia, el primer
render del cockpit de CTAs salió "wireframe" (feo, plano, poco profesional) a pesar de que la
ESTRUCTURA era correcta. El post-mortem encontró que el agente **transcribió los estilos inline
del mock a `sx` ad-hoc** en vez de **componer el sistema del portal**, cayendo en los
anti-patrones ya documentados (radii off-scale, `Box`+borde en vez de `Card`, spacing arbitrario,
íconos fuera de escala, ALL-CAPS técnicos). Los mocks `.dc.html` usan su PROPIO design system
(vars `--radius-*`, `--surface`, `--elevation-*`, HEX literales) — sin una tabla de traducción,
cada agente mapea a ojo y produce una piel distinta e inferior a la del portal.

**Regla madre:** el mock de Claude Design define **estructura, jerarquía, flujo y riqueza** —
la PIEL sale SIEMPRE del sistema Greenhouse. Igual que el Figma Implementation Contract:
**intención, no valores literales.**

## Tabla de traducción (mock → Greenhouse)

| El mock trae | NUNCA hagas | Traducción canónica |
|---|---|---|
| `background: var(--surface)` + `border: 1px solid var(--border-subtle)` en una "card" de sección | `Box` con `border` 1px | **`Card + CardHeader + CardContent`** Vuexy (sombra `--mui-customShadows-md`, radius y padding del theme, gratis) |
| Sub-bloque tonal dentro de una card (`var(--surface-alt)`) | otro borde gris | `Box`/`Stack` con `bgcolor: 'action.hover'` **sin borde** + `borderRadius: \`${theme.shape.customBorderRadius.lg}px\`` |
| `border-radius: var(--radius-md/lg/xl)` o px crudos | `borderRadius: 2 / 2.5 / 3` (multiplicadores sx = 12/15/18px caóticos) | `theme.shape.customBorderRadius.{sm=4, md=6, lg=8, xl=10}` **como CSS px string**; pills = `'9999px'` |
| `box-shadow: var(--elevation-raised/floating/overlay)` | sombras inventadas / `boxShadow: 2` / `var(--mui-customShadows-*)` (Vuexy = SOLO compat, no canon) | **`theme.greenhouseElevation.<role>.boxShadow`** (SoT TASK-1049, ADR `GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1`). Doctrina: cards en reposo = planas/outlined (`none` + borde divider); `raised` SOLO para hover/selección o superficie suelta que necesita separación; `floating` = popovers anclados; `overlay` = capa transitoria alta; `modal` = Dialog/Drawer temporal. floating/overlay/modal exigen su `borderColor` (sobrevive `forced-colors`) |
| HEX de acento / navy / superficies | transcribir el HEX | `theme.palette.*` / `theme.palette.customColors.*` (navy Think = `customColors.midnight/deepAzure`) / `alpha(theme.palette.X.main, 0.04-0.16)` para washes |
| Números KPI grandes (`font-weight: 800; font-size: 1.4rem`) | `fontWeight: 800` + fontSize inline | variant **`kpiValue`** (Geist 28px extrabold + `tabular-nums`) |
| Labels/etiquetas técnicas (`BROWSER_REPORTED`, uppercase tracking) | ALL-CAPS + snake_case visible | `GreenhouseChip kind='attribute' variant='label'` con copy es-CL legible en minúsculas |
| Chips de estado del mock | `Chip` MUI crudo o spans | `GreenhouseChip kind='status'` con `tone` semántico |
| Botones secundarios del mock | inventar gris/olivo o copiar el HEX del mock | `GreenhouseButton kind='secondaryAction'` / `theme.palette.secondary.*` cuando la acción realmente sea supporting; usa `inherit` sólo para acciones neutras sin rol de marca. Secondary es Tidal Teal y nunca un segundo primary contained. |
| Íconos 13/15/17/19/21/24/26/30px | copiar el px del mock | escala canónica **{14, 16, 18, 20, 22}** |
| Spacing del mock (13px, 18px, 22px…) | multiplicadores no canónicos (2.25, 2.75, 3.5) | escala `4n`: {1, 1.5, 2, 3, 4, 5, 6, 8} |
| Inputs/selects/textarea | `TextField`/`Select` MUI crudos | `CustomTextField` (+`select`/`multiline`); counters vía `helperText` `${len}/${max}` |
| Keyframes del mock (`ctaScrim/ctaDrawer/ctaPop/ctaToast/sheen`) | portar `@keyframes` locales | motion horneado de las primitives (Drawer/Dialog/Snackbar/Skeleton MUI + `motion/core/tokens`) |
| Tipografía display del mock | `fontFamily`/`fontSize` inline | variants del SoT: h4/h5 (Poppins display) · subtitle/body/caption (Geist) · `monoId` para ids |

## Checklist pre-JSX (obligatoria al implementar un mock .dc.html)

1. ¿Cada "card" del mock es `Card+CardHeader+CardContent` o un tonal `action.hover` sin borde?
2. ¿CERO `borderRadius` numérico como multiplicador sx? (grep antes de commitear)
3. ¿CERO HEX/px/fontFamily/fontSize transcritos del mock?
4. ¿Chips = `GreenhouseChip`, inputs = `CustomTextField`, fechas/números = `src/lib/format`?
5. ¿Íconos en {14,16,18,20,22} y spacing en la escala 4n?
6. ¿El scenario GVC declara `quality.layout` + `quality.runtime` + `quality.enterpriseRubric`?
   (lección: el wireframe-look PASÓ el gate porque el rubric era opt-in y nadie lo declaró)
7. ¿Loop GVC mirando frames (desktop+mobile) ANTES de declarar listo?

## Qué SÍ copiar del mock

Estructura de regiones y jerarquía · secuencia del flujo · estados y sus copys base ·
microcopy es-CL (validado con `greenhouse-ux-writing`) · qué es card vs sub-bloque vs chip ·
proporciones de columnas (traducidas al Composition Shell) · riqueza de interacción
(scrubbers, segmented controls, matrices) — implementada con primitives + tokens.
