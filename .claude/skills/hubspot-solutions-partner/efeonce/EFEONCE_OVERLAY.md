# Overlay Efeonce — contexto de la práctica

> Estado real y plan: `ESTADO_ACTUAL.md` · `PLAN_RESCATE_6M.md`.
> Contexto de negocio canónico: `docs/context/02_gtm.md` (§ CRM Solutions y § Partnership).

---

## 1. Qué es CRM Solutions dentro de Efeonce

✅ **La 5.ª línea de negocio, y es transversal** (`docs/context/02_gtm.md:29-54`).
No es un producto: es una **práctica** que atraviesa a las otras cuatro unidades.

| Capa | Qué es | Revenue | Motor de tier |
|---|---|---|---|
| **1 · Licencias** | Venta y gestión como Solutions Partner | **Referral fee 20% + margen** | **Sourced** |
| **2 · Implementación** | Onboarding, migración, pipelines, properties, workflows, integraciones, training. **Deployment programático con Kortex** | Proyecto on-demand — **el margen real** | — |
| **3 · Managed CRM Ops** | Operación continua post-implementación. Vive en **Greenhouse** (dashboard del cliente) + Kortex | **Retainer** | **Managed — el piso** |
| **4 · CRM Intelligence** | CRM Advisor, auditorías, scoring, recomendaciones | Premium tier | Habilita expansión |

**Flywheel:** licencia → implementación (Kortex) → managed ops (Greenhouse) → intelligence (Kortex) →
contenido (Verk) → **expansión de licencia**.

🔴 **La capa 3 es la que está en cero.** Y es exactamente la que impide caer. → `modules/03_MOTOR_LIBRO.md`.

---

## 2. El partnership

| Dato | Valor |
|---|---|
| **Tier** | **Gold** — válido hasta 2027-01-15 |
| **Antigüedad** | ~2 años en el programa (Gold alcanzado en 2025) |
| **PDM** | **Simón Suárez** — ssuarez@hubspot.com |
| **Portal** | **48713323** · Owners: Julio (75788512), Luis/BDR (86856220) |
| **Pipeline** | **"HubSpot Shared Selling"** — deal registrations co-vendidos. **Ya existe, no se modifica** (`docs/context/11_hubspot-bowtie.md:21`) |
| **Win rate del canal partner-led** | ✅ **40-50% histórico** (`docs/context/02_gtm.md:111`) |
| **Suscripción propia** | USD 412/mes — ⚠️ **12 dólares sobre el umbral del waiver** |
| **Listing** | [ecosystem.hubspot.com/marketplace/solutions/efeoncepro](https://ecosystem.hubspot.com/marketplace/solutions/efeoncepro) — 🔴 **0 reviews** |

### 🔴 El anti-caso: Berel
**Berel (México) se cerró directo, sin co-selling de HubSpot y sin involucrar a Simón**
(`docs/context/02_gtm.md:113`, `01_quienes-somos.md:86`).
**No mezcles ese caso con el partnership.** No es evidencia de que el canal partner-led funcione, ni de que
no funcione. Es un cierre directo, y punto.

### Properties del CRM propio ✅
`prospect_source` incluye **"HubSpot Partner"** · `modalidad_venta` incluye **"Partnership"**
(`docs/context/11_hubspot-bowtie.md:45-47`).
**Úsalas.** Un deal partner-led que no está marcado como tal es un deal que no puedes medir.

---

## 3. Los activos propios — lo que ningún otro partner tiene

| Activo | Qué es | Cómo se usa comercialmente |
|---|---|---|
| 🎯 **AI Visibility Grader** | `src/lib/growth/ai-visibility/**` — 7 dimensiones, multi-motor, brand-aware | **La cuña.** Diagnóstico gratis y verificable antes de vender nada → `modules/07` |
| **Kortex** | CRM Intelligence sobre HubSpot. **Deployment programático.** Rumbo al **HubSpot Marketplace (B2B2B hacia agencias)** | El audit como caballo de Troya. Y el diferenciador de implementación |
| **Greenhouse** | El dashboard donde el cliente ve su operación | La capa 3 hecha producto |
| **Verk** | Contenido | El eslabón del flywheel |
| **Dogfooding** | Efeonce **corre su propia operación** sobre HubSpot + Greenhouse | *"Le muestro nuestro portal real, no una demo."* **Un competidor no puede copiar eso en una reunión** |

---

## 4. Mercados

**Efeonce vende a todo el mundo, segmentado por mercado.** El país es **dato**, no doctrina.
→ Método: `modules/06_MAPA_DE_DEMANDA.md`. Perfiles: `markets/`.

- **Oficinas**: Providencia (Chile) · Bogotá (Colombia).
- **Declarado en el listing**: APAC, EMEA, Norteamérica, Sudamérica — ⚠️ **con el listing solo en español**.
- ✅ **LATAM es growth market** → multiplicador **×2** en todos los puntos.
  ✅ **LATAM lo es (×2).** Hecho establecido — no volver a preguntarlo.
- 🔴 **Chile no tiene demanda de categoría** (`hubspot partner` = 20/mes). **El canal es outbound +
  partner-sourced + AEO.** → `markets/CL.md`.
- ✅ **México sí tiene demanda de problema** (`crm para empresas` = 1.600/mes). → `markets/MX.md`.

---

## 5. Fronteras dentro de Efeonce

| Skill | Relación |
|---|---|
| **`commercial-expert`** (overlay Greenhouse) | La **doctrina ASaaS**, el bow-tie, los playbooks por `client_kind`, el ICP Globe. **Manda el método.** Esta skill llena el puntero roto de su `SKILL.md:119` |
| **`gtm-architect`** | Decide el motion. Esta skill provee el contenido de su `motions/partner-led.md` (declarado y vacío) |
| **`hubspot-ops`** | Opera el portal 48713323. ⚠️ **Vive en `~/.claude/` — fuera de git, invisible para Codex.** Debería migrarse al repo |
| **`hubspot-greenhouse-bridge`** | Infraestructura del bridge. Sin relación comercial |
| **`seo-aeo`** | Dueña del método AEO. La cuña la **consume** |
| **`greenhouse-ai-image-generator`** | Los providers LLM del grader |
| **`efeonce-agency`** | El contexto de la agencia |

🔴 **Frontera obsoleta que hay que corregir:** el overlay de `digital-marketing` dice
*"HubSpot es CRM-only in-repo. No asumas un módulo de campañas HubSpot."*
Eso sigue siendo cierto **para el runtime del repo**, pero ya **no** describe el negocio:
**HubSpot ahora es también un producto que Efeonce vende.**

---

## 6. Estilo

- **Español neutro latinoamericano.** Sin voseo rioplatense.
- **Cliente enterprise → trato formal de usted.** Formal ≠ frío. → `feedback_tender_formal_register`.
- **Copy visible** → `greenhouse-ux-writing` + `copywriting`.
- **Decks** → `deck-studio`. **Nunca** pintes láminas dentro de esta skill.
