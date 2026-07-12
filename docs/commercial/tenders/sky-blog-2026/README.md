# Licitación SKY — Servicio de Producción de Contenido Blog (Wherex, 2026)

> **Este archivo es el ÍNDICE, no una copia.** Los entregables viven en OneDrive (sincronizado local) —
> **NO se duplican al repo**: dos copias de un documento contractual terminan en entregar la versión
> equivocada. El repo guarda el índice (para no redescubrir la carpeta cada sesión) y el `deck-plan.json`
> (que sí es artefacto de código, auditable y re-componible).
>
> 📁 **Carpeta canónica (local, sincronizada):**
> `~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/4. Comercial/Licitaciones/Sky Airlines/7. Blog/`
>
> Se lee y escribe **por filesystem** — no hace falta el conector de SharePoint.
> Última verificación: **2026-07-12**.

---

## ⚠️ Lo primero que tienes que saber

| | |
|---|---|
| **Entrega** | **15/07/2026.** ✅ **RESUELTO por el operador (2026-07-12): el proceso SIGUE ABIERTO y cierra el 15.** La contradicción de las bases (§2.2 dice 15/07, §2.8 dice *"apertura de ofertas 10 de julio 16:00"*) **queda zanjada: manda el 15.** No volver a levantarla. |
| **Plataforma** | Wherex (las comisiones del adjudicado las absorbe Efeonce) |
| **Excluyente único** | No tener demandas contra SKY → ✅ **confirmado 2026-07-11** |
| **Deal HubSpot** | `62535094842` · Company `Sky Airlines` (`30825221458`) · TCV **CLP 124.800.000** (2 años) |

---

## Qué falta para poder entregar

| # | Entregable | Estado |
|---|---|---|
| 1 | **Deck de la propuesta** — la propuesta **se presenta en un deck** | ✅ **15 láminas, PDF 3.5 MB** — pendiente de ajustes visuales |
| 2 | Subir a Wherex | ⏳ **Operador** (regla dura: el agente prepara; el humano sube y firma) |
| — | Oferta técnica (PDF) | ✅ 2026-07-11 |
| — | Oferta económica (PDF) | ✅ 2026-07-11 |
| — | Planilla Excel de la económica | ✅ creada (Wherex no tiene plantilla) |
| — | Línea "Desembolsos: no aplican" (mínimo §3.2) | ✅ ya está en la económica |

> ⚠️ **Antes de subir el Excel, verificar que las bases NO impongan un formato para la económica.**
> En Chile, el **Tribunal de Contratación Pública declaró ILEGAL una adjudicación** (SEREMI de
> Educación de Magallanes, 2025) porque el presupuesto se presentó **con el desglose propio del
> oferente en vez del formato obligatorio de las bases** — y sostuvo que **ni siquiera era
> subsanable**. Si las bases traen plantilla, **se usa la de las bases, aunque sea peor que la
> nuestra.** *(SKY es Wherex = privado, así que la Ley 19.886 no aplica y el riesgo es contractual,
> no de nulidad. Pero la regla se mantiene.)*

---

## Los artefactos

### Client-facing (van a SKY)

| Archivo | Qué es |
|---|---|
| [`oferta-tecnica.md`](oferta-tecnica.md) | **La oferta técnica.** Es el **contenido fuente del deck**: diagnóstico con el grader real, escalera Be X, benchmark competitivo, método, squad, SLA. |
| [`oferta-economica.html`](oferta-economica.html) | **La oferta económica.** Cifras reales (ver abajo). |

### ⚠️ INTERNOS — NUNCA van a SKY

| Archivo | Por qué es interno |
|---|---|
| [`matriz-admisibilidad-INTERNO.md`](matriz-admisibilidad-INTERNO.md) | Checklist de control + **loaded cost y piso de negociación**. Entregarlo sería darle a la contraparte tu estructura de costos. |

> **Regla dura (`audience`):** todo artefacto del bid es **`internal`** o **`client_facing`**. **Sólo lo
> `client_facing` se empaqueta.** El squad blueprint y el diagnóstico interno llevan **loaded cost** — no
> se promueven "porque parecen útiles". Ver `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`.

---

## Las cifras reales (para el deck y el Excel — NUNCA inventar)

**Económica (CLP, neto sin IVA, sin reajuste):**

| Plan | Alcance mensual | Valor mensual |
|---|---|---|
| **Base** (propuesto) | 8 artículos/mes + SEO/AEO + multimedia + reportería | **5.200.000** |
| Ampliado (opcional) | 12 artículos/mes | 6.900.000 |
| Artículo adicional / ad-hoc | por artículo | 260.000 |

Pago 30 días desde aceptación conforme de la factura · facturación mensual · transferencia ·
**2 años** renovables (aviso 60 días) · validez **120 días** · **desembolsos: no aplican** (todo incluido).

**Diagnóstico medido (AI Visibility Grader, 5 motores, 35 respuestas):**

- Claridad de marca **100/100** · Ownership de categoría **20/100** (LATAM 16 menciones, JetSMART 9)
- **El blog de SKY: 0 citas en 35 respuestas.** Las fuentes son terceros (BioBioChile 8, YouTube 8, Instagram 8, Despegar 7, Trustpilot 7).
- **Escalera Be X:** Ser encontrada **40** · Ser legible **70** · Ser correcta **37** · Ser accionable **8** · Ser intrínseca **76**
- Informe público en vivo: `think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f`

**Semrush (el blog ya tiene tracción):** ~13.000 keywords · ~40.000 visitas orgánicas/mes.
Páginas a un paso del top 3: Antofagasta (~110.000 vol, pos. **12**) · Terminal sur Santiago (~33.000, pos. **9**) · Camboriú (~22.000, pos. **6**) · Puerto Fuy (~22.000, pos. **6**).

**Squad:** ≈ **2,2 FTE**, 9 roles con dedicación declarada (ver §10 de la técnica). **Fotos REALES** —
una cara generada con IA es **tergiversación**, no un tema estético.

---

## Cómo se compone el deck

El deck **no se dibuja**: se compone con el **Artifact Composer** desde el catálogo de 25 plantillas.

```bash
pnpm deck:compose docs/commercial/tenders/sky-blog-2026/deck-plan.json --out .captures/sky-bid
```

⚠️ **El `sky-deck-plan.json` que vive en `docs/architecture/tender-deck-composer-prototypes/examples/`
es un DEMO con cifras ILUSTRATIVAS ("UF 000"). NO es entregable.** El deck real usa las cifras de arriba.

Reglas duras del deck (ver la skill `greenhouse-public-private-tenders` → `deck-visual-system.md`):
**cifras reales o marcadas como ilustrativas, nunca fabricadas** · **fotos reales del squad, nunca IA** ·
**registro formal de usted** (es un documento contractual que evalúa un comité, no un blog).
