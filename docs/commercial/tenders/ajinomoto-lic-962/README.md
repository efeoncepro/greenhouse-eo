# Licitación / Propuesta — ajinomoto-lic-962

> **Estado:** evaluación / borrador · **Deadline:** 2026-08-12 18:00 (cambio de comprador) · **Origen:** private_rfp / Wherex
> **Proposal (Studio):** <proposal_id cuando exista> · **Owner:** Julio Reyes · **Creado:** 2026-08-11

Workspace interno del deal (el "DSR interno"). Las FUENTES viven acá como archivos git; las
SALIDAS versionadas (PDF renderizados) y la quote viven en el aggregate `Proposal`, que referencia
esta carpeta por `proposal_id`. Contrato de la carpeta: `../TENDER_WORKSPACE_TEMPLATE.md`.

## Artefactos

### ➡️ Client-facing (van al cliente — el `.md` es la FUENTE, el PDF se re-emite)

- `oferta-tecnica.md` — narrativa, alcance, matriz de cumplimiento y ledger de evidencia.
- `oferta-economica.md` + `economica.json` — fuente narrativa y estructurada de la cotización.
- `deck-plan.json` — fuente de composición de la presentación técnica (`pnpm deck:compose <plan>`).
- `anexos/` — administrativos (declaraciones, poderes, certificados).
- `artifact-manifest.json` — punteros a artefactos VIVOS (Radiografía, Grader) — por enlace.

### 🔒 INTERNOS — NUNCA van al cliente

- `research/` — diagnóstico, benchmark, VoC, fuentes crudas.
- `*-INTERNO.md` — squad-blueprint (loaded cost + piso), matriz de admisibilidad si aplica.

### Fuente normativa

- `bases/` — el RFP, bases admin/técnica/económica, aclaraciones del foro. **Manda sobre todo.**

## Qué falta

- [x] Leer ficha, descripción, brief y preguntas respondidas; evidencia interna en
  `research/wherex-ficha-y-preguntas-2026-08-11.md`.
- [ ] Cargar el RFP en `bases/` si se obtiene una copia local adicional.
- [x] Correr admisibilidad, alcance y bid/no-bid interno; ver `squad-blueprint-INTERNO.md`.
- [x] Investigar ficha, brief y preguntas; trasladar cifras trazables al ledger de `oferta-tecnica.md`.
- [x] Registrar que no se usarán artefactos vivos en esta oferta (`artifact-manifest.json`).
- [x] Autorar `deck-plan.json` desde la oferta técnica.
- [ ] Validar la marca de Ajinomoto y emitir la presentación PDF desde el composer.
- [ ] Emitir `propuesta-economica-ajinomoto-lic-962.xlsx` y revisar su render.
- [ ] Validación final de Finanzas: squad nominal/capacidad, costos cargados inexistentes en el snapshot y documentación tributaria Chile–Perú.
- [ ] Confirmar con Ajinomoto el corte KPI FY 2026 y la definición de “embajador activo” al kickoff o antes de adjudicar.
- [ ] Mantener `proposal-studio.json` actualizado; `deck:compose` solo produce una salida de taller.
- [ ] Registrar el deal como `Proposal` en el Studio y adjuntar las salidas.
