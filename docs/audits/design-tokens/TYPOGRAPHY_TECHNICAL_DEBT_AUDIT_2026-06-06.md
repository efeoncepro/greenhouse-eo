# Audit — Typography technical debt (DESIGN.md ↔ runtime)

> **Tipo:** Auditoría técnica (reusable / base para task de remediación)
> **Fecha:** 2026-06-06
> **Autor:** Claude (sesión TASK-1034 adopción paleta AXIS — el audit emergió al robustecer DESIGN.md)
> **Alcance:** sistema de tipografía completo — `DESIGN.md` (contrato agente) ↔ `src/components/theme/mergedTheme.ts` (runtime) ↔ `src/@core/theme/**` (Vuexy core, read-only) ↔ `GREENHOUSE_DESIGN_TOKENS_V1.md`
> **Disparador:** pregunta del operador — "¿la deuda es solo en labels o en TODO lo de tipografía?"
> **Estado:** **RESUELTO** — TASK-1036 (fundación SoT + drift-guard + bridge, no-op) + **TASK-1038** (rediseño de escala = la remediación §6 aplicada: page-title 16→20 arregla la inversión, ladder 11→8, subtitle2/tab/dialog gobernados). Ver `docs/tasks/complete/TASK-1038-typography-scale-redesign.md`.
>
> **Hallazgos adicionales del completeness pass (incorporados a TASK-1038):** `subtitle2` no eran 3 consumidores sino **~267** (y es 13/**400** = body-sm, NO label-sm 13/600 — error de modelo corregido); PDF registra Geist solo 400/500/700 → **faltan 600/800** que la escala usa (caen a Helvetica); tipografía de **charts** sin mapear (~47 archivos); **text measure** (~65ch) ausente; ~1.351 `fontSize` inline (mayoría íconos). Decisiones transversales canonizadas (i18n/fluid/display/PDF-email/truncation/charts/measure) + follow-up rol peso 500.
> **Regla operativa:** seguimos robusteciendo DESIGN.md en paralelo; ESTA deuda debe resolverse en su propia task (no parchear dentro de TASK-1034).
>
> **Corrección post-implementación (importante — el audit sobre-dimensionó L2 y L3):** al verificar TASK-1036 contra el runtime real, el coretheme Vuexy (`src/@core/theme/typography.ts`) **SÍ** define los `fontSize` de h5/h6/button/subtitle1 y `mergedTheme` los hereda por `deepmerge` — el runtime YA coincidía con el contrato. NO había "drift activo" (§2/§4); la deuda real era de **gobernanza** (valor fuera del SoT de Greenhouse, sin guard). Y los "magic numbers" de control-text de §5 son casi todos tamaños de **ícono** (Button icon 14/16/20, Chip avatar/icon 13/15) o estructurales (input legend 0.867em), **no texto**; el control-texto ya estaba tokenizado (Button small/medium = body2/button, Chip = body2) y el único magic number de texto real era `<Button size="large">` 17px. **La remediación robusta de §6 se aplicó completa** (SoT `typographyScale` + `TYPOGRAPHY_VARIANT_BRIDGE` + `controlText` + drift-guard `typography-drift.test.ts`), con S0/S1/S2 **no-op visual** (único delta: overline lh 1.16667→1.167, button lh 1.467→1.5, sub-pixel línea única; Button-large 17px sin cambio).

---

## 0. TL;DR

1. **La deuda NO es solo en labels — es sistémica.** Los labels son el síntoma más visible (no tienen variante runtime en absoluto), pero el patrón cruza todo el sistema de tipografía.
2. **Tres capas de deuda:**
   - **L1 — Divergencia de vocabulario (la grande, ~todos los tokens):** DESIGN.md usa nombres semánticos (`page-title`, `section-title`, `label-md`, `body-md`, `numeric-id`, `kpi-value`); el runtime usa nombres MUI (`h4`, `h5`, `button`, `body2`, `monoId`, `kpiValue`). 12 de 15 tokens tienen nombre distinto en runtime. El agente debe **traducir cada nombre** para aplicarlo.
   - **L2 — Drift de valor / variantes stub:** `h5` (=section-title) y `button` (=label-md) **no definen `fontSize`** en `mergedTheme` → caen al default MUI o a overrides @core, y **no coinciden** con el valor del contrato. `label-lg`/`label-sm` **no tienen variante runtime**. `h6`/`subtitle1` existen en runtime sin equivalente en el contrato.
   - **L3 — Magic numbers dispersos (texto de control):** los tamaños de texto de Button (14/14/17px), Chip (13/15px), input (em-based) están **hardcodeados por componente en `@core/theme/overrides/*` (read-only)**, sin token compartido ni ramp coherente. No existe una escala canónica de "texto de control / label".
3. **Lo que SÍ está sano (no tocar):** el namespace `lineHeights` (`typography-tokens.ts`) está bien tokenizado (display/heading/pageTitle/metadata/body/numericDense, cero magic numbers en line-height); las familias (Poppins display h1-h4 / Geist el resto) son correctas; los **headlines `h1-h4` mapean limpio** (nombre + valor) entre contrato y runtime.
4. **Causa raíz:** el contrato (DESIGN.md, vocabulario semántico estilo Material/spec Google) y el runtime (MUI variant names + per-component overrides Vuexy) **nacieron de dos modelos distintos y nunca se reconciliaron a un SoT único**. `lineHeights` es la prueba de que el patrón correcto existe — solo falta extenderlo a `fontSize`/`fontWeight`/familia + nombres.
5. **Remediación robusta (no parche):** una **task dedicada** que cree un SoT de tipografía (análogo a `axis-tokens.ts` para color), lo wiree en `mergedTheme` (capa userTheme, NO @core) — incluyendo una **escala real de control-text/label** que reemplace los magic numbers — y **reconcilie el vocabulario** DESIGN.md ↔ runtime.

---

## 1. Contexto

Sesión de TASK-1034 (adopción de la **paleta AXIS** = color). Al robustecer DESIGN.md contra la spec `@google/design.md`, se agregaron `label-lg`/`label-sm` para completar la escala que la spec recomienda. La "fotografía" del runtime para validar esos valores destapó que **no hay respaldo real** para una escala de label — y el operador pidió verificar si la deuda es solo de labels o de toda la tipografía.

Este audit responde esa pregunta. **No** remedia (eso es una task; ver §6). TASK-1034 sigue siendo color; la tipografía es un sistema aparte.

---

## 2. Mapeo completo DESIGN.md ↔ runtime

| DESIGN.md (contrato) | Valores contrato | Runtime variant | Valores runtime | Estado |
|---|---|---|---|---|
| `headline-display` | Poppins 2rem/800/1.25 | `h1` | Poppins 2rem/800/heading(1.25) | ✅ nombre distinto, valor OK |
| `headline-lg` | Poppins 1.5rem/700/1.25 | `h2` | Poppins 1.5rem/700/1.25 | ✅ nombre distinto, valor OK |
| `headline-md` | Poppins 1.25rem/600/1.25 | `h3` | Poppins 1.25rem/600/1.25 | ✅ nombre distinto, valor OK |
| `page-title` | Poppins 1rem/600/1.4 | `h4` | Poppins 1rem/600/pageTitle(1.4) | ✅ nombre distinto, valor OK |
| `section-title` | Geist 1.125rem/600/1.5 | `h5` | 600 / body(1.5) — **sin `fontSize`** | ❌ **L2 drift**: h5 cae a default MUI (~1.25rem) ≠ 1.125rem |
| `label-lg` | Geist 1rem/600/1.5 | — | **(no existe)** | ❌ **L2/L3**: sin variante; control grande vía `<Button size="large">` (17px) |
| `label-md` | Geist 0.9375rem/600/1.5 | `button` | 600, no-transform — **sin `fontSize`** | ❌ **L2/L3 drift**: tamaño real desde @core (~14px) ≠ 0.9375rem (15px) |
| `label-sm` | Geist 0.8125rem/600/1.45 | — | **(no existe)** | ❌ **L2/L3**: sin variante; Chip small = 13px |
| `body-lg` | Geist 1rem/400/1.5 | `body1` | 1rem / body(1.5) | ✅ nombre distinto, valor OK |
| `body-md` | Geist 0.875rem/400/1.5 | `body2` | 0.875rem / body(1.5) | ✅ nombre distinto, valor OK |
| `body-sm` | Geist 0.8125rem/400/1.45 | `caption` | 0.8125rem / metadata(1.45) | ✅ nombre distinto, valor OK |
| `overline` | Geist 0.75rem/600/1.167/1px | `overline` | 600 / 0.75rem / 1px | ✅ **único nombre compartido** |
| `numeric-id` | Geist 0.875rem/600/tnum | `monoId` | 0.875rem/600/numericDense/tnum | ✅ nombre distinto, valor OK |
| `numeric-amount` | Geist 0.8125rem/700/tnum | `monoAmount` | 0.8125rem/700/numericDense/tnum | ✅ nombre distinto, valor OK |
| `kpi-value` | Geist 1.75rem/800/1.05 | `kpiValue` | 1.75rem/800/display(1.05) | ✅ nombre distinto, valor OK |
| — | — | `h6` | 600 / body — **sin fontSize, sin equivalente contrato** | ⚠️ **L2 orphan** |
| — | — | `subtitle1` | body — **sin fontSize, sin equivalente contrato** | ⚠️ **L2 orphan** |

**Lectura:** 9/15 tokens "OK valor" pero con **nombre distinto** (L1 universal). 3 con drift de valor / stub (`section-title`/h5, `label-md`/button, + `label-lg`/`label-sm` inexistentes). 2 orphans runtime (h6, subtitle1).

---

## 3. Capa 1 — Divergencia de vocabulario (sistémica)

`DESIGN.md` es el contrato que leen los agentes (Claude, Codex). Usa nombres semánticos al estilo de la spec Google / Material. El runtime expone variantes MUI. **Solo `overline` comparte nombre.** Para aplicar `section-title`, el agente tiene que saber que en runtime es `<Typography variant="h5">` (y que h5 no tiene el fontSize correcto). Para `label-md` → `<Button>` (no una variante). Para `numeric-id` → `monoId`.

`GREENHOUSE_DESIGN_TOKENS_V1.md` §15.1 declara un mapeo bilateral snake-case ↔ camelCase, pero:
- Es un mapeo **manual** que el agente debe consultar (fricción).
- No cubre los casos donde el nombre semántico **no existe** como variante (`label-lg`/`label-sm`/`section-title` correcto).
- Es **frágil**: nada falla en CI si el mapeo se desincroniza del runtime real (a diferencia de `lineHeights`, que es código).

**Impacto:** todo trabajo de UI nuevo arranca con una traducción mental contrato→runtime. Riesgo de que un agente use `sx={{ fontSize: ... }}` inline (rompiendo token discipline) porque "no encuentra" `label-md`/`section-title` como variante.

---

## 4. Capa 2 — Drift de valor / variantes stub

- **`h5` (= section-title):** `mergedTheme` solo le pone `fontWeight: 600` + `lineHeight: body`. **No define `fontSize`** → hereda el default MUI (~1.25rem/20px). Pero el contrato dice `section-title = 1.125rem` (18px). **El section-title real es más grande que el contrato.**
- **`button` (= label-md):** `mergedTheme.button` = `fontWeight 600 + textTransform none`, **sin `fontSize`**. El tamaño real lo fijan los overrides @core (`sizeSmall`=0.875rem, default ~0.875rem/14px, `sizeLarge`=1.0625rem/17px). El contrato dice `label-md = 0.9375rem` (15px). **Drift de 1px + sin fuente única.**
- **`label-lg` / `label-sm`:** no existen como variante. Se realizan vía `size` prop (Button) o defaults de Chip. **El contrato describe una escala de 3 pasos que el runtime no tiene como tal.**
- **`h6`, `subtitle1`:** variantes runtime vivas, sin `fontSize` definido y sin equivalente en el contrato → comportamiento indefinido/heredado, fuera de gobernanza.

---

## 5. Capa 3 — Magic numbers de texto de control (@core read-only)

Los tamaños de texto de los controles están hardcodeados por componente en `src/@core/theme/overrides/*` (Vuexy core, **read-only** por regla de design-system-governance):

| Componente | Tamaños de texto (fontSize) | Fuente |
|---|---|---|
| Button | small 0.875rem (14px) · medium ~14px · large 1.0625rem (17px) | `overrides/button.ts` |
| Chip | small 13px · medium 15px | `overrides/chip.ts` |
| Input/TextField | 0.867em / 1rem | `overrides/input.ts` |

Valores dispersos (13/14/15/16/17px) **sin token compartido ni ramp**. No hay una escala canónica de "control-text / label" de la que estos deriven. `theme.typography.button` es un stub que no transporta el tamaño.

**Por qué importa:** un control nuevo (o un `<Typography>` que quiera "texto de label") no tiene un token de tamaño al cual referirse → o se inventa un número inline, o se copia un magic number. Es el mismo anti-patrón que TASK-1034 Slice 4 cerró para los **colores** (hex hardcodeados → SoT `axisSemanticHex`), pero vivo en **tipografía de control**.

---

## 6. Causa raíz + remediación robusta (para la task dedicada)

**Causa raíz:** contrato y runtime nacieron de dos modelos (nombres semánticos vs MUI variants + overrides Vuexy) y **nunca se reconciliaron a un SoT único de tipografía**. `lineHeights` (`typography-tokens.ts`) es la prueba de que el patrón correcto ya existe en el repo — solo cubre line-height; falta extenderlo a `fontSize`/`fontWeight`/familia + reconciliar nombres.

**Remediación robusta (NO parche), forma espejo de lo que hicimos para color en TASK-1034:**

1. **SoT de tipografía** (`src/components/theme/typography-tokens.ts` extendido, o `axis-typography.ts`): la escala canónica completa (familia + size + weight + line-height + tracking + features) incluyendo un **ramp real de control-text/label** (sm/md/lg con valores que reflejen los controles reales: ~13/14/17px).
2. **Wire en `mergedTheme`** (capa userTheme, **NUNCA `@core/theme`**): que las variantes runtime (`button`, `h5`, `h6`, `subtitle1`) y los overrides de Button/Chip/input consuman el SoT → elimina los magic numbers dispersos y los stubs sin fontSize.
3. **Reconciliar el vocabulario** DESIGN.md ↔ runtime: decidir entre (a) renombrar variantes runtime a los nombres semánticos del contrato (alto blast-radius), o (b) un puente formal + verificado en CI (test de paridad como el `axis-semantic-drift.test.ts`) que falle si el mapeo se desincroniza. **(b) es más barato y escalable.**
4. **Drift guard**: test que asserte contrato↔runtime para tipografía (espejo del que existe para semánticos AXIS).
5. **Decidir h6/subtitle1**: definir o deprecar.

**Slicing sugerido:** (S0) SoT + drift-guard sobre lo que ya matchea; (S1) reconciliar L2 stubs (h5/section-title, button/label-md) sin cambiar nombres; (S2) escala control-text real + override de Button/Chip vía SoT; (S3) reconciliación de vocabulario (bridge verificado en CI); (S4) limpieza orphans.

---

## 7. Reglas duras (anti-regresión, para la task y para el interino)

- **NUNCA** parchear los valores de `label-*` en DESIGN.md para "que matcheen" sin resolver el SoT — eso documenta la deuda, no la cierra.
- **NUNCA** modificar `src/@core/theme/*` (Vuexy core, read-only). Todo override va en `mergedTheme` (capa userTheme).
- **NUNCA** crear variantes `theme.typography.label*` paralelas que ningún componente consuma (Button usa `size` prop; sería sistema fantasma). Si se crea una escala de control-text, los overrides de componente deben consumirla.
- **NUNCA** introducir `fontSize` inline en JSX/`sx` para texto de control — usar la variante/token canónico (regla existente de DESIGN.md + lint `greenhouse/no-untokenized-copy` cubre copy, no tamaños; considerar extender).
- **SIEMPRE** que se toque tipografía, mover juntos: SoT + runtime + DESIGN.md + V1 §3/§15.1 + drift-guard test (parity 3-capas de design-system-governance).
- **NO** mezclar esta remediación con TASK-1034 (color). Es su propia task.

---

## 8. Relación con TASK-1034 y estado interino

- TASK-1034 (paleta AXIS = color) **no se bloquea** por esta deuda. Los `lineHeights` y headlines están sanos; los semánticos de color ya son AXIS + drift-guarded.
- **Interino:** los `label-lg`/`label-sm` que se agregaron a DESIGN.md en esta sesión describen una escala sin respaldo runtime. Decisión operador (pendiente): revertirlos a `label-md` solo (contrato honesto/minimal) hasta que la task de tipografía establezca la escala con respaldo, **o** mantenerlos como "target" documentado con esta deuda referenciada. **Recomendación: revertir** (no shippear una escala que sabemos sin respaldo).
- DESIGN.md se sigue robusteciendo en lo que SÍ tiene respaldo (color, spacing, rounded, componentes); la tipografía completa espera su task.

---

## 9. Evidencia / fuentes

- Contrato: `DESIGN.md` (front-matter `typography`, 15 tokens).
- Runtime: `src/components/theme/mergedTheme.ts` (variantes h1-h6/subtitle1/body1-2/caption/button/overline/monoId/monoAmount/kpiValue).
- Line-height SoT (sano): `src/components/theme/typography-tokens.ts`.
- Magic numbers control-text: `src/@core/theme/overrides/{button,chip,input}.ts` (read-only).
- Spec extendida + mapeo bilateral: `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3, §15.1.
- Spec del contrato: `@google/design.md` (github.com/google-labs-code/design.md) — `recommended_tokens.typography` lista `headline-*`, `body-lg/md/sm`, `label-lg/md/sm`.
