# Invariantes operativos para agentes — Typography + Efeonce brand (TASK-1036/1038)

---

## Invariantes operativos para agentes — Typography + Efeonce brand (TASK-1036/1038)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim.** Typography system (SoT + drift-guard + escala) + Efeonce brand assets. Contrato: `GREENHOUSE_DESIGN_TOKENS_V1.md`, `DESIGN.md`, `src/config/efeonce-brand.ts`. Skill `typography-design`. Dedup = Slice 4.

### Typography System — SoT + drift-guard + escala (TASK-1036 / TASK-1038)

Mapa canónico para cualquier agente que toque texto/tipografía (espejo del patrón AXIS de color):

- **Fuente de verdad (valores):** `src/components/theme/typography-tokens.ts` — primitivos (`fontFamilies`/`fontWeights`/`fontSizes`/`letterSpacings`/`fontFeatures`) → `typographyScale` (tokens compuestos por rol) → `TYPOGRAPHY_VARIANT_BRIDGE` (contrato semántico ↔ variante MUI, **1:1 como código**) + `SECONDARY_VARIANT_TOKENS` (h6→label-md, subtitle2→body-sm) + `controlText` ramp.
- **Runtime:** `src/components/theme/mergedTheme.ts` deriva cada variante del SoT (cero `fontSize`/`fontWeight`/familia hardcodeados). Overrides de componente (Button large, Tab, DialogTitle) consumen el SoT vía el bloque `components`.
- **Drift-guard (enforcement):** `src/components/theme/typography-drift.test.ts` falla CI si `runtime ≡ SoT ≡ DESIGN.md` divergen. Cobertura (TASK-1042): runtime ≡ SoT ≡ DESIGN.md **front-matter + prosa §Typography** ≡ **V1 §15.1** — todo `Npx`/`Nrem` literal en la prosa y en la tabla V1 debe ser un tamaño vigente del SoT (derivado de los tokens activos, no de los primitivos huérfanos 15/18). Si cambiás un valor del SoT, **DEBÉS** actualizar DESIGN.md front-matter + V1 §3.2/§15.1 en el mismo PR o el guard rompe (parity 3 capas).
- **Contrato agente:** `DESIGN.md` §Typography (compacto, el que leés primero) + `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 (extendido: type scale, mapa de aplicación, políticas transversales, versioning).
- **Skill invocable de tipografía (creada 2026-06-07):** para CUALQUIER decisión o auditoría de tipografía (peso, variante, contraste, interlineado, medida, numerales, optical sizing, variable fonts, OpenType, fluid type, carga de fuentes, i18n/RTL, pairing) invocar `typography-design`. Patrón dual espejo de `modern-ui`/`a11y-architect`: skill global portable `~/.claude/skills/typography-design/` (el *craft* + 5 references: weights-variants, contrast-accessibility, font-technology, rhythm-measure, i18n-typography) + overlay Greenhouse `.claude/skills/typography-design/SKILL.md` que **gana** y pinea Poppins/Geist reales, pesos {400,600,700,800} (500 won't-do TASK-1039), la escala fija, SoT/drift-guard/lint, adapters charts/PDF/email y las reglas NUNCA. Mirror Codex: `.codex/skills/greenhouse-typography-accessibility/`. **Decide el valor; `design-system-governance` lo shippea** (3-layer parity). Compone con `modern-ui`/`a11y-architect`/`dataviz-design`/`forms-ux`/`greenhouse-ux-writing`.
- **Referencia visual viva (INTERNA):** `/admin/design-system/typography/mockup` — documento canónico que renderiza el SoT en vivo (primitivas → escala → aplicaciones → bridge → propuesta → transversales → gobernanza), drift-guarded. Es el "museo"; las reglas que un agente aplica viven en DESIGN.md/V1, NO en el mockup (un agente no renderiza React para aprender reglas).
- **Escala vigente (TASK-1038 redesign aprobado 2026-06-06):** display Poppins 32/24/20; **page-title 20** (h4 — arregló la inversión: page-title ≥ section-title); **section-title 16** (h5); subheader/subtitle1 14; **label-md/button 14**; body-lg 16 / body-md 14 / body-sm·caption 13; overline 12; numeric-id 14 / numeric-amount 13 / kpi-value 28. Control: Button sm/md 14, **lg 16** · Tab 14 · Dialog title = section-title 16.
- **⚠️ Reglas duras:** NUNCA `fontSize` inline en texto (usar variante/token); NUNCA monospace (numéricos = Geist + `tabular-nums`); NUNCA editar `src/@core/theme/*` (override en mergedTheme); NUNCA token sin consumidor; SIEMPRE mover juntos SoT + mergedTheme + DESIGN.md + V1 + drift-guard.
- **Políticas transversales canonizadas (TASK-1038, con product-design + arch skills):** i18n Latin-first (es-CL/en-US/pt) + RTL-ready vía CSS logical properties, CJK diferido; tipo **fijo en producto**, `clamp()` solo marketing; **no display tier** sin consumidor real; **PDF/email = un SSOT semántico + adapter por medio** (web→variant, PDF→react-pdf, email→inline+fallback — espeja el precedente de color axisSemanticHex); truncation (1-línea ellipsis en slots fijos + valor completo / 2-líneas clamp / wrap en body·labels·errores); charts derivan del SoT; body de lectura larga ~65ch.
- **Charts derivan del SoT (TASK-1041, ✓):** los 43 charts del portal (Apex 33 + Recharts 10; **ECharts no se usa hoy**) consumen familia+tamaño del SoT **desde un solo lugar** — los wrappers `AppReactApexCharts` + `AppRecharts` (`src/libs/styles/`) gobiernan el texto SVG con CSS `!important` leyendo `theme.typography.{fontFamily,caption}` (100% cobertura, 0 bypass). Cambiar el SoT propaga a los 43 sin tocar cada chart. **NUNCA** poner `fontSize`/`fontFamily` de texto de chart inline en un chart — el wrapper lo gobierna. Para **ECharts (canvas, política de dashboards nuevos de alto impacto)** el CSS NO llega: esos charts DEBEN consumir el helper `getChartTypographyFromTheme(theme)` (`src/components/theme/chart-typography.ts`) en `option.textStyle`/`axisLabel`.
- **ApexCharts runtime boundary (ISSUE-085):** `AppReactApexCharts` es además el único owner del `dynamic(..., { ssr:false })` hacia `react-apexcharts`; consumers importan el wrapper directo, sin otro `dynamic()`, y `@/libs/ApexCharts` quedó retirado. Guardrail: `greenhouse/no-dynamic-app-react-apexcharts`.
- **Follow-ups tipografía:** (1) [abierto] rol semántico para el peso **500** — **evaluado y descartado** (TASK-1039 won't-do): a 14px 400→500 es imperceptible + el 500 ya rinde vía Vuexy/MUI → un 4º tier mete ambigüedad (beneficio marginal < claridad); (2) [abierto] adapter **PDF** Geist 600/800: `register-fonts.ts` registra por **nombre de familia** (no por peso); TASK-1040 ya sumó las familias `Geist SemiBold`(600)+`Geist ExtraBold`(800) → falta solo migrar componentes PDF a usarlas (refinamiento, el web no tiene gap); (3) [✓ TASK-1041] charts gobernados centralmente (ver arriba); (4) [✓ TASK-1038] lint rule `greenhouse/no-fontsize-inline-typography` (scopeada a `<Typography>`, warn) + rule tests en CI (`pnpm test:lint-rules`). Spec: `docs/tasks/complete/TASK-1038-typography-scale-redesign.md`.

### Efeonce brand assets (SSOT `src/config/efeonce-brand.ts`)

Hechos de marca canónicos — NO hardcodear en otro lado, importar del SSOT. Documentados también en `DESIGN.md` (sección "Brand assets — Efeonce").

- **Arquitectura de marca — Efeonce (paraguas) vs Greenhouse (plataforma)**: **EFEONCE** es la marca paraguas/institucional; **Greenhouse** es la plataforma/app de Efeonce. Los dos logos **coexisten** (no intercambiables): logo **Greenhouse** en todo lo de la **app** (navegación, dashboards, surfaces in-app); logo + eslogan **Efeonce** en lo **institucional/externo** (recibos/comprobantes, reportes, finiquitos, contratos, emails transaccionales, PDFs institucionales). Un documento institucional lleva marca **Efeonce**, no Greenhouse.
- **URL pública**: `efeoncepro.com` (`EFEONCE_URL`). Ya usada en el footer del PDF de payroll + emails transaccionales.
- **Dirección legal (fallback)**: `Dr. Manuel Barros Borgoño 71 Of 1105, Providencia, RM — Chile` (`EFEONCE_LEGAL_ADDRESS_FALLBACK`). Preferir el `legalAddress` de la operating entity runtime (`getOperatingEntityIdentity()`); el constante es fallback.
- **Entidad legal (fallback)**: `Efeonce Group SpA` (`EFEONCE_LEGAL_NAME_FALLBACK`).
- **Eslogan "Empower your Growth"** — elemento de **brand-zone** (header/masthead), **NUNCA** el footer legal. Tipografía Poppins: `Empower` = ExtraBold Italic (800 italic), `your` = ExtraBold (800), `Growth` = Black Italic (900 italic). **Color canónico gris `#848484`** (= token `text-disabled`; `EFEONCE_SLOGAN_COLOR` en el SSOT, es el default de ambos componentes — override solo sobre fondo oscuro). Fuentes en `src/assets/fonts/Poppins-{ExtraBold,ExtraBoldItalic,Black,BlackItalic}.ttf` (Google Fonts v24 Latin, SIL OFL 1.1), registradas en `src/lib/finance/pdf/register-fonts.ts`. Render canónico: web `src/components/greenhouse/brand/EfeonceSlogan.tsx`, PDF `src/lib/finance/pdf/efeonce-slogan-pdf.tsx` — NUNCA re-implementar inline.
  - **Logo y eslogan son elementos SEPARADOS** — se usan solos o compuestos, **nunca fusionados en un único asset**. En un lockup (logo + eslogan): el eslogan es **subordinado** (claramente más pequeño, NO compite ni iguala el ancho del logo) y va **centrado** debajo del logo con separación mínima. El **tamaño del eslogan es contextual** (depende del tamaño del logo en esa superficie) — elige un `fontSize` que lo mantenga visiblemente menor; NO hay un pt fijo (el reporte de contractors usa ~7.5pt contra logo ~116pt como ejemplo de la **proporción**, no como regla). Detalle en `DESIGN.md` → "Slogan".
- **Footer PDF reusable**: `src/lib/finance/pdf/efeonce-pdf-footer.tsx` (`EfeoncePdfFooter`) — footer institucional canónico de **todos** los PDFs Efeonce (entidad · RUT + dirección + `efeoncepro.com` + generado/página). Lleva **solo identidad legal/contacto**; el eslogan va en la brand-zone, no acá. PDFs nuevos reusan este footer, no rollean uno propio.
- `project_context.md` — estado vigente del repo, stack, decisiones y restricciones; leer primero su sección "Estado vigente para agentes"
- `Handoff.md` — cabina de mando activa: trabajo en curso, riesgos y próximos pasos
- `Handoff.archive.md` — caja negra histórica; usar para auditoría de resoluciones sin tratar entradas antiguas como contrato vigente
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md` — regla canónica para navegar `project_context.md`, `Handoff.md` y `Handoff.archive.md` sin perder auditoría ni inflar el handoff activo
- `docs/tasks/README.md` — pipeline de tareas `TASK-###` y legacy `CODEX_TASK_*`
- `docs/issues/README.md` — pipeline de incidentes operativos `ISSUE-###`
- `docs/architecture/` — specs de arquitectura canónicas (30+ documentos)
- `docs/documentation/` — documentación funcional de la plataforma en lenguaje simple, organizada por dominio (identity, finance, hr, etc.). Cada documento enlaza a su spec técnica en `docs/architecture/`
- `docs/manual-de-uso/` — manuales prácticos por dominio para usar capacidades concretas del portal paso a paso, con permisos, cuidados y troubleshooting
- `docs/audits/` — auditorías técnicas y operativas reutilizables. Úsalas frecuentemente cuando trabajes una zona auditada, pero antes de confiar en ellas verifica si sus hallazgos siguen vigentes o si el sistema requiere una auditoría nueva/refresh.
- `docs/operations/` — modelos operativos (documentación, GitHub Project, data model, repo ecosystem)
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md` — politica canonica de ADRs: cuando una decision requiere ADR, donde vive, lifecycle append-only y gate para tasks.
- `docs/architecture/DECISIONS_INDEX.md` — indice maestro de decisiones arquitectonicas aceptadas; buscar aqui antes de proponer o cambiar contratos compartidos.
- Fuente canónica para higiene y rotación segura de secretos:
  - `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- Fuente canónica para trabajo multi-agente (Claude + Codex en paralelo):
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` — incluye higiene de worktrees, `rebase --onto`, `force-push-with-lease`, CI como gate compartido, squash merge policy, background watcher pattern para auto-merge sin branch protection
- Regla dura de convivencia: en un checkout compartido, el WIP `untracked`/unstaged de otro agente es estado vivo. No usar `git stash -u`, `git clean`, `git restore`, moves ni pathspecs amplios para apartarlo y pasar hooks. Si bloquea tu push, coordina con el owner, usa worktree propio o pide bypass explícito ya verificado.
- Fuente canonica para calidad de solucion:
  - `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` — regla anti-parche: causa raiz, primitives canonicas, resiliencia, seguridad, escalabilidad y workaround solo temporal/documentado
- Convenciones de skills locales:
  - Claude: `.claude/skills/<skill-name>/SKILL.md` (convencion oficial vigente; existen skills legacy en `skill.md` minuscula)
  - Codex: `.codex/skills/<skill-name>/SKILL.md` (mayuscula)
- Mockups Greenhouse: invocar `greenhouse-mockup-builder` para cualquier mockup/prototipo visual. Por defecto deben ser rutas reales del portal con mock data tipada (`src/app/(dashboard)/.../mockup/page.tsx` + `src/views/greenhouse/.../mockup/*`), usando Vuexy/MUI wrappers y primitives del repo; no HTML/CSS aparte salvo pedido explicito de artefacto estatico.

## Skill obligatoria: greenhouse-finance-accounting-operator

**INVOCAR SIEMPRE** la skill `greenhouse-finance-accounting-operator` (ubicada en `.claude/skills/greenhouse-finance-accounting-operator/SKILL.md` + global `~/.claude/skills/`) ANTES de:

- Tocar cualquier módulo de **finanzas** (`/finance/*`, `src/lib/finance/`, `src/app/api/finance/*`, `greenhouse_finance.*` schema): bank, cash-out, cash-in, expenses, income, suppliers, payment_orders, reconciliation, account_balances, settlement_legs, OTB declaration.
- Tocar cualquier módulo de **costos / cost intelligence** (`src/lib/commercial-cost-attribution/`, `src/lib/finance/postgres-store-intelligence.ts`, member-period attribution, client_economics, labor allocation, CCA shareholder accounts, loaded cost models, ICO economics).
- Tocar cualquier flujo **fiscal/tributario** (Chile SII, DTE, IVA débito/crédito, F22/F29, retenciones honorarios 14.5%, gastos rechazados Art 21, Capital Propio Tributario, ProPyme/14A regime, gratificación legal, indemnización años servicio).
- Tocar cualquier flujo de **payments / treasury** (cashflow forecast, working capital, FX hedging, payment rails ACH/SEPA/SWIFT/PIX, factoring, invoice discounting, internal_transfers, fx_pnl_breakdown, account_balance materialization).
- Tocar **P&L / reporting / KPIs financieros** (revenue recognition ASC 606/IFRS 15, EBITDA quality, gross margin, contribution margin, unit economics CAC/LTV, variance analysis, budget vs actual, FP&A).
- Tocar **cierre mensual / period close / reconciliation** (trial balance, accruals, deferrals, bank rec, intercompany matching, audit trail).
- Tocar **internal controls / audit / compliance** (COSO, SOX, segregation of duties, materiality ISA 320, fraud detection, going concern, Ley 20.393 MPD, UAF reporting, gobierno corporativo).
- Tocar **economic_category** (TASK-768), **expense_payments_normalized** (TASK-766), **account_balances FX** (TASK-774), **OTB cascade** (TASK-703), **payment orders bank settlement** (TASK-765), **fx_pnl_breakdown** (TASK-699), **internal_account_number** (TASK-700).

**Triggers léxicos** que disparan la invocación: "audit", "audita", "P&L", "EBITDA", "cashflow", "balance", "cierre", "conciliación", "IVA", "DTE", "factura", "boleta", "honorarios", "gratificación", "indemnización", "SII", "F22", "F29", "PPM", "retención", "gasto rechazado", "leasing", "depreciación", "amortización", "provisión", "deferred", "accrual", "revenue recognition", "5 pasos", "ASC 606", "IFRS 15", "IFRS 16", "IAS 7", "COSO", "SOX", "segregation of duties", "materiality", "going concern", "fraud triangle", "Benford", "ABC costing", "throughput", "standard costing", "absorption", "direct costing", "variance", "DSO", "DPO", "DIO", "CCC", "working capital", "13-week forecast", "hedge", "forward", "natural hedging", "factoring", "supply chain finance", "letter of credit", "cost-plus", "value-based", "retainer", "fixed-fee", "T&M", "loaded cost", "utilization rate", "realization rate", "CAC", "LTV", "payback", "unit economics", "ROIC", "ROE", "FCF", "CFO", "EBIT", "NOPAT", "WACC", "due diligence", "transfer pricing", "TP", "MPD", "PEP", "lavado activos", "cohecho", "auditor externo", "CPA", "Big-4", "qualified opinion", "adverse opinion", "going concern", "restatement", "impairment", "fair value", "mark-to-market", "MTM", "hedge effectiveness", "OCI", "comprehensive income".

**Razón**: la skill combina IFRS / US GAAP / Chile NIIF / COSO / ISA / AICPA con runtime Greenhouse (helpers canónicos, VIEWs, reliability signals). Sin invocarla: alto riesgo de violar contratos canónicos (TASK-766/768/774/703), recomendar tratamientos contables incorrectos, perder material de framework, o no escalar a CPA/auditor cuando corresponde.

**Cuándo NO invocarla**: tareas de plumbing puramente técnico sin razonamiento contable (ej. "qué endpoint usa esta vista" → `greenhouse-backend`; "ajusta este chart de Apex" → `greenhouse-ux`). Si la pregunta combina técnico + contable, invocar AMBAS.

**Sinergia con otras skills**:

- Si toca **payroll** (cálculo nómina, AFP/Salud/SIS, indemnizaciones runtime): combinar con `greenhouse-payroll-auditor`.
- Si toca **HubSpot bridge** (CCA, products, deals): combinar con `hubspot-greenhouse-bridge`.
- Si toca **PostgreSQL** queries finance: combinar con `greenhouse-postgres`.
- Si toca **Cloud Run** ops-worker (reactive consumers finance, projection refresh): combinar con `greenhouse-cron-sync-ops`.
