# Workspace de una licitación/propuesta — el "DSR interno"

> **Tipo:** Contrato de estructura (convención de carpeta). **Scaffolding:** `pnpm tender:new <slug>`.
> **Contexto:** es el **F0 del Digital Sales Room** — primero el workspace interno del deal; el DSR
> externo del comprador (Trumpet-style) es una **proyección** posterior de sus artefactos
> `client_facing`. Ver `../../architecture/GREENHOUSE_DIGITAL_SALES_ROOM_{DECISION,ARCHITECTURE}_V1.md`.

## Qué es (y qué NO es)

El "DSR interno" **no es un sistema nuevo** — son dos capas que ya existían, ahora canonizadas:

- **El taller (fuentes)** = esta carpeta, en git. Donde el equipo/agente **itera** idea,
  investigación, evidencia, narrativa y el plan del deck. Archivos de texto, git-diff, review.
- **El registro gobernado (salidas + estado)** = el aggregate `Proposal` (DB + GCS): los PDF
  renderizados versionados por `kind`, el snapshot de la quote, el estado del deal. Su cara es el
  portal `/admin/commercial/proposals` (TASK-1413).

**La `Proposal` NO es un doc dentro de la carpeta — es el contenedor.** Los docs de acá son sus
miembros; el aggregate referencia esta carpeta por `proposal_id`.

**Decisión de arquitectura (2026-07-15):** las **fuentes** (`oferta-tecnica.md`, `deck-plan.json`,
`oferta-economica.md`) **se quedan como archivos git del repo — NO se vuelven `proposal_assets`**.
Razón: conservan git-diff/review y el composer las lee directo; meterlas a la DB perdería eso y no
suma nada hoy. El aggregate guarda las **salidas** (los PDF) y **referencia** la carpeta. Reversible:
si algún día se quieren las fuentes en la DB, es una migración aditiva.

## Estructura canónica

```
docs/commercial/tenders/<slug>/
  README.md                        # índice del deal: proposal_id · estado · deadline · qué falta
  proposal-studio.json             # estado durable del registro gobernado + evidencia de cierre
  bases/                           # 📁 fuente normativa: RFP, bases admin/técnica/económica, aclaraciones del foro
  research/                        # 🔒 taller INTERNO: diagnóstico, benchmark, VoC, fuentes crudas
  artifact-manifest.json           # 📄 artefactos VIVOS (Radiografía, Grader report) — por ENLACE, nunca archivo
  oferta-tecnica.md                # ➡️ client-facing (narrativa + ledger de evidencia) — FUENTE
  oferta-economica.md              # ➡️ client-facing (narrativa de la económica)
  economica.json                   # 📄 input transitorio del renderer Excel; NO es el SSOT económico
  propuesta-economica.xlsx         # ➡️ entregable BRANDEADO (generado: `pnpm economica:build economica.json`)
  deck-plan.json                   # fuente de composición del deck (slots, SSOT del deck)
  anexos/                          # ➡️ administrativos: declaraciones, poderes, certificados
  squad-blueprint-INTERNO.md       # 🔒 loaded cost + piso — NUNCA se entrega
  matriz-admisibilidad-INTERNO.md  # 🔒/➡️ según pliego
```

El discriminador que manda es **audiencia**: `research/` + `*-INTERNO.md` = 🔒 nunca cruzan al
cliente; raíz (ofertas, deck, xlsx) + `anexos/` = ➡️ van al cliente. El sufijo `-INTERNO` es
convención load-bearing: un archivo así **jamás** se sube al portal del comprador.

## El manifiesto de artefactos (`artifact-manifest.json`)

SSOT de las **piezas vivas/externas** que usa el deal — las que **no** son archivos de la carpeta
(la Radiografía AEO es interactiva y vive en efeonce-think; el informe del Grader es un run). El
manifiesto guarda el **puntero + su procedencia**, no la pieza. Ata tres cosas que hoy están sueltas:
el **ledger de evidencia** (un run del Grader es fuente reproducible), el **deck** (los content-types
`artifact-showcase`/`highlight` los referencian por enlace) y el **DSR externo futuro** (ahí se
embeben/enlazan). Schema: `ARTIFACT_MANIFEST_SCHEMA.md`.

Invariante horneado: **`render: "by_link"` SIEMPRE** — una pieza viva se enlaza, **nunca** se captura
(un PNG estático mata justo lo interactivo que demuestra; la pieza se defiende sola).

## Flujo canónico del deal

```
pnpm tender:new <slug>
        │
        ▼
bases/ (cargar RFP)  →  admisibilidad + bid/no-bid  →  research/ (investigación)
        │
        ▼
oferta-tecnica.md  (ledger de evidencia + narrativa)  ←→  artifact-manifest.json
        │  autora el plan DESDE la oferta (propose→confirm)
        ▼
deck-plan.json  →  pnpm deck:compose  →  PDF
        │
        ▼
registrar como Proposal en el Studio  →  render job gobernado  →  salidas versionadas  →
proposal-studio.json (verified)  →  portal /admin/commercial/proposals
```

`pnpm deck:compose` es una herramienta de taller. El PDF que produce en `.captures/` no es un
entregable canónico ni permite cerrar el deal. El cierre debe pasar `pnpm tender:canonical-gate <slug>`.

## Flujo de construcción con Artifact Composer

Cuando la licitación requiere una presentación, el workspace debe conservar esta secuencia auditable:

```text
intake + evidencia
      ↓
taxonomía del desafío y audiencia
      ↓
narrativa de la oferta técnica
      ↓
deck-plan.json (intención y slots)
      ↓
assets / mockups / artefactos vivos
      ↓
pnpm deck:compose
      ↓
auditoría visual sobre el PDF
      ↓
pruebas, consistencia oferta↔deck↔económica y cierre humano
```

La plantilla se selecciona por intención (`contentType`), no por gusto visual. El deck es una proyección
de la oferta técnica: cada lámina debe responder una pregunta del comprador y dejar claro qué es evidencia,
qué es un mockup conceptual y qué es una pieza viva.

### Audiencia de los artefactos

- **Artefacto vivo:** Radiografía AEO, informe ejecutado del Grader o dashboard navegable. Tiene URL,
  procedencia y fecha; se referencia por enlace mediante `artifact-manifest.json`.
- **Mockup conceptual:** representación de cómo funcionará una herramienta o dashboard para el cliente.
  Es un asset del deck, no evidencia de resultados; debe rotularse como conceptual y no mostrar cifras
  ficticias como si fueran mediciones.
- **Asset de composición:** imagen, logo, wireframe o ilustración que explica la propuesta. Se inspecciona
  sobre el fondo real y se verifica su transparencia, bordes y legibilidad.

La auditoría visual es obligatoria: revisa la salida PDF completa, no solo el JSON. Debe comprobar jerarquía,
continuidad narrativa, safe areas, legibilidad, logos, alpha, fotos reales del equipo, claims y enlaces.
La salida del composer nunca sustituye la revisión humana.

## La oferta económica en Excel (brandeada, no a mano)

Hay clientes que **exigen Excel** (documento integrante de las bases). El `.xlsx` **no se mantiene a
mano** (se desincroniza). El cálculo y las condiciones comerciales pertenecen a la versión de cotización y
al paquete económico congelado en Greenhouse. `economica.json` es hoy un **input transitorio del renderer
local**: mientras no se genere desde `ProposalEconomicProjection`, requiere reconciliación y aprobación
contra la cotización canónica; no puede declarar el cierre económico por sí solo. El Excel brandeado se
emite con:

```bash
pnpm economica:build docs/commercial/tenders/<slug>/economica.json
```

El builder (`scripts/commercial/lib/economic-offer-xlsx.mjs`, domain-free y reusable) aplica el oficio de
marca: banda navy con el wordmark Efeonce, paleta AXIS, tabla con zebra, **bloque de total Neto/IVA/Total**,
formato CLP y print setup A4. **Techo de Excel:** las fuentes no se embeben en `.xlsx` (degradan a la del
lector); si quieres brand pixel-perfect, ese lugar es un PDF del composer, con el Excel como la planilla
editable. **Antes de brandear libre, confirma si las bases exigen SU planilla** (formato equivocado =
inadmisible). 🔴 **NUNCA** un precio unitario por artículo (el schema no tiene ese campo).

## Reglas duras

- **NUNCA** mezclar 🔒 y ➡️: lo INTERNO (loaded cost, piso, benchmark) va en `research/` o `*-INTERNO`,
  jamás en las ofertas client-facing.
- **NUNCA** una cifra en oferta/deck que no esté en el ledger de evidencia (`oferta-tecnica.md` Zona 0)
  con fuente googleable + as-of.
- **NUNCA** una pieza viva por captura: `render: "by_link"` en el manifiesto.
- **SIEMPRE** los `.md` y `deck-plan.json` son fuente de narrativa/composición; los montos y condiciones
  económicas derivan de la cotización y del paquete congelado de Greenhouse.
- **SIEMPRE** las fuentes de narrativa/composición son archivos git (no `proposal_assets`); el aggregate
  referencia el workspace por `proposal_id` y conserva el vínculo a la fuente económica gobernada.
- **SIEMPRE** un deal con deck conserva `proposal-studio.json`; `status=workshop_only` es el estado
  honesto hasta que exista Proposal, render job, asset versionado y verificación autenticada.
- **NUNCA** marques `verified` por tener un PDF o PNG en `.captures/`; el gate exige IDs del registro
  gobernado y del asset store canónico.
