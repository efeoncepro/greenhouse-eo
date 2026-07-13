# Licitación SKY — Servicio de Producción de Contenido Blog (Wherex, 2026)

> # ⚠️ Dónde vive qué (corregido 2026-07-12)
>
> **La licitación SE TRABAJA EN EL REPO.** Antes este README decía que los entregables vivían en OneDrive
> y **no se duplicaban al repo** — el miedo era correcto (*dos copias de un documento contractual terminan
> en entregar la versión equivocada*) pero **la solución era la equivocada**, y el riesgo se materializó:
> la oferta técnica tenía **dos artefactos editables a mano** (un `.md` y un `.html` con CSS curado) y
> **el PDF que estaba en OneDrive era de dos días antes**, sin nada de lo que se había agregado.
>
> **La regla correcta no es "una sola ubicación": es UNA SOLA FUENTE.**
>
> | | Dónde | Qué es |
> |---|---|---|
> | **FUENTE** | **este repo** (`.md` · `deck-plan.json` · `.xlsx` · las bases) | **Lo único que se edita.** Versionado, auditable, con historia |
> | **DERIVADO** | OneDrive (`.pdf`, `.html`) | **Se re-emite con un comando. NUNCA se edita a mano** |
>
> ```bash
> pnpm tender:render docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md --out .captures/sky-oferta
> pnpm deck:compose  docs/commercial/tenders/sky-blog-2026/deck-plan.json  --out .captures/sky-bid
> ```
>
> Después se copian los PDF a OneDrive, **que es de donde el operador los sube a Wherex**.
> *(Es el mismo principio del Artifact Composer: el Plan es el artefacto auditable; el PDF es derivado y
> re-componible.)*
>
> 📁 **Carpeta OneDrive (entregables, sincronizada local):**
> `~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/4. Comercial/Licitaciones/Sky Airlines/7. Blog/`
> Se lee y escribe **por filesystem** — no hace falta el conector de SharePoint.

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

### La fuente normativa — manda sobre todo lo demás

| Archivo | Qué es |
|---|---|
| [`bases/bases-licitacion-sky.docx`](bases/) + `.txt` | **Las Bases.** El `.txt` es el texto extraído: **verifica siempre contra él**, no contra la memoria. Todo requisito de formato, peso, plazo o plantilla **sale de acá**. |

### Client-facing (van a SKY) — **`.md` = FUENTE, el PDF se re-emite**

| Archivo | Qué es |
|---|---|
| [`oferta-tecnica.md`](oferta-tecnica.md) | **La oferta técnica.** Abre con la **matriz de cumplimiento** (cruza cada requisito de las Bases con la sección donde se responde) y cierra el **régimen de penalidades** aceptado. Es además el **contenido fuente del deck**. |
| [`oferta-economica.md`](oferta-economica.md) | **La oferta económica.** Cifras reales (ver abajo). |
| [`propuesta-economica.xlsx`](propuesta-economica.xlsx) | **El Excel de la económica.** ⚠️ **Es FUENTE, no derivado** (Wherex no trae plantilla, se creó a mano). Las Bases lo listan como **documento integrante** (§1.2). |
| [`deck-plan.json`](deck-plan.json) | El plan del deck — **artefacto auditable**; el PDF de 15 láminas es derivado. |
| **Radiografía AEO** (enlace vivo) | **Muestra de trabajo.** Un artículo nuevo (Carretera Austral) con **su capa de máquina visible y acoplada** al lado, más la **evidencia Semrush** de por qué existe. Es la prueba de lo que la §7 de la técnica promete. `noindex`, con rótulo *«Ejemplo ilustrativo de Efeonce»* y URL tokenizada.<br>🔗 https://think.efeoncepro.com/muestras/sky-carretera-austral-861c18cc0e37<br>Owner: `TASK-1410`. Fuente: repo `efeonce-think`. |

> ⚠️ **Antes de subir el Excel: verificar que las Bases NO impongan un formato para la económica.** El
> **Tribunal de Contratación Pública declaró ILEGAL una adjudicación** (SEREMI Magallanes, 2025) porque el
> presupuesto se presentó con el desglose del oferente **en vez del formato obligatorio de las Bases** — y
> sostuvo que **ni siquiera era subsanable**. *(SKY es Wherex = privado, así que el riesgo es contractual,
> no de nulidad. La regla se mantiene: **si las Bases traen plantilla, se usa la de las Bases**, aunque sea
> peor que la nuestra.)*

### ⚠️ INTERNOS — NUNCA van a SKY

| Archivo | Por qué es interno |
|---|---|
| [`matriz-admisibilidad-INTERNO.md`](matriz-admisibilidad-INTERNO.md) | Checklist de control + **loaded cost y piso de negociación**. Entregarlo sería darle a la contraparte tu estructura de costos. |
| [`squad-blueprint-INTERNO.md`](squad-blueprint-INTERNO.md) | **Loaded cost** del squad. |
| [`diagnostico-INTERNO.md`](diagnostico-INTERNO.md) · [`benchmark-competencia-INTERNO.md`](benchmark-competencia-INTERNO.md) | Material de trabajo; lo publicable ya está destilado en la oferta técnica. |

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
