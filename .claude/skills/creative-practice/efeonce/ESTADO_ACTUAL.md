# ESTADO ACTUAL — la línea entre la munición y el humo

> **Este es el archivo más importante de la skill.** Todo lo demás se apoya acá.
> **Verificado contra el repo y el runtime: 2026-07-13.**
>
> Un vendedor que promete una superficie que no existe **nos quema con el cliente que más nos costó ganar.**
> Antes de prometer cualquier cosa en una propuesta, un deck o una reunión: **léelo acá.**

**Leyenda:** ✅ **REAL** = corre hoy con datos productivos y el cliente lo puede ver ·
🟡 **GATED** = el código existe, falta flip/rollout ·
🔴 **HUMO** = spec, infra vacía o superficie inexistente. **No se promete.**

---

## 1. Métricas de delivery — lo que el cliente VE en su login

### ✅ REAL — se calculan, se materializan y se renderizan en el portal cliente

Vista: `/analytics` (viewCode `cliente.analytics`) — comparativa por proyecto + tendencia mensual.
Registry: `src/lib/ico-engine/metric-registry.ts`.

| Métrica | Qué le dices al cliente | Umbral óptimo |
|---|---|---|
| **RpA** — Rendimiento por Activo | *"Cuántas rondas de cambio necesita cada pieza. Menos es mejor."* | 0 – 1,5 *(atención 1,5-2,5 · crítico >2,5)* |
| **OTD%** — Entrega a tiempo | *"Qué porcentaje de lo comprometido salió en fecha."* | 90 – 100% |
| **FTR%** — Primera entrega correcta | *"Qué porcentaje pasó sin rondas finales de cambio."* | 80 – 100% |
| **Cycle Time** | *"Cuántos días desde que entra el brief hasta que sale la pieza."* | 0 – 7 días |
| **Throughput** | *"Cuánto volumen completamos en el mes."* | política interna |
| **Stuck Assets** | *"Qué está trabado más de 72h — y por qué."* | steady 0 |

🎯 **El diferenciador que casi nadie tiene y que hay que usar SIEMPRE:** cada métrica lleva una
**política de confianza** (`src/lib/ico-engine/metric-trust-policy.ts`): tipo de benchmark, sample size
mínimo (10) y `qualityGateStatus` (healthy / degraded / broken).

> **El portal declara cuándo un número NO es confiable, en vez de pintarlo bonito.**
> Frente a un comité de compras, **eso es más defendible que cualquier dashboard perfecto** — porque un
> dashboard que nunca falla es un dashboard en el que nadie cree.

### ✅ REAL pero interno — existen, pero NO están en la vista cliente
`Cycle Time Variance` · `Pipeline Velocity` · `CSC Distribution` · `Stuck %` · `OCF`.
Sirven para el **discurso** (*"medimos saturación y previsibilidad"*), **no para prometer un dashboard.**

### 🔴 HUMO — NO se prometen

| Métrica | Estado real |
|---|---|
| 🔴 **BCS — Brief Clarity Score** | **Infrastructure-ready, DATA-EMPTY.** Hay 412 líneas de helper (`brief-clarity.ts`) y el backend de AI scoring está **pendiente**. **No produce datos.** ⚠️ **Y ojo:** el pitch de ICO (`docs/context/07_ico.md:52`) dice *"sin BCS mínimo no entra a producción"* — **eso hoy no es cierto en producto.** Si lo dices en una reunión, estás prometiendo un gate que no existe. |
| 🔴 **TTM — Time to Market** | Helper implementado, pero per-campaign, **sin registry ni writeback.** No es un KPI de dashboard. |
| 🔴 **Revenue Enabled** | Narrativo. **No es una métrica materializada.** |
| 🟡 **CT SLO%** | Detrás de flag. |
| 🟡 **Attributable Lateness** ("atraso imputable") | **Accepted (shadow).** El flag se prendió marcado **⚠️ ALTO RIESGO** sin los ≥30d de shadow ni sign-off. **No lo vendas como métrica madura** — y es justamente la más peligrosa de prometer, porque *asigna culpa*. |

### ⚠️ Writeback a Notion (el cliente lo ve en SU Notion)
RpA v2 productivo (`[GH] RpA v2`). Los flags `NOTION_*_WRITEBACK_ENABLED` fueron prendidos, **pero los flags
del ops-worker son efímeros**: el próximo push a develop puede resetearlos.
🔴 **Verifica ANTES de demostrarlo en vivo.** *(Ver el ledger de flags.)*

---

## 2. Portal cliente — qué rutas existen de verdad

### ✅ REAL (verificado: la página existe)

`/home` (Pulse) · **`/analytics` ← el pitch** · `/proyectos` · `/sprints` · `/reviews` · `/equipo`
(roster asignado con perfiles) · `/campanas` · `/updates` · `/notifications` · `/settings` ·
`/aeo` (informe AI Visibility del cliente).

### 🔴 HUMO — viewCodes sembrados SIN página. **NO existen. NO se muestran.**

**`creative-hub`** · **`roi-reports`** · **`exports`** · **`cvr-quarterly`** · **`staff-augmentation`** ·
**`brand-intelligence`** · **`csc-pipeline`** · **`crm-command`** · **`web-delivery`** · **`capabilities`**

> 🔴 **Están en el registry como forward-looking, pero no tienen `page.tsx`.**
> **"Creative Hub" es exactamente el nombre que un vendedor de creativo querría decir en un pitch — y es
> exactamente el que no existe.** Si lo prometes, el día del onboarding el cliente abre el menú y no está.

### ⚠️ La verdad incómoda sobre la adopción
`docs/context/08_estrategia-comercial.md:92` declara: **"% de clientes con login Greenhouse activo: 0% → meta
100%"**. El gap admitido de ASaaS **no es tecnología: es self-service del cliente (55%) y monetización por
tiers (60%)**. Madurez declarada: **~77%**.

🎯 **Traducción comercial honesta:** *el portal existe y se demuestra en vivo* ✅ ·
🔴 *"todos nuestros clientes ya lo usan"* — **NO se dice.**

**Y el corolario operativo:** si vendes el portal, **el onboarding al portal es parte del cierre**, no un
"nice to have" post-venta. Un cliente que nunca entra al login **no percibe el switching cost**, y en la
renovación te compara por precio como si fueras cualquiera. → `modules/12_RETENCION_EXPANSION.md`.

---

## 3. Economía — qué sabemos costear de verdad

### ✅ REAL — el cotizador, y es serio

`src/lib/finance/pricing/pricing-engine-v2.ts` — **NO está detrás de flag.**

- **Cost stack por línea:** `unitCostUsd`, `totalCostUsd`, `costBasisKind`, `costBasisSourceRef`,
  `costBasisSnapshotDate`, y **`costBasisConfidenceScore` + `costBasisConfidenceLabel`**.
  🎯 **El cotizador sabe de dónde salió el costo y qué tan confiable es.** Casi ninguna agencia sabe eso.
- **`suggestedBillRate`** derivado del loaded cost.
- **`target_margin_pct` + `margin_floor_pct`** persistidos en la cotización.
- **`margin-health.ts` + `tier-compliance.ts`**: alertan/bloquean si la línea rompe el piso.
- Sellable roles con `loaded_monthly_cost_usd` / `loaded_hourly_cost_usd`.
- **Cotización pública compartible con token:** `/public/quote/[id]/[version]/[token]`.
- Cierre Quote-to-Cash canónico (`COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED`): **ON en producción.**

✅ **Qué puedes prometer:** *"Cotizamos con el costo cargado real del equipo, no con un precio de lista
inventado — y el sistema bloquea si rompemos nuestro piso de margen."* **Es verificable.**

### 🔴 HUMO — el Member Loaded Cost Model
`GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md:13` dice, literal: **"Status implementación: SPEC — no
implementado."** El modelo dimensional canónico (miembro = átomo de costo, snapshots inmutables, overhead
policies) **no está construido.** 🔴 **No lo cites como capacidad.**

### 🩸 HALLAZGO ABIERTO — el loaded cost del squad podría estar subestimado

El squad blueprint de SKY declara **loaded delivery ≈ CLP 2,26M/mes** para 2,2 FTE, y lo computa como
**`% dedicación × costo del rol en nómina`**.

🩸 **La pregunta que hay que responder antes de la próxima cotización: ¿ese "costo de nómina" es el sueldo
bruto, o el costo empresa?**

Si es **sueldo bruto**, le falta: cargas sociales (en Chile, el costo empresa es ~**1,25–1,3×** el bruto),
herramientas/licencias, y overhead no facturable. El loaded real estaría más cerca de **CLP 2,9–3,0M**.
Y entonces:

| | Con loaded 2,26M | 🩸 Si el loaded real fuera ~2,94M |
|---|---|---|
| Piso a 45% de margen | **CLP 4,11M** | **CLP 5,35M** |
| Piso con buffer 12% | **CLP 4,60M** ← el vigente | **CLP 5,99M** |
| Margen real cerrando a **5,2M** (precio de lista) | 56,5% ✅ | 🔴 **43,5% — bajo el piso** |

> 🩸 **Si la hipótesis es correcta, el precio de lista de SKY (5,2M) está prácticamente EN el piso, no
> holgadamente arriba. Y el "margen de negociación" que creemos tener no existe.**

🔴 **Acción antes de cotizar el próximo squad creativo:** confirmar con
**`greenhouse-finance-accounting-operator`** qué incluye exactamente el `loaded_monthly_cost_usd` de
`sellable-roles-store`. **No es un detalle contable: define si podemos descontar o no.**
→ `modules/04_PRICING.md` § 3.

### ✅ REAL — la base de costo creativa (del squad SKY)

Roles creativos con costo real de nómina, **mensual a 100% de dedicación**:

| Rol | Costo declarado |
|---|---|
| Creative Operations Lead *(dirección creativa / QA de marca)* | **USD 1.250** |
| Senior Visual Designer | **USD 800** – **USD 927** |
| Creative Social Media Strategist | **USD 800** |
| Creative Copywritter | **CLP 650.000** |
| Creative Content Creator | **USD 327** |

🔴 **Estos números son INTERNOS. Nunca, bajo ninguna circunstancia, llegan al cliente.**
→ `ANTIPATTERNS.md` § "El pecado del arbitraje".

---

## 4. Sample Sprints — ✅ REAL, y es la mejor puerta de entrada que tenemos

Runtime: `src/lib/commercial/sample-sprints/` · ruta `/agency/sample-sprints`.
Cada sprint es un `greenhouse_core.services` con `engagement_kind != 'regular'`.

**4 subtipos:** Operations Sprint (`pilot`) · Extension Sprint (`trial`) · Validation Sprint (`poc`) ·
Discovery Sprint (`discovery`).

Gobernanza real que **sí** puedes mostrar:
- Workflow de aprobación (`commercial.engagement.approve`), con override justificado si el equipo queda
  sobre capacidad.
- **Snapshots semanales de progreso + costo REAL** (desde la VIEW canónica de cost attribution, no estimado).
- Outcome terminal; si convierte, **lineage** transaccional al servicio regular.
- **Guard anti-zombie en DB:** un sprint activo >120d sin outcome **es rechazado**; alerta a los 90d.
- **Degradación honesta:** la projection declara en banner cuándo una fuente está caída, en vez de mostrar
  números falsos.

🎯 **El pitch:** *"Te vendemos un sprint acotado, y lo operamos con la misma gobernanza, el mismo costeo real
y la misma trazabilidad que un contrato grande. Si convierte, hay lineage. Si no, hay un outcome documentado
— y te quedas con el diagnóstico."*

---

## 5. El abrelatas más limpio que tenemos hoy — ✅ REAL

**AI Visibility Grader** (`src/lib/growth/ai-visibility/`). **ON en Vercel Production.**
7 dimensiones ponderadas: AI Visibility 25 · Entity Clarity 15 · Category Ownership 15 · Competitive SoV 15
· Citation Quality 15 · Message Alignment 10 · Revenue Intent Coverage 5.

**Ya produjo un informe real, público y citable para SKY** (overall **73,3** / citation quality **90,9**),
verificado en vivo — **y ese informe se citó dentro de la propuesta de la licitación.**

🎯 **Es prueba, no humo:** un diagnóstico propietario, corrido sobre el prospecto real, publicado, con URL.
⚠️ **Pero es un abrelatas de *visibilidad*, no de *creatividad*.** Para un deal puramente creativo (marca,
KV, campaña) **no es la cuña correcta** — abre la puerta, pero no prueba que sepamos diseñar.
**La cuña creativa hay que construirla.** → `modules/06_CUNA.md`.

---

## 6. Casos citables — la verdad

| Caso | Qué se puede decir |
|---|---|
| **SKY** *(performance)* | ✅ **Cliente real y vigente.** Efeonce ya opera un equipo de performance para SKY. Informe AI Visibility público y citable. ⚠️ **No es trabajo de creatividad de marca.** |
| **SKY** *(blog — Wherex)* | 🔴 **OFERTA EN CURSO, NO ADJUDICADA.** Los CLP 5,2M/mes y el TCV de 124,8M/2años son **el precio que ofertamos**, no un contrato ganado. **NUNCA lo cites como caso, ni como cliente del blog, ni como TCV asegurado.** Es **expansión** de una cuenta existente, no cliente nuevo. |
| **Bresler** | ✅ **+180% de tráfico orgánico** *(dato duro, citable)*. ⚠️ Es SEO, no creativo. |
| **Berel** | ✅ Cliente real. |
| 🔴 **Casos creativos con métrica de negocio verificable + autorización del cliente** | 🔴 **Hoy: no hay ninguno formalizado.** |

> 🔴 **Esta es la debilidad estructural de la práctica creativa hoy: tenemos trabajo, pero no tenemos CASOS.**
> Un caso no es un lindo mockup en un deck. Es: **métrica verificable + relación sana + autorización escrita.**
>
> 🎯 **Y por eso, mientras no los tengamos, el peso de la prueba lo cargan otras dos cosas — y tienen que
> estar impecables: (1) el método (que se vea que sabemos operar) y (2) la telemetría (que se vea que
> cumplimos).** → `modules/07_PRUEBA.md`.
>
> **Acción permanente:** cada engagement creativo que cierre debe salir con un `templates/caso-estudio.md`
> iniciado **el día 1**, no rescatado al final. La autorización se pide **en el contrato**, no un año después.

---

## 7. Motor de propuestas — ✅ REAL con matices

**Artifact Composer** (`src/lib/artifact-composer/`): motor domain-free. El autor **nunca elige template**;
solo un `ResolvedCompositionManifest` inmutable llega al render. Gate visual a **cero píxeles** de drift.

Produce hoy: **deck/PDF** (`pnpm deck:compose`) · **oferta técnica en PDF** (`pnpm tender:render`).
Verificado E2E en staging: **15 láminas en 25,2s** al primer intento.

⚠️ **Los límites:**
- **NO hay UI de dashboard** para el Proposal Studio. Se opera por API, CLI y Nexa.
- `ARTIFACT_RENDER_JOBS_ENABLED`: **staging ON, producción OFF.** Hoy en prod **solo el CLI local**.
- `NEXA_PROPOSAL_ACTIONS_ENABLED`: staging ON, **prod OFF**.

🔴 **Regla del repo:** **la fuente es el repo** (`.md` + `deck-plan.json` + `.xlsx`). El PDF en OneDrive es
**derivado** y se re-emite con un comando. **NUNCA se edita a mano.** *(Ya nos quemamos: el PDF en OneDrive
era de dos días antes que la fuente.)*

---

## Resumen de una página — para pegar en la pared

### ✅ PROMETE (es verificable hoy)
1. Login al portal con **RpA, OTD%, FTR%, cycle time, throughput, stuck assets** por proyecto, con tendencia
   — **y con política de confianza que declara cuándo un número no es fiable.**
2. Cotización con **costo cargado real + piso de margen bloqueante**, compartible por link con token.
3. **Sample Sprint** como entrada acotada: aprobación, costo real, anti-zombie, lineage a contrato.
4. **Squad dedicado dimensionado en FTE**, con roles, seniority, dedicación, jerarquía y RACI.
5. **Diagnóstico AI Visibility** del prospecto: 7 dimensiones, publicado, citable, con URL.
6. Propuesta y deck generados desde **una sola fuente versionada** (cero drift).

### 🔴 NO PROMETAS (es humo, y te va a explotar en el onboarding)
1. **Brief Clarity Score** operando *(data-empty — y el gate "sin BCS no entra a producción" no existe)*.
2. **Creative Hub · ROI Reports · Exports · CVR trimestral** en el portal *(viewCodes sin página)*.
3. **Revenue Enabled / TTM** como métricas de dashboard.
4. El **Member Loaded Cost Model** dimensional *(es spec, no está implementado)*.
5. Que **todos los clientes ya usan el portal** *(login activo declarado: 0%)*.
6. Las **cifras de fricción de ICO** *(21 hrs/sem, 68%, 30% — sin auditoría de fuente)*.
7. **Casos creativos** con métrica de negocio *(hoy no hay ninguno formalizado)*.
