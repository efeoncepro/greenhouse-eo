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
  bases/                           # 📁 fuente normativa: RFP, bases admin/técnica/económica, aclaraciones del foro
  research/                        # 🔒 taller INTERNO: diagnóstico, benchmark, VoC, fuentes crudas
  artifact-manifest.json           # 📄 artefactos VIVOS (Radiografía, Grader report) — por ENLACE, nunca archivo
  oferta-tecnica.md                # ➡️ client-facing (narrativa + ledger de evidencia) — FUENTE
  oferta-economica.md              # ➡️ client-facing
  propuesta-economica.xlsx         # ➡️ entregable (generado, no a mano)
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
registrar como Proposal en el Studio  →  adjuntar salidas (versionadas)  →  portal /admin/commercial/proposals
```

## Reglas duras

- **NUNCA** mezclar 🔒 y ➡️: lo INTERNO (loaded cost, piso, benchmark) va en `research/` o `*-INTERNO`,
  jamás en las ofertas client-facing.
- **NUNCA** una cifra en oferta/deck que no esté en el ledger de evidencia (`oferta-tecnica.md` Zona 0)
  con fuente googleable + as-of.
- **NUNCA** una pieza viva por captura: `render: "by_link"` en el manifiesto.
- **SIEMPRE** el `.md`/`.json` es la FUENTE; el PDF y el registro en el aggregate se re-emiten desde acá.
- **SIEMPRE** las fuentes son archivos git (no `proposal_assets`); el aggregate referencia por `proposal_id`.
