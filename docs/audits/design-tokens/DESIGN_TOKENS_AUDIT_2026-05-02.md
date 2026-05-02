# Greenhouse Design Tokens — Auditoría 2026-05-02

> **Tipo de documento:** Auditoría técnica
> **Versión:** 1.1
> **Fecha:** 2026-05-02
> **Ejecutado por:** Claude Opus 4.7 (1M context) en sesión sobre TASK-567
> **Scope:** Tres dimensiones — V1 spec ↔ runtime, DESIGN.md ↔ V1 spec, consumo real en codebase
> **Trigger:** Preparación de TASK-764 (DESIGN.md Contract Hardening). Antes de implementar el CI gate, sync con spec V1 y resolución de los 16 warnings de `pnpm design:lint`, se requería inventario concreto del drift actual.

## Update v1.1 — 2026-05-02 (tarde)

Verificación post-audit reveló que **el ADR de paleta canónica YA existe**: `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` (TASK-368, 2026-04-11). Esa spec §1.4 dice textualmente: "mergedTheme es la fuente de verdad porque es lo que el usuario ve". Esto **es la Opción A** ya formalizada hace 3 semanas.

Implicaciones:

- **Drift #1, #2, #3, #14 NO requieren decisión nueva** — la decisión está tomada. Solo hay que sincronizar `GREENHOUSE_DESIGN_TOKENS_V1.md` con `GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`.
- **`info.main = #0375DB`** (Core Blue) es decisión consciente documentada en THEME_TOKEN_CONTRACT §1.4: "mergedTheme overridea info a coreBlue; GH_COLORS coincide con el override, no con la base". No es leftover Vuexy.
- **`primaryColorConfig.ts`** soporta multi-tenant via 7 paletas Efeonce predefinidas (Core Blue default + Royal/Azure/Midnight/Lime/Sunset/Crimson) y acepta hex arbitrario vía `settings.primaryColor`. Multi-tenant ya operativo.
- **`secondary.main = #023C70`** (navy) en runtime corresponde a `efeonce-azure.main` del catálogo Efeonce — coherente con la paleta institucional, no es drift accidental.
- **Fase 1 del plan** colapsa de "1-2 días ADR" a "0.25 días sync de specs".

Acción: las Fases 2-4 originales se reordenan; el plan total baja de ~2.5 días a ~1 día humano para el flanco bloqueante.

---

## Resumen ejecutivo

**14 drift items detectados.** Distribución por severidad:

- 🔴 **3 críticos** (decisión de producto requerida): conflicto de paleta primaria/secundaria/info entre los tres planos
- 🟡 **5 medios** (cobertura incompleta de V1): customColors no documentados, component contracts cuantitativos faltan, 16 tokens DESIGN.md ausentes en V1, color drift en charts, version header desactualizado
- 🟢 **6 bajos** (deuda técnica de adopción): variants semánticos sub-utilizados, fontWeight hardcoded 140+, naming snake-case ↔ camelCase, cross-ref asimétrico DESIGN.md↔V1, info color ausente en DESIGN.md, DM Sans en zonas excluidas legítimamente

**Findings positivos**: Typography variants V1↔runtime sin drift en h1-h6/body/caption/overline/monoId/monoAmount/kpiValue. Spacing scale, rounded scale, font loading y banneo Geist Mono/Inter/DM Sans en código nuevo están alineados.

---

## Metodología

Tres subagentes Explore en paralelo, cada uno con scope independiente:

1. **V1 spec ↔ runtime** — comparación token por token entre `GREENHOUSE_DESIGN_TOKENS_V1.md` y `mergedTheme.ts` + `layout.tsx`. Tabla de drift typography, color, spacing, rounded, elevation, component contracts.
2. **DESIGN.md ↔ V1 spec** — matrices de color (23 tokens), typography (13 variants), spacing/rounded (12 tokens), 6 component contracts. Detección de naming drift y missing reciprocal links.
3. **Consumo real en codebase** — ripgrep sobre `src/views/**`, `src/components/**`, `src/app/**` (excluyendo theme files, emails, PDFs) buscando hardcoded hex, hardcoded spacing/border-radius, adoption count de Typography variants, fontSize/fontWeight literals.

Resultados consolidados manualmente en este documento.

---

## Drift items — inventario completo

### 🔴 Drift #1 — Conflicto de color primario entre los tres planos

| Plano | Valor `primary` | Plano | Valor `secondary` | Plano | Valor `info` |
|---|---|---|---|---|---|
| `DESIGN.md` (raíz) | `#0375DB` (Core Blue) | `DESIGN.md` | `#023C70` (deep navy) | `DESIGN.md` | _no declarado_ |
| `V1` spec | `#7367F0` (Vuexy purple) | `V1` spec | `#808390` (gray) | `V1` spec | `#00BAD1` (cyan) |
| Runtime | delegado a `primaryColorConfig.ts` | Runtime | `#023C70` (navy) | Runtime | `#0375DB` (Core Blue) |

**Implicación**: V1 todavía declara colores Vuexy default cuando el theme efectivo está greenhouseizado. DESIGN.md introduce paleta moderna que tampoco corresponde 1:1. Necesita decisión de producto sobre cuál es canónico.

**Severidad**: 🔴 Alta. Bloquea Slice 2 de TASK-764.

---

### 🔴 Drift #2 — V1 declara `secondary.main: #808390`; runtime es `#023C70`

`mergedTheme.ts:34` setea navy. V1 §8.1 documenta gray. **Drift de valor concreto** — no es naming, son colores diferentes.

**Severidad**: 🔴 Alta. Cualquier consumer que lea V1 y aplique `theme.palette.secondary.main` verá navy, no gray.

---

### 🔴 Drift #3 — V1 declara `info.main: #00BAD1` (cyan); runtime es `#0375DB` (Core Blue)

`mergedTheme.ts:39`. Mismo patrón que #2 — V1 spec valor genérico Vuexy, runtime greenhouseizado.

**Severidad**: 🔴 Media. Info se usa menos pero el drift de valor es real.

---

### 🟡 Drift #4 — Version header V1 desactualizado

- Header línea 3: `> **Version:** 1.0`
- Cuerpo contiene v1.3 (§3.6 line-heights canónicos)
- Tabla de versionamiento (§14) sí enumera 1.0 → 1.1 → 1.2 → 1.3
- **Header no fue bumpeado** en commit `704aa8b9 feat(theme): line-height token namespace canónico (tokens v1.3)`

**Severidad**: 🟡 Baja. No afecta runtime; sí afecta interpretación humana del documento.

---

### 🟡 Drift #5 — `palette.customColors.*` (14 tokens) no documentados en V1

`mergedTheme.ts:61-80` (light) y `:114-133` (dark) declaran 14 colores semánticos: `midnight`, `deepAzure`, `royalBlue`, `coreBlue`, `neonLime`, `sunsetOrange`, `crimson`, `lightAlloy`, `bodyText`, `secondaryText`, `claimGray`, `bodyBg`, `chatBg`, `greyLightBg`, `inputBorder`, `tableHeaderBg`, `tooltipText`, `trackBg`.

V1 no los menciona. **Adopción real medida**:
- `customColors.midnight` — 52 usos ✅ popular
- `customColors.lightAlloy` — 41 usos ✅ popular
- `customColors.bodyBg`, `chatBg`, `greyLightBg`, `inputBorder`, `tableHeaderBg`, `tooltipText`, `trackBg` — **0 usos** (orphan)

**Severidad**: 🟡 Media. La mitad están vivos en producción pero no documentados; la otra mitad son orphan candidates a cleanup.

---

### 🟡 Drift #6 — Component contracts cuantitativos en DESIGN.md no en V1

DESIGN.md declara 6 contratos con paddings/heights específicos:

- `button-primary` / `button-secondary`: padding 12px
- `card-default` / `card-floating`: padding 24px
- `input-default`: height 40px, padding 12px
- `status-chip`: padding 8px

V1 §11-12 lista primitivas autorizadas y anti-patterns observados, pero **no documenta los style overrides cuantitativos**. Existen en runtime vía Vuexy core + overrides Greenhouse, pero V1 no los declara.

**Severidad**: 🟡 Media. Sin documentación cuantitativa, los agentes tienen que adivinar paddings al crear componentes nuevos.

---

### 🟡 Drift #7 — DESIGN.md declara 16 paleta tokens ausentes en V1

Variantes declaradas en DESIGN.md (raíz YAML frontmatter) sin equivalente en V1:

`primary-light`, `primary-dark`, `secondary-light`, `secondary-dark`, `surface`, `surface-alt`, `surface-dark`, `background-dark`, `text-primary`, `text-secondary`, `text-disabled`, `text-primary-dark`, `text-secondary-dark`, `on-primary`, `on-surface`, `on-surface-dark`, `border-subtle`.

Estos son exactamente los **16 warnings actuales de `pnpm design:lint`** ("token defined but never referenced by any component"). Resolver este drift cierra el flanco.

**Severidad**: 🟡 Media. Vinculado directamente a la condición de cierre de TASK-764 Slice 3.

---

### 🟡 Drift #8 — V1 no menciona DESIGN.md (cross-reference asimétrico)

DESIGN.md cita V1 explícitamente como "extended canonical explanation" en su sección Maintenance Protocol. V1 § 16 (referencias) no menciona DESIGN.md como contrato agent-facing derivado.

**Severidad**: 🟢 Baja. Documentation-only fix.

---

### 🟢 Drift #9 — DM Sans residual en zonas excluidas legítimamente del sweep TASK-567

`grep -rn "DM Sans"` en `src/`:

- `src/app/global-error.tsx:32` — corre antes del theme MUI; necesita fontFamily literal
- `src/emails/constants.ts` — emails con webfont fallback propio
- `src/@core/theme/typography.ts:9` — fallback Vuexy primitive (read-only por regla dura)

V1 §3.2 dice "se barren en TASK-567"; ese sweep las excluyó intencionalmente porque están fuera del shell MUI runtime.

**Severidad**: 🟢 Baja. **No es drift real** — es scope-out justificado. Necesita V1 reflejar la excepción documentada.

---

### 🟢 Drift #10 — Variants semánticos sub-utilizados (TASK-021 follow-up)

Adopción real en product code:

| Variant | Usos | Meta razonable |
|---|---|---|
| `monoId` | 3 | ~50-100 (todos los IDs `EO-XXX-XXXX`) |
| `monoAmount` | 1 | ~80-120 (todos los montos) |
| `kpiValue` | 0 | ~10-20 (KPI cards de dashboards) |

TASK-567 eliminó `fontFamily: 'monospace'` por contrato pero **no migró los Typography a variants semánticos** (out-of-scope declarado). Quedó como follow-up TASK-021.

**Severidad**: 🟢 Baja. Es deuda de adopción, no drift de contrato.

---

### 🟢 Drift #11 — `fontWeight` hardcoded 140+ instancias

`fontWeight: 600/700/800` literal en sx props. Top files:
- `FinanceMovementFeed.tsx`: 10
- `EditServiceDrawer.tsx`: 8
- (140+ totales en product code)

Out-of-scope deliberado de TASK-567 (open question registrada).

**Severidad**: 🟢 Baja. Territorio TASK-021. La rule actual no los bloquea.

---

### 🟡 Drift #12 — Color drift en charts y componentes específicos

Hardcoded hex en product code que bypassea `palette.customColors.*`:

- `IcoCharts.tsx`: `#7367F0`, `#00BAD1`, `#ff6500`, `#bb1954`, `#6ec207` — chart state colors
- `SpaceCard.tsx`, `SpaceHealthTable.tsx`: `#eaf3fc` — backgrounds undeclared
- `Navigation.tsx`: `#023c70`, `#022A4E` — duplicados de palette
- `helpers.ts`: `#F5F5F5` fallback

**Severidad**: 🟡 Media. Sweep pequeño pero no trivial — puede merecer task derivada.

---

### 🟢 Drift #13 — Naming snake-case (DESIGN.md) ↔ camelCase (V1/runtime)

DESIGN.md: `numeric-id`, `numeric-amount`, `kpi-value`
V1/runtime: `monoId`, `monoAmount`, `kpiValue`

No es drift de valor (matchean perfectamente); es naming convention diferente. DESIGN.md sigue convención snake-case del W3C DTCG; runtime usa camelCase API JS.

**Severidad**: 🟢 Baja. Documentar mapping bilateral; no requiere refactor.

---

### 🟢 Drift #14 — DESIGN.md no declara `info` color

V1 declara `info.main: #00BAD1`; runtime usa `#0375DB`. DESIGN.md omite `info` enteramente del frontmatter.

**Severidad**: 🟢 Baja. Decidir si entra a DESIGN.md o se queda como semántico runtime-only.

---

## Findings positivos (cero drift)

- **Typography variants V1 ↔ runtime**: h1-h6, body1, body2, subtitle1, subtitle2, caption, overline, button, monoId, monoAmount, kpiValue — todos los valores match incluyendo lineHeights namespace v1.3.
- **Font loading**: layout.tsx ↔ mergedTheme.ts ↔ V1 todos sincronizados en Geist (weights 400-800) + Poppins (weights 600-800) con CSS vars `--font-geist`, `--font-poppins`.
- **Spacing scale**: 0.25rem por factor confirmado en `spacing.ts`. Scale (0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48 px) match exacto entre los tres planos.
- **Rounded scale**: xs=2, sm=4, md=6, lg=8, xl=10. Cero drift.
- **Banneo de fuentes**: V1 §3.4 prohibe explícitamente Geist Mono / Inter / DM Sans en código nuevo. Alineado con DESIGN.md "Do's and Don'ts" y con la regla ESLint `greenhouse/no-hardcoded-fontfamily` (TASK-567).
- **lineHeights namespace v1.3**: 6 tokens (display 1.05, heading 1.25, pageTitle 1.4, metadata 1.45, body 1.5, numericDense 1.54) declarados en `typography-tokens.ts`, type-augmented, expuestos al theme y consumidos correctamente por las variants.
- **Spacing token consumption**: ~600 usos de `gap: N`, `p: N`, `m: N` (token-aware MUI spacing). Solo ~15 instancias de hardcoded pixel padding (mayormente en `AgencyCampaignsView` y `EditableCell`).

---

## Plan de resolución

Diseñado para "lo más robusto, seguro, resiliente y escalable" — gate antes que contenido, decisión antes que cleanup, escalable a futuros refresh.

### Fase 1 — Decisiones bloqueantes (drift #1, #2, #3) [**1-2 días**]

Requieren decisión de producto antes de tocar cualquier código.

**Pregunta canónica**: ¿Cuál es el `primary.main` y `secondary.main` de Greenhouse?

**Opciones**:
- **A.** Aceptar runtime como source-of-truth. V1 actualiza valores a `secondary=#023C70`, `info=#0375DB`; `primary` queda delegado a `primaryColorConfig` y se documenta que el runtime puede pintar Core Blue/otro accent según settings. DESIGN.md mantiene Core Blue como default declarado.
- **B.** Declarar Core Blue como primary canónico forzado (no runtime-overridable). V1 actualiza `primary.main=#0375DB`; `primaryColorConfig` se restringe a roles (e.g., un Globe client puede tener su accent, pero el default Greenhouse es fijo). DESIGN.md sigue.
- **C.** Mantener Vuexy purple como primary técnico y Core Blue como secondary brand. V1 explica el split. DESIGN.md actualiza secondary a Core Blue.

**Recomendación**: Opción A — runtime es la fuente de verdad por convención del repo (TASK-566 estableció esa regla); DESIGN.md ya declara Core Blue como "default accent" con override por settings. Cierra los 3 drifts en una sola pasada documental.

**Output**: ADR (Architectural Decision Record) en `docs/architecture/decisions/ADR-XXX-canonical-primary-secondary-info-colors.md` o sección equivalente en V1 §8.

### Fase 2 — Reconciliación V1 ↔ runtime (drift #4, #5, #6, #14) [**0.5 día**]

Una vez decidida la paleta canónica:

1. **Bump version header** V1 → `1.4` (drift #4). Agregar entry a tabla §14: "1.4: 2026-05-02 — paleta canónica reconciliada, customColors documentado, component contracts cuantitativos agregados".
2. **Documentar `customColors` namespace** en V1 §8 (drift #5):
   - Sección 8.3 nueva: "Tokens semánticos Greenhouse" — lista los 14 customColors con valor, propósito y uso esperado
   - Marcar como orphan los 7 con 0 usos: candidatos a cleanup en task derivada (TASK-770)
3. **Agregar §4.2 "Component padding contracts"** con los 6 contratos cuantitativos de DESIGN.md (drift #6).
4. **Decidir info en DESIGN.md** (drift #14): si Opción A de Fase 1, agregar `info: "#0375DB"` al YAML frontmatter; sino, dejar omitido.

### Fase 3 — Cierre del gate DESIGN.md (drift #7, #13) [**0.5 día**]

1. **Resolver los 16 warnings** del linter `pnpm design:lint` (drift #7) referenciando los 16 tokens en algún `component contract` del frontmatter — bien sea creando nuevos contratos (`button-primary-dark`, `status-chip-success`, etc.) o usando un namespace `palette.*` no auditado por componente.
2. **Documentar mapping bilateral DESIGN.md ↔ V1** (drift #13) en una tabla nueva en V1 §15 que mapee `numeric-id↔monoId`, `numeric-amount↔monoAmount`, `kpi-value↔kpiValue`, `headline-display↔h1`, etc.
3. Activar `pnpm design:lint` en modo **strict** (warnings block CI) en TASK-764 Slice 1.

### Fase 4 — Reconciliación cross-reference (drift #8, #9) [**0.25 día**]

1. **V1 §16** agregar referencia a `DESIGN.md (raíz)` como "contrato compacto agent-facing derivado" (drift #8).
2. **V1 §3.2** actualizar la nota sobre TASK-567: cambiar "se barren en TASK-567" por "TASK-567 cerró el sweep en UI productiva. Quedan como excepciones legítimas: `src/app/global-error.tsx` (pre-theme), `src/emails/constants.ts` (emails fuera del shell MUI), `src/@core/theme/typography.ts` (Vuexy primitive read-only). Estas no son drift, son scope-out documentado." (drift #9).

### Fase 5 — Deuda de adopción (drift #10, #11, #12) [**TASK-021 + TASK-770 derivada**]

Out-of-scope de la resolución V1↔DESIGN.md. Se atacan en sus tasks correspondientes:

1. **TASK-021** (existente, reclasificada por TASK-567): variants semánticos sub-utilizados (drift #10) y `fontWeight` hardcoded (drift #11). Inventario concreto añadido como nota delta.
2. **TASK-770** (nueva, recomendada): "Color sweep en charts + cleanup customColors orphans". Cubre drift #12 (IcoCharts/SpaceCard/SpaceHealthTable hardcoded hex) y los 7 customColors con 0 usos (cleanup orphan).

---

## Cronograma propuesto

| Fase | Esfuerzo | Reversibilidad | Bloqueante |
|---|---|---|---|
| **Fase 1** — Decisión paleta (ADR) | 1-2 días | Alta | Sí — bloquea todo lo demás |
| **Fase 2** — Reconciliación V1 docs | 0.5 día | Alta | Sí — bloquea Fase 3 |
| **Fase 3** — Cierre design:lint warnings | 0.5 día | Alta | Sí — cierra TASK-764 Slice 3 |
| **Fase 4** — Cross-ref + nota TASK-567 | 0.25 día | Alta | No |
| **Fase 5** — Deuda de adopción (TASK-021/770) | 1-3 días | Media | No |

**Total fases bloqueantes**: ~2.5 días humanos. Las fases 1-4 cierran completamente el contrato visual + lint gates. La fase 5 es deuda de adopción que vive en sus propias tasks.

---

## Mapping a tasks existentes y nuevas

| Drift | Task que lo resuelve | Slice/sección |
|---|---|---|
| #1, #2, #3, #14 | **Nueva ADR** + actualización V1 (parte de TASK-764 Fase 1-2) | TASK-764 Slice 2 |
| #4 | TASK-764 Slice 2 | header bump + tabla version |
| #5 | TASK-764 Slice 2 | V1 §8.3 nueva |
| #6 | TASK-764 Slice 2 | V1 §4.2 nueva |
| #7 | TASK-764 Slice 3 | resolver 16 warnings |
| #8 | TASK-764 Slice 4 | cross-ref V1 §16 |
| #9 | TASK-764 Slice 2 | nota TASK-567 actualizada |
| #10, #11 | **TASK-021** (reclasificada) | scope ya cubierto |
| #12 | **TASK-770 nueva** (recomendada) | scope a definir |
| #13 | TASK-764 Slice 2 | mapping bilateral V1 §15 |

---

## Próximas acciones inmediatas

1. **Crear ADR sobre paleta canónica** — archivo nuevo decisional. Bloquea Fase 2-4.
2. **Actualizar TASK-764** — agregar findings de este audit como Delta y enriquecer Slices 2-4 con los drift items específicos.
3. **Crear TASK-770** — color sweep en charts + cleanup customColors orphans (opcional, puede agendarse).
4. **Actualizar TASK-021** — agregar nota delta con inventario concreto post-audit (3/1/0 monoId/monoAmount/kpiValue, 140+ fontWeight hardcoded).

---

## Referencias

- `DESIGN.md` (raíz, commit `f8fc7200`)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (v1.3 contenido, header desactualizado a 1.0)
- `src/components/theme/mergedTheme.ts:31-220`
- `src/app/layout.tsx:30-44`
- `src/components/theme/typography-tokens.ts` (lineHeights namespace)
- `eslint-plugins/greenhouse/rules/no-hardcoded-fontfamily.mjs` (TASK-567 gate)
- TASK-566 (foundation), TASK-567 (sweep + rule), TASK-021 (variant adoption), TASK-764 (DESIGN.md hardening)

---

> **Vigencia**: Este audit es snapshot al 2026-05-02. Refrescar cuando TASK-764 cierre Slice 2-3 (la paleta canónica decidida y los warnings resueltos invalidan los drift items #1-7) o cuando se ship un nuevo pivot estructural (fuente, namespace de color, formato DESIGN.md → 1.0).
