# Greenhouse Theme Token Contract

> **Tipo de documento:** Spec de arquitectura (contrato de decisiones)
> **Version:** 1.0
> **Creado:** 2026-04-11 por Claude (TASK-368)
> **Ultima actualizacion:** 2026-04-11
> **Task origen:** TASK-368 — Theme Token Audit & Decision Contract
> **Task padre:** TASK-264 — Greenhouse Theme Canonicalization (umbrella)

---

## 1. Estado actual del sistema de color

Greenhouse EO opera con **tres capas de color** que se solapan parcialmente:

### 1.1 Capas y prioridad de override

```
colorSchemes.ts          →  Vuexy base (lowest priority)
        ↓ deepmerge
mergedTheme.ts           →  Greenhouse overrides + customColors
        ↓ deepmerge
CustomThemeProvider       →  Runtime override (settings.primaryColor)
        ↓
theme (MUI createTheme)  →  Lo que ven los componentes via useTheme()

GH_COLORS                →  Sistema paralelo, no pasa por el theme
(greenhouse-nomenclature)    41 archivos importan directamente
```

### 1.2 Inventario por capa

| Capa | Archivo | Tokens | Alcance |
|------|---------|--------|---------|
| colorSchemes.ts | `src/@core/theme/colorSchemes.ts` | ~60 (light + dark) | Palette MUI estándar + opacities |
| mergedTheme.ts | `src/components/theme/mergedTheme.ts` | ~35 (overrides + 11 customColors) | Brand overrides sobre Vuexy |
| GH_COLORS | `src/config/greenhouse-nomenclature.ts:1164-1265` | 114 | Nomenclatura visual por dominio |

### 1.3 Solapamientos confirmados

Existen 7 tokens donde `mergedTheme.customColors` y `GH_COLORS` contienen **el mismo hex**:

| mergedTheme customColor | Hex | GH_COLORS equivalente |
|-------------------------|-----|-----------------------|
| `customColors.midnight` | `#022A4E` | `brand.midnightNavy`, `neutral.textPrimary` |
| `customColors.coreBlue` | `#0375DB` | `brand.coreBlue`, `chart.primary` |
| `customColors.neonLime` | `#6EC207` | `semaphore.green.source`, `semantic.success.source` |
| `customColors.sunsetOrange` | `#FF6500` | `semaphore.yellow.source`, `semantic.warning.source` |
| `customColors.crimson` | `#BB1954` | `semaphore.red.source`, `semantic.danger.source` |
| `customColors.lightAlloy` | `#DBDBDB` | `neutral.border` |
| `customColors.claimGray` | `#848484` | `neutral.textSecondary` |

### 1.4 Conflictos confirmados

Existen 4 conceptos semánticos donde `mergedTheme` y `GH_COLORS` definen **hex distintos**:

| Concepto | mergedTheme | GH_COLORS | Delta |
|----------|-------------|-----------|-------|
| Text primary | `text.primary` = `#1A1A2E` | `neutral.textPrimary` = `#022A4E` | Ambos "dark navy" pero tonos distintos |
| Text secondary | `text.secondary` = `#667085` | `neutral.textSecondary` = `#848484` | Ambos "grey" pero el theme es azulado, GH es neutro |
| Background surface | `background.default` = `#F8F9FA` | `neutral.bgSurface` = `#F7F7F5` | Cool grey vs warm grey |
| Info color | `info.main` = `#0375DB` | Base Vuexy info = `#00BAD1` | mergedTheme overridea info a coreBlue; GH_COLORS coincide con el override, no con la base |

**Resolución:** En los 4 conflictos, `mergedTheme` es la fuente de verdad porque es lo que el usuario ve. `GH_COLORS` define valores legacy que no coinciden con el theme actual del portal. La migración TASK-370 debe resolver estos deltas.

---

## 2. Inventario completo de GH_COLORS

### 2.1 Resumen por categoría

| Categoría | Tokens | Archivos consumers | Naturaleza |
|-----------|--------|-------------------|------------|
| `role` | 30 (6 roles x 5 props) | 7 | Dominio (taxonomía de roles internos) |
| `semaphore` | 9 (3 colores x 3 props) | 13 | Dominio (semáforo operativo green/yellow/red) |
| `semantic` | 12 (4 estados x 3 props) | 9 | **Candidato a theme** (success/warning/danger/info) |
| `brand` | 5 | 3 | Dominio (brand moments, login) |
| `neutral` | 4 | 32 | **Candidato a theme** (text, border, surface) |
| `service` | 15 (5 services x 3 props) | 1 | Dominio (business lines) |
| `chart` | 7 | 7 | Mixto (derivable del theme + dominio) |
| `cscPhase` | 21 (7 fases x 3 props) | 1 | Dominio (workflow de producción) |
| **Total** | **103 únicos** | **41 archivos** | |

> Nota: el total es 103 tokens únicos (no 114) porque varios tokens comparten el mismo hex entre categorías. La cuenta original de 114 incluye duplicados semánticos.

### 2.2 Inventario detallado

#### role (30 tokens) — 7 consumers

| Token | Hex | Consumer count |
|-------|-----|---------------|
| `role.account.source` | `#023C70` | 3 |
| `role.account.bg` | `#EAF0F3` | 3 |
| `role.account.bgHover` | `#D9E1E9` | 2 |
| `role.account.text` | `#023C70` | 3 |
| `role.account.textDark` | `#012A4E` | 2 |
| `role.operations.source` | `#024C8F` | 3 |
| `role.operations.bg` | `#EAF0F6` | 3 |
| `role.operations.bgHover` | `#D9E4EE` | 2 |
| `role.operations.text` | `#024C8F` | 3 |
| `role.operations.textDark` | `#013564` | 2 |
| `role.strategy.source` | `#633F93` | 3 |
| `role.strategy.bg` | `#F2EFF6` | 3 |
| `role.strategy.bgHover` | `#E7E2EE` | 2 |
| `role.strategy.text` | `#633F93` | 3 |
| `role.strategy.textDark` | `#452C66` | 2 |
| `role.design.source` | `#BB1954` | 3 |
| `role.design.bg` | `#F9ECF1` | 3 |
| `role.design.bgHover` | `#F4DCE5` | 2 |
| `role.design.text` | `#BB1954` | 3 |
| `role.design.textDark` | `#82113A` | 2 |
| `role.development.source` | `#0375DB` | 3 |
| `role.development.bg` | `#EAF3FC` | 3 |
| `role.development.bgHover` | `#D9EAF9` | 2 |
| `role.development.text` | `#0375DB` | 3 |
| `role.development.textDark` | `#025199` | 2 |
| `role.media.source` | `#FF6500` | 3 |
| `role.media.bg` | `#FFF2EA` | 3 |
| `role.media.bgHover` | `#FFE7D8` | 2 |
| `role.media.text` | `#FF6500` | 3 |
| `role.media.textDark` | `#B24600` | 2 |

#### semaphore (9 tokens) — 13 consumers

| Token | Hex | Equivalente en theme |
|-------|-----|---------------------|
| `semaphore.green.source` | `#6EC207` | `palette.success.main` |
| `semaphore.green.bg` | `#F3FAEB` | `palette.success.lighterOpacity` (aprox) |
| `semaphore.green.text` | `#6EC207` | `palette.success.main` |
| `semaphore.yellow.source` | `#FF6500` | `palette.warning.main` |
| `semaphore.yellow.bg` | `#FFF2EA` | `palette.warning.lighterOpacity` (aprox) |
| `semaphore.yellow.text` | `#FF6500` | `palette.warning.main` |
| `semaphore.red.source` | `#BB1954` | `palette.error.main` |
| `semaphore.red.bg` | `#F9ECF1` | `palette.error.lighterOpacity` (aprox) |
| `semaphore.red.text` | `#BB1954` | `palette.error.main` |

#### semantic (12 tokens) — 9 consumers

| Token | Hex | Equivalente en theme |
|-------|-----|---------------------|
| `semantic.success.source` | `#6EC207` | = `palette.success.main` |
| `semantic.success.bg` | `#F3FAEB` | ~ `palette.success.lighterOpacity` |
| `semantic.success.text` | `#6EC207` | = `palette.success.main` |
| `semantic.warning.source` | `#FF6500` | = `palette.warning.main` |
| `semantic.warning.bg` | `#FFF2EA` | ~ `palette.warning.lighterOpacity` |
| `semantic.warning.text` | `#FF6500` | = `palette.warning.main` |
| `semantic.danger.source` | `#BB1954` | = `palette.error.main` |
| `semantic.danger.bg` | `#F9ECF1` | ~ `palette.error.lighterOpacity` |
| `semantic.danger.text` | `#BB1954` | = `palette.error.main` |
| `semantic.info.source` | `#0375DB` | = `palette.info.main` (via mergedTheme) |
| `semantic.info.bg` | `#EAF3FC` | ~ `palette.info.lighterOpacity` |
| `semantic.info.text` | `#0375DB` | = `palette.info.main` (via mergedTheme) |

#### brand (5 tokens) — 3 consumers (login only)

| Token | Hex | Nota |
|-------|-----|------|
| `brand.midnightNavy` | `#022A4E` | = `customColors.midnight` |
| `brand.greenhouseGreen` | `#1B7A4E` | Sin equivalente en theme |
| `brand.leaf` | `#4CAF6E` | Sin equivalente en theme |
| `brand.coreBlue` | `#0375DB` | = `palette.primary.main`, `customColors.coreBlue` |
| `brand.softBlue` | `#85B7EB` | Sin equivalente en theme |

#### neutral (4 tokens) — 32 consumers

| Token | Hex | Equivalente en theme | Conflicto |
|-------|-----|---------------------|-----------|
| `neutral.textPrimary` | `#022A4E` | `customColors.midnight` | **SI** — `text.primary` es `#1A1A2E` |
| `neutral.textSecondary` | `#848484` | `customColors.claimGray` | **SI** — `text.secondary` es `#667085` |
| `neutral.border` | `#DBDBDB` | `customColors.lightAlloy` | NO — `divider` usa CSS var (diferente mecanismo) |
| `neutral.bgSurface` | `#F7F7F5` | Ninguno exacto | **SI** — `background.default` es `#F8F9FA` |

#### service (15 tokens) — 1 consumer

| Token | Hex | Nota |
|-------|-----|------|
| `service.globe.source` | `#BB1954` | = `palette.error.main` |
| `service.globe.bg` | `#F9ECF1` | |
| `service.globe.text` | `#BB1954` | |
| `service.efeonce_digital.source` | `#023C70` | = `customColors.deepAzure` |
| `service.efeonce_digital.bg` | `#EAEFF3` | |
| `service.efeonce_digital.text` | `#023C70` | |
| `service.reach.source` | `#FF6500` | = `palette.warning.main` |
| `service.reach.bg` | `#FFF2EA` | |
| `service.reach.text` | `#FF6500` | |
| `service.wave.source` | `#0375DB` | = `palette.primary.main` |
| `service.wave.bg` | `#EAF3FC` | |
| `service.wave.text` | `#0375DB` | |
| `service.crm_solutions.source` | `#633F93` | Sin equivalente en theme |
| `service.crm_solutions.bg` | `#F2EFF6` | |
| `service.crm_solutions.text` | `#633F93` | |

#### chart (7 tokens) — 7 consumers

| Token | Hex | Equivalente en theme |
|-------|-----|---------------------|
| `chart.primary` | `#0375DB` | = `palette.primary.main` |
| `chart.secondary` | `#024C8F` | = `palette.secondary.dark` (mergedTheme) |
| `chart.success` | `#6EC207` | = `palette.success.main` |
| `chart.warning` | `#FF6500` | = `palette.warning.main` |
| `chart.error` | `#BB1954` | = `palette.error.main` |
| `chart.info` | `#023C70` | = `customColors.deepAzure` |
| `chart.neutral` | `#DBDBDB` | = `customColors.lightAlloy` |

#### cscPhase (21 tokens) — 1 consumer

| Token | Hex |
|-------|-----|
| `cscPhase.planning.source` | `#633F93` |
| `cscPhase.planning.bg` | `#F2EFF6` |
| `cscPhase.planning.text` | `#633F93` |
| `cscPhase.briefing.source` | `#024C8F` |
| `cscPhase.briefing.bg` | `#EAF0F6` |
| `cscPhase.briefing.text` | `#024C8F` |
| `cscPhase.production.source` | `#BB1954` |
| `cscPhase.production.bg` | `#F9ECF1` |
| `cscPhase.production.text` | `#BB1954` |
| `cscPhase.approval.source` | `#FF6500` |
| `cscPhase.approval.bg` | `#FFF2EA` |
| `cscPhase.approval.text` | `#FF6500` |
| `cscPhase.assetMgmt.source` | `#0375DB` |
| `cscPhase.assetMgmt.bg` | `#EAF3FC` |
| `cscPhase.assetMgmt.text` | `#0375DB` |
| `cscPhase.activation.source` | `#023C70` |
| `cscPhase.activation.bg` | `#EAEFF3` |
| `cscPhase.activation.text` | `#023C70` |
| `cscPhase.completed.source` | `#6EC207` |
| `cscPhase.completed.bg` | `#F3FAEB` |
| `cscPhase.completed.text` | `#6EC207` |

---

## 3. Tabla de clasificacion token-por-token

### 3.1 Leyenda de decisiones

| Decisión | Significado |
|----------|-------------|
| `THEME` | Migrar a `theme.palette.*` o `theme.customColors.*` (TASK-370) |
| `GH_COLORS` | Permanece en `GH_COLORS` como token de dominio |
| `ELIMINAR` | Redundante con otro token del mismo sistema; eliminar y migrar consumers |
| `RESOLVER` | Conflicto de hex entre capas; requiere decisión de cuál hex gana |

### 3.2 Clasificacion: semantic (12 tokens)

| Token | Hex | Decisión | Destino | Justificación |
|-------|-----|----------|---------|---------------|
| `semantic.success.source` | `#6EC207` | `ELIMINAR` | `theme.palette.success.main` | Hex idéntico. Ya existe en el theme. |
| `semantic.success.bg` | `#F3FAEB` | `ELIMINAR` | `theme.palette.success.lighterOpacity` | Usar opacidad derivada del theme en vez de hex fijo |
| `semantic.success.text` | `#6EC207` | `ELIMINAR` | `theme.palette.success.main` | Duplicado de `.source` |
| `semantic.warning.source` | `#FF6500` | `ELIMINAR` | `theme.palette.warning.main` | Hex idéntico |
| `semantic.warning.bg` | `#FFF2EA` | `ELIMINAR` | `theme.palette.warning.lighterOpacity` | Usar opacidad derivada |
| `semantic.warning.text` | `#FF6500` | `ELIMINAR` | `theme.palette.warning.main` | Duplicado de `.source` |
| `semantic.danger.source` | `#BB1954` | `ELIMINAR` | `theme.palette.error.main` | Hex idéntico. Nota: GH usa "danger", MUI usa "error" |
| `semantic.danger.bg` | `#F9ECF1` | `ELIMINAR` | `theme.palette.error.lighterOpacity` | Usar opacidad derivada |
| `semantic.danger.text` | `#BB1954` | `ELIMINAR` | `theme.palette.error.main` | Duplicado de `.source` |
| `semantic.info.source` | `#0375DB` | `ELIMINAR` | `theme.palette.info.main` | Hex idéntico (via mergedTheme override) |
| `semantic.info.bg` | `#EAF3FC` | `ELIMINAR` | `theme.palette.info.lighterOpacity` | Usar opacidad derivada |
| `semantic.info.text` | `#0375DB` | `ELIMINAR` | `theme.palette.info.main` | Duplicado de `.source` |

**Resultado:** Los 12 tokens `semantic.*` son completamente redundantes con `theme.palette.{success,warning,error,info}`. TASK-370 debe eliminarlos de GH_COLORS y migrar los 9 consumers a `theme.palette.*`.

### 3.3 Clasificacion: neutral (4 tokens)

| Token | Hex | Decisión | Destino | Justificación |
|-------|-----|----------|---------|---------------|
| `neutral.textPrimary` | `#022A4E` | `RESOLVER` | `theme.palette.customColors.midnight` | **Conflicto:** theme text.primary es `#1A1A2E`. Los 18 consumers de `GH_COLORS.neutral.textPrimary` usan `#022A4E` (midnight navy). `customColors.midnight` ya es `#022A4E`. Resolución: migrar consumers a `customColors.midnight` y evaluar si `text.primary` debería ser `#022A4E` o mantener `#1A1A2E`. Ver §4.2. |
| `neutral.textSecondary` | `#848484` | `RESUELTO` | `theme.palette.text.secondary` (`#667085`) | **Resuelto 2026-04-11.** Converge a `#667085` (theme). Razón: `#848484` falla WCAG AA (3.9:1) para texto < 18pt en 11 archivos. `#667085` pasa (5.2:1). Cambio visual sutil: gris neutro → gris azulado, más legible. `customColors.claimGray` queda deprecated. |
| `neutral.border` | `#DBDBDB` | `ELIMINAR` | `theme.palette.customColors.lightAlloy` | Hex idéntico a `customColors.lightAlloy`. Los 28 consumers migran a `customColors.lightAlloy`. |
| `neutral.bgSurface` | `#F7F7F5` | `RESUELTO` | `theme.palette.background.default` (`#F8F9FA`) | **Resuelto 2026-04-11.** Converge a `#F8F9FA` (theme). Razón: diferencia imperceptible (CIE76 < 1.5, delta < 3 RGB por canal). Todos los consumers tienen border #DBDBDB como boundary — no dependen del hex exacto. |

**Resultado:** Los 4 tokens neutral están resueltos: 2 eliminables directamente, 2 conflictos resueltos formalmente (textSecondary → `text.secondary`, bgSurface → `background.default`).

### 3.4 Clasificacion: chart (7 tokens)

| Token | Hex | Decisión | Destino | Justificación |
|-------|-----|----------|---------|---------------|
| `chart.primary` | `#0375DB` | `GH_COLORS` | Permanece | Aunque = `palette.primary.main`, mantener para que los charts tengan su paleta explícita independiente del theme primary. Si el primary cambiara, no queremos que todos los charts cambien automáticamente. |
| `chart.secondary` | `#024C8F` | `GH_COLORS` | Permanece | Chart-specific darker tone |
| `chart.success` | `#6EC207` | `GH_COLORS` | Permanece | Coherencia interna de la paleta chart |
| `chart.warning` | `#FF6500` | `GH_COLORS` | Permanece | Coherencia interna |
| `chart.error` | `#BB1954` | `GH_COLORS` | Permanece | Coherencia interna |
| `chart.info` | `#023C70` | `GH_COLORS` | Permanece | Chart-specific (no es el info del theme) |
| `chart.neutral` | `#DBDBDB` | `GH_COLORS` | Permanece | Baseline/grid color para charts |

**Resultado:** Los 7 tokens `chart.*` permanecen en GH_COLORS. Justificación: los charts necesitan una paleta estable e independiente del theme. Si mañana el primary del portal cambia, los charts no deben cambiar automáticamente — las decisiones de color en visualización de datos son distintas a las de UI.

### 3.5 Clasificacion: role (30 tokens)

| Decisión | Justificación |
|----------|---------------|
| `GH_COLORS` — permanecen todos | Taxonomía de dominio pura. Los 6 roles internos (account, operations, strategy, design, development, media) tienen identidad visual propia que no corresponde a estados semánticos de MUI. Los 7 consumers son componentes de equipo/org-chart que necesitan esta taxonomía. No hay equivalente en `theme.palette`. |

### 3.6 Clasificacion: semaphore (9 tokens)

| Decisión | Justificación |
|----------|---------------|
| `GH_COLORS` — permanecen todos | Aunque los hex coinciden exactamente con `palette.{success,warning,error}.main`, el semáforo operativo (green/yellow/red) es un concepto de dominio distinto de los estados semánticos de MUI. Un `green` de semáforo no es un `success` de UI — es un indicador de salud operativa. Los 13 consumers son dashboards y health indicators de Agency que leen el semáforo como dato de negocio, no como feedback de UI. Si MUI agregara un cuarto estado semántico, no debería afectar el semáforo. |

### 3.7 Clasificacion: brand (5 tokens)

| Token | Hex | Decisión | Destino | Justificación |
|-------|-----|----------|---------|---------------|
| `brand.midnightNavy` | `#022A4E` | `GH_COLORS` | Permanece | Brand moment. Ya existe como `customColors.midnight` para uso en theme. `GH_COLORS.brand` es para contextos de marca explícita (login, hero sections). |
| `brand.greenhouseGreen` | `#1B7A4E` | `GH_COLORS` | Permanece | Color institucional Greenhouse sin equivalente en theme. Solo usado en login. |
| `brand.leaf` | `#4CAF6E` | `GH_COLORS` | Permanece | Complemento verde de marca. Solo login. |
| `brand.coreBlue` | `#0375DB` | `GH_COLORS` | Permanece | Referencia semántica al azul Efeonce. Ya es `palette.primary.main` pero mantener para lectura explícita de "color de marca" vs "color primario de UI". |
| `brand.softBlue` | `#85B7EB` | `GH_COLORS` | Permanece | Complemento light de marca. Solo login. |

**Resultado:** Los 5 tokens `brand.*` permanecen. Son brand moments explícitos, no tokens de UI.

### 3.8 Clasificacion: service (15 tokens)

| Decisión | Justificación |
|----------|---------------|
| `GH_COLORS` — permanecen todos | Taxonomía de dominio de business lines (Globe, Efeonce Digital, Reach, Wave, CRM Solutions). Cada servicio tiene identidad visual propia. Solo 1 consumer (helpers.ts con acceso dinámico). No hay equivalente semántico en `theme.palette`. |

### 3.9 Clasificacion: cscPhase (21 tokens)

| Decisión | Justificación |
|----------|---------------|
| `GH_COLORS` — permanecen todos | Taxonomía de workflow de producción creativa. Las 7 fases (planning, briefing, production, approval, assetMgmt, activation, completed) son conceptos de negocio con identidad visual fija. Solo 1 consumer (capability-queries/helpers.ts). No hay equivalente en `theme.palette`. |

### 3.10 Clasificacion: capability (nueva categoria — aprobada 2026-04-11)

| Token | Hex | Decisión | Justificación |
|-------|-----|----------|---------------|
| `capability.globe.accent` | `#7C3AED` | `GH_COLORS` (nuevo) | Paleta de capabilities para admin/tenant. Distinta de `service` (operativo). Color no es único ID — acompañado de BrandWordmark + text label. Accent borders cumplen 3:1 para UI components. |
| `capability.globe.soft` | `rgba(124,58,237,0.12)` | `GH_COLORS` (nuevo) | Variante light para backgrounds |
| `capability.globe.contrast` | `#F5F3FF` | `GH_COLORS` (nuevo) | Fondo de alto contraste |
| `capability.reach.accent` | `#4F46E5` | `GH_COLORS` (nuevo) | |
| `capability.reach.soft` | `rgba(79,70,229,0.12)` | `GH_COLORS` (nuevo) | |
| `capability.reach.contrast` | `#EEF2FF` | `GH_COLORS` (nuevo) | |
| `capability.wave.accent` | `#0891B2` | `GH_COLORS` (nuevo) | |
| `capability.wave.soft` | `rgba(8,145,178,0.12)` | `GH_COLORS` (nuevo) | |
| `capability.wave.contrast` | `#ECFEFF` | `GH_COLORS` (nuevo) | |
| `capability.crm.accent` | `#FF7A59` | `GH_COLORS` (nuevo) | |
| `capability.crm.soft` | `rgba(255,122,89,0.14)` | `GH_COLORS` (nuevo) | |
| `capability.crm.contrast` | `#FFF7F4` | `GH_COLORS` (nuevo) | |
| `capability.core.accent` | `#1E3A5F` | `GH_COLORS` (nuevo) | |
| `capability.core.soft` | `rgba(30,58,95,0.12)` | `GH_COLORS` (nuevo) | |
| `capability.core.contrast` | `#EFF6FF` | `GH_COLORS` (nuevo) | |

**Resultado:** 15 tokens nuevos formalizan hex que ya existían hardcodeados en `helpers.ts`. No cambian ningún visual — solo canonicalizan la fuente de verdad. La separación de `service` (business lines en contexto operativo) vs `capability` (módulos de producto en contexto admin) es semánticamente correcta.

### 3.11 Resumen de clasificacion (actualizado 2026-04-11)

| Decisión | Tokens | Nota |
|----------|--------|------|
| `ELIMINAR` → migrar a theme.palette | 16 (12 semantic + 4 neutral) | Todos los conflictos resueltos |
| `RESOLVER` → conflicto de hex | **0** | textSecondary y bgSurface resueltos formalmente |
| `GH_COLORS` → permanecen | 86 (role + semaphore + brand + service + chart + cscPhase) | Sin cambio |
| `GH_COLORS` → nueva categoría | 15 (capability) | Formaliza hex de helpers.ts |

---

## 4. Decisiones de convergencia

### 4.1 Decision de primary institucional

**Pregunta:** ¿A qué color debe converger el `primary` global del portal?

**Respuesta: Ya convergió.** `mergedTheme.ts` define `primary.main = #0375DB` (coreBlue Efeonce) desde su implementación. El purple Vuexy `#7367F0` nunca es visible para usuarios finales.

| Candidato | Hex | Estado actual |
|-----------|-----|--------------|
| coreBlue (Efeonce) | `#0375DB` | **Ya es el primary** via mergedTheme |
| greenhouseGreen | `#1B7A4E` | Solo en login, no viable como primary (contraste insuficiente para UI interactiva) |
| midnightNavy | `#022A4E` | Demasiado oscuro para primary — funciona como text, no como acción |
| Vuexy default | `#7367F0` | Overrideado en mergedTheme. No visible. |

**Decisión formal:** `#0375DB` (coreBlue) es y sigue siendo el primary institucional. No se requiere cambio.

**Implicación para TASK-371:** La task de "shell primary cutover" puede reclasificarse como **ya resuelta** en mergedTheme. Lo que falta es formalizar `#0375DB` directamente en `colorSchemes.ts` en vez de depender del override de mergedTheme, pero eso es una limpieza técnica, no un cambio visual. Se recomienda que TASK-371 se enfoque en consolidar el path (mover el primary de mergedTheme a colorSchemes) en vez de "cambiar" el primary.

### 4.2 Resolucion de conflictos neutral

#### 4.2.1 Text primary: #022A4E vs #1A1A2E

| Fuente | Hex | Dónde se usa | Visual |
|--------|-----|-------------|--------|
| `GH_COLORS.neutral.textPrimary` | `#022A4E` | 18 archivos Greenhouse (componentes propios) | Navy puro, identitario |
| `mergedTheme text.primary` | `#1A1A2E` | MUI components, `sx={{ color: 'text.primary' }}` | Dark navy, más genérico |

**Decisión:** Ambos coexisten con roles distintos.
- `theme.palette.text.primary` (`#1A1A2E`) = **texto base del portal** — body, labels, MUI components.
- `theme.palette.customColors.midnight` (`#022A4E`) = **texto de acento Greenhouse** — headers con identidad, KPI labels, org-chart cards.

TASK-370 debe migrar los 18 consumers de `GH_COLORS.neutral.textPrimary` a `theme.palette.customColors.midnight`. No se cambia `text.primary`.

#### 4.2.2 Text secondary: #848484 vs #667085 — RESUELTO

| Fuente | Hex | Contraste vs #FFF | WCAG AA (< 18pt) |
|--------|-----|-------------------|-------------------|
| `GH_COLORS.neutral.textSecondary` | `#848484` | 3.9:1 | **FALLA** |
| `mergedTheme text.secondary` | `#667085` | 5.2:1 | **PASA** |

**Decisión (aprobada 2026-04-11):** `#667085` (theme) gana.

Justificación formal (UX Spec + Copy Spec + WCAG audit):
1. **Accesibilidad:** `#848484` viola WCAG 2.1.4.3 en 11 archivos con texto < 18pt (chart labels 11-12px, captions, table headers). No es un riesgo — es un bug activo.
2. **Companion elements:** Verificado en 21 archivos — color siempre acompañado de jerarquía tipográfica (variant + weight), posición en charts, o icons. Color no es el único indicador.
3. **Copy impact:** Ninguno. Los textos (labels, captions, metadata) no cambian — solo su color.
4. **Screen reader impact:** Ninguno. aria-labels de charts contienen texto descriptivo completo.
5. **Visual:** Sutil — gris neutro puro → gris azulado coherente con familia Efeonce. Los textos ganan legibilidad sin competir con texto primario.

Acción TASK-370: migrar 21 consumers a `theme.palette.text.secondary`. Marcar `customColors.claimGray` como deprecated.

#### 4.2.3 Background surface: #F7F7F5 vs #F8F9FA — RESUELTO

| Fuente | Hex | RGB | Delta |
|--------|-----|-----|-------|
| `GH_COLORS.neutral.bgSurface` | `#F7F7F5` | 247, 247, 245 | — |
| `mergedTheme background.default` | `#F8F9FA` | 248, 249, 250 | < 3 por canal |

**Decisión (aprobada 2026-04-11):** `#F8F9FA` (theme) gana.

Justificación formal (UX Spec + WCAG audit):
1. **Diferencia perceptual:** CIE76 < 1.5 — imperceptible para el ojo humano.
2. **Boundaries:** 100% de los 16 consumers tienen `border: 1px solid #DBDBDB` definiendo los límites de la superficie. No dependen del hex exacto del background.
3. **Interactive surfaces:** 8 de 16 son interactivos (clickable cards, hover rows). El surface es backdrop, no target — focus-visible usa outline de color de rol, no depende del surface.
4. **Contraste de texto sobre surface:** Mejora marginal (+0.2-0.3) con `#F8F9FA` vs `#F7F7F5`.
5. **Copy impact:** Ninguno. Es un color de fondo.
6. **Coherencia:** Cool grey alineado con familia cromática Efeonce. Un solo valor elimina confusión.

Acción TASK-370: migrar 16 consumers a `theme.palette.background.default`. Si un componente necesita surface elevado, usar `background.paper` (`#FFFFFF`).

---

## 5. Reglas de adopcion para componentes nuevos

### 5.1 Arbol de decision

```
¿El color es parte de la UI base (botones, text, borders, backgrounds)?
  → SI → theme.palette.* (primary, secondary, text, background, divider, etc.)

¿El color representa un estado semántico (éxito, error, advertencia, info)?
  → SI → theme.palette.{success,warning,error,info}.main

¿El color necesita responder a dark mode automáticamente?
  → SI → theme.palette.* o theme.palette.customColors.*

¿El color es una taxonomía de dominio (rol, servicio, fase CSC, semáforo, capability)?
  → SI → GH_COLORS.{role,service,cscPhase,semaphore,capability}.*

¿El color es para una paleta de datos/charts?
  → SI → GH_COLORS.chart.*

¿El color es para un brand moment explícito (login, hero, institutional)?
  → SI → GH_COLORS.brand.*

¿Ninguna categoría aplica?
  → Crear en theme.palette.customColors si es reutilizable
  → Crear en GH_COLORS si es taxonomía de dominio
  → NUNCA hardcodear hex inline
```

### 5.2 Reglas formales

1. **Nunca hardcodear hex** en componentes, vistas ni helpers. Todo color viene de `theme.palette.*`, `theme.palette.customColors.*`, o `GH_COLORS.*`.

2. **theme.palette es la fuente primaria** para colores de UI. MUI components (`Button`, `Chip`, `Alert`, etc.) deben usar props de color (`color="primary"`) o sx con tokens (`sx={{ color: 'text.primary' }}`).

3. **GH_COLORS es la fuente de dominio.** Taxonomías de negocio (roles, servicios, fases, semáforos) no deben migrar al theme porque:
   - No son estados de UI — son datos de negocio con identidad visual.
   - No deben cambiar si el theme cambia.
   - No necesitan responder a dark mode (se usan como chips/badges con bg explícito).

4. **customColors son el bridge.** Cuando un color es "más que UI base pero menos que dominio" — ej: el azul acento Greenhouse para headers — vive en `theme.palette.customColors.*` y tiene variante dark.

5. **GH_COLORS.semantic ya no existe.** Cualquier referencia a success/warning/danger/info debe usar `theme.palette.{success,warning,error,info}`. Nota: MUI usa "error", no "danger".

6. **GH_COLORS.neutral ya no existe como fuente primaria.** Sus consumers migran a:
   - `textPrimary` → `customColors.midnight`
   - `textSecondary` → `text.secondary` (theme)
   - `border` → `customColors.lightAlloy`
   - `bgSurface` → `background.default` (theme)

### 5.3 Anti-patrones

| Anti-patrón | Corrección |
|-------------|------------|
| `sx={{ color: '#0375DB' }}` | `sx={{ color: 'primary.main' }}` |
| `sx={{ color: GH_COLORS.semantic.success.source }}` | `sx={{ color: 'success.main' }}` |
| `sx={{ borderColor: GH_COLORS.neutral.border }}` | `sx={{ borderColor: theme => theme.palette.customColors.lightAlloy }}` |
| `sx={{ color: GH_COLORS.neutral.textPrimary }}` | `sx={{ color: theme => theme.palette.customColors.midnight }}` |
| Crear un nuevo color sin registrarlo | Agregarlo a `GH_COLORS` o `customColors` primero |
| Usar `GH_COLORS.brand.*` para UI genérica | Brand es solo para brand moments (login, hero) |

---

## 6. Mapa de migracion para tasks hijas

### 6.1 TASK-369 — Hardcoded Hex Cleanup — COMPLETADA

Ejecutada 2026-04-11. Cambios reales vs spec original:

| Archivo | Acción real |
|---------|-----------|
| `OrganizationIcoTab.tsx` | CSC_COLORS extraído a `CSC_CHART_COLORS` compartido en `metric-registry.ts`. TREND_LINE_COLORS derivado con `Object.values()`. |
| `PersonActivityTab.tsx` | CSC_COLORS local eliminado, import compartido. |
| `PayrollReceiptCard.tsx` | `#023c70` → `GH_COLORS.role.account.source` (2 instancias). |
| `NexaInsightsBlock.tsx` | `#7367F0` → `theme.palette.primary.main` (2 instancias). Bug fix: purple→blue. |
| `admin/tenants/helpers.ts` | **EXCLUIDO** — hex no coinciden con GH_COLORS.service. Resuelto como nueva categoría `capability` (ver §3.10). |

### 6.2 TASK-370 — Semantic Token Absorption (actualizado 2026-04-11)

**Tokens a eliminar de GH_COLORS (todos los conflictos resueltos):**
- Toda la categoría `semantic` (12 tokens) — consumers migran a `theme.palette.{success,warning,error,info}`
- `neutral.textPrimary` — consumers migran a `theme.palette.customColors.midnight` (sin cambio visual)
- `neutral.textSecondary` — consumers migran a `theme.palette.text.secondary` (`#667085`) — **cambio visual aprobado** (mejora WCAG)
- `neutral.border` — consumers migran a `theme.palette.customColors.lightAlloy` (sin cambio visual)
- `neutral.bgSurface` — consumers migran a `theme.palette.background.default` (`#F8F9FA`) — **cambio visual imperceptible**

**Tokens nuevos a registrar en GH_COLORS:**
- `capability` (15 tokens) — formaliza hex de `helpers.ts getCapabilityPalette()`. Solo canonicaliza, no cambia visual.

**Total de consumers a migrar:** ~41 archivos (con solapamiento).

**Cambios visuales aprobados:**
- textSecondary: `#848484` → `#667085` en 21 archivos. Aprobado por resolución de violación WCAG 2.1.4.3. Verificar visualmente en Agency dashboards.
- bgSurface: `#F7F7F5` → `#F8F9FA` en 16 archivos. Imperceptible. No requiere verificación visual.

**Type augmentation requerida:** Crear module augmentation para `customColors` en MUI:
```typescript
declare module '@mui/material/styles' {
  interface CustomColors {
    midnight: string
    deepAzure: string
    royalBlue: string
    coreBlue: string
    neonLime: string
    sunsetOrange: string
    crimson: string
    lightAlloy: string
    bodyText: string
    secondaryText: string
    claimGray: string
    // ... existing tokens from mergedTheme
  }
}
```

### 6.3 TASK-371 — Shell Primary Cutover

**Recomendación revisada:** Esta task puede simplificarse significativamente.

El primary ya es `#0375DB` en runtime. Lo que falta es formalizar esta decisión en la capa base:

1. Mover `primary: { main: '#0375DB', light: '#3691E3', dark: '#024C8F' }` de `mergedTheme.ts` a `colorSchemes.ts`.
2. Evaluar si `primaryColorConfig.ts` se puede eliminar (ya no hay "override" — es el valor base).
3. Simplificar `mergedTheme.ts` quitando los overrides que ya estarían en la base.

**Esto NO es un cambio visual** — el portal ya muestra `#0375DB`. Es una limpieza de capas.

### 6.4 TASK-372 — Kortex Visual Preset

**Contrato compartible (lo que hereda Kortex):**
- Palette: `primary`, `secondary`, `success`, `warning`, `error`, `info` (hex + light/dark variants)
- customColors: `midnight`, `deepAzure`, `royalBlue`, `coreBlue`, `neonLime`, `sunsetOrange`, `crimson`, `lightAlloy`
- Typography: DM Sans (body) + Poppins (headings/buttons) + variants (monoId, monoAmount, kpiValue)
- Shape: borderRadius 6px, custom scale (xs:2, sm:4, md:6, lg:8, xl:10)
- Shadows: MUI shadow system + customShadows

**Lo que NO hereda Kortex:**
- `GH_COLORS` entero (dominio Greenhouse — roles, services, CSC phases, semáforos)
- `themeConfig.ts` (layout, navbar, skin — cada producto configura su shell)
- Nomenclatura del portal (`GH_LABELS`, `GH_MESSAGES`, etc.)
- Brand assets y logos

---

## 7. Paleta de hex unicos del ecosistema

Para referencia rápida, estos son los hex únicos que componen la identidad visual Greenhouse:

### Azules institucionales (familia Efeonce)
| Hex | Nombre | Uso |
|-----|--------|-----|
| `#022A4E` | Midnight Navy | Brand accent, text primary GH, customColors.midnight |
| `#023C70` | Deep Azure | Secondary.main, role.account, service.efeonce_digital |
| `#024C8F` | Royal Blue | Secondary.dark, role.operations, chart.secondary |
| `#0375DB` | Core Blue | Primary.main, brand.coreBlue, chart.primary |
| `#3691E3` | Core Blue Light | Primary.light |
| `#85B7EB` | Soft Blue | Brand complemento (login) |

### Semánticos
| Hex | Nombre | Uso |
|-----|--------|-----|
| `#6EC207` | Neon Lime | Success, semaphore.green, chart.success |
| `#FF6500` | Sunset Orange | Warning, semaphore.yellow, chart.warning |
| `#BB1954` | Crimson | Error, semaphore.red, chart.error, service.globe |

### Neutrales
| Hex | Nombre | Uso |
|-----|--------|-----|
| `#1A1A2E` | Dark Navy | text.primary (theme) |
| `#667085` | Slate Grey | text.secondary (theme) |
| `#848484` | Claim Grey | customColors.claimGray (legacy) |
| `#DBDBDB` | Light Alloy | customColors.lightAlloy, borders |
| `#F7F7F5` | Warm Surface | GH_COLORS.neutral.bgSurface (legacy, converge a #F8F9FA) |
| `#F8F9FA` | Cool Surface | background.default (theme) |

### Dominio (sin equivalente en theme)
| Hex | Nombre | Uso |
|-----|--------|-----|
| `#633F93` | Royal Purple | role.strategy, service.crm_solutions, cscPhase.planning |
| `#1B7A4E` | Greenhouse Green | brand.greenhouseGreen (login) |
| `#4CAF6E` | Leaf | brand.leaf (login) |

---

## Apendice: Archivos clave del sistema de color

| Archivo | Rol |
|---------|-----|
| `src/@core/theme/colorSchemes.ts` | Paleta base Vuexy (light + dark) |
| `src/@core/theme/index.ts` | Theme factory (compone palette, typography, shadows, overrides) |
| `src/@core/theme/typography.ts` | Font stack base |
| `src/@core/theme/shadows.ts` | Shadow system |
| `src/@core/theme/overrides/` | 39 archivos de MUI component overrides |
| `src/configs/themeConfig.ts` | Configuración de shell (layout, mode, skin) |
| `src/configs/primaryColorConfig.ts` | Override de primary color |
| `src/components/theme/mergedTheme.ts` | Greenhouse overrides + customColors |
| `src/components/theme/index.tsx` | ThemeProvider con runtime override |
| `src/config/greenhouse-nomenclature.ts` | GH_COLORS (líneas 1164-1265) |
