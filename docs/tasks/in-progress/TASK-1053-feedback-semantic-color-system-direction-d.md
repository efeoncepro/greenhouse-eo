# TASK-1053 — Greenhouse color system overhaul (dirección D) — re-ramp completo de la paleta (excepto neutrales) + tokenización

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Paleta Restraint v1 APROBADA visualmente (operador 2026-06-08); pendiente GO de tokenización (Slice 0 → Fase A) — valores en §"Paleta APROBADA"`
- Rank: `TBD`
- Domain: `ui | platform | design-system | accessibility`
- Blocked by: `none`
- Coordination: coordina con TASK-1034 AXIS adoption. **TASK-1048: se foldean los one-offs sueltos (chart pos/neg + tag-blue surface); el success-ink `#2E7D32` queda diferido en 1048/task separada (decisión operador 2026-06-08).**
- Branch: `task/TASK-1053-feedback-semantic-color-system-direction-d`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

**Overhaul del sistema de color completo** de Greenhouse en la **dirección "D"**: re-ramp de TODA la paleta cromática — brand spine (navy + azul acción + verdes + orange) + **feedback semántico** (`info`/`success`/`warning`/`error`) — como paleta coherente única. **NO es solo semánticos.** Comparados los ramps `axisRamp` actuales contra la propuesta, **cambia casi toda la paleta** (anchors y/o ramps completos): el **primary se oscurece** `#0375db → #024C8F`, `info` cyan→azul, `success`→emerald, `error`→vermilion, `secondary` corrige su hue-shift a teal, y aparece un **green-canon olivo nuevo**. El único invariante duro son los **neutrales/`gray`**: quedan **exactamente como hoy** (`axisRamp.gray` + customColors), el slate del mockup NO se adopta (decisión operador 2026-06-07). Ver "Scope vs runtime (DELTA)" — **blast radius alto**, especialmente el primary (toca todo botón/link/acento).

El re-pick semántico es el corazón técnico: familias **vívidas y decopladas de la marca** (principio AXIS), con **fill e ink separados** (no un solo token forzado a hacer texto-sobre-blanco Y blanco-sobre-fill — esa regla "banda dual" es la que enlodaba los hues). Cada rol expone 6 valores gobernados (`fill` · `onFill` · `ink` · `tint` · `border` · `dark-fg`) + ramp 50→900, todos AA en light y dark. Incluye los **patrones de aplicación canónicos** (estado tonal por default, dot para listas densas, sólido solo para alta urgencia, KPI con delta inline sin pill, formularios con foco = azul de acción y estados con ícono+texto). Termina **tokenizando** por el flujo canónico `axis-tokens → axis-semantic → mergedTheme → DESIGN.md → V1 → drift-guard` + gate de contraste en CI.

La propuesta ya está construida y revisada visualmente como mockup interno (no tokenizado): `/admin/design-system/mockup/brand-color-system` (hoja completa) y la sección "Contrapropuesta D" en `/admin/design-system/mockup/brand-color-proposal`. **Esta task es el registro durable de TODOS los valores y reglas** para tokenizar sin perder nada si se compacta el contexto.

## Decisiones del operador — locked 2026-06-08

Estas resoluciones ajustan el scope y reemplazan/actualizan las Open Questions y las Decisiones clave F/G de más abajo. Son la fuente autoritativa.

1. **Primary / CTA — ✅ RESUELTO (Restraint v1, 2026-06-08): el primary NO se oscurece y NO se desacopla.** La mini-exploración convergió en que el problema no era "dónde se usa el primary" sino que `#024c8f` era demasiado oscuro. Fix: el primary se queda en **`#0375DB` vibrante** y ESE es el color de acción (CTA · links · foco · activo · chart single-series) — no hace falta un token `action` separado. Los **charts dejan de usar el primary**: tienen su propia paleta categórica vibrante. → **El stash debe DROPEAR sus cambios de oscurecido del primary** (reorder de `primaryColorConfig` a royal + re-value de `axisRamp.primary` a `#024c8f` + su `axisOpacity.primary`); se conservan sus cambios de semánticos + secondary. Valores en §"Paleta APROBADA".
2. **F — reconciliación AXIS: (A) actualizar Figma upstream.** El operador sincroniza el AXIS Figma maestro **después** del código (code-first temporal, divergencia gobernada y documentada en el header del SoT). Destino durable: runtime ≡ Figma.
3. **G — 3 verdes: CONFIRMADO.** Conviven a propósito (canon olivo / vivid lima / success emerald); se vieron bien en la propuesta. Aplicar igual el check de distinción del gap #4.
4. **Emails — DIFERIDOS a task separada.** No se tocan en esta task; el email tiene paleta propia aislada del SoT (`src/emails/constants.ts`). **Fuera de scope aquí.**
5. **Verde finanzas `#2E7D32` (success-ink) — DIFERIDO.** No se retira en esta task; queda en TASK-1048 / task separada (igual tratamiento que los emails). → Esta task **ya NO cierra** el success-ink de 1048, **NO** migra los 8 sitios de `#2E7D32`, y **NO** promueve `greenhouse/no-hardcoded-hex-color` a `error` baseline 0 (eso va con la task del verde finanzas). > ⚠️ Interpretación de "igual que el verde finanzas" — confirmar que se difiere como los emails.
6. **One-offs sueltos de TASK-1048 — SE FOLDEAN ACÁ.** Los colores categóricos sueltos (chart positivo/negativo `#3DBA5D`/`#FF4D49` + tag-blue surface `#eaf3fc`) entran en esta task.

**Refinamientos de seguridad/escalabilidad (evaluación 2026-06-08, aplicados al plan):**

- **El color pasa a ser capa con guard mecánico (como typography/elevation).** Hoy el color NO está enforced (no hay `semantic-color-drift.test.ts` ni contrast gate; `design:lint` no valida hexes de color → un re-value puede quedar "verde" rompiendo paridad de 3 capas en silencio). El PR que cambia los valores **trae en el mismo PR** DESIGN.md §Color + V1 §Color + el drift-guard nuevo + el contrast gate. Cutover auto-verificable.
- **Fase A se parte en dos PRs** para reversibilidad fina: **A1a = semánticos de feedback** (info/success/error/warning + sus AA — win claro, en este PR va el guard+gate) y **A1b = brand spine** (secondary ramp + green-canon + orange; el anchor del primary queda fuera de A1b hasta resolver el token de acción).
- **Consumidores que NO derivan del SoT** (no auto-actualizan): email (diferido), PDF accent + `#2E7D32` (diferido), refs primary en GH_COLORS. Manejarlos donde corresponda; los que quedan en scope se migran al SoT (no parche).

## ✅ Paleta APROBADA — Restraint v1 (operador 2026-06-08)

El operador aprobó la propuesta **Restraint v1** completa (charts vibrantes + dark retocado). **Esta sección es la fuente autoritativa de valores para la tokenización** y supersede los valores "dirección D" del cuerpo de esta spec (DELTA / §A-C) donde difieran. Detalle vivo + razonamiento: `docs/operations/proposals/TASK-1053-color-palette-iteration.md`. Render aprobado: `/admin/design-system/mockup/brand-color-comparison`.

**Brand spine:**

- **Accent / primary** (CTA · links · foco · activo · chart single-series): `#0375DB` — vibrante, AA blanco 4.6:1. Ramp 50→900: `#EAF3FC #CFE4FA #A6CDF5 #6FACF0 #2E8BE8 #0375DB #0362BA #024C8F #023C70 #00284D`. **NO se oscurece** (se descartó el `#024C8F` de D). Dark-fg: `#6FACF0`.
- **Navy** (shell/header institucional): `#023C70` = **accent-800** (mismo azul, step oscuro — NO un hue aparte).
- **Green de marca (UNO):** pop `#6EC207` + ink crisp `#4B8405`. **El olivo `#3E7A12` se elimina.**
- **Orange:** `#FF6500` = **sub-brand (Reach)**, fuera del UI diario (no warning, no CTA).

**Semánticas de feedback (intactas vs D — ya AA + modernas), 6 sub-valores:**

| Rol | fill | onFill | ink | tint | border | dark-fg |
|---|---|---|---|---|---|---|
| Info | #1F6FD4 | #FFFFFF | #155CAD | #E8F1FD | #C2DBF7 | #6FB0F0 |
| Success | #157F47 | #FFFFFF | #11703F | #E7F6EE | #BCE6CF | #5FC891 |
| Warning | #FFB703 | #2A1A00 | #8A5A00 | #FFF4D6 | #F5D98A | #E8B84B |
| Error | #DC2E39 | #FFFFFF | #C01D27 | #FDECEC | #F5C2C4 | #F08A8F |

**Neutrales:** Greenhouse gray (invariante, `#97939e` family). NO slate.

**Charts — paleta categórica VIBRANTE (anclada a marca):**

- Light: `#0375DB #6EC207 #FF6500 #7C3AED #06B6D4 #EC4899`
- Dark (levantada): `#3B8EE8 #7FD42A #FF8A3D #9B6BF0 #22C9E4 #F25BAC`
- Cashflow pos/neg: `#3DBA5D` / `#FF4D49`. Single-series → el acento. **Nunca el navy.**

**Dark mode = derivación propia (no invertir):** acento → `#6FACF0`; semánticas → su dark-fg; charts → paleta dark levantada; jerarquía de superficie bodyBg `#25293C` + paper `#2F3349`.

**Checks abiertos (verificar en tokenización, no bloquean):** (1) crowding acento `#0375DB` sólido vs info `#1F6FD4` tonal — el tratamiento difiere (acción sólida, info tonal), confirmar; (2) Coblis del chart palette + regla color-nunca-solo (red/lima no adyacentes + ícono/label).

## ⚠️ Scope vs secuencia — NO CONFUNDIR (clarificación operador 2026-06-08)

> **Regla dura para cualquier agente (incluido yo mismo en otra sesión): el operador aprobó la propuesta Restraint v1 COMPLETA** (*"me quedé con tu propuesta completa, me encantó"*). **Secuenciar en slices (Fase A → Fase B) es cómo se implementa, NO qué se decidió.** Poner algo en una slice posterior **no** lo hace "diferido" ni "fuera de scope". Confundir estos dos ejes ya causó un error (sesión 2026-06-08): se reportaron charts/dark/sub-valores como "diferidos" cuando son scope aprobado.

**TODO esto es SCOPE de TASK-1053 (aprobado en Restraint v1) — se hace en esta task, distribuido en slices por reversibilidad:**

- Semánticos AA (info/success/warning/error) con sus **6 sub-valores** (`fill`/`onFill`/`ink`/`tint`/`border`/`dark-fg`). [A1a hace `fill`/`onFill`; B1 agrega `ink`/`tint`/`border`/`dark-fg` — ambos son scope]
- **Secondary** corregido (sin hue-shift a teal) + **orange** como sub-brand. [A1b]
- **Charts: paleta categórica VIBRANTE** (`#0375DB #6EC207 #FF6500 #7C3AED #06B6D4 #EC4899` + cashflow pos/neg + dark levantada). [scope, slice de charts]
- **Dark mode con derivación propia** (acento `#6FACF0`, semánticas a su dark-fg, charts dark, bodyBg `#25293C`/paper `#2F3349`). [tejido a través de A1a + B1 + charts]
- **Patrones de aplicación** (tonal-by-default, dot, KPI delta inline, form states). [B2]
- **Primary se queda `#0375DB`** — esto es una **decisión activa** (no "diferido"): se descarta el `#024C8F` oscuro de la dirección D.

**SOLO esto está REALMENTE fuera de scope de TASK-1053 (diferido por decisiones #4/#5 del operador) — ver "Out of Scope":**

1. **Success-ink `#2E7D32`** + su migración → TASK-1048 / task separada.
2. **Emails** (paleta propia aislada del SoT, `src/emails/constants.ts`) → task separada.
3. **Promover `greenhouse/no-hardcoded-hex-color` a `error` baseline 0** → con la task del verde finanzas.

Si vas a decir "esto no se hace en TASK-1053", verificá que sea exactamente uno de esos 3. Cualquier otra cosa de Restraint v1 **se hace**.

## Delta de ejecución 2026-06-08 (A1a + A1b shipped en `develop` local)

- **Slice 0 (foundation) ✅** — ADR `GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1` (Accepted) + DECISIONS_INDEX + este callout. Commit `1415f8cb3`.
- **Fase A1a (semánticos) ✅** — commit `c62a70aea`. Re-value info `#1F6FD4` / success `#157F47` / error `#DC2E39` (texto blanco) + warning `#FFB703` (ink) en `axis-tokens` + `axis-semantic`. Guard nuevo: `contrast.ts` (helper WCAG) + `axis-semantic-contrast.test.ts`. Paridad: DESIGN.md §Color (front-matter + prosa + status-chip success/info → blanco) + V1 §8. Gates: design:lint 0/0 · tsc · theme tests · build ✓ · GVC light+dark ✓.
- **Fase A1b (brand spine — secondary) ✅** — `axisRamp.secondary` re-valuado a verde coherente (corrige hue-shift a teal en 600-900): pop `#6EC207` (500) · ink `#4B8405` (700, AA blanco 4.56:1) · dark `#396504` (800). Contrast guard extendido a `secondary.main`. Paridad DESIGN.md + V1. GVC ✓ (ramp = una sola familia verde).
- **Orange — SCOPE, secuenciado a la slice de charts (NO en A1b, NO diferido):** `#FF6500` está en Restraint v1 con **dos consumidores**: (1) **sub-brand Reach** (fuera del UI diario — no warning, no CTA) y (2) **serie #3 de la paleta categórica de charts** (`#0375DB #6EC207 #FF6500 #7C3AED #06B6D4 #EC4899`). Su consumidor real es la **paleta de charts**, que es una slice posterior (Fase B/charts) — por eso orange se formaliza **con esa slice**, donde la serie #3 lo consume. NO se agregó en A1b porque A1b es el brand spine de roles MUI (secondary) y orange NO es un rol MUI (no es warning/CTA); agregar `axisRamp.orange` suelto antes de su consumidor = token sin consumidor (`design:lint` lo rechaza). **Corrección de framing (2026-06-08):** una versión previa de este Delta lo llamó "diferido hasta superficie Reach" — incorrecto; orange es scope, su consumidor (charts series #3) es scope, solo está secuenciado a la slice de charts. El `#ff6500` de `colorSchemes.ts` es el **warning legacy Vuexy** (overrideado a amber por mergedTheme), no este orange.
- **Green-canon olivo `#3E7A12` — NO se agrega:** Restraint v1 eliminó el olivo (decisión G refinada a 2 verdes). El cuerpo histórico "dirección D" más abajo lo mantiene como referencia del "antes"; NO es scope.
- **Primary ramp fix (commit `34d71776a`):** se pasó el accent ramp aprobado a `axisRamp.primary` (navy=accent-800 `#023C70`; main `#0375DB` sin cambio) + `efeonce-core.light`→`#2E8BE8`. Cierra el gap "solo el 500 coincidía".
- **Charts SoT "Deep-bright" (commit charts SoT):** `axis-chart.ts` rediseñado **self-contained** (NO marca/semánticos, "rica en sí misma"). El operador eligió **Deep-bright** `#5145E0 #1FBA85 #FB7A00 #D633C9 #3CC9F0 #9BE036` entre 4 candidatas re-analizadas (CVD-min 12.9 ✓ + clash 23 ✓ + chroma 73). Estructura: categorical (6) + directional (pos/neg/neutral) + dark. **Sin semánticos en charts** (decisión operador: success ink muy oscuro, warning=amber alerta). Migrados TODOS los consumers (CSC `CSC_COLORS`+`CSC_CHART_COLORS` legacy, Pulse, KPI sparklines Home vía `chartHexColor` nuevo, cashflow→directional). Surfaceado en `/admin/design-system/colors`. Reglas en DESIGN.md §Chart + V1 §8.1.ter. Resuelve las 2 quejas (2 azules+amber en CSC; verde-dark+amber en KPIs), GVC verde.
- **Fase B Slice B1 — tonal-by-default sub-valores + `theme.greenhouseSemantic` ✅ (commit `2c3dc4132`):** los 16 sub-valores curados (ink/tint/border/darkFg por rol feedback) viven en `axisSemanticSubValues` (`axis-semantic.ts`, capa semántica como `contrastText` — NO ramp paralelo). Nuevo **factory mode-aware `greenhouseSemanticTokens(mode)`** (`greenhouse-semantic-tokens.ts`, espejo exacto de `elevationTokens`) expuesto como `theme.greenhouseSemantic.<role>`; compone el triple tonal por modo (light: tint/ink/border · dark: darkFg + `color-mix`). **Rollout decidido por el operador (AskUserQuestion): primitive-scoped** — el `label` (tonal) variant de `GreenhouseChip` consume el triple para tonos feedback; los `<Chip>`/`<Alert>` MUI crudos NO cambian (sin flip global). Arregla un **bug AA real**: `warning.main` `#FFB703` amber como texto era ilegible → ahora `tonalText`=ink `#8A5A00` (5.41:1 sobre tint). Lab `/admin/design-system/chips` hecho fiel (su `getAxisChipSx` consume los sub-valores por modo). Sub-valores surfaceados como tokens descubribles en `/admin/design-system/colors` (card `SemanticTonalCard`, espejo de la de charts; commit `14fde8c75`). Gates: `greenhouse-semantic-drift.test.ts` (pin 16 hexes + composición factory) + `axis-semantic-contrast.test.ts` extendido (ink/white ≥5.9, ink/tint ≥5.3, darkFg/charcoal ≥5.98). Paridad: DESIGN.md §Color + V1 §8.1.quater. 147 theme tests · design:lint 0/0 · tsc 0 · GVC light+dark ✓.
- **Fase B Slice B2 — feedback atoms ✅ (commit `e2daf6a8e`):** dos primitives inline (patrones repetidos ~15× c/u → primitive justificada). **`GreenhouseKpiDelta`**: delta KPI ("+12.4% ▲") con signo + flecha SIEMPRE (color nunca solo, WCAG 1.4.1) + color AA desde `theme.greenhouseSemantic` (NO `palette.main`), variants `text`/`tonal`, `invert` (up-is-bad), `neutralThreshold`; migra el delta inline de `HomeRunwayStrategic`; test de `resolveKpiDeltaDirection`. **`GreenhouseStatusDot`**: dot + label para listas densas, `label` O `ariaLabel` requerido por tipo, tone semántico, `pulse`/`halo`; migra el dot de `HomeReliabilityRibbon` (fiel: halo + pulse en healthy). Showcase "Feedback atoms" en el lab de chips. Registradas en `ui-platform/PRIMITIVES.md` + HISTORIAL. tsc 0 · lint 0 · 151 tests · GVC light+dark. **Fase B COMPLETA** (sub-valores + tonal chips + atoms; dark-fg consumido).
- **Pendiente (tasks separadas, no Fase B):** TASK-1054 (migración de ~11 charts al Chart SoT). Reconciliación AXIS Figma upstream (code-first). Diferido: success-ink `#2E7D32` (TASK-1048), paleta emails, lint→error baseline. Adopción de KpiDelta/StatusDot en superficies restantes = gradual.

## Why This Task Exists

El sistema de feedback actual (AXIS semantic runtime: `success #28c76f`, `warning #ffb703`, `error #ff4c51`, `info #00bad1`) es vívido pero **no resuelve texto-sobre-blanco AA** (gap documentado en `axis-semantic.ts`: "the error ramp needs an additional dark step"; mismo gap para success → `#2E7D32` hardcodeado en ~8 sitios, TASK-1048). Una primera propuesta (iterada con el operador) intentó arreglarlo con la regla **"banda dual [4.5–7] → un solo token sirve de texto y de fill"**, pero forzar un único 500 a cumplir ambas bandas **oscurece y dessatura** los hues → quedaron "lodo" (info teal polvoriento, success verde bosque, error ladrillo). El operador lo detectó: *"no los veo como una UI moderna nivel enterprise"* y *"el problema es más de la propuesta misma de colores"*.

**Causa raíz:** colapsar fill e ink en un token. **Fix (dirección D):** desacoplar — el modelo Radix/Stripe/Linear/GitHub/Geist: **fill vívido** (500 limpio, para fondo/dot/icono) + **ink oscuro separado** (700/800, para texto sobre blanco/tint) + **tint** (bg claro) + **border** (hairline) + **dark-fg** (acento dark mode). Esto da color moderno **y** AA, y es consistente con el principio AXIS de decoplar marca de feedback.

Además, el operador identificó dos reparos de **tratamiento** (no solo de hue): (1) los chips de estado sólidos saturados con texto blanco son el patrón "admin template 2016" → el default debe ser **tonal**; (2) los KPI con todo en chips se ven ruidosos → el delta debe ser **inline** (flecha/dot + texto en ink, sin pill).

Sin esta task, los valores + reglas viven solo en archivos de mockup volátiles y en el contexto de chat. Tokenizar después sin este registro = riesgo de re-derivar a ojo (prohibido por Solution Quality Contract + design-system-governance) y reintroducir el lodo.

## Goal

- **Sistema de color completo gobernado** (spine + neutrales + semánticos) como paleta coherente única, con DELTA explícito vs runtime (qué cambia / qué formaliza / qué no toca) — ver sección "Scope vs runtime (DELTA)".
- Tokens semánticos canónicos para `info`/`success`/`warning`/`error` con **6 valores gobernados por rol** (`fill`/`onFill`/`ink`/`tint`/`border`/`dark-fg`), todos AA verificados en `light` + `darkSemi`.
- Ramps 50→900 por rol, reconciliados con AXIS upstream (los steps oscuros que hoy no existen).
- Patrones de aplicación canónicos documentados en DESIGN.md/V1 (tonal default, dot, sólido-excepción, KPI delta inline, estados de formulario, foco = azul de acción, color-nunca-solo).
- ~~Reemplazar el parche `#2E7D32` hardcodeado~~ **DIFERIDO (decisión operador 2026-06-08):** el success-ink `#2E7D32` y su migración quedan en TASK-1048/task separada (como los emails). Esta task NO lo retira ni promueve el lint a `error`.
- Paridad de 3 capas + drift-guard + gate de contraste en CI.
- Actualizar la página viva existente `/admin/design-system/colors` **sin cambiar su estructura** (valores se actualizan solos vía `theme.axis.*`) + agregar una sección de **ejemplos de implementación** con tokens canónicos (no hex).
- Decisión consciente registrada y confirmada: **3 verdes** (brand-work + brand-pop + success-feedback).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (§3 type, §6 elevation; agregar §Color semántico)
- `DESIGN.md` (raíz, contrato agente, lint-gated TASK-764 — sección Color)
- `src/@core/theme/axis-tokens.ts` (ramps AXIS — SoT de valores)
- `src/@core/theme/axis-semantic.ts` (roles semánticos — donde vive el gap "needs a dark step")
- `src/components/theme/mergedTheme.ts` (runtime authority)
- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`

Reglas obligatorias:

- **Paridad de 3 capas** en el mismo PR: `mergedTheme.ts` (runtime) + `DESIGN.md` §Color + `GREENHOUSE_DESIGN_TOKENS_V1.md` §Color. `pnpm design:lint` 0 errores / 0 warnings.
- Semánticos fluyen del **AXIS SoT** (`axis-tokens.ts` ramp → `axis-semantic.ts` roles). **NO** `customColors` ad-hoc (eliminados en TASK-1034) **NI** `GH_COLORS`.
- Contraste verificado en `light` + `darkSemi` (a11y-architect: texto ≥4.5:1, large/UI ≥3:1, no color-only WCAG 1.4.1).
- Skill que gobierna: `design-system-governance`. Charts pos/neg coordinan con `dataviz-design` (daltonismo). Microcopy de estados (si aparece) con `greenhouse-ux-writing`.
- **Runtime real es `light` / `darkSemi`** (charcoal, no full black). El mockup usó `#25293C` como charcoal de referencia (= darkSemi surface).

## Normative Docs

- Mockup hoja completa: `src/views/greenhouse/admin/design-system/BrandColorSystemMockupView.tsx` (`/admin/design-system/mockup/brand-color-system`).
- Mockup contrapropuesta D: sección `CounterProposalD` en `BrandColorProposalMockupView.tsx` (`/admin/design-system/mockup/brand-color-proposal`).
- Scenarios GVC: `scripts/frontend/scenarios/brand-color-system.scenario.ts`, `brand-color-system-apps.scenario.ts`, `brand-color-counter-proposal.scenario.ts`.
- TASK-1048 (subsumida en su parte de success-ink), TASK-1034 (AXIS adoption en progreso), TASK-764 (design-contract CI gate).

## Dependencies & Impact

- **Depende de:** AXIS SoT (`axis-tokens.ts`/`axis-semantic.ts`) existente. Coordinación con TASK-1034 (AXIS full palette adoption en progreso) — esta task **cambia los valores semánticos de AXIS** (ver "Decisión clave: reconciliación con AXIS upstream").
- **Impacta a:** TASK-1048 (decisión operador 2026-06-08: **se foldean acá** los one-offs de chart pos/neg + tag-blue surface; el **success-ink `#2E7D32` queda diferido** en 1048/task separada — esta task ya NO lo subsume). TODA superficie que use `theme.palette.{info,success,warning,error}` (cambio de hue runtime → blast radius amplio pero gobernado por theme, sin tocar consumidores uno a uno). **El CTA pasa a un token `action` desacoplado del primary (decisión 1).**
- **Archivos owned (cuando se implemente):** `src/@core/theme/axis-tokens.ts` (ramps semánticos), `src/@core/theme/axis-semantic.ts` (roles), `src/components/theme/mergedTheme.ts` (palette derive + namespace `theme.greenhouseSemantic` si se necesita exponer ink/tint/border/dark-fg), `DESIGN.md`, `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`, drift-guard test nuevo, página viva `/admin/design-system/colors` (extender, no restructurar).

## Current Repo State

- **Ya existe:**
  - AXIS SoT con ramps + roles semánticos (`axis-tokens.ts` / `axis-semantic.ts`).
  - Runtime semántico actual: `success #28c76f`, `warning #ffb703`, `error #ff4c51`, `info #00bad1` (vívidos, **no AA para texto sobre blanco**).
  - Gap documentado "needs a dark step" (error + success) en `axis-semantic.ts`.
  - Parche `#2E7D32` (success-ink) hardcodeado en ~8 sitios (PDFs/Excel `NET_ACCENT` + UI de montos).
  - Mockups de la propuesta D (no tokenizados) + scenarios GVC.
  - Patrón de tokenización canónico (TASK-1034/1036/1038/1049 lo aplican): SoT → mergedTheme → DESIGN.md → V1 → drift-guard.
- **Gap:**
  - No existe la capa semántica decoplada de 6 valores por rol (`fill`/`onFill`/`ink`/`tint`/`border`/`dark-fg`).
  - No existen los steps oscuros AA en los ramps semánticos (info/success/warning/error).
  - No están codificados los patrones de aplicación (tonal/dot/sólido-excepción/KPI inline/form states) en el contrato.
  - `/admin/design-system/colors` (existente) renderiza los ramps pero no tiene una sección de **ejemplos de implementación** (tonal/dot/KPI/form) con tokens canónicos.
  - No hay drift-guard ni gate de contraste de semánticos en CI.

---

## Detailed Spec

### Scope vs runtime (DELTA) — re-ramp COMPLETO de la paleta cromática

⚠️ **Esto NO es solo semánticos.** Comparados los ramps `axisRamp` (SoT runtime, `src/@core/theme/axis-tokens.ts`) contra los de la propuesta D, **cambia casi toda la paleta cromática** — anchors y/o ramps completos. Lo único que se conserva (según el operador) son los **neutrales**. Tabla real (no por el 500 suelto — por el ramp entero):

| Familia | AXIS actual (`axisRamp`) | Propuesta D | Veredicto |
|---|---|---|---|
| **Primary / CTA** | `primary` 500 `#0375db` | (D proponía `#024C8F`) | **✅ RESUELTO (Restraint v1, 2026-06-08): el primary se queda en `#0375db` vibrante — NO se oscurece.** Ese es el color de acción (no se desacopla). Los charts usan paleta categórica propia, no el primary. Ver §"Paleta APROBADA". |
| **Navy identidad** | (≈ `primary` 800 `#003b70`) | `navy` 500 `#023C70` (ramp propio) | **CAMBIA / rol nuevo** |
| **Secondary (verde)** | `secondary` 500 `#6ec207` **pero ramp se va a TEAL** en dark (`#1d9d72…#03593d`) | `greenVivid` 500 `#6EC207` (ramp se mantiene verde `#5CA306…#284603`) | **CAMBIA** ramp (corrige el hue-shift a teal) |
| **Green canon (olivo)** | — (no existe) | `greenCanon` 500 `#3E7A12` | **NUEVO** |
| **Orange** | — (no en `axisRamp`; vive en `efeonce-sunset` + `GH_COLORS`) | `orange` 500 `#FF6500` (ramp propio) | **CAMBIA / formaliza en AXIS** |
| **Info** | `info` 500 `#00bad1` (cyan) | `info` 500 `#1F6FD4` (azul) | **CAMBIA hue** (cyan→azul) |
| **Success** | `success` 500 `#28c76f` (verde brillante) | `success` 500 `#157F47` (emerald) | **CAMBIA hue** |
| **Warning** | `warning` 500 `#ffb703` | `warning` 400 `#FFB703` (mismo anchor, ramp reorganizado) | **CAMBIA** ramp |
| **Error** | `error` 500 `#ff4c51` (coral) / main `#cc3d41` | `error` 500 `#DC2E39` (vermilion) | **CAMBIA hue** |
| **Neutral / gray** | `gray` (`axisRamp.gray`, 500 `#97939e`) | (el slate `#5B6472` del mockup era ilustrativo) | **NO CAMBIA — invariante** (decisión operador 2026-06-07): conservar `axisRamp.gray` EXACTO; el slate NO se adopta |

**Lectura honesta:** dirección D es un **overhaul de la paleta cromática**, no un ajuste de feedback. Cada familia cromática re-rampa; varias cambian de hue (primary más oscuro, info cyan→azul, success→emerald, error→vermilion); secondary corrige el hue-shift a teal; green-canon es nuevo. **Los neutrales (`gray`) son el único invariante duro — quedan byte-for-byte como hoy.** **Blast radius alto** — especialmente el primary (toca todos los botones/links/acentos). Por eso esto **debe** ir gateado por GVC de superficies clave + contrast probe + decisión explícita del operador, no como cambio menor.

### A. Tokens semánticos canónicos (la decisión de color)

Cada rol expone **6 valores gobernados**. Ratios verificados con la fórmula WCAG (auditor local del mockup). Amber sigue lógica de **señal de tránsito** (texto oscuro sobre fill; nunca texto blanco).

| Rol | `fill` (dot/sólido/icono) | `onFill` (texto en fill) | `ink` (texto en blanco/tint) | `tint` (bg tonal) | `border` (hairline) | `dark-fg` (acento dark) | icono |
|---|---|---|---|---|---|---|---|
| **Info** (azure) | `#1F6FD4` | `#FFFFFF` (4.9:1) | `#155CAD` (6.2:1) | `#E8F1FD` | `#C2DBF7` | `#6FB0F0` | `tabler-info-circle` |
| **Success** (emerald) | `#157F47` | `#FFFFFF` (5.05:1) | `#11703F` (5.6:1) | `#E7F6EE` | `#BCE6CF` | `#5FC891` | `tabler-circle-check` |
| **Warning** (amber, traffic-sign) | `#FFB703` | `#2A1A00` (9.65:1) | `#8A5A00` (5.1:1) | `#FFF4D6` | `#F5D98A` | `#E8B84B` | `tabler-alert-triangle` |
| **Error** (vermilion) | `#DC2E39` | `#FFFFFF` (4.61:1) | `#C01D27` (5.4:1) | `#FDECEC` | `#F5C2C4` | `#F08A8F` | `tabler-circle-x` |

Reglas por token:

- **`fill`** — fondo de badge sólido, **dot** de estado, color de **icono**, fondo de botón de alta-emfasis. Lleva `onFill` encima: **blanco** en info/success/error; **oscuro `#2A1A00`** en warning (amber no admite texto blanco AA — física, no preferencia). Como UI/large element pasa ≥3:1; como texto pasa ≥4.5:1 (info 5.0 / success 4.8 / error 4.6 sobre blanco) — pero para **texto** se usa `ink`, no `fill`.
- **`ink`** — el color de **texto** canónico del rol (sobre blanco o sobre `tint`). Step oscuro separado, ≥4.5:1 sobre blanco y sobre su propio `tint`. Es lo que va en helper de form, texto de alerta, label de chip tonal, delta de KPI.
- **`tint`** — fondo de **chip tonal**, **alerta/banner**, **tile de icono** de KPI, strip de hint. Step 50/100. `ink` encima siempre ≥4.5:1.
- **`border`** — **hairline** del chip tonal / alerta / input. Step 200/300. Sostiene la separación bajo `forced-colors` (donde el navegador elimina backgrounds).
- **`dark-fg`** — el **único acento** en dark mode (charcoal `#25293C`): texto, icono, borde de chip outlined. ≥4.5:1 sobre charcoal. El `border` sostiene separación bajo forced-colors en dark.

### B. Ramps completos 50→900 (semánticos — reconciliar con AXIS upstream)

Anclados a los `fill`/`ink` de arriba. Los steps oscuros (ink) son los que **hoy no existen** en AXIS y hay que **reconciliar upstream** (ver Decisión clave).

```
info    50 #EEF4FD · 100 #E8F1FD · 200 #C2DBF7 · 300 #94BEEE · 400 #4E90DE · 500 #1F6FD4 · 600 #1A5EB8 · 700 #155CAD · 800 #114A8C · 900 #0C376A
success 50 #EDF7F1 · 100 #E7F6EE · 200 #BCE6CF · 300 #8FD3AE · 400 #46A877 · 500 #157F47 · 600 #127140 · 700 #0F5E35 · 800 #0B4928 · 900 #073219
warning 50 #FFFBF0 · 100 #FFF4D6 · 200 #F5D98A · 300 #FFD25C · 400 #FFB703 · 500 #E0A006 · 600 #B5810A · 700 #8A5A00 · 800 #6B4900 · 900 #472F00
error   50 #FDEDEE · 100 #FDECEC · 200 #F5C2C4 · 300 #ED9094 · 400 #E25A61 · 500 #DC2E39 · 600 #C01D27 · 700 #9E1820 · 800 #7B1219 · 900 #560C11
neutral 50 #F8F9F9 · 100 #EFF0F1 · 200 #DBDDE0 · 300 #BDC1C7 · 400 #9399A2 · 500 #5B6472 · 600 #4B525D · 700 #3A4049 · 800 #2A2E34 · 900 #1B1E22
```

Mapeo rol → step: `fill` = info/success/error 500, warning 400 (amber brillante); `ink` = info 700 / success ~600-700 (`#11703F`) / warning 700 / error 600 (`#C01D27`); `tint` = 100; `border` = 200.

### C. Brand spine (colores de trabajo — RE-RAMP, no formalización)

Dirección D **re-rampa** el spine completo (ver DELTA: cada familia cambia su ramp, y el primary su anchor). Ramps propuestos 50→900:

```text
navy       50 #F2F5F8 · 100 #E1E8EE · 200 #BDCCDA · 300 #90A9C0 · 400 #4E779B · 500 #023C70 · 600 #02325E · 700 #01294C · 800 #011F3A · 900 #011628
action     50 #F2F6F9 · 100 #E1EAF2 · 200 #BDD0E2 · 300 #90B0CE · 400 #4E82B1 · 500 #024C8F · 600 #024078 · 700 #013461 · 800 #01284A · 900 #011B33
greenCanon 50 #F5F8F3 · 100 #E8EFE3 · 200 #CDDCC1 · 300 #AAC497 · 400 #78A259 · 500 #3E7A12 · 600 #34660F · 700 #2A530C · 800 #203F09 · 900 #162C06   ← NUEVO
greenVivid 50 #F8FCF3 · 100 #EEF8E1 · 200 #D9EFBF · 300 #BFE492 · 400 #9AD451 · 500 #6EC207 · 600 #5CA306 · 700 #4B8405 · 800 #396504 · 900 #284603
orange     50 #FFF7F2 · 100 #FFEDE0 · 200 #FFD7BD · 300 #FFBB8F · 400 #FF934D · 500 #FF6500 · 600 #D65500 · 700 #AD4500 · 800 #853500 · 900 #5C2400
```

- **Navy identidad** `#023C70` — shell, nav, headers institucionales (raíz del logo). Anchor coincide con `efeonce-azure`/`deepAzure` pero el **ramp es nuevo** vs `axisRamp.primary`.
- **Action blue** `#024C8F` — **PRIMARY/CTA**, links, **foco/ring**, estados activos. Support tint `#E8F1F8`. Dark `#6BA6E8`. **Cambia el anchor del primary** vs `axisRamp.primary 500 #0375db` (más oscuro) + ramp nuevo. Blast radius alto.
- **Green canónico** `#3E7A12` (olivo) — verde de **trabajo de marca** (texto/icono/fills sobrios) = "green-ink". **NUEVO** (no existe en runtime).
- **Green vivid** `#6EC207` (lima) — **pop de marca** decorativo (fill only; texto → green-ink). Anchor = `axisRamp.secondary 500` pero el **ramp corrige el hue-shift a teal** del actual.
- **Orange** `#FF6500` — accent de marca (fill/pop; texto → orange-ink `#9A3D00`). NO warning, NO CTA. No existe como ramp en `axisRamp` (vive en `efeonce-sunset`+`GH_COLORS`) → **formaliza en AXIS** con ramp propio.

### C.2 Neutrales — INVARIANTE (NO se tocan)

**Regla dura (decisión operador 2026-06-07):** los neutrales quedan **exactamente como hoy** en Greenhouse — `axisRamp.gray` (`100 #eaeaec · 200 #d5d4d8 · 300 #c0bec5 · 400 #aba8b1 · 500 #97939e · 600 #827d8b · 700 #6d6777 · 800 #585164 · 900 #433c50`) + los neutrales `customColors` actuales. **El slate `#5B6472…` que aparece en el mockup era solo ilustrativo y NO se adopta.** Esta task NO modifica ningún token neutral/gray ni sus consumidores. Si al implementar el drift-guard o el contrast gate apareciera presión para tocar un neutral, es señal de error de scope — parar.

### D. Patrones de aplicación canónicos (las reglas de tratamiento)

Estas reglas son tan canónicas como los hex — definen cómo se ve "moderno enterprise" vs "admin 2016".

1. **Estado por default = TONAL.** `tint` bg + `ink` texto + `border` hairline + icono. Bajo ruido, escaneable. Es el default de chips/badges de estado.
2. **Dot — para tablas/listas densas.** `fill` dot (8px) + texto neutro/`ink`. El patrón más sobrio (Linear). Para filas densas.
3. **Sólido = EXCEPCIÓN de alta urgencia.** Solo banner crítico o count que debe gritar. `fill` bg + `onFill` (blanco info/success/error; oscuro warning). **NUNCA** como estado inline default.
4. **KPI delta = INLINE, sin pill.** Tendencia numérica → glyph de flecha (`tabler-arrow-up-right`) + texto en `ink`. Estado-palabra → dot (`fill`) + texto en `ink`. El número manda; el delta acompaña. **Nunca** un pill por card.
5. **Formularios:**
   - **Foco = azul de ACCIÓN** (`#024C8F`) + ring `support` tint — **no** un color semántico (el foco es navegación, no feedback).
   - **Éxito**: borde `success.fill` + icono check + helper en `success.ink` ("Disponible y verificado").
   - **Error**: borde `error.fill` + icono alert + helper en `error.ink`.
   - **Hint info**: strip `info.tint` + `info.border` + icono + texto `info.ink`.
   - **Warning inline**: icono amber + texto `warning.ink`.
   - **Default**: borde neutral 300. **Disabled**: opacidad + bg neutral 50.
6. **Color nunca solo (WCAG 1.4.1).** Todo estado lleva **icono + texto** además del color. No se distingue por color únicamente (daltonismo).
7. **Botón destructivo** = `error.fill` bg + hover `error.ink`. **Botón marca** = outline `green-canon`.

### E. Dual-mode (dark = darkSemi charcoal)

- Surface charcoal de referencia `#25293C` (= darkSemi). Paper `#2F3349`.
- Cada rol usa su **`dark-fg`** como único acento (texto/icono/borde de chip outlined), ≥4.5:1 sobre charcoal.
- En dark, las alertas usan bg sutil (`rgba(255,255,255,0.04)`) + borde `dark-fg` (no el `tint` claro de light).
- `border`/`dark-fg` sostienen la separación bajo `forced-colors` (el navegador elimina box-shadow y backgrounds).

### F. Decisión clave 1 — reconciliación con AXIS upstream — ✅ RESUELTO (operador 2026-06-08): (A) Figma upstream, después

> **RESUELTO:** se elige **(A) reconciliar AXIS Figma upstream**. El código va **code-first** (dirección D ya en `axis-tokens.ts`) y el operador sincroniza el AXIS Figma maestro **después**; divergencia temporal gobernada y documentada en el header del SoT. Destino durable: runtime ≡ Figma.

La propuesta **cambia los valores semánticos respecto del AXIS runtime actual** (`success #28c76f` → `#157F47`; `error #ff4c51` → `#DC2E39`; `info #00bad1` → `#1F6FD4`; `warning #ffb703` se mantiene). AXIS (Figma `yyMksCoijfMaIoYplXKZaR`) es el SoT. Dos caminos canónicos (elegir antes de tokenizar):

- **(A) Reconciliar upstream (preferido):** actualizar el AXIS semantic en Figma a la dirección D (code→design / design→code coordinado), de modo que `axis-tokens.ts` siga siendo espejo 1:1 de AXIS. Mantiene la invariante "runtime ≡ AXIS".
- **(B) Override Greenhouse gobernado:** los semánticos de feedback divergen de AXIS Figma y viven como capa Greenhouse documentada (como el gap success-ink que ya diverge). Menos limpio; rompe el 1:1 con AXIS.

**Recomendación:** (A). Registrar la decisión en el ADR + DECISIONS_INDEX.

### G. Decisión clave 2 — verdes — ✅ RESUELTO (Restraint v1, 2026-06-08): 2 verdes (olivo eliminado)

> **RESUELTO:** Restraint **elimina el olivo `#3E7A12`**. Quedan **2 verdes** hue-distintos y de rol distinto: **green de marca** (lime `#6EC207` pop + ink crisp `#4B8405`) y **success emerald `#157F47`** (feedback). El brand-lime también es serie de chart. Aplicar el check de distinción verde-marca vs success al implementar.

Coexisten tres verdes, **a propósito** (principio AXIS decopla marca de feedback):

- `green-canon #3E7A12` (olivo) — verde de trabajo de marca.
- `green-vivid #6EC207` (lima) — pop de marca.
- `success #157F47` (emerald) — feedback semántico.

Son hue-distintos y en contextos distintos (marca = identidad/sparkles; success = check/validado). Es defendible. **Confirmar conscientemente** antes de tokenizar (es lo único que un revisor podría cuestionar).

### H. Detalle de tokenización (cuando haya GO)

1. **AXIS layer:** agregar ramps semánticos (B) a `axis-tokens.ts` + roles de 6 valores a `axis-semantic.ts` (`fill`/`onFill`/`ink`/`tint`/`border`/`darkFg` por rol). Reconciliar steps oscuros con AXIS upstream (decisión F).
2. **mergedTheme.ts:** derivar `theme.palette.{info,success,warning,error}.{main,contrastText,light,dark}` desde la capa AXIS. Exponer `ink`/`tint`/`border`/`dark-fg` — evaluar `theme.palette.<role>.{light=tint, dark=dark-fg}` + un namespace `theme.greenhouseSemantic.<role>.{ink,tint,border,darkFg}` si MUI no alcanza (mismo patrón que `theme.greenhouseElevation` de TASK-1049). Cero `fontSize`/hex hardcodeado.
3. **DESIGN.md §Color** + **V1 §Color**: documentar los 6 valores por rol + los 7 patrones de aplicación (D) + dual-mode (E). 3-capas en el mismo PR.
4. **Drift-guard test** (`semantic-color-drift.test.ts`): runtime ≡ SoT ≡ DESIGN.md (espejo de `typography-drift.test.ts` / `elevation-drift.test.ts`).
5. **Gate de contraste CI** (light + darkSemi): cada `ink` ≥4.5 sobre blanco y su tint; cada `onFill` ≥4.5 (o ≥3 large) sobre `fill`; cada `dark-fg` ≥4.5 sobre charcoal. Reemplaza el parche `#2E7D32` → cierra el gap success-ink de TASK-1048.
6. **Página viva** `/admin/design-system/colors` (existente, TASK-1034): NO restructurar — los valores se actualizan solos (vienen de `theme.axis.*`). Agregar una **sección de ejemplos de implementación** con tokens canónicos (tonal/dot/sólido/KPI/form). Scenario GVC desktop/mobile. (Solo crear sub-página si la sección no cabe.)
7. **Migración de consumidores:** los ~8 sitios de `#2E7D32` + cualquier hex semántico residual → tokens. Promover `greenhouse/no-hardcoded-hex-color` a `error` con baseline 0 (coordinar con TASK-1048).

## Design Review — gaps a considerar (skills product-design, 2026-06-07)

Auditoría con `design-system-governance` + `a11y-architect` + `modern-ui`. Verificados contra código donde aplica. **NINGUNO cambia la dirección visual D — son condiciones para que la paleta se APLIQUE bien.**

**🔴 Críticos — afectan Fase A (corregir antes de codear):**

1. **El primary NO sale de `axisRamp.primary` — sale de `settings.primaryColor` / `primaryColorConfig.ts`.** `mergedTheme.ts:59` lo confirma: *"primary is set by the provider via settings.primaryColor"*. Cambiar el ramp AXIS **NO mueve el botón primario**. Para llevar el primary a `#024C8F` hay que cambiar el **default de `primaryColorConfig`** (o la definición `efeonce-core`), NO `axisRamp.primary`. ⚠️ Corrige el lever de la fila "Primary" del DELTA.
2. **Regenerar los tokens de opacidad / state-layers (`axisOpacity`, `src/@core/theme/axis-tokens.ts:131`).** Existen ramps `{8,16,24,32,38}%` por familia (`#0375db14`…) que alimentan hover/selected/focus/`::selection`. Si cambia un anchor, **hay que regenerar su `axisOpacity` en el mismo PR** o los estados hover/selected quedan con el color viejo.
3. **Dark mode necesita derivación propia, no solo `dark-fg`.** En dark el `tint` no es el tint claro (es `rgba(255,255,255,0.04)` + borde `dark-fg`) y `main/light/dark` por rol se derivan distinto. Especificar la derivación dark de los 6 sub-valores (el mockup ya muestra el target en su DarkShowcase).

**🟡 Importantes — checklist de Discovery:**

4. **Crowding de hues:** 3 azules (`navy #023C70` · `action #024C8F` · `info #1F6FD4`) + 3 verdes (canon/vivid/success). Auditar distinción para que un chip `info` no se lea como acción primaria. Si no se distinguen, nudge menor de un hue (NO rediseño).
5. **El patrón `dot` debe respetar "color nunca solo":** un dot success(verde)/error(rojo) sin texto/ícono adyacente es indistinguible en deuteranopia. El dot siempre va con label o ícono.
6. **Falta la paleta categórica / de series de charts** (serie 1..N), distinta de los semánticos. Coordinar con `dataviz-design`. (Puede quedar fuera de scope, pero hay que declararlo.)
7. **Reconciliación `GH_COLORS`:** `semaphore` + `service` + capability palettes legacy coexisten con el spine; decidir si se reconcilian o quedan como dominio aparte.

**🟢 Menor:**

8. **Focus ring explícito:** con el primary más oscuro, el ring (action blue) debe dar ≥3:1 contra ambos lados (WCAG 2.4.11/2.4.13); declararlo en el contrast gate específicamente para foco.

## Rollout Plan & Risk Matrix

### Recommended execution path (decisión operador 2026-06-07: "lo más robusto y escalable")

**Recomendación canónica: por fases — Paso 0 (foundation) → Fase A (re-value) → Fase B (patrones). NO todo junto.** Razones (robusto + escalable, Solution Quality Contract):

- **Cada paso se verifica y revierte solo.** Si aparece una regresión visual, sabés si fue el cambio de valores (A) o el de comportamiento de componentes (B). Un PR gigante A+B mezcla las dos cosas → diagnóstico imposible.
- **A es mecánico** (propaga por tokens a todos los consumidores) → bajo riesgo, rápido, blast radius gobernado en un solo lugar (el SoT + primaryColorConfig + axisOpacity).
- **B es escalable por diseño:** el tonal-by-default se hace en UN lugar (el override de `<Chip>`/`<Alert>` del theme) y vuelve tonales TODOS los chips de la app de una — no se toca chip por chip.
- **El estado intermedio (post-A, pre-B) NO está roto:** es coherente y usable (colores nuevos + chips sólidos con color nuevo). Solo no es el tratamiento tonal final. Ningún usuario queda con UI rota.
- **Foundation primero (Paso 0):** resolver los 3 gaps críticos + las decisiones (lever del primary = `primaryColorConfig`; reconciliación AXIS; 3-verdes). Sin esto, A se codea sobre el lever equivocado.

**Sub-recomendaciones de las decisiones gated:**

- **Reconciliación AXIS (gap F):** opción **(A) actualizar AXIS Figma upstream** — mantiene AXIS como única fuente de verdad, runtime ≡ Figma, sin divergencia. Es lo más escalable a largo plazo (la opción B override genera drift permanente).
- **3 verdes (gap G):** mantener el decoplado marca/feedback (es el patrón escalable: la marca evoluciona sin tocar el feedback) — pero aplicar el check de distinción del gap #4.
- **Resultado:** A+B completas = idéntico al mockup aprobado. La única variación posible es un nudge mínimo de un hue si el gap #4 detecta dos demasiado parecidos.

### Slice ordering hard rule

**Insight de scope (operador 2026-06-07):** el codebase ya está token-anclado (la lint `no-hardcoded-hex-color` bajó el hardcode a 9 warnings residuales). Por eso el grueso del overhaul es **mecánico**: cambiar los VALORES detrás de los nombres de token existentes en el SoT → se propaga solo a todos los consumidores vía `theme.*`. La task se parte en **A (re-value, mecánico)** + **B (patrones, toca componentes/overrides)** para que A pueda shippear rápido y B quede separable.

**Slice 0 — decisiones (gate):** mayormente resueltas (operador 2026-06-08, ver "Decisiones del operador"). Neutrales invariantes ✓ · F = (A) Figma upstream después ✓ · G = 3 verdes confirmados ✓ · emails + success-ink diferidos ✓ · one-offs 1048 foldeados ✓. **Queda 1 gate abierto: el token de acción `action` para CTA** (decisión 1) — requiere mini-exploración visual (mockup + GVC) antes de codear el brand spine (A1b). Falta: ADR `GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1` + DECISIONS_INDEX con estas decisiones.

**FASE A — re-value (mecánico, propaga vía tokens; el grueso). Partida en dos PRs para reversibilidad fina (refinamiento 2026-06-08):**

1. **Slice A1a — semánticos de feedback (PR 1, win claro + red puesta):** nuevos VALORES de `info`/`success`/`error` (+ `warning` invariante) en `axis-tokens.ts` + roles en `axis-semantic.ts` (los 4 ya AA con texto blanco; warning = texto oscuro). **En el MISMO PR, el guard mecánico:** `mergedTheme.ts` deriva `theme.palette.{info,success,warning,error}` + DESIGN.md §Color + V1 §Color (3-capas) + **`semantic-color-drift.test.ts` nuevo** + **contrast gate CI** (light + darkSemi). El stash actual es la semilla de este slice (re-value semántico + opacity + drift-test ya hecho) — falta DESIGN.md/V1 + el drift-guard + el contrast gate para que sea shippable. `pnpm design:lint` 0/0 · `pnpm test` · `pnpm build`. **Cero consumidores tocados** (heredan el hue vía theme).
2. **Slice A1b — brand spine (PR 2):** `secondary` ramp (corrige hue-shift a teal) + `green-canon` nuevo (aditivo) + `orange` formalizado en AXIS, con su DESIGN.md/V1/drift. **El anchor del primary queda FUERA de A1b** hasta resolver el token de acción (decisión 1 — gate abierto). **Verificar antes de mergear (gaps R5):** que `theme.palette.secondary` realmente derive de `axisRamp.secondary` (hoy `secondary` no está en `axisSemanticPalette`); y el comportamiento `lighten/darken` del Provider.
3. **Slice A2 — token de acción `action` (PR 3, gated por decisión 1):** introducir `action` desacoplado del primary + apuntar los CTA/foco a `action` (esto toca componentes/overrides — más cercano a Fase B que a re-value puro). Solo después de la mini-exploración visual.
4. **Slice A3 — verificación visual (red de seguridad, NO migración):** GVC de superficies clave (dashboard, formulario, nav, tablas, login) en light + darkSemi por cada PR. El contrast gate de A1a ya corre en CI.
5. ~~Slice A4 — lint a error + success-ink~~ **DIFERIDO** (decisión operador 2026-06-08): el retiro de `#2E7D32` y la promoción de `no-hardcoded-hex-color` a `error` baseline 0 quedan en TASK-1048/task separada. **Fase A NO promueve el lint a error.**

**FASE B — patrones de aplicación (separable; toca componentes/overrides):**

5. **Slice B1 — sub-valores:** agregar `ink`/`tint`/`border`/`dark-fg` por rol (nombres nuevos aditivos) a la capa AXIS + exponerlos (`theme.palette.<role>.{light=tint,dark=darkFg}` + namespace `theme.greenhouseSemantic` si hace falta, patrón `theme.greenhouseElevation`).
6. **Slice B2 — tonal-by-default + patrones:** override de componente del theme para que `<Chip>`/`<Alert>` de estado rindan **tonal** por default (no sólido) + dot variant + KPI delta inline + form states. Esto es lo único que toca componentes/overrides. GVC.
7. **Slice B3 — actualizar `/admin/design-system/colors` (NO restructurar):** la página existente (TASK-1034, renderiza los ramps AXIS live desde `theme.axis.*`). **Decisión operador 2026-06-07: NO cambiar su estructura — solo se actualizan sus VALORES (lo hace solo, al venir de los tokens) + AGREGAR una sección de ejemplos de implementación** (tonal · dot · sólido-excepción · KPI delta inline · form states) usando **tokens canónicos** (`theme.palette.*`/`theme.axis.*`, NUNCA hex inline). GVC desktop/mobile. No crear `/admin/design-system/colors` aparte salvo que la sección de ejemplos no quepa — preferir extender la página existente.

> **Nota de naming (anti-malentendido):** tokenizar = mantener los NOMBRES de token y cambiar sus VALORES. Los hex de esta spec son los valores propuestos, NO van inline al código (design-system-governance: nunca hex en JSX). Los únicos nombres NUEVOS son `green-canon` y los 6 sub-valores semánticos — aditivos, no reemplazan nada. Ningún token existente se renombra.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| **Cambio del anchor del primary** (`#0375db → #024C8F`) | UI global (TODO botón/link/acento) | **Alta** (blast radius máximo) | GVC de superficies clave (dashboards, formularios, nav, tablas) light+darkSemi antes de merge; cutover atómico; decisión explícita del operador | revisión visual amplia + contrast probe |
| Re-ramp de spine/secondary/orange rompe algún tono derivado | UI global | Media | el theme deriva de los ramps nuevos; GVC + revisar componentes que usan steps intermedios (hover/active) | GVC, `pnpm design:lint` |
| Cambio de hue runtime rompe contraste en alguna superficie | UI global | Media | gate de contraste CI light+darkSemi + GVC de superficies clave antes de merge | `pnpm design:lint`, contrast probe |
| Divergencia AXIS (Figma) vs runtime | design-system | Alta si se elige (B) | preferir (A) reconciliación upstream; si (B), documentar override en ADR | drift-guard 3-capas |
| Regresión visual en PDFs/Excel (`#2E7D32` → token) | finance docs | Media | adapter por medio (SSOT semántico + render por medio); snapshot before/after de un PDF real | revisión visual PDF |
| Romper paridad 3-capas | governance | Media | drift-guard test obligatorio + `pnpm design:lint` en CI | design-contract gate |
| 3 verdes confunden marca vs feedback | UX | Baja | confirmación consciente (G) + contextos/iconos distintos | revisión operador |

### Feature flags / cutover

- No requiere flag runtime: es un cambio de valores de theme gobernado por las 3 capas. El cutover es el merge del PR (con drift-guard + contrast gate verdes).
- Cutover atómico: AXIS + mergedTheme + DESIGN.md + V1 + drift-guard en el mismo PR (paridad). Página viva + migración de consumidores pueden ir en PR siguiente.

### Rollback plan per slice

| Slice | Rollback | Reversible? |
|---|---|---|
| 0 decisiones | revert ADR | sí |
| 1 AXIS layer | revert PR | sí (additivo) |
| 2 runtime | revert PR + redeploy | sí (cambio de theme) |
| 3 contrato | revert PR | sí |
| 4 página viva | revert PR | sí (additivo) |
| 5 migración + lint error | revert rule a `warn` + revert consumidores | sí |

### Production verification sequence

- `pnpm design:lint` 0/0 · `pnpm test` (drift-guard verde) · `pnpm build`.
- GVC de `/admin/design-system/colors` + superficies clave (un dashboard con KPIs, un formulario, una tabla con estados) en light + darkSemi.
- Snapshot before/after de un PDF/Excel que usaba `#2E7D32`.

### Out-of-band coordination required

- **Figma AXIS** (si decisión A): actualizar el semantic en el archivo maestro `yyMksCoijfMaIoYplXKZaR` para mantener el 1:1.
- **TASK-1034** (AXIS adoption en progreso) y **TASK-1048** (success-ink gap): coordinar para no pisarse. Esta task subsume el success-ink; TASK-1048 conserva chart pos/neg + tag-blue surface one-offs (o se foldean aquí — decidir en Slice 0).

## Out of Scope

- **Neutrales / gray** — INVARIANTE (decisión operador 2026-06-07): quedan exactamente como hoy (`axisRamp.gray` + customColors neutrales). El slate del mockup NO se adopta. La task no toca ningún token neutral.
- **Emails** — DIFERIDOS (decisión operador 2026-06-08): paleta propia aislada del SoT (`src/emails/constants.ts`); task separada futura. No se tocan aquí.
- **Verde finanzas `#2E7D32` (success-ink) + lint a `error` baseline 0** — DIFERIDOS (decisión operador 2026-06-08): quedan en TASK-1048/task separada. Esta task no retira el parche ni migra sus ~8 sitios.
- **Oscurecer el anchor del primary** (`#0375db → #024c8f`) — EN PAUSA (decisión operador 2026-06-08): pendiente resolver el token de acción `action` para los CTA (decisión 1). El reorder de `primaryColorConfig` del stash queda en pausa hasta esa resolución.
- Las **opciones** alternativas de `primaryColorConfig` (`efeonce-core/royal/azure/lime/sunset/crimson`) como selector de usuario — se conservan.
- Multi-brand por tenant (V1.5, no aquí).
- Tipografía / spacing / elevation (otras capas, otras tasks).
- Cambiar el patrón de foco (foco = token de acción).

**En scope (foldeado por decisión operador 2026-06-08):** charts cashflow positive/negative (`#3DBA5D`/`#FF4D49`) + tag-blue surface (`#eaf3fc`) — los one-offs categóricos sueltos de TASK-1048 **entran en esta task** (tokenizar como paleta categórica, no como semánticos de feedback).

## Acceptance Criteria

- [ ] Decisiones F (reconciliación AXIS) y G (3 verdes) confirmadas por el operador + registradas en ADR/DECISIONS_INDEX.
- [ ] Los 4 roles exponen los 6 valores (`fill`/`onFill`/`ink`/`tint`/`border`/`dark-fg`) desde la capa AXIS, consumibles vía `theme.palette`/`theme.greenhouseSemantic`.
- [ ] Cada `ink` ≥4.5:1 sobre blanco y sobre su `tint`; cada `onFill` ≥4.5:1 (o ≥3 large) sobre `fill`; cada `dark-fg` ≥4.5:1 sobre charcoal — verificado por el gate de contraste en light + darkSemi.
- [ ] Warning mantiene texto oscuro sobre amber (nunca blanco).
- [ ] Los 7 patrones de aplicación (tonal/dot/sólido-excepción/KPI inline/form states/foco-acción/color-nunca-solo) documentados en DESIGN.md §Color + V1 §Color.
- [ ] Paridad 3-capas verificada por drift-guard; `pnpm design:lint` 0/0.
- [ ] ~~`#2E7D32` reemplazado + lint a `error` baseline 0~~ **DIFERIDO** a TASK-1048/task separada (decisión operador 2026-06-08).
- [ ] Existe `semantic-color-drift.test.ts` (runtime ≡ SoT ≡ DESIGN.md §Color) + contrast gate en CI (light + darkSemi) — el color queda con guard mecánico como typography/elevation.
- [ ] Los one-offs categóricos de TASK-1048 (chart pos/neg + tag-blue surface) tokenizados como paleta categórica.
- [ ] `/admin/design-system/colors` (existente): estructura SIN cambios, valores actualizados (vía tokens), + sección de ejemplos de implementación con tokens canónicos (no hex). GVC desktop/mobile.
- [ ] `pnpm test` + `pnpm build` verdes.

## Verification

- `pnpm design:lint` (3-capas + no-hardcoded-hex).
- `pnpm test` (drift-guard `semantic-color-drift.test.ts` + contrast gate).
- `pnpm build` (Turbopack).
- GVC: `/admin/design-system/colors` + dashboard/form/tabla en light + darkSemi.
- PDF/Excel before/after del consumidor de `#2E7D32`.

## Closing Protocol

- Mover `to-do/` → `in-progress/` al iniciar; `in-progress/` → `complete/` al cerrar (carpeta ≡ Lifecycle).
- Actualizar `docs/tasks/README.md`, `Handoff.md`, `changelog.md`.
- ADR `GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1` (Accepted) + DECISIONS_INDEX.
- Chequeo de impacto cruzado: actualizar TASK-1048 (Delta: success-ink subsumido) + TASK-1034 (Delta: semánticos reconciliados).
- `greenhouse-documentation-governor` + `pnpm docs:closure-check`.

## Follow-ups

- Charts pos/neg + tag-blue surface (TASK-1048) si no se foldean aquí.
- Migrar adapters PDF/email a los tokens semánticos (si aplica al SSOT por medio).
- Alinear la "Contrapropuesta D" del mockup `brand-color-proposal` con estos valores finales (o retirar el mockup tras tokenizar).

## Open Questions

- **🔴 ABIERTA — Token de acción para CTA:** ¿los CTA usan un token `action` dedicado (desacoplado de `theme.palette.primary`) en vez de cambiar el primary de marca? (decisión 1, operador 2026-06-08). Define si el primary de marca se queda en `#0375db` o cambia, y cómo se modela `action` (¿palette custom + override de `<Button>` para CTA? ¿foco = `action`?). **Es el único gate que falta** — requiere mini-exploración visual (mockup + GVC) antes de codear el spine. La columna "Primary" del DELTA queda en pausa hasta esto.
- ~~Anchor del primary~~ **EN PAUSA (2026-06-08):** subsumida en la pregunta del token de acción de arriba.
- ~~Neutrales~~ **RESUELTO (2026-06-07):** invariantes — quedan exactamente como hoy (`axisRamp.gray`), el slate NO se adopta.
- ~~F — reconciliación AXIS~~ **RESUELTO (2026-06-08):** (A) actualizar AXIS Figma upstream; el operador lo sincroniza después (code-first temporal).
- ~~G — 3 verdes~~ **RESUELTO (2026-06-08):** confirmados — conviven a propósito.
- ~~`#2E7D32` success-ink~~ **RESUELTO (2026-06-08):** DIFERIDO a TASK-1048/task separada.
- ~~Foldear one-offs de TASK-1048~~ **RESUELTO (2026-06-08):** sí, los one-offs categóricos sueltos (chart pos/neg + tag-blue) se foldean acá.
